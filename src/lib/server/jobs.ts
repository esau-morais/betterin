import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { Effect } from "effect";
import { z } from "zod";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db/index.server";
import {
	companies,
	companyMembers,
	jobApplications,
	jobs,
	savedJobs,
} from "#/lib/db/schema";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
	ValidationError,
} from "#/lib/effect-helpers";
import { decodeCursor, encodeCursor } from "#/lib/search-cursor";
import { requireSessionEffect } from "#/lib/server/require-session";
import { createJobSchema, jobFiltersSchema } from "#/lib/validation";

const PAGE_SIZE = 20;

export const createJobFn = createServerFn({ method: "POST" })
	.inputValidator(createJobSchema)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				if (data.companyId) {
					const companyId = data.companyId;
					const [member] = yield* Effect.promise(() =>
						db
							.select({ role: companyMembers.role })
							.from(companyMembers)
							.where(
								and(
									eq(companyMembers.companyId, companyId),
									eq(companyMembers.userId, session.user.id),
									sql`${companyMembers.role} IN ('admin', 'recruiter')`,
								),
							)
							.limit(1),
					);
					if (!member) {
						yield* Effect.fail(
							new ForbiddenError({
								message: "Not authorized to post jobs for this company",
							}),
						);
					}
				}

				const expiresAt = data.expiresAt
					? new Date(data.expiresAt)
					: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
				const [job] = yield* Effect.promise(() =>
					db
						.insert(jobs)
						.values({
							posterId: session.user.id,
							title: data.title,
							company: data.company,
							companyId: data.companyId ?? null,
							location: data.location ?? null,
							remote: data.remote,
							salaryMin: data.salaryMin,
							salaryMax: data.salaryMax,
							currency: data.currency,
							description: data.description,
							tags: data.tags,
							expiresAt,
							applyUrl: data.applyUrl || null,
							experienceLevel: data.experienceLevel ?? null,
							jobType: data.jobType ?? null,
						})
						.returning(),
				);
				return {
					...job,
					createdAt: job.createdAt.toISOString(),
					expiresAt: job.expiresAt.toISOString(),
				};
			}),
		),
	);

export const getJobFn = createServerFn({ method: "GET" })
	.inputValidator(z.object({ id: z.string() }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const request = getRequest();
				const session = yield* Effect.promise(() =>
					auth.api.getSession({ headers: request.headers }),
				);

				const [row] = yield* Effect.promise(() =>
					db
						.select({
							id: jobs.id,
							title: jobs.title,
							company: jobs.company,
							companyId: jobs.companyId,
							location: jobs.location,
							remote: jobs.remote,
							salaryMin: jobs.salaryMin,
							salaryMax: jobs.salaryMax,
							currency: jobs.currency,
							description: jobs.description,
							tags: jobs.tags,
							status: jobs.status,
							expiresAt: jobs.expiresAt,
							createdAt: jobs.createdAt,
							applyUrl: jobs.applyUrl,
							posterId: jobs.posterId,
							experienceLevel: jobs.experienceLevel,
							jobType: jobs.jobType,
							companyLogoUrl: companies.logoUrl,
							companyVerified: companies.verifiedAt,
							companySlug: companies.slug,
							companyName: companies.name,
						})
						.from(jobs)
						.leftJoin(companies, eq(jobs.companyId, companies.id))
						.where(eq(jobs.id, data.id))
						.limit(1),
				);

				if (!row) {
					return yield* Effect.fail(new NotFoundError({ entity: "Job" }));
				}

				let hasApplied = false;
				let isSaved = false;

				if (session) {
					const [appRow] = yield* Effect.promise(() =>
						db
							.select({ id: jobApplications.id })
							.from(jobApplications)
							.where(
								and(
									eq(jobApplications.jobId, data.id),
									eq(jobApplications.applicantId, session.user.id),
								),
							)
							.limit(1),
					);
					hasApplied = !!appRow;

					const [savedRow] = yield* Effect.promise(() =>
						db
							.select({ id: savedJobs.id })
							.from(savedJobs)
							.where(
								and(
									eq(savedJobs.jobId, data.id),
									eq(savedJobs.userId, session.user.id),
								),
							)
							.limit(1),
					);
					isSaved = !!savedRow;
				}

				return {
					id: row.id,
					title: row.title,
					company: row.company,
					companyId: row.companyId,
					location: row.location,
					remote: row.remote,
					salaryMin: row.salaryMin,
					salaryMax: row.salaryMax,
					currency: row.currency,
					description: row.description,
					tags: Array.isArray(row.tags) ? row.tags : [],
					status: row.status,
					expiresAt: row.expiresAt.toISOString(),
					createdAt: row.createdAt.toISOString(),
					applyUrl: row.applyUrl,
					posterId: row.posterId,
					experienceLevel: row.experienceLevel,
					jobType: row.jobType,
					companyLogoUrl: row.companyLogoUrl ?? null,
					companyVerified: !!row.companyVerified,
					companySlug: row.companySlug ?? null,
					companyName: row.companyName ?? null,
					hasApplied,
					isSaved,
				};
			}),
		),
	);

export const closeJobFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.string() }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				yield* Effect.promise(() =>
					db
						.update(jobs)
						.set({ status: "closed" })
						.where(
							and(eq(jobs.id, data.id), eq(jobs.posterId, session.user.id)),
						),
				);
				return { closed: true };
			}),
		),
	);

export const applyToJobFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({ jobId: z.string(), message: z.string().max(2000).optional() }),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;

				const [job] = yield* Effect.promise(() =>
					db
						.select({ applyUrl: jobs.applyUrl, status: jobs.status })
						.from(jobs)
						.where(eq(jobs.id, data.jobId))
						.limit(1),
				);
				if (!job) {
					yield* Effect.fail(new NotFoundError({ entity: "Job" }));
				}
				if (job.status !== "open") {
					yield* Effect.fail(
						new ValidationError({ message: "Job is no longer open" }),
					);
				}
				if (job.applyUrl) {
					yield* Effect.fail(
						new ValidationError({
							message: "This job uses external application",
						}),
					);
				}

				const [existing] = yield* Effect.promise(() =>
					db
						.select({ id: jobApplications.id })
						.from(jobApplications)
						.where(
							and(
								eq(jobApplications.jobId, data.jobId),
								eq(jobApplications.applicantId, session.user.id),
							),
						)
						.limit(1),
				);
				if (existing) {
					yield* Effect.fail(new ConflictError({ message: "Already applied" }));
				}

				yield* Effect.promise(() =>
					db.insert(jobApplications).values({
						jobId: data.jobId,
						applicantId: session.user.id,
						message: data.message ?? null,
					}),
				);
				return { applied: true };
			}),
		),
	);

export const recordExternalApplicationFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ jobId: z.string() }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				yield* Effect.promise(() =>
					db
						.insert(jobApplications)
						.values({
							jobId: data.jobId,
							applicantId: session.user.id,
						})
						.onConflictDoNothing(),
				);
				return { recorded: true };
			}),
		),
	);

export const getMyApplicationsFn = createServerFn({ method: "GET" })
	.inputValidator(z.object({ cursor: z.string().optional() }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const conditions = [eq(jobApplications.applicantId, session.user.id)];

				if (data.cursor) {
					const decoded = decodeCursor(data.cursor);
					if (decoded && "date" in decoded) {
						conditions.push(
							sql`(${jobApplications.createdAt}, ${jobApplications.id}) < (${decoded.date}::timestamptz, ${decoded.id})`,
						);
					}
				}

				const rows = yield* Effect.promise(() =>
					db
						.select({
							id: jobApplications.id,
							jobId: jobApplications.jobId,
							status: jobApplications.status,
							message: jobApplications.message,
							appliedAt: jobApplications.createdAt,
							title: jobs.title,
							company: jobs.company,
							companyLogoUrl: companies.logoUrl,
							companyVerified: companies.verifiedAt,
							companySlug: companies.slug,
							remote: jobs.remote,
							salaryMin: jobs.salaryMin,
							salaryMax: jobs.salaryMax,
							currency: jobs.currency,
						})
						.from(jobApplications)
						.innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
						.leftJoin(companies, eq(jobs.companyId, companies.id))
						.where(and(...conditions))
						.orderBy(desc(jobApplications.createdAt))
						.limit(PAGE_SIZE),
				);

				const lastRow = rows[rows.length - 1];
				const nextCursor =
					rows.length === PAGE_SIZE && lastRow
						? encodeCursor({
								date: lastRow.appliedAt.toISOString(),
								id: lastRow.id,
							})
						: undefined;

				return {
					results: rows.map((r) => ({
						id: r.id,
						jobId: r.jobId,
						status: r.status,
						message: r.message,
						appliedAt: r.appliedAt.toISOString(),
						title: r.title,
						company: r.company,
						companyLogoUrl: r.companyLogoUrl ?? null,
						companyVerified: !!r.companyVerified,
						companySlug: r.companySlug ?? null,
						remote: r.remote,
						salaryMin: r.salaryMin,
						salaryMax: r.salaryMax,
						currency: r.currency,
					})),
					nextCursor,
				};
			}),
		),
	);

export const saveJobFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ jobId: z.string() }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				yield* Effect.promise(() =>
					db
						.insert(savedJobs)
						.values({ userId: session.user.id, jobId: data.jobId })
						.onConflictDoNothing(),
				);
				return { saved: true };
			}),
		),
	);

export const unsaveJobFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ jobId: z.string() }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				yield* Effect.promise(() =>
					db
						.delete(savedJobs)
						.where(
							and(
								eq(savedJobs.userId, session.user.id),
								eq(savedJobs.jobId, data.jobId),
							),
						),
				);
				return { saved: false };
			}),
		),
	);

export const getSavedJobsFn = createServerFn({ method: "GET" })
	.inputValidator(z.object({ cursor: z.string().optional() }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const conditions = [eq(savedJobs.userId, session.user.id)];

				if (data.cursor) {
					const decoded = decodeCursor(data.cursor);
					if (decoded && "date" in decoded) {
						conditions.push(
							sql`(${savedJobs.createdAt}, ${savedJobs.id}) < (${decoded.date}::timestamptz, ${decoded.id})`,
						);
					}
				}

				const rows = yield* Effect.promise(() =>
					db
						.select({
							id: savedJobs.id,
							savedAt: savedJobs.createdAt,
							jobId: jobs.id,
							title: jobs.title,
							company: jobs.company,
							companyLogoUrl: companies.logoUrl,
							companyVerified: companies.verifiedAt,
							companySlug: companies.slug,
							location: jobs.location,
							remote: jobs.remote,
							salaryMin: jobs.salaryMin,
							salaryMax: jobs.salaryMax,
							currency: jobs.currency,
							tags: jobs.tags,
							createdAt: jobs.createdAt,
							status: jobs.status,
						})
						.from(savedJobs)
						.innerJoin(jobs, eq(savedJobs.jobId, jobs.id))
						.leftJoin(companies, eq(jobs.companyId, companies.id))
						.where(and(...conditions))
						.orderBy(desc(savedJobs.createdAt))
						.limit(PAGE_SIZE),
				);

				const lastRow = rows[rows.length - 1];
				const nextCursor =
					rows.length === PAGE_SIZE && lastRow
						? encodeCursor({
								date: lastRow.savedAt.toISOString(),
								id: lastRow.id,
							})
						: undefined;

				return {
					results: rows.map((r) => ({
						id: r.id,
						savedAt: r.savedAt.toISOString(),
						jobId: r.jobId,
						title: r.title,
						company: r.company,
						companyLogoUrl: r.companyLogoUrl ?? null,
						companyVerified: !!r.companyVerified,
						companySlug: r.companySlug ?? null,
						location: r.location,
						remote: r.remote,
						salaryMin: r.salaryMin,
						salaryMax: r.salaryMax,
						currency: r.currency,
						tags: Array.isArray(r.tags) ? r.tags : [],
						createdAt: r.createdAt.toISOString(),
						status: r.status,
					})),
					nextCursor,
				};
			}),
		),
	);

export const listJobsFn = createServerFn({ method: "GET" })
	.inputValidator(jobFiltersSchema)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const request = getRequest();
				const session = yield* Effect.promise(() =>
					auth.api.getSession({ headers: request.headers }),
				);

				const conditions = [
					eq(jobs.status, "open"),
					sql`${jobs.expiresAt} > now()`,
				];

				if (data.remote) conditions.push(eq(jobs.remote, data.remote));
				if (data.salaryMin !== undefined)
					conditions.push(sql`${jobs.salaryMax} >= ${data.salaryMin}`);
				if (data.salaryMax !== undefined)
					conditions.push(sql`${jobs.salaryMin} <= ${data.salaryMax}`);
				if (data.location)
					conditions.push(sql`${jobs.location} ILIKE ${`%${data.location}%`}`);
				if (data.industry)
					conditions.push(
						sql`${companies.industry} ILIKE ${`%${data.industry}%`}`,
					);
				if (data.companyId) conditions.push(eq(jobs.companyId, data.companyId));
				if (data.experienceLevel?.length)
					conditions.push(
						sql`${jobs.experienceLevel} IN ${data.experienceLevel}`,
					);
				if (data.jobType?.length)
					conditions.push(sql`${jobs.jobType} IN ${data.jobType}`);

				if (data.datePosted) {
					const ms =
						data.datePosted === "24h"
							? 24 * 3600 * 1000
							: data.datePosted === "3d"
								? 3 * 24 * 3600 * 1000
								: data.datePosted === "week"
									? 7 * 24 * 3600 * 1000
									: 30 * 24 * 3600 * 1000;
					conditions.push(
						sql`${jobs.createdAt} >= ${new Date(Date.now() - ms)}`,
					);
				}

				const orderBy = (() => {
					switch (data.sort) {
						case "salary-high":
							return sql`${jobs.salaryMax} DESC, ${jobs.id} DESC`;
						case "salary-low":
							return sql`${jobs.salaryMin} ASC, ${jobs.id} ASC`;
						default:
							return sql`${jobs.createdAt} DESC, ${jobs.id} DESC`;
					}
				})();

				const countConditions = [...conditions];

				if (data.cursor) {
					const decoded = decodeCursor(data.cursor);
					if (decoded && "date" in decoded) {
						conditions.push(
							sql`(${jobs.createdAt}, ${jobs.id}) < (${decoded.date}::timestamptz, ${decoded.id})`,
						);
					} else if (decoded && "rank" in decoded) {
						if (data.sort === "salary-high") {
							conditions.push(
								sql`(${jobs.salaryMax}, ${jobs.id}) < (${decoded.rank}, ${decoded.id})`,
							);
						} else if (data.sort === "salary-low") {
							conditions.push(
								sql`(${jobs.salaryMin}, ${jobs.id}) > (${decoded.rank}, ${decoded.id})`,
							);
						}
					}
				}

				const rows = yield* Effect.promise(() =>
					db
						.select({
							id: jobs.id,
							title: jobs.title,
							company: jobs.company,
							companyId: jobs.companyId,
							location: jobs.location,
							remote: jobs.remote,
							salaryMin: jobs.salaryMin,
							salaryMax: jobs.salaryMax,
							currency: jobs.currency,
							tags: jobs.tags,
							createdAt: jobs.createdAt,
							expiresAt: jobs.expiresAt,
							applyUrl: jobs.applyUrl,
							experienceLevel: jobs.experienceLevel,
							jobType: jobs.jobType,
							companyLogoUrl: companies.logoUrl,
							companyVerified: companies.verifiedAt,
							companySlug: companies.slug,
							companyName: companies.name,
						})
						.from(jobs)
						.leftJoin(companies, eq(jobs.companyId, companies.id))
						.where(and(...conditions))
						.orderBy(orderBy)
						.limit(PAGE_SIZE),
				);

				const [countRow] = yield* Effect.promise(() =>
					db
						.select({ count: sql<number>`count(*)::int` })
						.from(jobs)
						.leftJoin(companies, eq(jobs.companyId, companies.id))
						.where(and(...countConditions)),
				);

				let savedJobIds = new Set<string>();
				if (session) {
					const savedRows = yield* Effect.promise(() =>
						db
							.select({ jobId: savedJobs.jobId })
							.from(savedJobs)
							.where(eq(savedJobs.userId, session.user.id)),
					);
					savedJobIds = new Set(savedRows.map((r) => r.jobId));
				}

				const lastRow = rows[rows.length - 1];
				let nextCursor: string | undefined;
				if (rows.length === PAGE_SIZE && lastRow) {
					if (data.sort === "salary-high") {
						nextCursor = encodeCursor({
							rank: lastRow.salaryMax,
							id: lastRow.id,
						});
					} else if (data.sort === "salary-low") {
						nextCursor = encodeCursor({
							rank: lastRow.salaryMin,
							id: lastRow.id,
						});
					} else {
						nextCursor = encodeCursor({
							date: lastRow.createdAt.toISOString(),
							id: lastRow.id,
						});
					}
				}

				return {
					results: rows.map((r) => ({
						id: r.id,
						title: r.title,
						company: r.company,
						companyId: r.companyId,
						location: r.location,
						remote: r.remote,
						salaryMin: r.salaryMin,
						salaryMax: r.salaryMax,
						currency: r.currency,
						tags: Array.isArray(r.tags) ? r.tags : [],
						createdAt: r.createdAt.toISOString(),
						expiresAt: r.expiresAt.toISOString(),
						applyUrl: r.applyUrl,
						experienceLevel: r.experienceLevel,
						jobType: r.jobType,
						companyLogoUrl: r.companyLogoUrl ?? null,
						companyVerified: !!r.companyVerified,
						companySlug: r.companySlug ?? null,
						companyName: r.companyName ?? null,
						isSaved: savedJobIds.has(r.id),
					})),
					totalCount: countRow?.count ?? 0,
					nextCursor,
				};
			}),
		),
	);
