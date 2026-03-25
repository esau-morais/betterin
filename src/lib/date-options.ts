export const MONTHS = [
	{ value: "1", label: "January" },
	{ value: "2", label: "February" },
	{ value: "3", label: "March" },
	{ value: "4", label: "April" },
	{ value: "5", label: "May" },
	{ value: "6", label: "June" },
	{ value: "7", label: "July" },
	{ value: "8", label: "August" },
	{ value: "9", label: "September" },
	{ value: "10", label: "October" },
	{ value: "11", label: "November" },
	{ value: "12", label: "December" },
];

const currentYear = new Date().getFullYear();

export const YEARS = Array.from({ length: 52 }, (_, i) =>
	String(currentYear + 2 - i),
);

export const PAST_YEARS = Array.from({ length: 50 }, (_, i) =>
	String(currentYear - i),
);

export const END_YEARS = Array.from({ length: 60 }, (_, i) =>
	String(currentYear + 10 - i),
);
