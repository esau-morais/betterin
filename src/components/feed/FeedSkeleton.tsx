export function FeedPageSkeleton() {
	return (
		<div className="space-y-4">
			<div className="bi-card space-y-3">
				<div className="flex items-center gap-3">
					<div className="size-10 rounded-full bg-muted animate-pulse shrink-0" />
					<div className="h-10 flex-1 rounded-full bg-muted animate-pulse" />
				</div>
				<div className="flex gap-4 pt-2 border-t border-border">
					<div className="h-8 w-20 rounded-lg bg-muted animate-pulse" />
					<div className="h-8 w-24 rounded-lg bg-muted animate-pulse" />
					<div className="h-8 w-20 rounded-lg bg-muted animate-pulse" />
					<div className="h-8 w-24 rounded-lg bg-muted animate-pulse" />
				</div>
			</div>
			<FeedSkeleton />
		</div>
	);
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
	return (
		<div className="space-y-3">
			{Array.from({ length: count }, (_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
				<div key={i} className="bi-card space-y-3">
					<div className="flex items-center gap-3">
						<div className="size-10 rounded-full bg-muted animate-pulse" />
						<div className="flex-1 space-y-1.5">
							<div className="h-3.5 w-1/3 rounded bg-muted animate-pulse" />
							<div className="h-3 w-1/4 rounded bg-muted animate-pulse" />
						</div>
					</div>
					<div className="space-y-2">
						<div className="h-3.5 w-full rounded bg-muted animate-pulse" />
						<div className="h-3.5 w-5/6 rounded bg-muted animate-pulse" />
						<div className="h-3.5 w-2/3 rounded bg-muted animate-pulse" />
					</div>
					<div className="flex gap-4 pt-2 border-t border-border">
						<div className="h-8 w-20 rounded-lg bg-muted animate-pulse" />
						<div className="h-8 w-24 rounded-lg bg-muted animate-pulse" />
						<div className="h-8 w-18 rounded-lg bg-muted animate-pulse" />
					</div>
				</div>
			))}
		</div>
	);
}
