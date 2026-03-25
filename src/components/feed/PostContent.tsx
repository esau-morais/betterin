import DOMPurify from "dompurify";
import { cn } from "#/lib/utils";
import type { PostContentFormat } from "#/lib/validation";

const ALLOWED_TAGS = ["strong", "em", "code", "p", "br"];

export function PostContent({
	content,
	contentFormat,
	contentHtml,
	expanded,
}: {
	content: string;
	contentFormat: PostContentFormat | null;
	contentHtml: string | null;
	expanded: boolean;
}) {
	if (contentFormat === "tiptap" && contentHtml) {
		const clean = DOMPurify.sanitize(contentHtml, {
			ALLOWED_TAGS,
			ALLOWED_ATTR: [],
		});
		return (
			<div
				className={cn(
					"post-content leading-relaxed break-words select-text [&_strong]:font-semibold [&_code]:bg-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[0.9em] [&_p]:mb-0 [&_p+p]:mt-1.5",
					!expanded && "line-clamp-5",
				)}
				// biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized via DOMPurify with allowlist
				dangerouslySetInnerHTML={{ __html: clean }}
			/>
		);
	}

	return (
		<p
			className={cn(
				"leading-relaxed whitespace-pre-wrap break-words select-text",
				!expanded && "line-clamp-5",
			)}
		>
			{content}
		</p>
	);
}
