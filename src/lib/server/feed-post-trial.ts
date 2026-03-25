import { and, gt, isNull, sql } from "drizzle-orm";
import { db } from "#/lib/db/index.server";
import { feedImpressions, posts } from "#/lib/db/schema";

const TRIAL_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours
const TRIAL_LIMIT = 5;

/**
 * Post cold-start: fetches recent posts (<2h old) with zero feed impressions.
 * Inspired by Instagram Trial Reels — seeds early engagement data for new posts.
 */
export async function getTrialCandidates(
	existingPostIds: Set<string>,
): Promise<string[]> {
	try {
		const windowStart = new Date(Date.now() - TRIAL_WINDOW_MS);

		const rows = await db
			.select({ id: posts.id })
			.from(posts)
			.leftJoin(
				feedImpressions,
				sql`${feedImpressions.postIds}::jsonb @> to_jsonb(${posts.id}::text)`,
			)
			.where(
				and(
					isNull(posts.deletedAt),
					gt(posts.createdAt, windowStart),
					sql`${posts.visibility} = 'public'`,
					isNull(feedImpressions.id),
				),
			)
			.limit(TRIAL_LIMIT + existingPostIds.size);

		return rows
			.map((r) => r.id)
			.filter((id) => !existingPostIds.has(id))
			.slice(0, TRIAL_LIMIT);
	} catch {
		return [];
	}
}
