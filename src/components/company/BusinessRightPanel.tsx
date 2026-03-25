import { BuildingsIcon, PlusIcon } from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import {
	followedCompaniesQueryOptions,
	myCompaniesQueryOptions,
} from "#/lib/queries";

export function BusinessRightPanel() {
	const { data: myCompanies } = useSuspenseQuery(myCompaniesQueryOptions());
	const { data: followed } = useSuspenseQuery(followedCompaniesQueryOptions());

	return (
		<div className="space-y-4">
			<div className="bi-card py-6 text-center">
				<BuildingsIcon className="size-8 text-muted-foreground mx-auto" />
				<p className="mt-2 text-sm font-medium">
					{myCompanies.length} page{myCompanies.length !== 1 ? "s" : ""} you
					manage
				</p>
				<p className="text-xs text-muted-foreground">
					{followed.length} companies followed
				</p>
			</div>

			{myCompanies.length === 0 && (
				<div className="bi-card space-y-3">
					<h3 className="text-sm font-medium">Create a company page</h3>
					<p className="text-xs text-muted-foreground">
						Showcase your company, post updates, and attract talent.
					</p>
					<Button size="sm" asChild>
						<Link to="/business/new">
							<PlusIcon className="size-4" />
							Get started
						</Link>
					</Button>
				</div>
			)}
		</div>
	);
}
