import { CameraIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { uploadCompanyCoverFn } from "#/lib/server/companies";

const MAX_SIZE = 10 * 1024 * 1024;

export function CompanyCoverDialog({
	open,
	onOpenChange,
	companyId,
	currentCover,
	onSaved,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	companyId: string;
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
			await uploadCompanyCoverFn({
				data: { companyId, base64, contentType: file.type },
			});
		},
		onSuccess: () => {
			onSaved();
			onOpenChange(false);
		},
	});

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
			uploadMutation.reset();
			setPendingFile(file);
			setPreviewUrl(URL.createObjectURL(file));
		},
		[uploadMutation],
	);

	const displayCover = previewUrl ?? currentCover;
	const errorMessage = validationError ?? uploadMutation.error?.message;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg" showCloseButton>
				<DialogHeader>
					<DialogTitle>Company cover photo</DialogTitle>
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

				{errorMessage && (
					<p className="text-sm text-destructive text-center" role="alert">
						{errorMessage}
					</p>
				)}

				<div className="flex items-center justify-between border-t border-border pt-4">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => fileInputRef.current?.click()}
					>
						<CameraIcon className="size-4" />
						{currentCover ? "Change photo" : "Upload photo"}
					</Button>
					{pendingFile && (
						<Button
							variant="default"
							size="sm"
							onClick={() => pendingFile && uploadMutation.mutate(pendingFile)}
							disabled={uploadMutation.isPending}
						>
							{uploadMutation.isPending ? "Uploading..." : "Save"}
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
