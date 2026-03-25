import { PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react";
import type { VolunteeringEntry } from "#/lib/db/schema";

type Volunteering = Omit<VolunteeringEntry, "userId" | "ordering">;

function formatDateRange(start: Date | null, end: Date | null): string | null {
	if (!start) return null;
	const fmt = (d: Date) =>
		d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
	return `${fmt(start)} – ${end ? fmt(end) : "Present"}`;
}

export function VolunteeringSection({
	volunteering,
	isOwner,
	onAdd,
	onEdit,
}: {
	volunteering: Volunteering[];
	isOwner?: boolean;
	onAdd?: () => void;
	onEdit?: (item: Volunteering) => void;
}) {
	return (
		<section className="bi-card animate-fade-up" aria-label="Volunteering">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold text-foreground">Volunteering</h2>
				{isOwner && onAdd && (
					<button
						type="button"
						onClick={onAdd}
						className="rounded-lg p-1.5 hit-area-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-ring"
						aria-label="Add volunteering"
					>
						<PlusIcon className="size-4" />
					</button>
				)}
			</div>
			<div className="mt-4 divide-y divide-border">
				{volunteering.map((vol) => {
					const dateRange = formatDateRange(vol.startDate, vol.endDate);
					return (
						<div key={vol.id} className="py-4 first:pt-0 last:pb-0">
							<div className="flex items-start gap-2">
								<div className="min-w-0 flex-1">
									<p className="font-medium text-foreground">{vol.role}</p>
									<p className="text-sm text-muted-foreground">
										{vol.organization}
									</p>
								</div>
								{isOwner && onEdit && (
									<button
										type="button"
										onClick={() => onEdit(vol)}
										className="shrink-0 rounded-lg p-1 hit-area-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-ring"
										aria-label={`Edit ${vol.role} at ${vol.organization}`}
									>
										<PencilSimpleIcon className="size-3.5" />
									</button>
								)}
							</div>
							{(dateRange || vol.cause) && (
								<p className="bi-mono text-text-tertiary mt-0.5">
									{[dateRange, vol.cause].filter(Boolean).join(" · ")}
								</p>
							)}
							{vol.description && (
								<p className="mt-2 leading-relaxed text-foreground whitespace-pre-wrap">
									{vol.description}
								</p>
							)}
						</div>
					);
				})}
			</div>
		</section>
	);
}
