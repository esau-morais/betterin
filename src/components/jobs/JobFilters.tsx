import { useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import type { LocationValue } from "#/components/shared/LocationAutocomplete";
import { LocationAutocomplete } from "#/components/shared/LocationAutocomplete";
import { Checkbox } from "#/components/ui/checkbox";
import { Label } from "#/components/ui/label";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import { Slider } from "#/components/ui/slider";
import type {
	JobExperienceLevel,
	JobFilters as JobFiltersType,
	JobType,
} from "#/lib/validation";

const EXPERIENCE_LEVELS: { value: JobExperienceLevel; label: string }[] = [
	{ value: "internship", label: "Internship" },
	{ value: "entry", label: "Entry Level" },
	{ value: "mid", label: "Mid Level" },
	{ value: "senior", label: "Senior" },
	{ value: "lead", label: "Lead" },
	{ value: "executive", label: "Executive" },
];

const JOB_TYPES: { value: JobType; label: string }[] = [
	{ value: "full_time", label: "Full-Time" },
	{ value: "part_time", label: "Part-Time" },
	{ value: "contract", label: "Contract" },
	{ value: "freelance", label: "Freelance" },
	{ value: "internship", label: "Internship" },
];

const REMOTE_OPTIONS: { value: string; label: string }[] = [
	{ value: "any", label: "Any" },
	{ value: "remote", label: "Remote" },
	{ value: "hybrid", label: "Hybrid" },
	{ value: "onsite", label: "On-site" },
];

const DATE_OPTIONS: { value: string; label: string }[] = [
	{ value: "any", label: "Any time" },
	{ value: "24h", label: "Past 24 hours" },
	{ value: "3d", label: "Past 3 days" },
	{ value: "week", label: "Past week" },
	{ value: "month", label: "Past month" },
];

const SALARY_MAX = 300000;
const SALARY_STEP = 10000;

function formatSalary(value: number) {
	if (value === 0) return "$0";
	if (value >= SALARY_MAX) return "$300k+";
	return `$${Math.round(value / 1000)}k`;
}

function FilterSection({
	title,
	onClear,
	children,
}: {
	title: string;
	onClear?: () => void;
	children: React.ReactNode;
}) {
	return (
		<fieldset className="space-y-2.5">
			<div className="flex items-center justify-between">
				<legend className="text-sm font-medium text-foreground">{title}</legend>
				{onClear && (
					<button
						type="button"
						onClick={onClear}
						className="text-xs text-muted-foreground hover:text-foreground transition-colors"
					>
						Clear
					</button>
				)}
			</div>
			{children}
		</fieldset>
	);
}

function SalarySlider({
	min,
	max,
	onCommit,
}: {
	min: number;
	max: number;
	onCommit: (values: number[]) => void;
}) {
	const [display, setDisplay] = useState<[number, number]>([min, max]);

	return (
		<>
			<div className="px-2">
				<Slider
					defaultValue={[min, max]}
					onValueChange={(v) => setDisplay(v as [number, number])}
					onValueCommit={onCommit}
					min={0}
					max={SALARY_MAX}
					step={SALARY_STEP}
				/>
			</div>
			<div className="flex justify-between mt-1">
				<span className="text-xs text-muted-foreground font-mono">
					{formatSalary(display[0])}
				</span>
				<span className="text-xs text-muted-foreground font-mono">
					{formatSalary(display[1])}
				</span>
			</div>
		</>
	);
}

export function JobFilters() {
	const search = useSearch({ from: "/_authed/jobs" });
	const navigate = useNavigate({ from: "/jobs" });

	const remote = search.remote ?? "any";
	const salaryMin = search.salaryMin ?? 0;
	const salaryMax = search.salaryMax ?? SALARY_MAX;
	const datePosted = search.datePosted ?? "any";
	const location = search.location ?? "";
	const experienceLevels = search.experienceLevel ?? [];
	const jobTypes = search.jobType ?? [];

	const hasAnyFilter =
		search.remote !== undefined ||
		search.salaryMin !== undefined ||
		search.salaryMax !== undefined ||
		search.datePosted !== undefined ||
		search.location !== undefined ||
		(search.experienceLevel?.length ?? 0) > 0 ||
		(search.jobType?.length ?? 0) > 0;

	function nav(updates: Record<string, unknown>) {
		navigate({
			search: (prev) => ({ ...prev, ...updates }),
		});
	}

	function handleSalaryCommit(values: number[]) {
		nav({
			salaryMin: values[0] === 0 ? undefined : values[0],
			salaryMax: values[1] === SALARY_MAX ? undefined : values[1],
		});
	}

	function handleLocationChange(loc: LocationValue) {
		nav({ location: loc.display || undefined });
	}

	function handleClearAll() {
		navigate({
			search: (prev) => ({
				job: prev.job,
				tab: prev.tab,
				sort: prev.sort,
			}),
		});
	}

	return (
		<div className="min-w-0 space-y-5">
			<div className="flex items-center justify-between">
				<h2 className="text-base font-semibold text-foreground">Filters</h2>
				{hasAnyFilter && (
					<button
						type="button"
						onClick={handleClearAll}
						className="text-xs text-muted-foreground hover:text-foreground transition-colors"
					>
						Clear all
					</button>
				)}
			</div>

			<FilterSection
				title="Location"
				onClear={
					search.location !== undefined
						? () => nav({ location: undefined })
						: undefined
				}
			>
				<LocationAutocomplete
					key={location}
					value={location}
					onChange={handleLocationChange}
				/>
			</FilterSection>

			<FilterSection
				title="Work Style"
				onClear={
					search.remote !== undefined
						? () => nav({ remote: undefined })
						: undefined
				}
			>
				<RadioGroup
					value={remote}
					onValueChange={(v) =>
						nav({
							remote: v === "any" ? undefined : (v as JobFiltersType["remote"]),
						})
					}
				>
					{REMOTE_OPTIONS.map(({ value, label }) => (
						<div key={value} className="flex items-center gap-2">
							<RadioGroupItem value={value} id={`jf-remote-${value}`} />
							<Label htmlFor={`jf-remote-${value}`}>{label}</Label>
						</div>
					))}
				</RadioGroup>
			</FilterSection>

			<FilterSection
				title="Date Posted"
				onClear={
					search.datePosted !== undefined
						? () => nav({ datePosted: undefined })
						: undefined
				}
			>
				<RadioGroup
					value={datePosted}
					onValueChange={(v) =>
						nav({
							datePosted:
								v === "any" ? undefined : (v as JobFiltersType["datePosted"]),
						})
					}
				>
					{DATE_OPTIONS.map(({ value, label }) => (
						<div key={value} className="flex items-center gap-2">
							<RadioGroupItem value={value} id={`jf-date-${value}`} />
							<Label htmlFor={`jf-date-${value}`}>{label}</Label>
						</div>
					))}
				</RadioGroup>
			</FilterSection>

			<FilterSection
				title="Salary Range"
				onClear={
					search.salaryMin !== undefined || search.salaryMax !== undefined
						? () => nav({ salaryMin: undefined, salaryMax: undefined })
						: undefined
				}
			>
				<SalarySlider
					key={`${salaryMin}-${salaryMax}`}
					min={salaryMin}
					max={salaryMax}
					onCommit={handleSalaryCommit}
				/>
			</FilterSection>

			<FilterSection
				title="Job Type"
				onClear={
					jobTypes.length > 0 ? () => nav({ jobType: undefined }) : undefined
				}
			>
				{JOB_TYPES.map(({ value, label }) => (
					<div key={value} className="flex items-center gap-2">
						<Checkbox
							id={`jf-type-${value}`}
							checked={jobTypes.includes(value)}
							onCheckedChange={(checked) => {
								const next = checked
									? [...jobTypes, value]
									: jobTypes.filter((v) => v !== value);
								nav({ jobType: next.length > 0 ? next : undefined });
							}}
						/>
						<Label htmlFor={`jf-type-${value}`}>{label}</Label>
					</div>
				))}
			</FilterSection>

			<FilterSection
				title="Experience Level"
				onClear={
					experienceLevels.length > 0
						? () => nav({ experienceLevel: undefined })
						: undefined
				}
			>
				{EXPERIENCE_LEVELS.map(({ value, label }) => (
					<div key={value} className="flex items-center gap-2">
						<Checkbox
							id={`jf-exp-${value}`}
							checked={experienceLevels.includes(value)}
							onCheckedChange={(checked) => {
								const next = checked
									? [...experienceLevels, value]
									: experienceLevels.filter((v) => v !== value);
								nav({ experienceLevel: next.length > 0 ? next : undefined });
							}}
						/>
						<Label htmlFor={`jf-exp-${value}`}>{label}</Label>
					</div>
				))}
			</FilterSection>
		</div>
	);
}
