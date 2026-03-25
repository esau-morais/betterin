import { MegaphoneIcon } from "@phosphor-icons/react";

export function HiringBadge() {
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-gradient-to-r from-primary/12 to-primary/5 px-2.5 py-0.5 text-xs font-semibold text-primary">
			<MegaphoneIcon className="size-3" weight="fill" />
			Hiring
		</span>
	);
}
