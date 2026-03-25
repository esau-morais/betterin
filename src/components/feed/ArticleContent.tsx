import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
	"h2",
	"h3",
	"p",
	"br",
	"strong",
	"em",
	"code",
	"pre",
	"blockquote",
	"ul",
	"ol",
	"li",
	"img",
	"a",
	"hr",
];

const ALLOWED_ATTR = ["href", "src", "alt", "target", "rel"];

export function ArticleContent({ html }: { html: string }) {
	const clean = DOMPurify.sanitize(html, {
		ALLOWED_TAGS,
		ALLOWED_ATTR,
	});

	return (
		<div
			className="article-prose"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized via DOMPurify with allowlist
			dangerouslySetInnerHTML={{ __html: clean }}
		/>
	);
}
