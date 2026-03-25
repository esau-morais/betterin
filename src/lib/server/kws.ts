import { createHmac } from "node:crypto";
import { Effect, Schema } from "effect";

const KWS_AUTH_URL =
	"https://auth.kidswebservices.com/auth/realms/kws/protocol/openid-connect/token";
const KWS_API_BASE = "https://api.kidswebservices.com";

function parseKWSError(rawBody: string): string {
	try {
		const parsed = JSON.parse(rawBody) as {
			error?: { message?: string; code?: string };
		};
		const msg = parsed.error?.message ?? "";
		if (msg.includes("branding"))
			return "Verification service is being set up. Please try again later.";
		if (msg.includes("email")) return "Please enter a valid email address.";
		if (msg) return msg;
	} catch {}
	return "Could not send verification email. Please try again.";
}

let cachedToken: { value: string; expiresAt: number } | null = null;

const TokenResponseSchema = Schema.Struct({
	access_token: Schema.String,
	expires_in: Schema.Number,
});

const getAccessToken = Effect.gen(function* () {
	if (cachedToken && Date.now() < cachedToken.expiresAt) {
		return cachedToken.value;
	}

	const clientId = process.env.KWS_CLIENT_ID;
	const apiKey = process.env.KWS_API_KEY;
	if (!clientId || !apiKey)
		throw new Error("KWS_CLIENT_ID or KWS_API_KEY not set");

	const credentials = Buffer.from(`${clientId}:${apiKey}`).toString("base64");

	const res = yield* Effect.promise(() =>
		fetch(KWS_AUTH_URL, {
			method: "POST",
			headers: {
				Authorization: `Basic ${credentials}`,
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: "grant_type=client_credentials&scope=verification",
		}),
	);

	if (!res.ok) {
		return yield* Effect.fail(
			new Error(
				"Authentication with verification service failed. Please try again later.",
			),
		);
	}

	const raw = yield* Effect.promise(() => res.json());
	const data = Schema.decodeUnknownSync(TokenResponseSchema)(raw);

	cachedToken = {
		value: data.access_token,
		expiresAt: Date.now() + (data.expires_in - 60) * 1000,
	};

	return data.access_token;
});

export const sendVerificationEmail = (params: {
	email: string;
	location: string;
	externalPayload: string;
}) =>
	Effect.gen(function* () {
		const token = yield* getAccessToken;

		const res = yield* Effect.promise(() =>
			fetch(`${KWS_API_BASE}/v1/verifications/send-email`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: params.email,
					location: params.location,
					externalPayload: params.externalPayload,
				}),
			}),
		);

		if (!res.ok) {
			const body = yield* Effect.promise(() => res.text());
			return yield* Effect.fail(new Error(parseKWSError(body)));
		}

		return { sent: true };
	});

export const generateVerificationUrl = (params: {
	email: string;
	location: string;
	language?: string;
	externalPayload: string;
	userContext: "adult";
}) =>
	Effect.gen(function* () {
		const token = yield* getAccessToken;

		const res = yield* Effect.promise(() =>
			fetch(`${KWS_API_BASE}/v1/verifications/generate-verification-url`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: params.email,
					location: params.location,
					language: params.language ?? "en",
					externalPayload: params.externalPayload,
					userContext: params.userContext,
				}),
			}),
		);

		if (!res.ok) {
			const body = yield* Effect.promise(() => res.text());
			return yield* Effect.fail(new Error(parseKWSError(body)));
		}

		const data = (yield* Effect.promise(() => res.json())) as {
			verificationUrl: string;
		};
		return data;
	});

const WebhookPayloadSchema = Schema.Struct({
	name: Schema.String,
	time: Schema.String,
	orgId: Schema.String,
	productId: Schema.String,
	payload: Schema.Struct({
		parentEmail: Schema.String,
		externalPayload: Schema.String,
		status: Schema.Struct({
			verified: Schema.Boolean,
			transactionId: Schema.String,
		}),
	}),
});

export type KWSWebhookPayload = typeof WebhookPayloadSchema.Type;

export function verifyWebhookSignature(
	header: string,
	rawBody: string,
	secret: string,
): boolean {
	const parts = header.split(",");
	const timestampPart = parts.find((p) => p.startsWith("t="));
	const signatureParts = parts.filter((p) => p.startsWith("v1="));

	if (!timestampPart || signatureParts.length === 0) return false;

	const timestamp = timestampPart.slice(2);
	const expected = createHmac("sha256", secret)
		.update(`${timestamp}.${rawBody}`)
		.digest("hex");

	return signatureParts.some((p) => p.slice(3) === expected);
}

export function parseWebhookPayload(body: unknown): KWSWebhookPayload {
	return Schema.decodeUnknownSync(WebhookPayloadSchema)(body);
}

const ExternalPayloadSchema = Schema.Struct({
	type: Schema.optional(Schema.String),
	userId: Schema.String,
});

export type KWSExternalPayload = typeof ExternalPayloadSchema.Type;

export function parseExternalPayload(raw: string): KWSExternalPayload {
	return Schema.decodeUnknownSync(ExternalPayloadSchema)(JSON.parse(raw));
}

export function verifyRedirectSignature(
	status: string,
	payload: string,
	signature: string,
	secret: string,
): boolean {
	const expected = createHmac("sha256", secret)
		.update(`${status}:${payload}`)
		.digest("hex");
	return signature === expected;
}
