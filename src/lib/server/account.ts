import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { z } from "zod";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db/index.server";
import { accounts } from "#/lib/db/schema";
import { ConflictError } from "#/lib/effect-helpers";
import { requireSessionEffect } from "#/lib/server/require-session";

export const hasPasswordFn = createServerFn({ method: "GET" }).handler(() =>
	Effect.runPromise(
		Effect.gen(function* () {
			const session = yield* requireSessionEffect;

			const [credential] = yield* Effect.promise(() =>
				db
					.select({ id: accounts.id })
					.from(accounts)
					.where(
						and(
							eq(accounts.userId, session.user.id),
							eq(accounts.providerId, "credential"),
						),
					)
					.limit(1),
			);

			return { hasPassword: !!credential };
		}),
	),
);

export const setPasswordFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ newPassword: z.string().min(8) }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const [existing] = yield* Effect.promise(() =>
					db
						.select({ id: accounts.id })
						.from(accounts)
						.where(
							and(
								eq(accounts.userId, session.user.id),
								eq(accounts.providerId, "credential"),
							),
						)
						.limit(1),
				);

				if (existing) {
					yield* Effect.fail(
						new ConflictError({
							message: "Password already set. Use change password instead.",
						}),
					);
				}

				const request = getRequest();
				yield* Effect.promise(() =>
					auth.api.setPassword({
						body: { newPassword: data.newPassword },
						headers: request.headers,
					}),
				);

				return { success: true };
			}),
		),
	);

export const changePasswordFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			currentPassword: z.string().min(1),
			newPassword: z.string().min(8),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				yield* requireSessionEffect;

				const request = getRequest();
				yield* Effect.promise(() =>
					auth.api.changePassword({
						body: {
							currentPassword: data.currentPassword,
							newPassword: data.newPassword,
							revokeOtherSessions: false,
						},
						headers: request.headers,
					}),
				);

				return { success: true };
			}),
		),
	);

export const listAccountProvidersFn = createServerFn({
	method: "GET",
}).handler(() =>
	Effect.runPromise(
		Effect.gen(function* () {
			const session = yield* requireSessionEffect;

			const userAccounts = yield* Effect.promise(() =>
				db
					.select({
						providerId: accounts.providerId,
						accountId: accounts.accountId,
					})
					.from(accounts)
					.where(eq(accounts.userId, session.user.id)),
			);

			return userAccounts;
		}),
	),
);
