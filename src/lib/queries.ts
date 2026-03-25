import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import {
	getCompanyFn,
	getCompanyMembersFn,
	getCompanyPostsFn,
	getFollowedCompaniesFn,
	getMyCompaniesFn,
	getUnverifiedClaimsFn,
	listCompaniesFn,
} from "#/lib/server/companies";
import { getFeedFn } from "#/lib/server/feed";
import {
	getJobFn,
	getMyApplicationsFn,
	getSavedJobsFn,
	listJobsFn,
} from "#/lib/server/jobs";
import {
	getArchivedCountFn,
	getConversationInfoFn,
	getMessagesFn,
	getUnreadCountFn,
	listArchivedConversationsFn,
	listConversationsFn,
} from "#/lib/server/messages";
import {
	getNotificationsFn,
	getUnreadNotificationCountFn,
} from "#/lib/server/notifications";
import { getUserPreferencesFn } from "#/lib/server/preferences";
import { searchConnectionsFn } from "#/lib/server/profile";
import { type AllSearchResult, searchAllFn } from "#/lib/server/search";
import {
	getLatestJobsFn,
	getNetworkPostsFn,
	getSuggestedPeopleFn,
} from "#/lib/server/search-landing";
import type { FeedMode, JobFilters } from "#/lib/validation";

export function feedInfiniteQueryOptions(feedMode?: FeedMode) {
	return infiniteQueryOptions({
		queryKey: ["feed", feedMode ?? "ranked"] as const,
		queryFn: ({ pageParam }: { pageParam?: string }) =>
			getFeedFn({ data: { cursor: pageParam, feedMode } }),
		getNextPageParam: (lastPage: Awaited<ReturnType<typeof getFeedFn>>) =>
			lastPage.nextCursor ?? undefined,
		initialPageParam: undefined as string | undefined,
	});
}

export function preferencesQueryOptions() {
	return queryOptions({
		queryKey: ["preferences"] as const,
		queryFn: () => getUserPreferencesFn(),
	});
}

export function searchAllQueryOptions(q: string) {
	return queryOptions<AllSearchResult>({
		queryKey: ["search-all", q] as const,
		queryFn: () => searchAllFn({ data: { q } }),
		enabled: q.length > 0,
		staleTime: 30_000,
	});
}

export function latestJobsQueryOptions() {
	return queryOptions({
		queryKey: ["search-landing", "latest-jobs"] as const,
		queryFn: () => getLatestJobsFn(),
		staleTime: 60_000,
	});
}

export function suggestedPeopleQueryOptions() {
	return queryOptions({
		queryKey: ["search-landing", "suggested-people"] as const,
		queryFn: () => getSuggestedPeopleFn(),
		staleTime: 60_000,
	});
}

export function networkPostsQueryOptions() {
	return queryOptions({
		queryKey: ["search-landing", "network-posts"] as const,
		queryFn: () => getNetworkPostsFn(),
		staleTime: 60_000,
	});
}

export function conversationsQueryOptions() {
	return queryOptions({
		queryKey: ["conversations"] as const,
		queryFn: () => listConversationsFn(),
		staleTime: 15_000,
	});
}

export function messagesQueryOptions(conversationId: string) {
	return infiniteQueryOptions({
		queryKey: ["messages", conversationId] as const,
		queryFn: ({ pageParam }: { pageParam?: string }) =>
			getMessagesFn({
				data: { conversationId, cursor: pageParam, limit: 50 },
			}),
		getNextPageParam: (lastPage: Awaited<ReturnType<typeof getMessagesFn>>) =>
			lastPage.nextCursor ?? undefined,
		initialPageParam: undefined as string | undefined,
	});
}

export function conversationInfoQueryOptions(conversationId: string) {
	return queryOptions({
		queryKey: ["conversation-info", conversationId] as const,
		queryFn: () => getConversationInfoFn({ data: { conversationId } }),
	});
}

export function archivedConversationsQueryOptions() {
	return queryOptions({
		queryKey: ["conversations", "archived"] as const,
		queryFn: () => listArchivedConversationsFn(),
		staleTime: 15_000,
	});
}

export function archivedCountQueryOptions() {
	return queryOptions({
		queryKey: ["conversations", "archived-count"] as const,
		queryFn: () => getArchivedCountFn(),
		staleTime: 15_000,
	});
}

export function unreadCountsQueryOptions() {
	return queryOptions({
		queryKey: ["unread-counts"] as const,
		queryFn: () => getUnreadCountFn(),
		staleTime: 30_000,
	});
}

export function notificationsInfiniteQueryOptions() {
	return infiniteQueryOptions({
		queryKey: ["notifications"] as const,
		queryFn: ({ pageParam }: { pageParam?: string }) =>
			getNotificationsFn({ data: { cursor: pageParam } }),
		getNextPageParam: (
			lastPage: Awaited<ReturnType<typeof getNotificationsFn>>,
		) => lastPage.nextCursor ?? undefined,
		initialPageParam: undefined as string | undefined,
	});
}

export function unreadNotificationCountQueryOptions() {
	return queryOptions({
		queryKey: ["unread-notification-count"] as const,
		queryFn: () => getUnreadNotificationCountFn(),
		staleTime: 30_000,
	});
}

export function connectionsInfiniteQueryOptions(query: string) {
	return infiniteQueryOptions({
		queryKey: ["connections-list", query] as const,
		queryFn: ({ pageParam }: { pageParam?: string }) =>
			searchConnectionsFn({
				data: { query, cursor: pageParam, limit: 20 },
			}),
		getNextPageParam: (
			lastPage: Awaited<ReturnType<typeof searchConnectionsFn>>,
		) => lastPage.nextCursor ?? undefined,
		initialPageParam: undefined as string | undefined,
	});
}

export function jobsQueryOptions(filters: Partial<JobFilters> = {}) {
	return queryOptions({
		queryKey: ["jobs", filters] as const,
		queryFn: () => listJobsFn({ data: { sort: "newest", ...filters } }),
		staleTime: 30_000,
	});
}

export function jobQueryOptions(id: string) {
	return queryOptions({
		queryKey: ["job", id] as const,
		queryFn: () => getJobFn({ data: { id } }),
		staleTime: 30_000,
	});
}

export function myApplicationsQueryOptions() {
	return queryOptions({
		queryKey: ["my-applications"] as const,
		queryFn: () => getMyApplicationsFn({ data: {} }),
		staleTime: 30_000,
	});
}

export function savedJobsQueryOptions() {
	return queryOptions({
		queryKey: ["saved-jobs"] as const,
		queryFn: () => getSavedJobsFn({ data: {} }),
		staleTime: 30_000,
	});
}

export function companyQueryOptions(slug: string) {
	return queryOptions({
		queryKey: ["company", slug] as const,
		queryFn: () => getCompanyFn({ data: { slug } }),
		staleTime: 60_000,
	});
}

export function companyMembersQueryOptions(companyId: string) {
	return queryOptions({
		queryKey: ["company-members", companyId] as const,
		queryFn: () => getCompanyMembersFn({ data: { companyId } }),
		staleTime: 60_000,
	});
}

export function unverifiedClaimsQueryOptions(companyId: string) {
	return queryOptions({
		queryKey: ["unverified-claims", companyId] as const,
		queryFn: () => getUnverifiedClaimsFn({ data: { companyId } }),
		staleTime: 30_000,
	});
}

export function companyPostsQueryOptions(companyId: string) {
	return queryOptions({
		queryKey: ["company-posts", companyId] as const,
		queryFn: () => getCompanyPostsFn({ data: { companyId } }),
		staleTime: 30_000,
	});
}

export function myCompaniesQueryOptions() {
	return queryOptions({
		queryKey: ["my-companies"] as const,
		queryFn: () => getMyCompaniesFn(),
		staleTime: 30_000,
	});
}

export function followedCompaniesQueryOptions() {
	return queryOptions({
		queryKey: ["followed-companies"] as const,
		queryFn: () => getFollowedCompaniesFn(),
		staleTime: 30_000,
	});
}

export function companyAutocompleteQueryOptions(q: string) {
	return queryOptions({
		queryKey: ["company-autocomplete", q] as const,
		queryFn: () => listCompaniesFn({ data: { q } }),
		staleTime: 30_000,
		enabled: true,
	});
}
