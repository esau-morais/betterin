export function ProfileSkeleton() {
	return (
		<div className="space-y-4">
			<div>
				<div className="aspect-[4/1] max-h-[200px] w-full rounded-t-xl bg-muted animate-pulse" />
				<div className="bg-card border border-border border-t-0 rounded-b-xl p-5">
					<div className="flex flex-col gap-3">
						<div className="-mt-14">
							<div className="size-24 rounded-full bg-muted animate-pulse ring-4 ring-card" />
						</div>
						<div className="space-y-2">
							<div className="h-5 w-48 rounded bg-muted animate-pulse" />
							<div className="h-4 w-64 rounded bg-muted animate-pulse" />
							<div className="h-3.5 w-40 rounded bg-muted animate-pulse" />
						</div>
						<div className="flex gap-2">
							<div className="h-7 w-24 rounded-full bg-muted animate-pulse" />
							<div className="h-7 w-24 rounded-full bg-muted animate-pulse" />
						</div>
					</div>
				</div>
			</div>

			<div className="bi-card space-y-3">
				<div className="h-5 w-20 rounded bg-muted animate-pulse" />
				<div className="space-y-2">
					<div className="h-3.5 w-full rounded bg-muted animate-pulse" />
					<div className="h-3.5 w-5/6 rounded bg-muted animate-pulse" />
					<div className="h-3.5 w-2/3 rounded bg-muted animate-pulse" />
				</div>
			</div>

			<div className="bi-card space-y-3">
				<div className="h-5 w-28 rounded bg-muted animate-pulse" />
				<div className="flex gap-2">
					<div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
					<div className="h-6 w-24 rounded-full bg-muted animate-pulse" />
					<div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
					<div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
				</div>
			</div>

			<div className="bi-card space-y-4">
				<div className="h-5 w-32 rounded bg-muted animate-pulse" />
				{[1, 2].map((id) => (
					<div key={id} className="flex gap-3">
						<div className="size-12 rounded-xl bg-muted animate-pulse shrink-0" />
						<div className="flex-1 space-y-2">
							<div className="h-4 w-48 rounded bg-muted animate-pulse" />
							<div className="h-3.5 w-36 rounded bg-muted animate-pulse" />
							<div className="h-3 w-44 rounded bg-muted animate-pulse" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
