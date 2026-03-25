export const SEARCH_TABS = ["all", "people", "companies", "posts"] as const;
export type SearchTab = (typeof SEARCH_TABS)[number];

export const TIME_FILTERS = ["24h", "3d", "week", "month"] as const;
export type TimeFilter = (typeof TIME_FILTERS)[number];

export const DEGREE_FILTERS = ["connections", "everyone"] as const;
export type DegreeFilter = (typeof DEGREE_FILTERS)[number];

export const COMPANY_SIZES = [
	"1_10",
	"11_50",
	"51_200",
	"201_500",
	"501_1000",
	"1000_plus",
] as const;
export type CompanySize = (typeof COMPANY_SIZES)[number];

export type SearchParams = {
	q?: string;
	tab?: SearchTab;
	degree?: DegreeFilter;
	location?: string;
	openToWork?: boolean;
	time?: TimeFilter;
	fromNetwork?: boolean;
	sort?: string;
	industry?: string;
	size?: CompanySize;
};
