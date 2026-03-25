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
import { DotsSixVerticalIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { deleteSkillFn, reorderSkillsFn } from "#/lib/server/profile";
import { cn } from "#/lib/utils";

const INITIAL_DISPLAY = 5;

function SortableSkillRow({
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
				"flex items-center gap-3 rounded-lg border px-3 py-2 bg-card cursor-grab active:cursor-grabbing touch-none select-none outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring",
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

export function SkillsSection({
	skills,
	isOwner,
	onAdd,
	onReordered,
}: {
	skills: { id: string; name: string; ordering: number }[];
	isOwner?: boolean;
	onAdd?: () => void;
	onReordered?: () => void;
}) {
	const [showAll, setShowAll] = useState(false);
	const [items, setItems] = useState(skills);

	useEffect(() => {
		setItems(skills);
	}, [skills]);

	const displayed = showAll ? items : items.slice(0, INITIAL_DISPLAY);
	const hasMore = items.length > INITIAL_DISPLAY;

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	async function handleRemove(id: string) {
		setItems((prev) => prev.filter((s) => s.id !== id));
		try {
			await deleteSkillFn({ data: { id } });
		} catch {
			setItems(skills);
		}
		onReordered?.();
	}

	async function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = items.findIndex((s) => s.id === active.id);
		const newIndex = items.findIndex((s) => s.id === over.id);
		const reordered = arrayMove(items, oldIndex, newIndex);
		setItems(reordered);

		try {
			await reorderSkillsFn({
				data: { skillIds: reordered.map((s) => s.id) },
			});
		} catch {
			setItems(skills);
		}
		onReordered?.();
	}

	return (
		<section className="bi-card animate-fade-up" aria-label="Skills">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold text-foreground">Skills</h2>
				{isOwner && (
					<button
						type="button"
						onClick={onAdd}
						className="rounded-lg p-1.5 hit-area-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-ring"
						aria-label="Add skill"
					>
						<PlusIcon className="size-4" />
					</button>
				)}
			</div>

			{isOwner ? (
				<div
					className={cn(
						"mt-3 space-y-2",
						showAll && "max-h-80 overflow-y-auto overscroll-contain pr-2",
					)}
				>
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						modifiers={[restrictToVerticalAxis, restrictToParentElement]}
						onDragEnd={handleDragEnd}
					>
						<SortableContext
							items={displayed.map((s) => s.id)}
							strategy={verticalListSortingStrategy}
						>
							{displayed.map((skill) => (
								<SortableSkillRow
									key={skill.id}
									skill={skill}
									onRemove={() => handleRemove(skill.id)}
								/>
							))}
						</SortableContext>
					</DndContext>
				</div>
			) : (
				<div
					className={cn(
						"mt-3 flex flex-wrap gap-2",
						showAll && "max-h-80 overflow-y-auto overscroll-contain pr-2",
					)}
				>
					{displayed.map((skill) => (
						<span
							key={skill.id}
							className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground"
						>
							{skill.name}
						</span>
					))}
				</div>
			)}

			{hasMore && (
				<button
					type="button"
					onClick={() => setShowAll((prev) => !prev)}
					className="mt-3 rounded text-sm hit-area-y-2 font-medium text-brand hover:underline focus-ring"
				>
					{showAll ? "Show less" : `Show all ${items.length} skills`}
				</button>
			)}
		</section>
	);
}
