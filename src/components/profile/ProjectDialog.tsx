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
import { MONTHS, PAST_YEARS, YEARS } from "#/lib/date-options";
import type { Project } from "#/lib/db/schema";
import {
	addProjectFn,
	deleteProjectFn,
	updateProjectFn,
} from "#/lib/server/profile";

export type ProjectItem = Omit<Project, "userId" | "ordering" | "mediaUrls">;

export function ProjectDialog({
	open,
	onOpenChange,
	item,
	onSaved,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	item?: ProjectItem | null;
	onSaved: () => void;
}) {
	const isEdit = !!item;
	const [error, setError] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [ongoing, setOngoing] = useState(
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

	const form = useForm({
		defaultValues: {
			name: item?.name ?? "",
			description: item?.description ?? "",
			url: item?.url ?? "",
		},
		onSubmit: async ({ value }) => {
			setError(null);
			try {
				if (isEdit) {
					const startDate = startYear
						? new Date(
								Number(startYear),
								startMonth ? Number(startMonth) - 1 : 0,
							).toISOString()
						: undefined;

					const endDate =
						!ongoing && endYear
							? new Date(
									Number(endYear),
									endMonth ? Number(endMonth) - 1 : 0,
								).toISOString()
							: undefined;

					await updateProjectFn({
						data: {
							id: item.id,
							name: value.name.trim(),
							description: value.description.trim() || undefined,
							url: value.url.trim() || undefined,
							startDate,
							endDate,
						},
					});
				} else {
					await addProjectFn({
						data: {
							name: value.name,
							description: value.description,
							url: value.url,
							startMonth,
							startYear,
							endMonth: ongoing ? undefined : endMonth,
							endYear: ongoing ? undefined : endYear,
						},
					});
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
			await deleteProjectFn({ data: { id: item.id } });
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
					<DialogTitle>{isEdit ? "Edit project" : "Add project"}</DialogTitle>
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
						name="name"
						validators={{
							onSubmit: z.string().trim().min(1, "Project name is required"),
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<FieldLabel
									htmlFor="proj-name"
									error={error ?? field.state.meta.errors[0]}
									errorId="proj-error"
								>
									Name *
								</FieldLabel>
								<Input
									id="proj-name"
									size="sm"
									className="rounded-lg"
									value={field.state.value}
									onChange={(e) => {
										field.handleChange(e.target.value);
										if (error) setError(null);
									}}
									onBlur={field.handleBlur}
									placeholder="e.g. Open-source CLI tool"
									aria-invalid={!!error || field.state.meta.errors.length > 0}
									aria-describedby={
										error || field.state.meta.errors.length > 0
											? "proj-error"
											: undefined
									}
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="description">
						{(field) => (
							<div className="space-y-2">
								<FieldLabel htmlFor="proj-description">Description</FieldLabel>
								<textarea
									id="proj-description"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									rows={4}
									placeholder="What was this project about?"
									className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors resize-y dark:bg-input/30"
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="url">
						{(field) => (
							<div className="space-y-2">
								<FieldLabel htmlFor="proj-url">URL</FieldLabel>
								<Input
									id="proj-url"
									type="url"
									size="sm"
									className="rounded-lg"
									autoComplete="url"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="https://github.com/you/project"
								/>
							</div>
						)}
					</form.Field>

					<div className="space-y-2">
						<FieldLabel>Start date</FieldLabel>
						<div className="flex gap-3">
							<NativeSelect
								id="proj-start-month"
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
								id="proj-start-year"
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

					<div className="flex items-center gap-3">
						<Checkbox
							id="proj-ongoing"
							checked={ongoing}
							onCheckedChange={(checked) => setOngoing(checked === true)}
						/>
						<label
							htmlFor="proj-ongoing"
							className="text-sm font-medium text-foreground cursor-pointer select-none"
						>
							Ongoing project
						</label>
					</div>

					<div className="space-y-2">
						<FieldLabel>End date</FieldLabel>
						<div className="flex gap-3">
							<NativeSelect
								id="proj-end-month"
								value={endMonth}
								onChange={(e) => setEndMonth(e.target.value)}
								disabled={ongoing}
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
								id="proj-end-year"
								value={endYear}
								onChange={(e) => setEndYear(e.target.value)}
								disabled={ongoing}
								className="flex-1"
							>
								<NativeSelectOption value="">Year</NativeSelectOption>
								{PAST_YEARS.map((y) => (
									<NativeSelectOption key={y} value={y}>
										{y}
									</NativeSelectOption>
								))}
							</NativeSelect>
						</div>
					</div>

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
										{deleting ? "Deleting…" : "Delete project"}
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
