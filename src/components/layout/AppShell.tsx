import type { ReactNode } from "react";
import { cn } from "#/lib/utils";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

export function AppShell({
	children,
	rightPanel,
	wide = false,
	fullWidth = false,
	flush = false,
}: {
	children: ReactNode;
	rightPanel?: ReactNode;
	wide?: boolean;
	fullWidth?: boolean;
	flush?: boolean;
}) {
	return (
		<div className="min-h-dvh bg-background">
			<TopNav />
			<div className="mx-auto max-w-screen-xl px-4 pt-14">
				<div className="flex gap-6 items-start">
					<aside
						id="left-sidebar"
						className="hidden md:block md:w-14 lg:w-60 shrink-0 sticky top-14 h-[calc(100dvh-4.5rem)] overflow-y-auto py-6"
					>
						<Sidebar />
					</aside>
					<main
						id="main-content"
						className={cn(
							"flex-1 min-w-0",
							flush
								? "h-[calc(100dvh-3.5rem-4rem)] lg:h-[calc(100dvh-3.5rem)]"
								: "pt-6 pb-20 md:pb-6",
							fullWidth ? "" : wide ? "max-w-4xl" : "max-w-2xl",
						)}
					>
						{children}
					</main>
					{rightPanel && (
						<aside className="hidden lg:block w-64 xl:w-80 shrink-0 sticky top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto px-1 py-6">
							{rightPanel}
						</aside>
					)}
				</div>
			</div>
			<BottomNav className="md:hidden" />
		</div>
	);
}
