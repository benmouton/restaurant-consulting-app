import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export * from "./models/auth";
export * from "./models/chat";

// Manual Sections
export const manualSections = pgTable("manual_sections", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  role: text("role").notNull().default("ALL"), // 'FOH', 'BOH', 'ALL'
  sequenceOrder: integer("sequence_order").notNull(),
  category: text("category").notNull(), // 'Core Rule', 'Execution', etc.
});

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // Matches auth user id (string)
  sectionId: integer("section_id").notNull().references(() => manualSections.id),
  acknowledgedAt: timestamp("acknowledged_at").defaultNow(),
});

export const insertManualSectionSchema = createInsertSchema(manualSections).omit({ id: true });
export const insertUserProgressSchema = createInsertSchema(userProgress).omit({ id: true, acknowledgedAt: true });

export type ManualSection = typeof manualSections.$inferSelect;
export type UserProgress = typeof userProgress.$inferSelect;
