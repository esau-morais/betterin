import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import {
	and,
	asc,
	count,
	desc,
	eq,
	inArray,
	isNull,
	or,
	sql,
} from "drizzle-orm";
import { Effect } from "effect";
import { z } from "zod";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db/index.server";
import {
	certifications,
	comments,
	connections,
	educations,
	experiences,
	featuredItems,
	feedEvents,
	follows,
	honors,
	languages,
	posts,
	profiles,
	projects,
	reactions,
	savedPosts,
	skills,
	users,
	volunteering,
} from "#/lib/db/schema";
import {
	ConflictError,
	ForbiddenError,
	UnauthorizedError,
	ValidationError,
} from "#/lib/effect-helpers";
import type {
	MappedCertification,
	MappedEducation,
	MappedHonor,
	MappedLanguage,
	MappedPosition,
	MappedProject,
	MappedSkill,
	MappedVolunteering,
} from "#/lib/linkedin-import/mappers";
import { detectRegion } from "#/lib/server/geoip";
import { createNotification } from "#/lib/server/notifications-helpers";
import { getConnectionStatus } from "#/lib/server/profile-helpers";
import { requireSessionEffect } from "#/lib/server/require-session";
import { handleSchema } from "#/lib/validation";

export const getProfileFn = createServerFn({ method: "GET" }).handler(() =>
	Effect.runPromise(
		Effect.gen(function* () {
			const request = getRequest();
			const session = yield* Effect.promise(() =>
				auth.api.getSession({ headers: request.headers }),
			);
			if (!session) return null;

			const [profile] = yield* Effect.promise(() =>
				db
					.select()
					.from(profiles)
					.where(eq(profiles.userId, session.user.id))
					.limit(1),
			);

			return profile ?? null;
		}),
	),
);

export const checkHandleFn = createServerFn({ method: "GET" })
	.inputValidator(z.object({ handle: handleSchema }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const [existing] = yield* Effect.promise(() =>
					db
						.select({ id: profiles.id })
						.from(profiles)
						.where(eq(profiles.handle, data.handle))
						.limit(1),
				);

				return existing
					? { available: false, reason: "taken" as const }
					: { available: true, reason: null };
			}),
		),
	);

const createProfileSchema = z.object({
	handle: handleSchema,
	displayName: z.string().trim().min(1, "Name is required").max(120),
	headline: z.string().max(280).optional(),
	dateOfBirth: z
		.string()
		.refine((val) => !Number.isNaN(Date.parse(val)), "Invalid date")
		.refine(
			(val) => {
				const dob = new Date(val);
				const today = new Date();
				let age = today.getFullYear() - dob.getFullYear();
				const m = today.getMonth() - dob.getMonth();
				if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
				return age >= 13;
			},
			{ message: "You must be at least 13 years old" },
		),
});

export const createProfileFn = createServerFn({ method: "POST" })
	.inputValidator(createProfileSchema)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const request = getRequest();
				const session = yield* Effect.promise(() =>
					auth.api.getSession({ headers: request.headers }),
				);
				if (!session) {
					return yield* Effect.fail(new UnauthorizedError({}));
				}

				const handle = data.handle.toLowerCase();

				const [existingProfile] = yield* Effect.promise(() =>
					db
						.select({ id: profiles.id })
						.from(profiles)
						.where(eq(profiles.userId, session.user.id))
						.limit(1),
				);

				if (existingProfile) {
					return yield* Effect.fail(
						new ConflictError({ message: "Profile already exists" }),
					);
				}

				const [handleTaken] = yield* Effect.promise(() =>
					db
						.select({ id: profiles.id })
						.from(profiles)
						.where(eq(profiles.handle, handle))
						.limit(1),
				);

				if (handleTaken) {
					return yield* Effect.fail(
						new ConflictError({ message: "Handle is already taken" }),
					);
				}

				const [profile] = yield* Effect.promise(() =>
					db
						.insert(profiles)
						.values({
							userId: session.user.id,
							handle,
							headline: data.headline || null,
						})
						.returning(),
				);

				const region = detectRegion(request);

				yield* Effect.promise(() =>
					auth.api.updateUser({
						headers: request.headers,
						body: { name: data.displayName },
					}),
				);

				yield* Effect.promise(() =>
					db
						.update(users)
						.set({
							dateOfBirth: new Date(data.dateOfBirth),
							detectedRegion: region,
						})
						.where(eq(users.id, session.user.id)),
				);

				return profile;
			}),
		),
	);

interface ImportLinkedInInput {
	profile: {
		headline?: string;
		location?: string;
		website?: string;
	} | null;
	positions: MappedPosition[];
	educations: MappedEducation[];
	skills: MappedSkill[];
	certifications: MappedCertification[];
	projects: MappedProject[];
	volunteering: MappedVolunteering[];
	honors: MappedHonor[];
	languages: MappedLanguage[];
}

export const importLinkedInProfileFn = createServerFn({ method: "POST" })
	.inputValidator((data: ImportLinkedInInput) => data)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const request = getRequest();
				const session = yield* Effect.promise(() =>
					auth.api.getSession({ headers: request.headers }),
				);
				if (!session) {
					return yield* Effect.fail(new UnauthorizedError({}));
				}

				const userId = session.user.id;

				if (data.profile) {
					const profileData = data.profile;
					yield* Effect.promise(() =>
						db
							.update(profiles)
							.set({
								headline: profileData.headline || undefined,
								location: profileData.location || undefined,
								website: profileData.website || undefined,
								updatedAt: new Date(),
							})
							.where(eq(profiles.userId, userId)),
					);
				}

				const ops: Promise<unknown>[] = [];

				if (data.positions.length > 0) {
					ops.push(
						db
							.insert(experiences)
							.values(
								data.positions.map((p) => ({
									userId,
									company: p.company,
									title: p.title,
									description: p.description,
									location: p.location,
									startDate: p.startDate,
									endDate: p.endDate,
									current: p.current,
								})),
							)
							.onConflictDoNothing(),
					);
				}

				if (data.educations.length > 0) {
					ops.push(
						db
							.insert(educations)
							.values(
								data.educations.map((e, i) => ({
									userId,
									school: e.school,
									degree: e.degree,
									field: e.field,
									startDate: e.startDate,
									endDate: e.endDate,
									description: e.description,
									ordering: i,
								})),
							)
							.onConflictDoNothing(),
					);
				}

				if (data.skills.length > 0) {
					ops.push(
						db
							.insert(skills)
							.values(
								data.skills.map((s) => ({
									userId,
									name: s.name,
									ordering: s.ordering,
								})),
							)
							.onConflictDoNothing(),
					);
				}

				if (data.certifications.length > 0) {
					ops.push(
						db
							.insert(certifications)
							.values(
								data.certifications.map((c) => ({
									userId,
									name: c.name,
									organization: c.organization,
									issueDate: c.issueDate,
									expirationDate: c.expirationDate,
									credentialId: c.credentialId,
									credentialUrl: c.credentialUrl,
									ordering: c.ordering,
								})),
							)
							.onConflictDoNothing(),
					);
				}

				if (data.projects.length > 0) {
					ops.push(
						db
							.insert(projects)
							.values(
								data.projects.map((p) => ({
									userId,
									name: p.name,
									description: p.description,
									url: p.url,
									startDate: p.startDate,
									endDate: p.endDate,
									ordering: p.ordering,
								})),
							)
							.onConflictDoNothing(),
					);
				}

				if (data.volunteering.length > 0) {
					ops.push(
						db
							.insert(volunteering)
							.values(
								data.volunteering.map((v) => ({
									userId,
									organization: v.organization,
									role: v.role,
									cause: v.cause,
									description: v.description,
									startDate: v.startDate,
									endDate: v.endDate,
									ordering: v.ordering,
								})),
							)
							.onConflictDoNothing(),
					);
				}

				if (data.honors.length > 0) {
					ops.push(
						db
							.insert(honors)
							.values(
								data.honors.map((h) => ({
									userId,
									title: h.title,
									issuer: h.issuer,
									issueDate: h.issueDate,
									description: h.description,
									ordering: h.ordering,
								})),
							)
							.onConflictDoNothing(),
					);
				}

				if (data.languages.length > 0) {
					ops.push(
						db
							.insert(languages)
							.values(
								data.languages.map((l) => ({
									userId,
									name: l.name,
									proficiency: l.proficiency,
									ordering: l.ordering,
								})),
							)
							.onConflictDoNothing(),
					);
				}

				yield* Effect.promise(() => Promise.all(ops));

				return {
					imported: {
						positions: data.positions.length,
						educations: data.educations.length,
						skills: data.skills.length,
						certifications: data.certifications.length,
						projects: data.projects.length,
						volunteering: data.volunteering.length,
						honors: data.honors.length,
						languages: data.languages.length,
					},
				};
			}),
		),
	);

export type ConnectionStatus =
	| "self"
	| "connected"
	| "pending_sent"
	| "pending_received"
	| "none"
	| "blocked";

export type ProfileData = NonNullable<
	Awaited<ReturnType<typeof getProfileByHandleFn>>
>;

function bucketConnectionCount(n: number): string {
	if (n >= 500) return "500+";
	if (n >= 200) return "200+";
	if (n >= 100) return "100+";
	if (n >= 50) return "50+";
	if (n >= 10) return "10+";
	return String(n);
}

export const getProfileByHandleFn = createServerFn({ method: "GET" })
	.inputValidator((data: { handle: string }) => {
		if (!data.handle) throw new Error("Handle is required");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const handle = data.handle.toLowerCase();

				const [row] = yield* Effect.promise(() =>
					db
						.select({
							profile: profiles,
							user: {
								id: users.id,
								name: users.name,
								email: users.email,
								image: users.image,
								identityVerifiedAt: users.identityVerifiedAt,
							},
						})
						.from(profiles)
						.innerJoin(users, eq(profiles.userId, users.id))
						.where(eq(profiles.handle, handle))
						.limit(1),
				);

				if (!row) return null;

				const userId = row.user.id;
				const sessionUserId = session.user.id;
				const [connectionStatus, connectionCountResult, isFollowing] =
					yield* Effect.promise(() =>
						Promise.all([
							getConnectionStatus(sessionUserId, userId),
							db
								.select({ count: count() })
								.from(connections)
								.where(
									and(
										or(
											eq(connections.requesterId, userId),
											eq(connections.addresseeId, userId),
										),
										eq(connections.status, "accepted"),
									),
								),
							db
								.select({ id: follows.id })
								.from(follows)
								.where(
									and(
										eq(follows.followerId, sessionUserId),
										eq(follows.followedId, userId),
									),
								)
								.limit(1),
						]),
					);

				return {
					...row.profile,
					user: row.user,
					connectionStatus,
					connectionCount: bucketConnectionCount(
						connectionCountResult[0]?.count ?? 0,
					),
					isFollowing: isFollowing.length > 0,
				};
			}),
		),
	);

export type ProfileSections = NonNullable<
	Awaited<ReturnType<typeof getProfileSectionsFn>>
>;

export const getProfileSectionsFn = createServerFn({ method: "GET" })
	.inputValidator((data: { userId: string }) => {
		if (!data.userId) throw new Error("userId is required");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const userId = data.userId;
				const [
					userExperiences,
					userEducations,
					userSkills,
					userCertifications,
					userProjects,
					userVolunteering,
					userHonors,
					userLanguages,
					userFeaturedItems,
				] = yield* Effect.promise(() =>
					Promise.all([
						db
							.select()
							.from(experiences)
							.where(eq(experiences.userId, userId))
							.orderBy(asc(experiences.ordering), desc(experiences.startDate)),
						db
							.select()
							.from(educations)
							.where(eq(educations.userId, userId))
							.orderBy(asc(educations.ordering)),
						db
							.select()
							.from(skills)
							.where(eq(skills.userId, userId))
							.orderBy(asc(skills.ordering)),
						db
							.select()
							.from(certifications)
							.where(eq(certifications.userId, userId))
							.orderBy(asc(certifications.ordering)),
						db
							.select()
							.from(projects)
							.where(eq(projects.userId, userId))
							.orderBy(asc(projects.ordering)),
						db
							.select()
							.from(volunteering)
							.where(eq(volunteering.userId, userId))
							.orderBy(asc(volunteering.ordering)),
						db
							.select()
							.from(honors)
							.where(eq(honors.userId, userId))
							.orderBy(asc(honors.ordering)),
						db
							.select()
							.from(languages)
							.where(eq(languages.userId, userId))
							.orderBy(asc(languages.ordering)),
						db
							.select()
							.from(featuredItems)
							.where(eq(featuredItems.userId, userId))
							.orderBy(asc(featuredItems.ordering)),
					]),
				);

				return {
					experiences: userExperiences,
					educations: userEducations,
					skills: userSkills,
					certifications: userCertifications,
					projects: userProjects,
					volunteering: userVolunteering,
					honors: userHonors,
					languages: userLanguages,
					featuredItems: userFeaturedItems,
				};
			}),
		),
	);

export const getProfilePostsFn = createServerFn({ method: "GET" })
	.inputValidator(
		(data: {
			userId: string;
			viewerRelation: ConnectionStatus;
			cursor?: string;
			limit?: number;
		}) => {
			if (!data.userId) throw new Error("userId is required");
			return data;
		},
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const pageSize = data.limit ?? 10;

				const visibilityFilter =
					data.viewerRelation === "self"
						? sql`1=1`
						: data.viewerRelation === "connected"
							? sql`${posts.visibility} IN ('public', 'connections')`
							: eq(posts.visibility, "public");

				const cursorValue = data.cursor;
				const cursorFilter = cursorValue
					? sql`${posts.createdAt} < ${new Date(cursorValue)}`
					: sql`1=1`;

				const dataUserId = data.userId;
				const rows = yield* Effect.promise(() =>
					db
						.select({
							id: posts.id,
							content: posts.content,
							contentFormat: posts.contentFormat,
							contentHtml: posts.contentHtml,
							mediaUrls: posts.mediaUrls,
							visibility: posts.visibility,
							createdAt: posts.createdAt,
							authorId: posts.authorId,
							authorName: users.name,
							authorImage: users.image,
							handle: profiles.handle,
							headline: profiles.headline,
						})
						.from(posts)
						.innerJoin(users, eq(posts.authorId, users.id))
						.innerJoin(profiles, eq(posts.authorId, profiles.userId))
						.where(
							and(
								eq(posts.authorId, dataUserId),
								isNull(posts.deletedAt),
								visibilityFilter,
								cursorFilter,
							),
						)
						.orderBy(desc(posts.createdAt))
						.limit(pageSize + 1),
				);

				const hasMore = rows.length > pageSize;
				const items = hasMore ? rows.slice(0, pageSize) : rows;

				const postIds = items.map((p) => p.id);
				let reactionMap: Record<string, string | null> = {};
				let savedSet: Set<string> = new Set();
				let reactionCountMap = new Map<string, number>();
				let reactionTypesMap = new Map<string, string[]>();
				let commentCountMap = new Map<string, number>();
				let impressionCountMap = new Map<string, number>();

				if (postIds.length > 0) {
					const session = yield* requireSessionEffect;
					const [
						myReactions,
						mySaved,
						reactionCounts,
						reactionTypes,
						commentCounts,
						impressionCounts,
					] = yield* Effect.promise(() =>
						Promise.all([
							db
								.select({ postId: reactions.postId, type: reactions.type })
								.from(reactions)
								.where(
									and(
										eq(reactions.userId, session.user.id),
										inArray(reactions.postId, postIds),
									),
								),
							db
								.select({ postId: savedPosts.postId })
								.from(savedPosts)
								.where(
									and(
										eq(savedPosts.userId, session.user.id),
										inArray(savedPosts.postId, postIds),
									),
								),
							db
								.select({
									postId: reactions.postId,
									count: sql<number>`count(*)::int`,
								})
								.from(reactions)
								.where(inArray(reactions.postId, postIds))
								.groupBy(reactions.postId),
							db
								.select({
									postId: reactions.postId,
									type: reactions.type,
								})
								.from(reactions)
								.where(inArray(reactions.postId, postIds))
								.groupBy(reactions.postId, reactions.type),
							db
								.select({
									postId: comments.postId,
									count: sql<number>`count(*)::int`,
								})
								.from(comments)
								.where(
									and(
										inArray(comments.postId, postIds),
										isNull(comments.deletedAt),
									),
								)
								.groupBy(comments.postId),
							db
								.select({
									postId: feedEvents.postId,
									count: sql<number>`count(*)::int`,
								})
								.from(feedEvents)
								.where(
									and(
										inArray(feedEvents.postId, postIds),
										eq(feedEvents.action, "impression"),
									),
								)
								.groupBy(feedEvents.postId),
						]),
					);

					reactionMap = Object.fromEntries(
						myReactions.map((r) => [r.postId, r.type]),
					);
					savedSet = new Set(mySaved.map((s) => s.postId));
					reactionCountMap = new Map(
						reactionCounts.map((r) => [r.postId, r.count]),
					);
					commentCountMap = new Map(
						commentCounts.map((c) => [c.postId, c.count]),
					);
					impressionCountMap = new Map(
						impressionCounts.map((i) => [i.postId, i.count]),
					);

					const typesAcc = new Map<string, string[]>();
					for (const r of reactionTypes) {
						const existing = typesAcc.get(r.postId) ?? [];
						existing.push(r.type);
						typesAcc.set(r.postId, existing);
					}
					reactionTypesMap = typesAcc;
				}

				return {
					posts: items.map((p) => ({
						id: p.id,
						content: p.content,
						contentFormat: p.contentFormat as "plain" | "tiptap" | null,
						contentHtml: p.contentHtml,
						mediaUrls: p.mediaUrls,
						visibility: p.visibility,
						createdAt: p.createdAt,
						author: {
							id: p.authorId,
							name: p.authorName,
							image: p.authorImage,
							handle: p.handle,
							headline: p.headline,
						},
						myReaction: reactionMap[p.id] ?? null,
						isSaved: savedSet.has(p.id),
						reactionTypes: reactionTypesMap.get(p.id) ?? [],
						reactionCount: reactionCountMap.get(p.id) ?? 0,
						commentCount: commentCountMap.get(p.id) ?? 0,
						impressionCount: impressionCountMap.get(p.id) ?? 0,
						source: null,
					})),
					nextCursor: hasMore
						? items[items.length - 1].createdAt.toISOString()
						: null,
				};
			}),
		),
	);

export const sendConnectionRequestFn = createServerFn({ method: "POST" })
	.inputValidator((data: { targetUserId: string }) => {
		if (!data.targetUserId) throw new Error("targetUserId is required");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				if (session.user.id === data.targetUserId) {
					return yield* Effect.fail(
						new ValidationError({ message: "Cannot connect with yourself" }),
					);
				}

				const targetUserId = data.targetUserId;
				const [existing] = yield* Effect.promise(() =>
					db
						.select()
						.from(connections)
						.where(
							or(
								and(
									eq(connections.requesterId, session.user.id),
									eq(connections.addresseeId, targetUserId),
								),
								and(
									eq(connections.requesterId, targetUserId),
									eq(connections.addresseeId, session.user.id),
								),
							),
						)
						.limit(1),
				);

				if (existing) {
					if (existing.status === "blocked") {
						return yield* Effect.fail(
							new ForbiddenError({ message: "Cannot connect" }),
						);
					}
					if (existing.status === "accepted")
						return { status: "connected" as const };
					return { status: "pending_sent" as const };
				}

				yield* Effect.promise(() =>
					db.insert(connections).values({
						requesterId: session.user.id,
						addresseeId: targetUserId,
						status: "pending",
					}),
				);

				createNotification({
					userId: targetUserId,
					type: "connection_request",
					actorId: session.user.id,
					entityId: session.user.id,
					entityType: "connection",
				}).catch(console.error);

				return { status: "pending_sent" as const };
			}),
		),
	);

export const acceptConnectionFn = createServerFn({ method: "POST" })
	.inputValidator((data: { requesterId: string }) => {
		if (!data.requesterId) throw new Error("requesterId is required");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const requesterId = data.requesterId;
				yield* Effect.promise(() =>
					db
						.update(connections)
						.set({ status: "accepted" })
						.where(
							and(
								eq(connections.requesterId, requesterId),
								eq(connections.addresseeId, session.user.id),
								eq(connections.status, "pending"),
							),
						),
				);

				createNotification({
					userId: requesterId,
					type: "connection_accepted",
					actorId: session.user.id,
					entityId: session.user.id,
					entityType: "connection",
				}).catch(console.error);

				return { status: "connected" as const };
			}),
		),
	);

export const withdrawConnectionFn = createServerFn({ method: "POST" })
	.inputValidator((data: { targetUserId: string }) => {
		if (!data.targetUserId) throw new Error("targetUserId is required");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const targetUserId = data.targetUserId;
				yield* Effect.promise(() =>
					db
						.delete(connections)
						.where(
							and(
								eq(connections.requesterId, session.user.id),
								eq(connections.addresseeId, targetUserId),
								eq(connections.status, "pending"),
							),
						),
				);

				return { status: "none" as const };
			}),
		),
	);

export const removeConnectionFn = createServerFn({ method: "POST" })
	.inputValidator((data: { targetUserId: string }) => {
		if (!data.targetUserId) throw new Error("targetUserId is required");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const targetUserId = data.targetUserId;
				yield* Effect.promise(() =>
					db
						.delete(connections)
						.where(
							or(
								and(
									eq(connections.requesterId, session.user.id),
									eq(connections.addresseeId, targetUserId),
									eq(connections.status, "accepted"),
								),
								and(
									eq(connections.requesterId, targetUserId),
									eq(connections.addresseeId, session.user.id),
									eq(connections.status, "accepted"),
								),
							),
						),
				);

				return { status: "none" as const };
			}),
		),
	);

export const toggleFollowFn = createServerFn({ method: "POST" })
	.inputValidator((data: { targetUserId: string }) => {
		if (!data.targetUserId) throw new Error("targetUserId is required");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				if (session.user.id === data.targetUserId) {
					return yield* Effect.fail(
						new ValidationError({ message: "Cannot follow yourself" }),
					);
				}

				const targetUserId = data.targetUserId;
				const [existing] = yield* Effect.promise(() =>
					db
						.select()
						.from(follows)
						.where(
							and(
								eq(follows.followerId, session.user.id),
								eq(follows.followedId, targetUserId),
							),
						)
						.limit(1),
				);

				if (existing) {
					yield* Effect.promise(() =>
						db.delete(follows).where(eq(follows.id, existing.id)),
					);
					return { following: false };
				}

				yield* Effect.promise(() =>
					db.insert(follows).values({
						followerId: session.user.id,
						followedId: targetUserId,
					}),
				);

				return { following: true };
			}),
		),
	);

export const updateProfileFieldsFn = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			headline?: string;
			bio?: string;
			location?: string;
			locationLat?: number | null;
			locationLon?: number | null;
			website?: string;
			openToWork?: boolean;
			hiring?: boolean;
			avatarFrame?: string | null;
		}) => data,
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const updateData: Record<string, unknown> = { updatedAt: new Date() };
				if (data.headline !== undefined)
					updateData.headline = data.headline || null;
				if (data.bio !== undefined) updateData.bio = data.bio || null;
				if (data.location !== undefined)
					updateData.location = data.location || null;
				if (data.locationLat !== undefined)
					updateData.locationLat = data.locationLat;
				if (data.locationLon !== undefined)
					updateData.locationLon = data.locationLon;
				if (data.website !== undefined)
					updateData.website = data.website || null;
				if (data.openToWork !== undefined)
					updateData.openToWork = data.openToWork;
				if (data.hiring !== undefined) updateData.hiring = data.hiring;
				if (data.avatarFrame !== undefined) {
					updateData.avatarFrame = data.avatarFrame;

					const [current] = yield* Effect.promise(() =>
						db
							.select({
								avatarUrl: profiles.avatarUrl,
								avatarOriginalUrl: profiles.avatarOriginalUrl,
								avatarFrame: profiles.avatarFrame,
							})
							.from(profiles)
							.where(eq(profiles.userId, session.user.id)),
					);

					if (current?.avatarOriginalUrl) {
						const publicUrl = process.env.R2_PUBLIC_URL ?? "";

						if (data.avatarFrame) {
							const storageModule = yield* Effect.promise(
								() => import("#/lib/storage"),
							);
							const frameModule = yield* Effect.promise(
								() => import("#/lib/server/avatar-frame"),
							);
							const originalKey = current.avatarOriginalUrl.slice(
								publicUrl.length + 1,
							);
							const original = yield* Effect.promise(() =>
								storageModule.downloadFile(originalKey),
							);
							const avatarFrame = data.avatarFrame;
							const composited = yield* Effect.promise(() =>
								frameModule.compositeWithFrame(original, avatarFrame),
							);
							const hash = Date.now().toString(36);
							const compositeKey = `avatars/${session.user.id}-${hash}.webp`;
							const newUrl = yield* Effect.promise(() =>
								storageModule.uploadFile(
									compositeKey,
									composited,
									"image/webp",
								),
							);
							updateData.avatarUrl = newUrl;

							if (
								current.avatarUrl &&
								current.avatarUrl !== current.avatarOriginalUrl
							) {
								const oldKey = current.avatarUrl.slice(publicUrl.length + 1);
								storageModule.deleteFile(oldKey).catch(() => {});
							}
						} else {
							if (
								current.avatarUrl &&
								current.avatarUrl !== current.avatarOriginalUrl
							) {
								const storageModule = yield* Effect.promise(
									() => import("#/lib/storage"),
								);
								const oldKey = current.avatarUrl.slice(publicUrl.length + 1);
								storageModule.deleteFile(oldKey).catch(() => {});
							}
							updateData.avatarUrl = current.avatarOriginalUrl;
						}
					}
				}

				const [updated] = yield* Effect.promise(() =>
					db
						.update(profiles)
						.set(updateData)
						.where(eq(profiles.userId, session.user.id))
						.returning(),
				);

				return updated;
			}),
		),
	);

export const updateUserNameFn = createServerFn({ method: "POST" })
	.inputValidator((data: { name: string }) => {
		if (!data.name?.trim()) throw new Error("Name is required");
		if (data.name.length > 120)
			throw new Error("Name must be 120 characters or fewer");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const request = getRequest();
				const session = yield* Effect.promise(() =>
					auth.api.getSession({ headers: request.headers }),
				);
				if (!session) {
					return yield* Effect.fail(new UnauthorizedError({}));
				}
				yield* Effect.promise(() =>
					auth.api.updateUser({
						headers: request.headers,
						body: { name: data.name },
					}),
				);
				return { name: data.name };
			}),
		),
	);

export const addExperienceFn = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			company: string;
			title: string;
			location?: string;
			startDate: string;
			endDate?: string;
			current: boolean;
			description?: string;
		}) => {
			if (!data.company?.trim()) throw new Error("Company is required");
			if (!data.title?.trim()) throw new Error("Title is required");
			if (!data.startDate) throw new Error("Start date is required");
			return data;
		},
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const [exp] = yield* Effect.promise(() =>
					db
						.insert(experiences)
						.values({
							userId: session.user.id,
							company: data.company,
							title: data.title,
							location: data.location || null,
							startDate: new Date(data.startDate),
							endDate: data.endDate ? new Date(data.endDate) : null,
							current: data.current,
							description: data.description || null,
						})
						.returning(),
				);
				return exp;
			}),
		),
	);

export const updateExperienceFn = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			id: string;
			company: string;
			title: string;
			location?: string;
			startDate: string;
			endDate?: string;
			current: boolean;
			description?: string;
		}) => {
			if (!data.id) throw new Error("id is required");
			if (!data.company?.trim()) throw new Error("Company is required");
			if (!data.title?.trim()) throw new Error("Title is required");
			return data;
		},
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const [updated] = yield* Effect.promise(() =>
					db
						.update(experiences)
						.set({
							company: data.company,
							title: data.title,
							location: data.location || null,
							startDate: new Date(data.startDate),
							endDate: data.endDate ? new Date(data.endDate) : null,
							current: data.current,
							description: data.description || null,
						})
						.where(
							and(
								eq(experiences.id, data.id),
								eq(experiences.userId, session.user.id),
							),
						)
						.returning(),
				);
				return updated;
			}),
		),
	);

export const deleteExperienceFn = createServerFn({ method: "POST" })
	.inputValidator((data: { id: string }) => {
		if (!data.id) throw new Error("id is required");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				yield* Effect.promise(() =>
					db
						.delete(experiences)
						.where(
							and(
								eq(experiences.id, data.id),
								eq(experiences.userId, session.user.id),
							),
						),
				);
				return { deleted: true };
			}),
		),
	);

export const addEducationFn = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			school: string;
			degree?: string;
			field?: string;
			startDate?: string;
			endDate?: string;
			description?: string;
		}) => {
			if (!data.school?.trim()) throw new Error("School is required");
			return data;
		},
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const [edu] = yield* Effect.promise(() =>
					db
						.insert(educations)
						.values({
							userId: session.user.id,
							school: data.school,
							degree: data.degree || null,
							field: data.field || null,
							startDate: data.startDate ? new Date(data.startDate) : null,
							endDate: data.endDate ? new Date(data.endDate) : null,
							description: data.description || null,
						})
						.returning(),
				);
				return edu;
			}),
		),
	);

export const deleteEducationFn = createServerFn({ method: "POST" })
	.inputValidator((data: { id: string }) => {
		if (!data.id) throw new Error("id is required");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				yield* Effect.promise(() =>
					db
						.delete(educations)
						.where(
							and(
								eq(educations.id, data.id),
								eq(educations.userId, session.user.id),
							),
						),
				);
				return { deleted: true };
			}),
		),
	);

export const addSkillFn = createServerFn({ method: "POST" })
	.inputValidator((data: { name: string }) => {
		if (!data.name?.trim()) throw new Error("Skill name is required");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const [skill] = yield* Effect.promise(() =>
					db
						.insert(skills)
						.values({ userId: session.user.id, name: data.name.trim() })
						.onConflictDoNothing()
						.returning(),
				);
				return skill ?? null;
			}),
		),
	);

export const deleteSkillFn = createServerFn({ method: "POST" })
	.inputValidator((data: { id: string }) => {
		if (!data.id) throw new Error("id is required");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				yield* Effect.promise(() =>
					db
						.delete(skills)
						.where(
							and(eq(skills.id, data.id), eq(skills.userId, session.user.id)),
						),
				);
				return { deleted: true };
			}),
		),
	);

export const deleteCertificationFn = createServerFn({ method: "POST" })
	.inputValidator((data: { id: string }) => {
		if (!data.id) throw new Error("id is required");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				yield* Effect.promise(() =>
					db
						.delete(certifications)
						.where(
							and(
								eq(certifications.id, data.id),
								eq(certifications.userId, session.user.id),
							),
						),
				);
				return { deleted: true };
			}),
		),
	);

export const deleteProjectFn = createServerFn({ method: "POST" })
	.inputValidator((data: { id: string }) => {
		if (!data.id) throw new Error("id is required");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				yield* Effect.promise(() =>
					db
						.delete(projects)
						.where(
							and(
								eq(projects.id, data.id),
								eq(projects.userId, session.user.id),
							),
						),
				);
				return { deleted: true };
			}),
		),
	);

export const deleteVolunteeringFn = createServerFn({ method: "POST" })
	.inputValidator((data: { id: string }) => {
		if (!data.id) throw new Error("id is required");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				yield* Effect.promise(() =>
					db
						.delete(volunteering)
						.where(
							and(
								eq(volunteering.id, data.id),
								eq(volunteering.userId, session.user.id),
							),
						),
				);
				return { deleted: true };
			}),
		),
	);

export const deleteHonorFn = createServerFn({ method: "POST" })
	.inputValidator((data: { id: string }) => {
		if (!data.id) throw new Error("id is required");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				yield* Effect.promise(() =>
					db
						.delete(honors)
						.where(
							and(eq(honors.id, data.id), eq(honors.userId, session.user.id)),
						),
				);
				return { deleted: true };
			}),
		),
	);

export const deleteLanguageFn = createServerFn({ method: "POST" })
	.inputValidator((data: { id: string }) => {
		if (!data.id) throw new Error("id is required");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				yield* Effect.promise(() =>
					db
						.delete(languages)
						.where(
							and(
								eq(languages.id, data.id),
								eq(languages.userId, session.user.id),
							),
						),
				);
				return { deleted: true };
			}),
		),
	);

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MAX_COVER_BYTES = 10 * 1024 * 1024;

export const uploadAvatarFn = createServerFn({ method: "POST" })
	.inputValidator(
		(data: { base64: string; contentType: string; frame?: string | null }) => {
			if (!data.base64) throw new Error("Image data is required");
			if (!data.contentType.startsWith("image/"))
				throw new Error("File must be an image");
			return data;
		},
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const storageModule = yield* Effect.promise(
					() => import("#/lib/storage"),
				);
				const frameModule = yield* Effect.promise(
					() => import("#/lib/server/avatar-frame"),
				);
				const sharpModule = yield* Effect.promise(() => import("sharp"));
				const sharp = sharpModule.default;
				const session = yield* requireSessionEffect;

				const buffer = Buffer.from(data.base64, "base64");
				if (buffer.byteLength > MAX_AVATAR_BYTES) {
					return yield* Effect.fail(
						new ValidationError({ message: "Avatar must be under 5MB" }),
					);
				}

				const processed = yield* Effect.promise(() =>
					sharp(buffer)
						.resize(400, 400, { fit: "cover", position: "centre" })
						.webp({ quality: 85 })
						.toBuffer(),
				);

				const [current] = yield* Effect.promise(() =>
					db
						.select({
							avatarUrl: profiles.avatarUrl,
							avatarOriginalUrl: profiles.avatarOriginalUrl,
							avatarFrame: profiles.avatarFrame,
						})
						.from(profiles)
						.where(eq(profiles.userId, session.user.id)),
				);

				const hash = Date.now().toString(36);
				const originalKey = `avatars/${session.user.id}-original-${hash}.webp`;
				const originalUrl = yield* Effect.promise(() =>
					storageModule.uploadFile(originalKey, processed, "image/webp"),
				);

				const frame =
					data.frame !== undefined ? data.frame : current?.avatarFrame;
				let avatarUrl: string;
				if (frame) {
					const composited = yield* Effect.promise(() =>
						frameModule.compositeWithFrame(processed, frame),
					);
					const compositeKey = `avatars/${session.user.id}-${hash}.webp`;
					avatarUrl = yield* Effect.promise(() =>
						storageModule.uploadFile(compositeKey, composited, "image/webp"),
					);
				} else {
					avatarUrl = originalUrl;
				}

				const publicUrl = process.env.R2_PUBLIC_URL ?? "";
				const oldKeys = [current?.avatarUrl, current?.avatarOriginalUrl]
					.filter((u): u is string => !!u && u.startsWith(publicUrl))
					.map((u) => u.slice(publicUrl.length + 1));

				const [updated] = yield* Effect.promise(() =>
					db
						.update(profiles)
						.set({
							avatarUrl,
							avatarOriginalUrl: originalUrl,
							avatarFrame: frame ?? null,
							updatedAt: new Date(),
						})
						.where(eq(profiles.userId, session.user.id))
						.returning(),
				);

				for (const key of oldKeys) {
					storageModule.deleteFile(key).catch(() => {});
				}

				return { avatarUrl: updated.avatarUrl };
			}),
		),
	);

export const uploadCoverFn = createServerFn({ method: "POST" })
	.inputValidator((data: { base64: string; contentType: string }) => {
		if (!data.base64) throw new Error("Image data is required");
		if (!data.contentType.startsWith("image/"))
			throw new Error("File must be an image");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const storageModule = yield* Effect.promise(
					() => import("#/lib/storage"),
				);
				const sharpModule = yield* Effect.promise(() => import("sharp"));
				const sharp = sharpModule.default;
				const session = yield* requireSessionEffect;

				const buffer = Buffer.from(data.base64, "base64");
				if (buffer.byteLength > MAX_COVER_BYTES) {
					return yield* Effect.fail(
						new ValidationError({
							message: "Cover photo must be under 10MB",
						}),
					);
				}

				const processed = yield* Effect.promise(() =>
					sharp(buffer)
						.resize(1500, 375, { fit: "cover", position: "centre" })
						.webp({ quality: 85 })
						.toBuffer(),
				);

				const key = `covers/${session.user.id}.webp`;
				const url = yield* Effect.promise(() =>
					storageModule.uploadFile(key, processed, "image/webp"),
				);

				const [updated] = yield* Effect.promise(() =>
					db
						.update(profiles)
						.set({ coverUrl: url, updatedAt: new Date() })
						.where(eq(profiles.userId, session.user.id))
						.returning(),
				);

				return { coverUrl: updated.coverUrl };
			}),
		),
	);

export const deleteAvatarFn = createServerFn({ method: "POST" }).handler(() =>
	Effect.runPromise(
		Effect.gen(function* () {
			const storageModule = yield* Effect.promise(
				() => import("#/lib/storage"),
			);
			const session = yield* requireSessionEffect;

			const [current] = yield* Effect.promise(() =>
				db
					.select({
						avatarUrl: profiles.avatarUrl,
						avatarOriginalUrl: profiles.avatarOriginalUrl,
					})
					.from(profiles)
					.where(eq(profiles.userId, session.user.id)),
			);

			const publicUrl = process.env.R2_PUBLIC_URL ?? "";
			const keysToDelete = [current?.avatarUrl, current?.avatarOriginalUrl]
				.filter((u): u is string => !!u && u.startsWith(publicUrl))
				.map((u) => u.slice(publicUrl.length + 1));

			for (const key of keysToDelete) {
				storageModule.deleteFile(key).catch(() => {});
			}

			yield* Effect.promise(() =>
				db
					.update(profiles)
					.set({
						avatarUrl: null,
						avatarOriginalUrl: null,
						updatedAt: new Date(),
					})
					.where(eq(profiles.userId, session.user.id)),
			);

			return { deleted: true };
		}),
	),
);

export const deleteCoverFn = createServerFn({ method: "POST" }).handler(() =>
	Effect.runPromise(
		Effect.gen(function* () {
			const storageModule = yield* Effect.promise(
				() => import("#/lib/storage"),
			);
			const session = yield* requireSessionEffect;

			yield* Effect.promise(() =>
				storageModule.deleteFile(`covers/${session.user.id}.webp`),
			);
			yield* Effect.promise(() =>
				db
					.update(profiles)
					.set({ coverUrl: null, updatedAt: new Date() })
					.where(eq(profiles.userId, session.user.id)),
			);

			return { deleted: true };
		}),
	),
);

export const addCertificationFn = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			name: string;
			organization: string;
			issueMonth?: string;
			issueYear?: string;
			expirationMonth?: string;
			expirationYear?: string;
			credentialId?: string;
			credentialUrl?: string;
		}) => {
			if (!data.name?.trim()) throw new Error("Name is required");
			if (!data.organization?.trim())
				throw new Error("Organization is required");
			return data;
		},
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const [cert] = yield* Effect.promise(() =>
					db
						.insert(certifications)
						.values({
							userId: session.user.id,
							name: data.name.trim(),
							organization: data.organization.trim(),
							issueDate:
								data.issueYear && data.issueMonth
									? new Date(
											Number(data.issueYear),
											Number(data.issueMonth) - 1,
										)
									: null,
							expirationDate:
								data.expirationYear && data.expirationMonth
									? new Date(
											Number(data.expirationYear),
											Number(data.expirationMonth) - 1,
										)
									: null,
							credentialId: data.credentialId?.trim() || null,
							credentialUrl: data.credentialUrl?.trim() || null,
						})
						.returning(),
				);
				return cert;
			}),
		),
	);

export const addProjectFn = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			name: string;
			description?: string;
			url?: string;
			startMonth?: string;
			startYear?: string;
			endMonth?: string;
			endYear?: string;
		}) => {
			if (!data.name?.trim()) throw new Error("Name is required");
			return data;
		},
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const [project] = yield* Effect.promise(() =>
					db
						.insert(projects)
						.values({
							userId: session.user.id,
							name: data.name.trim(),
							description: data.description?.trim() || null,
							url: data.url?.trim() || null,
							startDate:
								data.startYear && data.startMonth
									? new Date(
											Number(data.startYear),
											Number(data.startMonth) - 1,
										)
									: null,
							endDate:
								data.endYear && data.endMonth
									? new Date(Number(data.endYear), Number(data.endMonth) - 1)
									: null,
						})
						.returning(),
				);
				return project;
			}),
		),
	);

export const addVolunteeringFn = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			role: string;
			organization: string;
			cause?: string;
			startMonth?: string;
			startYear?: string;
			endMonth?: string;
			endYear?: string;
			description?: string;
		}) => {
			if (!data.role?.trim()) throw new Error("Role is required");
			if (!data.organization?.trim())
				throw new Error("Organization is required");
			return data;
		},
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const [vol] = yield* Effect.promise(() =>
					db
						.insert(volunteering)
						.values({
							userId: session.user.id,
							role: data.role.trim(),
							organization: data.organization.trim(),
							cause: data.cause?.trim() || null,
							startDate:
								data.startYear && data.startMonth
									? new Date(
											Number(data.startYear),
											Number(data.startMonth) - 1,
										)
									: null,
							endDate:
								data.endYear && data.endMonth
									? new Date(Number(data.endYear), Number(data.endMonth) - 1)
									: null,
							description: data.description?.trim() || null,
						})
						.returning(),
				);
				return vol;
			}),
		),
	);

export const addHonorFn = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			title: string;
			issuer?: string;
			issueMonth?: string;
			issueYear?: string;
			description?: string;
		}) => {
			if (!data.title?.trim()) throw new Error("Title is required");
			return data;
		},
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const [honor] = yield* Effect.promise(() =>
					db
						.insert(honors)
						.values({
							userId: session.user.id,
							title: data.title.trim(),
							issuer: data.issuer?.trim() || null,
							issueDate:
								data.issueYear && data.issueMonth
									? new Date(
											Number(data.issueYear),
											Number(data.issueMonth) - 1,
										)
									: null,
							description: data.description?.trim() || null,
						})
						.returning(),
				);
				return honor;
			}),
		),
	);

export const addLanguageFn = createServerFn({ method: "POST" })
	.inputValidator((data: { name: string; proficiency?: string }) => {
		if (!data.name?.trim()) throw new Error("Language name is required");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const [lang] = yield* Effect.promise(() =>
					db
						.insert(languages)
						.values({
							userId: session.user.id,
							name: data.name.trim(),
							proficiency: data.proficiency?.trim() || null,
						})
						.onConflictDoNothing()
						.returning(),
				);
				return lang ?? null;
			}),
		),
	);

export const searchSkillsFn = createServerFn({ method: "GET" })
	.inputValidator((data: { query: string; limit?: number }) => {
		if (!data.query || data.query.length < 1) throw new Error("Query required");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const results = yield* Effect.promise(() =>
					db
						.select({
							name: skills.name,
							dist: sql<number>`${skills.name} <-> ${data.query}`,
						})
						.from(skills)
						.where(sql`${skills.name} % ${data.query}`)
						.orderBy(sql`${skills.name} <-> ${data.query}`)
						.groupBy(skills.name)
						.limit(data.limit ?? 8),
				);

				return results.map((r) => r.name);
			}),
		),
	);

export const reorderSkillsFn = createServerFn({ method: "POST" })
	.inputValidator((data: { skillIds: string[] }) => {
		if (!data.skillIds || data.skillIds.length === 0)
			throw new Error("Skill IDs required");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const ops = data.skillIds.map((id, index) =>
					db
						.update(skills)
						.set({ ordering: index })
						.where(and(eq(skills.id, id), eq(skills.userId, session.user.id))),
				);
				yield* Effect.promise(() => Promise.all(ops));
				return { reordered: true };
			}),
		),
	);

export const reorderExperiencesFn = createServerFn({ method: "POST" })
	.inputValidator((data: { experienceIds: string[] }) => {
		if (!data.experienceIds || data.experienceIds.length === 0)
			throw new Error("Experience IDs required");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const ops = data.experienceIds.map((id, index) =>
					db
						.update(experiences)
						.set({ ordering: index })
						.where(
							and(
								eq(experiences.id, id),
								eq(experiences.userId, session.user.id),
							),
						),
				);
				yield* Effect.promise(() => Promise.all(ops));
				return { reordered: true };
			}),
		),
	);

export const updateEducationFn = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			id: string;
			school: string;
			degree?: string;
			field?: string;
			startDate?: string;
			endDate?: string;
			currentlyStudying?: boolean;
			description?: string;
		}) => {
			if (!data.id) throw new Error("id required");
			if (!data.school?.trim()) throw new Error("School required");
			return data;
		},
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const [updated] = yield* Effect.promise(() =>
					db
						.update(educations)
						.set({
							school: data.school.trim(),
							degree: data.degree?.trim() || null,
							field: data.field?.trim() || null,
							startDate: data.startDate ? new Date(data.startDate) : null,
							endDate: data.currentlyStudying
								? null
								: data.endDate
									? new Date(data.endDate)
									: null,
							description: data.description?.trim() || null,
						})
						.where(
							and(
								eq(educations.id, data.id),
								eq(educations.userId, session.user.id),
							),
						)
						.returning(),
				);
				return updated;
			}),
		),
	);

export const updateCertificationFn = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			id: string;
			name: string;
			organization: string;
			issueDate?: string;
			expirationDate?: string;
			credentialId?: string;
			credentialUrl?: string;
		}) => {
			if (!data.id) throw new Error("id required");
			if (!data.name?.trim()) throw new Error("Name required");
			if (!data.organization?.trim()) throw new Error("Organization required");
			return data;
		},
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const [updated] = yield* Effect.promise(() =>
					db
						.update(certifications)
						.set({
							name: data.name.trim(),
							organization: data.organization.trim(),
							issueDate: data.issueDate ? new Date(data.issueDate) : null,
							expirationDate: data.expirationDate
								? new Date(data.expirationDate)
								: null,
							credentialId: data.credentialId?.trim() || null,
							credentialUrl: data.credentialUrl?.trim() || null,
						})
						.where(
							and(
								eq(certifications.id, data.id),
								eq(certifications.userId, session.user.id),
							),
						)
						.returning(),
				);
				return updated;
			}),
		),
	);

export const updateProjectFn = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			id: string;
			name: string;
			description?: string;
			url?: string;
			startDate?: string;
			endDate?: string;
		}) => {
			if (!data.id) throw new Error("id required");
			if (!data.name?.trim()) throw new Error("Name required");
			return data;
		},
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const [updated] = yield* Effect.promise(() =>
					db
						.update(projects)
						.set({
							name: data.name.trim(),
							description: data.description?.trim() || null,
							url: data.url?.trim() || null,
							startDate: data.startDate ? new Date(data.startDate) : null,
							endDate: data.endDate ? new Date(data.endDate) : null,
						})
						.where(
							and(
								eq(projects.id, data.id),
								eq(projects.userId, session.user.id),
							),
						)
						.returning(),
				);
				return updated;
			}),
		),
	);

export const updateVolunteeringFn = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			id: string;
			role: string;
			organization: string;
			cause?: string;
			startDate?: string;
			endDate?: string;
			description?: string;
		}) => {
			if (!data.id) throw new Error("id required");
			if (!data.role?.trim()) throw new Error("Role required");
			if (!data.organization?.trim()) throw new Error("Organization required");
			return data;
		},
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const [updated] = yield* Effect.promise(() =>
					db
						.update(volunteering)
						.set({
							role: data.role.trim(),
							organization: data.organization.trim(),
							cause: data.cause?.trim() || null,
							startDate: data.startDate ? new Date(data.startDate) : null,
							endDate: data.endDate ? new Date(data.endDate) : null,
							description: data.description?.trim() || null,
						})
						.where(
							and(
								eq(volunteering.id, data.id),
								eq(volunteering.userId, session.user.id),
							),
						)
						.returning(),
				);
				return updated;
			}),
		),
	);

export const updateHonorFn = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			id: string;
			title: string;
			issuer?: string;
			issueDate?: string;
			description?: string;
		}) => {
			if (!data.id) throw new Error("id required");
			if (!data.title?.trim()) throw new Error("Title required");
			return data;
		},
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const [updated] = yield* Effect.promise(() =>
					db
						.update(honors)
						.set({
							title: data.title.trim(),
							issuer: data.issuer?.trim() || null,
							issueDate: data.issueDate ? new Date(data.issueDate) : null,
							description: data.description?.trim() || null,
						})
						.where(
							and(eq(honors.id, data.id), eq(honors.userId, session.user.id)),
						)
						.returning(),
				);
				return updated;
			}),
		),
	);

export const updateLanguageFn = createServerFn({ method: "POST" })
	.inputValidator(
		(data: { id: string; name: string; proficiency?: string }) => {
			if (!data.id) throw new Error("id required");
			if (!data.name?.trim()) throw new Error("Name required");
			return data;
		},
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const [updated] = yield* Effect.promise(() =>
					db
						.update(languages)
						.set({
							name: data.name.trim(),
							proficiency: data.proficiency?.trim() || null,
						})
						.where(
							and(
								eq(languages.id, data.id),
								eq(languages.userId, session.user.id),
							),
						)
						.returning(),
				);
				return updated;
			}),
		),
	);

export type PublicProfileData = NonNullable<
	Awaited<ReturnType<typeof getPublicProfileFn>>
>;

export const getPublicProfileFn = createServerFn({ method: "GET" })
	.inputValidator((data: { handle: string }) => {
		if (!data.handle) throw new Error("Handle is required");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const handle = data.handle.toLowerCase();

				const [row] = yield* Effect.promise(() =>
					db
						.select({
							profile: profiles,
							user: {
								id: users.id,
								name: users.name,
								image: users.image,
								identityVerifiedAt: users.identityVerifiedAt,
							},
						})
						.from(profiles)
						.innerJoin(users, eq(profiles.userId, users.id))
						.where(eq(profiles.handle, handle))
						.limit(1),
				);

				if (!row) return null;

				const userId = row.user.id;
				const [connectionCountResult] = yield* Effect.promise(() =>
					db
						.select({ count: count() })
						.from(connections)
						.where(
							and(
								or(
									eq(connections.requesterId, userId),
									eq(connections.addresseeId, userId),
								),
								eq(connections.status, "accepted"),
							),
						),
				);

				return {
					...row.profile,
					user: row.user,
					connectionCount: bucketConnectionCount(
						connectionCountResult?.count ?? 0,
					),
				};
			}),
		),
	);

export const getPublicProfileSectionsFn = createServerFn({ method: "GET" })
	.inputValidator((data: { userId: string }) => {
		if (!data.userId) throw new Error("userId is required");
		return data;
	})
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const userId = data.userId;
				const [
					userExperiences,
					userEducations,
					userSkills,
					userCertifications,
					userProjects,
					userVolunteering,
					userHonors,
					userLanguages,
				] = yield* Effect.promise(() =>
					Promise.all([
						db
							.select()
							.from(experiences)
							.where(eq(experiences.userId, userId))
							.orderBy(asc(experiences.ordering), desc(experiences.startDate)),
						db
							.select()
							.from(educations)
							.where(eq(educations.userId, userId))
							.orderBy(asc(educations.ordering)),
						db
							.select()
							.from(skills)
							.where(eq(skills.userId, userId))
							.orderBy(asc(skills.ordering)),
						db
							.select()
							.from(certifications)
							.where(eq(certifications.userId, userId))
							.orderBy(asc(certifications.ordering)),
						db
							.select()
							.from(projects)
							.where(eq(projects.userId, userId))
							.orderBy(asc(projects.ordering)),
						db
							.select()
							.from(volunteering)
							.where(eq(volunteering.userId, userId))
							.orderBy(asc(volunteering.ordering)),
						db
							.select()
							.from(honors)
							.where(eq(honors.userId, userId))
							.orderBy(asc(honors.ordering)),
						db
							.select()
							.from(languages)
							.where(eq(languages.userId, userId))
							.orderBy(asc(languages.ordering)),
					]),
				);

				return {
					experiences: userExperiences,
					educations: userEducations,
					skills: userSkills,
					certifications: userCertifications,
					projects: userProjects,
					volunteering: userVolunteering,
					honors: userHonors,
					languages: userLanguages,
				};
			}),
		),
	);

export const searchConnectionsFn = createServerFn({ method: "GET" })
	.inputValidator(
		(data: { query?: string; cursor?: string; limit?: number }) => ({
			query: data.query?.trim() ?? "",
			cursor: data.cursor,
			limit: Math.min(data.limit ?? 20, 50),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const userId = session.user.id;

				const conditions = [eq(connections.status, "accepted")];

				const query = data.query;
				if (query) {
					conditions.push(
						or(
							sql`${users.name} ILIKE ${`%${query}%`}`,
							sql`${profiles.handle} ILIKE ${`%${query}%`}`,
						)!,
					);
				}

				const cursor = data.cursor;
				if (cursor) {
					conditions.push(
						sql`${users.name} > (SELECT name FROM "user" WHERE id = ${cursor})`,
					);
				}

				const limit = data.limit;
				const rows = yield* Effect.promise(() =>
					db
						.select({
							userId: users.id,
							name: users.name,
							image: users.image,
							handle: profiles.handle,
							headline: profiles.headline,
						})
						.from(connections)
						.innerJoin(
							users,
							or(
								and(
									eq(connections.requesterId, userId),
									eq(users.id, connections.addresseeId),
								),
								and(
									eq(connections.addresseeId, userId),
									eq(users.id, connections.requesterId),
								),
							),
						)
						.leftJoin(profiles, eq(users.id, profiles.userId))
						.where(and(...conditions))
						.orderBy(asc(users.name))
						.limit(limit + 1),
				);

				const hasMore = rows.length > limit;
				const items = hasMore ? rows.slice(0, limit) : rows;

				return {
					connections: items,
					nextCursor: hasMore ? items[items.length - 1].userId : null,
				};
			}),
		),
	);
