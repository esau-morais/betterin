import { useForm } from "@tanstack/react-form";
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
import { updateCompanyFn } from "#/lib/server/companies";
import type { CompanyData } from "./types";

const SIZE_OPTIONS = [
	{ value: "1_10", label: "1–10" },
	{ value: "11_50", label: "11–50" },
	{ value: "51_200", label: "51–200" },
	{ value: "201_500", label: "201–500" },
	{ value: "501_1000", label: "501–1,000" },
	{ value: "1000_plus", label: "1,000+" },
];

export function CompanyEditDialog({
	open,
	onOpenChange,
	company,
	onSaved,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	company: CompanyData;
	onSaved: () => void;
}) {
	const form = useForm({
		defaultValues: {
			name: company.name,
			tagline: company.tagline ?? "",
			description: company.description ?? "",
			website: company.website ?? "",
			headquarters: company.headquarters ?? "",
			industry: company.industry ?? "",
			size: company.size ?? "",
			founded: company.founded ? String(company.founded) : "",
		},
		onSubmit: async ({ value }) => {
			await updateCompanyFn({
				data: {
					companyId: company.id,
					name: value.name.trim(),
					tagline: value.tagline,
					description: value.description,
					website: value.website,
					headquarters: value.headquarters,
					industry: value.industry,
					size: value.size ? (value.size as "1_10") : null,
					founded: value.founded ? Number.parseInt(value.founded, 10) : null,
				},
			});
			onSaved();
			onOpenChange(false);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="sm:max-w-lg max-h-[85vh] overflow-y-auto"
				showCloseButton
			>
				<DialogHeader>
					<DialogTitle>Edit company</DialogTitle>
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
								.min(1, "Company name is required")
								.max(256),
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<FieldLabel
									htmlFor="edit-company-name"
									error={field.state.meta.errors[0]}
								>
									Name
								</FieldLabel>
								<Input
									id="edit-company-name"
									size="sm"
									className="rounded-lg"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									maxLength={256}
									aria-invalid={field.state.meta.errors.length > 0}
								/>
							</div>
						)}
					</form.Field>

					<form.Field
						name="tagline"
						validators={{
							onSubmit: z.string().trim().max(256),
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<FieldLabel
									htmlFor="edit-company-tagline"
									error={field.state.meta.errors[0]}
								>
									Tagline
								</FieldLabel>
								<Input
									id="edit-company-tagline"
									size="sm"
									className="rounded-lg"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									maxLength={256}
									placeholder="Short description"
								/>
							</div>
						)}
					</form.Field>

					<form.Field
						name="description"
						validators={{
							onSubmit: z.string().max(2000),
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<FieldLabel
									htmlFor="edit-company-description"
									error={field.state.meta.errors[0]}
								>
									Description
								</FieldLabel>
								<textarea
									id="edit-company-description"
									value={field.state.value}
									onChange={(e) =>
										field.handleChange(e.target.value.slice(0, 2000))
									}
									onBlur={field.handleBlur}
									rows={4}
									className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors resize-y dark:bg-input/30"
								/>
								<p className="text-xs text-muted-foreground text-right tabular-nums">
									{field.state.value.length}/2,000
								</p>
							</div>
						)}
					</form.Field>

					<form.Field
						name="website"
						validators={{
							onSubmit: z.union([z.literal(""), z.url()]),
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<FieldLabel
									htmlFor="edit-company-website"
									error={field.state.meta.errors[0]}
								>
									Website
								</FieldLabel>
								<Input
									id="edit-company-website"
									size="sm"
									className="rounded-lg"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="https://example.com"
									aria-invalid={field.state.meta.errors.length > 0}
								/>
							</div>
						)}
					</form.Field>

					<form.Field
						name="headquarters"
						validators={{
							onSubmit: z.string().trim().max(256),
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<FieldLabel
									htmlFor="edit-company-hq"
									error={field.state.meta.errors[0]}
								>
									Headquarters
								</FieldLabel>
								<Input
									id="edit-company-hq"
									size="sm"
									className="rounded-lg"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									maxLength={256}
									placeholder="San Francisco, CA"
								/>
							</div>
						)}
					</form.Field>

					<div className="grid grid-cols-2 gap-4">
						<form.Field
							name="industry"
							validators={{
								onSubmit: z.string().trim().max(128),
							}}
						>
							{(field) => (
								<div className="space-y-2">
									<FieldLabel
										htmlFor="edit-company-industry"
										error={field.state.meta.errors[0]}
									>
										Industry
									</FieldLabel>
									<Input
										id="edit-company-industry"
										size="sm"
										className="rounded-lg"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										maxLength={128}
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="founded">
							{(field) => (
								<div className="space-y-2">
									<FieldLabel
										htmlFor="edit-company-founded"
										error={field.state.meta.errors[0]}
									>
										Founded
									</FieldLabel>
									<Input
										id="edit-company-founded"
										type="number"
										size="sm"
										className="rounded-lg"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										min={1800}
										max={2030}
										placeholder="2020"
									/>
								</div>
							)}
						</form.Field>
					</div>

					<form.Field name="size">
						{(field) => (
							<div className="space-y-2">
								<FieldLabel htmlFor="edit-company-size">
									Company size
								</FieldLabel>
								<NativeSelect
									id="edit-company-size"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
								>
									<NativeSelectOption value="">Select size</NativeSelectOption>
									{SIZE_OPTIONS.map((opt) => (
										<NativeSelectOption key={opt.value} value={opt.value}>
											{opt.label} employees
										</NativeSelectOption>
									))}
								</NativeSelect>
							</div>
						)}
					</form.Field>

					<form.Subscribe
						selector={(s) => [s.isSubmitting, s.canSubmit] as const}
					>
						{([isSubmitting, canSubmit]) => (
							<div className="flex items-center justify-end gap-2 pt-2">
								<Button
									variant="ghost"
									size="sm"
									type="button"
									onClick={() => onOpenChange(false)}
								>
									Cancel
								</Button>
								<Button
									variant="default"
									size="sm"
									type="submit"
									disabled={isSubmitting || !canSubmit}
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
