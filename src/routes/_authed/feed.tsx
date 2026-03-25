import { CaretDownIcon, XIcon } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { FeedList } from "#/components/feed/FeedList";
import { FeedPageSkeleton, FeedSkeleton } from "#/components/feed/FeedSkeleton";
import { ParentalConsentBanner } from "#/components/feed/ParentalConsentBanner";
import { PostComposer } from "#/components/feed/PostComposer";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover";
import {
	feedInfiniteQueryOptions,
	preferencesQueryOptions,
} from "#/lib/queries";
import { hasPasswordFn } from "#/lib/server/account";
import { dismissBannerFn, updateFeedModeFn } from "#/lib/server/preferences";
import { cn } from "#/lib/utils";
import type { FeedMode } from "#/lib/validation";

const PASSWORD_BANNER_ID = "set-password-hint";

const FEED_MODES = [
	{ value: "ranked" as const, label: "Top" },
	{ value: "chronological" as const, label: "Recent" },
];

export const Route = createFileRoute("/_authed/feed")({
	loader: async ({ context: { queryClient } }) => {
		const [passwordStatus, preferences] = await Promise.all([
			hasPasswordFn(),
			queryClient.ensureQueryData(preferencesQueryOptions()),
		]);
		const dismissed = preferences?.dismissedBanners ?? [];
		const feedMode = (preferences?.feedMode ?? "ranked") as FeedMode;
		await queryClient.ensureInfiniteQueryData(
			feedInfiniteQueryOptions(feedMode),
		);
		return {
			showPasswordBanner:
				!passwordStatus.hasPassword && !dismissed.includes(PASSWORD_BANNER_ID),
			feedMode,
		};
	},
	pendingComponent: FeedPageSkeleton,
	component: FeedPage,
});

const authedRoute = getRouteApi("/_authed");

function FeedPage() {
	const { showPasswordBanner, feedMode: initialFeedMode } =
		Route.useLoaderData();
	const { restrictions } = authedRoute.useRouteContext();
	const [feedMode, setFeedMode] = useState(initialFeedMode);
	const queryClient = useQueryClient();

	const showConsentBanner =
		restrictions.requiresParentalLink && !restrictions.parentalConsentVerified;

	const feedModeMutation = useMutation({
		mutationFn: (mode: FeedMode) =>
			updateFeedModeFn({ data: { feedMode: mode } }),
		onMutate: (mode) => {
			setFeedMode(mode);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["preferences"] });
		},
		onError: () => {
			toast.error("Failed to update feed mode");
		},
	});

	return (
		<div className="space-y-4">
			{showConsentBanner && <ParentalConsentBanner />}
			{showPasswordBanner && <PasswordBanner />}
			<PostComposer />
			<FeedSortBar
				feedMode={feedMode}
				onSetFeedMode={(mode) => feedModeMutation.mutate(mode)}
			/>
			<Suspense fallback={<FeedSkeleton />}>
				<FeedList feedMode={feedMode} />
			</Suspense>
		</div>
	);
}

function FeedSortBar({
	feedMode,
	onSetFeedMode,
}: {
	feedMode: FeedMode;
	onSetFeedMode: (mode: FeedMode) => void;
}) {
	const [open, setOpen] = useState(false);
	const activeLabel =
		FEED_MODES.find((m) => m.value === feedMode)?.label ?? "Top";

	return (
		<div className="flex items-center gap-3">
			<div className="h-px flex-1 bg-border" />
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<button
						type="button"
						className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 rounded py-1 focus-ring"
					>
						Sort by:
						<span className="font-medium text-primary">{activeLabel}</span>
						<CaretDownIcon
							className={cn(
								"size-3 text-primary transition-transform duration-150",
								open && "rotate-180",
							)}
							weight="bold"
						/>
					</button>
				</PopoverTrigger>
				<PopoverContent
					align="center"
					sideOffset={4}
					className="w-auto min-w-[100px] p-1"
				>
					{FEED_MODES.map(({ value, label }) => (
						<button
							key={value}
							type="button"
							onClick={() => {
								onSetFeedMode(value);
								setOpen(false);
							}}
							className={cn(
								"flex w-full items-center rounded-md px-3 py-1.5 text-sm transition-colors focus-ring",
								feedMode === value
									? "bg-accent text-primary font-medium"
									: "text-muted-foreground hover:bg-muted hover:text-foreground",
							)}
						>
							{label}
						</button>
					))}
				</PopoverContent>
			</Popover>
			<div className="h-px flex-1 bg-border" />
		</div>
	);
}

function PasswordBanner() {
	const [visible, setVisible] = useState(true);

	if (!visible) return null;

	async function handleDismiss() {
		setVisible(false);
		await dismissBannerFn({ data: { bannerId: PASSWORD_BANNER_ID } });
	}

	return (
		<div className="flex items-center gap-3 rounded-xl border border-border bg-secondary p-4">
			<p className="flex-1 text-sm text-muted-foreground">
				Prefer a password?{" "}
				<Link
					to="/settings/account"
					className="font-medium text-foreground hover:underline"
				>
					Set one in Settings
				</Link>
				.
			</p>
			<button
				type="button"
				onClick={handleDismiss}
				className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
				aria-label="Dismiss"
			>
				<XIcon className="size-4" />
			</button>
		</div>
	);
}
