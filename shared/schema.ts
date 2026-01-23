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
