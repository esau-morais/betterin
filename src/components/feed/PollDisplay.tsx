import { CheckIcon } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { TimeAgo } from "#/components/shared/TimeAgo";
import type { PollData } from "#/lib/server/polls";
import { votePollFn } from "#/lib/server/polls";
import { cn } from "#/lib/utils";

export function PollDisplay({ poll: initialPoll }: { poll: PollData }) {
	const queryClient = useQueryClient();
	const [poll, setPoll] = useState(initialPoll);
	const hasVoted = poll.myVoteOptionId !== null;
	const hasEnded = new Date(poll.endsAt) < new Date();
	const showResults = hasVoted || hasEnded;

	const voteMutation = useMutation({
		mutationFn: (optionId: string) =>
			votePollFn({ data: { pollId: poll.id, optionId } }),
		onMutate: (optionId) => {
			setPoll((prev) => {
				const options = prev.options.map((o) => ({
					...o,
					votes: o.id === optionId ? o.votes + 1 : o.votes,
				}));
				return {
					...prev,
					options,
					totalVotes: prev.totalVotes + 1,
					myVoteOptionId: optionId,
				};
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["feed"] });
		},
	});

	return (
		<div className="space-y-2 pt-1">
			{poll.options.map((option) => {
				const pct =
					poll.totalVotes > 0
						? Math.round((option.votes / poll.totalVotes) * 100)
						: 0;
				const isMyVote = option.id === poll.myVoteOptionId;

				if (!showResults) {
					return (
						<button
							key={option.id}
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								voteMutation.mutate(option.id);
							}}
							disabled={voteMutation.isPending}
							className="relative z-10 w-full rounded-lg border border-border px-4 py-2.5 text-left text-sm transition-colors hover:border-primary focus-ring"
						>
							{option.text}
						</button>
					);
				}

				return (
					<div
						key={option.id}
						className={cn(
							"relative rounded-lg px-4 py-2.5 text-sm overflow-hidden",
							isMyVote ? "bg-accent/30 border border-primary" : "bg-muted",
						)}
					>
						<div
							className="absolute inset-y-0 left-0 bg-primary/15"
							style={{ width: `${pct}%` }}
						/>
						<div className="relative flex items-center justify-between">
							<span className={isMyVote ? "font-medium" : ""}>
								{option.text}
							</span>
							<span className="flex items-center gap-1.5 bi-mono text-xs">
								{pct}%
								{isMyVote && (
									<CheckIcon className="size-3.5 text-primary" weight="bold" />
								)}
							</span>
						</div>
					</div>
				);
			})}

			<p className="bi-mono text-xs text-muted-foreground">
				{poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"}
				{" · "}
				{hasEnded ? (
					"Final results"
				) : (
					<>
						Ends <TimeAgo date={poll.endsAt} />
					</>
				)}
			</p>
		</div>
	);
}
