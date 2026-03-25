import {
	CameraIcon,
	GlobeIcon,
	MapPinIcon,
	SealCheckIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { UserAvatar } from "#/components/shared/UserAvatar";
import type { ProfileData } from "#/lib/server/profile";
import { AvatarDialog } from "./AvatarDialog";
import { ConnectionButton } from "./ConnectionButton";
import { CoverPhotoDialog } from "./CoverPhotoDialog";
import { HiringBadge } from "./HiringBadge";
import { OpenToWorkBadge } from "./OpenToWorkBadge";

export function ProfileHeader({
	profile,
	onEditProfile,
	onAddSection,
	onSaved,
}: {
	profile: ProfileData;
	onEditProfile?: () => void;
	onAddSection?: () => void;
	onSaved?: () => void;
}) {
	const isOwner = profile.connectionStatus === "self";
	const [avatarOpen, setAvatarOpen] = useState(false);
	const [coverOpen, setCoverOpen] = useState(false);

	return (
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
				{isOwner && (
					<button
						type="button"
						onClick={() => setCoverOpen(true)}
						className="absolute top-3 right-3 rounded-lg bg-card/80 p-1.5 hit-area-1 text-muted-foreground hover:bg-card hover:text-foreground transition-colors focus-ring backdrop-blur-sm"
						aria-label="Edit cover photo"
					>
						<CameraIcon className="size-4" />
					</button>
				)}
			</div>

			<div className="bg-card border border-border border-t-0 rounded-b-xl p-5">
				<div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
					<div className="flex flex-col gap-3">
						<div className="-mt-14">
							{isOwner ? (
								<button
									type="button"
									onClick={() => setAvatarOpen(true)}
									className="group relative rounded-full focus-ring"
									aria-label="Edit profile photo"
								>
									<UserAvatar
										name={profile.user.name}
										image={profile.avatarUrl ?? profile.user.image}
										size="xl"
										className="ring-4 ring-card"
									/>
									<div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
										<CameraIcon
											className="size-5 text-foreground"
											weight="fill"
										/>
									</div>
								</button>
							) : (
								<UserAvatar
									name={profile.user.name}
									image={profile.avatarUrl ?? profile.user.image}
									size="xl"
									className="ring-4 ring-card"
								/>
							)}
						</div>

						<div>
							<h1 className="text-xl font-medium text-foreground inline-flex items-center gap-1.5">
								{profile.user.name}
								{profile.user.identityVerifiedAt && (
									<SealCheckIcon
										weight="fill"
										className="size-5 text-primary"
										aria-label="Verified identity"
									/>
								)}
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
									<MapPinIcon className="size-3.5" />
									{profile.location}
								</span>
							)}
							{profile.website && (
								<a
									href={
										profile.website.startsWith("http")
											? profile.website
											: `https://${profile.website}`
									}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-brand hover:underline focus-ring rounded"
								>
									<GlobeIcon className="size-3.5" />
									{profile.website.replace(/^https?:\/\//, "")}
								</a>
							)}
							<span className="bi-mono text-text-tertiary">
								{profile.connectionCount} connections
							</span>
						</div>

						<div className="flex flex-wrap items-center gap-2">
							{profile.openToWork && <OpenToWorkBadge />}
							{profile.hiring && <HiringBadge />}
						</div>
					</div>

					<div className="shrink-0">
						<ConnectionButton
							connectionStatus={profile.connectionStatus}
							targetUserId={profile.user.id}
							onEditProfile={onEditProfile}
							onAddSection={onAddSection}
						/>
					</div>
				</div>
			</div>

			{isOwner && (
				<>
					<AvatarDialog
						open={avatarOpen}
						onOpenChange={setAvatarOpen}
						currentImage={profile.avatarUrl ?? profile.user.image}
						currentFrame={profile.avatarFrame}
						userName={profile.user.name}
						onSaved={onSaved ?? (() => {})}
					/>
					<CoverPhotoDialog
						open={coverOpen}
						onOpenChange={setCoverOpen}
						currentCover={profile.coverUrl}
						onSaved={onSaved ?? (() => {})}
					/>
				</>
			)}
		</div>
	);
}
