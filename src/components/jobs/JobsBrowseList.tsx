import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { jobsQueryOptions } from "#/lib/queries";
import { listJobsFn } from "#/lib/server/jobs";
import type { JobFilters } from "#/lib/validation";
import { JobCard } from "./JobCard";
import { JobResultsHeader } from "./JobResultsHeader";

type JobsBrowseListProps = {
	filters: Partial<JobFilters>;
	onOpenMobileFilters: () => void;
};

export function JobsBrowseList({
	filters,
	onOpenMobileFilters,
}: JobsBrowseListProps) {
	const { data } = useSuspenseQuery(jobsQueryOptions(filters));
	const [extraPages, setExtraPages] = useState<(typeof data.results)[]>([]);
	const [nextCursor, setNextCursor] = useState(data.nextCursor);
	const [loading, setLoading] = useState(false);
	const queryClient = useQueryClient();

	const { job: selectedJobId } = useSearch({ from: "/_authed/jobs" });

	const allJobs = [data.results, ...extraPages].flat();

	async function loadMore() {
		if (!nextCursor || loading) return;
		setLoading(true);
		try {
			const more = await listJobsFn({
				data: { sort: "newest", ...filters, cursor: nextCursor },
			});
			setExtraPages((prev) => [...prev, more.results]);
			setNextCursor(more.nextCursor);
			queryClient.invalidateQueries({ queryKey: ["jobs"] });
		} finally {
			setLoading(false);
		}
	}

	const totalCount =
		"totalCount" in data ? (data.totalCount as number) : allJobs.length;

	if (allJobs.length === 0) {
		return (
			<>
				<JobResultsHeader
					totalCount={0}
					onOpenMobileFilters={onOpenMobileFilters}
				/>
				<div className="py-12 text-center text-muted-foreground text-sm">
					No jobs found. Try adjusting your filters.
				</div>
			</>
		);
	}

	return (
		<div className="space-y-3">
			<JobResultsHeader
				totalCount={totalCount}
				onOpenMobileFilters={onOpenMobileFilters}
			/>
			{allJobs.map((job) => (
				<JobCard key={job.id} job={job} isSelected={job.id === selectedJobId} />
			))}
			{nextCursor && (
				<div className="pt-2 flex justify-center">
					<button
						type="button"
						onClick={loadMore}
						disabled={loading}
						className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50"
					>
						{loading ? "Loading..." : "Load More"}
					</button>
				</div>
			)}
		</div>
	);
}
