import {
	BriefcaseIcon,
	CertificateIcon,
	GlobeSimpleIcon,
	GraduationCapIcon,
	HandHeartIcon,
	LightbulbIcon,
	ProjectorScreenIcon,
	TrophyIcon,
	XIcon,
} from "@phosphor-icons/react";
import { Button } from "#/components/ui/button";

export type SectionType =
	| "experience"
	| "education"
	| "skill"
	| "certification"
	| "project"
	| "volunteering"
	| "honor"
	| "language";

const SECTION_OPTIONS: {
	type: SectionType;
	label: string;
	icon: React.ElementType;
}[] = [
	{ type: "experience", label: "Experience", icon: BriefcaseIcon },
	{ type: "education", label: "Education", icon: GraduationCapIcon },
	{ type: "skill", label: "Skill", icon: LightbulbIcon },
	{
		type: "certification",
		label: "License or certification",
		icon: CertificateIcon,
	},
	{ type: "project", label: "Project", icon: ProjectorScreenIcon },
	{ type: "volunteering", label: "Volunteering", icon: HandHeartIcon },
	{ type: "honor", label: "Honor or award", icon: TrophyIcon },
	{ type: "language", label: "Language", icon: GlobeSimpleIcon },
];

export function AddSectionMenu({
	onSelect,
	onClose,
}: {
	onSelect: (type: SectionType) => void;
	onClose: () => void;
}) {
	return (
		<section
			className="bi-card animate-fade-up"
			aria-label="Add profile section"
		>
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold text-foreground">
					Add to profile
				</h2>
				<button
					type="button"
					onClick={onClose}
					className="rounded-lg p-1.5 hit-area-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-ring"
					aria-label="Close menu"
				>
					<XIcon className="size-4" />
				</button>
			</div>

			<div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
				{SECTION_OPTIONS.map(({ type, label, icon: Icon }) => (
					<Button
						key={type}
						variant="ghost"
						size="sm"
						className="flex-col gap-1.5 h-auto py-3"
						onClick={() => onSelect(type)}
					>
						<Icon className="size-5" />
						<span className="text-xs">{label}</span>
					</Button>
				))}
			</div>
		</section>
	);
}
