import { and, eq, gt } from "drizzle-orm";
import { db } from "#/lib/db/index.server";
import { notifications, userPreferences, users } from "#/lib/db/schema";
import { sendNotificationEmail } from "#/lib/email";
import { computeRestrictions } from "#/lib/restrictions";
import { publish, userChannel } from "#/lib/server/pubsub";

type NotificationType =
	| "connection_request"
	| "connection_accepted"
	| "post_reaction"
	| "post_comment"
	| "job_match"
	| "message"
	| "experience_disputed";

const EMAIL_PREF_MAP: Partial<
	Record<NotificationType, keyof typeof userPreferences.$inferSelect>
> = {
	connection_request: "emailNotifConnectionRequests",
	connection_accepted: "emailNotifConnectionRequests",
	post_comment: "emailNotifComments",
	post_reaction: "emailNotifReactions",
	job_match: "emailNotifJobMatches",
	message: "emailNotifMessages",
	experience_disputed: "emailNotifExperienceDisputed",
};

interface CreateNotificationParams {
	userId: string;
	type: NotificationType;
	actorId: string;
	entityId: string;
	entityType: string;
}

export async function createNotification(
	params: CreateNotificationParams,
): Promise<void> {
	const { userId, type, actorId, entityId, entityType } = params;

	if (actorId === userId) return;

	const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
	const [existing] = await db
		.select({ id: notifications.id })
		.from(notifications)
		.where(
			and(
				eq(notifications.userId, userId),
				eq(notifications.type, type),
				eq(notifications.entityId, entityId),
				eq(notifications.entityType, entityType),
				gt(notifications.createdAt, twentyFourHoursAgo),
			),
		)
		.limit(1);

	if (existing) return;

	await db.insert(notifications).values({
		userId,
		type,
		actorId,
		entityId,
		entityType,
	});

	const [user] = await db
		.select({
			dateOfBirth: users.dateOfBirth,
			detectedRegion: users.detectedRegion,
			parentalConsentStatus: users.parentalConsentStatus,
		})
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);

	const restrictions = user
		? computeRestrictions({
				dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth) : null,
				detectedRegion: user.detectedRegion,
				parentalConsentStatus: user.parentalConsentStatus,
			})
		: null;

	if (restrictions?.pushNotificationsAllowed !== false) {
		await publish(userChannel(userId), { type: "notification", payload: {} });
	}

	const prefField = EMAIL_PREF_MAP[type];
	if (prefField) {
		sendEmailIfEnabled(userId, actorId, type, prefField).catch(console.error);
	}
}

async function sendEmailIfEnabled(
	userId: string,
	actorId: string,
	type: NotificationType,
	prefField: keyof typeof userPreferences.$inferSelect,
): Promise<void> {
	const [prefs] = await db
		.select({ enabled: userPreferences[prefField] })
		.from(userPreferences)
		.where(eq(userPreferences.userId, userId))
		.limit(1);

	const enabled = prefs ? prefs.enabled : prefField !== "emailNotifReactions";
	if (!enabled) return;

	const [recipient] = await db
		.select({ email: users.email, name: users.name })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);

	if (!recipient?.email) return;

	const [actor] = await db
		.select({ name: users.name })
		.from(users)
		.where(eq(users.id, actorId))
		.limit(1);

	await sendNotificationEmail({
		to: recipient.email,
		recipientName: recipient.name ?? "there",
		actorName: actor?.name ?? "Someone",
		type,
	});
}
