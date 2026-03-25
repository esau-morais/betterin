import {
	ArrowLeftIcon,
	DownloadSimpleIcon,
	TrendDownIcon,
	TrendUpIcon,
} from "@phosphor-icons/react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { useCallback, useMemo, useState } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	XAxis,
	YAxis,
} from "recharts";
import { ActivityHeatmap } from "#/components/analytics/ActivityHeatmap";
import {
	type DateFilter,
	DateRangePicker,
} from "#/components/analytics/DateRangePicker";
import { GlobeVisualization } from "#/components/analytics/GlobeVisualization";
import { StatCard } from "#/components/analytics/StatCard";
import { TimeAgo } from "#/components/shared/TimeAgo";
import { UserAvatar } from "#/components/shared/UserAvatar";
import { Button } from "#/components/ui/button";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "#/components/ui/chart";
import { Skeleton } from "#/components/ui/skeleton";
import {
	exportPostAnalyticsFn,
	getPostAnalyticsFn,
	getPostDailyImpressionsFn,
	getPostDwellDistributionFn,
	getPostEngagementTrendFn,
	getPostFeedContextFn,
	getPostHourlyActivityFn,
	getPostViewerLocationsFn,
} from "#/lib/server/post-analytics";
import { cn } from "#/lib/utils";

const impressionsChartConfig = {
	impressions: {
		label: "Impressions",
		color: "var(--color-primary)",
	},
} satisfies ChartConfig;

const engagementChartConfig = {
	engagement: {
		label: "Engagement",
		color: "var(--color-primary)",
	},
} satisfies ChartConfig;

export const Route = createFileRoute("/_authed/post/$postId/analytics")({
	loader: async ({ params }) => {
		const postId = params.postId;
		const days = 7;
		try {
			const [
				analytics,
				dailyImpressions,
				viewerLocations,
				dwellDistribution,
				feedContext,
				engagementTrend,
			] = await Promise.all([
				getPostAnalyticsFn({ data: { postId, days } }),
				getPostDailyImpressionsFn({ data: { postId, days } }),
				getPostViewerLocationsFn({ data: { postId, days } }),
				getPostDwellDistributionFn({ data: { postId, days } }),
				getPostFeedContextFn({ data: { postId, days } }),
				getPostEngagementTrendFn({ data: { postId, days } }),
			]);
			return {
				analytics,
				dailyImpressions: dailyImpressions.dailyImpressions,
				viewerLocations,
				dwellDistribution,
				feedContext,
				engagementTrend,
			};
		} catch {
			throw redirect({ to: "/post/$postId", params });
		}
	},
	component: PostAnalyticsPage,
	pendingComponent: AnalyticsSkeleton,
});

function AnalyticsSkeleton() {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
			<Skeleton className="h-8 w-32 lg:col-span-2" />
			<div className="bi-card space-y-3 lg:col-span-2">
				<div className="flex items-center gap-3">
					<Skeleton className="size-10 rounded-full shrink-0" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-1/3" />
						<Skeleton className="h-3 w-2/3" />
					</div>
				</div>
			</div>
			<Skeleton className="h-9 w-64 lg:col-span-2" />
			<div className="bi-card space-y-3 lg:col-span-2">
				<Skeleton className="h-5 w-24" />
				<div className="grid grid-cols-3 gap-4">
					<Skeleton className="h-20 rounded-xl" />
					<Skeleton className="h-20 rounded-xl" />
					<Skeleton className="h-20 rounded-xl" />
				</div>
			</div>
			<div className="bi-card">
				<Skeleton className="h-[200px] w-full" />
			</div>
			<div className="bi-card">
				<Skeleton className="h-[200px] w-full" />
			</div>
			<div className="bi-card">
				<Skeleton className="h-[200px] w-full" />
			</div>
			<div className="bi-card">
				<Skeleton className="h-[200px] w-full" />
			</div>
			<div className="bi-card lg:col-span-2">
				<Skeleton className="h-[360px] w-full" />
			</div>
			<div className="bi-card">
				<Skeleton className="h-[140px] w-full" />
			</div>
			<div className="bi-card">
				<Skeleton className="h-[140px] w-full" />
			</div>
		</div>
	);
}

function PostAnalyticsPage() {
	const data = Route.useLoaderData();
	const router = useRouter();
	const [dateFilter, setDateFilter] = useState<DateFilter>({
		type: "preset",
		days: 7,
	});

	const postId = data.analytics.post.id;

	const days =
		dateFilter.type === "preset"
			? dateFilter.days
			: Math.ceil(
					(dateFilter.to.getTime() - dateFilter.from.getTime()) / 86400000,
				);

	const timezone = useMemo(
		() => Intl.DateTimeFormat().resolvedOptions().timeZone,
		[],
	);

	const { data: analytics } = useQuery({
		queryKey: ["post-analytics", postId, days],
		queryFn: () => getPostAnalyticsFn({ data: { postId, days } }),
		initialData: days === 7 ? data.analytics : undefined,
		placeholderData: keepPreviousData,
	});

	const { data: impressionsData } = useQuery({
		queryKey: ["post-daily-impressions", postId, days],
		queryFn: () => getPostDailyImpressionsFn({ data: { postId, days } }),
		initialData:
			days === 7 ? { dailyImpressions: data.dailyImpressions } : undefined,
		placeholderData: keepPreviousData,
	});

	const { data: hourlyActivity } = useQuery({
		queryKey: ["post-hourly-activity", postId, days],
		queryFn: () =>
			getPostHourlyActivityFn({ data: { postId, days, timezone } }),
		placeholderData: keepPreviousData,
	});

	const { data: viewerLocations } = useQuery({
		queryKey: ["post-viewer-locations", postId, days],
		queryFn: () => getPostViewerLocationsFn({ data: { postId, days } }),
		initialData: days === 7 ? data.viewerLocations : undefined,
		placeholderData: keepPreviousData,
	});

	const { data: dwellDistribution } = useQuery({
		queryKey: ["post-dwell-distribution", postId, days],
		queryFn: () => getPostDwellDistributionFn({ data: { postId, days } }),
		initialData: days === 7 ? data.dwellDistribution : undefined,
		placeholderData: keepPreviousData,
	});

	const { data: feedContext } = useQuery({
		queryKey: ["post-feed-context", postId, days],
		queryFn: () => getPostFeedContextFn({ data: { postId, days } }),
		initialData: days === 7 ? data.feedContext : undefined,
		placeholderData: keepPreviousData,
	});

	const { data: engagementTrend } = useQuery({
		queryKey: ["post-engagement-trend", postId, days],
		queryFn: () => getPostEngagementTrendFn({ data: { postId, days } }),
		initialData: days === 7 ? data.engagementTrend : undefined,
		placeholderData: keepPreviousData,
	});

	const dailyImpressions =
		impressionsData?.dailyImpressions ?? data.dailyImpressions;
	const analyticsData = analytics ?? data.analytics;

	const handleExport = useCallback(async () => {
		try {
			const result = await exportPostAnalyticsFn({
				data: { postId, days },
			});
			const blob = new Blob([result.csv], { type: "text/csv" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = result.filename;
			a.click();
			URL.revokeObjectURL(url);
		} catch {
			// best effort
		}
	}, [postId, days]);

	const handleBack = useCallback(() => {
		if (window.history.length > 1) {
			router.history.back();
		} else {
			router.navigate({ to: "/post/$postId", params: { postId } });
		}
	}, [router, postId]);

	const chartData = dailyImpressions.map((d) => ({
		date: d.date,
		impressions: d.count,
	}));

	const engagementTrendData = (engagementTrend?.trend ?? []).map((d) => ({
		date: d.date,
		engagement: d.reactions + d.comments + d.shares,
	}));

	const engagementItems = [
		{
			label: "Reactions",
			value: analyticsData.reactions,
			delta: analyticsData.reactionsDelta,
		},
		{
			label: "Comments",
			value: analyticsData.comments,
			delta: analyticsData.commentsDelta,
		},
		{
			label: "Reposts",
			value: analyticsData.reposts,
			delta: analyticsData.repostsDelta,
		},
		{
			label: "Saves",
			value: analyticsData.saves,
			delta: analyticsData.savesDelta,
		},
		{
			label: "Shares",
			value: analyticsData.shares,
			delta: analyticsData.sharesDelta,
		},
	];

	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
			{/* Back button — full width */}
			<button
				type="button"
				onClick={handleBack}
				className="lg:col-span-2 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus-ring rounded-lg px-2 py-1 -ml-2 w-fit"
				aria-label="Go back"
			>
				<ArrowLeftIcon className="size-4" />
				<span className="font-medium">Post analytics</span>
			</button>

			{/* Post preview — full width */}
			<div className="bi-card lg:col-span-2">
				<div className="flex items-start gap-3">
					<UserAvatar
						name={analyticsData.post.author.name}
						image={analyticsData.post.author.image}
					/>
					<div className="flex-1 min-w-0">
						<div className="flex items-baseline gap-1.5">
							<span className="text-sm font-medium truncate">
								{analyticsData.post.author.name}
							</span>
							<span className="text-muted-foreground" aria-hidden>
								·
							</span>
							<TimeAgo date={analyticsData.post.createdAt} />
						</div>
						<p className="mt-1 text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap break-words">
							{analyticsData.post.content}
						</p>
					</div>
				</div>
			</div>

			{/* Date range + export — full width */}
			<div className="lg:col-span-2 flex items-center justify-between">
				<DateRangePicker value={dateFilter} onChange={setDateFilter} />
				<Button variant="outline" size="sm" onClick={handleExport}>
					<DownloadSimpleIcon className="size-4" />
					Export
				</Button>
			</div>

			{/* Discovery stats — full width */}
			<div className="bi-card space-y-3 lg:col-span-2">
				<h2 className="text-base font-semibold">Discovery</h2>
				<div className="grid grid-cols-3 gap-4">
					<StatCard
						value={analyticsData.impressions}
						label="Impressions"
						delta={analyticsData.impressionsDelta}
					/>
					<StatCard
						value={analyticsData.uniqueViewers}
						label="Unique viewers"
						delta={analyticsData.uniqueViewersDelta}
					/>
					<StatCard
						value={analyticsData.engagementRate}
						label="Engagement rate"
						delta={analyticsData.engagementRateDelta}
						format="percent"
					/>
				</div>
			</div>

			{/* Impressions over time — col 1 */}
			<div className="bi-card space-y-3">
				<h2 className="text-base font-semibold">Impressions over time</h2>
				{chartData.length > 0 ? (
					<ChartContainer
						config={impressionsChartConfig}
						className="h-[200px] w-full"
					>
						<BarChart
							accessibilityLayer
							data={chartData}
							margin={{ left: -12, right: 0, top: 0, bottom: 0 }}
						>
							<defs>
								<linearGradient
									id="impressionGradient"
									x1="0"
									y1="0"
									x2="0"
									y2="1"
								>
									<stop
										offset="0%"
										stopColor="var(--color-impressions)"
										stopOpacity={0.9}
									/>
									<stop
										offset="100%"
										stopColor="var(--color-impressions)"
										stopOpacity={0.3}
									/>
								</linearGradient>
							</defs>
							<CartesianGrid vertical={false} strokeDasharray="3 3" />
							<XAxis
								dataKey="date"
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								tickFormatter={(value) => {
									const date = new Date(value);
									return date.toLocaleDateString("en-US", {
										month: "short",
										day: "numeric",
									});
								}}
							/>
							<YAxis
								tickLine={false}
								axisLine={false}
								tickMargin={4}
								width={40}
								allowDecimals={false}
							/>
							<ChartTooltip
								cursor={false}
								content={
									<ChartTooltipContent
										labelFormatter={(value) =>
											format(parseISO(String(value)), "MMM d, yyyy")
										}
									/>
								}
							/>
							<Bar
								dataKey="impressions"
								fill="url(#impressionGradient)"
								radius={[4, 4, 0, 0]}
							/>
						</BarChart>
					</ChartContainer>
				) : (
					<div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
						No impression data for this period.
					</div>
				)}
			</div>

			{/* Engagement trend — col 2 */}
			<div className="bi-card space-y-3">
				<h2 className="text-base font-semibold">Engagement trend</h2>
				{engagementTrendData.length > 0 ? (
					<ChartContainer
						config={engagementChartConfig}
						className="h-[200px] w-full"
					>
						<AreaChart
							data={engagementTrendData}
							margin={{ left: -18, right: 0, top: 0, bottom: 0 }}
						>
							<defs>
								<linearGradient
									id="engagementGradient"
									x1="0"
									y1="0"
									x2="0"
									y2="1"
								>
									<stop
										offset="0%"
										stopColor="var(--color-engagement)"
										stopOpacity={0.2}
									/>
									<stop
										offset="100%"
										stopColor="var(--color-engagement)"
										stopOpacity={0}
									/>
								</linearGradient>
							</defs>
							<CartesianGrid vertical={false} strokeDasharray="3 3" />
							<XAxis
								dataKey="date"
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								tickFormatter={(value) => {
									const date = new Date(value);
									return date.toLocaleDateString("en-US", {
										month: "short",
										day: "numeric",
									});
								}}
							/>
							<YAxis
								tickLine={false}
								axisLine={false}
								tickMargin={4}
								width={40}
								allowDecimals={false}
							/>
							<ChartTooltip
								cursor={false}
								content={
									<ChartTooltipContent
										labelFormatter={(value) =>
											format(parseISO(String(value)), "MMM d, yyyy")
										}
									/>
								}
							/>
							<Area
								type="monotone"
								dataKey="engagement"
								stroke="var(--color-engagement)"
								fill="url(#engagementGradient)"
								strokeWidth={2}
							/>
						</AreaChart>
					</ChartContainer>
				) : (
					<div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
						No engagement data for this period.
					</div>
				)}
			</div>

			{/* Social engagement — col 1 */}
			<div className="bi-card space-y-3">
				<h2 className="text-base font-semibold">Social engagement</h2>
				<div className="divide-y divide-border">
					{engagementItems.map(({ label, value, delta }) => (
						<div
							key={label}
							className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
						>
							<span className="text-sm text-muted-foreground">{label}</span>
							<div className="flex items-center gap-2">
								{delta != null && <DeltaBadge delta={delta} />}
								<span className="font-mono text-sm font-medium">
									{value.toLocaleString()}
								</span>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Active times — col 2 */}
			<div className="bi-card space-y-3">
				<h2 className="text-base font-semibold">Active times</h2>
				{hourlyActivity ? (
					<ActivityHeatmap data={hourlyActivity.activity} />
				) : (
					<Skeleton className="h-[180px] w-full rounded" />
				)}
			</div>

			{/* Viewer locations — full width */}
			<div className="bi-card space-y-3 lg:col-span-2">
				{viewerLocations ? (
					viewerLocations.locations.length > 0 ? (
						<>
							<GlobeVisualization
								locations={viewerLocations.locations.map((loc) => ({
									lat: loc.lat ?? 0,
									lon: loc.lon ?? 0,
									count: loc.count,
									label: loc.location,
								}))}
							/>
							<div className="space-y-2">
								{viewerLocations.locations.map((loc) => (
									<div key={loc.location} className="flex items-center gap-3">
										<span className="text-sm w-40 truncate">
											{loc.location}
										</span>
										<div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
											<div
												className="h-full rounded-full bg-primary/60"
												style={{ width: `${loc.percentage}%` }}
											/>
										</div>
										<span className="bi-mono w-12 text-right">
											{loc.percentage}%
										</span>
									</div>
								))}
							</div>
							{viewerLocations.totalViewers >
								viewerLocations.locations.reduce(
									(sum, l) => sum + l.count,
									0,
								) && (
								<p className="text-xs text-muted-foreground">
									Some viewers have opted out of location sharing.
								</p>
							)}
						</>
					) : (
						<>
							<h2 className="text-base font-semibold">Viewer locations</h2>
							<p className="text-sm text-muted-foreground">
								No location data available yet.
							</p>
						</>
					)
				) : (
					<>
						<h2 className="text-base font-semibold">Viewer locations</h2>
						<Skeleton className="h-[360px] w-full rounded" />
					</>
				)}
			</div>

			{/* Dwell time — col 1 */}
			<div className="bi-card space-y-3">
				<h2 className="text-base font-semibold">Dwell time</h2>
				{dwellDistribution ? (
					dwellDistribution.distribution.length > 0 ? (
						<div className="space-y-2">
							{dwellDistribution.distribution.map((bucket) => (
								<div key={bucket.bucket} className="flex items-center gap-3">
									<span className="text-sm w-16 text-muted-foreground">
										{bucket.label}
									</span>
									<div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
										<div
											className="h-full rounded-full bg-primary/60"
											style={{ width: `${bucket.percentage}%` }}
										/>
									</div>
									<span className="bi-mono w-12 text-right">
										{bucket.percentage}%
									</span>
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">
							No dwell time data available yet.
						</p>
					)
				) : (
					<Skeleton className="h-[120px] w-full rounded" />
				)}
			</div>

			{/* Feed context — col 2 */}
			<div className="bi-card space-y-3">
				<h2 className="text-base font-semibold">Feed context</h2>
				{feedContext ? (
					<div className="space-y-3">
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Ranked feed</span>
								<span className="bi-mono">{feedContext.rankedPercentage}%</span>
							</div>
							<div className="h-2 rounded-full bg-muted overflow-hidden">
								<div
									className="h-full rounded-full bg-primary/60"
									style={{ width: `${feedContext.rankedPercentage}%` }}
								/>
							</div>
						</div>
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">Chronological</span>
								<span className="bi-mono">
									{feedContext.chronologicalPercentage}%
								</span>
							</div>
							<div className="h-2 rounded-full bg-muted overflow-hidden">
								<div
									className="h-full rounded-full bg-primary/60"
									style={{
										width: `${feedContext.chronologicalPercentage}%`,
									}}
								/>
							</div>
						</div>
					</div>
				) : (
					<Skeleton className="h-[80px] w-full rounded" />
				)}
			</div>
		</div>
	);
}

function DeltaBadge({ delta }: { delta: number }) {
	if (delta === 0) return null;
	const isPositive = delta > 0;
	return (
		<span
			className={cn(
				"flex items-center gap-0.5 text-xs font-medium",
				isPositive ? "text-success" : "text-destructive",
			)}
		>
			{isPositive ? (
				<TrendUpIcon className="size-3" />
			) : (
				<TrendDownIcon className="size-3" />
			)}
			{isPositive ? "+" : ""}
			{delta}%
		</span>
	);
}
