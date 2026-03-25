import { ClockIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import type { ArticleData } from "#/lib/server/articles";

export function ArticlePostCard({ article }: { article: ArticleData }) {
	return (
		<Link
			to="/article/$slug"
			params={{ slug: article.slug }}
			className="block rounded-lg border border-border overflow-hidden hover:bg-accent/50 transition-colors"
		>
			{article.coverImageUrl && (
				<img
					src={article.coverImageUrl}
					alt=""
					className="w-full aspect-[2/1] object-cover"
				/>
			)}
			<div className="p-3 space-y-1">
				<h3 className="text-base font-semibold leading-snug line-clamp-2">
					{article.title}
				</h3>
				{article.subtitle && (
					<p className="text-sm text-muted-foreground line-clamp-2">
						{article.subtitle}
					</p>
				)}
				<p className="flex items-center gap-1 text-xs text-muted-foreground bi-mono">
					<ClockIcon className="size-3.5" />
					{article.readingTimeMinutes} min read
				</p>
			</div>
		</Link>
	);
}
