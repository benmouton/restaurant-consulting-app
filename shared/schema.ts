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

// Saved Ingredients (ingredient memory for food costing)
export const savedIngredients = pgTable("saved_ingredients", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  costPerUnit: text("cost_per_unit").notNull(), // stored as string to avoid precision issues
  unit: text("unit").notNull(), // 'lb', 'oz', 'each', 'case', 'gal', 'tbsp', 'cup'
  category: text("category").notNull().default("other"), // 'protein', 'produce', 'dairy', 'dry_goods', 'other'
  wasteBuffer: text("waste_buffer").default("0"), // percentage waste buffer (e.g., "5" for 5%)
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Saved Plates (menu items with calculated costs)
export const savedPlates = pgTable("saved_plates", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  ingredients: jsonb("ingredients").notNull(), // Array of { ingredientId, ingredientName, quantity, unit, cost }
  totalCost: text("total_cost").notNull(),
  menuPrice: text("menu_price"),
  foodCostPercent: text("food_cost_percent"),
  targetFoodCost: text("target_food_cost").default("28"),
  category: text("category"), // 'appetizer', 'entree', 'dessert', 'beverage', 'side'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Weekly Food Cost Tracking
export const foodCostPeriods = pgTable("food_cost_periods", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  periodType: text("period_type").notNull().default("week"), // 'week' or 'month'
  periodStart: text("period_start").notNull(), // YYYY-MM-DD
  periodEnd: text("period_end").notNull(),
  totalPurchases: text("total_purchases").notNull(), // what you paid for food
  totalSales: text("total_sales").notNull(), // food revenue
  actualFoodCostPercent: text("actual_food_cost_percent"),
  targetFoodCostPercent: text("target_food_cost_percent").default("28"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Organizations (groups of users who can share documents)
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id").notNull(), // the user who created this org
  createdAt: timestamp("created_at").defaultNow(),
});

// Organization Members (users who belong to an organization)
export const organizationMembers = pgTable("organization_members", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("member"), // 'owner' or 'member'
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Organization Invites (pending invitations)
export const organizationInvites = pgTable("organization_invites", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  email: text("email").notNull(),
  inviteToken: text("invite_token").notNull().unique(),
  invitedBy: text("invited_by").notNull(), // userId of inviter
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'expired'
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Internal Messages (org member-to-member messaging)
export const internalMessages = pgTable("internal_messages", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  senderId: text("sender_id").notNull(),
  recipientId: text("recipient_id"), // null for broadcast messages to all org members
  subject: text("subject"),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInternalMessageSchema = createInsertSchema(internalMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertInternalMessage = z.infer<typeof insertInternalMessageSchema>;
export type InternalMessage = typeof internalMessages.$inferSelect;

// Restaurant Profiles (for personalized AI advice)
export const restaurantProfiles = pgTable("restaurant_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(), // one profile per user
  restaurantName: text("restaurant_name"),
  restaurantType: text("restaurant_type"), // 'fine_dining', 'casual', 'fast_casual', 'quick_service', 'bar', 'cafe', 'brunch', 'other'
  seatCount: integer("seat_count"),
  staffCount: integer("staff_count"),
  location: text("location"), // 'urban', 'suburban', 'rural'
  city: text("city"),
  state: text("state"),
  peakDays: text("peak_days").array(), // ['friday', 'saturday', 'sunday']
  peakHours: text("peak_hours"), // 'lunch', 'dinner', 'brunch', 'all_day'
  keyChallenge1: text("key_challenge_1"), // 'high_turnover', 'food_costs', 'labor_costs', 'consistency', 'scheduling', 'training', 'reviews', 'inventory'
  keyChallenge2: text("key_challenge_2"),
  keyChallenge3: text("key_challenge_3"),
  averageLaborPercent: integer("average_labor_percent"), // e.g., 30 for 30%
  averageFoodCostPercent: integer("average_food_cost_percent"),
  posSystem: text("pos_system"), // 'toast', 'square', 'clover', 'other', 'none'
  schedulingSystem: text("scheduling_system"), // '7shifts', 'hotschedules', 'sling', 'other', 'none'
  timezone: text("timezone").default("America/Chicago"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRestaurantProfileSchema = createInsertSchema(restaurantProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRestaurantProfile = z.infer<typeof insertRestaurantProfileSchema>;
export type RestaurantProfile = typeof restaurantProfiles.$inferSelect;

// Employee Handbook Settings (customizable handbook content)
export const handbookSettings = pgTable("handbook_settings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  restaurantName: text("restaurant_name"),
  restaurantAddress: text("restaurant_address"),
  restaurantPhone: text("restaurant_phone"),
  restaurantEmail: text("restaurant_email"),
  restaurantWebsite: text("restaurant_website"),
  ownerNames: text("owner_names"), // e.g., "Ben and Rachel Mouton"
  missionStatement: text("mission_statement"),
  uniformDiningRoom: text("uniform_dining_room"),
  uniformKitchen: text("uniform_kitchen"),
  employeeMealPolicy: text("employee_meal_policy"),
  parkingPolicy: text("parking_policy"),
  schedulingApp: text("scheduling_app"), // e.g., "Homebase", "7shifts", "HotSchedules"
  evaluationSchedule: text("evaluation_schedule"), // e.g., "January and June"
  orientationDays: integer("orientation_days").default(30),
  closedHolidays: text("closed_holidays").array(), // e.g., ["Thanksgiving", "Christmas", "Easter"]
  alcoholPolicy: text("alcohol_policy"), // custom modifications
  socialMediaPolicy: text("social_media_policy"),
  additionalPolicies: text("additional_policies"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHandbookSettingsSchema = createInsertSchema(handbookSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertHandbookSettings = z.infer<typeof insertHandbookSettingsSchema>;
export type HandbookSettings = typeof handbookSettings.$inferSelect;

// Daily Task Completions (tracking task completion for insights)
export const dailyTaskCompletions = pgTable("daily_task_completions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  taskDate: text("task_date").notNull(), // YYYY-MM-DD format
  taskDescription: text("task_description").notNull(),
  category: text("category"), // 'labor', 'inventory', 'training', 'service', 'admin', 'finance'
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDailyTaskCompletionSchema = createInsertSchema(dailyTaskCompletions).omit({
  id: true,
  createdAt: true,
});
export type InsertDailyTaskCompletion = z.infer<typeof insertDailyTaskCompletionSchema>;
export type DailyTaskCompletion = typeof dailyTaskCompletions.$inferSelect;

// HR Documents (stored signed discipline documents)
export const hrDocuments = pgTable("hr_documents", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // who created the document
  organizationId: integer("organization_id").references(() => organizations.id), // for shared access
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

// Repair Vendors (vendor directory for crisis management)
export const repairVendors = pgTable("repair_vendors", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(), // 'refrigeration', 'hvac', 'plumbing', 'electrical', 'cooking', 'dish', 'pos', 'general'
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  notes: text("notes"),
  rating: integer("rating").default(0), // 1-5 stars
  isFavorite: boolean("is_favorite").default(false),
  isEmergency: boolean("is_emergency").default(false), // 24/7 availability
  responseTime: text("response_time"), // e.g., "Same day", "2-4 hours", "Next day"
  callOutFee: text("call_out_fee"), // e.g., "$150"
  accountNumber: text("account_number"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Facility Issues (logged equipment problems and repairs)
export const facilityIssues = pgTable("facility_issues", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  equipmentType: text("equipment_type").notNull(),
  equipmentName: text("equipment_name"),
  description: text("description").notNull(),
  urgencyLevel: text("urgency_level").notNull().default("medium"), // 'critical', 'high', 'medium', 'low'
  status: text("status").notNull().default("open"), // 'open', 'in_progress', 'waiting_parts', 'resolved', 'closed'
  vendorId: integer("vendor_id").references(() => repairVendors.id),
  vendorName: text("vendor_name"), // stored separately in case vendor is deleted
  repairCost: text("repair_cost"),
  repairNotes: text("repair_notes"),
  reportedAt: timestamp("reported_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRepairVendorSchema = createInsertSchema(repairVendors).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFacilityIssueSchema = createInsertSchema(facilityIssues).omit({ id: true, createdAt: true, reportedAt: true });

export const kitchenShiftData = pgTable("kitchen_shift_data", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  shiftDate: text("shift_date").notNull(),
  dayOfWeek: text("day_of_week").notNull(),
  daypart: text("daypart").notNull(),
  projectedCovers: integer("projected_covers"),
  actualCovers: integer("actual_covers"),
  staffCount: integer("staff_count"),
  prepCompletion: text("prep_completion"),
  wasteNotes: text("waste_notes"),
  wasteAmount: text("waste_amount"),
  ticketTimes: text("ticket_times"),
  windowDelays: text("window_delays"),
  managerNotes: text("manager_notes"),
  readinessScore: integer("readiness_score"),
  debriefNotes: text("debrief_notes"),
  whatWentWell: text("what_went_well"),
  whatSucked: text("what_sucked"),
  fixForTomorrow: text("fix_for_tomorrow"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertKitchenShiftDataSchema = createInsertSchema(kitchenShiftData).omit({ id: true, createdAt: true });

export const insertSocialMediaFolderSchema = createInsertSchema(socialMediaFolders).omit({ id: true, createdAt: true });
export const insertSocialMediaAssetSchema = createInsertSchema(socialMediaAssets).omit({ id: true, createdAt: true });
export const insertBrandVoiceSettingsSchema = createInsertSchema(brandVoiceSettings).omit({ id: true, updatedAt: true });
export const insertSocialMediaPostSchema = createInsertSchema(socialMediaPosts).omit({ id: true, createdAt: true });
export const insertRestaurantHolidaySchema = createInsertSchema(restaurantHolidays).omit({ id: true });

export const insertConnectedAccountSchema = createInsertSchema(connectedAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertScheduledPostSchema = createInsertSchema(scheduledPosts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPostResultSchema = createInsertSchema(postResults).omit({ id: true, createdAt: true });
export const insertHRDocumentSchema = createInsertSchema(hrDocuments).omit({ id: true, createdAt: true });
export const insertSavedIngredientSchema = createInsertSchema(savedIngredients).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSavedPlateSchema = createInsertSchema(savedPlates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFoodCostPeriodSchema = createInsertSchema(foodCostPeriods).omit({ id: true, createdAt: true });
export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true });
export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers).omit({ id: true, joinedAt: true });
export const insertOrganizationInviteSchema = createInsertSchema(organizationInvites).omit({ id: true, createdAt: true });

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
export type SavedIngredient = typeof savedIngredients.$inferSelect;
export type SavedPlate = typeof savedPlates.$inferSelect;
export type FoodCostPeriod = typeof foodCostPeriods.$inferSelect;
export type InsertConnectedAccount = z.infer<typeof insertConnectedAccountSchema>;
export type InsertScheduledPost = z.infer<typeof insertScheduledPostSchema>;
export type InsertPostResult = z.infer<typeof insertPostResultSchema>;
export type InsertHRDocument = z.infer<typeof insertHRDocumentSchema>;
export type InsertSavedIngredient = z.infer<typeof insertSavedIngredientSchema>;
export type InsertSavedPlate = z.infer<typeof insertSavedPlateSchema>;
export type InsertFoodCostPeriod = z.infer<typeof insertFoodCostPeriodSchema>;
export type Organization = typeof organizations.$inferSelect;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type OrganizationInvite = typeof organizationInvites.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type InsertOrganizationMember = z.infer<typeof insertOrganizationMemberSchema>;
export type InsertOrganizationInvite = z.infer<typeof insertOrganizationInviteSchema>;
export type RepairVendor = typeof repairVendors.$inferSelect;
export type FacilityIssue = typeof facilityIssues.$inferSelect;
export type KitchenShiftData = typeof kitchenShiftData.$inferSelect;
export type InsertRepairVendor = z.infer<typeof insertRepairVendorSchema>;
export type InsertFacilityIssue = z.infer<typeof insertFacilityIssueSchema>;
export type InsertKitchenShiftData = z.infer<typeof insertKitchenShiftDataSchema>;

// ===== LIVING PLAYBOOKS =====

export const playbooks = pgTable("playbooks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(), // 'opening', 'closing', 'prep', 'service', 'cleaning', 'safety', 'training', 'other'
  role: text("role"), // 'boh', 'foh', 'management', 'all'
  mode: text("mode").notNull().default("checklist"), // 'checklist', 'step_by_step', 'deep_procedure'
  status: text("status").notNull().default("draft"), // 'draft', 'active', 'archived'
  version: integer("version").notNull().default(1),
  auditPassRate: integer("audit_pass_rate"), // percentage 0-100
  totalAudits: integer("total_audits").default(0),
  totalAcknowledgments: integer("total_acknowledgments").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const playbookSteps = pgTable("playbook_steps", {
  id: serial("id").primaryKey(),
  playbookId: integer("playbook_id").notNull().references(() => playbooks.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  content: text("content").notNull(),
  photoUrl: text("photo_url"),
  visualCue: text("visual_cue"), // e.g., "Plate should look like this"
  commonFailure: text("common_failure"), // AI-suggested failure point
  requiredPhoto: boolean("required_photo").default(false), // photo proof required during audit
  isCheckpoint: boolean("is_checkpoint").default(false), // critical step that needs special attention
});

export const playbookAssignments = pgTable("playbook_assignments", {
  id: serial("id").primaryKey(),
  playbookId: integer("playbook_id").notNull().references(() => playbooks.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'boh', 'foh', 'management'
  shift: text("shift"), // 'am', 'pm', 'close', 'all'
  isRequired: boolean("is_required").default(true),
});

export const playbookAcknowledgments = pgTable("playbook_acknowledgments", {
  id: serial("id").primaryKey(),
  playbookId: integer("playbook_id").notNull().references(() => playbooks.id, { onDelete: "cascade" }),
  staffMemberId: integer("staff_member_id").references(() => staffMembers.id),
  userId: text("user_id"), // for owner/manager acknowledgments
  acknowledgedAt: timestamp("acknowledged_at").defaultNow(),
  shiftDate: text("shift_date").notNull(),
});

export const playbookAudits = pgTable("playbook_audits", {
  id: serial("id").primaryKey(),
  playbookId: integer("playbook_id").notNull().references(() => playbooks.id, { onDelete: "cascade" }),
  auditorUserId: text("auditor_user_id").notNull(),
  staffMemberId: integer("staff_member_id").references(() => staffMembers.id),
  auditDate: timestamp("audit_date").defaultNow(),
  overallScore: integer("overall_score"), // percentage 0-100
  stepResults: jsonb("step_results"), // { stepId: { passed: boolean, photoUrl?: string, notes?: string } }
  notes: text("notes"),
  status: text("status").notNull().default("completed"), // 'in_progress', 'completed'
});

export const insertPlaybookSchema = createInsertSchema(playbooks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlaybookStepSchema = createInsertSchema(playbookSteps).omit({ id: true });
export const insertPlaybookAssignmentSchema = createInsertSchema(playbookAssignments).omit({ id: true });
export const insertPlaybookAcknowledgmentSchema = createInsertSchema(playbookAcknowledgments).omit({ id: true, acknowledgedAt: true });
export const insertPlaybookAuditSchema = createInsertSchema(playbookAudits).omit({ id: true, auditDate: true });

export type Playbook = typeof playbooks.$inferSelect;
export type PlaybookStep = typeof playbookSteps.$inferSelect;
export type PlaybookAssignment = typeof playbookAssignments.$inferSelect;
export type PlaybookAcknowledgment = typeof playbookAcknowledgments.$inferSelect;
export type PlaybookAudit = typeof playbookAudits.$inferSelect;
export type InsertPlaybook = z.infer<typeof insertPlaybookSchema>;
export type InsertPlaybookStep = z.infer<typeof insertPlaybookStepSchema>;
export type InsertPlaybookAssignment = z.infer<typeof insertPlaybookAssignmentSchema>;
export type InsertPlaybookAcknowledgment = z.infer<typeof insertPlaybookAcknowledgmentSchema>;
export type InsertPlaybookAudit = z.infer<typeof insertPlaybookAuditSchema>;

// ===== SKILLS CERTIFICATION ENGINE =====

export const restaurantStandards = pgTable("restaurant_standards", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  servicePhilosophy: text("service_philosophy"),
  stepsOfService: jsonb("steps_of_service"),
  speedTargets: jsonb("speed_targets"),
  recoveryFramework: jsonb("recovery_framework"),
  alcoholPolicy: jsonb("alcohol_policy"),
  safetyRules: jsonb("safety_rules"),
  criticalErrors: jsonb("critical_errors"),
  rubricWeights: jsonb("rubric_weights"),
  passThreshold: integer("pass_threshold").notNull().default(85),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const certificationAttempts = pgTable("certification_attempts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  standardsId: integer("standards_id").references(() => restaurantStandards.id),
  traineeName: text("trainee_name").notNull(),
  role: text("role").notNull(),
  phase: text("phase").notNull(),
  scenarioJson: jsonb("scenario_json"),
  traineeDo: text("trainee_do"),
  traineeSay: text("trainee_say"),
  evaluationJson: jsonb("evaluation_json"),
  totalScore: integer("total_score"),
  passed: boolean("passed"),
  hasCriticalError: boolean("has_critical_error").default(false),
  criticalErrorDetails: text("critical_error_details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRestaurantStandardsSchema = createInsertSchema(restaurantStandards).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCertificationAttemptSchema = createInsertSchema(certificationAttempts).omit({ id: true, createdAt: true });

export type RestaurantStandards = typeof restaurantStandards.$inferSelect;
export type CertificationAttempt = typeof certificationAttempts.$inferSelect;
export type InsertRestaurantStandards = z.infer<typeof insertRestaurantStandardsSchema>;
export type InsertCertificationAttempt = z.infer<typeof insertCertificationAttemptSchema>;
