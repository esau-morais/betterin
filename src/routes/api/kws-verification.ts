import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "#/lib/db/index.server";
import { users } from "#/lib/db/schema";
import {
	parseExternalPayload,
	verifyRedirectSignature,
} from "#/lib/server/kws";

export const Route = createFileRoute("/api/kws-verification")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const secret = process.env.KWS_VERIFICATION_RESPONSE_SECRET;
				if (!secret) {
					return new Response("Verification response secret not configured", {
						status: 500,
					});
				}

				const url = new URL(request.url);
				const status = url.searchParams.get("status") ?? "";
				const externalPayload = url.searchParams.get("externalPayload") ?? "";
				const signature = url.searchParams.get("signature") ?? "";

				if (
					!verifyRedirectSignature(status, externalPayload, signature, secret)
				) {
					return new Response("Invalid signature", { status: 401 });
				}

				let parsedStatus: { verified: boolean; transactionId: string };
				let parsed: ReturnType<typeof parseExternalPayload>;
				try {
					parsedStatus = JSON.parse(status) as typeof parsedStatus;
					parsed = parseExternalPayload(externalPayload);
				} catch {
					return new Response("Invalid payload", { status: 400 });
				}

				let redirectUrl: string;

				if (parsed.type === "identity") {
					if (parsedStatus.verified) {
						await db
							.update(users)
							.set({ identityVerifiedAt: new Date() })
							.where(eq(users.id, parsed.userId));
					}
					redirectUrl = parsedStatus.verified
						? "/settings/account?identity-verified=true"
						: "/settings/account?identity-verified=false";
				} else {
					await db
						.update(users)
						.set({
							parentalConsentStatus: parsedStatus.verified
								? "verified"
								: "denied",
						})
						.where(eq(users.id, parsed.userId));
					redirectUrl = parsedStatus.verified
						? "/feed?verified=true"
						: "/feed?verified=false";
				}

				return new Response(null, {
					status: 302,
					headers: { Location: redirectUrl },
				});
			},
		},
	},
});
