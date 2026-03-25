import { PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react";
import type { Honor } from "#/lib/db/schema";

export function HonorsSection({
	honors,
	isOwner,
	onAdd,
	onEdit,
}: {
	honors: Honor[];
	isOwner?: boolean;
	onAdd?: () => void;
	onEdit?: (item: Honor) => void;
}) {
	return (
		<section className="bi-card animate-fade-up" aria-label="Honors and awards">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold text-foreground">
					Honors & Awards
				</h2>
				{isOwner && onAdd && (
					<button
						type="button"
						onClick={onAdd}
						className="rounded-lg p-1.5 hit-area-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-ring"
						aria-label="Add honor"
					>
						<PlusIcon className="size-4" />
					</button>
				)}
			</div>
			<div className="mt-4 divide-y divide-border">
				{honors.map((honor) => {
					const issuedStr = honor.issueDate
						? honor.issueDate.toLocaleDateString("en-US", {
								month: "short",
								year: "numeric",
							})
						: null;

					return (
						<div key={honor.id} className="py-4 first:pt-0 last:pb-0">
							<div className="flex items-start gap-2">
								<div className="min-w-0 flex-1">
									<p className="font-medium text-foreground">{honor.title}</p>
									{(honor.issuer || issuedStr) && (
										<p className="text-sm text-muted-foreground">
											{[
												honor.issuer ? `Issued by ${honor.issuer}` : null,
												issuedStr,
											]
												.filter(Boolean)
												.join(" · ")}
										</p>
									)}
								</div>
								{isOwner && onEdit && (
									<button
										type="button"
										onClick={() => onEdit(honor)}
										className="shrink-0 rounded-lg p-1 hit-area-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-ring"
										aria-label={`Edit ${honor.title}`}
									>
										<PencilSimpleIcon className="size-3.5" />
									</button>
								)}
							</div>
							{honor.description && (
								<p className="mt-2 leading-relaxed text-foreground whitespace-pre-wrap">
									{honor.description}
								</p>
							)}
						</div>
					);
				})}
			</div>
		</section>
	);
}
