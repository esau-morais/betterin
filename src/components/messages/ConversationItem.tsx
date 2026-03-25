import { Link } from "@tanstack/react-router";
import { TimeAgo } from "#/components/shared/TimeAgo";
import { UserAvatar } from "#/components/shared/UserAvatar";
import type { ConversationListItem } from "#/lib/server/messages";
import { cn } from "#/lib/utils";

export function ConversationItem({
	conversation,
	isActive,
}: {
	conversation: ConversationListItem;
	isActive: boolean;
}) {
	const other = conversation.otherUser;
	const lastMsg = conversation.lastMessage;
	const hasUnread = conversation.unreadCount > 0;

	return (
		<Link
			to="/messages/$id"
			params={{ id: conversation.id }}
			className={cn(
				"flex items-start gap-3 rounded-lg px-3 py-3 transition-colors",
				isActive ? "bg-primary/10" : "hover:bg-muted",
			)}
		>
			<UserAvatar
				name={other?.name ?? "User"}
				image={other?.image}
				size="lg"
				className="shrink-0"
			/>
			<div className="min-w-0 flex-1">
				<div className="flex items-center justify-between gap-2">
					<span
						className={cn(
							"truncate text-sm",
							hasUnread ? "font-medium text-foreground" : "text-foreground",
						)}
					>
						{other?.name ?? "Unknown"}
					</span>
					{lastMsg && (
						<TimeAgo date={lastMsg.createdAt} className="shrink-0 text-xs" />
					)}
				</div>
				<div className="flex items-center gap-2">
					<p
						className={cn(
							"truncate text-sm",
							hasUnread
								? "font-medium text-foreground"
								: "text-muted-foreground",
						)}
					>
						{lastMsg?.content ?? "No messages yet"}
					</p>
					{hasUnread && (
						<span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
							{conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
						</span>
					)}
				</div>
			</div>
		</Link>
	);
}
