import { GlobeIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { UserAvatar } from "#/components/shared/UserAvatar";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { createPostFn } from "#/lib/server/feed";
import { cn } from "#/lib/utils";
import { type QuotedPostData, QuotedPostEmbed } from "./QuotedPostEmbed";

const VISIBILITY_OPTIONS = [
	{ value: "public" as const, icon: GlobeIcon, label: "Anyone" },
	{ value: "connections" as const, icon: UsersThreeIcon, label: "Connections" },
];

const authedRoute = getRouteApi("/_authed");

export function QuoteRepostDialog({
	post,
	open,
	onOpenChange,
}: {
	post: QuotedPostData;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { session } = authedRoute.useRouteContext();
	const user = session.user;
	const queryClient = useQueryClient();
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [visibility, setVisibility] = useState<"public" | "connections">(
		"public",
	);

	const createMutation = useMutation({
		mutationFn: (input: {
			content: string;
			visibility: "public" | "connections";
			quotedPostId: string;
		}) => createPostFn({ data: input }),
		onSuccess: () => {
			form.reset();
			onOpenChange(false);
			toast("Posted");
			queryClient.invalidateQueries({ queryKey: ["feed"] });
		},
	});

	const form = useForm({
		defaultValues: { content: "" },
		onSubmit: async ({ value }) => {
			await createMutation.mutateAsync({
				content: value.content.trim(),
				visibility,
				quotedPostId: post.id,
			});
		},
	});

	useHotkey("Mod+Enter", () => form.handleSubmit(), {
		target: textareaRef,
		enabled: open,
	});

	function handleTextareaInput(
		e: React.ChangeEvent<HTMLTextAreaElement>,
		handleChange: (value: string) => void,
	) {
		handleChange(e.target.value);
		const el = e.target;
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg gap-0 p-0">
				<DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
					<DialogTitle>Quote post</DialogTitle>
				</DialogHeader>

				<div className="p-4 space-y-3">
					<div className="flex items-center gap-3">
						<UserAvatar name={user.name} image={user.image} />
						<div>
							<p className="text-sm font-medium">{user.name}</p>
							<div className="flex items-center gap-1">
								{VISIBILITY_OPTIONS.map(({ value, icon: Icon, label }) => (
									<button
										key={value}
										type="button"
										onClick={() => setVisibility(value)}
										className={cn(
											"flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors focus-ring",
											visibility === value
												? "bg-accent text-primary"
												: "text-muted-foreground hover:bg-muted",
										)}
										aria-label={label}
										aria-pressed={visibility === value}
									>
										<Icon className="size-3" aria-hidden />
										{label}
									</button>
								))}
							</div>
						</div>
					</div>

					<form.Field
						name="content"
						validators={{
							onSubmit: z.string().trim().min(1, "Write something"),
						}}
					>
						{(field) => (
							<>
								<label htmlFor="quote-composer" className="sr-only">
									Your thoughts
								</label>
								<textarea
									ref={textareaRef}
									id="quote-composer"
									value={field.state.value}
									onChange={(e) => handleTextareaInput(e, field.handleChange)}
									onBlur={field.handleBlur}
									placeholder="Add your thoughts…"
									className="w-full resize-none bg-transparent leading-relaxed placeholder:text-text-tertiary focus-visible:outline-none min-h-[80px]"
									maxLength={3000}
								/>
							</>
						)}
					</form.Field>

					<QuotedPostEmbed post={post} />

					<form.Subscribe
						selector={(s) => [s.isSubmitting, s.values.content] as const}
					>
						{([isSubmitting, content]) => (
							<div className="flex items-center justify-between border-t border-border pt-3">
								<span className="bi-mono text-text-tertiary">
									{content.length > 0 && `${content.length}/3000`}
								</span>
								<Button
									type="button"
									variant="default"
									size="sm"
									onClick={() => form.handleSubmit()}
									disabled={!content.trim() || isSubmitting}
								>
									{isSubmitting ? "Posting…" : "Post"}
								</Button>
							</div>
						)}
					</form.Subscribe>
				</div>
			</DialogContent>
		</Dialog>
	);
}
