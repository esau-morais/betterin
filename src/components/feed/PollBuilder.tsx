import { PlusIcon, XIcon } from "@phosphor-icons/react";
import {
	NativeSelect,
	NativeSelectOption,
} from "#/components/ui/native-select";

const MAX_OPTIONS = 4;
const MAX_OPTION_LENGTH = 140;

export type PollBuilderState = {
	options: string[];
	durationDays: number;
	durationHours: number;
	durationMinutes: number;
};

export function pollBuilderDefaults(): PollBuilderState {
	return {
		options: ["", ""],
		durationDays: 1,
		durationHours: 0,
		durationMinutes: 0,
	};
}

export function getTotalDurationHours(state: PollBuilderState): number {
	return (
		state.durationDays * 24 + state.durationHours + state.durationMinutes / 60
	);
}

export function PollBuilder({
	state,
	onChange,
	onRemove,
}: {
	state: PollBuilderState;
	onChange: (state: PollBuilderState) => void;
	onRemove: () => void;
}) {
	function updateOption(index: number, value: string) {
		const next = [...state.options];
		next[index] = value;
		onChange({ ...state, options: next });
	}

	function addOption() {
		if (state.options.length >= MAX_OPTIONS) return;
		onChange({ ...state, options: [...state.options, ""] });
	}

	function removeOption(index: number) {
		if (state.options.length <= 2) return;
		onChange({
			...state,
			options: state.options.filter((_, i) => i !== index),
		});
	}

	return (
		<div className="space-y-3 rounded-xl border border-border p-3">
			{state.options.map((opt, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: poll options are identified by position
				<div key={i} className="flex items-center gap-2">
					<div className="relative flex-1">
						<input
							type="text"
							value={opt}
							onChange={(e) => updateOption(i, e.target.value)}
							placeholder={`Choice ${i + 1}`}
							maxLength={MAX_OPTION_LENGTH}
							className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors"
						/>
						<span className="absolute right-2 top-1/2 -translate-y-1/2 bi-mono text-text-tertiary text-xs">
							{opt.length}/{MAX_OPTION_LENGTH}
						</span>
					</div>
					{state.options.length > 2 && (
						<button
							type="button"
							onClick={() => removeOption(i)}
							className="rounded-md p-1 text-muted-foreground hover:bg-muted transition-colors focus-ring"
							aria-label={`Remove choice ${i + 1}`}
						>
							<XIcon className="size-4" />
						</button>
					)}
					{i === state.options.length - 1 &&
						state.options.length < MAX_OPTIONS && (
							<button
								type="button"
								onClick={addOption}
								className="rounded-md p-1 text-muted-foreground hover:bg-muted transition-colors focus-ring"
								aria-label="Add choice"
							>
								<PlusIcon className="size-4" />
							</button>
						)}
				</div>
			))}

			<div>
				<p className="text-sm font-medium mb-2">Poll length</p>
				<div className="flex items-center gap-2">
					<NativeSelect
						className="flex-1"
						value={String(state.durationDays)}
						onChange={(e) =>
							onChange({ ...state, durationDays: Number(e.target.value) })
						}
					>
						{Array.from({ length: 15 }, (_, i) => (
							<NativeSelectOption key={String(i)} value={String(i)}>
								{i} {i === 1 ? "day" : "days"}
							</NativeSelectOption>
						))}
					</NativeSelect>

					<NativeSelect
						className="flex-1"
						value={String(state.durationHours)}
						onChange={(e) =>
							onChange({ ...state, durationHours: Number(e.target.value) })
						}
					>
						{Array.from({ length: 24 }, (_, i) => (
							<NativeSelectOption key={String(i)} value={String(i)}>
								{i} {i === 1 ? "hour" : "hours"}
							</NativeSelectOption>
						))}
					</NativeSelect>

					<NativeSelect
						className="flex-1"
						value={String(state.durationMinutes)}
						onChange={(e) =>
							onChange({
								...state,
								durationMinutes: Number(e.target.value),
							})
						}
					>
						{[0, 15, 30, 45].map((m) => (
							<NativeSelectOption key={m} value={String(m)}>
								{m} min
							</NativeSelectOption>
						))}
					</NativeSelect>
				</div>
			</div>

			<button
				type="button"
				onClick={onRemove}
				className="text-sm text-destructive hover:underline focus-ring rounded"
			>
				Remove poll
			</button>
		</div>
	);
}
