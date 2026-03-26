import {
	incrementAuthorEvent,
	incrementUserEvent,
} from "#/lib/ml-feature-store";
import { redis } from "#/lib/redis";
import type { FeedAction, RankingStage } from "#/lib/validation";
import { incrementAndCheckTrainTrigger } from "./ml-auto-trigger";
import { checkEvalThresholds, incrementEvalCounter } from "./ml-eval-realtime";

const EVAL_CHECK_INTERVAL = 500;
const POST_AUTHOR_TTL = 24 * 60 * 60;

export function cachePostAuthor(postId: string, authorId: string): void {
	void redis.set(`fi:post:author:${postId}`, authorId, { ex: POST_AUTHOR_TTL });
}

async function resolveAuthorId(postId: string): Promise<string | null> {
	try {
		return await redis.get(`fi:post:author:${postId}`);
	} catch {
		return null;
	}
}

export function updateRealTimeMetrics(
	userId: string,
	events: Array<{
		postId: string;
		action: FeedAction;
		dwellBucket?: string | null;
	}>,
	rankingStage: RankingStage = "rule_v1",
): void {
	void (async () => {
		try {
			for (const event of events) {
				await incrementUserEvent(userId, event.action, event.dwellBucket);
				await incrementEvalCounter(
					rankingStage,
					event.action,
					event.dwellBucket,
				);

				if (event.action !== "impression") {
					const authorId = await resolveAuthorId(event.postId);
					if (authorId) {
						await incrementAuthorEvent(
							authorId,
							event.action,
							event.dwellBucket,
						);
					}
				}
			}

			const globalCount = await redis.incrby("fi:events:global", events.length);

			if (globalCount % EVAL_CHECK_INTERVAL < events.length) {
				await checkEvalThresholds();
				await incrementAndCheckTrainTrigger();
			}
		} catch {
			// non-critical — never block the response path
		}
	})();
}
