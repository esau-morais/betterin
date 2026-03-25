import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { z } from "zod";
import { JobFilters } from "#/components/jobs/JobFilters";
import { JobsBrowseList } from "#/components/jobs/JobsBrowseList";
import { JobsSkeleton } from "#/components/jobs/JobsSkeleton";
import { MyApplicationsList } from "#/components/jobs/MyApplicationsList";
import { PostJobDialog } from "#/components/jobs/PostJobDialog";
import { SavedJobsList } from "#/components/jobs/SavedJobsList";
import { Button } from "#/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import {
	jobExperienceLevelSchema,
	jobRemoteSchema,
	jobSortSchema,
	jobTypeSchema,
	searchTimeSchema,
} from "#/lib/validation";

const jobsSearchSchema = z.object({
	tab: z.enum(["browse", "applications", "saved"]).catch("browse"),
	job: z.string().optional(),
	remote: jobRemoteSchema.optional(),
	salaryMin: z.number().optional(),
	salaryMax: z.number().optional(),
	datePosted: searchTimeSchema.optional(),
	location: z.string().optional(),
	experienceLevel: z.array(jobExperienceLevelSchema).optional(),
	jobType: z.array(jobTypeSchema).optional(),
	sort: jobSortSchema.catch("newest"),
});

export const Route = createFileRoute("/_authed/jobs")({
	validateSearch: jobsSearchSchema,
	component: JobsPage,
});

function JobsPage() {
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const [postJobOpen, setPostJobOpen] = useState(false);
	const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

	const filters = {
		remote: search.remote,
		salaryMin: search.salaryMin,
		salaryMax: search.salaryMax,
		datePosted: search.datePosted,
		location: search.location,
		experienceLevel: search.experienceLevel,
		jobType: search.jobType,
		sort: search.sort,
	};

	return (
		<>
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
						<TabsTrigger value="browse">Browse</TabsTrigger>
						<TabsTrigger value="applications">My Applications</TabsTrigger>
						<TabsTrigger value="saved">Saved</TabsTrigger>
					</TabsList>
					<Button size="sm" onClick={() => setPostJobOpen(true)}>
						Post a Job
					</Button>
				</div>

				<TabsContent value="browse">
					<Suspense fallback={<JobsSkeleton />}>
						<JobsBrowseList
							key={JSON.stringify(filters)}
							filters={filters}
							onOpenMobileFilters={() => setMobileFiltersOpen(true)}
						/>
					</Suspense>
				</TabsContent>

				<TabsContent value="applications">
					<Suspense fallback={<JobsSkeleton />}>
						<MyApplicationsList />
					</Suspense>
				</TabsContent>

				<TabsContent value="saved">
					<Suspense fallback={<JobsSkeleton />}>
						<SavedJobsList />
					</Suspense>
				</TabsContent>
			</Tabs>

			<Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
				<SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
					<SheetHeader>
						<SheetTitle>Filters</SheetTitle>
					</SheetHeader>
					<div className="px-4 pb-4">
						<JobFilters />
					</div>
				</SheetContent>
			</Sheet>

			<PostJobDialog
				open={postJobOpen}
				onOpenChange={setPostJobOpen}
				onPosted={() => setPostJobOpen(false)}
			/>
		</>
	);
}
