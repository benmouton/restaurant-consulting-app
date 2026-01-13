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

export const insertDomainSchema = createInsertSchema(domains).omit({ id: true });
export const insertFrameworkContentSchema = createInsertSchema(frameworkContent).omit({ id: true });
export const insertUserBookmarkSchema = createInsertSchema(userBookmarks).omit({ id: true, createdAt: true });
export const insertTrainingTemplateSchema = createInsertSchema(trainingTemplates).omit({ id: true });
export const insertFinancialDocumentSchema = createInsertSchema(financialDocuments).omit({ id: true, uploadedAt: true });
export const insertFinancialExtractSchema = createInsertSchema(financialExtracts).omit({ id: true, processedAt: true });
export const insertFinancialMessageSchema = createInsertSchema(financialMessages).omit({ id: true, createdAt: true });

export type Domain = typeof domains.$inferSelect;
export type FrameworkContent = typeof frameworkContent.$inferSelect;
export type UserBookmark = typeof userBookmarks.$inferSelect;
export type TrainingTemplate = typeof trainingTemplates.$inferSelect;
export type FinancialDocument = typeof financialDocuments.$inferSelect;
export type FinancialExtract = typeof financialExtracts.$inferSelect;
export type FinancialMessage = typeof financialMessages.$inferSelect;
