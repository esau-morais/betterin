function SkeletonCard() {
	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<div className="flex items-start gap-3">
				<div className="size-10 shrink-0 animate-pulse rounded-full bg-muted" />
				<div className="flex min-w-0 flex-1 flex-col gap-2">
					<div className="h-4 w-2/5 animate-pulse rounded bg-muted" />
					<div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
					<div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
				</div>
			</div>
		</div>
	);
}

export function SearchSkeleton() {
	return (
		<div className="space-y-3">
			<SkeletonCard />
			<SkeletonCard />
			<SkeletonCard />
			<SkeletonCard />
		</div>
	);
}

export function SearchSectionSkeleton() {
	return (
		<div className="space-y-2">
			<div className="h-5 w-20 animate-pulse rounded bg-muted" />
			<SkeletonCard />
			<SkeletonCard />
		</div>
	);
}
