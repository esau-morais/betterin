import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import {
	and,
	countDistinct,
	eq,
	gte,
	isNotNull,
	isNull,
	lt,
	or,
	sql,
} from "drizzle-orm";
import { Effect } from "effect";
import { z } from "zod";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db/index.server";
import {
	comments,
	feedEvents,
	posts,
	profiles,
	reactions,
	savedPosts,
	userPreferences,
	users,
} from "#/lib/db/schema";
import { ForbiddenError, NotFoundError } from "#/lib/effect-helpers";
import { verifyPostAuthorEffect } from "#/lib/server/post-analytics-helpers";
import { requireSessionEffect } from "#/lib/server/require-session";

function delta(current: number, previous: number): number | null {
	if (previous === 0) return current > 0 ? 100 : null;
	return Math.round(((current - previous) / previous) * 1000) / 10;
}

export const getPostImpressionCountFn = createServerFn({ method: "GET" })
	.inputValidator(z.object({ postId: z.string().min(1) }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const request = getRequest();
				const session = yield* Effect.promise(() =>
					auth.api.getSession({ headers: request.headers }),
				);
				const userId = session?.user?.id ?? null;

				const postId = data.postId;
				const [post] = yield* Effect.promise(() =>
					db
						.select({ authorId: posts.authorId })
						.from(posts)
						.where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
						.limit(1),
				);

				if (!post) {
					return yield* Effect.fail(new NotFoundError({ entity: "Post" }));
				}

				const isAuthor = userId === post.authorId;
				const authorId = post.authorId;

				if (!isAuthor) {
					const [prefs] = yield* Effect.promise(() =>
						db
							.select({
								showImpressionCount: userPreferences.showImpressionCount,
							})
							.from(userPreferences)
							.where(eq(userPreferences.userId, authorId))
							.limit(1),
					);

					if (!prefs?.showImpressionCount) {
						return { impressions: null, isAuthor: false };
					}
				}

				const [result] = yield* Effect.promise(() =>
					db
						.select({ count: sql<number>`count(*)::int` })
						.from(feedEvents)
						.where(
							and(
								eq(feedEvents.postId, postId),
								eq(feedEvents.action, "impression"),
							),
						),
				);

				return { impressions: result?.count ?? 0, isAuthor };
			}),
		),
	);

export const getPostAnalyticsFn = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			postId: z.string().min(1),
			days: z.number().int().positive().default(7),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const sessionUserId = session.user.id;
				const postId = data.postId;
				const days = data.days;

				const [post] = yield* Effect.promise(() =>
					db
						.select({
							id: posts.id,
							authorId: posts.authorId,
							content: posts.content,
							createdAt: posts.createdAt,
							authorName: users.name,
							authorImage: users.image,
							handle: profiles.handle,
						})
						.from(posts)
						.innerJoin(users, eq(posts.authorId, users.id))
						.leftJoin(profiles, eq(posts.authorId, profiles.userId))
						.where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
						.limit(1),
				);

				if (!post) {
					return yield* Effect.fail(new NotFoundError({ entity: "Post" }));
				}
				if (post.authorId !== sessionUserId) {
					return yield* Effect.fail(
						new ForbiddenError({
							message: "Only the post author can view analytics",
						}),
					);
				}

				const since = new Date();
				since.setDate(since.getDate() - days);

				const [
					impressionsResult,
					uniqueViewersResult,
					reactionsResult,
					reactionsByTypeResult,
					commentsResult,
					repostsResult,
					savesResult,
					sharesResult,
				] = yield* Effect.promise(() =>
					Promise.all([
						db
							.select({ count: sql<number>`count(*)::int` })
							.from(feedEvents)
							.where(
								and(
									eq(feedEvents.postId, postId),
									eq(feedEvents.action, "impression"),
									gte(feedEvents.createdAt, since),
								),
							),
						db
							.select({ count: countDistinct(feedEvents.userId) })
							.from(feedEvents)
							.where(
								and(
									eq(feedEvents.postId, postId),
									eq(feedEvents.action, "impression"),
									gte(feedEvents.createdAt, since),
								),
							),
						db
							.select({ count: sql<number>`count(*)::int` })
							.from(reactions)
							.where(
								and(
									eq(reactions.postId, postId),
									gte(reactions.createdAt, since),
								),
							),
						db
							.select({
								type: reactions.type,
								count: sql<number>`count(*)::int`,
							})
							.from(reactions)
							.where(
								and(
									eq(reactions.postId, postId),
									gte(reactions.createdAt, since),
								),
							)
							.groupBy(reactions.type),
						db
							.select({ count: sql<number>`count(*)::int` })
							.from(comments)
							.where(
								and(
									eq(comments.postId, postId),
									isNull(comments.deletedAt),
									gte(comments.createdAt, since),
								),
							),
						db
							.select({ count: sql<number>`count(*)::int` })
							.from(posts)
							.where(
								and(
									eq(posts.repostOfId, postId),
									isNull(posts.deletedAt),
									gte(posts.createdAt, since),
								),
							),
						db
							.select({ count: sql<number>`count(*)::int` })
							.from(savedPosts)
							.where(
								and(
									eq(savedPosts.postId, postId),
									gte(savedPosts.createdAt, since),
								),
							),
						db
							.select({ count: sql<number>`count(*)::int` })
							.from(feedEvents)
							.where(
								and(
									eq(feedEvents.postId, postId),
									eq(feedEvents.action, "share"),
									gte(feedEvents.createdAt, since),
								),
							),
					]),
				);

				const impressions = impressionsResult[0]?.count ?? 0;
				const uniqueViewers = uniqueViewersResult[0]?.count ?? 0;
				const reactionsCount = reactionsResult[0]?.count ?? 0;
				const commentsCount = commentsResult[0]?.count ?? 0;
				const repostsCount = repostsResult[0]?.count ?? 0;
				const savesCount = savesResult[0]?.count ?? 0;
				const sharesCount = sharesResult[0]?.count ?? 0;

				const previousSince = new Date();
				previousSince.setDate(previousSince.getDate() - days * 2);

				const [
					prevImpressionsResult,
					prevUniqueViewersResult,
					prevReactionsResult,
					prevCommentsResult,
					prevRepostsResult,
					prevSavesResult,
					prevSharesResult,
				] = yield* Effect.promise(() =>
					Promise.all([
						db
							.select({ count: sql<number>`count(*)::int` })
							.from(feedEvents)
							.where(
								and(
									eq(feedEvents.postId, postId),
									eq(feedEvents.action, "impression"),
									gte(feedEvents.createdAt, previousSince),
									lt(feedEvents.createdAt, since),
								),
							),
						db
							.select({ count: countDistinct(feedEvents.userId) })
							.from(feedEvents)
							.where(
								and(
									eq(feedEvents.postId, postId),
									eq(feedEvents.action, "impression"),
									gte(feedEvents.createdAt, previousSince),
									lt(feedEvents.createdAt, since),
								),
							),
						db
							.select({ count: sql<number>`count(*)::int` })
							.from(reactions)
							.where(
								and(
									eq(reactions.postId, postId),
									gte(reactions.createdAt, previousSince),
									lt(reactions.createdAt, since),
								),
							),
						db
							.select({ count: sql<number>`count(*)::int` })
							.from(comments)
							.where(
								and(
									eq(comments.postId, postId),
									isNull(comments.deletedAt),
									gte(comments.createdAt, previousSince),
									lt(comments.createdAt, since),
								),
							),
						db
							.select({ count: sql<number>`count(*)::int` })
							.from(posts)
							.where(
								and(
									eq(posts.repostOfId, postId),
									isNull(posts.deletedAt),
									gte(posts.createdAt, previousSince),
									lt(posts.createdAt, since),
								),
							),
						db
							.select({ count: sql<number>`count(*)::int` })
							.from(savedPosts)
							.where(
								and(
									eq(savedPosts.postId, postId),
									gte(savedPosts.createdAt, previousSince),
									lt(savedPosts.createdAt, since),
								),
							),
						db
							.select({ count: sql<number>`count(*)::int` })
							.from(feedEvents)
							.where(
								and(
									eq(feedEvents.postId, postId),
									eq(feedEvents.action, "share"),
									gte(feedEvents.createdAt, previousSince),
									lt(feedEvents.createdAt, since),
								),
							),
					]),
				);

				const prevImpressions = prevImpressionsResult[0]?.count ?? 0;
				const prevUniqueViewers = prevUniqueViewersResult[0]?.count ?? 0;
				const prevReactions = prevReactionsResult[0]?.count ?? 0;
				const prevComments = prevCommentsResult[0]?.count ?? 0;
				const prevReposts = prevRepostsResult[0]?.count ?? 0;
				const prevSaves = prevSavesResult[0]?.count ?? 0;
				const prevShares = prevSharesResult[0]?.count ?? 0;

				const totalEngagement =
					reactionsCount +
					commentsCount +
					repostsCount +
					savesCount +
					sharesCount;
				const engagementRate =
					impressions > 0
						? Math.round((totalEngagement / impressions) * 1000) / 10
						: 0;

				const prevTotalEngagement =
					prevReactions + prevComments + prevReposts + prevSaves + prevShares;
				const prevEngagementRate =
					prevImpressions > 0
						? Math.round((prevTotalEngagement / prevImpressions) * 1000) / 10
						: 0;

				return {
					post: {
						id: post.id,
						content: post.content,
						createdAt: post.createdAt.toISOString(),
						author: {
							name: post.authorName,
							image: post.authorImage,
							handle: post.handle,
						},
					},
					impressions,
					uniqueViewers,
					reactions: reactionsCount,
					reactionsByType: Object.fromEntries(
						reactionsByTypeResult.map((r) => [r.type, r.count]),
					),
					comments: commentsCount,
					reposts: repostsCount,
					saves: savesCount,
					shares: sharesCount,
					impressionsDelta: delta(impressions, prevImpressions),
					uniqueViewersDelta: delta(uniqueViewers, prevUniqueViewers),
					engagementRate,
					engagementRateDelta: delta(engagementRate, prevEngagementRate),
					reactionsDelta: delta(reactionsCount, prevReactions),
					commentsDelta: delta(commentsCount, prevComments),
					repostsDelta: delta(repostsCount, prevReposts),
					savesDelta: delta(savesCount, prevSaves),
					sharesDelta: delta(sharesCount, prevShares),
				};
			}),
		),
	);

export const getPostDailyImpressionsFn = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			postId: z.string().min(1),
			days: z.number().int().positive().default(7),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const postId = data.postId;
				const sessionUserId = session.user.id;

				yield* verifyPostAuthorEffect(postId, sessionUserId);

				const since = new Date();
				since.setDate(since.getDate() - data.days);

				const dailyImpressions = yield* Effect.promise(() =>
					db
						.select({
							date: sql<string>`date_trunc('day', ${feedEvents.createdAt})::date::text`,
							count: sql<number>`count(*)::int`,
						})
						.from(feedEvents)
						.where(
							and(
								eq(feedEvents.postId, postId),
								eq(feedEvents.action, "impression"),
								gte(feedEvents.createdAt, since),
							),
						)
						.groupBy(sql`date_trunc('day', ${feedEvents.createdAt})`)
						.orderBy(sql`date_trunc('day', ${feedEvents.createdAt})`),
				);

				return { dailyImpressions };
			}),
		),
	);

export const exportPostAnalyticsFn = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			postId: z.string().min(1),
			days: z.number().int().positive().default(7),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const postId = data.postId;
				const sessionUserId = session.user.id;

				const [post] = yield* Effect.promise(() =>
					db
						.select({
							authorId: posts.authorId,
							content: posts.content,
							createdAt: posts.createdAt,
						})
						.from(posts)
						.where(eq(posts.id, postId))
						.limit(1),
				);

				if (!post) {
					return yield* Effect.fail(new NotFoundError({ entity: "Post" }));
				}
				if (post.authorId !== sessionUserId) {
					return yield* Effect.fail(
						new ForbiddenError({
							message: "Only the post author can export analytics",
						}),
					);
				}

				const since = new Date();
				since.setDate(since.getDate() - data.days);

				const dailyData = yield* Effect.promise(() =>
					db
						.select({
							date: sql<string>`date_trunc('day', ${feedEvents.createdAt})::date::text`,
							impressions: sql<number>`count(*) filter (where ${feedEvents.action} = 'impression')::int`,
							shares: sql<number>`count(*) filter (where ${feedEvents.action} = 'share')::int`,
						})
						.from(feedEvents)
						.where(
							and(
								eq(feedEvents.postId, postId),
								gte(feedEvents.createdAt, since),
							),
						)
						.groupBy(sql`date_trunc('day', ${feedEvents.createdAt})`)
						.orderBy(sql`date_trunc('day', ${feedEvents.createdAt})`),
				);

				const header = "Date,Impressions,Shares";
				const rows = dailyData.map(
					(d) => `${d.date},${d.impressions},${d.shares}`,
				);
				const csv = [header, ...rows].join("\n");

				return {
					csv,
					filename: `post-analytics-${postId.slice(0, 8)}-${data.days}d.csv`,
				};
			}),
		),
	);

export const getPostHourlyActivityFn = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			postId: z.string().min(1),
			days: z.number().int().positive().default(7),
			timezone: z.string().default("UTC"),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const postId = data.postId;
				const sessionUserId = session.user.id;

				yield* verifyPostAuthorEffect(postId, sessionUserId);

				const since = new Date();
				since.setDate(since.getDate() - data.days);

				const tz = data.timezone.replace(/[^a-zA-Z0-9/_+-]/g, "");
				const tzLiteral = sql.raw(`'${tz}'`);
				const dowExpr = sql`extract(dow from (${feedEvents.createdAt} at time zone 'UTC') at time zone ${tzLiteral})`;
				const hourExpr = sql`extract(hour from (${feedEvents.createdAt} at time zone 'UTC') at time zone ${tzLiteral})`;

				const rows = yield* Effect.promise(() =>
					db
						.select({
							dow: sql<number>`${dowExpr}::int`,
							hour: sql<number>`${hourExpr}::int`,
							count: sql<number>`count(*)::int`,
						})
						.from(feedEvents)
						.where(
							and(
								eq(feedEvents.postId, postId),
								eq(feedEvents.action, "impression"),
								gte(feedEvents.createdAt, since),
							),
						)
						.groupBy(dowExpr, hourExpr),
				);

				return { activity: rows };
			}),
		),
	);

export const getPostViewerLocationsFn = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			postId: z.string().min(1),
			days: z.number().int().positive().default(7),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const postId = data.postId;
				const sessionUserId = session.user.id;

				yield* verifyPostAuthorEffect(postId, sessionUserId);

				const since = new Date();
				since.setDate(since.getDate() - data.days);

				const [totalResult] = yield* Effect.promise(() =>
					db
						.select({
							count: sql<number>`count(distinct ${feedEvents.userId})::int`,
						})
						.from(feedEvents)
						.where(
							and(
								eq(feedEvents.postId, postId),
								eq(feedEvents.action, "impression"),
								gte(feedEvents.createdAt, since),
							),
						),
				);
				const totalViewers = totalResult?.count ?? 0;

				const rows = yield* Effect.promise(() =>
					db
						.select({
							location: profiles.location,
							lat: profiles.locationLat,
							lon: profiles.locationLon,
							count: sql<number>`count(distinct ${feedEvents.userId})::int`,
						})
						.from(feedEvents)
						.innerJoin(profiles, eq(feedEvents.userId, profiles.userId))
						.leftJoin(
							userPreferences,
							eq(feedEvents.userId, userPreferences.userId),
						)
						.where(
							and(
								eq(feedEvents.postId, postId),
								eq(feedEvents.action, "impression"),
								gte(feedEvents.createdAt, since),
								isNotNull(profiles.location),
								or(
									eq(userPreferences.shareLocationInAnalytics, true),
									isNull(userPreferences.shareLocationInAnalytics),
								),
							),
						)
						.groupBy(
							profiles.location,
							profiles.locationLat,
							profiles.locationLon,
						)
						.orderBy(sql`count(distinct ${feedEvents.userId}) desc`)
						.limit(20),
				);

				const total = rows.reduce((sum, r) => sum + r.count, 0);
				return {
					totalViewers,
					locations: rows.map((r) => ({
						location: r.location ?? "",
						lat: r.lat,
						lon: r.lon,
						count: r.count,
						percentage:
							total > 0 ? Math.round((r.count / total) * 1000) / 10 : 0,
					})),
				};
			}),
		),
	);

export const getPostDwellDistributionFn = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			postId: z.string().min(1),
			days: z.number().int().positive().default(7),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const postId = data.postId;
				const sessionUserId = session.user.id;

				yield* verifyPostAuthorEffect(postId, sessionUserId);

				const since = new Date();
				since.setDate(since.getDate() - data.days);

				const rows = yield* Effect.promise(() =>
					db
						.select({
							bucket: feedEvents.dwellBucket,
							count: sql<number>`count(*)::int`,
						})
						.from(feedEvents)
						.where(
							and(
								eq(feedEvents.postId, postId),
								eq(feedEvents.action, "impression"),
								isNotNull(feedEvents.dwellBucket),
								gte(feedEvents.createdAt, since),
							),
						)
						.groupBy(feedEvents.dwellBucket),
				);

				const total = rows.reduce((sum, r) => sum + r.count, 0);
				const BUCKET_ORDER = ["lt_2s", "2s_5s", "5s_15s", "15s_30s", "gt_30s"];
				const BUCKET_LABELS: Record<string, string> = {
					lt_2s: "< 2s",
					"2s_5s": "2-5s",
					"5s_15s": "5-15s",
					"15s_30s": "15-30s",
					gt_30s: "30s+",
				};

				return {
					distribution: BUCKET_ORDER.map((bucket) => {
						const row = rows.find((r) => r.bucket === bucket);
						const count = row?.count ?? 0;
						return {
							bucket,
							label: BUCKET_LABELS[bucket] ?? bucket,
							count,
							percentage:
								total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
						};
					}),
				};
			}),
		),
	);

export const getPostFeedContextFn = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			postId: z.string().min(1),
			days: z.number().int().positive().default(7),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const postId = data.postId;
				const sessionUserId = session.user.id;

				yield* verifyPostAuthorEffect(postId, sessionUserId);

				const since = new Date();
				since.setDate(since.getDate() - data.days);

				const rows = yield* Effect.promise(() =>
					db
						.select({
							mode: feedEvents.feedMode,
							count: sql<number>`count(*)::int`,
						})
						.from(feedEvents)
						.where(
							and(
								eq(feedEvents.postId, postId),
								eq(feedEvents.action, "impression"),
								isNotNull(feedEvents.feedMode),
								gte(feedEvents.createdAt, since),
							),
						)
						.groupBy(feedEvents.feedMode),
				);

				const ranked = rows.find((r) => r.mode === "ranked")?.count ?? 0;
				const chronological =
					rows.find((r) => r.mode === "chronological")?.count ?? 0;
				const total = ranked + chronological;

				return {
					ranked,
					chronological,
					rankedPercentage:
						total > 0 ? Math.round((ranked / total) * 1000) / 10 : 0,
					chronologicalPercentage:
						total > 0 ? Math.round((chronological / total) * 1000) / 10 : 0,
				};
			}),
		),
	);

export const getPostEngagementTrendFn = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			postId: z.string().min(1),
			days: z.number().int().positive().default(7),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const postId = data.postId;
				const sessionUserId = session.user.id;

				yield* verifyPostAuthorEffect(postId, sessionUserId);

				const since = new Date();
				since.setDate(since.getDate() - data.days);

				const rows = yield* Effect.promise(() =>
					db
						.select({
							date: sql<string>`date_trunc('day', ${feedEvents.createdAt})::date::text`,
							reactions: sql<number>`count(*) filter (where ${feedEvents.action} = 'like')::int`,
							comments: sql<number>`count(*) filter (where ${feedEvents.action} = 'comment')::int`,
							shares: sql<number>`count(*) filter (where ${feedEvents.action} = 'share')::int`,
						})
						.from(feedEvents)
						.where(
							and(
								eq(feedEvents.postId, postId),
								gte(feedEvents.createdAt, since),
								sql`${feedEvents.action} in ('like', 'comment', 'share')`,
							),
						)
						.groupBy(sql`date_trunc('day', ${feedEvents.createdAt})`)
						.orderBy(sql`date_trunc('day', ${feedEvents.createdAt})`),
				);

				return { trend: rows };
			}),
		),
	);
