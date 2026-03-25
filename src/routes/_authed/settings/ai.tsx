import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { SettingsToggle } from "#/components/settings/SettingsToggle";
import { preferencesQueryOptions } from "#/lib/queries";
import { updateAiConsentFn } from "#/lib/server/preferences";

export const Route = createFileRoute("/_authed/settings/ai")({
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(preferencesQueryOptions()),
	component: AiDataPage,
});

const authedRoute = getRouteApi("/_authed");

function AiDataPage() {
	const { data: prefs } = useSuspenseQuery(preferencesQueryOptions());
	const { restrictions } = authedRoute.useRouteContext();
	const locked = restrictions.aiConsentLocked;

	return (
		<div className="max-w-xl space-y-6">
			<div className="space-y-1">
				<h2 className="text-lg font-semibold tracking-tight">AI &amp; data</h2>
				<p className="text-sm text-muted-foreground">
					Your content is never used for training without your explicit consent.
					Each toggle is independent.
				</p>
			</div>

			{locked && (
				<div className="rounded-xl border border-border bg-card p-4">
					<p className="text-sm text-muted-foreground">
						AI features are disabled for accounts under 18 in your region.
					</p>
				</div>
			)}

			<div className="rounded-xl border border-border bg-card divide-y divide-border">
				<SettingsToggle
					label="Feed personalization"
					description="Allow ML models to learn from your interactions to improve feed ranking."
					id="aiConsentFeedPersonalization"
					value={
						locked ? false : (prefs?.aiConsentFeedPersonalization ?? false)
					}
					mutationFn={(value) =>
						updateAiConsentFn({
							data: { field: "aiConsentFeedPersonalization", value },
						})
					}
					disabled={locked}
				/>
				<SettingsToggle
					label="Content moderation"
					description="Allow your reports and feedback to improve automated content moderation."
					id="aiConsentContentModeration"
					value={locked ? false : (prefs?.aiConsentContentModeration ?? false)}
					mutationFn={(value) =>
						updateAiConsentFn({
							data: { field: "aiConsentContentModeration", value },
						})
					}
					disabled={locked}
				/>
				<SettingsToggle
					label="Job matching"
					description="Allow ML models to use your profile and activity to suggest relevant jobs."
					id="aiConsentJobMatching"
					value={locked ? false : (prefs?.aiConsentJobMatching ?? false)}
					mutationFn={(value) =>
						updateAiConsentFn({
							data: { field: "aiConsentJobMatching", value },
						})
					}
					disabled={locked}
				/>
			</div>
		</div>
	);
}
