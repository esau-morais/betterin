import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";
import { z } from "zod";
import { db } from "#/lib/db/index.server";
import { events, posts } from "#/lib/db/schema";
import { requireSessionEffect } from "#/lib/server/require-session";
import {
	postContentFormatSchema,
	postVisibilitySchema,
} from "#/lib/validation";

export const createEventPostFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			content: z.string().trim().max(50000).default(""),
			contentFormat: postContentFormatSchema.default("plain"),
			visibility: postVisibilitySchema.default("public"),
			event: z.object({
				name: z.string().trim().min(1).max(256),
				description: z.string().trim().max(2000).optional(),
				coverImageUrl: z.url().optional(),
				startAt: z.string().min(1),
				endAt: z.string().optional(),
				timezone: z.string().min(1).max(64),
				eventType: z.enum(["online", "in_person"]),
				location: z.string().max(256).optional(),
				locationLat: z.number().optional(),
				locationLon: z.number().optional(),
				externalUrl: z.url().optional().or(z.literal("")),
			}),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const postContent = data.content.trim() || data.event.name;

				let contentHtml: string | null = null;
				if (data.contentFormat === "tiptap" && data.content.trim()) {
					const [{ generateHTML }, { StarterKit }] = yield* Effect.promise(() =>
						Promise.all([
							import("@tiptap/html"),
							import("@tiptap/starter-kit"),
						]),
					);
					contentHtml = generateHTML(JSON.parse(data.content), [
						StarterKit.configure({
							heading: false,
							blockquote: false,
							bulletList: false,
							orderedList: false,
							listItem: false,
							horizontalRule: false,
						}),
					]);
				}

				const authorId = session.user.id;
				const [post] = yield* Effect.promise(() =>
					db
						.insert(posts)
						.values({
							authorId,
							content: postContent,
							contentFormat: data.contentFormat,
							contentHtml,
							visibility: data.visibility,
						})
						.returning(),
				);

				const postId = post.id;
				yield* Effect.promise(() =>
					db.insert(events).values({
						postId,
						name: data.event.name,
						description: data.event.description || null,
						coverImageUrl: data.event.coverImageUrl || null,
						startAt: new Date(data.event.startAt),
						endAt: data.event.endAt ? new Date(data.event.endAt) : null,
						timezone: data.event.timezone,
						eventType: data.event.eventType,
						location: data.event.location || null,
						locationLat: data.event.locationLat ?? null,
						locationLon: data.event.locationLon ?? null,
						externalUrl: data.event.externalUrl || null,
					}),
				);

				return post;
			}),
		),
	);

export type EventData = {
	id: string;
	name: string;
	description: string | null;
	coverImageUrl: string | null;
	startAt: string;
	endAt: string | null;
	timezone: string;
	eventType: "online" | "in_person";
	location: string | null;
	externalUrl: string | null;
};

