import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { z } from "zod";
import { db } from "#/lib/db/index.server";
import { articles, posts, profiles, users } from "#/lib/db/schema";
import { ForbiddenError, NotFoundError } from "#/lib/effect-helpers";
import { estimateReadingTime, extractTextFromTiptap } from "#/lib/reading-time";
import { requireSessionEffect } from "#/lib/server/require-session";
import { createArticleSchema, updateArticleSchema } from "#/lib/validation";

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 80);
}

async function generateArticleHtml(bodyJsonStr: string): Promise<string> {
	const [{ generateHTML }, { StarterKit }, { Image }, { Link }] =
		await Promise.all([
			import("@tiptap/html/server"),
			import("@tiptap/starter-kit"),
			import("@tiptap/extension-image"),
			import("@tiptap/extension-link"),
		]);

	return generateHTML(JSON.parse(bodyJsonStr), [
		StarterKit.configure({
			heading: { levels: [2, 3] },
		}),
		Image,
		Link.configure({ openOnClick: false }),
	]);
}

export const createArticlePostFn = createServerFn({ method: "POST" })
	.inputValidator(createArticleSchema)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const bodyJson = JSON.parse(data.body);
				const plainText = extractTextFromTiptap(bodyJson);
				const readingTimeMinutes = estimateReadingTime(plainText);
				const bodyHtml = yield* Effect.promise(() =>
					generateArticleHtml(data.body),
				);
				const slug = `${slugify(data.title)}-${crypto.randomUUID().slice(0, 8)}`;

				const [post] = yield* Effect.promise(() =>
					db
						.insert(posts)
						.values({
							authorId: session.user.id,
							content: data.title,
							contentFormat: "plain",
							visibility: data.visibility,
						})
						.returning(),
				);

				yield* Effect.promise(() =>
					db.insert(articles).values({
						postId: post.id,
						title: data.title,
						subtitle: data.subtitle || null,
						slug,
						coverImageUrl: data.coverImageUrl || null,
						bodyJson,
						bodyHtml,
						readingTimeMinutes,
					}),
				);

				return { post, article: { slug } };
			}),
		),
	);

export const updateArticleFn = createServerFn({ method: "POST" })
	.inputValidator(updateArticleSchema)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const [article] = yield* Effect.promise(() =>
					db
						.select({
							id: articles.id,
							postId: articles.postId,
							title: articles.title,
							slug: articles.slug,
						})
						.from(articles)
						.where(eq(articles.id, data.articleId))
						.limit(1),
				);

				if (!article)
					yield* Effect.fail(new NotFoundError({ entity: "Article" }));

				const [post] = yield* Effect.promise(() =>
					db
						.select({ authorId: posts.authorId })
						.from(posts)
						.where(eq(posts.id, article.postId))
						.limit(1),
				);

				if (!post || post.authorId !== session.user.id) {
					yield* Effect.fail(new ForbiddenError({ message: "Not authorized" }));
				}

				const articleUpdate: Record<string, unknown> = {
					updatedAt: new Date(),
				};
				const postUpdate: Record<string, unknown> = {
					updatedAt: new Date(),
				};

				if (data.title !== undefined) {
					articleUpdate.title = data.title;
					postUpdate.content = data.title;
				}

				if (data.subtitle !== undefined) {
					articleUpdate.subtitle = data.subtitle || null;
				}

				if (data.coverImageUrl !== undefined) {
					articleUpdate.coverImageUrl = data.coverImageUrl || null;
				}

				if (data.body) {
					const bodyJson = JSON.parse(data.body);
					const plainText = extractTextFromTiptap(bodyJson);
					articleUpdate.bodyJson = bodyJson;
					const body = data.body;
					articleUpdate.bodyHtml = yield* Effect.promise(() =>
						generateArticleHtml(body),
					);
					articleUpdate.readingTimeMinutes = estimateReadingTime(plainText);
				}

				if (data.visibility) {
					postUpdate.visibility = data.visibility;
				}

				yield* Effect.promise(() =>
					Promise.all([
						db
							.update(articles)
							.set(articleUpdate)
							.where(eq(articles.id, data.articleId)),
						db
							.update(posts)
							.set(postUpdate)
							.where(eq(posts.id, article.postId)),
					]),
				);

				return { success: true };
			}),
		),
	);

export const getArticleBySlugFn = createServerFn({ method: "GET" })
	.inputValidator(z.object({ slug: z.string().min(1) }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const [row] = yield* Effect.promise(() =>
					db
						.select({
							articleId: articles.id,
							title: articles.title,
							subtitle: articles.subtitle,
							slug: articles.slug,
							coverImageUrl: articles.coverImageUrl,
							bodyHtml: articles.bodyHtml,
							readingTimeMinutes: articles.readingTimeMinutes,
							articleCreatedAt: articles.createdAt,
							postId: posts.id,
							content: posts.content,
							visibility: posts.visibility,
							createdAt: posts.createdAt,
							authorId: users.id,
							authorName: users.name,
							authorImage: users.image,
							handle: profiles.handle,
							headline: profiles.headline,
						})
						.from(articles)
						.innerJoin(posts, eq(articles.postId, posts.id))
						.innerJoin(users, eq(posts.authorId, users.id))
						.leftJoin(profiles, eq(posts.authorId, profiles.userId))
						.where(eq(articles.slug, data.slug))
						.limit(1),
				);

				if (!row) return { article: null };

				return {
					article: {
						id: row.articleId,
						title: row.title,
						subtitle: row.subtitle,
						slug: row.slug,
						coverImageUrl: row.coverImageUrl,
						bodyHtml: row.bodyHtml,
						readingTimeMinutes: row.readingTimeMinutes,
						createdAt: row.articleCreatedAt.toISOString(),
						postId: row.postId,
						visibility: row.visibility,
						author: {
							id: row.authorId,
							name: row.authorName,
							image: row.authorImage,
							handle: row.handle,
							headline: row.headline,
						},
					},
				};
			}),
		),
	);

export const getArticleForEditFn = createServerFn({ method: "GET" })
	.inputValidator(z.object({ articleId: z.string().min(1) }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const [row] = yield* Effect.promise(() =>
					db
						.select({
							id: articles.id,
							postId: articles.postId,
							title: articles.title,
							subtitle: articles.subtitle,
							slug: articles.slug,
							coverImageUrl: articles.coverImageUrl,
							bodyJson: articles.bodyJson,
							readingTimeMinutes: articles.readingTimeMinutes,
							authorId: posts.authorId,
							visibility: posts.visibility,
						})
						.from(articles)
						.innerJoin(posts, eq(articles.postId, posts.id))
						.where(eq(articles.id, data.articleId))
						.limit(1),
				);

				if (!row) yield* Effect.fail(new NotFoundError({ entity: "Article" }));

				if (row.authorId !== session.user.id)
					yield* Effect.fail(new ForbiddenError({ message: "Not authorized" }));

				return {
					id: row.id,
					postId: row.postId,
					title: row.title,
					subtitle: row.subtitle,
					slug: row.slug,
					coverImageUrl: row.coverImageUrl,
					bodyJson: row.bodyJson,
					visibility: row.visibility as "public" | "connections" | "private",
				};
			}),
		),
	);

export type EditableArticle = Awaited<ReturnType<typeof getArticleForEditFn>>;

export type ArticleData = {
	id: string;
	title: string;
	subtitle: string | null;
	slug: string;
	coverImageUrl: string | null;
	readingTimeMinutes: number;
};
