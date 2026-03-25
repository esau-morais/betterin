import {
	ArrowLeftIcon,
	EyeIcon,
	EyeSlashIcon,
	SpinnerGapIcon,
} from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
	GitHubIcon,
	GoogleIcon,
	LinkedInIcon,
} from "#/components/shared/BrandIcons";
import { Logo } from "#/components/shared/Logo";
import { MeshGradient } from "#/components/shared/MeshGradient";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from "#/components/ui/input-otp";
import { FieldLabel } from "#/components/ui/label";
import { signIn } from "#/lib/auth-client";
import { getOtpCooldownFn, sendOtpFn } from "#/lib/server/otp";

const stepSchema = z.enum(["email", "otp", "password"]);

const searchSchema = z.object({
	redirect: z.string().optional(),
	from: z.string().optional(),
	expired: z.boolean().optional(),
	step: stepSchema.optional(),
	email: z.string().optional(),
});

export const Route = createFileRoute("/sign-in")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({ step: search.step, email: search.email }),
	loader: async ({ deps: { step, email } }) => {
		if (step === "otp" && email) {
			return getOtpCooldownFn({ data: { email } });
		}
		return { cooldownUntil: 0 };
	},
	head: () => ({
		meta: [
			{ title: "Sign In | Better In" },
			{
				name: "description",
				content:
					"Sign in to Better In — a faster, privacy-first social network.",
			},
			{ name: "robots", content: "noindex" },
		],
	}),
	component: SignInPage,
});

export type SocialProvider = "google" | "github" | "linkedin";

function useCooldown(cooldownUntil: number) {
	const [remaining, setRemaining] = useState(() =>
		Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)),
	);
	const untilRef = useRef(cooldownUntil);

	function setCooldownUntil(ts: number) {
		untilRef.current = ts;
		setRemaining(Math.max(0, Math.ceil((ts - Date.now()) / 1000)));
	}

	useEffect(() => {
		if (remaining <= 0) return;
		const id = setInterval(() => {
			const secs = Math.max(
				0,
				Math.ceil((untilRef.current - Date.now()) / 1000),
			);
			setRemaining(secs);
			if (secs <= 0) clearInterval(id);
		}, 1000);
		return () => clearInterval(id);
	}, [remaining]);

	return { remaining, setCooldownUntil } as const;
}

function SignInPage() {
	const router = useRouter();
	const search = Route.useSearch();
	const step = search.step ?? "email";
	const email = search.email ?? "";
	const destination = search.redirect ?? "/feed";

	const { cooldownUntil } = Route.useLoaderData();
	const { remaining: resendCooldown, setCooldownUntil } =
		useCooldown(cooldownUntil);

	const liveRef = useRef<HTMLDivElement>(null);

	const announce = useCallback((msg: string) => {
		if (liveRef.current) liveRef.current.textContent = msg;
	}, []);

	const socialMutation = useMutation({
		mutationFn: (provider: SocialProvider) =>
			signIn.social({ provider, callbackURL: destination }),
	});

	function navigateStep(updates: {
		step?: z.infer<typeof stepSchema>;
		email?: string;
	}) {
		router.navigate({
			to: "/sign-in",
			search: (prev) => {
				const next = { ...prev, ...updates };
				if (next.step === "email") {
					const { step: _, email: __, ...rest } = next;
					return rest;
				}
				return next;
			},
			replace: true,
		});
	}

	return (
		<div className="relative flex min-h-dvh overflow-hidden bg-background">
			<MeshGradient />

			<div className="pointer-events-none relative z-10 hidden w-1/2 max-w-lg flex-col justify-between p-10 lg:flex *:pointer-events-auto">
				<div>
					<Logo className="text-lg font-bold tracking-tight text-foreground dark:text-white" />
				</div>
				<div>
					<p className="text-xl font-semibold tracking-tight text-foreground dark:text-white">
						A better place to connect.
					</p>
					<p className="mt-2 text-sm text-muted-foreground dark:text-white/60">
						No algorithm. No engagement bait. Just people.
					</p>
				</div>
			</div>

			<div className="pointer-events-none relative z-10 flex flex-1 items-center justify-center px-4 *:pointer-events-auto">
				<div className="w-full max-w-sm">
					<div
						ref={liveRef}
						aria-live="polite"
						aria-atomic="true"
						className="sr-only"
					/>

					{search.expired && step === "email" && (
						<output className="mb-6 block rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">
							Your session expired. Sign in to continue.
						</output>
					)}

					{step === "email" && (
						<EmailStep
							onSubmitSuccess={(submittedEmail, cooldownUntil) => {
								setCooldownUntil(cooldownUntil);
								navigateStep({ step: "otp", email: submittedEmail });
								announce(`Verification code sent to ${submittedEmail}`);
							}}
							onShowPassword={(submittedEmail) => {
								navigateStep({ step: "password", email: submittedEmail });
							}}
							onSocial={(provider) => socialMutation.mutate(provider)}
							socialPending={socialMutation.isPending}
						/>
					)}

					{step === "otp" && (
						<OtpStep
							email={email}
							resendCooldown={resendCooldown}
							onSubmitSuccess={() => {
								router.invalidate();
								router.navigate({ to: destination });
							}}
							onResend={async () => {
								if (resendCooldown > 0) return;
								try {
									const { cooldownUntil } = await sendOtpFn({
										data: { email: email.trim(), type: "sign-in" },
									});
									setCooldownUntil(cooldownUntil);
									announce("New code sent.");
								} catch (err: unknown) {
									announce(
										err instanceof Error ? err.message : "Couldn't resend code",
									);
								}
							}}
							onBack={() => {
								navigateStep({ step: "email", email: undefined });
							}}
						/>
					)}

					{step === "password" && (
						<PasswordStep
							email={email}
							onSubmitSuccess={() => {
								router.invalidate();
								router.navigate({ to: destination });
							}}
							onBack={() => {
								navigateStep({ step: "email", email: undefined });
							}}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

function EmailStep({
	onSubmitSuccess,
	onShowPassword,
	onSocial,
	socialPending,
}: {
	onSubmitSuccess: (email: string, cooldownUntil: number) => void;
	onShowPassword: (email: string) => void;
	onSocial: (provider: SocialProvider) => void;
	socialPending: boolean;
}) {
	const [error, setError] = useState<string | null>(null);

	const form = useForm({
		defaultValues: { email: "" },
		onSubmit: async ({ value }) => {
			const trimmed = value.email.trim();
			setError(null);

			try {
				const { cooldownUntil } = await sendOtpFn({
					data: { email: trimmed, type: "sign-in" },
				});
				onSubmitSuccess(trimmed, cooldownUntil);
			} catch (err: unknown) {
				setError(err instanceof Error ? err.message : "Couldn't send code");
			}
		},
	});

	return (
		<>
			<div className="mb-8 text-center lg:text-left">
				<h1 className="text-2xl font-semibold tracking-tight text-foreground lg:hidden">
					<Logo />
				</h1>
				<h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground lg:mt-0 lg:text-2xl">
					Welcome Back
				</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Sign in to your account
				</p>
			</div>

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
					name="email"
					validators={{
						onSubmit: z
							.string()
							.trim()
							.min(1, "Enter your email")
							.email("Enter a valid email"),
					}}
				>
					{(field) => (
						<div className="space-y-2">
							<FieldLabel
								htmlFor="email"
								error={error ?? field.state.meta.errors[0]}
								errorId="auth-error"
							>
								Email
							</FieldLabel>
							<Input
								id="email"
								name="email"
								type="email"
								inputMode="email"
								placeholder="name@example.com"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => {
									field.handleChange(e.target.value);
									if (error) setError(null);
								}}
								required
								autoComplete="email"
								spellCheck={false}
								autoFocus
								aria-invalid={!!error || field.state.meta.errors.length > 0}
								aria-describedby={
									error || field.state.meta.errors.length > 0
										? "auth-error"
										: undefined
								}
							/>
						</div>
					)}
				</form.Field>

				<form.Subscribe selector={(s) => s.isSubmitting}>
					{(isSubmitting) => (
						<Button
							type="submit"
							size="lg"
							shape="pill"
							className="w-full"
							disabled={isSubmitting || socialPending}
						>
							{isSubmitting ? (
								<>
									<SpinnerGapIcon className="size-4 animate-spin" />
									Sending code…
								</>
							) : (
								"Continue with Email"
							)}
						</Button>
					)}
				</form.Subscribe>
			</form>

			<div className="mt-4">
				<button
					type="button"
					onClick={() => {
						const emailValue = form.getFieldValue("email")?.trim();
						if (!emailValue) {
							setError("Enter your email first");
							return;
						}
						onShowPassword(emailValue);
					}}
					className="text-xs text-muted-foreground underline-offset-4 hover:underline focus-ring rounded"
				>
					Sign in with password instead
				</button>
			</div>

			<div className="my-6 flex items-center gap-3">
				<div className="h-px flex-1 bg-foreground/20 dark:bg-white/20" />
				<span className="text-xs text-muted-foreground">or continue with</span>
				<div className="h-px flex-1 bg-foreground/20 dark:bg-white/20" />
			</div>

			<div className="flex flex-col gap-3">
				<form.Subscribe selector={(s) => s.isSubmitting}>
					{(isSubmitting) => (
						<>
							<Button
								type="button"
								variant="outline"
								shape="pill"
								className="w-full"
								disabled={isSubmitting || socialPending}
								onClick={() => onSocial("google")}
							>
								<span className="flex size-5 shrink-0 items-center justify-center">
									<GoogleIcon />
								</span>
								<span className="flex-1 text-center">Continue with Google</span>
							</Button>
							<Button
								type="button"
								variant="outline"
								shape="pill"
								className="w-full"
								disabled={isSubmitting || socialPending}
								onClick={() => onSocial("github")}
							>
								<span className="flex size-5 shrink-0 items-center justify-center">
									<GitHubIcon />
								</span>
								<span className="flex-1 text-center">Continue with GitHub</span>
							</Button>
							<Button
								type="button"
								variant="outline"
								shape="pill"
								className="w-full"
								disabled={isSubmitting || socialPending}
								onClick={() => onSocial("linkedin")}
							>
								<span className="flex size-5 shrink-0 items-center justify-center">
									<LinkedInIcon />
								</span>
								<span className="flex-1 text-center">
									Continue with LinkedIn
								</span>
							</Button>
						</>
					)}
				</form.Subscribe>
			</div>

			<p className="mt-8 text-center text-xs text-muted-foreground">
				By continuing, you agree to our{" "}
				<Link
					to="/terms"
					className="underline underline-offset-4 hover:text-foreground"
				>
					Terms
				</Link>{" "}
				and{" "}
				<Link
					to="/privacy"
					className="underline underline-offset-4 hover:text-foreground"
				>
					Privacy Policy
				</Link>
				.
			</p>
		</>
	);
}

function OtpStep({
	email,
	resendCooldown,
	onSubmitSuccess,
	onResend,
	onBack,
}: {
	email: string;
	resendCooldown: number;
	onSubmitSuccess: () => void;
	onResend: () => void;
	onBack: () => void;
}) {
	const otpRef = useRef<HTMLInputElement>(null);
	const [error, setError] = useState<string | null>(null);

	const form = useForm({
		defaultValues: { otp: "" },
		onSubmit: async ({ value }) => {
			setError(null);

			const { error: otpError } = await signIn.emailOtp({
				email: email.trim(),
				otp: value.otp,
			});

			if (otpError) {
				setError(otpError.message ?? "Invalid code");
				form.setFieldValue("otp", "");
				return;
			}

			onSubmitSuccess();
		},
	});

	async function handleOtpComplete(value: string) {
		form.setFieldValue("otp", value);
		if (value.length === 6) {
			setError(null);

			const { error: otpError } = await signIn.emailOtp({
				email: email.trim(),
				otp: value,
			});

			if (otpError) {
				setError(otpError.message ?? "Invalid code");
				form.setFieldValue("otp", "");
				return;
			}

			onSubmitSuccess();
		}
	}

	useEffect(() => {
		requestAnimationFrame(() => otpRef.current?.focus());
	}, []);

	return (
		<>
			<div className="mb-8">
				<h2 className="text-xl font-semibold tracking-tight text-foreground lg:text-2xl">
					Check Your Email
				</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					We sent a 6-digit code to{" "}
					<span className="font-medium text-foreground">{email}</span>
				</p>
			</div>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-6"
			>
				<form.Field
					name="otp"
					validators={{
						onSubmit: z.string().length(6, "Enter the 6-digit code"),
					}}
				>
					{(field) => (
						<div className="space-y-2">
							<FieldLabel
								error={error ?? field.state.meta.errors[0]}
								errorId="otp-error"
							>
								Verification code
							</FieldLabel>
							<div>
								<form.Subscribe selector={(s) => s.isSubmitting}>
									{(isSubmitting) => (
										<InputOTP
											ref={otpRef}
											maxLength={6}
											pattern={REGEXP_ONLY_DIGITS}
											value={field.state.value}
											onChange={(v) => {
												field.handleChange(v);
												if (error) setError(null);
											}}
											onComplete={handleOtpComplete}
											autoComplete="one-time-code"
											inputMode="numeric"
											disabled={isSubmitting}
											aria-invalid={!!error}
										>
											<InputOTPGroup>
												<InputOTPSlot index={0} className="size-12 text-lg" />
												<InputOTPSlot index={1} className="size-12 text-lg" />
												<InputOTPSlot index={2} className="size-12 text-lg" />
												<InputOTPSlot index={3} className="size-12 text-lg" />
												<InputOTPSlot index={4} className="size-12 text-lg" />
												<InputOTPSlot index={5} className="size-12 text-lg" />
											</InputOTPGroup>
										</InputOTP>
									)}
								</form.Subscribe>
							</div>
						</div>
					)}
				</form.Field>

				<form.Subscribe
					selector={(s) => [s.isSubmitting, s.values.otp] as const}
				>
					{([isSubmitting, otp]) => (
						<Button
							type="submit"
							shape="pill"
							className="w-full"
							disabled={isSubmitting || otp.length < 6}
						>
							{isSubmitting ? (
								<>
									<SpinnerGapIcon className="size-4 animate-spin" />
									Verifying…
								</>
							) : (
								"Verify"
							)}
						</Button>
					)}
				</form.Subscribe>
			</form>

			<div className="mt-6 flex items-center justify-between text-sm">
				<button
					type="button"
					onClick={onBack}
					className="text-muted-foreground underline-offset-4 hover:underline hover:text-foreground transition-colors focus-ring rounded"
				>
					<ArrowLeftIcon className="inline size-3" /> Use a different email
				</button>
				<button
					type="button"
					onClick={onResend}
					disabled={resendCooldown > 0}
					className="text-muted-foreground underline-offset-4 hover:underline hover:text-foreground disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed transition-colors focus-ring rounded"
				>
					{resendCooldown > 0 ? (
						<>
							Resend in <span className="tabular-nums">{resendCooldown}s</span>
						</>
					) : (
						"Resend code"
					)}
				</button>
			</div>
		</>
	);
}

function PasswordStep({
	email,
	onSubmitSuccess,
	onBack,
}: {
	email: string;
	onSubmitSuccess: () => void;
	onBack: () => void;
}) {
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const form = useForm({
		defaultValues: { password: "" },
		onSubmit: async ({ value }) => {
			setError(null);

			const { error: authError } = await signIn.email({
				email: email.trim(),
				password: value.password,
			});

			if (authError) {
				setError(authError.message ?? "Wrong password");
				return;
			}

			onSubmitSuccess();
		},
	});

	return (
		<>
			<div className="mb-8 text-center lg:text-left">
				<h2 className="text-xl font-semibold tracking-tight text-foreground lg:text-2xl">
					Sign In with Password
				</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Signing in as{" "}
					<span className="font-medium text-foreground">{email}</span>
				</p>
			</div>

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
					name="password"
					validators={{
						onSubmit: z.string().min(1, "Enter your password"),
					}}
				>
					{(field) => (
						<div className="space-y-2">
							<FieldLabel
								htmlFor="password"
								error={error ?? field.state.meta.errors[0]}
								errorId="pw-error"
							>
								Password
							</FieldLabel>
							<div className="relative">
								<Input
									id="password"
									name="password"
									type={showPassword ? "text" : "password"}
									placeholder="Enter your password…"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => {
										field.handleChange(e.target.value);
										if (error) setError(null);
									}}
									required
									autoComplete="current-password"
									spellCheck={false}
									autoFocus
									className="pr-10"
									aria-invalid={!!error || field.state.meta.errors.length > 0}
									aria-describedby={
										error || field.state.meta.errors.length > 0
											? "pw-error"
											: undefined
									}
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
									aria-label={showPassword ? "Hide password" : "Show password"}
									tabIndex={-1}
								>
									{showPassword ? (
										<EyeSlashIcon className="size-4" />
									) : (
										<EyeIcon className="size-4" />
									)}
								</button>
							</div>
						</div>
					)}
				</form.Field>

				<form.Subscribe
					selector={(s) => [s.isSubmitting, s.canSubmit] as const}
				>
					{([isSubmitting, canSubmit]) => (
						<Button
							type="submit"
							shape="pill"
							className="w-full"
							disabled={isSubmitting || !canSubmit}
						>
							{isSubmitting ? (
								<>
									<SpinnerGapIcon className="size-4 animate-spin" />
									Signing in…
								</>
							) : (
								"Sign In"
							)}
						</Button>
					)}
				</form.Subscribe>
			</form>

			<div className="mt-6">
				<button
					type="button"
					onClick={onBack}
					className="text-sm text-muted-foreground underline-offset-4 hover:underline hover:text-foreground transition-colors focus-ring rounded"
				>
					<ArrowLeftIcon className="inline size-3" /> Back to email sign in
				</button>
			</div>
		</>
	);
}
