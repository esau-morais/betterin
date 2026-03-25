import {
	ClockIcon,
	PencilSimpleIcon,
	SealCheckIcon,
	WarningIcon,
} from "@phosphor-icons/react";
import type { ExperienceVerificationStatus } from "#/lib/db/schema";

export type ExperienceRole = {
	id: string;
	title: string;
	company: string;
	location: string | null;
	startDate: Date;
	endDate: Date | null;
	current: boolean;
	description: string | null;
	verificationStatus?: ExperienceVerificationStatus | null;
	disputeReason?: string | null;
	companySlug?: string | null;
	companyId?: string | null;
};

export type ExperienceGroup = {
	company: string;
	roles: ExperienceRole[];
	verificationStatus?: ExperienceVerificationStatus | null;
	companySlug?: string | null;
};

function formatDuration(start: Date, end: Date | null): string {
	const endDate = end ?? new Date();
	const months =
		(endDate.getFullYear() - start.getFullYear()) * 12 +
		(endDate.getMonth() - start.getMonth());
	const years = Math.floor(months / 12);
	const remainingMonths = months % 12;

	if (years > 0 && remainingMonths > 0) return `${years}y ${remainingMonths}mo`;
	if (years > 0) return `${years}y`;
	if (remainingMonths > 0) return `${remainingMonths}mo`;
	return "< 1mo";
}

function formatDateRange(
	start: Date,
	end: Date | null,
	current: boolean,
): string {
	const fmt = (d: Date) =>
		d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
	const endStr = current ? "Present" : end ? fmt(end) : "Present";
	return `${fmt(start)} – ${endStr}`;
}

function VerificationIcon({
	status,
	disputeReason,
}: {
	status?: ExperienceVerificationStatus | null;
	disputeReason?: string | null;
}) {
	if (status === "verified")
		return (
			<SealCheckIcon
				className="size-3.5 text-emerald-500 shrink-0"
				weight="fill"
			/>
		);
	if (status === "disputed")
		return (
			<span title={disputeReason ?? "Disputed by company"}>
				<WarningIcon
					className="size-3.5 text-amber-500 shrink-0"
					weight="fill"
				/>
			</span>
		);
	if (status === "pending")
		return <ClockIcon className="size-3.5 text-muted-foreground shrink-0" />;
	return null;
}

function EntityInitial({ name }: { name: string }) {
	return (
		<div className="size-12 shrink-0 rounded-xl bg-muted flex items-center justify-center text-lg font-medium text-muted-foreground">
			{name[0]?.toUpperCase()}
		</div>
	);
}

export function ExperienceItem({
	group,
	isOwner,
	onEdit,
}: {
	group: ExperienceGroup;
	isOwner?: boolean;
	onEdit?: (item: ExperienceRole) => void;
}) {
	const isMultiRole = group.roles.length > 1;

	if (!isMultiRole) {
		const role = group.roles[0];
		return (
			<div className="flex gap-3 py-4 first:pt-0 last:pb-0">
				<EntityInitial name={group.company} />
				<div className="min-w-0 flex-1">
					<div className="flex items-start gap-2">
						<div className="min-w-0 flex-1">
							<p className="font-medium text-foreground">{role.title}</p>
							<p className="text-sm text-muted-foreground flex items-center gap-1">
								{group.company}
								<VerificationIcon
									status={role?.verificationStatus}
									disputeReason={role?.disputeReason}
								/>
							</p>
						</div>
						{isOwner && onEdit && (
							<button
								type="button"
								onClick={() => onEdit(role)}
								className="shrink-0 rounded-lg p-1 hit-area-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-ring"
								aria-label={`Edit ${role.title} at ${group.company}`}
							>
								<PencilSimpleIcon className="size-3.5" />
							</button>
						)}
					</div>
					<p className="bi-mono text-text-tertiary mt-0.5">
						{formatDateRange(role.startDate, role.endDate, role.current)} ·{" "}
						{formatDuration(role.startDate, role.endDate)}
					</p>
					{role.location && (
						<p className="text-sm text-muted-foreground mt-0.5">
							{role.location}
						</p>
					)}
					{role.verificationStatus === "disputed" && (
						<div className="mt-1.5 flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
							<WarningIcon className="size-3.5 shrink-0" weight="fill" />
							Disputed by {group.company}
						</div>
					)}
					{role.description && (
						<p className="mt-2 leading-relaxed text-foreground whitespace-pre-wrap">
							{role.description}
						</p>
					)}
				</div>
			</div>
		);
	}

	const earliest = group.roles[group.roles.length - 1].startDate;
	const latest = group.roles[0].endDate;
	const totalDuration = formatDuration(earliest, latest);

	return (
		<div className="flex gap-3 py-4 first:pt-0 last:pb-0">
			<EntityInitial name={group.company} />
			<div className="min-w-0 flex-1">
				<p className="font-medium text-foreground flex items-center gap-1">
					{group.company}
					<VerificationIcon status={group.verificationStatus} />
				</p>
				<p className="bi-mono text-text-tertiary mt-0.5">{totalDuration}</p>

				<div className="mt-3 border-l-2 border-border pl-4 space-y-4">
					{group.roles.map((role) => (
						<div key={role.id}>
							<div className="flex items-start gap-2">
								<p className="text-sm font-medium text-foreground flex-1">
									{role.title}
								</p>
								{isOwner && onEdit && (
									<button
										type="button"
										onClick={() => onEdit(role)}
										className="shrink-0 rounded-lg p-1 hit-area-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-ring"
										aria-label={`Edit ${role.title} at ${group.company}`}
									>
										<PencilSimpleIcon className="size-3.5" />
									</button>
								)}
							</div>
							<p className="bi-mono text-text-tertiary mt-0.5">
								{formatDateRange(role.startDate, role.endDate, role.current)} ·{" "}
								{formatDuration(role.startDate, role.endDate)}
							</p>
							{role.location && (
								<p className="text-sm text-muted-foreground mt-0.5">
									{role.location}
								</p>
							)}
							{role.description && (
								<p className="mt-1.5 leading-relaxed text-foreground whitespace-pre-wrap">
									{role.description}
								</p>
							)}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
