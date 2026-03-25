import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/lib/db/index.server";
import {
	comments,
	jobs,
	notifications,
	type notificationTypeEnum,
	posts,
	profiles,
	reactions,
	userPreferences,
	users,
} from "#/lib/db/schema";
import { requireSession } from "#/lib/server/require-session";

type NotificationType = (typeof notificationTypeEnum.enumValues)[number];

const IN_APP_PREF_MAP: Record<string, string> = {
	connection_request: "inAppNotifConnections",
	connection_accepted: "inAppNotifConnections",
	post_reaction: "inAppNotifReactions",
	post_comment: "inAppNotifComments",
	job_match: "inAppNotifJobMatches",
	message: "inAppNotifMessages",
	experience_disputed: "inAppNotifExperienceDisputed",
};

async function getDisabledNotifTypes(
	userId: string,
): Promise<NotificationType[]> {
	const [prefs] = await db
		.select()
		.from(userPreferences)
		.where(eq(userPreferences.userId, userId))
		.limit(1);

	if (!prefs) return [];

	const disabled: NotificationType[] = [];
	const p = prefs as Record<string, unknown>;
	for (const [type, field] of Object.entries(IN_APP_PREF_MAP)) {
		if (p[field] === false && !disabled.includes(type as NotificationType)) {
			disabled.push(type as NotificationType);
		}
	}
	return disabled;
}

export const getNotificationsFn = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			cursor: z.string().optional(),
			limit: z.number().min(1).max(50).default(20),
		}),
	)
	.handler(async ({ data }) => {
		const session = await requireSession();
		const userId = session.user.id;
		const disabledTypes = await getDisabledNotifTypes(userId);

		const rows = await db
			.select({
				id: notifications.id,
				type: notifications.type,
				actorId: notifications.actorId,
				actorName: users.name,
				actorHandle: profiles.handle,
				actorImage: users.image,
				entityId: notifications.entityId,
				entityType: notifications.entityType,
				read: notifications.read,
				createdAt: notifications.createdAt,
				postContent: sql<string | null>`${posts.content}`,
				reactionType: sql<string | null>`${reactions.type}`,
				commentContent: sql<string | null>`${comments.content}`,
				jobTitle: sql<string | null>`${jobs.title}`,
				jobCompany: sql<string | null>`${jobs.company}`,
			})
			.from(notifications)
			.leftJoin(users, eq(users.id, notifications.actorId))
			.leftJoin(profiles, eq(profiles.userId, notifications.actorId))
			.leftJoin(
				posts,
				and(
					eq(notifications.entityType, "post"),
					eq(posts.id, notifications.entityId),
				),
			)
			.leftJoin(
				reactions,
				and(
					eq(notifications.type, "post_reaction"),
					eq(reactions.postId, notifications.entityId),
					eq(reactions.userId, notifications.actorId),
				),
			)
			.leftJoin(
				comments,
				and(
					eq(notifications.type, "post_comment"),
					eq(comments.postId, notifications.entityId),
					eq(comments.authorId, notifications.actorId),
				),
			)
			.leftJoin(
				jobs,
				and(
					eq(notifications.entityType, "job"),
					eq(jobs.id, notifications.entityId),
				),
			)
			.where(
				and(
					eq(notifications.userId, userId),
					disabledTypes.length > 0
						? notInArray(notifications.type, disabledTypes)
						: undefined,
					data.cursor
						? sql`${notifications.createdAt} < ${data.cursor}::timestamp`
						: undefined,
				),
			)
			.orderBy(desc(notifications.createdAt))
			.limit(data.limit + 1);

		const hasMore = rows.length > data.limit;
		const items = hasMore ? rows.slice(0, data.limit) : rows;
		const nextCursor = hasMore
			? items[items.length - 1]?.createdAt?.toISOString()
			: null;

		return {
			notifications: items.map((r) => ({
				...r,
				postContent: r.postContent ? r.postContent.slice(0, 200) : null,
				commentContent: r.commentContent
					? r.commentContent.slice(0, 200)
					: null,
				createdAt: r.createdAt.toISOString(),
			})),
			nextCursor,
		};
	});

export const getUnreadNotificationCountFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const session = await requireSession();
	const userId = session.user.id;
	const disabledTypes = await getDisabledNotifTypes(userId);

	const [row] = await db
		.select({
			count: sql<number>`count(*)::int`,
		})
		.from(notifications)
		.where(
			and(
				eq(notifications.userId, userId),
				eq(notifications.read, false),
				disabledTypes.length > 0
					? notInArray(notifications.type, disabledTypes)
					: undefined,
			),
		);

	return { count: row?.count ?? 0 };
});

export const markNotificationsReadFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			ids: z.array(z.string()).optional(),
		}),
	)
	.handler(async ({ data }) => {
		const session = await requireSession();
		const userId = session.user.id;

		if (data.ids && data.ids.length > 0) {
			await db
				.update(notifications)
				.set({ read: true })
				.where(
					and(
						eq(notifications.userId, userId),
						eq(notifications.read, false),
						sql`${notifications.id} = ANY(${data.ids})`,
					),
				);
		} else {
			await db
				.update(notifications)
				.set({ read: true })
				.where(
					and(eq(notifications.userId, userId), eq(notifications.read, false)),
				);
		}

		return { success: true };
	});
