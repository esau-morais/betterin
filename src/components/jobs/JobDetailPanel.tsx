import {
	ArrowSquareOutIcon,
	BriefcaseIcon,
	BuildingOfficeIcon,
	CalendarIcon,
	ClockIcon,
	CurrencyDollarIcon,
	MapPinIcon,
	SealCheckIcon,
	TagIcon,
	XIcon,
} from "@phosphor-icons/react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { TimeAgo } from "#/components/shared/TimeAgo";
import { Button } from "#/components/ui/button";
import { jobQueryOptions } from "#/lib/queries";
import { recordExternalApplicationFn } from "#/lib/server/jobs";
import { EasyApplySheet } from "./EasyApplySheet";

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

const REMOTE_LABELS: Record<string, string> = {
	remote: "Remote",
	hybrid: "Hybrid",
	onsite: "On-site",
};

function JobDetailContent({ jobId }: { jobId: string }) {
	const navigate = useNavigate({ from: "/jobs" });
	const queryClient = useQueryClient();
	const { data: job } = useSuspenseQuery(jobQueryOptions(jobId));
	const [applyOpen, setApplyOpen] = useState(false);
	const [hasApplied, setHasApplied] = useState(job.hasApplied);

	async function handleExternalApply() {
		if (job.applyUrl) {
			window.open(job.applyUrl, "_blank", "noopener,noreferrer");
			try {
				await recordExternalApplicationFn({ data: { jobId } });
				setHasApplied(true);
				queryClient.invalidateQueries({ queryKey: ["my-applications"] });
			} catch {
				// best-effort
			}
		}
	}

	function handleClose() {
		navigate({ search: (prev) => ({ ...prev, job: undefined }) });
	}

	return (
		<div className="rounded-xl border border-border bg-card overflow-hidden">
			<div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3 border-b border-border">
				<div className="min-w-0 flex-1">
					<h3 className="text-sm font-semibold text-foreground leading-tight">
						{job.title}
					</h3>
					<div className="flex items-center gap-1 mt-0.5">
						<span className="text-xs text-muted-foreground truncate">
							{job.companyName ?? job.company}
						</span>
						{job.companyVerified && (
							<SealCheckIcon
								className="size-3 shrink-0 text-emerald-500"
								weight="fill"
							/>
						)}
					</div>
				</div>
				<button
					type="button"
					onClick={handleClose}
					className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
					aria-label="Close job detail"
				>
					<XIcon className="size-4" />
				</button>
			</div>

			<div className="px-4 py-3 space-y-3">
				<div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
					<span className="flex items-center gap-1.5">
						<CurrencyDollarIcon className="size-3.5 shrink-0" />
						<span className="font-mono font-medium text-salary">
							{formatSalary(job.salaryMin, job.salaryMax, job.currency)}
						</span>
					</span>
					{job.location && (
						<span className="flex items-center gap-1.5">
							<MapPinIcon className="size-3.5 shrink-0" />
							{job.location}
						</span>
					)}
					<span className="flex items-center gap-1.5">
						<BriefcaseIcon className="size-3.5 shrink-0" />
						{REMOTE_LABELS[job.remote] ?? job.remote}
					</span>
					<span className="flex items-center gap-1.5">
						<ClockIcon className="size-3.5 shrink-0" />
						<TimeAgo date={job.createdAt} />
					</span>
					<span className="flex items-center gap-1.5">
						<CalendarIcon className="size-3.5 shrink-0" />
						Expires <TimeAgo date={job.expiresAt} />
					</span>
				</div>

				{job.tags.length > 0 && (
					<div className="flex flex-wrap gap-1">
						<TagIcon className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
						{job.tags.map((tag) => (
							<span
								key={tag}
								className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
							>
								{tag}
							</span>
						))}
					</div>
				)}

				<div className="flex flex-col gap-2">
					{hasApplied ? (
						<div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
							<SealCheckIcon
								className="size-4 text-emerald-600"
								weight="fill"
							/>
							<span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
								Applied
							</span>
						</div>
					) : job.applyUrl ? (
						<Button size="sm" className="w-full" onClick={handleExternalApply}>
							<ArrowSquareOutIcon className="size-3.5" />
							Apply Externally
						</Button>
					) : (
						<Button
							size="sm"
							className="w-full"
							onClick={() => setApplyOpen(true)}
						>
							Easy Apply
						</Button>
					)}

					{job.companySlug && (
						<Button variant="outline" size="sm" className="w-full" asChild>
							<Link to="/company/$slug" params={{ slug: job.companySlug }}>
								<BuildingOfficeIcon className="size-3.5" />
								View Company
							</Link>
						</Button>
					)}
				</div>

				{job.description && (
					<div className="border-t border-border pt-3">
						<p className="text-xs font-medium text-foreground mb-1.5">
							Description
						</p>
						<p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-[12]">
							{job.description}
						</p>
					</div>
				)}
			</div>

			<EasyApplySheet
				jobId={jobId}
				jobTitle={job.title}
				company={job.companyName ?? job.company}
				open={applyOpen}
				onOpenChange={setApplyOpen}
				onApplied={() => {
					setHasApplied(true);
					queryClient.invalidateQueries({ queryKey: ["job", jobId] });
				}}
			/>
		</div>
	);
}

export function JobDetailPanel({ jobId }: { jobId: string }) {
	return (
		<div>
			<JobDetailContent jobId={jobId} />
		</div>
	);
}
