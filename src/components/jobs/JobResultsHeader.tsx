import { CaretDownIcon, FunnelIcon, XIcon } from "@phosphor-icons/react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover";
import { cn } from "#/lib/utils";

const EXPERIENCE_LABELS: Record<string, string> = {
	internship: "Internship",
	entry: "Entry Level",
	mid: "Mid Level",
	senior: "Senior",
	lead: "Lead",
	executive: "Executive",
};

const JOB_TYPE_LABELS: Record<string, string> = {
	full_time: "Full-Time",
	part_time: "Part-Time",
	contract: "Contract",
	freelance: "Freelance",
	internship: "Internship",
};

const REMOTE_LABELS: Record<string, string> = {
	remote: "Remote",
	hybrid: "Hybrid",
	onsite: "On-site",
};

const SORT_LABELS: Record<string, string> = {
	newest: "Newest",
	"salary-high": "Salary: High",
	"salary-low": "Salary: Low",
};

const DATE_LABELS: Record<string, string> = {
	"24h": "Past 24h",
	"3d": "Past 3 days",
	week: "Past week",
	month: "Past month",
};

function formatSalaryChip(min?: number, max?: number) {
	const fmt = (n: number) =>
		n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
	if (min && max) return `${fmt(min)}–${fmt(max)}`;
	if (min) return `${fmt(min)}+`;
	if (max) return `Up to ${fmt(max)}`;
	return null;
}

type JobResultsHeaderProps = {
	totalCount: number;
	onOpenMobileFilters: () => void;
};

export function JobResultsHeader({
	totalCount,
	onOpenMobileFilters,
}: JobResultsHeaderProps) {
	const search = useSearch({ from: "/_authed/jobs" });
	const navigate = useNavigate({ from: "/jobs" });

	const sort = search.sort;

	function nav(updates: Record<string, unknown>) {
		navigate({ search: (prev) => ({ ...prev, ...updates }) });
	}

	type Chip = { key: string; label: string; onRemove: () => void };
	const chips: Chip[] = [];

	if (search.remote) {
		chips.push({
			key: "remote",
			label: REMOTE_LABELS[search.remote] ?? search.remote,
			onRemove: () => nav({ remote: undefined }),
		});
	}

	const salaryLabel = formatSalaryChip(search.salaryMin, search.salaryMax);
	if (salaryLabel) {
		chips.push({
			key: "salary",
			label: salaryLabel,
			onRemove: () => nav({ salaryMin: undefined, salaryMax: undefined }),
		});
	}

	if (search.jobType?.length) {
		for (const jt of search.jobType) {
			chips.push({
				key: `jobType-${jt}`,
				label: JOB_TYPE_LABELS[jt] ?? jt,
				onRemove: () => {
					const next = search.jobType?.filter((v) => v !== jt);
					nav({ jobType: next?.length ? next : undefined });
				},
			});
		}
	}

	if (search.experienceLevel?.length) {
		for (const el of search.experienceLevel) {
			chips.push({
				key: `exp-${el}`,
				label: EXPERIENCE_LABELS[el] ?? el,
				onRemove: () => {
					const next = search.experienceLevel?.filter((v) => v !== el);
					nav({ experienceLevel: next?.length ? next : undefined });
				},
			});
		}
	}

	if (search.datePosted) {
		chips.push({
			key: "date",
			label: DATE_LABELS[search.datePosted] ?? search.datePosted,
			onRemove: () => nav({ datePosted: undefined }),
		});
	}

	if (search.location) {
		chips.push({
			key: "location",
			label: search.location,
			onRemove: () => nav({ location: undefined }),
		});
	}

	return (
		<div className="space-y-2 mb-4">
			<div className="flex items-center justify-between gap-2">
				<span className="text-sm text-muted-foreground">
					{totalCount} {totalCount === 1 ? "job" : "jobs"}
				</span>

				<div className="flex items-center gap-2">
					<Popover>
						<PopoverTrigger asChild>
							<button
								type="button"
								className="flex items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 h-8 text-xs transition-colors hover:bg-muted"
							>
								{SORT_LABELS[sort]}
								<CaretDownIcon
									className="size-3 text-muted-foreground"
									weight="bold"
								/>
							</button>
						</PopoverTrigger>
						<PopoverContent
							align="end"
							sideOffset={4}
							className="w-auto min-w-[140px] p-1"
						>
							{Object.entries(SORT_LABELS).map(([value, label]) => (
								<button
									key={value}
									type="button"
									onClick={() => nav({ sort: value })}
									className={cn(
										"flex w-full items-center rounded-md px-3 py-1.5 text-sm transition-colors",
										sort === value
											? "bg-accent text-primary font-medium"
											: "text-muted-foreground hover:bg-muted hover:text-foreground",
									)}
								>
									{label}
								</button>
							))}
						</PopoverContent>
					</Popover>

					<Button
						variant="outline"
						size="sm"
						className="xl:hidden h-8 gap-1.5"
						onClick={onOpenMobileFilters}
					>
						<FunnelIcon className="size-3.5" />
						Filter
						{chips.length > 0 && (
							<span className="flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
								{chips.length}
							</span>
						)}
					</Button>
				</div>
			</div>

			{chips.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{chips.map((chip) => (
						<Badge key={chip.key} variant="secondary" className="gap-1 pr-1">
							{chip.label}
							<button
								type="button"
								onClick={chip.onRemove}
								className="rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
								aria-label={`Remove ${chip.label} filter`}
							>
								<XIcon className="size-3" />
							</button>
						</Badge>
					))}
				</div>
			)}
		</div>
	);
}
