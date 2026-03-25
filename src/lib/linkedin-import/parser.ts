import JSZip from "jszip";
import Papa from "papaparse";
import type {
	LICertification,
	LIEducation,
	LIHonor,
	LILanguage,
	LIPosition,
	LIProfile,
	LIProject,
	LISkill,
	LIVolunteering,
	LinkedInImportPayload,
} from "./types";

function findFile(zip: JSZip, name: string): JSZip.JSZipObject | null {
	// Case-insensitive search across all files in the zip
	const lower = name.toLowerCase();
	let found: JSZip.JSZipObject | null = null;
	zip.forEach((relativePath, file) => {
		if (relativePath.toLowerCase().endsWith(lower)) {
			found = file;
		}
	});
	return found;
}

async function readCsvByName<T>(zip: JSZip, filename: string): Promise<T[]> {
	const file = findFile(zip, filename);
	if (!file) return [];

	const text = await file.async("string");
	const result = Papa.parse<T>(text, {
		header: true,
		skipEmptyLines: true,
		transformHeader: (h) => h.trim(),
	});
	return result.data;
}

// Raw CSV row shapes LinkedIn actually exports (header names vary slightly by locale)
type RawProfile = Record<string, string>;
type RawPosition = Record<string, string>;
type RawEducation = Record<string, string>;
type RawSkill = Record<string, string>;
type RawCert = Record<string, string>;
type RawProject = Record<string, string>;
type RawVolunteering = Record<string, string>;
type RawHonor = Record<string, string>;
type RawLanguage = Record<string, string>;

function pick(row: Record<string, string>, ...keys: string[]): string {
	for (const key of keys) {
		const val = row[key] ?? row[key.toLowerCase()] ?? "";
		if (val.trim()) return val.trim();
	}
	return "";
}

function parseProfile(rows: RawProfile[]): LIProfile | null {
	const row = rows[0];
	if (!row) return null;
	return {
		firstName: pick(row, "First Name", "firstName"),
		lastName: pick(row, "Last Name", "lastName"),
		headline: pick(row, "Headline", "headline"),
		summary: pick(row, "Summary", "summary"),
		address: pick(row, "Address", "address"),
		geoLocation: pick(row, "Geo Location", "geoLocation"),
		websites: pick(row, "Websites", "websites"),
		twitterHandles: pick(row, "Twitter Handles", "twitterHandles"),
	};
}

function parsePositions(rows: RawPosition[]): LIPosition[] {
	return rows.map((row) => ({
		companyName: pick(row, "Company Name", "companyName"),
		title: pick(row, "Title", "title"),
		description: pick(row, "Description", "description"),
		location: pick(row, "Location", "location"),
		startedOn: pick(row, "Started On", "startedOn"),
		finishedOn: pick(row, "Finished On", "finishedOn"),
	}));
}

function parseEducations(rows: RawEducation[]): LIEducation[] {
	return rows.map((row) => ({
		schoolName: pick(row, "School Name", "schoolName"),
		degreeName: pick(row, "Degree Name", "degreeName"),
		fieldOfStudy: pick(row, "Field Of Study", "fieldOfStudy"),
		startDate: pick(row, "Start Date", "startDate"),
		endDate: pick(row, "End Date", "endDate"),
		notes: pick(row, "Notes", "notes"),
		activities: pick(row, "Activities", "activities"),
	}));
}

function parseSkills(rows: RawSkill[]): LISkill[] {
	return rows
		.map((row) => ({ name: pick(row, "Name", "name") }))
		.filter((s) => s.name.length > 0);
}

function parseCertifications(rows: RawCert[]): LICertification[] {
	return rows.map((row) => ({
		name: pick(row, "Name", "name"),
		authority: pick(row, "Authority", "authority"),
		licenseNumber: pick(row, "License Number", "licenseNumber"),
		timePeriod: pick(row, "Time Period", "timePeriod", "Started On"),
		url: pick(row, "Url", "url"),
	}));
}

function parseProjects(rows: RawProject[]): LIProject[] {
	return rows.map((row) => ({
		title: pick(row, "Title", "title"),
		description: pick(row, "Description", "description"),
		url: pick(row, "Url", "url"),
		startedOn: pick(row, "Started On", "startedOn"),
		finishedOn: pick(row, "Finished On", "finishedOn"),
	}));
}

function parseVolunteering(rows: RawVolunteering[]): LIVolunteering[] {
	return rows.map((row) => ({
		organization: pick(row, "Organization", "organization"),
		role: pick(row, "Role", "role"),
		cause: pick(row, "Cause", "cause"),
		description: pick(row, "Description", "description"),
		startedOn: pick(row, "Started On", "startedOn"),
		finishedOn: pick(row, "Finished On", "finishedOn"),
	}));
}

function parseHonors(rows: RawHonor[]): LIHonor[] {
	return rows.map((row) => ({
		title: pick(row, "Title", "title"),
		issuer: pick(row, "Issuer", "issuer"),
		issuedOn: pick(row, "Issued On", "issuedOn"),
		description: pick(row, "Description", "description"),
	}));
}

function parseLanguages(rows: RawLanguage[]): LILanguage[] {
	return rows
		.map((row) => ({
			name: pick(row, "Name", "name"),
			proficiency: pick(row, "Proficiency", "proficiency"),
		}))
		.filter((l) => l.name.length > 0);
}

export async function parseLinkedInZip(
	file: File,
): Promise<LinkedInImportPayload> {
	const zip = await JSZip.loadAsync(file);

	const [
		profileRows,
		positionRows,
		educationRows,
		skillRows,
		certRows,
		projectRows,
		volunteeringRows,
		honorRows,
		languageRows,
	] = await Promise.all([
		readCsvByName<RawProfile>(zip, "Profile.csv"),
		readCsvByName<RawPosition>(zip, "Positions.csv"),
		readCsvByName<RawEducation>(zip, "Education.csv"),
		readCsvByName<RawSkill>(zip, "Skills.csv"),
		readCsvByName<RawCert>(zip, "Certifications.csv"),
		readCsvByName<RawProject>(zip, "Projects.csv"),
		readCsvByName<RawVolunteering>(zip, "Volunteering.csv"),
		readCsvByName<RawHonor>(zip, "Honors.csv"),
		readCsvByName<RawLanguage>(zip, "Languages.csv"),
	]);

	return {
		profile: parseProfile(profileRows),
		positions: parsePositions(positionRows),
		educations: parseEducations(educationRows),
		skills: parseSkills(skillRows),
		certifications: parseCertifications(certRows),
		projects: parseProjects(projectRows),
		volunteering: parseVolunteering(volunteeringRows),
		honors: parseHonors(honorRows),
		languages: parseLanguages(languageRows),
	};
}

export function countImports(payload: LinkedInImportPayload): {
	total: number;
	labels: string[];
} {
	const labels: string[] = [];
	if (payload.positions.length)
		labels.push(
			`${payload.positions.length} experience ${payload.positions.length === 1 ? "entry" : "entries"}`,
		);
	if (payload.educations.length)
		labels.push(
			`${payload.educations.length} education ${payload.educations.length === 1 ? "entry" : "entries"}`,
		);
	if (payload.skills.length) labels.push(`${payload.skills.length} skills`);
	if (payload.certifications.length)
		labels.push(`${payload.certifications.length} certifications`);
	if (payload.projects.length)
		labels.push(`${payload.projects.length} projects`);
	if (payload.volunteering.length)
		labels.push(
			`${payload.volunteering.length} volunteering ${payload.volunteering.length === 1 ? "entry" : "entries"}`,
		);
	if (payload.honors.length) labels.push(`${payload.honors.length} honors`);
	if (payload.languages.length)
		labels.push(`${payload.languages.length} languages`);

	const total =
		payload.positions.length +
		payload.educations.length +
		payload.skills.length +
		payload.certifications.length +
		payload.projects.length +
		payload.volunteering.length +
		payload.honors.length +
		payload.languages.length;

	return { total, labels };
}
