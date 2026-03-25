import { WarningIcon } from "@phosphor-icons/react";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { Suspense, useCallback, useState } from "react";
import { z } from "zod";
import { CompanyAbout } from "#/components/company/CompanyAbout";
import { CompanyEditDialog } from "#/components/company/CompanyEditDialog";
import { CompanyHeader } from "#/components/company/CompanyHeader";
import { CompanyJobs } from "#/components/company/CompanyJobs";
import { CompanyPeople } from "#/components/company/CompanyPeople";
import { CompanyPostComposer } from "#/components/company/CompanyPostComposer";
import { CompanyRightPanel } from "#/components/company/CompanyRightPanel";
import { CompanyVerifyBanner } from "#/components/company/CompanyVerifyBanner";
import { AppShell } from "#/components/layout/AppShell";
import { ActivitySection } from "#/components/profile/ActivitySection";
import { UserAvatar } from "#/components/shared/UserAvatar";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Skeleton } from "#/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { unverifiedClaimsQueryOptions } from "#/lib/queries";
import {
	disputeExperienceFn,
	followCompanyFn,
	getCompanyFn,
	getCompanyMembersFn,
	getCompanyPostsFn,
	unfollowCompanyFn,
	verifyDomainEmailFn,
} from "#/lib/server/companies";
import { listJobsFn } from "#/lib/server/jobs";

const companySearchSchema = z.object({
	tab: z
		.enum(["home", "about", "jobs", "people"])
		.default("home")
		.catch("home"),
});

export const Route = createFileRoute("/company/$slug")({
	validateSearch: companySearchSchema,
	loader: async ({ params }) => {
		const company = await getCompanyFn({ data: { slug: params.slug } });
		const [members, jobsData, companyPosts] = await Promise.all([
			getCompanyMembersFn({ data: { companyId: company.id } }),
			listJobsFn({ data: { sort: "newest", companyId: company.id } }),
			getCompanyPostsFn({ data: { companyId: company.id } }),
		]);
		return { company, members, jobs: jobsData.results, companyPosts };
	},
	component: CompanyPage,
	pendingComponent: () => (
		<AppShell>
			<div className="py-6 space-y-4">
				<Skeleton className="h-48 rounded-xl" />
				<Skeleton className="h-12 rounded-xl" />
				<Skeleton className="h-32 rounded-xl" />
			</div>
		</AppShell>
	),
});

function AdminClaimsSection({ companyId }: { companyId: string }) {
	const queryClient = useQueryClient();
	const { data: claims } = useSuspenseQuery(
		unverifiedClaimsQueryOptions(companyId),
	);
	const [disputeTarget, setDisputeTarget] = useState<string | null>(null);
	const [disputeReason, setDisputeReason] = useState("");

	const disputeMutation = useMutation({
		mutationFn: (input: { experienceId: string; reason: string }) =>
			disputeExperienceFn({ data: input }),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["unverified-claims", companyId],
			});
			setDisputeTarget(null);
			setDisputeReason("");
		},
	});

	const verifyMutation = useMutation({
		mutationFn: (experienceId: string) =>
			verifyDomainEmailFn({ data: { companyId, experienceId } }),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["unverified-claims", companyId],
			});
		},
	});

	if (claims.length === 0) return null;

	return (
		<section className="bi-card">
			<h2 className="text-base font-semibold text-foreground mb-3">
				Unverified Claims ({claims.length})
			</h2>
			<div className="space-y-3">
				{claims.map((claim) => (
					<div
						key={claim.experience.id}
						className="flex items-center gap-3 py-2"
					>
						<UserAvatar
							name={claim.user.name}
							image={claim.profile?.avatarUrl ?? claim.user.image}
							size="sm"
						/>
						<div className="min-w-0 flex-1">
							<p className="text-sm font-medium truncate">{claim.user.name}</p>
							<p className="text-xs text-muted-foreground truncate">
								{claim.experience.title} · {claim.experience.verificationStatus}
							</p>
						</div>
						<div className="flex gap-1.5 shrink-0">
							<Button
								variant="outline"
								size="sm"
								onClick={() => verifyMutation.mutate(claim.experience.id)}
								disabled={verifyMutation.isPending}
							>
								Verify
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setDisputeTarget(claim.experience.id)}
								className="text-amber-600 hover:text-amber-700"
							>
								Dispute
							</Button>
						</div>
					</div>
				))}
			</div>

			<Dialog
				open={!!disputeTarget}
				onOpenChange={(open) => {
					if (!open) setDisputeTarget(null);
				}}
			>
				<DialogContent className="sm:max-w-md" showCloseButton>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<WarningIcon className="size-5 text-amber-500" weight="fill" />
							Dispute experience claim
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-3 py-2">
						<textarea
							value={disputeReason}
							onChange={(e) => setDisputeReason(e.target.value)}
							placeholder="Why is this claim inaccurate?"
							rows={3}
							maxLength={512}
							className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-text-tertiary focus:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors resize-y dark:bg-input/30"
						/>
						{disputeMutation.error && (
							<p className="text-sm text-destructive">
								{disputeMutation.error instanceof Error
									? disputeMutation.error.message
									: "Failed to dispute"}
							</p>
						)}
						<div className="flex justify-end gap-2">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setDisputeTarget(null)}
							>
								Cancel
							</Button>
							<Button
								variant="default"
								size="sm"
								disabled={!disputeReason.trim() || disputeMutation.isPending}
								onClick={() => {
									if (disputeTarget && disputeReason.trim()) {
										disputeMutation.mutate({
											experienceId: disputeTarget,
											reason: disputeReason.trim(),
										});
									}
								}}
							>
								{disputeMutation.isPending ? "Disputing..." : "Submit dispute"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</section>
	);
}

function CompanyPageContent() {
	const { tab } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const router = useRouter();
	const { company, members, jobs, companyPosts } = Route.useLoaderData();

	const [editOpen, setEditOpen] = useState(false);

	const isAdmin = company.memberRole === "admin";
	const topJobs = jobs.slice(0, 5);
	const totalJobs = jobs.length;

	const handleFollow = useCallback(async () => {
		if (company.isFollowing) {
			await unfollowCompanyFn({ data: { companyId: company.id } });
		} else {
			await followCompanyFn({ data: { companyId: company.id } });
		}
		router.invalidate();
	}, [company.isFollowing, company.id, router]);

	const handleSaved = useCallback(() => {
		router.invalidate();
	}, [router]);

	function setTab(value: string) {
		navigate({
			search: { tab: value as "home" | "about" | "jobs" | "people" },
			replace: true,
		});
	}

	return (
		<>
			<div className="space-y-0 py-6">
				<CompanyHeader
					company={company}
					isAdmin={isAdmin}
					onFollow={handleFollow}
					onEdit={() => setEditOpen(true)}
					onSaved={handleSaved}
				/>

				{isAdmin && !company.verifiedAt && company.domain && (
					<div className="mt-4">
						<CompanyVerifyBanner company={company} />
					</div>
				)}

				<Tabs value={tab} onValueChange={setTab} className="mt-4">
					<TabsList className="w-full justify-start bg-card border border-border rounded-xl px-1.5 py-1">
						<TabsTrigger
							value="home"
							className="rounded-[calc(var(--radius-xl)-4px)]"
						>
							Home
						</TabsTrigger>
						<TabsTrigger
							value="about"
							className="rounded-[calc(var(--radius-xl)-4px)]"
						>
							About
						</TabsTrigger>
						<TabsTrigger
							value="jobs"
							className="rounded-[calc(var(--radius-xl)-4px)]"
						>
							Jobs ({totalJobs})
						</TabsTrigger>
						<TabsTrigger
							value="people"
							className="rounded-[calc(var(--radius-xl)-4px)]"
						>
							People
						</TabsTrigger>
					</TabsList>

					<TabsContent value="home" className="mt-4 space-y-4">
						<CompanyAbout company={company} truncated />
						{isAdmin && <CompanyPostComposer company={company} />}
						<ActivitySection posts={companyPosts} />
						<CompanyJobs
							jobs={topJobs}
							company={company}
							totalJobs={totalJobs}
						/>
					</TabsContent>

					<TabsContent value="about" className="mt-4 space-y-4">
						<CompanyAbout
							company={company}
							isAdmin={isAdmin}
							onEdit={() => setEditOpen(true)}
						/>
					</TabsContent>

					<TabsContent value="jobs" className="mt-4 space-y-4">
						<CompanyJobs
							jobs={jobs}
							company={company}
							totalJobs={totalJobs}
							showAll
						/>
					</TabsContent>

					<TabsContent value="people" className="mt-4 space-y-4">
						<CompanyPeople members={members} />
						{isAdmin && (
							<Suspense fallback={<Skeleton className="h-24 rounded-xl" />}>
								<AdminClaimsSection companyId={company.id} />
							</Suspense>
						)}
					</TabsContent>
				</Tabs>
			</div>

			{isAdmin && (
				<CompanyEditDialog
					open={editOpen}
					onOpenChange={setEditOpen}
					company={company}
					onSaved={handleSaved}
				/>
			)}
		</>
	);
}

function CompanyPage() {
	const { company, jobs } = Route.useLoaderData();

	return (
		<AppShell
			rightPanel={
				<CompanyRightPanel company={company} jobCount={jobs.length} />
			}
		>
			<CompanyPageContent />
		</AppShell>
	);
}
