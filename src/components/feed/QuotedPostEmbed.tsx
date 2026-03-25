import { Link } from "@tanstack/react-router";
import { TimeAgo } from "#/components/shared/TimeAgo";
import { UserAvatar } from "#/components/shared/UserAvatar";
import type { PostContentFormat } from "#/lib/validation";
import { PostContent } from "./PostContent";

export type QuotedPostData = {
	id: string;
	content: string;
	contentFormat?: PostContentFormat | null;
	contentHtml?: string | null;
	createdAt: string;
	author: {
		id: string;
		name: string;
		image: string | null;
		handle: string | null;
		headline: string | null;
		avatarFrame: string | null;
	};
};

export function QuotedPostEmbed({ post }: { post: QuotedPostData }) {
	return (
		<Link
			to="/post/$postId"
			params={{ postId: post.id }}
			className="block rounded-lg border border-border p-3 hover:bg-secondary/50 transition-colors focus-ring"
		>
			<div className="flex items-center gap-2">
				<UserAvatar
					name={post.author.name}
					image={post.author.image}
					size="sm"
				/>
				<div className="flex-1 min-w-0">
					<div className="flex items-baseline gap-1.5">
						<span className="text-sm font-medium truncate">
							{post.author.name}
						</span>
						<span className="text-muted-foreground" aria-hidden>
							·
						</span>
						<TimeAgo date={post.createdAt} />
					</div>
				</div>
			</div>
			<div className="mt-2 text-sm text-muted-foreground">
				<PostContent
					content={post.content}
					contentFormat={post.contentFormat ?? null}
					contentHtml={post.contentHtml ?? null}
					expanded={false}
				/>
			</div>
		</Link>
	);
}
