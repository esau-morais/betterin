/**
 * Split `text` into segments around query-word matches.
 * Uses `String.split(capturingRegex)` which guarantees alternating
 * [nonMatch, match, nonMatch, …] — odd indices are always captures.
 * Single-pass, no stateful regex, no lastIndex mutation.
 */
export type HighlightSegment = { text: string; highlighted: boolean };

export function highlightMatches(
	text: string,
	query: string,
): HighlightSegment[] {
	if (!query.trim()) return [{ text, highlighted: false }];

	const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const words = escaped
		.split(/\s+/)
		.filter((w) => w.length > 0)
		.sort((a, b) => b.length - a.length);

	if (words.length === 0) return [{ text, highlighted: false }];

	// Capturing group → split preserves index parity per ECMA-262 §22.1.3.21
	const pattern = new RegExp(`(${words.join("|")})`, "gi");
	const parts = text.split(pattern);

	const segments: HighlightSegment[] = [];
	for (let i = 0; i < parts.length; i++) {
		if (parts[i].length > 0) {
			segments.push({ text: parts[i], highlighted: i % 2 === 1 });
		}
	}
	return segments;
}
