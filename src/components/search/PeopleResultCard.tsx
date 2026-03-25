import { MapPinIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { HighlightedText } from "#/components/search/HighlightedText";
import { highlightMatches } from "#/components/search/highlight-match";
import { UserAvatar } from "#/components/shared/UserAvatar";
import type { PersonResult } from "#/lib/server/search";

export function PeopleResultCard({
	person,
	query,
}: {
	person: PersonResult;
	query: string;
}) {
	return (
		<Link
			to="/profile/$handle"
			params={{ handle: person.handle ?? person.id }}
			className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
		>
			<UserAvatar name={person.name} image={person.avatarUrl} size="default" />
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<p className="truncate text-base font-medium text-foreground">
						<HighlightedText segments={highlightMatches(person.name, query)} />
					</p>
					{person.isConnection && (
						<span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
							1st
						</span>
					)}
				</div>
				{person.headline && (
					<p className="truncate text-sm text-muted-foreground">
						<HighlightedText
							segments={highlightMatches(person.headline, query)}
						/>
					</p>
				)}
				{(person.location || person.openToWork) && (
					<div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
						{person.location && (
							<span className="flex items-center gap-0.5">
								<MapPinIcon className="size-3" />
								{person.location}
							</span>
						)}
						{person.openToWork && (
							<span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
								Open to Work
							</span>
						)}
					</div>
				)}
			</div>
		</Link>
	);
}
