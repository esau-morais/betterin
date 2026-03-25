import { z } from "zod";

export const reactionTypeSchema = z.enum([
	"like",
	"insightful",
	"celebrate",
	"support",
]);

export const postVisibilitySchema = z.enum([
	"public",
	"connections",
	"private",
]);

export const postContentFormatSchema = z.enum(["plain", "tiptap"]);

export const feedModeSchema = z.enum(["ranked", "chronological"]);

export const feedActionSchema = z.enum([
	"impression",
	"click",
	"like",
	"comment",
	"share",
	"save",
	"hide",
	"mute_author",
	"not_interested",
]);

export const dwellBucketSchema = z.enum([
	"lt_2s",
	"2s_5s",
	"5s_15s",
	"15s_30s",
	"gt_30s",
]);

export const rankingStageSchema = z.enum(["rule_v1", "ml_v1", "neural_v1"]);

export const jobRemoteSchema = z.enum(["remote", "hybrid", "onsite"]);

export const jobExperienceLevelSchema = z.enum([
	"internship",
	"entry",
	"mid",
	"senior",
	"lead",
	"executive",
]);

export const jobTypeSchema = z.enum([
	"full_time",
	"part_time",
	"contract",
	"freelance",
	"internship",
]);

export const searchTimeSchema = z.enum(["24h", "3d", "week", "month"]);

export const jobSortSchema = z.enum(["newest", "salary-high", "salary-low"]);

export const searchSortSchema = z.enum(["relevance", "recent"]);

export const searchDegreeSchema = z.enum(["connections", "everyone"]);

export type FeedAction = z.infer<typeof feedActionSchema>;
export type DwellBucket = z.infer<typeof dwellBucketSchema>;
export type FeedMode = z.infer<typeof feedModeSchema>;
export type RankingStage = z.infer<typeof rankingStageSchema>;
export type ReactionType = z.infer<typeof reactionTypeSchema>;
export type PostVisibility = z.infer<typeof postVisibilitySchema>;
export type PostContentFormat = z.infer<typeof postContentFormatSchema>;

export const sendMessageSchema = z.object({
	recipientId: z.string().min(1),
	content: z.string().min(1).max(5000),
});

export const getMessagesSchema = z.object({
	conversationId: z.string().min(1),
	cursor: z.string().optional(),
	limit: z.number().int().min(1).max(100).default(50),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type GetMessagesInput = z.infer<typeof getMessagesSchema>;

export const handleSchema = z
	.string()
	.min(3, "At least 3 characters")
	.max(64)
	.regex(
		/^[a-z0-9][a-z0-9_-]{1,62}[a-z0-9]$/,
		"Use lowercase letters, numbers, hyphens, or underscores",
	);

export const companySlugSchema = z
	.string()
	.min(3, "At least 3 characters")
	.max(64)
	.regex(
		/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/,
		"Use lowercase letters, numbers, or hyphens",
	);

export const companySizeSchema = z.enum([
	"1_10",
	"11_50",
	"51_200",
	"201_500",
	"501_1000",
	"1000_plus",
]);

export const COMPANY_SIZE_LABELS: Record<string, string> = {
	"1_10": "1–10",
	"11_50": "11–50",
	"51_200": "51–200",
	"201_500": "201–500",
	"501_1000": "501–1,000",
	"1000_plus": "1,000+",
};

export const companyMemberRoleSchema = z.enum(["admin", "recruiter", "member"]);

export const createCompanySchema = z.object({
	name: z.string().min(1).max(256),
	slug: companySlugSchema.optional(),
	domain: z.string().max(256).optional(),
	website: z.url().optional().or(z.literal("")),
	description: z.string().max(2000).optional(),
	size: companySizeSchema.optional(),
	industry: z.string().max(128).optional(),
});

export const updateCompanySchema = z.object({
	companyId: z.string(),
	name: z.string().min(1).max(256).optional(),
	tagline: z.string().max(256).optional().or(z.literal("")),
	description: z.string().max(2000).optional().or(z.literal("")),
	website: z.url().optional().or(z.literal("")),
	headquarters: z.string().max(256).optional().or(z.literal("")),
	founded: z.number().int().min(1800).max(2030).nullable().optional(),
	size: companySizeSchema.nullable().optional(),
	industry: z.string().max(128).optional().or(z.literal("")),
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

export const createJobSchema = z.object({
	title: z.string().min(1).max(256),
	company: z.string().min(1).max(256),
	companyId: z.string().optional(),
	location: z.string().max(256).optional(),
	remote: jobRemoteSchema.default("onsite"),
	salaryMin: z.number().int().min(0),
	salaryMax: z.number().int().min(0),
	currency: z.string().length(3).default("USD"),
	description: z.string().min(1),
	tags: z.array(z.string().max(64)).max(20).default([]),
	expiresAt: z.string().optional(),
	applyUrl: z.url().optional().or(z.literal("")),
	experienceLevel: jobExperienceLevelSchema.optional(),
	jobType: jobTypeSchema.optional(),
});

export const jobFiltersSchema = z.object({
	remote: jobRemoteSchema.optional(),
	salaryMin: z.number().optional(),
	salaryMax: z.number().optional(),
	datePosted: searchTimeSchema.optional(),
	location: z.string().optional(),
	industry: z.string().optional(),
	companyId: z.string().optional(),
	experienceLevel: z.array(jobExperienceLevelSchema).optional(),
	jobType: z.array(jobTypeSchema).optional(),
	cursor: z.string().optional(),
	sort: jobSortSchema.default("newest"),
});

export const sendWorkEmailOtpSchema = z.object({
	companyId: z.string().min(1),
	email: z.email().max(256),
	experienceId: z.string().optional(),
});

export const verifyWorkEmailOtpSchema = z.object({
	verificationId: z.string().min(1),
	otp: z.string().min(6).max(6),
});

export const disputeExperienceSchema = z.object({
	experienceId: z.string().min(1),
	reason: z.string().min(1).max(512),
});

export const getUnverifiedClaimsSchema = z.object({
	companyId: z.string().min(1),
});

export type SendWorkEmailOtpInput = z.infer<typeof sendWorkEmailOtpSchema>;
export type VerifyWorkEmailOtpInput = z.infer<typeof verifyWorkEmailOtpSchema>;
export type DisputeExperienceInput = z.infer<typeof disputeExperienceSchema>;
export type GetUnverifiedClaimsInput = z.infer<
	typeof getUnverifiedClaimsSchema
>;

export const createArticleSchema = z.object({
	title: z.string().trim().min(1).max(256),
	subtitle: z.string().trim().max(512).optional(),
	coverImageUrl: z.url().optional(),
	body: z.string().min(1),
	visibility: postVisibilitySchema.default("public"),
});

export const updateArticleSchema = z.object({
	articleId: z.string().min(1),
	title: z.string().trim().min(1).max(256).optional(),
	subtitle: z.string().trim().max(512).optional().or(z.literal("")),
	coverImageUrl: z.url().optional().or(z.literal("")),
	body: z.string().min(1).optional(),
	visibility: postVisibilitySchema.optional(),
});

export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;

export type JobExperienceLevel = z.infer<typeof jobExperienceLevelSchema>;
export type JobType = z.infer<typeof jobTypeSchema>;
export const checkCompanySlugSchema = z.object({
	slug: companySlugSchema,
});

export const updateCompanySlugSchema = z.object({
	companyId: z.string().min(1),
	slug: companySlugSchema,
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type JobFilters = z.infer<typeof jobFiltersSchema>;
