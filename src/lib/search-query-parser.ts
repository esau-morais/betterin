export type ParsedQuery = {
	text: string;
	from?: string;
	mention?: string;
	hasMedia?: boolean;
	since?: string;
	until?: string;
	location?: string;
	company?: string;
	remote?: "remote" | "hybrid" | "onsite";
	scope?: "people" | "jobs" | "posts";
};

const REMOTE_VALUES = new Set(["remote", "hybrid", "onsite"]);
const SCOPE_VALUES = new Set(["people", "jobs", "posts"]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Matches operator:value or operator:"multi word value"
// Skips content inside double-quoted phrases (FTS exact match syntax)
const OPERATOR_PATTERN = /(?<!["])(\w+):(?:"([^"]+)"|(@?[\w][\w.-]*))/g;

export function parseSearchQuery(raw: string): ParsedQuery {
	const result: ParsedQuery = { text: "" };
	const consumed: string[] = [];

	for (const match of raw.matchAll(OPERATOR_PATTERN)) {
		const [full, rawKey, quotedVal, simpleVal] = match;
		const key = rawKey.toLowerCase();
		const value = (quotedVal || simpleVal || "").trim();

		if (!value) continue;

		let matched = true;
		switch (key) {
			case "from":
				result.from = value.replace(/^@/, "");
				break;
			case "mention":
				result.mention = value.replace(/^@/, "");
				break;
			case "has":
				if (value === "media") result.hasMedia = true;
				else matched = false;
				break;
			case "since":
				if (DATE_PATTERN.test(value)) result.since = value;
				else matched = false;
				break;
			case "until":
				if (DATE_PATTERN.test(value)) result.until = value;
				else matched = false;
				break;
			case "location":
				result.location = value;
				break;
			case "company":
				result.company = value;
				break;
			case "is":
				if (REMOTE_VALUES.has(value))
					result.remote = value as "remote" | "hybrid" | "onsite";
				else matched = false;
				break;
			case "in":
				if (SCOPE_VALUES.has(value))
					result.scope = value as "people" | "jobs" | "posts";
				else matched = false;
				break;
			default:
				matched = false;
		}

		if (matched) consumed.push(full);
	}

	let text = raw;
	for (const c of consumed) {
		text = text.replace(c, "");
	}
	result.text = text.replace(/\s+/g, " ").trim();

	return result;
}
