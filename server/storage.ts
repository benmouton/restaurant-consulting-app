import { db } from "./db";
import { domains, frameworkContent, userBookmarks, trainingTemplates, financialDocuments, financialExtracts, financialMessages, type Domain, type FrameworkContent, type UserBookmark, type TrainingTemplate, type FinancialDocument, type FinancialExtract, type FinancialMessage } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Domains
  getDomains(): Promise<Domain[]>;
  getDomainBySlug(slug: string): Promise<Domain | undefined>;
  createDomain(domain: Omit<Domain, "id">): Promise<Domain>;
  
  // Framework Content
  getContentByDomain(domainId: number): Promise<FrameworkContent[]>;
  createContent(content: Omit<FrameworkContent, "id">): Promise<FrameworkContent>;
  
  // User Bookmarks
  getUserBookmarks(userId: string): Promise<UserBookmark[]>;
  addBookmark(userId: string, contentId: number): Promise<UserBookmark>;
  removeBookmark(userId: string, contentId: number): Promise<void>;
  
  // Training Templates
  getTrainingTemplates(): Promise<TrainingTemplate[]>;
  getTemplatesByCategory(category: string): Promise<TrainingTemplate[]>;
  createTemplate(template: Omit<TrainingTemplate, "id">): Promise<TrainingTemplate>;
  
  // Financial Documents
  getFinancialDocuments(userId: string): Promise<FinancialDocument[]>;
  getFinancialDocument(id: number, userId: string): Promise<FinancialDocument | undefined>;
  createFinancialDocument(doc: Omit<FinancialDocument, "id" | "uploadedAt">): Promise<FinancialDocument>;
  updateFinancialDocumentStatus(id: number, status: string): Promise<void>;
  deleteFinancialDocument(id: number, userId: string): Promise<void>;
  
  // Financial Extracts
  getFinancialExtract(documentId: number): Promise<FinancialExtract | undefined>;
  createFinancialExtract(extract: Omit<FinancialExtract, "id" | "processedAt">): Promise<FinancialExtract>;
  updateFinancialExtract(documentId: number, data: Partial<FinancialExtract>): Promise<void>;
  
  // Financial Messages
  getFinancialMessages(userId: string, documentId?: number): Promise<FinancialMessage[]>;
  createFinancialMessage(message: Omit<FinancialMessage, "id" | "createdAt">): Promise<FinancialMessage>;
}

export class DatabaseStorage implements IStorage {
  // Domains
  async getDomains(): Promise<Domain[]> {
    return await db.select().from(domains).orderBy(domains.sequenceOrder);
  }

  async getDomainBySlug(slug: string): Promise<Domain | undefined> {
    const [domain] = await db.select().from(domains).where(eq(domains.slug, slug));
    return domain;
  }

  async createDomain(domain: Omit<Domain, "id">): Promise<Domain> {
    const [newDomain] = await db.insert(domains).values(domain).returning();
    return newDomain;
  }

  // Framework Content
  async getContentByDomain(domainId: number): Promise<FrameworkContent[]> {
    return await db.select().from(frameworkContent)
      .where(eq(frameworkContent.domainId, domainId))
      .orderBy(frameworkContent.sequenceOrder);
  }

  async createContent(content: Omit<FrameworkContent, "id">): Promise<FrameworkContent> {
    const [newContent] = await db.insert(frameworkContent).values(content).returning();
    return newContent;
  }

  // User Bookmarks
  async getUserBookmarks(userId: string): Promise<UserBookmark[]> {
    return await db.select().from(userBookmarks).where(eq(userBookmarks.userId, userId));
  }

  async addBookmark(userId: string, contentId: number): Promise<UserBookmark> {
    const [bookmark] = await db
      .insert(userBookmarks)
      .values({ userId, contentId })
      .onConflictDoNothing()
      .returning();
    
    if (!bookmark) {
      const [existing] = await db
        .select()
        .from(userBookmarks)
        .where(and(eq(userBookmarks.userId, userId), eq(userBookmarks.contentId, contentId)));
      return existing;
    }
    
    return bookmark;
  }

  async removeBookmark(userId: string, contentId: number): Promise<void> {
    await db.delete(userBookmarks)
      .where(and(eq(userBookmarks.userId, userId), eq(userBookmarks.contentId, contentId)));
  }
  
  // Training Templates
  async getTrainingTemplates(): Promise<TrainingTemplate[]> {
    return await db.select().from(trainingTemplates).orderBy(trainingTemplates.category, trainingTemplates.sequenceOrder);
  }
  
  async getTemplatesByCategory(category: string): Promise<TrainingTemplate[]> {
    return await db.select().from(trainingTemplates)
      .where(eq(trainingTemplates.category, category))
      .orderBy(trainingTemplates.sequenceOrder);
  }
  
  async createTemplate(template: Omit<TrainingTemplate, "id">): Promise<TrainingTemplate> {
    const [newTemplate] = await db.insert(trainingTemplates).values(template).returning();
    return newTemplate;
  }
  
  // Financial Documents
  async getFinancialDocuments(userId: string): Promise<FinancialDocument[]> {
    return await db.select().from(financialDocuments)
      .where(eq(financialDocuments.userId, userId))
      .orderBy(desc(financialDocuments.uploadedAt));
  }
  
  async getFinancialDocument(id: number, userId: string): Promise<FinancialDocument | undefined> {
    const [doc] = await db.select().from(financialDocuments)
      .where(and(eq(financialDocuments.id, id), eq(financialDocuments.userId, userId)));
    return doc;
  }
  
  async createFinancialDocument(doc: Omit<FinancialDocument, "id" | "uploadedAt">): Promise<FinancialDocument> {
    const [newDoc] = await db.insert(financialDocuments).values(doc).returning();
    return newDoc;
  }
  
  async updateFinancialDocumentStatus(id: number, status: string): Promise<void> {
    await db.update(financialDocuments).set({ status }).where(eq(financialDocuments.id, id));
  }
  
  async deleteFinancialDocument(id: number, userId: string): Promise<void> {
    await db.delete(financialExtracts).where(eq(financialExtracts.documentId, id));
    await db.delete(financialMessages).where(eq(financialMessages.documentId, id));
    await db.delete(financialDocuments)
      .where(and(eq(financialDocuments.id, id), eq(financialDocuments.userId, userId)));
  }
  
  // Financial Extracts
  async getFinancialExtract(documentId: number): Promise<FinancialExtract | undefined> {
    const [extract] = await db.select().from(financialExtracts)
      .where(eq(financialExtracts.documentId, documentId));
    return extract;
  }
  
  async createFinancialExtract(extract: Omit<FinancialExtract, "id" | "processedAt">): Promise<FinancialExtract> {
    const [newExtract] = await db.insert(financialExtracts).values(extract).returning();
    return newExtract;
  }
  
  async updateFinancialExtract(documentId: number, data: Partial<FinancialExtract>): Promise<void> {
    await db.update(financialExtracts).set(data).where(eq(financialExtracts.documentId, documentId));
  }
  
  // Financial Messages
  async getFinancialMessages(userId: string, documentId?: number): Promise<FinancialMessage[]> {
    if (documentId) {
      return await db.select().from(financialMessages)
        .where(and(eq(financialMessages.userId, userId), eq(financialMessages.documentId, documentId)))
        .orderBy(financialMessages.createdAt);
    }
    return await db.select().from(financialMessages)
      .where(eq(financialMessages.userId, userId))
      .orderBy(financialMessages.createdAt);
  }
  
  async createFinancialMessage(message: Omit<FinancialMessage, "id" | "createdAt">): Promise<FinancialMessage> {
    const [newMessage] = await db.insert(financialMessages).values(message).returning();
    return newMessage;
  }
}

export const storage = new DatabaseStorage();
