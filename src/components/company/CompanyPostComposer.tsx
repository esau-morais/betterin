import { FeatherIcon } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { createCompanyPostFn } from "#/lib/server/companies";
import { useCanHover } from "#/lib/use-hover-intent";
import type { CompanyData } from "./types";

export function CompanyPostComposer({ company }: { company: CompanyData }) {
	const queryClient = useQueryClient();
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const canHover = useCanHover();
	const [open, setOpen] = useState(false);
	const [content, setContent] = useState("");

	const createMutation = useMutation({
		mutationFn: (input: { companyId: string; content: string }) =>
			createCompanyPostFn({ data: input }),
		onSuccess: () => {
			setContent("");
			setOpen(false);
			queryClient.invalidateQueries({
				queryKey: ["company-posts", company.id],
			});
		},
	});

	function handleOpen() {
		setOpen(true);
		if (canHover) {
			requestAnimationFrame(() => textareaRef.current?.focus());
		}
	}

	function handleClose() {
		if (content.trim()) {
			if (!window.confirm("Discard this post?")) return;
		}
		setContent("");
		setOpen(false);
	}

	function handleSubmit() {
		const trimmed = content.trim();
		if (!trimmed || createMutation.isPending) return;
		createMutation.mutate({ companyId: company.id, content: trimmed });
	}

	function handleTextareaInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
		setContent(e.target.value);
		const el = e.target;
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, 300)}px`;
	}

	return (
		<div className="bi-card">
			{!open ? (
				<button
					type="button"
					onClick={handleOpen}
					className="group flex items-center gap-3 w-full text-left rounded-lg focus-ring"
				>
					<div className="relative size-10 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
						{company.logoUrl ? (
							<img
								src={company.logoUrl}
								alt={company.name}
								className="size-full object-cover"
							/>
						) : (
							<span className="text-sm font-bold text-muted-foreground">
								{company.name[0]?.toUpperCase()}
							</span>
						)}
						<div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
							<FeatherIcon className="size-4 text-foreground" weight="fill" />
						</div>
					</div>
					<div className="flex-1 rounded-full bg-secondary border border-border px-4 py-2.5 text-sm text-muted-foreground group-hover:bg-muted transition-colors">
						Post as {company.name}…
					</div>
				</button>
			) : (
				<div className="space-y-3">
					<div className="flex items-center gap-3">
						<div className="size-10 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
							{company.logoUrl ? (
								<img
									src={company.logoUrl}
									alt={company.name}
									className="size-full object-cover"
								/>
							) : (
								<span className="text-sm font-bold text-muted-foreground">
									{company.name[0]?.toUpperCase()}
								</span>
							)}
						</div>
						<p className="text-sm font-medium">{company.name}</p>
					</div>

					<label htmlFor="company-post-composer" className="sr-only">
						Post content
					</label>
					<textarea
						ref={textareaRef}
						id="company-post-composer"
						value={content}
						onChange={handleTextareaInput}
						placeholder="Share an update…"
						className="w-full resize-none bg-transparent leading-relaxed placeholder:text-text-tertiary focus-visible:outline-none min-h-[100px]"
						maxLength={3000}
					/>

					<div className="flex items-center justify-between border-t border-border pt-3">
						<span className="bi-mono text-text-tertiary">
							{content.length > 0 && `${content.length}/3000`}
						</span>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={handleClose}
							>
								Cancel
							</Button>
							<Button
								type="button"
								variant="default"
								size="sm"
								onClick={handleSubmit}
								disabled={!content.trim() || createMutation.isPending}
							>
								{createMutation.isPending ? "Posting…" : "Post"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
