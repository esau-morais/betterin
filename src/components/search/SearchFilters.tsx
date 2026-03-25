import { useNavigate, useSearch } from "@tanstack/react-router";
import type {
	CompanySize,
	SearchParams,
	SearchTab,
	TimeFilter,
} from "#/components/search/types";
import { Label } from "#/components/ui/label";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";

function useFilterNav() {
	const search = useSearch({ from: "/_authed/search" }) as SearchParams;
	const navigate = useNavigate();
	const update = (patch: Partial<SearchParams>) =>
		navigate({ to: "/search", search: { ...search, ...patch } });
	return { search, update };
}

function FilterSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<fieldset className="space-y-2.5">
			<legend className="text-sm font-medium text-foreground">{title}</legend>
			{children}
		</fieldset>
	);
}

function PeopleFilterGroup() {
	const { search, update } = useFilterNav();
	const degree = search.degree ?? "everyone";

	return (
		<FilterSection title="Connection">
			<RadioGroup
				value={degree}
				onValueChange={(val) =>
					update({ degree: val === "connections" ? "connections" : undefined })
				}
			>
				<div className="flex items-center gap-2">
					<RadioGroupItem value="everyone" id="degree-everyone" />
					<Label htmlFor="degree-everyone">Anyone</Label>
				</div>
				<div className="flex items-center gap-2">
					<RadioGroupItem value="connections" id="degree-connections" />
					<Label htmlFor="degree-connections">1st degree</Label>
				</div>
			</RadioGroup>
		</FilterSection>
	);
}

function TimeFilterGroup({ idPrefix }: { idPrefix: string }) {
	const { search, update } = useFilterNav();
	const time = search.time ?? "any";

	return (
		<FilterSection title="Posted">
			<RadioGroup
				value={time}
				onValueChange={(val) =>
					update({ time: val === "any" ? undefined : (val as TimeFilter) })
				}
			>
				<div className="flex items-center gap-2">
					<RadioGroupItem value="any" id={`${idPrefix}-time-any`} />
					<Label htmlFor={`${idPrefix}-time-any`}>Any time</Label>
				</div>
				<div className="flex items-center gap-2">
					<RadioGroupItem value="24h" id={`${idPrefix}-time-24h`} />
					<Label htmlFor={`${idPrefix}-time-24h`}>Past 24 hours</Label>
				</div>
				<div className="flex items-center gap-2">
					<RadioGroupItem value="3d" id={`${idPrefix}-time-3d`} />
					<Label htmlFor={`${idPrefix}-time-3d`}>Past 3 days</Label>
				</div>
				<div className="flex items-center gap-2">
					<RadioGroupItem value="week" id={`${idPrefix}-time-week`} />
					<Label htmlFor={`${idPrefix}-time-week`}>Past week</Label>
				</div>
				<div className="flex items-center gap-2">
					<RadioGroupItem value="month" id={`${idPrefix}-time-month`} />
					<Label htmlFor={`${idPrefix}-time-month`}>Past month</Label>
				</div>
			</RadioGroup>
		</FilterSection>
	);
}

const INDUSTRY_OPTIONS = [
	{ value: "any", label: "Any" },
	{ value: "Developer Tools", label: "Developer Tools" },
	{ value: "Financial Technology", label: "Financial Technology" },
	{ value: "E-commerce", label: "E-commerce" },
	{ value: "SaaS", label: "SaaS" },
	{ value: "Entertainment", label: "Entertainment" },
] as const;

const SIZE_OPTIONS: { value: string; label: string }[] = [
	{ value: "any", label: "Any" },
	{ value: "1_10", label: "1\u201310" },
	{ value: "11_50", label: "11\u201350" },
	{ value: "51_200", label: "51\u2013200" },
	{ value: "201_500", label: "201\u2013500" },
	{ value: "501_1000", label: "501\u20131,000" },
	{ value: "1000_plus", label: "1,000+" },
];

function IndustryFilterGroup() {
	const { search, update } = useFilterNav();
	const industry = search.industry ?? "any";

	return (
		<FilterSection title="Industry">
			<RadioGroup
				value={industry}
				onValueChange={(val) =>
					update({ industry: val === "any" ? undefined : val })
				}
			>
				{INDUSTRY_OPTIONS.map((opt) => (
					<div key={opt.value} className="flex items-center gap-2">
						<RadioGroupItem value={opt.value} id={`industry-${opt.value}`} />
						<Label htmlFor={`industry-${opt.value}`}>{opt.label}</Label>
					</div>
				))}
			</RadioGroup>
		</FilterSection>
	);
}

function SizeFilterGroup() {
	const { search, update } = useFilterNav();
	const size = search.size ?? "any";

	return (
		<FilterSection title="Company size">
			<RadioGroup
				value={size}
				onValueChange={(val) =>
					update({
						size: val === "any" ? undefined : (val as CompanySize),
					})
				}
			>
				{SIZE_OPTIONS.map((opt) => (
					<div key={opt.value} className="flex items-center gap-2">
						<RadioGroupItem value={opt.value} id={`size-${opt.value}`} />
						<Label htmlFor={`size-${opt.value}`}>{opt.label}</Label>
					</div>
				))}
			</RadioGroup>
		</FilterSection>
	);
}

function FromFilterGroup() {
	const { search, update } = useFilterNav();
	const fromNetwork = search.fromNetwork === true ? "network" : "anyone";

	return (
		<FilterSection title="From">
			<RadioGroup
				value={fromNetwork}
				onValueChange={(val) =>
					update({ fromNetwork: val === "network" ? true : undefined })
				}
			>
				<div className="flex items-center gap-2">
					<RadioGroupItem value="anyone" id="from-anyone" />
					<Label htmlFor="from-anyone">Anyone</Label>
				</div>
				<div className="flex items-center gap-2">
					<RadioGroupItem value="network" id="from-network" />
					<Label htmlFor="from-network">My network</Label>
				</div>
			</RadioGroup>
		</FilterSection>
	);
}

export function SearchFilters() {
	const search = useSearch({ from: "/_authed/search" }) as SearchParams;
	const tab = (search.tab ?? "all") as SearchTab;
	const hasQuery = (search.q ?? "").trim().length > 0;

	if (!hasQuery || tab === "all") return null;

	const showPeople = tab === "people";
	const showPosts = tab === "posts";
	const showCompanies = tab === "companies";

	return (
		<div className="space-y-5">
			<h2 className="text-base font-semibold text-foreground">Filters</h2>

			{showPeople && <PeopleFilterGroup />}
			{showCompanies && <IndustryFilterGroup />}
			{showCompanies && <SizeFilterGroup />}
			{showPosts && <TimeFilterGroup idPrefix={tab} />}
			{showPosts && <FromFilterGroup />}
		</div>
	);
}
