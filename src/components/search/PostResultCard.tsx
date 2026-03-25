import { Link } from "@tanstack/react-router";
import {
	type HighlightSegment,
	highlightMatches,
} from "#/components/search/highlight-match";
import { TimeAgo } from "#/components/shared/TimeAgo";
import { UserAvatar } from "#/components/shared/UserAvatar";
import type { PostResult } from "#/lib/server/search";

function Hl({ segments }: { segments: HighlightSegment[] }) {
	return (
		<>
			{segments.map((seg) =>
				seg.highlighted ? (
					<mark
						key={`${seg.text}-h`}
						className="rounded-sm bg-accent text-accent-foreground"
					>
						{seg.text}
					</mark>
				) : (
					seg.text
				),
			)}
		</>
	);
}

export function PostResultCard({
	post,
	query,
}: {
	post: PostResult;
	query: string;
}) {
	return (
		<article className="relative rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm">
			<Link
				to="/post/$postId"
				params={{ postId: post.id }}
				className="absolute inset-0 z-0 rounded-xl"
				tabIndex={-1}
				aria-label={`View post by ${post.author.name}`}
			/>

			<div className="relative z-10 flex items-center gap-2">
				<Link
					to="/profile/$handle"
					params={{
						handle: post.author.handle ?? post.author.id,
					}}
				>
					<UserAvatar
						name={post.author.name}
						image={post.author.avatarUrl}
						size="sm"
					/>
				</Link>
				<div className="min-w-0 flex-1">
					<Link
						to="/profile/$handle"
						params={{
							handle: post.author.handle ?? post.author.id,
						}}
						className="truncate text-sm font-medium text-foreground hover:underline"
					>
						{post.author.name}
					</Link>
					{post.author.headline && (
						<p className="truncate text-xs text-muted-foreground">
							{post.author.headline}
						</p>
					)}
				</div>
				<span className="shrink-0 font-mono text-xs text-muted-foreground">
					<TimeAgo date={post.createdAt} />
				</span>
			</div>
			<p className="mt-2 line-clamp-3 text-base text-foreground">
				<Hl segments={highlightMatches(post.content, query)} />
			</p>
		</article>
	);
}
