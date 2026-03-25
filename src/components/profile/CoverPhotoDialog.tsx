import { CameraIcon, TrashIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { deleteCoverFn, uploadCoverFn } from "#/lib/server/profile";

const MAX_SIZE = 10 * 1024 * 1024;

export function CoverPhotoDialog({
	open,
	onOpenChange,
	currentCover,
	onSaved,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentCover: string | null;
	onSaved: () => void;
}) {
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [pendingFile, setPendingFile] = useState<File | null>(null);
	const [validationError, setValidationError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const uploadMutation = useMutation({
		mutationFn: async (file: File) => {
			const buffer = await file.arrayBuffer();
			const base64 = btoa(
				new Uint8Array(buffer).reduce((s, b) => s + String.fromCharCode(b), ""),
			);
			await uploadCoverFn({
				data: { base64, contentType: file.type },
			});
		},
		onSuccess: () => {
			onSaved();
			onOpenChange(false);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async () => {
			await deleteCoverFn();
		},
		onSuccess: () => {
			onSaved();
			onOpenChange(false);
		},
	});

	const saving = uploadMutation.isPending || deleteMutation.isPending;
	const error =
		validationError ??
		uploadMutation.error?.message ??
		deleteMutation.error?.message ??
		null;

	const handleFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;
			if (file.size > MAX_SIZE) {
				setValidationError("Cover photo must be under 10MB");
				return;
			}
			if (!file.type.startsWith("image/")) {
				setValidationError("File must be an image");
				return;
			}
			setValidationError(null);
			setPendingFile(file);
			setPreviewUrl(URL.createObjectURL(file));
		},
		[],
	);

	const displayCover = previewUrl ?? currentCover;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg" showCloseButton>
				<DialogHeader>
					<DialogTitle>Cover photo</DialogTitle>
				</DialogHeader>

				<div className="py-4">
					<div className="aspect-[4/1] w-full overflow-hidden rounded-xl bg-muted">
						{displayCover ? (
							<img
								src={displayCover}
								alt="Cover preview"
								className="size-full object-cover object-center"
							/>
						) : (
							<div className="size-full bg-gradient-to-br from-primary/20 to-accent" />
						)}
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
							{currentCover ? "Change photo" : "Upload photo"}
						</Button>
						{currentCover && (
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
					{pendingFile && (
						<Button
							variant="default"
							size="sm"
							onClick={() => pendingFile && uploadMutation.mutate(pendingFile)}
							disabled={saving}
						>
							{saving ? "Uploading..." : "Save"}
						</Button>
					)}
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
