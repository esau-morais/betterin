import { UserPlusIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { UserAvatar } from "#/components/shared/UserAvatar";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { suggestedPeopleQueryOptions } from "#/lib/queries";
import { sendConnectionRequestFn } from "#/lib/server/profile";

const authedRoute = getRouteApi("/_authed");

function ConnectButton({
	targetUserId,
	onSent,
}: {
	targetUserId: string;
	onSent: () => void;
}) {
	const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

	const handleConnect = useCallback(async () => {
		setStatus("sending");
		try {
			await sendConnectionRequestFn({ data: { targetUserId } });
			setStatus("sent");
			onSent();
		} catch {
			setStatus("idle");
		}
	}, [targetUserId, onSent]);

	if (status === "sent") return null;

	return (
		<Button
			variant="outline"
			size="sm"
			className="h-7 rounded-full px-3 text-xs"
			disabled={status === "sending"}
			onClick={handleConnect}
		>
			<UserPlusIcon className="size-3.5" />
			Connect
		</Button>
	);
}

function SuggestionSkeleton() {
	return (
		<div className="flex items-center gap-3 py-2">
			<Skeleton className="size-6 shrink-0 rounded-full" />
			<div className="min-w-0 flex-1 space-y-1.5">
				<Skeleton className="h-3.5 w-3/4" />
				<Skeleton className="h-3 w-1/2" />
			</div>
			<Skeleton className="h-7 w-20 shrink-0 rounded-full" />
		</div>
	);
}

export function FeedRightPanel() {
	const { session, profile } = authedRoute.useRouteContext();
	const user = session.user;
	const { data, isLoading } = useQuery(suggestedPeopleQueryOptions());
	const suggestions = data?.results.slice(0, 5) ?? [];
	const [dismissed, setDismissed] = useState<Set<string>>(new Set());

	const visibleSuggestions = suggestions.filter((p) => !dismissed.has(p.id));

	return (
		<div className="space-y-4">
			<Link
				to="/profile/$handle"
				params={{ handle: profile.handle }}
				className="bi-card flex flex-col items-center text-center py-6 transition-colors hover:bg-muted/50"
			>
				<UserAvatar name={user.name} image={user.image} size="lg" />
				<p className="mt-3 text-sm font-medium">{user.name}</p>
				{profile?.headline && (
					<p className="text-xs text-muted-foreground mt-0.5">
						{profile.headline}
					</p>
				)}
				{profile?.handle && (
					<p className="bi-mono text-text-tertiary mt-1">@{profile.handle}</p>
				)}
			</Link>

			<div className="bi-card">
				<h3 className="text-sm font-medium mb-3">People you may know</h3>

				{isLoading && (
					<div className="space-y-1">
						<SuggestionSkeleton />
						<SuggestionSkeleton />
						<SuggestionSkeleton />
					</div>
				)}

				{!isLoading && visibleSuggestions.length === 0 && (
					<p className="text-xs text-muted-foreground py-2">
						Connect with others to grow your network. Suggestions will appear
						here as you make connections.
					</p>
				)}

				{!isLoading && visibleSuggestions.length > 0 && (
					<div className="space-y-1">
						{visibleSuggestions.map((person) => (
							<div
								key={person.id}
								className="flex items-center gap-3 rounded-lg py-2"
							>
								<Link
									to="/profile/$handle"
									params={{
										handle: person.handle ?? person.id,
									}}
									className="shrink-0"
								>
									<UserAvatar
										name={person.name}
										image={person.avatarUrl}
										size="sm"
									/>
								</Link>
								<div className="min-w-0 flex-1">
									<Link
										to="/profile/$handle"
										params={{
											handle: person.handle ?? person.id,
										}}
										className="block truncate text-sm font-medium leading-tight hover:underline"
									>
										{person.name}
									</Link>
									{person.headline && (
										<p className="truncate text-xs text-muted-foreground">
											{person.headline}
										</p>
									)}
									{person.sharedCount != null && person.sharedCount > 0 && (
										<p className="text-xs text-muted-foreground/70">
											{person.sharedCount} mutual connection
											{person.sharedCount !== 1 ? "s" : ""}
										</p>
									)}
								</div>
								<div className="shrink-0">
									<ConnectButton
										targetUserId={person.id}
										onSent={() =>
											setDismissed((prev) => new Set([...prev, person.id]))
										}
									/>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
