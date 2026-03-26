import {
	CheckCircleIcon,
	EyeIcon,
	EyeSlashIcon,
	IdentificationBadgeIcon,
	KeyIcon,
	LinkIcon,
	LockIcon,
	SealCheckIcon,
	SpinnerGapIcon,
} from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type React from "react";
import { useCallback, useState } from "react";
import { z } from "zod";
import { GitHubIcon, GoogleIcon } from "#/components/shared/BrandIcons";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { FieldLabel } from "#/components/ui/label";
import { signIn } from "#/lib/auth-client";
import {
	accountPasswordQueryOptions,
	accountProvidersQueryOptions,
} from "#/lib/queries";
import { changePasswordFn, setPasswordFn } from "#/lib/server/account";
import { initiateIdentityVerificationFn } from "#/lib/server/kws-actions";

export const Route = createFileRoute("/_authed/settings/account")({
	loader: ({ context: { queryClient } }) =>
		Promise.all([
			queryClient.ensureQueryData(accountPasswordQueryOptions()),
			queryClient.ensureQueryData(accountProvidersQueryOptions()),
		]),
	component: AccountPage,
});

function AccountPage() {
	const { data: passwordStatus } = useSuspenseQuery(
		accountPasswordQueryOptions(),
	);
	const { data: providers } = useSuspenseQuery(accountProvidersQueryOptions());
	const { session } = Route.useRouteContext();

	return (
		<div className="max-w-xl space-y-6">
			<h2 className="text-lg font-semibold tracking-tight">Account</h2>

			<div className="rounded-xl border border-border bg-card divide-y divide-border">
				<div className="p-5">
					<div className="space-y-1">
						<p className="text-sm font-medium text-foreground">Email</p>
						<p className="text-sm text-muted-foreground">
							{session?.user.email ?? "\u2014"}
						</p>
					</div>
				</div>
				<div className="p-5">
					<PasswordSection hasPassword={passwordStatus.hasPassword} />
				</div>
				<div className="p-5">
					<ConnectedAccountsSection providers={providers} />
				</div>
			</div>

			<IdentityVerificationSection />
		</div>
	);
}

function PasswordSection({ hasPassword }: { hasPassword: boolean }) {
	const [editing, setEditing] = useState(false);
	const [success, setSuccess] = useState(false);
	const [localHasPassword, setLocalHasPassword] = useState(hasPassword);

	const handleSuccess = useCallback(() => {
		setEditing(false);
		setSuccess(true);
		setLocalHasPassword(true);
		const timer = setTimeout(() => setSuccess(false), 3000);
		return () => clearTimeout(timer);
	}, []);

	if (!editing) {
		return (
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<p className="text-sm font-medium text-foreground">Password</p>
						<p className="text-sm text-muted-foreground">
							{localHasPassword ? "Password is set." : "No password set."}
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							setEditing(true);
							setSuccess(false);
						}}
					>
						{localHasPassword ? "Change" : "Set a password"}
					</Button>
				</div>
				{success && (
					<div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
						<CheckCircleIcon weight="fill" className="size-4" />
						Password saved.
					</div>
				)}
				{!localHasPassword && (
					<p className="text-xs text-muted-foreground">
						Optional. You can always sign in with a code.
					</p>
				)}
			</div>
		);
	}

	return localHasPassword ? (
		<ChangePasswordForm
			onCancel={() => setEditing(false)}
			onSuccess={handleSuccess}
		/>
	) : (
		<SetPasswordForm
			onCancel={() => setEditing(false)}
			onSuccess={handleSuccess}
		/>
	);
}

function SetPasswordForm({
	onCancel,
	onSuccess,
}: {
	onCancel: () => void;
	onSuccess: () => void;
}) {
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const form = useForm({
		defaultValues: { newPassword: "", confirmPassword: "" },
		onSubmit: async ({ value }) => {
			setError(null);
			try {
				await setPasswordFn({ data: { newPassword: value.newPassword } });
				onSuccess();
			} catch (err: unknown) {
				setError(err instanceof Error ? err.message : "Something went wrong.");
			}
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			className="space-y-4"
		>
			<p className="text-sm font-medium text-foreground">Set a password</p>

			<form.Field
				name="newPassword"
				validators={{
					onSubmit: z.string().min(8, "At least 8 characters"),
				}}
			>
				{(field) => {
					const displayError = error ?? field.state.meta.errors[0];
					return (
						<div className="space-y-2">
							<FieldLabel htmlFor="new-password" error={displayError}>
								New password
							</FieldLabel>
							<div className="relative">
								<Input
									id="new-password"
									name="new-password"
									aria-invalid={!!displayError}
									type={showPassword ? "text" : "password"}
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									autoComplete="new-password"
									autoFocus
									minLength={8}
									maxLength={128}
									size="sm"
									className="pr-10"
									aria-describedby="password-hint"
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
									aria-label={showPassword ? "Hide password" : "Show password"}
								>
									{showPassword ? (
										<EyeSlashIcon className="size-4" />
									) : (
										<EyeIcon className="size-4" />
									)}
								</button>
							</div>
						</div>
					);
				}}
			</form.Field>

			<form.Field
				name="confirmPassword"
				validators={{
					onSubmit: z.string().min(1, "Confirm your new password"),
					onChange: ({ value, fieldApi }) => {
						const newPassword = fieldApi.form.getFieldValue("newPassword");
						if (value && newPassword && value !== newPassword) {
							return "Passwords don't match";
						}
						return undefined;
					},
				}}
			>
				{(field) => {
					const confirmError = field.state.meta.errors[0];
					return (
						<div className="space-y-2">
							<FieldLabel htmlFor="confirm-password" error={confirmError}>
								Confirm password
							</FieldLabel>
							<Input
								id="confirm-password"
								name="confirm-password"
								type={showPassword ? "text" : "password"}
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								autoComplete="new-password"
								size="sm"
								aria-invalid={!!confirmError}
							/>
						</div>
					);
				}}
			</form.Field>

			<p id="password-hint" className="text-xs text-muted-foreground">
				At least 8 characters.
			</p>

			<form.Subscribe selector={(s) => [s.isSubmitting, s.canSubmit] as const}>
				{([isSubmitting, canSubmit]) => (
					<div className="flex items-center gap-2">
						<Button
							type="submit"
							variant="default"
							size="sm"
							disabled={!canSubmit}
						>
							{isSubmitting ? (
								<>
									<SpinnerGapIcon className="size-4 animate-spin" />
									Saving&hellip;
								</>
							) : (
								<>
									<KeyIcon className="size-4" />
									Save password
								</>
							)}
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={onCancel}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
					</div>
				)}
			</form.Subscribe>
		</form>
	);
}

function ChangePasswordForm({
	onCancel,
	onSuccess,
}: {
	onCancel: () => void;
	onSuccess: () => void;
}) {
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const form = useForm({
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		},
		onSubmit: async ({ value }) => {
			setError(null);
			try {
				await changePasswordFn({
					data: {
						currentPassword: value.currentPassword,
						newPassword: value.newPassword,
					},
				});
				onSuccess();
			} catch (err: unknown) {
				setError(err instanceof Error ? err.message : "Something went wrong.");
			}
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			className="space-y-4"
		>
			<FieldLabel error={error}>Change password</FieldLabel>

			<form.Field
				name="currentPassword"
				validators={{
					onSubmit: z.string().min(1, "Enter your current password"),
				}}
			>
				{(field) => (
					<div className="space-y-2">
						<FieldLabel
							htmlFor="current-password"
							error={field.state.meta.errors[0]}
						>
							Current password
						</FieldLabel>
						<Input
							id="current-password"
							name="current-password"
							type={showPassword ? "text" : "password"}
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							autoComplete="current-password"
							autoFocus
							size="sm"
						/>
					</div>
				)}
			</form.Field>

			<form.Field
				name="newPassword"
				validators={{
					onSubmit: z.string().min(8, "At least 8 characters"),
				}}
			>
				{(field) => (
					<div className="space-y-2">
						<FieldLabel
							htmlFor="new-password-change"
							error={field.state.meta.errors[0]}
						>
							New password
						</FieldLabel>
						<div className="relative">
							<Input
								id="new-password-change"
								name="new-password"
								type={showPassword ? "text" : "password"}
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								autoComplete="new-password"
								minLength={8}
								maxLength={128}
								size="sm"
								className="pr-10"
								aria-describedby="change-password-hint"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
								aria-label={showPassword ? "Hide password" : "Show password"}
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

			<form.Field
				name="confirmPassword"
				validators={{
					onSubmit: z.string().min(1, "Confirm your new password"),
					onChange: ({ value, fieldApi }) => {
						const newPassword = fieldApi.form.getFieldValue("newPassword");
						if (value && newPassword && value !== newPassword) {
							return "Passwords don't match";
						}
						return undefined;
					},
				}}
			>
				{(field) => (
					<div className="space-y-2">
						<FieldLabel
							htmlFor="confirm-password-change"
							error={field.state.meta.errors[0]}
						>
							Confirm new password
						</FieldLabel>
						<Input
							id="confirm-password-change"
							name="confirm-password"
							type={showPassword ? "text" : "password"}
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							autoComplete="new-password"
							size="sm"
							aria-invalid={field.state.meta.errors.length > 0}
						/>
					</div>
				)}
			</form.Field>

			<p id="change-password-hint" className="text-xs text-muted-foreground">
				At least 8 characters.
			</p>

			<form.Subscribe
				selector={(s) =>
					[
						s.isSubmitting,
						s.values.currentPassword,
						s.values.newPassword,
						s.values.confirmPassword,
					] as const
				}
			>
				{([isSubmitting, currentPassword, newPassword, confirmPassword]) => {
					const canSubmit =
						currentPassword.length > 0 &&
						newPassword.length >= 8 &&
						confirmPassword === newPassword &&
						!isSubmitting;
					return (
						<div className="flex items-center gap-2">
							<Button
								type="submit"
								variant="default"
								size="sm"
								disabled={!canSubmit}
							>
								{isSubmitting ? (
									<>
										<SpinnerGapIcon className="size-4 animate-spin" />
										Saving&hellip;
									</>
								) : (
									<>
										<LockIcon className="size-4" />
										Save password
									</>
								)}
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={onCancel}
								disabled={isSubmitting}
							>
								Cancel
							</Button>
						</div>
					);
				}}
			</form.Subscribe>
		</form>
	);
}

function IdentityVerificationSection() {
	const { session } = Route.useRouteContext();
	const isVerified = !!session?.user?.identityVerifiedAt;

	const mutation = useMutation({
		mutationFn: () => initiateIdentityVerificationFn(),
		onSuccess: (data) => {
			window.location.href = data.verificationUrl;
		},
	});

	return (
		<div className="space-y-3">
			<h3 className="text-lg font-semibold tracking-tight">
				Identity verification
			</h3>
			<div className="rounded-xl border border-border bg-card p-5">
				{isVerified ? (
					<div className="flex items-center gap-3">
						<SealCheckIcon weight="fill" className="size-5 text-primary" />
						<div>
							<p className="text-sm font-medium text-foreground">
								Identity verified
							</p>
							<p className="text-xs text-muted-foreground">
								Your identity has been verified. A badge is shown on your
								profile.
							</p>
						</div>
					</div>
				) : (
					<div className="flex items-start gap-3">
						<IdentificationBadgeIcon className="size-5 shrink-0 text-muted-foreground mt-0.5" />
						<div className="flex-1 min-w-0 space-y-3">
							<div>
								<p className="text-sm font-medium text-foreground">
									Verify your identity
								</p>
								<p className="text-xs text-muted-foreground">
									Earn a verified badge on your profile. Verification is handled
									securely by a third-party provider — we never see your
									documents.
								</p>
							</div>
							<Button
								variant="outline"
								size="sm"
								disabled={mutation.isPending}
								onClick={() => mutation.mutate()}
							>
								{mutation.isPending ? (
									<>
										<SpinnerGapIcon className="size-4 animate-spin" />
										Verifying&hellip;
									</>
								) : (
									<>
										<SealCheckIcon className="size-4" />
										Verify identity
									</>
								)}
							</Button>
							{mutation.isError && (
								<p className="text-xs text-destructive">
									{mutation.error instanceof Error
										? mutation.error.message
										: "Something went wrong. Please try again."}
								</p>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

const providerMeta: Record<
	string,
	{ label: string; icon: React.ComponentType<{ className?: string }> }
> = {
	google: { label: "Google", icon: GoogleIcon },
	github: { label: "GitHub", icon: GitHubIcon },
};

const allSocialProviderIds = ["google", "github"] as const;

function ConnectedAccountsSection({
	providers,
}: {
	providers: { providerId: string; accountId: string }[];
}) {
	const connectMutation = useMutation({
		mutationFn: (providerId: "google" | "github") =>
			signIn.social({
				provider: providerId,
				callbackURL: "/settings/account",
			}),
	});
	const connectedMap = new Map(
		providers
			.filter(
				(p) => p.providerId !== "credential" && p.providerId !== "email-otp",
			)
			.map((p) => [p.providerId, p]),
	);

	return (
		<div className="space-y-3">
			<p className="text-sm font-medium text-foreground">Connected accounts</p>
			<div className="space-y-2">
				{allSocialProviderIds.map((id) => {
					const meta = providerMeta[id];
					const Icon = meta?.icon;
					const connected = connectedMap.get(id);

					return (
						<div key={id} className="flex items-center gap-3 text-sm">
							{Icon && <Icon className="size-5" />}
							<span className="text-foreground">{meta?.label ?? id}</span>
							{connected ? (
								<Button
									variant="outline"
									size="sm"
									className="ml-auto cursor-default opacity-60"
									disabled
									aria-label={`${meta?.label ?? id} connected`}
								>
									<CheckCircleIcon
										weight="fill"
										className="size-3.5 text-emerald-500"
									/>
									Connected
								</Button>
							) : (
								<Button
									variant="outline"
									size="sm"
									className="ml-auto"
									disabled={connectMutation.isPending}
									onClick={() => connectMutation.mutate(id)}
								>
									{connectMutation.isPending &&
									connectMutation.variables === id ? (
										<SpinnerGapIcon className="size-4 animate-spin" />
									) : (
										<LinkIcon className="size-4" />
									)}
									Connect
								</Button>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
