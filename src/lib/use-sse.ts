import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

const MAX_RETRIES = 10;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;

interface UseSSEOptions {
	channel: string | null;
	onEvent?: (type: string, payload: unknown) => void;
}

export function useSSE({ channel, onEvent }: UseSSEOptions) {
	const queryClient = useQueryClient();
	const retriesRef = useRef(0);
	const onEventRef = useRef(onEvent);
	onEventRef.current = onEvent;
	const esRef = useRef<EventSource | null>(null);

	useEffect(() => {
		if (!channel) return;

		let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
		let disposed = false;

		function connect() {
			if (disposed) return;

			const es = new EventSource(`/api/sse/${channel}`);
			esRef.current = es;

			es.onopen = () => {
				retriesRef.current = 0;
			};

			es.addEventListener("new_message", (e) => {
				const payload = JSON.parse(e.data);
				queryClient.invalidateQueries({ queryKey: ["conversations"] });
				queryClient.invalidateQueries({
					queryKey: ["messages", payload.conversationId],
				});
				queryClient.invalidateQueries({ queryKey: ["unread-counts"] });
				queryClient.setQueryData(["typing", payload.conversationId], null);
				onEventRef.current?.("new_message", payload);
			});

			es.addEventListener("message_read", (e) => {
				const payload = JSON.parse(e.data);
				queryClient.invalidateQueries({ queryKey: ["conversations"] });
				queryClient.invalidateQueries({
					queryKey: ["messages", payload.conversationId],
				});
			});

			es.addEventListener("notification", () => {
				queryClient.invalidateQueries({ queryKey: ["notifications"] });
				queryClient.invalidateQueries({
					queryKey: ["unread-notification-count"],
				});
			});

			es.addEventListener("typing", (e) => {
				const payload = JSON.parse(e.data);
				onEventRef.current?.("typing", payload);
			});

			es.onerror = () => {
				es.close();
				esRef.current = null;

				if (disposed) return;
				if (retriesRef.current >= MAX_RETRIES) return;

				const delay = Math.min(
					BASE_DELAY_MS * 2 ** retriesRef.current,
					MAX_DELAY_MS,
				);
				retriesRef.current++;
				reconnectTimer = setTimeout(connect, delay);
			};
		}

		function handleVisibility() {
			if (document.visibilityState !== "visible") return;
			const es = esRef.current;
			if (!es || es.readyState === EventSource.CLOSED) {
				retriesRef.current = 0;
				connect();
			}
		}

		connect();
		document.addEventListener("visibilitychange", handleVisibility);

		return () => {
			disposed = true;
			esRef.current?.close();
			esRef.current = null;
			if (reconnectTimer) clearTimeout(reconnectTimer);
			document.removeEventListener("visibilitychange", handleVisibility);
		};
	}, [channel, queryClient]);
}
