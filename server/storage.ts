import { db } from "./db";
import { domains, frameworkContent, userBookmarks, trainingTemplates, financialDocuments, financialExtracts, financialMessages, users, staffPositions, staffMembers, shifts, shiftApplications, staffAnnouncements, announcementReads, type Domain, type FrameworkContent, type UserBookmark, type TrainingTemplate, type FinancialDocument, type FinancialExtract, type FinancialMessage, type User, type StaffPosition, type StaffMember, type Shift, type ShiftApplication, type StaffAnnouncement, type InsertStaffPosition, type InsertStaffMember, type InsertShift, type InsertShiftApplication, type InsertStaffAnnouncement } from "@shared/schema";
import { eq, and, desc, sql, isNotNull, gte, lte, or } from "drizzle-orm";

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
  
  // User Profile
  getUserById(userId: string): Promise<User | undefined>;
  updateUserProfile(userId: string, profile: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    restaurantName?: string;
  }): Promise<User | undefined>;
  updateUserStripeInfo(userId: string, stripeInfo: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
  }): Promise<User | undefined>;
  getAllUsersWithSubscriptions(): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
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

  async getUserById(userId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }

  async updateUserStripeInfo(userId: string, stripeInfo: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
  }): Promise<User | undefined> {
    const [user] = await db.update(users).set(stripeInfo).where(eq(users.id, userId)).returning();
    return user;
  }

  async updateUserProfile(userId: string, profile: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    restaurantName?: string;
  }): Promise<User | undefined> {
    const [user] = await db.update(users).set({
      ...profile,
      updatedAt: new Date(),
    }).where(eq(users.id, userId)).returning();
    return user;
  }

  async getAllUsersWithSubscriptions(): Promise<User[]> {
    return await db.select().from(users)
      .where(isNotNull(users.stripeCustomerId))
      .orderBy(desc(users.createdAt));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getSubscriptionStats(): Promise<{
    totalUsers: number;
    activeSubscribers: number;
    totalRevenue: number;
  }> {
    const allUsers = await db.select().from(users);
    const activeSubscribers = allUsers.filter(u => u.subscriptionStatus === 'active');
    
    return {
      totalUsers: allUsers.length,
      activeSubscribers: activeSubscribers.length,
      totalRevenue: activeSubscribers.length * 10,
    };
  }

  // Staff Positions
  async getStaffPositions(): Promise<StaffPosition[]> {
    return await db.select().from(staffPositions).orderBy(staffPositions.name);
  }

  async createStaffPosition(position: InsertStaffPosition): Promise<StaffPosition> {
    const [newPosition] = await db.insert(staffPositions).values(position).returning();
    return newPosition;
  }

  async updateStaffPosition(id: number, data: Partial<InsertStaffPosition>): Promise<StaffPosition | undefined> {
    const [position] = await db.update(staffPositions).set(data).where(eq(staffPositions.id, id)).returning();
    return position;
  }

  async deleteStaffPosition(id: number): Promise<void> {
    await db.delete(staffPositions).where(eq(staffPositions.id, id));
  }

  // Staff Members
  async getStaffMembers(): Promise<StaffMember[]> {
    return await db.select().from(staffMembers).orderBy(staffMembers.lastName);
  }

  async getStaffMember(id: number): Promise<StaffMember | undefined> {
    const [member] = await db.select().from(staffMembers).where(eq(staffMembers.id, id));
    return member;
  }

  async createStaffMember(member: InsertStaffMember): Promise<StaffMember> {
    const [newMember] = await db.insert(staffMembers).values(member).returning();
    return newMember;
  }

  async updateStaffMember(id: number, data: Partial<InsertStaffMember>): Promise<StaffMember | undefined> {
    const [member] = await db.update(staffMembers).set(data).where(eq(staffMembers.id, id)).returning();
    return member;
  }

  async deleteStaffMember(id: number): Promise<void> {
    await db.delete(staffMembers).where(eq(staffMembers.id, id));
  }

  async getStaffMemberByInviteToken(token: string): Promise<StaffMember | undefined> {
    const [member] = await db.select().from(staffMembers).where(eq(staffMembers.inviteToken, token));
    return member;
  }

  async getStaffMemberByEmail(email: string): Promise<StaffMember | undefined> {
    const [member] = await db.select().from(staffMembers).where(eq(staffMembers.email, email));
    return member;
  }

  async updateStaffMemberInvite(id: number, data: { inviteToken?: string | null; inviteStatus?: string; inviteSentAt?: Date | null; inviteAcceptedAt?: Date | null; passwordHash?: string | null }): Promise<StaffMember | undefined> {
    const [member] = await db.update(staffMembers).set(data).where(eq(staffMembers.id, id)).returning();
    return member;
  }

  async getActiveEmployeeCount(): Promise<number> {
    const result = await db.select().from(staffMembers)
      .where(and(
        eq(staffMembers.status, "active"),
        eq(staffMembers.inviteStatus, "accepted")
      ));
    return result.length;
  }

  async countAcceptedEmployees(ownerId: string): Promise<number> {
    const result = await db.select().from(staffMembers)
      .where(and(
        eq(staffMembers.ownerId, ownerId),
        eq(staffMembers.status, "active"),
        eq(staffMembers.inviteStatus, "accepted")
      ));
    return result.length;
  }

  // Shifts
  async getShifts(startDate: string, endDate: string): Promise<Shift[]> {
    return await db.select().from(shifts)
      .where(and(gte(shifts.date, startDate), lte(shifts.date, endDate)))
      .orderBy(shifts.date, shifts.startTime);
  }

  async getOpenShifts(): Promise<Shift[]> {
    return await db.select().from(shifts)
      .where(eq(shifts.status, "open"))
      .orderBy(shifts.date, shifts.startTime);
  }

  async getShiftsByStaffMember(staffMemberId: number): Promise<Shift[]> {
    return await db.select().from(shifts)
      .where(eq(shifts.staffMemberId, staffMemberId))
      .orderBy(desc(shifts.date));
  }

  async createShift(shift: InsertShift): Promise<Shift> {
    const [newShift] = await db.insert(shifts).values(shift).returning();
    return newShift;
  }

  async updateShift(id: number, data: Partial<InsertShift>): Promise<Shift | undefined> {
    const [shift] = await db.update(shifts).set(data).where(eq(shifts.id, id)).returning();
    return shift;
  }

  async deleteShift(id: number): Promise<void> {
    await db.delete(shifts).where(eq(shifts.id, id));
  }

  // Shift Applications
  async getShiftApplications(shiftId: number): Promise<ShiftApplication[]> {
    return await db.select().from(shiftApplications)
      .where(eq(shiftApplications.shiftId, shiftId));
  }

  async createShiftApplication(application: InsertShiftApplication): Promise<ShiftApplication> {
    const [newApp] = await db.insert(shiftApplications).values(application).returning();
    return newApp;
  }

  async updateShiftApplication(id: number, status: string): Promise<ShiftApplication | undefined> {
    const [app] = await db.update(shiftApplications)
      .set({ status })
      .where(eq(shiftApplications.id, id))
      .returning();
    return app;
  }

  // Staff Announcements
  async getStaffAnnouncements(): Promise<StaffAnnouncement[]> {
    return await db.select().from(staffAnnouncements)
      .where(or(
        sql`${staffAnnouncements.expiresAt} IS NULL`,
        gte(staffAnnouncements.expiresAt, sql`NOW()`)
      ))
      .orderBy(desc(staffAnnouncements.createdAt));
  }

  async createStaffAnnouncement(announcement: InsertStaffAnnouncement): Promise<StaffAnnouncement> {
    const [newAnnouncement] = await db.insert(staffAnnouncements).values(announcement).returning();
    return newAnnouncement;
  }

  async deleteStaffAnnouncement(id: number): Promise<void> {
    await db.delete(staffAnnouncements).where(eq(staffAnnouncements.id, id));
  }

  async markAnnouncementRead(announcementId: number, userId: string): Promise<void> {
    await db.insert(announcementReads)
      .values({ announcementId, userId })
      .onConflictDoNothing();
  }

  async getUnreadAnnouncementCount(userId: string): Promise<number> {
    const allAnnouncements = await this.getStaffAnnouncements();
    const readAnnouncements = await db.select().from(announcementReads)
      .where(eq(announcementReads.userId, userId));
    
    const readIds = new Set(readAnnouncements.map(r => r.announcementId));
    return allAnnouncements.filter(a => !readIds.has(a.id)).length;
  }

  // Scheduling Stats
  async getSchedulingStats(): Promise<{
    totalStaff: number;
    totalPositions: number;
    openShifts: number;
    unreadAnnouncements: number;
    todayShifts: number;
    weekShifts: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const [staff, positions, openShiftsList, todayShiftsList, weekShiftsList, announcements] = await Promise.all([
      db.select().from(staffMembers).where(eq(staffMembers.status, "active")),
      db.select().from(staffPositions),
      db.select().from(shifts).where(eq(shifts.status, "open")),
      db.select().from(shifts).where(eq(shifts.date, today)),
      db.select().from(shifts).where(and(gte(shifts.date, today), lte(shifts.date, weekEnd))),
      db.select().from(staffAnnouncements),
    ]);

    return {
      totalStaff: staff.length,
      totalPositions: positions.length,
      openShifts: openShiftsList.length,
      unreadAnnouncements: announcements.length,
      todayShifts: todayShiftsList.length,
      weekShifts: weekShiftsList.length,
    };
  }
}

export const storage = new DatabaseStorage();
