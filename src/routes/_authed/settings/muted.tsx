import { ProhibitIcon } from "@phosphor-icons/react";
import {
	queryOptions,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { UserAvatar } from "#/components/shared/UserAvatar";
import { Button } from "#/components/ui/button";
import { listMutedAuthorsFn, unmuteAuthorFn } from "#/lib/server/feed-events";

const mutedAuthorsQueryOptions = () =>
	queryOptions({
		queryKey: ["muted-authors"] as const,
		queryFn: () => listMutedAuthorsFn(),
	});

export const Route = createFileRoute("/_authed/settings/muted")({
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(mutedAuthorsQueryOptions()),
	component: MutedPage,
});

function MutedPage() {
	const { data: mutedAuthors } = useSuspenseQuery(mutedAuthorsQueryOptions());

	return (
		<div className="max-w-xl space-y-6">
			<div className="space-y-1">
				<h2 className="text-lg font-semibold tracking-tight">Muted accounts</h2>
				<p className="text-sm text-muted-foreground">
					Posts from muted accounts won&apos;t appear in your feed.
				</p>
			</div>

			{mutedAuthors.length === 0 ? (
				<div className="rounded-xl border border-border bg-card p-8 text-center">
					<ProhibitIcon className="mx-auto size-8 text-muted-foreground/50" />
					<p className="mt-3 text-sm text-muted-foreground">
						You haven&apos;t muted anyone.
					</p>
				</div>
			) : (
				<div className="rounded-xl border border-border bg-card divide-y divide-border">
					{mutedAuthors.map((author) => (
						<MutedAuthorRow key={author.id} author={author} />
					))}
				</div>
			)}
		</div>
	);
}

function MutedAuthorRow({
	author,
}: {
	author: {
		id: string;
		name: string;
		image: string | null;
		headline: string | null;
	};
}) {
	const queryClient = useQueryClient();
	const unmuteMutation = useMutation({
		mutationFn: () => unmuteAuthorFn({ data: { authorId: author.id } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["muted-authors"] });
		},
	});

	return (
		<div className="flex items-center gap-3 p-4">
			<UserAvatar name={author.name} image={author.image} size="sm" />
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium truncate">{author.name}</p>
				{author.headline && (
					<p className="text-xs text-muted-foreground truncate">
						{author.headline}
					</p>
				)}
			</div>
			<Button
				variant="outline"
				size="sm"
				onClick={() => unmuteMutation.mutate()}
				disabled={unmuteMutation.isPending}
			>
				{unmuteMutation.isPending ? "Unmuting…" : "Unmute"}
			</Button>
		</div>
	);
}
