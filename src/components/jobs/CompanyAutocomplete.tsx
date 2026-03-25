import {
	BuildingOfficeIcon,
	SealCheckIcon,
	XIcon,
} from "@phosphor-icons/react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Popover as PopoverPrimitive } from "radix-ui";
import { useRef, useState } from "react";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandList,
} from "#/components/ui/command";
import { Popover, PopoverAnchor } from "#/components/ui/popover";
import type { Company as DbCompany } from "#/lib/db/schema";
import { companyAutocompleteQueryOptions } from "#/lib/queries";
import { createCompanyFn } from "#/lib/server/companies";
import { useDebouncedValue } from "#/lib/use-debounce";
import { cn } from "#/lib/utils";

export type CompanyOption = Pick<DbCompany, "id" | "name" | "domain"> & {
	verifiedAt: string | null;
};

export function CompanyAutocomplete({
	value,
	onChange,
	className,
}: {
	value: string;
	onChange: (company: CompanyOption | null) => void;
	className?: string;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const commandRef = useRef<HTMLDivElement>(null);
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState(value);
	const debouncedQuery = useDebouncedValue(query, 200);

	const { data: suggestions } = useQuery({
		...companyAutocompleteQueryOptions(debouncedQuery),
		placeholderData: keepPreviousData,
	});

	const hasExactMatch = suggestions?.some(
		(s) => s.name.toLowerCase() === query.toLowerCase(),
	);
	const showCreateOption = query.length > 0 && !hasExactMatch;
	const hasSuggestions =
		(suggestions && suggestions.length > 0) || showCreateOption;

	function handleSelect(company: CompanyOption) {
		setQuery(company.name);
		setOpen(false);
		onChange(company);
	}

	async function handleCreate() {
		setOpen(false);
		const created = await createCompanyFn({ data: { name: query } });
		onChange({
			id: created.id,
			name: created.name,
			domain: created.domain ?? null,
			verifiedAt: created.verifiedAt ?? null,
		});
		setQuery(created.name);
	}

	function handleClear() {
		setQuery("");
		setOpen(false);
		onChange(null);
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
		<Popover open={open && !!hasSuggestions} onOpenChange={setOpen}>
			<PopoverAnchor asChild>
				<div className={cn("relative", className)}>
					<BuildingOfficeIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
					<input
						ref={inputRef}
						type="text"
						placeholder="Search companies..."
						aria-label="Company"
						aria-expanded={open && !!hasSuggestions}
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
						className="h-9 w-full rounded-lg border border-input bg-transparent pl-9 pr-8 text-sm outline-hidden placeholder:text-muted-foreground transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
					/>
					{query && (
						<button
							type="button"
							onClick={handleClear}
							className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground transition-colors"
							aria-label="Clear company"
						>
							<XIcon className="size-3.5" />
						</button>
					)}
				</div>
			</PopoverAnchor>

			<PopoverPrimitive.Content
				className="z-50 min-w-[var(--radix-popover-trigger-width)] w-80 overflow-hidden rounded-lg bg-popover p-0 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden data-[side=bottom]:slide-in-from-top-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
				align="start"
				sideOffset={4}
				onOpenAutoFocus={(e) => e.preventDefault()}
				onCloseAutoFocus={(e) => e.preventDefault()}
			>
				<Command ref={commandRef} shouldFilter={false} loop>
					<CommandList className="max-h-[240px]">
						{suggestions && suggestions.length > 0 && (
							<CommandGroup>
								{suggestions.map((company) => (
									<CommandItem
										key={company.id}
										value={company.name}
										onSelect={() =>
											handleSelect({
												id: company.id,
												name: company.name,
												domain: company.domain ?? null,
												verifiedAt: company.verifiedAt ?? null,
											})
										}
									>
										<div className="flex size-6 shrink-0 items-center justify-center rounded overflow-hidden bg-muted">
											{company.logoUrl ? (
												<img
													src={company.logoUrl}
													alt={company.name}
													className="size-full object-cover"
												/>
											) : (
												<span className="text-[10px] font-medium text-muted-foreground">
													{company.name[0]?.toUpperCase()}
												</span>
											)}
										</div>
										<span className="truncate text-sm">{company.name}</span>
										{company.verifiedAt && (
											<SealCheckIcon className="ml-auto size-3.5 shrink-0 text-emerald-500" />
										)}
									</CommandItem>
								))}
							</CommandGroup>
						)}
						{showCreateOption && (
							<CommandGroup>
								<CommandItem
									value={`__create__${query}`}
									onSelect={handleCreate}
								>
									<span className="text-sm text-muted-foreground">
										Create new company{" "}
										<span className="font-medium text-foreground">
											"{query}"
										</span>
									</span>
								</CommandItem>
							</CommandGroup>
						)}
						{!hasSuggestions && (
							<CommandEmpty className="py-3 text-center text-sm text-muted-foreground">
								No companies found.
							</CommandEmpty>
						)}
					</CommandList>
				</Command>
			</PopoverPrimitive.Content>
		</Popover>
	);
}
