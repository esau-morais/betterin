import { render } from "@react-email/components";
import { Resend } from "resend";
import NotificationEmail from "#emails/notification.tsx";
import OtpEmail from "#emails/otp.tsx";

type OtpType =
	| "sign-in"
	| "email-verification"
	| "forget-password"
	| "change-email"
	| "work-email-verification";

const SUBJECT_MAP: Record<OtpType, string> = {
	"sign-in": "Your sign-in code",
	"email-verification": "Verify your email",
	"forget-password": "Reset your password",
	"change-email": "Confirm your new email",
	"work-email-verification": "Verify your employment at Better In",
};

let resend: Resend | null = null;

function getResend(): Resend {
	if (!resend) {
		resend = new Resend(process.env.RESEND_API_KEY);
	}
	return resend;
}

type NotificationType =
	| "connection_request"
	| "connection_accepted"
	| "post_reaction"
	| "post_comment"
	| "job_match"
	| "message"
	| "experience_disputed";

const NOTIF_CONTENT: Record<
	NotificationType,
	{ subject: string; verb: string }
> = {
	connection_request: {
		subject: "New connection request",
		verb: "wants to connect with you",
	},
	connection_accepted: {
		subject: "Connection accepted",
		verb: "accepted your connection request",
	},
	post_comment: {
		subject: "New comment on your post",
		verb: "commented on your post",
	},
	post_reaction: {
		subject: "New reaction on your post",
		verb: "reacted to your post",
	},
	job_match: {
		subject: "New job match",
		verb: "A new job matches your profile",
	},
	message: {
		subject: "New message",
		verb: "sent you a message",
	},
	experience_disputed: {
		subject: "Experience dispute",
		verb: "disputed your listed experience",
	},
};

export async function sendNotificationEmail(params: {
	to: string;
	recipientName: string;
	actorName: string;
	type: NotificationType;
}): Promise<void> {
	const content = NOTIF_CONTENT[params.type];

	if (!process.env.RESEND_API_KEY) {
		console.log(
			`[Notification] ${params.type} → ${params.to}: ${params.actorName} ${content.verb}`,
		);
		return;
	}

	const html = await render(
		NotificationEmail({
			recipientName: params.recipientName,
			actorName: params.actorName,
			verb: content.verb,
		}),
	);
	const from = process.env.EMAIL_FROM ?? "Better In <onboarding@resend.dev>";

	const { error } = await getResend().emails.send({
		from,
		to: [params.to],
		subject: content.subject,
		html,
	});

	if (error) {
		console.error("[Email] Failed to send notification:", error.message);
	}
}

export async function sendOtpEmail(params: {
	to: string;
	otp: string;
	type: OtpType;
}): Promise<void> {
	const { to, otp, type } = params;

	if (!process.env.RESEND_API_KEY) {
		console.log(`[OTP] ${type} → ${to}: ${otp}`);
		return;
	}

	const html = await render(OtpEmail({ otp, type }));
	const from = process.env.EMAIL_FROM ?? "Better In <onboarding@resend.dev>";
	const subject = SUBJECT_MAP[type] ?? "Your verification code";

	const { error } = await getResend().emails.send({
		from,
		to: [to],
		subject,
		html,
	});

	if (error) {
		console.error("[Email] Failed to send OTP:", error.message);
		throw new Error("Failed to send verification email");
	}
}
