import type { HighlightSegment } from "#/components/search/highlight-match";

export function HighlightedText({
	segments,
}: {
	segments: HighlightSegment[];
}) {
	return (
		<>
			{segments.map((seg) =>
				seg.highlighted ? (
					<mark
						key={`${seg.text}-h`}
						className="rounded-sm bg-accent text-accent-foreground not-italic"
					>
						{seg.text}
					</mark>
				) : (
					seg.text
				),
			)}
		</>
	);
}
