import {
	CheckIcon,
	ClockIcon,
	EnvelopeSimpleIcon,
	PencilSimpleIcon,
	PlusIcon,
	UserPlusIcon,
} from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { getOrCreateConversationFn } from "#/lib/server/messages";
import type { ConnectionStatus } from "#/lib/server/profile";
import {
	acceptConnectionFn,
	removeConnectionFn,
	sendConnectionRequestFn,
	withdrawConnectionFn,
} from "#/lib/server/profile";

export function ConnectionButton({
	connectionStatus: initialStatus,
	targetUserId,
	onEditProfile,
	onAddSection,
}: {
	connectionStatus: ConnectionStatus;
	targetUserId: string;
	onEditProfile?: () => void;
	onAddSection?: () => void;
}) {
	const navigate = useNavigate();
	const [status, setStatus] = useState(initialStatus);

	const connectMutation = useMutation({
		mutationFn: () => sendConnectionRequestFn({ data: { targetUserId } }),
		onSuccess: (result) => {
			setStatus(result.status === "connected" ? "connected" : "pending_sent");
		},
	});

	const acceptMutation = useMutation({
		mutationFn: () =>
			acceptConnectionFn({ data: { requesterId: targetUserId } }),
		onSuccess: () => setStatus("connected"),
	});

	const withdrawMutation = useMutation({
		mutationFn: () => withdrawConnectionFn({ data: { targetUserId } }),
		onSuccess: () => setStatus("none"),
	});

	const removeMutation = useMutation({
		mutationFn: () => removeConnectionFn({ data: { targetUserId } }),
		onSuccess: () => setStatus("none"),
	});

	const messageMutation = useMutation({
		mutationFn: () =>
			getOrCreateConversationFn({ data: { recipientId: targetUserId } }),
		onSuccess: ({ conversationId }) => {
			navigate({ to: "/messages/$id", params: { id: conversationId } });
		},
	});

	const isPending =
		connectMutation.isPending ||
		acceptMutation.isPending ||
		withdrawMutation.isPending ||
		removeMutation.isPending ||
		messageMutation.isPending;

	if (status === "blocked") return null;

	return (
		<div className="flex flex-wrap items-center gap-2">
			{status === "self" && (
				<>
					<Button variant="outline" size="sm" onClick={onEditProfile}>
						<PencilSimpleIcon className="size-3.5" />
						Edit profile
					</Button>
					<Button variant="outline" size="sm" onClick={onAddSection}>
						<PlusIcon className="size-3.5" />
						Add section
					</Button>
				</>
			)}

			{status === "none" && (
				<Button
					variant="default"
					size="sm"
					disabled={isPending}
					onClick={() => connectMutation.mutate()}
				>
					<UserPlusIcon className="size-3.5" />
					Connect
				</Button>
			)}

			{status === "pending_sent" && (
				<Button
					variant="outline"
					size="sm"
					onClick={() => withdrawMutation.mutate()}
					disabled={isPending}
				>
					<ClockIcon className="size-3.5" />
					Pending
				</Button>
			)}

			{status === "pending_received" && (
				<Button
					variant="default"
					size="sm"
					disabled={isPending}
					onClick={() => acceptMutation.mutate()}
				>
					<CheckIcon className="size-3.5" />
					Accept
				</Button>
			)}

			{status === "connected" && (
				<>
					<Button
						variant="outline"
						size="sm"
						onClick={() => removeMutation.mutate()}
						disabled={isPending}
					>
						<CheckIcon className="size-3.5" />
						Connected
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={isPending}
						onClick={() => messageMutation.mutate()}
					>
						<EnvelopeSimpleIcon className="size-3.5" />
						Message
					</Button>
				</>
			)}
		</div>
	);
}
