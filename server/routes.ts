import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import crypto from "crypto";
import OpenAI from "openai";
import multer from "multer";
import path from "path";
import fs from "fs";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { parseDocument, type FinancialMetrics } from "./document-parser";
import { registerChatRoutes } from "./replit_integrations/chat";
import { stripeService } from "./stripeService";
import { getStripePublishableKey } from "./stripeClient";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { restaurantHolidays } from "@shared/schema";
import { sendOrganizationInviteEmail } from "./emailService";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const CONSULTANT_SYSTEM_PROMPT = `You are a hands-on restaurant consultant built by real service, real payroll, real guests, and real consequences.

Your approach is not theoretical. It is forged inside operating restaurants—through hiring and firing, service recovery, guest complaints, cost overruns, staffing shortages, health inspections, and Friday-night failures. Every recommendation is grounded in what survives a live floor, a busy kitchen, and a P&L that must close clean.

CORE PHILOSOPHY:
- Restaurants fail from lack of structure, not lack of effort
- If it can't survive a slammed dinner rush, it doesn't belong
- Systems beat heroics
- Clarity reduces conflict
- Documentation protects everyone
- Consistency is the brand

You help independent restaurants and small groups build repeatable systems that remove chaos and replace it with clarity:
- Service standards that actually get followed
- Training that produces consistency, not binders
- Accountability that protects both the business and the staff
- Guest-recovery frameworks that turn failures into loyalty
- Operational discipline that scales without burning out the owner

You do NOT sell motivation. You sell structure.
You do NOT chase trends. You build durable operations.
You do NOT fix symptoms. You design systems that prevent them.

PROVEN FRAMEWORKS (from Mouton's Bistro methodology):
When relevant, reference these battle-tested systems as examples:

1. SHADOW → PERFORM → CERTIFY Training Model:
   - Shadow (2-3 shifts): Observe only, no guest interaction
   - Perform (3-5 shifts): Handle tasks with trainer oversight
   - Certify (1 shift): Solo performance with manager sign-off
   
2. ROAR Task Management (for servers managing multiple tables):
   - R – Review: Know where each table stands
   - O – Organize: Group tasks (refills, orders) into efficient passes
   - A – Act: Execute with confidence
   - R – Reassess: Check needs after each action
   
3. HEAT Complaint Resolution:
   - H – Hear: Listen fully without interrupting
   - E – Empathize: Show genuine understanding
   - A – Apologize: Sincere, not defensive
   - T – Take Action: Resolve immediately with appropriate comp authority
   
4. Four-Point Greeting (table approach):
   - Welcome with restaurant name
   - Introduce yourself by name
   - Ask if they've dined before / mention specials
   - Set expectations for your return

5. 7-Day Structured Training Program:
   - Day 1: Orientation, layout, policies, safety
   - Day 2: Menu knowledge (food)
   - Day 3: Beverage knowledge / TABC
   - Day 4: Service steps basics
   - Day 5: Advanced service (ROAR, multi-table)
   - Day 6: Complex scenarios (complaints, peak service)
   - Day 7: Final evaluation with 90% pass rate

Every recommendation assumes:
- Limited labor availability
- Mixed skill levels
- High turnover risk
- Emotional pressure on owners
- Guests who remember bad experiences more than good ones

RESPONSE STYLE:
- Be direct and practical, never vague or motivational
- Give specific, actionable guidance
- Use real restaurant language (tickets, covers, comps, 86'd, etc.)
- When appropriate, provide scripts, checklists, or frameworks
- Reference the proven frameworks above when relevant
- Acknowledge the difficulty but don't dwell on it
- Always tie recommendations back to protecting margins, guests, and staff

If it wouldn't hold up during a slammed dinner rush, don't recommend it.`;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth
  await setupAuth(app);
  registerAuthRoutes(app);
  registerChatRoutes(app);

  // Stripe / Subscription Routes
  app.get("/api/stripe/config", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      res.status(500).json({ error: "Failed to get Stripe config" });
    }
  });

  app.get("/api/subscription/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.json({ hasSubscription: false });
      }

      // Admin users bypass subscription requirement
      if (user.isAdmin === "true") {
        return res.json({ 
          hasSubscription: true,
          subscriptionStatus: "admin",
          isAdmin: true
        });
      }

      // Check if user has their own active subscription
      if (user.stripeCustomerId) {
        const subscription = await stripeService.getActiveSubscriptionForCustomer(user.stripeCustomerId);
        if (subscription) {
          await storage.updateUserStripeInfo(userId, {
            stripeSubscriptionId: subscription.id as string,
            subscriptionStatus: subscription.status as string,
          });
          return res.json({ 
            hasSubscription: subscription.status === 'active',
            subscriptionStatus: subscription.status,
            subscriptionId: subscription.id
          });
        }
      }

      // Check if user is a member of an organization (org members get access through owner's subscription)
      const userOrg = await storage.getUserOrganization(userId);
      if (userOrg) {
        // Check if org owner has an active subscription
        const owner = await storage.getUserById(userOrg.ownerId);
        if (owner) {
          // If owner is admin, org members get access
          if (owner.isAdmin === "true") {
            return res.json({
              hasSubscription: true,
              subscriptionStatus: "organization_member",
              organizationName: userOrg.name
            });
          }
          // Check owner's subscription
          if (owner.stripeCustomerId) {
            const ownerSubscription = await stripeService.getActiveSubscriptionForCustomer(owner.stripeCustomerId);
            if (ownerSubscription && ownerSubscription.status === 'active') {
              return res.json({
                hasSubscription: true,
                subscriptionStatus: "organization_member",
                organizationName: userOrg.name
              });
            }
          }
          // Check cached subscription status for owner
          if (owner.subscriptionStatus === 'active') {
            return res.json({
              hasSubscription: true,
              subscriptionStatus: "organization_member",
              organizationName: userOrg.name
            });
          }
        }
      }

      res.json({ 
        hasSubscription: user.subscriptionStatus === 'active',
        subscriptionStatus: user.subscriptionStatus 
      });
    } catch (error) {
      console.error('Subscription status error:', error);
      res.status(500).json({ error: "Failed to check subscription status" });
    }
  });

  app.post("/api/subscription/checkout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripeService.createCustomer(user.email || '', userId);
        await storage.updateUserStripeInfo(userId, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }

      const prices = await db.execute(
        sql`SELECT id FROM stripe.prices WHERE active = true ORDER BY unit_amount ASC LIMIT 1`
      );
      
      if (!prices.rows || prices.rows.length === 0) {
        return res.status(400).json({ error: "No subscription price available. Please run the product seed script." });
      }

      const priceId = prices.rows[0].id as string;
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        `${baseUrl}/subscription/success`,
        `${baseUrl}/subscription/cancel`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error('Checkout error:', error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.post("/api/subscription/portal", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUserById(userId);
      
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: "No subscription found" });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripeService.createCustomerPortalSession(
        user.stripeCustomerId,
        `${baseUrl}/`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error('Portal error:', error);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  // Profile Routes
  app.get("/api/user/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get subscription details including next billing date
      let subscriptionDetails = null;
      if (user.stripeSubscriptionId) {
        try {
          const subscription = await stripeService.getSubscription(user.stripeSubscriptionId);
          if (subscription) {
            subscriptionDetails = {
              id: subscription.id,
              status: subscription.status,
              currentPeriodEnd: subscription.current_period_end,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            };
          }
        } catch (subError) {
          console.error('Failed to fetch subscription details:', subError);
          // Continue without subscription details rather than failing the whole request
        }
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        address: user.address,
        restaurantName: user.restaurantName,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
        isAdmin: user.isAdmin === "true",
        subscriptionStatus: user.subscriptionStatus,
        subscriptionDetails,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error('Profile fetch error:', error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.patch("/api/user/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName, phone, address, restaurantName, role } = req.body;
      
      const updateSchema = z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        restaurantName: z.string().optional(),
        role: z.enum(["owner", "gm", "manager"]).optional(),
      });

      const validated = updateSchema.parse({ firstName, lastName, phone, address, restaurantName, role });
      const user = await storage.updateUserProfile(userId, validated);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        address: user.address,
        restaurantName: user.restaurantName,
        role: user.role,
      });
    } catch (error) {
      console.error('Profile update error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid profile data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.post("/api/subscription/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUserById(userId);
      
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: "No subscription found" });
      }

      // Redirect to Stripe portal for cancellation (safer approach)
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripeService.createCustomerPortalSession(
        user.stripeCustomerId,
        `${baseUrl}/profile`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error('Subscription cancel error:', error);
      res.status(500).json({ error: "Failed to process cancellation" });
    }
  });

  // Admin middleware
  const isAdmin = async (req: any, res: any, next: any) => {
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const user = await storage.getUserById(req.user.claims.sub);
    if (!user || user.isAdmin !== "true") {
      return res.status(403).json({ error: "Forbidden - Admin access required" });
    }
    next();
  };

  // Admin Routes
  app.get("/api/admin/check", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const user = await storage.getUserById(userId);
    res.json({ isAdmin: user?.isAdmin === "true" });
  });

  app.get("/api/admin/subscribers", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const subscribers = await storage.getAllUsersWithSubscriptions();
      res.json(subscribers);
    } catch (error) {
      console.error('Admin subscribers error:', error);
      res.status(500).json({ error: "Failed to fetch subscribers" });
    }
  });

  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getSubscriptionStats();
      res.json(stats);
    } catch (error) {
      console.error('Admin stats error:', error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error) {
      console.error('Admin users error:', error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Domain Routes
  app.get(api.domains.list.path, async (req, res) => {
    const domainsList = await storage.getDomains();
    res.json(domainsList);
  });

  app.get(api.domains.get.path, async (req, res) => {
    const domain = await storage.getDomainBySlug(req.params.slug);
    if (!domain) {
      return res.status(404).json({ message: 'Domain not found' });
    }
    const content = await storage.getContentByDomain(domain.id);
    res.json({ domain, content });
  });

  // Bookmark Routes (protected)
  app.get(api.bookmarks.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const bookmarks = await storage.getUserBookmarks(userId);
    res.json(bookmarks);
  });

  app.post(api.bookmarks.add.path, isAuthenticated, async (req: any, res) => {
    try {
      const { contentId } = api.bookmarks.add.input.parse(req.body);
      const userId = req.user.claims.sub;
      const bookmark = await storage.addBookmark(userId, contentId);
      res.status(201).json(bookmark);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.bookmarks.remove.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    await storage.removeBookmark(userId, Number(req.params.contentId));
    res.status(204).send();
  });

  // AI Consultant Route (streaming)
  app.post(api.consultant.ask.path, async (req, res) => {
    try {
      const { question, context, image } = api.consultant.ask.input.parse(req.body);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      type MessageContent = string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
      const messages: { role: "system" | "user"; content: MessageContent }[] = [
        { role: "system", content: CONSULTANT_SYSTEM_PROMPT },
      ];

      if (context) {
        messages.push({ role: "user", content: `Context: ${context}` });
      }

      if (image) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: question },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } },
          ],
        });
      } else {
        messages.push({ role: "user", content: question });
      }

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages as any,
        stream: true,
        max_tokens: 2048,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Consultant error:", err);
      res.status(500).json({ message: "Failed to get response" });
    }
  });

  // ===== SCHEDULING ROUTES =====

  // Staff Positions
  app.get("/api/scheduling/positions", isAuthenticated, async (req, res) => {
    const positions = await storage.getStaffPositions();
    res.json(positions);
  });

  app.post("/api/scheduling/positions", isAuthenticated, async (req: any, res) => {
    try {
      const position = await storage.createStaffPosition(req.body);
      res.status(201).json(position);
    } catch (err) {
      res.status(500).json({ message: "Failed to create position" });
    }
  });

  app.put("/api/scheduling/positions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const position = await storage.updateStaffPosition(Number(req.params.id), req.body);
      res.json(position);
    } catch (err) {
      res.status(500).json({ message: "Failed to update position" });
    }
  });

  app.delete("/api/scheduling/positions/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteStaffPosition(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete position" });
    }
  });

  // Staff Members
  app.get("/api/scheduling/staff", isAuthenticated, async (req, res) => {
    const staff = await storage.getStaffMembers();
    res.json(staff);
  });

  app.get("/api/scheduling/staff/:id", isAuthenticated, async (req, res) => {
    const member = await storage.getStaffMember(Number(req.params.id));
    if (!member) {
      return res.status(404).json({ message: "Staff member not found" });
    }
    res.json(member);
  });

  app.post("/api/scheduling/staff", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Set the owner ID to track who created this staff member for billing
      const member = await storage.createStaffMember({ ...req.body, ownerId: userId });
      res.status(201).json(member);
    } catch (err) {
      res.status(500).json({ message: "Failed to create staff member" });
    }
  });

  app.put("/api/scheduling/staff/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Get the existing member to check for status changes
      const existingMember = await storage.getStaffMember(Number(req.params.id));
      const member = await storage.updateStaffMember(Number(req.params.id), req.body);
      
      // Update billing if status changed and member was accepted
      if (existingMember?.ownerId && existingMember.inviteStatus === "accepted" && 
          req.body.status && req.body.status !== existingMember.status) {
        try {
          const owner = await storage.getUserById(existingMember.ownerId);
          if (owner?.stripeCustomerId) {
            const employeeCount = await storage.countAcceptedEmployees(existingMember.ownerId);
            await stripeService.updateEmployeeSeatQuantity(owner.stripeCustomerId, employeeCount);
          }
        } catch (billingErr) {
          console.error("Failed to update billing on staff status change:", billingErr);
        }
      }
      
      res.json(member);
    } catch (err) {
      res.status(500).json({ message: "Failed to update staff member" });
    }
  });

  app.delete("/api/scheduling/staff/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Get member before deletion to update billing
      const member = await storage.getStaffMember(Number(req.params.id));
      await storage.deleteStaffMember(Number(req.params.id));
      
      // Update billing if member was accepted
      if (member?.ownerId && member.inviteStatus === "accepted") {
        try {
          const owner = await storage.getUserById(member.ownerId);
          if (owner?.stripeCustomerId) {
            const employeeCount = await storage.countAcceptedEmployees(member.ownerId);
            await stripeService.updateEmployeeSeatQuantity(owner.stripeCustomerId, employeeCount);
          }
        } catch (billingErr) {
          console.error("Failed to update billing on staff deletion:", billingErr);
        }
      }
      
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete staff member" });
    }
  });

  // Employee Invite System
  app.post("/api/employee/invite/:id", isAuthenticated, async (req: any, res) => {
    try {
      const staffId = Number(req.params.id);
      const member = await storage.getStaffMember(staffId);
      
      if (!member) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      
      if (!member.email) {
        return res.status(400).json({ message: "Staff member must have an email to receive an invite" });
      }
      
      // Generate unique invite token
      const crypto = await import("crypto");
      const inviteToken = crypto.randomBytes(32).toString("hex");
      
      await storage.updateStaffMemberInvite(staffId, {
        inviteToken,
        inviteStatus: "pending",
        inviteSentAt: new Date(),
      });
      
      // Generate invite URL
      const baseUrl = process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:5000";
      const protocol = baseUrl.includes("localhost") ? "http" : "https";
      const inviteUrl = `${protocol}://${baseUrl}/employee/accept-invite?token=${inviteToken}`;
      
      res.json({ 
        success: true, 
        inviteUrl,
        message: "Invite link generated. Share this link with the employee." 
      });
    } catch (err) {
      console.error("Failed to generate invite:", err);
      res.status(500).json({ message: "Failed to generate invite" });
    }
  });

  app.get("/api/employee/invite/:token", async (req, res) => {
    try {
      const member = await storage.getStaffMemberByInviteToken(req.params.token);
      
      if (!member) {
        return res.status(404).json({ message: "Invalid or expired invite link" });
      }
      
      if (member.inviteStatus === "accepted") {
        return res.status(400).json({ message: "This invite has already been accepted" });
      }
      
      res.json({
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to verify invite" });
    }
  });

  app.post("/api/employee/accept-invite", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      
      const member = await storage.getStaffMemberByInviteToken(token);
      
      if (!member) {
        return res.status(404).json({ message: "Invalid or expired invite link" });
      }
      
      if (member.inviteStatus === "accepted") {
        return res.status(400).json({ message: "This invite has already been accepted" });
      }
      
      // Hash password
      const bcrypt = await import("bcrypt");
      const passwordHash = await bcrypt.hash(password, 10);
      
      await storage.updateStaffMemberInvite(member.id, {
        inviteToken: null,
        inviteStatus: "accepted",
        inviteAcceptedAt: new Date(),
        passwordHash,
      });
      
      // Update subscription billing for employee seats
      if (member.ownerId) {
        try {
          const owner = await storage.getUserById(member.ownerId);
          if (owner?.stripeCustomerId) {
            // Count all accepted employees for this owner
            const employeeCount = await storage.countAcceptedEmployees(member.ownerId);
            await stripeService.updateEmployeeSeatQuantity(owner.stripeCustomerId, employeeCount);
          }
        } catch (billingErr) {
          console.error("Failed to update billing:", billingErr);
          // Don't fail the invite acceptance if billing update fails
        }
      }
      
      // Create employee session
      (req.session as any).employeeId = member.id;
      
      res.json({ 
        success: true, 
        message: "Account created successfully",
        employee: {
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
        }
      });
    } catch (err) {
      console.error("Failed to accept invite:", err);
      res.status(500).json({ message: "Failed to accept invite" });
    }
  });

  app.post("/api/employee/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      const member = await storage.getStaffMemberByEmail(email);
      
      if (!member || !member.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      if (member.inviteStatus !== "accepted") {
        return res.status(401).json({ message: "Account not activated. Please use your invite link." });
      }
      
      const bcrypt = await import("bcrypt");
      const validPassword = await bcrypt.compare(password, member.passwordHash);
      
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Create employee session
      (req.session as any).employeeId = member.id;
      
      res.json({ 
        success: true,
        employee: {
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
        }
      });
    } catch (err) {
      console.error("Failed to login:", err);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/employee/me", async (req, res) => {
    try {
      const employeeId = (req.session as any)?.employeeId;
      
      if (!employeeId) {
        return res.status(401).json({ message: "Not logged in" });
      }
      
      const member = await storage.getStaffMember(employeeId);
      
      if (!member) {
        (req.session as any).employeeId = null;
        return res.status(401).json({ message: "Employee not found" });
      }
      
      res.json({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        positionId: member.positionId,
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to get employee info" });
    }
  });

  app.post("/api/employee/logout", (req, res) => {
    (req.session as any).employeeId = null;
    res.json({ success: true });
  });

  // Employee Portal Data (requires employee session)
  const isEmployee = async (req: any, res: any, next: any) => {
    const employeeId = req.session?.employeeId;
    if (!employeeId) {
      return res.status(401).json({ message: "Employee login required" });
    }
    req.employeeId = employeeId;
    next();
  };

  app.get("/api/employee/schedule", isEmployee, async (req: any, res) => {
    try {
      const shifts = await storage.getShiftsByStaffMember(req.employeeId);
      res.json(shifts);
    } catch (err) {
      res.status(500).json({ message: "Failed to get schedule" });
    }
  });

  app.get("/api/employee/announcements", isEmployee, async (req: any, res) => {
    try {
      const announcements = await storage.getStaffAnnouncements();
      res.json(announcements);
    } catch (err) {
      res.status(500).json({ message: "Failed to get announcements" });
    }
  });

  app.get("/api/employee/open-shifts", isEmployee, async (req: any, res) => {
    try {
      const shifts = await storage.getOpenShifts();
      res.json(shifts);
    } catch (err) {
      res.status(500).json({ message: "Failed to get open shifts" });
    }
  });

  // Shifts
  app.get("/api/scheduling/shifts", isAuthenticated, async (req, res) => {
    const startDate = req.query.start as string || new Date().toISOString().split('T')[0];
    const endDate = req.query.end as string || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const shifts = await storage.getShifts(startDate, endDate);
    res.json(shifts);
  });

  app.get("/api/scheduling/shifts/open", isAuthenticated, async (req, res) => {
    const shifts = await storage.getOpenShifts();
    res.json(shifts);
  });

  app.post("/api/scheduling/shifts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const shift = await storage.createShift({ ...req.body, createdBy: userId });
      res.status(201).json(shift);
    } catch (err) {
      res.status(500).json({ message: "Failed to create shift" });
    }
  });

  app.put("/api/scheduling/shifts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const shift = await storage.updateShift(Number(req.params.id), req.body);
      res.json(shift);
    } catch (err) {
      res.status(500).json({ message: "Failed to update shift" });
    }
  });

  app.delete("/api/scheduling/shifts/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteShift(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete shift" });
    }
  });

  // Shift Applications
  app.get("/api/scheduling/shifts/:shiftId/applications", isAuthenticated, async (req, res) => {
    const applications = await storage.getShiftApplications(Number(req.params.shiftId));
    res.json(applications);
  });

  app.post("/api/scheduling/shifts/:shiftId/apply", isAuthenticated, async (req: any, res) => {
    try {
      const application = await storage.createShiftApplication({
        shiftId: Number(req.params.shiftId),
        staffMemberId: req.body.staffMemberId,
      });
      res.status(201).json(application);
    } catch (err) {
      res.status(500).json({ message: "Failed to apply for shift" });
    }
  });

  app.put("/api/scheduling/applications/:id", isAuthenticated, async (req: any, res) => {
    try {
      const application = await storage.updateShiftApplication(Number(req.params.id), req.body.status);
      res.json(application);
    } catch (err) {
      res.status(500).json({ message: "Failed to update application" });
    }
  });

  // Staff Announcements
  app.get("/api/scheduling/announcements", isAuthenticated, async (req, res) => {
    const announcements = await storage.getStaffAnnouncements();
    res.json(announcements);
  });

  app.post("/api/scheduling/announcements", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const announcement = await storage.createStaffAnnouncement({ ...req.body, createdBy: userId });
      res.status(201).json(announcement);
    } catch (err) {
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  app.delete("/api/scheduling/announcements/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteStaffAnnouncement(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete announcement" });
    }
  });

  app.post("/api/scheduling/announcements/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markAnnouncementRead(Number(req.params.id), userId);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to mark as read" });
    }
  });

  // Scheduling Stats (for dashboard)
  app.get("/api/scheduling/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getSchedulingStats();
      res.json(stats);
    } catch (err) {
      res.status(500).json({ message: "Failed to get scheduling stats" });
    }
  });

  // Social Media Post Builder Routes
  app.get("/api/social-media/holidays/upcoming", isAuthenticated, async (req: any, res) => {
    try {
      const holidays = await storage.getUpcomingHolidays();
      res.json(holidays);
    } catch (error) {
      console.error("Error fetching holidays:", error);
      res.status(500).json({ message: "Failed to fetch holidays" });
    }
  });

  app.get("/api/social-media/brand-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getBrandVoiceSettings(userId);
      res.json(settings || null);
    } catch (error) {
      console.error("Error fetching brand settings:", error);
      res.status(500).json({ message: "Failed to fetch brand settings" });
    }
  });

  const brandVoiceSettingsSchema = z.object({
    restaurantName: z.string().optional(),
    location: z.string().optional(),
    voiceAdjectives: z.array(z.string()).optional(),
    neverSayList: z.array(z.string()).optional(),
    emojiLevel: z.enum(["none", "light", "moderate"]).optional(),
    hashtagStyle: z.enum(["minimal", "moderate", "heavy"]).optional(),
    defaultCta: z.string().optional(),
  });

  app.post("/api/social-media/brand-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = brandVoiceSettingsSchema.parse(req.body);
      const settings = await storage.saveBrandVoiceSettings(userId, validatedData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
        return;
      }
      console.error("Error saving brand settings:", error);
      res.status(500).json({ message: "Failed to save brand settings" });
    }
  });

  const generatePostSchema = z.object({
    postType: z.string(),
    platforms: z.array(z.string()),
    outputStyle: z.string().optional(),
    eventName: z.string().optional(),
    eventDate: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    promotionDetails: z.string().optional(),
    targetAudience: z.string().optional(),
    tone: z.string().optional(),
    cta: z.string().optional(),
    selectedHoliday: z.string().optional(),
  });

  app.post("/api/social-media/generate-post", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = generatePostSchema.parse(req.body);
      const { postType, platforms, outputStyle, eventName, eventDate, startTime, endTime, 
              promotionDetails, targetAudience, tone, cta, selectedHoliday } = validatedData;
      
      const brandSettings = await storage.getBrandVoiceSettings(userId);
      
      const platformsStr = platforms.join(", ");
      const voiceAdj = brandSettings?.voiceAdjectives?.join(", ") || "warm, welcoming";
      const neverSay = brandSettings?.neverSayList?.length ? `Avoid these words: ${brandSettings.neverSayList.join(", ")}` : "";
      const emojiGuidance = brandSettings?.emojiLevel === "none" 
        ? "Do not use any emojis." 
        : brandSettings?.emojiLevel === "light" 
          ? "Use emojis sparingly, 1-2 max."
          : "Use emojis naturally.";
      
      const prompt = `Generate social media content for a restaurant:

POST TYPE: ${postType}
PLATFORMS: ${platformsStr}
STYLE: ${outputStyle}
${eventName ? `EVENT NAME: ${eventName}` : ""}
${eventDate ? `DATE: ${eventDate}` : ""}
${startTime ? `TIME: ${startTime}${endTime ? ` - ${endTime}` : ""}` : ""}
${promotionDetails ? `WHAT WE'RE PROMOTING: ${promotionDetails}` : ""}
${targetAudience ? `TARGET AUDIENCE: ${targetAudience}` : ""}
TONE: ${tone || "classy"}
CALL TO ACTION: ${cta || "reserve"}
${selectedHoliday ? `HOLIDAY TIE-IN: ${selectedHoliday}` : ""}
${brandSettings?.restaurantName ? `RESTAURANT: ${brandSettings.restaurantName}` : ""}
${brandSettings?.location ? `LOCATION: ${brandSettings.location}` : ""}

BRAND VOICE: ${voiceAdj}
${neverSay}
${emojiGuidance}

Generate JSON with:
1. primaryCaption: 2-4 engaging sentences
2. shortCaption: 1-2 sentences
3. storyOverlays: 3 short text overlays (max 5 words each)
4. hashtags: 4-6 relevant hashtags with # symbol
5. suggestedPostTime: Best time (e.g., "Today 4:30 PM")
6. replyPack: 2-3 quick responses for comments`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a social media expert for restaurants. Generate engaging, authentic content. Always respond with valid JSON." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content generated");
      }

      const generatedPost = JSON.parse(content);
      res.json(generatedPost);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
        return;
      }
      console.error("Error generating post:", error);
      res.status(500).json({ message: "Failed to generate post" });
    }
  });

  // Social Media OAuth Routes
  const { socialMediaService } = await import('./socialMediaService');

  // Get connected accounts
  app.get("/api/social-media/accounts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accounts = await storage.getConnectedAccounts(userId);
      const safeAccounts = accounts.map(a => ({
        id: a.id,
        provider: a.provider,
        displayName: a.displayName,
        profilePictureUrl: a.profilePictureUrl,
        status: a.status,
        createdAt: a.createdAt,
      }));
      res.json(safeAccounts);
    } catch (error) {
      console.error("Error fetching connected accounts:", error);
      res.status(500).json({ message: "Failed to fetch connected accounts" });
    }
  });

  // Disconnect account
  app.delete("/api/social-media/accounts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accountId = parseInt(req.params.id);
      const account = await storage.getConnectedAccountById(accountId);
      if (!account || account.userId !== userId) {
        res.status(404).json({ message: "Account not found" });
        return;
      }
      await storage.deleteConnectedAccount(accountId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error disconnecting account:", error);
      res.status(500).json({ message: "Failed to disconnect account" });
    }
  });

  // Start Meta OAuth (Facebook + Instagram)
  app.get("/api/oauth/meta/start", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { authUrl } = socialMediaService.startMetaOAuth(userId);
      res.json({ authUrl });
    } catch (error) {
      console.error("Error starting Meta OAuth:", error);
      res.status(500).json({ message: "Failed to start Meta OAuth" });
    }
  });

  // Meta OAuth callback
  app.get("/api/oauth/meta/callback", async (req: any, res) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) {
        res.redirect("/domain/social-media?error=missing_params");
        return;
      }

      const stateData = socialMediaService.validateAndConsumeState(state as string);
      if (!stateData || stateData.provider !== 'meta') {
        res.redirect("/domain/social-media?error=invalid_state");
        return;
      }
      const userId = stateData.userId;

      const shortToken = await socialMediaService.exchangeMetaCode(code as string);
      const longToken = await socialMediaService.getMetaLongLivedToken(shortToken.accessToken);
      const pages = await socialMediaService.getFacebookPages(longToken.accessToken);

      for (const page of pages) {
        await socialMediaService.saveConnectedAccount(
          userId,
          'facebook',
          page.id,
          page.name,
          page.access_token,
          undefined,
          60 * 60 * 24 * 60,
          { pageId: page.id },
          page.picture?.data?.url
        );

        const igAccounts = await socialMediaService.getInstagramAccounts(page.id, page.access_token);
        for (const ig of igAccounts) {
          await socialMediaService.saveConnectedAccount(
            userId,
            'instagram',
            ig.id,
            ig.username,
            page.access_token,
            undefined,
            60 * 60 * 24 * 60,
            { igUserId: ig.id, pageId: page.id },
            ig.profile_picture_url
          );
        }
      }

      res.redirect("/domain/social-media?connected=meta");
    } catch (error) {
      console.error("Meta OAuth callback error:", error);
      res.redirect("/domain/social-media?error=oauth_failed");
    }
  });

  // Start Google OAuth
  app.get("/api/oauth/google/start", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { authUrl } = socialMediaService.startGoogleOAuth(userId);
      res.json({ authUrl });
    } catch (error) {
      console.error("Error starting Google OAuth:", error);
      res.status(500).json({ message: "Failed to start Google OAuth" });
    }
  });

  // Google OAuth callback
  app.get("/api/oauth/google/callback", async (req: any, res) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) {
        res.redirect("/domain/social-media?error=missing_params");
        return;
      }

      const stateData = socialMediaService.validateAndConsumeState(state as string);
      if (!stateData || stateData.provider !== 'google') {
        res.redirect("/domain/social-media?error=invalid_state");
        return;
      }
      const userId = stateData.userId;

      const tokens = await socialMediaService.exchangeGoogleCode(code as string);
      const locations = await socialMediaService.getGoogleBusinessLocations(tokens.accessToken);

      for (const location of locations) {
        await socialMediaService.saveConnectedAccount(
          userId,
          'google_business',
          location.name,
          location.title,
          tokens.accessToken,
          tokens.refreshToken,
          tokens.expiresIn,
          { locationName: location.name }
        );
      }

      res.redirect("/domain/social-media?connected=google");
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      res.redirect("/domain/social-media?error=oauth_failed");
    }
  });

  // Create and schedule a post
  app.post("/api/social-media/posts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { caption, platformTargets, mediaUrls, scheduledFor, postType, generatedContent, postNow } = req.body;

      if (!caption || !platformTargets || platformTargets.length === 0) {
        res.status(400).json({ message: "Caption and at least one platform target required" });
        return;
      }

      const post = await storage.createScheduledPost({
        userId,
        caption,
        platformTargets,
        mediaUrls,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        status: postNow ? 'posting' : (scheduledFor ? 'scheduled' : 'draft'),
        postType,
        generatedContent,
      });

      if (postNow) {
        await executePost(post.id);
      }

      res.json(post);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  // Get user's posts
  app.get("/api/social-media/posts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const posts = await storage.getScheduledPosts(userId);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  // Get post results
  app.get("/api/social-media/posts/:id/results", isAuthenticated, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const results = await storage.getPostResults(postId);
      res.json(results);
    } catch (error) {
      console.error("Error fetching post results:", error);
      res.status(500).json({ message: "Failed to fetch post results" });
    }
  });

  // Execute post immediately
  async function executePost(postId: number) {
    const post = await storage.getScheduledPostById(postId);
    if (!post || !post.platformTargets) return;

    await storage.updateScheduledPost(postId, { status: 'posting' });

    let allSuccess = true;
    let anySuccess = false;

    for (const accountId of post.platformTargets) {
      const account = await storage.getConnectedAccountById(accountId);
      if (!account) continue;

      try {
        const token = socialMediaService.getDecryptedToken(account);
        let result: any;

        if (account.provider === 'facebook') {
          const meta = account.meta as any;
          result = await socialMediaService.postToFacebook(
            meta.pageId,
            token,
            post.caption,
            post.mediaUrls?.[0]
          );
        } else if (account.provider === 'instagram') {
          if (!post.mediaUrls?.[0]) {
            throw new Error('Instagram requires an image');
          }
          const meta = account.meta as any;
          result = await socialMediaService.postToInstagram(
            meta.igUserId,
            token,
            post.caption,
            post.mediaUrls[0]
          );
        } else if (account.provider === 'google_business') {
          const meta = account.meta as any;
          result = await socialMediaService.postToGoogleBusiness(
            meta.locationName,
            token,
            post.caption
          );
        }

        await storage.createPostResult({
          scheduledPostId: postId,
          connectedAccountId: accountId,
          provider: account.provider,
          providerPostId: result?.id || result?.name,
          status: 'success',
          rawResponse: result,
          postedAt: new Date(),
        });
        anySuccess = true;
      } catch (error: any) {
        allSuccess = false;
        await storage.createPostResult({
          scheduledPostId: postId,
          connectedAccountId: accountId,
          provider: account.provider,
          status: 'failed',
          errorMessage: error.message,
        });
      }
    }

    const finalStatus = allSuccess ? 'posted' : (anySuccess ? 'partial' : 'failed');
    await storage.updateScheduledPost(postId, { status: finalStatus });
  }

  // Template Routes
  app.get(api.templates.list.path, async (req, res) => {
    const templates = await storage.getTrainingTemplates();
    res.json(templates);
  });

  app.get(api.templates.byCategory.path, async (req, res) => {
    const templates = await storage.getTemplatesByCategory(req.params.category);
    res.json(templates);
  });

  // Financial Document Routes
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadsDir,
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      },
    }),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        "application/pdf",
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];
      if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith(".csv")) {
        cb(null, true);
      } else {
        cb(new Error("Only PDF, CSV, and Excel files are allowed"));
      }
    },
  });

  // List user's financial documents
  app.get(api.financial.documents.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const documents = await storage.getFinancialDocuments(userId);
    res.json(documents);
  });

  // Get single document with extract
  app.get(api.financial.documents.get.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const document = await storage.getFinancialDocument(Number(req.params.id), userId);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    const extract = await storage.getFinancialExtract(document.id);
    res.json({ document, extract: extract || null });
  });

  // Upload and process financial document
  app.post(api.financial.documents.upload.path, isAuthenticated, upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.user.claims.sub;
      const { docType, periodStart, periodEnd } = req.body;

      // Create document record
      const document = await storage.createFinancialDocument({
        userId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        docType: docType || "other",
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        status: "processing",
        periodStart: periodStart || null,
        periodEnd: periodEnd || null,
      });

      // Process document asynchronously
      processDocument(document.id, req.file.path, req.file.mimetype, req.file.originalname);

      res.status(201).json(document);
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // Delete document
  app.delete(api.financial.documents.delete.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const document = await storage.getFinancialDocument(Number(req.params.id), userId);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    
    // Delete file
    const filePath = path.join(uploadsDir, document.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    await storage.deleteFinancialDocument(document.id, userId);
    res.status(204).send();
  });

  // =============================================
  // HR DOCUMENTS ROUTES
  // =============================================
  
  // Create HR scan uploads directory
  const hrUploadsDir = path.join(process.cwd(), "uploads", "hr-scans");
  if (!fs.existsSync(hrUploadsDir)) {
    fs.mkdirSync(hrUploadsDir, { recursive: true });
  }

  const hrScanUpload = multer({
    storage: multer.diskStorage({
      destination: hrUploadsDir,
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/heic",
        "image/heif",
        "image/webp",
        "application/pdf",
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only images and PDF files are allowed"));
      }
    },
  });

  // List HR documents (user's own + organization's)
  app.get("/api/hr-documents", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const userDocs = await storage.getHRDocuments(userId);
    
    const org = await storage.getUserOrganization(userId);
    if (org) {
      const orgDocs = await storage.getHRDocumentsForOrganization(org.id);
      const allDocs = [...userDocs];
      for (const doc of orgDocs) {
        if (!allDocs.find(d => d.id === doc.id)) {
          allDocs.push(doc);
        }
      }
      allDocs.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
      return res.json(allDocs);
    }
    
    res.json(userDocs);
  });

  // Get single HR document
  app.get("/api/hr-documents/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const document = await storage.getHRDocument(Number(req.params.id), userId);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    res.json(document);
  });

  // Create HR document
  app.post("/api/hr-documents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { employeeName, employeePosition, issueType, disciplineLevel, incidentDate, documentContent } = req.body;

      if (!employeeName || !issueType || !disciplineLevel) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const org = await storage.getUserOrganization(userId);
      
      const document = await storage.createHRDocument({
        userId,
        organizationId: org?.id || null,
        employeeName,
        employeePosition: employeePosition || null,
        issueType,
        disciplineLevel,
        incidentDate: incidentDate || null,
        documentContent: documentContent || null,
      });

      res.status(201).json(document);
    } catch (err) {
      console.error("HR document creation error:", err);
      res.status(500).json({ message: "Failed to create HR document" });
    }
  });

  // Upload signed scan for HR document
  app.post("/api/hr-documents/:id/scan", isAuthenticated, hrScanUpload.single("scan"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.user.claims.sub;
      const documentId = Number(req.params.id);

      const document = await storage.getHRDocument(documentId, userId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const updated = await storage.updateHRDocumentScan(documentId, userId, {
        scanFilename: req.file.filename,
        scanOriginalName: req.file.originalname,
        scanMimeType: req.file.mimetype,
        scanFileSize: req.file.size,
        signedAt: new Date(),
      });

      res.json(updated);
    } catch (err) {
      console.error("HR scan upload error:", err);
      res.status(500).json({ message: "Failed to upload scan" });
    }
  });

  // Get HR document scan file
  app.get("/api/hr-documents/:id/scan", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const document = await storage.getHRDocument(Number(req.params.id), userId);
    if (!document || !document.scanFilename) {
      return res.status(404).json({ message: "Scan not found" });
    }

    const filePath = path.join(hrUploadsDir, document.scanFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    res.setHeader("Content-Type", document.scanMimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${document.scanOriginalName}"`);
    res.sendFile(filePath);
  });

  // Delete HR document (only organization owner can delete)
  app.delete("/api/hr-documents/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const documentId = Number(req.params.id);
    
    const document = await storage.getHRDocument(documentId, userId);
    
    if (!document) {
      const org = await storage.getUserOrganization(userId);
      if (org) {
        const orgDocs = await storage.getHRDocumentsForOrganization(org.id);
        const orgDoc = orgDocs.find(d => d.id === documentId);
        if (orgDoc) {
          const isOwner = await storage.isOrganizationOwner(org.id, userId);
          if (!isOwner) {
            return res.status(403).json({ message: "Only the organization owner can delete documents" });
          }
          
          if (orgDoc.scanFilename) {
            const filePath = path.join(hrUploadsDir, orgDoc.scanFilename);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
          
          await storage.deleteHRDocument(orgDoc.id, orgDoc.userId);
          return res.status(204).send();
        }
      }
      return res.status(404).json({ message: "Document not found" });
    }

    if (document.organizationId) {
      const isOwner = await storage.isOrganizationOwner(document.organizationId, userId);
      if (!isOwner && document.userId !== userId) {
        return res.status(403).json({ message: "Only the organization owner can delete documents" });
      }
    }

    if (document.scanFilename) {
      const filePath = path.join(hrUploadsDir, document.scanFilename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await storage.deleteHRDocument(document.id, document.userId);
    res.status(204).send();
  });

  // ===== FOOD COSTING ROUTES =====

  // Get saved ingredients
  app.get("/api/ingredients", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const ingredients = await storage.getSavedIngredients(userId);
    res.json(ingredients);
  });

  // Create saved ingredient
  app.post("/api/ingredients", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, costPerUnit, unit, category, wasteBuffer, notes } = req.body;

      if (!name || !costPerUnit || !unit) {
        return res.status(400).json({ message: "Name, cost, and unit are required" });
      }

      const ingredient = await storage.createSavedIngredient({
        userId,
        name,
        costPerUnit: String(costPerUnit),
        unit,
        category: category || "other",
        wasteBuffer: String(wasteBuffer || 0),
        notes: notes || null,
      });

      res.status(201).json(ingredient);
    } catch (err) {
      console.error("Create ingredient error:", err);
      res.status(500).json({ message: "Failed to create ingredient" });
    }
  });

  // Update saved ingredient
  app.patch("/api/ingredients/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = Number(req.params.id);
      const { name, costPerUnit, unit, category, wasteBuffer, notes } = req.body;

      const existing = await storage.getSavedIngredient(id, userId);
      if (!existing) {
        return res.status(404).json({ message: "Ingredient not found" });
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (costPerUnit !== undefined) updateData.costPerUnit = String(costPerUnit);
      if (unit !== undefined) updateData.unit = unit;
      if (category !== undefined) updateData.category = category;
      if (wasteBuffer !== undefined) updateData.wasteBuffer = String(wasteBuffer);
      if (notes !== undefined) updateData.notes = notes;

      const updated = await storage.updateSavedIngredient(id, userId, updateData);
      res.json(updated);
    } catch (err) {
      console.error("Update ingredient error:", err);
      res.status(500).json({ message: "Failed to update ingredient" });
    }
  });

  // Delete saved ingredient
  app.delete("/api/ingredients/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = Number(req.params.id);
    
    const existing = await storage.getSavedIngredient(id, userId);
    if (!existing) {
      return res.status(404).json({ message: "Ingredient not found" });
    }

    await storage.deleteSavedIngredient(id, userId);
    res.status(204).send();
  });

  // Get saved plates
  app.get("/api/plates", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const plates = await storage.getSavedPlates(userId);
    res.json(plates);
  });

  // Create saved plate
  app.post("/api/plates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, ingredients, totalCost, menuPrice, foodCostPercent, targetFoodCost, category, notes } = req.body;

      if (!name || !ingredients || !totalCost) {
        return res.status(400).json({ message: "Name, ingredients, and total cost are required" });
      }

      const plate = await storage.createSavedPlate({
        userId,
        name,
        ingredients,
        totalCost: String(totalCost),
        menuPrice: menuPrice ? String(menuPrice) : null,
        foodCostPercent: foodCostPercent ? String(foodCostPercent) : null,
        targetFoodCost: targetFoodCost ? String(targetFoodCost) : "28",
        category: category || null,
        notes: notes || null,
      });

      res.status(201).json(plate);
    } catch (err) {
      console.error("Create plate error:", err);
      res.status(500).json({ message: "Failed to create plate" });
    }
  });

  // Delete saved plate
  app.delete("/api/plates/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = Number(req.params.id);
    
    const existing = await storage.getSavedPlate(id, userId);
    if (!existing) {
      return res.status(404).json({ message: "Plate not found" });
    }

    await storage.deleteSavedPlate(id, userId);
    res.status(204).send();
  });

  // Get food cost periods
  app.get("/api/food-cost-periods", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const periods = await storage.getFoodCostPeriods(userId);
    res.json(periods);
  });

  // Create food cost period
  app.post("/api/food-cost-periods", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { periodType, periodStart, periodEnd, totalPurchases, totalSales, targetFoodCostPercent, notes } = req.body;

      if (!periodStart || !periodEnd || !totalPurchases || !totalSales) {
        return res.status(400).json({ message: "Period dates, purchases, and sales are required" });
      }

      const purchases = parseFloat(totalPurchases);
      const sales = parseFloat(totalSales);
      const actualFoodCostPercent = sales > 0 ? ((purchases / sales) * 100).toFixed(1) : "0";

      const period = await storage.createFoodCostPeriod({
        userId,
        periodType: periodType || "week",
        periodStart,
        periodEnd,
        totalPurchases: String(purchases),
        totalSales: String(sales),
        actualFoodCostPercent,
        targetFoodCostPercent: targetFoodCostPercent ? String(targetFoodCostPercent) : "28",
        notes: notes || null,
      });

      res.status(201).json(period);
    } catch (err) {
      console.error("Create food cost period error:", err);
      res.status(500).json({ message: "Failed to create food cost period" });
    }
  });

  // Delete food cost period
  app.delete("/api/food-cost-periods/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = Number(req.params.id);
    await storage.deleteFoodCostPeriod(id, userId);
    res.status(204).send();
  });

  // ===== ORGANIZATION ROUTES =====

  // Get current user's organization
  app.get("/api/organization", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const org = await storage.getUserOrganization(userId);
    if (!org) {
      return res.json(null);
    }
    const isOwner = org.ownerId === userId;
    res.json({ ...org, isOwner });
  });

  // Create organization (for owners)
  app.post("/api/organization", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Organization name is required" });
      }

      const existing = await storage.getOrganizationByOwner(userId);
      if (existing) {
        return res.status(400).json({ message: "You already have an organization" });
      }

      const org = await storage.createOrganization({ name, ownerId: userId });
      
      await storage.addOrganizationMember({
        organizationId: org.id,
        userId,
        role: "owner",
      });

      res.status(201).json({ ...org, isOwner: true });
    } catch (err) {
      console.error("Create organization error:", err);
      res.status(500).json({ message: "Failed to create organization" });
    }
  });

  // Get organization members
  app.get("/api/organization/members", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const org = await storage.getUserOrganization(userId);
    if (!org) {
      return res.status(404).json({ message: "No organization found" });
    }

    const members = await storage.getOrganizationMembers(org.id);
    const users = await storage.getAllUsers();
    
    const memberDetails = members.map(m => {
      const user = users.find(u => u.id === m.userId);
      return {
        ...m,
        firstName: user?.firstName || "Unknown",
        lastName: user?.lastName || "User",
        email: user?.email || "",
      };
    });

    res.json(memberDetails);
  });

  // Get organization invites (owners only)
  app.get("/api/organization/invites", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const org = await storage.getOrganizationByOwner(userId);
    if (!org) {
      return res.status(403).json({ message: "Only organization owners can view invites" });
    }

    const invites = await storage.getOrganizationInvites(org.id);
    res.json(invites);
  });

  // Send organization invite (owners only)
  app.post("/api/organization/invite", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const org = await storage.getOrganizationByOwner(userId);
      if (!org) {
        return res.status(403).json({ message: "Only organization owners can send invites" });
      }

      const user = await storage.getUserById(userId);
      const inviterName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : "A team member";

      const inviteToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invite = await storage.createOrganizationInvite({
        organizationId: org.id,
        email,
        inviteToken,
        invitedBy: userId,
        status: "pending",
        expiresAt,
      });

      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.REPLIT_DEPLOYMENT_URL || "http://localhost:5000";
      const inviteLink = `${baseUrl}/accept-invite/${inviteToken}`;

      const emailSent = await sendOrganizationInviteEmail(email, inviterName, org.name, inviteLink);
      
      if (!emailSent) {
        console.warn("Failed to send invite email, but invite was created");
      }

      res.status(201).json(invite);
    } catch (err) {
      console.error("Send invite error:", err);
      res.status(500).json({ message: "Failed to send invite" });
    }
  });

  // Accept organization invite
  app.post("/api/organization/accept-invite", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ message: "Invite token is required" });
      }

      const invite = await storage.getInviteByToken(token);
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }

      if (invite.status !== "pending") {
        return res.status(400).json({ message: "This invite has already been used or expired" });
      }

      if (new Date() > new Date(invite.expiresAt)) {
        await storage.updateInviteStatus(invite.id, "expired");
        return res.status(400).json({ message: "This invite has expired" });
      }

      const existingOrg = await storage.getUserOrganization(userId);
      if (existingOrg) {
        return res.status(400).json({ message: "You are already a member of an organization" });
      }

      await storage.addOrganizationMember({
        organizationId: invite.organizationId,
        userId,
        role: "member",
      });

      await storage.updateInviteStatus(invite.id, "accepted");

      const org = await storage.getOrganization(invite.organizationId);
      res.json({ success: true, organization: org });
    } catch (err) {
      console.error("Accept invite error:", err);
      res.status(500).json({ message: "Failed to accept invite" });
    }
  });

  // Get invite details (public, for accept page)
  app.get("/api/organization/invite/:token", async (req, res) => {
    const { token } = req.params;
    const invite = await storage.getInviteByToken(token);
    
    if (!invite) {
      return res.status(404).json({ message: "Invite not found" });
    }

    if (invite.status !== "pending") {
      return res.status(400).json({ message: "This invite has already been used", status: invite.status });
    }

    if (new Date() > new Date(invite.expiresAt)) {
      return res.status(400).json({ message: "This invite has expired", status: "expired" });
    }

    const org = await storage.getOrganization(invite.organizationId);
    res.json({ organizationName: org?.name, email: invite.email });
  });

  // Remove organization member (owners only)
  app.delete("/api/organization/members/:userId", isAuthenticated, async (req: any, res) => {
    const ownerId = req.user.claims.sub;
    const memberUserId = req.params.userId;

    const org = await storage.getOrganizationByOwner(ownerId);
    if (!org) {
      return res.status(403).json({ message: "Only organization owners can remove members" });
    }

    if (memberUserId === ownerId) {
      return res.status(400).json({ message: "Cannot remove yourself from the organization" });
    }

    await storage.removeOrganizationMember(org.id, memberUserId);
    res.status(204).send();
  });

  // ===== INTERNAL MESSAGING ROUTES =====

  // Get internal messages for current user
  app.get("/api/messages", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const org = await storage.getUserOrganization(userId);
    if (!org) {
      return res.status(404).json({ message: "You are not part of an organization" });
    }

    const messages = await storage.getInternalMessages(userId, org.id);
    const allUsers = await storage.getAllUsers();
    
    const enrichedMessages = messages.map(msg => {
      const sender = allUsers.find(u => u.id === msg.senderId);
      const recipient = msg.recipientId ? allUsers.find(u => u.id === msg.recipientId) : null;
      return {
        ...msg,
        senderName: sender ? `${sender.firstName} ${sender.lastName}` : "Unknown",
        senderEmail: sender?.email || "",
        recipientName: recipient ? `${recipient.firstName} ${recipient.lastName}` : "Everyone",
        recipientEmail: recipient?.email || "",
        isBroadcast: !msg.recipientId,
      };
    });

    res.json(enrichedMessages);
  });

  // Get unread message count
  app.get("/api/messages/unread-count", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const org = await storage.getUserOrganization(userId);
    if (!org) {
      return res.json({ count: 0 });
    }

    const count = await storage.getUnreadMessageCount(userId, org.id);
    res.json({ count });
  });

  // Send a message
  app.post("/api/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { recipientId, subject, content } = req.body;

      if (!content) {
        return res.status(400).json({ message: "Message content is required" });
      }

      const org = await storage.getUserOrganization(userId);
      if (!org) {
        return res.status(404).json({ message: "You are not part of an organization" });
      }

      if (recipientId) {
        const isMember = await storage.isOrganizationMember(org.id, recipientId);
        if (!isMember) {
          return res.status(400).json({ message: "Recipient is not a member of your organization" });
        }
      }

      const message = await storage.createInternalMessage({
        organizationId: org.id,
        senderId: userId,
        recipientId: recipientId || null,
        subject: subject || null,
        content,
        isRead: false,
      });

      res.status(201).json(message);
    } catch (err) {
      console.error("Send message error:", err);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Mark message as read
  app.post("/api/messages/:id/read", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const messageId = Number(req.params.id);

    await storage.markMessageAsRead(messageId, userId);
    res.json({ success: true });
  });

  // Delete a message (sender only)
  app.delete("/api/messages/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const messageId = Number(req.params.id);

    const message = await storage.getInternalMessage(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.senderId !== userId) {
      return res.status(403).json({ message: "You can only delete your own messages" });
    }

    await storage.deleteInternalMessage(messageId, userId);
    res.status(204).send();
  });

  // Get financial messages
  app.get(api.financial.messages.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const documentId = req.query.documentId ? Number(req.query.documentId) : undefined;
    const messages = await storage.getFinancialMessages(userId, documentId);
    res.json(messages);
  });

  // Financial AI Q&A (streaming)
  app.post(api.financial.ask.path, isAuthenticated, async (req: any, res) => {
    try {
      const { question, documentId } = api.financial.ask.input.parse(req.body);
      const userId = req.user.claims.sub;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Build context from document(s)
      let financialContext = "";
      let documents: any[] = [];

      if (documentId) {
        const doc = await storage.getFinancialDocument(documentId, userId);
        if (doc) {
          documents = [doc];
          const extract = await storage.getFinancialExtract(documentId);
          if (extract) {
            financialContext = buildFinancialContext(extract);
          }
        }
      } else {
        // Get all user's documents for general analysis
        documents = await storage.getFinancialDocuments(userId);
        for (const doc of documents.slice(0, 5)) { // Limit to 5 most recent
          const extract = await storage.getFinancialExtract(doc.id);
          if (extract) {
            financialContext += `\n--- ${doc.originalName} (${doc.docType}) ---\n`;
            financialContext += buildFinancialContext(extract);
          }
        }
      }

      // Save user message
      await storage.createFinancialMessage({
        userId,
        documentId: documentId || null,
        role: "user",
        content: question,
      });

      const systemPrompt = buildFinancialSystemPrompt(financialContext);

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        stream: true,
        max_tokens: 2048,
      });

      let fullResponse = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // Save assistant response
      await storage.createFinancialMessage({
        userId,
        documentId: documentId || null,
        role: "assistant",
        content: fullResponse,
      });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Financial AI error:", err);
      res.status(500).json({ message: "Failed to get response" });
    }
  });

  // Seed Data
  await seedDatabase();
  await seedTrainingTemplates();
  await seedRestaurantHolidays();

  return httpServer;
}

// Helper function to process uploaded documents asynchronously
async function processDocument(documentId: number, filePath: string, mimeType: string, originalName: string) {
  try {
    const buffer = fs.readFileSync(filePath);
    const result = await parseDocument(buffer, mimeType, originalName);
    
    if (result.error) {
      await storage.updateFinancialDocumentStatus(documentId, "failed");
      await storage.createFinancialExtract({
        documentId,
        rawText: result.rawText,
        structuredMetrics: null,
        summary: null,
        errorMessage: result.error,
      });
    } else {
      await storage.updateFinancialDocumentStatus(documentId, "ready");
      
      // Generate AI summary of the document
      let summary = "";
      try {
        const summaryResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a restaurant financial analyst. Summarize this financial document in 2-3 sentences, highlighting key metrics and any notable trends or concerns. Be specific with numbers when available.",
            },
            {
              role: "user",
              content: `Document content:\n${result.rawText.slice(0, 4000)}\n\nExtracted metrics: ${JSON.stringify(result.structuredMetrics)}`,
            },
          ],
          max_tokens: 200,
        });
        summary = summaryResponse.choices[0]?.message?.content || "";
      } catch (err) {
        console.error("Failed to generate summary:", err);
      }
      
      await storage.createFinancialExtract({
        documentId,
        rawText: result.rawText,
        structuredMetrics: result.structuredMetrics,
        summary,
        errorMessage: null,
      });
    }
  } catch (err) {
    console.error("Document processing error:", err);
    await storage.updateFinancialDocumentStatus(documentId, "failed");
    await storage.createFinancialExtract({
      documentId,
      rawText: null,
      structuredMetrics: null,
      summary: null,
      errorMessage: err instanceof Error ? err.message : "Processing failed",
    });
  }
}

// Helper function to build context from financial extract
function buildFinancialContext(extract: any): string {
  const parts: string[] = [];
  
  if (extract.summary) {
    parts.push(`Summary: ${extract.summary}`);
  }
  
  if (extract.structuredMetrics) {
    const metrics = extract.structuredMetrics as FinancialMetrics;
    
    if (metrics.revenue?.total) {
      parts.push(`Total Revenue: $${metrics.revenue.total.toLocaleString()}`);
    }
    if (metrics.revenue?.foodSales) {
      parts.push(`Food Sales: $${metrics.revenue.foodSales.toLocaleString()}`);
    }
    if (metrics.revenue?.beverageSales) {
      parts.push(`Beverage Sales: $${metrics.revenue.beverageSales.toLocaleString()}`);
    }
    if (metrics.costs?.foodCostPercent) {
      parts.push(`Food Cost: ${metrics.costs.foodCostPercent.toFixed(1)}%`);
    }
    if (metrics.labor?.laborPercent) {
      parts.push(`Labor Cost: ${metrics.labor.laborPercent.toFixed(1)}%`);
    }
    if (metrics.primeCost?.percent) {
      parts.push(`Prime Cost: ${metrics.primeCost.percent.toFixed(1)}%`);
    }
    if (metrics.profitability?.netMargin) {
      parts.push(`Net Margin: ${metrics.profitability.netMargin.toFixed(1)}%`);
    }
    if (metrics.salesMetrics?.covers) {
      parts.push(`Covers: ${metrics.salesMetrics.covers}`);
    }
    if (metrics.salesMetrics?.averageCheck) {
      parts.push(`Average Check: $${metrics.salesMetrics.averageCheck.toFixed(2)}`);
    }
  }
  
  if (extract.rawText) {
    parts.push(`\nRaw Document Content (excerpt):\n${extract.rawText.slice(0, 3000)}`);
  }
  
  return parts.join("\n");
}

// Helper function to build the financial analysis system prompt
function buildFinancialSystemPrompt(financialContext: string): string {
  return `You are a restaurant financial analyst with deep expertise in restaurant operations and P&L management. You help restaurant owners understand their financial data and make data-driven decisions to improve profitability.

YOUR APPROACH:
- Analyze the provided financial data carefully
- Identify specific areas of concern (high food cost, labor overruns, declining revenue)
- Provide actionable recommendations tied to specific numbers
- Reference industry benchmarks when relevant
- Be direct and practical, not theoretical

RESTAURANT FINANCIAL BENCHMARKS:
- Food Cost: 28-35% of food sales (ideal: 30%)
- Beverage Cost: 18-24% of beverage sales (ideal: 20%)
- Labor Cost: 25-35% of total revenue (ideal: 30%)
- Prime Cost (Food + Labor): 55-65% of revenue (ideal: 60%)
- Net Profit Margin: 3-9% (healthy: 6%+)
- Average Check targets vary by concept

WHEN ANALYZING DATA:
1. Compare actual metrics to benchmarks
2. Identify the biggest dollar-impact opportunities
3. Suggest specific operational changes (portion control, scheduling, menu engineering)
4. Prioritize recommendations by potential impact
5. Be realistic about what's achievable

FINANCIAL CONTEXT FROM UPLOADED DOCUMENTS:
${financialContext || "No documents uploaded yet. Ask the user to upload their sales reports, P&L statements, or other financial documents for analysis."}

RESPONSE STYLE:
- Start with a brief overview of what you see
- Highlight 2-3 key findings with specific numbers
- Provide actionable recommendations for each finding
- Use bullet points for clarity
- If data is missing or unclear, ask clarifying questions`;
}

async function seedDatabase() {
  const existingDomains = await storage.getDomains();

  const domainsData = [
    {
      name: "Ownership & Leadership",
      slug: "leadership",
      description: "Transition from operator-fixer to architect-leader. Define roles, decision rights, and leadership presence.",
      icon: "Crown",
      sequenceOrder: 1,
    },
    {
      name: "Service Standards",
      slug: "service",
      description: "Clear, enforceable service standards—not vague hospitality language. Guest experience that protects margins.",
      icon: "Users",
      sequenceOrder: 2,
    },
    {
      name: "Training Systems",
      slug: "training",
      description: "Training that works under pressure. Role-based paths, certification, and retraining protocols.",
      icon: "GraduationCap",
      sequenceOrder: 3,
    },
    {
      name: "Staffing & Labor",
      slug: "staffing",
      description: "Labor is your largest controllable cost. Staffing models, scheduling, and accountability frameworks.",
      icon: "CalendarDays",
      sequenceOrder: 4,
    },
    {
      name: "HR & Documentation",
      slug: "hr",
      description: "If it's not documented, it didn't happen. Progressive discipline, legal protection, and termination protocols.",
      icon: "FileText",
      sequenceOrder: 5,
    },
    {
      name: "Kitchen Operations",
      slug: "kitchen",
      description: "The kitchen is a system, not a personality contest. Prep discipline, ticket flow, and BOH accountability.",
      icon: "ChefHat",
      sequenceOrder: 6,
    },
    {
      name: "Cost & Margin Control",
      slug: "costs",
      description: "Margins are protected before ordering—not after inventory shock. Portion control and waste management.",
      icon: "DollarSign",
      sequenceOrder: 7,
    },
    {
      name: "Reviews & Reputation",
      slug: "reviews",
      description: "Online reputation is managed inside the restaurant first. Prevention, response, and brand protection.",
      icon: "Star",
      sequenceOrder: 8,
    },
    {
      name: "SOPs & Scalability",
      slug: "sops",
      description: "Growth breaks weak systems. SOPs that don't become shelf décor. Repeatability across shifts.",
      icon: "ClipboardList",
      sequenceOrder: 9,
    },
    {
      name: "Crisis Management",
      slug: "crisis",
      description: "Restaurants don't avoid failure—they recover from it. Playbooks for meltdowns, walkouts, and burnout.",
      icon: "AlertTriangle",
      sequenceOrder: 10,
    },
    {
      name: "Facilities & Asset Protection",
      slug: "facilities",
      description: "Downtime is a hidden crisis. Preventative maintenance, equipment classification, and repair discipline that protects the operation.",
      icon: "Wrench",
      sequenceOrder: 11,
    },
    {
      name: "Social Media",
      slug: "social-media",
      description: "Platform strategy, content planning, and engagement rules for restaurant visibility",
      icon: "Share2",
      sequenceOrder: 12,
    },
  ];

  // Get existing domain slugs to avoid duplicates
  const existingSlugs = new Set(existingDomains.map(d => d.slug));

  for (const domain of domainsData) {
    // Skip if domain already exists
    if (existingSlugs.has(domain.slug)) continue;
    
    const createdDomain = await storage.createDomain(domain);
    
    // Add content for each domain
    const content = getContentForDomain(domain.slug);
    for (let i = 0; i < content.length; i++) {
      await storage.createContent({
        domainId: createdDomain.id,
        title: content[i].title,
        contentType: content[i].type,
        content: content[i].content,
        sequenceOrder: i + 1,
      });
    }
  }
}

function getContentForDomain(slug: string): { title: string; type: string; content: string }[] {
  const contentMap: Record<string, { title: string; type: string; content: string }[]> = {
    leadership: [
      {
        title: "Core Principle",
        type: "principle",
        content: "The owner's job is to build systems that run without them—not to be the system. Every hour you spend fixing what staff should handle is an hour stolen from building what only you can build."
      },
      {
        title: "Role Clarity Framework",
        type: "output",
        content: "OWNER: Vision, culture, capital decisions, vendor relationships, menu direction\nGM: Daily operations, staff management, guest escalations, schedule approval\nKM: Food quality, prep standards, line discipline, BOH hiring input\nSHIFT LEAD: Real-time floor control, break management, immediate guest recovery"
      },
      {
        title: "Decision Rights Matrix",
        type: "checklist",
        content: "WHO DECIDES WHAT:\n□ Comp under $25: Server with manager notification\n□ Comp $25-$100: Manager only\n□ Comp over $100: Owner approval\n□ Staff sent home early: Shift lead\n□ Staff termination: GM + Owner\n□ Menu 86: KM immediately, notify FOH\n□ Equipment repair under $500: GM\n□ Vendor change: Owner"
      },
      {
        title: "What NOT to Carry Anymore",
        type: "output",
        content: "Stop carrying:\n• Every staff scheduling conflict\n• Minor guest complaints that managers can handle\n• Daily prep decisions\n• Register reconciliation\n• Opening/closing every shift\n\nStart delegating with accountability:\n• Clear expectations\n• Written authority\n• Consequences for failure\n• Recognition for success"
      }
    ],
    service: [
      {
        title: "Core Principle",
        type: "principle",
        content: "Consistency Is the Product\n\nService standards exist to protect consistency, not to create robots.\n\nEvery guest should receive the same quality experience:\n• Regardless of which server they get\n• Regardless of shift, volume, or day of week\n\nHospitality without structure feels good once.\nHospitality with structure builds a business."
      },
      {
        title: "The Four-Point Greeting (MANDATORY)",
        type: "framework",
        content: "Every table receives the same opening sequence:\n\n1. IMMEDIATE ACKNOWLEDGMENT\n• Eye contact within 10 seconds\n• Verbal acknowledgment within 60 seconds\n\n2. WARM INTRODUCTION\n• Server name stated\n• Tone confident, not scripted\n\n3. EXPECTATION SETTING\n• \"I'll be right back with drinks\" or\n• \"Can I start you with something to drink while you look things over?\"\n\n4. MENU CONFIDENCE CUE\n• One relevant suggestion (not a full sales pitch)\n\nIf the greeting is rushed or skipped, the entire service feels broken—even if food is perfect."
      },
      {
        title: "Server Timing Standards",
        type: "checklist",
        content: "TIMING IS A STANDARD, NOT A SUGGESTION\n\n□ Greet table within 60 seconds of seating\n□ Drink order taken within 2 minutes\n□ Drinks delivered within 4 minutes\n□ Food order taken within 8 minutes (if guests are ready)\n□ Check-back within 2 bites or 2 minutes\n□ Mid-meal table touch before plates are half finished\n□ Check presented within 3 minutes of dessert decline or final plate clear\n□ Table reset within 5 minutes of departure\n\nTiming failures are service failures—even if guests don't complain."
      },
      {
        title: "Table Touch Cadence",
        type: "framework",
        content: "Service Control System\n\nServers are expected to touch tables at intentional moments, not randomly.\n\nREQUIRED TOUCH POINTS:\n1. Post-drink delivery\n2. Two-bite / two-minute check\n3. Mid-meal quality check\n4. Pre-dessert / final clear\n5. Farewell & invitation back\n\nManagers observe cadence, not just friendliness."
      },
      {
        title: "Guest Recovery Decision Tree",
        type: "script",
        content: "ROAR / HEAT Aligned Recovery Protocol\n\nWhen something goes wrong, recovery follows a structured escalation, not improvisation.\n\nSTEP 1 — ACKNOWLEDGE (Immediately)\n\"I see the issue, and I'm handling it right now.\"\n\nSTEP 2 — APOLOGIZE (Without Excuses)\n\"I'm sorry this happened.\"\nNo explanations. No blame. No defensiveness.\n\nSTEP 3 — ACT (Within Authority Limits)\nCommon Scenarios:\n• Wrong item: Replace + offer appetizer or dessert\n• Long wait (15+ minutes over quote): Complimentary round or dessert\n• Cold food: Replace + comp item\n• Poor staff attitude: Manager visit + meaningful comp\n\nSTEP 4 — ASSURE\n\"I want to make sure you leave happy.\"\n\nSTEP 5 — FOLLOW-THROUGH\nManager check before departure, not after the complaint is over.\n\nRecovery without follow-up feels transactional.\nRecovery with follow-up rebuilds trust."
      },
      {
        title: "Comp Authority Limits",
        type: "framework",
        content: "Margin Protection Built In\n\nAuthority must be clear or comps become emotional.\n\nSERVER\n• Free dessert\n• Free non-alcoholic drink\n• Item replacement\n\nBARTENDER\n• One round comped\n• Free appetizer\n\nSHIFT LEAD\n• Up to $25 in comps without approval\n\nMANAGER\n• Up to $100\n• Full meal if warranted\n\nOVER $100\n• Owner notification required (approval can be retroactive)\n\nComps are tools, not apologies.\nUse them intentionally."
      },
      {
        title: "Enforcement Standard",
        type: "checklist",
        content: "What Managers Actually Check\n\nManagers are responsible for:\n□ Timing adherence\n□ Greeting quality\n□ Table touch cadence\n□ Recovery execution\n□ Comp justification\n\nServers are coached on patterns, not one-off mistakes."
      },
      {
        title: "Consultant's Bottom Line",
        type: "principle",
        content: "Great service is not personality-dependent.\nIt is system-dependent.\n\nIf your best service only happens when your best server is on the floor, you don't have standards—you have luck."
      }
    ],
    training: [
      {
        title: "Core Principle",
        type: "principle",
        content: "Training fails when it's theoretical or overwhelming. If a new hire can't perform the basics under Friday-night pressure within two weeks, your training system is broken—not the hire."
      },
      {
        title: "Shadow → Perform → Certify Model",
        type: "output",
        content: "PHASE 1: SHADOW (2-3 shifts)\n• Follow experienced staff, observe, ask questions\n• No guest interaction beyond greeting\n• Written notes required\n\nPHASE 2: PERFORM (3-5 shifts)\n• Handle own section/station with oversight\n• Trainer within arm's reach\n• Mistakes corrected in real-time\n\nPHASE 3: CERTIFY (1 shift)\n• Solo performance, trainer observes only\n• Must hit timing standards\n• Must handle one recovery situation\n• Signed off by trainer AND manager"
      },
      {
        title: "Day 1 Minimum Viable Training",
        type: "checklist",
        content: "BEFORE THEY TOUCH A GUEST:\n□ Clock-in/clock-out procedure\n□ Where to put belongings\n□ Uniform standards\n□ Menu overview (not memorization)\n□ POS login and basic functions\n□ Who to ask for help\n□ Emergency exits and procedures\n□ Restroom locations\n□ \"I don't know, let me find out\" script"
      },
      {
        title: "Retraining Protocol",
        type: "script",
        content: "WHEN SOMEONE FAILS A STANDARD:\n\n1. Identify specific failure (not vague \"do better\")\n2. Private conversation, not public correction\n3. Ask: \"What happened?\" before assuming\n4. Clarify the standard: \"Here's what should happen...\"\n5. Practice the correct behavior (role-play if needed)\n6. Document the conversation\n7. Set follow-up check: \"I'll be watching for this on your next three shifts\"\n8. Recognize when corrected\n\nThree documented failures on same issue = performance review"
      }
    ],
    staffing: [
      {
        title: "Core Principle",
        type: "principle",
        content: "Schedule based on projected covers and historical patterns—not staff requests. Labor cost is controllable only if scheduling is disciplined. Hope is not a staffing strategy."
      },
      {
        title: "Staffing Matrix Template",
        type: "output",
        content: "BUILD YOUR MATRIX:\n\nCovers 0-50: 2 servers, 1 bartender, 1 host, 2 cooks\nCovers 51-80: 3 servers, 1 bartender, 1 host, 3 cooks\nCovers 81-120: 4 servers, 2 bartenders, 1 host, 4 cooks\nCovers 121-160: 5 servers, 2 bartenders, 2 hosts, 5 cooks\nCovers 161+: 6 servers, 2 bartenders, 2 hosts, 6 cooks + expo\n\nAdjust based on:\n• Menu complexity\n• Table turn expectations\n• Service style\n• Your kitchen layout"
      },
      {
        title: "Cut Flow Logic",
        type: "checklist",
        content: "WHEN TO CUT STAFF:\n□ Covers tracking 20% below projection at midpoint\n□ Section consolidation possible without service impact\n□ Cut least senior first (unless performance issue)\n□ Never cut below safety minimum\n□ Document who was cut and why\n\nCUT CONVERSATION SCRIPT:\n\"We're slower than projected tonight. I need to cut you at [time]. Side work needs to be done, section closed properly. Thanks for understanding—this is just business, not personal.\""
      },
      {
        title: "Call-Out Policy",
        type: "output",
        content: "CALL-OUT RULES:\n• Minimum 4 hours notice required\n• Staff must attempt to find own coverage first\n• Manager approval required for coverage swap\n• No-call/no-show = automatic write-up, second offense = termination\n• Sick calls: No doctor's note required for 1 day, required for 2+\n• Pattern call-outs (every Friday, after payday) trigger conversation\n\nDOCUMENT EVERY CALL-OUT WITH:\n• Date, time of call\n• Reason given\n• Coverage found? Y/N\n• Manager who received call"
      }
    ],
    hr: [
      {
        title: "Core Principle",
        type: "principle",
        content: "Documentation is not bureaucracy—it's protection. For you, for the employee, and for the business. If you ever need to terminate someone and you don't have documentation, you've already lost the unemployment claim."
      },
      {
        title: "Progressive Discipline Framework",
        type: "output",
        content: "PERFORMANCE ISSUES (doing the job wrong):\n1. Verbal coaching (documented)\n2. Written warning\n3. Final written warning\n4. Termination\n\nMISCONDUCT (breaking rules):\n1. Written warning (may skip verbal)\n2. Final warning or suspension\n3. Termination\n\nGROSS MISCONDUCT (theft, violence, harassment):\nImmediate termination, no progression required"
      },
      {
        title: "Written Warning Template",
        type: "script",
        content: "EMPLOYEE NAME: _______________\nDATE: _______________\nISSUE TYPE: □ Performance □ Conduct □ Attendance\n\nSPECIFIC INCIDENT(S):\n[Date, time, what happened, who witnessed]\n\nPREVIOUS CONVERSATIONS:\n[Dates of prior coaching on this issue]\n\nEXPECTED IMPROVEMENT:\n[Specific, measurable behavior required]\n\nTIMEFRAME:\n[When improvement must be demonstrated]\n\nCONSEQUENCE IF NOT IMPROVED:\n\"Failure to improve may result in further disciplinary action up to and including termination.\"\n\nEmployee Signature: _______________\n(Signature acknowledges receipt, not agreement)\n\nManager Signature: _______________"
      },
      {
        title: "Termination Checklist",
        type: "checklist",
        content: "BEFORE TERMINATION:\n□ Documentation reviewed with owner/HR\n□ Final paycheck prepared (required same day in most states)\n□ Property to collect listed (keys, uniform, etc.)\n□ System access to revoke listed\n□ Witness arranged\n□ Private location secured\n□ Time chosen (end of shift preferred)\n\nDURING TERMINATION:\n□ Keep it brief and factual\n□ State decision is final\n□ Don't debate or argue\n□ Collect property\n□ Escort from premises\n\nAFTER TERMINATION:\n□ Document conversation\n□ Revoke all access immediately\n□ Notify staff only that \"[Name] is no longer with us\"\n□ File all documentation"
      }
    ],
    kitchen: [
      {
        title: "Core Principle",
        type: "principle",
        content: "The kitchen is a system that produces consistent food under pressure—not a stage for personalities. When ego drives the kitchen, consistency dies. When systems drive the kitchen, the food speaks for itself."
      },
      {
        title: "Prep Discipline Standards",
        type: "checklist",
        content: "DAILY PREP REQUIREMENTS:\n□ Par levels reviewed against reservations + walk-in history\n□ Prep list written by KM or sous before prep cook arrives\n□ FIFO rotation verified during prep\n□ All containers dated and labeled\n□ Prep completion signed off before service\n\nWEEKLY:\n□ Walk-in organized and deep-cleaned\n□ Par levels adjusted based on actual usage\n□ Waste log reviewed and discussed\n□ Equipment checklist completed"
      },
      {
        title: "Ticket Flow Protocol",
        type: "output",
        content: "EXPO CONTROLS THE WINDOW:\n• Expo reads ticket, assigns to stations\n• Cooks confirm \"Heard\" for each item\n• Station calls \"Walking [item]\" when plating\n• Expo calls \"Pick up [table]\" when complete\n• Runner confirms ticket number\n\nTICKET TIMING STANDARDS:\n• Apps: 8-10 minutes\n• Entrees: 15-18 minutes after apps cleared\n• Desserts: 6-8 minutes\n\nDYING IN THE WINDOW:\n• Food waiting more than 90 seconds = quality issue\n• Expo calls for runner immediately\n• Third occurrence in service = runner counseling"
      },
      {
        title: "BOH Performance Coaching Script",
        type: "script",
        content: "\"Hey, can we talk for a second off the line?\"\n\n\"Tonight I noticed [specific issue—e.g., 'tickets were sitting in the window for 3+ minutes multiple times']. \n\nHelp me understand what was happening.\"\n\n[Listen]\n\n\"Here's what I need going forward: [specific expectation]. Can you commit to that?\"\n\n\"Thanks. I know it's busy. Let's get back in there.\"\n\n[Document after service]"
      }
    ],
    costs: [
      {
        title: "Core Principle",
        type: "principle",
        content: "Food cost is decided before the order is placed, not after the inventory is counted.\n\nIf you are shocked by your food cost, the failure did not happen in accounting. It happened during prep, portioning, plating, and menu design.\n\nFood cost is a design outcome, not a surprise."
      },
      {
        title: "Plate Cost Method (Primary Control)",
        type: "framework",
        content: "Every menu item must have a known plate cost.\n\nFORMULA:\nIngredient Cost ÷ Yield = Usable Cost\nUsable Cost × Portion Size = Plate Cost\n\nEXAMPLE:\n• Ribeye: $12.00/lb\n• Yield after trim: 80% → usable cost = $15.00/lb\n• Portion: 10 oz (0.625 lb)\n• Plate cost = $9.38\n\nRULE: If you cannot state a plate cost within ±$0.25, you do not control food cost."
      },
      {
        title: "Target Food Cost Method (Menu Design)",
        type: "framework",
        content: "Food cost targets are set before menu approval.\n\nFORMULA:\nPlate Cost ÷ Target Food Cost % = Menu Price\n\nEXAMPLE:\n• Plate cost: $6.00\n• Target food cost: 28%\n• Required price: $21.43 (round UP, never down)\n\nRULE: Never price emotionally. Price mathematically."
      },
      {
        title: "The 1-Ounce Test (Line Reality Check)",
        type: "framework",
        content: "Every protein must pass the 1-oz deviation test.\n\nFORMULA:\nCost per ounce × Extra ounces × Covers = Margin Loss\n\nEXAMPLE:\n• Protein cost: $0.90/oz\n• Over-portion: +2 oz\n• Covers per shift: 100\n• Loss = $180 per shift\n\nRULE: If cooks don't understand this math, you haven't trained them."
      },
      {
        title: "Portion Control Enforcement",
        type: "checklist",
        content: "DAILY ENFORCEMENT:\n□ Digital scales at every protein station\n□ Portion guides posted with photos and weights\n□ Manager spot-checks 3 plates per service\n□ Portion compliance included in line checks\n□ Expo authorized to reject plates off spec\n\nWHEN OVER-PORTIONING OCCURS:\n1. Show the spec vs. what was plated\n2. State the cost difference clearly\n3. Multiply by covers (make it real)\n4. Correct immediately\n5. Document if pattern continues\n\nReminder: Over-portioning is not generosity. It is theft of margin and must be treated seriously."
      },
      {
        title: "Waste Log That Actually Works",
        type: "output",
        content: "WHAT TO TRACK (MANDATORY):\n• Date\n• Item\n• Quantity\n• Reason (spoiled / dropped / returned / overcooked / overprepped)\n• Who logged it\n• Assigned cost (weekly, not optional)\n\nWEEKLY WASTE REVIEW (15 MINUTES, NO EXCUSES):\n• Total waste cost\n• Waste % of food cost\n• Top 3 waste items\n• Root cause for each\n• Corrective action assigned with owner\n\nBENCHMARK:\n• Under 2% → acceptable\n• 2–3% → warning\n• Over 3% → immediate investigation\n\nWaste without review is permission to repeat."
      },
      {
        title: "Menu Complexity Warning Signs",
        type: "output",
        content: "YOUR MENU IS TOO COMPLEX IF:\n• Ingredients appear in only one dish\n• Daily prep list exceeds 30 items\n• Line cooks need references during service\n• Food cost fluctuates more than 3% month-to-month\n• Ticket times regularly exceed standards\n\nSIMPLIFICATION FRAMEWORK:\n1. Cross-utilize proteins (2–3 dishes minimum)\n2. Limit sauces (5–7 total)\n3. Standardize base preparations (one mashed potato, one rice, one stock)\n4. Remove the lowest-selling 10% of items quarterly\n\nComplexity hides waste. Simplicity exposes it."
      },
      {
        title: "Verification Loop",
        type: "framework",
        content: "THIS IS WHAT MOST OPERATORS MISS\n\nEvery cost control system must include:\n• Standard (spec, recipe, portion)\n• Training (shown, not explained)\n• Verification (daily checks)\n• Correction (real-time)\n• Documentation (patterns, not one-offs)\n\nIf any step is missing, the system is broken."
      },
      {
        title: "Consultant's Bottom Line",
        type: "principle",
        content: "You do not \"watch\" food cost.\nYou design it, train it, enforce it, and verify it.\n\nIf margins are thin, the solution is almost never:\n• higher prices\n• better vendors\n• more accounting\n\nIt is tighter systems."
      }
    ],
    reviews: [
      {
        title: "Core Principle",
        type: "principle",
        content: "Bad reviews are written inside your restaurant before they're posted online. Every negative review is a documentation of a system failure you could have caught first."
      },
      {
        title: "Preventing Bad Reviews",
        type: "checklist",
        content: "DURING EVERY SERVICE:\n□ Manager touches every table before check\n□ \"Is everything perfect?\" asked with eye contact\n□ Any hesitation = probe deeper\n□ Recovery completed before guest leaves\n□ Incident documented same night\n\nTHE 10-MINUTE RULE:\nIf a complaint is made and resolved within 10 minutes, it almost never becomes a review. If it lingers unaddressed, it becomes a story they tell."
      },
      {
        title: "Review Response Framework",
        type: "script",
        content: "NEGATIVE REVIEW RESPONSE TEMPLATE:\n\n\"Thank you for taking the time to share your feedback. We're sorry your experience didn't meet the standards we set for ourselves.\n\n[Acknowledge specific issue if mentioned—never argue facts]\n\nWe'd appreciate the opportunity to learn more and make this right. Please reach out to us at [email] at your convenience.\n\n- [First Name], [Title]\"\n\nRULES:\n• Respond within 24 hours\n• Never argue publicly\n• Never blame staff by name\n• Always offer offline conversation\n• Keep it brief—long responses look defensive"
      },
      {
        title: "Staff Accountability for Reviews",
        type: "output",
        content: "WHEN A REVIEW MENTIONS SPECIFIC SERVICE FAILURE:\n\n1. Identify the shift and server/section\n2. Review POS data for table (time seated, ordered, paid)\n3. Cross-reference with incident log (was it documented?)\n4. Private conversation with staff: \"I saw this review. Walk me through what happened.\"\n5. If pattern emerges (3+ similar reviews): Performance documentation\n6. If isolated: Coaching conversation only\n\nNEVER:\n• Post reviews in break room with names\n• Publicly shame staff\n• Threaten jobs over single reviews\n\nDO:\n• Track patterns by individual\n• Use reviews as training examples (anonymized)\n• Recognize staff mentioned positively"
      }
    ],
    sops: [
      {
        title: "Core Principle",
        type: "principle",
        content: "If it's not written down, it's not a system—it's a person. And people leave. Your SOPs should enable a reasonably competent person to perform the task without asking questions."
      },
      {
        title: "Checklist-First System",
        type: "output",
        content: "EVERY SOP SHOULD HAVE A CHECKLIST VERSION:\n• Opening checklist (not a 10-page manual)\n• Closing checklist\n• Sidework checklist\n• Pre-service checklist\n• Daily cleaning checklist\n\nCHECKLIST RULES:\n• No more than 15 items per list\n• Checkboxes, not paragraphs\n• Posted where it's used (not in an office)\n• Initialed and timed\n• Reviewed by manager before shift change"
      },
      {
        title: "Would This Survive a Second Location Test",
        type: "checklist",
        content: "ASK THESE QUESTIONS:\n□ Could a new manager run this system without calling me?\n□ Could a new hire learn this from the documentation alone?\n□ Does this rely on one specific person's knowledge?\n□ If I opened tomorrow somewhere else, would this transfer?\n□ Is this written down or just \"how we do it\"?\n\nIf you answer NO to any: That's not a system, it's a dependency. Fix it before you grow."
      },
      {
        title: "Manager Daily Audit Questions",
        type: "checklist",
        content: "EVERY DAY, MANAGERS SHOULD VERIFY:\n□ Opening checklist completed and signed?\n□ Prep list completed and signed?\n□ Line check passed (taste, temp, presentation)?\n□ Reservations reviewed and sections assigned?\n□ Staff briefed on specials, 86s, VIPs?\n□ Previous shift issues addressed?\n□ Labor tracking against projection?\n□ Cash handled correctly?\n□ Closing checklist completed?\n□ Incidents documented?"
      }
    ],
    crisis: [
      {
        title: "Core Principle",
        type: "principle",
        content: "Restaurants don't avoid failure—they recover from it. The difference between a crisis that kills the business and one that makes it stronger is whether you have a playbook or you're improvising."
      },
      {
        title: "Service Meltdown Playbook",
        type: "script",
        content: "WHEN THE WHEELS COME OFF:\n\n1. RECOGNIZE: Kitchen underwater, tickets dying, guests angry\n\n2. COMMAND: Manager takes control of expo\n   \"I'm running the window. Nobody plates without my call.\"\n\n3. TRIAGE: Stop seating new tables if necessary\n   \"Host, we're on a 15-minute wait even if tables are open.\"\n\n4. COMMUNICATE: Update every waiting table\n   \"Your food is coming. We hit a rush but I'm personally watching your order.\"\n\n5. RECOVER: Comp appropriately, touch every affected table\n\n6. DEBRIEF: After service, document:\n   • What broke?\n   • Why?\n   • What changes prevent recurrence?"
      },
      {
        title: "Staff Walkout Protocol",
        type: "output",
        content: "IF SOMEONE WALKS OFF DURING SERVICE:\n\n1. Don't chase. Let them go.\n2. Assess coverage: Can remaining staff absorb sections?\n3. If no: Close sections, combine tables, call backup if available\n4. Communicate to remaining staff: \"[Name] left. Here's how we're adjusting.\"\n5. Thank staff for stepping up (during and after)\n6. Document the walkout immediately\n7. Process termination paperwork next business day\n8. Do NOT badmouth them to staff—stay professional\n\nPREVENTION:\n• Exit interviews with departing staff (what would have kept you?)\n• Regular check-ins with at-risk employees\n• Address conflicts before they explode"
      },
      {
        title: "Owner Burnout Recovery",
        type: "checklist",
        content: "WARNING SIGNS:\n□ Dreading going to the restaurant\n□ Snapping at staff over minor issues\n□ Neglecting personal relationships\n□ Physical exhaustion despite adequate sleep\n□ Unable to delegate anything\n□ Feeling like \"nobody can do it right\"\n\nRECOVERY STEPS:\n□ Take 2 consecutive days off (actually off—no phone)\n□ Identify 3 things only YOU must do\n□ List 10 things you're doing that someone else could\n□ Pick 2 to delegate this week\n□ Schedule weekly off-site time (even 2 hours)\n□ Find one owner peer to talk to monthly\n\nTHE HARD TRUTH:\nIf the restaurant can't survive 48 hours without you, you don't own a business—you own a job."
      }
    ],
    facilities: [
      {
        title: "Core Principle",
        type: "principle",
        content: "Maintenance Is Risk Management\n\nRestaurants don't fail because equipment breaks. They fail because breakdowns turn into service chaos, emergency spending, and reputation damage.\n\nEvery piece of equipment is either:\n• Producing revenue\n• Or threatening it\n\nIf you don't control your assets, they control your nights.\n\nElite operators don't \"fix things fast.\" They prevent failures quietly and respond decisively when prevention fails."
      },
      {
        title: "Equipment Risk Classification",
        type: "framework",
        content: "NOT ALL EQUIPMENT IS EQUAL\n\nClassify every piece of equipment into three tiers:\n\nTIER 1 — SERVICE-CRITICAL (Failure = Immediate Crisis)\nFailure stops service or creates safety risk.\n• Refrigeration\n• Cooking line (grills, fryers, ranges)\n• POS / network hardware\n• Dish machine (in full-service)\n• HVAC in extreme weather\nRule: Gets scheduled preventative maintenance. No exceptions.\n\nTIER 2 — SERVICE-IMPACTING (Failure = Degraded Experience)\nFailure slows service or increases labor.\n• Prep equipment\n• Ice machines\n• Coffee systems\n• Smallwares critical to volume\nRule: Gets routine inspection and cleaning schedules.\n\nTIER 3 — NON-CRITICAL (Failure = Inconvenience)\nFailure does not immediately impact guests.\n• Office equipment\n• Decorative lighting\n• Non-essential fixtures\nRule: Fix when practical. Do not prioritize during service."
      },
      {
        title: "Preventative Maintenance Cadence",
        type: "checklist",
        content: "REQUIRED MAINTENANCE SCHEDULE\n\nDAILY:\n□ Visual inspections\n□ Temperature checks\n□ Unusual noises, leaks, smells logged\n□ Clean-as-you-go enforcement\n\nWEEKLY:\n□ Deep cleaning of Tier 1 & Tier 2 equipment\n□ Gasket checks\n□ Drain lines flushed\n□ Filters inspected\n\nMONTHLY:\n□ Preventative service on Tier 1 equipment\n□ Calibration checks\n□ HVAC filter changes\n□ Ice machine sanitation\n\nQUARTERLY:\n□ Professional servicing as required\n□ Fire suppression checks\n□ Hood system inspection\n□ Electrical and plumbing review\n\nIf it's not scheduled, it won't happen."
      },
      {
        title: "Fail Loud vs Fail Silent Rule",
        type: "framework",
        content: "THE SILENT KILLER\n\nFAIL LOUD EQUIPMENT:\n• Breaks obviously\n• Forces immediate action\n• Easier to control\n\nFAIL SILENT EQUIPMENT:\n• Degrades slowly\n• Creates hidden losses\n• Destroys margins quietly\n\nEXAMPLES OF SILENT FAILURES:\n• Refrigeration running warm (food cost creep)\n• Ice machines growing biofilm (health risk)\n• Dish machines under-sanitizing (contamination risk)\n• HVAC inefficiency driving energy cost\n\nRULE:\nFail silent equipment must be monitored, logged, and verified—not trusted.\n\nTrust the log, not the assumption."
      },
      {
        title: "Repair Triage Protocol",
        type: "script",
        content: "WHEN EQUIPMENT FAILS\n\nDo not panic. Execute the triage.\n\nSTEP 1: CLASSIFY THE FAILURE\n• Is this Tier 1, 2, or 3?\n• Does service stop?\n• Is there a safety risk?\n\nSTEP 2: STABILIZE SERVICE\n• Adjust menu if needed\n• Reassign stations\n• Communicate clearly to staff\nNever troubleshoot emotionally during service.\n\nSTEP 3: DECIDE REPAIR PATH\nAsk:\n• Can we operate safely tonight?\n• Is temporary mitigation acceptable?\n• Does this require emergency service?\nRule: Emergency repairs are for service continuity, not convenience.\n\nSTEP 4: DOCUMENT IMMEDIATELY\n• What failed?\n• When was last maintenance?\n• Was this preventable?\n• What changes reduce recurrence?\n\nUndocumented failures repeat."
      },
      {
        title: "Vendor Control & Repair Discipline",
        type: "framework",
        content: "VENDORS WORK FOR YOU\n\nAPPROVED VENDOR LIST:\nEvery restaurant must maintain:\n• Primary vendor per equipment category\n• Secondary backup\n• Emergency contact\nNo random calls during service.\n\nREPAIR AUTHORIZATION RULES:\n• Who can approve repairs?\n• Dollar limits per role?\n• When does owner approval trigger?\nUndefined authority = overspending.\n\nPOST-REPAIR REVIEW:\nAfter every repair:\n• Was this preventative failure?\n• Was vendor response acceptable?\n• Do we adjust maintenance cadence?\n\nRepairs should improve the system, not just fix the problem."
      },
      {
        title: "Maintenance Documentation Requirements",
        type: "checklist",
        content: "DOCUMENT EVERYTHING\n\nEvery location must maintain:\n□ Equipment inventory with make/model\n□ Serial numbers\n□ Service logs with dates\n□ Warranty details and expiration\n□ Repair history with costs\n□ Vendor contact information\n\nThis protects against:\n• Vendor disputes\n• Insurance claims\n• Health department issues\n• Buyer due diligence (if selling)\n\nIf it's not documented, it didn't happen."
      },
      {
        title: "Manager Asset Guardian Role",
        type: "output",
        content: "MANAGERS ARE NOT MECHANICS\nThey are asset guardians.\n\nMANAGER RESPONSIBILITIES:\n• Daily inspections\n• Logging anomalies immediately\n• Scheduling maintenance proactively\n• Escalating risks early\n• Enforcing clean-as-you-go standards\n• Maintaining vendor relationships\n\nIgnoring equipment issues is a management failure, not bad luck.\n\nThe manager who notices the walk-in running warm at 6pm saves money.\nThe manager who discovers it at midnight costs money."
      },
      {
        title: "Owner Asset Protection Checklist",
        type: "checklist",
        content: "OWNER SELF-AUDIT\n\n□ Preventative maintenance schedule exists and is followed\n□ Equipment classified by risk tier\n□ Repair authorization rules defined and understood\n□ Approved vendor list maintained with backups\n□ Maintenance logs current (check monthly)\n□ Silent failures monitored with verification schedule\n□ Emergency protocols documented\n□ Staff trained on equipment care standards\n□ Budget allocated for preventative vs reactive repair\n\nIf any are missing, downtime is coming."
      },
      {
        title: "The Standard",
        type: "principle",
        content: "Emergency repairs are expensive.\nPreventative maintenance is boring.\n\nBoring is profitable.\n\nRestaurants that control their facilities:\n• Spend less on repairs\n• Panic less during service\n• Recover faster from failures\n• Protect brand trust\n\nBOTTOM LINE:\nYou don't own a restaurant—you own a collection of assets that must perform under stress.\n\nControl the assets. Control the nights."
      }
    ],
    "social-media": [
      {
        title: "Core Principle",
        type: "principle",
        content: "Social Media Is Reputation Amplification\n\nYour restaurant already has a reputation—social media just broadcasts it. Before you post, fix what you'd be hiding.\n\nGuests don't follow restaurants. They follow:\n• Personality\n• Consistency\n• Behind-the-scenes authenticity\n\nIf your feed looks like a stock photo gallery, you've already lost.\n\nElite operators use social media to extend hospitality—not replace it."
      },
      {
        title: "Platform Strategy Matrix",
        type: "framework",
        content: "NOT ALL PLATFORMS ARE EQUAL\n\nMatch your content to where your guests actually are:\n\nINSTAGRAM\nBest for: Visual storytelling, food photography, behind-the-scenes\nPost frequency: 3-5x per week\nContent mix: 60% food/drinks, 20% team/culture, 20% guest moments\n\nFACEBOOK\nBest for: Events, announcements, community engagement\nPost frequency: 2-3x per week\nContent mix: Events, specials, reviews, local partnerships\n\nGOOGLE BUSINESS PROFILE\nBest for: Local search, hours, menu updates, reviews\nPost frequency: 1-2x per week\nContent: Specials, events, photos, response to reviews\n\nTIKTOK (if applicable)\nBest for: Viral moments, kitchen content, personality\nPost frequency: 3-7x per week\nContent: Trends, day-in-the-life, food prep\n\nRULE: Master one platform before expanding to others."
      },
      {
        title: "Content Planning Framework",
        type: "checklist",
        content: "WEEKLY CONTENT CALENDAR\n\nPLAN AHEAD:\n□ Review upcoming events, holidays, specials\n□ Identify 3-5 content themes for the week\n□ Assign shooting days (best: slower service hours)\n□ Schedule posts in advance when possible\n\nCONTENT PILLARS:\n□ FOOD: Hero dishes, specials, seasonal items\n□ TEAM: Staff spotlights, kitchen action, celebrations\n□ ATMOSPHERE: Dining room, bar, outdoor space\n□ COMMUNITY: Local events, partnerships, guest features\n□ BEHIND-THE-SCENES: Prep, sourcing, owner insights\n\nCAPTION GUIDELINES:\n□ Lead with hook (first line matters most)\n□ Include clear call-to-action\n□ Use location tags and relevant hashtags\n□ Keep brand voice consistent\n\nIf content isn't planned, it won't happen."
      },
      {
        title: "Response Protocol",
        type: "framework",
        content: "ENGAGEMENT IS NOT OPTIONAL\n\nRESPONSE TIME TARGETS:\n• Positive comments: Within 24 hours\n• Questions: Within 4 hours during business hours\n• Negative comments: Within 2 hours (see escalation)\n• DMs: Within 24 hours\n\nPOSITIVE ENGAGEMENT:\n• Personalized responses (use their name if visible)\n• Express genuine gratitude\n• Invite them back with specifics\n\nNEGATIVE ENGAGEMENT:\n• Acknowledge the concern\n• Move to DM for resolution\n• Never argue publicly\n• Document for internal review\n\nRULE: Every unanswered comment is a missed connection."
      },
      {
        title: "Photo & Video Standards",
        type: "checklist",
        content: "CONTENT QUALITY STANDARDS\n\nPHOTO REQUIREMENTS:\n□ Natural lighting preferred (window light > flash)\n□ Clean backgrounds (clear table clutter)\n□ Garnish and plate before shooting\n□ Multiple angles per dish\n□ Consistent editing style/filters\n\nVIDEO REQUIREMENTS:\n□ Horizontal for YouTube/Facebook, vertical for Stories/Reels/TikTok\n□ Stable footage (tripod or steady hands)\n□ Clean audio or music overlay\n□ Keep under 60 seconds for social\n□ Captions for silent viewing\n\nWHAT NOT TO POST:\n□ Blurry or dark photos\n□ Empty dining room shots\n□ Visible mess or clutter\n□ Anything that doesn't represent your standards\n\nIf you wouldn't frame it, don't post it."
      },
      {
        title: "The Social Media Reality",
        type: "principle",
        content: "Posting more doesn't mean winning more.\nEngagement beats reach.\n\nRestaurants that control their social presence:\n• Post with purpose, not panic\n• Respond faster than competitors\n• Show the real work behind the food\n• Build community, not just followers\n\nBOTTOM LINE:\nSocial media is an extension of your hospitality. If you wouldn't say it to a guest's face, don't post it.\n\nBe real. Be consistent. Be present."
      }
    ]
  };

  return contentMap[slug] || [];
}

async function seedTrainingTemplates() {
  const existingTemplates = await storage.getTrainingTemplates();
  if (existingTemplates.length > 0) return;

  const serverTemplates = [
    {
      title: "Server Training Manual Overview",
      category: "server",
      section: "Introduction",
      contentType: "overview",
      content: "At Mouton's Bistro & Bar, we're not just serving meals—we're crafting experiences that linger long after the last bite. Our guests are the heartbeat of this place, and you, as a server, are the passionate artisan who brings our vision to life. This manual equips you with the tools, knowledge, and skills to deliver exceptional service, rooted in Southern hospitality and relentless dedication.",
      keyPoints: ["Fast and Flavorful motto", "7-day training program", "Shadow → Perform → Certify model", "Southern hospitality focus"],
      sequenceOrder: 1,
    },
    {
      title: "Day 1: Orientation",
      category: "server",
      section: "Training Schedule",
      contentType: "procedure",
      content: "Objective: Welcome new team members and introduce them to Mouton's culture, layout, policies, and training expectations.\n\nDuration: 6–8 Hours\n\nKey Components:\n• Mission & Values: Understanding commitment to Southern hospitality\n• Cultural Motto: \"Fast and Flavorful\"\n• Meet the Team: Introductions to GM, Kitchen Manager, Executive Chef, Floor Manager\n• Restaurant Layout Tour: Dining Room, Side Room, Patio, Kitchen, Expo Station, Bar\n• Menu Overview: Signature dishes, daily specials, dietary options\n• Policies: Uniform standards, attendance, cell phones, breaks\n• Health & Safety: Handwashing, spill cleanup, emergency procedures",
      keyPoints: ["Team introductions", "Layout tour", "Policy review", "Menu overview", "Health & safety basics"],
      sequenceOrder: 2,
    },
    {
      title: "Day 2: Menu Knowledge (Food Focus)",
      category: "server",
      section: "Training Schedule",
      contentType: "procedure",
      content: "Objective: Deepen understanding of Mouton's food offerings through tasting, study, and hands-on learning.\n\nDuration: 6–8 Hours\n\nCore Focus Areas:\n1. In-Depth Menu Study\n   • Signature Dishes: Shrimp & Grits (creamy grits, sautéed shrimp, Cajun sauce), Chicken Fried Steak (hand-breaded, white gravy)\n   • Weekly Specials: Gumbo Fridays (rich roux, shrimp, sausage, trinity)\n   • Dietary Needs: Gluten-free options (basmati rice substitution), vegetarian, allergy-sensitive\n\n2. Kitchen & Expo Integration\n   • Key Terms: \"Fresh,\" \"Made to Order,\" \"Order In,\" \"Order Up\"\n   • MOD/Expo Shadowing\n\n3. Taste & Describe\n   • Sample key dishes\n   • Use Southern-inspired language and storytelling\n\n4. Upselling with Hospitality\n   • Suggestive selling with confidence\n   • Pairing tips and highlighting promotions",
      keyPoints: ["Menu tasting session", "Kitchen terminology", "Allergen awareness", "Upselling techniques", "90% written quiz pass rate"],
      sequenceOrder: 3,
    },
    {
      title: "Day 3: Beverage Menu Knowledge",
      category: "server",
      section: "Training Schedule",
      contentType: "procedure",
      content: "Objective: Build mastery of Mouton's beverage offerings while learning TABC laws and guest service techniques.\n\nDuration: 6–8 Hours\n\nBeverage Categories:\n• Beer: Draft (seasonal), Bottled/Canned (Abita Amber, Shiner Bock, Guinness)\n• Wine: Reds, whites, rosé, champagne\n• Cocktails: 50+ signature and classic (Bayou Mule, Mint Julep, Vieux Carré)\n• Spirits & Cordials: Vodka, gin, rum, tequila, whiskey, bourbon, cognac\n• Non-Alcoholic: House-made lemonade, Virgin Bayou Mule\n\nTABC Compliance:\n• Must be 18+ to serve alcohol; 21+ to verify IDs\n• Know signs of intoxication\n• How to legally refuse service\n• Document refusals in manager log",
      keyPoints: ["50+ cocktails", "TABC compliance", "Pairing basics", "Glassware knowledge", "Bar terminology"],
      sequenceOrder: 4,
    },
    {
      title: "Day 3.5: Beverage Prep (Hands-On)",
      category: "server",
      section: "Training Schedule",
      contentType: "procedure",
      content: "Objective: Develop practical bartending techniques for confidence behind the bar.\n\nDuration: 3–4 Hours\n\nCore Training:\n• Cocktail Techniques:\n  - Shaking: Vodka Martini\n  - Stirring: Gin Martini\n  - Muddling: Mojito\n  - Free Pouring: 1 sec ≈ ¼ oz\n\n• Tools & Equipment: Jiggers, shakers, bar spoons, chill glasses\n\n• Practice Cocktails:\n  - Margarita, Bayou Mule, Old Fashioned, Mint Julep, Moscow Mule\n  - Draft Beer: Perfect pour with ideal head",
      keyPoints: ["Shaking technique", "Stirring technique", "Muddling", "Free pouring", "5 signature cocktails"],
      sequenceOrder: 5,
    },
    {
      title: "Day 4: Service Steps - Basics",
      category: "server",
      section: "Training Schedule",
      contentType: "procedure",
      content: "Objective: Learn the foundation of Mouton's guest service flow and confidently manage your first table.\n\nDuration: 6–8 Hours\n\nSteps of Service:\n1. Greeting & Seating: Deliver Four-Point Greeting\n2. Order Taking: Accurately record, communicate special requests in POS\n3. Serving: Left Side Serve (food from guest's left), Right Side Clear\n4. Payment & Farewell: Prompt, polite check drop; thank and invite back\n\nFour-Point Greeting:\n1. \"Welcome to Mouton's Bistro & Bar! We're so glad y'all are here today.\"\n2. \"My name is [Your Name], and I'll be taking care of you this evening.\"\n3. \"Have y'all dined with us before? We've got a [Special] today...\"\n4. \"I'll give you a minute to check out the menu and be back shortly.\"",
      keyPoints: ["Four-Point Greeting", "Left serve/right clear", "POS basics", "First table management", "Tray handling"],
      sequenceOrder: 6,
    },
    {
      title: "Day 5: Service Steps - Advanced",
      category: "server",
      section: "Training Schedule",
      contentType: "procedure",
      content: "Objective: Refine service skills, apply ROAR task consolidation, and manage two tables independently.\n\nDuration: 6–8 Hours\n\nROAR Framework:\n• R – Review: Recall service steps for each table\n• O – Organize: Group tasks (orders, refills for both tables in one pass)\n• A – Act: Serve efficiently and professionally\n• R – Reassess: Check needs post-service (refills, dessert menus)\n\nAdvanced Skills:\n• Special Requests & Modifications: Handle dietary needs, communicate via POS\n• POS Proficiency: Happy Hour buttons, check splitting, modifiers\n• Section Setup & Close-Down: Opening prep, closing checklist within 15 minutes",
      keyPoints: ["ROAR framework", "Two-table management", "Special request handling", "Happy Hour POS codes", "Section close-down"],
      sequenceOrder: 7,
    },
    {
      title: "Day 6: Advanced Guest Experience",
      category: "server",
      section: "Training Schedule",
      contentType: "procedure",
      content: "Objective: Master complex service scenarios with grace, confidence, and Southern charm.\n\nDuration: 6–8 Hours\n\nHEAT Method for Complaints:\n• H – Hear: Listen fully and respectfully\n• E – Empathize: Show you understand their frustration\n• A – Apologize: Genuine and professional apology\n• T – Take Action: Resolve quickly (recook, comp item, manager support)\n\nDisruptive/Intoxicated Guests:\n• Follow TABC refusal protocol respectfully\n• Get manager involved when needed\n• Prioritize guest and staff safety\n\nPeak Service:\n• Manage three tables during rush using ROAR\n• Team communication with kitchen\n• Emergency preparedness (fire protocol, first aid)",
      keyPoints: ["HEAT complaint method", "Three-table management", "Upselling with charm", "Event promotion", "Emergency protocols"],
      sequenceOrder: 8,
    },
    {
      title: "Day 7: Final Evaluation",
      category: "server",
      section: "Training Schedule",
      contentType: "assessment",
      content: "Objective: Confirm readiness for independent service through full-shift performance review.\n\nDuration: 6–8 Hours\n\nEvaluation Requirements:\n• Manage Three Tables Solo: Apply all service steps from greeting to check drop\n• Four-Point Greeting: Use consistently with every table\n• ROAR: Consolidate steps efficiently\n• HEAT: Handle one staged complaint\n• POS Mastery: Enter orders, apply Happy Hour discounts, split checks\n• Section Setup & Close-Down: Complete within 15 minutes\n\nAssessments:\n• Written Test: 10 questions, 90% minimum pass rate\n• Practical Performance: Live service evaluation\n• Guest Interaction: Friendly tone, proactive service, personalized approach\n• Teamwork: Kitchen communication, peer support\n\nUpon Completion: Approved for solo shifts or additional training days assigned",
      keyPoints: ["Three-table solo management", "90% written test pass", "Complaint resolution demo", "POS proficiency verified", "Manager sign-off required"],
      sequenceOrder: 9,
    },
    {
      title: "Trainer Checklist Template",
      category: "server",
      section: "Trainer Tools",
      contentType: "checklist",
      content: "DAILY TRAINER VERIFICATION:\n\n□ Trainee arrived on time and in uniform\n□ Previous day's content reviewed\n□ Day's objectives clearly communicated\n□ Hands-on activities completed\n□ Written assessment administered (if applicable)\n□ Practical skills observed and evaluated\n□ Constructive feedback provided\n□ Questions answered and concerns addressed\n□ Next day's expectations set\n□ Trainee confidence level assessed\n\nFINAL SIGN-OFF:\n□ All 7 days completed\n□ Written tests passed (90%+)\n□ Practical evaluations passed\n□ Self-reflections collected\n□ Ready for solo shifts: YES / NEEDS ADDITIONAL TRAINING IN: _______",
      keyPoints: ["Daily verification", "Progress tracking", "Feedback documentation", "Final approval process"],
      sequenceOrder: 10,
    },
    {
      title: "Section Setup & Close-Down",
      category: "server",
      section: "Operations",
      contentType: "procedure",
      content: "START OF SHIFT:\n• Dress Code: Arrive in uniform with apron, 2+ working pens, bank (if applicable)\n• Check-In Tasks:\n  - Review message board for 86'd items, specials, events\n  - 5-minute section check:\n    □ Stock & clean condiments (ketchup, Tabasco, sugar caddies)\n    □ Wipe tables, chairs, ledges, tent cards, windowsills\n\nEND OF SHIFT:\n• Section Close-Down:\n  - Restock condiments\n  - Wipe and sanitize tables\n  - Align chairs neatly\n• Checkout Process:\n  - Confirm with MOD\n  - Tip Out: 1% of food sales to Expo, optional to Hostess\n  - Review upcoming schedule",
      keyPoints: ["15-minute early arrival", "Section check routine", "Tip-out procedures", "Manager checkout required"],
      sequenceOrder: 11,
    },
    {
      title: "Weekly Cleaning Schedule",
      category: "server",
      section: "Operations",
      contentType: "checklist",
      content: "DAILY BY SHIFT:\n• First Cut: Fill shakers/caddies, sweep/mop, restock to-go containers, roll silverware\n• Second Cut: Wipe tables/bar, refill coffee & tea, sweep front entrance\n• Closer #1: Clean ketchup/Tabasco, sweep/mop\n• Closer #2: Clean tea/coffee station, bathrooms, menus\n• Closer #3: Clean soda fountain, ice bin, bar sinks\n• Closer #4: Clean windows/doors, restock beer\n\nWEEKLY:\n• Monday AM: Sauces | PM: Sugar caddies\n• Tuesday AM: Deck sweep/mop | PM: Salt/pepper shakers\n• Wednesday AM: Tea/Coffee station | PM: Podium\n• Thursday AM: Glassware & bar mats | PM: Walls, doors, fans\n• Friday AM: Expo station | PM: Beer cooler, bar sink",
      keyPoints: ["Shift-based task assignment", "Weekly deep clean rotation", "Accountability by day"],
      sequenceOrder: 12,
    },
  ];

  const kitchenTemplates = [
    {
      title: "Kitchen Training Manual Overview",
      category: "kitchen",
      section: "Introduction",
      contentType: "overview",
      content: "Welcome to the kitchen team at Mouton's Bistro & Bar, where Southern culinary tradition meets excellence. As a key contributor, you ensure every dish embodies our \"Fast and Flavorful\" motto. This manual outlines policies, procedures, and a comprehensive training program to prepare you for success. Let's cook with passion and precision!",
      keyPoints: ["Fast and Flavorful motto", "7-day training program", "5 staff per dinner shift", "Station-based system"],
      sequenceOrder: 1,
    },
    {
      title: "Kitchen Roles & Hierarchy",
      category: "kitchen",
      section: "Organization",
      contentType: "overview",
      content: "Staff Structure:\n• Executive Chef: Oversees all kitchen operations, recipe development, and staff training\n• Sous Chef (Line Cooks): Supports Executive Chef, manages daily production, supervises line cooks\n• Prep Cooks, Dishwashers: Ingredient preparation and cleaning under Sous Chef's direction\n• Kitchen Manager: Manages operational oversight\n\nStaffing:\n• 5 staff members on duty per dinner shift\n• 1 on each station: expo, sauté, fry, salad, dish\n• Executive Chef oversees all staff\n• Kitchen Manager and Sous Chef handle daily supervision",
      keyPoints: ["Clear chain of command", "5 stations covered", "Dual supervision model"],
      sequenceOrder: 2,
    },
    {
      title: "Day 1: Orientation and Safety",
      category: "kitchen",
      section: "Training Schedule",
      contentType: "procedure",
      content: "Objective: Introduce kitchen layout, safety, and roles.\n\nDuration: 6–8 Hours\n\nKey Components:\n• Welcome and team introductions\n• Tour: grill, sauté, fry, salad, prep, walk-in coolers, dish area\n• Safety:\n  - Handwashing (20 seconds)\n  - Texas Food Handler's Permit (within 30 days)\n  - Cold storage: 40°F\n  - Hot holding: 165°F\n• Equipment: griddles, fryers, ovens, knives\n\nActivities:\n• Tour and safety demo\n• Practice handwashing technique\n\nAssessment: Verbal safety quiz",
      keyPoints: ["Kitchen layout tour", "Temperature requirements", "Handwashing protocol", "Equipment orientation"],
      sequenceOrder: 3,
    },
    {
      title: "Day 2: Prep and Inventory",
      category: "kitchen",
      section: "Training Schedule",
      contentType: "procedure",
      content: "Objective: Master prep and inventory management.\n\nDuration: 6–8 Hours\n\nKey Components:\n• Prep: Chop trinity for Grillades & Grits\n• Inventory: FIFO (First In, First Out), label low stock items\n• Storage: Date and organize all items\n• Cleaning: Sanitize workstations\n\nActivities:\n• Prep Maque Choux ingredients\n• Mock inventory check\n\nAssessment: Practical prep test",
      keyPoints: ["FIFO rotation", "Trinity prep", "Labeling requirements", "Station sanitation"],
      sequenceOrder: 4,
    },
    {
      title: "Day 3: Cooking Stations",
      category: "kitchen",
      section: "Training Schedule",
      contentType: "procedure",
      content: "Objective: Learn station techniques.\n\nDuration: 6–8 Hours\n\nStations:\n• Grill: Big Easy Steak\n• Sauté: Chicken Piccata\n• Fry: Chicken Fried Steak\n\nKey Components:\n• Recipe: Cook Shrimp & Grits\n• Timing: Coordinate with expo\n• Plating: Ensure consistency\n\nActivities:\n• Cook and plate per station\n• Station rotation practice\n\nAssessment: Cooking and plating test",
      keyPoints: ["Station-specific techniques", "Expo coordination", "Plating consistency", "Speed focus"],
      sequenceOrder: 5,
    },
    {
      title: "Day 4: Advanced Techniques",
      category: "kitchen",
      section: "Training Schedule",
      contentType: "procedure",
      content: "Objective: Handle complex orders.\n\nDuration: 6–8 Hours\n\nKey Components:\n• Special Diets: Gluten-free Jambalaya Pasta (use basmati rice)\n• High-Volume: Scale recipes for large parties\n• Emergencies: Burns (cool, cover), equipment issues\n\nActivities:\n• Simulate rush with special orders\n• Scale a recipe exercise\n\nAssessment: Multitasking evaluation",
      keyPoints: ["Dietary modifications", "Recipe scaling", "Emergency response", "Rush simulation"],
      sequenceOrder: 6,
    },
    {
      title: "Day 5: Event Prep",
      category: "kitchen",
      section: "Training Schedule",
      contentType: "procedure",
      content: "Objective: Prepare for special events.\n\nDuration: 6–8 Hours\n\nKey Components:\n• Event: Crawfish Boils (pre-order crawfish)\n• Happy Hour: Quick appetizer prep\n• Coordination: Align with front-of-house timing\n\nActivities:\n• Mock Crawfish Boil prep\n• Batch appetizers for Happy Hour\n\nAssessment: Event prep test",
      keyPoints: ["Crawfish Boil execution", "Happy Hour efficiency", "FOH coordination", "Batch preparation"],
      sequenceOrder: 7,
    },
    {
      title: "Day 6: Team Coordination",
      category: "kitchen",
      section: "Training Schedule",
      contentType: "procedure",
      content: "Objective: Enhance teamwork.\n\nDuration: 6–8 Hours\n\nKey Components:\n• Communication: Verbal calls (\"order in,\" \"heard,\" \"behind\")\n• Support: Assist dishwashers during rush\n• Conflict: Report issues to Kitchen Manager\n\nActivities:\n• Simulate team shift with communication focus\n• Role-play conflict resolution\n\nAssessment: Teamwork evaluation",
      keyPoints: ["Kitchen calls", "Cross-station support", "Conflict escalation", "Team cohesion"],
      sequenceOrder: 8,
    },
    {
      title: "Day 7: Final Evaluation",
      category: "kitchen",
      section: "Training Schedule",
      contentType: "assessment",
      content: "Objective: Confirm readiness for independent kitchen work.\n\nDuration: 6–8 Hours\n\nKey Components:\n• Full shift simulation\n• Review: Safety, recipes, teamwork\n• Feedback session with Kitchen Manager\n\nActivities:\n• Mock shift covering all stations\n• Complete closing checklist\n\nAssessment:\n• Written test: 90% pass rate required\n• Practical review by Executive Chef/Kitchen Manager\n\nNote: 90-day probationary period follows successful completion",
      keyPoints: ["Full shift demonstration", "90% written test", "All stations covered", "90-day probation"],
      sequenceOrder: 9,
    },
    {
      title: "Kitchen Policies Summary",
      category: "kitchen",
      section: "Policies",
      contentType: "checklist",
      content: "ATTENDANCE:\n□ Arrive 15 minutes early\n□ Notify Kitchen Manager 4 hours in advance for absences\n□ Unexcused absences: verbal warning → written warning → termination\n\nHEALTH & SAFETY:\n□ Cold storage: 40°F\n□ Hot holding: 165°F\n□ Gloves for ready-to-eat food\n□ Wash hands after handling raw items\n□ New cutting boards for raw vs. cooked\n□ Texas Food Handler's Permit within 30 days\n□ Sani buckets at each station\n\nBREAKS:\n□ One 30-minute unpaid break per shift over 6 hours\n□ One free meal per shift (eat away from prep areas)\n\nCELL PHONES:\n□ No phones in kitchen\n□ Use restaurant phone for emergencies",
      keyPoints: ["15-minute early arrival", "4-hour call-out notice", "Temperature standards", "30-day permit deadline"],
      sequenceOrder: 10,
    },
    {
      title: "Station Setup & Closing",
      category: "kitchen",
      section: "Operations",
      contentType: "procedure",
      content: "STATION SETUP:\n• Arrive in full uniform\n• Check prep list\n• Stock stations with required items\n• Verify mise en place\n\nEND-OF-SHIFT:\n• Sanitize all stations\n• Store leftovers properly (labeled, dated)\n• Sweep and mop area\n• Check out with Kitchen Manager\n\nCLEANING SCHEDULES:\n• Daily Morning: Griddles\n• Daily Evening: Fryers, floors\n• Weekly Monday: Cooler deep clean\n• Weekly Friday: Ovens\n• Monthly: Fryer filter changes",
      keyPoints: ["Prep list verification", "Proper storage", "Manager checkout", "Cleaning rotation"],
      sequenceOrder: 11,
    },
    {
      title: "Kitchen Assessment Questions",
      category: "kitchen",
      section: "Assessments",
      contentType: "assessment",
      content: "FOOD SAFETY:\n• Cold storage temperature? (40°F)\n• Cross-contamination prevention? (Separate cutting boards)\n• Pest control protocol? (Report to management)\n\nRECIPE KNOWLEDGE:\n• Key ingredients in Shrimp & Grits?\n• Prep steps for Chicken Fried Steak?\n• Sauce for Cajun Colette?\n\nOPERATIONS:\n• Fryer failure protocol?\n• Crawfish Boil prep sequence?\n• End-of-shift closing steps?\n\nTEAMWORK:\n• How to support during rush?\n• Proper verbal call for orders?\n• How to report conflicts?",
      keyPoints: ["Safety standards", "Recipe execution", "Equipment protocols", "Communication"],
      sequenceOrder: 12,
    },
  ];

  // Seed server templates
  for (const template of serverTemplates) {
    await storage.createTemplate(template);
  }

  // Seed kitchen templates
  for (const template of kitchenTemplates) {
    await storage.createTemplate(template);
  }
}

async function seedRestaurantHolidays() {
  const existingHolidays = await storage.getUpcomingHolidays();
  const existingNames = new Set(existingHolidays.map(h => h.name));

  const holidaysData = [
    // January
    { name: "National Pie Day", date: "01-23", category: "food", suggestedAngle: "Feature your signature pie or create a special pie dessert", suggestedTags: ["NationalPieDay", "PieLovers", "Dessert"], relevanceScore: 8 },
    { name: "National Peanut Butter Day", date: "01-24", category: "food", suggestedAngle: "Highlight dishes with peanut butter or create a special dessert", suggestedTags: ["NationalPeanutButterDay", "PeanutButter"], relevanceScore: 6 },
    { name: "National Compliment Day", date: "01-24", category: "community", suggestedAngle: "Encourage guests to compliment staff or share kind words", suggestedTags: ["NationalComplimentDay", "SpreadKindness"], relevanceScore: 5 },
    { name: "National Irish Coffee Day", date: "01-25", category: "food", suggestedAngle: "Feature Irish coffee specials at the bar", suggestedTags: ["IrishCoffeeDay", "CoffeeCocktails"], relevanceScore: 7 },
    { name: "National Peanut Brittle Day", date: "01-26", category: "food", suggestedAngle: "Offer peanut brittle as a complimentary treat or dessert garnish", suggestedTags: ["PeanutBrittle", "SweetTreats"], relevanceScore: 5 },
    { name: "National Chocolate Cake Day", date: "01-27", category: "food", suggestedAngle: "Spotlight your chocolate cake or create a special version", suggestedTags: ["ChocolateCakeDay", "Dessert"], relevanceScore: 8 },
    { name: "National Blueberry Pancake Day", date: "01-28", category: "food", suggestedAngle: "Perfect for brunch service - feature blueberry pancakes", suggestedTags: ["BlueberryPancakes", "Brunch"], relevanceScore: 7 },
    { name: "National Corn Chip Day", date: "01-29", category: "food", suggestedAngle: "Highlight your chips and salsa or nachos", suggestedTags: ["CornChips", "Appetizers"], relevanceScore: 5 },
    { name: "National Croissant Day", date: "01-30", category: "food", suggestedAngle: "Feature croissants at brunch or breakfast service", suggestedTags: ["NationalCroissantDay", "Pastry", "Brunch"], relevanceScore: 7 },
    { name: "National Hot Chocolate Day", date: "01-31", category: "food", suggestedAngle: "Offer hot chocolate specials, spiked versions for adults", suggestedTags: ["HotChocolateDay", "WinterDrinks"], relevanceScore: 8 },
    { name: "National Restaurant Week", date: "01-20", category: "hospitality", suggestedAngle: "Promote prix fixe menus and special offerings", suggestedTags: ["RestaurantWeek", "DineOut"], relevanceScore: 10 },
    
    // February
    { name: "National Pizza Day", date: "02-09", category: "food", suggestedAngle: "Pizza specials, behind-the-scenes of pizza making", suggestedTags: ["NationalPizzaDay", "Pizza"], relevanceScore: 9 },
    { name: "Super Bowl Sunday", date: "02-09", category: "sports", suggestedAngle: "Game day specials, watch party promotions", suggestedTags: ["SuperBowl", "GameDay", "BigGame"], relevanceScore: 10 },
    { name: "Valentines Day", date: "02-14", category: "family", suggestedAngle: "Romantic dinner specials, couples packages", suggestedTags: ["ValentinesDay", "DateNight", "RomanticDinner"], relevanceScore: 10 },
    { name: "National Margarita Day", date: "02-22", category: "food", suggestedAngle: "Margarita specials, happy hour promotions", suggestedTags: ["NationalMargaritaDay", "Margarita", "HappyHour"], relevanceScore: 9 },
    { name: "National Pancake Day", date: "02-25", category: "food", suggestedAngle: "Pancake specials for brunch", suggestedTags: ["NationalPancakeDay", "Brunch"], relevanceScore: 7 },
    
    // March
    { name: "National Frozen Food Day", date: "03-06", category: "food", suggestedAngle: "Behind-the-scenes of your freezer prep or frozen desserts", suggestedTags: ["FrozenFoodDay"], relevanceScore: 4 },
    { name: "National Meatball Day", date: "03-09", category: "food", suggestedAngle: "Feature meatball dishes or appetizers", suggestedTags: ["NationalMeatballDay", "Meatballs"], relevanceScore: 6 },
    { name: "St. Patricks Day", date: "03-17", category: "community", suggestedAngle: "Irish-themed specials, green drinks, festive atmosphere", suggestedTags: ["StPatricksDay", "Irish", "GreenBeer"], relevanceScore: 10 },
    { name: "National Corn Dog Day", date: "03-21", category: "food", suggestedAngle: "Fun bar snack feature or kids menu highlight", suggestedTags: ["CornDogDay", "BarSnacks"], relevanceScore: 5 },
    
    // April
    { name: "National Burrito Day", date: "04-03", category: "food", suggestedAngle: "Burrito specials, build-your-own promotions", suggestedTags: ["NationalBurritoDay", "Burritos"], relevanceScore: 8 },
    { name: "National Beer Day", date: "04-07", category: "food", suggestedAngle: "Craft beer features, beer flights, brewery partnerships", suggestedTags: ["NationalBeerDay", "CraftBeer"], relevanceScore: 9 },
    { name: "National Grilled Cheese Day", date: "04-12", category: "food", suggestedAngle: "Elevated grilled cheese specials, comfort food focus", suggestedTags: ["GrilledCheeseDay", "ComfortFood"], relevanceScore: 8 },
    { name: "Easter Sunday", date: "04-05", category: "family", suggestedAngle: "Easter brunch, family dining specials", suggestedTags: ["Easter", "EasterBrunch", "FamilyDining"], relevanceScore: 9 },
    { name: "National Pretzel Day", date: "04-26", category: "food", suggestedAngle: "Pretzel appetizers, beer pairings", suggestedTags: ["NationalPretzelDay", "Pretzels"], relevanceScore: 6 },
    
    // May
    { name: "Cinco de Mayo", date: "05-05", category: "community", suggestedAngle: "Mexican-inspired specials, margaritas, festive atmosphere", suggestedTags: ["CincoDeMayo", "Fiesta", "Margaritas"], relevanceScore: 10 },
    { name: "Mothers Day", date: "05-11", category: "family", suggestedAngle: "Special brunch, prix fixe dinner, treat mom right", suggestedTags: ["MothersDay", "Brunch", "TreatMom"], relevanceScore: 10 },
    { name: "National Shrimp Day", date: "05-10", category: "food", suggestedAngle: "Seafood specials, shrimp appetizers", suggestedTags: ["NationalShrimpDay", "Seafood"], relevanceScore: 7 },
    { name: "National BBQ Day", date: "05-16", category: "food", suggestedAngle: "BBQ specials, smoked meats, outdoor grilling", suggestedTags: ["NationalBBQDay", "BBQ", "Grill"], relevanceScore: 9 },
    { name: "National Waiter Day", date: "05-21", category: "hospitality", suggestedAngle: "Staff appreciation post, tip your server", suggestedTags: ["NationalWaiterDay", "ServerLife"], relevanceScore: 7 },
    { name: "National Wine Day", date: "05-25", category: "food", suggestedAngle: "Wine specials, wine pairing dinners, sommelier picks", suggestedTags: ["NationalWineDay", "WineLovers"], relevanceScore: 9 },
    { name: "Memorial Day", date: "05-26", category: "community", suggestedAngle: "Honor and remember, special hours, patriotic specials", suggestedTags: ["MemorialDay", "Remember"], relevanceScore: 8 },
    { name: "National Burger Day", date: "05-28", category: "food", suggestedAngle: "Burger specials, signature burger spotlight", suggestedTags: ["NationalBurgerDay", "Burgers"], relevanceScore: 9 },
    
    // June
    { name: "National Cheese Day", date: "06-04", category: "food", suggestedAngle: "Cheese boards, cheese-forward dishes", suggestedTags: ["NationalCheeseDay", "Cheese"], relevanceScore: 7 },
    { name: "National Donut Day", date: "06-06", category: "food", suggestedAngle: "Donut desserts, brunch donuts", suggestedTags: ["NationalDonutDay", "Donuts"], relevanceScore: 8 },
    { name: "National Iced Tea Day", date: "06-10", category: "food", suggestedAngle: "Iced tea specials, sweet tea, Arnold Palmers", suggestedTags: ["NationalIcedTeaDay", "IcedTea"], relevanceScore: 6 },
    { name: "Fathers Day", date: "06-15", category: "family", suggestedAngle: "Dad-friendly specials, steak dinner, whiskey flights", suggestedTags: ["FathersDay", "TreatDad"], relevanceScore: 10 },
    { name: "National Martini Day", date: "06-19", category: "food", suggestedAngle: "Martini specials, classic cocktails", suggestedTags: ["NationalMartiniDay", "Martini"], relevanceScore: 8 },
    
    // July
    { name: "July 4th", date: "07-04", category: "community", suggestedAngle: "Independence Day specials, patriotic theme, BBQ", suggestedTags: ["July4th", "IndependenceDay", "BBQ"], relevanceScore: 10 },
    { name: "National French Fry Day", date: "07-13", category: "food", suggestedAngle: "Fry specials, loaded fries, fry flights", suggestedTags: ["NationalFrenchFryDay", "Fries"], relevanceScore: 8 },
    { name: "National Ice Cream Day", date: "07-20", category: "food", suggestedAngle: "Ice cream desserts, sundae specials", suggestedTags: ["NationalIceCreamDay", "IceCream"], relevanceScore: 8 },
    { name: "National Tequila Day", date: "07-24", category: "food", suggestedAngle: "Tequila flights, margarita specials, mezcal features", suggestedTags: ["NationalTequilaDay", "Tequila"], relevanceScore: 8 },
    
    // August
    { name: "National Oyster Day", date: "08-05", category: "food", suggestedAngle: "Oyster specials, raw bar features", suggestedTags: ["NationalOysterDay", "Oysters"], relevanceScore: 7 },
    { name: "National Rum Day", date: "08-16", category: "food", suggestedAngle: "Rum cocktails, tropical drinks", suggestedTags: ["NationalRumDay", "Rum"], relevanceScore: 7 },
    { name: "National Waffle Day", date: "08-24", category: "food", suggestedAngle: "Waffle brunch specials, chicken and waffles", suggestedTags: ["NationalWaffleDay", "Waffles", "Brunch"], relevanceScore: 7 },
    
    // September
    { name: "Labor Day", date: "09-01", category: "community", suggestedAngle: "End of summer specials, holiday hours", suggestedTags: ["LaborDay", "EndOfSummer"], relevanceScore: 8 },
    { name: "National Cheeseburger Day", date: "09-18", category: "food", suggestedAngle: "Cheeseburger specials, burger features", suggestedTags: ["NationalCheeseburgerDay", "Cheeseburger"], relevanceScore: 9 },
    { name: "National Seafood Day", date: "09-22", category: "food", suggestedAngle: "Seafood specials, catch of the day", suggestedTags: ["NationalSeafoodDay", "Seafood"], relevanceScore: 8 },
    { name: "National Coffee Day", date: "09-29", category: "food", suggestedAngle: "Coffee specials, espresso martinis", suggestedTags: ["NationalCoffeeDay", "Coffee"], relevanceScore: 8 },
    
    // October
    { name: "National Taco Day", date: "10-04", category: "food", suggestedAngle: "Taco specials, taco bar, Taco Tuesday amplified", suggestedTags: ["NationalTacoDay", "Tacos"], relevanceScore: 9 },
    { name: "National Pasta Day", date: "10-17", category: "food", suggestedAngle: "Pasta specials, Italian features", suggestedTags: ["NationalPastaDay", "Pasta"], relevanceScore: 8 },
    { name: "National Chicken Wing Day", date: "10-22", category: "food", suggestedAngle: "Wing specials, new flavors, wing eating challenges", suggestedTags: ["NationalWingDay", "Wings"], relevanceScore: 8 },
    { name: "Halloween", date: "10-31", category: "community", suggestedAngle: "Spooky specials, costume contests, themed drinks", suggestedTags: ["Halloween", "SpookySeason"], relevanceScore: 9 },
    
    // November
    { name: "National Sandwich Day", date: "11-03", category: "food", suggestedAngle: "Sandwich specials, signature sandwich spotlight", suggestedTags: ["NationalSandwichDay", "Sandwiches"], relevanceScore: 7 },
    { name: "National Cappuccino Day", date: "11-08", category: "food", suggestedAngle: "Coffee drink specials, after-dinner drinks", suggestedTags: ["NationalCappuccinoDay", "Coffee"], relevanceScore: 6 },
    { name: "Thanksgiving", date: "11-27", category: "family", suggestedAngle: "Thanksgiving dinner, family gatherings, gratitude posts", suggestedTags: ["Thanksgiving", "GiveThanks", "FamilyDining"], relevanceScore: 10 },
    
    // December
    { name: "National Bartender Day", date: "12-06", category: "hospitality", suggestedAngle: "Bartender spotlight, mixology features", suggestedTags: ["NationalBartenderDay", "Mixology"], relevanceScore: 7 },
    { name: "National Brownie Day", date: "12-08", category: "food", suggestedAngle: "Brownie dessert specials", suggestedTags: ["NationalBrownieDay", "Brownies", "Dessert"], relevanceScore: 6 },
    { name: "National Cocoa Day", date: "12-13", category: "food", suggestedAngle: "Hot cocoa specials, winter warmers", suggestedTags: ["NationalCocoaDay", "HotCocoa"], relevanceScore: 7 },
    { name: "Christmas Eve", date: "12-24", category: "family", suggestedAngle: "Special hours, holiday dining, festive atmosphere", suggestedTags: ["ChristmasEve", "HolidayDining"], relevanceScore: 9 },
    { name: "Christmas Day", date: "12-25", category: "family", suggestedAngle: "Holiday greetings, special hours", suggestedTags: ["Christmas", "MerryChristmas"], relevanceScore: 9 },
    { name: "New Years Eve", date: "12-31", category: "community", suggestedAngle: "NYE specials, champagne toasts, countdown celebrations", suggestedTags: ["NewYearsEve", "NYE", "Celebrate"], relevanceScore: 10 },
  ];

  for (const holiday of holidaysData) {
    if (existingNames.has(holiday.name)) continue;
    await db.insert(restaurantHolidays).values(holiday);
  }
}
