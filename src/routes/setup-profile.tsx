import { maskitoDateOptionsGenerator } from "@maskito/kit";
import { useMaskito } from "@maskito/react";
import {
	ArrowRightIcon,
	CaretRightIcon,
	CheckCircleIcon,
	CloudArrowUpIcon,
	SpinnerGapIcon,
	XCircleIcon,
} from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import {
	createFileRoute,
	isRedirect,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { FieldLabel } from "#/components/ui/label";
import {
	mapCertifications,
	mapEducations,
	mapHonors,
	mapLanguages,
	mapPositions,
	mapProjects,
	mapSkills,
	mapVolunteering,
} from "#/lib/linkedin-import/mappers";
import { countImports, parseLinkedInZip } from "#/lib/linkedin-import/parser";
import type { LinkedInImportPayload } from "#/lib/linkedin-import/types";
import { getSessionFn } from "#/lib/server/auth";
import {
	checkHandleFn,
	createProfileFn,
	getProfileFn,
	importLinkedInProfileFn,
} from "#/lib/server/profile";
import { cn } from "#/lib/utils";
import { handleSchema } from "#/lib/validation";

export const Route = createFileRoute("/setup-profile")({
	beforeLoad: async ({ context, location }) => {
		try {
			const session = context.session ?? (await getSessionFn());
			if (!session) {
				throw redirect({
					to: "/sign-in",
					search: { redirect: location.href, from: location.pathname },
				});
			}
			const profile = context.profile ?? (await getProfileFn());
			if (profile) {
				throw redirect({ to: "/feed" });
			}
			return { session };
		} catch (error) {
			if (isRedirect(error)) throw error;
			throw redirect({
				to: "/sign-in",
				search: { redirect: location.href, from: location.pathname },
			});
		}
	},
	component: SetupProfilePage,
});

const dateOptions = maskitoDateOptionsGenerator({
	mode: "dd/mm/yyyy",
	separator: "/",
	max: new Date(),
	min: new Date(1900, 0, 1),
});

function DateOfBirthInput({
	value,
	onChange,
	onBlur,
	error,
}: {
	value: string;
	onChange: (value: string) => void;
	onBlur: () => void;
	error?: string | { message: string } | null;
}) {
	const maskRef = useMaskito({ options: dateOptions });

	return (
		<div className="space-y-2">
			<FieldLabel htmlFor="dateOfBirth" error={error}>
				Date of birth
			</FieldLabel>
			<Input
				ref={maskRef}
				id="dateOfBirth"
				name="dateOfBirth"
				type="text"
				inputMode="numeric"
				placeholder="dd/mm/yyyy"
				value={value}
				onInput={(e) => onChange((e.target as HTMLInputElement).value)}
				onBlur={onBlur}
				required
				autoComplete="bday"
			/>
		</div>
	);
}

type HandleStatus =
	| { state: "idle" }
	| { state: "checking" }
	| { state: "available" }
	| { state: "taken" }
	| { state: "invalid" };

type ZipState =
	| { state: "idle" }
	| { state: "parsing" }
	| { state: "ready"; payload: LinkedInImportPayload; labels: string[] }
	| { state: "error"; message: string };

function SetupProfilePage() {
	const router = useRouter();

	const [error, setError] = useState<string | null>(null);
	const [handleStatus, setHandleStatus] = useState<HandleStatus>({
		state: "idle",
	});

	const form = useForm({
		defaultValues: {
			displayName: "",
			handle: "",
			headline: "",
			dateOfBirth: "",
		},
		onSubmit: async ({ value }) => {
			if (handleStatus.state !== "available") return;

			setError(null);

			try {
				await createProfileFn({
					data: {
						displayName: value.displayName.trim(),
						handle: value.handle.trim().toLowerCase(),
						headline: value.headline.trim() || undefined,
						dateOfBirth: value.dateOfBirth.replace(
							/^(\d{2})\/(\d{2})\/(\d{4})$/,
							"$3-$2-$1",
						),
					},
				});

				if (zipState.state === "ready") {
					const { payload } = zipState;
					await importLinkedInProfileFn({
						data: {
							profile: payload.profile
								? {
										headline: payload.profile.headline || undefined,
										location: payload.profile.geoLocation || undefined,
										website: payload.profile.websites || undefined,
									}
								: null,
							positions: mapPositions(payload.positions),
							educations: mapEducations(payload.educations),
							skills: mapSkills(payload.skills),
							certifications: mapCertifications(payload.certifications),
							projects: mapProjects(payload.projects),
							volunteering: mapVolunteering(payload.volunteering),
							honors: mapHonors(payload.honors),
							languages: mapLanguages(payload.languages),
						},
					});
				}

				router.navigate({ to: "/feed" });
			} catch (err: unknown) {
				setError(err instanceof Error ? err.message : "Something went wrong.");
			}
		},
	});
	const [zipState, setZipState] = useState<ZipState>({ state: "idle" });
	const [howToOpen, setHowToOpen] = useState(false);

	const nameRef = useRef<HTMLInputElement>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
	const liveRef = useRef<HTMLDivElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const announce = useCallback((msg: string) => {
		if (liveRef.current) liveRef.current.textContent = msg;
	}, []);

	const [handleWatch, setHandleWatch] = useState("");

	useEffect(() => {
		const raw = handleWatch.trim().toLowerCase();

		if (raw.length < 3) {
			setHandleStatus({ state: "idle" });
			return;
		}

		setHandleStatus({ state: "checking" });

		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(async () => {
			try {
				const result = await checkHandleFn({ data: { handle: raw } });
				if (result.available) {
					setHandleStatus({ state: "available" });
					announce(`@${raw} is available`);
				} else if (result.reason === "taken") {
					setHandleStatus({ state: "taken" });
					announce(`@${raw} is already taken`);
				} else {
					setHandleStatus({ state: "invalid" });
					announce(`@${raw} contains invalid characters`);
				}
			} catch {
				setHandleStatus({ state: "invalid" });
			}
		}, 400);

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [handleWatch, announce]);

	async function handleZipFile(file: File) {
		if (!file.name.endsWith(".zip")) {
			setZipState({
				state: "error",
				message: "Please upload a .zip file downloaded from LinkedIn.",
			});
			return;
		}

		setZipState({ state: "parsing" });

		try {
			const payload = await parseLinkedInZip(file);
			const { labels } = countImports(payload);

			if (labels.length === 0) {
				setZipState({
					state: "error",
					message:
						"No profile data found in this ZIP. Make sure you downloaded the correct file from LinkedIn.",
				});
				return;
			}

			setZipState({ state: "ready", payload, labels });
			announce(`LinkedIn data parsed: ${labels.join(", ")}`);
		} catch {
			setZipState({
				state: "error",
				message:
					"Could not read this file. Make sure it's a LinkedIn data export ZIP.",
			});
		}
	}

	function handleDrop(e: React.DragEvent) {
		e.preventDefault();
		const file = e.dataTransfer.files[0];
		if (file) handleZipFile(file);
	}

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (file) handleZipFile(file);
	}

	return (
		<div className="flex min-h-dvh items-center justify-center px-4 py-12">
			<div className="w-full max-w-sm">
				<div
					ref={liveRef}
					aria-live="polite"
					aria-atomic="true"
					className="sr-only"
				/>

				<div className="mb-8 text-center lg:text-left">
					<h1 className="text-xl font-semibold tracking-tight text-foreground lg:text-2xl">
						Set up your profile
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Tell us a bit about yourself to get started.
					</p>
				</div>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-5"
					noValidate
				>
					<form.Field
						name="displayName"
						validators={{
							onSubmit: z.string().trim().min(1, "Enter your name"),
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<FieldLabel
									htmlFor="displayName"
									error={field.state.meta.errors[0]}
								>
									Name
								</FieldLabel>
								<Input
									ref={nameRef}
									id="displayName"
									name="displayName"
									type="text"
									placeholder="Jane Doe"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									required
									autoComplete="name"
									spellCheck={false}
									autoFocus
									maxLength={120}
								/>
							</div>
						)}
					</form.Field>

					<form.Field
						name="handle"
						validators={{
							onSubmit: handleSchema,
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<FieldLabel htmlFor="handle" error={field.state.meta.errors[0]}>
									Handle
								</FieldLabel>
								<div className="relative">
									<span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
										@
									</span>
									<Input
										id="handle"
										name="handle"
										type="text"
										placeholder="janedoe"
										value={field.state.value}
										onChange={(e) => {
											const sanitized = e.target.value
												.toLowerCase()
												.replace(/[^a-z0-9_-]/g, "");
											field.handleChange(sanitized);
											setHandleWatch(sanitized);
										}}
										onBlur={field.handleBlur}
										required
										autoComplete="off"
										spellCheck={false}
										maxLength={64}
										className="pl-9"
										aria-describedby="handle-hint"
									/>
									<span className="absolute right-3 top-1/2 -translate-y-1/2">
										{handleStatus.state === "checking" && (
											<SpinnerGapIcon className="size-4 animate-spin text-muted-foreground" />
										)}
										{handleStatus.state === "available" && (
											<CheckCircleIcon
												weight="fill"
												className="size-4 text-emerald-500"
											/>
										)}
										{(handleStatus.state === "taken" ||
											handleStatus.state === "invalid") && (
											<XCircleIcon
												weight="fill"
												className="size-4 text-destructive"
											/>
										)}
									</span>
								</div>
								<p id="handle-hint" className="text-xs text-muted-foreground">
									{handleStatus.state === "idle" &&
										"Use lowercase letters, numbers, hyphens, or underscores."}
									{handleStatus.state === "checking" && "Checking…"}
									{handleStatus.state === "available" && (
										<span className="text-emerald-600 dark:text-emerald-400">
											@{handleWatch.trim().toLowerCase()} is available
										</span>
									)}
									{handleStatus.state === "taken" && (
										<span className="text-destructive">
											@{handleWatch.trim().toLowerCase()} is already taken
										</span>
									)}
									{handleStatus.state === "invalid" && (
										<span className="text-destructive">
											Use lowercase letters, numbers, hyphens, or underscores.
										</span>
									)}
								</p>
							</div>
						)}
					</form.Field>

					<form.Field
						name="dateOfBirth"
						validators={{
							onSubmit: z
								.string()
								.min(1, "Date of birth is required")
								.regex(/^\d{2}\/\d{2}\/\d{4}$/, "Use dd/mm/yyyy format")
								.refine(
									(val) => {
										const [dd, mm, yyyy] = val.split("/");
										const d = Number(dd);
										const m = Number(mm);
										const y = Number(yyyy);
										if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900)
											return false;
										const date = new Date(y, m - 1, d);
										return (
											date.getFullYear() === y &&
											date.getMonth() === m - 1 &&
											date.getDate() === d
										);
									},
									{ message: "Invalid date" },
								)
								.refine(
									(val) => {
										const [dd, mm, yyyy] = val.split("/");
										const dob = new Date(
											Number(yyyy),
											Number(mm) - 1,
											Number(dd),
										);
										const today = new Date();
										let age = today.getFullYear() - dob.getFullYear();
										const mo = today.getMonth() - dob.getMonth();
										if (mo < 0 || (mo === 0 && today.getDate() < dob.getDate()))
											age--;
										return age >= 13;
									},
									{ message: "You must be at least 13 years old" },
								),
						}}
					>
						{(field) => (
							<DateOfBirthInput
								value={field.state.value}
								onChange={field.handleChange}
								onBlur={field.handleBlur}
								error={field.state.meta.errors[0]}
							/>
						)}
					</form.Field>

					<form.Field name="headline">
						{(field) => (
							<div className="space-y-2">
								<FieldLabel htmlFor="headline" error={error}>
									Headline{" "}
									<span className="text-muted-foreground">(optional)</span>
								</FieldLabel>
								<Input
									id="headline"
									name="headline"
									type="text"
									placeholder="Designer, coffee nerd, building things"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									autoComplete="off"
									spellCheck={false}
									maxLength={280}
								/>
							</div>
						)}
					</form.Field>

					<div className="flex items-center gap-3 py-1">
						<div className="h-px flex-1 bg-border" />
						<span className="text-xs text-muted-foreground">optional</span>
						<div className="h-px flex-1 bg-border" />
					</div>

					<LinkedInImportSection
						zipState={zipState}
						howToOpen={howToOpen}
						onHowToToggle={() => setHowToOpen((o) => !o)}
						onDrop={handleDrop}
						onFileChange={handleFileChange}
						onDiscard={() => {
							setZipState({ state: "idle" });
							if (fileInputRef.current) fileInputRef.current.value = "";
						}}
						fileInputRef={fileInputRef}
					/>

					<form.Subscribe
						selector={(s) => [s.isSubmitting, s.canSubmit] as const}
					>
						{([isSubmitting, canSubmit]) => (
							<Button
								type="submit"
								variant="default"
								size="lg"
								className="w-full"
								disabled={!canSubmit || handleStatus.state !== "available"}
							>
								{isSubmitting ? (
									<>
										<SpinnerGapIcon className="size-4 animate-spin" />
										{zipState.state === "ready"
											? "Importing…"
											: "Creating profile…"}
									</>
								) : (
									<>
										{zipState.state === "ready"
											? "Continue and import"
											: "Continue"}
										<ArrowRightIcon className="size-4" />
									</>
								)}
							</Button>
						)}
					</form.Subscribe>

					{zipState.state === "ready" && (
						<button
							type="button"
							onClick={() => {
								setZipState({ state: "idle" });
								if (fileInputRef.current) fileInputRef.current.value = "";
							}}
							className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline focus-ring rounded"
						>
							Skip LinkedIn import
						</button>
					)}
				</form>
			</div>
		</div>
	);
}

function LinkedInImportSection({
	zipState,
	howToOpen,
	onHowToToggle,
	onDrop,
	onFileChange,
	onDiscard,
	fileInputRef,
}: {
	zipState: ZipState;
	howToOpen: boolean;
	onHowToToggle: () => void;
	onDrop: (e: React.DragEvent) => void;
	onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onDiscard: () => void;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
	const [isDragOver, setIsDragOver] = useState(false);

	return (
		<div className="space-y-3">
			<div>
				<p className="text-sm font-medium text-foreground">
					Import from LinkedIn
				</p>
				<p className="mt-0.5 text-xs text-muted-foreground">
					Already on LinkedIn? Import your career history so you don't have to
					re-enter it.
				</p>
			</div>

			<div>
				<button
					type="button"
					onClick={onHowToToggle}
					aria-expanded={howToOpen}
					className="flex items-center gap-1 text-xs text-brand hover:underline underline-offset-4 focus-ring rounded"
				>
					<CaretRightIcon
						className={cn(
							"size-3 transition-transform duration-150",
							howToOpen && "rotate-90",
						)}
					/>
					How to download your LinkedIn data
				</button>

				{howToOpen && (
					<ol className="mt-2 space-y-1 pl-4 text-xs text-muted-foreground list-decimal">
						<li>
							Go to{" "}
							<a
								href="https://www.linkedin.com/mypreferences/d/download-my-data"
								target="_blank"
								rel="noopener noreferrer"
								className="text-brand underline-offset-4 hover:underline"
							>
								LinkedIn <ArrowRightIcon className="inline size-3" /> Download
								your data
							</a>
						</li>
						<li>
							Select: <strong className="text-foreground">Profile</strong>,{" "}
							Positions, Education, Skills, Certifications, Projects, Honors,
							Languages, Volunteering
						</li>
						<li>Click Request archive — arrives in ~10 minutes</li>
						<li>Download the ZIP and upload it below</li>
					</ol>
				)}
			</div>

			{zipState.state === "ready" ? (
				<ParsedPreview labels={zipState.labels} onDiscard={onDiscard} />
			) : (
				<DropZone
					state={zipState.state}
					isDragOver={isDragOver}
					onDragOver={(e) => {
						e.preventDefault();
						setIsDragOver(true);
					}}
					onDragLeave={() => setIsDragOver(false)}
					onDrop={(e) => {
						setIsDragOver(false);
						onDrop(e);
					}}
					onClick={() => fileInputRef.current?.click()}
					errorMessage={
						zipState.state === "error" ? zipState.message : undefined
					}
				/>
			)}

			<input
				ref={fileInputRef}
				type="file"
				accept=".zip"
				className="sr-only"
				aria-label="Upload LinkedIn data ZIP"
				onChange={onFileChange}
			/>

			<p className="text-xs text-muted-foreground">
				Parsed locally in your browser — your file never leaves your device.
			</p>
		</div>
	);
}

function DropZone({
	state,
	isDragOver,
	onDragOver,
	onDragLeave,
	onDrop,
	onClick,
	errorMessage,
}: {
	state: ZipState["state"];
	isDragOver: boolean;
	onDragOver: (e: React.DragEvent<HTMLButtonElement>) => void;
	onDragLeave: () => void;
	onDrop: (e: React.DragEvent) => void;
	onClick: () => void;
	errorMessage?: string;
}) {
	const isParsing = state === "parsing";

	return (
		<div>
			<button
				type="button"
				aria-label="Upload LinkedIn ZIP file"
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				onDrop={onDrop}
				onClick={onClick}
				disabled={isParsing}
				className={[
					"flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors duration-150 focus-ring disabled:pointer-events-none disabled:opacity-60",
					isDragOver
						? "border-brand bg-brand-subtle"
						: "border-border hover:border-border-strong hover:bg-muted/30",
				]
					.join(" ")
					.trim()}
			>
				{isParsing ? (
					<SpinnerGapIcon className="size-6 animate-spin text-muted-foreground" />
				) : (
					<CloudArrowUpIcon
						className="size-6 text-muted-foreground"
						weight="duotone"
					/>
				)}
				<div>
					<p className="text-sm font-medium text-foreground">
						{isParsing ? "Parsing…" : "Drop LinkedIn ZIP here"}
					</p>
					{!isParsing && (
						<p className="text-xs text-muted-foreground">or click to browse</p>
					)}
				</div>
			</button>

			{errorMessage && (
				<p className="mt-1.5 text-xs text-destructive">{errorMessage}</p>
			)}
		</div>
	);
}

function ParsedPreview({
	labels,
	onDiscard,
}: {
	labels: string[];
	onDiscard: () => void;
}) {
	return (
		<div className="rounded-xl border border-border bg-card p-4 space-y-3">
			<p className="text-sm font-medium text-foreground">Ready to import</p>
			<ul className="space-y-1">
				{labels.map((label) => (
					<li
						key={label}
						className="flex items-center gap-2 text-xs text-muted-foreground"
					>
						<CheckCircleIcon
							weight="fill"
							className="size-3.5 shrink-0 text-emerald-500"
						/>
						{label}
					</li>
				))}
			</ul>
			<button
				type="button"
				onClick={onDiscard}
				className="text-xs text-muted-foreground underline-offset-4 hover:underline focus-ring rounded"
			>
				Discard and choose different file
			</button>
		</div>
	);
}
