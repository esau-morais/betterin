import {
	and,
	desc,
	eq,
	gt,
	gte,
	inArray,
	isNull,
	lt,
	not,
	or,
	sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "#/lib/db/index.server";
import {
	articles,
	comments,
	connections,
	events,
	feedEvents,
	pollOptions,
	polls,
	pollVotes,
	posts,
	profiles,
	reactions,
	userPreferences,
	users,
} from "#/lib/db/schema";
import type { FeedSource } from "#/lib/feed-ranking";
import { cachePostAuthor } from "#/lib/server/ml-realtime-hook";

type ArticleData = {
	id: string;
	title: string;
	subtitle: string | null;
	slug: string;
	coverImageUrl: string | null;
	readingTimeMinutes: number;
};

async function fetchArticlesForPosts(
	postIds: string[],
): Promise<Map<string, ArticleData>> {
	if (postIds.length === 0) return new Map();

	const rows = await db
		.select({
			id: articles.id,
			postId: articles.postId,
			title: articles.title,
			subtitle: articles.subtitle,
			slug: articles.slug,
			coverImageUrl: articles.coverImageUrl,
			readingTimeMinutes: articles.readingTimeMinutes,
		})
		.from(articles)
		.where(inArray(articles.postId, postIds));

	const result = new Map<string, ArticleData>();
	for (const r of rows) {
		result.set(r.postId, {
			id: r.id,
			title: r.title,
			subtitle: r.subtitle,
			slug: r.slug,
			coverImageUrl: r.coverImageUrl,
			readingTimeMinutes: r.readingTimeMinutes,
		});
	}

	return result;
}

type EventData = {
	id: string;
	name: string;
	description: string | null;
	coverImageUrl: string | null;
	startAt: string;
	endAt: string | null;
	timezone: string;
	eventType: "online" | "in_person";
	location: string | null;
	externalUrl: string | null;
};

async function fetchEventsForPosts(
	postIds: string[],
): Promise<Map<string, EventData>> {
	if (postIds.length === 0) return new Map();

	const rows = await db
		.select({
			id: events.id,
			postId: events.postId,
			name: events.name,
			description: events.description,
			coverImageUrl: events.coverImageUrl,
			startAt: events.startAt,
			endAt: events.endAt,
			timezone: events.timezone,
			eventType: events.eventType,
			location: events.location,
			externalUrl: events.externalUrl,
		})
		.from(events)
		.where(inArray(events.postId, postIds));

	const result = new Map<string, EventData>();
	for (const r of rows) {
		result.set(r.postId, {
			id: r.id,
			name: r.name,
			description: r.description,
			coverImageUrl: r.coverImageUrl,
			startAt: r.startAt.toISOString(),
			endAt: r.endAt?.toISOString() ?? null,
			timezone: r.timezone,
			eventType: r.eventType,
			location: r.location,
			externalUrl: r.externalUrl,
		});
	}

	return result;
}

type PollData = {
	id: string;
	endsAt: string;
	options: { id: string; text: string; position: number; votes: number }[];
	totalVotes: number;
	myVoteOptionId: string | null;
};

async function fetchPollsForPosts(
	postIds: string[],
	userId: string | null,
): Promise<Map<string, PollData>> {
	if (postIds.length === 0) return new Map();

	const pollRows = await db
		.select({
			id: polls.id,
			postId: polls.postId,
			endsAt: polls.endsAt,
		})
		.from(polls)
		.where(inArray(polls.postId, postIds));

	if (pollRows.length === 0) return new Map();

	const pollIds = pollRows.map((p) => p.id);

	const [optionRows, voteCounts, userVotes] = await Promise.all([
		db
			.select({
				id: pollOptions.id,
				pollId: pollOptions.pollId,
				text: pollOptions.text,
				position: pollOptions.position,
			})
			.from(pollOptions)
			.where(inArray(pollOptions.pollId, pollIds)),
		db
			.select({
				optionId: pollVotes.optionId,
				count: sql<number>`count(*)::int`,
			})
			.from(pollVotes)
			.where(inArray(pollVotes.pollId, pollIds))
			.groupBy(pollVotes.optionId),
		userId
			? db
					.select({
						pollId: pollVotes.pollId,
						optionId: pollVotes.optionId,
					})
					.from(pollVotes)
					.where(
						and(
							inArray(pollVotes.pollId, pollIds),
							eq(pollVotes.userId, userId),
						),
					)
			: [],
	]);

	const voteCountMap = new Map(voteCounts.map((v) => [v.optionId, v.count]));
	const userVoteMap = new Map(userVotes.map((v) => [v.pollId, v.optionId]));

	const result = new Map<string, PollData>();

	for (const poll of pollRows) {
		const opts = optionRows
			.filter((o) => o.pollId === poll.id)
			.sort((a, b) => a.position - b.position)
			.map((o) => ({
				id: o.id,
				text: o.text,
				position: o.position,
				votes: voteCountMap.get(o.id) ?? 0,
			}));

		const totalVotes = opts.reduce((sum, o) => sum + o.votes, 0);

		result.set(poll.postId, {
			id: poll.id,
			endsAt: poll.endsAt.toISOString(),
			options: opts,
			totalVotes,
			myVoteOptionId: userVoteMap.get(poll.id) ?? null,
		});
	}

	return result;
}

const PAGE_SIZE = 20;

export type PostRow = {
	id: string;
	content: string;
	contentFormat: string | null;
	contentHtml: string | null;
	mediaUrls: string[] | null;
	visibility: string;
	qualityScore: number;
	createdAt: Date;
	authorId: string;
	authorName: string;
	authorImage: string | null;
	handle: string | null;
	headline: string | null;
	avatarFrame: string | null;
	repostOfId: string | null;
	quotedPostId: string | null;
};

export type PoolCandidate = PostRow & {
	source: FeedSource;
	networkInteractorCount?: number;
	repostOfId?: string | null;
	quotedPostId?: string | null;
};

export async function handleChronological(
	userId: string,
	networkAuthorIdArray: string[],
	hiddenPostIds: Set<string>,
	savedPostIds: Set<string>,
	cursor?: string,
) {
	if (networkAuthorIdArray.length === 0) {
		return {
			posts: [],
			nextCursor: null,
			feedMode: "chronological" as const,
			rankingScores: undefined,
			rankingStage: "rule_v1" as const,
		};
	}

	const cursorCondition = cursor
		? lt(posts.createdAt, new Date(cursor))
		: undefined;

	const rows = await db
		.select({
			id: posts.id,
			content: posts.content,
			contentFormat: posts.contentFormat,
			contentHtml: posts.contentHtml,
			mediaUrls: posts.mediaUrls,
			visibility: posts.visibility,
			qualityScore: posts.qualityScore,
			createdAt: posts.createdAt,
			authorId: posts.authorId,
			authorName: users.name,
			authorImage: users.image,
			handle: profiles.handle,
			headline: profiles.headline,
			avatarFrame: profiles.avatarFrame,
			repostOfId: posts.repostOfId,
			quotedPostId: posts.quotedPostId,
		})
		.from(posts)
		.innerJoin(users, eq(posts.authorId, users.id))
		.leftJoin(profiles, eq(posts.authorId, profiles.userId))
		.where(
			and(
				isNull(posts.deletedAt),
				inArray(posts.authorId, networkAuthorIdArray),
				or(
					eq(posts.visibility, "public"),
					eq(posts.authorId, userId),
					eq(posts.visibility, "connections"),
				),
				cursorCondition,
			),
		)
		.orderBy(desc(posts.createdAt))
		.limit(PAGE_SIZE + 1);

	const filteredRows = rows.filter((r) => !hiddenPostIds.has(r.id));
	const hasMore = filteredRows.length > PAGE_SIZE;
	const postsSlice = hasMore ? filteredRows.slice(0, PAGE_SIZE) : filteredRows;

	const chronCandidates: PoolCandidate[] = postsSlice.map((r) => ({
		...(r as PostRow),
		source: { type: "network" } as FeedSource,
	}));

	const feedPosts = await enrichPosts(
		chronCandidates,
		userId,
		savedPostIds,
		new Map(chronCandidates.map((c) => [c.id, c.source])),
	);

	for (const p of postsSlice) {
		cachePostAuthor(p.id, p.authorId);
	}

	return {
		posts: feedPosts,
		nextCursor: hasMore
			? postsSlice[postsSlice.length - 1].createdAt.toISOString()
			: null,
		feedMode: "chronological" as const,
		rankingScores: undefined,
		rankingStage: "rule_v1" as const,
	};
}

/**
 * Pool 2: Posts that the viewer's connections liked.
 * Only public posts from authors outside the viewer's direct network.
 *
 * Returns the "best" attribution actor (most recent liker who is a connection)
 * plus how many of the viewer's connections liked the post.
 *
 * Uses a subquery to pre-aggregate reactions per post, avoiding a double join
 * on the users table (which causes ambiguous column references in PostgreSQL).
 */
export async function fetchPool2NetworkActivity(
	connectionIdArray: string[],
	networkAuthorIds: Set<string>,
	mutedAuthorIds: Set<string>,
	windowDays: number,
) {
	const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
	const excludeAuthorIds = [...networkAuthorIds, ...mutedAuthorIds];

	const reactorNames = alias(users, "reactor");
	const reactionsAgg = db
		.select({
			postId: reactions.postId,
			actorId:
				sql<string>`(array_agg(${reactions.userId} ORDER BY ${reactions.createdAt} DESC))[1]`.as(
					"actor_id",
				),
			actorName:
				sql<string>`(array_agg(${reactorNames.name} ORDER BY ${reactions.createdAt} DESC))[1]`.as(
					"actor_name",
				),
			interactorCount: sql<number>`count(DISTINCT ${reactions.userId})::int`.as(
				"interactor_count",
			),
		})
		.from(reactions)
		.innerJoin(reactorNames, eq(reactorNames.id, reactions.userId))
		.where(inArray(reactions.userId, connectionIdArray))
		.groupBy(reactions.postId)
		.as("reactions_agg");

	const conditions = [
		isNull(posts.deletedAt),
		eq(posts.visibility, "public"),
		gt(posts.createdAt, windowStart),
	];
	if (excludeAuthorIds.length > 0) {
		conditions.push(not(inArray(posts.authorId, excludeAuthorIds)));
	}

	const result = await db
		.select({
			id: posts.id,
			content: posts.content,
			contentFormat: posts.contentFormat,
			contentHtml: posts.contentHtml,
			mediaUrls: posts.mediaUrls,
			visibility: posts.visibility,
			qualityScore: posts.qualityScore,
			createdAt: posts.createdAt,
			authorId: posts.authorId,
			authorName: users.name,
			authorImage: users.image,
			handle: profiles.handle,
			headline: profiles.headline,
			avatarFrame: profiles.avatarFrame,
			repostOfId: posts.repostOfId,
			quotedPostId: posts.quotedPostId,
			actorId: reactionsAgg.actorId,
			actorName: reactionsAgg.actorName,
			interactorCount: reactionsAgg.interactorCount,
		})
		.from(reactionsAgg)
		.innerJoin(posts, eq(reactionsAgg.postId, posts.id))
		.innerJoin(users, eq(posts.authorId, users.id))
		.leftJoin(profiles, eq(posts.authorId, profiles.userId))
		.where(and(...conditions))
		.orderBy(desc(posts.createdAt))
		.limit(20);

	return result.map((r) => ({
		...r,
		mediaUrls: r.mediaUrls as string[] | null,
	}));
}

/**
 * Pool 3: Public posts from 2nd-degree connections.
 * People connected to the viewer's connections, but not in the viewer's direct network.
 */
export async function fetchPool3Extended(
	connectionIdArray: string[],
	networkAuthorIds: Set<string>,
	mutedAuthorIds: Set<string>,
	windowDays: number,
) {
	const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

	const excludeAuthorIds = [...networkAuthorIds, ...mutedAuthorIds];

	const result = await db
		.select({
			id: posts.id,
			content: posts.content,
			contentFormat: posts.contentFormat,
			contentHtml: posts.contentHtml,
			mediaUrls: posts.mediaUrls,
			visibility: posts.visibility,
			qualityScore: posts.qualityScore,
			createdAt: posts.createdAt,
			authorId: posts.authorId,
			authorName: users.name,
			authorImage: users.image,
			handle: profiles.handle,
			headline: profiles.headline,
			avatarFrame: profiles.avatarFrame,
			repostOfId: posts.repostOfId,
			quotedPostId: posts.quotedPostId,
		})
		.from(posts)
		.innerJoin(users, eq(posts.authorId, users.id))
		.leftJoin(profiles, eq(posts.authorId, profiles.userId))
		.where(
			and(
				isNull(posts.deletedAt),
				eq(posts.visibility, "public"),
				gt(posts.createdAt, windowStart),
				excludeAuthorIds.length > 0
					? not(inArray(posts.authorId, excludeAuthorIds))
					: undefined,
				sql`${posts.authorId} IN (
					SELECT CASE
						WHEN ${connections.requesterId} = ANY(${sql.raw(`ARRAY[${connectionIdArray.map((id) => `'${id}'`).join(",")}]`)})
						THEN ${connections.addresseeId}
						ELSE ${connections.requesterId}
					END
					FROM ${connections}
					WHERE ${connections.status} = 'accepted'
					AND (
						${connections.requesterId} = ANY(${sql.raw(`ARRAY[${connectionIdArray.map((id) => `'${id}'`).join(",")}]`)})
						OR ${connections.addresseeId} = ANY(${sql.raw(`ARRAY[${connectionIdArray.map((id) => `'${id}'`).join(",")}]`)})
					)
				)`,
			),
		)
		.orderBy(desc(posts.qualityScore), desc(posts.createdAt))
		.limit(15);

	return result as PostRow[];
}

/**
 * Pool 4: Discovery — recent public posts with above-average quality
 * from anyone not already covered by other pools.
 * Essential for new users with empty networks.
 */
export async function fetchPool4Discovery(
	networkAuthorIds: Set<string>,
	mutedAuthorIds: Set<string>,
	windowDays: number,
) {
	const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

	const excludeAuthorIds = [...networkAuthorIds, ...mutedAuthorIds];

	const result = await db
		.select({
			id: posts.id,
			content: posts.content,
			contentFormat: posts.contentFormat,
			contentHtml: posts.contentHtml,
			mediaUrls: posts.mediaUrls,
			visibility: posts.visibility,
			qualityScore: posts.qualityScore,
			createdAt: posts.createdAt,
			authorId: posts.authorId,
			authorName: users.name,
			authorImage: users.image,
			handle: profiles.handle,
			headline: profiles.headline,
			avatarFrame: profiles.avatarFrame,
			repostOfId: posts.repostOfId,
			quotedPostId: posts.quotedPostId,
		})
		.from(posts)
		.innerJoin(users, eq(posts.authorId, users.id))
		.leftJoin(profiles, eq(posts.authorId, profiles.userId))
		.where(
			and(
				isNull(posts.deletedAt),
				eq(posts.visibility, "public"),
				gte(posts.qualityScore, 1.0),
				gt(posts.createdAt, windowStart),
				excludeAuthorIds.length > 0
					? not(inArray(posts.authorId, excludeAuthorIds))
					: undefined,
			),
		)
		.orderBy(desc(posts.qualityScore), desc(posts.createdAt))
		.limit(10);

	return result as PostRow[];
}

/**
 * Batch-fetch metadata (reactions, comments, saves) and build final FeedPost array.
 */
export async function enrichPosts(
	postsSlice: PoolCandidate[],
	userId: string,
	savedPostIds: Set<string>,
	sourceMap: Map<string, FeedSource>,
) {
	const postIds = postsSlice.map((p) => p.id);

	const [userReactions, commentCounts, reactionTypes, reactionCounts] =
		postIds.length > 0
			? await Promise.all([
					db
						.select({ postId: reactions.postId, type: reactions.type })
						.from(reactions)
						.where(
							and(
								inArray(reactions.postId, postIds),
								eq(reactions.userId, userId),
							),
						),
					db
						.select({
							postId: comments.postId,
							count: sql<number>`count(*)::int`,
						})
						.from(comments)
						.where(
							and(
								inArray(comments.postId, postIds),
								isNull(comments.deletedAt),
							),
						)
						.groupBy(comments.postId),
					db
						.select({
							postId: reactions.postId,
							type: reactions.type,
						})
						.from(reactions)
						.where(inArray(reactions.postId, postIds))
						.groupBy(reactions.postId, reactions.type),
					db
						.select({
							postId: reactions.postId,
							count: sql<number>`count(*)::int`,
						})
						.from(reactions)
						.where(inArray(reactions.postId, postIds))
						.groupBy(reactions.postId),
				])
			: [[], [], [], []];

	const reactionMap = new Map(userReactions.map((r) => [r.postId, r.type]));
	const commentCountMap = new Map(
		commentCounts.map((c) => [c.postId, c.count]),
	);
	const reactionTypesMap = new Map<string, string[]>();
	for (const r of reactionTypes) {
		const existing = reactionTypesMap.get(r.postId) ?? [];
		existing.push(r.type);
		reactionTypesMap.set(r.postId, existing);
	}
	const reactionCountMap = new Map(
		reactionCounts.map((r) => [r.postId, r.count]),
	);

	const repostOfIds = [
		...new Set(
			postsSlice
				.map((p) => p.repostOfId)
				.filter((id): id is string => id != null),
		),
	];
	const quotedPostIds = [
		...new Set(
			postsSlice
				.map((p) => p.quotedPostId)
				.filter((id): id is string => id != null),
		),
	];
	const allReferencedIds = [...new Set([...repostOfIds, ...quotedPostIds])];

	const [
		referencedPostRows,
		userRepostRows,
		repostCountRows,
		refUserReactions,
		refCommentCounts,
		refReactionTypes,
		refReactionCounts,
		refUserReposts,
	] = await Promise.all([
		allReferencedIds.length > 0
			? db
					.select({
						id: posts.id,
						content: posts.content,
						contentFormat: posts.contentFormat,
						contentHtml: posts.contentHtml,
						createdAt: posts.createdAt,
						authorId: users.id,
						authorName: users.name,
						authorImage: users.image,
						handle: profiles.handle,
						headline: profiles.headline,
						avatarFrame: profiles.avatarFrame,
					})
					.from(posts)
					.innerJoin(users, eq(posts.authorId, users.id))
					.leftJoin(profiles, eq(posts.authorId, profiles.userId))
					.where(
						and(inArray(posts.id, allReferencedIds), isNull(posts.deletedAt)),
					)
			: [],
		postIds.length > 0
			? db
					.select({ repostOfId: posts.repostOfId })
					.from(posts)
					.where(
						and(
							inArray(posts.repostOfId, postIds),
							eq(posts.authorId, userId),
							isNull(posts.deletedAt),
						),
					)
			: [],
		postIds.length > 0
			? db
					.select({
						repostOfId: posts.repostOfId,
						count: sql<number>`count(*)::int`,
					})
					.from(posts)
					.where(
						and(inArray(posts.repostOfId, postIds), isNull(posts.deletedAt)),
					)
					.groupBy(posts.repostOfId)
			: [],
		repostOfIds.length > 0
			? db
					.select({ postId: reactions.postId, type: reactions.type })
					.from(reactions)
					.where(
						and(
							inArray(reactions.postId, repostOfIds),
							eq(reactions.userId, userId),
						),
					)
			: [],
		repostOfIds.length > 0
			? db
					.select({
						postId: comments.postId,
						count: sql<number>`count(*)::int`,
					})
					.from(comments)
					.where(
						and(
							inArray(comments.postId, repostOfIds),
							isNull(comments.deletedAt),
						),
					)
					.groupBy(comments.postId)
			: [],
		repostOfIds.length > 0
			? db
					.select({ postId: reactions.postId, type: reactions.type })
					.from(reactions)
					.where(inArray(reactions.postId, repostOfIds))
					.groupBy(reactions.postId, reactions.type)
			: [],
		repostOfIds.length > 0
			? db
					.select({
						postId: reactions.postId,
						count: sql<number>`count(*)::int`,
					})
					.from(reactions)
					.where(inArray(reactions.postId, repostOfIds))
					.groupBy(reactions.postId)
			: [],
		repostOfIds.length > 0
			? db
					.select({ repostOfId: posts.repostOfId })
					.from(posts)
					.where(
						and(
							inArray(posts.repostOfId, repostOfIds),
							eq(posts.authorId, userId),
							isNull(posts.deletedAt),
						),
					)
			: [],
	]);

	const refReactionMap = new Map(
		refUserReactions.map((r) => [r.postId, r.type]),
	);
	const refCommentCountMap = new Map(
		refCommentCounts.map((c) => [c.postId, c.count]),
	);
	const refReactionTypesMap = new Map<string, string[]>();
	for (const r of refReactionTypes) {
		const existing = refReactionTypesMap.get(r.postId) ?? [];
		existing.push(r.type);
		refReactionTypesMap.set(r.postId, existing);
	}
	const refReactionCountMap = new Map(
		refReactionCounts.map((r) => [r.postId, r.count]),
	);
	const refUserRepostedSet = new Set(
		refUserReposts
			.map((r) => r.repostOfId)
			.filter((id): id is string => id != null),
	);

	const refAuthorIds = referencedPostRows
		.filter((r) => repostOfIds.includes(r.id))
		.map((r) => r.authorId);
	const uniqueAuthorIds = [
		...new Set([...postsSlice.map((p) => p.authorId), ...refAuthorIds]),
	];

	const [impressionCountRows, refImpressionCountRows, authorPrefsRows] =
		await Promise.all([
			postIds.length > 0
				? db
						.select({
							postId: feedEvents.postId,
							count: sql<number>`count(*)::int`,
						})
						.from(feedEvents)
						.where(
							and(
								inArray(feedEvents.postId, postIds),
								eq(feedEvents.action, "impression"),
							),
						)
						.groupBy(feedEvents.postId)
				: [],
			repostOfIds.length > 0
				? db
						.select({
							postId: feedEvents.postId,
							count: sql<number>`count(*)::int`,
						})
						.from(feedEvents)
						.where(
							and(
								inArray(feedEvents.postId, repostOfIds),
								eq(feedEvents.action, "impression"),
							),
						)
						.groupBy(feedEvents.postId)
				: [],
			uniqueAuthorIds.length > 0
				? db
						.select({
							userId: userPreferences.userId,
							showImpressionCount: userPreferences.showImpressionCount,
						})
						.from(userPreferences)
						.where(inArray(userPreferences.userId, uniqueAuthorIds))
				: [],
		]);

	const impressionCountMap = new Map(
		impressionCountRows.map((r) => [r.postId, r.count]),
	);
	const refImpressionCountMap = new Map(
		refImpressionCountRows.map((r) => [r.postId, r.count]),
	);
	const authorShowsImpressionsMap = new Map(
		authorPrefsRows.map((r) => [r.userId, r.showImpressionCount]),
	);

	const [pollMap, eventMap, articleMap] = await Promise.all([
		fetchPollsForPosts(postIds, userId),
		fetchEventsForPosts(postIds),
		fetchArticlesForPosts(postIds),
	]);

	const referencedPostMap = new Map(
		referencedPostRows.map((r) => [
			r.id,
			{
				id: r.id,
				content: r.content,
				contentFormat: r.contentFormat,
				contentHtml: r.contentHtml,
				createdAt: r.createdAt.toISOString(),
				author: {
					id: r.authorId,
					name: r.authorName,
					image: r.authorImage,
					handle: r.handle,
					headline: r.headline,
					avatarFrame: r.avatarFrame,
				},
			},
		]),
	);
	const userRepostedSet = new Set(
		userRepostRows
			.map((r) => r.repostOfId)
			.filter((id): id is string => id != null),
	);
	const repostCountMap = new Map(
		repostCountRows
			.filter(
				(r): r is typeof r & { repostOfId: string } => r.repostOfId != null,
			)
			.map((r) => [r.repostOfId, r.count]),
	);

	return postsSlice.map((p) => ({
		id: p.id,
		content: p.content,
		contentFormat: p.contentFormat as "plain" | "tiptap" | null,
		contentHtml: p.contentHtml,
		mediaUrls: p.mediaUrls as string[] | null,
		visibility: p.visibility,
		createdAt: p.createdAt.toISOString(),
		author: {
			id: p.authorId,
			name: p.authorName,
			image: p.authorImage,
			handle: p.handle,
			headline: p.headline,
			avatarFrame: p.avatarFrame,
		},
		myReaction: reactionMap.get(p.id) ?? null,
		reactionTypes: reactionTypesMap.get(p.id) ?? [],
		reactionCount: reactionCountMap.get(p.id) ?? 0,
		commentCount: commentCountMap.get(p.id) ?? 0,
		isSaved: savedPostIds.has(p.id),
		source: sourceMap.get(p.id) ?? ({ type: "network" } as FeedSource),
		repostOf: p.repostOfId
			? (() => {
					const base = referencedPostMap.get(p.repostOfId);
					if (!base) return null;
					const id = p.repostOfId;
					return {
						...base,
						reactionCount: refReactionCountMap.get(id) ?? 0,
						commentCount: refCommentCountMap.get(id) ?? 0,
						reactionTypes: refReactionTypesMap.get(id) ?? [],
						myReaction: refReactionMap.get(id) ?? null,
						isSaved: savedPostIds.has(id),
						isReposted: refUserRepostedSet.has(id),
						impressionCount: refImpressionCountMap.get(id) ?? 0,
						authorShowsImpressions:
							authorShowsImpressionsMap.get(base.author.id) ?? false,
					};
				})()
			: null,
		quotedPost: p.quotedPostId
			? (referencedPostMap.get(p.quotedPostId) ?? null)
			: null,
		isReposted: userRepostedSet.has(p.id),
		repostCount: repostCountMap.get(p.id) ?? 0,
		impressionCount: impressionCountMap.get(p.id) ?? 0,
		authorShowsImpressions: authorShowsImpressionsMap.get(p.authorId) ?? false,
		poll: pollMap.get(p.id) ?? null,
		event: eventMap.get(p.id) ?? null,
		article: articleMap.get(p.id) ?? null,
	}));
}
