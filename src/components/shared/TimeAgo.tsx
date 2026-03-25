import { cn } from "#/lib/utils";

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const WEEK = 604_800_000;

function formatRelative(date: Date): string {
	const now = Date.now();
	const diff = now - date.getTime();

	if (diff < 0) {
		const forward = -diff;
		if (forward < MINUTE) return "now";
		if (forward < HOUR) return `in ${Math.floor(forward / MINUTE)}m`;
		if (forward < DAY) return `in ${Math.floor(forward / HOUR)}h`;
		return `in ${Math.floor(forward / DAY)}d`;
	}

	if (diff < MINUTE) return "now";
	if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
	if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
	if (diff < WEEK) return `${Math.floor(diff / DAY)}d`;

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

export function TimeAgo({
	date,
	className,
}: {
	date: string | Date;
	className?: string;
}) {
	const d = typeof date === "string" ? new Date(date) : date;

	return (
		<time
			dateTime={d.toISOString()}
			title={d.toLocaleString()}
			className={cn("bi-mono text-text-tertiary", className)}
		>
			{formatRelative(d)}
		</time>
	);
}
