import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { feedInfiniteQueryOptions } from "#/lib/queries";
import { useFeedTracker } from "#/lib/use-feed-tracker";
import type { FeedMode } from "#/lib/validation";
import { FeedSkeleton } from "./FeedSkeleton";
import { PostCard } from "./PostCard";

const authedRoute = getRouteApi("/_authed");

export function FeedList({ feedMode }: { feedMode: FeedMode }) {
	const { session } = authedRoute.useRouteContext();
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useSuspenseInfiniteQuery(feedInfiniteQueryOptions(feedMode));

	const sentinelRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const latestPage = data.pages[data.pages.length - 1];
	const rankingStage = latestPage?.rankingStage ?? "rule_v1";
	useFeedTracker(feedMode, containerRef, rankingStage);

	useEffect(() => {
		const el = sentinelRef.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{ rootMargin: "200px" },
		);

		observer.observe(el);
		return () => observer.disconnect();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	const posts = data.pages.flatMap((page) => page.posts);

	if (posts.length === 0) {
		return (
			<div className="bi-card flex flex-col items-center justify-center py-12 text-center">
				<p className="text-lg font-medium">Your feed is empty</p>
				<p className="text-sm text-muted-foreground mt-1">
					Connect with people or follow others to see their posts here.
				</p>
			</div>
		);
	}

	return (
		<div ref={containerRef} className="space-y-3">
			{posts.map((post, index) => (
				<PostCard
					key={post.id}
					post={post}
					feedPosition={index}
					currentUserId={session.user.id}
				/>
			))}

			<div ref={sentinelRef} className="h-1" />

			{isFetchingNextPage && <FeedSkeleton count={2} />}
		</div>
	);
}
