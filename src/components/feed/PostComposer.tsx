import {
	ArticleIcon,
	CalendarBlankIcon,
	ChartBarIcon,
	FeatherIcon,
	GlobeIcon,
	ImageIcon,
	MapPinIcon,
	PencilSimpleIcon,
	UsersThreeIcon,
	VideoCameraIcon,
	XIcon,
} from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import type { JSONContent } from "@tiptap/react";
import { format } from "date-fns";
import { useRef, useState } from "react";
import { UserAvatar } from "#/components/shared/UserAvatar";
import { Button } from "#/components/ui/button";
import { createEventPostFn } from "#/lib/server/events";
import { createPostFn } from "#/lib/server/feed";
import { createPollPostFn } from "#/lib/server/polls";
import { cn } from "#/lib/utils";
import { type EventAttachment, EventDialog } from "./EventDialog";
import { type MediaFile, MediaInputs, MediaPreview } from "./MediaUpload";
import {
	getTotalDurationHours,
	PollBuilder,
	type PollBuilderState,
	pollBuilderDefaults,
} from "./PollBuilder";
import { hasFormattingMarks, PostEditor } from "./PostEditor";

const VISIBILITY_OPTIONS = [
	{ value: "public" as const, icon: GlobeIcon, label: "Anyone" },
	{ value: "connections" as const, icon: UsersThreeIcon, label: "Connections" },
];

type ComposerMode = "post" | "poll";

const authedRoute = getRouteApi("/_authed");

export function PostComposer() {
	const { session } = authedRoute.useRouteContext();
	const user = session.user;
	const queryClient = useQueryClient();
	const articleNavigate = useNavigate();
	const composerRef = useRef<HTMLDivElement>(null);
	const imageInputRef = useRef<HTMLInputElement>(null);
	const videoInputRef = useRef<HTMLInputElement>(null);

	const [open, setOpen] = useState(false);
	const [mode, setMode] = useState<ComposerMode>("post");
	const [plainText, setPlainText] = useState("");
	const [contentJson, setContentJson] = useState<JSONContent | null>(null);
	const [visibility, setVisibility] = useState<
		"public" | "connections" | "private"
	>("public");
	const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
	const [pollState, setPollState] = useState<PollBuilderState>(
		pollBuilderDefaults(),
	);
	const [eventDialogOpen, setEventDialogOpen] = useState(false);
	const [eventAttachment, setEventAttachment] =
		useState<EventAttachment | null>(null);

	const hasContent =
		plainText.trim().length > 0 ||
		mediaFiles.length > 0 ||
		mode === "poll" ||
		eventAttachment !== null;
	const isUploading = mediaFiles.some((f) => f.uploading);

	const createMutation = useMutation({
		mutationFn: (input: {
			content: string;
			visibility: "public" | "connections" | "private";
			contentFormat: "plain" | "tiptap";
			mediaUrls?: string[];
		}) => createPostFn({ data: input }),
		onSuccess: resetAndClose,
	});

	const createPollMutation = useMutation({
		mutationFn: (input: {
			content: string;
			visibility: "public" | "connections" | "private";
			options: string[];
			durationHours: number;
		}) => createPollPostFn({ data: input }),
		onSuccess: resetAndClose,
	});

	const createEventMutation = useMutation({
		mutationFn: (input: {
			content: string;
			contentFormat: "plain" | "tiptap";
			visibility: "public" | "connections" | "private";
			event: {
				name: string;
				eventType: "online" | "in_person";
				startAt: string;
				timezone: string;
				endAt?: string;
				location?: string;
				locationLat?: number;
				locationLon?: number;
				externalUrl?: string;
				description?: string;
				coverImageUrl?: string;
			};
		}) => createEventPostFn({ data: input }),
		onSuccess: resetAndClose,
	});

	const isPending =
		createMutation.isPending ||
		createPollMutation.isPending ||
		createEventMutation.isPending;

	function resetAndClose() {
		for (const mf of mediaFiles) URL.revokeObjectURL(mf.preview);
		if (eventAttachment?.coverPreview)
			URL.revokeObjectURL(eventAttachment.coverPreview);
		setPlainText("");
		setContentJson(null);
		setMediaFiles([]);
		setMode("post");
		setPollState(pollBuilderDefaults());
		setEventAttachment(null);
		setOpen(false);
		queryClient.invalidateQueries({ queryKey: ["feed"] });
	}

	function handleEditorChange(json: JSONContent, text: string) {
		setContentJson(json);
		setPlainText(text);
	}

	function handleOpen() {
		setOpen(true);
	}

	function handleClose() {
		if (hasContent && (plainText.trim() || eventAttachment)) {
			if (!window.confirm("Discard this post?")) return;
		}
		for (const mf of mediaFiles) URL.revokeObjectURL(mf.preview);
		if (eventAttachment?.coverPreview)
			URL.revokeObjectURL(eventAttachment.coverPreview);
		setPlainText("");
		setContentJson(null);
		setMediaFiles([]);
		setMode("post");
		setPollState(pollBuilderDefaults());
		setEventAttachment(null);
		setOpen(false);
	}

	function handleRemoveMedia(id: string) {
		const file = mediaFiles.find((f) => f.id === id);
		if (file) URL.revokeObjectURL(file.preview);
		setMediaFiles((prev) => prev.filter((f) => f.id !== id));
	}

	function handleTogglePoll() {
		if (mode === "poll") {
			setMode("post");
			setPollState(pollBuilderDefaults());
		} else {
			setOpen(true);
			setMode("poll");
			setMediaFiles([]);
			setEventAttachment(null);
		}
	}

	function handleEventSave(data: EventAttachment) {
		setEventAttachment(data);
		setOpen(true);
		setMode("post");
	}

	function handleRemoveEvent() {
		if (eventAttachment?.coverPreview)
			URL.revokeObjectURL(eventAttachment.coverPreview);
		setEventAttachment(null);
	}

	function handleSubmit() {
		if (isPending || isUploading) return;

		if (mode === "poll") {
			const trimmed = plainText.trim();
			if (!trimmed) return;
			const validOptions = pollState.options.filter((o) => o.trim());
			if (validOptions.length < 2) return;
			const hours = Math.ceil(getTotalDurationHours(pollState));
			if (hours < 1) return;

			createPollMutation.mutate({
				content: trimmed,
				visibility,
				options: validOptions,
				durationHours: hours,
			});
			return;
		}

		const usesTiptap = contentJson && hasFormattingMarks(contentJson);
		const contentStr = usesTiptap
			? JSON.stringify(contentJson)
			: plainText.trim() || " ";
		const contentFormat = usesTiptap ? ("tiptap" as const) : ("plain" as const);

		if (eventAttachment) {
			createEventMutation.mutate({
				content: contentStr,
				contentFormat,
				visibility,
				event: {
					name: eventAttachment.name,
					eventType: eventAttachment.eventType,
					startAt: eventAttachment.startAt,
					timezone: eventAttachment.timezone,
					...(eventAttachment.endAt ? { endAt: eventAttachment.endAt } : {}),
					...(eventAttachment.location
						? { location: eventAttachment.location }
						: {}),
					...(eventAttachment.locationLat != null
						? { locationLat: eventAttachment.locationLat }
						: {}),
					...(eventAttachment.locationLon != null
						? { locationLon: eventAttachment.locationLon }
						: {}),
					...(eventAttachment.externalUrl
						? { externalUrl: eventAttachment.externalUrl }
						: {}),
					...(eventAttachment.description
						? { description: eventAttachment.description }
						: {}),
					...(eventAttachment.coverImageUrl
						? { coverImageUrl: eventAttachment.coverImageUrl }
						: {}),
				},
			});
			return;
		}

		const trimmed = plainText.trim();
		if (!trimmed && mediaFiles.length === 0) return;

		const uploadedUrls = mediaFiles
			.filter((f) => f.url)
			.map((f) => f.url as string);

		createMutation.mutate({
			content: contentStr,
			contentFormat,
			visibility,
			...(uploadedUrls.length > 0 ? { mediaUrls: uploadedUrls } : {}),
		});
	}

	function ActionButtonsRow() {
		return (
			<div className="flex items-center justify-between pt-3">
				<button
					type="button"
					onClick={() => {
						if (!open) setOpen(true);
						imageInputRef.current?.click();
					}}
					disabled={mode === "poll" || eventAttachment !== null}
					className="flex items-center gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors focus-ring disabled:opacity-40"
					aria-label="Photo"
				>
					<ImageIcon className="size-5 text-action-photo" weight="fill" />
					<span className="hidden sm:inline">Photo</span>
				</button>
				<button
					type="button"
					onClick={() => {
						if (!open) setOpen(true);
						videoInputRef.current?.click();
					}}
					disabled={mode === "poll" || eventAttachment !== null}
					className="flex items-center gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors focus-ring disabled:opacity-40"
					aria-label="Video"
				>
					<VideoCameraIcon className="size-5 text-destructive" weight="fill" />
					<span className="hidden sm:inline">Video</span>
				</button>
				<button
					type="button"
					onClick={handleTogglePoll}
					disabled={eventAttachment !== null}
					className={cn(
						"flex items-center gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 text-sm transition-colors focus-ring disabled:opacity-40",
						mode === "poll"
							? "bg-accent text-primary"
							: "text-muted-foreground hover:bg-muted",
					)}
					aria-label="Poll"
				>
					<ChartBarIcon className="size-5 text-brand" weight="fill" />
					<span className="hidden sm:inline">Poll</span>
				</button>
				<button
					type="button"
					onClick={() => {
						if (!open) setOpen(true);
						setEventDialogOpen(true);
					}}
					disabled={mode === "poll"}
					className={cn(
						"flex items-center gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 text-sm transition-colors focus-ring disabled:opacity-40",
						eventAttachment
							? "bg-accent text-primary"
							: "text-muted-foreground hover:bg-muted",
					)}
					aria-label="Event"
				>
					<CalendarBlankIcon className="size-5 text-warning" weight="fill" />
					<span className="hidden sm:inline">Event</span>
				</button>
				<button
					type="button"
					onClick={() => articleNavigate({ to: "/write" })}
					className="flex items-center gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors focus-ring"
					aria-label="Article"
				>
					<ArticleIcon className="size-5 text-salary" weight="fill" />
					<span className="hidden sm:inline">Article</span>
				</button>
			</div>
		);
	}

	return (
		<div className="bi-card">
			<MediaInputs
				imageInputRef={imageInputRef}
				videoInputRef={videoInputRef}
				files={mediaFiles}
				onFilesChange={setMediaFiles}
			/>
			{!open ? (
				<div className="space-y-0">
					<button
						type="button"
						onClick={handleOpen}
						className="group flex items-center gap-3 w-full text-left rounded-lg focus-ring"
					>
						<div className="relative">
							<UserAvatar name={user.name} image={user.image} />
							<div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
								<FeatherIcon className="size-4 text-foreground" weight="fill" />
							</div>
						</div>
						<div className="flex-1 rounded-full bg-secondary border border-border px-4 py-2.5 text-sm text-muted-foreground group-hover:bg-muted transition-colors">
							What's on your mind?
						</div>
					</button>
					<ActionButtonsRow />
				</div>
			) : (
				<div className="space-y-3" ref={composerRef}>
					<div className="flex items-center gap-3">
						<UserAvatar name={user.name} image={user.image} />
						<div>
							<p className="text-sm font-medium">{user.name}</p>
							<div className="flex items-center gap-1">
								{VISIBILITY_OPTIONS.map(({ value, icon: Icon, label }) => (
									<button
										key={value}
										type="button"
										onClick={() => setVisibility(value)}
										className={cn(
											"flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors focus-ring",
											visibility === value
												? "bg-accent text-primary"
												: "text-muted-foreground hover:bg-muted",
										)}
										aria-label={label}
										aria-pressed={visibility === value}
									>
										<Icon className="size-3" aria-hidden />
										{label}
									</button>
								))}
							</div>
						</div>
					</div>

					<PostEditor
						onChange={handleEditorChange}
						placeholder={
							mode === "poll" ? "Ask a question" : "Share your thoughts…"
						}
						autoFocus
					/>

					{mode === "poll" && (
						<PollBuilder
							state={pollState}
							onChange={setPollState}
							onRemove={() => {
								setMode("post");
								setPollState(pollBuilderDefaults());
							}}
						/>
					)}

					{mode === "post" && !eventAttachment && (
						<MediaPreview files={mediaFiles} onRemove={handleRemoveMedia} />
					)}

					{eventAttachment && (
						<EventAttachmentPreview
							event={eventAttachment}
							onEdit={() => setEventDialogOpen(true)}
							onRemove={handleRemoveEvent}
						/>
					)}

					<ActionButtonsRow />

					<div className="flex items-center justify-between border-t border-border pt-3">
						<span className="bi-mono text-text-tertiary">
							{plainText.length > 0 && `${plainText.length}/3000`}
						</span>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={handleClose}
							>
								Cancel
							</Button>
							<Button
								type="button"
								variant="default"
								size="sm"
								onClick={handleSubmit}
								disabled={!hasContent || isPending || isUploading}
							>
								{isPending ? "Posting…" : isUploading ? "Uploading…" : "Post"}
							</Button>
						</div>
					</div>
				</div>
			)}

			<EventDialog
				open={eventDialogOpen}
				onOpenChange={setEventDialogOpen}
				initial={eventAttachment}
				onSave={handleEventSave}
			/>
		</div>
	);
}

function EventAttachmentPreview({
	event,
	onEdit,
	onRemove,
}: {
	event: EventAttachment;
	onEdit: () => void;
	onRemove: () => void;
}) {
	const startDate = new Date(event.startAt);
	const formattedDate = format(startDate, "EEE, MMM d · h:mm a");

	return (
		<div className="bg-accent p-3 space-y-1.5 relative group">
			<div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
				<button
					type="button"
					onClick={onEdit}
					className="rounded-md p-1 text-muted-foreground hover:bg-background/80 transition-colors"
					aria-label="Edit event"
				>
					<PencilSimpleIcon className="size-4" />
				</button>
				<button
					type="button"
					onClick={onRemove}
					className="rounded-md p-1 text-muted-foreground hover:bg-background/80 transition-colors"
					aria-label="Remove event"
				>
					<XIcon className="size-4" />
				</button>
			</div>

			{event.coverPreview && (
				<img
					src={event.coverPreview}
					alt=""
					className="w-full object-cover aspect-video mb-1"
				/>
			)}

			<p className="flex items-center gap-1.5 text-xs text-muted-foreground bi-mono">
				<CalendarBlankIcon className="size-3.5 shrink-0" />
				{formattedDate}
			</p>

			<p className="text-sm font-medium">{event.name}</p>

			{event.eventType === "in_person" && event.location && (
				<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<MapPinIcon className="size-3.5 shrink-0" />
					{event.location}
				</p>
			)}

			{event.eventType === "online" && (
				<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<GlobeIcon className="size-3.5 shrink-0" />
					Online event
				</p>
			)}
		</div>
	);
}
