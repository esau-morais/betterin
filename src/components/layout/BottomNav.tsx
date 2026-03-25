import {
	BellIcon,
	BookmarkSimpleIcon,
	BriefcaseIcon,
	BuildingsIcon,
	ChatCircleIcon,
	DotsThreeIcon,
	GearIcon,
	HouseIcon,
	MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi, Link, useMatches } from "@tanstack/react-router";
import { useState } from "react";
import { UserAvatar } from "#/components/shared/UserAvatar";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet";
import {
	unreadCountsQueryOptions,
	unreadNotificationCountQueryOptions,
} from "#/lib/queries";
import { cn } from "#/lib/utils";

const NAV_ITEMS = [
	{ to: "/feed", icon: HouseIcon, label: "Home" },
	{ to: "/search", icon: MagnifyingGlassIcon, label: "Search" },
	{ to: "/messages", icon: ChatCircleIcon, label: "Messages" },
	{ to: "/notifications", icon: BellIcon, label: "Notifications" },
] as const;

const MORE_ITEMS = [
	{ to: "/jobs", icon: BriefcaseIcon, label: "Jobs" },
	{ to: "/business", icon: BuildingsIcon, label: "Business" },
	{ to: "/bookmarks", icon: BookmarkSimpleIcon, label: "Bookmarks" },
	{ to: "/settings", icon: GearIcon, label: "Settings" },
] as const;

const rootRoute = getRouteApi("__root__");

export function BottomNav({ className }: { className?: string }) {
	const { session, profile } = rootRoute.useRouteContext();
	const user = session?.user;
	const matches = useMatches();
	const currentPath = matches[matches.length - 1]?.fullPath;
	const [moreOpen, setMoreOpen] = useState(false);
	const { data: unreadData } = useQuery(unreadCountsQueryOptions());
	const unreadMessages = unreadData?.unreadConversations ?? 0;
	const { data: notifData } = useQuery(unreadNotificationCountQueryOptions());
	const unreadNotifications = notifData?.count ?? 0;

	const moreIsActive =
		MORE_ITEMS.some(({ to }) => currentPath?.startsWith(to)) ||
		currentPath?.startsWith("/profile");

	return (
		<>
			<nav
				className={cn(
					"fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-background pb-[env(safe-area-inset-bottom)]",
					className,
				)}
				aria-label="Mobile"
			>
				{NAV_ITEMS.map(({ to, icon: Icon, label }) => {
					const active = currentPath?.startsWith(to);
					return (
						<Link
							key={label}
							to={to}
							className={cn(
								"flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors",
								active ? "text-primary font-medium" : "text-muted-foreground",
							)}
							aria-current={active ? "page" : undefined}
							aria-label={label}
						>
							<span className="relative">
								<Icon className="size-5" />
								{label === "Messages" && unreadMessages > 0 && (
									<span
										className="absolute -top-1 -right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground leading-none"
										aria-hidden="true"
									>
										{unreadMessages > 9 ? "+" : unreadMessages}
									</span>
								)}
								{label === "Notifications" && unreadNotifications > 0 && (
									<span
										className="absolute -top-1 -right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground leading-none"
										aria-hidden="true"
									>
										{unreadNotifications > 9 ? "+" : unreadNotifications}
									</span>
								)}
							</span>
							<span>{label}</span>
						</Link>
					);
				})}

				<button
					type="button"
					onClick={() => setMoreOpen(true)}
					className={cn(
						"flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors",
						moreIsActive ? "text-primary font-medium" : "text-muted-foreground",
					)}
					aria-label="More"
					aria-expanded={moreOpen}
				>
					<DotsThreeIcon className="size-5" weight="bold" />
					<span>More</span>
				</button>
			</nav>

			<Sheet open={moreOpen} onOpenChange={setMoreOpen}>
				<SheetContent
					side="bottom"
					className="rounded-t-2xl px-2 pb-[env(safe-area-inset-bottom)]"
				>
					<SheetHeader className="sr-only">
						<SheetTitle>More</SheetTitle>
					</SheetHeader>
					<nav
						className="flex flex-col gap-0.5 py-1"
						aria-label="More navigation"
					>
						{MORE_ITEMS.map(({ to, icon: Icon, label }) => {
							const active = currentPath?.startsWith(to);
							return (
								<Link
									key={to}
									to={to}
									onClick={() => setMoreOpen(false)}
									className={cn(
										"flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
										active
											? "bg-accent text-accent-foreground font-medium"
											: "text-foreground hover:bg-muted",
									)}
									aria-current={active ? "page" : undefined}
								>
									<Icon className="size-5 shrink-0" />
									{label}
								</Link>
							);
						})}

						<div className="my-1 mx-3 border-t border-border" />

						{user && (
							<Link
								to="/profile/$handle"
								params={{ handle: profile?.handle ?? user.id }}
								onClick={() => setMoreOpen(false)}
								className={cn(
									"flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
									currentPath?.startsWith("/profile")
										? "bg-accent text-accent-foreground font-medium"
										: "text-foreground hover:bg-muted",
								)}
							>
								<UserAvatar name={user.name} image={user.image} size="sm" />
								<span className="truncate font-medium">{user.name}</span>
							</Link>
						)}
					</nav>
				</SheetContent>
			</Sheet>
		</>
	);
}
