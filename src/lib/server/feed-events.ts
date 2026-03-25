import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import { Effect } from "effect";
import { z } from "zod";
import { db } from "#/lib/db/index.server";
import {
	feedEvents,
	feedImpressions,
	hiddenPosts,
	mutedAuthors,
	profiles,
	savedPosts,
	users,
} from "#/lib/db/schema";
import { requireSessionEffect } from "#/lib/server/require-session";
import {
	dwellBucketSchema,
	feedActionSchema,
	feedModeSchema,
	rankingStageSchema,
} from "#/lib/validation";
import { updateRealTimeMetrics } from "./ml-realtime-hook";

export const logFeedEventFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			postId: z.string().min(1),
			action: feedActionSchema,
			dwellBucket: dwellBucketSchema.optional(),
			sessionId: z.string().optional(),
			feedPosition: z.number().int().optional(),
			feedMode: feedModeSchema.optional(),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				yield* Effect.promise(() =>
					db.insert(feedEvents).values({
						userId: session.user.id,
						postId: data.postId,
						action: data.action,
						dwellBucket: data.dwellBucket ?? null,
						sessionId: data.sessionId ?? null,
						feedPosition: data.feedPosition ?? null,
						feedMode: data.feedMode ?? null,
					}),
				);

				updateRealTimeMetrics(session.user.id, [
					{
						postId: data.postId,
						action: data.action,
						dwellBucket: data.dwellBucket,
					},
				]);

				return { success: true };
			}),
		),
	);

export const logFeedEventsBatchFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			events: z
				.array(
					z.object({
						postId: z.string().min(1),
						action: feedActionSchema,
						dwellBucket: dwellBucketSchema.optional(),
						sessionId: z.string().optional(),
						feedPosition: z.number().int().optional(),
						feedMode: feedModeSchema.optional(),
					}),
				)
				.min(1),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				yield* Effect.promise(() =>
					db.insert(feedEvents).values(
						data.events.map((e) => ({
							userId: session.user.id,
							postId: e.postId,
							action: e.action,
							dwellBucket: e.dwellBucket ?? null,
							sessionId: e.sessionId ?? null,
							feedPosition: e.feedPosition ?? null,
							feedMode: e.feedMode ?? null,
						})),
					),
				);

				updateRealTimeMetrics(
					session.user.id,
					data.events.map((e) => ({
						postId: e.postId,
						action: e.action,
						dwellBucket: e.dwellBucket,
					})),
				);

				return { success: true };
			}),
		),
	);

export const logFeedImpressionFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			sessionId: z.string().min(1),
			postIds: z.array(z.string().min(1)).min(1),
			rankingScores: z.array(z.number()).optional(),
			rankingStage: rankingStageSchema.optional(),
			sources: z
				.array(
					z.object({
						type: z.string().min(1),
						actorId: z.string().optional(),
						action: z.string().optional(),
					}),
				)
				.optional(),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				yield* Effect.promise(() =>
					db.insert(feedImpressions).values({
						userId: session.user.id,
						sessionId: data.sessionId,
						postIds: data.postIds,
						rankingScores: data.rankingScores ?? null,
						rankingStage: data.rankingStage ?? "rule_v1",
					}),
				);

				return { success: true };
			}),
		),
	);

export const hidePostFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ postId: z.string().min(1) }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				yield* Effect.promise(() =>
					db
						.insert(hiddenPosts)
						.values({ userId: session.user.id, postId: data.postId })
						.onConflictDoNothing(),
				);

				yield* Effect.promise(() =>
					db.insert(feedEvents).values({
						userId: session.user.id,
						postId: data.postId,
						action: "hide",
					}),
				);

				updateRealTimeMetrics(session.user.id, [
					{ postId: data.postId, action: "hide" },
				]);

				return { success: true };
			}),
		),
	);

export const muteAuthorFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ authorId: z.string().min(1) }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				yield* Effect.promise(() =>
					db
						.insert(mutedAuthors)
						.values({ userId: session.user.id, mutedUserId: data.authorId })
						.onConflictDoNothing(),
				);

				return { success: true };
			}),
		),
	);

export const unmuteAuthorFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ authorId: z.string().min(1) }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				yield* Effect.promise(() =>
					db
						.delete(mutedAuthors)
						.where(
							and(
								eq(mutedAuthors.userId, session.user.id),
								eq(mutedAuthors.mutedUserId, data.authorId),
							),
						),
				);

				return { success: true };
			}),
		),
	);

export const toggleSavePostFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ postId: z.string().min(1) }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const [existing] = yield* Effect.promise(() =>
					db
						.select({ id: savedPosts.id })
						.from(savedPosts)
						.where(
							and(
								eq(savedPosts.userId, session.user.id),
								eq(savedPosts.postId, data.postId),
							),
						)
						.limit(1),
				);

				if (existing) {
					yield* Effect.promise(() =>
						db.delete(savedPosts).where(eq(savedPosts.id, existing.id)),
					);
					return { saved: false };
				}

				yield* Effect.promise(() =>
					db
						.insert(savedPosts)
						.values({ userId: session.user.id, postId: data.postId }),
				);

				yield* Effect.promise(() =>
					db.insert(feedEvents).values({
						userId: session.user.id,
						postId: data.postId,
						action: "save",
					}),
				);

				updateRealTimeMetrics(session.user.id, [
					{ postId: data.postId, action: "save" },
				]);

				return { saved: true };
			}),
		),
	);

export const markNotInterestedFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ postId: z.string().min(1) }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				yield* Effect.promise(() =>
					db
						.insert(hiddenPosts)
						.values({ userId: session.user.id, postId: data.postId })
						.onConflictDoNothing(),
				);

				yield* Effect.promise(() =>
					db.insert(feedEvents).values({
						userId: session.user.id,
						postId: data.postId,
						action: "not_interested",
					}),
				);

				updateRealTimeMetrics(session.user.id, [
					{ postId: data.postId, action: "not_interested" },
				]);

				return { success: true };
			}),
		),
	);

export const listMutedAuthorsFn = createServerFn({ method: "GET" }).handler(
	() =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const rows = yield* Effect.promise(() =>
					db
						.select({
							id: users.id,
							name: users.name,
							image: users.image,
							headline: profiles.headline,
						})
						.from(mutedAuthors)
						.innerJoin(users, eq(mutedAuthors.mutedUserId, users.id))
						.leftJoin(profiles, eq(users.id, profiles.userId))
						.where(eq(mutedAuthors.userId, session.user.id))
						.orderBy(desc(mutedAuthors.createdAt)),
				);

				return rows;
			}),
		),
);
