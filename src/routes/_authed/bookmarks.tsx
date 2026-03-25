import { BookmarkSimpleIcon } from "@phosphor-icons/react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { PostCard } from "#/components/feed/PostCard";
import { listBookmarksFn } from "#/lib/server/bookmarks";

const bookmarksQueryOptions = () =>
	queryOptions({
		queryKey: ["bookmarks"] as const,
		queryFn: () => listBookmarksFn(),
	});

export const Route = createFileRoute("/_authed/bookmarks")({
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(bookmarksQueryOptions()),
	component: BookmarksPage,
});

const authedRoute = getRouteApi("/_authed");

function BookmarksPage() {
	const { session } = authedRoute.useRouteContext();
	const { data: bookmarks } = useSuspenseQuery(bookmarksQueryOptions());

	return (
		<div className="space-y-4">
			<h1 className="text-xl font-semibold tracking-tight">Bookmarks</h1>

			{bookmarks.length === 0 ? (
				<div className="bi-card p-8 text-center">
					<BookmarkSimpleIcon className="mx-auto size-8 text-muted-foreground/50" />
					<p className="mt-3 text-sm text-muted-foreground">
						Posts you save will appear here.
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{bookmarks.map((post, i) => (
						<PostCard
							key={post.id}
							post={post}
							feedPosition={i}
							currentUserId={session.user.id}
						/>
					))}
				</div>
			)}
		</div>
	);
}
