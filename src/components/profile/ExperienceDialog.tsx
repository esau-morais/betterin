import { SealCheckIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useCallback, useState } from "react";
import { z } from "zod";
import {
	CompanyAutocomplete,
	type CompanyOption,
} from "#/components/jobs/CompanyAutocomplete";
import type { ExperienceRole } from "#/components/profile/ExperienceItem";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from "#/components/ui/input-otp";
import { FieldLabel } from "#/components/ui/label";
import {
	NativeSelect,
	NativeSelectOption,
} from "#/components/ui/native-select";
import { MONTHS, PAST_YEARS, YEARS } from "#/lib/date-options";
import type { Experience } from "#/lib/db/schema";
import {
	requestVerificationFn,
	sendWorkEmailOtpFn,
	verifyDomainEmailFn,
	verifyWorkEmailOtpFn,
} from "#/lib/server/companies";
import {
	addExperienceFn,
	deleteExperienceFn,
	updateExperienceFn,
} from "#/lib/server/profile";

export type ExperienceItem = Omit<
	Experience,
	| "userId"
	| "ordering"
	| "verificationStatus"
	| "verificationMethod"
	| "verifiedAt"
	| "disputedAt"
	| "disputeReason"
>;

export function ExperienceDialog({
	open,
	onOpenChange,
	item,
	onSaved,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	item?: ExperienceItem | ExperienceRole | null;
	onSaved: () => void;
}) {
	const isEdit = !!item;
	const [error, setError] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [company, setCompany] = useState(item?.company ?? "");
	const [companyId, setCompanyId] = useState(item?.companyId ?? "");
	const [selectedCompany, setSelectedCompany] = useState<CompanyOption | null>(
		null,
	);
	const [verifying, setVerifying] = useState(false);
	const [verified, setVerified] = useState(false);
	const [current, setCurrent] = useState(item?.current ?? false);
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
	const [workEmail, setWorkEmail] = useState("");
	const [otpSent, setOtpSent] = useState(false);
	const [verificationId, setVerificationId] = useState<string | null>(null);
	const [otp, setOtp] = useState("");

	const form = useForm({
		defaultValues: {
			title: item?.title ?? "",
			location: item?.location ?? "",
			description: item?.description ?? "",
		},
		onSubmit: async ({ value }) => {
			if (!company.trim()) {
				setError("Company is required");
				return;
			}
			if (!startMonth || !startYear) {
				setError("Start date is required");
				return;
			}
			if (!current && endMonth && endYear) {
				const start = Number(startYear) * 12 + Number(startMonth);
				const end = Number(endYear) * 12 + Number(endMonth);
				if (end < start) {
					setError("End date must be after start date");
					return;
				}
			}
			setError(null);
			try {
				const payload = {
					title: value.title.trim(),
					company: company.trim(),
					companyId: companyId || undefined,
					location: value.location.trim() || undefined,
					startDate: new Date(
						Number(startYear),
						Number(startMonth) - 1,
					).toISOString(),
					endDate:
						current || !endMonth || !endYear
							? undefined
							: new Date(Number(endYear), Number(endMonth) - 1).toISOString(),
					current,
					description: value.description.trim() || undefined,
				};

				if (isEdit) {
					await updateExperienceFn({ data: { id: item.id, ...payload } });
				} else {
					await addExperienceFn({ data: payload });
				}
				onSaved();
			} catch (err: unknown) {
				setError(err instanceof Error ? err.message : "Failed to save");
			}
		},
	});

	const handleVerifyDomain = useCallback(async () => {
		if (!selectedCompany) return;
		setVerifying(true);
		setError(null);
		try {
			await verifyDomainEmailFn({
				data: { companyId: selectedCompany.id, experienceId: item?.id },
			});
			setVerified(true);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Verification failed");
		} finally {
			setVerifying(false);
		}
	}, [selectedCompany, item]);

	const handleSendOtp = useCallback(async () => {
		if (!selectedCompany || !workEmail.trim()) return;
		setVerifying(true);
		setError(null);
		try {
			const result = await sendWorkEmailOtpFn({
				data: {
					companyId: selectedCompany.id,
					email: workEmail.trim(),
					experienceId: item?.id,
				},
			});
			setVerificationId(result.verificationId);
			setOtpSent(true);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Failed to send code");
		} finally {
			setVerifying(false);
		}
	}, [selectedCompany, workEmail, item]);

	const handleVerifyOtp = useCallback(async () => {
		if (!verificationId || !otp.trim()) return;
		setVerifying(true);
		setError(null);
		try {
			await verifyWorkEmailOtpFn({ data: { verificationId, otp: otp.trim() } });
			setVerified(true);
			setOtpSent(false);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Verification failed");
		} finally {
			setVerifying(false);
		}
	}, [verificationId, otp]);

	const handleRequestVerification = useCallback(async () => {
		if (!item) return;
		setVerifying(true);
		setError(null);
		try {
			await requestVerificationFn({ data: { experienceId: item.id } });
			setVerified(true);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Request failed");
		} finally {
			setVerifying(false);
		}
	}, [item]);

	const handleDelete = useCallback(async () => {
		if (!item) return;
		setDeleting(true);
		setError(null);
		try {
			await deleteExperienceFn({ data: { id: item.id } });
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
						{isEdit ? "Edit experience" : "Add experience"}
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
									htmlFor="exp-title"
									error={error ?? field.state.meta.errors[0]}
									errorId="exp-error"
								>
									Title *
								</FieldLabel>
								<Input
									id="exp-title"
									size="sm"
									className="rounded-lg"
									autoComplete="organization-title"
									value={field.state.value}
									onChange={(e) => {
										field.handleChange(e.target.value);
										if (error) setError(null);
									}}
									onBlur={field.handleBlur}
									placeholder="e.g. Senior Software Engineer"
									aria-invalid={!!error || field.state.meta.errors.length > 0}
									aria-describedby={
										error || field.state.meta.errors.length > 0
											? "exp-error"
											: undefined
									}
								/>
							</div>
						)}
					</form.Field>

					<div className="space-y-2">
						<FieldLabel>Company *</FieldLabel>
						<CompanyAutocomplete
							value={company}
							onChange={(c) => {
								setCompany(c?.name ?? "");
								setCompanyId(c?.id ?? "");
								setSelectedCompany(c);
								setVerified(false);
								setOtpSent(false);
								setOtp("");
								setWorkEmail("");
							}}
						/>
					</div>

					{selectedCompany && !verified && selectedCompany.domain && (
						<div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm space-y-2.5">
							{!otpSent ? (
								<>
									<p className="text-muted-foreground">
										Verify your employment at{" "}
										<span className="font-medium text-foreground">
											{selectedCompany.name}
										</span>
									</p>
									<div className="flex items-center gap-2">
										<Input
											type="email"
											size="sm"
											className="rounded-lg flex-1"
											autoComplete="email"
											value={workEmail}
											onChange={(e) => setWorkEmail(e.target.value)}
											placeholder={`you@${selectedCompany.domain}`}
										/>
										<Button
											type="button"
											variant="outline"
											onClick={
												workEmail.trim() ? handleSendOtp : handleVerifyDomain
											}
											disabled={verifying}
											className="shrink-0"
										>
											{verifying ? "Sending…" : "Send code"}
										</Button>
									</div>
								</>
							) : (
								<>
									<p className="text-muted-foreground">
										Enter the 6-digit code sent to{" "}
										<span className="font-medium text-foreground">
											{workEmail}
										</span>
									</p>
									<div className="flex items-center gap-2">
										<InputOTP
											maxLength={6}
											pattern={REGEXP_ONLY_DIGITS}
											value={otp}
											onChange={setOtp}
											onComplete={handleVerifyOtp}
											inputMode="numeric"
											autoComplete="one-time-code"
											disabled={verifying}
										>
											<InputOTPGroup>
												<InputOTPSlot index={0} />
												<InputOTPSlot index={1} />
												<InputOTPSlot index={2} />
												<InputOTPSlot index={3} />
												<InputOTPSlot index={4} />
												<InputOTPSlot index={5} />
											</InputOTPGroup>
										</InputOTP>
										<Button
											type="button"
											variant="outline"
											onClick={handleVerifyOtp}
											disabled={verifying || otp.length !== 6}
										>
											{verifying ? "Verifying…" : "Verify"}
										</Button>
									</div>
								</>
							)}
						</div>
					)}

					{selectedCompany &&
						!verified &&
						!selectedCompany.domain &&
						isEdit && (
							<div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm">
								<div className="flex items-center justify-between gap-2">
									<span className="text-muted-foreground">
										Request verification for{" "}
										<span className="font-medium text-foreground">
											{selectedCompany.name}
										</span>
									</span>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={handleRequestVerification}
										disabled={verifying}
									>
										{verifying ? "Requesting…" : "Request verification"}
									</Button>
								</div>
							</div>
						)}

					{verified && (
						<div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
							<SealCheckIcon
								className="size-4 text-emerald-600"
								weight="fill"
							/>
							<span className="text-emerald-700 dark:text-emerald-400">
								Employment verified
							</span>
						</div>
					)}

					<form.Field name="location">
						{(field) => (
							<div className="space-y-2">
								<FieldLabel htmlFor="exp-location">Location</FieldLabel>
								<Input
									id="exp-location"
									size="sm"
									className="rounded-lg"
									autoComplete="address-level2"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="e.g. San Francisco, CA"
								/>
							</div>
						)}
					</form.Field>

					<div className="flex items-center gap-3">
						<Checkbox
							id="exp-current"
							checked={current}
							onCheckedChange={(checked) => {
								const val = checked === true;
								setCurrent(val);
								if (val) {
									setEndMonth("");
									setEndYear("");
								}
							}}
						/>
						<label
							htmlFor="exp-current"
							className="text-sm font-medium text-foreground cursor-pointer select-none"
						>
							I currently work here
						</label>
					</div>

					<div className="space-y-2">
						<FieldLabel>Start date *</FieldLabel>
						<div className="flex gap-3">
							<NativeSelect
								id="exp-start-month"
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
								id="exp-start-year"
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
						<FieldLabel>End date</FieldLabel>
						<div className="flex gap-3">
							<NativeSelect
								id="exp-end-month"
								value={endMonth}
								onChange={(e) => setEndMonth(e.target.value)}
								disabled={current}
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
								id="exp-end-year"
								value={endYear}
								onChange={(e) => setEndYear(e.target.value)}
								disabled={current}
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
								<FieldLabel htmlFor="exp-description">Description</FieldLabel>
								<textarea
									id="exp-description"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									rows={4}
									placeholder="What did you do in this role?"
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
										{deleting ? "Deleting…" : "Delete experience"}
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
