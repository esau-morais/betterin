import { BuildingsIcon, PlusIcon } from "@phosphor-icons/react";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { CompanyCard } from "#/components/company/CompanyCard";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import {
	followedCompaniesQueryOptions,
	myCompaniesQueryOptions,
} from "#/lib/queries";
import { unfollowCompanyFn } from "#/lib/server/companies";

const businessSearchSchema = z.object({
	tab: z.enum(["mine", "following"]).default("mine").catch("mine"),
});

export const Route = createFileRoute("/_authed/business")({
	validateSearch: businessSearchSchema,
	component: BusinessPage,
});

function MyCompaniesList() {
	const { data: companies } = useSuspenseQuery(myCompaniesQueryOptions());

	if (companies.length === 0) {
		return (
			<div className="bi-card flex flex-col items-center text-center py-12">
				<BuildingsIcon className="size-10 text-muted-foreground" />
				<p className="mt-3 text-sm font-medium">No company pages yet</p>
				<p className="text-xs text-muted-foreground mt-1">
					Create a page to showcase your company and attract talent.
				</p>
				<Button size="sm" className="mt-4" asChild>
					<Link to="/business/new">
						<PlusIcon className="size-4" />
						Create Company Page
					</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{companies.map((company) => (
				<CompanyCard key={company.id} company={company} role={company.role} />
			))}
		</div>
	);
}

function FollowedCompaniesList() {
	const queryClient = useQueryClient();
	const { data: companies } = useSuspenseQuery(followedCompaniesQueryOptions());

	const unfollow = useMutation({
		mutationFn: (companyId: string) =>
			unfollowCompanyFn({ data: { companyId } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["followed-companies"] });
		},
	});

	if (companies.length === 0) {
		return (
			<div className="bi-card flex flex-col items-center text-center py-12">
				<BuildingsIcon className="size-10 text-muted-foreground" />
				<p className="mt-3 text-sm font-medium">Not following any companies</p>
				<p className="text-xs text-muted-foreground mt-1">
					Follow companies to see their updates in your feed.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{companies.map((company) => (
				<CompanyCard
					key={company.id}
					company={company}
					onUnfollow={(id) => unfollow.mutate(id)}
					unfollowPending={unfollow.isPending}
				/>
			))}
		</div>
	);
}

function BusinessPage() {
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });

	return (
		<Tabs
			value={search.tab}
			onValueChange={(v) =>
				navigate({
					search: (prev) => ({
						...prev,
						tab: v as typeof search.tab,
					}),
				})
			}
		>
			<div className="flex items-center justify-between mb-4">
				<TabsList>
					<TabsTrigger value="mine">My Pages</TabsTrigger>
					<TabsTrigger value="following">Following</TabsTrigger>
				</TabsList>
				<Button size="sm" asChild>
					<Link to="/business/new">
						<PlusIcon className="size-4" />
						Create Page
					</Link>
				</Button>
			</div>

			<TabsContent value="mine">
				<Suspense
					fallback={
						<div className="space-y-2">
							<Skeleton className="h-20 rounded-xl" />
							<Skeleton className="h-20 rounded-xl" />
						</div>
					}
				>
					<MyCompaniesList />
				</Suspense>
			</TabsContent>

			<TabsContent value="following">
				<Suspense
					fallback={
						<div className="space-y-2">
							<Skeleton className="h-20 rounded-xl" />
							<Skeleton className="h-20 rounded-xl" />
						</div>
					}
				>
					<FollowedCompaniesList />
				</Suspense>
			</TabsContent>
		</Tabs>
	);
}
