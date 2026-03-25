import { LockKeyIcon, SealCheckIcon, XIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
	sendWorkEmailOtpFn,
	verifyWorkEmailOtpFn,
} from "#/lib/server/companies";
import type { CompanyData } from "./types";

export function CompanyVerifyBanner({ company }: { company: CompanyData }) {
	const queryClient = useQueryClient();
	const [dismissed, setDismissed] = useState(false);
	const [workEmail, setWorkEmail] = useState("");
	const [otpSent, setOtpSent] = useState(false);
	const [verificationId, setVerificationId] = useState<string | null>(null);
	const [otp, setOtp] = useState("");
	const [verified, setVerified] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	if (dismissed || verified) return null;

	const handleSendOtp = async () => {
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
	};

	const handleVerifyOtp = async () => {
		if (!verificationId || !otp.trim()) return;
		setLoading(true);
		setError(null);
		try {
			await verifyWorkEmailOtpFn({
				data: { verificationId, otp: otp.trim() },
			});
			setVerified(true);
			queryClient.invalidateQueries({ queryKey: ["company", company.slug] });
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Verification failed");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
			<div className="flex items-start justify-between gap-3">
				<div className="flex items-start gap-2.5">
					<LockKeyIcon
						className="size-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"
						weight="fill"
					/>
					<div>
						<p className="text-sm font-medium text-foreground">
							Verify your company page
						</p>
						<p className="text-sm text-muted-foreground mt-0.5">
							Confirm ownership via your @{company.domain} email to get the{" "}
							<SealCheckIcon
								className="inline size-3.5 text-emerald-500"
								weight="fill"
							/>{" "}
							verified badge.
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={() => setDismissed(true)}
					className="text-muted-foreground hover:text-foreground transition-colors focus-ring rounded p-0.5 shrink-0"
					aria-label="Dismiss"
				>
					<XIcon className="size-4" />
				</button>
			</div>

			{!otpSent ? (
				<div className="flex items-center gap-2 pl-7.5">
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
				<div className="space-y-2 pl-7.5">
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
				<p className="text-sm text-destructive pl-7.5" role="alert">
					{error}
				</p>
			)}
		</div>
	);
}
