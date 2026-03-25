import { Heading, Section, Text } from "@react-email/components";
import { EmailLayout } from "./_components/email-layout.tsx";

type OtpType =
	| "sign-in"
	| "email-verification"
	| "forget-password"
	| "change-email"
	| "work-email-verification";

const HEADING_MAP: Record<OtpType, string> = {
	"sign-in": "Your sign-in code",
	"email-verification": "Verify your email",
	"forget-password": "Reset your password",
	"change-email": "Confirm your new email",
	"work-email-verification": "Verify your employment at Better In",
};

const BODY_MAP: Record<OtpType, string> = {
	"sign-in": "Enter this code to sign in to your account:",
	"email-verification": "Enter this code to verify your email address:",
	"forget-password": "Enter this code to reset your password:",
	"change-email": "Enter this code to confirm your new email address:",
	"work-email-verification": "Enter this code to verify your employment email:",
};

interface OtpEmailProps {
	otp: string;
	type?: OtpType;
}

export default function OtpEmail({
	otp = "123456",
	type = "sign-in",
}: OtpEmailProps) {
	const digits = otp.split("").join("\u2003");
	const heading = HEADING_MAP[type];
	const body = BODY_MAP[type];

	return (
		<EmailLayout
			preview={`Your code is ${otp.split("").join(" ")}`}
			footer={
				<Text className="body-text m-0 text-[13px] leading-normal text-text-secondary">
					If you didn&apos;t request this code, you can safely ignore this
					email.
				</Text>
			}
		>
			<Heading
				as="h1"
				className="heading m-0 mb-2 text-[22px] font-semibold leading-tight text-text-primary"
			>
				{heading}
			</Heading>

			<Text className="body-text m-0 mb-6 text-[15px] leading-relaxed text-text-secondary">
				{body}
			</Text>

			<Section className="code-box mb-4 rounded-card border border-solid border-border-light bg-bg-outer py-5 text-center">
				<Text className="code-text m-0 font-[Geist_Mono,Courier_New,monospace] text-[32px] font-medium tracking-widest text-text-primary">
					{digits}
				</Text>
			</Section>

			<Text className="body-text m-0 mb-6 text-[13px] leading-normal text-text-secondary">
				This code expires in 5 minutes.
			</Text>
		</EmailLayout>
	);
}
