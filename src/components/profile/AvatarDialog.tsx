import { CameraIcon, TrashIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { AvatarFrameOverlay } from "#/components/shared/AvatarFrameOverlay";
import { UserAvatar } from "#/components/shared/UserAvatar";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	deleteAvatarFn,
	updateProfileFieldsFn,
	uploadAvatarFn,
} from "#/lib/server/profile";
import { cn } from "#/lib/utils";

const FRAMES = [
	{ value: null, label: "Original" },
	{ value: "open_to_work", label: "#OpenToWork" },
	{ value: "hiring", label: "#Hiring" },
] as const;

const MAX_SIZE = 5 * 1024 * 1024;

export function AvatarDialog({
	open,
	onOpenChange,
	currentImage,
	currentFrame,
	userName,
	onSaved,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentImage: string | null;
	currentFrame: string | null;
	userName: string;
	onSaved: () => void;
}) {
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [pendingFile, setPendingFile] = useState<File | null>(null);
	const [selectedFrame, setSelectedFrame] = useState<string | null>(
		currentFrame,
	);
	const [fileError, setFileError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const deleteMutation = useMutation({
		mutationFn: () => deleteAvatarFn(),
		onSuccess: () => {
			onSaved();
			onOpenChange(false);
		},
	});

	const applyMutation = useMutation({
		mutationFn: async ({
			pendingFile,
			selectedFrame,
			currentFrame,
		}: {
			pendingFile: File | null;
			selectedFrame: string | null;
			currentFrame: string | null;
		}) => {
			if (pendingFile) {
				const buffer = await pendingFile.arrayBuffer();
				const base64 = btoa(
					new Uint8Array(buffer).reduce(
						(s, b) => s + String.fromCharCode(b),
						"",
					),
				);
				await uploadAvatarFn({
					data: { base64, contentType: pendingFile.type, frame: selectedFrame },
				});
			} else if (selectedFrame !== currentFrame) {
				await updateProfileFieldsFn({
					data: { avatarFrame: selectedFrame },
				});
			}
		},
		onSuccess: () => {
			onSaved();
			onOpenChange(false);
		},
	});

	const saving = deleteMutation.isPending || applyMutation.isPending;
	const error =
		deleteMutation.error?.message ?? applyMutation.error?.message ?? fileError;

	const handleFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;
			if (file.size > MAX_SIZE) {
				setFileError("Image must be under 5MB");
				return;
			}
			if (!file.type.startsWith("image/")) {
				setFileError("File must be an image");
				return;
			}
			setFileError(null);
			setPendingFile(file);
			setPreviewUrl(URL.createObjectURL(file));
		},
		[],
	);

	const displayImage = previewUrl ?? currentImage;
	const hasChanges = pendingFile !== null || selectedFrame !== currentFrame;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md" showCloseButton>
				<DialogHeader>
					<DialogTitle>Profile photo</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col items-center gap-4 py-4">
					<div className="relative size-40">
						<UserAvatar
							name={userName}
							image={displayImage}
							size="xl"
							className="!size-40 !text-4xl"
						/>
						{selectedFrame && (
							<AvatarFrameOverlay frame={selectedFrame} sizePx={160} />
						)}
					</div>

					<div className="flex items-center gap-4">
						{FRAMES.map(({ value, label }) => (
							<button
								key={label}
								type="button"
								onClick={() => setSelectedFrame(value)}
								className={cn(
									"flex flex-col items-center gap-1.5 rounded-lg px-3 py-2 transition-colors focus-ring",
									selectedFrame === value
										? "bg-accent text-accent-foreground"
										: "text-muted-foreground hover:bg-muted",
								)}
							>
								<div className="relative size-10">
									<UserAvatar name={userName} image={displayImage} size="lg" />
									{value && <AvatarFrameOverlay frame={value} sizePx={40} />}
								</div>
								<span className="text-xs font-medium">{label}</span>
							</button>
						))}
					</div>
				</div>

				{error && (
					<p className="text-sm text-destructive text-center" role="alert">
						{error}
					</p>
				)}

				<div className="flex items-center justify-between border-t border-border pt-4">
					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => fileInputRef.current?.click()}
						>
							<CameraIcon className="size-4" />
							Update photo
						</Button>
						{currentImage && (
							<Button
								variant="ghost"
								size="sm"
								className="text-destructive hover:text-destructive"
								onClick={() => deleteMutation.mutate()}
								disabled={saving}
							>
								<TrashIcon className="size-4" />
								Delete
							</Button>
						)}
					</div>
					<Button
						variant="default"
						size="sm"
						onClick={() =>
							applyMutation.mutate({ pendingFile, selectedFrame, currentFrame })
						}
						disabled={saving || !hasChanges}
					>
						{saving ? "Saving..." : "Apply"}
					</Button>
				</div>

				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					className="hidden"
					onChange={handleFileChange}
				/>
			</DialogContent>
		</Dialog>
	);
}
