import { MagnifyingGlassIcon } from "@phosphor-icons/react";

type TipGroup = {
	label: string;
	tips: { syntax: string; description: string }[];
};

const YEAR = new Date().getFullYear();

const TIP_GROUPS: TipGroup[] = [
	{
		label: "Text",
		tips: [
			{ syntax: '"exact phrase"', description: "Match exact words" },
			{ syntax: "-exclude", description: "Exclude a word" },
			{ syntax: "word OR word", description: "Match either term" },
		],
	},
	{
		label: "Operators",
		tips: [
			{ syntax: "from:@handle", description: "Posts by a user" },
			{ syntax: "mention:@handle", description: "Posts mentioning a user" },
			{ syntax: "has:media", description: "Posts with images/video" },
			{ syntax: "company:name", description: "Jobs or people at a company" },
			{ syntax: "is:remote", description: "Remote jobs only" },
			{ syntax: "location:city", description: "Filter by location" },
		],
	},
	{
		label: "Date",
		tips: [
			{ syntax: `since:${YEAR}-01-01`, description: "After a date" },
			{ syntax: `until:${YEAR}-06-01`, description: "Before a date" },
		],
	},
	{
		label: "Scope",
		tips: [{ syntax: "in:jobs", description: "Search only jobs" }],
	},
];

export function SearchTips() {
	return (
		<div className="space-y-4">
			<h2 className="text-base font-semibold text-foreground">Search tips</h2>
			{TIP_GROUPS.map((group) => (
				<div key={group.label} className="space-y-1.5">
					<h3 className="text-xs font-medium text-muted-foreground">
						{group.label}
					</h3>
					<ul className="space-y-1.5">
						{group.tips.map((tip) => (
							<li key={tip.syntax} className="flex items-start gap-2">
								<code className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
									{tip.syntax}
								</code>
								<span className="text-xs text-muted-foreground">
									{tip.description}
								</span>
							</li>
						))}
					</ul>
				</div>
			))}
			<div className="rounded-lg border border-border bg-muted/50 p-3">
				<div className="flex items-start gap-2">
					<MagnifyingGlassIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
					<p className="text-xs leading-relaxed text-muted-foreground">
						Combine operators freely.
						<br />
						<code className="font-mono text-[11px] text-foreground">
							{`react from:@esau since:${YEAR}-01-01`}
						</code>
					</p>
				</div>
			</div>
		</div>
	);
}
