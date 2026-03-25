import { Schema } from "effect";
import { createSubscriber, redis } from "#/lib/redis";

const PubSubEventSchema = Schema.Struct({
	type: Schema.Literal("new_message", "message_read", "notification", "typing"),
	payload: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
});

export type PubSubEvent = typeof PubSubEventSchema.Type;

export function userChannel(userId: string): string {
	return `user:${userId}`;
}

export async function publish(
	channel: string,
	event: PubSubEvent,
): Promise<void> {
	await redis.publish(channel, JSON.stringify(event));
}

export function subscribe(
	channel: string,
	onMessage: (event: PubSubEvent) => void,
): { unsubscribe: () => Promise<void> } {
	const sub = createSubscriber();

	sub.subscribe(channel).catch((err) => {
		console.error(`[pubsub] subscribe error for ${channel}:`, err);
	});

	sub.on("message", (_ch: string, raw: string) => {
		try {
			const event = Schema.decodeUnknownSync(PubSubEventSchema)(
				JSON.parse(raw),
			);
			onMessage(event);
		} catch {
			console.error("[pubsub] failed to parse message:", raw);
		}
	});

	return {
		unsubscribe: async () => {
			await sub.unsubscribe(channel);
			sub.disconnect();
		},
	};
}
