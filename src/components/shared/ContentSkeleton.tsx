export function ContentSkeleton() {
	return (
		<div className="space-y-4">
			<div className="bi-card space-y-3">
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
					<div className="h-3.5 w-4/6 rounded bg-muted animate-pulse" />
				</div>
			</div>
			<div className="bi-card space-y-3">
				<div className="h-4 w-2/5 rounded bg-muted animate-pulse" />
				<div className="space-y-2">
					<div className="h-3.5 w-full rounded bg-muted animate-pulse" />
					<div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
				</div>
			</div>
		</div>
	);
}
