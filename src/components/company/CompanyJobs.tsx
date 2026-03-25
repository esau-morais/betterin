import { ArrowRightIcon, BriefcaseIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { TimeAgo } from "#/components/shared/TimeAgo";
import type { CompanyData } from "./types";

type Job = {
	id: string;
	title: string;
	remote: string;
	salaryMin: number;
	salaryMax: number;
	currency: string;
	createdAt: string;
};

export function CompanyJobs({
	jobs,
	company,
	totalJobs,
	showAll,
}: {
	jobs: Job[];
	company: CompanyData;
	totalJobs: number;
	showAll?: boolean;
}) {
	if (jobs.length === 0) return null;

	return (
		<section className="bi-card animate-fade-up" aria-label="Open Roles">
			<h2 className="text-lg font-semibold text-foreground">
				Open Roles ({totalJobs})
			</h2>
			<div className="mt-3 space-y-3">
				{jobs.map((job) => (
					<Link
						key={job.id}
						to="/jobs"
						search={{ tab: "browse", sort: "newest", job: job.id }}
						className="flex items-center gap-3 py-2 hover:text-primary transition-colors"
					>
						<div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
							{company.logoUrl ? (
								<img
									src={company.logoUrl}
									alt=""
									className="size-full rounded-lg object-cover"
								/>
							) : (
								<BriefcaseIcon className="size-4 text-muted-foreground" />
							)}
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-sm font-medium truncate">{job.title}</p>
							<p className="text-xs text-muted-foreground">
								{job.remote} ·{" "}
								<span className="salary">
									{job.currency === "USD" ? "$" : job.currency}
									{Math.round(job.salaryMin / 1000)}k–
									{Math.round(job.salaryMax / 1000)}k
								</span>
							</p>
						</div>
						<TimeAgo
							date={job.createdAt}
							className="text-xs text-muted-foreground shrink-0"
						/>
					</Link>
				))}
			</div>
			{!showAll && totalJobs > 5 && (
				<Link
					to="/jobs"
					search={{ tab: "browse", sort: "newest" }}
					className="mt-3 block text-sm text-brand hover:underline"
				>
					See all {totalJobs} jobs <ArrowRightIcon className="inline size-3" />
				</Link>
			)}
		</section>
	);
}
