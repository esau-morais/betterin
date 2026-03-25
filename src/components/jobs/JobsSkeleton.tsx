import { Skeleton } from "#/components/ui/skeleton";

export function JobsSkeleton() {
	return (
		<div className="space-y-3">
			{Array.from({ length: 4 }).map((_, i) => (
				<div
					key={i}
					className="rounded-xl border border-border bg-card p-4 flex gap-3"
				>
					<Skeleton className="size-12 rounded-xl shrink-0" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-2/3" />
						<Skeleton className="h-3 w-1/2" />
						<Skeleton className="h-3 w-1/4" />
					</div>
				</div>
			))}
		</div>
	);
}
