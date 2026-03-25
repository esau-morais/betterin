import {
	BellIcon,
	BriefcaseIcon,
	ChatCircleIcon,
	CheckIcon,
	GearIcon,
	HandsClappingIcon,
	HeartIcon,
	LightbulbIcon,
	ThumbsUpIcon,
	UserPlusIcon,
	UsersIcon,
	WarningIcon,
} from "@phosphor-icons/react";
import {
	useInfiniteQuery,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { TimeAgo } from "#/components/shared/TimeAgo";
import { UserAvatar } from "#/components/shared/UserAvatar";
import { Button } from "#/components/ui/button";
import { notificationsInfiniteQueryOptions } from "#/lib/queries";
import { markNotificationsReadFn } from "#/lib/server/notifications";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/_authed/notifications")({
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureInfiniteQueryData(notificationsInfiniteQueryOptions()),
	component: NotificationsPage,
});

const VERB_MAP: Record<string, string> = {
	connection_request: "wants to connect",
	connection_accepted: "accepted your connection",
	post_reaction: "reacted to your post",
	post_comment: "commented on your post",
	job_match: "New job match",
	message: "sent you a message",
	experience_disputed: "disputed your experience",
};

const REACTION_ICONS: Record<
	string,
	{ icon: typeof HeartIcon; className: string }
> = {
	like: { icon: ThumbsUpIcon, className: "text-blue-500" },
	insightful: { icon: LightbulbIcon, className: "text-amber-500" },
	celebrate: { icon: HandsClappingIcon, className: "text-green-500" },
	support: { icon: HeartIcon, className: "text-rose-500" },
};

const TYPE_ICONS: Record<
	string,
	{ icon: typeof HeartIcon; className: string }
> = {
	post_reaction: { icon: HeartIcon, className: "text-rose-500" },
	post_comment: { icon: ChatCircleIcon, className: "text-blue-500" },
	connection_request: { icon: UserPlusIcon, className: "text-brand" },
	connection_accepted: { icon: UsersIcon, className: "text-green-500" },
	job_match: { icon: BriefcaseIcon, className: "text-amber-500" },
	message: { icon: ChatCircleIcon, className: "text-brand" },
	experience_disputed: { icon: WarningIcon, className: "text-orange-500" },
};

function getNotificationLink(n: {
	type: string;
	entityId: string | null;
	actorHandle: string | null;
}): string {
	switch (n.type) {
		case "post_reaction":
		case "post_comment":
			return n.entityId ? `/post/${n.entityId}` : "/notifications";
		case "connection_request":
		case "connection_accepted":
			return n.actorHandle ? `/profile/${n.actorHandle}` : "/notifications";
		case "job_match":
			return "/jobs";
		case "message":
			return "/messages";
		case "experience_disputed":
			return "/profile/me";
		default:
			return "/notifications";
	}
}

function NotificationsPage() {
	const queryClient = useQueryClient();
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useInfiniteQuery(notificationsInfiniteQueryOptions());

	const notifications = data?.pages.flatMap((p) => p.notifications) ?? [];
	const hasUnread = notifications.some((n) => !n.read);

	const markAllRead = useMutation({
		mutationFn: () => markNotificationsReadFn({ data: {} }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
			queryClient.invalidateQueries({
				queryKey: ["unread-notification-count"],
			});
		},
	});

	const sentinelRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const el = sentinelRef.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{ threshold: 0 },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	const markedRef = useRef(false);
	useEffect(() => {
		if (markedRef.current || !hasUnread) return;
		markedRef.current = true;
		const timer = setTimeout(() => {
			markNotificationsReadFn({ data: {} }).then(() => {
				queryClient.invalidateQueries({
					queryKey: ["unread-notification-count"],
				});
			});
		}, 500);
		return () => clearTimeout(timer);
	}, [hasUnread, queryClient]);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-xl font-semibold text-foreground">Notifications</h1>
				<div className="flex items-center gap-2">
					<Link
						to="/settings/notifications"
						className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
						aria-label="Notification settings"
					>
						<GearIcon className="size-5" />
					</Link>
					{hasUnread && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => markAllRead.mutate()}
							disabled={markAllRead.isPending}
						>
							<CheckIcon className="size-4 mr-1.5" />
							Mark all read
						</Button>
					)}
				</div>
			</div>

			{notifications.length === 0 ? (
				<div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
					<BellIcon className="size-10" />
					<p className="text-sm">No notifications yet</p>
				</div>
			) : (
				<div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
					{notifications.map((n) => (
						<NotificationItem key={n.id} n={n} />
					))}
				</div>
			)}

			<div ref={sentinelRef} className="h-1" />
			{isFetchingNextPage && (
				<p className="text-center text-xs text-muted-foreground py-2">
					Loading more…
				</p>
			)}
		</div>
	);
}

function NotificationItem({
	n,
}: {
	n: {
		id: string;
		type: string;
		actorId: string | null;
		actorName: string | null;
		actorHandle: string | null;
		actorImage: string | null;
		entityId: string | null;
		entityType: string | null;
		read: boolean;
		createdAt: string;
		postContent?: string | null;
		reactionType?: string | null;
		commentContent?: string | null;
		jobTitle?: string | null;
		jobCompany?: string | null;
	};
}) {
	const reactionInfo =
		n.type === "post_reaction" && n.reactionType
			? REACTION_ICONS[n.reactionType]
			: null;
	const typeInfo = reactionInfo ?? TYPE_ICONS[n.type];
	const TypeIcon = typeInfo?.icon ?? BellIcon;
	const iconClass = typeInfo?.className ?? "text-muted-foreground";

	return (
		<Link
			to={getNotificationLink(n)}
			className={cn(
				"flex gap-4 px-5 py-4 transition-colors hover:bg-muted/50",
				!n.read && "bg-accent/30",
			)}
		>
			<TypeIcon className={cn("size-5 shrink-0", iconClass)} weight="duotone" />

			<div className="flex-1 space-y-2">
				<div className="flex items-center gap-2.5">
					<UserAvatar
						name={n.actorName ?? "?"}
						image={n.actorImage}
						size="sm"
					/>
					<div className="flex-1 flex items-center justify-between">
						<p className="text-sm">
							<span className="font-medium">{n.actorName ?? "Someone"}</span>{" "}
							{VERB_MAP[n.type] ?? n.type}
						</p>
						<TimeAgo date={n.createdAt} className="text-xs" />
					</div>
				</div>

				{n.type === "job_match" && n.jobTitle && (
					<p className="text-sm font-medium text-foreground">
						{n.jobTitle}
						{n.jobCompany && (
							<span className="font-normal text-muted-foreground">
								{" "}
								at {n.jobCompany}
							</span>
						)}
					</p>
				)}

				{n.postContent && (
					<p className="text-sm text-muted-foreground line-clamp-2">
						{n.postContent}
					</p>
				)}

				{n.type === "post_comment" && n.commentContent && (
					<p className="text-sm text-foreground/80 line-clamp-2 border-l-2 border-border pl-2.5">
						{n.commentContent}
					</p>
				)}
			</div>
		</Link>
	);
}
