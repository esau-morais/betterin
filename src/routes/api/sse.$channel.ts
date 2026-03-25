import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { subscribe, userChannel } from "#/lib/server/pubsub";

export const Route = createFileRoute("/api/sse/$channel")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const session = await auth.api.getSession({
					headers: request.headers,
				});

				if (!session) {
					return new Response("Unauthorized", { status: 401 });
				}

				const channel = params.channel;
				const expectedChannel = userChannel(session.user.id);

				if (channel !== expectedChannel) {
					return new Response("Forbidden", { status: 403 });
				}

				const encoder = new TextEncoder();
				let closed = false;

				const stream = new ReadableStream({
					start(controller) {
						controller.enqueue(encoder.encode(": connected\n\n"));

						const heartbeat = setInterval(() => {
							if (closed) return;
							try {
								controller.enqueue(encoder.encode(": ping\n\n"));
							} catch {
								clearInterval(heartbeat);
							}
						}, 30_000);

						const sub = subscribe(channel, (event) => {
							if (closed) return;
							try {
								controller.enqueue(
									encoder.encode(
										`event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`,
									),
								);
							} catch {
								// stream closed
							}
						});

						request.signal.addEventListener("abort", () => {
							closed = true;
							clearInterval(heartbeat);
							sub.unsubscribe();
							try {
								controller.close();
							} catch {
								// already closed
							}
						});
					},
				});

				return new Response(stream, {
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						Connection: "keep-alive",
						"X-Accel-Buffering": "no",
					},
				});
			},
		},
	},
});
