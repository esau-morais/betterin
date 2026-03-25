import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { savedJobsQueryOptions } from "#/lib/queries";
import { unsaveJobFn } from "#/lib/server/jobs";
import { JobCard } from "./JobCard";

export function SavedJobsList() {
	const queryClient = useQueryClient();
	const { data } = useSuspenseQuery(savedJobsQueryOptions());
	const jobs = data.results;

	if (jobs.length === 0) {
		return (
			<div className="py-12 text-center text-muted-foreground text-sm">
				No saved jobs yet. Bookmark jobs to find them here.
			</div>
		);
	}

	async function handleUnsave(jobId: string) {
		try {
			await unsaveJobFn({ data: { jobId } });
			queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
		} catch {}
	}

	return (
		<div className="space-y-3">
			{jobs.map((job) => (
				<JobCard
					key={job.id}
					job={{
						id: job.jobId,
						title: job.title,
						company: job.company,
						companySlug: job.companySlug,
						companyLogoUrl: job.companyLogoUrl,
						companyVerified: job.companyVerified,
						location: job.location,
						remote: job.remote,
						salaryMin: job.salaryMin,
						salaryMax: job.salaryMax,
						currency: job.currency,
						tags: job.tags,
						createdAt: job.createdAt,
						isSaved: true,
						applyUrl: null,
					}}
					onSaveToggle={(_, saved) => {
						if (!saved) handleUnsave(job.jobId);
					}}
				/>
			))}
		</div>
	);
}
