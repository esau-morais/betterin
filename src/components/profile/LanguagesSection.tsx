import { PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react";
import type { Language } from "#/lib/db/schema";

const PROFICIENCY_LABELS: Record<string, string> = {
	elementary: "Elementary proficiency",
	limited: "Limited working proficiency",
	limited_working: "Limited working proficiency",
	professional: "Professional working proficiency",
	professional_working: "Professional working proficiency",
	full_professional: "Full professional proficiency",
	native: "Native or bilingual proficiency",
	native_or_bilingual: "Native or bilingual proficiency",
};

export function LanguagesSection({
	languages,
	isOwner,
	onAdd,
	onEdit,
}: {
	languages: Language[];
	isOwner?: boolean;
	onAdd?: () => void;
	onEdit?: (item: Language) => void;
}) {
	return (
		<section className="bi-card animate-fade-up" aria-label="Languages">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold text-foreground">Languages</h2>
				{isOwner && onAdd && (
					<button
						type="button"
						onClick={onAdd}
						className="rounded-lg p-1.5 hit-area-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-ring"
						aria-label="Add language"
					>
						<PlusIcon className="size-4" />
					</button>
				)}
			</div>
			<div className="mt-4 divide-y divide-border">
				{languages.map((lang) => (
					<div key={lang.id} className="py-3 first:pt-0 last:pb-0">
						<div className="flex items-start gap-2">
							<div className="min-w-0 flex-1">
								<p className="font-medium text-foreground">{lang.name}</p>
								{lang.proficiency && (
									<p className="text-sm text-muted-foreground">
										{PROFICIENCY_LABELS[lang.proficiency] ?? lang.proficiency}
									</p>
								)}
							</div>
							{isOwner && onEdit && (
								<button
									type="button"
									onClick={() => onEdit(lang)}
									className="shrink-0 rounded-lg p-1 hit-area-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-ring"
									aria-label={`Edit ${lang.name}`}
								>
									<PencilSimpleIcon className="size-3.5" />
								</button>
							)}
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
