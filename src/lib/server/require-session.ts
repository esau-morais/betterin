import { getRequest } from "@tanstack/react-start/server";
import { Effect } from "effect";
import { auth } from "#/lib/auth";
import { UnauthorizedError } from "#/lib/effect-helpers";

export async function requireSession() {
	const request = getRequest();
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) throw new Error("Unauthorized");
	return session;
}

export const requireSessionEffect = Effect.gen(function* () {
	const request = getRequest();
	const session = yield* Effect.promise(() =>
		auth.api.getSession({ headers: request.headers }),
	);
	if (!session) {
		return yield* Effect.fail(new UnauthorizedError({}));
	}
	return session;
});
