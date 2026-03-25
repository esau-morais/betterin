import type { JSONContent } from "@tiptap/react";

export function extractTextFromTiptap(json: JSONContent): string {
	const parts: string[] = [];

	if (json.text) {
		parts.push(json.text);
	}

	if (json.content) {
		for (const node of json.content) {
			parts.push(extractTextFromTiptap(node));
		}
	}

	return parts.join(" ");
}

export function estimateReadingTime(text: string): number {
	const words = text.trim().split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.ceil(words / 200));
}
