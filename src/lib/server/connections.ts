import { createServerFn } from "@tanstack/react-start";
import { and, eq, or, sql } from "drizzle-orm";
import { Effect } from "effect";
import { z } from "zod";
import { db } from "#/lib/db/index.server";
import { connections, conversationMembers } from "#/lib/db/schema";
import { ValidationError } from "#/lib/effect-helpers";
import { requireSessionEffect } from "#/lib/server/require-session";

export const blockUserFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ userId: z.string().min(1) }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const currentUserId = session.user.id;

				if (data.userId === currentUserId) {
					yield* Effect.fail(
						new ValidationError({ message: "Cannot block yourself" }),
					);
				}

				const [existing] = yield* Effect.promise(() =>
					db
						.select({ id: connections.id })
						.from(connections)
						.where(
							or(
								and(
									eq(connections.requesterId, currentUserId),
									eq(connections.addresseeId, data.userId),
								),
								and(
									eq(connections.requesterId, data.userId),
									eq(connections.addresseeId, currentUserId),
								),
							),
						)
						.limit(1),
				);

				if (existing) {
					yield* Effect.promise(() =>
						db
							.update(connections)
							.set({ status: "blocked" })
							.where(eq(connections.id, existing.id)),
					);
				} else {
					yield* Effect.promise(() =>
						db.insert(connections).values({
							requesterId: currentUserId,
							addresseeId: data.userId,
							status: "blocked",
						}),
					);
				}

				const sharedConvIds = yield* Effect.promise(() =>
					db
						.select({
							conversationId: conversationMembers.conversationId,
						})
						.from(conversationMembers)
						.where(eq(conversationMembers.userId, currentUserId))
						.then((myRows) => {
							const ids = myRows.map((r) => r.conversationId);
							if (ids.length === 0) return [];
							return db
								.select({
									conversationId: conversationMembers.conversationId,
								})
								.from(conversationMembers)
								.where(
									and(
										eq(conversationMembers.userId, data.userId),
										sql`${conversationMembers.conversationId} IN ${ids}`,
									),
								);
						})
						.then((rows) => rows.map((r) => r.conversationId)),
				);

				if (sharedConvIds.length > 0) {
					yield* Effect.promise(() =>
						db
							.update(conversationMembers)
							.set({ archivedAt: new Date(), leftAt: new Date() })
							.where(
								and(
									eq(conversationMembers.userId, currentUserId),
									sql`${conversationMembers.conversationId} IN ${sharedConvIds}`,
								),
							),
					);
				}

				return { success: true };
			}),
		),
	);
