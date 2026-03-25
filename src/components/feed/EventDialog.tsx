import { CameraIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useCallback, useRef, useState } from "react";
import { z } from "zod";
import {
	LocationAutocomplete,
	type LocationValue,
} from "#/components/shared/LocationAutocomplete";
import { Button } from "#/components/ui/button";
import { DateTimePicker } from "#/components/ui/datetime-picker";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { FieldLabel, Label } from "#/components/ui/label";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";

export type EventAttachment = {
	name: string;
	description: string | null;
	coverImageUrl: string | null;
	coverPreview: string | null;
	startAt: string;
	endAt: string | null;
	timezone: string;
	eventType: "online" | "in_person";
	location: string | null;
	locationLat: number | null;
	locationLon: number | null;
	externalUrl: string | null;
};

export function EventDialog({
	open,
	onOpenChange,
	initial,
	onSave,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initial: EventAttachment | null;
	onSave: (data: EventAttachment) => void;
}) {
	const coverInputRef = useRef<HTMLInputElement>(null);

	const [error, setError] = useState<string | null>(null);
	const [eventType, setEventType] = useState<"online" | "in_person">(
		initial?.eventType ?? "online",
	);
	const [startAt, setStartAt] = useState<Date | null>(
		initial?.startAt ? new Date(initial.startAt) : null,
	);
	const [endAt, setEndAt] = useState<Date | null>(
		initial?.endAt ? new Date(initial.endAt) : null,
	);
	const [location, setLocation] = useState<LocationValue | null>(
		initial?.location
			? {
					display: initial.location,
					lat: initial.locationLat ?? null,
					lon: initial.locationLon ?? null,
				}
			: null,
	);
	const [coverPreview, setCoverPreview] = useState<string | null>(
		initial?.coverPreview ?? null,
	);
	const [coverUrl, setCoverUrl] = useState<string | null>(
		initial?.coverImageUrl ?? null,
	);
	const [coverUploading, setCoverUploading] = useState(false);

	const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

	const form = useForm({
		defaultValues: {
			name: initial?.name ?? "",
			externalUrl: initial?.externalUrl ?? "",
			description: initial?.description ?? "",
		},
		onSubmit: async ({ value }) => {
			if (!startAt) {
				setError("Start date is required");
				return;
			}
			setError(null);
			onSave({
				name: value.name.trim(),
				description: value.description.trim() || null,
				coverImageUrl: coverUrl,
				coverPreview,
				startAt: startAt.toISOString(),
				endAt: endAt?.toISOString() ?? null,
				timezone: tz,
				eventType,
				location: location?.display ?? null,
				locationLat: location?.lat ?? null,
				locationLon: location?.lon ?? null,
				externalUrl: value.externalUrl.trim() || null,
			});
			onOpenChange(false);
		},
	});

	async function handleCoverSelect(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setCoverPreview(URL.createObjectURL(file));
		setCoverUploading(true);
		try {
			const formData = new FormData();
			formData.append("file", file);
			const res = await fetch("/api/upload", {
				method: "POST",
				body: formData,
			});
			if (!res.ok) throw new Error("Upload failed");
			const data = await res.json();
			setCoverUrl(data.url);
		} catch {
			setCoverPreview(null);
			setCoverUrl(null);
		} finally {
			setCoverUploading(false);
		}
	}

	const handleStartChange = useCallback((d: Date | null) => setStartAt(d), []);
	const handleEndChange = useCallback((d: Date | null) => setEndAt(d), []);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{initial ? "Edit event" : "Add event"}</DialogTitle>
				</DialogHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4 py-2"
					noValidate
				>
					<input
						ref={coverInputRef}
						type="file"
						accept="image/jpeg,image/png,image/webp"
						className="hidden"
						onChange={handleCoverSelect}
					/>
					{coverPreview ? (
						<div className="relative rounded-xl overflow-hidden">
							<img
								src={coverPreview}
								alt=""
								className="w-full h-40 object-cover"
							/>
							{coverUploading && (
								<div className="absolute inset-0 flex items-center justify-center bg-background/60">
									<div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
								</div>
							)}
							<button
								type="button"
								onClick={() => coverInputRef.current?.click()}
								className="absolute bottom-2 right-2 rounded-lg bg-background/80 px-2 py-1 text-xs font-medium hover:bg-background transition-colors"
							>
								Change
							</button>
						</div>
					) : (
						<button
							type="button"
							onClick={() => coverInputRef.current?.click()}
							className="w-full h-40 rounded-xl border-2 border-dashed border-border bg-secondary flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted transition-colors"
						>
							<CameraIcon className="size-8" />
							<span className="text-sm font-medium">Upload cover image</span>
							<span className="text-xs">Min 480px wide, 16:9 recommended</span>
						</button>
					)}

					<form.Field
						name="name"
						validators={{
							onSubmit: z.string().trim().min(1, "Event name is required"),
						}}
					>
						{(field) => (
							<div className="space-y-2">
								<FieldLabel
									htmlFor="event-name"
									error={error ?? field.state.meta.errors[0]}
									errorId="event-error"
								>
									Event name *
								</FieldLabel>
								<div className="relative">
									<Input
										id="event-name"
										size="sm"
										className="rounded-lg pr-14"
										value={field.state.value}
										onChange={(e) => {
											field.handleChange(e.target.value);
											if (error) setError(null);
										}}
										onBlur={field.handleBlur}
										maxLength={256}
										aria-invalid={!!error || field.state.meta.errors.length > 0}
										aria-describedby={
											error || field.state.meta.errors.length > 0
												? "event-error"
												: undefined
										}
									/>
									<span className="absolute right-2 top-1/2 -translate-y-1/2 bi-mono text-text-tertiary text-xs">
										{field.state.value.length}/256
									</span>
								</div>
							</div>
						)}
					</form.Field>

					<div className="space-y-2">
						<FieldLabel>Event type</FieldLabel>
						<RadioGroup
							value={eventType}
							onValueChange={(v) => setEventType(v as "online" | "in_person")}
							className="flex flex-row gap-4"
						>
							<div className="flex items-center gap-2">
								<RadioGroupItem value="online" id="event-online" />
								<Label htmlFor="event-online" className="cursor-pointer">
									Online
								</Label>
							</div>
							<div className="flex items-center gap-2">
								<RadioGroupItem value="in_person" id="event-in-person" />
								<Label htmlFor="event-in-person" className="cursor-pointer">
									In person
								</Label>
							</div>
						</RadioGroup>
					</div>

					<DateTimePicker
						value={startAt}
						onChange={handleStartChange}
						label="Start"
						required
					/>

					<DateTimePicker
						value={endAt}
						onChange={handleEndChange}
						label="End (optional)"
					/>

					<div className={eventType === "in_person" ? "space-y-2" : "hidden"}>
						<FieldLabel>Location *</FieldLabel>
						<LocationAutocomplete
							value={location?.display ?? ""}
							onChange={setLocation}
						/>
					</div>

					<form.Field name="externalUrl">
						{(field) => (
							<div className={eventType === "online" ? "space-y-2" : "hidden"}>
								<FieldLabel htmlFor="event-url">Meeting URL</FieldLabel>
								<Input
									id="event-url"
									size="sm"
									className="rounded-lg"
									type="url"
									autoComplete="url"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="https://"
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="description">
						{(field) => (
							<div className="space-y-2">
								<FieldLabel htmlFor="event-description">
									Description (optional)
								</FieldLabel>
								<textarea
									id="event-description"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors min-h-[80px] resize-y dark:bg-input/30"
									maxLength={2000}
								/>
							</div>
						)}
					</form.Field>

					<form.Subscribe
						selector={(s) => [s.isSubmitting, s.canSubmit] as const}
					>
						{([isSubmitting, canSubmit]) => (
							<div className="flex items-center gap-2 pt-2 justify-end">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => onOpenChange(false)}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									variant="default"
									size="sm"
									disabled={!canSubmit || coverUploading}
								>
									{isSubmitting
										? "Saving…"
										: initial
											? "Update event"
											: "Add event"}
								</Button>
							</div>
						)}
					</form.Subscribe>
				</form>
			</DialogContent>
		</Dialog>
	);
}
