import { ArrowLeftIcon, EyeIcon, UserPlusIcon } from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	notFound,
	useRouter,
} from "@tanstack/react-router";
import {
	type ReactNode,
	Suspense,
	useCallback,
	useReducer,
	useState,
} from "react";
import { AppShell } from "#/components/layout/AppShell";
import { TopNav } from "#/components/layout/TopNav";
import { AboutSection } from "#/components/profile/AboutSection";
import { ActivitySection } from "#/components/profile/ActivitySection";
import {
	AddSectionMenu,
	type SectionType,
} from "#/components/profile/AddSectionMenu";
import { AddSkillForm } from "#/components/profile/AddSkillForm";
import {
	CertificationDialog,
	type CertificationItem,
} from "#/components/profile/CertificationDialog";
import { CertificationsSection } from "#/components/profile/CertificationsSection";
import { EditAboutDialog } from "#/components/profile/EditAboutDialog";
import {
	EducationDialog,
	type EducationItem,
} from "#/components/profile/EducationDialog";
import { EducationSection } from "#/components/profile/EducationSection";
import { ExperienceDialog } from "#/components/profile/ExperienceDialog";
import type { ExperienceRole } from "#/components/profile/ExperienceItem";
import { ExperienceSection } from "#/components/profile/ExperienceSection";
import { HonorDialog, type HonorItem } from "#/components/profile/HonorDialog";
import { HonorsSection } from "#/components/profile/HonorsSection";
import {
	LanguageDialog,
	type LanguageItem,
} from "#/components/profile/LanguageDialog";
import { LanguagesSection } from "#/components/profile/LanguagesSection";
import { OpenToWorkBadge } from "#/components/profile/OpenToWorkBadge";
import { ProfileEditForm } from "#/components/profile/ProfileEditForm";
import { ProfileHeader } from "#/components/profile/ProfileHeader";
import { ProfileRightPanel } from "#/components/profile/ProfileRightPanel";
import { ProfileSkeleton } from "#/components/profile/ProfileSkeleton";
import {
	ProjectDialog,
	type ProjectItem,
} from "#/components/profile/ProjectDialog";
import { ProjectsSection } from "#/components/profile/ProjectsSection";
import { PublicSignInCTA } from "#/components/profile/PublicSignInCTA";
import { SkillsSection } from "#/components/profile/SkillsSection";
import {
	VolunteeringDialog,
	type VolunteeringItem,
} from "#/components/profile/VolunteeringDialog";
import { VolunteeringSection } from "#/components/profile/VolunteeringSection";
import { UserAvatar } from "#/components/shared/UserAvatar";
import { Alert, AlertAction, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import {
	profilePostsQueryOptions,
	profileSectionsQueryOptions,
	publicProfileSectionsQueryOptions,
} from "#/lib/queries";
import type { ProfileData, PublicProfileData } from "#/lib/server/profile";
import {
	getProfileByHandleFn,
	getProfileFn,
	getPublicProfileFn,
} from "#/lib/server/profile";

type SearchParams = {
	view?: "public";
};

export const Route = createFileRoute("/profile/$handle")({
	validateSearch: (search: Record<string, unknown>): SearchParams => ({
		view: search.view === "public" ? "public" : undefined,
	}),
	loader: async ({ params, context }) => {
		let session: Awaited<
			ReturnType<typeof import("#/lib/server/auth").getSessionFn>
		> | null = null;
		try {
			const { getSessionFn } = await import("#/lib/server/auth");
			session = await getSessionFn();
		} catch {
			/* unauthenticated */
		}

		const queryClient = context.queryClient;

		if (session) {
			const viewerProfile = await getProfileFn();
			const profile = await getProfileByHandleFn({
				data: { handle: params.handle },
			});
			if (!profile) throw notFound();

			queryClient.ensureQueryData(profileSectionsQueryOptions(profile.userId));
			queryClient.ensureQueryData(
				profilePostsQueryOptions(profile.userId, profile.connectionStatus),
			);

			return {
				isAuthenticated: true as const,
				session,
				viewerProfile,
				profile,
			};
		}

		const profile = await getPublicProfileFn({
			data: { handle: params.handle },
		});
		if (!profile) throw notFound();

		await queryClient.ensureQueryData(
			publicProfileSectionsQueryOptions(profile.userId),
		);

		return {
			isAuthenticated: false as const,
			session: null,
			viewerProfile: null,
			profile: {
				...profile,
				connectionStatus: "none" as const,
				isFollowing: false as const,
			},
		};
	},
	head: ({ loaderData }) => {
		const profile = loaderData?.profile;
		const name = profile?.user?.name ?? "Profile";
		const title = `${name} | Better In`;
		const description = profile?.headline
			? `${name} — ${profile.headline}`
			: `${name} on Better In`;
		return {
			meta: [
				{ title },
				{ name: "description", content: description },
				{ property: "og:title", content: name },
				{ property: "og:description", content: description },
				{ property: "og:type", content: "profile" },
				...(profile?.avatarUrl
					? [{ property: "og:image", content: profile.avatarUrl }]
					: []),
				{ name: "twitter:card", content: "summary" },
			],
		};
	},
	component: PublicProfilePage,
	notFoundComponent: ProfileNotFound,
	pendingComponent: () => (
		<AppShell>
			<ProfileSkeleton />
		</AppShell>
	),
});

function ProfileNotFound() {
	return (
		<div className="bi-card flex flex-col items-center justify-center py-16 text-center">
			<h1 className="text-xl font-bold text-foreground">Profile not found</h1>
			<p className="mt-2 text-sm text-muted-foreground">
				This profile doesn't exist or may have been removed.
			</p>
		</div>
	);
}

function PublicProfileLayout({
	name,
	children,
}: {
	name: string;
	children: ReactNode;
}) {
	return (
		<div className="min-h-dvh bg-background">
			<TopNav />
			<div className="mx-auto max-w-screen-lg px-4 pt-14">
				<div className="flex justify-center gap-6 items-start">
					<main className="flex-1 min-w-0 max-w-2xl py-6">{children}</main>
					<aside className="hidden lg:block w-80 shrink-0 sticky top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto py-6">
						<PublicSignInCTA name={name} />
					</aside>
				</div>
			</div>
		</div>
	);
}

function SignInToConnectButton({ preview = false }: { preview?: boolean }) {
	if (preview) {
		return (
			<div className="flex flex-wrap items-center gap-2">
				<Button variant="default" size="sm" disabled>
					<UserPlusIcon className="size-3.5" />
					Sign in to connect
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			<Button variant="default" size="sm" asChild>
				<Link to="/sign-in">
					<UserPlusIcon className="size-3.5" />
					Sign in to connect
				</Link>
			</Button>
		</div>
	);
}

function PreviewBanner({ handle }: { handle: string }) {
	return (
		<Alert
			role="status"
			aria-live="polite"
			className="mb-4 rounded-xl border-brand/20 bg-brand-subtle px-1.5 py-1.5"
		>
			<EyeIcon className="size-4 text-brand" />
			<AlertDescription className="text-foreground">
				You're viewing your profile as others see it
			</AlertDescription>
			<AlertAction>
				<Button
					variant="outline"
					size="sm"
					className="rounded-[calc(var(--radius-xl)-6px)]"
					asChild
				>
					<Link to="/profile/$handle" params={{ handle }} search={{}}>
						<ArrowLeftIcon className="size-3.5" />
						Back to editing
					</Link>
				</Button>
			</AlertAction>
		</Alert>
	);
}

type SectionDialogKind =
	| "experience"
	| "education"
	| "certification"
	| "project"
	| "volunteering"
	| "honor"
	| "language";

type DialogItemMap = {
	experience: ExperienceRole;
	education: EducationItem;
	certification: CertificationItem;
	project: ProjectItem;
	volunteering: VolunteeringItem;
	honor: HonorItem;
	language: LanguageItem;
};

type SectionDialogState =
	| { open: false; kind?: undefined; item?: undefined }
	| {
			[K in SectionDialogKind]: {
				open: true;
				kind: K;
				item: DialogItemMap[K] | null;
			};
	  }[SectionDialogKind];

type SectionDialogAction =
	| {
			[K in SectionDialogKind]: {
				type: "open";
				kind: K;
				item?: DialogItemMap[K] | null;
			};
	  }[SectionDialogKind]
	| { type: "close" };

function sectionDialogReducer(
	_state: SectionDialogState,
	action: SectionDialogAction,
): SectionDialogState {
	if (action.type === "close") return { open: false };
	// Action kind+item are already type-checked per the union — safe to construct
	const result = {
		open: true as const,
		kind: action.kind,
		item: action.item ?? null,
	};
	return result as SectionDialogState;
}

const initialDialogState: SectionDialogState = { open: false };

function dialogItemId(dialog: SectionDialogState): string {
	if (!dialog.open || !dialog.item) return "new";
	return "id" in dialog.item && typeof dialog.item.id === "string"
		? dialog.item.id
		: "new";
}

function PublicProfilePage() {
	const data = Route.useLoaderData();
	const { view } = Route.useSearch();
	const forcePublic = view === "public";

	if (data.isAuthenticated) {
		return <AuthenticatedProfileView data={data} previewPublic={forcePublic} />;
	}

	return (
		<PublicProfileLayout name={data.profile.user.name}>
			<UnauthenticatedProfileView profile={data.profile} />
		</PublicProfileLayout>
	);
}

function AuthenticatedProfileView({
	data,
	previewPublic = false,
}: {
	data: Extract<
		ReturnType<typeof Route.useLoaderData>,
		{ isAuthenticated: true }
	>;
	previewPublic?: boolean;
}) {
	const { profile, viewerProfile } = data;
	const { data: sections } = useSuspenseQuery(
		profileSectionsQueryOptions(profile.userId),
	);
	const { data: postsResult } = useSuspenseQuery(
		profilePostsQueryOptions(profile.userId, profile.connectionStatus),
	);
	const posts = postsResult.posts;
	const router = useRouter();

	const isOwnProfile = viewerProfile && viewerProfile.handle === profile.handle;
	const effectivePreview = previewPublic && !!isOwnProfile;
	const isOwner = effectivePreview
		? false
		: profile.connectionStatus === "self";

	const [editingProfile, setEditingProfile] = useState(false);
	const [showAddSection, setShowAddSection] = useState(false);
	const [skillDialogOpen, setSkillDialogOpen] = useState(false);
	const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
	const [dialog, dispatch] = useReducer(
		sectionDialogReducer,
		initialDialogState,
	);

	const handleInvalidate = useCallback(() => {
		router.invalidate();
	}, [router]);

	const handleSaved = useCallback(() => {
		setEditingProfile(false);
		router.invalidate();
	}, [router]);

	const handleDialogSaved = useCallback(() => {
		dispatch({ type: "close" });
		router.invalidate();
	}, [router]);

	const handleAddSection = useCallback((type: SectionType) => {
		setShowAddSection(false);
		if (type === "skill") {
			setSkillDialogOpen(true);
		} else {
			dispatch({ type: "open", kind: type });
		}
	}, []);

	const rightPanel = effectivePreview ? (
		<PublicSignInCTA name={profile.user.name} preview />
	) : (
		<ProfileRightPanel
			name={profile.user.name}
			headline={profile.headline}
			handle={profile.handle}
			image={profile.avatarUrl ?? profile.user.image}
			isOwner={!!isOwnProfile}
			onHandleChanged={handleInvalidate}
		/>
	);

	if (effectivePreview) {
		return (
			<AppShell rightPanel={rightPanel}>
				<PreviewBanner handle={profile.handle} />
				<UnauthenticatedProfileView profile={profile} isAuthenticated />
			</AppShell>
		);
	}

	return (
		<AppShell rightPanel={rightPanel}>
			<Suspense fallback={<ProfileSkeleton />}>
				<div className="space-y-4">
					<ProfileHeader
						profile={profile}
						onEditProfile={() => setEditingProfile(true)}
						onAddSection={() => setShowAddSection(true)}
						onSaved={handleInvalidate}
					/>

					{editingProfile && (
						<ProfileEditForm
							initialName={profile.user.name}
							initialHeadline={profile.headline}
							initialBio={profile.bio}
							initialLocation={profile.location}
							initialLocationLat={profile.locationLat}
							initialLocationLon={profile.locationLon}
							initialWebsite={profile.website}
							initialOpenToWork={profile.openToWork}
							onClose={() => setEditingProfile(false)}
							onSaved={handleSaved}
						/>
					)}

					{showAddSection && (
						<AddSectionMenu
							onSelect={handleAddSection}
							onClose={() => setShowAddSection(false)}
						/>
					)}

					{(profile.bio || isOwner) && !editingProfile && (
						<AboutSection
							bio={profile.bio}
							isOwner={isOwner}
							topSkills={sections.skills.slice(0, 5)}
							onEdit={() => setAboutDialogOpen(true)}
						/>
					)}

					<EditAboutDialog
						open={aboutDialogOpen}
						onOpenChange={setAboutDialogOpen}
						initialBio={profile.bio}
						topSkills={sections.skills.slice(0, 5)}
						onSaved={handleInvalidate}
					/>

					{posts.length > 0 && (
						<ActivitySection
							posts={posts}
							currentUserId={data.session.user.id}
						/>
					)}

					{sections.experiences.length > 0 && (
						<ExperienceSection
							experiences={sections.experiences}
							isOwner={isOwner}
							onAdd={() => dispatch({ type: "open", kind: "experience" })}
							onEdit={(item) =>
								dispatch({
									type: "open",
									kind: "experience",
									item,
								})
							}
						/>
					)}

					{sections.educations.length > 0 && (
						<EducationSection
							educations={sections.educations}
							isOwner={isOwner}
							onAdd={() => dispatch({ type: "open", kind: "education" })}
							onEdit={(item) =>
								dispatch({
									type: "open",
									kind: "education",
									item,
								})
							}
						/>
					)}

					{sections.projects.length > 0 && (
						<ProjectsSection
							projects={sections.projects}
							isOwner={isOwner}
							onAdd={() => dispatch({ type: "open", kind: "project" })}
							onEdit={(item) =>
								dispatch({
									type: "open",
									kind: "project",
									item,
								})
							}
						/>
					)}

					{sections.certifications.length > 0 && (
						<CertificationsSection
							certifications={sections.certifications}
							isOwner={isOwner}
							onAdd={() => dispatch({ type: "open", kind: "certification" })}
							onEdit={(item) =>
								dispatch({
									type: "open",
									kind: "certification",
									item,
								})
							}
						/>
					)}

					{sections.volunteering.length > 0 && (
						<VolunteeringSection
							volunteering={sections.volunteering}
							isOwner={isOwner}
							onAdd={() => dispatch({ type: "open", kind: "volunteering" })}
							onEdit={(item) =>
								dispatch({
									type: "open",
									kind: "volunteering",
									item,
								})
							}
						/>
					)}

					{sections.skills.length > 0 && (
						<SkillsSection
							skills={sections.skills}
							isOwner={isOwner}
							onAdd={() => setSkillDialogOpen(true)}
							onReordered={handleInvalidate}
						/>
					)}

					<AddSkillForm
						open={skillDialogOpen}
						onOpenChange={setSkillDialogOpen}
						existingSkillNames={sections.skills.map(
							(s: { name: string }) => s.name,
						)}
						onSaved={handleInvalidate}
					/>

					{sections.honors.length > 0 && (
						<HonorsSection
							honors={sections.honors}
							isOwner={isOwner}
							onAdd={() => dispatch({ type: "open", kind: "honor" })}
							onEdit={(item) =>
								dispatch({
									type: "open",
									kind: "honor",
									item,
								})
							}
						/>
					)}

					{sections.languages.length > 0 && (
						<LanguagesSection
							languages={sections.languages}
							isOwner={isOwner}
							onAdd={() => dispatch({ type: "open", kind: "language" })}
							onEdit={(item) =>
								dispatch({
									type: "open",
									kind: "language",
									item,
								})
							}
						/>
					)}

					<ExperienceDialog
						key={
							dialog.kind === "experience" ? dialogItemId(dialog) : "exp-closed"
						}
						open={dialog.kind === "experience" && dialog.open}
						onOpenChange={(open) => {
							if (!open) dispatch({ type: "close" });
						}}
						item={dialog.kind === "experience" ? dialog.item : undefined}
						onSaved={handleDialogSaved}
					/>
					<EducationDialog
						key={
							dialog.kind === "education" ? dialogItemId(dialog) : "edu-closed"
						}
						open={dialog.kind === "education" && dialog.open}
						onOpenChange={(open) => {
							if (!open) dispatch({ type: "close" });
						}}
						item={dialog.kind === "education" ? dialog.item : undefined}
						onSaved={handleDialogSaved}
					/>
					<CertificationDialog
						key={
							dialog.kind === "certification"
								? dialogItemId(dialog)
								: "cert-closed"
						}
						open={dialog.kind === "certification" && dialog.open}
						onOpenChange={(open) => {
							if (!open) dispatch({ type: "close" });
						}}
						item={dialog.kind === "certification" ? dialog.item : undefined}
						onSaved={handleDialogSaved}
					/>
					<ProjectDialog
						key={
							dialog.kind === "project" ? dialogItemId(dialog) : "proj-closed"
						}
						open={dialog.kind === "project" && dialog.open}
						onOpenChange={(open) => {
							if (!open) dispatch({ type: "close" });
						}}
						item={dialog.kind === "project" ? dialog.item : undefined}
						onSaved={handleDialogSaved}
					/>
					<VolunteeringDialog
						key={
							dialog.kind === "volunteering"
								? dialogItemId(dialog)
								: "vol-closed"
						}
						open={dialog.kind === "volunteering" && dialog.open}
						onOpenChange={(open) => {
							if (!open) dispatch({ type: "close" });
						}}
						item={dialog.kind === "volunteering" ? dialog.item : undefined}
						onSaved={handleDialogSaved}
					/>
					<HonorDialog
						key={
							dialog.kind === "honor" ? dialogItemId(dialog) : "honor-closed"
						}
						open={dialog.kind === "honor" && dialog.open}
						onOpenChange={(open) => {
							if (!open) dispatch({ type: "close" });
						}}
						item={dialog.kind === "honor" ? dialog.item : undefined}
						onSaved={handleDialogSaved}
					/>
					<LanguageDialog
						key={
							dialog.kind === "language" ? dialogItemId(dialog) : "lang-closed"
						}
						open={dialog.kind === "language" && dialog.open}
						onOpenChange={(open) => {
							if (!open) dispatch({ type: "close" });
						}}
						item={dialog.kind === "language" ? dialog.item : undefined}
						onSaved={handleDialogSaved}
					/>
				</div>
			</Suspense>
		</AppShell>
	);
}

function UnauthenticatedProfileView({
	profile,
	isAuthenticated = false,
}: {
	profile:
		| ProfileData
		| (PublicProfileData & { connectionStatus: "none"; isFollowing: false });
	isAuthenticated?: boolean;
}) {
	const { data: sections } = useSuspenseQuery(
		publicProfileSectionsQueryOptions(profile.userId),
	);
	return (
		<Suspense fallback={<ProfileSkeleton />}>
			<div className="space-y-4">
				<div className="animate-fade-up">
					<div className="relative aspect-[4/1] max-h-[200px] w-full overflow-hidden rounded-t-xl border border-border border-b-0">
						{profile.coverUrl ? (
							<img
								src={profile.coverUrl}
								alt=""
								className="size-full object-cover object-center"
							/>
						) : (
							<div className="size-full bg-gradient-to-br from-primary/20 to-accent" />
						)}
					</div>

					<div className="bg-card border border-border border-t-0 rounded-b-xl p-5">
						<div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
							<div className="flex flex-col gap-3">
								<div className="-mt-14">
									<UserAvatar
										name={profile.user.name}
										image={profile.avatarUrl ?? profile.user.image}
										size="xl"
										className="ring-4 ring-card"
									/>
								</div>

								<div>
									<h1 className="text-xl font-medium text-foreground">
										{profile.user.name}
									</h1>
									{profile.headline && (
										<p className="text-sm text-muted-foreground mt-0.5">
											{profile.headline}
										</p>
									)}
								</div>

								<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
									{profile.location && (
										<span className="inline-flex items-center gap-1">
											{profile.location}
										</span>
									)}
									<span className="bi-mono text-text-tertiary">
										{profile.connectionCount} connections
									</span>
								</div>

								<div className="flex flex-wrap items-center gap-2">
									{profile.openToWork && <OpenToWorkBadge />}
								</div>
							</div>

							<div className="shrink-0">
								<SignInToConnectButton preview={isAuthenticated} />
							</div>
						</div>
					</div>
				</div>

				{profile.bio && (
					<AboutSection
						bio={profile.bio}
						isOwner={false}
						topSkills={sections.skills.slice(0, 5)}
					/>
				)}

				{sections.experiences.length > 0 && (
					<ExperienceSection
						experiences={sections.experiences}
						isOwner={false}
					/>
				)}

				{sections.educations.length > 0 && (
					<EducationSection educations={sections.educations} isOwner={false} />
				)}

				{sections.projects.length > 0 && (
					<ProjectsSection projects={sections.projects} isOwner={false} />
				)}

				{sections.certifications.length > 0 && (
					<CertificationsSection
						certifications={sections.certifications}
						isOwner={false}
					/>
				)}

				{sections.volunteering.length > 0 && (
					<VolunteeringSection
						volunteering={sections.volunteering}
						isOwner={false}
					/>
				)}

				{sections.skills.length > 0 && (
					<SkillsSection skills={sections.skills} isOwner={false} />
				)}

				{sections.honors.length > 0 && (
					<HonorsSection honors={sections.honors} isOwner={false} />
				)}

				{sections.languages.length > 0 && (
					<LanguagesSection languages={sections.languages} isOwner={false} />
				)}
			</div>
		</Suspense>
	);
}
