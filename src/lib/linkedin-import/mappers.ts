import type {
	LICertification,
	LIEducation,
	LIHonor,
	LILanguage,
	LIPosition,
	LIProject,
	LIVolunteering,
} from "./types";

// LinkedIn date format: "Mon YYYY" (e.g. "Jan 2022") or "YYYY-MM-DD"
function parseLinkedInDate(raw: string): Date | null {
	if (!raw || raw.trim() === "") return null;
	const trimmed = raw.trim();

	// ISO format
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		const d = new Date(trimmed);
		return Number.isNaN(d.getTime()) ? null : d;
	}

	// "Mon YYYY" format
	const monthYear = trimmed.match(/^([A-Za-z]+)\s+(\d{4})$/);
	if (monthYear) {
		const d = new Date(`${monthYear[1]} 1, ${monthYear[2]}`);
		return Number.isNaN(d.getTime()) ? null : d;
	}

	// "YYYY" only
	if (/^\d{4}$/.test(trimmed)) {
		return new Date(`${trimmed}-01-01`);
	}

	return null;
}

export interface MappedPosition {
	company: string;
	title: string;
	description: string | null;
	location: string | null;
	startDate: Date;
	endDate: Date | null;
	current: boolean;
}

export function mapPositions(positions: LIPosition[]): MappedPosition[] {
	return positions
		.map((p) => {
			const startDate = parseLinkedInDate(p.startedOn);
			if (!startDate || !p.companyName || !p.title) return null;

			const endDate = parseLinkedInDate(p.finishedOn);
			return {
				company: p.companyName.trim(),
				title: p.title.trim(),
				description: p.description.trim() || null,
				location: p.location.trim() || null,
				startDate,
				endDate,
				current: !endDate,
			};
		})
		.filter((p): p is MappedPosition => p !== null);
}

export interface MappedEducation {
	school: string;
	degree: string | null;
	field: string | null;
	startDate: Date | null;
	endDate: Date | null;
	description: string | null;
}

export function mapEducations(educations: LIEducation[]): MappedEducation[] {
	return educations
		.map((e) => {
			if (!e.schoolName) return null;
			return {
				school: e.schoolName.trim(),
				degree: e.degreeName.trim() || null,
				field: e.fieldOfStudy.trim() || null,
				startDate: parseLinkedInDate(e.startDate),
				endDate: parseLinkedInDate(e.endDate),
				description:
					[e.activities, e.notes].filter(Boolean).join("\n\n").trim() || null,
			};
		})
		.filter((e): e is MappedEducation => e !== null);
}

export interface MappedSkill {
	name: string;
	ordering: number;
}

export function mapSkills(skills: { name: string }[]): MappedSkill[] {
	return skills
		.filter((s) => s.name.trim())
		.map((s, i) => ({ name: s.name.trim(), ordering: i }));
}

export interface MappedCertification {
	name: string;
	organization: string;
	issueDate: Date | null;
	expirationDate: Date | null;
	credentialId: string | null;
	credentialUrl: string | null;
	ordering: number;
}

export function mapCertifications(
	certs: LICertification[],
): MappedCertification[] {
	return certs
		.map((c, i) => {
			if (!c.name || !c.authority) return null;

			// timePeriod is usually "Mon YYYY to Mon YYYY" or just start date
			let issueDate: Date | null = null;
			let expirationDate: Date | null = null;
			if (c.timePeriod) {
				const parts = c.timePeriod.split(/\s+to\s+/i);
				issueDate = parseLinkedInDate(parts[0] ?? "");
				expirationDate = parts[1] ? parseLinkedInDate(parts[1]) : null;
			}

			return {
				name: c.name.trim(),
				organization: c.authority.trim(),
				issueDate,
				expirationDate,
				credentialId: c.licenseNumber.trim() || null,
				credentialUrl: c.url.trim() || null,
				ordering: i,
			};
		})
		.filter((c): c is MappedCertification => c !== null);
}

export interface MappedProject {
	name: string;
	description: string | null;
	url: string | null;
	startDate: Date | null;
	endDate: Date | null;
	ordering: number;
}

export function mapProjects(projects: LIProject[]): MappedProject[] {
	return projects
		.map((p, i) => {
			if (!p.title) return null;
			return {
				name: p.title.trim(),
				description: p.description.trim() || null,
				url: p.url.trim() || null,
				startDate: parseLinkedInDate(p.startedOn),
				endDate: parseLinkedInDate(p.finishedOn),
				ordering: i,
			};
		})
		.filter((p): p is MappedProject => p !== null);
}

export interface MappedVolunteering {
	organization: string;
	role: string;
	cause: string | null;
	description: string | null;
	startDate: Date | null;
	endDate: Date | null;
	ordering: number;
}

export function mapVolunteering(
	entries: LIVolunteering[],
): MappedVolunteering[] {
	return entries
		.map((v, i) => {
			if (!v.organization || !v.role) return null;
			return {
				organization: v.organization.trim(),
				role: v.role.trim(),
				cause: v.cause.trim() || null,
				description: v.description.trim() || null,
				startDate: parseLinkedInDate(v.startedOn),
				endDate: parseLinkedInDate(v.finishedOn),
				ordering: i,
			};
		})
		.filter((v): v is MappedVolunteering => v !== null);
}

export interface MappedHonor {
	title: string;
	issuer: string | null;
	issueDate: Date | null;
	description: string | null;
	ordering: number;
}

export function mapHonors(honors: LIHonor[]): MappedHonor[] {
	return honors
		.map((h, i) => {
			if (!h.title) return null;
			return {
				title: h.title.trim(),
				issuer: h.issuer.trim() || null,
				issueDate: parseLinkedInDate(h.issuedOn),
				description: h.description.trim() || null,
				ordering: i,
			};
		})
		.filter((h): h is MappedHonor => h !== null);
}

// LinkedIn proficiency labels → our enum values
const PROFICIENCY_MAP: Record<string, string> = {
	"native or bilingual proficiency": "native",
	"full professional proficiency": "full_professional",
	"professional working proficiency": "professional",
	"limited working proficiency": "limited",
	"elementary proficiency": "elementary",
};

export interface MappedLanguage {
	name: string;
	proficiency: string | null;
	ordering: number;
}

export function mapLanguages(languages: LILanguage[]): MappedLanguage[] {
	return languages
		.map((l, i): MappedLanguage | null => {
			if (!l.name) return null;
			const profKey = l.proficiency.toLowerCase().trim();
			const proficiency = PROFICIENCY_MAP[profKey] ?? null;
			return {
				name: l.name.trim(),
				proficiency,
				ordering: i,
			};
		})
		.filter((l): l is MappedLanguage => l !== null);
}
