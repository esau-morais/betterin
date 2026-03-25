import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { Effect } from "effect";
import { db } from "#/lib/db/index.server";
import {
	comments,
	posts,
	profiles,
	reactions,
	savedPosts,
	users,
} from "#/lib/db/schema";
import { requireSessionEffect } from "#/lib/server/require-session";

export const listBookmarksFn = createServerFn({ method: "GET" }).handler(() =>
	Effect.runPromise(
		Effect.gen(function* () {
			const session = yield* requireSessionEffect;
			const userId = session.user.id;

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
						authorId: users.id,
						authorName: users.name,
						authorImage: users.image,
						handle: profiles.handle,
						headline: profiles.headline,
						avatarFrame: profiles.avatarFrame,
						savedAt: savedPosts.createdAt,
					})
					.from(savedPosts)
					.innerJoin(posts, eq(savedPosts.postId, posts.id))
					.innerJoin(users, eq(posts.authorId, users.id))
					.leftJoin(profiles, eq(users.id, profiles.userId))
					.where(and(eq(savedPosts.userId, userId), isNull(posts.deletedAt)))
					.orderBy(desc(savedPosts.createdAt)),
			);

			if (rows.length === 0) return [];

			const postIds = rows.map((r) => r.id);

			const [userReactions, commentCounts, reactionTypes, reactionCounts] =
				yield* Effect.promise(() =>
					Promise.all([
						db
							.select({ postId: reactions.postId, type: reactions.type })
							.from(reactions)
							.where(
								and(
									inArray(reactions.postId, postIds),
									eq(reactions.userId, userId),
								),
							),
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
								postId: reactions.postId,
								type: reactions.type,
							})
							.from(reactions)
							.where(inArray(reactions.postId, postIds))
							.groupBy(reactions.postId, reactions.type),
						db
							.select({
								postId: reactions.postId,
								count: sql<number>`count(*)::int`,
							})
							.from(reactions)
							.where(inArray(reactions.postId, postIds))
							.groupBy(reactions.postId),
					]),
				);

			const reactionMap = new Map(userReactions.map((r) => [r.postId, r.type]));
			const commentCountMap = new Map(
				commentCounts.map((c) => [c.postId, c.count]),
			);
			const reactionTypesMap = new Map<string, string[]>();
			for (const r of reactionTypes) {
				const existing = reactionTypesMap.get(r.postId) ?? [];
				existing.push(r.type);
				reactionTypesMap.set(r.postId, existing);
			}
			const reactionCountMap = new Map(
				reactionCounts.map((r) => [r.postId, r.count]),
			);

			return rows.map((p) => ({
				id: p.id,
				content: p.content,
				contentFormat: p.contentFormat as "plain" | "tiptap" | null,
				contentHtml: p.contentHtml,
				mediaUrls: p.mediaUrls as string[] | null,
				visibility: p.visibility,
				createdAt: p.createdAt.toISOString(),
				author: {
					id: p.authorId,
					name: p.authorName,
					image: p.authorImage,
					handle: p.handle,
					headline: p.headline,
					avatarFrame: p.avatarFrame ?? null,
				},
				myReaction: reactionMap.get(p.id) ?? null,
				reactionTypes: reactionTypesMap.get(p.id) ?? [],
				reactionCount: reactionCountMap.get(p.id) ?? 0,
				commentCount: commentCountMap.get(p.id) ?? 0,
				isSaved: true,
				source: { type: "network" as const },
				repostOf: null,
				quotedPost: null,
				isReposted: false,
				repostCount: 0,
				impressionCount: 0,
				authorShowsImpressions: true,
				poll: null,
				event: null,
				article: null,
			}));
		}),
	),
);
