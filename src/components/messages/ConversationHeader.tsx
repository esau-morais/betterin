import {
	ArchiveIcon,
	ArrowLeftIcon,
	BellIcon,
	BellSlashIcon,
	DotsThreeIcon,
	FlagIcon,
	ProhibitIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "#/components/shared/UserAvatar";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Input } from "#/components/ui/input";
import { blockUserFn } from "#/lib/server/connections";
import {
	archiveConversationFn,
	deleteConversationFn,
	reportConversationFn,
	toggleMuteConversationFn,
} from "#/lib/server/messages";

interface ConversationHeaderProps {
	conversationId: string;
	isMuted: boolean;
	otherUser: {
		userId: string;
		name: string;
		image: string | null;
		handle: string | null;
		headline: string | null;
	} | null;
}

type ConfirmDialog = "delete" | "block" | "report" | null;

export function ConversationHeader({
	conversationId,
	isMuted,
	otherUser,
}: ConversationHeaderProps) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>(null);
	const [reportReason, setReportReason] = useState("");

	const invalidateConversations = () => {
		queryClient.invalidateQueries({ queryKey: ["conversations"] });
		queryClient.invalidateQueries({
			queryKey: ["conversation-info", conversationId],
		});
	};

	const navigateAway = () => {
		navigate({ to: "/messages" });
	};

	const muteMutation = useMutation({
		mutationFn: () => toggleMuteConversationFn({ data: { conversationId } }),
		onSuccess: (result) => {
			toast.success(
				result.muted ? "Conversation muted" : "Conversation unmuted",
			);
			invalidateConversations();
		},
	});

	const archiveMutation = useMutation({
		mutationFn: () => archiveConversationFn({ data: { conversationId } }),
		onSuccess: () => {
			toast.success("Conversation archived");
			invalidateConversations();
			navigateAway();
		},
	});

	const deleteMutation = useMutation({
		mutationFn: () => deleteConversationFn({ data: { conversationId } }),
		onSuccess: () => {
			toast.success("Conversation deleted");
			invalidateConversations();
			navigateAway();
		},
	});

	const reportMutation = useMutation({
		mutationFn: (reason: string) =>
			reportConversationFn({ data: { conversationId, reason } }),
		onSuccess: () => {
			toast.success("Report submitted");
			setConfirmDialog(null);
			setReportReason("");
		},
	});

	const blockMutation = useMutation({
		mutationFn: (userId: string) => blockUserFn({ data: { userId } }),
		onSuccess: () => {
			toast.success(`${otherUser?.name ?? "User"} blocked`);
			invalidateConversations();
			navigateAway();
		},
	});

	return (
		<>
			<div className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-3">
				<Link
					to="/messages"
					className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors lg:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
					aria-label="Back to conversations"
				>
					<ArrowLeftIcon className="size-4" />
				</Link>

				{otherUser && (
					<Link
						to="/profile/$handle"
						params={{ handle: otherUser.handle ?? otherUser.userId }}
						className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 hover:bg-muted/50 transition-colors"
					>
						<UserAvatar
							name={otherUser.name}
							image={otherUser.image}
							size="sm"
							className="shrink-0"
						/>
						<div className="min-w-0">
							<p className="truncate text-sm font-medium text-foreground">
								{otherUser.name}
							</p>
							{otherUser.headline && (
								<p className="truncate text-xs text-muted-foreground">
									{otherUser.headline}
								</p>
							)}
						</div>
					</Link>
				)}

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
							aria-label="Conversation options"
						>
							<DotsThreeIcon className="size-5" weight="bold" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-52">
						<DropdownMenuItem
							onSelect={() => muteMutation.mutate()}
							disabled={muteMutation.isPending}
						>
							{isMuted ? (
								<BellIcon className="size-4" />
							) : (
								<BellSlashIcon className="size-4" />
							)}
							{isMuted ? "Unmute conversation" : "Mute conversation"}
						</DropdownMenuItem>
						<DropdownMenuItem
							onSelect={() => archiveMutation.mutate()}
							disabled={archiveMutation.isPending}
						>
							<ArchiveIcon className="size-4" />
							Archive
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							variant="destructive"
							onSelect={() => setConfirmDialog("delete")}
						>
							<TrashIcon className="size-4" />
							Delete conversation
						</DropdownMenuItem>
						<DropdownMenuItem
							variant="destructive"
							onSelect={() => setConfirmDialog("report")}
						>
							<FlagIcon className="size-4" />
							Report
						</DropdownMenuItem>
						{otherUser && (
							<DropdownMenuItem
								variant="destructive"
								onSelect={() => setConfirmDialog("block")}
							>
								<ProhibitIcon className="size-4" />
								Block {otherUser.name.split(" ")[0]}
							</DropdownMenuItem>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<Dialog
				open={confirmDialog === "delete"}
				onOpenChange={(open) => !open && setConfirmDialog(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete conversation?</DialogTitle>
						<DialogDescription>
							This conversation will be removed from your inbox. The other
							person can still see it.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline">Cancel</Button>
						</DialogClose>
						<Button
							variant="destructive"
							onClick={() => deleteMutation.mutate()}
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={confirmDialog === "block"}
				onOpenChange={(open) => !open && setConfirmDialog(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Block {otherUser?.name}?</DialogTitle>
						<DialogDescription>
							They won't be able to message you or see your profile. This
							conversation will be removed.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline">Cancel</Button>
						</DialogClose>
						<Button
							variant="destructive"
							onClick={() => {
								if (otherUser) blockMutation.mutate(otherUser.userId);
							}}
							disabled={blockMutation.isPending}
						>
							{blockMutation.isPending ? "Blocking..." : "Block"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={confirmDialog === "report"}
				onOpenChange={(open) => {
					if (!open) {
						setConfirmDialog(null);
						setReportReason("");
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Report conversation</DialogTitle>
						<DialogDescription>
							Describe the issue and our team will review it.
						</DialogDescription>
					</DialogHeader>
					<Input
						placeholder="Describe the issue..."
						value={reportReason}
						onChange={(e) => setReportReason(e.target.value)}
					/>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline">Cancel</Button>
						</DialogClose>
						<Button
							variant="destructive"
							onClick={() => reportMutation.mutate(reportReason)}
							disabled={reportMutation.isPending || !reportReason.trim()}
						>
							{reportMutation.isPending ? "Reporting..." : "Report"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
