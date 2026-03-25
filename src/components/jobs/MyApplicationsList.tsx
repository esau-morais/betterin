import { SealCheckIcon } from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { TimeAgo } from "#/components/shared/TimeAgo";
import { myApplicationsQueryOptions } from "#/lib/queries";
import { cn } from "#/lib/utils";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
	pending: {
		label: "Applied",
		className: "bg-muted text-muted-foreground",
	},
	reviewed: {
		label: "Reviewed",
		className:
			"bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
	},
	interview: {
		label: "Interview",
		className:
			"bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
	},
	rejected: {
		label: "Rejected",
		className: "bg-destructive/10 text-destructive",
	},
	accepted: {
		label: "Accepted",
		className:
			"bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
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

export function MyApplicationsList() {
	const { data } = useSuspenseQuery(myApplicationsQueryOptions());
	const applications = data.results;

	if (applications.length === 0) {
		return (
			<div className="py-12 text-center text-muted-foreground text-sm">
				You haven't applied to any jobs yet.
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{applications.map((app) => {
				const statusInfo = STATUS_LABELS[app.status] ?? STATUS_LABELS.pending;
				const companyDisplay = app.company;

				return (
					<div
						key={app.id}
						className="rounded-xl border border-border bg-card p-4"
					>
						<div className="flex items-start gap-3">
							<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted overflow-hidden">
								{app.companyLogoUrl ? (
									<img
										src={app.companyLogoUrl}
										alt={companyDisplay}
										className="size-full object-cover"
									/>
								) : (
									<span className="text-sm font-semibold text-muted-foreground">
										{companyDisplay[0]?.toUpperCase()}
									</span>
								)}
							</div>

							<div className="min-w-0 flex-1">
								<p className="text-sm font-semibold text-foreground truncate">
									{app.title}
								</p>
								<div className="flex items-center gap-1 mt-0.5">
									{app.companySlug ? (
										<a
											href={`/company/${app.companySlug}`}
											className="text-xs text-muted-foreground hover:text-foreground transition-colors truncate"
										>
											{companyDisplay}
										</a>
									) : (
										<span className="text-xs text-muted-foreground truncate">
											{companyDisplay}
										</span>
									)}
									{app.companyVerified && (
										<SealCheckIcon
											className="size-3 shrink-0 text-emerald-500"
											weight="fill"
										/>
									)}
								</div>
								<div className="flex items-center gap-2 mt-1.5 flex-wrap">
									<span className="font-mono text-xs font-medium text-salary">
										{formatSalary(app.salaryMin, app.salaryMax, app.currency)}
									</span>
									<span className="text-xs text-muted-foreground capitalize">
										{app.remote}
									</span>
								</div>
							</div>

							<div className="shrink-0 flex flex-col items-end gap-1.5">
								<span
									className={cn(
										"rounded-full px-2 py-0.5 text-[10px] font-medium",
										statusInfo.className,
									)}
								>
									{statusInfo.label}
								</span>
								<TimeAgo
									date={app.appliedAt}
									className="text-[10px] text-muted-foreground"
								/>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
