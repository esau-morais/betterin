import { useState } from "react";
import { cn } from "#/lib/utils";

const SIZES = {
	xs: "size-5 text-[11px]",
	sm: "size-6 text-xs",
	default: "size-8 text-sm",
	lg: "size-10 text-base",
	xl: "size-24 text-2xl",
} as const;

function getInitials(name: string) {
	const parts = name.trim().split(/\s+/);
	if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "";
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserAvatar({
	name,
	image,
	size = "default",
	className,
}: {
	name: string;
	image?: string | null;
	size?: "xs" | "sm" | "default" | "lg" | "xl";
	className?: string;
}) {
	const [imgError, setImgError] = useState(false);
	const showImg = !!image && !imgError;

	return (
		<div
			className={cn(
				"relative shrink-0 overflow-hidden rounded-full select-none",
				SIZES[size],
				className,
			)}
		>
			<div
				className="absolute inset-0 flex items-center justify-center rounded-full bg-muted font-medium text-muted-foreground"
				aria-hidden
			>
				{getInitials(name)}
			</div>

			{showImg && (
				<img
					src={image}
					alt={`Avatar for ${name}`}
					className="absolute inset-0 size-full rounded-full object-cover"
					onError={() => setImgError(true)}
				/>
			)}
		</div>
	);
}
