import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { z } from "zod";
import { db } from "#/lib/db/index.server";
import { users } from "#/lib/db/schema";
import { ForbiddenError } from "#/lib/effect-helpers";
import { computeRestrictions, type Region } from "#/lib/restrictions";
import { detectRawCountryCode } from "#/lib/server/geoip";
import {
	generateVerificationUrl,
	sendVerificationEmail,
} from "#/lib/server/kws";
import { requireSessionEffect } from "#/lib/server/require-session";

function regionToCountryCode(region: Region | string | null): string {
	switch (region) {
		case "BR":
		case "GB":
		case "US":
			return region;
		case "EU":
			return "DE";
		default:
			return "ZZ";
	}
}

export const initiateParentConsentFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ parentEmail: z.email() }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const [user] = yield* Effect.promise(() =>
					db
						.select({
							dateOfBirth: users.dateOfBirth,
							detectedRegion: users.detectedRegion,
							parentalConsentStatus: users.parentalConsentStatus,
						})
						.from(users)
						.where(eq(users.id, session.user.id))
						.limit(1),
				);

				if (!user) {
					return yield* Effect.fail(
						new ForbiddenError({ message: "User not found" }),
					);
				}

				const restrictions = computeRestrictions({
					dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth) : null,
					detectedRegion: user.detectedRegion,
					parentalConsentStatus: user.parentalConsentStatus,
				});

				if (!restrictions.requiresParentalLink) {
					return yield* Effect.fail(
						new ForbiddenError({
							message: "Parental consent is not required for this account",
						}),
					);
				}

				yield* sendVerificationEmail({
					email: data.parentEmail,
					location: regionToCountryCode(user.detectedRegion),
					externalPayload: JSON.stringify({ userId: session.user.id }),
				});

				yield* Effect.promise(() =>
					db
						.update(users)
						.set({ parentalConsentStatus: "pending" })
						.where(eq(users.id, session.user.id)),
				);

				return { sent: true };
			}),
		),
	);

export const initiateIdentityVerificationFn = createServerFn({
	method: "POST",
}).handler(() =>
	Effect.runPromise(
		Effect.gen(function* () {
			const session = yield* requireSessionEffect;

			const [user] = yield* Effect.promise(() =>
				db
					.select({ identityVerifiedAt: users.identityVerifiedAt })
					.from(users)
					.where(eq(users.id, session.user.id))
					.limit(1),
			);

			if (user?.identityVerifiedAt) {
				return yield* Effect.fail(
					new ForbiddenError({ message: "Identity is already verified" }),
				);
			}

			const request = getRequest();
			const countryCode = detectRawCountryCode(request);

			const result = yield* generateVerificationUrl({
				email: session.user.email,
				location: countryCode,
				language: "en",
				externalPayload: JSON.stringify({
					type: "identity",
					userId: session.user.id,
				}),
				userContext: "adult",
			});

			return { verificationUrl: result.verificationUrl };
		}),
	),
);
