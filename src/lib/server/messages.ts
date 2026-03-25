import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { Effect } from "effect";
import { z } from "zod";
import { db } from "#/lib/db/index.server";
import {
	conversationMembers,
	conversations,
	messages,
	moderationQueue,
	profiles,
	users,
} from "#/lib/db/schema";
import { ForbiddenError, ValidationError } from "#/lib/effect-helpers";
import { areConnected } from "#/lib/server/messages-helpers";
import { publish, userChannel } from "#/lib/server/pubsub";
import { requireSessionEffect } from "#/lib/server/require-session";

export interface ConversationListItem {
	id: string;
	type: "direct" | "group";
	name: string | null;
	createdAt: Date;
	lastMessage: {
		id: string;
		content: string;
		senderId: string;
		createdAt: Date;
	} | null;
	otherUser: {
		id: string;
		name: string;
		image: string | null;
		handle: string | null;
		headline: string | null;
	} | null;
	unreadCount: number;
}

export interface MessageItem {
	id: string;
	content: string;
	senderId: string;
	senderName: string;
	senderImage: string | null;
	createdAt: Date;
	isOwn: boolean;
}

export const listConversationsFn = createServerFn({ method: "GET" }).handler(
	() =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const userId = session.user.id;

				const myConversations = yield* Effect.promise(() =>
					db
						.select({
							conversationId: conversationMembers.conversationId,
							lastReadAt: conversationMembers.lastReadAt,
						})
						.from(conversationMembers)
						.where(
							and(
								eq(conversationMembers.userId, userId),
								isNull(conversationMembers.archivedAt),
								isNull(conversationMembers.leftAt),
							),
						),
				);

				if (myConversations.length === 0) return [] as ConversationListItem[];

				const convIds = myConversations.map((c) => c.conversationId);

				const convRows = yield* Effect.promise(() =>
					db
						.select({
							id: conversations.id,
							type: conversations.type,
							name: conversations.name,
							createdAt: conversations.createdAt,
						})
						.from(conversations)
						.where(sql`${conversations.id} IN ${convIds}`),
				);

				const otherMembers = yield* Effect.promise(() =>
					db
						.select({
							conversationId: conversationMembers.conversationId,
							userId: users.id,
							name: users.name,
							image: users.image,
							handle: profiles.handle,
							headline: profiles.headline,
						})
						.from(conversationMembers)
						.innerJoin(users, eq(conversationMembers.userId, users.id))
						.leftJoin(profiles, eq(users.id, profiles.userId))
						.where(
							and(
								sql`${conversationMembers.conversationId} IN ${convIds}`,
								sql`${conversationMembers.userId} != ${userId}`,
							),
						),
				);

				const otherMap = new Map(
					otherMembers.map((m) => [
						m.conversationId,
						{
							id: m.userId,
							name: m.name,
							image: m.image,
							handle: m.handle,
							headline: m.headline,
						},
					]),
				);

				const lastMsgRows = yield* Effect.promise(() =>
					db
						.select({
							id: messages.id,
							conversationId: messages.conversationId,
							content: messages.content,
							senderId: messages.senderId,
							createdAt: messages.createdAt,
						})
						.from(messages)
						.where(
							and(
								sql`${messages.conversationId} IN ${convIds}`,
								isNull(messages.deletedAt),
							),
						)
						.orderBy(desc(messages.createdAt)),
				);

				const lastMsgMap = new Map<
					string,
					{ id: string; content: string; senderId: string; createdAt: Date }
				>();
				for (const m of lastMsgRows) {
					if (!lastMsgMap.has(m.conversationId)) {
						lastMsgMap.set(m.conversationId, {
							id: m.id,
							content: m.content,
							senderId: m.senderId,
							createdAt: m.createdAt,
						});
					}
				}

				const unreadCountRows = yield* Effect.promise(() =>
					db
						.select({
							conversationId: messages.conversationId,
							count: sql<number>`count(*)::int`,
						})
						.from(messages)
						.innerJoin(
							conversationMembers,
							and(
								eq(conversationMembers.conversationId, messages.conversationId),
								eq(conversationMembers.userId, userId),
							),
						)
						.where(
							and(
								sql`${messages.conversationId} IN ${convIds}`,
								sql`${messages.senderId} != ${userId}`,
								isNull(messages.deletedAt),
								sql`${messages.createdAt} > COALESCE(${conversationMembers.lastReadAt}, '1970-01-01'::timestamp)`,
							),
						)
						.groupBy(messages.conversationId),
				);

				const unreadMap = new Map(
					unreadCountRows.map((r) => [r.conversationId, r.count]),
				);

				const result: ConversationListItem[] = convRows.map((conv) => ({
					id: conv.id,
					type: conv.type,
					name: conv.name,
					createdAt: conv.createdAt,
					lastMessage: lastMsgMap.get(conv.id) ?? null,
					otherUser: otherMap.get(conv.id) ?? null,
					unreadCount: unreadMap.get(conv.id) ?? 0,
				}));

				result.sort((a, b) => {
					const aTime = a.lastMessage?.createdAt ?? a.createdAt;
					const bTime = b.lastMessage?.createdAt ?? b.createdAt;
					return new Date(bTime).getTime() - new Date(aTime).getTime();
				});

				return result;
			}),
		),
);

export const getOrCreateConversationFn = createServerFn({ method: "POST" })
	.inputValidator((data: { recipientId: string }) => {
		if (!data.recipientId?.trim()) throw new Error("Recipient is required");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const userId = session.user.id;

				if (data.recipientId === userId) {
					yield* Effect.fail(
						new ValidationError({ message: "Cannot message yourself" }),
					);
				}

				const connected = yield* Effect.promise(() =>
					areConnected(userId, data.recipientId),
				);
				if (!connected) {
					yield* Effect.fail(
						new ForbiddenError({
							message: "You can only message connections",
						}),
					);
				}

				const existing = yield* Effect.promise(() =>
					db
						.select({
							conversationId: conversationMembers.conversationId,
						})
						.from(conversationMembers)
						.innerJoin(
							conversations,
							and(
								eq(conversations.id, conversationMembers.conversationId),
								eq(conversations.type, "direct"),
							),
						)
						.where(eq(conversationMembers.userId, userId))
						.then((myConvs) => {
							if (myConvs.length === 0) return null;
							const myConvIds = myConvs.map((c) => c.conversationId);
							return db
								.select({
									conversationId: conversationMembers.conversationId,
								})
								.from(conversationMembers)
								.where(
									and(
										sql`${conversationMembers.conversationId} IN ${myConvIds}`,
										eq(conversationMembers.userId, data.recipientId),
									),
								)
								.limit(1)
								.then((rows) => rows[0] ?? null);
						}),
				);

				if (existing) {
					return { conversationId: existing.conversationId };
				}

				const [conv] = yield* Effect.promise(() =>
					db
						.insert(conversations)
						.values({ type: "direct" })
						.returning({ id: conversations.id }),
				);

				yield* Effect.promise(() =>
					db.insert(conversationMembers).values([
						{ conversationId: conv.id, userId },
						{ conversationId: conv.id, userId: data.recipientId },
					]),
				);

				return { conversationId: conv.id };
			}),
		),
	);

export const getMessagesFn = createServerFn({ method: "GET" })
	.inputValidator(
		(data: { conversationId: string; cursor?: string; limit?: number }) => {
			if (!data.conversationId?.trim())
				throw new Error("Conversation ID is required");
			return {
				conversationId: data.conversationId,
				cursor: data.cursor,
				limit: Math.min(data.limit ?? 50, 100),
			};
		},
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const userId = session.user.id;

				const [membership] = yield* Effect.promise(() =>
					db
						.select({
							conversationId: conversationMembers.conversationId,
						})
						.from(conversationMembers)
						.where(
							and(
								eq(conversationMembers.conversationId, data.conversationId),
								eq(conversationMembers.userId, userId),
							),
						)
						.limit(1),
				);

				if (!membership) {
					yield* Effect.fail(
						new ForbiddenError({
							message: "Not a member of this conversation",
						}),
					);
				}

				const conditions = [
					eq(messages.conversationId, data.conversationId),
					isNull(messages.deletedAt),
				];

				if (data.cursor) {
					conditions.push(
						sql`${messages.createdAt} < (SELECT created_at FROM messages WHERE id = ${data.cursor})`,
					);
				}

				const rows = yield* Effect.promise(() =>
					db
						.select({
							id: messages.id,
							content: messages.content,
							senderId: messages.senderId,
							senderName: users.name,
							senderImage: users.image,
							createdAt: messages.createdAt,
						})
						.from(messages)
						.innerJoin(users, eq(messages.senderId, users.id))
						.where(and(...conditions))
						.orderBy(desc(messages.createdAt))
						.limit(data.limit + 1),
				);

				const hasMore = rows.length > data.limit;
				const items: MessageItem[] = (
					hasMore ? rows.slice(0, data.limit) : rows
				).map((r) => ({
					...r,
					isOwn: r.senderId === userId,
				}));

				return {
					messages: items,
					nextCursor: hasMore ? items[items.length - 1].id : null,
				};
			}),
		),
	);

export const sendMessageFn = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			conversationId?: string;
			recipientId?: string;
			content: string;
		}) => {
			if (!data.content?.trim()) throw new Error("Message cannot be empty");
			if (data.content.length > 5000) throw new Error("Message too long");
			if (!data.conversationId && !data.recipientId) {
				throw new Error("Either conversationId or recipientId is required");
			}
			return data;
		},
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const userId = session.user.id;

				let conversationId = data.conversationId;

				if (!conversationId && data.recipientId) {
					const recipientId = data.recipientId;
					const result = yield* Effect.promise(() =>
						getOrCreateConversationFn({
							data: { recipientId: recipientId! },
						}),
					);
					conversationId = result.conversationId;
				}

				if (!conversationId) {
					yield* Effect.fail(
						new ValidationError({
							message: "Could not resolve conversation",
						}),
					);
				}

				const [membership] = yield* Effect.promise(() =>
					db
						.select({
							conversationId: conversationMembers.conversationId,
						})
						.from(conversationMembers)
						.where(
							and(
								eq(
									conversationMembers.conversationId,
									conversationId as string,
								),
								eq(conversationMembers.userId, userId),
							),
						)
						.limit(1),
				);

				if (!membership) {
					yield* Effect.fail(
						new ForbiddenError({
							message: "Not a member of this conversation",
						}),
					);
				}

				const [msg] = yield* Effect.promise(() =>
					db
						.insert(messages)
						.values({
							conversationId: conversationId as string,
							senderId: userId,
							content: data.content.trim(),
						})
						.returning(),
				);

				const recipients = yield* Effect.promise(() =>
					db
						.select({ userId: conversationMembers.userId })
						.from(conversationMembers)
						.where(
							and(
								eq(
									conversationMembers.conversationId,
									conversationId as string,
								),
								sql`${conversationMembers.userId} != ${userId}`,
							),
						),
				);

				for (const r of recipients) {
					yield* Effect.promise(() =>
						publish(userChannel(r.userId), {
							type: "new_message",
							payload: {
								messageId: msg.id,
								conversationId,
								senderId: userId,
								senderName: session.user.name,
								preview: data.content.trim().slice(0, 100),
							},
						}),
					);
				}

				return msg;
			}),
		),
	);

export const markConversationReadFn = createServerFn({ method: "POST" })
	.inputValidator((data: { conversationId: string }) => {
		if (!data.conversationId?.trim())
			throw new Error("Conversation ID is required");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const userId = session.user.id;

				yield* Effect.promise(() =>
					db
						.update(conversationMembers)
						.set({ lastReadAt: new Date() })
						.where(
							and(
								eq(conversationMembers.conversationId, data.conversationId),
								eq(conversationMembers.userId, userId),
							),
						),
				);

				return { success: true };
			}),
		),
	);

export const getUnreadCountFn = createServerFn({ method: "GET" }).handler(() =>
	Effect.runPromise(
		Effect.gen(function* () {
			const session = yield* requireSessionEffect;
			const userId = session.user.id;

			const rows = yield* Effect.promise(() =>
				db
					.select({
						count: sql<number>`count(DISTINCT ${messages.conversationId})::int`,
					})
					.from(messages)
					.innerJoin(
						conversationMembers,
						and(
							eq(conversationMembers.conversationId, messages.conversationId),
							eq(conversationMembers.userId, userId),
						),
					)
					.where(
						and(
							sql`${messages.senderId} != ${userId}`,
							isNull(messages.deletedAt),
							isNull(conversationMembers.archivedAt),
							isNull(conversationMembers.leftAt),
							sql`${messages.createdAt} > COALESCE(${conversationMembers.lastReadAt}, '1970-01-01'::timestamp)`,
						),
					),
			);

			return { unreadConversations: rows[0]?.count ?? 0 };
		}),
	),
);

export const sendTypingIndicatorFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ conversationId: z.string().min(1) }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const userId = session.user.id;

				const recipients = yield* Effect.promise(() =>
					db
						.select({ userId: conversationMembers.userId })
						.from(conversationMembers)
						.where(
							and(
								eq(conversationMembers.conversationId, data.conversationId),
								sql`${conversationMembers.userId} != ${userId}`,
							),
						),
				);

				for (const r of recipients) {
					yield* Effect.promise(() =>
						publish(userChannel(r.userId), {
							type: "typing",
							payload: {
								conversationId: data.conversationId,
								senderName: session.user.name,
							},
						}),
					);
				}

				return { ok: true };
			}),
		),
	);

export const getConversationInfoFn = createServerFn({ method: "GET" })
	.inputValidator((data: { conversationId: string }) => {
		if (!data.conversationId?.trim())
			throw new Error("Conversation ID is required");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const userId = session.user.id;

				const [membership] = yield* Effect.promise(() =>
					db
						.select({
							conversationId: conversationMembers.conversationId,
							mutedAt: conversationMembers.mutedAt,
						})
						.from(conversationMembers)
						.where(
							and(
								eq(conversationMembers.conversationId, data.conversationId),
								eq(conversationMembers.userId, userId),
							),
						)
						.limit(1),
				);

				if (!membership) {
					yield* Effect.fail(
						new ForbiddenError({
							message: "Not a member of this conversation",
						}),
					);
				}

				const [conv] = yield* Effect.promise(() =>
					db
						.select()
						.from(conversations)
						.where(eq(conversations.id, data.conversationId))
						.limit(1),
				);

				const members = yield* Effect.promise(() =>
					db
						.select({
							userId: users.id,
							name: users.name,
							image: users.image,
							handle: profiles.handle,
							headline: profiles.headline,
						})
						.from(conversationMembers)
						.innerJoin(users, eq(conversationMembers.userId, users.id))
						.leftJoin(profiles, eq(users.id, profiles.userId))
						.where(eq(conversationMembers.conversationId, data.conversationId)),
				);

				const otherUser = members.find((m) => m.userId !== userId) ?? null;

				return {
					id: conv.id,
					type: conv.type,
					name: conv.name,
					otherUser,
					members,
					isMuted: !!membership?.mutedAt,
				};
			}),
		),
	);

export const toggleMuteConversationFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ conversationId: z.string().min(1) }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const userId = session.user.id;

				const [row] = yield* Effect.promise(() =>
					db
						.select({ mutedAt: conversationMembers.mutedAt })
						.from(conversationMembers)
						.where(
							and(
								eq(conversationMembers.conversationId, data.conversationId),
								eq(conversationMembers.userId, userId),
							),
						)
						.limit(1),
				);

				if (!row) {
					yield* Effect.fail(
						new ForbiddenError({
							message: "Not a member of this conversation",
						}),
					);
				}

				const newMutedAt = row?.mutedAt ? null : new Date();
				yield* Effect.promise(() =>
					db
						.update(conversationMembers)
						.set({ mutedAt: newMutedAt })
						.where(
							and(
								eq(conversationMembers.conversationId, data.conversationId),
								eq(conversationMembers.userId, userId),
							),
						),
				);

				return { muted: !!newMutedAt };
			}),
		),
	);

export const archiveConversationFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ conversationId: z.string().min(1) }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				yield* Effect.promise(() =>
					db
						.update(conversationMembers)
						.set({ archivedAt: new Date() })
						.where(
							and(
								eq(conversationMembers.conversationId, data.conversationId),
								eq(conversationMembers.userId, session.user.id),
							),
						),
				);
				return { success: true };
			}),
		),
	);

export const unarchiveConversationFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ conversationId: z.string().min(1) }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				yield* Effect.promise(() =>
					db
						.update(conversationMembers)
						.set({ archivedAt: null })
						.where(
							and(
								eq(conversationMembers.conversationId, data.conversationId),
								eq(conversationMembers.userId, session.user.id),
							),
						),
				);
				return { success: true };
			}),
		),
	);

export const deleteConversationFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ conversationId: z.string().min(1) }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const now = new Date();
				yield* Effect.promise(() =>
					db
						.update(conversationMembers)
						.set({ leftAt: now, archivedAt: now })
						.where(
							and(
								eq(conversationMembers.conversationId, data.conversationId),
								eq(conversationMembers.userId, session.user.id),
							),
						),
				);
				return { success: true };
			}),
		),
	);

export const reportConversationFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			conversationId: z.string().min(1),
			reason: z.string().min(1),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				yield* Effect.promise(() =>
					db.insert(moderationQueue).values({
						entityId: data.conversationId,
						entityType: "conversation",
						reportedBy: session.user.id,
						reason: data.reason,
					}),
				);
				return { success: true };
			}),
		),
	);

export const listArchivedConversationsFn = createServerFn({
	method: "GET",
}).handler(() =>
	Effect.runPromise(
		Effect.gen(function* () {
			const session = yield* requireSessionEffect;
			const userId = session.user.id;

			const myConversations = yield* Effect.promise(() =>
				db
					.select({
						conversationId: conversationMembers.conversationId,
						lastReadAt: conversationMembers.lastReadAt,
					})
					.from(conversationMembers)
					.where(
						and(
							eq(conversationMembers.userId, userId),
							isNotNull(conversationMembers.archivedAt),
							isNull(conversationMembers.leftAt),
						),
					),
			);

			if (myConversations.length === 0) return [] as ConversationListItem[];

			const convIds = myConversations.map((c) => c.conversationId);

			const convRows = yield* Effect.promise(() =>
				db
					.select({
						id: conversations.id,
						type: conversations.type,
						name: conversations.name,
						createdAt: conversations.createdAt,
					})
					.from(conversations)
					.where(sql`${conversations.id} IN ${convIds}`),
			);

			const otherMembers = yield* Effect.promise(() =>
				db
					.select({
						conversationId: conversationMembers.conversationId,
						userId: users.id,
						name: users.name,
						image: users.image,
						handle: profiles.handle,
						headline: profiles.headline,
					})
					.from(conversationMembers)
					.innerJoin(users, eq(conversationMembers.userId, users.id))
					.leftJoin(profiles, eq(users.id, profiles.userId))
					.where(
						and(
							sql`${conversationMembers.conversationId} IN ${convIds}`,
							sql`${conversationMembers.userId} != ${userId}`,
						),
					),
			);

			const otherMap = new Map(
				otherMembers.map((m) => [
					m.conversationId,
					{
						id: m.userId,
						name: m.name,
						image: m.image,
						handle: m.handle,
						headline: m.headline,
					},
				]),
			);

			const lastMsgRows = yield* Effect.promise(() =>
				db
					.select({
						id: messages.id,
						conversationId: messages.conversationId,
						content: messages.content,
						senderId: messages.senderId,
						createdAt: messages.createdAt,
					})
					.from(messages)
					.where(
						and(
							sql`${messages.conversationId} IN ${convIds}`,
							isNull(messages.deletedAt),
						),
					)
					.orderBy(desc(messages.createdAt)),
			);

			const lastMsgMap = new Map<
				string,
				{
					id: string;
					content: string;
					senderId: string;
					createdAt: Date;
				}
			>();
			for (const m of lastMsgRows) {
				if (!lastMsgMap.has(m.conversationId)) {
					lastMsgMap.set(m.conversationId, {
						id: m.id,
						content: m.content,
						senderId: m.senderId,
						createdAt: m.createdAt,
					});
				}
			}

			const result: ConversationListItem[] = convRows.map((conv) => ({
				id: conv.id,
				type: conv.type,
				name: conv.name,
				createdAt: conv.createdAt,
				lastMessage: lastMsgMap.get(conv.id) ?? null,
				otherUser: otherMap.get(conv.id) ?? null,
				unreadCount: 0,
			}));

			result.sort((a, b) => {
				const aTime = a.lastMessage?.createdAt ?? a.createdAt;
				const bTime = b.lastMessage?.createdAt ?? b.createdAt;
				return new Date(bTime).getTime() - new Date(aTime).getTime();
			});

			return result;
		}),
	),
);

export const getArchivedCountFn = createServerFn({ method: "GET" }).handler(
	() =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const [row] = yield* Effect.promise(() =>
					db
						.select({ count: sql<number>`count(*)::int` })
						.from(conversationMembers)
						.where(
							and(
								eq(conversationMembers.userId, session.user.id),
								isNotNull(conversationMembers.archivedAt),
								isNull(conversationMembers.leftAt),
							),
						),
				);
				return { count: row?.count ?? 0 };
			}),
		),
);
