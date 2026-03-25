import { useCallback, useEffect, useRef } from "react";
import {
	logFeedEventsBatchFn,
	logFeedImpressionFn,
} from "#/lib/server/feed-events";
import type { DwellBucket, FeedMode, RankingStage } from "#/lib/validation";

function classifyDwell(ms: number): DwellBucket {
	if (ms < 2000) return "lt_2s";
	if (ms < 5000) return "2s_5s";
	if (ms < 15000) return "5s_15s";
	if (ms < 30000) return "15s_30s";
	return "gt_30s";
}

function generateSessionId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface TrackedPost {
	postId: string;
	feedPosition: number;
	enteredAt: number;
	dwellBucket: DwellBucket | null;
	impressionLogged: boolean;
}

/**
 * Tracks feed post impressions and dwell time via IntersectionObserver.
 *
 * Observes all `[data-post-id]` elements inside a container.
 * When a post enters the viewport (50% visible), starts timing.
 * When it exits, classifies dwell time into a bucket.
 *
 * Batches events and sends them periodically (every 5s) and on unmount.
 */
export function useFeedTracker(
	feedMode: FeedMode,
	containerRef: React.RefObject<HTMLDivElement | null>,
	rankingStage: RankingStage = "rule_v1",
	trackingLevel: "full" | "minimal" = "full",
) {
	const sessionIdRef = useRef(generateSessionId());
	const trackedRef = useRef(new Map<string, TrackedPost>());
	const pendingEventsRef = useRef<
		Array<{
			postId: string;
			action: "impression";
			dwellBucket: DwellBucket;
			sessionId: string;
			feedPosition: number;
			feedMode: FeedMode;
		}>
	>([]);
	const flushTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
	const impressionBatchRef = useRef<Set<string>>(new Set());
	const rankingStageRef = useRef(rankingStage);
	rankingStageRef.current = rankingStage;

	const flush = useCallback(async () => {
		const events = pendingEventsRef.current.splice(0);
		if (events.length === 0) return;

		try {
			await logFeedEventsBatchFn({ data: { events } });
		} catch {
			// Re-queue on failure — best effort, don't block UI
			pendingEventsRef.current.unshift(...events);
		}
	}, []);

	const logImpression = useCallback(async () => {
		const postIds = [...impressionBatchRef.current];
		impressionBatchRef.current.clear();
		if (postIds.length === 0) return;

		try {
			await logFeedImpressionFn({
				data: {
					sessionId: sessionIdRef.current,
					postIds,
					rankingStage: rankingStageRef.current,
				},
			});
		} catch {
			// best effort
		}
	}, []);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const observer = new IntersectionObserver(
			(entries) => {
				const now = Date.now();
				for (const entry of entries) {
					const el = entry.target as HTMLElement;
					const postId = el.dataset.postId;
					const position = Number.parseInt(el.dataset.feedPosition ?? "0", 10);
					if (!postId) continue;

					if (entry.isIntersecting) {
						// Post entered viewport
						const tracked = trackedRef.current.get(postId);
						if (!tracked) {
							trackedRef.current.set(postId, {
								postId,
								feedPosition: position,
								enteredAt: now,
								dwellBucket: null,
								impressionLogged: false,
							});
						} else {
							tracked.enteredAt = now;
						}

						// Queue impression log
						if (!tracked?.impressionLogged) {
							impressionBatchRef.current.add(postId);
							if (tracked) tracked.impressionLogged = true;
							else {
								const t = trackedRef.current.get(postId);
								if (t) t.impressionLogged = true;
							}
						}
					} else {
						// Post left viewport — classify dwell
						if (trackingLevel === "minimal") continue;
						const tracked = trackedRef.current.get(postId);
						if (tracked?.enteredAt) {
							const dwellMs = now - tracked.enteredAt;
							tracked.dwellBucket = classifyDwell(dwellMs);

							pendingEventsRef.current.push({
								postId,
								action: "impression",
								dwellBucket: tracked.dwellBucket,
								sessionId: sessionIdRef.current,
								feedPosition: tracked.feedPosition,
								feedMode,
							});
						}
					}
				}
			},
			{ threshold: 0.5 },
		);

		// Observe all post elements
		const postElements = container.querySelectorAll("[data-post-id]");
		for (const el of postElements) {
			observer.observe(el);
		}

		// Watch for new post elements added to the container
		const mutationObserver = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of mutation.addedNodes) {
					if (node instanceof HTMLElement) {
						if (node.dataset.postId) {
							observer.observe(node);
						}
						const children = node.querySelectorAll("[data-post-id]");
						for (const child of children) {
							observer.observe(child);
						}
					}
				}
			}
		});

		mutationObserver.observe(container, { childList: true, subtree: true });

		// Flush events every 5 seconds
		flushTimerRef.current = setInterval(() => {
			flush();
			logImpression();
		}, 5000);

		return () => {
			observer.disconnect();
			mutationObserver.disconnect();
			clearInterval(flushTimerRef.current);
			// Final flush on unmount
			flush();
			logImpression();
		};
	}, [feedMode, containerRef, flush, logImpression, trackingLevel]);

	// Generate new session ID when feed mode changes
	const prevFeedModeRef = useRef(feedMode);
	useEffect(() => {
		if (prevFeedModeRef.current !== feedMode) {
			prevFeedModeRef.current = feedMode;
			sessionIdRef.current = generateSessionId();
			trackedRef.current.clear();
			impressionBatchRef.current.clear();
		}
	});
}
