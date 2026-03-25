import {
	ArrowLeftIcon,
	ClockIcon,
	PencilSimpleIcon,
	UserPlusIcon,
} from "@phosphor-icons/react";
import { queryOptions, useMutation } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	notFound,
	useRouter,
} from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ArticleContent } from "#/components/feed/ArticleContent";
import { CommentSection } from "#/components/feed/CommentSection";
import { ReactionBar } from "#/components/feed/ReactionBar";
import { TopNav } from "#/components/layout/TopNav";
import { TimeAgo } from "#/components/shared/TimeAgo";
import { UserAvatar } from "#/components/shared/UserAvatar";
import { Button } from "#/components/ui/button";
import { getArticleBySlugFn } from "#/lib/server/articles";
import { getSessionFn } from "#/lib/server/auth";
import type { FeedPost } from "#/lib/server/feed";
import {
	createRepostFn,
	getPostByIdFn,
	toggleReactionFn,
	undoRepostFn,
} from "#/lib/server/feed";
import { toggleSavePostFn } from "#/lib/server/feed-events";
import { useScrollVisibility } from "#/lib/use-scroll-visibility";
import { useShare } from "#/lib/use-share";
import { cn } from "#/lib/utils";
import type { ReactionType } from "#/lib/validation";

const articleQueryOptions = (slug: string) =>
	queryOptions({
		queryKey: ["article", slug] as const,
		queryFn: () => getArticleBySlugFn({ data: { slug } }),
	});

const postQueryOptions = (postId: string) =>
	queryOptions({
		queryKey: ["post", postId] as const,
		queryFn: () => getPostByIdFn({ data: { postId } }),
	});

export const Route = createFileRoute("/article/$slug")({
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

		const queryClient = context.queryClient;
		const result = await queryClient.ensureQueryData(
			articleQueryOptions(params.slug),
		);

		if (!result.article) throw notFound();

		const postResult = await queryClient.ensureQueryData(
			postQueryOptions(result.article.postId),
		);

		return {
			article: result.article,
			post: postResult.post,
			session,
			isAuthenticated: !!session,
		};
	},
	head: ({ loaderData }) => {
		const article = loaderData?.article;
		const title = article
			? `${article.title} | Better In`
			: "Article | Better In";
		const description = article?.subtitle ?? "";
		return {
			meta: [
				{ title },
				{ name: "description", content: description },
				{ property: "og:title", content: article?.title ?? title },
				{ property: "og:description", content: description },
				{ property: "og:type", content: "article" },
				{
					property: "og:image",
					content: article?.coverImageUrl ?? "/assets/og-default.png",
				},
				{ name: "twitter:card", content: "summary_large_image" },
			],
		};
	},
	component: ArticlePage,
	notFoundComponent: ArticleNotFound,
});

function ArticleNotFound() {
	return (
		<div className="bi-card flex flex-col items-center justify-center py-16 text-center">
			<h1 className="text-xl font-bold text-foreground">Article not found</h1>
			<p className="mt-2 text-sm text-muted-foreground">
				This article doesn't exist or may have been removed.
			</p>
			<Button variant="default" size="sm" className="mt-4" asChild>
				<Link to="/feed">Back to feed</Link>
			</Button>
		</div>
	);
}

function ArticleLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-dvh bg-background">
			<TopNav />
			<div className="mx-auto max-w-[720px] px-4 pt-20 pb-16 space-y-6">
				{children}
			</div>
		</div>
	);
}

function ArticlePage() {
	const data = Route.useLoaderData();
	const { article } = data;
	const { sentinelRef: headerSentinelRef, isVisible: isHeaderVisible } =
		useScrollVisibility();

	const showCompactHeader = !isHeaderVisible;

	if (data.isAuthenticated && data.session && data.post) {
		return (
			<ArticleLayout>
				<CompactArticleHeader article={article} visible={showCompactHeader} />
				<BackButton />
				<AuthenticatedArticle
					article={article}
					post={data.post}
					isAuthor={data.session.user.id === article.author.id}
					headerSentinelRef={headerSentinelRef}
				/>
			</ArticleLayout>
		);
	}

	return (
		<ArticleLayout>
			<CompactArticleHeader article={article} visible={showCompactHeader} />
			<BackButton />
			<ArticleHeader article={article} />
			<div ref={headerSentinelRef} />
			<ArticleContent html={article.bodyHtml} />
			<footer className="border-t border-border pt-6">
				<div className="flex items-center justify-center gap-2 py-4">
					<Button variant="default" size="sm" asChild>
						<Link to="/sign-in">
							<UserPlusIcon className="size-3.5" />
							Sign in to interact
						</Link>
					</Button>
				</div>
			</footer>
		</ArticleLayout>
	);
}

function CompactArticleHeader({
	article,
	visible,
}: {
	article: ArticleView;
	visible: boolean;
}) {
	return (
		<div
			className={cn(
				"fixed inset-x-0 top-14 z-30 mx-auto w-full max-w-screen-xl border-b border-border bg-background/80 backdrop-blur-sm transition-transform duration-200 ease-out",
				visible ? "translate-y-0" : "-translate-y-full",
			)}
			aria-hidden={!visible}
			{...(visible ? {} : { inert: true as unknown as boolean })}
		>
			<div className="mx-auto flex h-10 max-w-[720px] items-center gap-3 px-4">
				<UserAvatar
					name={article.author.name}
					image={article.author.image}
					className="size-6 text-[10px]"
				/>
				<span className="min-w-0 flex-1 truncate text-sm font-medium">
					{article.title}
				</span>
				<span className="flex shrink-0 items-center gap-1 bi-mono text-xs text-muted-foreground">
					<ClockIcon className="size-3" />
					{article.readingTimeMinutes} min
				</span>
			</div>
		</div>
	);
}

function BackButton() {
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
			<span className="font-medium">Article</span>
		</button>
	);
}

type ArticleView = NonNullable<
	Awaited<ReturnType<typeof getArticleBySlugFn>>["article"]
>;

function ArticleHeader({
	article,
	isAuthor,
}: {
	article: ArticleView;
	isAuthor?: boolean;
}) {
	return (
		<header className="space-y-4">
			{article.coverImageUrl && (
				<img
					src={article.coverImageUrl}
					alt=""
					className="w-full aspect-[2/1] object-cover rounded-lg"
				/>
			)}

			<h1 className="text-3xl font-bold leading-tight">{article.title}</h1>

			{article.subtitle && (
				<p className="text-lg text-muted-foreground">{article.subtitle}</p>
			)}

			<div className="flex items-center gap-3">
				<Link
					to="/profile/$handle"
					params={{ handle: article.author.handle ?? article.author.id }}
					className="shrink-0 rounded-full focus-ring"
				>
					<UserAvatar name={article.author.name} image={article.author.image} />
				</Link>
				<div className="flex-1 min-w-0">
					<Link
						to="/profile/$handle"
						params={{ handle: article.author.handle ?? article.author.id }}
						className="text-sm font-medium hover:underline focus-ring rounded"
					>
						{article.author.name}
					</Link>
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<TimeAgo date={article.createdAt} />
						<span aria-hidden>·</span>
						<span className="flex items-center gap-1 bi-mono">
							<ClockIcon className="size-3.5" />
							{article.readingTimeMinutes} min read
						</span>
					</div>
				</div>
				{isAuthor && (
					<Link
						to="/write"
						search={{ article: article.id }}
						className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors focus-ring"
						aria-label="Edit article"
					>
						<PencilSimpleIcon className="size-4" />
					</Link>
				)}
			</div>
		</header>
	);
}

function AuthenticatedArticle({
	article,
	post,
	isAuthor,
	headerSentinelRef,
}: {
	article: ArticleView;
	post: FeedPost;
	isAuthor: boolean;
	headerSentinelRef: React.RefObject<HTMLDivElement | null>;
}) {
	const postId = post.id;
	const [myReaction, setMyReaction] = useState(post.myReaction);
	const [saved, setSaved] = useState(post.isSaved);
	const [isReposted, setIsReposted] = useState(post.isReposted);

	const { share: handleShare } = useShare(postId, article.author.name);

	const reactionMutation = useMutation({
		mutationFn: (type: ReactionType) =>
			toggleReactionFn({ data: { postId, type } }),
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
		mutationFn: () => toggleSavePostFn({ data: { postId } }),
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
		mutationFn: () => createRepostFn({ data: { postId } }),
		onMutate: () => setIsReposted(true),
		onError: () => setIsReposted(false),
		onSuccess: () => toast("Reposted"),
	});

	const undoRepostMutation = useMutation({
		mutationFn: () => undoRepostFn({ data: { postId } }),
		onMutate: () => setIsReposted(false),
		onError: () => setIsReposted(true),
		onSuccess: () => toast("Repost removed"),
	});

	const reactionBarProps = {
		myReaction,
		reactionTypes: post.reactionTypes,
		reactionCount: post.reactionCount,
		commentCount: post.commentCount,
		impressionCount: null as number | null,
		saved,
		isReposted,
		onReact: reactionMutation.mutate,
		onToggleComments: () => {},
		onToggleSave: () => saveMutation.mutate(),
		onShare: handleShare,
		onRepost: () => repostMutation.mutate(),
		onUndoRepost: () => undoRepostMutation.mutate(),
		onQuote: () => {},
		commentsOpen: true,
	};

	return (
		<>
			<ArticleHeader article={article} isAuthor={isAuthor} />
			<div ref={headerSentinelRef} />
			<ReactionBar {...reactionBarProps} />
			<ArticleContent html={article.bodyHtml} />
			<footer className="space-y-2">
				<ReactionBar {...reactionBarProps} />
				<CommentSection postId={postId} />
			</footer>
		</>
	);
}
