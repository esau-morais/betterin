import { SpinnerGapIcon } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Label } from "#/components/ui/label";
import { Switch } from "#/components/ui/switch";

export function SettingsToggle({
	label,
	description,
	id,
	value,
	mutationFn,
	disabled,
}: {
	label: string;
	description: string;
	id: string;
	value: boolean;
	mutationFn: (value: boolean) => Promise<unknown>;
	disabled?: boolean;
}) {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: (next: boolean) => mutationFn(next),
		onMutate: async (next) => {
			await queryClient.cancelQueries({ queryKey: ["preferences"] });
			const previous = queryClient.getQueryData(["preferences"]);
			queryClient.setQueryData(
				["preferences"],
				(old: Record<string, unknown> | null) =>
					old ? { ...old, [id]: next } : old,
			);
			return { previous };
		},
		onError: (_err, _next, context) => {
			if (context?.previous) {
				queryClient.setQueryData(["preferences"], context.previous);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["preferences"] });
		},
	});

	const toggleId = `setting-${id}`;

	return (
		<div className="flex items-start gap-4 p-5">
			<div className="flex-1 min-w-0 space-y-0.5">
				<Label htmlFor={toggleId} className="cursor-pointer">
					{label}
				</Label>
				<p className="text-xs text-muted-foreground text-pretty">
					{description}
				</p>
			</div>
			<div className="flex items-center gap-2 shrink-0 pt-0.5">
				<span className="flex items-center justify-center size-3.5">
					{mutation.isPending && (
						<SpinnerGapIcon className="size-3.5 animate-spin text-muted-foreground" />
					)}
				</span>
				<Switch
					id={toggleId}
					checked={value}
					onCheckedChange={(next) => mutation.mutate(next)}
					disabled={disabled}
				/>
			</div>
		</div>
	);
}
