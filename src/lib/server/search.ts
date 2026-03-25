import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { Effect } from "effect";
import { z } from "zod";
import { db } from "#/lib/db/index.server";
import {
	companies,
	companyFollows,
	connections,
	hiddenPosts,
	jobs,
	mutedAuthors,
	posts,
	profiles,
	users,
} from "#/lib/db/schema";
import { decodeCursor, encodeCursor } from "#/lib/search-cursor";
import { parseSearchQuery } from "#/lib/search-query-parser";
import { requireSessionEffect } from "#/lib/server/require-session";
import { didYouMean } from "#/lib/server/search-helpers";
import {
	jobExperienceLevelSchema,
	jobRemoteSchema,
	jobTypeSchema,
	searchDegreeSchema,
	searchSortSchema,
	searchTimeSchema,
} from "#/lib/validation";

const SUGGESTIONS_PEOPLE_LIMIT = 3;
const SUGGESTIONS_JOBS_LIMIT = 2;
const SUGGESTIONS_COMPANIES_LIMIT = 2;
const RESULTS_PAGE_SIZE = 20;

export type PersonSuggestion = {
	id: string;
	name: string;
	handle: string | null;
	headline: string | null;
	avatarUrl: string | null;
	avatarFrame: string | null;
	isConnection: boolean;
};

export type JobSuggestion = {
	id: string;
	title: string;
	company: string;
	remote: string;
	salaryMin: number;
	salaryMax: number;
	currency: string;
};

export type CompanySuggestion = {
	id: string;
	name: string;
	slug: string;
	logoUrl: string | null;
	tagline: string | null;
	verified: boolean;
};

export type PersonResult = PersonSuggestion & {
	location: string | null;
	openToWork: boolean;
	sharedCount?: number;
};

export type JobResult = {
	id: string;
	title: string;
	company: string;
	location: string | null;
	remote: string;
	salaryMin: number;
	salaryMax: number;
	currency: string;
	tags: string[];
	createdAt: string;
	expiresAt: string;
	companyLogoUrl?: string | null;
	companyVerified?: boolean;
	companySlug?: string | null;
};

export type PostResult = {
	id: string;
	content: string;
	createdAt: string;
	author: {
		id: string;
		name: string;
		handle: string | null;
		avatarUrl: string | null;
		avatarFrame: string | null;
		headline: string | null;
	};
};

export type SearchSuggestionsResult = {
	people: PersonSuggestion[];
	jobs: JobSuggestion[];
	companies: CompanySuggestion[];
};

export type PeopleSearchResult = {
	results: PersonResult[];
	total: number;
	nextCursor?: string;
	didYouMean?: string;
};

export type JobsSearchResult = {
	results: JobResult[];
	total: number;
	nextCursor?: string;
	didYouMean?: string;
};

export type PostsSearchResult = {
	results: PostResult[];
	total: number;
	nextCursor?: string;
	didYouMean?: string;
};

export type CompanyResult = {
	id: string;
	name: string;
	slug: string;
	logoUrl: string | null;
	tagline: string | null;
	industry: string | null;
	size: string | null;
	headquarters: string | null;
	verified: boolean;
	followerCount: number;
};

export type CompaniesSearchResult = {
	results: CompanyResult[];
	total: number;
	nextCursor?: string;
};

export type AllSearchResult = {
	people: { results: PersonResult[]; total: number };
	jobs: { results: JobResult[]; total: number };
	posts: { results: PostResult[]; total: number };
	companies: { results: CompanyResult[]; total: number };
	didYouMean?: string;
};

export const searchSuggestionsFn = createServerFn({ method: "GET" })
	.inputValidator(z.object({ q: z.string().trim().min(1) }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const userId = session.user.id;
				const q = data.q;

				const connectionRows = yield* Effect.promise(() =>
					db
						.select({ id: connections.requesterId })
						.from(connections)
						.where(
							and(
								eq(connections.addresseeId, userId),
								eq(connections.status, "accepted"),
							),
						)
						.union(
							db
								.select({ id: connections.addresseeId })
								.from(connections)
								.where(
									and(
										eq(connections.requesterId, userId),
										eq(connections.status, "accepted"),
									),
								),
						),
				);

				const connectionIdSet = new Set(connectionRows.map((r) => r.id));

				const ftsQuery = sql`websearch_to_tsquery('english', ${q})`;

				let peopleRows = yield* Effect.promise(() =>
					db
						.select({
							id: users.id,
							name: users.name,
							handle: profiles.handle,
							headline: profiles.headline,
							avatarUrl: profiles.avatarUrl,
							avatarFrame: profiles.avatarFrame,
							rank: sql<number>`ts_rank(
							setweight(to_tsvector('english', coalesce(${profiles.handle}, '')), 'A') ||
							setweight(to_tsvector('english', coalesce(${users.name}, '')), 'A') ||
							setweight(to_tsvector('english', coalesce(${profiles.headline}, '')), 'B'),
							${ftsQuery}
						)`.as("rank"),
						})
						.from(users)
						.leftJoin(profiles, eq(users.id, profiles.userId))
						.where(
							sql`(
							setweight(to_tsvector('english', coalesce(${profiles.handle}, '')), 'A') ||
							setweight(to_tsvector('english', coalesce(${users.name}, '')), 'A') ||
							setweight(to_tsvector('english', coalesce(${profiles.headline}, '')), 'B')
						) @@ ${ftsQuery}`,
						)
						.orderBy(sql`rank DESC`)
						.limit(SUGGESTIONS_PEOPLE_LIMIT),
				);

				if (peopleRows.length === 0) {
					peopleRows = yield* Effect.promise(() =>
						db
							.select({
								id: users.id,
								name: users.name,
								handle: profiles.handle,
								headline: profiles.headline,
								avatarUrl: profiles.avatarUrl,
								avatarFrame: profiles.avatarFrame,
								rank: sql<number>`greatest(
								similarity(${users.name}, ${q}),
								similarity(coalesce(${profiles.handle}, ''), ${q})
							)`.as("rank"),
							})
							.from(users)
							.leftJoin(profiles, eq(users.id, profiles.userId))
							.where(
								or(sql`${users.name} % ${q}`, sql`${profiles.handle} % ${q}`),
							)
							.orderBy(sql`rank DESC`)
							.limit(SUGGESTIONS_PEOPLE_LIMIT),
					);
				}

				const jobFtsQuery = sql`websearch_to_tsquery('english', ${q})`;

				let jobRows = yield* Effect.promise(() =>
					db
						.select({
							id: jobs.id,
							title: jobs.title,
							company: jobs.company,
							remote: jobs.remote,
							salaryMin: jobs.salaryMin,
							salaryMax: jobs.salaryMax,
							currency: jobs.currency,
						})
						.from(jobs)
						.where(
							and(
								sql`(
								setweight(to_tsvector('english', coalesce(${jobs.title}, '')), 'A') ||
								setweight(to_tsvector('english', coalesce(${jobs.company}, '')), 'B')
							) @@ ${jobFtsQuery}`,
								eq(jobs.status, "open"),
							),
						)
						.orderBy(sql`ts_rank(
							setweight(to_tsvector('english', coalesce(${jobs.title}, '')), 'A') ||
							setweight(to_tsvector('english', coalesce(${jobs.company}, '')), 'B'),
							${jobFtsQuery}
						) DESC`)
						.limit(SUGGESTIONS_JOBS_LIMIT),
				);

				if (jobRows.length === 0) {
					jobRows = yield* Effect.promise(() =>
						db
							.select({
								id: jobs.id,
								title: jobs.title,
								company: jobs.company,
								remote: jobs.remote,
								salaryMin: jobs.salaryMin,
								salaryMax: jobs.salaryMax,
								currency: jobs.currency,
							})
							.from(jobs)
							.where(
								and(
									or(sql`${jobs.title} % ${q}`, sql`${jobs.company} % ${q}`),
									eq(jobs.status, "open"),
								),
							)
							.orderBy(
								sql`greatest(similarity(${jobs.title}, ${q}), similarity(${jobs.company}, ${q})) DESC`,
							)
							.limit(SUGGESTIONS_JOBS_LIMIT),
					);
				}

				const people: PersonSuggestion[] = peopleRows.map((r) => ({
					id: r.id,
					name: r.name,
					handle: r.handle,
					headline: r.headline,
					avatarUrl: r.avatarUrl ?? null,
					avatarFrame: r.avatarFrame ?? null,
					isConnection: connectionIdSet.has(r.id),
				}));

				const jobSuggestions: JobSuggestion[] = jobRows.map((r) => ({
					id: r.id,
					title: r.title,
					company: r.company,
					remote: r.remote,
					salaryMin: r.salaryMin,
					salaryMax: r.salaryMax,
					currency: r.currency,
				}));

				let companyRows = yield* Effect.promise(() =>
					db
						.select({
							id: companies.id,
							name: companies.name,
							slug: companies.slug,
							logoUrl: companies.logoUrl,
							tagline: companies.tagline,
							verifiedAt: companies.verifiedAt,
						})
						.from(companies)
						.where(
							sql`(
							setweight(to_tsvector('english', coalesce(${companies.name}, '')), 'A') ||
							setweight(to_tsvector('english', coalesce(${companies.industry}, '')), 'B')
						) @@ ${ftsQuery}`,
						)
						.orderBy(
							sql`ts_rank(
							setweight(to_tsvector('english', coalesce(${companies.name}, '')), 'A') ||
							setweight(to_tsvector('english', coalesce(${companies.industry}, '')), 'B'),
							${ftsQuery}
						) DESC`,
						)
						.limit(SUGGESTIONS_COMPANIES_LIMIT),
				);

				if (companyRows.length === 0) {
					companyRows = yield* Effect.promise(() =>
						db
							.select({
								id: companies.id,
								name: companies.name,
								slug: companies.slug,
								logoUrl: companies.logoUrl,
								tagline: companies.tagline,
								verifiedAt: companies.verifiedAt,
							})
							.from(companies)
							.where(sql`${companies.name} % ${q}`)
							.orderBy(sql`similarity(${companies.name}, ${q}) DESC`)
							.limit(SUGGESTIONS_COMPANIES_LIMIT),
					);
				}

				const companySuggestions: CompanySuggestion[] = companyRows.map(
					(r) => ({
						id: r.id,
						name: r.name,
						slug: r.slug,
						logoUrl: r.logoUrl,
						tagline: r.tagline,
						verified: !!r.verifiedAt,
					}),
				);

				return {
					people,
					jobs: jobSuggestions,
					companies: companySuggestions,
				} satisfies SearchSuggestionsResult;
			}),
		),
	);

export const searchPeopleFn = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			q: z.string().trim().default(""),
			degree: searchDegreeSchema.default("everyone"),
			location: z
				.string()
				.trim()
				.optional()
				.transform((v) => v || undefined),
			openToWork: z.boolean().default(false),
			sort: searchSortSchema.default("relevance"),
			cursor: z.string().optional(),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const userId = session.user.id;
				const parsed = parseSearchQuery(data.q);

				const connectionRows = yield* Effect.promise(() =>
					db
						.select({ id: connections.requesterId })
						.from(connections)
						.where(
							and(
								eq(connections.addresseeId, userId),
								eq(connections.status, "accepted"),
							),
						)
						.union(
							db
								.select({ id: connections.addresseeId })
								.from(connections)
								.where(
									and(
										eq(connections.requesterId, userId),
										eq(connections.status, "accepted"),
									),
								),
						),
				);

				const connectionIdSet = new Set(connectionRows.map((r) => r.id));
				const connectionIdArray = [...connectionIdSet];

				const tsVector = sql`(
					setweight(to_tsvector('english', coalesce(${profiles.handle}, '')), 'A') ||
					setweight(to_tsvector('english', coalesce(${users.name}, '')), 'A') ||
					setweight(to_tsvector('english', coalesce(${profiles.headline}, '')), 'B') ||
					setweight(to_tsvector('english', coalesce(${profiles.bio}, '')), 'C') ||
					setweight(to_tsvector('english', coalesce(${profiles.location}, '')), 'C')
				)`;

				const ftsQuery = parsed.text
					? sql`websearch_to_tsquery('english', ${parsed.text})`
					: null;

				const conditions = ftsQuery ? [sql`${tsVector} @@ ${ftsQuery}`] : [];

				if (parsed.company) {
					conditions.push(
						sql`${profiles.headline} ILIKE ${`%${parsed.company}%`}`,
					);
				}

				if (data.degree === "connections") {
					if (connectionIdArray.length === 0) {
						return { results: [], total: 0 } satisfies PeopleSearchResult;
					}
					conditions.push(
						sql`${users.id} = ANY(ARRAY[${sql.join(
							connectionIdArray.map((id) => sql`${id}`),
							sql`, `,
						)}]::text[])`,
					);
				}

				const effectiveLocation = parsed.location ?? data.location;
				if (effectiveLocation) {
					conditions.push(
						sql`${profiles.location} ILIKE ${`%${effectiveLocation}%`}`,
					);
				}

				if (data.openToWork) {
					conditions.push(eq(profiles.openToWork, true));
				}

				if (conditions.length === 0) {
					return { results: [], total: 0 } satisfies PeopleSearchResult;
				}

				const rankExpr = ftsQuery
					? sql`ts_rank(${tsVector}, ${ftsQuery})`
					: sql`1`;
				const orderBy =
					data.sort === "relevance" && ftsQuery
						? sql`${rankExpr} DESC, ${users.id} DESC`
						: sql`${users.createdAt} DESC, ${users.id} DESC`;

				if (data.cursor) {
					const decoded = decodeCursor(data.cursor);
					if (decoded) {
						if ("rank" in decoded) {
							conditions.push(
								sql`(${rankExpr}, ${users.id}) < (${decoded.rank}, ${decoded.id})`,
							);
						} else if ("date" in decoded) {
							conditions.push(
								sql`(${users.createdAt}, ${users.id}) < (${decoded.date}::timestamptz, ${decoded.id})`,
							);
						}
					}
				}

				const [rows, countRows] = yield* Effect.promise(() =>
					Promise.all([
						db
							.select({
								id: users.id,
								name: users.name,
								handle: profiles.handle,
								headline: profiles.headline,
								avatarUrl: profiles.avatarUrl,
								avatarFrame: profiles.avatarFrame,
								location: profiles.location,
								openToWork: profiles.openToWork,
								rank: rankExpr,
								createdAt: users.createdAt,
							})
							.from(users)
							.leftJoin(profiles, eq(users.id, profiles.userId))
							.where(and(...conditions))
							.orderBy(orderBy)
							.limit(RESULTS_PAGE_SIZE),
						db
							.select({ count: sql<number>`count(*)::int` })
							.from(users)
							.leftJoin(profiles, eq(users.id, profiles.userId))
							.where(and(...conditions))
							.then((r) => r[0]?.count ?? 0),
					]),
				);

				const correction =
					rows.length === 0 && !data.cursor
						? yield* Effect.promise(() => didYouMean(data.q))
						: undefined;

				const results: PersonResult[] = rows.map((r) => ({
					id: r.id,
					name: r.name,
					handle: r.handle,
					headline: r.headline,
					avatarUrl: r.avatarUrl ?? null,
					avatarFrame: r.avatarFrame ?? null,
					isConnection: connectionIdSet.has(r.id),
					location: r.location,
					openToWork: r.openToWork ?? false,
				}));

				const lastRow = rows[rows.length - 1];
				const nextCursor =
					rows.length === RESULTS_PAGE_SIZE && lastRow
						? encodeCursor(
								data.sort === "relevance"
									? { rank: lastRow.rank as number, id: lastRow.id }
									: {
											date: lastRow.createdAt.toISOString(),
											id: lastRow.id,
										},
							)
						: undefined;

				return {
					results,
					total: countRows,
					nextCursor,
					didYouMean: correction,
				} satisfies PeopleSearchResult;
			}),
		),
	);

export const searchJobsFn = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			q: z.string().trim().default(""),
			remote: jobRemoteSchema.optional(),
			salaryMin: z.number().optional(),
			salaryMax: z.number().optional(),
			location: z
				.string()
				.trim()
				.optional()
				.transform((v) => v || undefined),
			time: searchTimeSchema.optional(),
			experienceLevel: z.array(jobExperienceLevelSchema).optional(),
			jobType: z.array(jobTypeSchema).optional(),
			sort: z
				.enum(["relevance", "recent", "salary-high", "salary-low"])
				.default("relevance"),
			cursor: z.string().optional(),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				yield* requireSessionEffect;
				const parsed = parseSearchQuery(data.q);

				const tsVector = sql`(
					setweight(to_tsvector('english', coalesce(${jobs.title}, '')), 'A') ||
					setweight(to_tsvector('english', coalesce(${jobs.company}, '')), 'B') ||
					setweight(to_tsvector('english', coalesce(${jobs.description}, '')), 'C') ||
					setweight(to_tsvector('english', coalesce(${jobs.location}, '')), 'C')
				)`;

				const ftsQuery = parsed.text
					? sql`websearch_to_tsquery('english', ${parsed.text})`
					: null;

				const conditions = [
					eq(jobs.status, "open"),
					sql`${jobs.expiresAt} > now()`,
				];

				if (ftsQuery) {
					conditions.push(sql`${tsVector} @@ ${ftsQuery}`);
				}

				const effectiveRemote = parsed.remote ?? data.remote;
				if (effectiveRemote) {
					conditions.push(eq(jobs.remote, effectiveRemote));
				}

				if (data.salaryMin !== undefined) {
					conditions.push(sql`${jobs.salaryMax} >= ${data.salaryMin}`);
				}

				if (data.salaryMax !== undefined) {
					conditions.push(sql`${jobs.salaryMin} <= ${data.salaryMax}`);
				}

				const effectiveLocation = parsed.location ?? data.location;
				if (effectiveLocation) {
					conditions.push(
						sql`${jobs.location} ILIKE ${`%${effectiveLocation}%`}`,
					);
				}

				if (parsed.company) {
					conditions.push(sql`${jobs.company} ILIKE ${`%${parsed.company}%`}`);
				}

				if (data.experienceLevel && data.experienceLevel.length > 0) {
					conditions.push(
						sql`${jobs.experienceLevel} IN (${sql.join(
							data.experienceLevel.map((l) => sql`${l}`),
							sql`, `,
						)})`,
					);
				}

				if (data.jobType && data.jobType.length > 0) {
					conditions.push(
						sql`${jobs.jobType} IN (${sql.join(
							data.jobType.map((t) => sql`${t}`),
							sql`, `,
						)})`,
					);
				}

				if (parsed.since) {
					conditions.push(sql`${jobs.createdAt} >= ${parsed.since}::date`);
				}
				if (parsed.until) {
					conditions.push(sql`${jobs.createdAt} < ${parsed.until}::date`);
				}

				if (data.time && !parsed.since && !parsed.until) {
					const windowMs =
						data.time === "24h"
							? 24 * 60 * 60 * 1000
							: data.time === "3d"
								? 3 * 24 * 60 * 60 * 1000
								: data.time === "week"
									? 7 * 24 * 60 * 60 * 1000
									: 30 * 24 * 60 * 60 * 1000;
					const windowStart = new Date(Date.now() - windowMs);
					conditions.push(sql`${jobs.createdAt} >= ${windowStart}`);
				}

				const rankExpr = ftsQuery
					? sql`ts_rank(${tsVector}, ${ftsQuery})`
					: sql`1`;
				const orderBy = (() => {
					switch (data.sort) {
						case "recent":
							return sql`${jobs.createdAt} DESC, ${jobs.id} DESC`;
						case "salary-high":
							return sql`${jobs.salaryMax} DESC, ${jobs.id} DESC`;
						case "salary-low":
							return sql`${jobs.salaryMin} ASC, ${jobs.id} ASC`;
						default:
							return sql`${rankExpr} DESC, ${jobs.id} DESC`;
					}
				})();

				if (data.cursor) {
					const decoded = decodeCursor(data.cursor);
					if (decoded) {
						if ("rank" in decoded) {
							conditions.push(
								sql`(${rankExpr}, ${jobs.id}) < (${decoded.rank}, ${decoded.id})`,
							);
						} else if ("date" in decoded) {
							conditions.push(
								sql`(${jobs.createdAt}, ${jobs.id}) < (${decoded.date}::timestamptz, ${decoded.id})`,
							);
						}
					}
				}

				const [rows, countRows] = yield* Effect.promise(() =>
					Promise.all([
						db
							.select({
								id: jobs.id,
								title: jobs.title,
								company: jobs.company,
								location: jobs.location,
								remote: jobs.remote,
								salaryMin: jobs.salaryMin,
								salaryMax: jobs.salaryMax,
								currency: jobs.currency,
								tags: jobs.tags,
								createdAt: jobs.createdAt,
								expiresAt: jobs.expiresAt,
								rank: rankExpr,
								companyLogoUrl: companies.logoUrl,
								companyVerified: companies.verifiedAt,
								companySlug: companies.slug,
							})
							.from(jobs)
							.leftJoin(companies, eq(jobs.companyId, companies.id))
							.where(and(...conditions))
							.orderBy(orderBy)
							.limit(RESULTS_PAGE_SIZE),
						db
							.select({ count: sql<number>`count(*)::int` })
							.from(jobs)
							.leftJoin(companies, eq(jobs.companyId, companies.id))
							.where(and(...conditions))
							.then((r) => r[0]?.count ?? 0),
					]),
				);

				const correction =
					rows.length === 0 && !data.cursor
						? yield* Effect.promise(() => didYouMean(data.q))
						: undefined;

				const results: JobResult[] = rows.map((r) => ({
					id: r.id,
					title: r.title,
					company: r.company,
					location: r.location,
					remote: r.remote,
					salaryMin: r.salaryMin,
					salaryMax: r.salaryMax,
					currency: r.currency,
					tags: Array.isArray(r.tags) ? r.tags : [],
					createdAt: r.createdAt.toISOString(),
					expiresAt: r.expiresAt.toISOString(),
					companyLogoUrl: r.companyLogoUrl,
					companyVerified: r.companyVerified != null,
					companySlug: r.companySlug,
				}));

				const lastRow = rows[rows.length - 1];
				const nextCursor =
					rows.length === RESULTS_PAGE_SIZE && lastRow
						? encodeCursor(
								data.sort === "recent"
									? {
											date: lastRow.createdAt.toISOString(),
											id: lastRow.id,
										}
									: { rank: lastRow.rank as number, id: lastRow.id },
							)
						: undefined;

				return {
					results,
					total: countRows,
					nextCursor,
					didYouMean: correction,
				} satisfies JobsSearchResult;
			}),
		),
	);

export const searchPostsFn = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			q: z.string().trim().default(""),
			time: searchTimeSchema.optional(),
			fromNetwork: z.boolean().default(false),
			sort: searchSortSchema.default("relevance"),
			cursor: z.string().optional(),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const userId = session.user.id;
				const parsed = parseSearchQuery(data.q);

				const [connectionRows, hiddenPostIds, mutedAuthorIds] =
					yield* Effect.promise(() =>
						Promise.all([
							db
								.select({ id: connections.requesterId })
								.from(connections)
								.where(
									and(
										eq(connections.addresseeId, userId),
										eq(connections.status, "accepted"),
									),
								)
								.union(
									db
										.select({ id: connections.addresseeId })
										.from(connections)
										.where(
											and(
												eq(connections.requesterId, userId),
												eq(connections.status, "accepted"),
											),
										),
								),
							db
								.select({ postId: hiddenPosts.postId })
								.from(hiddenPosts)
								.where(eq(hiddenPosts.userId, userId))
								.then((rows) => new Set(rows.map((r) => r.postId))),
							db
								.select({ mutedUserId: mutedAuthors.mutedUserId })
								.from(mutedAuthors)
								.where(eq(mutedAuthors.userId, userId))
								.then((rows) => new Set(rows.map((r) => r.mutedUserId))),
						]),
					);

				const connectionIdSet = new Set(connectionRows.map((r) => r.id));
				const connectionIdArray = [...connectionIdSet];

				const conditions = [isNull(posts.deletedAt)];

				if (parsed.text) {
					const ftsQuery = sql`websearch_to_tsquery('english', ${parsed.text})`;
					conditions.push(
						sql`to_tsvector('english', ${posts.content}) @@ ${ftsQuery}`,
					);
				}

				if (parsed.from) {
					conditions.push(
						sql`${posts.authorId} IN (SELECT ${profiles.userId} FROM ${profiles} WHERE lower(${profiles.handle}) = lower(${parsed.from}))`,
					);
				}
				if (parsed.mention) {
					conditions.push(
						sql`${posts.content} ILIKE ${`%@${parsed.mention}%`}`,
					);
				}
				if (parsed.hasMedia) {
					conditions.push(sql`array_length(${posts.mediaUrls}, 1) > 0`);
				}
				if (parsed.since) {
					conditions.push(sql`${posts.createdAt} >= ${parsed.since}::date`);
				}
				if (parsed.until) {
					conditions.push(sql`${posts.createdAt} < ${parsed.until}::date`);
				}

				conditions.push(
					connectionIdArray.length > 0
						? or(
								eq(posts.visibility, "public"),
								and(
									eq(posts.visibility, "connections"),
									sql`${posts.authorId} = ANY(ARRAY[${sql.join(
										connectionIdArray.map((id) => sql`${id}`),
										sql`, `,
									)}]::text[])`,
								),
								eq(posts.authorId, userId),
							)!
						: or(eq(posts.visibility, "public"), eq(posts.authorId, userId))!,
				);

				if (data.fromNetwork) {
					if (connectionIdArray.length === 0) {
						conditions.push(sql`${posts.authorId} = ${userId}`);
					} else {
						conditions.push(
							sql`${posts.authorId} = ANY(ARRAY[${sql.join(
								[userId, ...connectionIdArray].map((id) => sql`${id}`),
								sql`, `,
							)}]::text[])`,
						);
					}
				}

				if (data.time) {
					const windowMs =
						data.time === "24h"
							? 24 * 60 * 60 * 1000
							: data.time === "3d"
								? 3 * 24 * 60 * 60 * 1000
								: data.time === "week"
									? 7 * 24 * 60 * 60 * 1000
									: 30 * 24 * 60 * 60 * 1000;
					const windowStart = new Date(Date.now() - windowMs);
					conditions.push(sql`${posts.createdAt} >= ${windowStart}`);
				}

				if (hiddenPostIds.size > 0) {
					const hiddenIds = [...hiddenPostIds];
					conditions.push(
						sql`${posts.id} != ALL(ARRAY[${sql.join(
							hiddenIds.map((id) => sql`${id}`),
							sql`, `,
						)}]::text[])`,
					);
				}

				if (mutedAuthorIds.size > 0) {
					const mutedIds = [...mutedAuthorIds];
					conditions.push(
						sql`(${posts.authorId} = ${userId} OR ${posts.authorId} != ALL(ARRAY[${sql.join(
							mutedIds.map((id) => sql`${id}`),
							sql`, `,
						)}]::text[]))`,
					);
				}

				const postFtsQuery = parsed.text
					? sql`websearch_to_tsquery('english', ${parsed.text})`
					: null;
				const rankExpr = postFtsQuery
					? sql`ts_rank(to_tsvector('english', ${posts.content}), ${postFtsQuery})`
					: sql`1`;
				const orderBy =
					data.sort === "relevance" && postFtsQuery
						? sql`${rankExpr} DESC, ${posts.id} DESC`
						: sql`${posts.createdAt} DESC, ${posts.id} DESC`;

				if (data.cursor) {
					const decoded = decodeCursor(data.cursor);
					if (decoded) {
						if ("rank" in decoded) {
							conditions.push(
								sql`(${rankExpr}, ${posts.id}) < (${decoded.rank}, ${decoded.id})`,
							);
						} else if ("date" in decoded) {
							conditions.push(
								sql`(${posts.createdAt}, ${posts.id}) < (${decoded.date}::timestamptz, ${decoded.id})`,
							);
						}
					}
				}

				const [rows, countRows] = yield* Effect.promise(() =>
					Promise.all([
						db
							.select({
								id: posts.id,
								content: posts.content,
								createdAt: posts.createdAt,
								authorId: users.id,
								authorName: users.name,
								handle: profiles.handle,
								avatarUrl: profiles.avatarUrl,
								avatarFrame: profiles.avatarFrame,
								headline: profiles.headline,
								rank: rankExpr,
							})
							.from(posts)
							.innerJoin(users, eq(posts.authorId, users.id))
							.leftJoin(profiles, eq(posts.authorId, profiles.userId))
							.where(and(...conditions))
							.orderBy(orderBy)
							.limit(RESULTS_PAGE_SIZE),
						db
							.select({ count: sql<number>`count(*)::int` })
							.from(posts)
							.innerJoin(users, eq(posts.authorId, users.id))
							.leftJoin(profiles, eq(posts.authorId, profiles.userId))
							.where(and(...conditions))
							.then((r) => r[0]?.count ?? 0),
					]),
				);

				const correction =
					rows.length === 0 && !data.cursor
						? yield* Effect.promise(() => didYouMean(data.q))
						: undefined;

				const results: PostResult[] = rows.map((r) => ({
					id: r.id,
					content: r.content,
					createdAt: r.createdAt.toISOString(),
					author: {
						id: r.authorId,
						name: r.authorName,
						handle: r.handle,
						avatarUrl: r.avatarUrl ?? null,
						avatarFrame: r.avatarFrame ?? null,
						headline: r.headline,
					},
				}));

				const lastRow = rows[rows.length - 1];
				const nextCursor =
					rows.length === RESULTS_PAGE_SIZE && lastRow
						? encodeCursor(
								data.sort === "relevance"
									? {
											rank: lastRow.rank as number,
											id: lastRow.id,
										}
									: {
											date: lastRow.createdAt.toISOString(),
											id: lastRow.id,
										},
							)
						: undefined;

				return {
					results,
					total: countRows,
					nextCursor,
					didYouMean: correction,
				} satisfies PostsSearchResult;
			}),
		),
	);

const ALL_TAB_LIMIT = 3;

export const searchAllFn = createServerFn({ method: "GET" })
	.inputValidator(z.object({ q: z.string().trim().default("") }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const userId = session.user.id;
				const parsed = parseSearchQuery(data.q);

				const ftsQuery = parsed.text
					? sql`websearch_to_tsquery('english', ${parsed.text})`
					: null;

				const connectionRows = yield* Effect.promise(() =>
					db
						.select({ id: connections.requesterId })
						.from(connections)
						.where(
							and(
								eq(connections.addresseeId, userId),
								eq(connections.status, "accepted"),
							),
						)
						.union(
							db
								.select({ id: connections.addresseeId })
								.from(connections)
								.where(
									and(
										eq(connections.requesterId, userId),
										eq(connections.status, "accepted"),
									),
								),
						),
				);
				const connectionIdSet = new Set(connectionRows.map((r) => r.id));

				const peopleConds = [];
				if (ftsQuery) {
					peopleConds.push(
						sql`(
						to_tsvector('english', coalesce(${users.name}, '') || ' ' || coalesce(${profiles.headline}, '') || ' ' || coalesce(${profiles.bio}, ''))
						@@ ${ftsQuery}
					) OR (${users.name} % ${parsed.text} OR ${profiles.handle} % ${parsed.text} OR ${profiles.headline} % ${parsed.text})`,
					);
				}
				if (parsed.location) {
					peopleConds.push(
						sql`${profiles.location} ILIKE ${`%${parsed.location}%`}`,
					);
				}
				if (parsed.company) {
					peopleConds.push(
						sql`${profiles.headline} ILIKE ${`%${parsed.company}%`}`,
					);
				}
				const hasPeopleQuery = peopleConds.length > 0;
				const peopleWhere = hasPeopleQuery ? and(...peopleConds) : sql`false`;

				const jobConds = [eq(jobs.status, "open")];
				if (ftsQuery) {
					jobConds.push(
						sql`to_tsvector('english', ${jobs.title} || ' ' || ${jobs.company} || ' ' || coalesce(${jobs.description}, '')) @@ ${ftsQuery}`,
					);
				}
				if (parsed.company) {
					jobConds.push(sql`${jobs.company} ILIKE ${`%${parsed.company}%`}`);
				}
				if (parsed.remote) {
					jobConds.push(eq(jobs.remote, parsed.remote));
				}
				if (parsed.location) {
					jobConds.push(sql`${jobs.location} ILIKE ${`%${parsed.location}%`}`);
				}
				const hasJobQuery =
					ftsQuery ||
					parsed.company ||
					parsed.remote ||
					parsed.location ||
					parsed.since ||
					parsed.until;
				const jobWhere = hasJobQuery
					? and(...jobConds)
					: and(eq(jobs.status, "open"), sql`false`);

				const postConds = [isNull(posts.deletedAt)];
				if (ftsQuery) {
					postConds.push(
						sql`to_tsvector('english', ${posts.content}) @@ ${ftsQuery}`,
					);
				}
				if (parsed.from) {
					postConds.push(
						sql`${posts.authorId} IN (SELECT ${profiles.userId} FROM ${profiles} WHERE lower(${profiles.handle}) = lower(${parsed.from}))`,
					);
				}
				if (parsed.mention) {
					postConds.push(sql`${posts.content} ILIKE ${`%@${parsed.mention}%`}`);
				}
				if (parsed.hasMedia) {
					postConds.push(sql`array_length(${posts.mediaUrls}, 1) > 0`);
				}
				if (parsed.since) {
					postConds.push(sql`${posts.createdAt} >= ${parsed.since}::date`);
				}
				if (parsed.until) {
					postConds.push(sql`${posts.createdAt} < ${parsed.until}::date`);
				}
				postConds.push(
					connectionIdSet.size > 0
						? or(
								eq(posts.visibility, "public"),
								eq(posts.authorId, userId),
								and(
									eq(posts.visibility, "connections"),
									sql`${posts.authorId} = ANY(ARRAY[${sql.join(
										[...connectionIdSet].map((id) => sql`${id}`),
										sql`,`,
									)}]::text[])`,
								),
							)!
						: or(eq(posts.visibility, "public"), eq(posts.authorId, userId))!,
				);
				const hasPostQuery =
					ftsQuery ||
					parsed.from ||
					parsed.mention ||
					parsed.hasMedia ||
					parsed.since ||
					parsed.until;
				const postWhere = hasPostQuery
					? and(...postConds)
					: and(...postConds, sql`false`);

				const companyConds = [];
				if (ftsQuery) {
					companyConds.push(
						sql`(
						setweight(to_tsvector('english', coalesce(${companies.name}, '')), 'A') ||
						setweight(to_tsvector('english', coalesce(${companies.industry}, '')), 'B')
					) @@ ${ftsQuery}
					OR ${companies.name} % ${parsed.text}`,
					);
				}
				if (parsed.company) {
					companyConds.push(
						sql`${companies.name} ILIKE ${`%${parsed.company}%`}`,
					);
				}
				const hasCompanyQuery = companyConds.length > 0;
				const companyWhere = hasCompanyQuery
					? and(...companyConds)
					: sql`false`;

				const [
					peopleRows,
					peopleTotalArr,
					jobRows,
					jobTotalArr,
					postRows,
					postTotalArr,
					companyRows,
					companyTotalArr,
				] = yield* Effect.promise(() =>
					Promise.all([
						db
							.select({
								id: users.id,
								name: users.name,
								handle: profiles.handle,
								headline: profiles.headline,
								avatarUrl: profiles.avatarUrl,
								avatarFrame: profiles.avatarFrame,
								location: profiles.location,
								openToWork: profiles.openToWork,
							})
							.from(users)
							.innerJoin(profiles, eq(users.id, profiles.userId))
							.where(peopleWhere)
							.orderBy(
								ftsQuery
									? sql`ts_rank(to_tsvector('english', coalesce(${users.name}, '') || ' ' || coalesce(${profiles.headline}, '')), ${ftsQuery}) DESC`
									: sql`${users.createdAt} DESC`,
							)
							.limit(ALL_TAB_LIMIT),

						db
							.select({ count: sql<number>`count(*)::int` })
							.from(users)
							.innerJoin(profiles, eq(users.id, profiles.userId))
							.where(peopleWhere),

						db
							.select({
								id: jobs.id,
								title: jobs.title,
								company: jobs.company,
								location: jobs.location,
								remote: jobs.remote,
								salaryMin: jobs.salaryMin,
								salaryMax: jobs.salaryMax,
								currency: jobs.currency,
								tags: jobs.tags,
								createdAt: jobs.createdAt,
								expiresAt: jobs.expiresAt,
								companyLogoUrl: companies.logoUrl,
								companyVerified: companies.verifiedAt,
								companySlug: companies.slug,
							})
							.from(jobs)
							.leftJoin(companies, eq(jobs.companyId, companies.id))
							.where(jobWhere)
							.orderBy(
								ftsQuery
									? sql`ts_rank(to_tsvector('english', ${jobs.title} || ' ' || ${jobs.company}), ${ftsQuery}) DESC`
									: sql`${jobs.createdAt} DESC`,
							)
							.limit(ALL_TAB_LIMIT),

						db
							.select({ count: sql<number>`count(*)::int` })
							.from(jobs)
							.leftJoin(companies, eq(jobs.companyId, companies.id))
							.where(jobWhere),

						db
							.select({
								id: posts.id,
								content: posts.content,
								createdAt: posts.createdAt,
								authorId: posts.authorId,
								authorName: users.name,
								handle: profiles.handle,
								avatarUrl: profiles.avatarUrl,
								avatarFrame: profiles.avatarFrame,
								headline: profiles.headline,
							})
							.from(posts)
							.innerJoin(users, eq(posts.authorId, users.id))
							.leftJoin(profiles, eq(posts.authorId, profiles.userId))
							.where(postWhere)
							.orderBy(
								ftsQuery
									? sql`ts_rank(to_tsvector('english', ${posts.content}), ${ftsQuery}) DESC`
									: sql`${posts.createdAt} DESC`,
							)
							.limit(ALL_TAB_LIMIT),

						db
							.select({ count: sql<number>`count(*)::int` })
							.from(posts)
							.innerJoin(users, eq(posts.authorId, users.id))
							.leftJoin(profiles, eq(posts.authorId, profiles.userId))
							.where(postWhere),

						db
							.select({
								id: companies.id,
								name: companies.name,
								slug: companies.slug,
								logoUrl: companies.logoUrl,
								tagline: companies.tagline,
								industry: companies.industry,
								size: companies.size,
								headquarters: companies.headquarters,
								verifiedAt: companies.verifiedAt,
								followerCount: sql<number>`(SELECT count(*)::int FROM ${companyFollows} WHERE ${companyFollows.companyId} = ${companies.id})`,
							})
							.from(companies)
							.where(companyWhere)
							.orderBy(
								ftsQuery
									? sql`ts_rank(
								setweight(to_tsvector('english', coalesce(${companies.name}, '')), 'A') ||
								setweight(to_tsvector('english', coalesce(${companies.industry}, '')), 'B'),
								${ftsQuery}
							) DESC`
									: sql`${companies.createdAt} DESC`,
							)
							.limit(ALL_TAB_LIMIT),

						db
							.select({ count: sql<number>`count(*)::int` })
							.from(companies)
							.where(companyWhere),
					]),
				);

				const peopleTotal = peopleTotalArr[0]?.count ?? 0;
				const jobTotal = jobTotalArr[0]?.count ?? 0;
				const postTotal = postTotalArr[0]?.count ?? 0;
				const companyTotal = companyTotalArr[0]?.count ?? 0;
				const totalAll = peopleTotal + jobTotal + postTotal + companyTotal;
				const correction =
					totalAll === 0
						? yield* Effect.promise(() => didYouMean(data.q))
						: undefined;

				return {
					people: {
						results: peopleRows.map((r) => ({
							id: r.id,
							name: r.name,
							handle: r.handle,
							headline: r.headline,
							avatarUrl: r.avatarUrl,
							avatarFrame: r.avatarFrame ?? null,
							isConnection: connectionIdSet.has(r.id),
							location: r.location,
							openToWork: r.openToWork ?? false,
						})),
						total: peopleTotal,
					},
					jobs: {
						results: jobRows.map((r) => ({
							id: r.id,
							title: r.title,
							company: r.company,
							location: r.location,
							remote: r.remote,
							salaryMin: r.salaryMin,
							salaryMax: r.salaryMax,
							currency: r.currency,
							tags: Array.isArray(r.tags) ? r.tags : [],
							createdAt: r.createdAt.toISOString(),
							expiresAt: r.expiresAt.toISOString(),
							companyLogoUrl: r.companyLogoUrl,
							companyVerified: r.companyVerified != null,
							companySlug: r.companySlug,
						})),
						total: jobTotal,
					},
					posts: {
						results: postRows.map((r) => ({
							id: r.id,
							content: r.content,
							createdAt: r.createdAt.toISOString(),
							author: {
								id: r.authorId,
								name: r.authorName,
								handle: r.handle,
								avatarUrl: r.avatarUrl ?? null,
								avatarFrame: r.avatarFrame ?? null,
								headline: r.headline,
							},
						})),
						total: postTotal,
					},
					companies: {
						results: companyRows.map((r) => ({
							id: r.id,
							name: r.name,
							slug: r.slug,
							logoUrl: r.logoUrl,
							tagline: r.tagline,
							industry: r.industry,
							size: r.size,
							headquarters: r.headquarters,
							verified: r.verifiedAt != null,
							followerCount: r.followerCount ?? 0,
						})),
						total: companyTotal,
					},
					didYouMean: correction,
				} satisfies AllSearchResult;
			}),
		),
	);

export const searchCompaniesFn = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			q: z.string().trim().default(""),
			industry: z.string().optional(),
			size: z.string().optional(),
			sort: searchSortSchema.default("relevance"),
			cursor: z.string().optional(),
			limit: z.number().min(1).max(50).default(RESULTS_PAGE_SIZE),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				yield* requireSessionEffect;
				const parsed = parseSearchQuery(data.q);
				const ftsQuery = parsed.text
					? sql`websearch_to_tsquery('english', ${parsed.text})`
					: null;

				const conds = [];
				if (ftsQuery) {
					conds.push(
						sql`(
						setweight(to_tsvector('english', coalesce(${companies.name}, '')), 'A') ||
						setweight(to_tsvector('english', coalesce(${companies.industry}, '')), 'B')
					) @@ ${ftsQuery}
					OR ${companies.name} % ${parsed.text}`,
					);
				}
				if (data.industry) {
					conds.push(sql`${companies.industry} ILIKE ${`%${data.industry}%`}`);
				}
				if (data.size) {
					conds.push(sql`${companies.size} = ${data.size}`);
				}

				const cursorData = data.cursor ? decodeCursor(data.cursor) : null;
				if (cursorData && "date" in cursorData) {
					conds.push(
						sql`(${companies.createdAt}, ${companies.id}) < (${cursorData.date}::timestamp, ${cursorData.id})`,
					);
				}

				const where = conds.length > 0 ? and(...conds) : undefined;
				const pageLimit = data.limit;

				const [rows, totalArr] = yield* Effect.promise(() =>
					Promise.all([
						db
							.select({
								id: companies.id,
								name: companies.name,
								slug: companies.slug,
								logoUrl: companies.logoUrl,
								tagline: companies.tagline,
								industry: companies.industry,
								size: companies.size,
								headquarters: companies.headquarters,
								verifiedAt: companies.verifiedAt,
								createdAt: companies.createdAt,
								followerCount: sql<number>`(SELECT count(*)::int FROM ${companyFollows} WHERE ${companyFollows.companyId} = ${companies.id})`,
							})
							.from(companies)
							.where(where)
							.orderBy(
								ftsQuery && data.sort === "relevance"
									? sql`ts_rank(
								setweight(to_tsvector('english', coalesce(${companies.name}, '')), 'A') ||
								setweight(to_tsvector('english', coalesce(${companies.industry}, '')), 'B'),
								${ftsQuery}
							) DESC`
									: sql`${companies.createdAt} DESC`,
							)
							.limit(pageLimit + 1),

						db
							.select({ count: sql<number>`count(*)::int` })
							.from(companies)
							.where(where),
					]),
				);

				const hasMore = rows.length > pageLimit;
				const items = hasMore ? rows.slice(0, pageLimit) : rows;
				const lastItem = items[items.length - 1];
				const nextCursor =
					hasMore && lastItem
						? encodeCursor({
								date: lastItem.createdAt.toISOString(),
								id: lastItem.id,
							})
						: undefined;

				return {
					results: items.map((r) => ({
						id: r.id,
						name: r.name,
						slug: r.slug,
						logoUrl: r.logoUrl,
						tagline: r.tagline,
						industry: r.industry,
						size: r.size,
						headquarters: r.headquarters,
						verified: r.verifiedAt != null,
						followerCount: r.followerCount ?? 0,
					})),
					total: totalArr[0]?.count ?? 0,
					nextCursor,
				} satisfies CompaniesSearchResult;
			}),
		),
	);
