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

export const insertDomainSchema = createInsertSchema(domains).omit({ id: true });
export const insertFrameworkContentSchema = createInsertSchema(frameworkContent).omit({ id: true });
export const insertUserBookmarkSchema = createInsertSchema(userBookmarks).omit({ id: true, createdAt: true });

export type Domain = typeof domains.$inferSelect;
export type FrameworkContent = typeof frameworkContent.$inferSelect;
export type UserBookmark = typeof userBookmarks.$inferSelect;
