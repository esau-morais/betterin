import { useEffect, useRef } from "react";
import type { MessageItem } from "#/lib/server/messages";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

export function MessageThread({
	messages,
	onLoadMore,
	hasMore,
	isLoadingMore,
	typingName,
}: {
	messages: MessageItem[];
	onLoadMore?: () => void;
	hasMore: boolean;
	isLoadingMore: boolean;
	typingName?: string | null;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const prevLengthRef = useRef(messages.length);

	useEffect(() => {
		if (messages.length > prevLengthRef.current) {
			const newestIsOwn = messages[0]?.isOwn;
			if (newestIsOwn && containerRef.current) {
				containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
			}
		}
		prevLengthRef.current = messages.length;
	}, [messages]);

	return (
		<div
			ref={containerRef}
			className="flex flex-1 flex-col-reverse gap-1.5 overflow-y-auto px-4 py-3"
			aria-live="polite"
			aria-relevant="additions"
		>
			{typingName && <TypingIndicator name={typingName} />}
			{messages.map((msg, i) => {
				const next = messages[i + 1];
				const showDateSep =
					next &&
					new Date(msg.createdAt).toDateString() !==
						new Date(next.createdAt).toDateString();

				return (
					<div key={msg.id}>
						<MessageBubble message={msg} />
						{showDateSep && (
							<div className="my-3 flex items-center gap-3">
								<div className="h-px flex-1 bg-border" />
								<span className="font-mono text-xs text-muted-foreground">
									{new Intl.DateTimeFormat("en-US", {
										month: "short",
										day: "numeric",
										year: "numeric",
									}).format(new Date(next.createdAt))}
								</span>
								<div className="h-px flex-1 bg-border" />
							</div>
						)}
					</div>
				);
			})}
			{hasMore && (
				<div className="flex justify-center py-2">
					<button
						type="button"
						onClick={onLoadMore}
						disabled={isLoadingMore}
						className="text-xs text-primary hover:underline disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
					>
						{isLoadingMore ? "Loading…" : "Load older messages"}
					</button>
				</div>
			)}
		</div>
	);
}
