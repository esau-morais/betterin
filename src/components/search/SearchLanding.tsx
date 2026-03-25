import {
	ArrowRightIcon,
	BriefcaseIcon,
	ClockIcon,
	GlobeIcon,
	MapPinIcon,
	UserCircleIcon,
	UsersIcon,
	XIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { JobResultCard } from "#/components/search/JobResultCard";
import { PostResultCard } from "#/components/search/PostResultCard";
import {
	clearRecentSearches,
	getRecentSearches,
	removeRecentSearch,
} from "#/components/search/recent-searches";
import { UserAvatar } from "#/components/shared/UserAvatar";
import {
	latestJobsQueryOptions,
	networkPostsQueryOptions,
	suggestedPeopleQueryOptions,
} from "#/lib/queries";
import { cn } from "#/lib/utils";

function RecentSearches() {
	const [searches, setSearches] = useState<string[]>([]);

	useEffect(() => {
		setSearches(getRecentSearches());
	}, []);

	if (searches.length === 0) return null;

	function handleRemove(query: string) {
		removeRecentSearch(query);
		setSearches(getRecentSearches());
	}

	function handleClear() {
		clearRecentSearches();
		setSearches([]);
	}

	return (
		<section aria-labelledby="recent-heading">
			<div className="flex items-center justify-between">
				<h2
					id="recent-heading"
					className="text-sm font-medium uppercase tracking-wide text-muted-foreground"
				>
					Recent
				</h2>
				<button
					type="button"
					onClick={handleClear}
					className="text-sm text-muted-foreground transition-colors hover:text-foreground"
				>
					Clear all
				</button>
			</div>
			<div className="mt-2 flex flex-wrap gap-2">
				{searches.map((query) => (
					<div
						key={query}
						className="group flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm transition-shadow hover:shadow-sm"
					>
						<ClockIcon className="size-3.5 shrink-0 text-muted-foreground" />
						<Link
							to="/search"
							search={{ q: query }}
							className="text-foreground"
						>
							{query}
						</Link>
						<button
							type="button"
							onClick={() => handleRemove(query)}
							className="ml-0.5 rounded-full p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
							aria-label={`Remove "${query}" from recent searches`}
						>
							<XIcon className="size-3" />
						</button>
					</div>
				))}
			</div>
		</section>
	);
}

type BrowsePill = {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	to?: string;
	search: Record<string, string | boolean | undefined>;
};

function BrowsePills({ userLocation }: { userLocation?: string | null }) {
	const pills: BrowsePill[] = [
		{
			icon: GlobeIcon,
			label: "Remote Jobs",
			to: "/jobs",
			search: { remote: "remote" },
		},
		{
			icon: UserCircleIcon,
			label: "Open to Work",
			search: { tab: "people", openToWork: true },
		},
		{
			icon: UsersIcon,
			label: "People in My Network",
			search: { tab: "people", degree: "connections" },
		},
		...(userLocation
			? [
					{
						icon: MapPinIcon,
						label: `Jobs in ${userLocation}`,
						to: "/jobs",
						search: {
							location: userLocation,
						},
					},
				]
			: [
					{
						icon: BriefcaseIcon,
						label: "Browse All Jobs",
						to: "/jobs",
						search: {},
					},
				]),
	];

	return (
		<section aria-labelledby="browse-heading">
			<h2
				id="browse-heading"
				className="text-sm font-medium uppercase tracking-wide text-muted-foreground"
			>
				Browse
			</h2>
			<div className="mt-2 grid grid-cols-2 gap-2">
				{pills.map((pill) => (
					<Link
						key={pill.label}
						to={pill.to ?? "/search"}
						search={pill.search as Record<string, string>}
						className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm font-medium text-foreground transition-shadow hover:shadow-sm"
					>
						<pill.icon className="size-4 shrink-0 text-muted-foreground" />
						<span className="truncate">{pill.label}</span>
					</Link>
				))}
			</div>
		</section>
	);
}

function SectionSkeleton({ lines }: { lines: number }) {
	return (
		<div className="space-y-3">
			{Array.from({ length: lines }).map((_, i) => {
				const key = `section-skel-${String(i)}`;
				return (
					<div
						key={key}
						className="rounded-xl border border-border bg-card p-4"
					>
						<div className="flex items-start gap-3">
							<div className="size-10 shrink-0 animate-pulse rounded-full bg-muted" />
							<div className="flex-1 space-y-2">
								<div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
								<div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}

function LandingSectionHeader({
	id,
	title,
	subtitle,
	linkLabel,
	linkTo,
	linkSearch,
}: {
	id: string;
	title: string;
	subtitle: string;
	linkLabel?: string;
	linkTo?: string;
	linkSearch?: Record<string, string>;
}) {
	return (
		<div className="flex items-start justify-between gap-4">
			<div>
				<h2 id={id} className="text-lg font-semibold text-foreground">
					{title}
				</h2>
				<p className="text-sm text-muted-foreground">{subtitle}</p>
			</div>
			{linkLabel && linkTo && (
				<Link
					to={linkTo}
					search={linkSearch}
					className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:underline"
				>
					{linkLabel}
					<ArrowRightIcon className="size-3.5" />
				</Link>
			)}
		</div>
	);
}

function LatestJobsSection() {
	const { data, isLoading } = useQuery(latestJobsQueryOptions());

	if (isLoading) {
		return (
			<section aria-labelledby="latest-jobs-heading">
				<LandingSectionHeader
					id="latest-jobs-heading"
					title="Latest Jobs"
					subtitle="Most recently posted open positions"
				/>
				<div className="mt-3">
					<SectionSkeleton lines={3} />
				</div>
			</section>
		);
	}

	if (!data || data.results.length === 0) return null;

	return (
		<section aria-labelledby="latest-jobs-heading" className="animate-fade-up">
			<LandingSectionHeader
				id="latest-jobs-heading"
				title="Latest Jobs"
				subtitle="Most recently posted open positions"
				linkLabel="See all jobs"
				linkTo="/jobs"
			/>
			<div className="mt-3 space-y-2">
				{data.results.map((job) => (
					<JobResultCard key={job.id} job={job} query="" />
				))}
			</div>
		</section>
	);
}

function SuggestedPeopleSection() {
	const { data, isLoading } = useQuery(suggestedPeopleQueryOptions());

	if (isLoading) {
		return (
			<section aria-labelledby="people-heading">
				<LandingSectionHeader
					id="people-heading"
					title="People You May Know"
					subtitle="Based on shared connections"
				/>
				<div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
					{["ppl-a", "ppl-b", "ppl-c"].map((key) => (
						<div
							key={key}
							className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4"
						>
							<div className="size-12 animate-pulse rounded-full bg-muted" />
							<div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
							<div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
						</div>
					))}
				</div>
			</section>
		);
	}

	if (!data || data.results.length === 0) return null;

	return (
		<section aria-labelledby="people-heading" className="animate-fade-up">
			<LandingSectionHeader
				id="people-heading"
				title="People You May Know"
				subtitle="Based on shared connections"
				linkLabel="See all"
				linkTo="/search"
				linkSearch={{ tab: "people" }}
			/>
			<div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
				{data.results.map((person) => (
					<Link
						key={person.id}
						to="/profile/$handle"
						params={{ handle: person.handle ?? person.id }}
						className={cn(
							"flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-shadow hover:shadow-sm",
						)}
					>
						<UserAvatar name={person.name} image={person.avatarUrl} size="lg" />
						<div className="min-w-0 w-full">
							<p className="truncate text-sm font-medium text-foreground">
								{person.name}
							</p>
							{person.headline && (
								<p className="truncate text-xs text-muted-foreground">
									{person.headline}
								</p>
							)}
						</div>
						{person.openToWork && (
							<span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
								Open to Work
							</span>
						)}
					</Link>
				))}
			</div>
		</section>
	);
}

function NetworkPostsSection() {
	const { data, isLoading } = useQuery(networkPostsQueryOptions());

	if (isLoading) {
		return (
			<section aria-labelledby="network-posts-heading">
				<LandingSectionHeader
					id="network-posts-heading"
					title="From Your Network"
					subtitle="Latest posts from your connections"
				/>
				<div className="mt-3">
					<SectionSkeleton lines={2} />
				</div>
			</section>
		);
	}

	if (!data || data.results.length === 0) return null;

	return (
		<section
			aria-labelledby="network-posts-heading"
			className="animate-fade-up"
		>
			<LandingSectionHeader
				id="network-posts-heading"
				title="From Your Network"
				subtitle="Latest posts from your connections"
				linkLabel="See all posts"
				linkTo="/search"
				linkSearch={{ tab: "posts", fromNetwork: "true" }}
			/>
			<div className="mt-3 space-y-2">
				{data.results.map((post) => (
					<PostResultCard key={post.id} post={post} query="" />
				))}
			</div>
		</section>
	);
}

export function SearchLanding({
	userLocation,
}: {
	userLocation?: string | null;
}) {
	return (
		<div className="space-y-8">
			<RecentSearches />
			<BrowsePills userLocation={userLocation} />
			<LatestJobsSection />
			<SuggestedPeopleSection />
			<NetworkPostsSection />
		</div>
	);
}
