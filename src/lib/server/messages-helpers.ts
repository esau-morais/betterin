import { and, eq, or } from "drizzle-orm";
import { db } from "#/lib/db/index.server";
import { connections } from "#/lib/db/schema";

export async function areConnected(
	userA: string,
	userB: string,
): Promise<boolean> {
	const [row] = await db
		.select({ id: connections.id })
		.from(connections)
		.where(
			and(
				eq(connections.status, "accepted"),
				or(
					and(
						eq(connections.requesterId, userA),
						eq(connections.addresseeId, userB),
					),
					and(
						eq(connections.requesterId, userB),
						eq(connections.addresseeId, userA),
					),
				),
			),
		)
		.limit(1);
	return !!row;
}
