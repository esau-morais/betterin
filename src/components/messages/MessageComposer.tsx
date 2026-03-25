import { PaperPlaneRightIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";

export function MessageComposer({
	onSend,
	onTyping,
	disabled,
}: {
	onSend: (content: string) => void;
	onTyping?: () => void;
	disabled?: boolean;
}) {
	const [content, setContent] = useState("");
	const lastTypingRef = useRef(0);

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = content.trim();
		if (!trimmed || disabled) return;
		onSend(trimmed);
		setContent("");
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit(e);
		}
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="flex items-end gap-2 overflow-hidden border-t border-border bg-card p-3"
		>
			<textarea
				value={content}
				onChange={(e) => {
					setContent(e.target.value);
					if (e.target.value && onTyping) {
						const now = Date.now();
						if (now - lastTypingRef.current > 3000) {
							lastTypingRef.current = now;
							onTyping();
						}
					}
				}}
				onKeyDown={handleKeyDown}
				placeholder="Write a message…"
				disabled={disabled}
				rows={1}
				autoComplete="off"
				spellCheck
				className="flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors disabled:opacity-50 [field-sizing:content] max-h-24 overflow-y-auto dark:bg-input/30"
				aria-label="Message input"
			/>
			<button
				type="submit"
				disabled={!content.trim() || disabled}
				className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
				aria-label="Send message"
			>
				<PaperPlaneRightIcon className="size-4" weight="fill" />
			</button>
		</form>
	);
}
