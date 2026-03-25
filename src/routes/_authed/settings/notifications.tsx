import {
	BriefcaseIcon,
	ChatCircleIcon,
	EnvelopeSimpleIcon,
	HeartIcon,
	UserPlusIcon,
	WarningIcon,
} from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { NotificationTypeRow } from "#/components/settings/NotificationTypeRow";
import { preferencesQueryOptions } from "#/lib/queries";
import {
	updateEmailNotifFn,
	updateInAppNotifFn,
} from "#/lib/server/preferences";

export const Route = createFileRoute("/_authed/settings/notifications")({
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(preferencesQueryOptions()),
	component: NotificationSettingsPage,
});

const NOTIFICATION_TYPES = [
	{
		key: "connections",
		label: "Connections",
		description: "Someone sends you a connection request or accepts yours.",
		icon: UserPlusIcon,
		inAppField: "inAppNotifConnections" as const,
		emailField: "emailNotifConnectionRequests" as const,
		emailDefault: true,
	},
	{
		key: "comments",
		label: "Comments",
		description: "Someone comments on your post.",
		icon: ChatCircleIcon,
		inAppField: "inAppNotifComments" as const,
		emailField: "emailNotifComments" as const,
		emailDefault: true,
	},
	{
		key: "reactions",
		label: "Reactions",
		description: "Someone reacts to your post.",
		icon: HeartIcon,
		inAppField: "inAppNotifReactions" as const,
		emailField: "emailNotifReactions" as const,
		emailDefault: false,
	},
	{
		key: "jobMatches",
		label: "Job matches",
		description: "A newly-posted job matches your profile.",
		icon: BriefcaseIcon,
		inAppField: "inAppNotifJobMatches" as const,
		emailField: "emailNotifJobMatches" as const,
		emailDefault: true,
	},
	{
		key: "messages",
		label: "Messages",
		description: "Someone sends you a direct message.",
		icon: EnvelopeSimpleIcon,
		inAppField: "inAppNotifMessages" as const,
		emailField: "emailNotifMessages" as const,
		emailDefault: true,
	},
	{
		key: "disputes",
		label: "Experience disputes",
		description: "Someone disputes your listed experience.",
		icon: WarningIcon,
		inAppField: "inAppNotifExperienceDisputed" as const,
		emailField: "emailNotifExperienceDisputed" as const,
		emailDefault: true,
	},
] as const;

function NotificationSettingsPage() {
	const { data: prefs } = useSuspenseQuery(preferencesQueryOptions());
	const [openKey, setOpenKey] = useState<string | null>(null);

	const p = prefs as Record<string, unknown> | null;

	return (
		<div className="max-w-xl space-y-6">
			<div className="space-y-1">
				<h2 className="text-lg font-semibold tracking-tight">Notifications</h2>
				<p className="text-sm text-muted-foreground">
					Choose where you get notified for each type.
				</p>
			</div>

			<div className="rounded-xl border border-border bg-card divide-y divide-border">
				{NOTIFICATION_TYPES.map((type) => {
					const inAppValue = p?.[type.inAppField] !== false;
					const emailValue = type.emailDefault
						? p?.[type.emailField] !== false
						: p?.[type.emailField] === true;

					return (
						<NotificationTypeRow
							key={type.key}
							label={type.label}
							description={type.description}
							icon={type.icon}
							inAppField={type.inAppField}
							inAppValue={inAppValue}
							onInAppToggle={(value) =>
								updateInAppNotifFn({
									data: { field: type.inAppField, value },
								})
							}
							emailField={type.emailField}
							emailValue={emailValue}
							onEmailToggle={(value) =>
								updateEmailNotifFn({
									data: { field: type.emailField, value },
								})
							}
							open={openKey === type.key}
							onOpenChange={(isOpen) => setOpenKey(isOpen ? type.key : null)}
						/>
					);
				})}
			</div>
		</div>
	);
}
