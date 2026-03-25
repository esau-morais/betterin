import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import type { Editor, JSONContent } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { useCanHover } from "#/lib/use-hover-intent";
import { FormattingToolbar } from "./FormattingToolbar";

const extensions = [
	StarterKit.configure({
		heading: false,
		blockquote: false,
		bulletList: false,
		orderedList: false,
		codeBlock: false,
		horizontalRule: false,
		listItem: false,
	}),
	Placeholder.configure({ placeholder: "Share your thoughts…" }),
	CharacterCount.configure({ limit: 3000 }),
];

export { extensions as postEditorExtensions };

export function PostEditor({
	onChange,
	placeholder,
	maxLength = 3000,
	autoFocus = false,
}: {
	onChange: (json: JSONContent, text: string) => void;
	placeholder?: string;
	maxLength?: number;
	autoFocus?: boolean;
}) {
	const canHover = useCanHover();
	const editor = useEditor({
		extensions: placeholder
			? [
					StarterKit.configure({
						heading: false,
						blockquote: false,
						bulletList: false,
						orderedList: false,
						codeBlock: false,
						horizontalRule: false,
						listItem: false,
					}),
					Placeholder.configure({ placeholder }),
					CharacterCount.configure({ limit: maxLength }),
				]
			: extensions,
		onUpdate: ({ editor: e }) => {
			onChange(e.getJSON(), e.getText());
		},
		immediatelyRender: false,
		shouldRerenderOnTransaction: false,
	});

	useEffect(() => {
		if (autoFocus && editor && canHover) {
			requestAnimationFrame(() => editor.commands.focus());
		}
	}, [autoFocus, editor, canHover]);

	useEffect(() => {
		return () => {
			editor?.destroy();
		};
	}, [editor]);

	return (
		<div>
			<EditorContent
				editor={editor}
				className="prose-editor w-full leading-relaxed placeholder:text-text-tertiary focus-visible:outline-none min-h-[100px] max-h-[300px] overflow-y-auto [&_.tiptap]:outline-none [&_.tiptap]:min-h-[100px] [&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_strong]:font-semibold [&_.tiptap_code]:bg-secondary [&_.tiptap_code]:px-1.5 [&_.tiptap_code]:py-0.5 [&_.tiptap_code]:rounded [&_.tiptap_code]:font-mono [&_.tiptap_code]:text-[0.9em]"
			/>
			<FormattingToolbar editor={editor} />
		</div>
	);
}

export function getEditorTextLength(editor: Editor | null): number {
	if (!editor) return 0;
	return editor.storage.characterCount?.characters() ?? 0;
}

export function hasFormattingMarks(json: JSONContent): boolean {
	if (json.marks && json.marks.length > 0) return true;
	if (json.content) {
		return json.content.some((node) => hasFormattingMarks(node));
	}
	return false;
}
