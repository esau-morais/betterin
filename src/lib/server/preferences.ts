import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { z } from "zod";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db/index.server";
import { userPreferences, users } from "#/lib/db/schema";
import { ForbiddenError } from "#/lib/effect-helpers";
import { computeRestrictions } from "#/lib/restrictions";
import { requireSessionEffect } from "#/lib/server/require-session";
import { feedModeSchema } from "#/lib/validation";

export const getUserPreferencesFn = createServerFn({ method: "GET" }).handler(
	() =>
		Effect.runPromise(
			Effect.gen(function* () {
				const request = getRequest();
				const session = yield* Effect.promise(() =>
					auth.api.getSession({ headers: request.headers }),
				);
				if (!session) return null;

				const [prefs] = yield* Effect.promise(() =>
					db
						.select()
						.from(userPreferences)
						.where(eq(userPreferences.userId, session.user.id))
						.limit(1),
				);

				return prefs ?? null;
			}),
		),
);

export const dismissBannerFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ bannerId: z.string().trim().min(1) }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const [existing] = yield* Effect.promise(() =>
					db
						.select()
						.from(userPreferences)
						.where(eq(userPreferences.userId, session.user.id))
						.limit(1),
				);

				if (existing) {
					const dismissed = existing.dismissedBanners ?? [];
					if (!dismissed.includes(data.bannerId)) {
						yield* Effect.promise(() =>
							db
								.update(userPreferences)
								.set({
									dismissedBanners: [...dismissed, data.bannerId],
									updatedAt: new Date(),
								})
								.where(eq(userPreferences.userId, session.user.id)),
						);
					}
				} else {
					yield* Effect.promise(() =>
						db.insert(userPreferences).values({
							userId: session.user.id,
							dismissedBanners: [data.bannerId],
						}),
					);
				}

				return { success: true };
			}),
		),
	);

export const updateFeedModeFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ feedMode: feedModeSchema }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const [existing] = yield* Effect.promise(() =>
					db
						.select({ id: userPreferences.id })
						.from(userPreferences)
						.where(eq(userPreferences.userId, session.user.id))
						.limit(1),
				);

				if (existing) {
					yield* Effect.promise(() =>
						db
							.update(userPreferences)
							.set({ feedMode: data.feedMode, updatedAt: new Date() })
							.where(eq(userPreferences.userId, session.user.id)),
					);
				} else {
					yield* Effect.promise(() =>
						db.insert(userPreferences).values({
							userId: session.user.id,
							feedMode: data.feedMode,
						}),
					);
				}

				return { feedMode: data.feedMode };
			}),
		),
	);

export const updateShowImpressionCountFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ value: z.boolean() }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const [existing] = yield* Effect.promise(() =>
					db
						.select({ id: userPreferences.id })
						.from(userPreferences)
						.where(eq(userPreferences.userId, session.user.id))
						.limit(1),
				);

				if (existing) {
					yield* Effect.promise(() =>
						db
							.update(userPreferences)
							.set({ showImpressionCount: data.value, updatedAt: new Date() })
							.where(eq(userPreferences.userId, session.user.id)),
					);
				} else {
					yield* Effect.promise(() =>
						db.insert(userPreferences).values({
							userId: session.user.id,
							showImpressionCount: data.value,
						}),
					);
				}

				return { showImpressionCount: data.value };
			}),
		),
	);

export const updateShareLocationInAnalyticsFn = createServerFn({
	method: "POST",
})
	.inputValidator(z.object({ value: z.boolean() }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const [existing] = yield* Effect.promise(() =>
					db
						.select({ id: userPreferences.id })
						.from(userPreferences)
						.where(eq(userPreferences.userId, session.user.id))
						.limit(1),
				);

				if (existing) {
					yield* Effect.promise(() =>
						db
							.update(userPreferences)
							.set({
								shareLocationInAnalytics: data.value,
								updatedAt: new Date(),
							})
							.where(eq(userPreferences.userId, session.user.id)),
					);
				} else {
					yield* Effect.promise(() =>
						db.insert(userPreferences).values({
							userId: session.user.id,
							shareLocationInAnalytics: data.value,
						}),
					);
				}

				return {
					shareLocationInAnalytics: data.value,
				};
			}),
		),
	);

const AI_CONSENT_FIELDS = [
	"aiConsentFeedPersonalization",
	"aiConsentContentModeration",
	"aiConsentJobMatching",
] as const;

export const updateAiConsentFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			field: z.enum(AI_CONSENT_FIELDS),
			value: z.boolean(),
		}),
	)
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

				if (user) {
					const restrictions = computeRestrictions({
						dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth) : null,
						detectedRegion: user.detectedRegion,
						parentalConsentStatus: user.parentalConsentStatus,
					});
					if (restrictions.aiConsentLocked) {
						return yield* Effect.fail(
							new ForbiddenError({
								message:
									"AI features are not available for your account in this region",
							}),
						);
					}
				}

				const [existing] = yield* Effect.promise(() =>
					db
						.select({ id: userPreferences.id })
						.from(userPreferences)
						.where(eq(userPreferences.userId, session.user.id))
						.limit(1),
				);

				if (existing) {
					yield* Effect.promise(() =>
						db
							.update(userPreferences)
							.set({ [data.field]: data.value, updatedAt: new Date() })
							.where(eq(userPreferences.userId, session.user.id)),
					);
				} else {
					yield* Effect.promise(() =>
						db.insert(userPreferences).values({
							userId: session.user.id,
							[data.field]: data.value,
						}),
					);
				}

				return { [data.field]: data.value };
			}),
		),
	);

export const updateShowReadReceiptsFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ value: z.boolean() }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const [existing] = yield* Effect.promise(() =>
					db
						.select({ id: userPreferences.id })
						.from(userPreferences)
						.where(eq(userPreferences.userId, session.user.id))
						.limit(1),
				);

				if (existing) {
					yield* Effect.promise(() =>
						db
							.update(userPreferences)
							.set({ showReadReceipts: data.value, updatedAt: new Date() })
							.where(eq(userPreferences.userId, session.user.id)),
					);
				} else {
					yield* Effect.promise(() =>
						db.insert(userPreferences).values({
							userId: session.user.id,
							showReadReceipts: data.value,
						}),
					);
				}

				return { showReadReceipts: data.value };
			}),
		),
	);

const EMAIL_NOTIF_FIELDS = [
	"emailNotifConnectionRequests",
	"emailNotifComments",
	"emailNotifReactions",
	"emailNotifJobMatches",
	"emailNotifMessages",
	"emailNotifExperienceDisputed",
] as const;

const IN_APP_NOTIF_FIELDS = [
	"inAppNotifConnections",
	"inAppNotifComments",
	"inAppNotifReactions",
	"inAppNotifJobMatches",
	"inAppNotifMessages",
	"inAppNotifExperienceDisputed",
] as const;

export const updateEmailNotifFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			field: z.enum(EMAIL_NOTIF_FIELDS),
			value: z.boolean(),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const [existing] = yield* Effect.promise(() =>
					db
						.select({ id: userPreferences.id })
						.from(userPreferences)
						.where(eq(userPreferences.userId, session.user.id))
						.limit(1),
				);

				if (existing) {
					yield* Effect.promise(() =>
						db
							.update(userPreferences)
							.set({ [data.field]: data.value, updatedAt: new Date() })
							.where(eq(userPreferences.userId, session.user.id)),
					);
				} else {
					yield* Effect.promise(() =>
						db.insert(userPreferences).values({
							userId: session.user.id,
							[data.field]: data.value,
						}),
					);
				}

				return { [data.field]: data.value };
			}),
		),
	);

export const updateInAppNotifFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			field: z.enum(IN_APP_NOTIF_FIELDS),
			value: z.boolean(),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const [existing] = yield* Effect.promise(() =>
					db
						.select({ id: userPreferences.id })
						.from(userPreferences)
						.where(eq(userPreferences.userId, session.user.id))
						.limit(1),
				);

				if (existing) {
					yield* Effect.promise(() =>
						db
							.update(userPreferences)
							.set({ [data.field]: data.value, updatedAt: new Date() })
							.where(eq(userPreferences.userId, session.user.id)),
					);
				} else {
					yield* Effect.promise(() =>
						db.insert(userPreferences).values({
							userId: session.user.id,
							[data.field]: data.value,
						}),
					);
				}

				return { [data.field]: data.value };
			}),
		),
	);
