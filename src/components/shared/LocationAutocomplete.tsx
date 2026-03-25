import { MapPinIcon, XIcon } from "@phosphor-icons/react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
	Command,
	CommandGroup,
	CommandItem,
	CommandList,
} from "#/components/ui/command";
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
} from "#/components/ui/popover";
import { searchLocationsFn } from "#/lib/server/geocode";
import { useDebouncedValue } from "#/lib/use-debounce";
import { cn } from "#/lib/utils";

function SkeletonRow() {
	return (
		<div className="flex items-center gap-2 rounded-sm px-2 py-1.5">
			<div className="size-4 shrink-0 rounded-sm bg-muted animate-pulse" />
			<div className="h-3 w-3/5 rounded bg-muted animate-pulse" />
		</div>
	);
}

export type LocationValue = {
	display: string;
	lat: number | null;
	lon: number | null;
};

export function LocationAutocomplete({
	value,
	onChange,
	className,
}: {
	value: string;
	onChange: (location: LocationValue) => void;
	className?: string;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const commandRef = useRef<HTMLDivElement>(null);
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState(value);
	const debouncedQuery = useDebouncedValue(query, 200);

	const enabled = debouncedQuery.length >= 2;
	const {
		data: suggestions,
		isFetching,
		isSuccess,
	} = useQuery({
		queryKey: ["location-suggestions", debouncedQuery],
		queryFn: () => searchLocationsFn({ data: { q: debouncedQuery } }),
		enabled,
		staleTime: 60_000,
		placeholderData: keepPreviousData,
	});

	const hasSuggestions = enabled && suggestions && suggestions.length > 0;
	const isFirstLoad = enabled && isFetching && !suggestions;
	const isRefetching = enabled && isFetching && !!suggestions;
	const hasNoResults = enabled && isSuccess && !isFetching && !hasSuggestions;
	const hasContent = hasSuggestions || isFirstLoad || hasNoResults;

	function handleSelect(suggestion: {
		display: string;
		lat: number;
		lon: number;
	}) {
		setQuery(suggestion.display);
		setOpen(false);
		onChange({
			display: suggestion.display,
			lat: suggestion.lat,
			lon: suggestion.lon,
		});
	}

	function handleClear() {
		setQuery("");
		setOpen(false);
		onChange({ display: "", lat: null, lon: null });
		inputRef.current?.focus();
	}

	function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Escape") {
			setOpen(false);
			inputRef.current?.blur();
			return;
		}
		if (e.key === "Enter") {
			e.preventDefault();
			const selected = commandRef.current?.querySelector<HTMLElement>(
				'[cmdk-item][data-selected="true"]',
			);
			if (open && selected) {
				selected.dispatchEvent(new MouseEvent("click", { bubbles: true }));
			}
			return;
		}
		const FORWARDED = new Set(["ArrowUp", "ArrowDown", "Home", "End"]);
		if (open && FORWARDED.has(e.key)) {
			e.preventDefault();
			commandRef.current?.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: e.key,
					code: e.code,
					bubbles: true,
					cancelable: true,
				}),
			);
		}
	}

	return (
		<Popover
			open={open && hasContent}
			onOpenChange={(next) => {
				if (next && !hasContent) return;
				setOpen(next);
			}}
		>
			<PopoverAnchor asChild>
				<div className={cn("relative", className)}>
					<MapPinIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
					<input
						ref={inputRef}
						type="text"
						placeholder="City, Country"
						aria-label="Location"
						aria-expanded={open && hasContent}
						aria-haspopup="listbox"
						role="combobox"
						autoComplete="off"
						value={query}
						onChange={(e) => {
							setQuery(e.target.value);
							if (!open) setOpen(true);
						}}
						onFocus={() => setOpen(true)}
						onKeyDown={handleInputKeyDown}
						className="h-10 w-full rounded-lg border border-input bg-transparent pl-9 pr-8 text-sm outline-hidden placeholder:text-muted-foreground transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
					/>
					{query && (
						<button
							type="button"
							onClick={handleClear}
							className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground transition-colors"
							aria-label="Clear location"
						>
							<XIcon className="size-3.5" />
						</button>
					)}
				</div>
			</PopoverAnchor>

			<PopoverContent
				className="w-[var(--radix-popover-trigger-width)] overflow-hidden p-0"
				align="start"
				sideOffset={4}
				onOpenAutoFocus={(e) => e.preventDefault()}
				onCloseAutoFocus={(e) => e.preventDefault()}
			>
				<div
					aria-hidden
					className={cn(
						"h-0.5 bg-primary/40 transition-opacity duration-300",
						isRefetching ? "animate-pulse opacity-100" : "opacity-0",
					)}
				/>
				<Command ref={commandRef} shouldFilter={false} loop>
					<CommandList className="max-h-[200px]">
						{isFirstLoad && (
							<div className="p-1">
								<SkeletonRow />
								<SkeletonRow />
								<SkeletonRow />
							</div>
						)}
						{hasSuggestions && (
							<CommandGroup>
								{suggestions?.map((s) => (
									<CommandItem
										key={`${s.lat}-${s.lon}-${s.display}`}
										value={s.display}
										onSelect={() => handleSelect(s)}
									>
										<MapPinIcon className="size-4 shrink-0 text-muted-foreground" />
										<span className="truncate text-sm">{s.display}</span>
									</CommandItem>
								))}
							</CommandGroup>
						)}
						{hasNoResults && (
							<p className="px-4 py-6 text-center text-sm text-muted-foreground">
								No results found.
							</p>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
