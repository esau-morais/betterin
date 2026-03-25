import {
	ChatCircleIcon,
	DotsThreeIcon,
	FlagIcon,
	LinkIcon,
	PaperPlaneRightIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CommentReactionButton } from "#/components/feed/CommentReactionButton";
import { TimeAgo } from "#/components/shared/TimeAgo";
import { UserAvatar } from "#/components/shared/UserAvatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { useSession } from "#/lib/auth-client";
import {
	createCommentFn,
	getCommentsForPostFn,
	toggleCommentReactionFn,
} from "#/lib/server/feed";
import { useCanHover } from "#/lib/use-hover-intent";
import {
	buildCommentTree,
	type Comment,
	highlightMentions,
	type ReactionType,
} from "#/lib/utils";

const VISIBLE_REPLIES = 2;

export function CommentSection({ postId }: { postId: string }) {
	const { data: session } = useSession();
	const queryClient = useQueryClient();
	const [content, setContent] = useState("");
	const [replyingTo, setReplyingTo] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [expandedThreads, setExpandedThreads] = useState<Set<string>>(
		new Set(),
	);
	const [localReactions, setLocalReactions] = useState<
		Map<string, ReactionType | null>
	>(new Map());
	const inputRef = useRef<HTMLInputElement>(null);

	const { data: comments, isLoading } = useQuery({
		queryKey: ["comments", postId],
		queryFn: () => getCommentsForPostFn({ data: { postId } }),
	});

	const commentTree = comments ? buildCommentTree(comments) : [];

	const commentMutation = useMutation({
		mutationFn: (params: { content: string }) =>
			createCommentFn({
				data: { postId, content: params.content, parentId: null },
			}),
		onSuccess: () => {
			setContent("");
			queryClient.invalidateQueries({ queryKey: ["comments", postId] });
		},
	});

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = content.trim();
		if (!trimmed || commentMutation.isPending) return;
		commentMutation.mutate({ content: trimmed });
	}

	function toggleExpand(commentId: string) {
		setExpandedThreads((prev) => {
			const next = new Set(prev);
			if (next.has(commentId)) {
				next.delete(commentId);
			} else {
				next.add(commentId);
			}
			return next;
		});
	}

	function handleReply(comment: Comment) {
		setReplyingTo({ id: comment.id, name: comment.author.name });
	}

	const handleReplySubmitted = useCallback(() => {
		setReplyingTo(null);
		queryClient.invalidateQueries({ queryKey: ["comments", postId] });
	}, [queryClient, postId]);

	const handleReact = useCallback(
		async (
			commentId: string,
			type: ReactionType,
			currentReaction: ReactionType | null,
		) => {
			const newReaction = currentReaction === type ? null : type;
			setLocalReactions((prev) => new Map(prev).set(commentId, newReaction));

			try {
				const result = await toggleCommentReactionFn({
					data: { commentId, type },
				});
				setLocalReactions((prev) =>
					new Map(prev).set(commentId, result.reaction as ReactionType | null),
				);
			} catch {
				setLocalReactions((prev) =>
					new Map(prev).set(commentId, currentReaction),
				);
			}
		},
		[],
	);

	const getReaction = useCallback(
		(comment: Comment): ReactionType | null => {
			return localReactions.has(comment.id)
				? (localReactions.get(comment.id) ?? null)
				: comment.myReaction;
		},
		[localReactions],
	);

	return (
		<div className="border-t border-border pt-3 space-y-3">
			{session?.user && (
				<form onSubmit={handleSubmit} className="flex gap-2.5 items-center">
					<UserAvatar
						name={session.user.name}
						image={session.user.image}
						size="sm"
					/>
					<div className="flex-1 relative">
						<label htmlFor={`comment-${postId}`} className="sr-only">
							Write a comment
						</label>
						<input
							ref={inputRef}
							id={`comment-${postId}`}
							type="text"
							value={content}
							onChange={(e) => setContent(e.target.value)}
							placeholder="Write a comment…"
							className="w-full rounded-full bg-secondary border border-border px-4 py-2 text-sm placeholder:text-text-tertiary outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-[border-color,box-shadow] pr-10"
							maxLength={1000}
							disabled={commentMutation.isPending}
						/>
						<button
							type="submit"
							disabled={!content.trim() || commentMutation.isPending}
							className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-brand disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors focus-ring"
							aria-label="Send comment"
						>
							<PaperPlaneRightIcon
								className="size-4"
								weight="fill"
								aria-hidden
							/>
						</button>
					</div>
				</form>
			)}

			{isLoading && <CommentSkeleton />}

			{commentTree.map((comment) => {
				const isExpanded = expandedThreads.has(comment.id);
				const hasReplies = comment.replies.length > 0;
				const hiddenCount = comment.replies.length - VISIBLE_REPLIES;
				const visibleReplies = isExpanded
					? comment.replies
					: comment.replies.slice(0, VISIBLE_REPLIES);

				return (
					<div key={comment.id}>
						<CommentItem
							comment={comment}
							onReply={handleReply}
							onReact={handleReact}
							getReaction={getReaction}
							postId={postId}
						/>

						{replyingTo?.id === comment.id && session?.user && (
							<ReplyForm
								postId={postId}
								parentId={comment.id}
								parentName={replyingTo.name}
								onSubmitted={handleReplySubmitted}
								onCancel={() => setReplyingTo(null)}
							/>
						)}

						{hasReplies && (
							<div className="ml-10 mt-2 space-y-2 border-l-2 border-border pl-3">
								{hiddenCount > 0 && !isExpanded && (
									<button
										type="button"
										onClick={() => toggleExpand(comment.id)}
										className="text-sm text-brand hover:underline transition-colors focus-ring rounded"
									>
										View {hiddenCount} more{" "}
										{hiddenCount === 1 ? "reply" : "replies"}
									</button>
								)}

								{visibleReplies.map((reply) => (
									<div key={reply.id}>
										<CommentItem
											comment={reply}
											onReply={handleReply}
											onReact={handleReact}
											getReaction={getReaction}
											postId={postId}
											isReply
										/>
										{replyingTo?.id === reply.id && session?.user && (
											<ReplyForm
												postId={postId}
												parentId={reply.id}
												parentName={replyingTo.name}
												onSubmitted={handleReplySubmitted}
												onCancel={() => setReplyingTo(null)}
											/>
										)}
									</div>
								))}

								{isExpanded && hiddenCount > 0 && (
									<button
										type="button"
										onClick={() => toggleExpand(comment.id)}
										className="text-sm text-muted-foreground hover:text-foreground transition-colors focus-ring rounded"
									>
										Hide replies
									</button>
								)}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

function CommentItem({
	comment,
	onReply,
	onReact,
	getReaction,
	postId,
	isReply = false,
}: {
	comment: Comment;
	onReply: (comment: Comment) => void;
	onReact: (
		commentId: string,
		type: ReactionType,
		currentReaction: ReactionType | null,
	) => void;
	getReaction: (comment: Comment) => ReactionType | null;
	postId: string;
	isReply?: boolean;
}) {
	const { data: session } = useSession();
	const myReaction = getReaction(comment);

	const handleShare = useCallback(() => {
		const url = `${window.location.origin}/post/${postId}#comment-${comment.id}`;
		navigator.clipboard.writeText(url);
		toast("Link copied to clipboard");
	}, [postId, comment.id]);

	return (
		<div className="flex gap-2.5">
			<UserAvatar
				name={comment.author.name}
				image={comment.author.image}
				size={isReply ? "xs" : "sm"}
			/>
			<div className="flex-1 min-w-0">
				<div className="rounded-xl bg-secondary px-3 py-2">
					<div className="flex items-baseline gap-2">
						<span className="text-sm font-medium truncate">
							{comment.author.name}
						</span>
						<TimeAgo date={comment.createdAt} />
					</div>
					<p
						className="text-sm mt-0.5 whitespace-pre-wrap break-words [&_.text-brand]:text-brand [&_.font-medium]:font-medium"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: output is sanitized — highlightMentions only wraps @mentions in span tags
						dangerouslySetInnerHTML={{
							__html: highlightMentions(comment.content),
						}}
					/>
				</div>

				{session?.user && (
					<div className="mt-1 flex items-center gap-3 text-xs">
						<CommentReactionButton
							myReaction={myReaction}
							onReact={(type) => onReact(comment.id, type, myReaction)}
						/>

						<button
							type="button"
							onClick={() => onReply(comment)}
							className="flex items-center gap-1 text-muted-foreground hover:text-brand transition-colors focus-ring rounded"
							aria-label={`Reply to ${comment.author.name}`}
						>
							<ChatCircleIcon className="size-3.5" aria-hidden />
							Reply
						</button>

						<DropdownMenu modal={false}>
							<DropdownMenuTrigger asChild>
								<button
									type="button"
									className="ml-auto rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-ring"
									aria-label="More options"
								>
									<DotsThreeIcon className="size-4" weight="bold" aria-hidden />
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="min-w-[140px]">
								<DropdownMenuItem onSelect={handleShare}>
									<LinkIcon className="size-4" aria-hidden />
									Copy link
								</DropdownMenuItem>
								<DropdownMenuItem>
									<FlagIcon className="size-4" aria-hidden />
									Report
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				)}
			</div>
		</div>
	);
}

function ReplyForm({
	postId,
	parentId,
	parentName,
	onSubmitted,
	onCancel,
}: {
	postId: string;
	parentId: string;
	parentName: string;
	onSubmitted: () => void;
	onCancel: () => void;
}) {
	const { data: session } = useSession();
	const [content, setContent] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const canHover = useCanHover();

	useEffect(() => {
		if (canHover) {
			inputRef.current?.focus();
		}
	}, [canHover]);

	const mutation = useMutation({
		mutationFn: (text: string) =>
			createCommentFn({
				data: { postId, content: text, parentId },
			}),
		onSuccess: () => {
			setContent("");
			onSubmitted();
		},
	});

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = content.trim();
		if (!trimmed || mutation.isPending) return;
		mutation.mutate(trimmed);
	}

	if (!session?.user) return null;

	const inputId = `reply-${parentId}`;

	return (
		<form
			onSubmit={handleSubmit}
			className="mt-2 ml-10 flex gap-2 items-center animate-in fade-in slide-in-from-top-1 duration-150"
		>
			<UserAvatar
				name={session.user.name}
				image={session.user.image}
				size="xs"
			/>
			<div className="flex-1 relative">
				<label htmlFor={inputId} className="sr-only">
					Reply to {parentName}
				</label>
				<input
					ref={inputRef}
					id={inputId}
					type="text"
					value={content}
					onChange={(e) => setContent(e.target.value)}
					placeholder={`Reply to ${parentName}…`}
					className="w-full rounded-full bg-secondary border border-border px-3 py-1.5 text-sm placeholder:text-text-tertiary outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-[border-color,box-shadow] pr-8"
					maxLength={1000}
					disabled={mutation.isPending}
					onKeyDown={(e) => {
						if (e.key === "Escape") {
							onCancel();
						}
					}}
				/>
				<button
					type="submit"
					disabled={!content.trim() || mutation.isPending}
					className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-brand disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors focus-ring"
					aria-label="Send reply"
				>
					<PaperPlaneRightIcon className="size-3.5" weight="fill" aria-hidden />
				</button>
			</div>
			<button
				type="button"
				onClick={onCancel}
				className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-ring rounded"
			>
				Cancel
			</button>
		</form>
	);
}

function CommentSkeleton() {
	return (
		<div className="space-y-2">
			{[1, 2].map((i) => (
				<div key={i} className="flex gap-2.5">
					<div className="size-6 rounded-full bg-muted animate-pulse shrink-0" />
					<div className="flex-1 space-y-1">
						<div className="h-3 w-24 rounded bg-muted animate-pulse" />
						<div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
					</div>
				</div>
			))}
		</div>
	);
}
