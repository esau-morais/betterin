import {
	ArrowLeftIcon,
	GlobeIcon,
	ImageIcon,
	UsersThreeIcon,
	XIcon,
} from "@phosphor-icons/react";
import {
	queryOptions,
	useMutation,
	useSuspenseQuery,
} from "@tanstack/react-query";
import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import type { JSONContent } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { ArticleEditor } from "#/components/feed/ArticleEditor";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import type { EditableArticle } from "#/lib/server/articles";
import {
	createArticlePostFn,
	getArticleForEditFn,
	updateArticleFn,
} from "#/lib/server/articles";
import { cn } from "#/lib/utils";

const articleEditQueryOptions = (articleId: string) =>
	queryOptions({
		queryKey: ["article-edit", articleId] as const,
		queryFn: () => getArticleForEditFn({ data: { articleId } }),
	});

export const Route = createFileRoute("/_authed/write")({
	validateSearch: z.object({
		article: z.string().optional(),
	}),
	loaderDeps: ({ search }) => ({ article: search.article }),
	loader: ({ context: { queryClient }, deps: { article } }) => {
		if (article) {
			return queryClient.ensureQueryData(articleEditQueryOptions(article));
		}
	},
	pendingComponent: WriteSkeleton,
	component: WriteArticlePage,
});

function WriteSkeleton() {
	return (
		<div className="max-w-[720px] mx-auto space-y-6">
			<div className="flex items-center justify-between">
				<Skeleton className="h-8 w-20" />
				<Skeleton className="h-8 w-24" />
			</div>
			<Skeleton className="w-full aspect-[3/1] rounded-lg" />
			<Skeleton className="h-10 w-full" />
			<Skeleton className="h-6 w-2/3" />
			<Skeleton className="h-[400px] w-full rounded-lg" />
		</div>
	);
}

const VISIBILITY_OPTIONS = [
	{ value: "public" as const, icon: GlobeIcon, label: "Anyone" },
	{ value: "connections" as const, icon: UsersThreeIcon, label: "Connections" },
];

function WriteArticlePage() {
	const { article: articleId } = Route.useSearch();

	if (articleId) {
		return <EditForm articleId={articleId} />;
	}

	return <WriteForm editArticle={null} />;
}

function EditForm({ articleId }: { articleId: string }) {
	const { data: editArticle } = useSuspenseQuery(
		articleEditQueryOptions(articleId),
	);

	return <WriteForm editArticle={editArticle} />;
}

function WriteForm({ editArticle }: { editArticle: EditableArticle | null }) {
	const navigate = useNavigate();
	const router = useRouter();
	const coverInputRef = useRef<HTMLInputElement>(null);
	const isEdit = !!editArticle;

	const [title, setTitle] = useState(editArticle?.title ?? "");
	const [subtitle, setSubtitle] = useState(editArticle?.subtitle ?? "");
	const [coverUrl, setCoverUrl] = useState(editArticle?.coverImageUrl ?? "");
	const [coverPreview, setCoverPreview] = useState(
		editArticle?.coverImageUrl ?? "",
	);
	const [coverUploading, setCoverUploading] = useState(false);
	const [bodyJson, setBodyJson] = useState<JSONContent | null>(
		(editArticle?.bodyJson as JSONContent) ?? null,
	);
	const [bodyText, setBodyText] = useState("");
	const [visibility, setVisibility] = useState<
		"public" | "connections" | "private"
	>(editArticle?.visibility ?? "public");
	const [dirty, setDirty] = useState(false);

	useEffect(() => {
		if (!dirty) return;
		const handler = (e: BeforeUnloadEvent) => {
			e.preventDefault();
		};
		window.addEventListener("beforeunload", handler);
		return () => window.removeEventListener("beforeunload", handler);
	}, [dirty]);

	const handleEditorChange = useCallback((json: JSONContent, text: string) => {
		setBodyJson(json);
		setBodyText(text);
		setDirty(true);
	}, []);

	const handleCoverUpload = useCallback(async (file: File) => {
		setCoverUploading(true);
		const preview = URL.createObjectURL(file);
		setCoverPreview(preview);
		try {
			const formData = new FormData();
			formData.append("file", file);
			const res = await fetch("/api/upload", {
				method: "POST",
				body: formData,
			});
			if (!res.ok) {
				setCoverPreview("");
				return;
			}
			const { url } = await res.json();
			setCoverUrl(url);
			setCoverPreview(url);
			setDirty(true);
		} catch {
			setCoverPreview("");
		} finally {
			setCoverUploading(false);
		}
	}, []);

	const handleRemoveCover = useCallback(() => {
		if (coverPreview && !coverPreview.startsWith("http")) {
			URL.revokeObjectURL(coverPreview);
		}
		setCoverUrl("");
		setCoverPreview("");
		setDirty(true);
	}, [coverPreview]);

	const createMutation = useMutation({
		mutationFn: createArticlePostFn,
		onSuccess: (result) => {
			setDirty(false);
			navigate({
				to: "/article/$slug",
				params: { slug: result.article.slug },
			});
		},
	});

	const updateMutation = useMutation({
		mutationFn: updateArticleFn,
		onSuccess: () => {
			setDirty(false);
			if (editArticle) {
				navigate({
					to: "/article/$slug",
					params: { slug: editArticle.slug },
				});
			}
		},
	});

	const isPending = createMutation.isPending || updateMutation.isPending;
	const canPublish =
		title.trim().length > 0 && bodyText.trim().length > 0 && !isPending;

	function handlePublish() {
		if (!canPublish || !bodyJson) return;

		if (isEdit && editArticle) {
			updateMutation.mutate({
				data: {
					articleId: editArticle.id,
					title: title.trim(),
					subtitle: subtitle.trim() || undefined,
					coverImageUrl: coverUrl || undefined,
					body: JSON.stringify(bodyJson),
					visibility,
				},
			});
		} else {
			createMutation.mutate({
				data: {
					title: title.trim(),
					subtitle: subtitle.trim() || undefined,
					coverImageUrl: coverUrl || undefined,
					body: JSON.stringify(bodyJson),
					visibility,
				},
			});
		}
	}

	function handleBack() {
		if (dirty) {
			if (!window.confirm("Discard unsaved changes?")) return;
		}
		if (window.history.length > 1) {
			router.history.back();
		} else {
			navigate({ to: "/feed" });
		}
	}

	return (
		<div className="space-y-6">
			<div className="sticky top-14 z-30 -mx-4 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-sm">
				<div className="flex items-center justify-between">
					<button
						type="button"
						onClick={handleBack}
						className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus-ring rounded-lg px-2 py-1 -ml-2"
					>
						<ArrowLeftIcon className="size-4" />
						<span className="font-medium">Back</span>
					</button>
					<div className="flex items-center gap-2">
						<div className="flex items-center gap-1">
							{VISIBILITY_OPTIONS.map(({ value, icon: Icon, label }) => (
								<button
									key={value}
									type="button"
									onClick={() => {
										setVisibility(value);
										setDirty(true);
									}}
									className={cn(
										"flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors focus-ring",
										visibility === value
											? "bg-accent text-primary"
											: "text-muted-foreground hover:bg-muted",
									)}
									aria-label={label}
									aria-pressed={visibility === value}
								>
									<Icon className="size-3" aria-hidden />
									{label}
								</button>
							))}
						</div>
						{bodyText.length > 0 && (
							<span className="bi-mono text-xs text-text-tertiary tabular-nums">
								{bodyText.length} chars
							</span>
						)}
						<Button
							variant="default"
							size="sm"
							onClick={handlePublish}
							disabled={!canPublish}
						>
							{isPending ? "Publishing…" : isEdit ? "Update" : "Publish"}
						</Button>
					</div>
				</div>
			</div>

			{(createMutation.error || updateMutation.error) && (
				<p className="text-sm text-destructive">
					{createMutation.error?.message ??
						updateMutation.error?.message ??
						"Failed to save"}
				</p>
			)}

			<div className="max-w-[720px] mx-auto space-y-6">
				{coverPreview ? (
					<div className="relative group">
						<img
							src={coverPreview}
							alt="Cover"
							className={cn(
								"w-full aspect-[2/1] object-cover rounded-lg",
								coverUploading && "opacity-50",
							)}
						/>
						<button
							type="button"
							onClick={handleRemoveCover}
							className="absolute top-2 right-2 rounded-full bg-background/80 p-1.5 text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
							aria-label="Remove cover image"
						>
							<XIcon className="size-4" />
						</button>
					</div>
				) : (
					<button
						type="button"
						onClick={() => coverInputRef.current?.click()}
						className="w-full aspect-[3/1] rounded-lg border-2 border-dashed border-border flex items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
					>
						<ImageIcon className="size-5" />
						Add cover image
					</button>
				)}
				<input
					ref={coverInputRef}
					type="file"
					accept="image/jpeg,image/png,image/gif,image/webp"
					className="hidden"
					onChange={(e) => {
						const file = e.target.files?.[0];
						if (file) handleCoverUpload(file);
						e.target.value = "";
					}}
				/>

				<input
					type="text"
					value={title}
					onChange={(e) => {
						setTitle(e.target.value);
						setDirty(true);
					}}
					placeholder="Title"
					className="w-full text-3xl font-bold bg-transparent border-none outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded placeholder:text-muted-foreground/50"
				/>

				<input
					type="text"
					value={subtitle}
					onChange={(e) => {
						setSubtitle(e.target.value);
						setDirty(true);
					}}
					placeholder="Add a subtitle (optional)"
					className="w-full text-lg text-muted-foreground bg-transparent border-none outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded placeholder:text-muted-foreground/40"
				/>

				<ArticleEditor
					initialContent={(editArticle?.bodyJson as JSONContent) ?? undefined}
					onChange={handleEditorChange}
					stickyClass="sticky top-[6.25rem] z-20 bg-background/80 backdrop-blur-sm -mx-4 px-4 pt-2"
				/>
			</div>
		</div>
	);
}
