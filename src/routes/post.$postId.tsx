import { ArrowLeftIcon, LockIcon, UserPlusIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	notFound,
	useRouter,
} from "@tanstack/react-router";
import { type ReactNode, useCallback, useState } from "react";
import { toast } from "sonner";
import { ArticlePostCard } from "#/components/feed/ArticlePostCard";
import { CommentSection } from "#/components/feed/CommentSection";
import { EventCard } from "#/components/feed/EventCard";
import { MediaGrid } from "#/components/feed/MediaGrid";
import { PollDisplay } from "#/components/feed/PollDisplay";
import { PostContent } from "#/components/feed/PostContent";
import { QuotedPostEmbed } from "#/components/feed/QuotedPostEmbed";
import { QuoteRepostDialog } from "#/components/feed/QuoteRepostDialog";
import { ReactionBar } from "#/components/feed/ReactionBar";
import { AppShell } from "#/components/layout/AppShell";
import { TopNav } from "#/components/layout/TopNav";
import { TimeAgo } from "#/components/shared/TimeAgo";
import { UserAvatar } from "#/components/shared/UserAvatar";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { getSessionFn } from "#/lib/server/auth";
import type { FeedPost } from "#/lib/server/feed";
import {
	createRepostFn,
	getPostByIdFn,
	toggleReactionFn,
	undoRepostFn,
} from "#/lib/server/feed";
import { toggleSavePostFn } from "#/lib/server/feed-events";
import { getProfileFn } from "#/lib/server/profile";
import { useShare } from "#/lib/use-share";
import type { ReactionType } from "#/lib/validation";

export const Route = createFileRoute("/post/$postId")({
	loader: async ({ params, context }) => {
		let session: Awaited<ReturnType<typeof getSessionFn>> | null =
			context.session ?? null;
		if (!session) {
			try {
				session = await getSessionFn();
			} catch {
				session = null;
			}
		}

		const result = await getPostByIdFn({ data: { postId: params.postId } });

		if (!result.post) {
			if (result.reason === "forbidden") {
				return {
					isAuthenticated: !!session,
					session,
					viewerProfile: null,
					post: null,
					reason: "forbidden" as const,
				};
			}
			throw notFound();
		}

		if (session) {
			const viewerProfile = context.profile ?? (await getProfileFn());
			return {
				isAuthenticated: true as const,
				session,
				viewerProfile,
				post: result.post,
				reason: null,
			};
		}

		return {
			isAuthenticated: false as const,
			session: null,
			viewerProfile: null,
			post: result.post,
			reason: null,
		};
	},
	head: ({ loaderData }) => {
		const post = loaderData?.post;
		const title = post
			? `${post.author.name} on Better In`
			: "Post | Better In";
		const description = post?.content.slice(0, 160) ?? "";
		const firstMedia = post?.mediaUrls?.[0];
		return {
			meta: [
				{ title },
				{ name: "description", content: description },
				{ property: "og:title", content: title },
				{ property: "og:description", content: description },
				{ property: "og:type", content: "article" },
				...(firstMedia ? [{ property: "og:image", content: firstMedia }] : []),
				{
					name: "twitter:card",
					content: firstMedia ? "summary_large_image" : "summary",
				},
			],
		};
	},
	component: SinglePostPage,
	notFoundComponent: PostNotFound,
	pendingComponent: PostSkeleton,
});

function PostNotFound() {
	return (
		<div className="bi-card flex flex-col items-center justify-center py-16 text-center">
			<h1 className="text-xl font-bold text-foreground">Post not found</h1>
			<p className="mt-2 text-sm text-muted-foreground">
				This post doesn't exist or may have been removed.
			</p>
			<Button variant="default" size="sm" className="mt-4" asChild>
				<Link to="/feed">Back to feed</Link>
			</Button>
		</div>
	);
}

function PostForbidden() {
	return (
		<div className="bi-card flex flex-col items-center justify-center py-16 text-center">
			<div className="flex size-12 items-center justify-center rounded-full bg-muted">
				<LockIcon className="size-6 text-muted-foreground" />
			</div>
			<h1 className="mt-4 text-xl font-bold text-foreground">
				This post is not available
			</h1>
			<p className="mt-2 text-sm text-muted-foreground">
				The author has limited who can see this post.
			</p>
			<Button variant="default" size="sm" className="mt-4" asChild>
				<Link to="/feed">Back to feed</Link>
			</Button>
		</div>
	);
}

function PostSkeleton() {
	return (
		<div className="bi-card !pb-2 space-y-2">
			<div className="flex items-start gap-3">
				<Skeleton className="size-10 rounded-full" />
				<div className="flex-1 space-y-2">
					<Skeleton className="h-4 w-1/3" />
					<Skeleton className="h-3 w-1/2" />
				</div>
			</div>
			<div className="space-y-2">
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-5/6" />
				<Skeleton className="h-4 w-4/6" />
			</div>
			<Skeleton className="h-px w-full" />
			<div className="flex gap-4">
				<Skeleton className="h-8 w-20 rounded-lg" />
				<Skeleton className="h-8 w-24 rounded-lg" />
			</div>
			<Skeleton className="h-px w-full" />
			<div className="flex gap-2.5 items-center">
				<Skeleton className="size-8 rounded-full" />
				<Skeleton className="h-9 flex-1 rounded-full" />
			</div>
		</div>
	);
}

function PublicPostLayout({
	authorName,
	children,
}: {
	authorName: string;
	children: ReactNode;
}) {
	return (
		<div className="min-h-dvh bg-background">
			<TopNav />
			<div className="mx-auto max-w-screen-lg px-4 pt-14">
				<div className="flex justify-center gap-6 items-start">
					<main className="flex-1 min-w-0 max-w-2xl py-6">{children}</main>
					<aside className="hidden lg:block w-80 shrink-0 sticky top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto py-6">
						<PostPublicSignInCTA authorName={authorName} />
					</aside>
				</div>
			</div>
		</div>
	);
}

function PostPublicSignInCTA({ authorName }: { authorName: string }) {
	return (
		<div className="bi-card space-y-3 text-center">
			<p className="text-sm font-medium text-foreground">
				Join the conversation
			</p>
			<p className="text-xs text-muted-foreground">
				Sign in to react, comment, and connect with {authorName}.
			</p>
			<div className="flex flex-col gap-2">
				<Button variant="default" size="sm" asChild>
					<Link to="/sign-in">Sign in</Link>
				</Button>
				<Button variant="outline" size="sm" asChild>
					<Link to="/sign-in">Join Better In</Link>
				</Button>
			</div>
		</div>
	);
}

function PostAuthorCard({ post }: { post: FeedPost }) {
	return (
		<div className="bi-card flex flex-col items-center text-center py-6">
			<Link
				to="/profile/$handle"
				params={{ handle: post.author.handle ?? post.author.id }}
				className="focus-ring rounded-full"
			>
				<UserAvatar
					name={post.author.name}
					image={post.author.image}
					size="lg"
				/>
			</Link>
			<Link
				to="/profile/$handle"
				params={{ handle: post.author.handle ?? post.author.id }}
				className="mt-3 text-sm font-medium hover:underline focus-ring rounded"
			>
				{post.author.name}
			</Link>
			{post.author.headline && (
				<p className="text-xs text-muted-foreground mt-0.5">
					{post.author.headline}
				</p>
			)}
			{post.author.handle && (
				<p className="bi-mono text-text-tertiary mt-1">@{post.author.handle}</p>
			)}
		</div>
	);
}

function BackToFeed() {
	const router = useRouter();

	const handleBack = useCallback(() => {
		if (window.history.length > 1) {
			router.history.back();
		} else {
			router.navigate({ to: "/feed" });
		}
	}, [router]);

	return (
		<button
			type="button"
			onClick={handleBack}
			className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus-ring rounded-lg px-2 py-1 -ml-2"
			aria-label="Go back"
		>
			<ArrowLeftIcon className="size-4" />
			<span className="font-medium">Post</span>
		</button>
	);
}

function SinglePostPage() {
	const data = Route.useLoaderData();

	if (!data.post) {
		if (data.reason === "forbidden") {
			if (data.isAuthenticated) return <PostForbidden />;
			return (
				<PublicPostLayout authorName="this user">
					<PostForbidden />
				</PublicPostLayout>
			);
		}
		return <PostNotFound />;
	}

	if (data.isAuthenticated && data.session) {
		return (
			<AppShell rightPanel={<PostAuthorCard post={data.post} />}>
				<div className="space-y-4">
					<BackToFeed />
					<AuthenticatedPostView
						post={data.post}
						isAuthor={data.session.user.id === data.post.author.id}
					/>
				</div>
			</AppShell>
		);
	}

	return (
		<PublicPostLayout authorName={data.post.author.name}>
			<div className="space-y-4">
				<BackToFeed />
				<UnauthenticatedPostView post={data.post} />
			</div>
		</PublicPostLayout>
	);
}

function AuthenticatedPostView({
	post,
	isAuthor,
}: {
	post: FeedPost;
	isAuthor: boolean;
}) {
	const [myReaction, setMyReaction] = useState(post.myReaction);
	const [saved, setSaved] = useState(post.isSaved);
	const [isReposted, setIsReposted] = useState(post.isReposted);
	const [quoteOpen, setQuoteOpen] = useState(false);

	const showImpressions = isAuthor || post.authorShowsImpressions;
	const { share: handleShare } = useShare(post.id, post.author.name);

	const reactionMutation = useMutation({
		mutationFn: (type: ReactionType) =>
			toggleReactionFn({ data: { postId: post.id, type } }),
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

	const saveMutation = useMutation({
		mutationFn: () => toggleSavePostFn({ data: { postId: post.id } }),
		onMutate: () => {
			const prev = saved;
			setSaved(!prev);
			return { prev };
		},
		onError: (_err, _vars, context) => {
			if (context) setSaved(context.prev);
		},
		onSuccess: (data) => setSaved(data.saved),
	});

	const repostMutation = useMutation({
		mutationFn: () => createRepostFn({ data: { postId: post.id } }),
		onMutate: () => setIsReposted(true),
		onError: () => setIsReposted(false),
		onSuccess: () => toast("Reposted"),
	});

	const undoRepostMutation = useMutation({
		mutationFn: () => undoRepostFn({ data: { postId: post.id } }),
		onMutate: () => setIsReposted(false),
		onError: () => setIsReposted(true),
		onSuccess: () => toast("Repost removed"),
	});

	return (
		<article className="bi-card !pb-2 space-y-2" data-post-id={post.id}>
			<h1 className="sr-only">Post by {post.author.name}</h1>

			<header className="flex items-start gap-3">
				<Link
					to="/profile/$handle"
					params={{ handle: post.author.handle ?? post.author.id }}
					className="shrink-0 rounded-full focus-ring"
				>
					<UserAvatar name={post.author.name} image={post.author.image} />
				</Link>

				<div className="flex-1 min-w-0">
					<div className="flex items-baseline gap-1.5">
						<Link
							to="/profile/$handle"
							params={{ handle: post.author.handle ?? post.author.id }}
							className="rounded text-sm font-medium truncate hover:underline focus-ring"
						>
							{post.author.name}
						</Link>
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
			</header>

			{!post.article && (
				<PostContent
					content={post.content}
					contentFormat={post.contentFormat}
					contentHtml={post.contentHtml}
					expanded
				/>
			)}

			{!post.repostOf && post.mediaUrls && post.mediaUrls.length > 0 && (
				<MediaGrid mediaUrls={post.mediaUrls} />
			)}

			{post.poll && <PollDisplay poll={post.poll} />}

			{post.event && <EventCard event={post.event} />}

			{post.article && <ArticlePostCard article={post.article} />}

			{post.quotedPost && <QuotedPostEmbed post={post.quotedPost} />}

			<footer>
				<ReactionBar
					myReaction={myReaction}
					reactionTypes={post.reactionTypes}
					reactionCount={post.reactionCount}
					commentCount={post.commentCount}
					impressionCount={showImpressions ? post.impressionCount : null}
					saved={saved}
					isReposted={isReposted}
					onReact={reactionMutation.mutate}
					onToggleComments={() => {}}
					onToggleSave={() => saveMutation.mutate()}
					onShare={handleShare}
					onRepost={() => repostMutation.mutate()}
					onUndoRepost={() => undoRepostMutation.mutate()}
					onQuote={() => setQuoteOpen(true)}
					commentsOpen={true}
				/>
			</footer>

			{isAuthor && (
				<div className="border-t border-border pt-2">
					<Link
						to="/post/$postId/analytics"
						params={{ postId: post.id }}
						className="text-primary text-sm font-medium hover:underline focus-ring rounded"
					>
						View analytics
					</Link>
				</div>
			)}

			<CommentSection postId={post.id} />

			<QuoteRepostDialog
				post={post}
				open={quoteOpen}
				onOpenChange={setQuoteOpen}
			/>
		</article>
	);
}

function UnauthenticatedPostView({ post }: { post: FeedPost }) {
	return (
		<article className="bi-card !pb-2 space-y-2" data-post-id={post.id}>
			<h1 className="sr-only">Post by {post.author.name}</h1>

			<header className="flex items-start gap-3">
				<Link
					to="/profile/$handle"
					params={{ handle: post.author.handle ?? post.author.id }}
					className="shrink-0 rounded-full focus-ring"
				>
					<UserAvatar name={post.author.name} image={post.author.image} />
				</Link>

				<div className="flex-1 min-w-0">
					<div className="flex items-baseline gap-1.5">
						<Link
							to="/profile/$handle"
							params={{ handle: post.author.handle ?? post.author.id }}
							className="rounded text-sm font-medium truncate hover:underline focus-ring"
						>
							{post.author.name}
						</Link>
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
			</header>

			{!post.article && (
				<PostContent
					content={post.content}
					contentFormat={post.contentFormat}
					contentHtml={post.contentHtml}
					expanded
				/>
			)}

			{!post.repostOf && post.mediaUrls && post.mediaUrls.length > 0 && (
				<MediaGrid mediaUrls={post.mediaUrls} />
			)}

			{post.poll && <PollDisplay poll={post.poll} />}

			{post.event && <EventCard event={post.event} />}

			{post.article && <ArticlePostCard article={post.article} />}

			<footer className="border-t border-border pt-3">
				<div className="flex items-center justify-center gap-2 py-2">
					<Button variant="default" size="sm" asChild>
						<Link to="/sign-in">
							<UserPlusIcon className="size-3.5" />
							Sign in to interact
						</Link>
					</Button>
				</div>
			</footer>
		</article>
	);
}
