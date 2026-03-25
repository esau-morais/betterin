import {
	CodeSimpleIcon,
	TextBIcon,
	TextItalicIcon,
} from "@phosphor-icons/react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { cn } from "#/lib/utils";

const btnClass =
	"rounded-md p-1.5 transition-colors focus-ring text-muted-foreground hover:bg-muted";
const activeClass = "bg-accent text-primary";

export function FormattingToolbar({ editor }: { editor: Editor | null }) {
	const state = useEditorState({
		editor,
		selector: (ctx) => ({
			bold: ctx.editor?.isActive("bold") ?? false,
			italic: ctx.editor?.isActive("italic") ?? false,
			code: ctx.editor?.isActive("code") ?? false,
		}),
	});

	if (!editor || !state) return null;

	return (
		<div className="flex items-center gap-0.5 pt-2">
			<button
				type="button"
				onClick={() => editor.chain().focus().toggleBold().run()}
				className={cn(btnClass, state.bold && activeClass)}
				aria-label="Bold"
				aria-pressed={state.bold}
			>
				<TextBIcon className="size-4" weight="bold" />
			</button>
			<button
				type="button"
				onClick={() => editor.chain().focus().toggleItalic().run()}
				className={cn(btnClass, state.italic && activeClass)}
				aria-label="Italic"
				aria-pressed={state.italic}
			>
				<TextItalicIcon className="size-4" weight="bold" />
			</button>
			<button
				type="button"
				onClick={() => editor.chain().focus().toggleCode().run()}
				className={cn(btnClass, state.code && activeClass)}
				aria-label="Code"
				aria-pressed={state.code}
			>
				<CodeSimpleIcon className="size-4" weight="bold" />
			</button>
		</div>
	);
}
