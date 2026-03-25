import {
	CalendarBlankIcon,
	GlobeIcon,
	MapPinIcon,
} from "@phosphor-icons/react";
import { format } from "date-fns";
import type { EventData } from "#/lib/server/events";

export function EventCard({ event }: { event: EventData }) {
	const startDate = new Date(event.startAt);
	const formattedDate = format(startDate, "EEE, MMM d · h:mm a");

	return (
		<div className="mt-2 border-l-2 border-l-primary bg-secondary/50 p-4 space-y-2">
			{event.coverImageUrl && (
				<img
					src={event.coverImageUrl}
					alt=""
					loading="lazy"
					className="w-full object-cover aspect-video -mt-1 mb-2"
				/>
			)}

			<p className="flex items-center gap-1.5 text-sm text-muted-foreground bi-mono">
				<CalendarBlankIcon className="size-4 shrink-0" />
				{formattedDate}
			</p>

			<p className="text-base font-medium">{event.name}</p>

			{event.eventType === "in_person" && event.location && (
				<p className="flex items-center gap-1.5 text-sm text-muted-foreground">
					<MapPinIcon className="size-4 shrink-0" />
					{event.location}
				</p>
			)}

			{event.eventType === "online" && (
				<p className="flex items-center gap-1.5 text-sm text-muted-foreground">
					<GlobeIcon className="size-4 shrink-0" />
					Online event
				</p>
			)}
		</div>
	);
}
