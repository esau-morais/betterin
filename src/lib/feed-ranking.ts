/**
 * Stage 0 — Rule-based feed ranking engine.
 *
 * Scoring formula:
 *   score = recency_decay(age, half_life=12h)
 *         × connection_strength(author, viewer)
 *         × quality_bonus(anti-slop score)
 *         × source_boost(pool)
 *         × author_diversity(decay per repeated author)
 *         × discussion_boost(commenters, meaningful comments, reactions)
 *
 * Pure functions — no DB access, no side effects.
 * Same code will run in offline feature-computation pipelines (Stage 1+)
 * to prevent train-serve skew.
 */

const HALF_LIFE_MS = 12 * 60 * 60 * 1000; // 12 hours
const LN2 = Math.LN2;

export type ConnectionDegree = "self" | "connection" | "follow" | "none";

export type FeedSource =
	| { type: "network" }
	| {
			type: "activity";
			actorId: string;
			actorName: string;
			action: "liked";
	  }
	| {
			type: "extended";
	  }
	| { type: "discovery" };

export interface RankingCandidate {
	postId: string;
	authorId: string;
	createdAt: string;
	qualityScore: number;
	connectionDegree: ConnectionDegree;
	interactionCount: number;
	authorPostCountInPage: number;
	source: FeedSource;
	/** Number of viewer's connections that interacted with this post (Pool 2) */
	networkInteractorCount?: number;
	/** Unique non-author users who commented on this post */
	distinctCommenters?: number;
	/** Comments ≥50 chars from distinct non-author users */
	meaningfulCommentCount?: number;
	/** Total reaction count on this post */
	reactionCount?: number;
}

export interface ScoredPost {
	postId: string;
	score: number;
	source: FeedSource;
	components: {
		recency: number;
		connectionStrength: number;
		qualityBonus: number;
		sourceBoost: number;
		authorDiversity: number;
		discussionBoost: number;
	};
}

/**
 * Exponential decay: e^(-λt) where λ = ln(2)/half_life.
 * At t = 12h → 0.5, at t = 24h → 0.25, at t = 0 → 1.0.
 */
export function recencyDecay(createdAt: string, now: number): number {
	const ageMs = now - new Date(createdAt).getTime();
	if (ageMs <= 0) return 1.0;
	const lambda = LN2 / HALF_LIFE_MS;
	return Math.exp(-lambda * ageMs);
}

/**
 * Connection strength: base weight by relationship + interaction bonus.
 *
 * - self: 0.8 (equal to connections — no special ranking advantage;
 *   freshness + filter exemptions handle visibility instead)
 * - connection: 0.8 base + interaction bonus
 * - follow: 0.5 base + interaction bonus
 * - none: 0.2 (public posts from outside network, if ever shown)
 *
 * Interaction bonus: log2(1 + count) * 0.15, capped at 0.3.
 * This rewards genuine repeated interaction without letting
 * power-users dominate. Log dampens large values.
 */
export function connectionStrength(
	degree: ConnectionDegree,
	interactionCount: number,
): number {
	const base: Record<ConnectionDegree, number> = {
		self: 0.8,
		connection: 0.8,
		follow: 0.5,
		none: 0.2,
	};

	const interactionBonus = Math.min(
		Math.log2(1 + interactionCount) * 0.15,
		0.3,
	);
	return base[degree] + interactionBonus;
}

/**
 * Quality bonus: maps qualityScore (0.0–2.0, default 1.0)
 * to a multiplier. Centered at 1.0:
 * - qualityScore 1.0 → multiplier 1.0 (neutral)
 * - qualityScore 0.5 → multiplier 0.75 (demoted but not hidden)
 * - qualityScore 1.5 → multiplier 1.25 (boosted)
 * - qualityScore 0.0 → multiplier 0.5 (strong demotion, still visible)
 */
export function qualityBonus(qualityScore: number): number {
	return 0.5 + 0.5 * Math.min(Math.max(qualityScore, 0), 2);
}

/**
 * Source boost: multiplier per pool to prioritize direct network
 * content while still mixing in discovery.
 *
 * Pool 1 (network): 1.0 — baseline, no boost/penalty
 * Pool 2 (activity): 0.6 base + 0.1 per additional connection interactor (capped at 1.0)
 * Pool 3 (extended): 0.5 — 2nd-degree content gets a fair chance
 * Pool 4 (discovery): 0.35 — high-quality public posts deserve visibility
 *
 * Extended/discovery values softened from 0.4/0.25 based on Twitter/X
 * research: their OutOfNetworkScaleFactor is 0.75 (only 25% penalty).
 * Our values are still more conservative but less punishing than before.
 */
export function sourceBoost(
	source: FeedSource,
	networkInteractorCount?: number,
): number {
	switch (source.type) {
		case "network":
			return 1.0;
		case "activity":
			return Math.min(0.6 + (networkInteractorCount ?? 1) * 0.1, 1.0);
		case "extended":
			return 0.5;
		case "discovery":
			return 0.35;
	}
}

/**
 * Discussion boost: multiplicative signal for posts with genuine engagement.
 *
 * Separate from qualityBonus (which handles anti-slop content scoring).
 * This measures real-world social proof: diverse commenters, substantive
 * replies, and reactions from the community.
 *
 * Returns a multiplier [1.0, 2.5]:
 * - Commenter diversity: +0.2 per distinct non-author commenter, cap +0.6
 * - Meaningful comments (≥50 chars): +0.15 each, cap +0.6
 * - Reactions: +0.3 if any exist (binary — count doesn't matter)
 *
 * Examples:
 * - 0 commenters, 0 reactions → 1.0 (no change)
 * - 1 commenter, 0 meaningful, 1 reaction → 1.0 + 0.2 + 0.3 = 1.5
 * - 3 commenters, 2 meaningful, reactions → 1.0 + 0.6 + 0.3 + 0.3 = 2.2
 * - 3+ commenters, 4+ meaningful, reactions → 1.0 + 0.6 + 0.6 + 0.3 = 2.5 (max)
 *
 * Author's own comments are excluded upstream (query filters authorId).
 */
export function discussionBoost(
	distinctCommenters: number,
	meaningfulCommentCount: number,
	reactionCount: number,
): number {
	const commenterBoost = Math.min(distinctCommenters * 0.2, 0.6);
	const meaningfulBoost = Math.min(meaningfulCommentCount * 0.15, 0.6);
	const reactionBoost = reactionCount > 0 ? 0.3 : 0;
	return 1.0 + commenterBoost + meaningfulBoost + reactionBoost;
}

/**
 * Author diversity decay: exponential multiplier that reduces score
 * for each subsequent post from the same author in the feed.
 *
 * Inspired by Twitter/X's AuthorDiversityDecayFactor (0.5 decay,
 * 0.25 floor). Each additional post gets multiplied by decay^n,
 * never going below the floor.
 *
 * - 0 prior posts → 1.0 (no reduction)
 * - 1 prior post  → 0.5
 * - 2 prior posts → 0.25 (floor)
 * - 3+ prior posts → 0.25 (stays at floor)
 *
 * Returns a multiplier [floor, 1.0] — NOT a penalty to subtract.
 */
const AUTHOR_DIVERSITY_DECAY = 0.5;
const AUTHOR_DIVERSITY_FLOOR = 0.25;

export function authorDiversityMultiplier(
	authorPostCountInPage: number,
): number {
	if (authorPostCountInPage === 0) return 1.0;
	return Math.max(
		AUTHOR_DIVERSITY_DECAY ** authorPostCountInPage,
		AUTHOR_DIVERSITY_FLOOR,
	);
}

/**
 * Score a single post candidate.
 *
 * Formula:
 *   score = recencyDecay × connectionStrength × qualityBonus
 *         × sourceBoost × authorDiversity × discussionBoost
 */
export function scorePost(
	candidate: RankingCandidate,
	now: number,
): ScoredPost {
	const recency = recencyDecay(candidate.createdAt, now);
	const connStrength = connectionStrength(
		candidate.connectionDegree,
		candidate.interactionCount,
	);
	const quality = qualityBonus(candidate.qualityScore);
	const srcBoost = sourceBoost(
		candidate.source,
		candidate.networkInteractorCount,
	);
	const diversity = authorDiversityMultiplier(candidate.authorPostCountInPage);
	const discussion = discussionBoost(
		candidate.distinctCommenters ?? 0,
		candidate.meaningfulCommentCount ?? 0,
		candidate.reactionCount ?? 0,
	);

	const score =
		recency * connStrength * quality * srcBoost * diversity * discussion;

	return {
		postId: candidate.postId,
		score,
		source: candidate.source,
		components: {
			recency,
			connectionStrength: connStrength,
			qualityBonus: quality,
			sourceBoost: srcBoost,
			authorDiversity: diversity,
			discussionBoost: discussion,
		},
	};
}

// Max non-network (pools 2-4) content as fraction of a page.
const MAX_DISCOVERY_RATIO = 0.6;

// Self-posts younger than this get promoted to top positions.
const SELF_POST_FRESH_MS = 60 * 60 * 1000; // 1 hour

// Fresh self-posts are promoted into the top N positions if they
// ranked lower. Prevents own post from disappearing in a busy feed.
const SELF_POST_PROMOTE_TOP = 5;

/**
 * Rank and apply diversity constraints to a candidate set.
 *
 * 1. Score all candidates (authorPostCountInPage = 0 initially)
 * 2. Sort by score descending
 * 3. Greedily select posts, tracking per-author counts + pool distribution
 * 4. Self-posts are exempt from max-per-author and pool distribution
 *    filters — they are never hidden (Twitter-style filter exemption)
 * 5. Enforce max 2 posts per author per page for non-self posts
 * 6. Enforce max 60% non-network content per page
 * 7. Re-score with author diversity decay as posts are placed
 * 8. Post-pass: promote fresh self-posts (<1h) into top 5 if they
 *    ranked lower
 *
 * Returns at most `limit` posts in ranked order.
 */
export function rankFeed(
	candidates: Omit<RankingCandidate, "authorPostCountInPage">[],
	limit: number,
): ScoredPost[] {
	const now = Date.now();

	const initial = candidates.map((c) =>
		scorePost({ ...c, authorPostCountInPage: 0 }, now),
	);
	initial.sort((a, b) => b.score - a.score);

	const MAX_PER_AUTHOR = 2;
	const authorCounts = new Map<string, number>();
	const result: ScoredPost[] = [];
	let discoveryCount = 0;
	const maxDiscovery = Math.floor(limit * MAX_DISCOVERY_RATIO);

	const candidateMap = new Map(candidates.map((c) => [c.postId, c]));

	for (const scored of initial) {
		if (result.length >= limit) break;

		const candidate = candidateMap.get(scored.postId)!;
		const isSelf = candidate.connectionDegree === "self";
		const authorCount = authorCounts.get(candidate.authorId) ?? 0;

		if (!isSelf) {
			if (authorCount >= MAX_PER_AUTHOR) continue;

			const isDiscovery = candidate.source.type !== "network";
			if (isDiscovery && discoveryCount >= maxDiscovery) continue;
		}

		const finalScored = scorePost(
			{ ...candidate, authorPostCountInPage: authorCount },
			now,
		);

		result.push(finalScored);
		authorCounts.set(candidate.authorId, authorCount + 1);
		if (candidate.source.type !== "network") discoveryCount++;
	}

	// Post-pass: promote fresh self-posts into top positions.
	// If a self-post is <1h old but ranked outside top N, swap it
	// with the lowest-scoring post in the top N range.
	for (let i = SELF_POST_PROMOTE_TOP; i < result.length; i++) {
		const scored = result[i];
		const candidate = candidateMap.get(scored.postId)!;
		if (candidate.connectionDegree !== "self") continue;

		const ageMs = now - new Date(candidate.createdAt).getTime();
		if (ageMs > SELF_POST_FRESH_MS) continue;

		// Find the lowest-scoring non-self post in the top N to swap with
		let worstIdx = -1;
		let worstScore = Number.POSITIVE_INFINITY;
		for (let j = 0; j < Math.min(SELF_POST_PROMOTE_TOP, result.length); j++) {
			const topCandidate = candidateMap.get(result[j].postId)!;
			if (
				topCandidate.connectionDegree !== "self" &&
				result[j].score < worstScore
			) {
				worstIdx = j;
				worstScore = result[j].score;
			}
		}

		if (worstIdx !== -1 && scored.score < worstScore) {
			// Only promote if the self-post actually scored lower
			const temp = result[worstIdx];
			result[worstIdx] = scored;
			result[i] = temp;
		}
	}

	return result;
}
