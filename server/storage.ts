import { db } from "./db";
import { domains, frameworkContent, userBookmarks, trainingTemplates, financialDocuments, financialExtracts, financialMessages, users, staffPositions, staffMembers, shifts, shiftApplications, staffAnnouncements, announcementReads, restaurantHolidays, brandVoiceSettings, connectedAccounts, scheduledPosts, postResults, hrDocuments, savedIngredients, savedPlates, foodCostPeriods, organizations, organizationMembers, organizationInvites, internalMessages, restaurantProfiles, dailyTaskCompletions, repairVendors, facilityIssues, kitchenShiftData, playbooks, playbookSteps, playbookAssignments, playbookAcknowledgments, playbookAudits, handbookSettings, restaurantStandards, certificationAttempts, trainingAssignments, trainingDayCompletions, conversations, messages, type Domain, type FrameworkContent, type UserBookmark, type TrainingTemplate, type FinancialDocument, type FinancialExtract, type FinancialMessage, type User, type StaffPosition, type StaffMember, type Shift, type ShiftApplication, type StaffAnnouncement, type InsertStaffPosition, type InsertStaffMember, type InsertShift, type InsertShiftApplication, type InsertStaffAnnouncement, type RestaurantHoliday, type BrandVoiceSettings, type ConnectedAccount, type ScheduledPost, type PostResult, type HRDocument, type InsertHRDocument, type InsertConnectedAccount, type InsertScheduledPost, type InsertPostResult, type SavedIngredient, type SavedPlate, type FoodCostPeriod, type InsertSavedIngredient, type InsertSavedPlate, type InsertFoodCostPeriod, type Organization, type OrganizationMember, type OrganizationInvite, type InsertOrganization, type InsertOrganizationMember, type InsertOrganizationInvite, type InternalMessage, type InsertInternalMessage, type RestaurantProfile, type InsertRestaurantProfile, type DailyTaskCompletion, type InsertDailyTaskCompletion, type RepairVendor, type InsertRepairVendor, type FacilityIssue, type InsertFacilityIssue, type KitchenShiftData, type InsertKitchenShiftData, type Playbook, type PlaybookStep, type PlaybookAssignment, type PlaybookAcknowledgment, type PlaybookAudit, type InsertPlaybook, type InsertPlaybookStep, type InsertPlaybookAssignment, type InsertPlaybookAcknowledgment, type InsertPlaybookAudit, type HandbookSettings, type InsertHandbookSettings, type RestaurantStandards, type CertificationAttempt, type InsertRestaurantStandards, type InsertCertificationAttempt, type TrainingAssignment, type TrainingDayCompletion, type InsertTrainingAssignment, type InsertTrainingDayCompletion, type Conversation, type Message } from "@shared/schema";
import { testAccessTokens, type TestAccessToken, type InsertTestAccessToken, primeCostEntries, type PrimeCostEntry, type InsertPrimeCostEntry, trainingRecords, type TrainingRecord, type InsertTrainingRecord, generatedSops, type GeneratedSop, type InsertGeneratedSop } from "@shared/schema";
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
  deleteTemplatesByCategory(category: string): Promise<void>;
  
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
  deleteUser(userId: string): Promise<void>;
  updateUserProfile(userId: string, profile: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    restaurantName?: string;
    role?: string;
    profileImageUrl?: string;
  }): Promise<User | undefined>;
  updateUserStripeInfo(userId: string, stripeInfo: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionTier?: string;
  }): Promise<User | undefined>;
  updateConsultantMessageCount(userId: string, count: number, resetDate?: string): Promise<User | undefined>;
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
  updateOrganizationMemberRole(organizationId: number, userId: string, role: string): Promise<void>;
  isOrganizationOwner(organizationId: number, userId: string): Promise<boolean>;
  isOrganizationMember(organizationId: number, userId: string): Promise<boolean>;
  
  // Organization Invites
  createOrganizationInvite(data: InsertOrganizationInvite): Promise<OrganizationInvite>;
  getOrganizationInvites(organizationId: number): Promise<OrganizationInvite[]>;
  getInviteByToken(token: string): Promise<OrganizationInvite | undefined>;
  getInviteById(id: number): Promise<OrganizationInvite | undefined>;
  updateInviteStatus(id: number, status: string): Promise<void>;
  deleteInvite(id: number): Promise<void>;
  getInvitesDueForReminder(): Promise<OrganizationInvite[]>;
  markInviteReminderSent(id: number): Promise<void>;
  
  // HR Documents (organization-aware)
  getHRDocumentsForOrganization(organizationId: number): Promise<HRDocument[]>;
  
  // Daily Task Completions
  getDailyTaskCompletions(userId: string, date: string): Promise<DailyTaskCompletion[]>;
  getTaskCompletionStats(userId: string, startDate: string, endDate: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    byCategory: Record<string, { total: number; completed: number }>;
  }>;
  createDailyTaskCompletion(task: InsertDailyTaskCompletion): Promise<DailyTaskCompletion>;
  updateDailyTaskCompletion(id: number, data: Partial<InsertDailyTaskCompletion>): Promise<DailyTaskCompletion | undefined>;
  toggleTaskCompletion(id: number, completed: boolean): Promise<DailyTaskCompletion | undefined>;
  deleteDailyTaskCompletion(id: number): Promise<void>;
  getTaskCompletionTrends(userId: string, weeks: number): Promise<{ weekStart: string; completed: number; total: number }[]>;
  getDailyCompletionHeatmap(userId: string, startDate: string, endDate: string): Promise<{ date: string; completed: number; total: number }[]>;
  
  // Repair Vendors
  getRepairVendors(userId: string): Promise<RepairVendor[]>;
  getRepairVendor(id: number, userId: string): Promise<RepairVendor | undefined>;
  getRepairVendorsBySpecialty(userId: string, specialty: string): Promise<RepairVendor[]>;
  createRepairVendor(data: InsertRepairVendor): Promise<RepairVendor>;
  updateRepairVendor(id: number, userId: string, data: Partial<InsertRepairVendor>): Promise<RepairVendor | undefined>;
  deleteRepairVendor(id: number, userId: string): Promise<void>;
  toggleVendorFavorite(id: number, userId: string): Promise<RepairVendor | undefined>;
  
  // Facility Issues
  getFacilityIssues(userId: string): Promise<FacilityIssue[]>;
  getOpenFacilityIssues(userId: string): Promise<FacilityIssue[]>;
  getFacilityIssue(id: number, userId: string): Promise<FacilityIssue | undefined>;
  createFacilityIssue(data: InsertFacilityIssue): Promise<FacilityIssue>;
  updateFacilityIssue(id: number, userId: string, data: Partial<InsertFacilityIssue>): Promise<FacilityIssue | undefined>;
  resolveFacilityIssue(id: number, userId: string, repairNotes?: string, repairCost?: string): Promise<FacilityIssue | undefined>;
  deleteFacilityIssue(id: number, userId: string): Promise<void>;
  getFacilityIssueStats(userId: string): Promise<{ open: number; inProgress: number; resolved: number; avgResolutionDays: number }>;
  
  // Kitchen Shift Data
  getKitchenShiftData(userId: string): Promise<KitchenShiftData[]>;
  getKitchenShiftByDate(userId: string, shiftDate: string, daypart: string): Promise<KitchenShiftData | undefined>;
  getRecentKitchenShifts(userId: string, dayOfWeek: string, daypart: string): Promise<KitchenShiftData[]>;
  saveKitchenShiftData(data: InsertKitchenShiftData): Promise<KitchenShiftData>;
  updateKitchenShiftData(id: number, userId: string, data: Partial<InsertKitchenShiftData>): Promise<KitchenShiftData | undefined>;
  saveKitchenDebrief(userId: string, shiftDate: string, daypart: string, debrief: { whatWentWell?: string; whatSucked?: string; fixForTomorrow?: string; debriefStructured?: any }): Promise<KitchenShiftData>;
  
  // Handbook Settings
  getHandbookSettings(userId: string): Promise<HandbookSettings | undefined>;
  upsertHandbookSettings(userId: string, data: Partial<InsertHandbookSettings>): Promise<HandbookSettings>;

  // Restaurant Standards (Certification)
  getRestaurantStandards(userId: string): Promise<RestaurantStandards[]>;
  getActiveStandards(userId: string): Promise<RestaurantStandards | undefined>;
  getRestaurantStandardsById(id: number): Promise<RestaurantStandards | undefined>;
  createRestaurantStandards(data: InsertRestaurantStandards): Promise<RestaurantStandards>;
  updateRestaurantStandards(id: number, userId: string, data: Partial<InsertRestaurantStandards>): Promise<RestaurantStandards | undefined>;
  deleteRestaurantStandards(id: number, userId: string): Promise<void>;

  // Certification Attempts
  getCertificationAttempts(userId: string): Promise<CertificationAttempt[]>;
  getCertificationAttemptsByTrainee(userId: string, traineeName: string): Promise<CertificationAttempt[]>;
  createCertificationAttempt(data: InsertCertificationAttempt): Promise<CertificationAttempt>;
  getCertificationStats(userId: string): Promise<{ totalAttempts: number; passed: number; failed: number; avgScore: number; byRole: Record<string, { attempts: number; passed: number; avgScore: number }>; byCategory: Record<string, number> }>;

  // Training Assignments
  getTrainingAssignments(userId: string): Promise<TrainingAssignment[]>;
  createTrainingAssignment(data: InsertTrainingAssignment): Promise<TrainingAssignment>;
  updateTrainingAssignment(id: number, userId: string, data: Partial<InsertTrainingAssignment>): Promise<TrainingAssignment | undefined>;
  deleteTrainingAssignment(id: number, userId: string): Promise<void>;
  getTrainingDayCompletions(assignmentId: number): Promise<TrainingDayCompletion[]>;
  createTrainingDayCompletion(data: InsertTrainingDayCompletion): Promise<TrainingDayCompletion>;
  deleteTrainingDayCompletion(id: number): Promise<void>;

  // Consultant Conversations
  getConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: number, userId: string): Promise<Conversation | undefined>;
  createConversation(userId: string, title: string): Promise<Conversation>;
  deleteConversation(id: number, userId: string): Promise<void>;
  getConversationMessages(conversationId: number): Promise<Message[]>;
  addMessage(conversationId: number, role: string, content: string): Promise<Message>;
  updateConversationTitle(id: number, title: string): Promise<void>;

  // Test Access Tokens
  createTestAccessToken(data: InsertTestAccessToken): Promise<TestAccessToken>;
  getTestAccessTokens(): Promise<TestAccessToken[]>;
  getTestAccessTokenByToken(token: string): Promise<TestAccessToken | undefined>;
  getTestAccessTokenById(id: number): Promise<TestAccessToken | undefined>;
  updateTestAccessToken(id: number, data: Partial<TestAccessToken>): Promise<TestAccessToken | undefined>;
  deleteTestAccessToken(id: number): Promise<void>;

  // Prime Cost Entries
  getPrimeCostEntries(userId: string): Promise<PrimeCostEntry[]>;
  getPrimeCostEntryById(id: number): Promise<PrimeCostEntry | undefined>;
  createPrimeCostEntry(data: InsertPrimeCostEntry): Promise<PrimeCostEntry>;
  updatePrimeCostEntry(id: number, userId: string, data: Partial<InsertPrimeCostEntry>): Promise<PrimeCostEntry | undefined>;
  deletePrimeCostEntry(id: number, userId: string): Promise<void>;

  getTrainingRecords(userId: string): Promise<TrainingRecord[]>;
  getTrainingRecordsByStaff(userId: string, staffMemberId: number): Promise<TrainingRecord[]>;
  getTrainingRecordById(id: number): Promise<TrainingRecord | undefined>;
  createTrainingRecord(data: InsertTrainingRecord): Promise<TrainingRecord>;
  updateTrainingRecord(id: number, userId: string, data: Partial<InsertTrainingRecord>): Promise<TrainingRecord | undefined>;
  deleteTrainingRecord(id: number, userId: string): Promise<boolean>;

  getGeneratedSops(userId: string): Promise<GeneratedSop[]>;
  getGeneratedSopByKey(userId: string, sopKey: string): Promise<GeneratedSop | undefined>;
  createOrUpdateSop(userId: string, data: InsertGeneratedSop): Promise<GeneratedSop>;
  deleteSop(id: number, userId: string): Promise<boolean>;
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

  async deleteTemplatesByCategory(category: string): Promise<void> {
    await db.delete(trainingTemplates).where(eq(trainingTemplates.category, category));
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

  async deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  async updateUserStripeInfo(userId: string, stripeInfo: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionTier?: string;
  }): Promise<User | undefined> {
    const [user] = await db.update(users).set(stripeInfo).where(eq(users.id, userId)).returning();
    return user;
  }

  async updateConsultantMessageCount(userId: string, count: number, resetDate?: string): Promise<User | undefined> {
    const updateData: any = { consultantMessagesUsed: count };
    if (resetDate) updateData.consultantMessagesResetDate = resetDate;
    const [user] = await db.update(users).set(updateData).where(eq(users.id, userId)).returning();
    return user;
  }

  async updateUserProfile(userId: string, profile: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    restaurantName?: string;
    role?: string;
    profileImageUrl?: string;
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
    const allHolidays = await db.select().from(restaurantHolidays).orderBy(restaurantHolidays.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const withDates = allHolidays.map((h) => {
      const [month, day] = h.date.split('-').map(Number);
      const holidayThisYear = new Date(today.getFullYear(), month - 1, day);
      holidayThisYear.setHours(0, 0, 0, 0);
      if (holidayThisYear < today) {
        holidayThisYear.setFullYear(holidayThisYear.getFullYear() + 1);
      }
      return { holiday: h, nextDate: holidayThisYear };
    });

    withDates.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());

    return withDates.slice(0, 10).map((w) => w.holiday);
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
    await db.delete(postResults).where(eq(postResults.connectedAccountId, id));
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

  async updateOrganizationMemberRole(organizationId: number, userId: string, role: string): Promise<void> {
    await db.update(organizationMembers)
      .set({ role })
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

  async getInviteById(id: number): Promise<OrganizationInvite | undefined> {
    const [invite] = await db.select().from(organizationInvites)
      .where(eq(organizationInvites.id, id));
    return invite;
  }

  async updateInviteStatus(id: number, status: string): Promise<void> {
    await db.update(organizationInvites)
      .set({ status })
      .where(eq(organizationInvites.id, id));
  }

  async deleteInvite(id: number): Promise<void> {
    await db.delete(organizationInvites)
      .where(eq(organizationInvites.id, id));
  }

  async getInvitesDueForReminder(): Promise<OrganizationInvite[]> {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    return await db.select().from(organizationInvites)
      .where(and(
        eq(organizationInvites.status, "pending"),
        eq(organizationInvites.reminderEnabled, true),
        eq(organizationInvites.reminderSent, false),
        lte(organizationInvites.createdAt, threeDaysAgo),
        gte(organizationInvites.expiresAt, now),
      ));
  }

  async markInviteReminderSent(id: number): Promise<void> {
    await db.update(organizationInvites)
      .set({ reminderSent: true, reminderSentAt: new Date() })
      .where(eq(organizationInvites.id, id));
  }

  // HR Documents (organization-aware)
  async getHRDocumentsForOrganization(organizationId: number): Promise<HRDocument[]> {
    return await db.select().from(hrDocuments)
      .where(eq(hrDocuments.organizationId, organizationId))
      .orderBy(desc(hrDocuments.createdAt));
  }

  // Internal Messages
  async createInternalMessage(data: InsertInternalMessage): Promise<InternalMessage> {
    const [message] = await db.insert(internalMessages).values(data).returning();
    return message;
  }

  async getInternalMessages(userId: string, organizationId: number): Promise<InternalMessage[]> {
    return await db.select().from(internalMessages)
      .where(and(
        eq(internalMessages.organizationId, organizationId),
        or(
          eq(internalMessages.recipientId, userId),
          eq(internalMessages.senderId, userId),
          sql`${internalMessages.recipientId} IS NULL`
        )
      ))
      .orderBy(desc(internalMessages.createdAt));
  }

  async getInternalMessage(id: number): Promise<InternalMessage | undefined> {
    const [message] = await db.select().from(internalMessages)
      .where(eq(internalMessages.id, id));
    return message;
  }

  async markMessageAsRead(id: number, userId: string): Promise<void> {
    await db.update(internalMessages)
      .set({ isRead: true })
      .where(and(
        eq(internalMessages.id, id),
        or(
          eq(internalMessages.recipientId, userId),
          sql`${internalMessages.recipientId} IS NULL`
        )
      ));
  }

  async getUnreadMessageCount(userId: string, organizationId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(internalMessages)
      .where(and(
        eq(internalMessages.organizationId, organizationId),
        eq(internalMessages.isRead, false),
        or(
          eq(internalMessages.recipientId, userId),
          sql`${internalMessages.recipientId} IS NULL`
        ),
        sql`${internalMessages.senderId} != ${userId}`
      ));
    return result[0]?.count || 0;
  }

  async deleteInternalMessage(id: number, userId: string): Promise<void> {
    await db.delete(internalMessages)
      .where(and(
        eq(internalMessages.id, id),
        eq(internalMessages.senderId, userId)
      ));
  }

  // Restaurant Profiles
  async getRestaurantProfile(userId: string): Promise<RestaurantProfile | undefined> {
    const [profile] = await db.select().from(restaurantProfiles)
      .where(eq(restaurantProfiles.userId, userId));
    return profile;
  }

  async createRestaurantProfile(profile: InsertRestaurantProfile): Promise<RestaurantProfile> {
    const [newProfile] = await db.insert(restaurantProfiles)
      .values(profile)
      .returning();
    return newProfile;
  }

  async updateRestaurantProfile(userId: string, data: Partial<InsertRestaurantProfile>): Promise<RestaurantProfile | undefined> {
    const [updated] = await db.update(restaurantProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(restaurantProfiles.userId, userId))
      .returning();
    return updated;
  }

  async upsertRestaurantProfile(userId: string, data: Partial<InsertRestaurantProfile>): Promise<RestaurantProfile> {
    const existing = await this.getRestaurantProfile(userId);
    if (existing) {
      return (await this.updateRestaurantProfile(userId, data)) as RestaurantProfile;
    } else {
      return await this.createRestaurantProfile({ userId, ...data });
    }
  }

  // Handbook Settings
  async getHandbookSettings(userId: string): Promise<HandbookSettings | undefined> {
    const [settings] = await db.select().from(handbookSettings)
      .where(eq(handbookSettings.userId, userId));
    return settings;
  }

  async upsertHandbookSettings(userId: string, data: Partial<InsertHandbookSettings>): Promise<HandbookSettings> {
    const existing = await this.getHandbookSettings(userId);
    if (existing) {
      const [updated] = await db.update(handbookSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(handbookSettings.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(handbookSettings)
        .values({ userId, ...data })
        .returning();
      return created;
    }
  }

  // Daily Task Completions
  async getDailyTaskCompletions(userId: string, date: string): Promise<DailyTaskCompletion[]> {
    return await db.select().from(dailyTaskCompletions)
      .where(and(
        eq(dailyTaskCompletions.userId, userId),
        eq(dailyTaskCompletions.taskDate, date)
      ))
      .orderBy(dailyTaskCompletions.createdAt);
  }

  async getTaskCompletionStats(userId: string, startDate: string, endDate: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    byCategory: Record<string, { total: number; completed: number }>;
  }> {
    const tasks = await db.select().from(dailyTaskCompletions)
      .where(and(
        eq(dailyTaskCompletions.userId, userId),
        gte(dailyTaskCompletions.taskDate, startDate),
        lte(dailyTaskCompletions.taskDate, endDate)
      ));

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const byCategory: Record<string, { total: number; completed: number }> = {};
    tasks.forEach(task => {
      const cat = task.category || 'uncategorized';
      if (!byCategory[cat]) {
        byCategory[cat] = { total: 0, completed: 0 };
      }
      byCategory[cat].total++;
      if (task.completed) {
        byCategory[cat].completed++;
      }
    });

    return { totalTasks, completedTasks, completionRate, byCategory };
  }

  async createDailyTaskCompletion(task: InsertDailyTaskCompletion): Promise<DailyTaskCompletion> {
    const [newTask] = await db.insert(dailyTaskCompletions)
      .values(task)
      .returning();
    return newTask;
  }

  async updateDailyTaskCompletion(id: number, data: Partial<InsertDailyTaskCompletion>): Promise<DailyTaskCompletion | undefined> {
    const [updated] = await db.update(dailyTaskCompletions)
      .set(data)
      .where(eq(dailyTaskCompletions.id, id))
      .returning();
    return updated;
  }

  async toggleTaskCompletion(id: number, completed: boolean): Promise<DailyTaskCompletion | undefined> {
    const [updated] = await db.update(dailyTaskCompletions)
      .set({ 
        completed, 
        completedAt: completed ? new Date() : null 
      })
      .where(eq(dailyTaskCompletions.id, id))
      .returning();
    return updated;
  }

  async deleteDailyTaskCompletion(id: number): Promise<void> {
    await db.delete(dailyTaskCompletions)
      .where(eq(dailyTaskCompletions.id, id));
  }

  async getTaskCompletionTrends(userId: string, weeks: number): Promise<{ weekStart: string; completed: number; total: number }[]> {
    const results: { weekStart: string; completed: number; total: number }[] = [];
    const now = new Date();
    
    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (now.getDay() + (i * 7)));
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const startStr = weekStart.toISOString().split('T')[0];
      const endStr = weekEnd.toISOString().split('T')[0];
      
      const tasks = await db.select().from(dailyTaskCompletions)
        .where(and(
          eq(dailyTaskCompletions.userId, userId),
          gte(dailyTaskCompletions.taskDate, startStr),
          lte(dailyTaskCompletions.taskDate, endStr)
        ));
      
      results.push({
        weekStart: startStr,
        completed: tasks.filter(t => t.completed).length,
        total: tasks.length
      });
    }
    
    return results;
  }

  async getDailyCompletionHeatmap(userId: string, startDate: string, endDate: string): Promise<{ date: string; completed: number; total: number }[]> {
    // Get all tasks in the date range
    const tasks = await db.select().from(dailyTaskCompletions)
      .where(and(
        eq(dailyTaskCompletions.userId, userId),
        gte(dailyTaskCompletions.taskDate, startDate),
        lte(dailyTaskCompletions.taskDate, endDate)
      ));
    
    // Group by date
    const byDate: Record<string, { completed: number; total: number }> = {};
    tasks.forEach(task => {
      if (!byDate[task.taskDate]) {
        byDate[task.taskDate] = { completed: 0, total: 0 };
      }
      byDate[task.taskDate].total++;
      if (task.completed) {
        byDate[task.taskDate].completed++;
      }
    });
    
    // Convert to array sorted by date
    return Object.entries(byDate)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Repair Vendors
  async getRepairVendors(userId: string): Promise<RepairVendor[]> {
    return await db.select().from(repairVendors)
      .where(eq(repairVendors.userId, userId))
      .orderBy(desc(repairVendors.isFavorite), repairVendors.name);
  }

  async getRepairVendor(id: number, userId: string): Promise<RepairVendor | undefined> {
    const [vendor] = await db.select().from(repairVendors)
      .where(and(eq(repairVendors.id, id), eq(repairVendors.userId, userId)));
    return vendor;
  }

  async getRepairVendorsBySpecialty(userId: string, specialty: string): Promise<RepairVendor[]> {
    return await db.select().from(repairVendors)
      .where(and(
        eq(repairVendors.userId, userId),
        or(eq(repairVendors.specialty, specialty), eq(repairVendors.specialty, "general"))
      ))
      .orderBy(desc(repairVendors.isFavorite), desc(repairVendors.rating));
  }

  async createRepairVendor(data: InsertRepairVendor): Promise<RepairVendor> {
    const [vendor] = await db.insert(repairVendors).values(data).returning();
    return vendor;
  }

  async updateRepairVendor(id: number, userId: string, data: Partial<InsertRepairVendor>): Promise<RepairVendor | undefined> {
    const [updated] = await db.update(repairVendors)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(repairVendors.id, id), eq(repairVendors.userId, userId)))
      .returning();
    return updated;
  }

  async deleteRepairVendor(id: number, userId: string): Promise<void> {
    await db.delete(repairVendors)
      .where(and(eq(repairVendors.id, id), eq(repairVendors.userId, userId)));
  }

  async toggleVendorFavorite(id: number, userId: string): Promise<RepairVendor | undefined> {
    const vendor = await this.getRepairVendor(id, userId);
    if (!vendor) return undefined;
    
    const [updated] = await db.update(repairVendors)
      .set({ isFavorite: !vendor.isFavorite, updatedAt: new Date() })
      .where(and(eq(repairVendors.id, id), eq(repairVendors.userId, userId)))
      .returning();
    return updated;
  }

  // Facility Issues
  async getFacilityIssues(userId: string): Promise<FacilityIssue[]> {
    return await db.select().from(facilityIssues)
      .where(eq(facilityIssues.userId, userId))
      .orderBy(desc(facilityIssues.reportedAt));
  }

  async getOpenFacilityIssues(userId: string): Promise<FacilityIssue[]> {
    return await db.select().from(facilityIssues)
      .where(and(
        eq(facilityIssues.userId, userId),
        or(
          eq(facilityIssues.status, "open"),
          eq(facilityIssues.status, "in_progress"),
          eq(facilityIssues.status, "waiting_parts")
        )
      ))
      .orderBy(desc(facilityIssues.reportedAt));
  }

  async getFacilityIssue(id: number, userId: string): Promise<FacilityIssue | undefined> {
    const [issue] = await db.select().from(facilityIssues)
      .where(and(eq(facilityIssues.id, id), eq(facilityIssues.userId, userId)));
    return issue;
  }

  async createFacilityIssue(data: InsertFacilityIssue): Promise<FacilityIssue> {
    const [issue] = await db.insert(facilityIssues).values(data).returning();
    return issue;
  }

  async updateFacilityIssue(id: number, userId: string, data: Partial<InsertFacilityIssue>): Promise<FacilityIssue | undefined> {
    const [updated] = await db.update(facilityIssues)
      .set(data)
      .where(and(eq(facilityIssues.id, id), eq(facilityIssues.userId, userId)))
      .returning();
    return updated;
  }

  async resolveFacilityIssue(id: number, userId: string, repairNotes?: string, repairCost?: string): Promise<FacilityIssue | undefined> {
    const [resolved] = await db.update(facilityIssues)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
        repairNotes: repairNotes || null,
        repairCost: repairCost || null
      })
      .where(and(eq(facilityIssues.id, id), eq(facilityIssues.userId, userId)))
      .returning();
    return resolved;
  }

  async deleteFacilityIssue(id: number, userId: string): Promise<void> {
    await db.delete(facilityIssues)
      .where(and(eq(facilityIssues.id, id), eq(facilityIssues.userId, userId)));
  }

  async getFacilityIssueStats(userId: string): Promise<{ open: number; inProgress: number; resolved: number; avgResolutionDays: number }> {
    const issues = await this.getFacilityIssues(userId);
    
    const open = issues.filter(i => i.status === "open").length;
    const inProgress = issues.filter(i => i.status === "in_progress" || i.status === "waiting_parts").length;
    const resolved = issues.filter(i => i.status === "resolved" || i.status === "closed").length;
    
    // Calculate average resolution time for resolved issues
    const resolvedIssues = issues.filter(i => i.resolvedAt && i.reportedAt);
    let avgResolutionDays = 0;
    if (resolvedIssues.length > 0) {
      const totalDays = resolvedIssues.reduce((sum, issue) => {
        const reported = new Date(issue.reportedAt!);
        const resolved = new Date(issue.resolvedAt!);
        return sum + (resolved.getTime() - reported.getTime()) / (1000 * 60 * 60 * 24);
      }, 0);
      avgResolutionDays = Math.round((totalDays / resolvedIssues.length) * 10) / 10;
    }
    
    return { open, inProgress, resolved, avgResolutionDays };
  }

  // Kitchen Shift Data
  async getKitchenShiftData(userId: string): Promise<KitchenShiftData[]> {
    return await db.select().from(kitchenShiftData)
      .where(eq(kitchenShiftData.userId, userId))
      .orderBy(desc(kitchenShiftData.createdAt));
  }

  async getKitchenShiftByDate(userId: string, shiftDate: string, daypart: string): Promise<KitchenShiftData | undefined> {
    const [shift] = await db.select().from(kitchenShiftData)
      .where(and(
        eq(kitchenShiftData.userId, userId),
        eq(kitchenShiftData.shiftDate, shiftDate),
        eq(kitchenShiftData.daypart, daypart)
      ));
    return shift;
  }

  async getRecentKitchenShifts(userId: string, dayOfWeek: string, daypart: string): Promise<KitchenShiftData[]> {
    return await db.select().from(kitchenShiftData)
      .where(and(
        eq(kitchenShiftData.userId, userId),
        eq(kitchenShiftData.dayOfWeek, dayOfWeek),
        eq(kitchenShiftData.daypart, daypart)
      ))
      .orderBy(desc(kitchenShiftData.createdAt))
      .limit(4);
  }

  async saveKitchenShiftData(data: InsertKitchenShiftData): Promise<KitchenShiftData> {
    // Check if a shift already exists for this date/daypart
    const existing = await this.getKitchenShiftByDate(data.userId, data.shiftDate, data.daypart);
    if (existing) {
      // Update existing
      const [updated] = await db.update(kitchenShiftData)
        .set(data)
        .where(eq(kitchenShiftData.id, existing.id))
        .returning();
      return updated;
    }
    const [shift] = await db.insert(kitchenShiftData).values(data).returning();
    return shift;
  }

  async updateKitchenShiftData(id: number, userId: string, data: Partial<InsertKitchenShiftData>): Promise<KitchenShiftData | undefined> {
    const [updated] = await db.update(kitchenShiftData)
      .set(data)
      .where(and(eq(kitchenShiftData.id, id), eq(kitchenShiftData.userId, userId)))
      .returning();
    return updated;
  }

  async saveKitchenDebrief(userId: string, shiftDate: string, daypart: string, debrief: { whatWentWell?: string; whatSucked?: string; fixForTomorrow?: string; debriefStructured?: any }): Promise<KitchenShiftData> {
    const dayOfWeek = new Date(shiftDate).toLocaleDateString('en-US', { weekday: 'long' });
    const existing = await this.getKitchenShiftByDate(userId, shiftDate, daypart);
    
    if (existing) {
      const [updated] = await db.update(kitchenShiftData)
        .set({
          whatWentWell: debrief.whatWentWell,
          whatSucked: debrief.whatSucked,
          fixForTomorrow: debrief.fixForTomorrow,
          debriefStructured: debrief.debriefStructured
        })
        .where(eq(kitchenShiftData.id, existing.id))
        .returning();
      return updated;
    }
    
    const [shift] = await db.insert(kitchenShiftData).values({
      userId,
      shiftDate,
      dayOfWeek,
      daypart,
      whatWentWell: debrief.whatWentWell,
      whatSucked: debrief.whatSucked,
      fixForTomorrow: debrief.fixForTomorrow,
      debriefStructured: debrief.debriefStructured
    }).returning();
    return shift;
  }

  // ===== LIVING PLAYBOOKS =====

  async getPlaybooks(userId: string): Promise<Playbook[]> {
    return await db.select().from(playbooks)
      .where(eq(playbooks.userId, userId))
      .orderBy(desc(playbooks.updatedAt));
  }

  async getPlaybook(id: number, userId: string): Promise<Playbook | undefined> {
    const [playbook] = await db.select().from(playbooks)
      .where(and(eq(playbooks.id, id), eq(playbooks.userId, userId)));
    return playbook;
  }

  async createPlaybook(data: InsertPlaybook): Promise<Playbook> {
    const [playbook] = await db.insert(playbooks).values(data).returning();
    return playbook;
  }

  async updatePlaybook(id: number, userId: string, data: Partial<InsertPlaybook>): Promise<Playbook | undefined> {
    const [updated] = await db.update(playbooks)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(playbooks.id, id), eq(playbooks.userId, userId)))
      .returning();
    return updated;
  }

  async deletePlaybook(id: number, userId: string): Promise<void> {
    await db.delete(playbooks).where(and(eq(playbooks.id, id), eq(playbooks.userId, userId)));
  }

  async duplicatePlaybook(id: number, userId: string): Promise<Playbook | undefined> {
    const original = await this.getPlaybook(id, userId);
    if (!original) return undefined;
    
    const newPlaybook = await this.createPlaybook({
      userId,
      title: `${original.title} (Copy)`,
      description: original.description,
      category: original.category,
      role: original.role,
      mode: original.mode,
      status: "draft",
      version: 1,
    });
    
    const steps = await this.getPlaybookSteps(id);
    for (const step of steps) {
      await this.createPlaybookStep({
        playbookId: newPlaybook.id,
        stepNumber: step.stepNumber,
        content: step.content,
        photoUrl: step.photoUrl,
        visualCue: step.visualCue,
        commonFailure: step.commonFailure,
        requiredPhoto: step.requiredPhoto,
        isCheckpoint: step.isCheckpoint,
      });
    }
    
    return newPlaybook;
  }

  async getPlaybookSteps(playbookId: number): Promise<PlaybookStep[]> {
    return await db.select().from(playbookSteps)
      .where(eq(playbookSteps.playbookId, playbookId))
      .orderBy(playbookSteps.stepNumber);
  }

  async createPlaybookStep(data: InsertPlaybookStep): Promise<PlaybookStep> {
    const [step] = await db.insert(playbookSteps).values(data).returning();
    return step;
  }

  async updatePlaybookStep(id: number, data: Partial<InsertPlaybookStep>): Promise<PlaybookStep | undefined> {
    const [updated] = await db.update(playbookSteps)
      .set(data)
      .where(eq(playbookSteps.id, id))
      .returning();
    return updated;
  }

  async deletePlaybookStep(id: number): Promise<void> {
    await db.delete(playbookSteps).where(eq(playbookSteps.id, id));
  }

  async bulkUpdatePlaybookSteps(playbookId: number, stepsData: InsertPlaybookStep[]): Promise<PlaybookStep[]> {
    await db.delete(playbookSteps).where(eq(playbookSteps.playbookId, playbookId));
    if (stepsData.length === 0) return [];
    const steps = await db.insert(playbookSteps).values(stepsData).returning();
    return steps;
  }

  async getPlaybookAssignments(playbookId: number): Promise<PlaybookAssignment[]> {
    return await db.select().from(playbookAssignments)
      .where(eq(playbookAssignments.playbookId, playbookId));
  }

  async createPlaybookAssignment(data: InsertPlaybookAssignment): Promise<PlaybookAssignment> {
    const [assignment] = await db.insert(playbookAssignments).values(data).returning();
    return assignment;
  }

  async deletePlaybookAssignment(id: number): Promise<void> {
    await db.delete(playbookAssignments).where(eq(playbookAssignments.id, id));
  }

  async getPlaybookAcknowledgments(playbookId: number, shiftDate?: string): Promise<PlaybookAcknowledgment[]> {
    if (shiftDate) {
      return await db.select().from(playbookAcknowledgments)
        .where(and(eq(playbookAcknowledgments.playbookId, playbookId), eq(playbookAcknowledgments.shiftDate, shiftDate)));
    }
    return await db.select().from(playbookAcknowledgments)
      .where(eq(playbookAcknowledgments.playbookId, playbookId))
      .orderBy(desc(playbookAcknowledgments.acknowledgedAt));
  }

  async createPlaybookAcknowledgment(data: InsertPlaybookAcknowledgment): Promise<PlaybookAcknowledgment> {
    const [ack] = await db.insert(playbookAcknowledgments).values(data).returning();
    await db.update(playbooks)
      .set({ totalAcknowledgments: sql`COALESCE(${playbooks.totalAcknowledgments}, 0) + 1` })
      .where(eq(playbooks.id, data.playbookId));
    return ack;
  }

  async getPlaybookAudits(playbookId: number): Promise<PlaybookAudit[]> {
    return await db.select().from(playbookAudits)
      .where(eq(playbookAudits.playbookId, playbookId))
      .orderBy(desc(playbookAudits.auditDate));
  }

  async createPlaybookAudit(data: InsertPlaybookAudit): Promise<PlaybookAudit> {
    const [audit] = await db.insert(playbookAudits).values(data).returning();
    const allAudits = await this.getPlaybookAudits(data.playbookId);
    const totalScore = allAudits.reduce((sum, a) => sum + (a.overallScore || 0), 0);
    const avgScore = Math.round(totalScore / allAudits.length);
    await db.update(playbooks)
      .set({ 
        totalAudits: allAudits.length,
        auditPassRate: avgScore
      })
      .where(eq(playbooks.id, data.playbookId));
    return audit;
  }

  async updatePlaybookAudit(id: number, data: Partial<InsertPlaybookAudit>): Promise<PlaybookAudit | undefined> {
    const [updated] = await db.update(playbookAudits)
      .set(data)
      .where(eq(playbookAudits.id, id))
      .returning();
    return updated;
  }

  // Restaurant Standards (Certification)
  async getRestaurantStandards(userId: string): Promise<RestaurantStandards[]> {
    return await db.select().from(restaurantStandards)
      .where(eq(restaurantStandards.userId, userId))
      .orderBy(desc(restaurantStandards.createdAt));
  }

  async getActiveStandards(userId: string): Promise<RestaurantStandards | undefined> {
    const results = await db.select().from(restaurantStandards)
      .where(and(eq(restaurantStandards.userId, userId), eq(restaurantStandards.isActive, true)))
      .limit(1);
    return results[0];
  }

  async getRestaurantStandardsById(id: number): Promise<RestaurantStandards | undefined> {
    const results = await db.select().from(restaurantStandards)
      .where(eq(restaurantStandards.id, id))
      .limit(1);
    return results[0];
  }

  async createRestaurantStandards(data: InsertRestaurantStandards): Promise<RestaurantStandards> {
    const [created] = await db.insert(restaurantStandards).values(data).returning();
    return created;
  }

  async updateRestaurantStandards(id: number, userId: string, data: Partial<InsertRestaurantStandards>): Promise<RestaurantStandards | undefined> {
    const [updated] = await db.update(restaurantStandards)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(restaurantStandards.id, id), eq(restaurantStandards.userId, userId)))
      .returning();
    return updated;
  }

  async deleteRestaurantStandards(id: number, userId: string): Promise<void> {
    await db.delete(restaurantStandards)
      .where(and(eq(restaurantStandards.id, id), eq(restaurantStandards.userId, userId)));
  }

  // Certification Attempts
  async getCertificationAttempts(userId: string): Promise<CertificationAttempt[]> {
    return await db.select().from(certificationAttempts)
      .where(eq(certificationAttempts.userId, userId))
      .orderBy(desc(certificationAttempts.createdAt));
  }

  async getCertificationAttemptsByTrainee(userId: string, traineeName: string): Promise<CertificationAttempt[]> {
    return await db.select().from(certificationAttempts)
      .where(and(eq(certificationAttempts.userId, userId), eq(certificationAttempts.traineeName, traineeName)))
      .orderBy(desc(certificationAttempts.createdAt));
  }

  async createCertificationAttempt(data: InsertCertificationAttempt): Promise<CertificationAttempt> {
    const [created] = await db.insert(certificationAttempts).values(data).returning();
    return created;
  }

  async getCertificationStats(userId: string): Promise<{ totalAttempts: number; passed: number; failed: number; avgScore: number; byRole: Record<string, { attempts: number; passed: number; avgScore: number }>; byCategory: Record<string, number> }> {
    const attempts = await db.select().from(certificationAttempts)
      .where(eq(certificationAttempts.userId, userId));

    const totalAttempts = attempts.length;
    const passed = attempts.filter(a => a.passed === true).length;
    const failed = attempts.filter(a => a.passed === false).length;
    const scores = attempts.filter(a => a.totalScore !== null).map(a => a.totalScore!);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : 0;

    const byRole: Record<string, { attempts: number; passed: number; avgScore: number }> = {};
    for (const attempt of attempts) {
      if (!byRole[attempt.role]) {
        byRole[attempt.role] = { attempts: 0, passed: 0, avgScore: 0 };
      }
      byRole[attempt.role].attempts++;
      if (attempt.passed) byRole[attempt.role].passed++;
    }
    for (const role of Object.keys(byRole)) {
      const roleAttempts = attempts.filter(a => a.role === role);
      const roleScores = roleAttempts.filter(a => a.totalScore !== null).map(a => a.totalScore!);
      byRole[role].avgScore = roleScores.length > 0 ? Math.round(roleScores.reduce((sum, s) => sum + s, 0) / roleScores.length) : 0;
    }

    const byCategory: Record<string, number> = {};
    for (const attempt of attempts) {
      const phase = attempt.phase;
      byCategory[phase] = (byCategory[phase] || 0) + 1;
    }

    return { totalAttempts, passed, failed, avgScore, byRole, byCategory };
  }

  async getTrainingAssignments(userId: string): Promise<TrainingAssignment[]> {
    return await db.select().from(trainingAssignments).where(eq(trainingAssignments.userId, userId)).orderBy(desc(trainingAssignments.createdAt));
  }

  async createTrainingAssignment(data: InsertTrainingAssignment): Promise<TrainingAssignment> {
    const [assignment] = await db.insert(trainingAssignments).values(data).returning();
    return assignment;
  }

  async updateTrainingAssignment(id: number, userId: string, data: Partial<InsertTrainingAssignment>): Promise<TrainingAssignment | undefined> {
    const [updated] = await db.update(trainingAssignments).set(data).where(and(eq(trainingAssignments.id, id), eq(trainingAssignments.userId, userId))).returning();
    return updated;
  }

  async deleteTrainingAssignment(id: number, userId: string): Promise<void> {
    await db.delete(trainingDayCompletions).where(eq(trainingDayCompletions.assignmentId, id));
    await db.delete(trainingAssignments).where(and(eq(trainingAssignments.id, id), eq(trainingAssignments.userId, userId)));
  }

  async getTrainingDayCompletions(assignmentId: number): Promise<TrainingDayCompletion[]> {
    return await db.select().from(trainingDayCompletions).where(eq(trainingDayCompletions.assignmentId, assignmentId)).orderBy(trainingDayCompletions.dayNumber);
  }

  async createTrainingDayCompletion(data: InsertTrainingDayCompletion): Promise<TrainingDayCompletion> {
    const [completion] = await db.insert(trainingDayCompletions).values(data).returning();
    return completion;
  }

  async deleteTrainingDayCompletion(id: number): Promise<void> {
    await db.delete(trainingDayCompletions).where(eq(trainingDayCompletions.id, id));
  }

  // Consultant Conversations
  async getConversations(userId: string): Promise<Conversation[]> {
    return await db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(desc(conversations.createdAt));
  }

  async getConversation(id: number, userId: string): Promise<Conversation | undefined> {
    const [conv] = await db.select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
    return conv;
  }

  async createConversation(userId: string, title: string): Promise<Conversation> {
    const [conv] = await db.insert(conversations).values({ userId, title }).returning();
    return conv;
  }

  async deleteConversation(id: number, userId: string): Promise<void> {
    await db.delete(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  }

  async getConversationMessages(conversationId: number): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  }

  async addMessage(conversationId: number, role: string, content: string): Promise<Message> {
    const [msg] = await db.insert(messages).values({ conversationId, role, content }).returning();
    return msg;
  }

  async updateConversationTitle(id: number, title: string): Promise<void> {
    await db.update(conversations).set({ title }).where(eq(conversations.id, id));
  }

  // Test Access Tokens
  async createTestAccessToken(data: InsertTestAccessToken): Promise<TestAccessToken> {
    const [token] = await db.insert(testAccessTokens).values(data).returning();
    return token;
  }

  async getTestAccessTokens(): Promise<TestAccessToken[]> {
    return await db.select().from(testAccessTokens).orderBy(desc(testAccessTokens.createdAt));
  }

  async getTestAccessTokenByToken(token: string): Promise<TestAccessToken | undefined> {
    const [result] = await db.select().from(testAccessTokens).where(eq(testAccessTokens.token, token));
    return result;
  }

  async getTestAccessTokenById(id: number): Promise<TestAccessToken | undefined> {
    const [result] = await db.select().from(testAccessTokens).where(eq(testAccessTokens.id, id));
    return result;
  }

  async updateTestAccessToken(id: number, data: Partial<TestAccessToken>): Promise<TestAccessToken | undefined> {
    const [result] = await db.update(testAccessTokens).set(data).where(eq(testAccessTokens.id, id)).returning();
    return result;
  }

  async deleteTestAccessToken(id: number): Promise<void> {
    await db.delete(testAccessTokens).where(eq(testAccessTokens.id, id));
  }

  async getPrimeCostEntries(userId: string): Promise<PrimeCostEntry[]> {
    return db.select().from(primeCostEntries).where(eq(primeCostEntries.userId, userId)).orderBy(desc(primeCostEntries.weekEnding));
  }

  async getPrimeCostEntryById(id: number): Promise<PrimeCostEntry | undefined> {
    const [result] = await db.select().from(primeCostEntries).where(eq(primeCostEntries.id, id));
    return result;
  }

  async createPrimeCostEntry(data: InsertPrimeCostEntry): Promise<PrimeCostEntry> {
    const existing = await db.select().from(primeCostEntries).where(
      and(eq(primeCostEntries.userId, data.userId), eq(primeCostEntries.weekEnding, data.weekEnding))
    );
    if (existing.length > 0) {
      const [updated] = await db.update(primeCostEntries).set({
        ...data,
        updatedAt: new Date(),
      }).where(eq(primeCostEntries.id, existing[0].id)).returning();
      return updated;
    }
    const [entry] = await db.insert(primeCostEntries).values(data).returning();
    return entry;
  }

  async updatePrimeCostEntry(id: number, userId: string, data: Partial<InsertPrimeCostEntry>): Promise<PrimeCostEntry | undefined> {
    const [result] = await db.update(primeCostEntries).set({
      ...data,
      updatedAt: new Date(),
    }).where(and(eq(primeCostEntries.id, id), eq(primeCostEntries.userId, userId))).returning();
    return result;
  }

  async deletePrimeCostEntry(id: number, userId: string): Promise<void> {
    await db.delete(primeCostEntries).where(and(eq(primeCostEntries.id, id), eq(primeCostEntries.userId, userId)));
  }

  async getTrainingRecords(userId: string): Promise<TrainingRecord[]> {
    return db.select().from(trainingRecords).where(eq(trainingRecords.userId, userId)).orderBy(desc(trainingRecords.createdAt));
  }

  async getTrainingRecordsByStaff(userId: string, staffMemberId: number): Promise<TrainingRecord[]> {
    return db.select().from(trainingRecords).where(
      and(eq(trainingRecords.userId, userId), eq(trainingRecords.staffMemberId, staffMemberId))
    ).orderBy(desc(trainingRecords.createdAt));
  }

  async getTrainingRecordById(id: number): Promise<TrainingRecord | undefined> {
    const [result] = await db.select().from(trainingRecords).where(eq(trainingRecords.id, id));
    return result;
  }

  async createTrainingRecord(data: InsertTrainingRecord): Promise<TrainingRecord> {
    const [record] = await db.insert(trainingRecords).values(data).returning();
    return record;
  }

  async updateTrainingRecord(id: number, userId: string, data: Partial<InsertTrainingRecord>): Promise<TrainingRecord | undefined> {
    const [result] = await db.update(trainingRecords).set({
      ...data,
      updatedAt: new Date(),
    }).where(and(eq(trainingRecords.id, id), eq(trainingRecords.userId, userId))).returning();
    return result;
  }

  async deleteTrainingRecord(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(trainingRecords).where(and(eq(trainingRecords.id, id), eq(trainingRecords.userId, userId))).returning();
    return result.length > 0;
  }

  async getGeneratedSops(userId: string): Promise<GeneratedSop[]> {
    return await db.select().from(generatedSops).where(eq(generatedSops.userId, userId)).orderBy(generatedSops.sopCategory, generatedSops.sopKey);
  }

  async getGeneratedSopByKey(userId: string, sopKey: string): Promise<GeneratedSop | undefined> {
    const [sop] = await db.select().from(generatedSops).where(and(eq(generatedSops.userId, userId), eq(generatedSops.sopKey, sopKey)));
    return sop;
  }

  async createOrUpdateSop(userId: string, data: InsertGeneratedSop): Promise<GeneratedSop> {
    const existing = await this.getGeneratedSopByKey(userId, data.sopKey);
    if (existing) {
      const [updated] = await db.update(generatedSops).set({
        content: data.content,
        sopTitle: data.sopTitle,
        sopCategory: data.sopCategory,
        version: (existing.version || 1) + 1,
        lastGeneratedAt: new Date(),
      }).where(and(eq(generatedSops.userId, userId), eq(generatedSops.sopKey, data.sopKey))).returning();
      return updated;
    }
    const [created] = await db.insert(generatedSops).values({
      ...data,
      userId,
      version: 1,
    }).returning();
    return created;
  }

  async deleteSop(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(generatedSops).where(and(eq(generatedSops.id, id), eq(generatedSops.userId, userId))).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
