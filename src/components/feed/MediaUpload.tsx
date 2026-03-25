import { XIcon } from "@phosphor-icons/react";
import { type RefObject, useRef } from "react";

export type MediaFile = {
	id: string;
	file: File;
	preview: string;
	url: string | null;
	uploading: boolean;
	error: string | null;
	type: "image" | "video";
};

const MAX_FILES = 10;

export function useMediaUpload() {
	const imageInputRef = useRef<HTMLInputElement>(null);
	const videoInputRef = useRef<HTMLInputElement>(null);

	return { imageInputRef, videoInputRef };
}

export function MediaInputs({
	imageInputRef,
	videoInputRef,
	files,
	onFilesChange,
}: {
	imageInputRef: RefObject<HTMLInputElement | null>;
	videoInputRef: RefObject<HTMLInputElement | null>;
	files: MediaFile[];
	onFilesChange: (files: MediaFile[]) => void;
}) {
	function handleSelect(
		e: React.ChangeEvent<HTMLInputElement>,
		mediaType: "image" | "video",
	) {
		const selected = e.target.files;
		if (!selected) return;

		const remaining = MAX_FILES - files.length;
		const newFiles = Array.from(selected).slice(0, remaining);

		const mediaFiles: MediaFile[] = newFiles.map((file) => ({
			id: crypto.randomUUID(),
			file,
			preview: URL.createObjectURL(file),
			url: null,
			uploading: true,
			error: null,
			type: mediaType,
		}));

		const updated = [...files, ...mediaFiles];
		onFilesChange(updated);

		for (const mf of mediaFiles) {
			upload(mf.id, mf.file, updated, onFilesChange);
		}

		e.target.value = "";
	}

	return (
		<>
			<input
				ref={imageInputRef}
				type="file"
				accept="image/jpeg,image/png,image/gif,image/webp"
				multiple
				className="hidden"
				onChange={(e) => handleSelect(e, "image")}
			/>
			<input
				ref={videoInputRef}
				type="file"
				accept="video/mp4,video/quicktime"
				multiple
				className="hidden"
				onChange={(e) => handleSelect(e, "video")}
			/>
		</>
	);
}

async function upload(
	id: string,
	file: File,
	currentFiles: MediaFile[],
	onFilesChange: (files: MediaFile[]) => void,
) {
	try {
		const formData = new FormData();
		formData.append("file", file);

		const res = await fetch("/api/upload", {
			method: "POST",
			body: formData,
		});

		if (!res.ok) {
			const data = await res.json();
			throw new Error(data.error ?? "Upload failed");
		}

		const data = await res.json();
		onFilesChange(
			currentFiles.map((f) =>
				f.id === id ? { ...f, url: data.url, uploading: false } : f,
			),
		);
	} catch (err: unknown) {
		onFilesChange(
			currentFiles.map((f) =>
				f.id === id
					? {
							...f,
							uploading: false,
							error: err instanceof Error ? err.message : "Upload failed",
						}
					: f,
			),
		);
	}
}

export function MediaPreview({
	files,
	onRemove,
}: {
	files: MediaFile[];
	onRemove: (id: string) => void;
}) {
	if (files.length === 0) return null;

	return (
		<div className="flex flex-wrap gap-2 pt-2">
			{files.map((mf) => (
				<div key={mf.id} className="relative group">
					{mf.type === "image" ? (
						<img
							src={mf.preview}
							alt=""
							className="size-[120px] rounded-lg object-cover"
						/>
					) : (
						// biome-ignore lint/a11y/useMediaCaption: preview thumbnail
						<video
							src={mf.preview}
							className="size-[120px] rounded-lg object-cover"
						/>
					)}

					{mf.uploading && (
						<div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/60">
							<div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
						</div>
					)}

					{mf.error && (
						<div className="absolute inset-0 flex items-center justify-center rounded-lg bg-destructive/20">
							<span className="text-xs text-destructive font-medium px-1 text-center">
								{mf.error}
							</span>
						</div>
					)}

					<button
						type="button"
						onClick={() => onRemove(mf.id)}
						className="absolute top-1 right-1 rounded-full bg-background/80 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity focus-ring"
						aria-label="Remove"
					>
						<XIcon className="size-4" />
					</button>
				</div>
			))}
		</div>
	);
}
