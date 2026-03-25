import { SealCheckIcon, UsersIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";

const ROLE_LABELS: Record<string, string> = {
	admin: "Admin",
	recruiter: "Recruiter",
	member: "Member",
};

type CompanyCardProps = {
	company: {
		id: string;
		name: string;
		slug: string;
		logoUrl: string | null;
		tagline: string | null;
		industry: string | null;
		verifiedAt: string | null;
		followerCount: number;
	};
	role?: string | null;
	onUnfollow?: (companyId: string) => void;
	unfollowPending?: boolean;
};

export function CompanyCard({
	company,
	role,
	onUnfollow,
	unfollowPending,
}: CompanyCardProps) {
	return (
		<Link
			to="/company/$slug"
			params={{ slug: company.slug }}
			className="bi-card flex items-center gap-4 hover:bg-accent/50 transition-colors focus-ring rounded-xl"
		>
			<div className="size-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
				{company.logoUrl ? (
					<img
						src={company.logoUrl}
						alt={company.name}
						className="size-full object-cover"
					/>
				) : (
					<span className="text-lg font-bold text-muted-foreground">
						{company.name[0]?.toUpperCase()}
					</span>
				)}
			</div>

			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5">
					<p className="text-sm font-medium truncate">{company.name}</p>
					{company.verifiedAt && (
						<SealCheckIcon
							className="size-4 text-emerald-500 shrink-0"
							weight="fill"
						/>
					)}
					{role && (
						<Badge
							variant="secondary"
							className="shrink-0 text-[10px] px-1.5 py-0"
						>
							{ROLE_LABELS[role] ?? role}
						</Badge>
					)}
				</div>
				<p className="text-xs text-muted-foreground truncate">
					{[company.tagline, company.industry].filter(Boolean).join(" · ") ||
						company.slug}
				</p>
				<p className="text-xs text-text-tertiary mt-0.5 flex items-center gap-1">
					<UsersIcon className="size-3" />
					{company.followerCount} followers
				</p>
			</div>

			{onUnfollow && (
				<Button
					size="sm"
					variant="outline"
					disabled={unfollowPending}
					onClick={(e) => {
						e.preventDefault();
						onUnfollow(company.id);
					}}
				>
					Unfollow
				</Button>
			)}
		</Link>
	);
}
