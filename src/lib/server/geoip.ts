import type { Region } from "#/lib/restrictions";

const EU_EEA_COUNTRIES = new Set([
	"AT",
	"BE",
	"BG",
	"HR",
	"CY",
	"CZ",
	"DK",
	"EE",
	"FI",
	"FR",
	"DE",
	"GR",
	"HU",
	"IE",
	"IT",
	"LV",
	"LT",
	"LU",
	"MT",
	"NL",
	"PL",
	"PT",
	"RO",
	"SK",
	"SI",
	"ES",
	"SE",
	// EEA (non-EU)
	"IS",
	"LI",
	"NO",
]);

export function detectRawCountryCode(request: Request): string {
	const code = request.headers.get("CF-IPCountry")?.toUpperCase();
	if (!code || code === "XX" || code === "T1") return "US";
	return code;
}

export function detectRegion(request: Request): Region {
	const countryCode = request.headers.get("CF-IPCountry")?.toUpperCase();

	if (!countryCode || countryCode === "XX") return "OTHER";
	if (countryCode === "BR") return "BR";
	if (countryCode === "GB") return "GB";
	if (countryCode === "US") return "US";
	if (EU_EEA_COUNTRIES.has(countryCode)) return "EU";

	return "OTHER";
}
