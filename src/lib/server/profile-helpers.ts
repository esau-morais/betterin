import { and, eq, or } from "drizzle-orm";
import { db } from "#/lib/db/index.server";
import { connections } from "#/lib/db/schema";
import type { ConnectionStatus } from "#/lib/server/profile";

export async function getConnectionStatus(
	viewerId: string,
	profileUserId: string,
): Promise<ConnectionStatus> {
	if (viewerId === profileUserId) return "self";

	const [conn] = await db
		.select({
			status: connections.status,
			requesterId: connections.requesterId,
		})
		.from(connections)
		.where(
			or(
				and(
					eq(connections.requesterId, viewerId),
					eq(connections.addresseeId, profileUserId),
				),
				and(
					eq(connections.requesterId, profileUserId),
					eq(connections.addresseeId, viewerId),
				),
			),
		)
		.limit(1);

	if (!conn) return "none";
	if (conn.status === "blocked") return "blocked";
	if (conn.status === "accepted") return "connected";
	return conn.requesterId === viewerId ? "pending_sent" : "pending_received";
}
