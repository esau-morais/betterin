import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
	CommandList,
} from "#/components/ui/command";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { addSkillFn, searchSkillsFn } from "#/lib/server/profile";

export function AddSkillForm({
	open,
	onOpenChange,
	existingSkillNames,
	onSaved,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	existingSkillNames: string[];
	onSaved: () => void;
}) {
	const [query, setQuery] = useState("");
	const [suggestions, setSuggestions] = useState<string[]>([]);
	const [duplicateError, setDuplicateError] = useState<string | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	const mutation = useMutation({
		mutationFn: async (name: string) => {
			await addSkillFn({ data: { name } });
			return name;
		},
		onSuccess: () => {
			setQuery("");
			setSuggestions([]);
			onSaved();
		},
	});

	useEffect(() => {
		if (query.length < 2) {
			setSuggestions([]);
			return;
		}
		clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(async () => {
			try {
				const results = await searchSkillsFn({
					data: { query, limit: 8 },
				});
				setSuggestions(
					results.filter(
						(r) =>
							!existingSkillNames.some(
								(e) => e.toLowerCase() === r.toLowerCase(),
							),
					),
				);
			} catch {
				setSuggestions([]);
			}
		}, 300);
		return () => clearTimeout(debounceRef.current);
	}, [query, existingSkillNames]);

	function isDuplicate(name: string) {
		return existingSkillNames.some(
			(e) => e.toLowerCase() === name.trim().toLowerCase(),
		);
	}

	function handleAdd(name: string) {
		const trimmed = name.trim();
		if (!trimmed) return;
		if (isDuplicate(trimmed)) {
			setDuplicateError(`"${trimmed}" is already in your skills`);
			return;
		}
		setDuplicateError(null);
		mutation.mutate(trimmed);
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter" && query.trim() && suggestions.length === 0) {
			e.preventDefault();
			handleAdd(query);
		}
	}

	function handleOpenChange(next: boolean) {
		if (!next) {
			setQuery("");
			setSuggestions([]);
			setDuplicateError(null);
			mutation.reset();
		}
		onOpenChange(next);
	}

	const errorMessage = duplicateError ?? mutation.error?.message;

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Add skill</DialogTitle>
				</DialogHeader>

				<Command shouldFilter={false} className="border-none shadow-none">
					<CommandInput
						placeholder="e.g. TypeScript"
						value={query}
						onValueChange={setQuery}
						onKeyDown={handleKeyDown}
						disabled={mutation.isPending}
					/>
					<CommandList>
						<CommandEmpty>No matching skills found</CommandEmpty>
						{suggestions.map((name) => (
							<CommandItem
								key={name}
								value={name}
								onSelect={() => handleAdd(name)}
							>
								{name}
							</CommandItem>
						))}
					</CommandList>
				</Command>

				{errorMessage && (
					<p className="text-sm text-destructive" role="alert">
						{errorMessage}
					</p>
				)}
				{mutation.isSuccess && (
					<output className="block text-sm text-bi-brand">
						Added "{mutation.variables}"
					</output>
				)}

				<div className="flex justify-end pt-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => handleOpenChange(false)}
					>
						Done
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
