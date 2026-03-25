import { useForm } from "@tanstack/react-form";
import { useState } from "react";
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
import type { VolunteeringEntry } from "#/lib/db/schema";
import {
	addVolunteeringFn,
	deleteVolunteeringFn,
	updateVolunteeringFn,
} from "#/lib/server/profile";

const CAUSES = [
	"Animal Welfare",
	"Arts and Culture",
	"Children",
	"Civil Rights and Social Action",
	"Disaster and Humanitarian Relief",
	"Economic Empowerment",
	"Education",
	"Environment",
	"Health",
	"Human Rights",
	"Poverty Alleviation",
	"Science and Technology",
	"Social Services",
];

export type VolunteeringItem = Omit<VolunteeringEntry, "userId" | "ordering">;

export function VolunteeringDialog({
	open,
	onOpenChange,
	item,
	onSaved,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	item?: VolunteeringItem | null;
	onSaved: () => void;
}) {
	const isEdit = !!item;
	const [cause, setCause] = useState(item?.cause ?? "");
	const [stillVolunteering, setStillVolunteering] = useState(
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
			role: item?.role ?? "",
			organization: item?.organization ?? "",
			description: item?.description ?? "",
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
						!stillVolunteering && endYear
							? new Date(
									Number(endYear),
									endMonth ? Number(endMonth) - 1 : 0,
								).toISOString()
							: undefined;

					await updateVolunteeringFn({
						data: {
							id: item.id,
							role: value.role.trim(),
							organization: value.organization.trim(),
							cause: cause.trim() || undefined,
							startDate,
							endDate,
							description: value.description.trim() || undefined,
						},
					});
				} else {
					await addVolunteeringFn({
						data: {
							role: value.role,
							organization: value.organization,
							cause,
							startMonth,
							startYear,
							endMonth: stillVolunteering ? undefined : endMonth,
							endYear: stillVolunteering ? undefined : endYear,
							description: value.description,
						},
					});
				}
				onSaved();
			} catch (err: unknown) {
				setError(err instanceof Error ? err.message : "Failed to save");
			}
		},
	});

	const handleDelete = async () => {
		if (!item) return;
		setDeleting(true);
		setError(null);
		try {
			await deleteVolunteeringFn({ data: { id: item.id } });
			onSaved();
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Failed to delete");
		} finally {
			setDeleting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="sm:max-w-lg max-h-[85vh] overflow-y-auto"
				showCloseButton
			>
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Edit volunteering" : "Add volunteering"}
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
						name="role"
						validators={{
							onSubmit: z.string().trim().min(1, "Role is required"),
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<FieldLabel
									htmlFor="vol-role"
									error={error ?? field.state.meta.errors[0]}
									errorId="vol-error"
								>
									Role *
								</FieldLabel>
								<Input
									id="vol-role"
									size="sm"
									className="rounded-lg"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="e.g. Mentor"
								/>
							</div>
						)}
					</form.Field>

					<form.Field
						name="organization"
						validators={{
							onSubmit: z.string().trim().min(1, "Organization is required"),
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<FieldLabel
									htmlFor="vol-org"
									error={field.state.meta.errors[0]}
								>
									Organization *
								</FieldLabel>
								<Input
									id="vol-org"
									size="sm"
									className="rounded-lg"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="e.g. Code.org"
								/>
							</div>
						)}
					</form.Field>

					<div className="space-y-2">
						<FieldLabel htmlFor="vol-cause">Cause</FieldLabel>
						<NativeSelect
							id="vol-cause"
							value={cause}
							onChange={(e) => setCause(e.target.value)}
						>
							<NativeSelectOption value="">Select a cause</NativeSelectOption>
							{CAUSES.map((c) => (
								<NativeSelectOption key={c} value={c}>
									{c}
								</NativeSelectOption>
							))}
						</NativeSelect>
					</div>

					<div className="space-y-2">
						<FieldLabel>Start date</FieldLabel>
						<div className="flex gap-3">
							<NativeSelect
								id="vol-start-month"
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
								id="vol-start-year"
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
							id="vol-still-volunteering"
							checked={stillVolunteering}
							onCheckedChange={(checked) =>
								setStillVolunteering(checked === true)
							}
						/>
						<label
							htmlFor="vol-still-volunteering"
							className="text-sm font-medium text-foreground cursor-pointer select-none"
						>
							I still volunteer here
						</label>
					</div>

					<div className="space-y-2">
						<FieldLabel>End date</FieldLabel>
						<div className="flex gap-3">
							<NativeSelect
								id="vol-end-month"
								value={endMonth}
								onChange={(e) => setEndMonth(e.target.value)}
								disabled={stillVolunteering}
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
								id="vol-end-year"
								value={endYear}
								onChange={(e) => setEndYear(e.target.value)}
								disabled={stillVolunteering}
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

					<form.Field name="description">
						{(field) => (
							<div className="space-y-2">
								<FieldLabel htmlFor="vol-description">Description</FieldLabel>
								<textarea
									id="vol-description"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									rows={4}
									placeholder="What did you do?"
									className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors resize-y dark:bg-input/30"
								/>
							</div>
						)}
					</form.Field>

					<form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
						{([canSubmit, isSubmitting]) => (
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
										{deleting ? "Deleting\u2026" : "Delete volunteering"}
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
									{isSubmitting ? "Saving\u2026" : "Save"}
								</Button>
							</div>
						)}
					</form.Subscribe>
				</form>
			</DialogContent>
		</Dialog>
	);
}
