import {
	BookmarkSimpleIcon,
	ChartBarIcon,
	ChatCircleIcon,
	PencilSimpleIcon,
	RepeatIcon,
	ShareNetworkIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import * as m from "motion/react-m";
import { useCallback, useState } from "react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
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

export function ReactionBar({
	myReaction,
	reactionTypes,
	reactionCount,
	commentCount,
	impressionCount,
	postId,
	saved,
	isReposted,
	onReact,
	onToggleComments,
	onToggleSave,
	onShare,
	onRepost,
	onUndoRepost,
	onQuote,
	commentsOpen,
}: {
	myReaction: string | null;
	reactionTypes: string[];
	reactionCount: number;
	commentCount: number;
	impressionCount?: number | null;
	postId?: string;
	saved: boolean;
	isReposted: boolean;
	onReact: (type: ReactionType) => void;
	onToggleComments: () => void;
	onToggleSave: () => void;
	onShare: () => void;
	onRepost: () => void;
	onUndoRepost: () => void;
	onQuote: () => void;
	commentsOpen: boolean;
}) {
	const [pickerOpen, setPickerOpen] = useState(false);
	const canHover = useCanHover();

	const activeReaction = REACTION_TYPES.find((r) => r.type === myReaction);
	const PrimaryIcon = activeReaction?.icon ?? REACTION_TYPES[0].icon;
	const primaryLabel = activeReaction?.label ?? "Like";

	const hasAnalytics =
		reactionCount > 0 || commentCount > 0 || impressionCount != null;

	const reactionText = (() => {
		if (reactionCount === 0) return null;
		if (myReaction) {
			if (reactionCount === 1) return "You";
			return `You and ${reactionCount - 1} other${reactionCount > 2 ? "s" : ""}`;
		}
		return reactionCount.toString();
	})();

	const handleReact = useCallback(
		(type: ReactionType) => {
			onReact(type);
			setPickerOpen(false);
		},
		[onReact],
	);

	const handlePrimaryClick = useCallback(() => {
		handleReact(myReaction ? (myReaction as ReactionType) : "like");
	}, [myReaction, handleReact]);

	const openPicker = useCallback(() => setPickerOpen(true), []);
	const closePicker = useCallback(() => setPickerOpen(false), []);
	const { handleEnter, handleLeave } = useHoverIntent(
		openPicker,
		closePicker,
		canHover,
	);

	return (
		<div className="space-y-3">
			{hasAnalytics && (
				<div className="flex items-center justify-between text-sm text-muted-foreground pointer-events-none">
					{reactionCount > 0 ? (
						<div className="flex items-center gap-1.5">
							<div className="flex items-center -space-x-1">
								{REACTION_TYPES.filter((r) =>
									reactionTypes.includes(r.type),
								).map(({ type, icon: Icon }) => (
									<span
										key={type}
										className="flex items-center justify-center size-5 rounded-full bg-card border border-background"
									>
										<Icon weight="fill" className="size-3" aria-hidden />
									</span>
								))}
							</div>
							<span>{reactionText}</span>
						</div>
					) : (
						<div />
					)}
					<div className="flex items-center gap-3 pointer-events-auto">
						{impressionCount != null &&
							(postId ? (
								<Link
									to="/post/$postId/analytics"
									params={{ postId }}
									className="flex items-center gap-1 rounded hover:text-foreground transition-colors focus-ring"
								>
									<ChartBarIcon className="size-3.5" aria-hidden />
									<span className="bi-mono">
										{impressionCount.toLocaleString()}
									</span>
								</Link>
							) : (
								<span className="flex items-center gap-1">
									<ChartBarIcon className="size-3.5" aria-hidden />
									<span className="bi-mono">
										{impressionCount.toLocaleString()}
									</span>
								</span>
							))}
						{commentCount > 0 && (
							<button
								type="button"
								onClick={onToggleComments}
								className="rounded hover:underline hover:text-foreground transition-colors focus-ring"
							>
								{commentCount} comment{commentCount !== 1 ? "s" : ""}
							</button>
						)}
					</div>
				</div>
			)}

			<div className="flex items-center border-t border-border pt-2">
				{/* biome-ignore lint/a11y/noStaticElementInteractions: hover-intent wrapper for desktop popover trigger */}
				<div onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
					<Popover open={pickerOpen} onOpenChange={setPickerOpen}>
						<PopoverTrigger asChild>
							<m.button
								type="button"
								onClick={handlePrimaryClick}
								whileTap={{ scale: 0.95 }}
								transition={{ duration: 0.1 }}
								className={cn(
									"flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors focus-ring",
									myReaction
										? "text-primary"
										: "text-muted-foreground hover:text-primary hover:bg-accent",
								)}
								aria-label={
									myReaction ? `Remove ${primaryLabel} reaction` : "Like"
								}
								aria-pressed={!!myReaction}
							>
								<m.span
									key={`${myReaction ?? "none"}`}
									initial={
										myReaction ? { scale: 0.4, rotate: -20, opacity: 0 } : false
									}
									animate={{ scale: 1, rotate: 0, opacity: 1 }}
									transition={springPop}
									className="flex items-center justify-center size-[18px]"
								>
									<PrimaryIcon
										weight={myReaction ? "fill" : "regular"}
										className="size-full"
										aria-hidden
									/>
								</m.span>
								<span>{primaryLabel}</span>
							</m.button>
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
								className="flex gap-1 rounded-full bg-card border border-border p-1.5 shadow-lg"
							>
								{REACTION_TYPES.map(({ type, icon: Icon, label }, index) => (
									<Tooltip key={type}>
										<TooltipTrigger asChild>
											<m.button
												type="button"
												onClick={() => handleReact(type)}
												initial={{ opacity: 0, y: 8 }}
												animate={{ opacity: 1, y: 0 }}
												transition={{ delay: index * 0.03, duration: 0.12 }}
												whileHover={{ y: -4 }}
												whileTap={{ scale: 0.9 }}
												className={cn(
													"relative flex items-center justify-center size-9 rounded-full transition-colors focus-ring",
													"hover:bg-accent",
													myReaction === type && "bg-accent text-primary",
												)}
												aria-label={label}
												aria-pressed={myReaction === type}
											>
												<Icon
													className="size-5"
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

				<m.button
					type="button"
					onClick={onToggleComments}
					whileTap={{ scale: 0.95 }}
					transition={{ duration: 0.1 }}
					className={cn(
						"flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors focus-ring",
						commentsOpen
							? "text-primary"
							: "text-muted-foreground hover:text-primary hover:bg-accent",
					)}
					aria-label={`${commentsOpen ? "Hide" : "Show"} comments${commentCount > 0 ? ` (${commentCount})` : ""}`}
					aria-expanded={commentsOpen}
				>
					<ChatCircleIcon
						className="size-[18px]"
						weight={commentsOpen ? "fill" : "regular"}
						aria-hidden
					/>
					<span>Comment</span>
				</m.button>

				<DropdownMenu modal={false}>
					<DropdownMenuTrigger asChild>
						<m.button
							type="button"
							whileTap={{ scale: 0.95 }}
							transition={{ duration: 0.1 }}
							className={cn(
								"flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors focus-ring",
								isReposted
									? "text-primary"
									: "text-muted-foreground hover:text-primary hover:bg-accent",
							)}
							aria-label={isReposted ? "Repost options" : "Repost"}
						>
							<RepeatIcon
								className="size-[18px]"
								weight={isReposted ? "bold" : "regular"}
								aria-hidden
							/>
							<span>Repost</span>
						</m.button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="min-w-[220px]">
						<DropdownMenuItem onSelect={isReposted ? onUndoRepost : onRepost}>
							<RepeatIcon className="size-4" />
							<div>
								<p className="font-medium">
									{isReposted ? "Undo repost" : "Repost"}
								</p>
								<p className="text-xs text-muted-foreground">
									{isReposted
										? "Remove from your feed"
										: "Instantly share to feed"}
								</p>
							</div>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onSelect={onQuote}>
							<PencilSimpleIcon className="size-4" />
							<div>
								<p className="font-medium">Quote</p>
								<p className="text-xs text-muted-foreground">
									Add your thoughts
								</p>
							</div>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				<div className="ml-auto flex items-center">
					<m.button
						type="button"
						onClick={onToggleSave}
						whileTap={{ scale: 0.95 }}
						transition={{ duration: 0.1 }}
						className={cn(
							"flex items-center justify-center rounded-lg p-1.5 transition-colors focus-ring",
							saved
								? "text-primary"
								: "text-muted-foreground hover:text-primary hover:bg-accent",
						)}
						aria-label={saved ? "Unsave post" : "Save post"}
						aria-pressed={saved}
					>
						<BookmarkSimpleIcon
							className="size-[18px]"
							weight={saved ? "fill" : "regular"}
							aria-hidden
						/>
					</m.button>

					<m.button
						type="button"
						onClick={onShare}
						whileTap={{ scale: 0.95 }}
						transition={{ duration: 0.1 }}
						className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:text-primary hover:bg-accent transition-colors focus-ring"
						aria-label="Share post"
					>
						<ShareNetworkIcon className="size-[18px]" aria-hidden />
					</m.button>
				</div>
			</div>
		</div>
	);
}
