import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { TimeAgo } from "#/components/shared/TimeAgo";
import { latestJobsQueryOptions } from "#/lib/queries";

function formatSalary(min: number, max: number, currency: string) {
	const fmt = (n: number) =>
		n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
	const sym =
		currency === "USD"
			? "$"
			: currency === "EUR"
				? "€"
				: currency === "GBP"
					? "£"
					: currency;
	return `${sym}${fmt(min)}–${sym}${fmt(max)}`;
}

function CompanyInitial({ name }: { name: string }) {
	return (
		<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted overflow-hidden">
			<span className="text-xs font-semibold text-muted-foreground">
				{name[0]?.toUpperCase()}
			</span>
		</div>
	);
}

export function RecentJobsPanel() {
	const { data } = useSuspenseQuery(latestJobsQueryOptions());
	const navigate = useNavigate({ from: "/jobs" });

	const jobs = data.results.slice(0, 3);

	if (jobs.length === 0) {
		return (
			<div className="rounded-xl border border-border bg-card p-4">
				<p className="text-sm text-muted-foreground text-center py-4">
					No recent jobs yet.
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-xl border border-border bg-card divide-y divide-border">
			<div className="px-4 py-3">
				<h3 className="text-sm font-semibold text-foreground">Recent Jobs</h3>
			</div>
			{jobs.map((job) => (
				<button
					key={job.id}
					type="button"
					onClick={() =>
						navigate({ search: (prev) => ({ ...prev, job: job.id }) })
					}
					className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
				>
					<CompanyInitial name={job.company} />
					<div className="min-w-0 flex-1">
						<p className="text-sm font-medium text-foreground truncate">
							{job.title}
						</p>
						<p className="text-xs text-muted-foreground truncate">
							{job.company}
						</p>
					</div>
					<div className="shrink-0 text-right">
						<p className="font-mono text-xs font-medium text-salary">
							{formatSalary(job.salaryMin, job.salaryMax, job.currency)}
						</p>
						<TimeAgo date={job.createdAt} className="text-[10px]" />
					</div>
				</button>
			))}
		</div>
	);
}
