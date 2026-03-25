import { ChatCircleIcon } from "@phosphor-icons/react";
import type { ConversationListItem } from "#/lib/server/messages";
import { ConversationItem } from "./ConversationItem";

export function ConversationList({
	conversations,
	activeId,
}: {
	conversations: ConversationListItem[];
	activeId?: string;
}) {
	if (conversations.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
				<div className="flex size-12 items-center justify-center rounded-full bg-muted">
					<ChatCircleIcon className="size-6 text-muted-foreground" />
				</div>
				<div>
					<p className="text-sm font-medium text-foreground">
						No conversations yet
					</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Message a connection to start a conversation.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-0.5 [&>a:first-child]:rounded-t-none">
			{conversations.map((conv) => (
				<ConversationItem
					key={conv.id}
					conversation={conv}
					isActive={conv.id === activeId}
				/>
			))}
		</div>
	);
}
