import {
	ArchiveIcon,
	ArrowLeftIcon,
	PencilSimpleIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { AnimatePresence, m } from "motion/react";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { ConversationList } from "#/components/messages/ConversationList";
import { ConversationListSkeleton } from "#/components/messages/MessagesSkeleton";
import { NewConversationPanel } from "#/components/messages/NewConversationPanel";
import { TimeAgo } from "#/components/shared/TimeAgo";
import { UserAvatar } from "#/components/shared/UserAvatar";
import {
	archivedConversationsQueryOptions,
	archivedCountQueryOptions,
	conversationsQueryOptions,
} from "#/lib/queries";
import type { ConversationListItem } from "#/lib/server/messages";
import { unarchiveConversationFn } from "#/lib/server/messages";
import { cn } from "#/lib/utils";

type SidebarView = "list" | "compose" | "archived";

const panelVariants = {
	enter: (d: number) => ({ x: d * 8, opacity: 0 }),
	center: { x: 0, opacity: 1 },
	exit: (d: number) => ({ x: d * -8, opacity: 0 }),
};

const panelEase: [number, number, number, number] = [0.32, 0.72, 0, 1];
const panelTransition = { duration: 0.12, ease: panelEase };

export const Route = createFileRoute("/_authed/messages")({
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(conversationsQueryOptions()),
	component: MessagesLayout,
});

function MessagesLayout() {
	const { data: conversations = [] } = useQuery(conversationsQueryOptions());
	const { data: archivedCount } = useQuery(archivedCountQueryOptions());
	const [view, setView] = useState<SidebarView>("list");

	const matches = useMatches();
	const childMatch = matches.find((m) => m.routeId === "/_authed/messages/$id");
	const activeId = childMatch?.params
		? (childMatch.params as { id: string }).id
		: undefined;
	const hasActiveConversation = !!activeId;

	const customDir = view === "list" ? -1 : 1;

	return (
		<div className="flex h-full lg:rounded-r-xl border border-border border-t-0 border-b-0 lg:border-b bg-card overflow-hidden">
			<div
				className={cn(
					"relative w-full lg:w-80 lg:shrink-0 lg:border-r lg:border-border overflow-hidden",
					hasActiveConversation ? "hidden lg:block" : "block",
				)}
			>
				<AnimatePresence mode="popLayout" custom={customDir} initial={false}>
					{view === "compose" ? (
						<m.div
							key="compose"
							custom={1}
							variants={panelVariants}
							initial="enter"
							animate="center"
							exit="exit"
							transition={panelTransition}
							className="absolute inset-0 flex flex-col"
						>
							<NewConversationPanel onBack={() => setView("list")} />
						</m.div>
					) : view === "archived" ? (
						<m.div
							key="archived"
							custom={1}
							variants={panelVariants}
							initial="enter"
							animate="center"
							exit="exit"
							transition={panelTransition}
							className="absolute inset-0 flex flex-col"
						>
							<ArchivedPanel onBack={() => setView("list")} />
						</m.div>
					) : (
						<m.div
							key="list"
							custom={-1}
							variants={panelVariants}
							initial="enter"
							animate="center"
							exit="exit"
							transition={panelTransition}
							className="absolute inset-0 flex flex-col"
						>
							<div className="flex h-14 shrink-0 items-center justify-between border-b border-border pl-4 pr-2">
								<h1 className="text-lg font-semibold text-foreground">
									Messages
								</h1>
								<button
									type="button"
									onClick={() => setView("compose")}
									className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
									aria-label="New message"
								>
									<PencilSimpleIcon className="size-4" />
								</button>
							</div>
							<div className="flex-1 overflow-y-auto overscroll-contain">
								<Suspense fallback={<ConversationListSkeleton />}>
									<ConversationList
										conversations={conversations}
										activeId={activeId}
									/>
								</Suspense>
							</div>
							{(archivedCount?.count ?? 0) > 0 && (
								<button
									type="button"
									onClick={() => setView("archived")}
									className="flex h-12 shrink-0 items-center gap-3 border-t border-border px-4 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
								>
									<ArchiveIcon className="size-4" />
									<span>Archived ({archivedCount?.count})</span>
								</button>
							)}
						</m.div>
					)}
				</AnimatePresence>
			</div>

			<div
				className={cn(
					"flex-1 flex flex-col min-w-0",
					hasActiveConversation ? "flex" : "hidden lg:flex",
				)}
			>
				{hasActiveConversation ? (
					<Outlet />
				) : (
					<div className="flex flex-1 items-center justify-center">
						<p className="text-sm text-muted-foreground">
							Select a conversation or start a new one
						</p>
					</div>
				)}
			</div>
		</div>
	);
}

function ArchivedPanel({ onBack }: { onBack: () => void }) {
	const { data: archived = [] } = useQuery(archivedConversationsQueryOptions());

	return (
		<>
			<div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-3">
				<button
					type="button"
					onClick={onBack}
					className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
					aria-label="Back to conversations"
				>
					<ArrowLeftIcon className="size-4" />
				</button>
				<h2 className="text-sm font-semibold text-foreground">Archived</h2>
			</div>
			<div className="flex-1 overflow-y-auto overscroll-contain">
				{archived.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
						<div className="flex size-12 items-center justify-center rounded-full bg-muted">
							<ArchiveIcon className="size-6 text-muted-foreground" />
						</div>
						<p className="text-sm text-muted-foreground">
							No archived conversations
						</p>
					</div>
				) : (
					<div className="flex flex-col gap-0.5">
						{archived.map((conv) => (
							<ArchivedItem key={conv.id} conversation={conv} />
						))}
					</div>
				)}
			</div>
		</>
	);
}

function ArchivedItem({
	conversation,
}: {
	conversation: ConversationListItem;
}) {
	const queryClient = useQueryClient();
	const other = conversation.otherUser;
	const lastMsg = conversation.lastMessage;

	const unarchiveMutation = useMutation({
		mutationFn: () =>
			unarchiveConversationFn({ data: { conversationId: conversation.id } }),
		onSuccess: () => {
			toast.success("Conversation unarchived");
			queryClient.invalidateQueries({ queryKey: ["conversations"] });
		},
	});

	return (
		<div className="flex items-start gap-3 px-3 py-3">
			<UserAvatar
				name={other?.name ?? "User"}
				image={other?.image}
				size="lg"
				className="shrink-0"
			/>
			<div className="min-w-0 flex-1">
				<div className="flex items-center justify-between gap-2">
					<span className="truncate text-sm text-foreground">
						{other?.name ?? "Unknown"}
					</span>
					{lastMsg && (
						<TimeAgo date={lastMsg.createdAt} className="shrink-0 text-xs" />
					)}
				</div>
				<p className="truncate text-sm text-muted-foreground">
					{lastMsg?.content ?? "No messages"}
				</p>
			</div>
			<button
				type="button"
				onClick={() => unarchiveMutation.mutate()}
				disabled={unarchiveMutation.isPending}
				className="shrink-0 rounded-md px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
			>
				Unarchive
			</button>
		</div>
	);
}
