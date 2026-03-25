import {
	BuildingsIcon,
	MapPinIcon,
	SealCheckIcon,
	UsersIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { HighlightedText } from "#/components/search/HighlightedText";
import { highlightMatches } from "#/components/search/highlight-match";
import type { CompanyResult } from "#/lib/server/search";
import { COMPANY_SIZE_LABELS } from "#/lib/validation";

export function CompanyResultCard({
	company,
	query,
}: {
	company: CompanyResult;
	query: string;
}) {
	return (
		<Link
			to="/company/$slug"
			params={{ slug: company.slug }}
			className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
		>
			{company.logoUrl ? (
				<img
					src={company.logoUrl}
					alt=""
					className="size-10 shrink-0 rounded-lg object-cover"
				/>
			) : (
				<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
					<BuildingsIcon className="size-5 text-muted-foreground" />
				</div>
			)}
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5">
					<p className="truncate text-base font-medium text-foreground">
						<HighlightedText segments={highlightMatches(company.name, query)} />
					</p>
					{company.verified && (
						<SealCheckIcon
							className="size-4 shrink-0 text-brand"
							weight="fill"
						/>
					)}
				</div>
				{company.tagline && (
					<p className="truncate text-sm text-muted-foreground">
						{company.tagline}
					</p>
				)}
				<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
					{company.industry && <span>{company.industry}</span>}
					{company.headquarters && (
						<span className="flex items-center gap-0.5">
							<MapPinIcon className="size-3" />
							{company.headquarters}
						</span>
					)}
					{company.size && (
						<span className="flex items-center gap-0.5">
							<UsersIcon className="size-3" />
							{COMPANY_SIZE_LABELS[company.size] ?? company.size} employees
						</span>
					)}
					{company.followerCount > 0 && (
						<span className="bi-mono">
							{company.followerCount}{" "}
							{company.followerCount === 1 ? "follower" : "followers"}
						</span>
					)}
				</div>
			</div>
		</Link>
	);
}
