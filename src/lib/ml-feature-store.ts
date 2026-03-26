import { Schema } from "effect";
import { redis } from "#/lib/redis";
import type { FeedAction } from "#/lib/validation";

const UserFeaturesSchema = Schema.Struct({
	satisfaction_rate_7d: Schema.Number,
	skip_rate_7d: Schema.Number,
	hide_rate_7d: Schema.Number,
	mute_rate_7d: Schema.Number,
	save_rate_7d: Schema.Number,
	like_rate_7d: Schema.Number,
	comment_rate_7d: Schema.Number,
	session_count_7d: Schema.Number,
	avg_session_depth_7d: Schema.Number,
	event_count_7d: Schema.Number,
});

export type UserFeatures = typeof UserFeaturesSchema.Type;

const AuthorFeaturesSchema = Schema.Struct({
	satisfaction_7d: Schema.Number,
	hide_rate_7d: Schema.Number,
	skip_rate_7d: Schema.Number,
	post_count_7d: Schema.Number,
});

export type AuthorFeatures = typeof AuthorFeaturesSchema.Type;

const COUNTER_TTL = 7 * 24 * 60 * 60; // 7 days
const BATCH_TTL = 25 * 60 * 60; // 25h for batch-computed fallback

function userCountsKey(userId: string): string {
	return `fi:u:${userId}:counts`;
}

function authorCountsKey(authorId: string): string {
	return `fi:a:${authorId}:counts`;
}

function userBatchKey(userId: string): string {
	return `fi:u:${userId}:7d`;
}

function authorBatchKey(authorId: string): string {
	return `fi:a:${authorId}:7d`;
}

const SATISFYING_ACTIONS = new Set<FeedAction>([
	"like",
	"comment",
	"share",
	"save",
]);
const SKIP_BUCKETS = new Set(["lt_2s", "2s_5s"]);

export async function incrementUserEvent(
	userId: string,
	action: FeedAction,
	dwellBucket?: string | null,
): Promise<void> {
	const key = userCountsKey(userId);
	const pipe = redis.pipeline();
	pipe.hincrby(key, "events", 1);

	if (action === "impression") {
		pipe.hincrby(key, "impressions", 1);
		if (dwellBucket && SKIP_BUCKETS.has(dwellBucket)) {
			pipe.hincrby(key, "skips", 1);
		}
	} else {
		pipe.hincrby(key, action, 1);
		if (SATISFYING_ACTIONS.has(action)) {
			pipe.hincrby(key, "satisfying", 1);
		}
	}

	pipe.expire(key, COUNTER_TTL);
	await pipe.exec();
}

export async function incrementAuthorEvent(
	authorId: string,
	action: FeedAction,
	dwellBucket?: string | null,
): Promise<void> {
	const key = authorCountsKey(authorId);
	const pipe = redis.pipeline();

	if (action === "impression") {
		pipe.hincrby(key, "impressions", 1);
		if (dwellBucket && SKIP_BUCKETS.has(dwellBucket)) {
			pipe.hincrby(key, "skips", 1);
		}
	} else {
		pipe.hincrby(key, action, 1);
		if (SATISFYING_ACTIONS.has(action)) {
			pipe.hincrby(key, "satisfying", 1);
		}
	}

	pipe.expire(key, COUNTER_TTL);
	await pipe.exec();
}

function countsToUserFeatures(counts: Record<string, string>): UserFeatures {
	const impressions = Number(counts.impressions) || 0;
	const d = impressions || 1;
	return {
		satisfaction_rate_7d: (Number(counts.satisfying) || 0) / d,
		skip_rate_7d: (Number(counts.skips) || 0) / d,
		hide_rate_7d: (Number(counts.hide) || 0) / d,
		mute_rate_7d: (Number(counts.mute_author) || 0) / d,
		save_rate_7d: (Number(counts.save) || 0) / d,
		like_rate_7d: (Number(counts.like) || 0) / d,
		comment_rate_7d: (Number(counts.comment) || 0) / d,
		session_count_7d: 0,
		avg_session_depth_7d: 0,
		event_count_7d: Number(counts.events) || 0,
	};
}

function countsToAuthorFeatures(
	counts: Record<string, string>,
): AuthorFeatures {
	const impressions = Number(counts.impressions) || 0;
	const d = impressions || 1;
	return {
		satisfaction_7d: (Number(counts.satisfying) || 0) / d,
		hide_rate_7d: (Number(counts.hide) || 0) / d,
		skip_rate_7d: (Number(counts.skips) || 0) / d,
		post_count_7d: 0,
	};
}

export async function getUserFeatures(
	userId: string,
): Promise<UserFeatures | null> {
	try {
		const counts = await redis.hgetall<Record<string, string>>(
			userCountsKey(userId),
		);
		if (counts && Object.keys(counts).length > 0) {
			return countsToUserFeatures(counts);
		}
		const raw = await redis.get<string>(userBatchKey(userId));
		if (!raw) return null;
		return Schema.decodeUnknownSync(UserFeaturesSchema)(JSON.parse(raw));
	} catch {
		return null;
	}
}

export async function getAuthorFeaturesBatch(
	authorIds: string[],
): Promise<Map<string, AuthorFeatures>> {
	const result = new Map<string, AuthorFeatures>();
	if (authorIds.length === 0) return result;
	try {
		const pipe = redis.pipeline();
		for (const id of authorIds) {
			pipe.hgetall(authorCountsKey(id));
		}
		const pipeResults = await pipe.exec<Record<string, string>[]>();

		const missingIds: string[] = [];
		for (let i = 0; i < authorIds.length; i++) {
			const counts = pipeResults[i];
			if (
				counts &&
				typeof counts === "object" &&
				Object.keys(counts).length > 0
			) {
				result.set(
					authorIds[i],
					countsToAuthorFeatures(counts as Record<string, string>),
				);
			} else {
				missingIds.push(authorIds[i]);
			}
		}

		if (missingIds.length > 0) {
			const keys = missingIds.map(authorBatchKey);
			const values = await redis.mget<(string | null)[]>(...keys);
			for (let i = 0; i < missingIds.length; i++) {
				const raw = values[i];
				if (raw) {
					result.set(
						missingIds[i],
						Schema.decodeUnknownSync(AuthorFeaturesSchema)(JSON.parse(raw)),
					);
				}
			}
		}
	} catch {
		// return partial results
	}
	return result;
}

export async function setUserFeatures(
	userId: string,
	features: UserFeatures,
	ttl = BATCH_TTL,
): Promise<void> {
	await redis.set(userBatchKey(userId), JSON.stringify(features), { ex: ttl });
}

export async function setAuthorFeatures(
	authorId: string,
	features: AuthorFeatures,
	ttl = BATCH_TTL,
): Promise<void> {
	await redis.set(authorBatchKey(authorId), JSON.stringify(features), {
		ex: ttl,
	});
}
