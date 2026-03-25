import { BriefcaseIcon, MapPinIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import {
	type HighlightSegment,
	highlightMatches,
} from "#/components/search/highlight-match";
import { TimeAgo } from "#/components/shared/TimeAgo";
import type { JobResult } from "#/lib/server/search";
import { cn } from "#/lib/utils";

function Hl({ segments }: { segments: HighlightSegment[] }) {
	return (
		<>
			{segments.map((seg) =>
				seg.highlighted ? (
					<mark
						key={`${seg.text}-h`}
						className="rounded-sm bg-accent text-accent-foreground"
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

function formatSalary(min: number, max: number, currency: string) {
	const fmt = (n: number) =>
		n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
	const sym = currency === "USD" ? "$" : currency;
	return `${sym}${fmt(min)}–${sym}${fmt(max)}`;
}

const REMOTE_LABELS: Record<string, { label: string; className: string }> = {
	remote: {
		label: "Remote",
		className:
			"bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
	},
	hybrid: {
		label: "Hybrid",
		className:
			"bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
	},
	onsite: {
		label: "On-site",
		className: "bg-muted text-muted-foreground",
	},
};

export function JobResultCard({
	job,
	query,
}: {
	job: JobResult;
	query: string;
}) {
	const remote = REMOTE_LABELS[job.remote];

	return (
		<Link
			to="/jobs"
			search={(prev) => ({ ...prev, job: job.id })}
			className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
		>
			<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
				<BriefcaseIcon className="size-5 text-muted-foreground" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate text-base font-medium text-foreground">
					<Hl segments={highlightMatches(job.title, query)} />
				</p>
				<p className="truncate text-sm text-muted-foreground">
					<Hl segments={highlightMatches(job.company, query)} />
					{job.location && (
						<>
							<span className="mx-1 text-muted-foreground/50">·</span>
							<MapPinIcon className="mb-px inline size-3" /> {job.location}
						</>
					)}
				</p>
				<div className="mt-1.5 flex flex-wrap items-center gap-2">
					<span className="font-mono text-sm font-medium text-salary">
						{formatSalary(job.salaryMin, job.salaryMax, job.currency)}
					</span>
					{remote && (
						<span
							className={cn(
								"rounded-full px-1.5 py-0.5 text-[10px] font-medium",
								remote.className,
							)}
						>
							{remote.label}
						</span>
					)}
					<span className="text-xs text-muted-foreground">
						<TimeAgo date={job.createdAt} />
					</span>
				</div>
				{job.tags.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-1">
						{job.tags.slice(0, 4).map((tag) => (
							<span
								key={tag}
								className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
							>
								{tag}
							</span>
						))}
						{job.tags.length > 4 && (
							<span className="text-[10px] text-muted-foreground">
								+{job.tags.length - 4}
							</span>
						)}
					</div>
				)}
			</div>
		</Link>
	);
}
