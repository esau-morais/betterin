import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { auth } from "#/lib/auth";
import { redis } from "#/lib/redis";

const OTP_COOLDOWN_SECONDS = 60;

function cooldownKey(email: string) {
	return `otp-cooldown:${email.toLowerCase().trim()}`;
}

export const sendOtpFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ email: z.email(), type: z.enum(["sign-in"]) }))
	.handler(async ({ data }) => {
		const key = cooldownKey(data.email);
		const ttl = await redis.ttl(key);

		if (ttl > 0) {
			return { cooldownUntil: Date.now() + ttl * 1000 };
		}

		await auth.api.sendVerificationOTP({
			body: { email: data.email.trim(), type: data.type },
		});

		await redis.set(key, "1", { ex: OTP_COOLDOWN_SECONDS });

		return { cooldownUntil: Date.now() + OTP_COOLDOWN_SECONDS * 1000 };
	});

export const getOtpCooldownFn = createServerFn({ method: "GET" })
	.inputValidator(z.object({ email: z.email() }))
	.handler(async ({ data }) => {
		const ttl = await redis.ttl(cooldownKey(data.email));
		if (ttl > 0) {
			return { cooldownUntil: Date.now() + ttl * 1000 };
		}
		return { cooldownUntil: 0 };
	});
