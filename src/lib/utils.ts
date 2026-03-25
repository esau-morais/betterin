import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ReactionType } from "#/lib/validation";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type { ReactionType };

export type Comment = {
	id: string;
	parentId: string | null;
	content: string;
	createdAt: string;
	author: {
		id: string;
		name: string;
		image: string | null;
		handle: string | null;
	};
	myReaction: ReactionType | null;
};

export type CommentWithReplies = Comment & { replies: Comment[] };

export function buildCommentTree(flat: Comment[]): CommentWithReplies[] {
	const map = new Map<string, CommentWithReplies>();
	const roots: CommentWithReplies[] = [];

	for (const c of flat) {
		map.set(c.id, { ...c, replies: [] });
	}

	for (const c of flat) {
		const node = map.get(c.id)!;
		if (c.parentId && map.has(c.parentId)) {
			map.get(c.parentId)?.replies.push(node);
		} else {
			roots.push(node);
		}
	}

	return roots;
}

const MENTION_REGEX = /@([\w]+(?: [\w]+)*)/g;

export function highlightMentions(content: string): string {
	return content.replace(
		MENTION_REGEX,
		'<span class="text-brand font-medium">@$1</span>',
	);
}
