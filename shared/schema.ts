import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";
export * from "./models/chat";

// Operational Domains (the 10 areas of the framework)
export const domains = pgTable("domains", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  icon: text("icon").notNull(), // lucide icon name
  sequenceOrder: integer("sequence_order").notNull(),
});

// Framework Content (principles, outputs, guidance within each domain)
export const frameworkContent = pgTable("framework_content", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id").notNull().references(() => domains.id),
  title: text("title").notNull(),
  contentType: text("content_type").notNull(), // 'principle', 'output', 'checklist', 'script'
  content: text("content").notNull(),
  sequenceOrder: integer("sequence_order").notNull(),
});

// User bookmarks/favorites
export const userBookmarks = pgTable("user_bookmarks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  contentId: integer("content_id").notNull().references(() => frameworkContent.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Training Templates (real examples from Mouton's Bistro)
export const trainingTemplates = pgTable("training_templates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(), // 'server' or 'kitchen'
  section: text("section").notNull(), // e.g., 'Day 1: Orientation', 'Policies'
  contentType: text("content_type").notNull(), // 'overview', 'checklist', 'procedure', 'assessment'
  content: text("content").notNull(),
  keyPoints: text("key_points").array(),
  sequenceOrder: integer("sequence_order").notNull(),
});

// Financial Documents (uploaded sales reports, P&L, etc.)
export const financialDocuments = pgTable("financial_documents", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  docType: text("doc_type").notNull(), // 'sales_report', 'pl_statement', 'labor_report', 'inventory', 'other'
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  status: text("status").notNull().default("processing"), // 'processing', 'ready', 'failed'
  periodStart: text("period_start"), // YYYY-MM format
  periodEnd: text("period_end"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Financial Extracts (parsed data from documents)
export const financialExtracts = pgTable("financial_extracts", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => financialDocuments.id),
  rawText: text("raw_text"),
  structuredMetrics: jsonb("structured_metrics"), // JSON with parsed financial data
  summary: text("summary"), // AI-generated summary of the document
  errorMessage: text("error_message"),
  processedAt: timestamp("processed_at").defaultNow(),
});

// Financial Chat Messages (Q&A about documents)
export const financialMessages = pgTable("financial_messages", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  documentId: integer("document_id").references(() => financialDocuments.id), // null = general financial chat
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Staff Positions (roles like Server, Bartender, Host, etc.)
export const staffPositions = pgTable("staff_positions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#3B82F6"), // hex color for display
  department: text("department").notNull().default("FOH"), // FOH or BOH
  createdAt: timestamp("created_at").defaultNow(),
});

// Staff Members (employees)
export const staffMembers = pgTable("staff_members", {
  id: serial("id").primaryKey(),
  userId: text("user_id"), // links to auth user if they have an account
  ownerId: text("owner_id"), // the subscription owner who created this staff member
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  positionId: integer("position_id").references(() => staffPositions.id),
  hourlyRate: text("hourly_rate"), // stored as string to avoid float precision issues (e.g. "15.50")
  status: text("status").notNull().default("active"), // active, inactive, terminated
  hireDate: text("hire_date"), // YYYY-MM-DD
  // Employee portal auth fields
  inviteToken: text("invite_token").unique(), // unique token for invite link
  inviteStatus: text("invite_status").default("none"), // none, pending, accepted
  inviteSentAt: timestamp("invite_sent_at"),
  inviteAcceptedAt: timestamp("invite_accepted_at"),
  passwordHash: text("password_hash"), // bcrypt hash for employee login
  createdAt: timestamp("created_at").defaultNow(),
});

// Shifts (scheduled work times)
export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  staffMemberId: integer("staff_member_id").references(() => staffMembers.id),
  positionId: integer("position_id").references(() => staffPositions.id),
  date: text("date").notNull(), // YYYY-MM-DD
  startTime: text("start_time").notNull(), // HH:MM (24hr)
  endTime: text("end_time").notNull(), // HH:MM (24hr)
  status: text("status").notNull().default("scheduled"), // scheduled, open, completed, no_show
  notes: text("notes"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Shift Applications (for open shifts)
export const shiftApplications = pgTable("shift_applications", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").notNull().references(() => shifts.id),
  staffMemberId: integer("staff_member_id").notNull().references(() => staffMembers.id),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  appliedAt: timestamp("applied_at").defaultNow(),
});

// Staff Announcements
export const staffAnnouncements = pgTable("staff_announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  priority: text("priority").notNull().default("normal"), // low, normal, high, urgent
  createdBy: text("created_by").notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Announcement Read Status
export const announcementReads = pgTable("announcement_reads", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcement_id").notNull().references(() => staffAnnouncements.id),
  userId: text("user_id").notNull(),
  readAt: timestamp("read_at").defaultNow(),
});

// Social Media Content Library - Folders
export const socialMediaFolders = pgTable("social_media_folders", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Social Media Content Library - Assets (photos/videos)
export const socialMediaAssets = pgTable("social_media_assets", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  folderId: integer("folder_id").references(() => socialMediaFolders.id),
  fileUrl: text("file_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  tags: text("tags").array(),
  orientation: text("orientation"), // square, portrait, landscape
  season: text("season"), // spring, summer, fall, winter
  notes: text("notes"),
  usageCount: integer("usage_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Brand Voice Settings
export const brandVoiceSettings = pgTable("brand_voice_settings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  voiceAdjectives: text("voice_adjectives").array(), // warm, confident, welcoming, premium, playful
  defaultCta: text("default_cta").default("reserve"), // reserve, walk-ins, order online
  neverSayList: text("never_say_list").array(), // words to avoid
  emojiLevel: text("emoji_level").default("light"), // none, light, normal
  hashtagStyle: text("hashtag_style").default("minimal"), // none, minimal, local-focused
  restaurantName: text("restaurant_name"),
  location: text("location"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Social Media Posts (saved drafts and generated posts)
export const socialMediaPosts = pgTable("social_media_posts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  postType: text("post_type").notNull(), // event_promo, special, menu_feature, live_music, happy_hour, catering, hiring, community, tonight_vibe, holiday
  platforms: text("platforms").array(), // instagram_feed, instagram_story, facebook, google_business
  outputStyle: text("output_style"), // short_punchy, warm_hospitality, premium, straight_info
  eventName: text("event_name"),
  eventDate: text("event_date"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  promotionDetails: text("promotion_details"),
  targetAudience: text("target_audience"), // date_night, families, lunch_crowd, bar_crowd, music_lovers, brunch
  tone: text("tone"), // fun, classy, high_energy, low_key, community
  cta: text("cta"), // reserve_now, walk_ins, order_online, call_to_book, rsvp, come_early
  selectedAssetIds: integer("selected_asset_ids").array(),
  holidayName: text("holiday_name"),
  generatedCaption: text("generated_caption"),
  shortCaption: text("short_caption"),
  storyOverlays: text("story_overlays").array(),
  hashtags: text("hashtags").array(),
  suggestedPostTime: text("suggested_post_time"),
  replyPack: text("reply_pack").array(),
  status: text("status").default("draft"), // draft, scheduled, posted
  scheduledFor: timestamp("scheduled_for"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Restaurant Holidays / National Days
export const restaurantHolidays = pgTable("restaurant_holidays", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: text("date").notNull(), // MM-DD format for recurring
  category: text("category").notNull(), // food, hospitality, community, family, sports
  suggestedAngle: text("suggested_angle"),
  suggestedTags: text("suggested_tags").array(),
  relevanceScore: integer("relevance_score").default(5), // 1-10
});

export const insertDomainSchema = createInsertSchema(domains).omit({ id: true });
export const insertFrameworkContentSchema = createInsertSchema(frameworkContent).omit({ id: true });
export const insertUserBookmarkSchema = createInsertSchema(userBookmarks).omit({ id: true, createdAt: true });
export const insertTrainingTemplateSchema = createInsertSchema(trainingTemplates).omit({ id: true });
export const insertFinancialDocumentSchema = createInsertSchema(financialDocuments).omit({ id: true, uploadedAt: true });
export const insertFinancialExtractSchema = createInsertSchema(financialExtracts).omit({ id: true, processedAt: true });
export const insertFinancialMessageSchema = createInsertSchema(financialMessages).omit({ id: true, createdAt: true });
export const insertStaffPositionSchema = createInsertSchema(staffPositions).omit({ id: true, createdAt: true });
export const insertStaffMemberSchema = createInsertSchema(staffMembers).omit({ id: true, createdAt: true });
export const insertShiftSchema = createInsertSchema(shifts).omit({ id: true, createdAt: true });
export const insertShiftApplicationSchema = createInsertSchema(shiftApplications).omit({ id: true, appliedAt: true });
export const insertStaffAnnouncementSchema = createInsertSchema(staffAnnouncements).omit({ id: true, createdAt: true });
export const insertAnnouncementReadSchema = createInsertSchema(announcementReads).omit({ id: true, readAt: true });
// Connected Social Media Accounts (OAuth tokens for posting)
export const connectedAccounts = pgTable("connected_accounts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(), // 'facebook' | 'instagram' | 'google_business'
  providerAccountId: text("provider_account_id").notNull(), // page_id, ig_user_id, location_name
  displayName: text("display_name").notNull(),
  profilePictureUrl: text("profile_picture_url"),
  scopes: text("scopes").array(),
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  refreshTokenEncrypted: text("refresh_token_encrypted"),
  tokenExpiresAt: timestamp("token_expires_at"),
  meta: jsonb("meta"), // Additional provider-specific data (page_id, ig_user_id, etc.)
  status: text("status").notNull().default("active"), // 'active' | 'needs_reauth' | 'revoked'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Scheduled Social Media Posts
export const scheduledPosts = pgTable("scheduled_posts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  caption: text("caption").notNull(),
  platformTargets: integer("platform_targets").array(), // connected_accounts ids
  mediaUrls: text("media_urls").array(),
  scheduledFor: timestamp("scheduled_for"),
  status: text("status").notNull().default("draft"), // 'draft' | 'scheduled' | 'posting' | 'posted' | 'failed' | 'partial'
  postType: text("post_type"), // 'event' | 'promotion' | 'menu_feature' | etc.
  generatedContent: jsonb("generated_content"), // AI-generated content (hashtags, story overlays, etc.)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// HR Documents (stored signed discipline documents)
export const hrDocuments = pgTable("hr_documents", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  employeeName: text("employee_name").notNull(),
  employeePosition: text("employee_position"),
  issueType: text("issue_type").notNull(),
  disciplineLevel: text("discipline_level").notNull(), // first_warning, second_suspension, third_termination
  incidentDate: text("incident_date"),
  documentContent: text("document_content"), // generated HR document text
  scanFilename: text("scan_filename"), // uploaded scan filename
  scanOriginalName: text("scan_original_name"),
  scanMimeType: text("scan_mime_type"),
  scanFileSize: integer("scan_file_size"),
  signedAt: timestamp("signed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Post Results (per-platform posting results)
export const postResults = pgTable("post_results", {
  id: serial("id").primaryKey(),
  scheduledPostId: integer("scheduled_post_id").notNull().references(() => scheduledPosts.id),
  connectedAccountId: integer("connected_account_id").notNull().references(() => connectedAccounts.id),
  provider: text("provider").notNull(),
  providerPostId: text("provider_post_id"), // The ID returned by the platform
  status: text("status").notNull().default("pending"), // 'pending' | 'success' | 'failed'
  errorMessage: text("error_message"),
  rawResponse: jsonb("raw_response"),
  postedAt: timestamp("posted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSocialMediaFolderSchema = createInsertSchema(socialMediaFolders).omit({ id: true, createdAt: true });
export const insertSocialMediaAssetSchema = createInsertSchema(socialMediaAssets).omit({ id: true, createdAt: true });
export const insertBrandVoiceSettingsSchema = createInsertSchema(brandVoiceSettings).omit({ id: true, updatedAt: true });
export const insertSocialMediaPostSchema = createInsertSchema(socialMediaPosts).omit({ id: true, createdAt: true });
export const insertRestaurantHolidaySchema = createInsertSchema(restaurantHolidays).omit({ id: true });

export const insertConnectedAccountSchema = createInsertSchema(connectedAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertScheduledPostSchema = createInsertSchema(scheduledPosts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPostResultSchema = createInsertSchema(postResults).omit({ id: true, createdAt: true });
export const insertHRDocumentSchema = createInsertSchema(hrDocuments).omit({ id: true, createdAt: true });

export type Domain = typeof domains.$inferSelect;
export type FrameworkContent = typeof frameworkContent.$inferSelect;
export type UserBookmark = typeof userBookmarks.$inferSelect;
export type TrainingTemplate = typeof trainingTemplates.$inferSelect;
export type FinancialDocument = typeof financialDocuments.$inferSelect;
export type FinancialExtract = typeof financialExtracts.$inferSelect;
export type FinancialMessage = typeof financialMessages.$inferSelect;
export type StaffPosition = typeof staffPositions.$inferSelect;
export type StaffMember = typeof staffMembers.$inferSelect;
export type Shift = typeof shifts.$inferSelect;
export type ShiftApplication = typeof shiftApplications.$inferSelect;
export type StaffAnnouncement = typeof staffAnnouncements.$inferSelect;
export type AnnouncementRead = typeof announcementReads.$inferSelect;

export type InsertStaffPosition = z.infer<typeof insertStaffPositionSchema>;
export type InsertStaffMember = z.infer<typeof insertStaffMemberSchema>;
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type InsertShiftApplication = z.infer<typeof insertShiftApplicationSchema>;
export type InsertStaffAnnouncement = z.infer<typeof insertStaffAnnouncementSchema>;
export type SocialMediaFolder = typeof socialMediaFolders.$inferSelect;
export type SocialMediaAsset = typeof socialMediaAssets.$inferSelect;
export type BrandVoiceSettings = typeof brandVoiceSettings.$inferSelect;
export type SocialMediaPost = typeof socialMediaPosts.$inferSelect;
export type RestaurantHoliday = typeof restaurantHolidays.$inferSelect;
export type InsertSocialMediaFolder = z.infer<typeof insertSocialMediaFolderSchema>;
export type InsertSocialMediaAsset = z.infer<typeof insertSocialMediaAssetSchema>;
export type InsertBrandVoiceSettings = z.infer<typeof insertBrandVoiceSettingsSchema>;
export type InsertSocialMediaPost = z.infer<typeof insertSocialMediaPostSchema>;
export type InsertRestaurantHoliday = z.infer<typeof insertRestaurantHolidaySchema>;

export type ConnectedAccount = typeof connectedAccounts.$inferSelect;
export type ScheduledPost = typeof scheduledPosts.$inferSelect;
export type PostResult = typeof postResults.$inferSelect;
export type HRDocument = typeof hrDocuments.$inferSelect;
export type InsertConnectedAccount = z.infer<typeof insertConnectedAccountSchema>;
export type InsertScheduledPost = z.infer<typeof insertScheduledPostSchema>;
export type InsertPostResult = z.infer<typeof insertPostResultSchema>;
export type InsertHRDocument = z.infer<typeof insertHRDocumentSchema>;
