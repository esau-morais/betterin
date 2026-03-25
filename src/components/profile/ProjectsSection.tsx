import {
	ArrowSquareOutIcon,
	PencilSimpleIcon,
	PlusIcon,
} from "@phosphor-icons/react";
import type { Project } from "#/lib/db/schema";

function formatDateRange(start: Date | null, end: Date | null): string | null {
	if (!start) return null;
	const fmt = (d: Date) =>
		d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
	return `${fmt(start)} – ${end ? fmt(end) : "Present"}`;
}

export function ProjectsSection({
	projects,
	isOwner,
	onAdd,
	onEdit,
}: {
	projects: Project[];
	isOwner?: boolean;
	onAdd?: () => void;
	onEdit?: (item: Project) => void;
}) {
	return (
		<section className="bi-card animate-fade-up" aria-label="Projects">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold text-foreground">Projects</h2>
				{isOwner && onAdd && (
					<button
						type="button"
						onClick={onAdd}
						className="rounded-lg p-1.5 hit-area-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-ring"
						aria-label="Add project"
					>
						<PlusIcon className="size-4" />
					</button>
				)}
			</div>
			<div className="mt-4 divide-y divide-border">
				{projects.map((project) => {
					const dateRange = formatDateRange(project.startDate, project.endDate);
					return (
						<div key={project.id} className="py-4 first:pt-0 last:pb-0">
							<div className="flex items-start justify-between gap-2">
								<p className="font-medium text-foreground flex-1">
									{project.name}
								</p>
								<div className="flex items-center gap-1 shrink-0">
									{isOwner && onEdit && (
										<button
											type="button"
											onClick={() => onEdit(project)}
											className="shrink-0 rounded-lg p-1 hit-area-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-ring"
											aria-label={`Edit ${project.name}`}
										>
											<PencilSimpleIcon className="size-3.5" />
										</button>
									)}
									{project.url && (
										<a
											href={project.url}
											target="_blank"
											rel="noopener noreferrer"
											className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground transition-colors focus-ring"
											aria-label={`View ${project.name}`}
										>
											<ArrowSquareOutIcon className="size-4" />
										</a>
									)}
								</div>
							</div>
							{dateRange && (
								<p className="bi-mono text-text-tertiary mt-0.5">{dateRange}</p>
							)}
							{project.description && (
								<p className="mt-2 leading-relaxed text-foreground whitespace-pre-wrap">
									{project.description}
								</p>
							)}
						</div>
					);
				})}
			</div>
		</section>
	);
}
