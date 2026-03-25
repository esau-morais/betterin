export type Region = "BR" | "EU" | "GB" | "US" | "OTHER";

export type AgeGroup = "child" | "adolescent" | "adult";

export type UserRestrictions = {
	isMinor: boolean;
	ageGroup: AgeGroup;
	region: Region | null;
	feedMode: "chronological" | "user-choice";
	autoplayAllowed: boolean;
	pushNotificationsAllowed: boolean;
	profilingAllowed: boolean;
	locationSharingDefault: boolean;
	aiConsentLocked: boolean;
	requiresParentalLink: boolean;
	parentalConsentVerified: boolean;
	trackingLevel: "full" | "minimal";
};

const UNRESTRICTED: UserRestrictions = {
	isMinor: false,
	ageGroup: "adult",
	region: null,
	feedMode: "user-choice",
	autoplayAllowed: true,
	pushNotificationsAllowed: true,
	profilingAllowed: true,
	locationSharingDefault: true,
	aiConsentLocked: false,
	requiresParentalLink: false,
	parentalConsentVerified: false,
	trackingLevel: "full",
};

function computeAge(dateOfBirth: Date): number {
	const today = new Date();
	let age = today.getFullYear() - dateOfBirth.getFullYear();
	const monthDiff = today.getMonth() - dateOfBirth.getMonth();
	if (
		monthDiff < 0 ||
		(monthDiff === 0 && today.getDate() < dateOfBirth.getDate())
	) {
		age--;
	}
	return age;
}

function getAgeGroup(age: number): AgeGroup {
	if (age < 12) return "child";
	if (age < 18) return "adolescent";
	return "adult";
}

export function computeRestrictions(user: {
	dateOfBirth: Date | null;
	detectedRegion: string | null;
	parentalConsentStatus: string | null;
}): UserRestrictions {
	if (!user.dateOfBirth) return { ...UNRESTRICTED };

	const age = computeAge(user.dateOfBirth);
	const ageGroup = getAgeGroup(age);
	const region = (user.detectedRegion as Region) ?? "OTHER";
	const consentVerified = user.parentalConsentStatus === "verified";

	if (ageGroup === "adult") {
		return { ...UNRESTRICTED, region };
	}

	const base: UserRestrictions = {
		isMinor: true,
		ageGroup,
		region,
		feedMode: "user-choice",
		autoplayAllowed: true,
		pushNotificationsAllowed: true,
		profilingAllowed: false,
		locationSharingDefault: false,
		aiConsentLocked: true,
		requiresParentalLink: false,
		parentalConsentVerified: consentVerified,
		trackingLevel: "minimal",
	};

	// Stage 0 (rule_v1) uses recency + connection graph + quality — no behavioral
	// profiling, so feedMode is always user-choice. ML stages (ml_v1+) are blocked
	// via aiConsentLocked for minors in regulated regions.
	switch (region) {
		case "BR":
			// ECA Digital (Lei 15.211/2025)
			return {
				...base,
				autoplayAllowed: false, // Art. 17 § 4 II
				pushNotificationsAllowed: false, // Art. 17 § 4 II
				requiresParentalLink: age < 16, // Art. 24
			};

		case "GB":
			// UK AADC — high privacy defaults, no profiling
			return { ...base };

		case "EU":
			// GDPR Art. 8 — parental consent for under-16
			return {
				...base,
				requiresParentalLink: age < 16,
			};

		case "US":
			// COPPA covers under-13 (blocked at registration)
			// 13-17: minimal restrictions (no federal blanket law)
			return {
				...base,
				profilingAllowed: true,
				aiConsentLocked: false,
				locationSharingDefault: true,
				trackingLevel: "full",
			};

		default:
			// Unknown region: apply most restrictive (Brazil-level)
			return {
				...base,
				autoplayAllowed: false,
				pushNotificationsAllowed: false,
				requiresParentalLink: age < 16,
			};
	}
}
