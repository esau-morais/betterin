import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, emailOTP } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "./db/index.server";
import * as schema from "./db/schema";
import { sendOtpEmail } from "./email";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			user: schema.users,
			session: schema.sessions,
			account: schema.accounts,
			verification: schema.verifications,
		},
	}),
	user: {
		additionalFields: {
			dateOfBirth: {
				type: "string",
				required: false,
				input: false,
			},
			detectedRegion: {
				type: "string",
				required: false,
				input: false,
			},
			parentUserId: {
				type: "string",
				required: false,
				input: false,
			},
			parentalConsentStatus: {
				type: "string",
				required: false,
				defaultValue: "not_required",
				input: false,
			},
			identityVerifiedAt: {
				type: "date",
				required: false,
				input: false,
			},
		},
	},
	emailAndPassword: { enabled: true },
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // refresh expiry every 24h of activity
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60, // 5 min signed cookie avoids DB on every request
		},
	},
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID ?? "",
			clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
		},
		github: {
			clientId: process.env.GITHUB_CLIENT_ID ?? "",
			clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
		},
		linkedin: {
			clientId: process.env.LINKEDIN_CLIENT_ID ?? "",
			clientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
		},
	},
	plugins: [
		bearer(),
		emailOTP({
			otpLength: 6,
			expiresIn: 300,
			async sendVerificationOTP({ email, otp, type }) {
				await sendOtpEmail({ to: email, otp, type });
			},
		}),
		tanstackStartCookies(),
	],
});

export type Session = typeof auth.$Infer.Session;
