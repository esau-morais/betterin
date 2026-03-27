import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { ConversationHeader } from "#/components/messages/ConversationHeader";
import { MessageComposer } from "#/components/messages/MessageComposer";
import { MessageThreadSkeleton } from "#/components/messages/MessagesSkeleton";
import { MessageThread } from "#/components/messages/MessageThread";
import {
	conversationInfoQueryOptions,
	messagesQueryOptions,
} from "#/lib/queries";
import {
	markConversationReadFn,
	sendMessageFn,
	sendTypingIndicatorFn,
} from "#/lib/server/messages";

export const Route = createFileRoute("/_authed/messages/$id")({
	loader: ({ params, context: { queryClient } }) => {
		queryClient.ensureQueryData(conversationInfoQueryOptions(params.id));
		queryClient.ensureInfiniteQueryData(messagesQueryOptions(params.id));
	},
	component: MessageThreadView,
});

function MessageThreadView() {
	const { id } = Route.useParams();
	const queryClient = useQueryClient();

	const { data: convInfo } = useQuery(conversationInfoQueryOptions(id));

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useInfiniteQuery(messagesQueryOptions(id));

	const messages = useMemo(
		() => data?.pages.flatMap((p) => p.messages) ?? [],
		[data],
	);

	const markReadMutation = useMutation({
		mutationFn: () => markConversationReadFn({ data: { conversationId: id } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["conversations"] });
			queryClient.invalidateQueries({ queryKey: ["unread-counts"] });
		},
	});

	useEffect(() => {
		let t: ReturnType<typeof setTimeout>;

		function markIfVisible() {
			if (document.visibilityState === "visible") {
				t = setTimeout(() => markReadMutation.mutate(), 1000);
			}
		}

		markIfVisible();
		document.addEventListener("visibilitychange", markIfVisible);
		return () => {
			clearTimeout(t);
			document.removeEventListener("visibilitychange", markIfVisible);
		};
	}, [markReadMutation.mutate]);

	const typingName = useQuery({
		queryKey: ["typing", id],
		initialData: null as string | null,
		enabled: false,
	}).data;

	const sendMutation = useMutation({
		mutationFn: (content: string) =>
			sendMessageFn({ data: { conversationId: id, content } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["messages", id] });
			queryClient.invalidateQueries({ queryKey: ["conversations"] });
		},
	});

	if (!data) return <MessageThreadSkeleton />;

	return (
		<div className="flex flex-1 flex-col min-h-0">
			<ConversationHeader
				conversationId={id}
				isMuted={convInfo?.isMuted ?? false}
				otherUser={convInfo?.otherUser ?? null}
			/>
			<MessageThread
				messages={messages}
				hasMore={!!hasNextPage}
				isLoadingMore={isFetchingNextPage}
				onLoadMore={() => fetchNextPage()}
				typingName={typingName}
			/>
			<MessageComposer
				onSend={(content) => sendMutation.mutate(content)}
				onTyping={() => sendTypingIndicatorFn({ data: { conversationId: id } })}
				disabled={sendMutation.isPending}
			/>
		</div>
	);
}
