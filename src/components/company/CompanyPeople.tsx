import { Link } from "@tanstack/react-router";
import { UserAvatar } from "#/components/shared/UserAvatar";
import { Badge } from "#/components/ui/badge";

type Member = {
	userId: string;
	role: string;
	verifiedAt: string | null;
	name: string;
	handle: string | null;
	avatarUrl: string | null;
	headline: string | null;
};

export function CompanyPeople({ members }: { members: Member[] }) {
	if (members.length === 0) return null;

	return (
		<section className="bi-card animate-fade-up" aria-label="People">
			<h2 className="text-lg font-semibold text-foreground">People</h2>
			<div className="mt-3 space-y-3">
				{members.map((member) => (
					<div key={member.userId} className="flex items-center gap-3">
						{member.handle ? (
							<Link
								to="/profile/$handle"
								params={{ handle: member.handle }}
								className="shrink-0 rounded-full focus-ring"
							>
								<UserAvatar
									name={member.name}
									image={member.avatarUrl}
									size="sm"
								/>
							</Link>
						) : (
							<UserAvatar
								name={member.name}
								image={member.avatarUrl}
								size="sm"
							/>
						)}
						<div className="min-w-0 flex-1">
							{member.handle ? (
								<Link
									to="/profile/$handle"
									params={{ handle: member.handle }}
									className="text-sm font-medium truncate hover:underline focus-ring rounded block"
								>
									{member.name}
								</Link>
							) : (
								<p className="text-sm font-medium truncate">{member.name}</p>
							)}
							{member.headline && (
								<p className="text-xs text-muted-foreground truncate">
									{member.headline}
								</p>
							)}
						</div>
						{member.role === "admin" && (
							<Badge variant="secondary" className="shrink-0 text-xs">
								Admin
							</Badge>
						)}
					</div>
				))}
			</div>
		</section>
	);
}
