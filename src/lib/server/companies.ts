import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import {
	and,
	count,
	desc,
	eq,
	gte,
	inArray,
	isNull,
	ne,
	sql,
} from "drizzle-orm";
import { Effect } from "effect";
import { z } from "zod";
import { auth } from "#/lib/auth";
import { db } from "#/lib/db/index.server";
import {
	comments,
	companies,
	companyFollows,
	companyMembers,
	emailVerifications,
	experiences,
	posts,
	profiles,
	reactions,
	users,
} from "#/lib/db/schema";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
	ValidationError,
} from "#/lib/effect-helpers";
import { sendOtpEmail } from "#/lib/email";
import { generateSlug } from "#/lib/server/companies-helpers";
import { createNotification } from "#/lib/server/notifications-helpers";
import { requireSessionEffect } from "#/lib/server/require-session";
import {
	checkCompanySlugSchema,
	createCompanySchema,
	disputeExperienceSchema,
	getUnverifiedClaimsSchema,
	sendWorkEmailOtpSchema,
	updateCompanySchema,
	updateCompanySlugSchema,
	verifyWorkEmailOtpSchema,
} from "#/lib/validation";

function generateOtp(): string {
	const digits = new Uint8Array(6);
	crypto.getRandomValues(digits);
	return Array.from(digits, (d) => String(d % 10)).join("");
}

export const listCompaniesFn = createServerFn({ method: "GET" })
	.inputValidator(z.object({ q: z.string().default("") }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				yield* requireSessionEffect;
				const q = data.q.trim();
				if (!q) {
					const rows = yield* Effect.promise(() =>
						db
							.select({
								id: companies.id,
								name: companies.name,
								slug: companies.slug,
								logoUrl: companies.logoUrl,
								domain: companies.domain,
								verifiedAt: companies.verifiedAt,
							})
							.from(companies)
							.orderBy(sql`${companies.name} ASC`)
							.limit(10),
					);
					return rows.map((r) => ({
						...r,
						verifiedAt: r.verifiedAt?.toISOString() ?? null,
					}));
				}
				const rows = yield* Effect.promise(() =>
					db
						.select({
							id: companies.id,
							name: companies.name,
							slug: companies.slug,
							logoUrl: companies.logoUrl,
							domain: companies.domain,
							verifiedAt: companies.verifiedAt,
							similarity: sql<number>`similarity(${companies.name}, ${q})`.as(
								"sim",
							),
						})
						.from(companies)
						.where(sql`${companies.name} % ${q}`)
						.orderBy(sql`similarity(${companies.name}, ${q}) DESC`)
						.limit(10),
				);
				return rows.map((r) => ({
					id: r.id,
					name: r.name,
					slug: r.slug,
					logoUrl: r.logoUrl,
					domain: r.domain,
					verifiedAt: r.verifiedAt?.toISOString() ?? null,
				}));
			}),
		),
	);

export const createCompanyFn = createServerFn({ method: "POST" })
	.inputValidator(createCompanySchema)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const hasDomain = !!data.domain?.trim();

				let slug: string;
				if (data.slug) {
					const dataSlug = data.slug;
					const [existing] = yield* Effect.promise(() =>
						db
							.select({ id: companies.id })
							.from(companies)
							.where(eq(companies.slug, dataSlug))
							.limit(1),
					);
					if (existing)
						yield* Effect.fail(
							new ConflictError({ message: "This slug is already taken" }),
						);
					slug = dataSlug;
				} else {
					slug = yield* Effect.promise(() => generateSlug(data.name));
				}

				const domainValue = hasDomain ? (data.domain?.trim() ?? null) : null;
				const websiteValue = data.website || null;
				const descriptionValue = data.description || null;
				const sizeValue = data.size ?? null;
				const industryValue = data.industry || null;

				const [company] = yield* Effect.promise(() =>
					db
						.insert(companies)
						.values({
							name: data.name,
							slug,
							domain: domainValue,
							website: websiteValue,
							description: descriptionValue,
							size: sizeValue,
							industry: industryValue,
						})
						.returning(),
				);

				if (!hasDomain) {
					const companyId = company.id;
					const userId = session.user.id;
					yield* Effect.promise(() =>
						db
							.insert(companyMembers)
							.values({
								companyId,
								userId,
								role: "admin",
							})
							.onConflictDoNothing(),
					);
				}

				return {
					...company,
					verifiedAt: company.verifiedAt?.toISOString() ?? null,
					requiresVerification: hasDomain,
				};
			}),
		),
	);

export const getCompanyFn = createServerFn({ method: "GET" })
	.inputValidator(z.object({ slug: z.string() }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const request = getRequest();
				const session = yield* Effect.promise(() =>
					auth.api.getSession({ headers: request.headers }),
				);

				const slug = data.slug;
				const [company] = yield* Effect.promise(() =>
					db.select().from(companies).where(eq(companies.slug, slug)).limit(1),
				);

				if (!company)
					yield* Effect.fail(new NotFoundError({ entity: "Company" }));

				const companyId = company.id;
				const [followerCountRow, memberCountRow] = yield* Effect.promise(() =>
					Promise.all([
						db
							.select({ count: count() })
							.from(companyFollows)
							.where(eq(companyFollows.companyId, companyId)),
						db
							.select({ count: count() })
							.from(companyMembers)
							.where(eq(companyMembers.companyId, companyId)),
					]),
				);

				let isFollowing = false;
				let isMember = false;
				let memberRole: string | null = null;

				if (session) {
					const userId = session.user.id;
					const [followRow] = yield* Effect.promise(() =>
						db
							.select({ id: companyFollows.id })
							.from(companyFollows)
							.where(
								and(
									eq(companyFollows.userId, userId),
									eq(companyFollows.companyId, companyId),
								),
							)
							.limit(1),
					);
					isFollowing = !!followRow;

					const [memberRow] = yield* Effect.promise(() =>
						db
							.select({ role: companyMembers.role })
							.from(companyMembers)
							.where(
								and(
									eq(companyMembers.userId, userId),
									eq(companyMembers.companyId, companyId),
								),
							)
							.limit(1),
					);
					isMember = !!memberRow;
					memberRole = memberRow?.role ?? null;
				}

				return {
					id: company.id,
					name: company.name,
					slug: company.slug,
					domain: company.domain,
					logoUrl: company.logoUrl,
					coverUrl: company.coverUrl,
					tagline: company.tagline,
					headquarters: company.headquarters,
					founded: company.founded,
					description: company.description,
					website: company.website,
					size: company.size,
					industry: company.industry,
					verifiedAt: company.verifiedAt?.toISOString() ?? null,
					createdAt: company.createdAt.toISOString(),
					followerCount: followerCountRow[0]?.count ?? 0,
					memberCount: memberCountRow[0]?.count ?? 0,
					isFollowing,
					isMember,
					memberRole,
				};
			}),
		),
	);

export const getCompanyMembersFn = createServerFn({ method: "GET" })
	.inputValidator(z.object({ companyId: z.string() }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const companyId = data.companyId;
				const rows = yield* Effect.promise(() =>
					db
						.select({
							userId: companyMembers.userId,
							role: companyMembers.role,
							verifiedAt: companyMembers.verifiedAt,
							name: users.name,
							handle: profiles.handle,
							avatarUrl: profiles.avatarUrl,
							headline: profiles.headline,
						})
						.from(companyMembers)
						.innerJoin(users, eq(companyMembers.userId, users.id))
						.leftJoin(profiles, eq(users.id, profiles.userId))
						.where(eq(companyMembers.companyId, companyId))
						.limit(20),
				);

				return rows.map((r) => ({
					userId: r.userId,
					role: r.role,
					verifiedAt: r.verifiedAt?.toISOString() ?? null,
					name: r.name,
					handle: r.handle,
					avatarUrl: r.avatarUrl ?? null,
					headline: r.headline,
				}));
			}),
		),
	);

export const verifyDomainEmailFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({ companyId: z.string(), experienceId: z.string().optional() }),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const companyId = data.companyId;

				const [company] = yield* Effect.promise(() =>
					db
						.select({
							id: companies.id,
							domain: companies.domain,
							verifiedAt: companies.verifiedAt,
						})
						.from(companies)
						.where(eq(companies.id, companyId))
						.limit(1),
				);

				if (!company)
					yield* Effect.fail(new NotFoundError({ entity: "Company" }));
				if (!company.domain)
					yield* Effect.fail(
						new ValidationError({ message: "Company has no domain set" }),
					);
				if (!session.user.email.endsWith(`@${company.domain}`)) {
					yield* Effect.fail(
						new ValidationError({
							message: "Your email does not match the company domain",
						}),
					);
				}

				const isFirstVerifier = !company.verifiedAt;
				const userId = session.user.id;
				yield* Effect.promise(() =>
					db
						.insert(companyMembers)
						.values({
							companyId,
							userId,
							role: isFirstVerifier ? "admin" : "member",
							verificationMethod: "domain_email",
							verifiedAt: new Date(),
						})
						.onConflictDoUpdate({
							target: [companyMembers.companyId, companyMembers.userId],
							set: {
								verificationMethod: "domain_email",
								verifiedAt: new Date(),
							},
						}),
				);

				if (isFirstVerifier) {
					yield* Effect.promise(() =>
						db
							.update(companies)
							.set({ verifiedAt: new Date(), updatedAt: new Date() })
							.where(eq(companies.id, companyId)),
					);
				}

				if (data.experienceId) {
					const experienceId = data.experienceId;
					yield* Effect.promise(() =>
						db
							.update(experiences)
							.set({
								verificationStatus: "verified",
								verificationMethod: "domain_email",
								verifiedAt: new Date(),
							})
							.where(
								and(
									eq(experiences.id, experienceId),
									eq(experiences.userId, userId),
								),
							),
					);
				}

				return { verified: true };
			}),
		),
	);

export const requestVerificationFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ experienceId: z.string() }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const experienceId = data.experienceId;
				const userId = session.user.id;
				yield* Effect.promise(() =>
					db
						.update(experiences)
						.set({ verificationStatus: "pending" })
						.where(
							and(
								eq(experiences.id, experienceId),
								eq(experiences.userId, userId),
							),
						),
				);
				return { requested: true };
			}),
		),
	);

export const followCompanyFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ companyId: z.string() }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const userId = session.user.id;
				const companyId = data.companyId;
				yield* Effect.promise(() =>
					db
						.insert(companyFollows)
						.values({ userId, companyId })
						.onConflictDoNothing(),
				);
				return { following: true };
			}),
		),
	);

export const unfollowCompanyFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ companyId: z.string() }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const userId = session.user.id;
				const companyId = data.companyId;
				yield* Effect.promise(() =>
					db
						.delete(companyFollows)
						.where(
							and(
								eq(companyFollows.userId, userId),
								eq(companyFollows.companyId, companyId),
							),
						),
				);
				return { following: false };
			}),
		),
	);

export const uploadCompanyLogoFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			companyId: z.string(),
			base64: z.string(),
			contentType: z.string(),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const [{ uploadFile }, { default: sharp }] = yield* Effect.promise(() =>
					Promise.all([import("#/lib/storage"), import("sharp")]),
				);
				const session = yield* requireSessionEffect;
				const companyId = data.companyId;
				const userId = session.user.id;

				const [member] = yield* Effect.promise(() =>
					db
						.select({ role: companyMembers.role })
						.from(companyMembers)
						.where(
							and(
								eq(companyMembers.companyId, companyId),
								eq(companyMembers.userId, userId),
							),
						)
						.limit(1),
				);
				if (!member || member.role !== "admin")
					yield* Effect.fail(
						new ForbiddenError({
							message: "Not authorized to update company logo",
						}),
					);

				const inputBuffer = Buffer.from(data.base64, "base64");
				const webpBuffer = yield* Effect.promise(() =>
					sharp(inputBuffer)
						.resize(200, 200, { fit: "cover" })
						.webp({ quality: 85 })
						.toBuffer(),
				);

				const key = `company-logos/${companyId}-${Date.now()}.webp`;
				const url = yield* Effect.promise(() =>
					uploadFile(key, webpBuffer, "image/webp"),
				);

				yield* Effect.promise(() =>
					db
						.update(companies)
						.set({ logoUrl: url, updatedAt: new Date() })
						.where(eq(companies.id, companyId)),
				);

				return { logoUrl: url };
			}),
		),
	);

export const uploadCompanyCoverFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			companyId: z.string(),
			base64: z.string(),
			contentType: z.string(),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const [{ uploadFile }, { default: sharp }] = yield* Effect.promise(() =>
					Promise.all([import("#/lib/storage"), import("sharp")]),
				);
				const session = yield* requireSessionEffect;
				const companyId = data.companyId;
				const userId = session.user.id;

				const [member] = yield* Effect.promise(() =>
					db
						.select({ role: companyMembers.role })
						.from(companyMembers)
						.where(
							and(
								eq(companyMembers.companyId, companyId),
								eq(companyMembers.userId, userId),
							),
						)
						.limit(1),
				);
				if (!member || member.role !== "admin")
					yield* Effect.fail(
						new ForbiddenError({
							message: "Not authorized to update company cover",
						}),
					);

				const inputBuffer = Buffer.from(data.base64, "base64");
				const webpBuffer = yield* Effect.promise(() =>
					sharp(inputBuffer)
						.resize(1200, 300, { fit: "cover" })
						.webp({ quality: 85 })
						.toBuffer(),
				);

				const key = `company-covers/${companyId}-${Date.now()}.webp`;
				const url = yield* Effect.promise(() =>
					uploadFile(key, webpBuffer, "image/webp"),
				);

				yield* Effect.promise(() =>
					db
						.update(companies)
						.set({ coverUrl: url, updatedAt: new Date() })
						.where(eq(companies.id, companyId)),
				);

				return { coverUrl: url };
			}),
		),
	);

export const updateCompanyFn = createServerFn({ method: "POST" })
	.inputValidator(updateCompanySchema)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const companyId = data.companyId;
				const userId = session.user.id;

				const [member] = yield* Effect.promise(() =>
					db
						.select({ role: companyMembers.role })
						.from(companyMembers)
						.where(
							and(
								eq(companyMembers.companyId, companyId),
								eq(companyMembers.userId, userId),
							),
						)
						.limit(1),
				);
				if (!member || member.role !== "admin")
					yield* Effect.fail(
						new ForbiddenError({
							message: "Not authorized to update company",
						}),
					);

				const { companyId: _, ...fields } = data;
				const updates: Record<string, unknown> = { updatedAt: new Date() };
				for (const [k, v] of Object.entries(fields)) {
					if (v !== undefined) updates[k] = v === "" ? null : v;
				}

				const [updated] = yield* Effect.promise(() =>
					db
						.update(companies)
						.set(updates)
						.where(eq(companies.id, companyId))
						.returning(),
				);

				return {
					...updated,
					verifiedAt: updated.verifiedAt?.toISOString() ?? null,
					createdAt: updated.createdAt.toISOString(),
				};
			}),
		),
	);

export const getCompanyPostsFn = createServerFn({ method: "GET" })
	.inputValidator(z.object({ companyId: z.string() }))
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const companyId = data.companyId;
				const rows = yield* Effect.promise(() =>
					db
						.select({
							id: posts.id,
							content: posts.content,
							createdAt: posts.createdAt,
							authorId: posts.authorId,
							authorName: users.name,
							authorImage: users.image,
							authorHandle: profiles.handle,
							authorAvatarUrl: profiles.avatarUrl,
							authorHeadline: profiles.headline,
						})
						.from(posts)
						.innerJoin(users, eq(posts.authorId, users.id))
						.leftJoin(profiles, eq(users.id, profiles.userId))
						.where(and(eq(posts.companyId, companyId), isNull(posts.deletedAt)))
						.orderBy(desc(posts.createdAt))
						.limit(10),
				);

				const postIds = rows.map((r) => r.id);
				if (postIds.length === 0) return [];

				const [reactionCounts, commentCounts] = yield* Effect.promise(() =>
					Promise.all([
						db
							.select({ postId: reactions.postId, count: count() })
							.from(reactions)
							.where(inArray(reactions.postId, postIds))
							.groupBy(reactions.postId),
						db
							.select({ postId: comments.postId, count: count() })
							.from(comments)
							.where(
								and(
									inArray(comments.postId, postIds),
									isNull(comments.deletedAt),
								),
							)
							.groupBy(comments.postId),
					]),
				);

				const reactionMap = new Map(
					reactionCounts.map((r) => [r.postId, r.count]),
				);
				const commentMap = new Map(
					commentCounts.map((r) => [r.postId, r.count]),
				);

				const reactionTypeRows = yield* Effect.promise(() =>
					db
						.select({ postId: reactions.postId, type: reactions.type })
						.from(reactions)
						.where(inArray(reactions.postId, postIds))
						.groupBy(reactions.postId, reactions.type),
				);

				const reactionTypesMap = new Map<string, string[]>();
				for (const r of reactionTypeRows) {
					const arr = reactionTypesMap.get(r.postId) ?? [];
					arr.push(r.type);
					reactionTypesMap.set(r.postId, arr);
				}

				return rows.map((r) => ({
					id: r.id,
					content: r.content,
					createdAt: r.createdAt,
					reactionCount: reactionMap.get(r.id) ?? 0,
					reactionTypes: reactionTypesMap.get(r.id) ?? [],
					commentCount: commentMap.get(r.id) ?? 0,
					impressionCount: 0,
					author: {
						id: r.authorId,
						name: r.authorName,
						image: r.authorAvatarUrl ?? r.authorImage,
						handle: r.authorHandle ?? "",
						headline: r.authorHeadline ?? null,
					},
				}));
			}),
		),
	);

export const createCompanyPostFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			companyId: z.string(),
			content: z.string().trim().min(1).max(3000),
		}),
	)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const companyId = data.companyId;
				const userId = session.user.id;

				const [member] = yield* Effect.promise(() =>
					db
						.select({ role: companyMembers.role })
						.from(companyMembers)
						.where(
							and(
								eq(companyMembers.companyId, companyId),
								eq(companyMembers.userId, userId),
							),
						)
						.limit(1),
				);
				if (!member || !["admin", "recruiter"].includes(member.role)) {
					yield* Effect.fail(
						new ForbiddenError({
							message: "Not authorized to post for this company",
						}),
					);
				}

				const content = data.content;
				const [post] = yield* Effect.promise(() =>
					db
						.insert(posts)
						.values({
							authorId: userId,
							content,
							companyId,
							visibility: "public",
						})
						.returning(),
				);

				return { id: post.id };
			}),
		),
	);

export const sendWorkEmailOtpFn = createServerFn({ method: "POST" })
	.inputValidator(sendWorkEmailOtpSchema)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const companyId = data.companyId;
				const userId = session.user.id;

				const [company] = yield* Effect.promise(() =>
					db
						.select({ id: companies.id, domain: companies.domain })
						.from(companies)
						.where(eq(companies.id, companyId))
						.limit(1),
				);

				if (!company)
					yield* Effect.fail(new NotFoundError({ entity: "Company" }));
				if (!company.domain)
					yield* Effect.fail(
						new ValidationError({ message: "Company has no domain set" }),
					);
				if (!data.email.endsWith(`@${company.domain}`)) {
					yield* Effect.fail(
						new ValidationError({
							message: `Email must end with @${company.domain}`,
						}),
					);
				}

				const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
				const [{ count: pendingCount }] = yield* Effect.promise(() =>
					db
						.select({ count: count() })
						.from(emailVerifications)
						.where(
							and(
								eq(emailVerifications.userId, userId),
								eq(emailVerifications.companyId, companyId),
								isNull(emailVerifications.verifiedAt),
								gte(emailVerifications.createdAt, oneHourAgo),
							),
						),
				);

				if (pendingCount >= 3) {
					yield* Effect.fail(
						new ValidationError({
							message: "Too many verification attempts. Try again in an hour.",
						}),
					);
				}

				const otp = generateOtp();
				const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
				const email = data.email;
				const experienceId = data.experienceId ?? null;

				const [verification] = yield* Effect.promise(() =>
					db
						.insert(emailVerifications)
						.values({
							userId,
							email,
							otp,
							companyId,
							experienceId,
							expiresAt,
						})
						.returning({ id: emailVerifications.id }),
				);

				yield* Effect.promise(() =>
					sendOtpEmail({
						to: email,
						otp,
						type: "work-email-verification",
					}),
				);

				return { verificationId: verification.id };
			}),
		),
	);

export const verifyWorkEmailOtpFn = createServerFn({ method: "POST" })
	.inputValidator(verifyWorkEmailOtpSchema)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const userId = session.user.id;
				const verificationId = data.verificationId;

				const [row] = yield* Effect.promise(() =>
					db
						.select()
						.from(emailVerifications)
						.where(
							and(
								eq(emailVerifications.id, verificationId),
								eq(emailVerifications.userId, userId),
							),
						)
						.limit(1),
				);

				if (!row)
					yield* Effect.fail(new NotFoundError({ entity: "Verification" }));
				if (row.verifiedAt)
					yield* Effect.fail(
						new ValidationError({ message: "Already verified" }),
					);
				if (row.expiresAt < new Date())
					yield* Effect.fail(new ValidationError({ message: "Code expired" }));
				if (row.otp !== data.otp)
					yield* Effect.fail(new ValidationError({ message: "Invalid code" }));

				const rowId = row.id;
				const rowCompanyId = row.companyId;
				yield* Effect.promise(() =>
					db
						.update(emailVerifications)
						.set({ verifiedAt: new Date() })
						.where(eq(emailVerifications.id, rowId)),
				);

				const [company] = yield* Effect.promise(() =>
					db
						.select({ verifiedAt: companies.verifiedAt })
						.from(companies)
						.where(eq(companies.id, rowCompanyId))
						.limit(1),
				);

				const isFirstVerifier = !company?.verifiedAt;
				yield* Effect.promise(() =>
					db
						.insert(companyMembers)
						.values({
							companyId: rowCompanyId,
							userId,
							role: isFirstVerifier ? "admin" : "member",
							verificationMethod: "domain_email",
							verifiedAt: new Date(),
						})
						.onConflictDoUpdate({
							target: [companyMembers.companyId, companyMembers.userId],
							set: {
								verificationMethod: "domain_email",
								verifiedAt: new Date(),
							},
						}),
				);

				if (isFirstVerifier) {
					yield* Effect.promise(() =>
						db
							.update(companies)
							.set({ verifiedAt: new Date(), updatedAt: new Date() })
							.where(eq(companies.id, rowCompanyId)),
					);
				}

				if (row.experienceId) {
					const experienceId = row.experienceId;
					yield* Effect.promise(() =>
						db
							.update(experiences)
							.set({
								verificationStatus: "verified",
								verificationMethod: "domain_email",
								verifiedAt: new Date(),
							})
							.where(
								and(
									eq(experiences.id, experienceId),
									eq(experiences.userId, userId),
								),
							),
					);
				}

				return { verified: true };
			}),
		),
	);

export const disputeExperienceFn = createServerFn({ method: "POST" })
	.inputValidator(disputeExperienceSchema)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const experienceId = data.experienceId;
				const userId = session.user.id;

				const [experience] = yield* Effect.promise(() =>
					db
						.select({
							id: experiences.id,
							userId: experiences.userId,
							companyId: experiences.companyId,
						})
						.from(experiences)
						.where(eq(experiences.id, experienceId))
						.limit(1),
				);

				if (!experience) {
					yield* Effect.fail(new NotFoundError({ entity: "Experience" }));
					return;
				}
				if (!experience.companyId) {
					yield* Effect.fail(
						new ValidationError({
							message: "Experience has no linked company",
						}),
					);
					return;
				}

				const expCompanyId = experience.companyId;
				const [member] = yield* Effect.promise(() =>
					db
						.select({ role: companyMembers.role })
						.from(companyMembers)
						.where(
							and(
								eq(companyMembers.companyId, expCompanyId),
								eq(companyMembers.userId, userId),
								eq(companyMembers.role, "admin"),
							),
						)
						.limit(1),
				);

				if (!member)
					yield* Effect.fail(
						new ForbiddenError({
							message: "Not authorized: must be company admin",
						}),
					);

				const reason = data.reason;
				yield* Effect.promise(() =>
					db
						.update(experiences)
						.set({
							verificationStatus: "disputed",
							disputedAt: new Date(),
							disputeReason: reason,
						})
						.where(eq(experiences.id, experienceId)),
				);

				const expUserId = experience.userId;
				yield* Effect.promise(() =>
					createNotification({
						userId: expUserId,
						type: "experience_disputed",
						actorId: userId,
						entityId: experienceId,
						entityType: "experience",
					}),
				);

				return { disputed: true };
			}),
		),
	);

export const getUnverifiedClaimsFn = createServerFn({ method: "GET" })
	.inputValidator(getUnverifiedClaimsSchema)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const companyId = data.companyId;
				const userId = session.user.id;

				const [member] = yield* Effect.promise(() =>
					db
						.select({ role: companyMembers.role })
						.from(companyMembers)
						.where(
							and(
								eq(companyMembers.companyId, companyId),
								eq(companyMembers.userId, userId),
								eq(companyMembers.role, "admin"),
							),
						)
						.limit(1),
				);

				if (!member)
					yield* Effect.fail(
						new ForbiddenError({
							message: "Not authorized: must be company admin",
						}),
					);

				const rows = yield* Effect.promise(() =>
					db
						.select({
							experience: {
								id: experiences.id,
								title: experiences.title,
								company: experiences.company,
								startDate: experiences.startDate,
								endDate: experiences.endDate,
								current: experiences.current,
								verificationStatus: experiences.verificationStatus,
							},
							user: {
								id: users.id,
								name: users.name,
								image: users.image,
							},
							profile: {
								handle: profiles.handle,
								avatarUrl: profiles.avatarUrl,
								headline: profiles.headline,
							},
						})
						.from(experiences)
						.innerJoin(users, eq(experiences.userId, users.id))
						.leftJoin(profiles, eq(users.id, profiles.userId))
						.where(
							and(
								eq(experiences.companyId, companyId),
								inArray(experiences.verificationStatus, [
									"unverified",
									"pending",
								]),
							),
						)
						.orderBy(sql`${experiences.startDate} DESC`)
						.limit(50),
				);

				return rows;
			}),
		),
	);

export const getMyCompaniesFn = createServerFn({ method: "GET" }).handler(() =>
	Effect.runPromise(
		Effect.gen(function* () {
			const session = yield* requireSessionEffect;
			const userId = session.user.id;

			const rows = yield* Effect.promise(() =>
				db
					.select({
						id: companies.id,
						name: companies.name,
						slug: companies.slug,
						logoUrl: companies.logoUrl,
						tagline: companies.tagline,
						industry: companies.industry,
						verifiedAt: companies.verifiedAt,
						role: companyMembers.role,
					})
					.from(companyMembers)
					.innerJoin(companies, eq(companyMembers.companyId, companies.id))
					.where(eq(companyMembers.userId, userId))
					.orderBy(desc(companyMembers.verifiedAt)),
			);

			const companyIds = rows.map((r) => r.id);
			const followerCounts =
				companyIds.length > 0
					? yield* Effect.promise(() =>
							db
								.select({
									companyId: companyFollows.companyId,
									count: count(),
								})
								.from(companyFollows)
								.where(inArray(companyFollows.companyId, companyIds))
								.groupBy(companyFollows.companyId),
						)
					: [];

			const followerMap = new Map(
				followerCounts.map((r) => [r.companyId, r.count]),
			);

			return rows.map((r) => ({
				id: r.id,
				name: r.name,
				slug: r.slug,
				logoUrl: r.logoUrl,
				tagline: r.tagline,
				industry: r.industry,
				verifiedAt: r.verifiedAt?.toISOString() ?? null,
				role: r.role,
				followerCount: followerMap.get(r.id) ?? 0,
			}));
		}),
	),
);

export const getFollowedCompaniesFn = createServerFn({
	method: "GET",
}).handler(() =>
	Effect.runPromise(
		Effect.gen(function* () {
			const session = yield* requireSessionEffect;
			const userId = session.user.id;

			const rows = yield* Effect.promise(() =>
				db
					.select({
						id: companies.id,
						name: companies.name,
						slug: companies.slug,
						logoUrl: companies.logoUrl,
						tagline: companies.tagline,
						industry: companies.industry,
						verifiedAt: companies.verifiedAt,
						followedAt: companyFollows.createdAt,
					})
					.from(companyFollows)
					.innerJoin(companies, eq(companyFollows.companyId, companies.id))
					.where(eq(companyFollows.userId, userId))
					.orderBy(desc(companyFollows.createdAt)),
			);

			const companyIds = rows.map((r) => r.id);
			const followerCounts =
				companyIds.length > 0
					? yield* Effect.promise(() =>
							db
								.select({
									companyId: companyFollows.companyId,
									count: count(),
								})
								.from(companyFollows)
								.where(inArray(companyFollows.companyId, companyIds))
								.groupBy(companyFollows.companyId),
						)
					: [];

			const followerMap = new Map(
				followerCounts.map((r) => [r.companyId, r.count]),
			);

			return rows.map((r) => ({
				id: r.id,
				name: r.name,
				slug: r.slug,
				logoUrl: r.logoUrl,
				tagline: r.tagline,
				industry: r.industry,
				verifiedAt: r.verifiedAt?.toISOString() ?? null,
				followerCount: followerMap.get(r.id) ?? 0,
			}));
		}),
	),
);

export const checkCompanySlugFn = createServerFn({ method: "GET" })
	.inputValidator(checkCompanySlugSchema)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const slug = data.slug;
				const [existing] = yield* Effect.promise(() =>
					db
						.select({ id: companies.id })
						.from(companies)
						.where(eq(companies.slug, slug))
						.limit(1),
				);

				return {
					available: !existing,
					reason: existing ? ("taken" as const) : null,
				};
			}),
		),
	);

const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000;

export const updateCompanySlugFn = createServerFn({ method: "POST" })
	.inputValidator(updateCompanySlugSchema)
	.handler(({ data }) =>
		Effect.runPromise(
			Effect.gen(function* () {
				const session = yield* requireSessionEffect;
				const companyId = data.companyId;
				const userId = session.user.id;
				const newSlug = data.slug;

				const [member] = yield* Effect.promise(() =>
					db
						.select({ role: companyMembers.role })
						.from(companyMembers)
						.where(
							and(
								eq(companyMembers.companyId, companyId),
								eq(companyMembers.userId, userId),
								eq(companyMembers.role, "admin"),
							),
						)
						.limit(1),
				);

				if (!member)
					yield* Effect.fail(
						new ForbiddenError({
							message: "Not authorized: must be company admin",
						}),
					);

				const [company] = yield* Effect.promise(() =>
					db
						.select({
							slug: companies.slug,
							lastSlugChangeAt: companies.lastSlugChangeAt,
						})
						.from(companies)
						.where(eq(companies.id, companyId))
						.limit(1),
				);

				if (!company)
					yield* Effect.fail(new NotFoundError({ entity: "Company" }));
				if (company.slug === newSlug) return { slug: newSlug };

				if (
					company.lastSlugChangeAt &&
					Date.now() - company.lastSlugChangeAt.getTime() < TWO_MONTHS_MS
				) {
					yield* Effect.fail(
						new ValidationError({
							message: "Slug can only be changed once every 2 months",
						}),
					);
				}

				const [existing] = yield* Effect.promise(() =>
					db
						.select({ id: companies.id })
						.from(companies)
						.where(
							and(eq(companies.slug, newSlug), ne(companies.id, companyId)),
						)
						.limit(1),
				);

				if (existing)
					yield* Effect.fail(
						new ConflictError({ message: "This slug is already taken" }),
					);

				yield* Effect.promise(() =>
					db
						.update(companies)
						.set({
							slug: newSlug,
							lastSlugChangeAt: new Date(),
							updatedAt: new Date(),
						})
						.where(eq(companies.id, companyId)),
				);

				return { slug: newSlug };
			}),
		),
	);
