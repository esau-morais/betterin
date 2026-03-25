import { useForm } from "@tanstack/react-form";
import { useCallback, useState } from "react";
import { z } from "zod";
import { Button } from "#/components/ui/button";
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
import { MONTHS, YEARS } from "#/lib/date-options";
import type { Honor } from "#/lib/db/schema";
import { addHonorFn, deleteHonorFn, updateHonorFn } from "#/lib/server/profile";

export type HonorItem = Omit<Honor, "userId" | "ordering">;

export function HonorDialog({
	open,
	onOpenChange,
	item,
	onSaved,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	item?: HonorItem | null;
	onSaved: () => void;
}) {
	const isEdit = !!item;
	const [error, setError] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [issueMonth, setIssueMonth] = useState(
		item?.issueDate ? String(item.issueDate.getMonth() + 1) : "",
	);
	const [issueYear, setIssueYear] = useState(
		item?.issueDate ? String(item.issueDate.getFullYear()) : "",
	);

	const form = useForm({
		defaultValues: {
			title: item?.title ?? "",
			issuer: item?.issuer ?? "",
			description: item?.description ?? "",
		},
		onSubmit: async ({ value }) => {
			setError(null);
			try {
				if (isEdit) {
					const issueDate = issueYear
						? new Date(
								Number(issueYear),
								issueMonth ? Number(issueMonth) - 1 : 0,
							).toISOString()
						: undefined;

					await updateHonorFn({
						data: {
							id: item.id,
							title: value.title.trim(),
							issuer: value.issuer.trim() || undefined,
							issueDate,
							description: value.description.trim() || undefined,
						},
					});
				} else {
					await addHonorFn({
						data: {
							title: value.title,
							issuer: value.issuer,
							issueMonth,
							issueYear,
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

	const handleDelete = useCallback(async () => {
		if (!item) return;
		setDeleting(true);
		setError(null);
		try {
			await deleteHonorFn({ data: { id: item.id } });
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
						{isEdit ? "Edit honor or award" : "Add honor or award"}
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
						name="title"
						validators={{
							onSubmit: z.string().trim().min(1, "Title is required"),
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<FieldLabel
									htmlFor="honor-title"
									error={error ?? field.state.meta.errors[0]}
									errorId="honor-error"
								>
									Title *
								</FieldLabel>
								<Input
									id="honor-title"
									size="sm"
									className="rounded-lg"
									value={field.state.value}
									onChange={(e) => {
										field.handleChange(e.target.value);
										if (error) setError(null);
									}}
									onBlur={field.handleBlur}
									placeholder="e.g. Dean's List"
									aria-invalid={!!error || field.state.meta.errors.length > 0}
									aria-describedby={
										error || field.state.meta.errors.length > 0
											? "honor-error"
											: undefined
									}
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="issuer">
						{(field) => (
							<div className="space-y-2">
								<FieldLabel htmlFor="honor-issuer">Issuer</FieldLabel>
								<Input
									id="honor-issuer"
									size="sm"
									className="rounded-lg"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="e.g. Stanford University"
								/>
							</div>
						)}
					</form.Field>

					<div className="space-y-2">
						<FieldLabel>Issue date</FieldLabel>
						<div className="flex gap-3">
							<NativeSelect
								id="honor-issue-month"
								value={issueMonth}
								onChange={(e) => setIssueMonth(e.target.value)}
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
								id="honor-issue-year"
								value={issueYear}
								onChange={(e) => setIssueYear(e.target.value)}
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

					<form.Field name="description">
						{(field) => (
							<div className="space-y-2">
								<FieldLabel htmlFor="honor-description">Description</FieldLabel>
								<textarea
									id="honor-description"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									rows={3}
									placeholder="What was this honor for?"
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
										{deleting ? "Deleting…" : "Delete honor"}
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
