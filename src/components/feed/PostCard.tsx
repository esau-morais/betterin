import {
	ArrowCounterClockwiseIcon,
	DotsThreeIcon,
	EyeSlashIcon,
	FlagIcon,
	GlobeIcon,
	HeartIcon,
	ProhibitIcon,
	RepeatIcon,
	TrashIcon,
	UsersThreeIcon,
	XCircleIcon,
} from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { TimeAgo } from "#/components/shared/TimeAgo";
import { UserAvatar } from "#/components/shared/UserAvatar";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

import type { FeedPost } from "#/lib/server/feed";
import {
	createRepostFn,
	deletePostFn,
	toggleReactionFn,
	undoRepostFn,
} from "#/lib/server/feed";
import {
	hidePostFn,
	markNotInterestedFn,
	muteAuthorFn,
	toggleSavePostFn,
} from "#/lib/server/feed-events";
import { useShare } from "#/lib/use-share";
import type { ReactionType } from "#/lib/validation";
import { ArticlePostCard } from "./ArticlePostCard";
import { CommentSection } from "./CommentSection";
import { EventCard } from "./EventCard";
import { MediaGrid } from "./MediaGrid";
import { PollDisplay } from "./PollDisplay";
import { PostContent } from "./PostContent";
import { QuotedPostEmbed } from "./QuotedPostEmbed";
import { QuoteRepostDialog } from "./QuoteRepostDialog";
import { ReactionBar } from "./ReactionBar";

type DismissType = "hide" | "not_interested" | "mute";
const DISMISS_DELAY_MS = 5000;

export function PostCard({
	post,
	feedPosition,
	currentUserId,
	onRemoved,
}: {
	post: FeedPost;
	feedPosition?: number;
	currentUserId?: string;
	onRemoved?: () => void;
}) {
	const queryClient = useQueryClient();
	const [commentsOpen, setCommentsOpen] = useState(false);
	const [expanded, setExpanded] = useState(false);
	const displayPost = post.repostOf ?? post;
	const displayAuthor = displayPost.author;
	const displayContent = displayPost.content;
	const displayCreatedAt = displayPost.createdAt;
	const targetPostId = post.repostOf ? post.repostOf.id : post.id;

	const [myReaction, setMyReaction] = useState(displayPost.myReaction);
	const [deleted, setDeleted] = useState(false);
	const [dismissed, setDismissed] = useState<DismissType | null>(null);
	const [confirmed, setConfirmed] = useState(false);
	const [saved, setSaved] = useState(displayPost.isSaved);
	const [isReposted, setIsReposted] = useState(displayPost.isReposted);
	const [quoteOpen, setQuoteOpen] = useState(false);
	const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const isAuthor = currentUserId === post.author.id;
	const isOriginalAuthor = currentUserId === displayAuthor.id;
	const isLongContent = displayContent.length > 500;
	const showImpressions =
		isOriginalAuthor || displayPost.authorShowsImpressions;

	const { share: handleShare } = useShare(targetPostId, displayAuthor.name);

	useEffect(() => {
		return () => {
			if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
		};
	}, []);

	const confirmDismiss = useCallback(
		async (type: DismissType) => {
			setConfirmed(true);
			try {
				if (type === "hide") await hidePostFn({ data: { postId: post.id } });
				else if (type === "not_interested")
					await markNotInterestedFn({ data: { postId: post.id } });
				else if (type === "mute") {
					await muteAuthorFn({ data: { authorId: post.author.id } });
					await queryClient.invalidateQueries({ queryKey: ["feed"] });
				}
			} catch {
				setDismissed(null);
				setConfirmed(false);
			}
		},
		[post.id, post.author.id, queryClient],
	);

	const handleDismiss = useCallback(
		(type: DismissType) => {
			setDismissed(type);
			dismissTimerRef.current = setTimeout(() => {
				confirmDismiss(type);
			}, DISMISS_DELAY_MS);
		},
		[confirmDismiss],
	);

	const handleUndoDismiss = useCallback(() => {
		if (dismissTimerRef.current) {
			clearTimeout(dismissTimerRef.current);
			dismissTimerRef.current = null;
		}
		setDismissed(null);
	}, []);

	const reactionMutation = useMutation({
		mutationFn: (type: ReactionType) =>
			toggleReactionFn({ data: { postId: targetPostId, type } }),
		onMutate: (type) => {
			const prev = myReaction;
			setMyReaction(prev === type ? null : type);
			return { prev };
		},
		onError: (_err, _type, context) => {
			if (context) setMyReaction(context.prev);
		},
		onSuccess: (data) => setMyReaction(data.reaction),
	});

	const deleteMutation = useMutation({
		mutationFn: () => deletePostFn({ data: { postId: post.id } }),
		onMutate: () => setDeleted(true),
		onError: () => setDeleted(false),
		onSuccess: () => {
			queryClient.setQueriesData<{
				pages: Array<{
					posts: Array<{ id: string }>;
					nextCursor: string | null;
					feedMode: string;
					rankingScores?: number[];
				}>;
				pageParams: unknown[];
			}>({ queryKey: ["feed"] }, (old) => {
				if (!old) return old;
				return {
					...old,
					pages: old.pages.map((page) => ({
						...page,
						posts: page.posts.filter((p) => p.id !== post.id),
					})),
				};
			});
		},
	});

	const saveMutation = useMutation({
		mutationFn: () => toggleSavePostFn({ data: { postId: targetPostId } }),
		onMutate: () => {
			const prev = saved;
			setSaved(!prev);
			return { prev };
		},
		onError: (_err, _vars, context) => {
			if (context) setSaved(context.prev);
		},
		onSuccess: (data) => {
			setSaved(data.saved);
			if (!data.saved && onRemoved) onRemoved();
		},
	});

	const repostMutation = useMutation({
		mutationFn: () => createRepostFn({ data: { postId: targetPostId } }),
		onMutate: () => setIsReposted(true),
		onError: () => setIsReposted(false),
		onSuccess: () => {
			toast("Reposted");
			queryClient.invalidateQueries({ queryKey: ["feed"] });
		},
	});

	const undoRepostMutation = useMutation({
		mutationFn: () => undoRepostFn({ data: { postId: targetPostId } }),
		onMutate: () => setIsReposted(false),
		onError: () => setIsReposted(true),
		onSuccess: () => {
			toast("Repost removed");
			queryClient.invalidateQueries({ queryKey: ["feed"] });
		},
	});

	if (deleted || confirmed) return null;

	if (dismissed) {
		const dismissLabels: Record<DismissType, string> = {
			hide: "Post hidden.",
			not_interested: "Thanks. We\u2019ll tune your feed.",
			mute: `Muted ${post.author.name.split(" ")[0]}.`,
		};

		return (
			<div
				className="bi-card !py-3 flex items-center gap-3 animate-fade-up"
				data-post-id={post.id}
			>
				<span className="text-sm text-muted-foreground">
					{dismissLabels[dismissed]}
				</span>
				<Button
					variant="outline"
					size="sm"
					className="ml-auto"
					onClick={handleUndoDismiss}
				>
					<ArrowCounterClockwiseIcon className="size-4" />
					Undo
				</Button>
			</div>
		);
	}

	const attribution = getAttribution(post.source);

	return (
		<article
			className="bi-card !pb-2 space-y-2 animate-fade-up relative"
			data-post-id={post.id}
			data-feed-position={feedPosition}
		>
			<Link
				to="/post/$postId"
				params={{ postId: targetPostId }}
				className="absolute inset-0 z-0 rounded-xl"
				tabIndex={-1}
				aria-label={`View post by ${displayAuthor.name}`}
			/>

			{attribution && (
				<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
					{attribution.icon}
					<span>{attribution.text}</span>
				</div>
			)}

			{post.repostOf && (
				<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<RepeatIcon className="size-3.5" />
					<span>
						<Link
							to="/profile/$handle"
							params={{ handle: post.author.handle ?? post.author.id }}
							className="relative z-10 font-medium hover:underline"
						>
							{post.author.name}
						</Link>
						{" reposted"}
					</span>
				</div>
			)}

			<div className="relative z-10 flex items-start gap-3">
				<Link
					to="/profile/$handle"
					params={{ handle: displayAuthor.handle ?? displayAuthor.id }}
					className="flex items-start gap-3 flex-1 min-w-0 rounded-lg group/author focus-ring"
				>
					<span className="shrink-0 rounded-full">
						<UserAvatar name={displayAuthor.name} image={displayAuthor.image} />
					</span>

					<div className="flex-1 min-w-0">
						<div className="flex items-baseline gap-1.5">
							<span className="text-sm font-medium truncate group-hover/author:underline">
								{displayAuthor.name}
							</span>
							<span className="text-muted-foreground" aria-hidden>
								·
							</span>
							<TimeAgo date={displayCreatedAt} />
						</div>
						{displayAuthor.headline && (
							<p className="text-xs text-muted-foreground truncate">
								{displayAuthor.headline}
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
						{!isAuthor && (
							<>
								<DropdownMenuItem onSelect={() => handleDismiss("hide")}>
									<EyeSlashIcon className="size-4" />
									Hide this post
								</DropdownMenuItem>
								<DropdownMenuItem
									onSelect={() => handleDismiss("not_interested")}
								>
									<XCircleIcon className="size-4" />
									Not interested
								</DropdownMenuItem>
								<DropdownMenuItem onSelect={() => handleDismiss("mute")}>
									<ProhibitIcon className="size-4" />
									Mute {post.author.name.split(" ")[0]}
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem>
									<FlagIcon className="size-4" />
									Report
								</DropdownMenuItem>
							</>
						)}

						{isAuthor && (
							<DropdownMenuItem
								variant="destructive"
								onSelect={() => deleteMutation.mutate()}
							>
								<TrashIcon className="size-4" />
								Delete post
							</DropdownMenuItem>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<div>
				{!post.article && (
					<>
						<PostContent
							content={displayContent}
							contentFormat={displayPost.contentFormat ?? null}
							contentHtml={displayPost.contentHtml ?? null}
							expanded={expanded || !isLongContent}
						/>
						{isLongContent && !expanded && (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									setExpanded(true);
								}}
								className="relative z-10 mt-1 rounded text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus-ring"
							>
								Read more
							</button>
						)}
					</>
				)}
				{post.mediaUrls && post.mediaUrls.length > 0 && !post.repostOf && (
					<div className="relative z-10">
						<MediaGrid mediaUrls={post.mediaUrls} />
					</div>
				)}
				{post.poll && (
					<div className="relative z-10">
						<PollDisplay poll={post.poll} />
					</div>
				)}
				{post.event && (
					<div className="relative z-10">
						<EventCard event={post.event} />
					</div>
				)}
				{post.article && (
					<div className="relative z-10">
						<ArticlePostCard article={post.article} />
					</div>
				)}
				{post.quotedPost && (
					<div className="relative z-10 mt-1">
						<QuotedPostEmbed post={post.quotedPost} />
					</div>
				)}
			</div>

			<div className="relative z-10">
				<ReactionBar
					myReaction={myReaction}
					reactionTypes={displayPost.reactionTypes}
					reactionCount={displayPost.reactionCount}
					commentCount={displayPost.commentCount}
					impressionCount={showImpressions ? displayPost.impressionCount : null}
					postId={isOriginalAuthor ? targetPostId : undefined}
					saved={saved}
					isReposted={isReposted}
					onReact={reactionMutation.mutate}
					onToggleComments={() => setCommentsOpen(!commentsOpen)}
					onToggleSave={() => saveMutation.mutate()}
					onShare={handleShare}
					onRepost={() => repostMutation.mutate()}
					onUndoRepost={() => undoRepostMutation.mutate()}
					onQuote={() => setQuoteOpen(true)}
					commentsOpen={commentsOpen}
				/>
			</div>

			{commentsOpen && (
				<div className="relative z-10">
					<CommentSection postId={post.id} />
				</div>
			)}

			{currentUserId && (
				<QuoteRepostDialog
					post={{
						id: targetPostId,
						content: displayContent,
						createdAt: displayCreatedAt,
						author: displayAuthor,
					}}
					open={quoteOpen}
					onOpenChange={setQuoteOpen}
				/>
			)}
		</article>
	);
}

function getAttribution(source: FeedPost["source"]) {
	if (!source || source.type === "network") return null;

	switch (source.type) {
		case "activity":
			return {
				icon: <HeartIcon className="size-3.5" />,
				text: `${source.actorName} liked this`,
			};
		case "extended":
			return {
				icon: <UsersThreeIcon className="size-3.5" />,
				text: "From your extended network",
			};
		case "discovery":
			return {
				icon: <GlobeIcon className="size-3.5" />,
				text: "Suggested for you",
			};
	}
}
