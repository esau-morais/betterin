import { Heading, Text } from "@react-email/components";
import { EmailLayout } from "./_components/email-layout.tsx";

interface NotificationEmailProps {
	recipientName: string;
	actorName: string;
	verb: string;
}

export default function NotificationEmail({
	recipientName = "Alex",
	actorName = "Jordan",
	verb = "wants to connect with you",
}: NotificationEmailProps) {
	return (
		<EmailLayout
			preview={`${actorName} ${verb}`}
			footer={
				<Text className="body-text m-0 text-[13px] leading-normal text-text-secondary">
					You can manage notification preferences in your settings.
				</Text>
			}
		>
			<Text className="body-text m-0 mb-2 text-[15px] leading-relaxed text-text-secondary">
				Hi {recipientName},
			</Text>

			<Heading
				as="h1"
				className="heading m-0 mb-6 text-[20px] font-semibold leading-tight text-text-primary"
			>
				{actorName} {verb}
			</Heading>
		</EmailLayout>
	);
}
