import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { z } from "zod";
import { db } from "#/lib/db/index.server";
import { pollOptions, polls, pollVotes, posts } from "#/lib/db/schema";
import { NotFoundError, ValidationError } from "#/lib/effect-helpers";
import { requireSessionEffect } from "#/lib/server/require-session";
import { postVisibilitySchema } from "#/lib/validation";

export const createPollPostFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			content: z.string().trim().min(1).max(3000),
			visibility: postVisibilitySchema.default("public"),
			options: z.array(z.string().trim().min(1).max(140)).min(2).max(4),
			durationHours: z.number().int().min(1).max(336), // max 14 days
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const endsAt = new Date(
					Date.now() + data.durationHours * 60 * 60 * 1000,
				);

				const [post] = yield* Effect.promise(() =>
					db
						.insert(posts)
						.values({
							authorId: session.user.id,
							content: data.content,
							visibility: data.visibility,
						})
						.returning(),
				);

				const [poll] = yield* Effect.promise(() =>
					db.insert(polls).values({ postId: post.id, endsAt }).returning(),
				);

				yield* Effect.promise(() =>
					db.insert(pollOptions).values(
						data.options.map((text, i) => ({
							pollId: poll.id,
							text,
							position: i,
						})),
					),
				);

				return post;
			}),
		),
	);

export const votePollFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			pollId: z.string().min(1),
			optionId: z.string().min(1),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const [poll] = yield* Effect.promise(() =>
					db
						.select({ id: polls.id, endsAt: polls.endsAt })
						.from(polls)
						.where(eq(polls.id, data.pollId))
						.limit(1),
				);

				if (!poll) {
					yield* Effect.fail(
						new NotFoundError({ entity: "poll", id: data.pollId }),
					);
				}
				if (poll.endsAt < new Date()) {
					yield* Effect.fail(
						new ValidationError({ message: "Poll has ended" }),
					);
				}

				const [option] = yield* Effect.promise(() =>
					db
						.select({ id: pollOptions.id })
						.from(pollOptions)
						.where(
							and(
								eq(pollOptions.id, data.optionId),
								eq(pollOptions.pollId, data.pollId),
							),
						)
						.limit(1),
				);

				if (!option) {
					yield* Effect.fail(
						new NotFoundError({ entity: "option", id: data.optionId }),
					);
				}

				yield* Effect.promise(() =>
					db
						.insert(pollVotes)
						.values({
							pollId: data.pollId,
							optionId: data.optionId,
							userId: session.user.id,
						})
						.onConflictDoUpdate({
							target: [pollVotes.pollId, pollVotes.userId],
							set: { optionId: data.optionId },
						}),
				);

				return { success: true };
			}),
		),
	);

export type PollData = {
	id: string;
	endsAt: string;
	options: { id: string; text: string; position: number; votes: number }[];
	totalVotes: number;
	myVoteOptionId: string | null;
};

