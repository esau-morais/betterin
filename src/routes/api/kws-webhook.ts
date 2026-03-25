import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "#/lib/db/index.server";
import { users } from "#/lib/db/schema";
import {
	parseExternalPayload,
	parseWebhookPayload,
	verifyWebhookSignature,
} from "#/lib/server/kws";

export const Route = createFileRoute("/api/kws-webhook")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const secret = process.env.KWS_WEBHOOK_SECRET;
				if (!secret) {
					return new Response("Webhook secret not configured", {
						status: 500,
					});
				}

				const rawBody = await request.text();
				const signature = request.headers.get("x-kws-signature");
				if (!signature || !verifyWebhookSignature(signature, rawBody, secret)) {
					return new Response("Invalid signature", { status: 401 });
				}

				const body = parseWebhookPayload(JSON.parse(rawBody));

				const { externalPayload, status } = body.payload;
				let parsed: ReturnType<typeof parseExternalPayload>;
				try {
					parsed = parseExternalPayload(externalPayload);
				} catch {
					return new Response("Invalid externalPayload", { status: 400 });
				}

				if (body.name === "parent-verified") {
					await db
						.update(users)
						.set({
							parentalConsentStatus: status.verified ? "verified" : "denied",
						})
						.where(eq(users.id, parsed.userId));
				} else if (
					body.name === "adult-verified" &&
					parsed.type === "identity" &&
					status.verified
				) {
					await db
						.update(users)
						.set({ identityVerifiedAt: new Date() })
						.where(eq(users.id, parsed.userId));
				}

				return new Response("OK", { status: 200 });
			},
		},
	},
});
