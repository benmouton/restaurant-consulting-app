import { db } from "./db";
import { domains, frameworkContent, userBookmarks, trainingTemplates, financialDocuments, financialExtracts, financialMessages, users, staffPositions, staffMembers, shifts, shiftApplications, staffAnnouncements, announcementReads, restaurantHolidays, brandVoiceSettings, connectedAccounts, scheduledPosts, postResults, hrDocuments, savedIngredients, savedPlates, foodCostPeriods, organizations, organizationMembers, organizationInvites, type Domain, type FrameworkContent, type UserBookmark, type TrainingTemplate, type FinancialDocument, type FinancialExtract, type FinancialMessage, type User, type StaffPosition, type StaffMember, type Shift, type ShiftApplication, type StaffAnnouncement, type InsertStaffPosition, type InsertStaffMember, type InsertShift, type InsertShiftApplication, type InsertStaffAnnouncement, type RestaurantHoliday, type BrandVoiceSettings, type ConnectedAccount, type ScheduledPost, type PostResult, type HRDocument, type InsertHRDocument, type InsertConnectedAccount, type InsertScheduledPost, type InsertPostResult, type SavedIngredient, type SavedPlate, type FoodCostPeriod, type InsertSavedIngredient, type InsertSavedPlate, type InsertFoodCostPeriod, type Organization, type OrganizationMember, type OrganizationInvite, type InsertOrganization, type InsertOrganizationMember, type InsertOrganizationInvite } from "@shared/schema";
import { eq, and, desc, sql, isNotNull, gte, lte, or, inArray } from "drizzle-orm";

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
    role?: string;
  }): Promise<User | undefined>;
  updateUserStripeInfo(userId: string, stripeInfo: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
  }): Promise<User | undefined>;
  getAllUsersWithSubscriptions(): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  
  // Social Media
  getUpcomingHolidays(): Promise<RestaurantHoliday[]>;
  getBrandVoiceSettings(userId: string): Promise<BrandVoiceSettings | undefined>;
  saveBrandVoiceSettings(userId: string, data: Partial<BrandVoiceSettings>): Promise<BrandVoiceSettings>;
  
  // Connected Accounts
  getConnectedAccounts(userId: string): Promise<ConnectedAccount[]>;
  getConnectedAccountById(id: number): Promise<ConnectedAccount | undefined>;
  createConnectedAccount(data: InsertConnectedAccount): Promise<ConnectedAccount>;
  updateConnectedAccount(id: number, data: Partial<ConnectedAccount>): Promise<ConnectedAccount | undefined>;
  deleteConnectedAccount(id: number): Promise<void>;
  
  // Scheduled Posts
  getScheduledPosts(userId: string): Promise<ScheduledPost[]>;
  getScheduledPostById(id: number): Promise<ScheduledPost | undefined>;
  createScheduledPost(data: InsertScheduledPost): Promise<ScheduledPost>;
  updateScheduledPost(id: number, data: Partial<ScheduledPost>): Promise<ScheduledPost | undefined>;
  deleteScheduledPost(id: number): Promise<void>;
  getDuePosts(): Promise<ScheduledPost[]>;
  
  // Post Results
  getPostResults(scheduledPostId: number): Promise<PostResult[]>;
  createPostResult(data: InsertPostResult): Promise<PostResult>;
  updatePostResult(id: number, data: Partial<PostResult>): Promise<PostResult | undefined>;
  
  // HR Documents
  getHRDocuments(userId: string): Promise<HRDocument[]>;
  getHRDocument(id: number, userId: string): Promise<HRDocument | undefined>;
  createHRDocument(data: InsertHRDocument): Promise<HRDocument>;
  updateHRDocumentScan(id: number, userId: string, scanData: { scanFilename: string; scanOriginalName: string; scanMimeType: string; scanFileSize: number; signedAt: Date }): Promise<HRDocument | undefined>;
  deleteHRDocument(id: number, userId: string): Promise<void>;
  
  // Saved Ingredients
  getSavedIngredients(userId: string): Promise<SavedIngredient[]>;
  getSavedIngredient(id: number, userId: string): Promise<SavedIngredient | undefined>;
  createSavedIngredient(data: InsertSavedIngredient): Promise<SavedIngredient>;
  updateSavedIngredient(id: number, userId: string, data: Partial<InsertSavedIngredient>): Promise<SavedIngredient | undefined>;
  deleteSavedIngredient(id: number, userId: string): Promise<void>;
  
  // Saved Plates
  getSavedPlates(userId: string): Promise<SavedPlate[]>;
  getSavedPlate(id: number, userId: string): Promise<SavedPlate | undefined>;
  createSavedPlate(data: InsertSavedPlate): Promise<SavedPlate>;
  updateSavedPlate(id: number, userId: string, data: Partial<InsertSavedPlate>): Promise<SavedPlate | undefined>;
  deleteSavedPlate(id: number, userId: string): Promise<void>;
  
  // Food Cost Periods
  getFoodCostPeriods(userId: string): Promise<FoodCostPeriod[]>;
  createFoodCostPeriod(data: InsertFoodCostPeriod): Promise<FoodCostPeriod>;
  deleteFoodCostPeriod(id: number, userId: string): Promise<void>;
  
  // Organizations
  createOrganization(data: InsertOrganization): Promise<Organization>;
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationByOwner(ownerId: string): Promise<Organization | undefined>;
  getUserOrganization(userId: string): Promise<Organization | undefined>;
  
  // Organization Members
  getOrganizationMembers(organizationId: number): Promise<OrganizationMember[]>;
  addOrganizationMember(data: InsertOrganizationMember): Promise<OrganizationMember>;
  removeOrganizationMember(organizationId: number, userId: string): Promise<void>;
  isOrganizationOwner(organizationId: number, userId: string): Promise<boolean>;
  isOrganizationMember(organizationId: number, userId: string): Promise<boolean>;
  
  // Organization Invites
  createOrganizationInvite(data: InsertOrganizationInvite): Promise<OrganizationInvite>;
  getOrganizationInvites(organizationId: number): Promise<OrganizationInvite[]>;
  getInviteByToken(token: string): Promise<OrganizationInvite | undefined>;
  updateInviteStatus(id: number, status: string): Promise<void>;
  
  // HR Documents (organization-aware)
  getHRDocumentsForOrganization(organizationId: number): Promise<HRDocument[]>;
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
    role?: string;
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

  // Social Media - Holidays
  async getUpcomingHolidays(): Promise<RestaurantHoliday[]> {
    return await db.select().from(restaurantHolidays).orderBy(restaurantHolidays.date);
  }

  // Social Media - Brand Voice Settings
  async getBrandVoiceSettings(userId: string): Promise<BrandVoiceSettings | undefined> {
    const [settings] = await db.select().from(brandVoiceSettings)
      .where(eq(brandVoiceSettings.userId, userId));
    return settings;
  }

  async saveBrandVoiceSettings(userId: string, data: Partial<BrandVoiceSettings>): Promise<BrandVoiceSettings> {
    const existing = await this.getBrandVoiceSettings(userId);
    if (existing) {
      const [updated] = await db.update(brandVoiceSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(brandVoiceSettings.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(brandVoiceSettings)
        .values({ userId, ...data })
        .returning();
      return created;
    }
  }

  // Connected Accounts
  async getConnectedAccounts(userId: string): Promise<ConnectedAccount[]> {
    return await db.select().from(connectedAccounts)
      .where(eq(connectedAccounts.userId, userId))
      .orderBy(desc(connectedAccounts.createdAt));
  }

  async getConnectedAccountById(id: number): Promise<ConnectedAccount | undefined> {
    const [account] = await db.select().from(connectedAccounts)
      .where(eq(connectedAccounts.id, id));
    return account;
  }

  async createConnectedAccount(data: InsertConnectedAccount): Promise<ConnectedAccount> {
    const [account] = await db.insert(connectedAccounts)
      .values(data)
      .returning();
    return account;
  }

  async updateConnectedAccount(id: number, data: Partial<ConnectedAccount>): Promise<ConnectedAccount | undefined> {
    const [updated] = await db.update(connectedAccounts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(connectedAccounts.id, id))
      .returning();
    return updated;
  }

  async deleteConnectedAccount(id: number): Promise<void> {
    await db.delete(connectedAccounts).where(eq(connectedAccounts.id, id));
  }

  // Scheduled Posts
  async getScheduledPosts(userId: string): Promise<ScheduledPost[]> {
    return await db.select().from(scheduledPosts)
      .where(eq(scheduledPosts.userId, userId))
      .orderBy(desc(scheduledPosts.createdAt));
  }

  async getScheduledPostById(id: number): Promise<ScheduledPost | undefined> {
    const [post] = await db.select().from(scheduledPosts)
      .where(eq(scheduledPosts.id, id));
    return post;
  }

  async createScheduledPost(data: InsertScheduledPost): Promise<ScheduledPost> {
    const [post] = await db.insert(scheduledPosts)
      .values(data)
      .returning();
    return post;
  }

  async updateScheduledPost(id: number, data: Partial<ScheduledPost>): Promise<ScheduledPost | undefined> {
    const [updated] = await db.update(scheduledPosts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(scheduledPosts.id, id))
      .returning();
    return updated;
  }

  async deleteScheduledPost(id: number): Promise<void> {
    await db.delete(scheduledPosts).where(eq(scheduledPosts.id, id));
  }

  async getDuePosts(): Promise<ScheduledPost[]> {
    const now = new Date();
    return await db.select().from(scheduledPosts)
      .where(and(
        eq(scheduledPosts.status, 'scheduled'),
        lte(scheduledPosts.scheduledFor, now)
      ))
      .orderBy(scheduledPosts.scheduledFor);
  }

  // Post Results
  async getPostResults(scheduledPostId: number): Promise<PostResult[]> {
    return await db.select().from(postResults)
      .where(eq(postResults.scheduledPostId, scheduledPostId))
      .orderBy(desc(postResults.createdAt));
  }

  async createPostResult(data: InsertPostResult): Promise<PostResult> {
    const [result] = await db.insert(postResults)
      .values(data)
      .returning();
    return result;
  }

  async updatePostResult(id: number, data: Partial<PostResult>): Promise<PostResult | undefined> {
    const [updated] = await db.update(postResults)
      .set(data)
      .where(eq(postResults.id, id))
      .returning();
    return updated;
  }

  // HR Documents
  async getHRDocuments(userId: string): Promise<HRDocument[]> {
    return await db.select().from(hrDocuments)
      .where(eq(hrDocuments.userId, userId))
      .orderBy(desc(hrDocuments.createdAt));
  }

  async getHRDocument(id: number, userId: string): Promise<HRDocument | undefined> {
    const [doc] = await db.select().from(hrDocuments)
      .where(and(eq(hrDocuments.id, id), eq(hrDocuments.userId, userId)));
    return doc;
  }

  async createHRDocument(data: InsertHRDocument): Promise<HRDocument> {
    const [doc] = await db.insert(hrDocuments)
      .values(data)
      .returning();
    return doc;
  }

  async updateHRDocumentScan(id: number, userId: string, scanData: { scanFilename: string; scanOriginalName: string; scanMimeType: string; scanFileSize: number; signedAt: Date }): Promise<HRDocument | undefined> {
    const [updated] = await db.update(hrDocuments)
      .set(scanData)
      .where(and(eq(hrDocuments.id, id), eq(hrDocuments.userId, userId)))
      .returning();
    return updated;
  }

  async deleteHRDocument(id: number, userId: string): Promise<void> {
    await db.delete(hrDocuments)
      .where(and(eq(hrDocuments.id, id), eq(hrDocuments.userId, userId)));
  }

  // Saved Ingredients
  async getSavedIngredients(userId: string): Promise<SavedIngredient[]> {
    return await db.select().from(savedIngredients)
      .where(eq(savedIngredients.userId, userId))
      .orderBy(savedIngredients.name);
  }

  async getSavedIngredient(id: number, userId: string): Promise<SavedIngredient | undefined> {
    const [ingredient] = await db.select().from(savedIngredients)
      .where(and(eq(savedIngredients.id, id), eq(savedIngredients.userId, userId)));
    return ingredient;
  }

  async createSavedIngredient(data: InsertSavedIngredient): Promise<SavedIngredient> {
    const [ingredient] = await db.insert(savedIngredients)
      .values(data)
      .returning();
    return ingredient;
  }

  async updateSavedIngredient(id: number, userId: string, data: Partial<InsertSavedIngredient>): Promise<SavedIngredient | undefined> {
    const [updated] = await db.update(savedIngredients)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(savedIngredients.id, id), eq(savedIngredients.userId, userId)))
      .returning();
    return updated;
  }

  async deleteSavedIngredient(id: number, userId: string): Promise<void> {
    await db.delete(savedIngredients)
      .where(and(eq(savedIngredients.id, id), eq(savedIngredients.userId, userId)));
  }

  // Saved Plates
  async getSavedPlates(userId: string): Promise<SavedPlate[]> {
    return await db.select().from(savedPlates)
      .where(eq(savedPlates.userId, userId))
      .orderBy(desc(savedPlates.updatedAt));
  }

  async getSavedPlate(id: number, userId: string): Promise<SavedPlate | undefined> {
    const [plate] = await db.select().from(savedPlates)
      .where(and(eq(savedPlates.id, id), eq(savedPlates.userId, userId)));
    return plate;
  }

  async createSavedPlate(data: InsertSavedPlate): Promise<SavedPlate> {
    const [plate] = await db.insert(savedPlates)
      .values(data)
      .returning();
    return plate;
  }

  async updateSavedPlate(id: number, userId: string, data: Partial<InsertSavedPlate>): Promise<SavedPlate | undefined> {
    const [updated] = await db.update(savedPlates)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(savedPlates.id, id), eq(savedPlates.userId, userId)))
      .returning();
    return updated;
  }

  async deleteSavedPlate(id: number, userId: string): Promise<void> {
    await db.delete(savedPlates)
      .where(and(eq(savedPlates.id, id), eq(savedPlates.userId, userId)));
  }

  // Food Cost Periods
  async getFoodCostPeriods(userId: string): Promise<FoodCostPeriod[]> {
    return await db.select().from(foodCostPeriods)
      .where(eq(foodCostPeriods.userId, userId))
      .orderBy(desc(foodCostPeriods.periodStart));
  }

  async createFoodCostPeriod(data: InsertFoodCostPeriod): Promise<FoodCostPeriod> {
    const [period] = await db.insert(foodCostPeriods)
      .values(data)
      .returning();
    return period;
  }

  async deleteFoodCostPeriod(id: number, userId: string): Promise<void> {
    await db.delete(foodCostPeriods)
      .where(and(eq(foodCostPeriods.id, id), eq(foodCostPeriods.userId, userId)));
  }

  // Organizations
  async createOrganization(data: InsertOrganization): Promise<Organization> {
    const [org] = await db.insert(organizations).values(data).returning();
    return org;
  }

  async getOrganization(id: number): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async getOrganizationByOwner(ownerId: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.ownerId, ownerId));
    return org;
  }

  async getUserOrganization(userId: string): Promise<Organization | undefined> {
    const ownerOrg = await this.getOrganizationByOwner(userId);
    if (ownerOrg) return ownerOrg;
    
    const [membership] = await db.select().from(organizationMembers)
      .where(eq(organizationMembers.userId, userId));
    if (membership) {
      return this.getOrganization(membership.organizationId);
    }
    return undefined;
  }

  // Organization Members
  async getOrganizationMembers(organizationId: number): Promise<OrganizationMember[]> {
    return await db.select().from(organizationMembers)
      .where(eq(organizationMembers.organizationId, organizationId));
  }

  async addOrganizationMember(data: InsertOrganizationMember): Promise<OrganizationMember> {
    const [member] = await db.insert(organizationMembers).values(data).returning();
    return member;
  }

  async removeOrganizationMember(organizationId: number, userId: string): Promise<void> {
    await db.delete(organizationMembers)
      .where(and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId)
      ));
  }

  async isOrganizationOwner(organizationId: number, userId: string): Promise<boolean> {
    const [org] = await db.select().from(organizations)
      .where(and(eq(organizations.id, organizationId), eq(organizations.ownerId, userId)));
    return !!org;
  }

  async isOrganizationMember(organizationId: number, userId: string): Promise<boolean> {
    const org = await this.getOrganization(organizationId);
    if (org?.ownerId === userId) return true;
    
    const [member] = await db.select().from(organizationMembers)
      .where(and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId)
      ));
    return !!member;
  }

  // Organization Invites
  async createOrganizationInvite(data: InsertOrganizationInvite): Promise<OrganizationInvite> {
    const [invite] = await db.insert(organizationInvites).values(data).returning();
    return invite;
  }

  async getOrganizationInvites(organizationId: number): Promise<OrganizationInvite[]> {
    return await db.select().from(organizationInvites)
      .where(eq(organizationInvites.organizationId, organizationId))
      .orderBy(desc(organizationInvites.createdAt));
  }

  async getInviteByToken(token: string): Promise<OrganizationInvite | undefined> {
    const [invite] = await db.select().from(organizationInvites)
      .where(eq(organizationInvites.inviteToken, token));
    return invite;
  }

  async updateInviteStatus(id: number, status: string): Promise<void> {
    await db.update(organizationInvites)
      .set({ status })
      .where(eq(organizationInvites.id, id));
  }

  // HR Documents (organization-aware)
  async getHRDocumentsForOrganization(organizationId: number): Promise<HRDocument[]> {
    return await db.select().from(hrDocuments)
      .where(eq(hrDocuments.organizationId, organizationId))
      .orderBy(desc(hrDocuments.createdAt));
  }
}

export const storage = new DatabaseStorage();
