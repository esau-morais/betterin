import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { db } from "#/lib/db/index.server";
import { posts } from "#/lib/db/schema";
import { ForbiddenError, NotFoundError } from "#/lib/effect-helpers";

export function verifyPostAuthorEffect(postId: string, userId: string) {
	return Effect.gen(function* () {
		const [post] = yield* Effect.promise(() =>
			db
				.select({ authorId: posts.authorId })
				.from(posts)
				.where(eq(posts.id, postId))
				.limit(1),
		);
		if (!post) {
			return yield* Effect.fail(new NotFoundError({ entity: "Post" }));
		}
		if (post.authorId !== userId) {
			return yield* Effect.fail(
				new ForbiddenError({
					message: "Only the post author can view analytics",
				}),
			);
		}
	});
}
