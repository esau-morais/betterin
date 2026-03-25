import { CalendarBlankIcon } from "@phosphor-icons/react";
import { format } from "date-fns";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover";
import { cn } from "#/lib/utils";

const PRESETS = [
	{ label: "7D", days: 7 },
	{ label: "2W", days: 14 },
	{ label: "4W", days: 28 },
	{ label: "3M", days: 90 },
] as const;

export type DateFilter =
	| { type: "preset"; days: number }
	| { type: "custom"; from: Date; to: Date };

export function DateRangePicker({
	value,
	onChange,
}: {
	value: DateFilter;
	onChange: (filter: DateFilter) => void;
}) {
	const [calendarOpen, setCalendarOpen] = useState(false);
	const [range, setRange] = useState<DateRange | undefined>(
		value.type === "custom" ? { from: value.from, to: value.to } : undefined,
	);

	function handlePreset(days: number) {
		setRange(undefined);
		onChange({ type: "preset", days });
	}

	function handleRangeSelect(newRange: DateRange | undefined) {
		setRange(newRange);
		if (newRange?.from && newRange?.to) {
			onChange({ type: "custom", from: newRange.from, to: newRange.to });
			setCalendarOpen(false);
		}
	}

	const isCustom = value.type === "custom";

	return (
		<div className="flex items-center gap-2">
			<div className="flex items-center gap-1 rounded-xl border border-border p-1">
				{PRESETS.map(({ label, days }) => (
					<button
						key={label}
						type="button"
						onClick={() => handlePreset(days)}
						className={cn(
							"rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-150 focus-ring",
							value.type === "preset" && value.days === days
								? "bg-primary text-primary-foreground"
								: "text-muted-foreground hover:text-foreground hover:bg-muted",
						)}
					>
						{label}
					</button>
				))}
			</div>

			<Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className={cn("gap-1.5", isCustom && "border-primary text-primary")}
					>
						<CalendarBlankIcon className="size-4" />
						{isCustom ? (
							<span>
								{format(value.from, "MMM d")} – {format(value.to, "MMM d")}
							</span>
						) : (
							<span className="hidden sm:inline">Custom</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="end">
					<Calendar
						mode="range"
						defaultMonth={range?.from}
						selected={range}
						onSelect={handleRangeSelect}
						numberOfMonths={2}
						disabled={{ after: new Date() }}
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
}
