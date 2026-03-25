import {
	CaretDownIcon,
	MagnifyingGlassIcon,
	NavigationArrowIcon,
	SquaresFourIcon,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

const TARGETS = [
	{
		id: "search-input",
		label: "Search Bar",
		group: "Global",
		icon: MagnifyingGlassIcon,
		focusFirst: false,
	},
	{
		id: "left-sidebar",
		label: "Left Navigation",
		group: "Global",
		icon: NavigationArrowIcon,
		focusFirst: true,
	},
	{
		id: "main-content",
		label: "Main Content",
		group: "Page Content",
		icon: SquaresFourIcon,
		focusFirst: true,
	},
];

function focusTarget(targetId: string, focusFirst: boolean) {
	const el = document.getElementById(targetId);
	if (!el) return;
	if (focusFirst) {
		const firstFocusable = el.querySelector<HTMLElement>(
			'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
		);
		if (firstFocusable) {
			firstFocusable.focus();
			return;
		}
	}
	el.scrollIntoView({ block: "start", behavior: "smooth" });
}

export function SkipToMenu() {
	const [open, setOpen] = useState(false);
	const pendingTarget = useRef<{ id: string; focusFirst: boolean } | null>(
		null,
	);

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="fixed top-3 left-3 z-50 flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm font-medium shadow-md opacity-0 pointer-events-none focus:opacity-100 focus:pointer-events-auto data-[state=open]:opacity-100 data-[state=open]:pointer-events-auto transition-opacity focus-ring"
				>
					Skip to…
					<kbd className="hidden items-center gap-0.5 rounded border border-border bg-muted px-1 py-0.5 font-mono text-[11px] text-muted-foreground select-none sm:inline-flex">
						Alt P
					</kbd>
					<CaretDownIcon className="size-3 text-muted-foreground" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				sideOffset={4}
				className="w-48"
				onCloseAutoFocus={(e) => {
					const target = pendingTarget.current;
					if (target) {
						e.preventDefault();
						focusTarget(target.id, target.focusFirst);
						pendingTarget.current = null;
					} else {
						e.preventDefault();
					}
				}}
			>
				<DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
					Global
				</DropdownMenuLabel>
				{TARGETS.filter((t) => t.group === "Global").map(
					({ id, label, icon: Icon, focusFirst }) => (
						<DropdownMenuItem
							key={id}
							onSelect={() => {
								pendingTarget.current = { id, focusFirst };
							}}
						>
							<Icon className="size-4 shrink-0" />
							{label}
						</DropdownMenuItem>
					),
				)}
				<DropdownMenuSeparator />
				<DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
					Page Content
				</DropdownMenuLabel>
				{TARGETS.filter((t) => t.group === "Page Content").map(
					({ id, label, icon: Icon, focusFirst }) => (
						<DropdownMenuItem
							key={id}
							onSelect={() => {
								pendingTarget.current = { id, focusFirst };
							}}
						>
							<Icon className="size-4 shrink-0" />
							{label}
						</DropdownMenuItem>
					),
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
