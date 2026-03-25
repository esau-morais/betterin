import {
	CheckIcon,
	CopyIcon,
	EyeIcon,
	PencilSimpleIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { UserAvatar } from "#/components/shared/UserAvatar";
import { Button } from "#/components/ui/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "#/components/ui/input-group";
import { checkHandleFn } from "#/lib/server/profile";
import { cn } from "#/lib/utils";

export function ProfileRightPanel({
	name,
	headline,
	handle,
	image,
	isOwner,
	onHandleChanged,
}: {
	name: string;
	headline: string | null;
	handle: string;
	image: string | null;
	isOwner: boolean;
	onHandleChanged?: () => void;
}) {
	const [copied, setCopied] = useState(false);
	const [editingHandle, setEditingHandle] = useState(false);
	const [newHandle, setNewHandle] = useState(handle);
	const [handleStatus, setHandleStatus] = useState<
		"idle" | "checking" | "available" | "taken" | "invalid"
	>("idle");
	const [saving, setSaving] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, []);

	const profileUrl =
		typeof window !== "undefined"
			? `${window.location.origin}/profile/${handle}`
			: `/profile/${handle}`;

	const copyUrl = useCallback(() => {
		navigator.clipboard.writeText(profileUrl);
		setCopied(true);
		if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
		copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
	}, [profileUrl]);

	const handleCheckHandle = useCallback(
		(value: string) => {
			setNewHandle(value);
			if (value === handle) {
				setHandleStatus("idle");
				return;
			}
			if (value.length < 3) {
				setHandleStatus("invalid");
				return;
			}
			setHandleStatus("checking");
			if (debounceRef.current) clearTimeout(debounceRef.current);
			debounceRef.current = setTimeout(async () => {
				try {
					const result = await checkHandleFn({
						data: { handle: value },
					});
					setHandleStatus(result.available ? "available" : "taken");
				} catch {
					setHandleStatus("invalid");
				}
			}, 400);
		},
		[handle],
	);

	const handleSaveHandle = useCallback(async () => {
		setSaving(true);
		setTimeout(() => {
			setSaving(false);
			setEditingHandle(false);
			onHandleChanged?.();
		}, 500);
	}, [onHandleChanged]);

	return (
		<div className="space-y-4">
			<div className="bi-card flex flex-col items-center text-center py-6">
				<UserAvatar name={name} image={image} size="lg" />
				<p className="mt-3 text-sm font-medium">{name}</p>
				{headline && (
					<p className="text-xs text-muted-foreground mt-0.5">{headline}</p>
				)}
				<p className="bi-mono text-text-tertiary mt-1">@{handle}</p>
			</div>

			{isOwner && (
				<div className="bi-card space-y-3">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-medium text-foreground">
							Public profile & URL
						</h3>
						{!editingHandle && (
							<button
								type="button"
								onClick={() => setEditingHandle(true)}
								className="rounded-lg p-1 hit-area-2 text-muted-foreground hover:text-foreground transition-colors focus-ring"
								aria-label="Edit profile URL"
							>
								<PencilSimpleIcon className="size-3.5" />
							</button>
						)}
					</div>

					{editingHandle ? (
						<div className="space-y-2">
							<InputGroup>
								<InputGroupAddon align="inline-start" className="text-xs">
									/profile/
								</InputGroupAddon>
								<InputGroupInput
									value={newHandle}
									onChange={(e) =>
										handleCheckHandle(
											e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
										)
									}
									maxLength={64}
									className="text-sm"
								/>
							</InputGroup>
							<div className="min-h-[16px]">
								{handleStatus === "checking" && (
									<p className="text-xs text-muted-foreground">Checking...</p>
								)}
								{handleStatus === "available" && (
									<p className="text-xs text-salary">Available</p>
								)}
								{handleStatus === "taken" && (
									<p className="text-xs text-destructive">Already taken</p>
								)}
								{handleStatus === "invalid" && newHandle.length > 0 && (
									<p className="text-xs text-destructive">
										Use lowercase letters, numbers, hyphens, or underscores
									</p>
								)}
							</div>
							<div className="flex items-center gap-2">
								<Button
									variant="default"
									size="sm"
									onClick={handleSaveHandle}
									disabled={
										saving ||
										handleStatus !== "available" ||
										newHandle === handle
									}
								>
									{saving ? "Saving..." : "Save"}
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => {
										setEditingHandle(false);
										setNewHandle(handle);
										setHandleStatus("idle");
									}}
								>
									Cancel
								</Button>
							</div>
						</div>
					) : (
						<div className="space-y-1">
							<button
								type="button"
								onClick={copyUrl}
								className={cn(
									"flex items-center gap-1.5 rounded text-xs hit-area-y-2 active:scale-[0.97] motion-safe:transition-transform duration-150 focus-ring w-full text-left",
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
								<span className="truncate">
									{copied ? "Copied!" : `better-in.com/profile/${handle}`}
								</span>
							</button>

							<Link
								to="/profile/$handle"
								params={{ handle }}
								search={{ view: "public" }}
								className="flex items-center gap-1.5 rounded text-xs text-brand hover:underline hit-area-y-2 focus-ring"
							>
								<EyeIcon className="size-3.5 shrink-0" />
								Preview public profile
							</Link>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
