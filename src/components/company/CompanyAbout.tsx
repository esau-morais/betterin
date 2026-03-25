import {
	BuildingsIcon,
	CalendarIcon,
	GlobeIcon,
	PencilSimpleIcon,
	UsersIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "#/lib/utils";
import { COMPANY_SIZE_LABELS } from "#/lib/validation";
import type { CompanyData } from "./types";

export function CompanyAbout({
	company,
	isAdmin,
	truncated,
	onEdit,
}: {
	company: CompanyData;
	isAdmin?: boolean;
	truncated?: boolean;
	onEdit?: () => void;
}) {
	const [expanded, setExpanded] = useState(false);

	const hasDescription = !!company.description;
	const hasOverview =
		company.website ||
		company.industry ||
		company.size ||
		company.headquarters ||
		company.founded;

	if (!hasDescription && !hasOverview) return null;

	return (
		<section className="bi-card animate-fade-up" aria-label="About">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold text-foreground">
					{truncated ? "Overview" : "About"}
				</h2>
				{isAdmin && onEdit && (
					<button
						type="button"
						onClick={onEdit}
						className="rounded-lg p-1 hit-area-2 text-muted-foreground hover:text-foreground transition-colors focus-ring"
						aria-label="Edit company details"
					>
						<PencilSimpleIcon className="size-4" />
					</button>
				)}
			</div>

			{hasDescription && (
				<div className="mt-3">
					<p
						className={cn(
							"text-sm leading-relaxed text-foreground whitespace-pre-wrap",
							truncated && !expanded && "line-clamp-5",
						)}
					>
						{company.description}
					</p>
					{truncated &&
						company.description &&
						company.description.length > 300 &&
						!expanded && (
							<button
								type="button"
								onClick={() => setExpanded(true)}
								className="mt-1 text-sm text-brand hover:underline focus-ring rounded"
							>
								Show more
							</button>
						)}
				</div>
			)}

			{hasOverview && !truncated && (
				<div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
					{company.website && (
						<OverviewItem
							icon={GlobeIcon}
							label="Website"
							value={
								<a
									href={company.website}
									target="_blank"
									rel="noopener noreferrer"
									className="text-brand hover:underline"
								>
									{company.website.replace(/^https?:\/\//, "")}
								</a>
							}
						/>
					)}
					{company.industry && (
						<OverviewItem
							icon={BuildingsIcon}
							label="Industry"
							value={company.industry}
						/>
					)}
					{company.size && (
						<OverviewItem
							icon={UsersIcon}
							label="Company size"
							value={`${COMPANY_SIZE_LABELS[company.size] ?? company.size} employees`}
						/>
					)}
					{company.headquarters && (
						<OverviewItem
							icon={BuildingsIcon}
							label="Headquarters"
							value={company.headquarters}
						/>
					)}
					{company.founded && (
						<OverviewItem
							icon={CalendarIcon}
							label="Founded"
							value={String(company.founded)}
						/>
					)}
				</div>
			)}
		</section>
	);
}

function OverviewItem({
	icon: Icon,
	label,
	value,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	value: React.ReactNode;
}) {
	return (
		<div className="flex items-start gap-2">
			<Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
			<div className="min-w-0">
				<p className="text-xs text-muted-foreground">{label}</p>
				<p className="text-sm text-foreground">{value}</p>
			</div>
		</div>
	);
}
