import {
	BellIcon,
	CaretLeftIcon,
	EyeIcon,
	GearIcon,
	ProhibitIcon,
	SparkleIcon,
	UserIcon,
} from "@phosphor-icons/react";
import {
	createFileRoute,
	Link,
	Outlet,
	useMatches,
	useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/_authed/settings")({
	component: SettingsLayout,
});

const SETTINGS_NAV_ITEMS = [
	{ to: "/settings/account" as const, label: "Account", icon: UserIcon },
	{
		to: "/settings/notifications" as const,
		label: "Notifications",
		icon: BellIcon,
	},
	{ to: "/settings/privacy" as const, label: "Privacy", icon: EyeIcon },
	{ to: "/settings/ai" as const, label: "AI & data", icon: SparkleIcon },
	{
		to: "/settings/muted" as const,
		label: "Muted accounts",
		icon: ProhibitIcon,
	},
] as const;

function SettingsLayout() {
	const matches = useMatches();
	const currentPath = matches[matches.length - 1]?.fullPath;
	const isIndex = currentPath === "/settings" || currentPath === "/settings/";
	const navigate = useNavigate();

	useEffect(() => {
		if (isIndex && window.matchMedia("(min-width: 1024px)").matches) {
			navigate({ to: "/settings/account", replace: true });
		}
	}, [isIndex, navigate]);

	return (
		<>
			{isIndex && (
				<div className="lg:hidden space-y-1">
					<div className="flex items-center gap-2 pb-3">
						<GearIcon className="size-5 text-muted-foreground" aria-hidden />
						<h1 className="text-lg font-semibold tracking-tight">Settings</h1>
					</div>
					<nav aria-label="Settings" className="space-y-0.5">
						{SETTINGS_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
							<Link
								key={to}
								to={to}
								className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
							>
								<Icon className="size-4" aria-hidden />
								{label}
							</Link>
						))}
					</nav>
				</div>
			)}

			<div className={cn(isIndex && "hidden lg:block")}>
				<div className="lg:hidden mb-4">
					<Link
						to="/settings"
						className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors rounded focus-ring"
					>
						<CaretLeftIcon className="size-4" weight="bold" />
						Settings
					</Link>
				</div>
				<Outlet />
			</div>
		</>
	);
}
