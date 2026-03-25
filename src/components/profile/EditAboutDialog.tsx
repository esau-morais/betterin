import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	restrictToParentElement,
	restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DotsSixVerticalIcon, XIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useCallback, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	deleteSkillFn,
	reorderSkillsFn,
	updateProfileFieldsFn,
} from "#/lib/server/profile";
import { cn } from "#/lib/utils";

const MAX_BIO_LENGTH = 2600;
const MAX_TOP_SKILLS = 5;

function SortableTopSkill({
	skill,
	onRemove,
}: {
	skill: { id: string; name: string };
	onRemove: () => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: skill.id });

	return (
		<div
			ref={setNodeRef}
			style={{
				transform: CSS.Transform.toString(transform),
				transition,
				zIndex: isDragging ? 50 : undefined,
				position: "relative",
			}}
			className={cn(
				"flex items-center gap-3 rounded-lg border px-3 py-2.5 bg-card cursor-grab active:cursor-grabbing touch-none select-none outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring",
				isDragging ? "border-ring shadow-lg opacity-90" : "border-border",
			)}
			{...attributes}
			{...listeners}
		>
			<button
				type="button"
				onPointerDown={(e) => e.stopPropagation()}
				onClick={onRemove}
				className="shrink-0 rounded p-0.5 hit-area-2 text-muted-foreground hover:text-foreground transition-colors focus-ring cursor-pointer"
				aria-label={`Remove ${skill.name}`}
			>
				<XIcon className="size-4" />
			</button>
			<span className="flex-1 font-medium text-foreground">{skill.name}</span>
			<DotsSixVerticalIcon
				className="size-4 shrink-0 text-muted-foreground"
				weight="bold"
			/>
		</div>
	);
}

export function EditAboutDialog({
	open,
	onOpenChange,
	initialBio,
	topSkills,
	onSaved,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialBio: string | null;
	topSkills: { id: string; name: string }[];
	onSaved: () => void;
}) {
	const [skills, setSkills] = useState(topSkills.slice(0, MAX_TOP_SKILLS));
	const [error, setError] = useState<string | null>(null);

	const form = useForm({
		defaultValues: { bio: initialBio ?? "" },
		onSubmit: async ({ value }) => {
			setError(null);
			try {
				await Promise.all([
					updateProfileFieldsFn({ data: { bio: value.bio.trim() } }),
					reorderSkillsFn({
						data: { skillIds: skills.map((s) => s.id) },
					}),
				]);
				onSaved();
				onOpenChange(false);
			} catch (err: unknown) {
				setError(err instanceof Error ? err.message : "Failed to save");
			}
		},
	});

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleRemoveSkill = useCallback(
		async (skillId: string) => {
			setSkills((prev) => prev.filter((s) => s.id !== skillId));
			try {
				await deleteSkillFn({ data: { id: skillId } });
			} catch {
				setSkills(topSkills.slice(0, MAX_TOP_SKILLS));
			}
		},
		[topSkills],
	);

	const handleDragEnd = useCallback((event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;
		setSkills((prev) => {
			const oldIndex = prev.findIndex((s) => s.id === active.id);
			const newIndex = prev.findIndex((s) => s.id === over.id);
			return arrayMove(prev, oldIndex, newIndex);
		});
	}, []);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="sm:max-w-lg max-h-[85vh] overflow-y-auto"
				showCloseButton
			>
				<DialogHeader>
					<DialogTitle>Edit about</DialogTitle>
				</DialogHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-6 py-2"
					noValidate
				>
					<form.Field name="bio">
						{(field) => (
							<div>
								<p className="text-sm text-muted-foreground mb-2">
									You can write about your years of experience, industry, or
									skills.
								</p>
								<textarea
									value={field.state.value}
									onChange={(e) =>
										field.handleChange(e.target.value.slice(0, MAX_BIO_LENGTH))
									}
									onBlur={field.handleBlur}
									rows={6}
									className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors resize-y dark:bg-input/30"
									aria-label="About"
								/>
								<p className="mt-1 text-xs text-muted-foreground text-right tabular-nums">
									{field.state.value.length}/{MAX_BIO_LENGTH.toLocaleString()}
								</p>
							</div>
						)}
					</form.Field>

					{skills.length > 0 && (
						<div>
							<h3 className="font-semibold text-foreground">Skills</h3>
							<p className="text-sm text-muted-foreground mt-1 mb-3">
								Show your top skills — add up to {MAX_TOP_SKILLS} skills you
								want to be known for.
							</p>
							<DndContext
								sensors={sensors}
								collisionDetection={closestCenter}
								modifiers={[restrictToVerticalAxis, restrictToParentElement]}
								onDragEnd={handleDragEnd}
							>
								<SortableContext
									items={skills.map((s) => s.id)}
									strategy={verticalListSortingStrategy}
								>
									<div className="space-y-2">
										{skills.map((skill) => (
											<SortableTopSkill
												key={skill.id}
												skill={skill}
												onRemove={() => handleRemoveSkill(skill.id)}
											/>
										))}
									</div>
								</SortableContext>
							</DndContext>
						</div>
					)}

					<form.Subscribe
						selector={(s) => [s.isSubmitting, s.canSubmit] as const}
					>
						{([isSubmitting, canSubmit]) => (
							<div className="flex items-center justify-end gap-2">
								{error && (
									<p className="text-sm text-destructive mr-auto" role="alert">
										{error}
									</p>
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
									disabled={!canSubmit}
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
