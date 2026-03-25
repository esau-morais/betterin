import { sql } from "drizzle-orm";
import { db } from "#/lib/db/index.server";
import { companies } from "#/lib/db/schema";

function slugify(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

export async function generateSlug(name: string): Promise<string> {
	const base = slugify(name);
	const existing = await db
		.select({ slug: companies.slug })
		.from(companies)
		.where(sql`${companies.slug} LIKE ${`${base}%`}`);
	if (existing.length === 0) return base;
	const slugs = new Set(existing.map((r) => r.slug));
	if (!slugs.has(base)) return base;
	let i = 2;
	while (slugs.has(`${base}-${i}`)) i++;
	return `${base}-${i}`;
}
