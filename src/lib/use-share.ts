import { useCallback } from "react";
import { toast } from "sonner";
import { logFeedEventFn } from "#/lib/server/feed-events";

export function useShare(postId: string, authorName: string) {
	const share = useCallback(async () => {
		const url = `${window.location.origin}/post/${postId}`;
		const shareData = {
			title: `${authorName} on Better In`,
			text: `Check out this post by ${authorName}`,
			url,
		};

		try {
			if (navigator.canShare?.(shareData)) {
				await navigator.share(shareData);
			} else {
				await navigator.clipboard.writeText(url);
				toast("Link copied to clipboard");
			}
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") return;
			await navigator.clipboard.writeText(url);
			toast("Link copied to clipboard");
		}

		logFeedEventFn({ data: { postId, action: "share" } }).catch(() => {});
	}, [postId, authorName]);

	return { share };
}
