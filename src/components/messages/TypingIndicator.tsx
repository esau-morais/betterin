const dotStyle = (delay: number): React.CSSProperties => ({
	animation: "typing-dot 1.4s ease-in-out infinite",
	animationDelay: `${delay}ms`,
	willChange: "transform",
});

export function TypingIndicator({ name }: { name: string }) {
	return (
		<div className="animate-in fade-in slide-in-from-bottom-1 duration-150 flex items-center gap-1.5 pr-4 py-1.5 text-xs text-muted-foreground">
			<span
				className="motion-reduce:hidden flex items-end gap-1"
				aria-hidden="true"
			>
				<span
					className="size-1.5 rounded-full bg-muted-foreground"
					style={dotStyle(0)}
				/>
				<span
					className="size-1.5 rounded-full bg-muted-foreground"
					style={dotStyle(160)}
				/>
				<span
					className="size-1.5 rounded-full bg-muted-foreground"
					style={dotStyle(320)}
				/>
			</span>
			<span>
				{name} is typing
				<span className="motion-safe:hidden">…</span>
			</span>
		</div>
	);
}
