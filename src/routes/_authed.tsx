import { useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	isRedirect,
	Outlet,
	redirect,
	useMatch,
	useSearch,
} from "@tanstack/react-router";
import { Suspense, useRef } from "react";
import { BusinessRightPanel } from "#/components/company/BusinessRightPanel";
import { FeedRightPanel } from "#/components/feed/FeedRightPanel";
import { JobDetailPanel } from "#/components/jobs/JobDetailPanel";
import { JobFilters } from "#/components/jobs/JobFilters";
import { AppShell } from "#/components/layout/AppShell";
import { SearchFilters } from "#/components/search/SearchFilters";
import { SearchTips } from "#/components/search/SearchTips";
import { ContentSkeleton } from "#/components/shared/ContentSkeleton";
import { computeRestrictions } from "#/lib/restrictions";
import { getSessionFn } from "#/lib/server/auth";
import { markConversationReadFn } from "#/lib/server/messages";
import { getProfileFn } from "#/lib/server/profile"; // fallback only
import { useSSE } from "#/lib/use-sse";

export const Route = createFileRoute("/_authed")({
	beforeLoad: async ({ location, context }) => {
		try {
			const session = context.session ?? (await getSessionFn());
			if (!session) {
				throw redirect({
					to: "/sign-in",
					search: {
						redirect: location.href,
						from: location.pathname,
					},
				});
			}

			const profile = context.profile ?? (await getProfileFn());

			if (!profile) {
				throw redirect({ to: "/setup-profile" });
			}

			const restrictions = computeRestrictions({
				dateOfBirth: session.user.dateOfBirth
					? new Date(session.user.dateOfBirth)
					: null,
				detectedRegion: session.user.detectedRegion ?? null,
				parentalConsentStatus: session.user.parentalConsentStatus ?? null,
			});

			return { session, profile, restrictions };
		} catch (error) {
			if (isRedirect(error)) throw error;
			throw redirect({
				to: "/sign-in",
				search: {
					redirect: location.href,
					from: location.pathname,
				},
			});
		}
	},
	pendingComponent: () => (
		<AppShell>
			<ContentSkeleton />
		</AppShell>
	),
	component: AuthedLayout,
});

function SearchRightPanel() {
	const search = useSearch({ from: "/_authed/search" });
	const tab = (search as { tab?: string }).tab;
	const hasTabFilters = tab && tab !== "all";

	if (hasTabFilters) return <SearchFilters />;
	return <SearchTips />;
}

function AuthedLayout() {
	const { session } = Route.useRouteContext();
	const queryClient = useQueryClient();
	const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
		new Map(),
	);

	const messageThreadMatch = useMatch({
		from: "/_authed/messages/$id",
		shouldThrow: false,
	});

	useSSE({
		channel: session ? `user:${session.user.id}` : null,
		onEvent: (type, payload) => {
			if (type === "typing") {
				const { conversationId, senderName } = payload as {
					conversationId: string;
					senderName: string;
				};
				queryClient.setQueryData(["typing", conversationId], senderName);
				const prev = typingTimers.current.get(conversationId);
				if (prev) clearTimeout(prev);
				typingTimers.current.set(
					conversationId,
					setTimeout(() => {
						queryClient.setQueryData(["typing", conversationId], null);
						typingTimers.current.delete(conversationId);
					}, 5000),
				);
			}
			if (type === "new_message") {
				const { conversationId } = payload as { conversationId: string };
				if (
					messageThreadMatch?.params.id === conversationId &&
					document.visibilityState === "visible"
				) {
					markConversationReadFn({ data: { conversationId } }).then(() => {
						queryClient.invalidateQueries({ queryKey: ["conversations"] });
						queryClient.invalidateQueries({ queryKey: ["unread-counts"] });
					});
				}
			}
		},
	});

	const searchMatch = useMatch({
		from: "/_authed/search",
		shouldThrow: false,
	});
	const analyticsMatch = useMatch({
		from: "/_authed/post/$postId/analytics",
		shouldThrow: false,
	});
	const messagesMatch = useMatch({
		from: "/_authed/messages",
		shouldThrow: false,
	});
	const jobsMatch = useMatch({
		from: "/_authed/jobs",
		shouldThrow: false,
	});
	const businessMatch = useMatch({
		from: "/_authed/business",
		shouldThrow: false,
	});
	const writeMatch = useMatch({
		from: "/_authed/write",
		shouldThrow: false,
	});
	const settingsMatch = useMatch({
		from: "/_authed/settings",
		shouldThrow: false,
	});

	const jobsSearch = useSearch({ strict: false }) as { job?: string };

	const hideRightPanel =
		!!analyticsMatch || !!messagesMatch || !!writeMatch || !!settingsMatch;
	const isFullWidth = !!messagesMatch || !!writeMatch;
	const isWide = !!analyticsMatch || !!settingsMatch;
	const rightPanel = hideRightPanel ? undefined : searchMatch ? (
		<SearchRightPanel />
	) : jobsMatch ? (
		jobsSearch.job ? (
			<Suspense fallback={null}>
				<JobDetailPanel jobId={jobsSearch.job} />
			</Suspense>
		) : (
			<JobFilters />
		)
	) : businessMatch ? (
		<Suspense fallback={null}>
			<BusinessRightPanel />
		</Suspense>
	) : (
		<FeedRightPanel />
	);

	const isFlush = !!messagesMatch;

	return (
		<AppShell
			rightPanel={rightPanel}
			wide={isWide}
			fullWidth={isFullWidth}
			flush={isFlush}
		>
			<Outlet />
		</AppShell>
	);
}
