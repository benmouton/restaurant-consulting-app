import { db } from "./db";
import { manualSections, userProgress, type ManualSection, type UserProgress } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Manual Sections
  getManualSections(): Promise<ManualSection[]>;
  getManualSection(id: number): Promise<ManualSection | undefined>;
  createManualSection(section: Omit<ManualSection, "id">): Promise<ManualSection>;
  
  // User Progress
  getUserProgress(userId: string): Promise<UserProgress[]>;
  markSectionAsRead(userId: string, sectionId: number): Promise<UserProgress>;
}

export class DatabaseStorage implements IStorage {
  // Manual Sections
  async getManualSections(): Promise<ManualSection[]> {
    return await db.select().from(manualSections).orderBy(manualSections.sequenceOrder);
  }

  async getManualSection(id: number): Promise<ManualSection | undefined> {
    const [section] = await db.select().from(manualSections).where(eq(manualSections.id, id));
    return section;
  }

  async createManualSection(section: Omit<ManualSection, "id">): Promise<ManualSection> {
    const [newSection] = await db.insert(manualSections).values(section).returning();
    return newSection;
  }

  // User Progress
  async getUserProgress(userId: string): Promise<UserProgress[]> {
    return await db.select().from(userProgress).where(eq(userProgress.userId, userId));
  }

  async markSectionAsRead(userId: string, sectionId: number): Promise<UserProgress> {
    const [progress] = await db
      .insert(userProgress)
      .values({ userId, sectionId })
      .onConflictDoNothing() // Prevent duplicate acknowledgments
      .returning();
    
    if (!progress) {
      // If it already existed, fetch and return it
      const [existing] = await db
        .select()
        .from(userProgress)
        .where(and(eq(userProgress.userId, userId), eq(userProgress.sectionId, sectionId)));
      return existing;
    }
    
    return progress;
  }
}

export const storage = new DatabaseStorage();
