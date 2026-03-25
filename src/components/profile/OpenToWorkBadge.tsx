import { BriefcaseIcon } from "@phosphor-icons/react";

export function OpenToWorkBadge() {
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full border border-salary/20 bg-gradient-to-r from-salary/12 to-salary/5 px-2.5 py-0.5 text-xs font-semibold text-salary">
			<BriefcaseIcon className="size-3" weight="fill" />
			Open to Work
		</span>
	);
}
