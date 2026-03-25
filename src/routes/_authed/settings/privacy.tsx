import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { SettingsToggle } from "#/components/settings/SettingsToggle";
import { preferencesQueryOptions } from "#/lib/queries";
import {
	updateShareLocationInAnalyticsFn,
	updateShowImpressionCountFn,
	updateShowReadReceiptsFn,
} from "#/lib/server/preferences";

export const Route = createFileRoute("/_authed/settings/privacy")({
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(preferencesQueryOptions()),
	component: PrivacyPage,
});

function PrivacyPage() {
	const { data: prefs } = useSuspenseQuery(preferencesQueryOptions());
	const p = prefs as Record<string, unknown> | null;

	return (
		<div className="max-w-xl space-y-6">
			<div className="space-y-1">
				<h2 className="text-lg font-semibold tracking-tight">Privacy</h2>
				<p className="text-sm text-muted-foreground">
					Control what others can see on your posts.
				</p>
			</div>

			<div className="rounded-xl border border-border bg-card divide-y divide-border">
				<SettingsToggle
					label="Show impression count"
					description="Allow others to see how many times your posts have been viewed."
					id="showImpressionCount"
					value={prefs?.showImpressionCount ?? false}
					mutationFn={(value) =>
						updateShowImpressionCountFn({ data: { value } })
					}
				/>
				<SettingsToggle
					label="Share location in analytics"
					description="Your city may appear in post authors' viewer location analytics when you view their posts."
					id="shareLocationInAnalytics"
					value={p?.shareLocationInAnalytics === true}
					mutationFn={(value) =>
						updateShareLocationInAnalyticsFn({ data: { value } })
					}
				/>
				<SettingsToggle
					label="Show read receipts"
					description="Let others see when you've read their messages. When off, you also won't see their read receipts."
					id="showReadReceipts"
					value={p?.showReadReceipts === true}
					mutationFn={(value) => updateShowReadReceiptsFn({ data: { value } })}
				/>
			</div>
		</div>
	);
}
