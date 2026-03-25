import { PencilSimpleIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { cn } from "#/lib/utils";

export function AboutSection({
	bio,
	isOwner,
	onEdit,
	topSkills,
}: {
	bio: string | null;
	isOwner?: boolean;
	onEdit?: () => void;
	topSkills?: { id: string; name: string }[];
}) {
	const [expanded, setExpanded] = useState(false);
	const textRef = useRef<HTMLParagraphElement>(null);
	const hasBio = !!bio && bio.length > 0;
	const isLong = !!bio && bio.length > 300;
	const hasSkills = topSkills && topSkills.length > 0;

	if (!hasBio && !isOwner && !hasSkills) return null;

	return (
		<section className="bi-card animate-fade-up" aria-label="About">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold text-foreground">About</h2>
				{isOwner && (
					<button
						type="button"
						onClick={onEdit}
						className="rounded-lg p-1.5 hit-area-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-ring"
						aria-label="Edit about"
					>
						<PencilSimpleIcon className="size-4" />
					</button>
				)}
			</div>
			{hasBio ? (
				<>
					<p
						ref={textRef}
						className={cn(
							"mt-3 leading-relaxed whitespace-pre-wrap break-words text-foreground",
							!expanded && isLong && "line-clamp-3",
						)}
					>
						{bio}
					</p>
					{isLong && (
						<button
							type="button"
							onClick={() => setExpanded(!expanded)}
							className="mt-2 rounded text-sm hit-area-y-2 font-medium text-muted-foreground hover:text-foreground transition-colors focus-ring"
						>
							{expanded ? "Show less" : "Show more"}
						</button>
					)}
				</>
			) : isOwner ? (
				<p className="mt-3 leading-relaxed text-muted-foreground">
					Write about your experience, skills, or interests
				</p>
			) : null}
			{hasSkills && (
				<p className="text-sm text-muted-foreground mt-3">
					{topSkills
						.slice(0, 5)
						.map((s) => s.name)
						.join(" · ")}
				</p>
			)}
		</section>
	);
}
