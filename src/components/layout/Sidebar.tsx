import {
	ArrowLeftIcon,
	BellIcon,
	BookmarkSimpleIcon,
	BriefcaseIcon,
	BuildingsIcon,
	ChatCircleIcon,
	EyeIcon,
	GearIcon,
	HouseIcon,
	MagnifyingGlassIcon,
	ProhibitIcon,
	SparkleIcon,
	UserIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi, Link, useMatches } from "@tanstack/react-router";
import { AnimatePresence, m } from "motion/react";
import { UserAvatar } from "#/components/shared/UserAvatar";
import {
	unreadCountsQueryOptions,
	unreadNotificationCountQueryOptions,
} from "#/lib/queries";
import { cn } from "#/lib/utils";

const NAV_ITEMS = [
	{ to: "/feed", icon: HouseIcon, label: "Home" },
	{ to: "/search", icon: MagnifyingGlassIcon, label: "Search" },
	{ to: "/notifications", icon: BellIcon, label: "Notifications" },
	{ to: "/messages", icon: ChatCircleIcon, label: "Messages" },
	{ to: "/jobs", icon: BriefcaseIcon, label: "Jobs", separator: true },
	{ to: "/business", icon: BuildingsIcon, label: "Business" },
	{
		to: "/bookmarks",
		icon: BookmarkSimpleIcon,
		label: "Bookmarks",
		separator: true,
	},
	{ to: "/settings", icon: GearIcon, label: "Settings" },
] as const;

const SETTINGS_NAV_ITEMS = [
	{ to: "/settings/account", icon: UserIcon, label: "Account" },
	{ to: "/settings/notifications", icon: BellIcon, label: "Notifications" },
	{ to: "/settings/privacy", icon: EyeIcon, label: "Privacy" },
	{ to: "/settings/ai", icon: SparkleIcon, label: "AI & data" },
	{ to: "/settings/muted", icon: ProhibitIcon, label: "Muted accounts" },
] as const;

const panelVariants = {
	enter: (d: number) => ({ x: `${d * 100}%`, filter: "blur(4px)" }),
	center: { x: 0, filter: "blur(0px)" },
	exit: (d: number) => ({ x: `${d * -100}%`, filter: "blur(4px)" }),
};

const panelTransition = {
	type: "spring" as const,
	stiffness: 500,
	damping: 40,
	mass: 0.8,
};

const rootRoute = getRouteApi("__root__");

export function Sidebar({ className }: { className?: string }) {
	const { session, profile } = rootRoute.useRouteContext();
	const matches = useMatches();
	const user = session?.user;
	const currentPath = matches[matches.length - 1]?.fullPath;
	const isSettings = currentPath?.startsWith("/settings");
	const direction = isSettings ? 1 : -1;

	const { data: unreadData } = useQuery(unreadCountsQueryOptions());
	const unreadMessages = unreadData?.unreadConversations ?? 0;
	const { data: notifData } = useQuery(unreadNotificationCountQueryOptions());
	const unreadNotifications = notifData?.count ?? 0;

	if (!user) return null;

	return (
		<nav
			className={cn("relative h-full overflow-hidden", className)}
			aria-label={isSettings ? "Settings" : "Main"}
		>
			<AnimatePresence mode="popLayout" custom={direction} initial={false}>
				{isSettings ? (
					<m.div
						key="settings"
						custom={direction}
						variants={panelVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={panelTransition}
						className="absolute inset-0 flex flex-col gap-0.5 py-0 will-change-[transform,filter]"
					>
						<Link
							to="/feed"
							className="flex items-center gap-2 rounded-r-lg px-3 py-2 md:justify-center md:px-0 lg:justify-start lg:px-3 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus-visible:text-foreground"
							aria-label="Back to Home"
						>
							<ArrowLeftIcon
								className="size-4 shrink-0 hidden lg:block"
								weight="bold"
							/>
							<GearIcon className="size-5 shrink-0" aria-hidden />
							<span className="hidden lg:inline text-lg font-semibold tracking-tight">
								Settings
							</span>
						</Link>

						{SETTINGS_NAV_ITEMS.map(({ to, icon: Icon, label }) => {
							const active = currentPath === to;
							return (
								<Link
									key={to}
									to={to}
									className={cn(
										"sidebar-nav-item flex items-center gap-3 rounded-r-lg px-3 py-2 text-sm transition-colors md:justify-center md:px-0 lg:justify-start lg:px-3",
										active
											? "bg-accent text-accent-foreground font-medium"
											: "text-muted-foreground hover:bg-muted hover:text-foreground",
									)}
									aria-current={active ? "page" : undefined}
									aria-label={label}
								>
									<Icon className="size-4 shrink-0" aria-hidden />
									<span className="hidden lg:inline">{label}</span>
								</Link>
							);
						})}
					</m.div>
				) : (
					<m.div
						key="main"
						custom={direction}
						variants={panelVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={panelTransition}
						className="absolute inset-0 flex flex-col gap-0.5 py-0 will-change-[transform,filter]"
					>
						{NAV_ITEMS.map(({ to, icon: Icon, label, ...rest }) => {
							const active =
								to === "/settings"
									? currentPath === "/settings"
									: currentPath?.startsWith(to);
							const hasSep = "separator" in rest && rest.separator;
							return (
								<div key={to}>
									{hasSep && (
										<div className="my-1.5 mx-1 lg:mx-3 border-t border-border" />
									)}
									<Link
										to={to}
										className={cn(
											"sidebar-nav-item flex items-center gap-3 rounded-r-lg px-3 py-2 text-sm md:justify-center md:px-0 lg:justify-start lg:px-3",
											active
												? "bg-accent text-accent-foreground font-medium"
												: "text-muted-foreground hover:bg-muted hover:text-foreground",
										)}
										aria-current={active ? "page" : undefined}
										aria-label={label}
									>
										<Icon className="size-5 shrink-0" aria-hidden />
										<span className="flex-1 hidden lg:inline">{label}</span>
										{label === "Messages" && unreadMessages > 0 && (
											<span
												className="hidden lg:flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground"
												aria-hidden="true"
											>
												{unreadMessages > 9 ? "9+" : unreadMessages}
											</span>
										)}
										{label === "Notifications" && unreadNotifications > 0 && (
											<span
												className="hidden lg:flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground"
												aria-hidden="true"
											>
												{unreadNotifications > 9 ? "9+" : unreadNotifications}
											</span>
										)}
									</Link>
								</div>
							);
						})}

						<div className="mt-auto border-t border-border pt-4">
							<Link
								to="/profile/$handle"
								params={{ handle: profile?.handle ?? user.id }}
								className={cn(
									"sidebar-nav-item flex items-center gap-3 rounded-r-lg px-3 py-2 text-sm md:justify-center md:px-0 lg:justify-start lg:px-3",
									"text-muted-foreground hover:bg-muted hover:text-foreground",
								)}
								aria-label="Profile"
							>
								<UserAvatar name={user.name} image={user.image} size="sm" />
								<span className="truncate font-medium hidden lg:inline">
									{user.name}
								</span>
							</Link>
						</div>
					</m.div>
				)}
			</AnimatePresence>
		</nav>
	);
}
