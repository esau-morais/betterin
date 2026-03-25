import * as m from "motion/react-m";
import { useCallback, useState } from "react";

import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";
import { REACTION_TYPES, type ReactionType } from "#/lib/reactions";
import { useCanHover, useHoverIntent } from "#/lib/use-hover-intent";
import { cn } from "#/lib/utils";

const springPop = {
	type: "spring" as const,
	stiffness: 500,
	damping: 15,
	mass: 0.8,
};

export function CommentReactionButton({
	myReaction,
	onReact,
}: {
	myReaction: ReactionType | null;
	onReact: (type: ReactionType) => void;
}) {
	const [pickerOpen, setPickerOpen] = useState(false);
	const canHover = useCanHover();

	const activeReaction = REACTION_TYPES.find((r) => r.type === myReaction);
	const PrimaryIcon = activeReaction?.icon ?? REACTION_TYPES[0].icon;
	const primaryLabel = activeReaction?.label ?? "Like";

	const handleReact = useCallback(
		(type: ReactionType) => {
			onReact(type);
			setPickerOpen(false);
		},
		[onReact],
	);

	const handlePrimaryClick = useCallback(() => {
		handleReact(myReaction ?? "like");
	}, [myReaction, handleReact]);

	const openPicker = useCallback(() => setPickerOpen(true), []);
	const closePicker = useCallback(() => setPickerOpen(false), []);
	const { handleEnter, handleLeave } = useHoverIntent(
		openPicker,
		closePicker,
		canHover,
	);

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: hover-intent wrapper for desktop popover trigger
		<div onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
			<Popover open={pickerOpen} onOpenChange={setPickerOpen}>
				<PopoverTrigger asChild>
					<button
						type="button"
						onClick={handlePrimaryClick}
						className={cn(
							"flex items-center gap-1 transition-colors focus-ring rounded",
							myReaction
								? "text-brand"
								: "text-muted-foreground hover:text-brand",
						)}
						aria-label={myReaction ? `Remove ${primaryLabel} reaction` : "Like"}
						aria-pressed={!!myReaction}
					>
						<m.span
							key={myReaction ?? "none"}
							initial={
								myReaction ? { scale: 0.4, rotate: -20, opacity: 0 } : false
							}
							animate={{ scale: 1, rotate: 0, opacity: 1 }}
							transition={springPop}
							className="flex items-center justify-center"
						>
							<PrimaryIcon
								weight={myReaction ? "fill" : "regular"}
								className="size-3.5"
								aria-hidden
							/>
						</m.span>
						{primaryLabel}
					</button>
				</PopoverTrigger>

				<PopoverContent
					side="top"
					align="start"
					sideOffset={4}
					onOpenAutoFocus={(e) => {
						e.preventDefault();
						if (canHover) {
							const content = e.currentTarget as HTMLElement | null;
							content?.querySelector<HTMLButtonElement>("button")?.focus();
						}
					}}
					onCloseAutoFocus={(e) => e.preventDefault()}
					className="w-auto p-0 border-0 bg-transparent shadow-none ring-0"
				>
					<m.div
						initial={{ opacity: 0, scale: 0.85, y: 8 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
						aria-label="Choose reaction"
						className="flex gap-1 rounded-full bg-card border border-border p-1 shadow-lg"
					>
						{REACTION_TYPES.map(({ type, icon: Icon, label }, index) => (
							<Tooltip key={type}>
								<TooltipTrigger asChild>
									<m.button
										type="button"
										onClick={() => handleReact(type)}
										initial={{ opacity: 0, y: 6 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: index * 0.03, duration: 0.12 }}
										whileHover={{ y: -3 }}
										whileTap={{ scale: 0.9 }}
										className={cn(
											"flex items-center justify-center size-7 rounded-full transition-colors focus-ring",
											"hover:bg-accent",
											myReaction === type && "bg-accent text-brand",
										)}
										aria-label={label}
										aria-pressed={myReaction === type}
									>
										<Icon
											className="size-4"
											weight={myReaction === type ? "fill" : "regular"}
											aria-hidden
										/>
									</m.button>
								</TooltipTrigger>
								<TooltipContent side="top" sideOffset={4}>
									{label}
								</TooltipContent>
							</Tooltip>
						))}
					</m.div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
