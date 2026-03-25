import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { Effect } from "effect";
import { db } from "#/lib/db/index.server";
import { connections, jobs, posts, profiles, users } from "#/lib/db/schema";
import { requireSessionEffect } from "#/lib/server/require-session";
import type { JobResult, PersonResult, PostResult } from "#/lib/server/search";

const LATEST_JOBS_LIMIT = 3;
const SUGGESTED_PEOPLE_LIMIT = 6;
const NETWORK_POSTS_LIMIT = 3;

export const getLatestJobsFn = createServerFn({ method: "GET" }).handler(
	(): Promise<{ results: JobResult[] }> =>
		Effect.runPromise(
			Effect.gen(function* () {
				yield* requireSessionEffect;

				const rows = yield* Effect.promise(() =>
					db
						.select({
							id: jobs.id,
							title: jobs.title,
							company: jobs.company,
							location: jobs.location,
							remote: jobs.remote,
							salaryMin: jobs.salaryMin,
							salaryMax: jobs.salaryMax,
							currency: jobs.currency,
							tags: jobs.tags,
							createdAt: jobs.createdAt,
							expiresAt: jobs.expiresAt,
						})
						.from(jobs)
						.where(and(eq(jobs.status, "open"), sql`${jobs.expiresAt} > now()`))
						.orderBy(sql`${jobs.createdAt} DESC`)
						.limit(LATEST_JOBS_LIMIT),
				);

				return {
					results: rows.map((r) => ({
						id: r.id,
						title: r.title,
						company: r.company,
						location: r.location,
						remote: r.remote,
						salaryMin: r.salaryMin,
						salaryMax: r.salaryMax,
						currency: r.currency,
						tags: Array.isArray(r.tags) ? r.tags : [],
						createdAt: r.createdAt.toISOString(),
						expiresAt: r.expiresAt.toISOString(),
					})),
				};
			}),
		),
);

export const getSuggestedPeopleFn = createServerFn({ method: "GET" }).handler(
	(): Promise<{ results: PersonResult[] }> =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const userId = session.user.id;

				const connectionRows = yield* Effect.promise(() =>
					db
						.select({ id: connections.requesterId })
						.from(connections)
						.where(
							and(
								eq(connections.addresseeId, userId),
								eq(connections.status, "accepted"),
							),
						)
						.union(
							db
								.select({ id: connections.addresseeId })
								.from(connections)
								.where(
									and(
										eq(connections.requesterId, userId),
										eq(connections.status, "accepted"),
									),
								),
						),
				);

				const connectionIdSet = new Set(connectionRows.map((r) => r.id));
				const connectionIdArray = [...connectionIdSet];

				if (connectionIdArray.length === 0) {
					const rows = yield* Effect.promise(() =>
						db
							.select({
								id: users.id,
								name: users.name,
								handle: profiles.handle,
								headline: profiles.headline,
								avatarUrl: profiles.avatarUrl,
								avatarFrame: profiles.avatarFrame,
								location: profiles.location,
								openToWork: profiles.openToWork,
							})
							.from(users)
							.innerJoin(profiles, eq(users.id, profiles.userId))
							.where(sql`${users.id} != ${userId}`)
							.orderBy(sql`${users.createdAt} DESC`)
							.limit(SUGGESTED_PEOPLE_LIMIT),
					);

					return {
						results: rows.map((r) => ({
							id: r.id,
							name: r.name,
							handle: r.handle,
							headline: r.headline,
							avatarUrl: r.avatarUrl ?? null,
							avatarFrame: r.avatarFrame ?? null,
							isConnection: false,
							location: r.location,
							openToWork: r.openToWork ?? false,
						})),
					};
				}

				const allConnectionPairRows = yield* Effect.promise(() =>
					db
						.select({ id: connections.requesterId })
						.from(connections)
						.where(
							and(
								eq(connections.addresseeId, userId),
								or(
									eq(connections.status, "accepted"),
									eq(connections.status, "pending"),
								),
							),
						)
						.union(
							db
								.select({ id: connections.addresseeId })
								.from(connections)
								.where(
									and(
										eq(connections.requesterId, userId),
										or(
											eq(connections.status, "accepted"),
											eq(connections.status, "pending"),
										),
									),
								),
						),
				);

				const excludeIds = new Set(allConnectionPairRows.map((r) => r.id));
				excludeIds.add(userId);
				const excludeArray = [...excludeIds];

				const rows = yield* Effect.promise(() =>
					db.execute<{
						id: string;
						name: string;
						handle: string | null;
						headline: string | null;
						avatar_url: string | null;
						avatar_frame: string | null;
						location: string | null;
						open_to_work: boolean;
						shared_count: number;
					}>(sql`
						SELECT
							u.id,
							u.name,
							p.handle,
							p.headline,
							p.avatar_url,
							p.avatar_frame,
							p.location,
							p.open_to_work,
							count(*) AS shared_count
						FROM connections c1
						JOIN connections c2 ON (
							(c2.requester_id = c1.addressee_id AND c2.addressee_id != c1.requester_id)
							OR
							(c2.addressee_id = c1.requester_id AND c2.requester_id != c1.addressee_id)
						)
						JOIN users u ON u.id = CASE
							WHEN c2.requester_id = c1.addressee_id THEN c2.addressee_id
							WHEN c2.requester_id = c1.requester_id THEN c2.addressee_id
							WHEN c2.addressee_id = c1.addressee_id THEN c2.requester_id
							ELSE c2.requester_id
						END
						JOIN profiles p ON p.user_id = u.id
						WHERE (
							(c1.requester_id = ${userId} AND c1.status = 'accepted')
							OR
							(c1.addressee_id = ${userId} AND c1.status = 'accepted')
						)
						AND c2.status = 'accepted'
						AND u.id != ALL(ARRAY[${sql.join(
							excludeArray.map((id) => sql`${id}`),
							sql`, `,
						)}]::text[])
						GROUP BY u.id, u.name, p.handle, p.headline, p.avatar_url, p.avatar_frame, p.location, p.open_to_work
						ORDER BY shared_count DESC, u.created_at DESC
						LIMIT ${SUGGESTED_PEOPLE_LIMIT}
					`),
				);

				return {
					results: rows.map((r) => ({
						id: r.id,
						name: r.name,
						handle: r.handle,
						headline: r.headline,
						avatarUrl: r.avatar_url ?? null,
						avatarFrame: r.avatar_frame ?? null,
						isConnection: false,
						location: r.location,
						openToWork: r.open_to_work ?? false,
						sharedCount: Number(r.shared_count),
					})),
				};
			}),
		),
);

export const getNetworkPostsFn = createServerFn({ method: "GET" }).handler(
	(): Promise<{ results: PostResult[] }> =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const userId = session.user.id;

				const connectionRows = yield* Effect.promise(() =>
					db
						.select({ id: connections.requesterId })
						.from(connections)
						.where(
							and(
								eq(connections.addresseeId, userId),
								eq(connections.status, "accepted"),
							),
						)
						.union(
							db
								.select({ id: connections.addresseeId })
								.from(connections)
								.where(
									and(
										eq(connections.requesterId, userId),
										eq(connections.status, "accepted"),
									),
								),
						),
				);

				const connectionIdArray = connectionRows.map((r) => r.id);

				if (connectionIdArray.length === 0) {
					const rows = yield* Effect.promise(() =>
						db
							.select({
								id: posts.id,
								content: posts.content,
								createdAt: posts.createdAt,
								authorId: users.id,
								authorName: users.name,
								handle: profiles.handle,
								avatarUrl: profiles.avatarUrl,
								avatarFrame: profiles.avatarFrame,
								headline: profiles.headline,
							})
							.from(posts)
							.innerJoin(users, eq(posts.authorId, users.id))
							.leftJoin(profiles, eq(posts.authorId, profiles.userId))
							.where(
								and(eq(posts.visibility, "public"), isNull(posts.deletedAt)),
							)
							.orderBy(sql`${posts.createdAt} DESC`)
							.limit(NETWORK_POSTS_LIMIT),
					);

					return {
						results: rows.map((r) => ({
							id: r.id,
							content: r.content,
							createdAt: r.createdAt.toISOString(),
							author: {
								id: r.authorId,
								name: r.authorName,
								handle: r.handle,
								avatarUrl: r.avatarUrl ?? null,
								avatarFrame: r.avatarFrame ?? null,
								headline: r.headline,
							},
						})),
					};
				}

				const rows = yield* Effect.promise(() =>
					db
						.select({
							id: posts.id,
							content: posts.content,
							createdAt: posts.createdAt,
							authorId: users.id,
							authorName: users.name,
							handle: profiles.handle,
							avatarUrl: profiles.avatarUrl,
							avatarFrame: profiles.avatarFrame,
							headline: profiles.headline,
						})
						.from(posts)
						.innerJoin(users, eq(posts.authorId, users.id))
						.leftJoin(profiles, eq(posts.authorId, profiles.userId))
						.where(
							and(
								isNull(posts.deletedAt),
								or(
									eq(posts.visibility, "public"),
									eq(posts.visibility, "connections"),
								),
								sql`${posts.authorId} = ANY(ARRAY[${sql.join(
									connectionIdArray.map((id) => sql`${id}`),
									sql`, `,
								)}]::text[])`,
							),
						)
						.orderBy(sql`${posts.createdAt} DESC`)
						.limit(NETWORK_POSTS_LIMIT),
				);

				return {
					results: rows.map((r) => ({
						id: r.id,
						content: r.content,
						createdAt: r.createdAt.toISOString(),
						author: {
							id: r.authorId,
							name: r.authorName,
							handle: r.handle,
							avatarUrl: r.avatarUrl ?? null,
							avatarFrame: r.avatarFrame ?? null,
							headline: r.headline,
						},
					})),
				};
			}),
		),
);
