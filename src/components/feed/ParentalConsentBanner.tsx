import {
	EnvelopeIcon,
	ShieldCheckIcon,
	SpinnerGapIcon,
} from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { FieldLabel } from "#/components/ui/label";
import { initiateParentConsentFn } from "#/lib/server/kws-actions";

export function ParentalConsentBanner() {
	const [sent, setSent] = useState(false);
	const [sentEmail, setSentEmail] = useState("");
	const [error, setError] = useState<string | null>(null);

	const form = useForm({
		defaultValues: { parentEmail: "" },
		onSubmit: async ({ value }) => {
			setError(null);
			try {
				await initiateParentConsentFn({
					data: { parentEmail: value.parentEmail.trim() },
				});
				setSentEmail(value.parentEmail.trim());
				setSent(true);
			} catch (err: unknown) {
				setError(err instanceof Error ? err.message : "Something went wrong");
			}
		},
	});

	return (
		<div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
			<div className="flex items-start gap-3">
				<ShieldCheckIcon
					weight="duotone"
					className="size-5 shrink-0 text-primary mt-0.5"
				/>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-medium text-foreground">
						Parental verification needed
					</p>
					<p className="mt-0.5 text-xs text-muted-foreground">
						Your account is active with some features restricted. Ask a parent
						or guardian to verify your account to unlock full access.
					</p>
				</div>
			</div>

			{sent ? (
				<div className="flex items-center gap-2 pl-8">
					<EnvelopeIcon className="size-4 text-primary" />
					<p className="text-xs text-muted-foreground">
						Verification email sent to{" "}
						<span className="font-medium text-foreground">{sentEmail}</span>.
						Ask your parent to check their inbox.
					</p>
				</div>
			) : (
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					noValidate
					className="space-y-3 pl-8"
				>
					<form.Field
						name="parentEmail"
						validators={{
							onSubmit: z
								.string()
								.trim()
								.min(1, "Enter your parent's email")
								.email("Enter a valid email"),
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<FieldLabel
									htmlFor="parentEmail"
									error={error ?? field.state.meta.errors[0]}
									errorId="parent-email-error"
								>
									Parent's email
								</FieldLabel>
								<div className="flex gap-2">
									<Input
										id="parentEmail"
										name="parentEmail"
										type="email"
										inputMode="email"
										size="sm"
										placeholder="parent@example.com"
										value={field.state.value}
										onChange={(e) => {
											field.handleChange(e.target.value);
											if (error) setError(null);
										}}
										onBlur={field.handleBlur}
										autoComplete="email"
										spellCheck={false}
										className="flex-1 text-sm"
										aria-invalid={!!error || field.state.meta.errors.length > 0}
										aria-describedby={
											error || field.state.meta.errors.length > 0
												? "parent-email-error"
												: undefined
										}
									/>
									<form.Subscribe selector={(s) => s.isSubmitting}>
										{(isSubmitting) => (
											<Button
												type="submit"
												disabled={isSubmitting}
												className="shrink-0"
											>
												{isSubmitting ? (
													<SpinnerGapIcon className="size-4 animate-spin" />
												) : (
													"Send"
												)}
											</Button>
										)}
									</form.Subscribe>
								</div>
							</div>
						)}
					</form.Field>
				</form>
			)}
		</div>
	);
}
