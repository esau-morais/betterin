export interface LIProfile {
	firstName: string;
	lastName: string;
	headline: string;
	summary: string;
	address: string;
	geoLocation: string;
	websites: string;
	twitterHandles: string;
}

export interface LIPosition {
	companyName: string;
	title: string;
	description: string;
	location: string;
	startedOn: string;
	finishedOn: string;
}

export interface LIEducation {
	schoolName: string;
	degreeName: string;
	fieldOfStudy: string;
	startDate: string;
	endDate: string;
	notes: string;
	activities: string;
}

export interface LISkill {
	name: string;
}

export interface LICertification {
	name: string;
	authority: string;
	licenseNumber: string;
	timePeriod: string;
	url: string;
}

export interface LIProject {
	title: string;
	description: string;
	url: string;
	startedOn: string;
	finishedOn: string;
}

export interface LIVolunteering {
	organization: string;
	role: string;
	cause: string;
	description: string;
	startedOn: string;
	finishedOn: string;
}

export interface LIHonor {
	title: string;
	issuer: string;
	issuedOn: string;
	description: string;
}

export interface LILanguage {
	name: string;
	proficiency: string;
}

export interface LinkedInImportPayload {
	profile: LIProfile | null;
	positions: LIPosition[];
	educations: LIEducation[];
	skills: LISkill[];
	certifications: LICertification[];
	projects: LIProject[];
	volunteering: LIVolunteering[];
	honors: LIHonor[];
	languages: LILanguage[];
}

export interface ImportCounts {
	profile: boolean;
	positions: number;
	educations: number;
	skills: number;
	certifications: number;
	projects: number;
	volunteering: number;
	honors: number;
	languages: number;
}
