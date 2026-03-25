import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { Effect } from "effect";
import { z } from "zod";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db/index.server";
import {
	commentReactions,
	comments,
	connections,
	feedEvents,
	follows,
	hiddenPosts,
	mutedAuthors,
	posts,
	profiles,
	reactions,
	savedPosts,
	userPreferences,
	users,
} from "#/lib/db/schema";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
	ValidationError,
} from "#/lib/effect-helpers";
import {
	type ConnectionDegree,
	type FeedSource,
	rankFeed,
} from "#/lib/feed-ranking";
import { isInMLBucket } from "#/lib/ml-ab-test";
import { isCircuitClosed } from "#/lib/ml-circuit-breaker";
import {
	enrichPosts,
	fetchPool2NetworkActivity,
	fetchPool3Extended,
	fetchPool4Discovery,
	handleChronological,
	type PoolCandidate,
	type PostRow,
} from "#/lib/server/feed-helpers";
import { rankFeedML } from "#/lib/server/feed-ml";
import { cachePostAuthor } from "#/lib/server/ml-realtime-hook";
import { createNotification } from "#/lib/server/notifications-helpers";
import { requireSessionEffect } from "#/lib/server/require-session";
import {
	feedModeSchema,
	postContentFormatSchema,
	postVisibilitySchema,
	reactionTypeSchema,
} from "#/lib/validation";

const PAGE_SIZE = 20;
const CANDIDATE_MULTIPLIER = 5;

const POOL_2_WINDOW_DAYS = 7;
const POOL_3_WINDOW_DAYS = 3;
const POOL_4_WINDOW_DAYS = 3;

export type FeedPost = Awaited<ReturnType<typeof getFeedFn>>["posts"][number];

export const getFeedFn = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			cursor: z.string().optional(),
			feedMode: feedModeSchema.optional(),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const userId = session.user.id;

				const [
					prefs,
					connectionRows,
					followRows,
					hiddenPostIds,
					mutedAuthorIds,
					savedPostIds,
				] = yield* Effect.promise(() =>
					Promise.all([
						db
							.select({ feedMode: userPreferences.feedMode })
							.from(userPreferences)
							.where(eq(userPreferences.userId, userId))
							.limit(1)
							.then((rows) => rows[0] ?? null),
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
						db
							.select({ id: follows.followedId })
							.from(follows)
							.where(eq(follows.followerId, userId)),
						db
							.select({ postId: hiddenPosts.postId })
							.from(hiddenPosts)
							.where(eq(hiddenPosts.userId, userId))
							.then((rows) => new Set(rows.map((r) => r.postId))),
						db
							.select({ mutedUserId: mutedAuthors.mutedUserId })
							.from(mutedAuthors)
							.where(eq(mutedAuthors.userId, userId))
							.then((rows) => new Set(rows.map((r) => r.mutedUserId))),
						db
							.select({ postId: savedPosts.postId })
							.from(savedPosts)
							.where(eq(savedPosts.userId, userId))
							.then((rows) => new Set(rows.map((r) => r.postId))),
					]),
				);

				const feedMode = data.feedMode ?? prefs?.feedMode ?? "ranked";

				const connectionIdSet = new Set(connectionRows.map((r) => r.id));
				const followIdSet = new Set(followRows.map((r) => r.id));

				const networkAuthorIds = new Set([
					userId,
					...connectionIdSet,
					...followIdSet,
				]);
				for (const mutedId of mutedAuthorIds) {
					networkAuthorIds.delete(mutedId);
				}

				const networkAuthorIdArray = [...networkAuthorIds];
				const connectionIdArray = [...connectionIdSet];

				const isChronological = feedMode === "chronological";

				if (isChronological) {
					return yield* Effect.promise(() =>
						handleChronological(
							userId,
							networkAuthorIdArray,
							hiddenPostIds,
							savedPostIds,
							data.cursor,
						),
					);
				}

				const cursorCondition = data.cursor
					? lt(posts.createdAt, new Date(data.cursor))
					: undefined;

				const fetchLimit = PAGE_SIZE * CANDIDATE_MULTIPLIER;

				const [pool1Rows, pool2Results, pool3Rows, pool4Rows] =
					yield* Effect.promise(() =>
						Promise.all([
							networkAuthorIdArray.length > 0
								? db
										.select({
											id: posts.id,
											content: posts.content,
											contentFormat: posts.contentFormat,
											contentHtml: posts.contentHtml,
											mediaUrls: posts.mediaUrls,
											visibility: posts.visibility,
											qualityScore: posts.qualityScore,
											createdAt: posts.createdAt,
											authorId: posts.authorId,
											authorName: users.name,
											authorImage: users.image,
											handle: profiles.handle,
											headline: profiles.headline,
											avatarFrame: profiles.avatarFrame,
											repostOfId: posts.repostOfId,
											quotedPostId: posts.quotedPostId,
										})
										.from(posts)
										.innerJoin(users, eq(posts.authorId, users.id))
										.leftJoin(profiles, eq(posts.authorId, profiles.userId))
										.where(
											and(
												isNull(posts.deletedAt),
												inArray(posts.authorId, networkAuthorIdArray),
												or(
													eq(posts.visibility, "public"),
													eq(posts.authorId, userId),
													eq(posts.visibility, "connections"),
												),
												cursorCondition,
											),
										)
										.orderBy(desc(posts.createdAt))
										.limit(fetchLimit)
								: ([] as PostRow[]),

							connectionIdArray.length > 0
								? fetchPool2NetworkActivity(
										connectionIdArray,
										networkAuthorIds,
										mutedAuthorIds,
										POOL_2_WINDOW_DAYS,
									)
								: ([] as Array<
										PostRow & {
											actorId: string;
											actorName: string;
											interactorCount: number;
										}
									>),

							connectionIdArray.length > 0
								? fetchPool3Extended(
										connectionIdArray,
										networkAuthorIds,
										mutedAuthorIds,
										POOL_3_WINDOW_DAYS,
									)
								: ([] as PostRow[]),

							fetchPool4Discovery(
								networkAuthorIds,
								mutedAuthorIds,
								POOL_4_WINDOW_DAYS,
							),
						]),
					);

				const allCandidates: PoolCandidate[] = [];
				const seenPostIds = new Set<string>();

				for (const row of pool1Rows) {
					if (hiddenPostIds.has(row.id)) continue;
					seenPostIds.add(row.id);
					allCandidates.push({
						...(row as PostRow),
						source: { type: "network" },
					});
				}

				for (const row of pool2Results) {
					if (seenPostIds.has(row.id) || hiddenPostIds.has(row.id)) continue;
					seenPostIds.add(row.id);
					allCandidates.push({
						id: row.id,
						content: row.content,
						contentFormat: row.contentFormat,
						contentHtml: row.contentHtml,
						mediaUrls: row.mediaUrls,
						visibility: row.visibility,
						qualityScore: row.qualityScore,
						createdAt: row.createdAt,
						authorId: row.authorId,
						authorName: row.authorName,
						authorImage: row.authorImage,
						handle: row.handle,
						headline: row.headline,
						avatarFrame: row.avatarFrame,
						repostOfId: row.repostOfId,
						quotedPostId: row.quotedPostId,
						source: {
							type: "activity",
							actorId: row.actorId,
							actorName: row.actorName,
							action: "liked",
						},
						networkInteractorCount: row.interactorCount,
					});
				}

				for (const row of pool3Rows) {
					if (seenPostIds.has(row.id) || hiddenPostIds.has(row.id)) continue;
					seenPostIds.add(row.id);
					allCandidates.push({
						...(row as PostRow),
						source: { type: "extended" },
					});
				}

				for (const row of pool4Rows) {
					if (seenPostIds.has(row.id) || hiddenPostIds.has(row.id)) continue;
					seenPostIds.add(row.id);
					allCandidates.push({
						...(row as PostRow),
						source: { type: "discovery" },
					});
				}

				if (allCandidates.length === 0) {
					return {
						posts: [],
						nextCursor: null,
						feedMode,
						rankingScores: undefined,
						rankingStage: "rule_v1" as const,
					};
				}

				const authorIdsInCandidates = [
					...new Set(allCandidates.map((r) => r.authorId)),
				];
				const candidatePostIds = allCandidates.map((r) => r.id);

				const [interactionCounts, discussionStats, reactionCountStats] =
					yield* Effect.promise(() =>
						Promise.all([
							authorIdsInCandidates.length > 0
								? db
										.select({
											postAuthorId: posts.authorId,
											count: sql<number>`count(*)::int`,
										})
										.from(feedEvents)
										.innerJoin(posts, eq(feedEvents.postId, posts.id))
										.where(
											and(
												eq(feedEvents.userId, userId),
												inArray(posts.authorId, authorIdsInCandidates),
												inArray(feedEvents.action, [
													"like",
													"comment",
													"share",
													"save",
												]),
											),
										)
										.groupBy(posts.authorId)
								: [],

							candidatePostIds.length > 0
								? db
										.select({
											postId: comments.postId,
											distinctCommenters: sql<number>`count(DISTINCT ${comments.authorId})::int`,
											meaningfulCommentCount: sql<number>`count(DISTINCT ${comments.authorId}) FILTER (WHERE length(${comments.content}) >= 50)::int`,
										})
										.from(comments)
										.innerJoin(posts, eq(comments.postId, posts.id))
										.where(
											and(
												inArray(comments.postId, candidatePostIds),
												isNull(comments.deletedAt),
												sql`${comments.authorId} != ${posts.authorId}`,
											),
										)
										.groupBy(comments.postId)
								: [],

							candidatePostIds.length > 0
								? db
										.select({
											postId: reactions.postId,
											count: sql<number>`count(*)::int`,
										})
										.from(reactions)
										.where(inArray(reactions.postId, candidatePostIds))
										.groupBy(reactions.postId)
								: [],
						]),
					);

				const interactionMap = new Map(
					interactionCounts.map((r) => [r.postAuthorId, r.count]),
				);
				const discussionMap = new Map(
					discussionStats.map((r) => [
						r.postId,
						{
							distinctCommenters: r.distinctCommenters,
							meaningfulCommentCount: r.meaningfulCommentCount,
						},
					]),
				);
				const reactionCountMap = new Map(
					reactionCountStats.map((r) => [r.postId, r.count]),
				);

				const rankingCandidates = allCandidates.map((r) => {
					let connectionDegree: ConnectionDegree = "none";
					if (r.authorId === userId) connectionDegree = "self";
					else if (connectionIdSet.has(r.authorId))
						connectionDegree = "connection";
					else if (followIdSet.has(r.authorId)) connectionDegree = "follow";

					const discussion = discussionMap.get(r.id);

					return {
						postId: r.id,
						authorId: r.authorId,
						createdAt: r.createdAt.toISOString(),
						qualityScore: r.qualityScore,
						connectionDegree,
						interactionCount: interactionMap.get(r.authorId) ?? 0,
						source: r.source,
						networkInteractorCount: r.networkInteractorCount,
						distinctCommenters: discussion?.distinctCommenters ?? 0,
						meaningfulCommentCount: discussion?.meaningfulCommentCount ?? 0,
						reactionCount: reactionCountMap.get(r.id) ?? 0,
					};
				});

				const useML =
					feedMode === "ranked" &&
					(yield* Effect.promise(() => isInMLBucket(userId))) &&
					(yield* Effect.promise(() => isCircuitClosed()));

				const ranked = useML
					? ((yield* Effect.promise(() =>
							rankFeedML(rankingCandidates, userId, PAGE_SIZE),
						)) ?? rankFeed(rankingCandidates, PAGE_SIZE))
					: rankFeed(rankingCandidates, PAGE_SIZE);

				const rankedIds = ranked.map((r) => r.postId);
				const rankedOrder = new Map(rankedIds.map((id, i) => [id, i]));
				const rankedSourceMap = new Map(
					ranked.map((r) => [r.postId, r.source]),
				);

				const postsSlice = allCandidates
					.filter((r) => rankedOrder.has(r.id))
					.sort((a, b) => rankedOrder.get(a.id)! - rankedOrder.get(b.id)!);

				const rankingScores = ranked.map((r) => r.score);
				const hasMore = allCandidates.length >= fetchLimit;

				const feedPosts = yield* Effect.promise(() =>
					enrichPosts(postsSlice, userId, savedPostIds, rankedSourceMap),
				);

				for (const p of postsSlice) {
					cachePostAuthor(p.id, p.authorId);
				}

				return {
					posts: feedPosts,
					nextCursor: hasMore
						? postsSlice[postsSlice.length - 1].createdAt.toISOString()
						: null,
					feedMode,
					rankingScores,
					rankingStage: useML ? ("ml_v1" as const) : ("rule_v1" as const),
				};
			}),
		),
	);

export const getPostByIdFn = createServerFn({ method: "GET" })
	.inputValidator(z.object({ postId: z.string().min(1) }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const request = getRequest();
				const session = yield* Effect.promise(() =>
					auth.api.getSession({ headers: request.headers }),
				);
				const userId = session?.user?.id ?? null;

				const [row] = yield* Effect.promise(() =>
					db
						.select({
							id: posts.id,
							content: posts.content,
							contentFormat: posts.contentFormat,
							contentHtml: posts.contentHtml,
							mediaUrls: posts.mediaUrls,
							visibility: posts.visibility,
							qualityScore: posts.qualityScore,
							createdAt: posts.createdAt,
							authorId: posts.authorId,
							authorName: users.name,
							authorImage: users.image,
							handle: profiles.handle,
							headline: profiles.headline,
							repostOfId: posts.repostOfId,
							quotedPostId: posts.quotedPostId,
						})
						.from(posts)
						.innerJoin(users, eq(posts.authorId, users.id))
						.leftJoin(profiles, eq(posts.authorId, profiles.userId))
						.where(and(eq(posts.id, data.postId), isNull(posts.deletedAt)))
						.limit(1),
				);

				if (!row) return { post: null, reason: "not_found" as const };

				if (row.visibility === "private" && row.authorId !== userId) {
					return { post: null, reason: "forbidden" as const };
				}

				if (row.visibility === "connections" && row.authorId !== userId) {
					if (!userId) return { post: null, reason: "forbidden" as const };

					const rowAuthorId = row.authorId;
					const [conn] = yield* Effect.promise(() =>
						db
							.select({ id: connections.id })
							.from(connections)
							.where(
								and(
									eq(connections.status, "accepted"),
									or(
										and(
											eq(connections.requesterId, userId),
											eq(connections.addresseeId, rowAuthorId),
										),
										and(
											eq(connections.requesterId, rowAuthorId),
											eq(connections.addresseeId, userId),
										),
									),
								),
							)
							.limit(1),
					);

					if (!conn) return { post: null, reason: "forbidden" as const };
				}

				const rowId = row.id;
				const savedPostIds = userId
					? yield* Effect.promise(() =>
							db
								.select({ postId: savedPosts.postId })
								.from(savedPosts)
								.where(
									and(
										eq(savedPosts.userId, userId),
										eq(savedPosts.postId, rowId),
									),
								)
								.then((rows) => new Set(rows.map((r) => r.postId))),
						)
					: new Set<string>();

				const candidate: PoolCandidate = {
					...(row as PostRow),
					source: { type: "network" },
				};

				const sourceMap = new Map<string, FeedSource>([
					[row.id, { type: "network" }],
				]);

				const enriched = yield* Effect.promise(() =>
					enrichPosts([candidate], userId ?? "", savedPostIds, sourceMap),
				);

				return { post: enriched[0], reason: null };
			}),
		),
	);

export const createPostFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			content: z.string().trim().min(1).max(50000),
			visibility: postVisibilitySchema.default("public"),
			contentFormat: postContentFormatSchema.default("plain"),
			mediaUrls: z.array(z.url()).max(10).optional(),
			quotedPostId: z.string().optional(),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				if (data.quotedPostId) {
					const quotedPostId = data.quotedPostId;
					const [quoted] = yield* Effect.promise(() =>
						db
							.select({ id: posts.id })
							.from(posts)
							.where(and(eq(posts.id, quotedPostId), isNull(posts.deletedAt)))
							.limit(1),
					);
					if (!quoted)
						yield* Effect.fail(new NotFoundError({ entity: "Quoted post" }));
				}

				let contentHtml: string | null = null;
				if (data.contentFormat === "tiptap") {
					const [{ generateHTML }, { default: StarterKit }] =
						yield* Effect.promise(() =>
							Promise.all([
								import("@tiptap/html"),
								import("@tiptap/starter-kit"),
							]),
						);
					const json = JSON.parse(data.content);
					contentHtml = generateHTML(json, [
						StarterKit.configure({
							heading: false,
							blockquote: false,
							bulletList: false,
							orderedList: false,
							codeBlock: false,
							horizontalRule: false,
							listItem: false,
						}),
					]);
				}

				const [post] = yield* Effect.promise(() =>
					db
						.insert(posts)
						.values({
							authorId: session.user.id,
							content: data.content,
							contentFormat: data.contentFormat,
							contentHtml,
							visibility: data.visibility,
							...(data.mediaUrls?.length ? { mediaUrls: data.mediaUrls } : {}),
							...(data.quotedPostId ? { quotedPostId: data.quotedPostId } : {}),
						})
						.returning(),
				);

				return post;
			}),
		),
	);

export const createRepostFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ postId: z.string().min(1) }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const [original] = yield* Effect.promise(() =>
					db
						.select({
							id: posts.id,
							visibility: posts.visibility,
							authorId: posts.authorId,
						})
						.from(posts)
						.where(and(eq(posts.id, data.postId), isNull(posts.deletedAt)))
						.limit(1),
				);

				if (!original)
					yield* Effect.fail(new NotFoundError({ entity: "Post" }));

				const [existing] = yield* Effect.promise(() =>
					db
						.select({ id: posts.id })
						.from(posts)
						.where(
							and(
								eq(posts.repostOfId, data.postId),
								eq(posts.authorId, session.user.id),
								isNull(posts.deletedAt),
							),
						)
						.limit(1),
				);

				if (existing)
					yield* Effect.fail(
						new ConflictError({
							message: "You have already reposted this post",
						}),
					);

				const [repost] = yield* Effect.promise(() =>
					db
						.insert(posts)
						.values({
							authorId: session.user.id,
							content: "",
							repostOfId: data.postId,
							visibility: "public",
						})
						.returning(),
				);

				return { reposted: true, repostId: repost.id };
			}),
		),
	);

export const undoRepostFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ postId: z.string().min(1) }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				yield* Effect.promise(() =>
					db
						.delete(posts)
						.where(
							and(
								eq(posts.repostOfId, data.postId),
								eq(posts.authorId, session.user.id),
								isNull(posts.deletedAt),
							),
						),
				);

				return { reposted: false };
			}),
		),
	);

export const deletePostFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ postId: z.string().min(1) }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const [post] = yield* Effect.promise(() =>
					db
						.select({ authorId: posts.authorId })
						.from(posts)
						.where(eq(posts.id, data.postId))
						.limit(1),
				);

				if (!post) yield* Effect.fail(new NotFoundError({ entity: "Post" }));
				if (post.authorId !== session.user.id)
					yield* Effect.fail(
						new ForbiddenError({
							message: "Not authorized to delete this post",
						}),
					);

				const now = new Date();
				const postId = data.postId;

				yield* Effect.promise(() =>
					Promise.all([
						db
							.update(posts)
							.set({ deletedAt: now })
							.where(eq(posts.id, postId)),
						db
							.update(comments)
							.set({ deletedAt: now })
							.where(
								and(eq(comments.postId, postId), isNull(comments.deletedAt)),
							),
					]),
				);

				return { success: true };
			}),
		),
	);

export const toggleReactionFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			postId: z.string().min(1),
			type: reactionTypeSchema,
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const [existing] = yield* Effect.promise(() =>
					db
						.select()
						.from(reactions)
						.where(
							and(
								eq(reactions.postId, data.postId),
								eq(reactions.userId, session.user.id),
							),
						)
						.limit(1),
				);

				if (existing) {
					if (existing.type === data.type) {
						yield* Effect.promise(() =>
							db.delete(reactions).where(eq(reactions.id, existing.id)),
						);
						return { reaction: null };
					}
					yield* Effect.promise(() =>
						db
							.update(reactions)
							.set({ type: data.type })
							.where(eq(reactions.id, existing.id)),
					);
					return { reaction: data.type };
				}

				yield* Effect.promise(() =>
					db.insert(reactions).values({
						postId: data.postId,
						userId: session.user.id,
						type: data.type,
					}),
				);

				const [reactedPost] = yield* Effect.promise(() =>
					db
						.select({ authorId: posts.authorId })
						.from(posts)
						.where(eq(posts.id, data.postId))
						.limit(1),
				);

				if (reactedPost) {
					createNotification({
						userId: reactedPost.authorId,
						type: "post_reaction",
						actorId: session.user.id,
						entityId: data.postId,
						entityType: "post",
					}).catch(console.error);
				}

				return { reaction: data.type };
			}),
		),
	);

export const getCommentsForPostFn = createServerFn({ method: "GET" })
	.inputValidator(z.object({ postId: z.string().min(1) }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const rows = yield* Effect.promise(() =>
					db
						.select({
							id: comments.id,
							parentId: comments.parentId,
							content: comments.content,
							createdAt: comments.createdAt,
							authorId: comments.authorId,
							authorName: users.name,
							authorImage: users.image,
							handle: profiles.handle,
						})
						.from(comments)
						.innerJoin(users, eq(comments.authorId, users.id))
						.leftJoin(profiles, eq(comments.authorId, profiles.userId))
						.where(
							and(eq(comments.postId, data.postId), isNull(comments.deletedAt)),
						)
						.orderBy(comments.createdAt),
				);

				const commentIds = rows.map((r) => r.id);

				const myReactionsRows =
					commentIds.length > 0
						? yield* Effect.promise(() =>
								db
									.select({
										commentId: commentReactions.commentId,
										type: commentReactions.type,
									})
									.from(commentReactions)
									.where(
										and(
											inArray(commentReactions.commentId, commentIds),
											eq(commentReactions.userId, session.user.id),
										),
									),
							)
						: [];

				const myReactionsMap = new Map(
					myReactionsRows.map((r) => [r.commentId, r.type]),
				);

				return rows.map((r) => ({
					id: r.id,
					parentId: r.parentId,
					content: r.content,
					createdAt: r.createdAt.toISOString(),
					author: {
						id: r.authorId,
						name: r.authorName,
						image: r.authorImage,
						handle: r.handle,
					},
					myReaction: myReactionsMap.get(r.id) ?? null,
				}));
			}),
		),
	);

export const toggleCommentReactionFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			commentId: z.string().min(1),
			type: reactionTypeSchema,
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const [existing] = yield* Effect.promise(() =>
					db
						.select({ id: commentReactions.id, type: commentReactions.type })
						.from(commentReactions)
						.where(
							and(
								eq(commentReactions.commentId, data.commentId),
								eq(commentReactions.userId, session.user.id),
							),
						)
						.limit(1),
				);

				if (existing) {
					if (existing.type === data.type) {
						yield* Effect.promise(() =>
							db
								.delete(commentReactions)
								.where(eq(commentReactions.id, existing.id)),
						);
						return { reaction: null };
					}
					yield* Effect.promise(() =>
						db
							.update(commentReactions)
							.set({ type: data.type })
							.where(eq(commentReactions.id, existing.id)),
					);
					return { reaction: data.type };
				}

				yield* Effect.promise(() =>
					db.insert(commentReactions).values({
						commentId: data.commentId,
						userId: session.user.id,
						type: data.type,
					}),
				);
				return { reaction: data.type };
			}),
		),
	);

export const createCommentFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			postId: z.string().min(1),
			content: z.string().trim().min(1).max(1000),
			parentId: z.string().nullable().default(null),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const [post] = yield* Effect.promise(() =>
					db
						.select({ id: posts.id, authorId: posts.authorId })
						.from(posts)
						.where(and(eq(posts.id, data.postId), isNull(posts.deletedAt)))
						.limit(1),
				);

				if (!post) yield* Effect.fail(new NotFoundError({ entity: "Post" }));

				let finalParentId = data.parentId;
				let contentPrefix = "";

				if (finalParentId) {
					const parentId = finalParentId;
					const [parentComment] = yield* Effect.promise(() =>
						db
							.select({
								id: comments.id,
								parentId: comments.parentId,
								postId: comments.postId,
								authorName: users.name,
							})
							.from(comments)
							.innerJoin(users, eq(comments.authorId, users.id))
							.where(and(eq(comments.id, parentId), isNull(comments.deletedAt)))
							.limit(1),
					);

					if (!parentComment)
						yield* Effect.fail(new NotFoundError({ entity: "Parent comment" }));
					if (parentComment.postId !== data.postId)
						yield* Effect.fail(
							new ValidationError({
								message: "Parent comment belongs to a different post",
							}),
						);

					if (parentComment.parentId !== null) {
						finalParentId = parentComment.parentId;
						contentPrefix = `@${parentComment.authorName} `;
					}
				}

				const finalContent = contentPrefix + data.content;
				const postAuthorId = post.authorId;

				const [comment] = yield* Effect.promise(() =>
					db
						.insert(comments)
						.values({
							postId: data.postId,
							authorId: session.user.id,
							parentId: finalParentId,
							content: finalContent,
						})
						.returning(),
				);

				createNotification({
					userId: postAuthorId,
					type: "post_comment",
					actorId: session.user.id,
					entityId: data.postId,
					entityType: "post",
				}).catch(console.error);

				return comment;
			}),
		),
	);
