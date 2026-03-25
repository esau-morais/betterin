import { useForm } from "@tanstack/react-form";
import { useCallback, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Command,
	CommandGroup,
	CommandItem,
	CommandList,
} from "#/components/ui/command";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { FieldLabel } from "#/components/ui/label";
import {
	NativeSelect,
	NativeSelectOption,
} from "#/components/ui/native-select";
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
} from "#/components/ui/popover";
import type { Language } from "#/lib/db/schema";
import {
	addLanguageFn,
	deleteLanguageFn,
	updateLanguageFn,
} from "#/lib/server/profile";

const LANGUAGES = [
	"Arabic",
	"Bengali",
	"Bulgarian",
	"Catalan",
	"Chinese (Mandarin)",
	"Croatian",
	"Czech",
	"Danish",
	"Dutch",
	"English",
	"Finnish",
	"French",
	"German",
	"Greek",
	"Hebrew",
	"Hindi",
	"Hungarian",
	"Indonesian",
	"Italian",
	"Japanese",
	"Korean",
	"Malay",
	"Norwegian",
	"Persian",
	"Polish",
	"Portuguese",
	"Romanian",
	"Russian",
	"Serbian",
	"Slovak",
	"Slovenian",
	"Spanish",
	"Swahili",
	"Swedish",
	"Tagalog",
	"Thai",
	"Turkish",
	"Ukrainian",
	"Urdu",
	"Vietnamese",
];

const PROFICIENCY_LEVELS = [
	{ value: "elementary", label: "Elementary" },
	{ value: "limited", label: "Limited working" },
	{ value: "professional", label: "Professional working" },
	{ value: "full_professional", label: "Full professional" },
	{ value: "native", label: "Native or bilingual" },
];

const FORWARDED_KEYS = new Set(["ArrowUp", "ArrowDown", "Home", "End"]);

export type LanguageItem = Omit<Language, "userId" | "ordering">;

export function LanguageDialog({
	open,
	onOpenChange,
	item,
	onSaved,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	item?: LanguageItem | null;
	onSaved: () => void;
}) {
	const isEdit = !!item;
	const [error, setError] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [query, setQuery] = useState(item?.name ?? "");
	const [name, setName] = useState(item?.name ?? "");
	const [proficiency, setProficiency] = useState(item?.proficiency ?? "");
	const [listOpen, setListOpen] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const commandRef = useRef<HTMLDivElement>(null);

	const filtered =
		query.length > 0
			? LANGUAGES.filter((l) => l.toLowerCase().includes(query.toLowerCase()))
			: LANGUAGES;

	const form = useForm({
		defaultValues: {},
		onSubmit: async () => {
			const langName = name || query.trim();
			if (!langName) {
				setError("Language is required");
				return;
			}
			setError(null);
			try {
				if (isEdit) {
					await updateLanguageFn({
						data: {
							id: item.id,
							name: langName,
							proficiency: proficiency || undefined,
						},
					});
				} else {
					await addLanguageFn({
						data: { name: langName, proficiency: proficiency || undefined },
					});
				}
				onSaved();
			} catch (err: unknown) {
				setError(err instanceof Error ? err.message : "Failed to save");
			}
		},
	});

	const handleSelect = useCallback((lang: string) => {
		setName(lang);
		setQuery(lang);
		setListOpen(false);
	}, []);

	const handleInputKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Escape") {
				setListOpen(false);
				return;
			}
			if (e.key === "Enter" && listOpen) {
				e.preventDefault();
				const selected = commandRef.current?.querySelector<HTMLElement>(
					'[cmdk-item][data-selected="true"]',
				);
				if (selected) {
					selected.dispatchEvent(new MouseEvent("click", { bubbles: true }));
				}
				return;
			}
			if (listOpen && FORWARDED_KEYS.has(e.key)) {
				e.preventDefault();
				commandRef.current?.dispatchEvent(
					new KeyboardEvent("keydown", {
						key: e.key,
						code: e.code,
						bubbles: true,
						cancelable: true,
					}),
				);
			}
		},
		[listOpen],
	);

	const handleDelete = useCallback(async () => {
		if (!item) return;
		setDeleting(true);
		setError(null);
		try {
			await deleteLanguageFn({ data: { id: item.id } });
			onSaved();
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Failed to delete");
		} finally {
			setDeleting(false);
		}
	}, [item, onSaved]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="sm:max-w-lg max-h-[85vh] overflow-y-auto"
				showCloseButton
				onOpenAutoFocus={(e) => e.preventDefault()}
			>
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit language" : "Add language"}</DialogTitle>
				</DialogHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4 py-2"
					noValidate
				>
					<div className="space-y-2">
						<FieldLabel htmlFor="lang-name" error={error} errorId="lang-error">
							Language *
						</FieldLabel>
						<Popover
							open={listOpen && filtered.length > 0}
							onOpenChange={setListOpen}
						>
							<PopoverAnchor asChild>
								<Input
									ref={inputRef}
									id="lang-name"
									size="sm"
									className="rounded-lg"
									value={query}
									placeholder="Search languages..."
									autoComplete="off"
									role="combobox"
									aria-expanded={listOpen && filtered.length > 0}
									aria-invalid={!!error}
									aria-describedby={error ? "lang-error" : undefined}
									onChange={(e) => {
										setQuery(e.target.value);
										setName("");
										if (!listOpen) setListOpen(true);
										if (error) setError(null);
									}}
									onFocus={() => setListOpen(true)}
									onKeyDown={handleInputKeyDown}
								/>
							</PopoverAnchor>
							<PopoverContent
								className="w-[--radix-popover-trigger-width] p-0 max-h-[200px] overflow-hidden"
								align="start"
								sideOffset={4}
								onOpenAutoFocus={(e) => e.preventDefault()}
								onCloseAutoFocus={(e) => e.preventDefault()}
							>
								<Command ref={commandRef} shouldFilter={false} loop>
									<CommandList>
										<CommandGroup>
											{filtered.slice(0, 8).map((lang) => (
												<CommandItem
													key={lang}
													value={lang}
													onSelect={() => handleSelect(lang)}
												>
													{lang}
												</CommandItem>
											))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					</div>

					<div className="space-y-2">
						<FieldLabel htmlFor="lang-proficiency">Proficiency</FieldLabel>
						<NativeSelect
							id="lang-proficiency"
							value={proficiency}
							onChange={(e) => setProficiency(e.target.value)}
						>
							<NativeSelectOption value="">
								Select proficiency
							</NativeSelectOption>
							{PROFICIENCY_LEVELS.map((level) => (
								<NativeSelectOption key={level.value} value={level.value}>
									{level.label}
								</NativeSelectOption>
							))}
						</NativeSelect>
					</div>

					<form.Subscribe
						selector={(s) => [s.isSubmitting, s.canSubmit] as const}
					>
						{([isSubmitting, canSubmit]) => (
							<div className="flex items-center gap-2 pt-2">
								{isEdit && (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={handleDelete}
										disabled={deleting || isSubmitting}
										className="text-destructive hover:text-destructive mr-auto"
									>
										{deleting ? "Deleting…" : "Delete language"}
									</Button>
								)}
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => onOpenChange(false)}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									variant="default"
									size="sm"
									disabled={!canSubmit || deleting}
								>
									{isSubmitting ? "Saving…" : "Save"}
								</Button>
							</div>
						)}
					</form.Subscribe>
				</form>
			</DialogContent>
		</Dialog>
	);
}
