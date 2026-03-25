import { relations, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
	boolean,
	date,
	doublePrecision,
	index,
	integer,
	json,
	pgEnum,
	pgTable,
	real,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";

export const connectionStatusEnum = pgEnum("connection_status", [
	"pending",
	"accepted",
	"blocked",
]);

export const postVisibilityEnum = pgEnum("post_visibility", [
	"public",
	"connections",
	"private",
]);

export const postContentFormatEnum = pgEnum("post_content_format", [
	"plain",
	"tiptap",
]);

export const eventTypeEnum = pgEnum("event_type", ["online", "in_person"]);

export const reactionTypeEnum = pgEnum("reaction_type", [
	"like",
	"insightful",
	"celebrate",
	"support",
]);

export const jobRemoteEnum = pgEnum("job_remote", [
	"remote",
	"hybrid",
	"onsite",
]);

export const jobExperienceLevelEnum = pgEnum("job_experience_level", [
	"internship",
	"entry",
	"mid",
	"senior",
	"lead",
	"executive",
]);

export const jobTypeEnum = pgEnum("job_type", [
	"full_time",
	"part_time",
	"contract",
	"freelance",
	"internship",
]);

export const jobStatusEnum = pgEnum("job_status", [
	"open",
	"closed",
	"expired",
]);

export const applicationStatusEnum = pgEnum("application_status", [
	"applied",
	"viewed",
	"rejected",
	"accepted",
]);

export const conversationTypeEnum = pgEnum("conversation_type", [
	"direct",
	"group",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
	"connection_request",
	"connection_accepted",
	"post_reaction",
	"post_comment",
	"job_match",
	"message",
	"experience_disputed",
]);

export const pushPlatformEnum = pgEnum("push_platform", ["ios", "android"]);

export const moderationStatusEnum = pgEnum("moderation_status", [
	"pending",
	"reviewed",
	"actioned",
	"dismissed",
]);

export const feedActionEnum = pgEnum("feed_action", [
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

export const dwellBucketEnum = pgEnum("dwell_bucket", [
	"lt_2s",
	"2s_5s",
	"5s_15s",
	"15s_30s",
	"gt_30s",
]);

export const feedModeEnum = pgEnum("feed_mode", ["ranked", "chronological"]);

export const rankingStageEnum = pgEnum("ranking_stage", [
	"rule_v1",
	"ml_v1",
	"neural_v1",
]);

export const companySizeEnum = pgEnum("company_size", [
	"1_10",
	"11_50",
	"51_200",
	"201_500",
	"501_1000",
	"1000_plus",
]);

export const companyMemberRoleEnum = pgEnum("company_member_role", [
	"admin",
	"recruiter",
	"member",
]);

export const verificationMethodEnum = pgEnum("verification_method", [
	"domain_email",
	"manual_review",
]);

export const experienceVerificationStatusEnum = pgEnum(
	"experience_verification_status",
	["unverified", "pending", "verified", "rejected", "disputed"],
);

export const parentalConsentStatusEnum = pgEnum("parental_consent_status", [
	"not_required",
	"pending",
	"verified",
	"denied",
]);

export const detectedRegionEnum = pgEnum("detected_region", [
	"BR",
	"EU",
	"GB",
	"US",
	"OTHER",
]);

export const users = pgTable(
	"users",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		email: text("email").notNull().unique(),
		emailVerified: boolean("email_verified").notNull().default(false),
		image: text("image"),
		dateOfBirth: date("date_of_birth", { mode: "date" }),
		detectedRegion: detectedRegionEnum("detected_region"),
		parentUserId: text("parent_user_id").references(
			(): AnyPgColumn => users.id,
		),
		parentalConsentStatus: parentalConsentStatusEnum("parental_consent_status")
			.notNull()
			.default("not_required"),
		identityVerifiedAt: timestamp("identity_verified_at"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(t) => [
		index("users_name_trgm_idx").using("gin", sql`${t.name} gin_trgm_ops`),
	],
);

export const sessions = pgTable("sessions", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

export const profiles = pgTable(
	"profiles",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.unique()
			.references(() => users.id, { onDelete: "cascade" }),
		handle: varchar("handle", { length: 64 }).notNull().unique(),
		headline: varchar("headline", { length: 280 }),
		bio: text("bio"),
		location: varchar("location", { length: 128 }),
		locationLat: doublePrecision("location_lat"),
		locationLon: doublePrecision("location_lon"),
		website: varchar("website", { length: 512 }),
		avatarUrl: text("avatar_url"),
		avatarOriginalUrl: text("avatar_original_url"),
		coverUrl: text("cover_url"),
		openToWork: boolean("open_to_work").notNull().default(false),
		hiring: boolean("hiring").notNull().default(false),
		avatarFrame: varchar("avatar_frame", { length: 32 }),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(t) => [
		index("profiles_user_id_idx").on(t.userId),
		// FTS: handle (weight A) + headline (B) + bio (C) + location (C)
		index("profiles_fts_idx").using(
			"gin",
			sql`(
				setweight(to_tsvector('english', coalesce(${t.handle}, '')), 'A') ||
				setweight(to_tsvector('english', coalesce(${t.headline}, '')), 'B') ||
				setweight(to_tsvector('english', coalesce(${t.bio}, '')), 'C') ||
				setweight(to_tsvector('english', coalesce(${t.location}, '')), 'C')
			)`,
		),
		// Trigram indexes for autocomplete prefix matching
		index("profiles_handle_trgm_idx").using(
			"gin",
			sql`${t.handle} gin_trgm_ops`,
		),
		index("profiles_headline_trgm_idx").using(
			"gin",
			sql`${t.headline} gin_trgm_ops`,
		),
	],
);

export const companies = pgTable(
	"companies",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: varchar("name", { length: 256 }).notNull(),
		slug: varchar("slug", { length: 256 }).notNull().unique(),
		domain: varchar("domain", { length: 256 }),
		logoUrl: text("logo_url"),
		description: text("description"),
		website: text("website"),
		size: companySizeEnum("size"),
		industry: varchar("industry", { length: 128 }),
		coverUrl: text("cover_url"),
		tagline: varchar("tagline", { length: 256 }),
		headquarters: varchar("headquarters", { length: 256 }),
		founded: integer("founded"),
		verifiedAt: timestamp("verified_at"),
		lastSlugChangeAt: timestamp("last_slug_change_at"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(t) => [
		uniqueIndex("companies_slug_idx").on(t.slug),
		index("companies_domain_idx").on(t.domain),
		index("companies_name_trgm_idx").using("gin", sql`${t.name} gin_trgm_ops`),
		index("companies_fts_idx").using(
			"gin",
			sql`(
        setweight(to_tsvector('english', coalesce(${t.name}, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(${t.industry}, '')), 'B')
      )`,
		),
	],
);

export const companyMembers = pgTable(
	"company_members",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		companyId: text("company_id")
			.notNull()
			.references(() => companies.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		role: companyMemberRoleEnum("role").notNull().default("member"),
		verificationMethod: verificationMethodEnum("verification_method"),
		verifiedAt: timestamp("verified_at"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [
		uniqueIndex("company_members_company_user_idx").on(t.companyId, t.userId),
		index("company_members_company_idx").on(t.companyId),
		index("company_members_user_idx").on(t.userId),
	],
);

export const companyFollows = pgTable(
	"company_follows",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		companyId: text("company_id")
			.notNull()
			.references(() => companies.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [
		uniqueIndex("company_follows_user_company_idx").on(t.userId, t.companyId),
		index("company_follows_company_idx").on(t.companyId),
	],
);

export const emailVerifications = pgTable(
	"email_verifications",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		email: varchar("email", { length: 256 }).notNull(),
		otp: varchar("otp", { length: 8 }).notNull(),
		companyId: text("company_id")
			.notNull()
			.references(() => companies.id, { onDelete: "cascade" }),
		experienceId: text("experience_id").references(() => experiences.id, {
			onDelete: "set null",
		}),
		expiresAt: timestamp("expires_at").notNull(),
		verifiedAt: timestamp("verified_at"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [index("email_verifications_user_idx").on(t.userId)],
);

export const experiences = pgTable(
	"experiences",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		company: varchar("company", { length: 256 }).notNull(),
		title: varchar("title", { length: 256 }).notNull(),
		location: varchar("location", { length: 256 }),
		startDate: timestamp("start_date").notNull(),
		endDate: timestamp("end_date"),
		current: boolean("current").notNull().default(false),
		description: text("description"),
		companyId: text("company_id").references(() => companies.id, {
			onDelete: "set null",
		}),
		verificationStatus: experienceVerificationStatusEnum("verification_status")
			.notNull()
			.default("unverified"),
		verificationMethod: verificationMethodEnum("verification_method"),
		verifiedAt: timestamp("verified_at"),
		disputedAt: timestamp("disputed_at"),
		disputeReason: varchar("dispute_reason", { length: 512 }),
		ordering: integer("ordering").notNull().default(0),
	},
	(t) => [
		index("experiences_user_id_idx").on(t.userId),
		index("experiences_company_id_idx").on(t.companyId),
	],
);

export const skills = pgTable(
	"skills",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 128 }).notNull(),
		ordering: integer("ordering").notNull().default(0),
	},
	(t) => [
		index("skills_user_id_idx").on(t.userId),
		uniqueIndex("skills_user_name_idx").on(t.userId, t.name),
		// Trigram index for "did you mean?" vocabulary and skill autocomplete
		index("skills_name_trgm_idx").using("gin", sql`${t.name} gin_trgm_ops`),
	],
);

export const educations = pgTable(
	"educations",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		school: varchar("school", { length: 256 }).notNull(),
		degree: varchar("degree", { length: 256 }),
		field: varchar("field", { length: 256 }),
		startDate: timestamp("start_date"),
		endDate: timestamp("end_date"),
		description: text("description"),
		ordering: integer("ordering").notNull().default(0),
	},
	(t) => [index("educations_user_id_idx").on(t.userId)],
);

export const certifications = pgTable(
	"certifications",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 256 }).notNull(),
		organization: varchar("organization", { length: 256 }).notNull(),
		issueDate: timestamp("issue_date"),
		expirationDate: timestamp("expiration_date"),
		credentialId: varchar("credential_id", { length: 256 }),
		credentialUrl: text("credential_url"),
		ordering: integer("ordering").notNull().default(0),
	},
	(t) => [index("certifications_user_id_idx").on(t.userId)],
);

export const projects = pgTable(
	"projects",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 256 }).notNull(),
		description: text("description"),
		url: text("url"),
		startDate: timestamp("start_date"),
		endDate: timestamp("end_date"),
		mediaUrls: json("media_urls").$type<string[]>().default([]),
		ordering: integer("ordering").notNull().default(0),
	},
	(t) => [index("projects_user_id_idx").on(t.userId)],
);

export const volunteering = pgTable(
	"volunteering",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		organization: varchar("organization", { length: 256 }).notNull(),
		role: varchar("role", { length: 256 }).notNull(),
		cause: varchar("cause", { length: 256 }),
		startDate: timestamp("start_date"),
		endDate: timestamp("end_date"),
		description: text("description"),
		ordering: integer("ordering").notNull().default(0),
	},
	(t) => [index("volunteering_user_id_idx").on(t.userId)],
);

export const honors = pgTable(
	"honors",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		title: varchar("title", { length: 256 }).notNull(),
		issuer: varchar("issuer", { length: 256 }),
		issueDate: timestamp("issue_date"),
		description: text("description"),
		ordering: integer("ordering").notNull().default(0),
	},
	(t) => [index("honors_user_id_idx").on(t.userId)],
);

export const languages = pgTable(
	"languages",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 128 }).notNull(),
		proficiency: varchar("proficiency", { length: 64 }),
		ordering: integer("ordering").notNull().default(0),
	},
	(t) => [
		index("languages_user_id_idx").on(t.userId),
		uniqueIndex("languages_user_name_idx").on(t.userId, t.name),
	],
);

export const featuredItems = pgTable(
	"featured_items",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		title: varchar("title", { length: 256 }).notNull(),
		description: text("description"),
		url: text("url"),
		imageUrl: text("image_url"),
		ordering: integer("ordering").notNull().default(0),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [index("featured_items_user_id_idx").on(t.userId)],
);

export const connections = pgTable(
	"connections",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		requesterId: text("requester_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		addresseeId: text("addressee_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		status: connectionStatusEnum("status").notNull().default("pending"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [
		index("connections_requester_idx").on(t.requesterId),
		index("connections_addressee_idx").on(t.addresseeId),
		uniqueIndex("connections_pair_idx").on(t.requesterId, t.addresseeId),
	],
);

export const follows = pgTable(
	"follows",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		followerId: text("follower_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		followedId: text("followed_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [
		index("follows_follower_idx").on(t.followerId),
		index("follows_followed_idx").on(t.followedId),
		uniqueIndex("follows_pair_idx").on(t.followerId, t.followedId),
	],
);

export const posts = pgTable(
	"posts",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		authorId: text("author_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		content: text("content").notNull(),
		contentFormat: postContentFormatEnum("content_format")
			.notNull()
			.default("plain"),
		contentHtml: text("content_html"),
		mediaUrls: json("media_urls").$type<string[]>().default([]),
		visibility: postVisibilityEnum("visibility").notNull().default("public"),
		qualityScore: real("quality_score").notNull().default(1.0),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
		deletedAt: timestamp("deleted_at"),
		repostOfId: text("repost_of_id").references((): AnyPgColumn => posts.id, {
			onDelete: "cascade",
		}),
		quotedPostId: text("quoted_post_id").references(
			(): AnyPgColumn => posts.id,
			{
				onDelete: "set null",
			},
		),
		companyId: text("company_id").references(() => companies.id, {
			onDelete: "set null",
		}),
	},
	(t) => [
		index("posts_author_idx").on(t.authorId),
		index("posts_company_id_idx").on(t.companyId),
		index("posts_created_at_idx").on(t.createdAt),
		index("posts_quality_created_idx").on(t.qualityScore, t.createdAt),
		index("posts_repost_of_idx").on(t.repostOfId),
		// FTS on post content
		index("posts_fts_idx").using(
			"gin",
			sql`to_tsvector('english', ${t.content})`,
		),
	],
);

export const reactions = pgTable(
	"reactions",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		postId: text("post_id")
			.notNull()
			.references(() => posts.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		type: reactionTypeEnum("type").notNull(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [
		index("reactions_post_idx").on(t.postId),
		uniqueIndex("reactions_post_user_idx").on(t.postId, t.userId),
	],
);

export const comments = pgTable(
	"comments",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		postId: text("post_id")
			.notNull()
			.references(() => posts.id, { onDelete: "cascade" }),
		authorId: text("author_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		parentId: text("parent_id"),
		content: text("content").notNull(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
		deletedAt: timestamp("deleted_at"),
	},
	(t) => [
		index("comments_post_idx").on(t.postId),
		index("comments_author_idx").on(t.authorId),
		index("comments_parent_idx").on(t.parentId),
	],
);

export const commentReactions = pgTable(
	"comment_reactions",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		commentId: text("comment_id")
			.notNull()
			.references(() => comments.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		type: reactionTypeEnum("type").notNull(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [
		index("comment_reactions_comment_idx").on(t.commentId),
		uniqueIndex("comment_reactions_comment_user_idx").on(t.commentId, t.userId),
	],
);

export const jobs = pgTable(
	"jobs",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		posterId: text("poster_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		title: varchar("title", { length: 256 }).notNull(),
		company: varchar("company", { length: 256 }).notNull(),
		location: varchar("location", { length: 256 }),
		remote: jobRemoteEnum("remote").notNull().default("onsite"),
		salaryMin: integer("salary_min").notNull(),
		salaryMax: integer("salary_max").notNull(),
		currency: varchar("currency", { length: 3 }).notNull().default("USD"),
		description: text("description").notNull(),
		tags: json("tags").$type<string[]>().default([]),
		status: jobStatusEnum("status").notNull().default("open"),
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		companyId: text("company_id").references(() => companies.id, {
			onDelete: "set null",
		}),
		applyUrl: text("apply_url"),
		experienceLevel: jobExperienceLevelEnum("experience_level"),
		jobType: jobTypeEnum("job_type"),
	},
	(t) => [
		index("jobs_poster_idx").on(t.posterId),
		index("jobs_company_id_idx").on(t.companyId),
		index("jobs_status_idx").on(t.status),
		index("jobs_created_at_idx").on(t.createdAt),
		// FTS: title (weight A) + company (B) + description (C) + location (C)
		index("jobs_fts_idx").using(
			"gin",
			sql`(
				setweight(to_tsvector('english', coalesce(${t.title}, '')), 'A') ||
				setweight(to_tsvector('english', coalesce(${t.company}, '')), 'B') ||
				setweight(to_tsvector('english', coalesce(${t.description}, '')), 'C') ||
				setweight(to_tsvector('english', coalesce(${t.location}, '')), 'C')
			)`,
		),
		// Trigram indexes for autocomplete
		index("jobs_title_trgm_idx").using("gin", sql`${t.title} gin_trgm_ops`),
		index("jobs_company_trgm_idx").using("gin", sql`${t.company} gin_trgm_ops`),
	],
);

export const savedJobs = pgTable(
	"saved_jobs",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		jobId: text("job_id")
			.notNull()
			.references(() => jobs.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [
		uniqueIndex("saved_jobs_user_job_idx").on(t.userId, t.jobId),
		index("saved_jobs_user_idx").on(t.userId),
	],
);

export const jobApplications = pgTable(
	"job_applications",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		jobId: text("job_id")
			.notNull()
			.references(() => jobs.id, { onDelete: "cascade" }),
		applicantId: text("applicant_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		message: text("message"),
		status: applicationStatusEnum("status").notNull().default("applied"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [
		index("job_applications_job_idx").on(t.jobId),
		index("job_applications_applicant_idx").on(t.applicantId),
		uniqueIndex("job_applications_job_applicant_idx").on(
			t.jobId,
			t.applicantId,
		),
	],
);

export const conversations = pgTable("conversations", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	type: conversationTypeEnum("type").notNull().default("direct"),
	name: varchar("name", { length: 128 }),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const conversationMembers = pgTable(
	"conversation_members",
	{
		conversationId: text("conversation_id")
			.notNull()
			.references(() => conversations.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		joinedAt: timestamp("joined_at").notNull().defaultNow(),
		lastReadAt: timestamp("last_read_at"),
		mutedAt: timestamp("muted_at"),
		archivedAt: timestamp("archived_at"),
		leftAt: timestamp("left_at"),
	},
	(t) => [
		uniqueIndex("conversation_members_pk").on(t.conversationId, t.userId),
		index("conversation_members_user_idx").on(t.userId),
	],
);

export const messages = pgTable(
	"messages",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		conversationId: text("conversation_id")
			.notNull()
			.references(() => conversations.id, { onDelete: "cascade" }),
		senderId: text("sender_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		content: text("content").notNull(),
		mediaUrls: json("media_urls").$type<string[]>().default([]),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		deletedAt: timestamp("deleted_at"),
	},
	(t) => [
		index("messages_conversation_idx").on(t.conversationId),
		index("messages_sender_idx").on(t.senderId),
		index("messages_created_at_idx").on(t.createdAt),
	],
);

export const notifications = pgTable(
	"notifications",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		type: notificationTypeEnum("type").notNull(),
		actorId: text("actor_id").references(() => users.id, {
			onDelete: "set null",
		}),
		entityId: text("entity_id"),
		entityType: varchar("entity_type", { length: 64 }),
		read: boolean("read").notNull().default(false),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [
		index("notifications_user_idx").on(t.userId),
		index("notifications_user_read_idx").on(t.userId, t.read),
	],
);

export const pushTokens = pgTable(
	"push_tokens",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		platform: pushPlatformEnum("platform").notNull(),
		token: text("token").notNull().unique(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [index("push_tokens_user_idx").on(t.userId)],
);

export const moderationQueue = pgTable(
	"moderation_queue",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		entityId: text("entity_id").notNull(),
		entityType: varchar("entity_type", { length: 64 }).notNull(),
		reportedBy: text("reported_by")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		reason: text("reason"),
		status: moderationStatusEnum("status").notNull().default("pending"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [
		index("moderation_queue_status_idx").on(t.status),
		index("moderation_queue_entity_idx").on(t.entityId, t.entityType),
	],
);

export const hiddenPosts = pgTable(
	"hidden_posts",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		postId: text("post_id")
			.notNull()
			.references(() => posts.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [
		uniqueIndex("hidden_posts_user_post_idx").on(t.userId, t.postId),
		index("hidden_posts_user_idx").on(t.userId),
	],
);

export const mutedAuthors = pgTable(
	"muted_authors",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		mutedUserId: text("muted_user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [
		uniqueIndex("muted_authors_user_muted_idx").on(t.userId, t.mutedUserId),
		index("muted_authors_user_idx").on(t.userId),
	],
);

export const savedPosts = pgTable(
	"saved_posts",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		postId: text("post_id")
			.notNull()
			.references(() => posts.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [
		uniqueIndex("saved_posts_user_post_idx").on(t.userId, t.postId),
		index("saved_posts_user_idx").on(t.userId),
	],
);

export const feedEvents = pgTable(
	"feed_events",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		postId: text("post_id")
			.notNull()
			.references(() => posts.id, { onDelete: "cascade" }),
		action: feedActionEnum("action").notNull(),
		dwellBucket: dwellBucketEnum("dwell_bucket"),
		sessionId: text("session_id"),
		feedPosition: integer("feed_position"),
		feedMode: feedModeEnum("feed_mode"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [
		index("feed_events_user_idx").on(t.userId),
		index("feed_events_post_idx").on(t.postId),
		index("feed_events_user_action_idx").on(t.userId, t.action),
		index("feed_events_session_idx").on(t.sessionId),
		index("feed_events_created_at_idx").on(t.createdAt),
	],
);

export const feedImpressions = pgTable(
	"feed_impressions",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		sessionId: text("session_id").notNull(),
		postIds: json("post_ids").$type<string[]>().notNull(),
		rankingScores: json("ranking_scores").$type<number[]>(),
		rankingStage: rankingStageEnum("ranking_stage")
			.notNull()
			.default("rule_v1"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [
		index("feed_impressions_user_idx").on(t.userId),
		index("feed_impressions_session_idx").on(t.sessionId),
		index("feed_impressions_created_at_idx").on(t.createdAt),
	],
);

export const userPreferences = pgTable("user_preferences", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => users.id, { onDelete: "cascade" }),
	feedMode: feedModeEnum("feed_mode").notNull().default("ranked"),
	aiConsentFeedPersonalization: boolean("ai_consent_feed_personalization")
		.notNull()
		.default(false),
	aiConsentContentModeration: boolean("ai_consent_content_moderation")
		.notNull()
		.default(false),
	aiConsentJobMatching: boolean("ai_consent_job_matching")
		.notNull()
		.default(false),
	dismissedBanners: json("dismissed_banners").$type<string[]>().default([]),
	showImpressionCount: boolean("show_impression_count").notNull().default(true),
	shareLocationInAnalytics: boolean("share_location_in_analytics")
		.notNull()
		.default(true),
	showReadReceipts: boolean("show_read_receipts").notNull().default(false),
	emailNotifConnectionRequests: boolean("email_notif_connection_requests")
		.notNull()
		.default(true),
	emailNotifComments: boolean("email_notif_comments").notNull().default(true),
	emailNotifReactions: boolean("email_notif_reactions")
		.notNull()
		.default(false),
	emailNotifJobMatches: boolean("email_notif_job_matches")
		.notNull()
		.default(true),
	emailNotifMessages: boolean("email_notif_messages").notNull().default(true),
	emailNotifExperienceDisputed: boolean("email_notif_experience_disputed")
		.notNull()
		.default(true),
	inAppNotifConnections: boolean("in_app_notif_connections")
		.notNull()
		.default(true),
	inAppNotifComments: boolean("in_app_notif_comments").notNull().default(true),
	inAppNotifReactions: boolean("in_app_notif_reactions")
		.notNull()
		.default(true),
	inAppNotifJobMatches: boolean("in_app_notif_job_matches")
		.notNull()
		.default(true),
	inAppNotifMessages: boolean("in_app_notif_messages").notNull().default(true),
	inAppNotifExperienceDisputed: boolean("in_app_notif_experience_disputed")
		.notNull()
		.default(true),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mlModelStatusEnum = pgEnum("ml_model_status", [
	"training",
	"evaluating",
	"active",
	"rolled_back",
	"retired",
]);

export const mlModels = pgTable(
	"ml_models",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		version: varchar("version", { length: 32 }).notNull().unique(),
		stage: rankingStageEnum("stage").notNull().default("ml_v1"),
		status: mlModelStatusEnum("status").notNull().default("training"),
		artifactPath: text("artifact_path").notNull(),
		metaJson: json("meta_json"),
		trainRows: integer("train_rows"),
		evalNdcg: real("eval_ndcg"),
		skipAuc: real("skip_auc"),
		hideRateDelta: real("hide_rate_delta"),
		muteRateDelta: real("mute_rate_delta"),
		skipRateDelta: real("skip_rate_delta"),
		saveRateDelta: real("save_rate_delta"),
		activatedAt: timestamp("activated_at"),
		retiredAt: timestamp("retired_at"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [index("ml_models_status_idx").on(t.status)],
);

export const usersRelations = relations(users, ({ one, many }) => ({
	profile: one(profiles, {
		fields: [users.id],
		references: [profiles.userId],
	}),
	preferences: one(userPreferences, {
		fields: [users.id],
		references: [userPreferences.userId],
	}),
	sessions: many(sessions),
	accounts: many(accounts),
	experiences: many(experiences),
	skills: many(skills),
	educations: many(educations),
	certifications: many(certifications),
	projects: many(projects),
	volunteering: many(volunteering),
	honors: many(honors),
	languages: many(languages),
	featuredItems: many(featuredItems),
	posts: many(posts),
	notifications: many(notifications),
	pushTokens: many(pushTokens),
	feedEvents: many(feedEvents),
	feedImpressions: many(feedImpressions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
	user: one(users, { fields: [profiles.userId], references: [users.id] }),
}));

export const experiencesRelations = relations(experiences, ({ one }) => ({
	user: one(users, { fields: [experiences.userId], references: [users.id] }),
	company: one(companies, {
		fields: [experiences.companyId],
		references: [companies.id],
	}),
}));

export const skillsRelations = relations(skills, ({ one }) => ({
	user: one(users, { fields: [skills.userId], references: [users.id] }),
}));

export const educationsRelations = relations(educations, ({ one }) => ({
	user: one(users, { fields: [educations.userId], references: [users.id] }),
}));

export const certificationsRelations = relations(certifications, ({ one }) => ({
	user: one(users, {
		fields: [certifications.userId],
		references: [users.id],
	}),
}));

export const projectsRelations = relations(projects, ({ one }) => ({
	user: one(users, { fields: [projects.userId], references: [users.id] }),
}));

export const volunteeringRelations = relations(volunteering, ({ one }) => ({
	user: one(users, { fields: [volunteering.userId], references: [users.id] }),
}));

export const honorsRelations = relations(honors, ({ one }) => ({
	user: one(users, { fields: [honors.userId], references: [users.id] }),
}));

export const languagesRelations = relations(languages, ({ one }) => ({
	user: one(users, { fields: [languages.userId], references: [users.id] }),
}));

export const featuredItemsRelations = relations(featuredItems, ({ one }) => ({
	user: one(users, {
		fields: [featuredItems.userId],
		references: [users.id],
	}),
}));

export const connectionsRelations = relations(connections, ({ one }) => ({
	requester: one(users, {
		fields: [connections.requesterId],
		references: [users.id],
		relationName: "sentConnections",
	}),
	addressee: one(users, {
		fields: [connections.addresseeId],
		references: [users.id],
		relationName: "receivedConnections",
	}),
}));

export const followsRelations = relations(follows, ({ one }) => ({
	follower: one(users, {
		fields: [follows.followerId],
		references: [users.id],
		relationName: "following",
	}),
	followed: one(users, {
		fields: [follows.followedId],
		references: [users.id],
		relationName: "followers",
	}),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
	author: one(users, { fields: [posts.authorId], references: [users.id] }),
	reactions: many(reactions),
	comments: many(comments),
}));

export const reactionsRelations = relations(reactions, ({ one }) => ({
	post: one(posts, { fields: [reactions.postId], references: [posts.id] }),
	user: one(users, { fields: [reactions.userId], references: [users.id] }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
	post: one(posts, { fields: [comments.postId], references: [posts.id] }),
	author: one(users, { fields: [comments.authorId], references: [users.id] }),
	parent: one(comments, {
		fields: [comments.parentId],
		references: [comments.id],
		relationName: "replies",
	}),
	replies: many(comments, { relationName: "replies" }),
	reactions: many(commentReactions),
}));

export const commentReactionsRelations = relations(
	commentReactions,
	({ one }) => ({
		comment: one(comments, {
			fields: [commentReactions.commentId],
			references: [comments.id],
		}),
		user: one(users, {
			fields: [commentReactions.userId],
			references: [users.id],
		}),
	}),
);

export const jobsRelations = relations(jobs, ({ one, many }) => ({
	poster: one(users, { fields: [jobs.posterId], references: [users.id] }),
	applications: many(jobApplications),
	company: one(companies, {
		fields: [jobs.companyId],
		references: [companies.id],
	}),
	savedJobs: many(savedJobs),
}));

export const jobApplicationsRelations = relations(
	jobApplications,
	({ one }) => ({
		job: one(jobs, {
			fields: [jobApplications.jobId],
			references: [jobs.id],
		}),
		applicant: one(users, {
			fields: [jobApplications.applicantId],
			references: [users.id],
		}),
	}),
);

export const conversationsRelations = relations(conversations, ({ many }) => ({
	members: many(conversationMembers),
	messages: many(messages),
}));

export const conversationMembersRelations = relations(
	conversationMembers,
	({ one }) => ({
		conversation: one(conversations, {
			fields: [conversationMembers.conversationId],
			references: [conversations.id],
		}),
		user: one(users, {
			fields: [conversationMembers.userId],
			references: [users.id],
		}),
	}),
);

export const messagesRelations = relations(messages, ({ one }) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id],
	}),
	sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id],
	}),
	actor: one(users, {
		fields: [notifications.actorId],
		references: [users.id],
		relationName: "actedNotifications",
	}),
}));

export const pushTokensRelations = relations(pushTokens, ({ one }) => ({
	user: one(users, { fields: [pushTokens.userId], references: [users.id] }),
}));

export const userPreferencesRelations = relations(
	userPreferences,
	({ one }) => ({
		user: one(users, {
			fields: [userPreferences.userId],
			references: [users.id],
		}),
	}),
);

export const hiddenPostsRelations = relations(hiddenPosts, ({ one }) => ({
	user: one(users, { fields: [hiddenPosts.userId], references: [users.id] }),
	post: one(posts, { fields: [hiddenPosts.postId], references: [posts.id] }),
}));

export const mutedAuthorsRelations = relations(mutedAuthors, ({ one }) => ({
	user: one(users, {
		fields: [mutedAuthors.userId],
		references: [users.id],
		relationName: "muter",
	}),
	mutedUser: one(users, {
		fields: [mutedAuthors.mutedUserId],
		references: [users.id],
		relationName: "muted",
	}),
}));

export const savedPostsRelations = relations(savedPosts, ({ one }) => ({
	user: one(users, { fields: [savedPosts.userId], references: [users.id] }),
	post: one(posts, { fields: [savedPosts.postId], references: [posts.id] }),
}));

export const feedEventsRelations = relations(feedEvents, ({ one }) => ({
	user: one(users, { fields: [feedEvents.userId], references: [users.id] }),
	post: one(posts, { fields: [feedEvents.postId], references: [posts.id] }),
}));

export const feedImpressionsRelations = relations(
	feedImpressions,
	({ one }) => ({
		user: one(users, {
			fields: [feedImpressions.userId],
			references: [users.id],
		}),
	}),
);

export type ExperienceVerificationStatus =
	(typeof experienceVerificationStatusEnum.enumValues)[number];

export type Experience = typeof experiences.$inferSelect;
export type Education = typeof educations.$inferSelect;
export type Certification = typeof certifications.$inferSelect;
export type Language = typeof languages.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Honor = typeof honors.$inferSelect;
export type VolunteeringEntry = typeof volunteering.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Article = typeof articles.$inferSelect;

export const moderationQueueRelations = relations(
	moderationQueue,
	({ one }) => ({
		reporter: one(users, {
			fields: [moderationQueue.reportedBy],
			references: [users.id],
		}),
	}),
);

export const emailVerificationsRelations = relations(
	emailVerifications,
	({ one }) => ({
		user: one(users, {
			fields: [emailVerifications.userId],
			references: [users.id],
		}),
		company: one(companies, {
			fields: [emailVerifications.companyId],
			references: [companies.id],
		}),
		experience: one(experiences, {
			fields: [emailVerifications.experienceId],
			references: [experiences.id],
		}),
	}),
);

export const companiesRelations = relations(companies, ({ many }) => ({
	members: many(companyMembers),
	jobs: many(jobs),
	experiences: many(experiences),
	follows: many(companyFollows),
}));

export const companyMembersRelations = relations(companyMembers, ({ one }) => ({
	company: one(companies, {
		fields: [companyMembers.companyId],
		references: [companies.id],
	}),
	user: one(users, { fields: [companyMembers.userId], references: [users.id] }),
}));

export const companyFollowsRelations = relations(companyFollows, ({ one }) => ({
	user: one(users, { fields: [companyFollows.userId], references: [users.id] }),
	company: one(companies, {
		fields: [companyFollows.companyId],
		references: [companies.id],
	}),
}));

export const savedJobsRelations = relations(savedJobs, ({ one }) => ({
	user: one(users, { fields: [savedJobs.userId], references: [users.id] }),
	job: one(jobs, { fields: [savedJobs.jobId], references: [jobs.id] }),
}));

// ── Polls ──

export const polls = pgTable(
	"polls",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		postId: text("post_id")
			.notNull()
			.unique()
			.references(() => posts.id, { onDelete: "cascade" }),
		endsAt: timestamp("ends_at").notNull(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [index("polls_post_id_idx").on(t.postId)],
);

export const pollOptions = pgTable(
	"poll_options",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		pollId: text("poll_id")
			.notNull()
			.references(() => polls.id, { onDelete: "cascade" }),
		text: varchar("text", { length: 140 }).notNull(),
		position: integer("position").notNull(),
	},
	(t) => [index("poll_options_poll_id_idx").on(t.pollId)],
);

export const pollVotes = pgTable(
	"poll_votes",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		pollId: text("poll_id")
			.notNull()
			.references(() => polls.id, { onDelete: "cascade" }),
		optionId: text("option_id")
			.notNull()
			.references(() => pollOptions.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [
		uniqueIndex("poll_votes_poll_user_idx").on(t.pollId, t.userId),
		index("poll_votes_option_id_idx").on(t.optionId),
	],
);

// ── Events ──

export const events = pgTable(
	"events",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		postId: text("post_id")
			.notNull()
			.unique()
			.references(() => posts.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 256 }).notNull(),
		description: text("description"),
		coverImageUrl: text("cover_image_url"),
		startAt: timestamp("start_at").notNull(),
		endAt: timestamp("end_at"),
		timezone: varchar("timezone", { length: 64 }).notNull(),
		eventType: eventTypeEnum("event_type").notNull(),
		location: varchar("location", { length: 256 }),
		locationLat: doublePrecision("location_lat"),
		locationLon: doublePrecision("location_lon"),
		externalUrl: text("external_url"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [index("events_post_id_idx").on(t.postId)],
);

export const articles = pgTable(
	"articles",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		postId: text("post_id")
			.notNull()
			.unique()
			.references(() => posts.id, { onDelete: "cascade" }),
		title: varchar("title", { length: 256 }).notNull(),
		subtitle: varchar("subtitle", { length: 512 }),
		slug: varchar("slug", { length: 512 }).notNull().unique(),
		coverImageUrl: text("cover_image_url"),
		bodyJson: json("body_json").$type<Record<string, {}>>().notNull(),
		bodyHtml: text("body_html").notNull(),
		readingTimeMinutes: integer("reading_time_minutes").notNull().default(1),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(t) => [index("articles_post_id_idx").on(t.postId)],
);
