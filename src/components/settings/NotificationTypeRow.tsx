import {
	BellIcon,
	CaretDownIcon,
	DeviceMobileIcon,
	EnvelopeIcon,
	SpinnerGapIcon,
} from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "#/components/ui/badge";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "#/components/ui/collapsible";
import { Label } from "#/components/ui/label";
import { Switch } from "#/components/ui/switch";
import { cn } from "#/lib/utils";

interface NotificationTypeRowProps {
	label: string;
	description: string;
	icon: typeof BellIcon;
	inAppField: string;
	inAppValue: boolean;
	onInAppToggle: (value: boolean) => Promise<unknown>;
	emailField: string;
	emailValue: boolean;
	onEmailToggle: (value: boolean) => Promise<unknown>;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function usePrefMutation(field: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (args: {
			fn: (value: boolean) => Promise<unknown>;
			value: boolean;
		}) => args.fn(args.value),
		onMutate: async ({ value }) => {
			await queryClient.cancelQueries({ queryKey: ["preferences"] });
			const previous = queryClient.getQueryData(["preferences"]);
			queryClient.setQueryData(
				["preferences"],
				(old: Record<string, unknown> | null) =>
					old ? { ...old, [field]: value } : old,
			);
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous) {
				queryClient.setQueryData(["preferences"], context.previous);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["preferences"] });
		},
	});
}

export function NotificationTypeRow({
	label,
	description,
	icon: Icon,
	inAppField,
	inAppValue,
	onInAppToggle,
	emailField,
	emailValue,
	onEmailToggle,
	open,
	onOpenChange,
}: NotificationTypeRowProps) {
	const inAppMutation = usePrefMutation(inAppField);
	const emailMutation = usePrefMutation(emailField);

	const activeChannels = [
		...(inAppValue ? ["In-app"] : []),
		...(emailValue ? ["Email"] : []),
	].join(" · ");

	return (
		<Collapsible open={open} onOpenChange={onOpenChange}>
			<CollapsibleTrigger className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors">
				<Icon
					className="size-5 shrink-0 text-muted-foreground"
					weight="duotone"
				/>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-medium">{label}</p>
					<p className="text-xs text-muted-foreground">
						{activeChannels || "All off"}
					</p>
				</div>
				<CaretDownIcon
					className={cn(
						"size-4 shrink-0 text-muted-foreground transition-transform duration-150",
						open && "rotate-180",
					)}
				/>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div className="px-4 pb-4 space-y-3">
					<p className="text-xs text-muted-foreground text-pretty pl-8">
						{description}
					</p>

					<div className="ml-8 rounded-lg border border-border divide-y divide-border">
						<ChannelRow
							icon={BellIcon}
							label="In-app"
							description="Delivered inside the app"
							trailing={
								<div className="flex items-center gap-2">
									{inAppMutation.isPending && (
										<SpinnerGapIcon className="size-3.5 animate-spin text-muted-foreground" />
									)}
									<Switch
										checked={inAppValue}
										onCheckedChange={(next) =>
											inAppMutation.mutate({
												fn: onInAppToggle,
												value: next,
											})
										}
									/>
								</div>
							}
						/>
						<ChannelRow
							icon={DeviceMobileIcon}
							label="Push"
							description="Pushed to your device immediately"
							trailing={
								<div className="flex items-center gap-2">
									<Badge variant="secondary" className="text-[10px]">
										Coming soon
									</Badge>
									<Switch disabled checked={false} />
								</div>
							}
						/>
						<ChannelRow
							icon={EnvelopeIcon}
							label="Email"
							description="Sent to your primary email"
							trailing={
								<div className="flex items-center gap-2">
									{emailMutation.isPending && (
										<SpinnerGapIcon className="size-3.5 animate-spin text-muted-foreground" />
									)}
									<Switch
										id={`notif-${emailField}`}
										checked={emailValue}
										onCheckedChange={(next) =>
											emailMutation.mutate({
												fn: onEmailToggle,
												value: next,
											})
										}
									/>
								</div>
							}
						/>
					</div>
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

function ChannelRow({
	icon: Icon,
	label,
	description,
	trailing,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	description: string;
	trailing: React.ReactNode;
}) {
	return (
		<div className="flex items-center gap-3 px-3 py-3">
			<Icon className="size-4 shrink-0 text-muted-foreground" />
			<div className="flex-1 min-w-0">
				<Label className="text-sm">{label}</Label>
				<p className="text-xs text-muted-foreground">{description}</p>
			</div>
			{trailing}
		</div>
	);
}
