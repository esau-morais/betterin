import {
	ArrowLeftIcon,
	CheckCircleIcon,
	SealCheckIcon,
} from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { FieldLabel } from "#/components/ui/label";
import {
	NativeSelect,
	NativeSelectOption,
} from "#/components/ui/native-select";
import {
	checkCompanySlugFn,
	createCompanyFn,
	sendWorkEmailOtpFn,
	verifyWorkEmailOtpFn,
} from "#/lib/server/companies";
import { companySlugSchema } from "#/lib/validation";

const SIZE_OPTIONS = [
	{ value: "1_10", label: "1–10 employees" },
	{ value: "11_50", label: "11–50 employees" },
	{ value: "51_200", label: "51–200 employees" },
	{ value: "201_500", label: "201–500 employees" },
	{ value: "501_1000", label: "501–1,000 employees" },
	{ value: "1000_plus", label: "1,000+ employees" },
] as const;

export const Route = createFileRoute("/_authed/business_/new")({
	component: CreateCompanyPage,
});

type CreatedCompany = Awaited<ReturnType<typeof createCompanyFn>>;

function CreateCompanyPage() {
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);
	const [createdCompany, setCreatedCompany] = useState<CreatedCompany | null>(
		null,
	);

	const form = useForm({
		defaultValues: {
			name: "",
			slug: "",
			domain: "",
			website: "",
			description: "",
			size: "",
			industry: "",
		},
		onSubmit: async ({ value }) => {
			setError(null);
			try {
				const company = await createCompanyFn({
					data: {
						name: value.name.trim(),
						slug: value.slug || undefined,
						domain: value.domain.trim() || undefined,
						website: value.website.trim() || undefined,
						description: value.description.trim() || undefined,
						size: value.size || undefined,
						industry: value.industry.trim() || undefined,
					},
				});
				if (company.requiresVerification) {
					setCreatedCompany(company);
				} else {
					navigate({
						to: "/company/$slug",
						params: { slug: company.slug },
					});
				}
			} catch (err: unknown) {
				setError(
					err instanceof Error ? err.message : "Failed to create company",
				);
			}
		},
	});

	if (createdCompany) {
		return (
			<div className="max-w-xl mx-auto py-6">
				<Link
					to="/business"
					className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors focus-ring rounded mb-6"
				>
					<ArrowLeftIcon className="size-4" />
					Back to Business
				</Link>

				<div className="bi-card">
					<div className="flex items-center gap-2 mb-4">
						<CheckCircleIcon
							className="size-5 text-emerald-500"
							weight="fill"
						/>
						<h1 className="text-lg font-medium text-foreground">
							{createdCompany.name} created!
						</h1>
					</div>

					<VerifyOwnershipStep company={createdCompany} />
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-xl mx-auto py-6">
			<Link
				to="/business"
				className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors focus-ring rounded mb-6"
			>
				<ArrowLeftIcon className="size-4" />
				Back to Business
			</Link>

			<div className="bi-card">
				<h1 className="text-lg font-medium text-foreground mb-1">
					Create a Company Page
				</h1>
				<p className="text-sm text-muted-foreground mb-6">
					Set up your company's presence. You can add a logo and cover photo
					after creating the page.
				</p>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
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
									htmlFor="company-name"
									error={field.state.meta.errors[0]}
								>
									Company Name
								</FieldLabel>
								<Input
									id="company-name"
									size="sm"
									className="rounded-lg"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="e.g. Acme Corp"
									maxLength={256}
									autoFocus
									aria-invalid={field.state.meta.errors.length > 0}
								/>
							</div>
						)}
					</form.Field>

					<form.Field
						name="slug"
						validators={{
							onSubmit: z.union([z.literal(""), companySlugSchema]),
							onChangeAsync: async ({ value }) => {
								if (!value) return undefined;
								const result = companySlugSchema.safeParse(value);
								if (!result.success) return result.error.issues[0]?.message;
								try {
									const check = await checkCompanySlugFn({
										data: { slug: value },
									});
									return check.available
										? undefined
										: "This slug is already taken";
								} catch {
									return "Could not check availability";
								}
							},
							onChangeAsyncDebounceMs: 400,
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<FieldLabel
									htmlFor="company-slug"
									error={field.state.meta.errors[0]}
								>
									Page URL
								</FieldLabel>
								<p className="text-xs text-muted-foreground">
									betterin.app/company/
								</p>
								<Input
									id="company-slug"
									size="sm"
									value={field.state.value}
									onChange={(e) =>
										field.handleChange(
											e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
										)
									}
									onBlur={field.handleBlur}
									placeholder="e.g. acme-corp"
									className="rounded-lg font-mono"
									maxLength={64}
									aria-invalid={field.state.meta.errors.length > 0}
								/>
								{!field.state.meta.errors.length && !field.state.value && (
									<p className="text-xs text-muted-foreground">
										Leave blank to auto-generate from company name.
									</p>
								)}
								{!field.state.meta.errors.length &&
									field.state.value &&
									!field.state.meta.isValidating && (
										<p className="text-xs text-salary">Available</p>
									)}
								{field.state.meta.isValidating && (
									<p className="text-xs text-muted-foreground">Checking…</p>
								)}
							</div>
						)}
					</form.Field>

					<form.Field
						name="domain"
						validators={{
							onSubmit: z.string().trim().max(256),
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<FieldLabel
									htmlFor="company-domain"
									error={field.state.meta.errors[0]}
								>
									Email Domain
								</FieldLabel>
								<Input
									id="company-domain"
									size="sm"
									className="rounded-lg"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="e.g. acme.com"
									maxLength={256}
								/>
								<p className="text-xs text-muted-foreground">
									Employees with this email domain can verify their affiliation.
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
									htmlFor="company-website"
									error={field.state.meta.errors[0]}
								>
									Website
								</FieldLabel>
								<Input
									id="company-website"
									size="sm"
									className="rounded-lg"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="https://acme.com"
									aria-invalid={field.state.meta.errors.length > 0}
								/>
							</div>
						)}
					</form.Field>

					<form.Field
						name="industry"
						validators={{
							onSubmit: z.string().trim().max(128),
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<FieldLabel
									htmlFor="company-industry"
									error={field.state.meta.errors[0]}
								>
									Industry
								</FieldLabel>
								<Input
									id="company-industry"
									size="sm"
									className="rounded-lg"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="e.g. Technology, Healthcare, Finance"
									maxLength={128}
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="size">
						{(field) => (
							<div className="space-y-2">
								<FieldLabel htmlFor="company-size">Company Size</FieldLabel>
								<NativeSelect
									id="company-size"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
								>
									<NativeSelectOption value="">Select size</NativeSelectOption>
									{SIZE_OPTIONS.map((o) => (
										<NativeSelectOption key={o.value} value={o.value}>
											{o.label}
										</NativeSelectOption>
									))}
								</NativeSelect>
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
									htmlFor="company-description"
									error={field.state.meta.errors[0]}
								>
									Description
								</FieldLabel>
								<textarea
									id="company-description"
									value={field.state.value}
									onChange={(e) =>
										field.handleChange(e.target.value.slice(0, 2000))
									}
									onBlur={field.handleBlur}
									placeholder="Tell people about your company..."
									rows={4}
									className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors resize-y dark:bg-input/30"
								/>
							</div>
						)}
					</form.Field>

					{error && (
						<p className="text-sm text-destructive" role="alert">
							{error}
						</p>
					)}

					<form.Subscribe
						selector={(s) => [s.isSubmitting, s.canSubmit] as const}
					>
						{([isSubmitting, canSubmit]) => (
							<div className="flex items-center justify-end gap-2 pt-2">
								<Button variant="ghost" size="sm" asChild>
									<Link to="/business">Cancel</Link>
								</Button>
								<Button
									type="submit"
									size="sm"
									disabled={isSubmitting || !canSubmit}
								>
									{isSubmitting ? "Creating…" : "Create Company Page"}
								</Button>
							</div>
						)}
					</form.Subscribe>
				</form>
			</div>
		</div>
	);
}

function VerifyOwnershipStep({ company }: { company: CreatedCompany }) {
	const navigate = useNavigate();
	const [workEmail, setWorkEmail] = useState("");
	const [otpSent, setOtpSent] = useState(false);
	const [verificationId, setVerificationId] = useState<string | null>(null);
	const [otp, setOtp] = useState("");
	const [verified, setVerified] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const goToPage = useCallback(() => {
		navigate({ to: "/company/$slug", params: { slug: company.slug } });
	}, [navigate, company.slug]);

	const handleSendOtp = useCallback(async () => {
		if (!workEmail.trim()) return;
		setLoading(true);
		setError(null);
		try {
			const result = await sendWorkEmailOtpFn({
				data: { companyId: company.id, email: workEmail.trim() },
			});
			setVerificationId(result.verificationId);
			setOtpSent(true);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Failed to send code");
		} finally {
			setLoading(false);
		}
	}, [workEmail, company.id]);

	const handleVerifyOtp = useCallback(async () => {
		if (!verificationId || !otp.trim()) return;
		setLoading(true);
		setError(null);
		try {
			await verifyWorkEmailOtpFn({
				data: { verificationId, otp: otp.trim() },
			});
			setVerified(true);
			setTimeout(goToPage, 1500);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Verification failed");
		} finally {
			setLoading(false);
		}
	}, [verificationId, otp, goToPage]);

	if (verified) {
		return (
			<div className="space-y-4">
				<div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm">
					<SealCheckIcon className="size-4 text-emerald-600" weight="fill" />
					<span className="text-emerald-700 dark:text-emerald-400">
						Company verified! Redirecting…
					</span>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">
				Verify ownership via your{" "}
				<span className="font-medium text-foreground">@{company.domain}</span>{" "}
				email to get the verified badge and build trust with visitors.
			</p>

			{!otpSent ? (
				<div className="flex items-center gap-2">
					<Input
						type="email"
						size="sm"
						className="rounded-lg flex-1"
						value={workEmail}
						onChange={(e) => setWorkEmail(e.target.value)}
						placeholder={`you@${company.domain}`}
					/>
					<Button
						variant="outline"
						onClick={handleSendOtp}
						disabled={loading || !workEmail.trim()}
						className="shrink-0"
					>
						{loading ? "Sending…" : "Send code"}
					</Button>
				</div>
			) : (
				<div className="space-y-2">
					<p className="text-sm text-muted-foreground">
						Enter the 6-digit code sent to{" "}
						<span className="font-medium text-foreground">{workEmail}</span>
					</p>
					<div className="flex items-center gap-2">
						<Input
							inputMode="numeric"
							maxLength={6}
							size="sm"
							className="rounded-lg w-32 text-center tracking-widest font-mono"
							value={otp}
							onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
							placeholder="000000"
						/>
						<Button
							variant="outline"
							onClick={handleVerifyOtp}
							disabled={loading || otp.length !== 6}
						>
							{loading ? "Verifying…" : "Verify"}
						</Button>
					</div>
				</div>
			)}

			{error && (
				<p className="text-sm text-destructive" role="alert">
					{error}
				</p>
			)}
		</div>
	);
}
