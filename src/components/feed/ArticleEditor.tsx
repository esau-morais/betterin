import {
	ArrowUDownLeftIcon,
	ArrowUUpRightIcon,
	CodeBlockIcon,
	CodeSimpleIcon,
	ImageIcon,
	LineSegmentIcon,
	LinkIcon,
	ListBulletsIcon,
	ListNumbersIcon,
	QuotesIcon,
	TextBIcon,
	TextHFiveIcon,
	TextHFourIcon,
	TextItalicIcon,
} from "@phosphor-icons/react";
import CharacterCount from "@tiptap/extension-character-count";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import type { Editor, JSONContent } from "@tiptap/react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useRef } from "react";
import { cn } from "#/lib/utils";

const ARTICLE_MAX_CHARS = 50000;

export function ArticleEditor({
	initialContent,
	onChange,
	placeholder = "Write your article…",
	stickyClass,
}: {
	initialContent?: JSONContent;
	onChange: (json: JSONContent, text: string) => void;
	placeholder?: string;
	stickyClass?: string;
}) {
	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: { levels: [2, 3] },
			}),
			Placeholder.configure({ placeholder }),
			CharacterCount.configure({ limit: ARTICLE_MAX_CHARS }),
			Image.configure({ allowBase64: false }),
			Link.configure({ openOnClick: false, autolink: true }),
		],
		content: initialContent,
		onUpdate: ({ editor: e }) => {
			onChange(e.getJSON(), e.getText());
		},
		immediatelyRender: false,
		shouldRerenderOnTransaction: false,
	});

	useEffect(() => {
		return () => {
			editor?.destroy();
		};
	}, [editor]);

	const imageInputRef = useRef<HTMLInputElement>(null);

	const handleImageUpload = useCallback(
		async (file: File) => {
			if (!editor) return;
			const formData = new FormData();
			formData.append("file", file);
			try {
				const res = await fetch("/api/upload", {
					method: "POST",
					body: formData,
				});
				if (!res.ok) return;
				const { url } = await res.json();
				editor.chain().focus().setImage({ src: url }).run();
			} catch {
				// upload failed silently
			}
		},
		[editor],
	);

	if (!editor) {
		return (
			<div className="article-editor article-prose">
				<div className="flex flex-wrap items-center gap-0.5 border-b border-border pb-2 h-10" />
				<div className="mt-4 min-h-[400px] text-muted-foreground">
					{placeholder}
				</div>
			</div>
		);
	}

	return (
		<div className="article-editor article-prose">
			<ArticleToolbar
				editor={editor}
				onImageClick={() => imageInputRef.current?.click()}
				stickyClass={stickyClass}
			/>
			<EditorContent editor={editor} className="mt-4" />
			<input
				ref={imageInputRef}
				type="file"
				accept="image/jpeg,image/png,image/gif,image/webp"
				className="hidden"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) handleImageUpload(file);
					e.target.value = "";
				}}
			/>
		</div>
	);
}

const btnClass =
	"rounded-md p-1.5 transition-colors focus-ring text-muted-foreground hover:bg-muted disabled:opacity-30";
const activeClass = "bg-accent text-primary";

function ArticleToolbar({
	editor,
	onImageClick,
	stickyClass,
}: {
	editor: Editor | null;
	onImageClick: () => void;
	stickyClass?: string;
}) {
	const state = useEditorState({
		editor,
		selector: (ctx) => ({
			bold: ctx.editor?.isActive("bold") ?? false,
			italic: ctx.editor?.isActive("italic") ?? false,
			code: ctx.editor?.isActive("code") ?? false,
			h2: ctx.editor?.isActive("heading", { level: 2 }) ?? false,
			h3: ctx.editor?.isActive("heading", { level: 3 }) ?? false,
			bulletList: ctx.editor?.isActive("bulletList") ?? false,
			orderedList: ctx.editor?.isActive("orderedList") ?? false,
			blockquote: ctx.editor?.isActive("blockquote") ?? false,
			codeBlock: ctx.editor?.isActive("codeBlock") ?? false,
		}),
	});

	const handleLink = useCallback(() => {
		if (!editor) return;
		const prev = editor.getAttributes("link").href;
		const url = window.prompt("URL", prev ?? "https://");
		if (url === null) return;
		if (url === "") {
			editor.chain().focus().extendMarkRange("link").unsetLink().run();
			return;
		}
		editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
	}, [editor]);

	if (!editor || !state) return null;

	return (
		<div
			className={cn(
				"flex flex-wrap items-center gap-0.5 border-b border-border py-2",
				stickyClass,
			)}
		>
			<ToolbarBtn
				icon={TextBIcon}
				active={state.bold}
				label="Bold"
				onClick={() => editor.chain().focus().toggleBold().run()}
			/>
			<ToolbarBtn
				icon={TextItalicIcon}
				active={state.italic}
				label="Italic"
				onClick={() => editor.chain().focus().toggleItalic().run()}
			/>
			<ToolbarBtn
				icon={CodeSimpleIcon}
				active={state.code}
				label="Inline code"
				onClick={() => editor.chain().focus().toggleCode().run()}
			/>
			<div className="w-px h-5 bg-border mx-1" />
			<ToolbarBtn
				icon={TextHFourIcon}
				active={state.h2}
				label="Heading 2"
				onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
			/>
			<ToolbarBtn
				icon={TextHFiveIcon}
				active={state.h3}
				label="Heading 3"
				onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
			/>
			<div className="w-px h-5 bg-border mx-1" />
			<ToolbarBtn
				icon={ListBulletsIcon}
				active={state.bulletList}
				label="Bullet list"
				onClick={() => editor.chain().focus().toggleBulletList().run()}
			/>
			<ToolbarBtn
				icon={ListNumbersIcon}
				active={state.orderedList}
				label="Ordered list"
				onClick={() => editor.chain().focus().toggleOrderedList().run()}
			/>
			<ToolbarBtn
				icon={QuotesIcon}
				active={state.blockquote}
				label="Blockquote"
				onClick={() => editor.chain().focus().toggleBlockquote().run()}
			/>
			<ToolbarBtn
				icon={CodeBlockIcon}
				active={state.codeBlock}
				label="Code block"
				onClick={() => editor.chain().focus().toggleCodeBlock().run()}
			/>
			<div className="w-px h-5 bg-border mx-1" />
			<ToolbarBtn
				icon={LineSegmentIcon}
				active={false}
				label="Horizontal rule"
				onClick={() => editor.chain().focus().setHorizontalRule().run()}
			/>
			<ToolbarBtn
				icon={LinkIcon}
				active={editor.isActive("link")}
				label="Link"
				onClick={handleLink}
			/>
			<ToolbarBtn
				icon={ImageIcon}
				active={false}
				label="Insert image"
				onClick={onImageClick}
			/>
			<div className="w-px h-5 bg-border mx-1" />
			<ToolbarBtn
				icon={ArrowUDownLeftIcon}
				active={false}
				label="Undo"
				onClick={() => editor.chain().focus().undo().run()}
				disabled={!editor.can().undo()}
			/>
			<ToolbarBtn
				icon={ArrowUUpRightIcon}
				active={false}
				label="Redo"
				onClick={() => editor.chain().focus().redo().run()}
				disabled={!editor.can().redo()}
			/>
		</div>
	);
}

function ToolbarBtn({
	icon: Icon,
	active,
	label,
	onClick,
	disabled,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: Phosphor icon props variance
	icon: React.ComponentType<any>;
	active: boolean;
	label: string;
	onClick: () => void;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(btnClass, active && activeClass)}
			aria-label={label}
			aria-pressed={active}
		>
			<Icon className="size-4" weight="bold" />
		</button>
	);
}
