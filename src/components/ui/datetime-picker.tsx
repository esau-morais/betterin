import { CalendarBlankIcon } from "@phosphor-icons/react";
import * as chrono from "chrono-node";
import { format } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar } from "#/components/ui/calendar";
import { Label } from "#/components/ui/label";
import {
	NativeSelect,
	NativeSelectOption,
} from "#/components/ui/native-select";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover";
import { useDebouncedValue } from "#/lib/use-debounce";
import { cn } from "#/lib/utils";

export function DateTimePicker({
	value,
	onChange,
	label,
	required = false,
}: {
	value: Date | null;
	onChange: (date: Date | null) => void;
	label: string;
	required?: boolean;
}) {
	const [text, setText] = useState("");
	const [calendarOpen, setCalendarOpen] = useState(false);
	const [blurred, setBlurred] = useState(false);
	const debouncedText = useDebouncedValue(text, 300);

	const parsed = useMemo(() => {
		if (!debouncedText.trim()) return null;
		return chrono.parseDate(debouncedText);
	}, [debouncedText]);

	const parseStatus = useMemo(() => {
		if (!debouncedText.trim()) return "empty" as const;
		if (parsed) return "success" as const;
		return "error" as const;
	}, [debouncedText, parsed]);

	useEffect(() => {
		if (parsed) onChange(parsed);
	}, [parsed, onChange]);

	const handleCalendarSelect = useCallback(
		(day: Date | undefined) => {
			if (!day) return;
			const hours = value?.getHours() ?? 12;
			const minutes = value?.getMinutes() ?? 0;
			day.setHours(hours, minutes, 0, 0);
			onChange(day);
			setText(format(day, "MMM d, yyyy 'at' h:mm a"));
			setCalendarOpen(false);
		},
		[value, onChange],
	);

	const handleHourChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			if (!value) return;
			const next = new Date(value);
			const isPM = next.getHours() >= 12;
			let hour = Number(e.target.value);
			if (isPM && hour !== 12) hour += 12;
			if (!isPM && hour === 12) hour = 0;
			next.setHours(hour % 24);
			onChange(next);
			setText(format(next, "MMM d, yyyy 'at' h:mm a"));
		},
		[value, onChange],
	);

	const handleMinuteChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			if (!value) return;
			const next = new Date(value);
			next.setMinutes(Number(e.target.value));
			onChange(next);
			setText(format(next, "MMM d, yyyy 'at' h:mm a"));
		},
		[value, onChange],
	);

	const handleAmPmChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			if (!value) return;
			const next = new Date(value);
			const currentHour = next.getHours();
			if (e.target.value === "PM" && currentHour < 12) {
				next.setHours(currentHour + 12);
			} else if (e.target.value === "AM" && currentHour >= 12) {
				next.setHours(currentHour - 12);
			}
			onChange(next);
			setText(format(next, "MMM d, yyyy 'at' h:mm a"));
		},
		[value, onChange],
	);

	const hour12 = value ? value.getHours() % 12 || 12 : 12;
	const minute = value ? value.getMinutes() : 0;
	const ampm = value ? (value.getHours() >= 12 ? "PM" : "AM") : "AM";
	const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

	const showError = parseStatus === "error" && blurred;
	const showSuccess = parseStatus === "success" && parsed;

	return (
		<div className="space-y-1.5">
			<div className="flex h-5 items-center justify-between">
				<Label>
					{label}
					{required && " *"}
				</Label>
				<span
					className={cn(
						"text-xs transition-opacity",
						showSuccess
							? "text-primary font-medium opacity-100"
							: showError
								? "text-destructive opacity-100"
								: "opacity-0",
					)}
				>
					{showSuccess
						? format(parsed, "EEE, MMM d 'at' h:mm a")
						: showError
							? "Couldn't understand this date"
							: "\u00A0"}
				</span>
			</div>
			<div className="relative">
				<input
					type="text"
					value={text}
					onChange={(e) => {
						setText(e.target.value);
						setBlurred(false);
					}}
					onBlur={() => setBlurred(true)}
					placeholder='e.g. "next Friday at 3pm"'
					className="w-full rounded-lg border border-transparent bg-transparent bg-clip-padding shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.08] px-3 py-2 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:shadow-md focus-visible:shadow-black/[0.06] transition-[color,box-shadow] autofill:shadow-[inset_0_0_0_1000px_var(--color-card)] autofill:[-webkit-text-fill-color:var(--color-foreground)] dark:bg-input/30 dark:ring-white/[0.1] dark:shadow-black/25 dark:focus-visible:shadow-black/20"
				/>
				<Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
					<PopoverTrigger asChild>
						<button
							type="button"
							className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted transition-colors focus-ring"
							aria-label="Open calendar"
						>
							<CalendarBlankIcon className="size-4" />
						</button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-3" align="end">
						<Calendar
							mode="single"
							selected={value ?? undefined}
							onSelect={handleCalendarSelect}
							disabled={{ before: new Date() }}
						/>
						<div className="flex items-center gap-2 pt-3 border-t border-border mt-3">
							<NativeSelect
								className="w-16"
								value={String(hour12)}
								onChange={handleHourChange}
							>
								{Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
									<NativeSelectOption key={h} value={String(h)}>
										{h}
									</NativeSelectOption>
								))}
							</NativeSelect>
							<NativeSelect
								className="w-16"
								value={String(minute)}
								onChange={handleMinuteChange}
							>
								{Array.from({ length: 60 }, (_, i) => i).map((m) => (
									<NativeSelectOption key={m} value={String(m)}>
										{String(m).padStart(2, "0")}
									</NativeSelectOption>
								))}
							</NativeSelect>
							<NativeSelect
								className="w-16"
								value={ampm}
								onChange={handleAmPmChange}
							>
								<NativeSelectOption value="AM">AM</NativeSelectOption>
								<NativeSelectOption value="PM">PM</NativeSelectOption>
							</NativeSelect>
						</div>
						<p className="text-xs text-muted-foreground mt-2">{tz}</p>
					</PopoverContent>
				</Popover>
			</div>
		</div>
	);
}
