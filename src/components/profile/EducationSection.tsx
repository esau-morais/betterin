import { PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react";
import type { Education } from "#/lib/db/schema";

function EntityInitial({ name }: { name: string }) {
	return (
		<div className="size-12 shrink-0 rounded-xl bg-muted flex items-center justify-center text-lg font-medium text-muted-foreground">
			{name[0]?.toUpperCase()}
		</div>
	);
}

function formatDateRange(start: Date | null, end: Date | null): string | null {
	if (!start) return null;
	const fmt = (d: Date) =>
		d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
	return `${fmt(start)} – ${end ? fmt(end) : "Present"}`;
}

export function EducationSection({
	educations,
	isOwner,
	onAdd,
	onEdit,
}: {
	educations: Education[];
	isOwner?: boolean;
	onAdd?: () => void;
	onEdit?: (item: Education) => void;
}) {
	return (
		<section className="bi-card animate-fade-up" aria-label="Education">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold text-foreground">Education</h2>
				{isOwner && onAdd && (
					<button
						type="button"
						onClick={onAdd}
						className="rounded-lg p-1.5 hit-area-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-ring"
						aria-label="Add education"
					>
						<PlusIcon className="size-4" />
					</button>
				)}
			</div>
			<div className="mt-4 divide-y divide-border">
				{educations.map((edu) => {
					const degreeLine = [edu.degree, edu.field].filter(Boolean).join(", ");
					const dateRange = formatDateRange(edu.startDate, edu.endDate);

					return (
						<div key={edu.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
							<EntityInitial name={edu.school} />
							<div className="min-w-0 flex-1">
								<div className="flex items-start gap-2">
									<p className="font-medium text-foreground flex-1">
										{edu.school}
									</p>
									{isOwner && onEdit && (
										<button
											type="button"
											onClick={() => onEdit(edu)}
											className="shrink-0 rounded-lg p-1 hit-area-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-ring"
											aria-label={`Edit ${edu.school}`}
										>
											<PencilSimpleIcon className="size-3.5" />
										</button>
									)}
								</div>
								{degreeLine && (
									<p className="text-sm text-muted-foreground">{degreeLine}</p>
								)}
								{dateRange && (
									<p className="bi-mono text-text-tertiary mt-0.5">
										{dateRange}
									</p>
								)}
								{edu.description && (
									<p className="mt-2 leading-relaxed text-foreground whitespace-pre-wrap">
										{edu.description}
									</p>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}
