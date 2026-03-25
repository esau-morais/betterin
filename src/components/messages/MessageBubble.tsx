import type { MessageItem } from "#/lib/server/messages";
import { cn } from "#/lib/utils";

export function MessageBubble({ message }: { message: MessageItem }) {
	const time = new Date(message.createdAt);

	return (
		<div
			className={cn(
				"flex gap-2",
				message.isOwn ? "justify-end" : "justify-start",
			)}
		>
			<div
				className={cn(
					"max-w-[75%] rounded-xl px-3.5 py-2",
					message.isOwn
						? "bg-primary text-primary-foreground rounded-br-sm"
						: "bg-muted text-foreground rounded-bl-sm",
				)}
			>
				<p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
					{message.content}
				</p>
				<time
					dateTime={time.toISOString()}
					className={cn(
						"mt-1 block text-right font-mono text-xs",
						message.isOwn
							? "text-primary-foreground/60"
							: "text-muted-foreground",
					)}
				>
					{time.toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
					})}
				</time>
			</div>
		</div>
	);
}
