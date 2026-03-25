import { ArrowLeftIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UserAvatar } from "#/components/shared/UserAvatar";
import { Skeleton } from "#/components/ui/skeleton";
import { connectionsInfiniteQueryOptions } from "#/lib/queries";
import { getOrCreateConversationFn } from "#/lib/server/messages";

const DEBOUNCE_MS = 300;

export function NewConversationPanel({ onBack }: { onBack: () => void }) {
	const navigate = useNavigate();
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const sentinelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const t = setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS);
		return () => clearTimeout(t);
	}, [query]);

	useEffect(() => {
		const mq = window.matchMedia("(min-width: 1024px)");
		if (mq.matches) inputRef.current?.focus();
	}, []);

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useInfiniteQuery(connectionsInfiniteQueryOptions(debouncedQuery));

	const connections = useMemo(
		() => data?.pages.flatMap((p) => p.connections) ?? [],
		[data],
	);

	useEffect(() => {
		const sentinel = sentinelRef.current;
		const container = scrollRef.current;
		if (!sentinel || !container) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{ root: container, rootMargin: "100px" },
		);

		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	const handleSelect = useCallback(
		async (userId: string) => {
			if (isCreating) return;
			setIsCreating(true);
			try {
				const { conversationId } = await getOrCreateConversationFn({
					data: { recipientId: userId },
				});
				onBack();
				navigate({ to: "/messages/$id", params: { id: conversationId } });
			} catch (err: unknown) {
				console.error("Failed to create conversation:", err);
			} finally {
				setIsCreating(false);
			}
		},
		[isCreating, onBack, navigate],
	);

	return (
		<div className="flex h-full flex-col">
			<div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
				<button
					type="button"
					onClick={onBack}
					className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
					aria-label="Back to conversations"
				>
					<ArrowLeftIcon className="size-4" weight="bold" />
				</button>
				<h2 className="text-sm font-semibold text-foreground">New message</h2>
			</div>

			<div className="shrink-0 border-b border-border px-3 py-2">
				<div className="relative">
					<MagnifyingGlassIcon
						className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
						aria-hidden="true"
					/>
					<input
						ref={inputRef}
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search connections…"
						autoComplete="off"
						spellCheck={false}
						className="w-full rounded-lg border border-border bg-background py-1.5 pr-3 pl-8 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors"
						aria-label="Search connections"
					/>
				</div>
			</div>

			<div
				ref={scrollRef}
				className="flex-1 overflow-y-auto overscroll-contain"
			>
				{isLoading && (
					<div className="flex flex-col gap-1 p-1">
						{Array.from({ length: 6 }, (_, i) => `nc-skel-${i}`).map((key) => (
							<div key={key} className="flex items-center gap-3 px-3 py-2.5">
								<Skeleton className="size-8 shrink-0 rounded-full" />
								<div className="min-w-0 flex-1 space-y-1.5">
									<Skeleton className="h-3.5 w-28" />
									<Skeleton className="h-3 w-40" />
								</div>
							</div>
						))}
					</div>
				)}

				{!isLoading && connections.length === 0 && (
					<div className="px-4 py-8 text-center">
						<p className="text-sm text-muted-foreground">
							{debouncedQuery ? "No connections found" : "No connections yet"}
						</p>
					</div>
				)}

				{connections.length > 0 && (
					<div className="flex flex-col gap-0.5 p-1">
						{connections.map((person) => (
							<button
								key={person.userId}
								type="button"
								onClick={() => handleSelect(person.userId)}
								disabled={isCreating}
								className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
							>
								<UserAvatar
									name={person.name}
									image={person.image}
									size="default"
									className="shrink-0"
								/>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium text-foreground">
										{person.name}
									</p>
									{person.headline && (
										<p className="truncate text-xs text-muted-foreground">
											{person.headline}
										</p>
									)}
								</div>
							</button>
						))}

						<div ref={sentinelRef} className="h-1" />

						{isFetchingNextPage && (
							<div className="flex justify-center py-3">
								<div className="size-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
