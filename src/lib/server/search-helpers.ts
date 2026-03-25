import { sql } from "drizzle-orm";
import { db } from "#/lib/db/index.server";

const DID_YOU_MEAN_THRESHOLD = 0.3;

export async function didYouMean(query: string): Promise<string | undefined> {
	const words = query
		.trim()
		.toLowerCase()
		.split(/\s+/)
		.filter((w) => w.length > 2);

	if (words.length === 0) return undefined;

	try {
		const corrections = await Promise.all(
			words.map(async (word) => {
				const rows = await db.execute<{ word: string; similarity: number }>(
					sql`
						SELECT word, similarity(word, ${word}) AS similarity
						FROM search_vocabulary
						WHERE word % ${word}
						ORDER BY similarity(word, ${word}) DESC
						LIMIT 1
					`,
				);
				const best = rows[0];
				if (
					best &&
					best.similarity >= DID_YOU_MEAN_THRESHOLD &&
					best.word !== word
				) {
					return best.word;
				}
				return word;
			}),
		);

		const corrected = corrections.join(" ");
		return corrected !== query.trim().toLowerCase() ? corrected : undefined;
	} catch {
		return undefined;
	}
}
