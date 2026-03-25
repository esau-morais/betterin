import {
	HandsClappingIcon,
	HeartIcon,
	LightbulbIcon,
	ThumbsUpIcon,
} from "@phosphor-icons/react";
import type { ReactionType } from "#/lib/validation";

export type { ReactionType };

export const REACTION_TYPES = [
	{ type: "like" as const, icon: ThumbsUpIcon, label: "Like" },
	{ type: "insightful" as const, icon: LightbulbIcon, label: "Insightful" },
	{ type: "celebrate" as const, icon: HandsClappingIcon, label: "Celebrate" },
	{ type: "support" as const, icon: HeartIcon, label: "Support" },
];
