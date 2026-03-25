import { useForm } from "@tanstack/react-form";
import { useCallback, useState } from "react";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { FieldLabel } from "#/components/ui/label";
import {
	NativeSelect,
	NativeSelectOption,
} from "#/components/ui/native-select";
import { END_YEARS, MONTHS, YEARS } from "#/lib/date-options";
import type { Education } from "#/lib/db/schema";
import {
	addEducationFn,
	deleteEducationFn,
	updateEducationFn,
} from "#/lib/server/profile";

export type EducationItem = Omit<Education, "userId" | "ordering">;

export function EducationDialog({
	open,
	onOpenChange,
	item,
	onSaved,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	item?: EducationItem | null;
	onSaved: () => void;
}) {
	const isEdit = !!item;
	const [currentlyStudying, setCurrentlyStudying] = useState(
		item ? item.startDate != null && item.endDate == null : false,
	);
	const [startMonth, setStartMonth] = useState(
		item?.startDate ? String(item.startDate.getMonth() + 1) : "",
	);
	const [startYear, setStartYear] = useState(
		item?.startDate ? String(item.startDate.getFullYear()) : "",
	);
	const [endMonth, setEndMonth] = useState(
		item?.endDate ? String(item.endDate.getMonth() + 1) : "",
	);
	const [endYear, setEndYear] = useState(
		item?.endDate ? String(item.endDate.getFullYear()) : "",
	);
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const form = useForm({
		defaultValues: {
			school: item?.school ?? "",
			degree: item?.degree ?? "",
			field: item?.field ?? "",
			description: item?.description ?? "",
		},
		onSubmit: async ({ value }) => {
			if (
				!currentlyStudying &&
				startYear &&
				endYear &&
				(Number(endYear) < Number(startYear) ||
					(Number(endYear) === Number(startYear) &&
						startMonth &&
						endMonth &&
						Number(endMonth) < Number(startMonth)))
			) {
				setError("End date must be after start date");
				return;
			}
			setError(null);
			try {
				const startDate = startYear
					? new Date(
							Number(startYear),
							startMonth ? Number(startMonth) - 1 : 0,
						).toISOString()
					: undefined;

				const endDate =
					!currentlyStudying && endYear
						? new Date(
								Number(endYear),
								endMonth ? Number(endMonth) - 1 : 0,
							).toISOString()
						: undefined;

				const payload = {
					school: value.school.trim(),
					degree: value.degree.trim() || undefined,
					field: value.field.trim() || undefined,
					startDate,
					endDate,
					description: value.description.trim() || undefined,
				};

				if (isEdit) {
					await updateEducationFn({
						data: { id: item.id, ...payload, currentlyStudying },
					});
				} else {
					await addEducationFn({ data: payload });
				}
				onSaved();
			} catch (err: unknown) {
				setError(err instanceof Error ? err.message : "Failed to save");
			}
		},
	});

	const handleDelete = useCallback(async () => {
		if (!item) return;
		setDeleting(true);
		setError(null);
		try {
			await deleteEducationFn({ data: { id: item.id } });
			onSaved();
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Failed to delete");
		} finally {
			setDeleting(false);
		}
	}, [item, onSaved]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="sm:max-w-lg max-h-[85vh] overflow-y-auto"
				showCloseButton
			>
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Edit education" : "Add education"}
					</DialogTitle>
				</DialogHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4 py-2"
					noValidate
				>
					<form.Field
						name="school"
						validators={{
							onSubmit: z.string().trim().min(1, "School is required"),
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<FieldLabel
									htmlFor="edu-school"
									error={error ?? field.state.meta.errors[0]}
									errorId="edu-error"
								>
									School *
								</FieldLabel>
								<Input
									id="edu-school"
									size="sm"
									className="rounded-lg"
									autoComplete="organization"
									value={field.state.value}
									onChange={(e) => {
										field.handleChange(e.target.value);
										if (error) setError(null);
									}}
									onBlur={field.handleBlur}
									placeholder="e.g. Stanford University"
									aria-invalid={!!error || field.state.meta.errors.length > 0}
									aria-describedby={
										error || field.state.meta.errors.length > 0
											? "edu-error"
											: undefined
									}
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="degree">
						{(field) => (
							<div className="space-y-2">
								<FieldLabel htmlFor="edu-degree">Degree</FieldLabel>
								<Input
									id="edu-degree"
									size="sm"
									className="rounded-lg"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="e.g. Bachelor of Science"
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="field">
						{(field) => (
							<div className="space-y-2">
								<FieldLabel htmlFor="edu-field">Field of study</FieldLabel>
								<Input
									id="edu-field"
									size="sm"
									className="rounded-lg"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="e.g. Computer Science"
								/>
							</div>
						)}
					</form.Field>

					<div className="flex items-center gap-3">
						<Checkbox
							id="edu-currently-studying"
							checked={currentlyStudying}
							onCheckedChange={(checked) =>
								setCurrentlyStudying(checked === true)
							}
						/>
						<label
							htmlFor="edu-currently-studying"
							className="text-sm font-medium text-foreground cursor-pointer select-none"
						>
							I'm currently studying here
						</label>
					</div>

					<div className="space-y-2">
						<FieldLabel>Start date</FieldLabel>
						<div className="flex gap-3">
							<NativeSelect
								id="edu-start-month"
								value={startMonth}
								onChange={(e) => setStartMonth(e.target.value)}
								className="flex-1"
							>
								<NativeSelectOption value="">Month</NativeSelectOption>
								{MONTHS.map((m) => (
									<NativeSelectOption key={m.value} value={m.value}>
										{m.label}
									</NativeSelectOption>
								))}
							</NativeSelect>
							<NativeSelect
								id="edu-start-year"
								value={startYear}
								onChange={(e) => setStartYear(e.target.value)}
								className="flex-1"
							>
								<NativeSelectOption value="">Year</NativeSelectOption>
								{YEARS.map((y) => (
									<NativeSelectOption key={y} value={y}>
										{y}
									</NativeSelectOption>
								))}
							</NativeSelect>
						</div>
					</div>

					<div className="space-y-2">
						<FieldLabel>End date (or expected)</FieldLabel>
						<div className="flex gap-3">
							<NativeSelect
								id="edu-end-month"
								value={endMonth}
								onChange={(e) => setEndMonth(e.target.value)}
								disabled={currentlyStudying}
								className="flex-1"
							>
								<NativeSelectOption value="">Month</NativeSelectOption>
								{MONTHS.map((m) => (
									<NativeSelectOption key={m.value} value={m.value}>
										{m.label}
									</NativeSelectOption>
								))}
							</NativeSelect>
							<NativeSelect
								id="edu-end-year"
								value={endYear}
								onChange={(e) => setEndYear(e.target.value)}
								disabled={currentlyStudying}
								className="flex-1"
							>
								<NativeSelectOption value="">Year</NativeSelectOption>
								{END_YEARS.map((y) => (
									<NativeSelectOption key={y} value={y}>
										{y}
									</NativeSelectOption>
								))}
							</NativeSelect>
						</div>
					</div>

					<form.Field name="description">
						{(field) => (
							<div className="space-y-2">
								<FieldLabel htmlFor="edu-description">Description</FieldLabel>
								<textarea
									id="edu-description"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									rows={4}
									placeholder="Activities, societies, achievements..."
									className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors resize-y dark:bg-input/30"
								/>
							</div>
						)}
					</form.Field>

					<form.Subscribe
						selector={(s) => [s.isSubmitting, s.canSubmit] as const}
					>
						{([isSubmitting, canSubmit]) => (
							<div className="flex items-center gap-2 pt-2">
								{isEdit && (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={handleDelete}
										disabled={deleting || isSubmitting}
										className="text-destructive hover:text-destructive mr-auto"
									>
										{deleting ? "Deleting…" : "Delete education"}
									</Button>
								)}
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => onOpenChange(false)}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									variant="default"
									size="sm"
									disabled={!canSubmit || deleting}
								>
									{isSubmitting ? "Saving…" : "Save"}
								</Button>
							</div>
						)}
					</form.Subscribe>
				</form>
			</DialogContent>
		</Dialog>
	);
}
