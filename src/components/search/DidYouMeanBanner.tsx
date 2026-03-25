import { Link, useSearch } from "@tanstack/react-router";

export function DidYouMeanBanner({ suggestion }: { suggestion: string }) {
	const search = useSearch({ from: "/_authed/search" });

	return (
		<div className="rounded-xl border border-border bg-card p-3">
			<p className="text-sm text-muted-foreground">
				Did you mean:{" "}
				<Link
					to="/search"
					search={{ ...search, q: suggestion }}
					className="font-medium text-brand hover:underline"
				>
					{suggestion}
				</Link>
				?
			</p>
		</div>
	);
}
