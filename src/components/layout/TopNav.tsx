import { MoonIcon, SignOutIcon, SunIcon } from "@phosphor-icons/react";
import { getRouteApi, Link, useRouter } from "@tanstack/react-router";
import { SearchInput } from "#/components/search/SearchInput";
import { Logo } from "#/components/shared/Logo";
import { UserAvatar } from "#/components/shared/UserAvatar";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { signOut } from "#/lib/auth-client";
import { useTheme } from "#/lib/use-theme";
import { SkipToMenu } from "./SkipToMenu";

const rootRoute = getRouteApi("__root__");

export function TopNav() {
	const router = useRouter();
	const { theme, toggle } = useTheme();
	const { session } = rootRoute.useRouteContext();
	const user = session?.user ?? null;

	return (
		<>
			<SkipToMenu />
			<header className="fixed top-0 left-1/2 z-40 h-14 w-full max-w-screen-xl -translate-x-1/2 bg-background/80 backdrop-blur-sm">
				<div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]" />
				<div className="flex h-full items-center gap-4 px-4">
					<Link
						to={user ? "/feed" : "/"}
						className="shrink-0 rounded-md text-lg font-bold tracking-tight text-foreground focus-ring"
					>
						<Logo />
					</Link>

					{user && (
						<SearchInput className="hidden md:block flex-1 max-w-xs lg:max-w-sm" />
					)}

					<div className="ml-auto flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							onClick={toggle}
							aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
						>
							<SunIcon className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
							<MoonIcon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
						</Button>

						{user ? (
							<DropdownMenu modal={false}>
								<DropdownMenuTrigger asChild>
									<button
										type="button"
										className="rounded-full focus-ring"
										aria-label="User menu"
									>
										<UserAvatar name={user.name} image={user.image} size="sm" />
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-48">
									<div className="px-2 py-1.5">
										<p className="text-sm font-medium truncate">{user.name}</p>
										<p className="text-xs text-muted-foreground truncate">
											{user.email}
										</p>
									</div>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										variant="destructive"
										onSelect={() =>
											signOut({
												fetchOptions: {
													onSuccess: () => {
														router.navigate({ to: "/sign-in" });
													},
												},
											})
										}
									>
										<SignOutIcon className="size-4" />
										Sign out
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						) : (
							<div className="flex items-center gap-2">
								<Button variant="ghost" size="sm" asChild>
									<Link to="/sign-in">Sign in</Link>
								</Button>
								<Button variant="default" size="sm" asChild>
									<Link to="/sign-in">Join now</Link>
								</Button>
							</div>
						)}
					</div>
				</div>
			</header>
		</>
	);
}
