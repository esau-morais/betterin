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
import { END_YEARS, MONTHS, YEARS } from "#/lib/date-options";
import type { Certification } from "#/lib/db/schema";
import {
	addCertificationFn,
	deleteCertificationFn,
	updateCertificationFn,
} from "#/lib/server/profile";

export type CertificationItem = Omit<Certification, "userId" | "ordering">;

export function CertificationDialog({
	open,
	onOpenChange,
	item,
	onSaved,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	item?: CertificationItem | null;
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
	const [expirationMonth, setExpirationMonth] = useState(
		item?.expirationDate ? String(item.expirationDate.getMonth() + 1) : "",
	);
	const [expirationYear, setExpirationYear] = useState(
		item?.expirationDate ? String(item.expirationDate.getFullYear()) : "",
	);

	const form = useForm({
		defaultValues: {
			name: item?.name ?? "",
			organization: item?.organization ?? "",
			credentialId: item?.credentialId ?? "",
			credentialUrl: item?.credentialUrl ?? "",
		},
		onSubmit: async ({ value }) => {
			setError(null);
			try {
				const issueDate = issueYear
					? new Date(
							Number(issueYear),
							issueMonth ? Number(issueMonth) - 1 : 0,
						).toISOString()
					: undefined;

				const expirationDate = expirationYear
					? new Date(
							Number(expirationYear),
							expirationMonth ? Number(expirationMonth) - 1 : 0,
						).toISOString()
					: undefined;

				if (isEdit) {
					await updateCertificationFn({
						data: {
							id: item.id,
							name: value.name.trim(),
							organization: value.organization.trim(),
							issueDate,
							expirationDate,
							credentialId: value.credentialId.trim() || undefined,
							credentialUrl: value.credentialUrl.trim() || undefined,
						},
					});
				} else {
					await addCertificationFn({
						data: {
							name: value.name,
							organization: value.organization,
							issueMonth,
							issueYear,
							expirationMonth,
							expirationYear,
							credentialId: value.credentialId,
							credentialUrl: value.credentialUrl,
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
			await deleteCertificationFn({ data: { id: item.id } });
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
						{isEdit ? "Edit certification" : "Add certification"}
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
						name="name"
						validators={{
							onSubmit: z
								.string()
								.trim()
								.min(1, "Certification name is required"),
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<FieldLabel
									htmlFor="cert-name"
									error={error ?? field.state.meta.errors[0]}
									errorId="cert-error"
								>
									Name *
								</FieldLabel>
								<Input
									id="cert-name"
									size="sm"
									className="rounded-lg"
									value={field.state.value}
									onChange={(e) => {
										field.handleChange(e.target.value);
										if (error) setError(null);
									}}
									onBlur={field.handleBlur}
									placeholder="e.g. AWS Solutions Architect"
									aria-invalid={!!error || field.state.meta.errors.length > 0}
									aria-describedby={
										error || field.state.meta.errors.length > 0
											? "cert-error"
											: undefined
									}
								/>
							</div>
						)}
					</form.Field>

					<form.Field
						name="organization"
						validators={{
							onSubmit: z
								.string()
								.trim()
								.min(1, "Issuing organization is required"),
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<FieldLabel
									htmlFor="cert-org"
									error={field.state.meta.errors[0]}
								>
									Issuing organization *
								</FieldLabel>
								<Input
									id="cert-org"
									size="sm"
									className="rounded-lg"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="e.g. Amazon Web Services"
								/>
							</div>
						)}
					</form.Field>

					<div className="space-y-2">
						<FieldLabel>Issue date</FieldLabel>
						<div className="flex gap-3">
							<NativeSelect
								id="cert-issue-month"
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
								id="cert-issue-year"
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

					<div className="space-y-2">
						<FieldLabel>Expiration date</FieldLabel>
						<div className="flex gap-3">
							<NativeSelect
								id="cert-exp-month"
								value={expirationMonth}
								onChange={(e) => setExpirationMonth(e.target.value)}
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
								id="cert-exp-year"
								value={expirationYear}
								onChange={(e) => setExpirationYear(e.target.value)}
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

					<form.Field name="credentialId">
						{(field) => (
							<div className="space-y-2">
								<FieldLabel htmlFor="cert-credential-id">
									Credential ID
								</FieldLabel>
								<Input
									id="cert-credential-id"
									size="sm"
									className="rounded-lg"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="e.g. ABC123XYZ"
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="credentialUrl">
						{(field) => (
							<div className="space-y-2">
								<FieldLabel htmlFor="cert-credential-url">
									Credential URL
								</FieldLabel>
								<Input
									id="cert-credential-url"
									type="url"
									size="sm"
									className="rounded-lg"
									autoComplete="url"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="https://verify.example.com/cert/..."
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
										{deleting ? "Deleting\u2026" : "Delete certification"}
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
