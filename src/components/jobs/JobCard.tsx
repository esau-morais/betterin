import {
	BookmarkIcon,
	BookmarkSimpleIcon,
	MapPinIcon,
	SealCheckIcon,
} from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { TimeAgo } from "#/components/shared/TimeAgo";
import { saveJobFn, unsaveJobFn } from "#/lib/server/jobs";
import { cn } from "#/lib/utils";

const JOB_TYPE_LABELS: Record<string, string> = {
	full_time: "Full-Time",
	part_time: "Part-Time",
	contract: "Contract",
	freelance: "Freelance",
	internship: "Internship",
};

type JobCardProps = {
	job: {
		id: string;
		title: string;
		company: string;
		companySlug: string | null;
		companyLogoUrl: string | null;
		companyVerified: boolean;
		location: string | null;
		remote: string;
		salaryMin: number;
		salaryMax: number;
		currency: string;
		tags: string[];
		createdAt: string;
		isSaved: boolean;
		applyUrl: string | null;
		jobType?: string | null;
	};
	isSelected?: boolean;
	onSaveToggle?: (jobId: string, saved: boolean) => void;
};

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

export function JobCard({ job, isSelected, onSaveToggle }: JobCardProps) {
	const navigate = useNavigate({ from: "/jobs" });
	const [saved, setSaved] = useState(job.isSaved);
	const [logoError, setLogoError] = useState(false);

	const remote = REMOTE_LABELS[job.remote];
	const visibleTags = job.tags.slice(0, 3);
	const extraTagCount = job.tags.length - visibleTags.length;

	function handleClick() {
		navigate({ search: (prev) => ({ ...prev, job: job.id }) });
	}

	async function handleSaveToggle(e: React.MouseEvent) {
		e.stopPropagation();
		const next = !saved;
		setSaved(next);
		try {
			if (next) {
				await saveJobFn({ data: { jobId: job.id } });
			} else {
				await unsaveJobFn({ data: { jobId: job.id } });
			}
			onSaveToggle?.(job.id, next);
		} catch {
			setSaved(!next);
		}
	}

	return (
		<div
			onClick={handleClick}
			onKeyDown={(e) => e.key === "Enter" && handleClick()}
			role="button"
			tabIndex={0}
			className={cn(
				"rounded-xl border border-border bg-card p-4 cursor-pointer transition-colors hover:border-primary/50 outline-none focus-visible:ring-2 focus-visible:ring-ring",
				isSelected && "ring-2 ring-primary border-primary/50",
			)}
		>
			<div className="flex items-start gap-3">
				<div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted overflow-hidden">
					{job.companyLogoUrl && !logoError ? (
						<img
							src={job.companyLogoUrl}
							alt={job.company}
							className="size-full object-cover"
							onError={() => setLogoError(true)}
						/>
					) : (
						<span className="text-base font-semibold text-muted-foreground">
							{job.company[0]?.toUpperCase()}
						</span>
					)}
				</div>

				<div className="min-w-0 flex-1">
					<p className="text-base font-semibold text-foreground truncate">
						{job.title}
					</p>
					<div className="flex items-center gap-1 mt-0.5">
						<span className="text-sm text-muted-foreground truncate">
							{job.company}
						</span>
						{job.companyVerified && (
							<SealCheckIcon className="size-3.5 shrink-0 text-emerald-500" />
						)}
					</div>

					{(job.location || remote) && (
						<div className="flex items-center gap-2 mt-1.5 flex-wrap">
							{job.location && (
								<span className="flex items-center gap-1 text-xs text-muted-foreground">
									<MapPinIcon className="size-3 shrink-0" />
									{job.location}
								</span>
							)}
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
							{job.jobType && JOB_TYPE_LABELS[job.jobType] && (
								<span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
									{JOB_TYPE_LABELS[job.jobType]}
								</span>
							)}
						</div>
					)}

					<p className="mt-1.5 font-mono text-sm font-medium text-salary">
						{formatSalary(job.salaryMin, job.salaryMax, job.currency)}
					</p>

					{visibleTags.length > 0 && (
						<div className="mt-2 flex flex-wrap gap-1">
							{visibleTags.map((tag) => (
								<span
									key={tag}
									className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
								>
									{tag}
								</span>
							))}
							{extraTagCount > 0 && (
								<span className="text-[10px] text-muted-foreground self-center">
									+{extraTagCount}
								</span>
							)}
						</div>
					)}
				</div>
			</div>

			<div className="mt-3 flex items-center justify-between">
				<TimeAgo date={job.createdAt} />
				<button
					type="button"
					onClick={handleSaveToggle}
					aria-label={saved ? "Unsave job" : "Save job"}
					className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
				>
					{saved ? (
						<BookmarkIcon className="size-4" weight="fill" />
					) : (
						<BookmarkSimpleIcon className="size-4" />
					)}
				</button>
			</div>
		</div>
	);
}
