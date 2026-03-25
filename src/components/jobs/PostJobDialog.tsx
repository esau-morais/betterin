import { useForm } from "@tanstack/react-form";
import { useState } from "react";
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
import { Textarea } from "#/components/ui/textarea";
import { createJobFn } from "#/lib/server/jobs";
import { CompanyAutocomplete } from "./CompanyAutocomplete";

const REMOTE_OPTIONS = ["remote", "hybrid", "onsite"] as const;
type RemoteOption = (typeof REMOTE_OPTIONS)[number];

const EXPERIENCE_LEVELS = [
	{ value: "", label: "Not specified" },
	{ value: "internship", label: "Internship" },
	{ value: "entry", label: "Entry Level" },
	{ value: "mid", label: "Mid Level" },
	{ value: "senior", label: "Senior" },
	{ value: "lead", label: "Lead" },
	{ value: "executive", label: "Executive" },
] as const;

const JOB_TYPES = [
	{ value: "", label: "Not specified" },
	{ value: "full_time", label: "Full-Time" },
	{ value: "part_time", label: "Part-Time" },
	{ value: "contract", label: "Contract" },
	{ value: "freelance", label: "Freelance" },
	{ value: "internship", label: "Internship" },
] as const;

type PostJobDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onPosted: () => void;
};

export function PostJobDialog({
	open,
	onOpenChange,
	onPosted,
}: PostJobDialogProps) {
	const [company, setCompany] = useState("");
	const [companyId, setCompanyId] = useState<string | undefined>(undefined);
	const [error, setError] = useState<string | null>(null);

	const form = useForm({
		defaultValues: {
			title: "",
			location: "",
			remote: "onsite" as RemoteOption,
			salaryMin: "",
			salaryMax: "",
			currency: "USD",
			description: "",
			applyUrl: "",
			tagsInput: "",
			experienceLevel: "",
			jobType: "",
		},
		onSubmit: async ({ value }) => {
			if (!company.trim()) {
				setError("Company is required");
				return;
			}

			const minVal = Number(value.salaryMin);
			const maxVal = Number(value.salaryMax);
			if (maxVal < minVal) {
				setError("Maximum salary must be ≥ minimum");
				return;
			}

			setError(null);
			const tags = value.tagsInput
				.split(",")
				.map((t) => t.trim())
				.filter(Boolean);

			try {
				await createJobFn({
					data: {
						title: value.title.trim(),
						company: company.trim(),
						companyId,
						location: value.location.trim() || undefined,
						remote: value.remote,
						salaryMin: minVal,
						salaryMax: maxVal,
						currency: value.currency,
						description: value.description.trim(),
						tags,
						applyUrl: value.applyUrl.trim() || undefined,
						experienceLevel:
							(value.experienceLevel as (typeof EXPERIENCE_LEVELS)[number]["value"]) ||
							undefined,
						jobType:
							(value.jobType as (typeof JOB_TYPES)[number]["value"]) ||
							undefined,
					},
				});
				onPosted();
				form.reset();
				setCompany("");
				setCompanyId(undefined);
				setError(null);
			} catch (err: unknown) {
				setError(err instanceof Error ? err.message : "Failed to post job");
			}
		},
	});

	function handleOpenChange(next: boolean) {
		if (!next) {
			form.reset();
			setCompany("");
			setCompanyId(undefined);
			setError(null);
		}
		onOpenChange(next);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				className="sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
				showCloseButton
			>
				<DialogHeader>
					<DialogTitle>Post a Job</DialogTitle>
				</DialogHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="flex flex-1 flex-col overflow-hidden"
					noValidate
				>
					<div className="flex-1 overflow-y-auto space-y-4 py-2">
						<form.Field
							name="title"
							validators={{
								onSubmit: z.string().trim().min(1, "Title is required"),
							}}
						>
							{(field) => (
								<div className="space-y-2">
									<FieldLabel
										htmlFor="job-title"
										error={field.state.meta.errors[0]}
									>
										Job Title *
									</FieldLabel>
									<Input
										id="job-title"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="e.g. Senior Software Engineer"
										aria-invalid={field.state.meta.errors.length > 0}
									/>
								</div>
							)}
						</form.Field>

						<div className="space-y-2">
							<FieldLabel error={error && !company.trim() ? error : undefined}>
								Company *
							</FieldLabel>
							<CompanyAutocomplete
								value={company}
								onChange={(c) => {
									setCompany(c?.name ?? "");
									setCompanyId(c?.id);
								}}
							/>
						</div>

						<form.Field name="location">
							{(field) => (
								<div className="space-y-2">
									<FieldLabel htmlFor="job-location">Location</FieldLabel>
									<Input
										id="job-location"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="e.g. San Francisco, CA"
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="remote">
							{(field) => (
								<div className="space-y-2">
									<FieldLabel htmlFor="job-remote">Work Type</FieldLabel>
									<NativeSelect
										id="job-remote"
										value={field.state.value}
										onChange={(e) => {
											const v = e.target.value;
											if (v === "remote" || v === "hybrid" || v === "onsite")
												field.handleChange(v);
										}}
									>
										<NativeSelectOption value="onsite">
											On-site
										</NativeSelectOption>
										<NativeSelectOption value="hybrid">
											Hybrid
										</NativeSelectOption>
										<NativeSelectOption value="remote">
											Remote
										</NativeSelectOption>
									</NativeSelect>
								</div>
							)}
						</form.Field>

						<div className="flex gap-3">
							<form.Field name="jobType">
								{(field) => (
									<div className="flex-1 space-y-2">
										<FieldLabel htmlFor="job-type">Job Type</FieldLabel>
										<NativeSelect
											id="job-type"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
										>
											{JOB_TYPES.map((o) => (
												<NativeSelectOption key={o.value} value={o.value}>
													{o.label}
												</NativeSelectOption>
											))}
										</NativeSelect>
									</div>
								)}
							</form.Field>
							<form.Field name="experienceLevel">
								{(field) => (
									<div className="flex-1 space-y-2">
										<FieldLabel htmlFor="job-experience">
											Experience Level
										</FieldLabel>
										<NativeSelect
											id="job-experience"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
										>
											{EXPERIENCE_LEVELS.map((o) => (
												<NativeSelectOption key={o.value} value={o.value}>
													{o.label}
												</NativeSelectOption>
											))}
										</NativeSelect>
									</div>
								)}
							</form.Field>
						</div>

						<div className="flex gap-3">
							<form.Field
								name="salaryMin"
								validators={{
									onSubmit: z
										.string()
										.min(1, "Required")
										.refine((v) => !Number.isNaN(Number(v)), "Must be a number")
										.refine((v) => Number(v) >= 0, "Must be ≥ 0"),
								}}
							>
								{(field) => (
									<div className="flex-1 space-y-2">
										<FieldLabel
											htmlFor="job-salary-min"
											error={field.state.meta.errors[0]}
										>
											Min Salary *
										</FieldLabel>
										<Input
											id="job-salary-min"
											type="number"
											min="0"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											placeholder="e.g. 80000"
											aria-invalid={field.state.meta.errors.length > 0}
										/>
									</div>
								)}
							</form.Field>
							<form.Field
								name="salaryMax"
								validators={{
									onSubmit: z
										.string()
										.min(1, "Required")
										.refine((v) => !Number.isNaN(Number(v)), "Must be a number")
										.refine((v) => Number(v) >= 0, "Must be ≥ 0"),
								}}
							>
								{(field) => (
									<div className="flex-1 space-y-2">
										<FieldLabel
											htmlFor="job-salary-max"
											error={field.state.meta.errors[0]}
										>
											Max Salary *
										</FieldLabel>
										<Input
											id="job-salary-max"
											type="number"
											min="0"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											placeholder="e.g. 120000"
											aria-invalid={field.state.meta.errors.length > 0}
										/>
									</div>
								)}
							</form.Field>
							<form.Field name="currency">
								{(field) => (
									<div className="w-24 space-y-2">
										<FieldLabel htmlFor="job-currency">Currency</FieldLabel>
										<NativeSelect
											id="job-currency"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
										>
											<NativeSelectOption value="USD">USD</NativeSelectOption>
											<NativeSelectOption value="EUR">EUR</NativeSelectOption>
											<NativeSelectOption value="GBP">GBP</NativeSelectOption>
										</NativeSelect>
									</div>
								)}
							</form.Field>
						</div>

						<form.Field
							name="description"
							validators={{
								onSubmit: z.string().trim().min(1, "Description is required"),
							}}
						>
							{(field) => (
								<div className="space-y-2">
									<FieldLabel
										htmlFor="job-description"
										error={field.state.meta.errors[0]}
									>
										Description *
									</FieldLabel>
									<Textarea
										id="job-description"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										rows={5}
										placeholder="Describe the role, responsibilities, requirements..."
										className="resize-y"
										aria-invalid={field.state.meta.errors.length > 0}
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="tagsInput">
							{(field) => (
								<div className="space-y-2">
									<FieldLabel htmlFor="job-tags">
										Tags (comma-separated)
									</FieldLabel>
									<Input
										id="job-tags"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="e.g. React, TypeScript, Node.js"
									/>
								</div>
							)}
						</form.Field>

						<form.Field
							name="applyUrl"
							validators={{
								onSubmit: z.union([z.literal(""), z.url()]),
							}}
						>
							{(field) => (
								<div className="space-y-2">
									<FieldLabel
										htmlFor="job-apply-url"
										error={field.state.meta.errors[0]}
									>
										External Apply URL
									</FieldLabel>
									<Input
										id="job-apply-url"
										type="url"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="https://..."
										aria-invalid={field.state.meta.errors.length > 0}
									/>
									<p className="text-xs text-muted-foreground">
										Leave blank to use Easy Apply
									</p>
								</div>
							)}
						</form.Field>
					</div>

					<div className="shrink-0 border-t pt-3">
						{error && (
							<p className="mb-2 text-sm text-destructive" role="alert">
								{error}
							</p>
						)}
						<form.Subscribe
							selector={(s) => [s.isSubmitting, s.canSubmit] as const}
						>
							{([isSubmitting, canSubmit]) => (
								<div className="flex items-center gap-2 justify-end">
									<Button
										variant="ghost"
										size="sm"
										type="button"
										onClick={() => handleOpenChange(false)}
									>
										Cancel
									</Button>
									<Button
										variant="default"
										size="sm"
										type="submit"
										disabled={isSubmitting || !canSubmit}
									>
										{isSubmitting ? "Posting..." : "Post Job"}
									</Button>
								</div>
							)}
						</form.Subscribe>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
