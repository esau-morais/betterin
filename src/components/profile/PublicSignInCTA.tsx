import { Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";

export function PublicSignInCTA({
	name,
	preview = false,
}: {
	name: string;
	preview?: boolean;
}) {
	return (
		<div className="bi-card space-y-3 text-center">
			<p className="text-sm font-medium text-foreground">
				Sign in to connect with {name}
			</p>
			<p className="text-xs text-muted-foreground">
				See their full profile, send messages, and discover shared connections.
			</p>
			<div className="flex flex-col gap-2">
				{preview ? (
					<>
						<Button variant="default" size="sm" disabled>
							Sign in
						</Button>
						<Button variant="outline" size="sm" disabled>
							Join Better In
						</Button>
					</>
				) : (
					<>
						<Button variant="default" size="sm" asChild>
							<Link to="/sign-in">Sign in</Link>
						</Button>
						<Button variant="outline" size="sm" asChild>
							<Link to="/sign-in">Join Better In</Link>
						</Button>
					</>
				)}
			</div>
		</div>
	);
}
