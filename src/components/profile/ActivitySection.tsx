import {
	ChartBarIcon,
	DotsThreeIcon,
	FlagIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { TimeAgo } from "#/components/shared/TimeAgo";
import { UserAvatar } from "#/components/shared/UserAvatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { REACTION_TYPES } from "#/lib/reactions";
import { deletePostFn } from "#/lib/server/feed";

type ProfilePost = {
	id: string;
	content: string;
	createdAt: Date;
	reactionCount: number;
	reactionTypes: string[];
	commentCount: number;
	impressionCount: number;
	author: {
		id: string;
		name: string;
		image: string | null;
		handle: string;
		headline: string | null;
	};
};

function ActivityPostItem({
	post,
	currentUserId,
}: {
	post: ProfilePost;
	currentUserId?: string;
}) {
	const [deleted, setDeleted] = useState(false);

	const deleteMutation = useMutation({
		mutationFn: () => deletePostFn({ data: { postId: post.id } }),
		onMutate: () => setDeleted(true),
		onError: () => setDeleted(false),
	});

	if (deleted) return null;

	const isAuthor = currentUserId === post.author.id;
	const hasAnalytics =
		post.reactionCount > 0 || post.commentCount > 0 || post.impressionCount > 0;
	const reactionText =
		post.reactionCount > 0 ? post.reactionCount.toLocaleString() : null;

	return (
		<article className="py-3 first:pt-0 last:pb-0 relative">
			<Link
				to="/post/$postId"
				params={{ postId: post.id }}
				className="absolute inset-0 z-0 rounded-xl"
				tabIndex={-1}
				aria-label={`View post by ${post.author.name}`}
			/>
			<div className="relative z-10 flex items-start gap-3">
				<Link
					to="/profile/$handle"
					params={{ handle: post.author.handle }}
					className="flex items-start gap-3 flex-1 min-w-0 rounded-lg group/author focus-ring"
				>
					<span className="shrink-0 rounded-full">
						<UserAvatar name={post.author.name} image={post.author.image} />
					</span>
					<div className="flex-1 min-w-0">
						<div className="flex items-baseline gap-1.5">
							<span className="text-sm font-medium truncate group-hover/author:underline">
								{post.author.name}
							</span>
							<span className="text-muted-foreground" aria-hidden>
								·
							</span>
							<TimeAgo date={post.createdAt} />
						</div>
						{post.author.headline && (
							<p className="text-xs text-muted-foreground truncate">
								{post.author.headline}
							</p>
						)}
					</div>
				</Link>

				<DropdownMenu modal={false}>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-ring"
							aria-label="Post options"
						>
							<DotsThreeIcon className="size-5" weight="bold" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="min-w-[200px]">
						{isAuthor ? (
							<DropdownMenuItem
								variant="destructive"
								onSelect={() => deleteMutation.mutate()}
							>
								<TrashIcon className="size-4" />
								Delete post
							</DropdownMenuItem>
						) : (
							<DropdownMenuItem>
								<FlagIcon className="size-4" />
								Report
							</DropdownMenuItem>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<p className="mt-1 ml-11 leading-relaxed line-clamp-3 whitespace-pre-wrap break-words select-text">
				{post.content}
			</p>

			{hasAnalytics && (
				<div className="relative z-10 mt-2 flex items-center justify-between text-sm text-muted-foreground pointer-events-none">
					{reactionText ? (
						<div className="flex items-center gap-1.5">
							<div className="flex items-center -space-x-0.5">
								{REACTION_TYPES.filter((r) =>
									post.reactionTypes.includes(r.type),
								).map(({ type, icon: Icon }) => (
									<Icon
										key={type}
										weight="fill"
										className="size-4"
										aria-hidden
									/>
								))}
							</div>
							<span>{reactionText}</span>
						</div>
					) : (
						<div />
					)}
					<div className="flex items-center gap-3 pointer-events-auto">
						{post.impressionCount > 0 && (
							<Link
								to="/post/$postId/analytics"
								params={{ postId: post.id }}
								className="flex items-center gap-1 rounded hover:text-foreground transition-colors focus-ring"
							>
								<ChartBarIcon className="size-3.5" aria-hidden />
								<span className="bi-mono">
									{post.impressionCount.toLocaleString()}
								</span>
							</Link>
						)}
						{post.commentCount > 0 && (
							<Link
								to="/post/$postId"
								params={{ postId: post.id }}
								className="rounded hover:underline hover:text-foreground transition-colors focus-ring"
							>
								{post.commentCount} comment
								{post.commentCount !== 1 ? "s" : ""}
							</Link>
						)}
					</div>
				</div>
			)}
		</article>
	);
}

export function ActivitySection({
	posts,
	currentUserId,
}: {
	posts: ProfilePost[];
	currentUserId?: string;
}) {
	if (posts.length === 0) return null;

	const previewPosts = posts.slice(0, 2);

	return (
		<section className="bi-card animate-fade-up" aria-label="Activity">
			<h2 className="text-lg font-semibold text-foreground">Activity</h2>
			<div className="mt-3 divide-y divide-border">
				{previewPosts.map((post) => (
					<ActivityPostItem
						key={post.id}
						post={post}
						currentUserId={currentUserId}
					/>
				))}
			</div>
		</section>
	);
}
