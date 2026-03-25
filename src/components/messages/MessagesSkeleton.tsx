import { Skeleton } from "#/components/ui/skeleton";
import { cn } from "#/lib/utils";

const CONV_SKEL_IDS = ["cs-1", "cs-2", "cs-3", "cs-4", "cs-5", "cs-6"];
const MSG_SKEL_IDS = [
	"ms-1",
	"ms-2",
	"ms-3",
	"ms-4",
	"ms-5",
	"ms-6",
	"ms-7",
	"ms-8",
];

export function ConversationListSkeleton() {
	return (
		<div className="flex flex-col gap-1">
			{CONV_SKEL_IDS.map((id) => (
				<div key={id} className="flex items-start gap-3 px-3 py-3">
					<Skeleton className="size-10 shrink-0 rounded-full" />
					<div className="min-w-0 flex-1 space-y-2">
						<div className="flex items-center justify-between">
							<Skeleton className="h-3.5 w-24" />
							<Skeleton className="h-3 w-8" />
						</div>
						<Skeleton className="h-3 w-3/4" />
					</div>
				</div>
			))}
		</div>
	);
}

export function MessageThreadSkeleton() {
	return (
		<div className="flex flex-1 flex-col gap-2 px-4 py-3">
			{MSG_SKEL_IDS.map((id, i) => (
				<div
					key={id}
					className={i % 3 === 0 ? "flex justify-end" : "flex justify-start"}
				>
					<Skeleton
						className={cn("h-10 rounded-xl", i % 3 === 0 ? "w-2/5" : "w-3/5")}
					/>
				</div>
			))}
		</div>
	);
}
