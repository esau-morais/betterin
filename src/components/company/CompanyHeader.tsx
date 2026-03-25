import {
	CameraIcon,
	GlobeIcon,
	MapPinIcon,
	PencilSimpleIcon,
	SealCheckIcon,
	UsersIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { COMPANY_SIZE_LABELS } from "#/lib/validation";
import { CompanyCoverDialog } from "./CompanyCoverDialog";
import type { CompanyData } from "./types";

export function CompanyHeader({
	company,
	isAdmin,
	onFollow,
	onEdit,
	onLogoEdit,
	onSaved,
}: {
	company: CompanyData;
	isAdmin: boolean;
	onFollow: () => void;
	onEdit?: () => void;
	onLogoEdit?: () => void;
	onSaved?: () => void;
}) {
	const [coverOpen, setCoverOpen] = useState(false);

	return (
		<div className="animate-fade-up">
			<div className="relative aspect-[4/1] max-h-[200px] w-full overflow-hidden rounded-t-xl border border-border border-b-0">
				{company.coverUrl ? (
					<img
						src={company.coverUrl}
						alt=""
						className="size-full object-cover object-center"
					/>
				) : (
					<div className="size-full bg-gradient-to-br from-primary/20 to-accent" />
				)}
				{isAdmin && (
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
						<div className="-mt-14 relative z-10">
							{isAdmin ? (
								<button
									type="button"
									onClick={onLogoEdit}
									className="group relative rounded-xl focus-ring"
									aria-label="Edit company logo"
								>
									<div className="size-16 rounded-xl ring-4 ring-card bg-muted flex items-center justify-center overflow-hidden">
										{company.logoUrl ? (
											<img
												src={company.logoUrl}
												alt={company.name}
												className="size-full object-cover"
											/>
										) : (
											<span className="text-2xl font-bold text-muted-foreground">
												{company.name[0]?.toUpperCase()}
											</span>
										)}
									</div>
									<div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
										<CameraIcon
											className="size-5 text-foreground"
											weight="fill"
										/>
									</div>
								</button>
							) : (
								<div className="size-16 rounded-xl ring-4 ring-card bg-muted flex items-center justify-center overflow-hidden">
									{company.logoUrl ? (
										<img
											src={company.logoUrl}
											alt={company.name}
											className="size-full object-cover"
										/>
									) : (
										<span className="text-2xl font-bold text-muted-foreground">
											{company.name[0]?.toUpperCase()}
										</span>
									)}
								</div>
							)}
						</div>

						<div>
							<h1 className="text-xl font-medium text-foreground flex items-center gap-1.5">
								{company.name}
								{company.verifiedAt && (
									<SealCheckIcon
										className="size-5 text-emerald-500"
										weight="fill"
									/>
								)}
							</h1>
							{company.tagline && (
								<p className="text-sm text-muted-foreground mt-0.5">
									{company.tagline}
								</p>
							)}
						</div>

						<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
							{company.industry && <span>{company.industry}</span>}
							{company.size && (
								<span>
									{COMPANY_SIZE_LABELS[company.size] ?? company.size} employees
								</span>
							)}
							{company.headquarters && (
								<span className="inline-flex items-center gap-1">
									<MapPinIcon className="size-3.5" />
									{company.headquarters}
								</span>
							)}
							{company.website && (
								<a
									href={company.website}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-brand hover:underline focus-ring rounded"
								>
									<GlobeIcon className="size-3.5" />
									{company.website.replace(/^https?:\/\//, "")}
								</a>
							)}
						</div>

						<div className="flex items-center gap-3 bi-mono text-text-tertiary text-sm">
							<span className="flex items-center gap-1">
								<UsersIcon className="size-3.5" />
								{company.followerCount} followers
							</span>
							<span className="flex items-center gap-1">
								<UsersIcon className="size-3.5" />
								{company.memberCount} employees
							</span>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<Button
							size="sm"
							variant={company.isFollowing ? "outline" : "default"}
							onClick={onFollow}
						>
							{company.isFollowing ? "Following" : "Follow"}
						</Button>
						{company.website && (
							<Button size="sm" variant="outline" asChild>
								<a
									href={company.website}
									target="_blank"
									rel="noopener noreferrer"
								>
									Visit website
								</a>
							</Button>
						)}
						{isAdmin && onEdit && (
							<Button size="sm" variant="outline" onClick={onEdit}>
								<PencilSimpleIcon className="size-4" />
								Edit
							</Button>
						)}
					</div>
				</div>
			</div>

			{isAdmin && (
				<CompanyCoverDialog
					open={coverOpen}
					onOpenChange={setCoverOpen}
					companyId={company.id}
					currentCover={company.coverUrl}
					onSaved={onSaved ?? (() => {})}
				/>
			)}
		</div>
	);
}
