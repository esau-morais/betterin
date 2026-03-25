import { PlusIcon } from "@phosphor-icons/react";
import type { Experience as DbExperience } from "#/lib/db/schema";
import {
	type ExperienceGroup,
	ExperienceItem,
	type ExperienceRole,
} from "./ExperienceItem";

type Experience = DbExperience & { companySlug?: string | null };

function groupByCompany(items: Experience[]): ExperienceGroup[] {
	const map = new Map<string, Experience[]>();
	for (const item of items) {
		const key = item.company;
		const group = map.get(key);
		if (group) {
			group.push(item);
		} else {
			map.set(key, [item]);
		}
	}

	return Array.from(map.entries()).map(([company, roles]) => {
		const sorted = roles.sort(
			(a, b) => b.startDate.getTime() - a.startDate.getTime(),
		);
		const verified = sorted.find((r) => r.verificationStatus === "verified");
		const pending = sorted.find((r) => r.verificationStatus === "pending");
		return {
			company,
			roles: sorted,
			verificationStatus: verified
				? "verified"
				: pending
					? "pending"
					: (sorted[0]?.verificationStatus ?? null),
			companySlug: sorted[0]?.companySlug ?? null,
		};
	});
}

export function ExperienceSection({
	experiences,
	isOwner,
	onAdd,
	onEdit,
}: {
	experiences: Experience[];
	isOwner?: boolean;
	onAdd?: () => void;
	onEdit?: (item: ExperienceRole) => void;
}) {
	const groups = groupByCompany(experiences);

	return (
		<section className="bi-card animate-fade-up" aria-label="Experience">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold text-foreground">Experience</h2>
				{isOwner && onAdd && (
					<button
						type="button"
						onClick={onAdd}
						className="rounded-lg p-1.5 hit-area-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-ring"
						aria-label="Add experience"
					>
						<PlusIcon className="size-4" />
					</button>
				)}
			</div>
			<div className="mt-4 divide-y divide-border">
				{groups.map((group) => (
					<ExperienceItem
						key={group.company}
						group={group}
						isOwner={isOwner}
						onEdit={onEdit ? (role) => onEdit(role) : undefined}
					/>
				))}
			</div>
		</section>
	);
}
