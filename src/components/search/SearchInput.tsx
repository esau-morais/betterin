"use client";

import {
	ArrowLeftIcon,
	ArticleIcon,
	BriefcaseIcon,
	BuildingsIcon,
	ClockIcon,
	MagnifyingGlassIcon,
	SealCheckIcon,
	UsersIcon,
	XIcon,
} from "@phosphor-icons/react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	type HighlightSegment,
	highlightMatches,
} from "#/components/search/highlight-match";
import {
	addRecentPerson,
	addRecentSearch,
	clearRecentPeople,
	clearRecentSearches,
	getRecentPeople,
	getRecentSearches,
	type RecentPerson,
	removeRecentPerson,
	removeRecentSearch,
} from "#/components/search/recent-searches";
import { UserAvatar } from "#/components/shared/UserAvatar";
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
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet";
import type {
	CompanySuggestion,
	JobSuggestion,
	PersonSuggestion,
} from "#/lib/server/search";
import { searchSuggestionsFn } from "#/lib/server/search";
import { useDebouncedValue } from "#/lib/use-debounce";
import { cn } from "#/lib/utils";

const FORWARDED_KEYS = new Set(["ArrowUp", "ArrowDown", "Home", "End"]);

function HighlightedText({ segments }: { segments: HighlightSegment[] }) {
	return (
		<>
			{segments.map((seg) =>
				seg.highlighted ? (
					<mark
						key={`${seg.text}-h`}
						className="bg-accent text-accent-foreground rounded-sm not-italic"
					>
						{seg.text}
					</mark>
				) : (
					seg.text
				),
			)}
		</>
	);
}

function formatSalary(min: number, max: number, currency: string) {
	const fmt = (n: number) =>
		n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
	const sym = currency === "USD" ? "$" : currency;
	return `${sym}${fmt(min)}–${sym}${fmt(max)}`;
}

function RemoveButton({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={(e) => {
				e.stopPropagation();
				onClick();
			}}
			onPointerDown={(e) => e.preventDefault()}
			aria-label="Remove"
			className="ml-auto shrink-0 rounded-sm p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-data-[selected=true]:opacity-60"
		>
			<XIcon className="size-3" />
		</button>
	);
}

function SkeletonRow() {
	return (
		<div className="flex items-center gap-2 rounded-sm px-2 py-1.5">
			<div className="size-6 shrink-0 rounded-full bg-muted animate-pulse" />
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="h-3 w-2/5 rounded bg-muted animate-pulse" />
				<div className="h-2.5 w-3/5 rounded bg-muted animate-pulse" />
			</div>
		</div>
	);
}

export function SearchInput({ className }: { className?: string }) {
	const router = useRouter();
	const inputRef = useRef<HTMLInputElement>(null);
	const sheetInputRef = useRef<HTMLInputElement>(null);
	const commandRef = useRef<HTMLDivElement>(null);

	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const debouncedQuery = useDebouncedValue(query, 200);

	const [isMobile, setIsMobile] = useState(false);
	useEffect(() => {
		const mql = window.matchMedia("(min-width: 768px)");
		setIsMobile(!mql.matches);
		const handler = (e: MediaQueryListEvent) => setIsMobile(!e.matches);
		mql.addEventListener("change", handler);
		return () => mql.removeEventListener("change", handler);
	}, []);

	const [recentSearches, setRecentSearches] = useState<string[]>([]);
	const [recentPeople, setRecentPeople] = useState<RecentPerson[]>([]);
	useEffect(() => {
		setRecentSearches(getRecentSearches());
		setRecentPeople(getRecentPeople());
	}, []);

	const suggestionsEnabled = debouncedQuery.length >= 2;
	const {
		data: suggestions,
		isFetching,
		isSuccess,
	} = useQuery({
		queryKey: ["search-suggestions", debouncedQuery],
		queryFn: () => searchSuggestionsFn({ data: { q: debouncedQuery } }),
		enabled: suggestionsEnabled,
		staleTime: 30_000,
		placeholderData: keepPreviousData,
	});

	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				inputRef.current?.focus();
			}
		}
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, []);

	const hasQuery = query.trim().length > 0;
	const trimmedQuery = query.trim();
	const hasRecents = recentPeople.length > 0 || recentSearches.length > 0;
	const showRecents = !hasQuery && hasRecents;
	const hasContent = showRecents || hasQuery;

	const isFirstLoad = suggestionsEnabled && isFetching && !suggestions;
	const isRefetching = suggestionsEnabled && isFetching && !!suggestions;

	const resultItems: Array<
		| { kind: "person"; data: PersonSuggestion }
		| { kind: "job"; data: JobSuggestion }
		| { kind: "company"; data: CompanySuggestion }
	> = suggestions
		? [
				...suggestions.people.map((p) => ({
					kind: "person" as const,
					data: p,
				})),
				...suggestions.jobs.map((j) => ({ kind: "job" as const, data: j })),
				...suggestions.companies.map((c) => ({
					kind: "company" as const,
					data: c,
				})),
			]
		: [];

	const hasResults = isSuccess && resultItems.length > 0;
	const hasNoResults =
		isSuccess && !isFetching && resultItems.length === 0 && suggestionsEnabled;

	const navigateToSearch = useCallback(
		(q: string, tab?: "people" | "jobs" | "posts") => {
			const t = q.trim();
			if (!t) return;

			let effectiveTab = tab;
			let cleanQuery = t;
			const inMatch = t.match(/\bin:(people|jobs|posts)\b/i);
			if (inMatch) {
				effectiveTab = inMatch[1].toLowerCase() as "people" | "jobs" | "posts";
				cleanQuery = t.replace(inMatch[0], "").trim();
			}

			addRecentSearch(cleanQuery || t);
			setRecentSearches(getRecentSearches());
			setOpen(false);
			setQuery("");

			if (effectiveTab === "jobs") {
				router.navigate({ to: "/jobs", search: (prev) => prev });
				return;
			}

			router.navigate({
				to: "/search",
				search: effectiveTab
					? { q: cleanQuery || undefined, tab: effectiveTab }
					: { q: cleanQuery || undefined },
			});
		},
		[router],
	);

	const navigateToPerson = useCallback(
		(person: PersonSuggestion | RecentPerson) => {
			addRecentPerson({
				id: person.id,
				name: person.name,
				handle: person.handle,
				headline: person.headline,
				avatarUrl: person.avatarUrl,
				avatarFrame: "avatarFrame" in person ? person.avatarFrame : null,
			});
			setRecentPeople(getRecentPeople());
			setOpen(false);
			setQuery("");
			if (person.handle) {
				router.navigate({
					to: "/profile/$handle",
					params: { handle: person.handle },
				});
			}
		},
		[router],
	);

	const navigateToJob = useCallback(
		(job: JobSuggestion) => {
			setOpen(false);
			setQuery("");
			router.navigate({
				to: "/jobs",
				search: (prev) => ({ ...prev, job: job.id }),
			});
		},
		[router],
	);

	const navigateToCompany = useCallback(
		(company: CompanySuggestion) => {
			setOpen(false);
			setQuery("");
			router.navigate({ to: "/company/$slug", params: { slug: company.slug } });
		},
		[router],
	);

	function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Escape") {
			setOpen(false);
			inputRef.current?.blur();
			sheetInputRef.current?.blur();
			return;
		}

		if (e.key === "Enter") {
			e.preventDefault();
			const selected = commandRef.current?.querySelector<HTMLElement>(
				'[cmdk-item][data-selected="true"]',
			);
			if (open && selected) {
				selected.dispatchEvent(new MouseEvent("click", { bubbles: true }));
			} else if (trimmedQuery) {
				navigateToSearch(query);
			}
			return;
		}

		if (open && FORWARDED_KEYS.has(e.key)) {
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

	function handleRemoveRecentSearch(s: string) {
		removeRecentSearch(s);
		setRecentSearches(getRecentSearches());
	}
	function handleRemoveRecentPerson(id: string) {
		removeRecentPerson(id);
		setRecentPeople(getRecentPeople());
	}
	function handleClearAll() {
		clearRecentSearches();
		clearRecentPeople();
		setRecentSearches([]);
		setRecentPeople([]);
	}

	function SearchResultsContent({ maxHeight }: { maxHeight?: string }) {
		return (
			<Command ref={commandRef} shouldFilter={false} loop>
				<CommandList className={maxHeight ?? ""}>
					{showRecents && (
						<CommandGroup
							heading={
								<span className="text-xs font-medium text-muted-foreground">
									Recent
								</span>
							}
						>
							{recentPeople.map((person) => (
								<CommandItem
									key={`rp-${person.id}`}
									value={`rp-${person.id}`}
									onSelect={() => navigateToPerson(person)}
									className="group"
								>
									<UserAvatar
										name={person.name}
										image={person.avatarUrl}
										size="xs"
									/>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium leading-tight">
											{person.name}
										</p>
										{person.headline && (
											<p className="truncate text-xs text-muted-foreground leading-tight">
												{person.headline}
											</p>
										)}
									</div>
									<RemoveButton
										onClick={() => handleRemoveRecentPerson(person.id)}
									/>
								</CommandItem>
							))}

							{recentSearches.map((s) => (
								<CommandItem
									key={`rs-${s}`}
									value={`rs-${s}`}
									onSelect={() => navigateToSearch(s)}
									className="group"
								>
									<ClockIcon className="size-4 shrink-0 text-muted-foreground" />
									<span className="min-w-0 flex-1 truncate text-sm">{s}</span>
									<RemoveButton onClick={() => handleRemoveRecentSearch(s)} />
								</CommandItem>
							))}

							<CommandItem
								value="clear-all-recents"
								onSelect={handleClearAll}
								className="justify-center text-xs text-muted-foreground"
							>
								Clear all
							</CommandItem>
						</CommandGroup>
					)}

					{isFirstLoad && (
						<div className="p-1">
							<SkeletonRow />
							<SkeletonRow />
							<SkeletonRow />
						</div>
					)}

					{hasResults && (
						<CommandGroup>
							{resultItems.map((item) => {
								if (item.kind === "person") {
									return (
										<CommandItem
											key={`p-${item.data.id}`}
											value={`p-${item.data.id}`}
											onSelect={() => navigateToPerson(item.data)}
										>
											<UserAvatar
												name={item.data.name}
												image={item.data.avatarUrl}
												size="xs"
											/>
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-medium leading-tight">
													<HighlightedText
														segments={highlightMatches(
															item.data.name,
															debouncedQuery,
														)}
													/>
												</p>
												{item.data.headline && (
													<p className="truncate text-xs text-muted-foreground leading-tight">
														<HighlightedText
															segments={highlightMatches(
																item.data.headline,
																debouncedQuery,
															)}
														/>
													</p>
												)}
											</div>
											{item.data.isConnection && (
												<span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
													1st
												</span>
											)}
										</CommandItem>
									);
								}
								if (item.kind === "company") {
									return (
										<CommandItem
											key={`c-${item.data.id}`}
											value={`c-${item.data.id}`}
											onSelect={() => navigateToCompany(item.data)}
										>
											<div className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-muted">
												<BuildingsIcon className="size-3.5 text-muted-foreground" />
											</div>
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-medium leading-tight">
													<HighlightedText
														segments={highlightMatches(
															item.data.name,
															debouncedQuery,
														)}
													/>
													{item.data.verified && (
														<SealCheckIcon
															weight="fill"
															className="ml-0.5 inline size-3.5 text-brand"
														/>
													)}
												</p>
												{item.data.tagline && (
													<p className="truncate text-xs text-muted-foreground leading-tight">
														{item.data.tagline}
													</p>
												)}
											</div>
										</CommandItem>
									);
								}
								return (
									<CommandItem
										key={`j-${item.data.id}`}
										value={`j-${item.data.id}`}
										onSelect={() => navigateToJob(item.data)}
									>
										<div className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-muted">
											<BriefcaseIcon className="size-3.5 text-muted-foreground" />
										</div>
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-medium leading-tight">
												<HighlightedText
													segments={highlightMatches(
														item.data.title,
														debouncedQuery,
													)}
												/>
											</p>
											<p className="truncate text-xs text-muted-foreground leading-tight">
												<HighlightedText
													segments={highlightMatches(
														item.data.company,
														debouncedQuery,
													)}
												/>
												<span className="mx-1 text-muted-foreground/50">·</span>
												<span className="font-mono text-salary">
													{formatSalary(
														item.data.salaryMin,
														item.data.salaryMax,
														item.data.currency,
													)}
												</span>
											</p>
										</div>
									</CommandItem>
								);
							})}
						</CommandGroup>
					)}

					{hasNoResults && (
						<p className="px-4 py-6 text-center text-sm text-muted-foreground">
							No results found.
						</p>
					)}

					{hasQuery && (
						<>
							{(hasResults || hasNoResults) && (
								<div className="mx-1 my-0.5 h-px bg-border" />
							)}
							<CommandGroup>
								<CommandItem
									value={`all-${trimmedQuery}`}
									onSelect={() => navigateToSearch(query)}
								>
									<MagnifyingGlassIcon className="size-4 shrink-0" />
									<span className="truncate text-sm">
										See all results for{" "}
										<span className="font-medium">"{trimmedQuery}"</span>
									</span>
								</CommandItem>
								<CommandItem
									value={`people-${trimmedQuery}`}
									onSelect={() => navigateToSearch(query, "people")}
								>
									<UsersIcon className="size-4 shrink-0" />
									<span className="truncate text-sm">
										<span className="font-medium">"{trimmedQuery}"</span> in
										People
									</span>
								</CommandItem>
								<CommandItem
									value={`jobs-${trimmedQuery}`}
									onSelect={() => navigateToSearch(query, "jobs")}
								>
									<BriefcaseIcon className="size-4 shrink-0" />
									<span className="truncate text-sm">
										<span className="font-medium">"{trimmedQuery}"</span> in
										Jobs
									</span>
								</CommandItem>
								<CommandItem
									value={`posts-${trimmedQuery}`}
									onSelect={() => navigateToSearch(query, "posts")}
								>
									<ArticleIcon className="size-4 shrink-0" />
									<span className="truncate text-sm">
										<span className="font-medium">"{trimmedQuery}"</span> in
										Posts
									</span>
								</CommandItem>
							</CommandGroup>
						</>
					)}
				</CommandList>
			</Command>
		);
	}

	const inputClasses =
		"h-9 w-full rounded-full border border-input bg-transparent pl-9 pr-14 text-sm outline-hidden placeholder:text-muted-foreground transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

	return (
		<>
			<Popover
				open={open && hasContent && !isMobile}
				onOpenChange={(next) => {
					if (next && !hasContent) return;
					setOpen(next);
				}}
			>
				<PopoverAnchor asChild>
					<div className={className}>
						<div className="relative">
							<MagnifyingGlassIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
							<input
								ref={inputRef}
								id="search-input"
								type="text"
								placeholder="Search..."
								aria-label="Search"
								aria-expanded={open && hasContent && !isMobile}
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
								className={inputClasses}
							/>
							<kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground select-none sm:inline-flex">
								<span className="text-xs">⌘</span>K
							</kbd>
						</div>
					</div>
				</PopoverAnchor>

				<PopoverContent
					className="min-w-[--radix-popover-trigger-width] w-96 gap-0 overflow-hidden p-0"
					align="start"
					sideOffset={6}
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
					<SearchResultsContent maxHeight="max-h-[360px]" />
				</PopoverContent>
			</Popover>

			<Sheet
				open={open && isMobile}
				onOpenChange={(next) => {
					if (!next) {
						setOpen(false);
					}
				}}
			>
				<SheetContent
					side="top"
					showCloseButton={false}
					className="h-dvh border-none p-0 flex flex-col"
				>
					<SheetHeader className="sr-only">
						<SheetTitle>Search</SheetTitle>
					</SheetHeader>
					<div className="flex items-center gap-3 px-4 h-14 border-b border-border shrink-0">
						<SheetClose asChild>
							<button
								type="button"
								className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors"
								aria-label="Close search"
							>
								<ArrowLeftIcon className="size-5" weight="bold" />
							</button>
						</SheetClose>
						<div className="relative flex-1">
							<MagnifyingGlassIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
							<input
								ref={sheetInputRef}
								type="text"
								placeholder="Search..."
								aria-label="Search"
								autoComplete="off"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								onKeyDown={handleInputKeyDown}
								className={cn(inputClasses, "pr-3")}
							/>
						</div>
					</div>
					<div className="flex-1 overflow-y-auto">
						<div
							aria-hidden
							className={cn(
								"h-0.5 bg-primary/40 transition-opacity duration-300",
								isRefetching ? "animate-pulse opacity-100" : "opacity-0",
							)}
						/>
						<SearchResultsContent />
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}
