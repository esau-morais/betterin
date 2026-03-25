import { Fragment } from "react";
import { cn } from "#/lib/utils";

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const HOUR_LABELS = ["12am", "4am", "8am", "12pm", "4pm", "8pm"];
const HOUR_BUCKETS = [
	[0, 1, 2, 3],
	[4, 5, 6, 7],
	[8, 9, 10, 11],
	[12, 13, 14, 15],
	[16, 17, 18, 19],
	[20, 21, 22, 23],
];

type ActivityData = { dow: number; hour: number; count: number };

function intensityClass(intensity: number) {
	if (intensity === 0) return "bg-muted";
	if (intensity <= 0.25) return "bg-primary/20";
	if (intensity <= 0.5) return "bg-primary/40";
	if (intensity <= 0.75) return "bg-primary/60";
	return "bg-primary/90";
}

export function ActivityHeatmap({ data }: { data: ActivityData[] }) {
	const countMap = new Map<string, number>();
	for (const d of data) {
		const key = `${d.dow}-${d.hour}`;
		countMap.set(key, (countMap.get(key) ?? 0) + d.count);
	}

	const displayDowOrder = [1, 2, 3, 4, 5, 6, 0];

	const grid: number[][] = HOUR_BUCKETS.map((hours) =>
		displayDowOrder.map((dow) =>
			hours.reduce((sum, h) => sum + (countMap.get(`${dow}-${h}`) ?? 0), 0),
		),
	);

	const maxCount = Math.max(...grid.flat(), 1);

	return (
		<div className="space-y-2">
			<div
				className="grid gap-1"
				style={{ gridTemplateColumns: "auto repeat(7, 1fr)" }}
			>
				<div />
				{DAYS.map((day) => (
					<div key={day} className="text-center text-xs text-muted-foreground">
						{day}
					</div>
				))}

				{grid.map((row, rowIdx) => (
					<Fragment key={HOUR_LABELS[rowIdx]}>
						<div className="flex items-center pr-2 text-xs text-muted-foreground whitespace-nowrap">
							{HOUR_LABELS[rowIdx]}
						</div>
						{row.map((count, colIdx) => {
							const intensity = count / maxCount;
							return (
								<div
									key={`${HOUR_LABELS[rowIdx]}-${DAYS[colIdx]}`}
									className={cn(
										"aspect-square rounded-sm transition-colors duration-150",
										intensityClass(intensity),
									)}
									title={`${DAYS[colIdx]}, ${HOUR_LABELS[rowIdx]}: ${count} views`}
								/>
							);
						})}
					</Fragment>
				))}
			</div>

			<div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
				<span>Less</span>
				<div className="flex gap-0.5">
					<div className="size-3 rounded-sm bg-muted" />
					<div className="size-3 rounded-sm bg-primary/20" />
					<div className="size-3 rounded-sm bg-primary/40" />
					<div className="size-3 rounded-sm bg-primary/60" />
					<div className="size-3 rounded-sm bg-primary/90" />
				</div>
				<span>More</span>
			</div>
		</div>
	);
}
