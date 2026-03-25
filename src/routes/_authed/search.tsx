import {
	ArrowLeftIcon,
	ArrowRightIcon,
	MagnifyingGlassIcon,
	SpinnerIcon,
} from "@phosphor-icons/react";
import {
	keepPreviousData,
	useInfiniteQuery,
	useQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { CompanyResultCard } from "#/components/search/CompanyResultCard";
import { DidYouMeanBanner } from "#/components/search/DidYouMeanBanner";
import { JobResultCard } from "#/components/search/JobResultCard";
import { PeopleResultCard } from "#/components/search/PeopleResultCard";
import { PostResultCard } from "#/components/search/PostResultCard";
import { SearchLanding } from "#/components/search/SearchLanding";
import { SearchSkeleton } from "#/components/search/SearchSkeleton";
import {
	COMPANY_SIZES,
	type CompanySize,
	SEARCH_TABS,
	type SearchParams,
	type SearchTab,
	TIME_FILTERS,
	type TimeFilter,
} from "#/components/search/types";
import {
	latestJobsQueryOptions,
	networkPostsQueryOptions,
	searchAllQueryOptions,
	suggestedPeopleQueryOptions,
} from "#/lib/queries";
import {
	searchCompaniesFn,
	searchPeopleFn,
	searchPostsFn,
} from "#/lib/server/search";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/_authed/search")({
	validateSearch: (raw: Record<string, unknown>): SearchParams => ({
		q: typeof raw.q === "string" && raw.q.trim() ? raw.q : undefined,
		tab: SEARCH_TABS.includes(raw.tab as SearchTab)
			? (raw.tab as SearchTab)
			: undefined,
		degree: raw.degree === "connections" ? "connections" : undefined,
		location: typeof raw.location === "string" ? raw.location : undefined,
		openToWork:
			raw.openToWork === true || raw.openToWork === "true" ? true : undefined,
		time: TIME_FILTERS.includes(raw.time as TimeFilter)
			? (raw.time as TimeFilter)
			: undefined,
		fromNetwork:
			raw.fromNetwork === true || raw.fromNetwork === "true" ? true : undefined,
		sort: typeof raw.sort === "string" ? raw.sort : undefined,
		industry: typeof raw.industry === "string" ? raw.industry : undefined,
		size: COMPANY_SIZES.includes(raw.size as CompanySize)
			? (raw.size as CompanySize)
			: undefined,
	}),
	loaderDeps: ({ search }) => ({ q: search.q, tab: search.tab }),
	loader: async ({ context: { queryClient }, deps: { q, tab } }) => {
		if (q && q.trim().length > 0) {
			if (!tab || tab === "all") {
				await queryClient.ensureQueryData(searchAllQueryOptions(q));
			}
		} else {
			queryClient.prefetchQuery(latestJobsQueryOptions());
			queryClient.prefetchQuery(suggestedPeopleQueryOptions());
			queryClient.prefetchQuery(networkPostsQueryOptions());
		}
	},
	component: SearchPage,
});

// A browse view is active when a tab is set (with or without a query) plus at
// least one filter param, OR when a tab is set without a query at all (e.g.
// "Browse All Jobs" has tab=jobs and nothing else — that is still a valid list
// view, not the landing page).
function isActiveBrowse(search: SearchParams): boolean {
	const { tab, q } = search;
	if (!tab || tab === "all") return false;
	// If there is a query the tab switch is handled normally; this helper is
	// only needed to escape the landing page without a query.
	if (q && q.trim().length > 0) return false;
	return true;
}

function browseTitleFor(search: SearchParams): string {
	const { tab, degree, openToWork, location, fromNetwork } = search;
	if (tab === "posts") {
		return fromNetwork ? "Posts from Your Network" : "All Posts";
	}
	if (tab === "people") {
		if (degree === "connections") return "People in My Network";
		if (openToWork) return "People Open to Work";
		if (location) return `People in ${location}`;
		return "All People";
	}
	if (tab === "companies") return "All Companies";
	return "Browse";
}

const TABS: { value: SearchTab; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "people", label: "People" },
	{ value: "companies", label: "Companies" },
	{ value: "posts", label: "Posts" },
];

function SearchTabs({ current, q }: { current: SearchTab; q: string }) {
	return (
		<nav className="flex gap-1 border-b border-border" aria-label="Search tabs">
			{TABS.map((tab) => (
				<Link
					key={tab.value}
					to="/search"
					search={{
						q,
						tab: tab.value === "all" ? undefined : tab.value,
					}}
					className={cn(
						"relative px-4 py-2.5 text-sm font-medium transition-colors",
						current === tab.value
							? "text-foreground"
							: "text-muted-foreground hover:text-foreground",
					)}
					aria-current={current === tab.value ? "page" : undefined}
				>
					{tab.label}
					{current === tab.value && (
						<span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />
					)}
				</Link>
			))}
		</nav>
	);
}

function BackButton() {
	return (
		<Link
			to="/search"
			search={{}}
			className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
			aria-label="Back to search"
		>
			<ArrowLeftIcon className="size-4" />
			Back
		</Link>
	);
}

function SectionHeader({
	title,
	total,
	tab,
	q,
	linkTo,
}: {
	title: string;
	total: number;
	tab?: SearchTab;
	q: string;
	linkTo?: string;
}) {
	return (
		<div className="flex items-center justify-between">
			<h2 className="text-lg font-semibold text-foreground">{title}</h2>
			{total > 3 && (
				<Link
					to={linkTo ?? "/search"}
					search={linkTo ? {} : { q, tab }}
					className="flex items-center gap-1 text-sm font-medium text-brand hover:underline"
				>
					See all {total}
					<ArrowRightIcon className="size-3.5" />
				</Link>
			)}
		</div>
	);
}

function LoadMoreButton({
	onClick,
	isLoading,
	shown,
	total,
}: {
	onClick: () => void;
	isLoading: boolean;
	shown: number;
	total: number;
}) {
	return (
		<div className="flex flex-col items-center gap-1 pt-2">
			<button
				type="button"
				onClick={onClick}
				disabled={isLoading}
				className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
			>
				{isLoading ? <SpinnerIcon className="size-4 animate-spin" /> : null}
				Load more
			</button>
			<span className="text-xs text-muted-foreground">
				Showing {shown} of {total}
			</span>
		</div>
	);
}

function AllResults({ q }: { q: string }) {
	const { data, isFetching, error } = useQuery({
		...searchAllQueryOptions(q),
		placeholderData: keepPreviousData,
	});

	if (error) return <EmptyState message={`No results for "${q}"`} />;
	if (!data) return <SearchSkeleton />;

	const noResults =
		data.people.total === 0 &&
		data.jobs.total === 0 &&
		data.posts.total === 0 &&
		data.companies.total === 0;

	return (
		<div className="space-y-6">
			{data.didYouMean && <DidYouMeanBanner suggestion={data.didYouMean} />}
			{noResults && !data.didYouMean && (
				<EmptyState message={`No results for "${q}"`} />
			)}

			{isFetching && (
				<div
					aria-hidden
					className="h-0.5 animate-pulse rounded-full bg-primary/40"
				/>
			)}

			{data.people.results.length > 0 && (
				<section className="space-y-2">
					<SectionHeader
						title="People"
						total={data.people.total}
						tab="people"
						q={q}
					/>
					<div className="space-y-2">
						{data.people.results.map((person) => (
							<PeopleResultCard key={person.id} person={person} query={q} />
						))}
					</div>
				</section>
			)}

			{data.jobs.results.length > 0 && (
				<section className="space-y-2">
					<SectionHeader
						title="Jobs"
						total={data.jobs.total}
						q={q}
						linkTo="/jobs"
					/>
					<div className="space-y-2">
						{data.jobs.results.map((job) => (
							<JobResultCard key={job.id} job={job} query={q} />
						))}
					</div>
				</section>
			)}

			{data.companies.results.length > 0 && (
				<section className="space-y-2">
					<SectionHeader
						title="Companies"
						total={data.companies.total}
						tab="companies"
						q={q}
					/>
					<div className="space-y-2">
						{data.companies.results.map((company) => (
							<CompanyResultCard key={company.id} company={company} query={q} />
						))}
					</div>
				</section>
			)}

			{data.posts.results.length > 0 && (
				<section className="space-y-2">
					<SectionHeader
						title="Posts"
						total={data.posts.total}
						tab="posts"
						q={q}
					/>
					<div className="space-y-2">
						{data.posts.results.map((post) => (
							<PostResultCard key={post.id} post={post} query={q} />
						))}
					</div>
				</section>
			)}
		</div>
	);
}

function CompanyResults({ search }: { search: SearchParams }) {
	const q = search.q ?? "";
	const {
		data,
		error,
		isFetching,
		isFetchingNextPage,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery({
		queryKey: [
			"search-companies",
			q,
			search.sort,
			search.industry,
			search.size,
		],
		queryFn: ({ pageParam }) =>
			searchCompaniesFn({
				data: {
					q,
					industry: search.industry,
					size: search.size,
					sort: (search.sort as "relevance" | "recent") ?? "relevance",
					cursor: pageParam,
				},
			}),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		enabled: q.length > 0 || search.tab === "companies",
		staleTime: 30_000,
	});

	if (error)
		return (
			<EmptyState
				message={q ? `No results for "${q}"` : "No companies found"}
			/>
		);
	if (!data) return <SearchSkeleton />;

	const allResults = data.pages.flatMap((p) => p.results);
	const total = data.pages[0]?.total ?? 0;

	return (
		<div className="space-y-4">
			{isFetching && !isFetchingNextPage && (
				<div
					aria-hidden
					className="h-0.5 animate-pulse rounded-full bg-primary/40"
				/>
			)}
			{allResults.length === 0 && (
				<EmptyState
					message={q ? `No results for "${q}"` : "No companies found"}
				/>
			)}
			<div className="space-y-2">
				{allResults.map((company) => (
					<CompanyResultCard key={company.id} company={company} query={q} />
				))}
			</div>
			{hasNextPage && (
				<LoadMoreButton
					onClick={() => fetchNextPage()}
					isLoading={isFetchingNextPage}
					shown={allResults.length}
					total={total}
				/>
			)}
		</div>
	);
}

function PeopleResults({ search }: { search: SearchParams }) {
	const q = search.q ?? "";
	const {
		data,
		error,
		isFetching,
		isFetchingNextPage,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery({
		queryKey: [
			"search-people",
			q,
			search.degree,
			search.location,
			search.openToWork,
			search.sort,
		],
		queryFn: ({ pageParam }) =>
			searchPeopleFn({
				data: {
					q,
					degree: search.degree,
					location: search.location,
					openToWork: search.openToWork,
					sort: (search.sort as "relevance" | "recent") ?? "relevance",
					cursor: pageParam,
				},
			}),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		// Enable when there is a query OR any people-specific filter active
		enabled:
			q.length > 0 ||
			!!search.degree ||
			!!search.openToWork ||
			!!search.location,
		staleTime: 30_000,
	});

	if (error)
		return (
			<EmptyState message={q ? `No results for "${q}"` : "No people found"} />
		);
	if (!data) return <SearchSkeleton />;

	const allResults = data.pages.flatMap((p) => p.results);
	const total = data.pages[0]?.total ?? 0;
	const didYouMean = data.pages[0]?.didYouMean;

	return (
		<div className="space-y-4">
			{didYouMean && <DidYouMeanBanner suggestion={didYouMean} />}
			{isFetching && !isFetchingNextPage && (
				<div
					aria-hidden
					className="h-0.5 animate-pulse rounded-full bg-primary/40"
				/>
			)}
			{allResults.length === 0 && !didYouMean && (
				<EmptyState message={q ? `No results for "${q}"` : "No people found"} />
			)}
			<div className="space-y-2">
				{allResults.map((person) => (
					<PeopleResultCard key={person.id} person={person} query={q} />
				))}
			</div>
			{hasNextPage && (
				<LoadMoreButton
					onClick={() => fetchNextPage()}
					isLoading={isFetchingNextPage}
					shown={allResults.length}
					total={total}
				/>
			)}
		</div>
	);
}

function PostResults({ search }: { search: SearchParams }) {
	const q = search.q ?? "";
	const sentinelRef = useRef<HTMLDivElement>(null);

	const {
		data,
		error,
		isFetching,
		isFetchingNextPage,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery({
		queryKey: ["search-posts", q, search.time, search.fromNetwork, search.sort],
		queryFn: ({ pageParam }) =>
			searchPostsFn({
				data: {
					q,
					time: search.time,
					fromNetwork: search.fromNetwork,
					sort: (search.sort as "relevance" | "recent") ?? "relevance",
					cursor: pageParam,
				},
			}),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		// Enable when there is a query OR any post-specific filter active, OR when
		// tab=posts is the active browse view
		enabled:
			q.length > 0 ||
			!!search.fromNetwork ||
			!!search.time ||
			search.tab === "posts",
		staleTime: 30_000,
	});

	// Auto-load next page when sentinel enters viewport
	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel || !hasNextPage || isFetchingNextPage) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					fetchNextPage();
				}
			},
			{ rootMargin: "200px" },
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	if (error)
		return (
			<EmptyState
				message={
					q
						? `No results for "${q}"`
						: search.fromNetwork
							? "No posts from your network yet"
							: "No posts found"
				}
			/>
		);
	if (!data) return <SearchSkeleton />;

	const allResults = data.pages.flatMap((p) => p.results);
	const didYouMean = data.pages[0]?.didYouMean;

	return (
		<div className="space-y-4">
			{didYouMean && <DidYouMeanBanner suggestion={didYouMean} />}
			{isFetching && !isFetchingNextPage && (
				<div
					aria-hidden
					className="h-0.5 animate-pulse rounded-full bg-primary/40"
				/>
			)}
			{allResults.length === 0 && !didYouMean && (
				<EmptyState
					message={
						q
							? `No results for "${q}"`
							: search.fromNetwork
								? "No posts from your network yet"
								: "No posts found"
					}
				/>
			)}
			<div className="space-y-2">
				{allResults.map((post) => (
					<PostResultCard key={post.id} post={post} query={q} />
				))}
			</div>
			{/* Sentinel for infinite scroll */}
			{hasNextPage && (
				<div ref={sentinelRef} className="flex justify-center py-4">
					{isFetchingNextPage && (
						<SpinnerIcon className="size-5 animate-spin text-muted-foreground" />
					)}
				</div>
			)}
		</div>
	);
}

function EmptyState({ message }: { message: string }) {
	return (
		<div className="flex flex-col items-center gap-3 py-12 text-center">
			<div className="flex size-12 items-center justify-center rounded-full bg-muted">
				<MagnifyingGlassIcon className="size-6 text-muted-foreground" />
			</div>
			<div>
				<p className="text-base font-medium text-foreground">{message}</p>
				<p className="mt-1 text-sm text-muted-foreground">
					Try different keywords, or check the spelling of your search.
				</p>
			</div>
		</div>
	);
}

function SearchPage() {
	const search = Route.useSearch();
	const { profile } = Route.useRouteContext();
	const q = search.q ?? "";
	const tab: SearchTab = search.tab ?? "all";
	const hasQuery = q.trim().length > 0;
	const browseActive = isActiveBrowse(search);

	return (
		<div className="space-y-4">
			{browseActive && (
				<>
					<BackButton />
					<h1 className="text-xl font-semibold text-foreground">
						{browseTitleFor(search)}
					</h1>
				</>
			)}

			{hasQuery && (
				<h1 className="text-xl font-semibold text-foreground">
					Results for "{q}"
				</h1>
			)}

			{hasQuery && <SearchTabs current={tab} q={q} />}

			{!hasQuery && !browseActive ? (
				<SearchLanding userLocation={profile?.location} />
			) : tab === "all" ? (
				<AllResults q={q} />
			) : tab === "people" ? (
				<PeopleResults search={search} />
			) : tab === "companies" ? (
				<CompanyResults search={search} />
			) : (
				<PostResults search={search} />
			)}
		</div>
	);
}
