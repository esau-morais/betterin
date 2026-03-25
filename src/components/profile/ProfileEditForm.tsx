import { XIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { z } from "zod";
import {
	LocationAutocomplete,
	type LocationValue,
} from "#/components/shared/LocationAutocomplete";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import { Input } from "#/components/ui/input";
import { FieldLabel } from "#/components/ui/label";
import { updateProfileFieldsFn, updateUserNameFn } from "#/lib/server/profile";

interface ProfileEditFormProps {
	initialName: string;
	initialHeadline: string | null;
	initialBio: string | null;
	initialLocation: string | null;
	initialLocationLat: number | null;
	initialLocationLon: number | null;
	initialWebsite: string | null;
	initialOpenToWork: boolean;
	onClose: () => void;
	onSaved: () => void;
}

export function ProfileEditForm({
	initialName,
	initialHeadline,
	initialBio,
	initialLocation,
	initialLocationLat,
	initialLocationLon,
	initialWebsite,
	initialOpenToWork,
	onClose,
	onSaved,
}: ProfileEditFormProps) {
	const [error, setError] = useState<string | null>(null);
	const [location, setLocation] = useState(initialLocation ?? "");
	const [locationLat, setLocationLat] = useState<number | null>(
		initialLocationLat,
	);
	const [locationLon, setLocationLon] = useState<number | null>(
		initialLocationLon,
	);
	const [openToWork, setOpenToWork] = useState(initialOpenToWork);

	const form = useForm({
		defaultValues: {
			name: initialName,
			headline: initialHeadline ?? "",
			bio: initialBio ?? "",
			website: initialWebsite ?? "",
		},
		onSubmit: async ({ value }) => {
			setError(null);
			try {
				await Promise.all([
					updateUserNameFn({ data: { name: value.name.trim() } }),
					updateProfileFieldsFn({
						data: {
							headline: value.headline.trim(),
							bio: value.bio.trim(),
							location: location.trim(),
							locationLat,
							locationLon,
							website: value.website.trim(),
							openToWork,
						},
					}),
				]);
				onSaved();
			} catch (err: unknown) {
				setError(err instanceof Error ? err.message : "Failed to save");
			}
		},
	});

	return (
		<section className="bi-card animate-fade-up" aria-label="Edit profile">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold text-foreground">Edit profile</h2>
				<button
					type="button"
					onClick={onClose}
					className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-ring"
					aria-label="Close editor"
				>
					<XIcon className="size-4" />
				</button>
			</div>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="mt-4 space-y-4"
				noValidate
			>
				<form.Field
					name="name"
					validators={{
						onSubmit: z.string().trim().min(1, "Name is required"),
					}}
				>
					{(field) => (
						<div className="space-y-2">
							<FieldLabel
								htmlFor="edit-name"
								error={error ?? field.state.meta.errors[0]}
								errorId="profile-error"
							>
								Name *
							</FieldLabel>
							<Input
								id="edit-name"
								size="sm"
								className="rounded-lg"
								autoComplete="name"
								value={field.state.value}
								onChange={(e) => {
									field.handleChange(e.target.value);
									if (error) setError(null);
								}}
								onBlur={field.handleBlur}
								maxLength={120}
								aria-invalid={!!error || field.state.meta.errors.length > 0}
								aria-describedby={
									error || field.state.meta.errors.length > 0
										? "profile-error"
										: undefined
								}
							/>
						</div>
					)}
				</form.Field>

				<form.Field name="headline">
					{(field) => (
						<div className="space-y-2">
							<FieldLabel htmlFor="edit-headline">Headline</FieldLabel>
							<Input
								id="edit-headline"
								size="sm"
								className="rounded-lg"
								autoComplete="organization-title"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								maxLength={280}
								placeholder="e.g. Designer & illustrator in Portland"
							/>
						</div>
					)}
				</form.Field>

				<form.Field name="bio">
					{(field) => (
						<div className="space-y-2">
							<FieldLabel htmlFor="edit-bio">About</FieldLabel>
							<textarea
								id="edit-bio"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								rows={4}
								placeholder="Tell people about yourself"
								className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors resize-y dark:bg-input/30"
							/>
						</div>
					)}
				</form.Field>

				<div className="space-y-2">
					<FieldLabel>Location</FieldLabel>
					<LocationAutocomplete
						value={location}
						onChange={(loc: LocationValue) => {
							setLocation(loc.display);
							setLocationLat(loc.lat);
							setLocationLon(loc.lon);
						}}
					/>
				</div>

				<form.Field name="website">
					{(field) => (
						<div className="space-y-2">
							<FieldLabel htmlFor="edit-website">Website</FieldLabel>
							<Input
								id="edit-website"
								type="url"
								size="sm"
								className="rounded-lg"
								autoComplete="url"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								maxLength={512}
								placeholder="https://yoursite.com"
							/>
						</div>
					)}
				</form.Field>

				<div className="flex items-center gap-3">
					<Checkbox
						id="edit-open-to-work"
						checked={openToWork}
						onCheckedChange={(checked) => setOpenToWork(checked === true)}
					/>
					<label
						htmlFor="edit-open-to-work"
						className="text-sm font-medium text-foreground cursor-pointer select-none"
					>
						Open to work
					</label>
				</div>

				<form.Subscribe
					selector={(s) => [s.isSubmitting, s.canSubmit] as const}
				>
					{([isSubmitting, canSubmit]) => (
						<div className="flex items-center gap-2 pt-2">
							<Button
								type="submit"
								variant="default"
								size="sm"
								disabled={!canSubmit}
							>
								{isSubmitting ? "Saving…" : "Save"}
							</Button>
							<Button type="button" variant="ghost" size="sm" onClick={onClose}>
								Cancel
							</Button>
						</div>
					)}
				</form.Subscribe>
			</form>
		</section>
	);
}
