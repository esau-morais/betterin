import {
	ArrowRightIcon,
	BriefcaseIcon,
	CheckIcon,
	CopyIcon,
	PencilSimpleIcon,
} from "@phosphor-icons/react";
import { Link, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "#/components/ui/input-group";
import {
	checkCompanySlugFn,
	updateCompanySlugFn,
} from "#/lib/server/companies";
import { cn } from "#/lib/utils";
import type { CompanyData } from "./types";

export function CompanyRightPanel({
	company,
	jobCount,
}: {
	company: CompanyData;
	jobCount: number;
}) {
	const router = useRouter();
	const [copied, setCopied] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [editingSlug, setEditingSlug] = useState(false);
	const [newSlug, setNewSlug] = useState(company.slug);
	const [slugStatus, setSlugStatus] = useState<
		"idle" | "checking" | "available" | "taken" | "invalid"
	>("idle");
	const [saving, setSaving] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const isAdmin = company.memberRole === "admin";

	useEffect(() => {
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, []);

	const companyUrl =
		typeof window !== "undefined"
			? `${window.location.origin}/company/${company.slug}`
			: `/company/${company.slug}`;

	const copyUrl = useCallback(() => {
		navigator.clipboard.writeText(companyUrl);
		setCopied(true);
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => setCopied(false), 2000);
	}, [companyUrl]);

	const handleCheckSlug = useCallback(
		(value: string) => {
			setNewSlug(value);
			if (value === company.slug) {
				setSlugStatus("idle");
				return;
			}
			if (value.length < 3) {
				setSlugStatus("invalid");
				return;
			}
			setSlugStatus("checking");
			if (debounceRef.current) clearTimeout(debounceRef.current);
			debounceRef.current = setTimeout(async () => {
				try {
					const result = await checkCompanySlugFn({
						data: { slug: value },
					});
					setSlugStatus(result.available ? "available" : "taken");
				} catch {
					setSlugStatus("invalid");
				}
			}, 400);
		},
		[company.slug],
	);

	const handleSaveSlug = useCallback(async () => {
		setSaving(true);
		try {
			const result = await updateCompanySlugFn({
				data: { companyId: company.id, slug: newSlug },
			});
			setEditingSlug(false);
			setSlugStatus("idle");
			router.navigate({
				to: "/company/$slug",
				params: { slug: result.slug },
				replace: true,
			});
		} catch {
			setSlugStatus("invalid");
		} finally {
			setSaving(false);
		}
	}, [company.id, newSlug, router]);

	return (
		<div className="space-y-4">
			<div className="bi-card flex flex-col items-center text-center py-6">
				<div className="size-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
					{company.logoUrl ? (
						<img
							src={company.logoUrl}
							alt={company.name}
							className="size-full object-cover"
						/>
					) : (
						<span className="text-lg font-bold text-muted-foreground">
							{company.name[0]?.toUpperCase()}
						</span>
					)}
				</div>
				<p className="mt-3 text-sm font-medium">{company.name}</p>
				{company.tagline && (
					<p className="text-xs text-muted-foreground mt-0.5">
						{company.tagline}
					</p>
				)}

				{isAdmin && editingSlug ? (
					<div className="mt-2 w-full space-y-2 text-left">
						<InputGroup>
							<InputGroupAddon align="inline-start" className="text-xs">
								/company/
							</InputGroupAddon>
							<InputGroupInput
								value={newSlug}
								onChange={(e) =>
									handleCheckSlug(
										e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
									)
								}
								maxLength={64}
								className="text-sm font-mono"
							/>
						</InputGroup>
						{slugStatus === "available" && (
							<p className="text-xs text-salary">Available</p>
						)}
						{slugStatus === "taken" && (
							<p className="text-xs text-destructive">Already taken</p>
						)}
						{slugStatus === "invalid" && newSlug.length > 0 && (
							<p className="text-xs text-destructive">
								Use lowercase letters, numbers, or hyphens
							</p>
						)}
						<div className="flex items-center gap-2">
							<Button
								variant="default"
								size="sm"
								onClick={handleSaveSlug}
								disabled={
									saving ||
									slugStatus !== "available" ||
									newSlug === company.slug
								}
							>
								{saving ? "Saving…" : "Save"}
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									setEditingSlug(false);
									setNewSlug(company.slug);
									setSlugStatus("idle");
								}}
							>
								Cancel
							</Button>
						</div>
					</div>
				) : (
					<div className="flex items-center gap-1 mt-1">
						<p className="bi-mono text-text-tertiary">@{company.slug}</p>
						{isAdmin && (
							<button
								type="button"
								onClick={() => setEditingSlug(true)}
								className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors focus-ring"
								aria-label="Edit company URL"
							>
								<PencilSimpleIcon className="size-3" />
							</button>
						)}
					</div>
				)}

				<button
					type="button"
					onClick={copyUrl}
					className={cn(
						"mt-2 flex items-center gap-1.5 rounded text-xs hit-area-y-2 active:scale-[0.97] motion-safe:transition-transform duration-150 focus-ring",
						copied
							? "text-salary"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					<span className="relative size-3.5 shrink-0">
						<CopyIcon
							className={cn(
								"absolute inset-0 size-3.5 motion-safe:transition-all motion-safe:duration-150",
								copied
									? "opacity-0 blur-[2px] scale-75"
									: "opacity-100 blur-0 scale-100",
							)}
						/>
						<CheckIcon
							className={cn(
								"absolute inset-0 size-3.5 motion-safe:transition-all motion-safe:duration-150",
								copied
									? "opacity-100 blur-0 scale-100"
									: "opacity-0 blur-[2px] scale-75",
							)}
						/>
					</span>
					<span>{copied ? "Copied!" : "Copy URL"}</span>
				</button>
			</div>

			{jobCount > 0 && (
				<div className="bi-card">
					<div className="flex items-center gap-2 text-sm font-medium text-foreground">
						<BriefcaseIcon className="size-4" />
						{jobCount} open role{jobCount !== 1 ? "s" : ""} at {company.name}
					</div>
					<Link
						to="/jobs"
						search={{ tab: "browse", sort: "newest" }}
						className="mt-2 block text-sm text-brand hover:underline focus-ring rounded"
					>
						See jobs <ArrowRightIcon className="inline size-3" />
					</Link>
				</div>
			)}
		</div>
	);
}
