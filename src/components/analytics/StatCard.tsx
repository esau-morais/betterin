import { TrendDownIcon, TrendUpIcon } from "@phosphor-icons/react";
import { cn } from "#/lib/utils";

export function StatCard({
	value,
	label,
	delta,
	format = "number",
}: {
	value: number;
	label: string;
	delta?: number | null;
	format?: "number" | "percent";
}) {
	const formattedValue =
		format === "percent" ? `${value}%` : value.toLocaleString();

	return (
		<div className="space-y-1">
			<p className="font-mono text-2xl font-bold tracking-tight">
				{formattedValue}
			</p>
			<p className="text-sm text-muted-foreground">{label}</p>
			{delta != null && (
				<p
					className={cn(
						"flex items-center gap-0.5 text-xs font-medium",
						delta > 0 && "text-success",
						delta < 0 && "text-destructive",
						delta === 0 && "text-muted-foreground",
					)}
				>
					{delta > 0 ? (
						<TrendUpIcon className="size-3" />
					) : delta < 0 ? (
						<TrendDownIcon className="size-3" />
					) : null}
					{delta > 0 ? "+" : ""}
					{delta}%
				</p>
			)}
		</div>
	);
}
