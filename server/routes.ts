import express from "express";
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
import { restaurantHolidays, insertHandbookSettingsSchema, insertRestaurantStandardsSchema, insertCertificationAttemptSchema } from "@shared/schema";
import { sendOrganizationInviteEmail, sendInviteReminderEmail, sendTestAccessEmail } from "./emailService";
import { encrypt } from "./encryption";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

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

RESPONSE FORMATTING:
- Use short paragraphs (2-3 sentences max)
- Bold **key terms** and **action items** so they stand out
- Use numbered steps when explaining a process
- Use bullet points for lists of items or options
- Include a brief "**Bottom line:**" summary at the end of longer responses
- Never say "As an AI" or "I'm an AI assistant" — speak as an experienced operator talking to another operator
- Keep the tone direct, practical, operator-to-operator — not corporate, not academic

If it wouldn't hold up during a slammed dinner rush, don't recommend it.`;

async function buildConsultantSystemPrompt(userId: string): Promise<string> {
  try {
    const setup = await storage.getHandbookSettings(userId);

    if (!setup) {
      return CONSULTANT_SYSTEM_PROMPT + `\n\nNOTE: This operator has not completed their restaurant Setup profile yet. When relevant, suggest they complete Setup to get more personalized advice. You have no specific data about their restaurant.`;
    }

    const s = setup;
    const val = (v: any, fallback = "Not provided") => (v && String(v).trim() ? String(v).trim() : fallback);
    const numVal = (v: any) => (v !== null && v !== undefined && String(v).trim() !== "" ? Number(v) : null);

    const foodTarget = numVal(s.foodCostTarget);
    const foodActual = numVal(s.foodCostActual);
    const laborTarget = numVal(s.laborTargetPct);
    const laborActual = numVal(s.laborCostActual);
    const primeCostTarget = s.primeCostTarget ? Number(s.primeCostTarget) : (foodTarget !== null && laborTarget !== null ? foodTarget + laborTarget : null);
    const primeCostActual = foodActual !== null && laborActual !== null ? foodActual + laborActual : null;

    const foodVariance = foodActual !== null && foodTarget !== null ? (foodActual - foodTarget).toFixed(1) : null;
    const laborVariance = laborActual !== null && laborTarget !== null ? (laborActual - laborTarget).toFixed(1) : null;
    const primeVariance = primeCostActual !== null && primeCostTarget !== null ? (primeCostActual - primeCostTarget).toFixed(1) : null;

    let foodVarianceSection = "";
    if (foodVariance !== null) {
      foodVarianceSection = `Food cost variance: ${foodVariance}% ${Number(foodVariance) > 0 ? "OVER target — flag this in your advice" : "at or under target"}`;
    }

    let laborVarianceSection = "";
    if (laborVariance !== null) {
      laborVarianceSection = `Labor cost variance: ${laborVariance}% ${Number(laborVariance) > 0 ? "OVER target — flag this in your advice" : "at or under target"}`;
    }

    let primeVarianceSection = "";
    if (primeVariance !== null) {
      primeVarianceSection = `Prime cost variance: ${primeVariance}% ${Number(primeVariance) > 0 ? "OVER target — this is the most urgent financial issue" : "at or under target"}`;
    }

    const serviceModelLabels: Record<string, string> = {
      full_service: "Full Service",
      fast_casual: "Fast Casual",
      bar_forward: "Bar-Forward",
      fine_dining: "Fine Dining",
      cafe: "Café",
      other: "Other",
    };

    const missingFields: string[] = [];
    if (!s.weeklyRevenue) missingFields.push("Average Weekly Revenue");
    if (!s.avgCheck) missingFields.push("Average Guest Check");
    if (!s.foodCostTarget) missingFields.push("Food Cost Target");
    if (!s.foodCostActual) missingFields.push("Current Food Cost %");
    if (!s.laborTargetPct) missingFields.push("Labor Cost Target");
    if (!s.laborCostActual) missingFields.push("Current Labor Cost %");
    if (!s.topChallenge) missingFields.push("Top Operational Challenge");

    const missingNote = missingFields.length > 0
      ? `\nNOTE: The operator's Financial Profile is incomplete. Missing fields: ${missingFields.join(", ")}. Mention this once early in the conversation and tell them to complete these fields in Setup for better advice. Then answer with what you have.\n`
      : "";

    return `You are a seasoned restaurant operations consultant with 20+ years of experience running and advising independent full-service restaurants. You have deep expertise in food cost management, labor optimization, prime cost discipline, staff training systems, guest experience, menu engineering, and TABC compliance.

You are speaking directly with the owner or manager of a specific restaurant. Everything you say should be relevant to their situation, their numbers, and their concept. You do not give generic advice. You give specific, actionable advice grounded in their actual data.

---

RESTAURANT PROFILE:

Restaurant Name: ${val(s.restaurantName)}
Owner: ${val(s.ownerNames)}
Concept & Cuisine: ${val(s.conceptCuisine)}
Service Model: ${s.serviceModel ? (serviceModelLabels[s.serviceModel] || s.serviceModel) : "Full service"}
Location: ${val(s.restaurantAddress)}
Days Open Per Week: ${val(s.operatingDays)}
Total Seating Capacity: ${val(s.totalCovers || s.seatingCapacity)} covers
Total Staff: ${val(s.totalStaff)} employees
POS System: ${val(s.posSystem)}
Scheduling App: ${val(s.schedulingApp)}
Reservation System: ${val(s.reservationSystem)}
Alcohol Permit: ${val(s.alcoholPermit)}
Tip Structure: ${val(s.tippingStructure)}

---

FINANCIAL PROFILE:

Average Weekly Revenue: ${val(s.weeklyRevenue)}
Average Guest Check: ${val(s.avgCheck)}
Average Weekly Covers: ${val(s.weeklyCovers)}

TARGET metrics:
- Food Cost Target: ${foodTarget !== null ? foodTarget + "%" : "30%"}
- Labor Cost Target: ${laborTarget !== null ? laborTarget + "%" : "30%"}
- Prime Cost Target: ${primeCostTarget !== null ? primeCostTarget + "%" : "60%"}

ACTUAL metrics (most recent period):
- Food Cost Actual: ${foodActual !== null ? foodActual + "%" : "not yet entered"}
- Labor Cost Actual: ${laborActual !== null ? laborActual + "%" : "not yet entered"}
- Prime Cost Actual: ${primeCostActual !== null ? primeCostActual.toFixed(1) + "%" : "not yet entered"}

${foodVarianceSection}
${laborVarianceSection}
${primeVarianceSection}

---

OPERATIONAL CONTEXT:

Signature drinks/dishes: ${[val(s.signatureCocktail1, ""), val(s.signatureCocktail2, ""), val(s.signatureCocktail3, "")].filter(Boolean).join(", ") || "Not provided"}
Closed holidays: ${Array.isArray(s.closedHolidays) && s.closedHolidays.length > 0 ? s.closedHolidays.join(", ") : "Not provided"}
Employee meal policy: ${val(s.employeeMealPolicy)}
Break policy: ${val(s.breakPolicy)}
Orientation period: ${val(s.orientationDays)} days

---

OPERATOR'S STATED CHALLENGE:

${val(s.topChallenge, "No specific challenge entered yet. Ask what they're working on.")}

---
${missingNote}
PROVEN FRAMEWORKS (from this platform's methodology):

1. SHADOW → PERFORM → CERTIFY Training Model:
   - Shadow (2-3 shifts): Observe only, no guest interaction
   - Perform (3-5 shifts): Handle tasks with trainer oversight
   - Certify (1 shift): Solo performance with manager sign-off

2. ROAR Task Management (for servers managing multiple tables):
   - R – Review: Know where each table stands
   - O – Organize: Group tasks into efficient passes
   - A – Act: Execute with confidence
   - R – Reassess: Check needs after each action

3. HEAT Complaint Resolution:
   - H – Hear: Listen fully without interrupting
   - E – Empathize: Show genuine understanding
   - A – Apologize: Sincere, not defensive
   - T – Take Action: Resolve immediately

BEHAVIORAL INSTRUCTIONS:

1. Always address the operator by their restaurant name or owner name when relevant — this is their restaurant, not a hypothetical.

2. When they ask about food cost, labor, or prime cost: reference their actual numbers vs. their targets directly. Do not give generic benchmarks when you have their specific data.

3. When they are over target on any financial metric: lead with that fact before anything else.

4. When they ask about training or staff issues: reference the manuals and systems available on this platform.

5. Tone: direct, experienced, zero fluff. You are a consultant who has seen operators make every mistake. You respect their time. You give them the answer first, then the explanation.

6. Use short paragraphs (2-3 sentences max). Bold **key terms** and **action items**. Include a brief "**Bottom line:**" summary at the end of longer responses.

7. Never say "great question." Never use filler affirmations. Never hedge with "it depends" without immediately saying what it depends on and what the answer is in both cases.

8. When you don't have enough information to give a specific answer: say so directly and tell them exactly what information would change your advice.

9. You know Texas restaurant law, TABC regulations, and Texas Workforce Commission standards. When legal or compliance questions arise, give the accurate answer and note when they should consult an attorney.

10. You are not a cheerleader. You are a consultant. The operator is paying for honesty, not encouragement.

Never say "As an AI" or reference being an AI assistant. Speak as an experienced operator talking to another operator.

If it wouldn't hold up during a slammed dinner rush, don't recommend it.`;
  } catch (error) {
    console.error("Error building consultant system prompt:", error);
    return CONSULTANT_SYSTEM_PROMPT;
  }
}

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

  app.get("/api/subscription/status", async (req: any, res, next) => {
    // Check for test access session first
    const testAccess = req.session?.testAccess;
    if (testAccess) {
      const now = new Date();
      const expiresAt = new Date(testAccess.expiresAt);
      if (now <= expiresAt) {
        const remainingMs = expiresAt.getTime() - now.getTime();
        const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
        return res.json({
          hasSubscription: true,
          subscriptionStatus: "test_access",
          subscriptionTier: "pro",
          isTestUser: true,
          testAccessExpiresAt: testAccess.expiresAt,
          testAccessRemainingDays: remainingDays,
          testAccessName: testAccess.name,
        });
      } else {
        delete req.session.testAccess;
        req.session.save();
      }
    }
    // Fall through to normal auth check
    return isAuthenticated(req, res, next);
  }, async (req: any, res) => {
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
          subscriptionTier: "pro",
          isAdmin: true
        });
      }

      // Check if user has their own active subscription
      if (user.stripeCustomerId) {
        const subscription = await stripeService.getActiveSubscriptionForCustomer(user.stripeCustomerId);
        if (subscription) {
          const subMeta = (subscription as any).metadata;
          let tier = user.subscriptionTier || "basic";
          if (subMeta?.tier && ['basic', 'pro'].includes(subMeta.tier)) {
            tier = subMeta.tier;
          }
          const isActive = subscription.status === 'active' || subscription.status === 'trialing';
          const effectiveTier = isActive ? tier : "free";
          await storage.updateUserStripeInfo(userId, {
            stripeSubscriptionId: subscription.id as string,
            subscriptionStatus: subscription.status as string,
            subscriptionTier: effectiveTier,
          });
          return res.json({ 
            hasSubscription: isActive,
            subscriptionStatus: subscription.status,
            subscriptionTier: effectiveTier,
            subscriptionId: subscription.id
          });
        } else if (user.subscriptionTier && user.subscriptionTier !== "free") {
          // No active subscription found but user still has a paid tier stored — downgrade
          await storage.updateUserStripeInfo(userId, {
            subscriptionStatus: "canceled",
            subscriptionTier: "free",
          });
        }
      }

      // Check if user is a member of an organization (org members get access through owner's subscription)
      const userOrg = await storage.getUserOrganization(userId);
      if (userOrg) {
        const owner = await storage.getUserById(userOrg.ownerId);
        if (owner) {
          if (owner.isAdmin === "true") {
            return res.json({
              hasSubscription: true,
              subscriptionStatus: "organization_member",
              subscriptionTier: "pro",
              organizationName: userOrg.name
            });
          }
          if (owner.stripeCustomerId) {
            const ownerSubscription = await stripeService.getActiveSubscriptionForCustomer(owner.stripeCustomerId);
            if (ownerSubscription && (ownerSubscription.status === 'active' || ownerSubscription.status === 'trialing')) {
              return res.json({
                hasSubscription: true,
                subscriptionStatus: "organization_member",
                subscriptionTier: owner.subscriptionTier || "basic",
                organizationName: userOrg.name
              });
            }
          }
          if (owner.subscriptionStatus === 'active' || owner.subscriptionStatus === 'trialing') {
            return res.json({
              hasSubscription: true,
              subscriptionStatus: "organization_member",
              subscriptionTier: owner.subscriptionTier || "basic",
              organizationName: userOrg.name
            });
          }
        }
      }

      res.json({ 
        hasSubscription: user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing',
        subscriptionStatus: user.subscriptionStatus,
        subscriptionTier: (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing') ? (user.subscriptionTier || "basic") : "free"
      });
    } catch (error) {
      console.error('Subscription status error:', error);
      res.status(500).json({ error: "Failed to check subscription status" });
    }
  });

  app.post("/api/shorten-url", isAuthenticated, async (req: any, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "url is required" });
      }

      const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        throw new Error('TinyURL service unavailable');
      }
      const shortUrl = await response.text();
      res.json({ shortUrl: shortUrl.trim() });
    } catch (error: any) {
      console.error("URL shortening error:", error);
      res.status(500).json({ error: "Failed to shorten URL" });
    }
  });

  app.post("/api/ocr/extract-text", isAuthenticated, async (req: any, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "imageBase64 is required" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Extract only the customer review text from this screenshot. Ignore the reviewer's name, date, star rating, profile stats, navigation elements, and any UI buttons. Return only the actual review body text that the customer wrote, nothing else." },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
        max_tokens: 2000,
      });

      const text = response.choices[0]?.message?.content || "";
      res.json({ text });
    } catch (error: any) {
      console.error("OCR extract error:", error);
      res.status(500).json({ error: "Failed to extract text" });
    }
  });

  app.post("/api/subscription/checkout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { tier = 'basic', interval = 'month' } = req.body || {};

      if (!['basic', 'pro'].includes(tier)) {
        return res.status(400).json({ error: "Invalid tier. Must be 'basic' or 'pro'." });
      }
      if (!['month', 'year'].includes(interval)) {
        return res.status(400).json({ error: "Invalid interval. Must be 'month' or 'year'." });
      }

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripeService.createCustomer(user.email || '', userId);
        await storage.updateUserStripeInfo(userId, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }

      const priceId = await stripeService.getOrCreateTierPrice(tier, interval as 'month' | 'year');
      console.log(`Creating checkout for tier=${tier}, interval=${interval}, priceId=${priceId}`);

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        `${baseUrl}/subscription/success`,
        `${baseUrl}/subscription/cancel`,
        { tier, interval, userId }
      );

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Checkout error:', error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to create checkout session" });
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

  const profileUploadsDir = path.join(process.cwd(), "uploads", "profiles");
  if (!fs.existsSync(profileUploadsDir)) {
    fs.mkdirSync(profileUploadsDir, { recursive: true });
  }
  app.use("/uploads/profiles", express.static(profileUploadsDir));

  const profilePhotoUpload = multer({
    storage: multer.diskStorage({
      destination: "uploads/profiles",
      filename: (req: any, file, cb) => {
        const ext = file.originalname.split('.').pop();
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      cb(null, allowed.includes(file.mimetype));
    },
  });

  app.post("/api/user/profile/photo", isAuthenticated, profilePhotoUpload.single("photo"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const imageUrl = `/uploads/profiles/${req.file.filename}`;
      await storage.updateUserProfile(userId, { profileImageUrl: imageUrl });
      res.json({ url: imageUrl });
    } catch (error) {
      console.error("Photo upload error:", error);
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });

  app.get("/api/user/export", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUserById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const conversations = await storage.getConversations(userId);
      const restaurantProfile = await storage.getRestaurantProfile(userId);

      const exportData = {
        exportDate: new Date().toISOString(),
        profile: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          address: user.address,
          restaurantName: user.restaurantName,
          role: user.role,
          createdAt: user.createdAt,
        },
        restaurantProfile: restaurantProfile || null,
        conversationCount: conversations.length,
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=my-data-export.json");
      res.json(exportData);
    } catch (error) {
      console.error("Data export error:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  app.delete("/api/user/account", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUserById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (user.stripeCustomerId) {
        try {
          const stripe = await stripeService.getStripe();
          if (stripe && user.stripeSubscriptionId) {
            await stripe.subscriptions.cancel(user.stripeSubscriptionId);
          }
        } catch (subErr) {
          console.error("Failed to cancel subscription during account deletion:", subErr);
        }
      }

      await storage.deleteUser(userId);
      req.logout(() => {
        res.json({ success: true });
      });
    } catch (error) {
      console.error("Account deletion error:", error);
      res.status(500).json({ error: "Failed to delete account" });
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

  app.post("/api/subscription/native-verify", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier, platform } = req.body;

      if (!tier || !['basic', 'pro'].includes(tier)) {
        return res.status(400).json({ error: "Invalid tier" });
      }

      const rcSecretKey = process.env.REVENUECAT_SECRET_KEY;
      if (rcSecretKey) {
        const rcRes = await fetch(`https://api.revenuecat.com/v1/subscribers/${userId}`, {
          headers: { Authorization: `Bearer ${rcSecretKey}` },
        });
        if (rcRes.ok) {
          const rcData = await rcRes.json() as any;
          const entitlements = rcData?.subscriber?.entitlements;
          const hasBasic = entitlements?.basic?.expires_date && new Date(entitlements.basic.expires_date) > new Date();
          const hasPro = entitlements?.pro?.expires_date && new Date(entitlements.pro.expires_date) > new Date();
          const verifiedTier = hasPro ? 'pro' : hasBasic ? 'basic' : null;

          if (!verifiedTier) {
            return res.status(403).json({ error: "No active entitlement found" });
          }

          await storage.updateUser(userId, {
            subscriptionTier: verifiedTier,
            subscriptionStatus: 'active',
          });

          return res.json({ success: true, tier: verifiedTier });
        }
      }

      await storage.updateUser(userId, {
        subscriptionTier: tier,
        subscriptionStatus: 'active',
      });

      res.json({ success: true, tier });
    } catch (error) {
      console.error('Native verify error:', error);
      res.status(500).json({ error: "Failed to verify purchase" });
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

  app.delete("/api/admin/users/:userId", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.claims.sub;
      
      if (userId === currentUserId) {
        return res.status(400).json({ error: "Cannot delete yourself" });
      }
      
      await storage.deleteUser(userId);
      res.status(204).send();
    } catch (error) {
      console.error('Admin delete user error:', error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Test Access Token Routes (Admin)
  app.post("/api/admin/test-access", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { name, email, accessLevel, durationDays } = req.body;
      if (!name || !durationDays) {
        return res.status(400).json({ error: "Name and duration are required" });
      }
      const token = crypto.randomBytes(32).toString("hex");
      const parsedDuration = parseInt(durationDays);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parsedDuration);
      
      const result = await storage.createTestAccessToken({
        token,
        name,
        email: email || null,
        accessLevel: accessLevel || "full",
        durationDays: parsedDuration,
        expiresAt,
        status: "active",
        userId: null,
        createdBy: req.user.claims.sub,
      });

      let emailSent = false;
      if (email) {
        const protocol = process.env.REPL_SLUG ? 'https' : 'http';
        const host = process.env.REPL_SLUG 
          ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
          : 'localhost:5000';
        const accessLink = `${protocol}://${host}/test-access/${token}`;

        const adminUser = await storage.getUserById(req.user.claims.sub);
        const senderName = adminUser?.firstName 
          ? `${adminUser.firstName} ${adminUser.lastName || ''}`.trim() 
          : undefined;

        emailSent = await sendTestAccessEmail({
          toEmail: email,
          recipientName: name,
          accessLink,
          durationDays: parsedDuration,
          senderName,
        });

        if (emailSent) {
          console.log(`[TestAccess] Email sent to ${email} for token ${result.id}`);
        } else {
          console.warn(`[TestAccess] Failed to send email to ${email}, link still generated`);
        }
      }

      res.json({ ...result, token, emailSent });
    } catch (error) {
      console.error("Create test access error:", error);
      res.status(500).json({ error: "Failed to create test access token" });
    }
  });

  app.get("/api/admin/test-access", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const tokens = await storage.getTestAccessTokens();
      res.json(tokens);
    } catch (error) {
      console.error("Get test access tokens error:", error);
      res.status(500).json({ error: "Failed to fetch test access tokens" });
    }
  });

  app.patch("/api/admin/test-access/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { action, additionalDays } = req.body;
      const token = await storage.getTestAccessTokenById(id);
      if (!token) {
        return res.status(404).json({ error: "Token not found" });
      }

      if (action === "revoke") {
        const result = await storage.updateTestAccessToken(id, {
          status: "revoked",
          revokedAt: new Date(),
        });
        return res.json(result);
      }

      if (action === "extend" && additionalDays) {
        const newExpiry = new Date(token.expiresAt);
        newExpiry.setDate(newExpiry.getDate() + parseInt(additionalDays));
        const result = await storage.updateTestAccessToken(id, {
          expiresAt: newExpiry,
          status: "active",
          durationDays: token.durationDays + parseInt(additionalDays),
        });
        return res.json(result);
      }

      if (action === "resend") {
        const newToken = crypto.randomBytes(32).toString("hex");
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + token.durationDays);
        const result = await storage.updateTestAccessToken(id, {
          token: newToken,
          expiresAt: newExpiry,
          status: "active",
          usedAt: null,
          userId: null,
          revokedAt: null,
        });
        return res.json({ ...result, token: newToken });
      }

      if (action === "send_email") {
        if (!token.email) {
          return res.status(400).json({ error: "No email address on this token" });
        }
        const protocol = process.env.REPL_SLUG ? 'https' : 'http';
        const host = process.env.REPL_SLUG 
          ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
          : 'localhost:5000';
        const accessLink = `${protocol}://${host}/test-access/${token.token}`;

        const adminUser = await storage.getUserById(req.user.claims.sub);
        const senderName = adminUser?.firstName 
          ? `${adminUser.firstName} ${adminUser.lastName || ''}`.trim() 
          : undefined;

        const sent = await sendTestAccessEmail({
          toEmail: token.email,
          recipientName: token.name,
          accessLink,
          durationDays: token.durationDays,
          senderName,
        });

        return res.json({ success: sent, emailSent: sent });
      }

      res.status(400).json({ error: "Invalid action" });
    } catch (error) {
      console.error("Update test access error:", error);
      res.status(500).json({ error: "Failed to update test access token" });
    }
  });

  app.delete("/api/admin/test-access/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTestAccessToken(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete test access error:", error);
      res.status(500).json({ error: "Failed to delete test access token" });
    }
  });

  // Public test access activation route
  app.get("/api/test-access/:token/validate", async (req: any, res) => {
    try {
      const tokenRecord = await storage.getTestAccessTokenByToken(req.params.token);
      if (!tokenRecord) {
        return res.json({ valid: false, reason: "invalid" });
      }
      if (tokenRecord.status === "revoked") {
        return res.json({ valid: false, reason: "revoked" });
      }
      if (new Date() > new Date(tokenRecord.expiresAt)) {
        if (tokenRecord.status !== "expired") {
          await storage.updateTestAccessToken(tokenRecord.id, { status: "expired" });
        }
        return res.json({ valid: false, reason: "expired" });
      }
      res.json({ valid: true, name: tokenRecord.name, accessLevel: tokenRecord.accessLevel });
    } catch (error) {
      console.error("Validate test access error:", error);
      res.status(500).json({ error: "Failed to validate token" });
    }
  });

  app.post("/api/test-access/:token/activate", async (req: any, res) => {
    try {
      const tokenRecord = await storage.getTestAccessTokenByToken(req.params.token);
      if (!tokenRecord) {
        return res.status(404).json({ error: "Invalid token" });
      }
      if (tokenRecord.status === "revoked") {
        return res.status(403).json({ error: "This link has been revoked" });
      }
      if (new Date() > new Date(tokenRecord.expiresAt)) {
        await storage.updateTestAccessToken(tokenRecord.id, { status: "expired" });
        return res.status(403).json({ error: "This link has expired" });
      }

      // Create a test user ID based on the token
      const testUserId = `test_${tokenRecord.id}`;
      
      // Check if user already exists for this token
      let user = await storage.getUserById(testUserId);
      if (!user) {
        // Create test user in DB
        await db.insert((await import("@shared/schema")).users).values({
          id: testUserId,
          firstName: tokenRecord.name,
          lastName: "(Test)",
          email: tokenRecord.email,
          role: "owner",
          subscriptionStatus: "test_access",
          isAdmin: "false",
        });
        user = await storage.getUserById(testUserId);
      }

      // Mark token as used
      if (!tokenRecord.usedAt) {
        await storage.updateTestAccessToken(tokenRecord.id, {
          status: "used",
          usedAt: new Date(),
          userId: testUserId,
        });
      }

      // Set test access session
      if (req.session) {
        req.session.testAccess = {
          userId: testUserId,
          tokenId: tokenRecord.id,
          expiresAt: tokenRecord.expiresAt,
          accessLevel: tokenRecord.accessLevel,
          name: tokenRecord.name,
        };
        req.session.save();
      }

      res.json({ success: true, userId: testUserId });
    } catch (error) {
      console.error("Activate test access error:", error);
      res.status(500).json({ error: "Failed to activate test access" });
    }
  });

  // Test access session status (for banner and subscription bypass)
  app.get("/api/test-access/status", async (req: any, res) => {
    try {
      const testAccess = req.session?.testAccess;
      if (!testAccess) {
        return res.json({ active: false });
      }
      
      const now = new Date();
      const expiresAt = new Date(testAccess.expiresAt);
      if (now > expiresAt) {
        delete req.session.testAccess;
        req.session.save();
        return res.json({ active: false, expired: true });
      }

      const remainingMs = expiresAt.getTime() - now.getTime();
      const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

      res.json({
        active: true,
        name: testAccess.name,
        accessLevel: testAccess.accessLevel,
        expiresAt: testAccess.expiresAt,
        remainingDays,
        userId: testAccess.userId,
      });
    } catch (error) {
      console.error("Test access status error:", error);
      res.status(500).json({ error: "Failed to get test access status" });
    }
  });

  // Test access user info (mimics /api/auth/user for test sessions)
  app.get("/api/test-access/user", async (req: any, res) => {
    try {
      const testAccess = req.session?.testAccess;
      if (!testAccess) {
        return res.json(null);
      }
      
      const now = new Date();
      const expiresAt = new Date(testAccess.expiresAt);
      if (now > expiresAt) {
        delete req.session.testAccess;
        req.session.save();
        return res.json(null);
      }

      const user = await storage.getUserById(testAccess.userId);
      if (!user) {
        return res.json(null);
      }

      res.json({
        ...user,
        isTestUser: true,
        testAccessExpiresAt: testAccess.expiresAt,
        testAccessLevel: testAccess.accessLevel,
      });
    } catch (error) {
      console.error("Test access user error:", error);
      res.status(500).json({ error: "Failed to get test user" });
    }
  });

  app.post("/api/test-access/logout", async (req: any, res) => {
    try {
      if (req.session?.testAccess) {
        delete req.session.testAccess;
        req.session.save();
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to logout" });
    }
  });

  // Apple App Review login endpoint (username/password for App Store review)
  app.post("/api/review-login", async (req: any, res) => {
    try {
      const { username, password } = req.body;
      
      const reviewUsername = process.env.REVIEW_USERNAME || "applereview";
      const reviewPassword = process.env.REVIEW_PASSWORD;
      
      if (!reviewPassword) {
        return res.status(503).json({ error: "Review login not configured" });
      }
      
      if (username !== reviewUsername || password !== reviewPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      const reviewUserId = "review_apple";
      
      let user = await storage.getUserById(reviewUserId);
      if (!user) {
        await db.insert((await import("@shared/schema")).users).values({
          id: reviewUserId,
          firstName: "Apple",
          lastName: "Reviewer",
          email: "review@apple.com",
          role: "owner",
          subscriptionStatus: "test_access",
          isAdmin: "false",
        });
      }
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);
      
      if (req.session) {
        req.session.testAccess = {
          userId: reviewUserId,
          tokenId: 0,
          expiresAt: expiresAt.toISOString(),
          accessLevel: "full",
          name: "Apple Reviewer",
        };
        req.session.save();
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Review login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Apple Sign In for native iOS app
  const appleJwksClient = jwksClient({
    jwksUri: "https://appleid.apple.com/auth/keys",
    cache: true,
    cacheMaxAge: 86400000,
  });

  // Apple Sign In for WEB (OAuth redirect flow)
  app.get("/api/auth/apple/web", (req: any, res) => {
    try {
      const state = crypto.randomBytes(32).toString('hex');
      req.session.appleOAuthState = state;
      const redirectUri = `https://${req.hostname}/api/auth/apple/callback`;
      const params = new URLSearchParams({
        client_id: process.env.APPLE_CLIENT_ID!,
        redirect_uri: redirectUri,
        response_type: 'code id_token',
        response_mode: 'form_post',
        scope: 'name email',
        state,
      });
      res.redirect(`https://appleid.apple.com/auth/authorize?${params.toString()}`);
    } catch (error: any) {
      console.error("[APPLE_WEB] Failed to start OAuth:", error);
      res.redirect("/?error=apple_auth_failed");
    }
  });

  app.post("/api/auth/apple/callback", express.urlencoded({ extended: true }), async (req: any, res) => {
    try {
      const { code, id_token, state, user: userJson } = req.body;
      console.log("[APPLE_WEB] Callback received, has code:", !!code, "has id_token:", !!id_token, "has state:", !!state);
      console.log("[APPLE_WEB] Session state:", req.session?.appleOAuthState ? "present" : "missing");

      if (!state || state !== req.session?.appleOAuthState) {
        console.error("[APPLE_WEB] State mismatch — expected:", req.session?.appleOAuthState, "got:", state);
        if (!id_token && !code) {
          return res.redirect("/login?error=apple_invalid_state");
        }
        console.log("[APPLE_WEB] State mismatch but have tokens, proceeding anyway");
      }
      delete req.session.appleOAuthState;

      if (!id_token && !code) {
        console.error("[APPLE_WEB] No id_token or code received");
        return res.redirect("/login?error=apple_missing_token");
      }

      let appleUserId: string | null = null;
      let userEmail: string | null = null;
      let firstName: string | null = null;
      let lastName: string | null = null;

      if (id_token) {
        console.log("[APPLE_WEB] Verifying id_token...");
        try {
          const decoded = jwt.decode(id_token, { complete: true });
          if (!decoded || !decoded.header.kid) {
            console.error("[APPLE_WEB] Invalid token format, no kid in header");
            return res.redirect("/login?error=apple_invalid_token");
          }
          const key = await appleJwksClient.getSigningKey(decoded.header.kid);
          const signingKey = key.getPublicKey();
          const verified = jwt.verify(id_token, signingKey, {
            algorithms: ["RS256"],
            issuer: "https://appleid.apple.com",
            audience: process.env.APPLE_CLIENT_ID!,
          }) as any;
          appleUserId = verified.sub;
          userEmail = verified.email || null;
          console.log("[APPLE_WEB] id_token verified, sub:", appleUserId, "email:", userEmail);
        } catch (tokenErr: any) {
          console.error("[APPLE_WEB] id_token verification failed:", tokenErr.message);
        }
      }

      if (code && !appleUserId) {
        console.log("[APPLE_WEB] Exchanging authorization code for tokens...");
        try {
          const clientSecret = generateAppleClientSecret();
          console.log("[APPLE_WEB] Client secret generated successfully");
          const redirectUri = `https://${req.hostname}/api/auth/apple/callback`;
          const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.APPLE_CLIENT_ID!,
              client_secret: clientSecret,
              code,
              grant_type: "authorization_code",
              redirect_uri: redirectUri,
            }),
          });
          const tokenText = await tokenRes.text();
          console.log("[APPLE_WEB] Token exchange status:", tokenRes.status, "body:", tokenText.substring(0, 300));
          try {
            const tokenData = JSON.parse(tokenText);
            if (tokenData.id_token) {
              const decoded = jwt.decode(tokenData.id_token) as any;
              appleUserId = decoded?.sub;
              userEmail = decoded?.email || null;
              console.log("[APPLE_WEB] Token exchange success, sub:", appleUserId);
            } else {
              console.error("[APPLE_WEB] Token exchange response missing id_token:", tokenData.error);
            }
          } catch (parseErr: any) {
            console.error("[APPLE_WEB] Failed to parse token response:", parseErr.message);
          }
        } catch (exchangeErr: any) {
          console.error("[APPLE_WEB] Code exchange error:", exchangeErr.message);
        }
      }

      if (!appleUserId) {
        console.error("[APPLE_WEB] Could not determine Apple user ID");
        return res.redirect("/login?error=apple_auth_failed");
      }

      if (userJson) {
        try {
          const parsed = typeof userJson === 'string' ? JSON.parse(userJson) : userJson;
          firstName = parsed?.name?.firstName || null;
          lastName = parsed?.name?.lastName || null;
          if (!userEmail && parsed?.email) userEmail = parsed.email;
        } catch {}
      }

      const finalUserId = `apple_${appleUserId}`;
      console.log("[APPLE_WEB] Creating/updating user:", finalUserId, userEmail);

      const { authStorage } = await import("./replit_integrations/auth/storage");
      await authStorage.upsertUser({
        id: finalUserId,
        email: userEmail,
        firstName,
        lastName,
        profileImageUrl: null,
      });

      const sessionUser: any = {
        claims: { sub: finalUserId },
        expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
      };

      await new Promise<void>((resolve, reject) => {
        req.logIn(sessionUser, (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      console.log("[APPLE_WEB] Login successful, redirecting to /");
      res.redirect("/");
    } catch (error: any) {
      console.error("[APPLE_WEB] Callback error:", error.message, error.stack);
      res.redirect("/login?error=apple_auth_failed");
    }
  });

  function generateAppleClientSecret(): string {
    const privateKey = process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, '\n');
    const now = Math.floor(Date.now() / 1000);
    return jwt.sign({}, privateKey, {
      algorithm: 'ES256',
      expiresIn: '5m',
      audience: 'https://appleid.apple.com',
      issuer: process.env.APPLE_TEAM_ID!,
      subject: process.env.APPLE_CLIENT_ID!,
      keyid: process.env.APPLE_KEY_ID!,
      header: {
        alg: 'ES256',
        kid: process.env.APPLE_KEY_ID!,
      },
    } as any);
  }

  app.post("/api/auth/apple", async (req: any, res) => {
    try {
      const { identityToken, email, givenName, familyName } = req.body;

      if (!identityToken) {
        return res.status(400).json({ error: "Missing identity token" });
      }

      const decoded = jwt.decode(identityToken, { complete: true });
      if (!decoded || !decoded.header.kid) {
        return res.status(401).json({ error: "Invalid token format" });
      }

      const key = await appleJwksClient.getSigningKey(decoded.header.kid);
      const signingKey = key.getPublicKey();

      const verified = jwt.verify(identityToken, signingKey, {
        algorithms: ["RS256"],
        issuer: "https://appleid.apple.com",
        audience: "com.alstiginc.restaurantconsultant",
      }) as any;

      const appleUserId = `apple_${verified.sub}`;
      const userEmail = email || verified.email || null;

      const { authStorage } = await import("./replit_integrations/auth/storage");
      await authStorage.upsertUser({
        id: appleUserId,
        email: userEmail,
        firstName: givenName || null,
        lastName: familyName || null,
        profileImageUrl: null,
      });

      const sessionUser: any = {
        claims: { sub: appleUserId },
        expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
      };

      await new Promise<void>((resolve, reject) => {
        req.logIn(sessionUser, (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({ success: true, userId: appleUserId });
    } catch (error: any) {
      console.error("Apple auth error:", error);
      if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Invalid or expired Apple token" });
      }
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  // Session logout for native app (no external redirect)
  app.post("/api/auth/logout", (req: any, res) => {
    if (req.session?.testAccess) {
      delete req.session.testAccess;
    }
    req.logout(() => {
      req.session?.destroy((err: any) => {
        res.clearCookie("connect.sid");
        res.json({ success: true });
      });
    });
  });

  app.post("/api/push/register", isAuthenticated, (req: any, res) => {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Missing push token" });
    }
    console.log(`Push token registered for user ${req.user?.claims?.sub}: ${token.substring(0, 20)}...`);
    res.json({ success: true });
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

  // ===== CONSULTANT CONVERSATION ROUTES =====

  app.get("/api/consultant/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const convos = await storage.getConversations(userId);
      res.json(convos);
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post("/api/consultant/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title } = req.body;
      const conv = await storage.createConversation(userId, title || "New conversation");
      res.json(conv);
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get("/api/consultant/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conv = await storage.getConversation(Number(req.params.id), userId);
      if (!conv) return res.status(404).json({ message: "Conversation not found" });
      const msgs = await storage.getConversationMessages(conv.id);
      res.json(msgs);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.delete("/api/consultant/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteConversation(Number(req.params.id), userId);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

  // Consultant Ask Route (streaming with conversation persistence)
  app.get("/api/consultant/message-count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUserById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const tier = user.subscriptionTier || "free";
      if (tier !== "free") {
        return res.json({ unlimited: true, used: 0, limit: 0 });
      }

      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      let used = user.consultantMessagesUsed || 0;

      if (user.consultantMessagesResetDate !== currentMonth) {
        await storage.updateConsultantMessageCount(userId, 0, currentMonth);
        used = 0;
      }

      return res.json({ unlimited: false, used, limit: 3 });
    } catch (err) {
      console.error("Error fetching consultant message count:", err);
      res.status(500).json({ message: "Failed to fetch message count" });
    }
  });

  app.post(api.consultant.ask.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { question, context, image, images, conversationId, history } = req.body;

      const user = await storage.getUserById(userId);
      const tier = user?.subscriptionTier || "free";

      if (tier === "free" && user) {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        let used = user.consultantMessagesUsed || 0;

        if (user.consultantMessagesResetDate !== currentMonth) {
          await storage.updateConsultantMessageCount(userId, 0, currentMonth);
          used = 0;
        }

        if (used >= 3) {
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");

          const topic = question.length > 100 ? question.substring(0, 100) : question;
          const partialAnswer = `That's a solid question about "${topic.trim()}." The short answer is: this is exactly the kind of operational challenge where having a structured system makes the difference between guessing and knowing.\n\n---\n\n**You've used your 3 free consultant messages this month.** Upgrade to unlock unlimited access to expert operational guidance — staffing, costs, training, service standards, and more.\n\n[Upgrade for $10/month →](/pricing)`;

          let convId = conversationId;
          if (!convId) {
            const title = question.length > 60 ? question.substring(0, 57) + "..." : question;
            const conv = await storage.createConversation(userId, title);
            convId = conv.id;
          }
          await storage.addMessage(convId, "user", question);
          await storage.addMessage(convId, "assistant", partialAnswer);

          res.write(`data: ${JSON.stringify({ content: partialAnswer })}\n\n`);
          res.write(`data: ${JSON.stringify({ done: true, conversationId: convId, limitReached: true })}\n\n`);
          res.end();
          return;
        }

        await storage.updateConsultantMessageCount(userId, used + 1, currentMonth);
      }

      let convId = conversationId;
      if (!convId) {
        const title = question.length > 60 ? question.substring(0, 57) + "..." : question;
        const conv = await storage.createConversation(userId, title);
        convId = conv.id;
      }

      await storage.addMessage(convId, "user", question);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const dynamicPrompt = await buildConsultantSystemPrompt(userId);

      type MessageContent = string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
      const chatMessages: { role: "system" | "user" | "assistant"; content: MessageContent }[] = [
        { role: "system", content: dynamicPrompt },
      ];

      if (context) {
        chatMessages.push({ role: "user", content: `Context: ${context}` });
      }

      if (history && Array.isArray(history)) {
        for (const msg of history) {
          chatMessages.push({ role: msg.role, content: msg.content });
        }
      }

      const imageList: string[] = images && Array.isArray(images) ? images : (image ? [image] : []);
      if (imageList.length > 0) {
        const contentParts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
          { type: "text", text: question },
        ];
        for (const img of imageList) {
          contentParts.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${img}` } });
        }
        chatMessages.push({ role: "user", content: contentParts });
      } else {
        chatMessages.push({ role: "user", content: question });
      }

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: chatMessages as any,
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

      await storage.addMessage(convId, "assistant", fullResponse);

      res.write(`data: ${JSON.stringify({ done: true, conversationId: convId })}\n\n`);
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

  app.get("/api/consultant/context", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const setup = await storage.getHandbookSettings(userId);

      if (!setup || !setup.restaurantName) {
        return res.json({ complete: false, restaurantName: null, primeCostActual: null, primeCostTarget: null, variance: null });
      }

      const foodTarget = setup.foodCostTarget ? Number(setup.foodCostTarget) : null;
      const foodActual = setup.foodCostActual ? Number(setup.foodCostActual) : null;
      const laborTarget = setup.laborTargetPct ? Number(setup.laborTargetPct) : null;
      const laborActual = setup.laborCostActual ? Number(setup.laborCostActual) : null;

      const primeCostTarget = setup.primeCostTarget ? Number(setup.primeCostTarget) : (foodTarget !== null && laborTarget !== null ? foodTarget + laborTarget : null);
      const primeCostActual = foodActual !== null && laborActual !== null ? foodActual + laborActual : null;

      const hasFinancials = foodTarget !== null && laborTarget !== null && foodActual !== null && laborActual !== null;

      res.json({
        complete: hasFinancials,
        restaurantName: setup.restaurantName || null,
        primeCostActual: primeCostActual !== null ? Number(primeCostActual.toFixed(1)) : null,
        primeCostTarget: primeCostTarget !== null ? Number(primeCostTarget) : null,
        variance: primeCostActual !== null && primeCostTarget !== null ? Number((primeCostActual - primeCostTarget).toFixed(1)) : null,
      });
    } catch (error: any) {
      console.error("Error fetching consultant context:", error);
      res.status(500).json({ message: "Failed to fetch consultant context" });
    }
  });

  // ===== PRIME COST TRACKER ROUTES =====

  app.get("/api/prime-cost", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entries = await storage.getPrimeCostEntries(userId);
      res.json(entries);
    } catch (err) {
      console.error("Error fetching prime cost entries:", err);
      res.status(500).json({ message: "Failed to fetch entries" });
    }
  });

  app.post("/api/prime-cost", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { weekEnding, foodCost, laborCost, totalSales, notes } = req.body;

      const food = parseFloat(foodCost);
      const labor = parseFloat(laborCost);
      const sales = parseFloat(totalSales);

      if (!weekEnding || isNaN(food) || isNaN(labor) || isNaN(sales)) {
        return res.status(400).json({ message: "Week ending date and valid numbers are required" });
      }
      if (food <= 0 || labor <= 0 || sales <= 0) {
        return res.status(400).json({ message: "All values must be positive numbers" });
      }
      if ((food + labor) > sales * 1.5) {
        return res.status(400).json({ message: "Prime cost exceeds 150% of sales — please check your numbers" });
      }

      const weekDate = new Date(weekEnding);
      const nextSunday = new Date();
      nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()) % 7 + 7);
      if (weekDate > nextSunday) {
        return res.status(400).json({ message: "Week ending date cannot be more than a week in the future" });
      }

      const foodCostPct = ((food / sales) * 100).toFixed(2);
      const laborCostPct = ((labor / sales) * 100).toFixed(2);
      const primeCostPct = (((food + labor) / sales) * 100).toFixed(2);

      const entry = await storage.createPrimeCostEntry({
        userId,
        weekEnding,
        foodCost: food.toFixed(2),
        laborCost: labor.toFixed(2),
        totalSales: sales.toFixed(2),
        foodCostPct,
        laborCostPct,
        primeCostPct,
        notes: notes?.substring(0, 200) || null,
      });

      res.json(entry);
    } catch (err) {
      console.error("Error creating prime cost entry:", err);
      res.status(500).json({ message: "Failed to save entry" });
    }
  });

  app.put("/api/prime-cost/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const { foodCost, laborCost, totalSales, notes } = req.body;

      const food = parseFloat(foodCost);
      const labor = parseFloat(laborCost);
      const sales = parseFloat(totalSales);

      if (isNaN(food) || isNaN(labor) || isNaN(sales)) {
        return res.status(400).json({ message: "Valid numbers are required" });
      }
      if (food <= 0 || labor <= 0 || sales <= 0) {
        return res.status(400).json({ message: "All values must be positive numbers" });
      }
      if ((food + labor) > sales * 1.5) {
        return res.status(400).json({ message: "Prime cost exceeds 150% of sales — please check your numbers" });
      }

      const foodCostPct = ((food / sales) * 100).toFixed(2);
      const laborCostPct = ((labor / sales) * 100).toFixed(2);
      const primeCostPct = (((food + labor) / sales) * 100).toFixed(2);

      const updated = await storage.updatePrimeCostEntry(id, userId, {
        foodCost: food.toFixed(2),
        laborCost: labor.toFixed(2),
        totalSales: sales.toFixed(2),
        foodCostPct,
        laborCostPct,
        primeCostPct,
        notes: notes?.substring(0, 200) || null,
      });

      if (!updated) {
        return res.status(404).json({ message: "Entry not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error updating prime cost entry:", err);
      res.status(500).json({ message: "Failed to update entry" });
    }
  });

  app.delete("/api/prime-cost/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      await storage.deletePrimeCostEntry(id, userId);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting prime cost entry:", err);
      res.status(500).json({ message: "Failed to delete entry" });
    }
  });

  app.get("/api/prime-cost/summary", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entries = await storage.getPrimeCostEntries(userId);
      const last4 = entries.slice(0, 4);

      const setup = await storage.getHandbookSettings(userId);
      const foodCostTarget = setup?.foodCostTarget ? parseFloat(setup.foodCostTarget) : null;
      const laborTarget = setup?.laborTargetPct ? parseFloat(setup.laborTargetPct) : null;
      const primeCostTarget = setup?.primeCostTarget ? parseFloat(setup.primeCostTarget) : (foodCostTarget !== null && laborTarget !== null ? foodCostTarget + laborTarget : null);

      let trendDirection: "up" | "down" | "flat" | null = null;
      if (last4.length >= 2 && last4[0].primeCostPct && last4[1].primeCostPct) {
        const latest = parseFloat(last4[0].primeCostPct);
        const previous = parseFloat(last4[1].primeCostPct);
        const diff = latest - previous;
        if (Math.abs(diff) < 0.1) trendDirection = "flat";
        else trendDirection = diff > 0 ? "up" : "down";
      }

      res.json({
        entries: last4,
        targets: { foodCostTarget, laborTarget, primeCostTarget },
        trendDirection,
        totalEntries: entries.length,
      });
    } catch (err) {
      console.error("Error fetching prime cost summary:", err);
      res.status(500).json({ message: "Failed to fetch summary" });
    }
  });

  // ===== RESTAURANT PROFILE ROUTES =====

  // Get user's restaurant profile
  app.get("/api/restaurant-profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getRestaurantProfile(userId);
      res.json(profile || null);
    } catch (error: any) {
      console.error('Error fetching restaurant profile:', error);
      res.status(500).json({ message: "Failed to fetch restaurant profile" });
    }
  });

  // Create or update restaurant profile
  app.post("/api/restaurant-profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.upsertRestaurantProfile(userId, req.body);
      res.json(profile);
    } catch (error: any) {
      console.error('Error saving restaurant profile:', error);
      res.status(500).json({ message: "Failed to save restaurant profile" });
    }
  });

  // ===== HANDBOOK SETTINGS ROUTES =====
  
  app.get("/api/handbook-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getHandbookSettings(userId);
      res.json(settings || null);
    } catch (error: any) {
      console.error('Error fetching handbook settings:', error);
      res.status(500).json({ message: "Failed to fetch handbook settings" });
    }
  });

  app.post("/api/handbook-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertHandbookSettingsSchema.partial().parse(req.body);
      const settings = await storage.upsertHandbookSettings(userId, validatedData);
      res.json(settings);
    } catch (error: any) {
      console.error('Error saving handbook settings:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save handbook settings" });
    }
  });

  // ===== DAILY TASK COMPLETION ROUTES =====

  // Get tasks for a specific date
  app.get("/api/daily-tasks/:date", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { date } = req.params;
      const tasks = await storage.getDailyTaskCompletions(userId, date);
      res.json(tasks);
    } catch (error: any) {
      console.error('Error fetching daily tasks:', error);
      res.status(500).json({ message: "Failed to fetch daily tasks" });
    }
  });

  // Get task completion stats for a date range
  app.get("/api/daily-tasks/stats/:startDate/:endDate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.params;
      const stats = await storage.getTaskCompletionStats(userId, startDate, endDate);
      res.json(stats);
    } catch (error: any) {
      console.error('Error fetching task stats:', error);
      res.status(500).json({ message: "Failed to fetch task stats" });
    }
  });

  // Create a new task
  app.post("/api/daily-tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const task = await storage.createDailyTaskCompletion({
        ...req.body,
        userId,
      });
      res.status(201).json(task);
    } catch (error: any) {
      console.error('Error creating daily task:', error);
      res.status(500).json({ message: "Failed to create daily task" });
    }
  });

  // Toggle task completion
  app.patch("/api/daily-tasks/:id/toggle", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { completed } = req.body;
      const task = await storage.toggleTaskCompletion(Number(id), completed);
      res.json(task);
    } catch (error: any) {
      console.error('Error toggling task:', error);
      res.status(500).json({ message: "Failed to toggle task" });
    }
  });

  // Delete a task
  app.delete("/api/daily-tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteDailyTaskCompletion(Number(id));
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting daily task:', error);
      res.status(500).json({ message: "Failed to delete daily task" });
    }
  });

  // Get task completion trends (weekly summary for past N weeks)
  app.get("/api/daily-tasks/trends/:weeks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const weeks = Math.min(Number(req.params.weeks) || 8, 12); // Cap at 12 weeks
      const trends = await storage.getTaskCompletionTrends(userId, weeks);
      res.json(trends);
    } catch (error: any) {
      console.error('Error fetching task trends:', error);
      res.status(500).json({ message: "Failed to fetch task trends" });
    }
  });

  // Get daily completion heatmap data for date range
  app.get("/api/daily-tasks/heatmap", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { start, end } = req.query;
      
      // Default to past 56 days (8 weeks) if not specified
      const endDate = end || new Date().toISOString().split('T')[0];
      const startDate = start || new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const heatmapData = await storage.getDailyCompletionHeatmap(userId, startDate, endDate);
      res.json(heatmapData);
    } catch (error: any) {
      console.error('Error fetching heatmap data:', error);
      res.status(500).json({ message: "Failed to fetch heatmap data" });
    }
  });

  // ===== REPAIR VENDORS ROUTES =====

  // Get all vendors for user
  app.get("/api/vendors", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendors = await storage.getRepairVendors(userId);
      res.json(vendors);
    } catch (error: any) {
      console.error('Error fetching vendors:', error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  // Get vendors by specialty
  app.get("/api/vendors/specialty/:specialty", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendors = await storage.getRepairVendorsBySpecialty(userId, req.params.specialty);
      res.json(vendors);
    } catch (error: any) {
      console.error('Error fetching vendors by specialty:', error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  // Get single vendor
  app.get("/api/vendors/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendor = await storage.getRepairVendor(Number(req.params.id), userId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error: any) {
      console.error('Error fetching vendor:', error);
      res.status(500).json({ message: "Failed to fetch vendor" });
    }
  });

  // Create vendor
  app.post("/api/vendors", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendor = await storage.createRepairVendor({ ...req.body, userId });
      res.status(201).json(vendor);
    } catch (error: any) {
      console.error('Error creating vendor:', error);
      res.status(500).json({ message: "Failed to create vendor" });
    }
  });

  // Update vendor
  app.put("/api/vendors/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendor = await storage.updateRepairVendor(Number(req.params.id), userId, req.body);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error: any) {
      console.error('Error updating vendor:', error);
      res.status(500).json({ message: "Failed to update vendor" });
    }
  });

  // Toggle vendor favorite
  app.patch("/api/vendors/:id/favorite", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendor = await storage.toggleVendorFavorite(Number(req.params.id), userId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error: any) {
      console.error('Error toggling vendor favorite:', error);
      res.status(500).json({ message: "Failed to toggle favorite" });
    }
  });

  // Delete vendor
  app.delete("/api/vendors/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteRepairVendor(Number(req.params.id), userId);
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting vendor:', error);
      res.status(500).json({ message: "Failed to delete vendor" });
    }
  });

  // ===== FACILITY ISSUES ROUTES =====

  // Get all facility issues
  app.get("/api/facility-issues", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const issues = await storage.getFacilityIssues(userId);
      res.json(issues);
    } catch (error: any) {
      console.error('Error fetching facility issues:', error);
      res.status(500).json({ message: "Failed to fetch issues" });
    }
  });

  // Get open facility issues only
  app.get("/api/facility-issues/open", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const issues = await storage.getOpenFacilityIssues(userId);
      res.json(issues);
    } catch (error: any) {
      console.error('Error fetching open issues:', error);
      res.status(500).json({ message: "Failed to fetch open issues" });
    }
  });

  // Get facility issue stats
  app.get("/api/facility-issues/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getFacilityIssueStats(userId);
      res.json(stats);
    } catch (error: any) {
      console.error('Error fetching issue stats:', error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get single facility issue
  app.get("/api/facility-issues/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const issue = await storage.getFacilityIssue(Number(req.params.id), userId);
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }
      res.json(issue);
    } catch (error: any) {
      console.error('Error fetching facility issue:', error);
      res.status(500).json({ message: "Failed to fetch issue" });
    }
  });

  // Create facility issue
  app.post("/api/facility-issues", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const issue = await storage.createFacilityIssue({ ...req.body, userId });
      res.status(201).json(issue);
    } catch (error: any) {
      console.error('Error creating facility issue:', error);
      res.status(500).json({ message: "Failed to create issue" });
    }
  });

  // Update facility issue
  app.put("/api/facility-issues/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const issue = await storage.updateFacilityIssue(Number(req.params.id), userId, req.body);
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }
      res.json(issue);
    } catch (error: any) {
      console.error('Error updating facility issue:', error);
      res.status(500).json({ message: "Failed to update issue" });
    }
  });

  // Resolve facility issue
  app.patch("/api/facility-issues/:id/resolve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { repairNotes, repairCost } = req.body;
      const issue = await storage.resolveFacilityIssue(Number(req.params.id), userId, repairNotes, repairCost);
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }
      res.json(issue);
    } catch (error: any) {
      console.error('Error resolving facility issue:', error);
      res.status(500).json({ message: "Failed to resolve issue" });
    }
  });

  // Delete facility issue
  app.delete("/api/facility-issues/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteFacilityIssue(Number(req.params.id), userId);
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting facility issue:', error);
      res.status(500).json({ message: "Failed to delete issue" });
    }
  });

  // ===== KITCHEN SHIFT DATA ROUTES =====

  // Get all kitchen shift data for user
  app.get("/api/kitchen-shifts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const shifts = await storage.getKitchenShiftData(userId);
      res.json(shifts);
    } catch (error: any) {
      console.error('Error fetching kitchen shift data:', error);
      res.status(500).json({ message: "Failed to fetch shifts" });
    }
  });

  app.get("/api/kitchen-shifts/latest", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const shifts = await storage.getKitchenShiftData(userId);
      res.json(shifts.length > 0 ? shifts[0] : null);
    } catch (error: any) {
      console.error('Error fetching latest kitchen shift:', error);
      res.status(500).json({ message: "Failed to fetch latest shift" });
    }
  });

  // Get kitchen shift by date and daypart
  app.get("/api/kitchen-shifts/:date/:daypart", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { date, daypart } = req.params;
      const shift = await storage.getKitchenShiftByDate(userId, date, daypart);
      res.json(shift || null);
    } catch (error: any) {
      console.error('Error fetching kitchen shift:', error);
      res.status(500).json({ message: "Failed to fetch shift" });
    }
  });

  // Get recent kitchen shift data (last 14 days)
  app.get("/api/kitchen-shifts/recent/:dayOfWeek/:daypart", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { dayOfWeek, daypart } = req.params;
      const shifts = await storage.getRecentKitchenShifts(userId, dayOfWeek, daypart);
      res.json(shifts);
    } catch (error: any) {
      console.error('Error fetching recent kitchen shifts:', error);
      res.status(500).json({ message: "Failed to fetch recent shifts" });
    }
  });

  // Save kitchen shift data
  app.post("/api/kitchen-shifts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const shift = await storage.saveKitchenShiftData({ ...req.body, userId });
      res.status(201).json(shift);
    } catch (error: any) {
      console.error('Error saving kitchen shift data:', error);
      res.status(500).json({ message: "Failed to save shift" });
    }
  });

  // Update kitchen shift data
  app.put("/api/kitchen-shifts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const shift = await storage.updateKitchenShiftData(Number(req.params.id), userId, req.body);
      if (!shift) {
        return res.status(404).json({ message: "Shift not found" });
      }
      res.json(shift);
    } catch (error: any) {
      console.error('Error updating kitchen shift data:', error);
      res.status(500).json({ message: "Failed to update shift" });
    }
  });

  app.get("/api/kitchen-shifts/last-debrief", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const shifts = await storage.getKitchenShiftData(userId);
      const lastWithDebrief = shifts.find((s: any) => s.debriefStructured || s.fixForTomorrow);
      res.json(lastWithDebrief || null);
    } catch (error: any) {
      console.error('Error fetching last debrief:', error);
      res.status(500).json({ message: "Failed to fetch last debrief" });
    }
  });

  // Save quick debrief
  app.post("/api/kitchen-shifts/debrief", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { shiftDate, daypart, whatWentWell, whatSucked, fixForTomorrow, debriefStructured } = req.body;
      const shift = await storage.saveKitchenDebrief(userId, shiftDate, daypart, {
        whatWentWell,
        whatSucked,
        fixForTomorrow,
        debriefStructured
      });
      res.status(201).json(shift);
    } catch (error: any) {
      console.error('Error saving debrief:', error);
      res.status(500).json({ message: "Failed to save debrief" });
    }
  });

  // ===== LIVING PLAYBOOKS ROUTES =====

  app.get("/api/playbooks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const playbooks = await storage.getPlaybooks(userId);
      res.json(playbooks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch playbooks" });
    }
  });

  app.get("/api/playbooks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const playbook = await storage.getPlaybook(Number(req.params.id), userId);
      if (!playbook) return res.status(404).json({ message: "Playbook not found" });
      res.json(playbook);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch playbook" });
    }
  });

  app.post("/api/playbooks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const playbook = await storage.createPlaybook({ ...req.body, userId });
      res.status(201).json(playbook);
    } catch (error) {
      res.status(500).json({ message: "Failed to create playbook" });
    }
  });

  app.put("/api/playbooks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const playbook = await storage.updatePlaybook(Number(req.params.id), userId, req.body);
      if (!playbook) return res.status(404).json({ message: "Playbook not found" });
      res.json(playbook);
    } catch (error) {
      res.status(500).json({ message: "Failed to update playbook" });
    }
  });

  app.delete("/api/playbooks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deletePlaybook(Number(req.params.id), userId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete playbook" });
    }
  });

  app.post("/api/playbooks/:id/duplicate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const playbook = await storage.duplicatePlaybook(Number(req.params.id), userId);
      if (!playbook) return res.status(404).json({ message: "Playbook not found" });
      res.status(201).json(playbook);
    } catch (error) {
      res.status(500).json({ message: "Failed to duplicate playbook" });
    }
  });

  app.get("/api/playbooks/:id/steps", isAuthenticated, async (req: any, res) => {
    try {
      const steps = await storage.getPlaybookSteps(Number(req.params.id));
      res.json(steps);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch playbook steps" });
    }
  });

  app.post("/api/playbooks/:id/steps", isAuthenticated, async (req: any, res) => {
    try {
      const step = await storage.createPlaybookStep({ ...req.body, playbookId: Number(req.params.id) });
      res.status(201).json(step);
    } catch (error) {
      res.status(500).json({ message: "Failed to create step" });
    }
  });

  app.put("/api/playbooks/:playbookId/steps/:stepId", isAuthenticated, async (req: any, res) => {
    try {
      const step = await storage.updatePlaybookStep(Number(req.params.stepId), req.body);
      if (!step) return res.status(404).json({ message: "Step not found" });
      res.json(step);
    } catch (error) {
      res.status(500).json({ message: "Failed to update step" });
    }
  });

  app.delete("/api/playbooks/:playbookId/steps/:stepId", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deletePlaybookStep(Number(req.params.stepId));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete step" });
    }
  });

  app.put("/api/playbooks/:id/steps/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const steps = await storage.bulkUpdatePlaybookSteps(Number(req.params.id), req.body.steps);
      res.json(steps);
    } catch (error) {
      res.status(500).json({ message: "Failed to update steps" });
    }
  });

  app.get("/api/playbooks/:id/assignments", isAuthenticated, async (req: any, res) => {
    try {
      const assignments = await storage.getPlaybookAssignments(Number(req.params.id));
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  app.post("/api/playbooks/:id/assignments", isAuthenticated, async (req: any, res) => {
    try {
      const assignment = await storage.createPlaybookAssignment({ ...req.body, playbookId: Number(req.params.id) });
      res.status(201).json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to create assignment" });
    }
  });

  app.delete("/api/playbooks/:playbookId/assignments/:assignmentId", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deletePlaybookAssignment(Number(req.params.assignmentId));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete assignment" });
    }
  });

  app.get("/api/playbooks/:id/acknowledgments", isAuthenticated, async (req: any, res) => {
    try {
      const shiftDate = req.query.shiftDate as string | undefined;
      const acks = await storage.getPlaybookAcknowledgments(Number(req.params.id), shiftDate);
      res.json(acks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch acknowledgments" });
    }
  });

  app.post("/api/playbooks/:id/acknowledgments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const ack = await storage.createPlaybookAcknowledgment({ 
        ...req.body, 
        playbookId: Number(req.params.id),
        userId 
      });
      res.status(201).json(ack);
    } catch (error) {
      res.status(500).json({ message: "Failed to create acknowledgment" });
    }
  });

  app.get("/api/playbooks/:id/audits", isAuthenticated, async (req: any, res) => {
    try {
      const audits = await storage.getPlaybookAudits(Number(req.params.id));
      res.json(audits);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audits" });
    }
  });

  app.post("/api/playbooks/:id/audits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const audit = await storage.createPlaybookAudit({ 
        ...req.body, 
        playbookId: Number(req.params.id),
        auditorUserId: userId 
      });
      res.status(201).json(audit);
    } catch (error) {
      res.status(500).json({ message: "Failed to create audit" });
    }
  });

  app.put("/api/playbooks/:playbookId/audits/:auditId", isAuthenticated, async (req: any, res) => {
    try {
      const audit = await storage.updatePlaybookAudit(Number(req.params.auditId), req.body);
      if (!audit) return res.status(404).json({ message: "Audit not found" });
      res.json(audit);
    } catch (error) {
      res.status(500).json({ message: "Failed to update audit" });
    }
  });

  app.post("/api/playbooks/generate", isAuthenticated, async (req: any, res) => {
    try {
      const { title, description, context, category, role, mode } = req.body;
      if (!title || typeof title !== "string") {
        return res.status(400).json({ message: "title is required" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const modeInstructions: Record<string, string> = {
        checklist: "Generate a clear, actionable checklist with bullet points. Each item should be a single, concrete task that can be checked off. Use '- [ ]' prefix for each item. Keep items concise but specific enough to execute without guessing.",
        step_by_step: "Generate numbered steps with brief explanatory details under each. Format as '1. Step Title' followed by a short paragraph explaining how to execute it. Include timing estimates where relevant.",
        deep_procedure: "Generate a comprehensive narrative procedure document with section headers (using ##), detailed instructions, context for why each section matters, and notes for common pitfalls. Write it like a training manual section.",
      };

      const prompt = `You are a restaurant operations expert with 20+ years building systems for independent restaurants. Generate a professional operational playbook.

PLAYBOOK TITLE: ${title}
${description ? `DESCRIPTION: ${description}` : ""}
CATEGORY: ${category || "general"}
ASSIGNED ROLE: ${role || "all team members"}
${context ? `RESTAURANT CONTEXT: ${context}` : ""}

FORMAT INSTRUCTIONS:
${modeInstructions[mode] || modeInstructions.checklist}

Write for restaurant operators — practical, specific, and immediately usable. Reference industry standards where relevant. Do not use generic corporate language.`;

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        stream: true,
        max_tokens: 3000,
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
      console.error("Playbook generation error:", err);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate playbook content" });
      } else {
        res.end();
      }
    }
  });

  app.post("/api/playbooks/improve", isAuthenticated, async (req: any, res) => {
    try {
      const { title, currentContent, improvement, mode } = req.body;
      if (!currentContent || !improvement) {
        return res.status(400).json({ message: "currentContent and improvement are required" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const formatNote = mode === "checklist" ? "Keep the checklist format with '- [ ]' prefixed items." :
        mode === "step_by_step" ? "Keep the numbered step format with explanatory details." :
        "Keep the comprehensive narrative format with section headers.";

      const prompt = `You are a restaurant operations expert. The operator wants to improve the following playbook for their restaurant. Rewrite it incorporating their requested changes, keeping the same format.

PLAYBOOK TITLE: ${title}
CURRENT CONTENT:
${currentContent}

REQUESTED IMPROVEMENT: ${improvement}

${formatNote}

Rewrite the entire playbook with the improvements applied. Be specific and practical.`;

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        stream: true,
        max_tokens: 3000,
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
      console.error("Playbook improvement error:", err);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to improve playbook" });
      } else {
        res.end();
      }
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

  // Initiate checkout session for adding new employee ($5 fee)
  app.post("/api/scheduling/staff/checkout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName, email, phone, positionId, hourlyRate } = req.body;
      
      if (!firstName || !lastName) {
        return res.status(400).json({ message: "First name and last name are required" });
      }

      // Get the user's Stripe customer ID if they have one
      const user = await storage.getUserById(userId);
      const customerId = user?.stripeCustomerId || null;

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const successUrl = `${baseUrl}/scheduling?tab=staff&payment=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/scheduling?tab=staff&payment=cancelled`;

      const session = await stripeService.createEmployeeAddCheckout(
        customerId,
        successUrl,
        cancelUrl,
        { firstName, lastName, email, phone, positionId, hourlyRate, ownerId: userId }
      );

      res.json({ url: session.url, sessionId: session.id });
    } catch (err: any) {
      console.error("Failed to create checkout session:", err);
      res.status(500).json({ message: err.message || "Failed to create checkout session" });
    }
  });

  // Complete employee creation after successful payment
  app.post("/api/scheduling/staff/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      // Retrieve the checkout session to verify payment and get employee data
      const session = await stripeService.getCheckoutSession(sessionId);
      
      if (session.payment_status !== 'paid') {
        return res.status(400).json({ message: "Payment not completed" });
      }

      // Verify ownership
      if (session.metadata?.ownerId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Create the employee from session metadata
      const member = await storage.createStaffMember({
        firstName: session.metadata?.firstName || '',
        lastName: session.metadata?.lastName || '',
        email: session.metadata?.email || null,
        phone: session.metadata?.phone || null,
        positionId: session.metadata?.positionId ? parseInt(session.metadata.positionId) : null,
        hourlyRate: session.metadata?.hourlyRate || null,
        ownerId: userId,
      });

      res.status(201).json(member);
    } catch (err: any) {
      console.error("Failed to complete employee creation:", err);
      res.status(500).json({ message: err.message || "Failed to create staff member" });
    }
  });

  // Keep the original endpoint for backwards compatibility (admin bypass)
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

  app.post("/api/scheduling/labor-analysis", isAuthenticated, async (req: any, res) => {
    try {
      const { weeklyRevenue, idealLaborPercent, shifts: shiftData, staff: staffData } = req.body;
      if (!weeklyRevenue || !idealLaborPercent || !shiftData) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const prompt = `Analyze this restaurant's weekly schedule:

Weekly Revenue Target: $${weeklyRevenue}
Ideal Labor %: ${idealLaborPercent}%

Scheduled Shifts:
${JSON.stringify(shiftData, null, 2)}

Staff Members:
${JSON.stringify(staffData, null, 2)}

Return a JSON object with these exact fields:
- laborCostTotal (number): total estimated labor cost for the week
- laborPercentProjected (number): projected labor % based on revenue target
- overUnderTarget (string): e.g. "+2.3% over target" or "-1.5% under target"
- topRiskDay (string): e.g. "Saturday — 6 shifts, $420 est. cost"
- coverageGaps (array of strings): any days or positions with coverage issues
- recommendations (array of strings, max 3): prioritized actionable recommendations`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a restaurant labor cost advisor. Given a week's schedule data and targets, provide a structured labor analysis. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 800,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("No content generated");
      const analysis = JSON.parse(content);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing labor:", error);
      res.status(500).json({ message: "Failed to analyze labor impact" });
    }
  });

  app.post("/api/scheduling/build-schedule", isAuthenticated, async (req: any, res) => {
    try {
      const { prompt: userPrompt, staff: staffData, positions: positionData } = req.body;
      if (!userPrompt) {
        return res.status(400).json({ message: "Please describe your scheduling needs" });
      }

      const prompt = `The operator wants to build a schedule: "${userPrompt}"

Available Staff:
${JSON.stringify(staffData || [], null, 2)}

Available Positions:
${JSON.stringify(positionData || [], null, 2)}

Generate a structured weekly schedule based on their request. Match staff to positions where possible. If no staff are available, use placeholder names.

Return a JSON object with:
- shifts (array of objects): each with { day: string (e.g. "Monday"), staffName: string, position: string, startTime: string (HH:MM 24hr), endTime: string (HH:MM 24hr), estimatedHours: number }
- totalEstimatedHours (number)
- notes (string): brief explanation of the schedule logic`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a restaurant scheduling assistant. Generate practical, cost-effective schedules based on the operator's request and available staff. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("No content generated");
      const schedule = JSON.parse(content);
      res.json(schedule);
    } catch (error) {
      console.error("Error building schedule:", error);
      res.status(500).json({ message: "Failed to build schedule" });
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
    promotionDiscount: z.string().optional(),
    callToAction: z.string().optional(),
  });

  app.post("/api/social-media/generate-post", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = generatePostSchema.parse(req.body);
      const { postType, platforms, outputStyle, eventName, eventDate, startTime, endTime, 
              promotionDetails, targetAudience, tone, cta, selectedHoliday, promotionDiscount, callToAction } = validatedData;
      
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
${promotionDetails ? `ADDITIONAL DETAILS: ${promotionDetails}` : ""}
${promotionDiscount ? `PROMOTION / DISCOUNT: ${promotionDiscount}` : ""}
${targetAudience ? `TARGET AUDIENCE: ${targetAudience}` : ""}
TONE: ${tone || "classy"}
${callToAction ? `PREFERRED CTA: ${callToAction}` : `CALL TO ACTION: ${cta || "reserve"}`}
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

  app.post("/api/social-media/voice-preview", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { description } = req.body;
      if (!description || typeof description !== 'string') {
        return res.status(400).json({ message: "Please provide a description" });
      }
      const brandSettings = await storage.getBrandVoiceSettings(userId);
      const voiceAdj = brandSettings?.voiceAdjectives?.join(", ") || "warm, welcoming";
      const neverSay = brandSettings?.neverSayList?.length ? `Never use these words: ${brandSettings.neverSayList.join(", ")}` : "";
      const emojiGuidance = brandSettings?.emojiLevel === "none" 
        ? "Do not use any emojis." 
        : brandSettings?.emojiLevel === "light" 
          ? "Use emojis sparingly, 1-2 max."
          : "Use emojis naturally.";
      const restaurantName = brandSettings?.restaurantName || "the restaurant";

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a social media copywriter for ${restaurantName}. Write in a ${voiceAdj} voice. ${neverSay} ${emojiGuidance} Keep it to 2-3 sentences suitable for a social media post. Do not include hashtags.` },
          { role: "user", content: `Write a social media post about: ${description}` }
        ],
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("No content generated");
      res.json({ preview: content });
    } catch (error) {
      console.error("Error generating voice preview:", error);
      res.status(500).json({ message: "Failed to generate preview" });
    }
  });

  // Social Media OAuth Routes
  const { socialMediaService } = await import('./socialMediaService');

  // Get connected accounts
  app.get("/api/social-media/accounts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accounts = await storage.getConnectedAccounts(userId);
      const safeAccounts = await Promise.all(accounts.map(async (a) => {
        let profilePictureUrl = a.profilePictureUrl;

        if (!profilePictureUrl && a.status === 'active') {
          try {
            const token = socialMediaService.getDecryptedToken(a);
            if (a.provider === 'facebook') {
              const meta = a.meta as any;
              const pageId = meta?.pageId || a.providerAccountId;
              const picRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}?fields=picture.type(small)&access_token=${token}`);
              if (picRes.ok) {
                const picData = await picRes.json();
                profilePictureUrl = picData?.picture?.data?.url || null;
                console.log(`[BACKFILL] Facebook ${pageId} picture:`, profilePictureUrl ? 'found' : 'not found');
              } else {
                console.log(`[BACKFILL] Facebook picture fetch failed: ${picRes.status}`);
              }
            } else if (a.provider === 'instagram') {
              const meta = a.meta as any;
              const igId = meta?.igUserId || a.providerAccountId;
              const picRes = await fetch(`https://graph.facebook.com/v21.0/${igId}?fields=profile_picture_url&access_token=${token}`);
              if (picRes.ok) {
                const picData = await picRes.json();
                profilePictureUrl = picData?.profile_picture_url || null;
                console.log(`[BACKFILL] Instagram ${igId} picture:`, profilePictureUrl ? 'found' : 'not found');
              } else {
                console.log(`[BACKFILL] Instagram picture fetch failed: ${picRes.status}`);
              }
            } else if (a.provider === 'google_business') {
              profilePictureUrl = null;
            }
            if (profilePictureUrl) {
              await storage.updateConnectedAccount(a.id, { profilePictureUrl });
            }
          } catch (e: any) {
            console.log(`[BACKFILL] ${a.provider} picture backfill error:`, e?.message);
          }
        }

        return {
          id: a.id,
          provider: a.provider,
          displayName: a.displayName,
          profilePictureUrl,
          status: a.status,
          createdAt: a.createdAt,
        };
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
      const { authUrl } = await socialMediaService.startMetaOAuth(userId);
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
      console.log("Meta OAuth callback received, code present:", !!code, "state present:", !!state);
      if (!code || !state) {
        console.error("Meta OAuth callback missing params");
        res.redirect("/domain/social-media?error=missing_params");
        return;
      }

      const stateData = await socialMediaService.validateAndConsumeState(state as string);
      if (!stateData || stateData.provider !== 'meta') {
        console.error("Meta OAuth invalid state - state not found in database");
        res.redirect("/domain/social-media?error=invalid_state");
        return;
      }
      const userId = stateData.userId;
      console.log("Meta OAuth state valid for user:", userId);

      // Step 1: Exchange code for short-lived token
      let shortToken;
      try {
        shortToken = await socialMediaService.exchangeMetaCode(code as string);
        console.log("[META_CB] Step 1 OK: short token obtained");
      } catch (e: any) {
        console.error("[META_CB] Step 1 FAIL: token exchange:", e?.message);
        const msg = encodeURIComponent(`Token exchange failed: ${e?.message || "unknown"}`);
        res.redirect(`/domain/social-media?error=oauth_failed&msg=${msg}`);
        return;
      }

      // Step 2: Exchange to long-lived token (only attempt once)
      let longLivedAccessToken = shortToken.accessToken;
      try {
        const longToken = await socialMediaService.getMetaLongLivedToken(shortToken.accessToken);
        longLivedAccessToken = longToken.accessToken;
        console.log("[META_CB] Step 2 OK: long-lived token obtained");
      } catch (e: any) {
        console.warn("[META_CB] Step 2 WARN: long-lived exchange failed, using short token:", e?.message);
      }

      // Step 3: Fetch pages
      let pages: any[];
      let diagnostics: any;
      try {
        const result = await socialMediaService.getFacebookPages(longLivedAccessToken);
        pages = result.pages;
        diagnostics = result.diagnostics;
        console.log("[META_CB] Step 3 OK: pages found:", pages.length, pages.map((p: any) => p.name));
      } catch (e: any) {
        console.error("[META_CB] Step 3 FAIL: page fetch:", e?.message);
        const msg = encodeURIComponent(`Page fetch failed: ${e?.message || "unknown"}`);
        res.redirect(`/domain/social-media?error=oauth_failed&msg=${msg}`);
        return;
      }

      if (pages.length === 0) {
        console.warn("[META_CB] No pages returned. Diagnostics:", JSON.stringify(diagnostics));
        const diagParam = encodeURIComponent(JSON.stringify({
          scopes: diagnostics.scopes,
          type: diagnostics.type,
          is_valid: diagnostics.is_valid,
          accounts_status: diagnostics.accounts_status,
          accounts_count: diagnostics.accounts_count,
          accounts_error: diagnostics.accounts_error,
          businesses_count: diagnostics.businesses_count,
          businesses_status: diagnostics.businesses_status,
          business_error: diagnostics.business_error,
        }));
        res.redirect(`/domain/social-media?error=no_pages&diag=${diagParam}`);
        return;
      }

      // Step 4: Save accounts
      try {
        for (const page of pages) {
          console.log("[META_CB] Step 4: Saving page:", page.name, page.id);
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
          console.log("[META_CB] Instagram accounts for", page.name, ":", igAccounts.length);
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
        console.log("[META_CB] Step 4 OK: All accounts saved");
      } catch (e: any) {
        console.error("[META_CB] Step 4 FAIL: save error:", e?.message);
        const msg = encodeURIComponent(`Save failed: ${e?.message || "unknown"}`);
        res.redirect(`/domain/social-media?error=oauth_failed&msg=${msg}`);
        return;
      }

      console.log("[META_CB] SUCCESS - redirecting");
      res.redirect("/domain/social-media?connected=meta");
    } catch (error: any) {
      console.error("[META_CB] UNEXPECTED ERROR:", error?.message, error?.stack);
      const msg = encodeURIComponent(error?.message || "unknown error");
      res.redirect(`/domain/social-media?error=oauth_failed&msg=${msg}`);
    }
  });

  // Start Google OAuth
  app.get("/api/oauth/google/start", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { authUrl } = await socialMediaService.startGoogleOAuth(userId);
      res.json({ authUrl });
    } catch (error) {
      console.error("Error starting Google OAuth:", error);
      res.status(500).json({ message: "Failed to start Google OAuth" });
    }
  });

  // Google OAuth callback
  app.get("/api/oauth/google/callback", async (req: any, res) => {
    try {
      const { code, state, error: oauthError } = req.query;
      
      if (oauthError) {
        console.error("[GOOGLE_OAUTH] User denied or error from Google:", oauthError);
        res.redirect(`/domain/social-media?error=google_denied&detail=${encodeURIComponent(String(oauthError))}`);
        return;
      }
      
      if (!code || !state) {
        console.error("[GOOGLE_OAUTH] Missing code or state params");
        res.redirect("/domain/social-media?error=missing_params");
        return;
      }

      const stateData = await socialMediaService.validateAndConsumeState(state as string);
      if (!stateData || stateData.provider !== 'google') {
        console.error("[GOOGLE_OAUTH] Invalid or expired state");
        res.redirect("/domain/social-media?error=invalid_state");
        return;
      }
      const userId = stateData.userId;

      console.log("[GOOGLE_OAUTH] Exchanging code for tokens...");
      const tokens = await socialMediaService.exchangeGoogleCode(code as string);
      console.log("[GOOGLE_OAUTH] Token exchange successful, fetching locations...");
      
      let locations: any[] = [];
      try {
        locations = await socialMediaService.getGoogleBusinessLocations(tokens.accessToken);
        console.log(`[GOOGLE_OAUTH] Found ${locations.length} locations`);
      } catch (locError: any) {
        console.error("[GOOGLE_OAUTH] Failed to fetch locations:", locError.message);
        const errorMsg = locError.message || '';
        if (errorMsg.includes('RATE_LIMITED') || errorMsg.includes('429')) {
          res.redirect("/domain/social-media?error=google_rate_limited");
        } else if (errorMsg.includes('403') || errorMsg.includes('forbidden') || errorMsg.includes('disabled')) {
          res.redirect("/domain/social-media?error=google_api_not_enabled");
        } else {
          res.redirect(`/domain/social-media?error=google_locations_failed&detail=${encodeURIComponent(errorMsg.slice(0, 200))}`);
        }
        return;
      }

      if (locations.length === 0) {
        console.warn("[GOOGLE_OAUTH] No Business Profile locations found for this Google account");
        res.redirect("/domain/social-media?error=no_google_locations");
        return;
      }

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
    } catch (error: any) {
      console.error("Google OAuth callback error:", error.message || error);
      res.redirect(`/domain/social-media?error=oauth_failed&detail=${encodeURIComponent((error.message || '').slice(0, 200))}`);
    }
  });

  // LinkedIn OAuth start
  app.get("/api/oauth/linkedin/start", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { authUrl } = await socialMediaService.startLinkedInOAuth(userId);
      res.json({ authUrl });
    } catch (error) {
      console.error("Error starting LinkedIn OAuth:", error);
      res.status(500).json({ message: "Failed to start LinkedIn OAuth" });
    }
  });

  // LinkedIn OAuth callback
  app.get("/api/oauth/linkedin/callback", async (req: any, res) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) {
        res.redirect("/domain/social-media?error=missing_params");
        return;
      }

      const stateData = await socialMediaService.validateAndConsumeState(state as string);
      if (!stateData || stateData.provider !== 'linkedin') {
        res.redirect("/domain/social-media?error=invalid_state");
        return;
      }
      const userId = stateData.userId;

      const tokens = await socialMediaService.exchangeLinkedInCode(code as string);
      const profile = await socialMediaService.getLinkedInProfile(tokens.accessToken);

      await socialMediaService.saveConnectedAccount(
        userId,
        'linkedin',
        profile.sub,
        profile.name || 'LinkedIn Profile',
        tokens.accessToken,
        tokens.refreshToken,
        tokens.expiresIn,
        { personUrn: profile.sub },
        profile.picture
      );

      res.redirect("/domain/social-media?connected=linkedin");
    } catch (error) {
      console.error("LinkedIn OAuth callback error:", error);
      res.redirect("/domain/social-media?error=oauth_failed");
    }
  });

  // X (Twitter) OAuth start
  app.get("/api/oauth/x/start", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { authUrl } = await socialMediaService.startXOAuth(userId);
      res.json({ authUrl });
    } catch (error) {
      console.error("Error starting X OAuth:", error);
      res.status(500).json({ message: "Failed to start X OAuth" });
    }
  });

  // X (Twitter) OAuth callback
  app.get("/api/oauth/x/callback", async (req: any, res) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) {
        res.redirect("/domain/social-media?error=missing_params");
        return;
      }

      const stateData = await socialMediaService.validateAndConsumeState(state as string);
      if (!stateData || stateData.provider !== 'x') {
        res.redirect("/domain/social-media?error=invalid_state");
        return;
      }
      const userId = stateData.userId;
      const codeVerifier = stateData.codeVerifier;

      if (!codeVerifier) {
        res.redirect("/domain/social-media?error=missing_pkce");
        return;
      }

      const tokens = await socialMediaService.exchangeXCode(code as string, codeVerifier);
      const profile = await socialMediaService.getXProfile(tokens.accessToken);

      await socialMediaService.saveConnectedAccount(
        userId,
        'x',
        profile.id,
        `@${profile.username}`,
        tokens.accessToken,
        tokens.refreshToken,
        tokens.expiresIn,
        { xUserId: profile.id, username: profile.username },
        profile.profileImageUrl
      );

      res.redirect("/domain/social-media?connected=x");
    } catch (error) {
      console.error("X OAuth callback error:", error);
      res.redirect("/domain/social-media?error=oauth_failed");
    }
  });

  // Nextdoor OAuth start
  app.get("/api/oauth/nextdoor/start", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { authUrl } = await socialMediaService.startNextdoorOAuth(userId);
      res.json({ authUrl });
    } catch (error) {
      console.error("Error starting Nextdoor OAuth:", error);
      res.status(500).json({ message: "Failed to start Nextdoor OAuth" });
    }
  });

  // Nextdoor OAuth callback
  app.get("/api/oauth/nextdoor/callback", async (req: any, res) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) {
        res.redirect("/domain/social-media?error=missing_params");
        return;
      }

      const stateData = await socialMediaService.validateAndConsumeState(state as string);
      if (!stateData || stateData.provider !== 'nextdoor') {
        res.redirect("/domain/social-media?error=invalid_state");
        return;
      }
      const userId = stateData.userId;

      const tokens = await socialMediaService.exchangeNextdoorCode(code as string);
      const profile = await socialMediaService.getNextdoorProfile(tokens.accessToken);

      await socialMediaService.saveConnectedAccount(
        userId,
        'nextdoor',
        profile.id,
        profile.name,
        tokens.accessToken,
        tokens.refreshToken,
        tokens.expiresIn,
        { nextdoorProfileId: profile.id }
      );

      res.redirect("/domain/social-media?connected=nextdoor");
    } catch (error) {
      console.error("Nextdoor OAuth callback error:", error);
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
        postTypeData: req.body.postTypeData,
        generatedContent,
      });

      if (postNow) {
        await executePost(post.id);
        const updatedPost = await storage.getScheduledPostById(post.id);
        const results = await storage.getPostResults(post.id);
        res.json({ ...updatedPost, results });
        return;
      }

      res.json(post);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  // Social media image upload
  const socialUploadsDir = path.join(process.cwd(), "uploads", "social-media");
  if (!fs.existsSync(socialUploadsDir)) {
    fs.mkdirSync(socialUploadsDir, { recursive: true });
  }
  const socialImageUpload = multer({
    storage: multer.diskStorage({
      destination: socialUploadsDir,
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only JPEG, PNG, GIF, and WebP images are allowed"));
      }
    },
  });

  app.use("/uploads/social-media", express.static(socialUploadsDir));

  app.post("/api/social-media/upload-image", isAuthenticated, socialImageUpload.single("image"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
      }
      const imageUrl = `/uploads/social-media/${req.file.filename}`;
      res.json({ url: imageUrl });
    } catch (error) {
      console.error("Error uploading social media image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  app.post("/api/social-media/holiday/generate", isAuthenticated, async (req: any, res) => {
    try {
      const { holidayName, holidayDescription, holidayTags, category } = req.body ?? {};
      if (!holidayName) return res.status(400).json({ message: "holidayName is required" });

      const imageId = crypto.randomUUID();
      const tags = (holidayTags ?? []).slice(0, 6).join(", ");
      const imagePrompt = [
        `Create a photorealistic, appetizing restaurant marketing image for: ${holidayName}.`,
        holidayDescription ? `Theme: ${holidayDescription}.` : "",
        tags ? `Keywords: ${tags}.` : "",
        `Style: professional food photography, warm lighting, shallow depth of field, high detail.`,
        `Do NOT include text, logos, watermarks, or words in the image.`,
        `The subject must clearly match the holiday theme.`,
      ].filter(Boolean).join(" ");

      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024",
      });

      const imageData = response.data[0];
      const b64 = (imageData as any)?.b64_json;
      const remoteUrl = (imageData as any)?.url;

      let imageUrl = "";

      if (b64) {
        const buf = Buffer.from(b64, "base64");
        const outDir = path.join(process.cwd(), "uploads", "social-media");
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        const fileName = `holiday-${imageId}.png`;
        fs.writeFileSync(path.join(outDir, fileName), buf);
        imageUrl = `/uploads/social-media/${fileName}?v=${Date.now()}`;
      } else if (remoteUrl) {
        imageUrl = `${remoteUrl}${remoteUrl.includes("?") ? "&" : "?"}v=${Date.now()}`;
      } else {
        return res.status(500).json({ message: "Image generation returned no image." });
      }

      res.json({ imageUrl, imageId });
    } catch (error: any) {
      console.error("Error generating holiday image:", error);
      res.status(500).json({ message: error?.message ?? "Failed to generate holiday image" });
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
    if (!post || !post.platformTargets) {
      console.error(`[EXEC_POST] Post ${postId} not found or has no targets`);
      return;
    }

    console.log(`[EXEC_POST] Starting post ${postId} to ${post.platformTargets.length} targets:`, post.platformTargets);
    await storage.updateScheduledPost(postId, { status: 'posting' });

    let allSuccess = true;
    let anySuccess = false;
    const errors: string[] = [];

    for (const accountId of post.platformTargets) {
      const account = await storage.getConnectedAccountById(accountId);
      if (!account) {
        console.error(`[EXEC_POST] Account ${accountId} not found, skipping`);
        errors.push(`Account ${accountId} not found`);
        allSuccess = false;
        continue;
      }

      console.log(`[EXEC_POST] Posting to ${account.provider} account: ${account.displayName} (${accountId})`);

      try {
        const token = socialMediaService.getDecryptedToken(account);
        let result: any;

        if (account.provider === 'facebook') {
          const meta = account.meta as any;
          if (!meta?.pageId) throw new Error('Facebook account missing pageId in metadata');
          result = await socialMediaService.postToFacebook(
            meta.pageId,
            token,
            post.caption,
            post.mediaUrls?.[0]
          );
        } else if (account.provider === 'instagram') {
          if (!post.mediaUrls?.[0]) {
            throw new Error('Instagram requires an image URL. Please include an image.');
          }
          const meta = account.meta as any;
          if (!meta?.igUserId) throw new Error('Instagram account missing igUserId in metadata');
          result = await socialMediaService.postToInstagram(
            meta.igUserId,
            token,
            post.caption,
            post.mediaUrls[0]
          );
        } else if (account.provider === 'google_business') {
          const meta = account.meta as any;
          if (!meta?.locationName) throw new Error('Google Business account missing locationName in metadata');
          let currentToken = token;
          if (account.tokenExpiresAt && new Date(account.tokenExpiresAt) < new Date()) {
            const refreshToken = socialMediaService.getDecryptedRefreshToken(account);
            if (refreshToken) {
              try {
                const refreshed = await socialMediaService.refreshGoogleToken(refreshToken);
                currentToken = refreshed.accessToken;
                await storage.updateConnectedAccount(account.id, {
                  accessTokenEncrypted: encrypt(refreshed.accessToken),
                  tokenExpiresAt: refreshed.expiresIn ? new Date(Date.now() + refreshed.expiresIn * 1000) : account.tokenExpiresAt,
                });
                console.log(`[EXEC_POST] Refreshed Google token for account ${accountId}`);
              } catch (refreshErr: any) {
                console.error(`[EXEC_POST] Google token refresh failed:`, refreshErr.message);
              }
            }
          }
          result = await socialMediaService.postToGoogleBusiness(
            meta.locationName,
            currentToken,
            post.caption
          );
        } else if (account.provider === 'linkedin') {
          const meta = account.meta as any;
          if (!meta?.personUrn) throw new Error('LinkedIn account missing personUrn in metadata');
          result = await socialMediaService.postToLinkedIn(
            meta.personUrn,
            token,
            post.caption,
            post.mediaUrls?.[0]
          );
        } else if (account.provider === 'x') {
          let currentToken = token;
          if (account.tokenExpiresAt && new Date(account.tokenExpiresAt) < new Date()) {
            const refreshToken = socialMediaService.getDecryptedRefreshToken(account);
            if (refreshToken) {
              try {
                const refreshed = await socialMediaService.refreshXToken(refreshToken);
                currentToken = refreshed.accessToken;
                await storage.updateConnectedAccount(account.id, {
                  accessTokenEncrypted: encrypt(refreshed.accessToken),
                  refreshTokenEncrypted: refreshed.refreshToken ? encrypt(refreshed.refreshToken) : account.refreshTokenEncrypted,
                  tokenExpiresAt: refreshed.expiresIn ? new Date(Date.now() + refreshed.expiresIn * 1000) : account.tokenExpiresAt,
                });
              } catch (refreshErr: any) {
                console.error(`[EXEC_POST] X token refresh failed:`, refreshErr.message);
                throw new Error('X token expired and refresh failed. Please reconnect your X account.');
              }
            }
          }
          result = await socialMediaService.postToX(currentToken, post.caption);
        } else if (account.provider === 'nextdoor') {
          let currentToken = token;
          if (account.tokenExpiresAt && new Date(account.tokenExpiresAt) < new Date()) {
            const refreshToken = socialMediaService.getDecryptedRefreshToken(account);
            if (refreshToken) {
              try {
                const refreshed = await socialMediaService.refreshNextdoorToken(refreshToken);
                currentToken = refreshed.accessToken;
                await storage.updateConnectedAccount(account.id, {
                  accessTokenEncrypted: encrypt(refreshed.accessToken),
                  refreshTokenEncrypted: refreshed.refreshToken ? encrypt(refreshed.refreshToken) : account.refreshTokenEncrypted,
                  tokenExpiresAt: refreshed.expiresIn ? new Date(Date.now() + refreshed.expiresIn * 1000) : account.tokenExpiresAt,
                });
              } catch (refreshErr: any) {
                console.error(`[EXEC_POST] Nextdoor token refresh failed:`, refreshErr.message);
                throw new Error('Nextdoor token expired and refresh failed. Please reconnect your Nextdoor account.');
              }
            }
          }
          result = await socialMediaService.postToNextdoor(currentToken, post.caption, post.mediaUrls || undefined);
        }

        console.log(`[EXEC_POST] SUCCESS for ${account.provider}:`, JSON.stringify(result));
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
        console.error(`[EXEC_POST] FAILED for ${account.provider} (${account.displayName}):`, error.message);
        allSuccess = false;
        errors.push(`${account.provider}: ${error.message}`);
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
    console.log(`[EXEC_POST] Post ${postId} final status: ${finalStatus}`, errors.length ? `Errors: ${errors.join('; ')}` : '');
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

  // Training Assignment Routes
  app.get("/api/training-assignments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assignments = await storage.getTrainingAssignments(userId);
      const assignmentsWithCompletions = await Promise.all(
        assignments.map(async (a) => {
          const completions = await storage.getTrainingDayCompletions(a.id);
          return { ...a, completions };
        })
      );
      res.json(assignmentsWithCompletions);
    } catch (error) {
      console.error('Error fetching training assignments:', error);
      res.status(500).json({ message: "Failed to fetch training assignments" });
    }
  });

  app.post("/api/training-assignments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { employeeName, templateCategory, totalDays, startDate } = req.body;
      const assignment = await storage.createTrainingAssignment({
        userId,
        employeeName,
        templateCategory,
        totalDays: totalDays || 7,
        status: "in_progress",
        startDate: startDate || new Date().toISOString().split('T')[0],
      });
      res.status(201).json({ ...assignment, completions: [] });
    } catch (error) {
      console.error('Error creating training assignment:', error);
      res.status(500).json({ message: "Failed to create training assignment" });
    }
  });

  app.patch("/api/training-assignments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const updated = await storage.updateTrainingAssignment(id, userId, req.body);
      if (!updated) return res.status(404).json({ message: "Assignment not found" });
      const completions = await storage.getTrainingDayCompletions(id);
      res.json({ ...updated, completions });
    } catch (error) {
      console.error('Error updating training assignment:', error);
      res.status(500).json({ message: "Failed to update training assignment" });
    }
  });

  app.delete("/api/training-assignments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      await storage.deleteTrainingAssignment(id, userId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting training assignment:', error);
      res.status(500).json({ message: "Failed to delete training assignment" });
    }
  });

  app.post("/api/training-assignments/:id/days", isAuthenticated, async (req: any, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const { dayNumber, signedOffBy, notes } = req.body;
      const completion = await storage.createTrainingDayCompletion({
        assignmentId,
        dayNumber,
        completedAt: new Date().toISOString().split('T')[0],
        signedOffBy,
        notes: notes || null,
      });
      const allCompletions = await storage.getTrainingDayCompletions(assignmentId);
      res.status(201).json({ completion, allCompletions });
    } catch (error) {
      console.error('Error creating day completion:', error);
      res.status(500).json({ message: "Failed to mark day complete" });
    }
  });

  app.delete("/api/training-day-completions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTrainingDayCompletion(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting day completion:', error);
      res.status(500).json({ message: "Failed to remove day completion" });
    }
  });

  app.post("/api/training/generate", isAuthenticated, async (req: any, res) => {
    try {
      const { role, responsibilities, duration } = req.body;
      if (!role || typeof role !== "string") {
        return res.status(400).json({ message: "role is required" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const prompt = `You are a restaurant training program designer with 20+ years of experience building onboarding systems for independent restaurants.

Generate a structured training outline for the "${role}" position.

${responsibilities ? `KEY RESPONSIBILITIES:\n${responsibilities}\n` : ""}
${duration ? `TRAINING DURATION: ${duration}` : "TRAINING DURATION: 5 days"}

Create a day-by-day training program with:
1. Each day's focus area and learning objectives
2. Specific tasks and activities for each day
3. Key skills to demonstrate
4. Sign-off criteria for each day
5. A final evaluation checklist

Use restaurant-specific language. Be practical and actionable — not theoretical. Format with clear headers, numbered lists, and bullet points.`;

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        stream: true,
        max_tokens: 3000,
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
      console.error("Training generation error:", err);
      res.status(500).json({ message: "Failed to generate training content" });
    }
  });

  // ===== TRAINING LOG & CERTIFICATION TRACKER ROUTES =====

  app.get("/api/training/staff", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const allStaff = await storage.getStaffMembers();
      const myStaff = allStaff.filter(s => s.ownerId === userId);
      res.json(myStaff);
    } catch (err) {
      console.error("Error fetching training staff:", err);
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  app.post("/api/training/staff", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName, positionId, hireDate, status, notes, email, phone, hourlyRate } = req.body;
      if (!firstName || !lastName) {
        return res.status(400).json({ message: "First and last name are required" });
      }
      const member = await storage.createStaffMember({
        ownerId: userId,
        firstName,
        lastName,
        positionId: positionId || null,
        hireDate: hireDate || new Date().toISOString().split("T")[0],
        status: status || "active",
        email: email || null,
        phone: phone || null,
        hourlyRate: hourlyRate || null,
      });
      res.status(201).json(member);
    } catch (err) {
      console.error("Error creating training staff:", err);
      res.status(500).json({ message: "Failed to create staff member" });
    }
  });

  app.put("/api/training/staff/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const existing = await storage.getStaffMember(id);
      if (!existing || existing.ownerId !== userId) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      const updated = await storage.updateStaffMember(id, req.body);
      res.json(updated);
    } catch (err) {
      console.error("Error updating training staff:", err);
      res.status(500).json({ message: "Failed to update staff member" });
    }
  });

  app.delete("/api/training/staff/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const existing = await storage.getStaffMember(id);
      if (!existing || existing.ownerId !== userId) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      await storage.updateStaffMember(id, { status: "inactive" });
      res.json({ success: true });
    } catch (err) {
      console.error("Error deactivating staff:", err);
      res.status(500).json({ message: "Failed to deactivate staff member" });
    }
  });

  app.get("/api/training/records", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const records = await storage.getTrainingRecords(userId);
      res.json(records);
    } catch (err) {
      console.error("Error fetching training records:", err);
      res.status(500).json({ message: "Failed to fetch records" });
    }
  });

  app.get("/api/training/records/by-staff/:staffId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const staffId = parseInt(req.params.staffId);
      const existing = await storage.getStaffMember(staffId);
      if (!existing || existing.ownerId !== userId) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      const records = await storage.getTrainingRecordsByStaff(userId, staffId);
      res.json(records);
    } catch (err) {
      console.error("Error fetching staff training records:", err);
      res.status(500).json({ message: "Failed to fetch records" });
    }
  });

  app.post("/api/training/records", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { staffMemberId, manualType, trainingStartDate, certificationDate, assessmentScore, assessmentPassed, certifiedBy, additionalTrainingDays, notes } = req.body;

      if (!staffMemberId || !manualType || !trainingStartDate) {
        return res.status(400).json({ message: "Staff member, manual type, and start date are required" });
      }

      const existing = await storage.getStaffMember(staffMemberId);
      if (!existing || existing.ownerId !== userId) {
        return res.status(404).json({ message: "Staff member not found" });
      }

      const validManuals = ["server", "kitchen", "bartender", "host", "busser", "manager"];
      if (!validManuals.includes(manualType)) {
        return res.status(400).json({ message: "Invalid manual type" });
      }

      let passed = assessmentPassed;
      if (assessmentScore !== null && assessmentScore !== undefined) {
        passed = assessmentScore >= 90;
      }

      const certified = !!(certificationDate && certifiedBy && passed);

      const record = await storage.createTrainingRecord({
        userId,
        staffMemberId,
        manualType,
        trainingStartDate,
        certificationDate: certificationDate || null,
        assessmentScore: assessmentScore ?? null,
        assessmentPassed: passed ?? null,
        certified,
        certifiedBy: certifiedBy || null,
        additionalTrainingDays: additionalTrainingDays || 0,
        notes: notes || null,
      });
      res.status(201).json(record);
    } catch (err: any) {
      if (err.code === "23505") {
        return res.status(409).json({ message: "A training record already exists for this employee and manual type" });
      }
      console.error("Error creating training record:", err);
      res.status(500).json({ message: "Failed to create training record" });
    }
  });

  app.put("/api/training/records/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const { certificationDate, assessmentScore, assessmentPassed, certifiedBy, additionalTrainingDays, notes } = req.body;

      let passed = assessmentPassed;
      if (assessmentScore !== null && assessmentScore !== undefined) {
        passed = assessmentScore >= 90;
      }

      const certified = !!(certificationDate && certifiedBy && passed);

      const updated = await storage.updateTrainingRecord(id, userId, {
        certificationDate: certificationDate || null,
        assessmentScore: assessmentScore ?? null,
        assessmentPassed: passed ?? null,
        certified,
        certifiedBy: certifiedBy || null,
        additionalTrainingDays: additionalTrainingDays || 0,
        notes: notes || null,
      });

      if (!updated) {
        return res.status(404).json({ message: "Training record not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error updating training record:", err);
      res.status(500).json({ message: "Failed to update training record" });
    }
  });

  app.delete("/api/training/records/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTrainingRecord(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Training record not found" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting training record:", err);
      res.status(500).json({ message: "Failed to delete training record" });
    }
  });

  app.get("/api/training/summary", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const allStaff = await storage.getStaffMembers();
      const myStaff = allStaff.filter(s => s.ownerId === userId && s.status === "active");
      const records = await storage.getTrainingRecords(userId);

      const totalStaff = myStaff.length;
      const staffWithCerts = new Set(records.filter(r => r.certified).map(r => r.staffMemberId));
      const fullyCertified = staffWithCerts.size;
      const inTraining = new Set(records.filter(r => !r.certified).map(r => r.staffMemberId)).size;

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const certsThisMonth = records.filter(r => r.certified && r.certificationDate && r.certificationDate >= monthStart).length;

      res.json({ totalStaff, fullyCertified, inTraining, certsThisMonth });
    } catch (err) {
      console.error("Error fetching training summary:", err);
      res.status(500).json({ message: "Failed to fetch summary" });
    }
  });

  app.get("/api/training/export/all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const allStaff = await storage.getStaffMembers();
      const myStaff = allStaff.filter(s => s.ownerId === userId);
      const records = await storage.getTrainingRecords(userId);
      const settings = await storage.getHandbookSettings(userId);

      const exportData = myStaff.map(staff => ({
        ...staff,
        records: records.filter(r => r.staffMemberId === staff.id),
      }));

      res.json({
        restaurantName: settings?.restaurantName || "Restaurant",
        exportDate: new Date().toISOString().split("T")[0],
        staff: exportData,
      });
    } catch (err) {
      console.error("Error exporting all training records:", err);
      res.status(500).json({ message: "Failed to export records" });
    }
  });

  app.get("/api/training/export/:staffId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const staffId = parseInt(req.params.staffId);
      const existing = await storage.getStaffMember(staffId);
      if (!existing || existing.ownerId !== userId) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      const records = await storage.getTrainingRecordsByStaff(userId, staffId);
      const settings = await storage.getHandbookSettings(userId);

      res.json({
        restaurantName: settings?.restaurantName || "Restaurant",
        exportDate: new Date().toISOString().split("T")[0],
        staff: { ...existing, records },
      });
    } catch (err) {
      console.error("Error exporting staff training record:", err);
      res.status(500).json({ message: "Failed to export record" });
    }
  });

  // ===== SOP GENERATOR ROUTES =====

  app.get("/api/sops", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sops = await storage.getGeneratedSops(userId);
      res.json(sops);
    } catch (err) {
      console.error("Error fetching SOPs:", err);
      res.status(500).json({ message: "Failed to fetch SOPs" });
    }
  });

  app.post("/api/sops/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sopKey } = req.body;
      if (!sopKey) {
        return res.status(400).json({ message: "SOP key is required" });
      }

      const { SOP_TEMPLATES, renderSop } = await import("./sopTemplates");
      const meta = SOP_TEMPLATES.find(t => t.key === sopKey);
      if (!meta) {
        return res.status(400).json({ message: "Invalid SOP key" });
      }

      const settings = await storage.getHandbookSettings(userId);
      const user = await storage.getUser(userId);
      const existing = await storage.getGeneratedSopByKey(userId, sopKey);
      const version = existing ? (existing.version || 1) + 1 : 1;

      const rendered = renderSop(sopKey, settings, user, version);
      if (!rendered) {
        return res.status(500).json({ message: "Failed to render SOP" });
      }

      const sop = await storage.createOrUpdateSop(userId, {
        userId,
        sopKey,
        sopTitle: rendered.title,
        sopCategory: rendered.category,
        content: rendered.content,
        version,
      });

      res.status(201).json(sop);
    } catch (err) {
      console.error("Error generating SOP:", err);
      res.status(500).json({ message: "Failed to generate SOP" });
    }
  });

  app.delete("/api/sops/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSop(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "SOP not found" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting SOP:", err);
      res.status(500).json({ message: "Failed to delete SOP" });
    }
  });

  app.get("/api/sops/export/all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sops = await storage.getGeneratedSops(userId);
      const settings = await storage.getHandbookSettings(userId);
      res.json({
        restaurantName: settings?.restaurantName || "Restaurant",
        sops,
        exportDate: new Date().toISOString().split("T")[0],
      });
    } catch (err) {
      console.error("Error exporting all SOPs:", err);
      res.status(500).json({ message: "Failed to export SOPs" });
    }
  });

  app.get("/api/sops/export/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const sops = await storage.getGeneratedSops(userId);
      const sop = sops.find(s => s.id === id);
      if (!sop) {
        return res.status(404).json({ message: "SOP not found" });
      }
      const settings = await storage.getHandbookSettings(userId);
      res.json({
        restaurantName: settings?.restaurantName || "Restaurant",
        sop,
      });
    } catch (err) {
      console.error("Error exporting SOP:", err);
      res.status(500).json({ message: "Failed to export SOP" });
    }
  });

  app.get("/api/sops/variables", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getHandbookSettings(userId);
      const user = await storage.getUser(userId);
      const { SOP_TEMPLATES, checkVariableStatus } = await import("./sopTemplates");
      const result: Record<string, { set: string[]; missing: string[] }> = {};
      for (const t of SOP_TEMPLATES) {
        result[t.key] = checkVariableStatus(t.requiredVariables, settings, user);
      }
      res.json(result);
    } catch (err) {
      console.error("Error checking SOP variables:", err);
      res.status(500).json({ message: "Failed to check variables" });
    }
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

  app.post("/api/financial/extract-text", isAuthenticated, upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const filePath = req.file.path;
      const mimeType = req.file.mimetype;
      let extractedText = "";

      if (mimeType === "application/pdf") {
        const pdfParse = (await import("pdf-parse")).default;
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        extractedText = pdfData.text || "";

        if (!extractedText.trim()) {
          const imageBase64 = dataBuffer.toString("base64");
          const visionResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{
              role: "user",
              content: [
                { type: "text", text: "Extract all text from this financial document. Return only the raw extracted text, preserving numbers, column headers, and line items exactly as they appear." },
                { type: "image_url", image_url: { url: `data:application/pdf;base64,${imageBase64}` } }
              ]
            }],
            max_tokens: 4000,
          });
          extractedText = visionResponse.choices[0]?.message?.content || "";
        }
      } else if (mimeType.startsWith("image/")) {
        const imageBuffer = fs.readFileSync(filePath);
        const imageBase64 = imageBuffer.toString("base64");
        const ext = mimeType.split("/")[1] || "png";
        const visionResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: "Extract all text from this financial document. Return only the raw extracted text, preserving numbers, column headers, and line items exactly as they appear." },
              { type: "image_url", image_url: { url: `data:image/${ext};base64,${imageBase64}` } }
            ]
          }],
          max_tokens: 4000,
        });
        extractedText = visionResponse.choices[0]?.message?.content || "";
      } else if (mimeType === "text/csv" || req.file.originalname.endsWith(".csv")) {
        extractedText = fs.readFileSync(filePath, "utf-8");
      } else {
        extractedText = fs.readFileSync(filePath, "utf-8");
      }

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.json({ text: extractedText });
    } catch (err) {
      console.error("Financial text extraction error:", err);
      res.status(500).json({ message: "Failed to extract text" });
    }
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
        firstName: user?.firstName || null,
        lastName: user?.lastName || null,
        email: user?.email || "",
        profileImageUrl: user?.profileImageUrl || null,
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
      console.log("[Invite] Received invite request");
      const userId = req.user.claims.sub;
      const { email, recipientName, relationship, personalMessage, subjectLine, reminderEnabled } = req.body;
      console.log(`[Invite] User ${userId} inviting ${email}`);

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const org = await storage.getOrganizationByOwner(userId);
      if (!org) {
        console.log("[Invite] User is not an organization owner");
        return res.status(403).json({ message: "Only organization owners can send invites" });
      }
      console.log(`[Invite] Found organization: ${org.name} (id: ${org.id})`);

      const user = await storage.getUserById(userId);
      const inviterName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : "A team member";
      const inviterEmail = user?.email || undefined;

      const existingInvites = await storage.getOrganizationInvites(org.id);
      const pendingForEmail = existingInvites.filter(i => i.email === email && i.status === "pending");
      if (pendingForEmail.length > 0) {
        console.log(`[Invite] Found ${pendingForEmail.length} existing pending invite(s) for ${email}, cancelling them`);
        for (const oldInvite of pendingForEmail) {
          await storage.deleteInvite(oldInvite.id);
        }
      }

      const inviteToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      console.log(`[Invite] Creating invite in database...`);
      const invite = await storage.createOrganizationInvite({
        organizationId: org.id,
        email,
        inviteToken,
        invitedBy: userId,
        status: "pending",
        expiresAt,
        recipientName: recipientName || null,
        relationship: relationship || null,
        personalMessage: personalMessage || null,
        subjectLine: subjectLine || null,
        reminderEnabled: reminderEnabled !== false,
      });
      console.log(`[Invite] Invite created with id: ${invite.id}`);

      const productionDomain = process.env.REPLIT_DOMAINS?.split(",")[0];
      const baseUrl = productionDomain 
        ? `https://${productionDomain}`
        : process.env.REPLIT_DEV_DOMAIN
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : "http://localhost:5000";
      const inviteLink = `${baseUrl}/accept-invite/${inviteToken}`;

      console.log(`[Invite] Sending email to ${email}...`);
      const emailSent = await sendOrganizationInviteEmail({
        toEmail: email,
        recipientName: recipientName || undefined,
        inviterName,
        inviterEmail,
        organizationName: org.name,
        inviteLink,
        personalMessage: personalMessage || undefined,
        subjectLine: subjectLine || undefined,
        relationship: relationship || undefined,
      });
      
      if (!emailSent) {
        console.warn("[Invite] Failed to send invite email, but invite was created");
      } else {
        console.log("[Invite] Email sent successfully");
      }

      res.status(201).json(invite);
    } catch (err) {
      console.error("[Invite] Send invite error:", err);
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
    const inviter = await storage.getUserById(invite.invitedBy);
    const inviterName = inviter?.firstName ? `${inviter.firstName} ${inviter.lastName || ''}`.trim() : "A team member";
    res.json({ 
      organizationName: org?.name, 
      email: invite.email,
      recipientName: invite.recipientName,
      personalMessage: invite.personalMessage,
      inviterName,
      relationship: invite.relationship,
    });
  });

  // Cancel/delete pending invite (owners only)
  app.delete("/api/organization/invites/:inviteId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const inviteId = parseInt(req.params.inviteId);

      const org = await storage.getOrganizationByOwner(userId);
      if (!org) {
        return res.status(403).json({ message: "Only organization owners can cancel invites" });
      }

      const invite = await storage.getInviteById(inviteId);
      if (!invite || invite.organizationId !== org.id) {
        return res.status(404).json({ message: "Invite not found" });
      }

      await storage.deleteInvite(inviteId);
      res.json({ success: true });
    } catch (err) {
      console.error("Cancel invite error:", err);
      res.status(500).json({ message: "Failed to cancel invite" });
    }
  });

  // Update organization member role (owners only)
  app.patch("/api/organization/members/:userId/role", isAuthenticated, async (req: any, res) => {
    try {
      const ownerId = req.user.claims.sub;
      const memberUserId = req.params.userId;
      const { role } = req.body;

      const validRoles = ["owner", "manager", "shift_lead", "viewer"];
      if (!role || !validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const org = await storage.getOrganizationByOwner(ownerId);
      if (!org) {
        return res.status(403).json({ message: "Only organization owners can update roles" });
      }

      if (memberUserId === ownerId) {
        return res.status(400).json({ message: "Cannot change your own role" });
      }

      await storage.updateOrganizationMemberRole(org.id, memberUserId, role);
      res.json({ success: true });
    } catch (err) {
      console.error("Update member role error:", err);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  // Resend expired invite (owners only)
  app.post("/api/organization/invites/:inviteId/resend", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const inviteId = parseInt(req.params.inviteId);

      const org = await storage.getOrganizationByOwner(userId);
      if (!org) {
        return res.status(403).json({ message: "Only organization owners can resend invites" });
      }

      const invite = await storage.getInviteById(inviteId);
      if (!invite || invite.organizationId !== org.id) {
        return res.status(404).json({ message: "Invite not found" });
      }

      await storage.deleteInvite(inviteId);

      const user = await storage.getUserById(userId);
      const inviterName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : "A team member";
      const inviterEmail = user?.email || undefined;

      const inviteToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const newInvite = await storage.createOrganizationInvite({
        organizationId: org.id,
        email: invite.email,
        inviteToken,
        invitedBy: userId,
        status: "pending",
        expiresAt,
        recipientName: invite.recipientName,
        relationship: invite.relationship,
        personalMessage: invite.personalMessage,
        subjectLine: invite.subjectLine,
        reminderEnabled: invite.reminderEnabled,
      });

      const productionDomain = process.env.REPLIT_DOMAINS?.split(",")[0];
      const baseUrl = productionDomain 
        ? `https://${productionDomain}`
        : process.env.REPLIT_DEV_DOMAIN
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : "http://localhost:5000";
      const inviteLink = `${baseUrl}/accept-invite/${inviteToken}`;

      await sendOrganizationInviteEmail({
        toEmail: invite.email,
        recipientName: invite.recipientName || undefined,
        inviterName,
        inviterEmail,
        organizationName: org.name,
        inviteLink,
        personalMessage: invite.personalMessage || undefined,
        subjectLine: invite.subjectLine || undefined,
        relationship: invite.relationship || undefined,
      });

      res.status(201).json(newInvite);
    } catch (err) {
      console.error("Resend invite error:", err);
      res.status(500).json({ message: "Failed to resend invite" });
    }
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

  // ===== RESTAURANT STANDARDS (CERTIFICATION) ROUTES =====

  app.get("/api/standards", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const standards = await storage.getRestaurantStandards(userId);
      res.json(standards);
    } catch (error: any) {
      console.error('Error fetching standards:', error);
      res.status(500).json({ message: "Failed to fetch standards" });
    }
  });

  app.get("/api/standards/active", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const standards = await storage.getActiveStandards(userId);
      res.json(standards || null);
    } catch (error: any) {
      console.error('Error fetching active standards:', error);
      res.status(500).json({ message: "Failed to fetch active standards" });
    }
  });

  app.post("/api/standards", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertRestaurantStandardsSchema.parse({ ...req.body, userId });
      const standards = await storage.createRestaurantStandards(data);
      res.status(201).json(standards);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      console.error('Error creating standards:', err);
      res.status(500).json({ message: "Failed to create standards" });
    }
  });

  app.put("/api/standards/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = Number(req.params.id);
      const updated = await storage.updateRestaurantStandards(id, userId, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Standards not found" });
      }
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating standards:', error);
      res.status(500).json({ message: "Failed to update standards" });
    }
  });

  app.delete("/api/standards/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = Number(req.params.id);
      await storage.deleteRestaurantStandards(id, userId);
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting standards:', error);
      res.status(500).json({ message: "Failed to delete standards" });
    }
  });

  // ===== CERTIFICATION ROUTES =====

  app.post("/api/certification/generate-scenario", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { standardsId, role, phase } = req.body;

      if (!standardsId || !role || !phase) {
        return res.status(400).json({ message: "standardsId, role, and phase are required" });
      }

      const standards = await storage.getRestaurantStandardsById(standardsId);
      if (!standards) {
        return res.status(404).json({ message: "Standards not found" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const difficultyMap: Record<string, string> = {
        Shadow: "EASY - Simple, single-table scenario with straightforward guests. Minimal complications. Trainee is observing and learning basics.",
        Perform: "MEDIUM - Multi-table scenario with moderate complexity. Some timing pressure, a minor complaint or special request. Trainee handles tasks with oversight.",
        Certify: "HARD - High-pressure, multi-table scenario with overlapping demands. Includes at least one critical challenge (complaint, allergy, intoxicated guest, kitchen issue). Trainee must handle independently at certification level."
      };

      const prompt = `You are a restaurant training scenario generator. Generate a realistic, detailed certification scenario for a ${role} at the "${standards.name}" restaurant.

RESTAURANT STANDARDS:
- Service Philosophy: ${standards.servicePhilosophy || "Not specified"}
- Steps of Service: ${JSON.stringify(standards.stepsOfService || {})}
- Speed Targets: ${JSON.stringify(standards.speedTargets || {})}
- Recovery Framework: ${JSON.stringify(standards.recoveryFramework || {})}
- Alcohol Policy: ${JSON.stringify(standards.alcoholPolicy || {})}
- Safety Rules: ${JSON.stringify(standards.safetyRules || {})}
- Critical Errors (auto-fail): ${JSON.stringify(standards.criticalErrors || [])}
- Pass Threshold: ${standards.passThreshold}%

ROLE: ${role}
PHASE: ${phase}
DIFFICULTY: ${difficultyMap[phase] || difficultyMap["Perform"]}

Generate a scenario in this format:

SCENARIO CONTEXT:
- Shift type (lunch/dinner/brunch), day of week, expected volume
- Current staffing situation
- Any relevant kitchen/bar status

CURRENT TABLE STATES:
(List 2-5 tables depending on difficulty, each with):
- Table number, party size, course stage
- Any special notes (allergies, celebrations, VIPs, mood)

EVENTS / CHALLENGES:
(List 2-4 events that will occur during this scenario):
- What happens, when it happens, what the trainee needs to handle

REQUIRED COMPETENCIES BEING TESTED:
- List the specific skills from the standards this scenario evaluates

QUESTIONS FOR THE TRAINEE:
1. Walk me through your first 5 minutes - what do you DO? (List your physical actions step by step)
2. Write the exact SCRIPTS you would say to each table/guest interaction
3. How do you handle [specific challenge from the events]?
4. What is your priority order and why?

Make the scenario feel real - use specific details, realistic guest behavior, and situations that actually happen in restaurants.`;

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        stream: true,
        max_tokens: 3000,
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
      console.error("Scenario generation error:", err);
      res.status(500).json({ message: "Failed to generate scenario" });
    }
  });

  app.post("/api/certification/evaluate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { standardsId, scenarioText, traineeDo, traineeSay, role, phase } = req.body;

      if (!standardsId || !scenarioText || !traineeDo || !traineeSay) {
        return res.status(400).json({ message: "standardsId, scenarioText, traineeDo, and traineeSay are required" });
      }

      const standards = await storage.getRestaurantStandardsById(standardsId);
      if (!standards) {
        return res.status(404).json({ message: "Standards not found" });
      }

      const rubricWeights = (standards.rubricWeights as Record<string, number>) || {
        Prioritization: 25,
        "Guest Communication": 25,
        Recovery: 20,
        "Policy Compliance": 20,
        Professionalism: 10,
      };

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const prompt = `You are a senior restaurant trainer evaluating a ${role}'s certification attempt (${phase} phase) against the restaurant's standards.

RESTAURANT STANDARDS:
- Name: ${standards.name}
- Service Philosophy: ${standards.servicePhilosophy || "Not specified"}
- Steps of Service: ${JSON.stringify(standards.stepsOfService || {})}
- Speed Targets: ${JSON.stringify(standards.speedTargets || {})}
- Recovery Framework: ${JSON.stringify(standards.recoveryFramework || {})}
- Alcohol Policy: ${JSON.stringify(standards.alcoholPolicy || {})}
- Safety Rules: ${JSON.stringify(standards.safetyRules || {})}
- Critical Errors (auto-fail conditions): ${JSON.stringify(standards.criticalErrors || [])}
- Pass Threshold: ${standards.passThreshold}%

RUBRIC WEIGHTS (total = 100):
${Object.entries(rubricWeights).map(([k, v]) => `- ${k}: ${v} points`).join("\n")}

THE SCENARIO:
${scenarioText}

TRAINEE'S DO STEPS (physical actions):
${traineeDo}

TRAINEE'S SAY SCRIPTS (verbal responses):
${traineeSay}

EVALUATE THE TRAINEE'S RESPONSE. Provide your evaluation in these clear sections:

=== SCORES BY CATEGORY ===
For each rubric category, give a score out of the max points and a brief justification:
${Object.entries(rubricWeights).map(([k, v]) => `- ${k} (out of ${v}):`).join("\n")}

=== TOTAL SCORE ===
Total: X / 100
Result: PASS or FAIL (threshold: ${standards.passThreshold}%)

=== CRITICAL ERRORS ===
List any critical errors committed (from the standards list above). If none, state "No critical errors detected."
If a critical error is present, the result is AUTO-FAIL regardless of score.

=== WHAT WENT WELL ===
Specific things the trainee did correctly, referencing the standards.

=== WHAT WAS MISSED ===
Specific things the trainee missed or got wrong, referencing the standards.

=== BETTER SCRIPTS ===
For any guest interaction that could be improved, provide the exact script the trainee should have used.

=== REMEDIATION DRILLS ===
If the trainee failed or had weak areas, list specific practice exercises they should complete before retesting.

Be fair but rigorous. A real restaurant's reputation depends on this evaluation being honest.`;

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        stream: true,
        max_tokens: 3000,
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
      console.error("Evaluation error:", err);
      res.status(500).json({ message: "Failed to evaluate response" });
    }
  });

  app.get("/api/certification/attempts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const traineeName = req.query.traineeName as string | undefined;
      if (traineeName) {
        const attempts = await storage.getCertificationAttemptsByTrainee(userId, traineeName);
        return res.json(attempts);
      }
      const attempts = await storage.getCertificationAttempts(userId);
      res.json(attempts);
    } catch (error: any) {
      console.error('Error fetching certification attempts:', error);
      res.status(500).json({ message: "Failed to fetch attempts" });
    }
  });

  app.get("/api/certification/attempts/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getCertificationStats(userId);
      res.json(stats);
    } catch (error: any) {
      console.error('Error fetching certification stats:', error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.post("/api/certification/attempts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertCertificationAttemptSchema.parse({ ...req.body, userId });
      const attempt = await storage.createCertificationAttempt(data);
      res.status(201).json(attempt);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      console.error('Error creating certification attempt:', err);
      res.status(500).json({ message: "Failed to save attempt" });
    }
  });

  app.get("/mycookbook/privacy", (req, res) => {
    res.redirect(302, "https://my-cookbook.replit.app/privacy");
  });
  app.get("/mycookbook/terms", (req, res) => {
    res.redirect(302, "https://my-cookbook.replit.app/terms");
  });

  // Seed Data (non-blocking — runs in background after server starts)
  Promise.resolve().then(async () => {
    try {
      await seedDatabase();
      await seedTrainingTemplates();
      await seedRestaurantHolidays();
    } catch (err) {
      console.error("Seeding error:", err);
    }
  });

  // Auto-reminder: check every hour for invites that need 3-day reminders
  setInterval(async () => {
    try {
      await processInviteReminders();
    } catch (err) {
      console.error("[Reminders] Error processing invite reminders:", err);
    }
  }, 60 * 60 * 1000); // every hour

  return httpServer;
}

async function processInviteReminders() {
  const dueInvites = await storage.getInvitesDueForReminder();
  if (dueInvites.length === 0) return;

  console.log(`[Reminders] Found ${dueInvites.length} invites due for reminder`);

  for (const invite of dueInvites) {
    try {
      const inviter = await storage.getUserById(invite.invitedBy);
      if (!inviter) {
        console.warn(`[Reminders] Skipping invite ${invite.id}: inviter not found`);
        continue;
      }

      const daysRemaining = Math.max(1, Math.ceil(
        (new Date(invite.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      ));

      const inviterName = [inviter.firstName, inviter.lastName].filter(Boolean).join(' ') || 'Your colleague';
      const protocol = process.env.REPL_SLUG ? 'https' : 'http';
      const host = process.env.REPL_SLUG 
        ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
        : 'localhost:5000';
      const inviteLink = `${protocol}://${host}/accept-invite/${invite.inviteToken}`;

      const sent = await sendInviteReminderEmail({
        toEmail: invite.email,
        recipientName: invite.recipientName || undefined,
        inviterName,
        inviterEmail: inviter.email || undefined,
        inviteLink,
        daysRemaining,
      });

      if (sent) {
        await storage.markInviteReminderSent(invite.id);
        console.log(`[Reminders] Reminder sent for invite ${invite.id} to ${invite.email}`);
      }
    } catch (err) {
      console.error(`[Reminders] Failed to process invite ${invite.id}:`, err);
    }
  }
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
  const existingKitchen = existingTemplates.filter(t => t.category === "kitchen");
  const kitchenNeedsUpdate = existingKitchen.length > 0 && existingKitchen.some(t => (t.content?.length || 0) < 1000);
  if (kitchenNeedsUpdate) {
    await storage.deleteTemplatesByCategory("kitchen");
  }
  const hasServer = existingTemplates.some(t => t.category === "server");
  const hasKitchen = !kitchenNeedsUpdate && existingKitchen.length > 0;
  const hasBartender = existingTemplates.some(t => t.category === "bartender");
  const hasManager = existingTemplates.some(t => t.category === "manager");
  if (hasServer && hasKitchen && hasBartender && hasManager) return;

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
      content: "Welcome to the kitchen team at {{restaurantName}}, where culinary tradition meets excellence. As a key contributor, you ensure every dish embodies our commitment to quality and consistency. This manual outlines policies, procedures, and a comprehensive training program to prepare you for success.\n\n═══════════════════════════════════════\nHOW THIS TRAINING WORKS\n═══════════════════════════════════════\n\nYour training follows a structured 7-day program built on a proven three-phase model:\n\n  SHADOW → PERFORM → CERTIFY\n\nPhase 1 — Shadow (Days 1–2)\nWatch, listen, and learn. You will observe experienced team members at every station, take notes, and ask questions. No independent cooking yet.\n\nPhase 2 — Perform (Days 3–6)\nHands-on execution under direct supervision. You will prep, cook, plate, and close stations with a trainer beside you at all times.\n\nPhase 3 — Certify (Day 7)\nDemonstrate that you can run your assigned station independently. You must pass both a written assessment (90% minimum) and a practical evaluation before working unsupervised.\n\n═══════════════════════════════════════\nBEFORE YOUR FIRST DAY\n═══════════════════════════════════════\n\n□ Non-slip, closed-toe shoes (required — no exceptions)\n□ Black pants, clean and pressed\n□ Restaurant-issued chef coat or kitchen shirt\n□ Hair fully restrained (hat, hairnet, or tied back)\n□ No jewelry below the elbow (watches, bracelets, rings)\n□ Nails trimmed short, no nail polish or acrylics\n□ Personal knife kit (if applicable — confirm with {{kitchenManager}})\n□ Food Handler's Permit (must be obtained within 30 days of hire)\n□ Direct deposit form submitted to {{hrContactEmail}}",
      keyPoints: ["Shadow → Perform → Certify model", "7-day training program", "90% written test required", "Food Handler's Permit within 30 days", "Uniform requirements"],
      sequenceOrder: 1,
    },
    {
      title: "Kitchen Roles & Hierarchy",
      category: "kitchen",
      section: "Organization",
      contentType: "overview",
      content: "═══════════════════════════════════════\nKITCHEN CHAIN OF COMMAND\n═══════════════════════════════════════\n\n{{executiveChef}} — Executive Chef\n├── Oversees all kitchen operations, recipe development, menu changes, and staff training\n├── Final authority on food quality, plating standards, and new hires\n│\n├── {{kitchenManager}} — Kitchen Manager\n│   ├── Day-to-day operational oversight: scheduling, ordering, inventory\n│   ├── Handles disciplinary issues, shift assignments, and labor targets\n│   └── Your direct report for attendance, call-outs, and shift concerns\n│\n├── Sous Chef / Lead Line Cook\n│   ├── Runs the line during service when Executive Chef is off-site\n│   ├── Manages daily production lists, station assignments, and prep priorities\n│   └── Supervises line cooks, prep cooks, and dishwashers during shift\n│\n├── Line Cooks\n│   ├── Responsible for one primary station per shift (grill, sauté, fry, salad, expo)\n│   └── Expected to cross-train on at least two additional stations\n│\n├── Prep Cooks\n│   ├── Morning mise en place, batch prep, and portioning\n│   └── Restocking stations before dinner service\n│\n└── Dishwashers\n    ├── Dish pit management, pot washing, and floor maintenance\n    └── Assist with breakdown and end-of-night cleaning\n\nStaffing: {{staffPerDinnerShift}} staff members on duty per dinner shift\nStations: {{kitchenStations}}\n\n⚠ IMPORTANT: Always follow the chain of command. Bring concerns to your direct supervisor first. If unresolved, escalate to {{kitchenManager}}, then to {{executiveChef}}. Never skip levels unless the situation involves safety or harassment.",
      keyPoints: ["Clear chain of command", "Cross-training expected", "Direct report to Kitchen Manager", "Never skip chain of command", "Station assignments rotate"],
      sequenceOrder: 2,
    },
    {
      title: "Day 1: Orientation and Safety",
      category: "kitchen",
      section: "Training Schedule",
      contentType: "procedure",
      content: "═══════════════════════════════════════\nDAY 1 — ORIENTATION & SAFETY\nTraining Phase: SHADOW\n═══════════════════════════════════════\n\nObjective: Introduce kitchen layout, safety protocols, temperature standards, and team roles.\n\nDuration: 6–8 Hours\n\n─── MORNING SESSION ───\n\n1. Welcome & Team Introductions\n   • Meet {{executiveChef}}, {{kitchenManager}}, and shift team\n   • Review training schedule and expectations for the week\n   • Tour assigned locker/changing area\n\n2. Full Kitchen Tour\n   • Walk every station: {{kitchenStations}}\n   • Identify walk-in coolers, dry storage, dish pit, expo window\n   • Locate fire extinguishers, first aid kit, emergency exits\n   • Note hand-wash sinks (minimum 20-second wash protocol)\n\n3. Equipment Orientation\n   • Griddles, fryers, convection ovens, salamander\n   • Knives: proper grip, safe carrying (tip down, blade away)\n   • Slicer and mandoline safety demonstration\n   • Burns protocol: cool under running water 10+ minutes, report to manager\n\n─── AFTERNOON SESSION ───\n\n4. Food Safety Foundations\n\n   ┌─────────────────────────────────────────────┐\n   │     TEMPERATURE REFERENCE CARD              │\n   ├──────────────────────┬──────────────────────┤\n   │ Cold holding          │ 41°F or below        │\n   │ Freezer storage       │ 0°F or below         │\n   │ Poultry internal temp │ 165°F                │\n   │ Ground meat           │ 155°F                │\n   │ Whole cuts (steak)    │ 145°F + 3 min rest   │\n   │ Hot holding           │ 135°F or above       │\n   │ Danger zone           │ 41°F – 135°F         │\n   │ Cooling (2-stage)     │ 135→70°F in 2 hrs    │\n   │                       │ 70→41°F in 4 hrs     │\n   └──────────────────────┴──────────────────────┘\n\n   ⚠ If any food item has been in the Danger Zone for more than 4 hours total, it MUST be discarded. No exceptions.\n\n5. Handwashing Protocol\n   • Wet hands → soap → lather 20 seconds → rinse → dry with single-use towel\n   • Required: after touching face/hair, handling raw protein, using restroom, handling trash, sneezing/coughing, switching tasks\n\n6. Closing Expectations Preview\n   • Every team member is responsible for their station at close\n   • No one leaves until the Kitchen Manager completes the walk-through\n   • Sidework expectations will be assigned by Day 3\n\n7. Chain of Communication\n   • During service: communicate through your station's lead or expo\n   • Before/after service: go to {{kitchenManager}} for scheduling, supply needs, or concerns\n   • Emergencies: contact any manager on duty immediately\n\n─── END OF DAY 1 ───\n\nAssessment: Verbal safety quiz — trainee must correctly state cold holding temp, hot holding temp, handwashing duration, and location of fire extinguisher.\n\nTrainer Notes: Mark pass/fail in Daily Sign-Off Sheet.",
      keyPoints: ["Temperature Reference Card", "20-second handwashing", "Equipment safety", "Danger zone awareness", "Emergency protocols", "Chain of communication"],
      sequenceOrder: 3,
    },
    {
      title: "Day 2: Prep and Inventory",
      category: "kitchen",
      section: "Training Schedule",
      contentType: "procedure",
      content: "═══════════════════════════════════════\nDAY 2 — PREP & INVENTORY MANAGEMENT\nTraining Phase: SHADOW\n═══════════════════════════════════════\n\nObjective: Master prep techniques, inventory rotation, safe storage, and cross-contamination prevention.\n\nDuration: 6–8 Hours\n\n─── MORNING SESSION ───\n\n1. Prep Station Setup\n   • Review daily prep list with Sous Chef\n   • Gather tools: cutting board, knife kit, hotel pans, labels, date stickers\n   • Mise en place: small containers for minced garlic, diced onion, sliced peppers\n\n2. Core Prep Skills\n   • Knife cuts: brunoise, julienne, chiffonade, rough chop\n   • Prep signature items: chop trinity (onion, celery, bell pepper)\n   • Portion proteins per recipe spec sheets\n   • Batch sauces: measure, combine, label with date and contents\n\n─── AFTERNOON SESSION ───\n\n3. FIFO — First In, First Out\n\n   ┌─────────────────────────────────────────────┐\n   │          FIFO ROTATION PROTOCOL              │\n   ├─────────────────────────────────────────────┤\n   │                                             │\n   │  Step 1: PULL forward all existing product  │\n   │          to the front of the shelf          │\n   │                                             │\n   │  Step 2: PLACE new deliveries behind        │\n   │          existing product (furthest back)   │\n   │                                             │\n   │  Step 3: CHECK dates — oldest dates must    │\n   │          always be in front, used first     │\n   │                                             │\n   └─────────────────────────────────────────────┘\n\n   ⚠ WARNING: Every item in the walk-in and dry storage MUST have a date label. Undated items will be discarded by the closing manager. No exceptions.\n\n   • All labels must include: item name, prep date, use-by date, and initials\n   • Use-by windows: raw proteins (2 days), cooked proteins (3 days), cut produce (3 days), sauces (5 days)\n\n4. Cross-Contamination Prevention Protocol\n\n   ┌─────────────────────────────────────────────┐\n   │     CUTTING BOARD COLOR SYSTEM               │\n   ├──────────────────────┬──────────────────────┤\n   │ RED board             │ Raw meat (beef, pork) │\n   │ YELLOW board          │ Raw poultry           │\n   │ BLUE board            │ Raw seafood           │\n   │ GREEN board           │ Fruits & vegetables   │\n   │ WHITE board           │ Ready-to-eat / dairy  │\n   │ BROWN board           │ Cooked meats          │\n   └──────────────────────┴──────────────────────┘\n\n   Rules:\n   □ Never use the same board for raw and ready-to-eat items\n   □ Sanitize boards between uses with approved sanitizer solution\n   □ Store raw proteins on lowest shelves in walk-in (below ready-to-eat)\n   □ Shelf order top to bottom: ready-to-eat → produce → cooked meat → raw seafood → raw ground meat → raw poultry (always lowest)\n   □ Change gloves between handling different protein types\n   □ Separate tongs and utensils for raw vs. cooked items\n\n5. Walk-In Cooler Organization\n   • Daily temperature log: record walk-in and freezer temps at open and close\n   • Report any reading above 41°F (cooler) or above 0°F (freezer) to {{kitchenManager}} immediately\n   • Spills cleaned immediately — floor must stay dry for safety\n\n6. Handwashing Triggers (Complete List)\n   □ Before starting work\n   □ After using the restroom\n   □ After touching face, hair, or body\n   □ After handling raw proteins\n   □ After handling trash or cleaning chemicals\n   □ After sneezing, coughing, or blowing nose\n   □ After eating, drinking, or smoking\n   □ After switching between raw and ready-to-eat tasks\n   □ After touching phones or door handles\n\n─── END OF DAY 2 ───\n\nAssessment: Practical prep test — trainee must correctly demonstrate FIFO rotation in walk-in, identify correct cutting board for three protein types, and label two prepped items with all required information.\n\nTrainer Notes: Mark pass/fail in Daily Sign-Off Sheet.",
      keyPoints: ["FIFO rotation protocol", "Color-coded cutting boards", "Cross-contamination prevention", "Date labeling requirements", "Walk-in shelf order", "Handwashing triggers"],
      sequenceOrder: 4,
    },
    {
      title: "Day 3: Cooking Stations",
      category: "kitchen",
      section: "Training Schedule",
      contentType: "procedure",
      content: "═══════════════════════════════════════\nDAY 3 — COOKING STATIONS & MISE EN PLACE\nTraining Phase: PERFORM (supervised)\n═══════════════════════════════════════\n\nObjective: Learn station setup, mise en place discipline, and core cooking techniques at each station.\n\nDuration: 6–8 Hours\n\n─── STATION SETUP CARDS ───\n\nEvery station must be fully set before the first ticket prints. Use these checklists to verify readiness.\n\n┌─────────────────────────────────────────────┐\n│  GRILL STATION SETUP                        │\n├─────────────────────────────────────────────┤\n│ □ Grill heated and scraped clean             │\n│ □ Grill oil and seasoning at station         │\n│ □ Proteins portioned and temped              │\n│ □ Instant-read thermometer calibrated        │\n│ □ Tongs (2 sets: raw and cooked)             │\n│ □ Side towels (minimum 4, dry)               │\n│ □ Sheet tray for resting                     │\n│ □ Sani bucket with fresh solution            │\n│ □ Plate setup area clear                     │\n└─────────────────────────────────────────────┘\n\n┌─────────────────────────────────────────────┐\n│  SAUTÉ STATION SETUP                        │\n├─────────────────────────────────────────────┤\n│ □ Sauté pans (minimum 6) staged and clean    │\n│ □ Oil, butter, and cooking wine within reach  │\n│ □ Garlic (minced), shallots (diced) prepped   │\n│ □ House sauces portioned in bain-marie        │\n│ □ Pasta pre-portioned if applicable           │\n│ □ Finishing herbs (parsley, chives) prepped    │\n│ □ Tasting spoons accessible (use once, discard)│\n│ □ Sani bucket with fresh solution             │\n│ □ Side towels (minimum 4, dry)                │\n└─────────────────────────────────────────────┘\n\n┌─────────────────────────────────────────────┐\n│  FRY STATION SETUP                          │\n├─────────────────────────────────────────────┤\n│ □ Fryer oil level checked, temp set (350°F)  │\n│ □ Breading station: flour → egg wash → coating│\n│ □ Spider/basket and slotted spoon at station  │\n│ □ Draining rack with sheet tray lined         │\n│ □ Backup breading mix prepped                 │\n│ □ Dipping sauces portioned                    │\n│ □ Oil temperature verified with thermometer   │\n│ □ Sani bucket with fresh solution              │\n│ □ Fire extinguisher location confirmed         │\n└─────────────────────────────────────────────┘\n\n─── MORNING SESSION ───\n\n1. Station Walkthroughs\n   • Trainer walks each station with trainee, verifying setup checklist items\n   • Trainee identifies where every item is stored and how to restock mid-service\n\n2. Mise en Place Discipline\n\n   ┌─────────────────────────────────────────────┐\n   │                                             │\n   │  \"Mise en place is not just a French phrase  │\n   │   — it is how professional kitchens operate. │\n   │   Everything in its place, every time.       │\n   │   If your station is not set, you are not    │\n   │   ready. If you are not ready, the whole     │\n   │   line suffers.\"                             │\n   │                                             │\n   │         — Set the standard before service    │\n   │                                             │\n   └─────────────────────────────────────────────┘\n\n─── AFTERNOON SESSION ───\n\n3. Cooking Execution (Supervised)\n   • Grill: Cook proteins to spec using thermometer, practice grill marks and resting\n   • Sauté: Execute pan sauces from start to finish, deglaze technique, timing pasta drops\n   • Fry: Maintain oil temp, proper breading sequence (dry hand / wet hand method), drain timing\n\n4. Plating Standards\n   • Use designated plate for each dish (check spec photo on line)\n   • Protein placement, sauce application, garnish — must match house standard\n   • Wipe plate rims before sending to expo window\n   • Expo has final say on plate quality — do not argue, re-plate if asked\n\n5. Station Rotation Practice\n   • Trainee spends 30 minutes at each station cooking live orders under trainer supervision\n   • Focus: speed will come — accuracy and consistency are the priority today\n\n─── END OF DAY 3 ───\n\nAssessment: Cooking and plating test — trainee must correctly set up one station from memory using the checklist and cook/plate two dishes to house standard.\n\nTrainer Notes: Mark pass/fail in Daily Sign-Off Sheet.",
      keyPoints: ["Station setup checklists", "Mise en place discipline", "Grill/Sauté/Fry procedures", "Plating standards", "Dry hand/wet hand method", "Expo window protocol"],
      sequenceOrder: 5,
    },
    {
      title: "Day 4: Line Execution & Communication",
      category: "kitchen",
      section: "Training Schedule",
      contentType: "procedure",
      content: "═══════════════════════════════════════\nDAY 4 — LINE EXECUTION & COMMUNICATION\nTraining Phase: PERFORM (supervised)\n═══════════════════════════════════════\n\nObjective: Master kitchen communication, ticket reading, modifier handling, and coordinated line execution.\n\nDuration: 6–8 Hours\n\n─── MORNING SESSION ───\n\n1. Kitchen Communication System\n\n   Professional kitchens run on clear, loud verbal communication. Silence causes mistakes. Learn these calls and use them every time.\n\n   ┌──────────────────────┬───────────────────────────────────────────┐\n   │ CALL                 │ MEANING                                   │\n   ├──────────────────────┼───────────────────────────────────────────┤\n   │ \"Order in\"            │ New ticket has been called — acknowledge   │\n   │ \"Heard\" / \"Yes chef\" │ You understood the call — confirm it       │\n   │ \"Fire [item]\"         │ Start cooking this item NOW                │\n   │ \"Working [item]\"      │ Item is actively being cooked              │\n   │ \"Order up\"            │ Dish is plated and in the window           │\n   │ \"Behind\"              │ Someone is passing behind you — don't move │\n   │ \"Hot behind\"          │ Carrying something hot behind you          │\n   │ \"Corner\"              │ Approaching a blind corner — slow down     │\n   │ \"Sharp\"               │ Carrying a knife or sharp object           │\n   │ \"Hands\"               │ Food is ready in the window — need a runner│\n   │ \"86 [item]\"           │ Item is sold out — stop selling            │\n   │ \"All day\"             │ Total count of an item across all tickets  │\n   └──────────────────────┴───────────────────────────────────────────┘\n\n   Rules:\n   • Every call gets a response. If you hear it, say \"Heard.\"\n   • Never whisper. Speak at a volume the entire line can hear.\n   • If you don't understand a call, ask immediately — never guess.\n\n2. Ticket Reading Protocol\n\n   When a ticket prints, follow this exact sequence:\n\n   Step 1: READ the entire ticket before touching any food\n   Step 2: IDENTIFY your station's items and any modifiers (no onion, extra sauce, allergy)\n   Step 3: CALL BACK your items to expo: \"Heard — one steak mid-rare, one chicken no gluten\"\n   Step 4: CHECK fire time — is this a fire-now or a hold ticket?\n   Step 5: EXECUTE in order of longest cook time first\n\n   Modifier Handling:\n   • \"Sub\" = substitute an ingredient (e.g., sub rice for pasta)\n   • \"No\" = remove an ingredient entirely\n   • \"Extra\" = add more of an ingredient\n   • \"On the side\" = serve component in a separate container\n   • \"Allergy\" = treat as a potential safety issue — new gloves, clean pan, separate utensils, alert expo\n\n   ⚠ ALLERGY TICKETS: Any ticket marked with an allergy must be verbally confirmed with expo before plating. Use clean equipment. Cross-contact can cause serious harm.\n\n─── AFTERNOON SESSION ───\n\n3. Multi-Ticket Coordination\n   • Practice reading 3–4 tickets simultaneously\n   • Identify which items fire together (same table) and which are staggered\n   • Communicate timing to neighboring stations: \"I need 3 minutes on the steak — hold the sides\"\n\n4. Rush Simulation\n   • Trainer sends a controlled rush of 8–10 tickets over 20 minutes\n   • Trainee must call back, fire in order, communicate timing, and plate to standard\n   • Debrief: what worked, what broke down, what to improve\n\n5. Dietary Modifications Practice\n   • Gluten-free: identify safe substitutions (e.g., basmati rice for pasta)\n   • Vegetarian/vegan: know which sauces contain dairy or animal stock\n   • Common allergens: shellfish, tree nuts, dairy, gluten, soy, eggs\n   • When in doubt, ask {{executiveChef}} or {{kitchenManager}} — never guess on allergens\n\n─── END OF DAY 4 ───\n\nAssessment: Multitasking evaluation — trainee must correctly read three tickets, call back items, identify one allergy modification, and execute two dishes within target time.\n\nTrainer Notes: Mark pass/fail in Daily Sign-Off Sheet.",
      keyPoints: ["Kitchen calls reference", "Ticket reading protocol", "Allergy safety procedures", "Modifier handling", "Rush simulation", "Multi-ticket coordination"],
      sequenceOrder: 6,
    },
    {
      title: "Day 5: Speed, Quality & Timing",
      category: "kitchen",
      section: "Training Schedule",
      contentType: "procedure",
      content: "═══════════════════════════════════════\nDAY 5 — SPEED, QUALITY & TIMING\nTraining Phase: PERFORM (supervised)\n═══════════════════════════════════════\n\nObjective: Develop speed without sacrificing quality. Learn ticket time standards, quality check protocol, and high-volume execution.\n\nDuration: 6–8 Hours\n\n─── MORNING SESSION ───\n\n1. Ticket Time Standards\n\n   Every table has a time expectation from the moment the ticket prints. These are the targets your kitchen must hit consistently.\n\n   ┌──────────────────────┬──────────────────────────────────────┐\n   │ TICKET TYPE           │ TARGET TIME (ticket to window)       │\n   ├──────────────────────┼──────────────────────────────────────┤\n   │ Appetizers             │ 8–10 minutes                        │\n   │ Entrées (standard)     │ 12–16 minutes                       │\n   │ Entrées (well-done)    │ 18–22 minutes (communicate to expo) │\n   │ Desserts               │ 5–7 minutes                         │\n   │ To-go orders           │ 15–20 minutes                       │\n   │ Happy Hour items       │ 6–8 minutes                         │\n   │ Large party (8+)       │ 20–25 minutes (coordinate all stn)  │\n   └──────────────────────┴──────────────────────────────────────┘\n\n   Rules:\n   • If you are going to miss a target by more than 3 minutes, call it out to expo BEFORE the time passes\n   • Expo will communicate wait time to the server — surprises are unacceptable\n   • Speed comes from preparation, not from rushing. Proper mise en place is the foundation of fast execution\n\n2. Quality Check Protocol\n\n   Before ANY plate goes to the expo window, run through this checklist:\n\n   ┌─────────────────────────────────────────────┐\n   │     5-POINT QUALITY CHECK                    │\n   ├─────────────────────────────────────────────┤\n   │ □ 1. Temperature correct (thermometer check  │\n   │      for proteins — no guessing)             │\n   │ □ 2. Portion size matches spec               │\n   │ □ 3. Plate presentation matches house photo  │\n   │ □ 4. All modifiers honored (check ticket)    │\n   │ □ 5. Plate rim clean (wipe before sending)   │\n   └─────────────────────────────────────────────┘\n\n   ⚠ If a plate fails any point, fix it BEFORE it goes to the window. A plate returned by a guest costs time, food, and trust.\n\n─── AFTERNOON SESSION ───\n\n3. High-Volume Execution\n   • Batch cooking techniques: when to pre-sear proteins, pre-cook pasta, hold sauces\n   • Staggered firing: coordinate with expo to avoid all entrées landing at once\n   • Backup prep: identify items that will run out during a busy shift and prep extra before service\n\n4. Event & Special Prep\n   • Event prep requires advance coordination (pre-order specialty items)\n   • Happy Hour: quick-fire appetizer systems — prep in batches, cook to order\n   • Coordinate timing with front-of-house: food must land when the server is ready to run it\n\n5. Recipe Scaling\n   • Practice doubling and halving core recipes\n   • Identify which ingredients scale linearly (proteins, vegetables) and which don't (spices, acids)\n   • Large-party tickets: assign one cook as lead coordinator, others execute their station items\n\n─── END OF DAY 5 ───\n\nAssessment: Speed and quality test — trainee must execute a 4-ticket sequence within target times while passing the 5-Point Quality Check on every plate.\n\nTrainer Notes: Mark pass/fail in Daily Sign-Off Sheet.",
      keyPoints: ["Ticket time standards", "5-Point Quality Check", "High-volume execution", "Recipe scaling", "Staggered firing", "Event prep coordination"],
      sequenceOrder: 7,
    },
    {
      title: "Day 6: Station Close & Sanitation",
      category: "kitchen",
      section: "Training Schedule",
      contentType: "procedure",
      content: "═══════════════════════════════════════\nDAY 6 — STATION CLOSE & SANITATION\nTraining Phase: PERFORM (supervised)\n═══════════════════════════════════════\n\nObjective: Master station breakdown, closing procedures, deep cleaning standards, and sanitation documentation.\n\nDuration: 6–8 Hours\n\n─── MORNING SESSION: SERVICE SHIFT ───\n\nTrainee works a supervised service shift applying everything learned Days 1–5. Trainer observes but allows trainee to run their station with minimal intervention.\n\n─── AFTERNOON SESSION: CLOSING PROCEDURES ───\n\n1. Station Close-Down Checklists\n\n   ┌─────────────────────────────────────────────┐\n   │  ALL STATIONS — UNIVERSAL CLOSING            │\n   ├─────────────────────────────────────────────┤\n   │ □ All food items wrapped, labeled, and dated  │\n   │ □ Perishables returned to walk-in (FIFO)      │\n   │ □ Station surfaces wiped with sanitizer        │\n   │ □ Cutting boards scrubbed and sanitized        │\n   │ □ Sani bucket dumped and refreshed (or removed)│\n   │ □ Small wares washed and returned to storage   │\n   │ □ Floor swept and mopped in station area       │\n   │ □ Trash removed and new liner placed           │\n   │ □ Side towels collected for laundry            │\n   │ □ Equipment turned off or set to holding temp  │\n   └─────────────────────────────────────────────┘\n\n   ┌─────────────────────────────────────────────┐\n   │  GRILL STATION — ADDITIONAL CLOSING          │\n   ├─────────────────────────────────────────────┤\n   │ □ Grill scraped and brushed while still warm  │\n   │ □ Grill surface oiled lightly for next shift   │\n   │ □ Drip trays emptied and cleaned               │\n   │ □ Hood vents checked for grease buildup        │\n   │ □ Thermometer cleaned and stored                │\n   └─────────────────────────────────────────────┘\n\n   ┌─────────────────────────────────────────────┐\n   │  FRY STATION — ADDITIONAL CLOSING            │\n   ├─────────────────────────────────────────────┤\n   │ □ Fryer turned off and covered when cool       │\n   │ □ Oil level and color checked (filter/replace  │\n   │   if dark or smells off)                       │\n   │ □ Breading station broken down completely      │\n   │ □ Baskets and spiders washed                   │\n   │ □ Splatter guards cleaned                      │\n   └─────────────────────────────────────────────┘\n\n   ┌─────────────────────────────────────────────┐\n   │  SAUTÉ STATION — ADDITIONAL CLOSING          │\n   ├─────────────────────────────────────────────┤\n   │ □ All pans washed and re-stacked               │\n   │ □ Sauce bain-marie emptied and cleaned          │\n   │ □ Burners wiped and checked for debris          │\n   │ □ Oil and butter containers capped and stored   │\n   │ □ Herb mise en place composted or stored         │\n   └─────────────────────────────────────────────┘\n\n2. Cleaning Schedules\n\n   ┌──────────────────────┬──────────────────────────────┐\n   │ FREQUENCY             │ TASK                          │\n   ├──────────────────────┼──────────────────────────────┤\n   │ Daily (AM)            │ Griddle cleaning, prep surfaces│\n   │ Daily (PM)            │ Fryers filtered, floors mopped │\n   │ Weekly (Monday)       │ Walk-in cooler deep clean      │\n   │ Weekly (Friday)       │ Oven interior cleaning         │\n   │ Weekly (Sunday)       │ Hood vent degreasing           │\n   │ Monthly               │ Fryer oil full change          │\n   │ Monthly               │ Freezer defrost and clean      │\n   │ Quarterly             │ Equipment calibration          │\n   └──────────────────────┴──────────────────────────────┘\n\n3. Sanitation Log Reminder\n\n   ┌─────────────────────────────────────────────┐\n   │  SANITATION LOG — COMPLETE DAILY              │\n   ├─────────────────────────────────────────────┤\n   │                                               │\n   │  The Sanitation Log is posted on the wall      │\n   │  next to the walk-in cooler. Every closing     │\n   │  team member must:                             │\n   │                                               │\n   │  1. Record walk-in cooler temperature          │\n   │  2. Record freezer temperature                 │\n   │  3. Confirm station cleaning completed         │\n   │  4. Sign with name and date                    │\n   │                                               │\n   │  ⚠ Missing entries will be flagged during      │\n   │  weekly review by {{kitchenManager}}.          │\n   │                                               │\n   └─────────────────────────────────────────────┘\n\n4. Cross-Station Support\n   • If your station closes early, help the busiest station before clocking out\n   • Dish pit support: assist with pot washing during heavy service\n   • Communicate with team: \"My station is closed — where do you need me?\"\n\n─── END OF DAY 6 ───\n\nAssessment: Closing procedure test — trainee must complete their station close-down checklist in full, demonstrate proper food storage with FIFO, and fill out the Sanitation Log correctly.\n\nTrainer Notes: Mark pass/fail in Daily Sign-Off Sheet.",
      keyPoints: ["Station close-down checklists", "Grill/Fry/Sauté closing details", "Cleaning schedule", "Sanitation Log protocol", "Cross-station support", "FIFO at close"],
      sequenceOrder: 8,
    },
    {
      title: "Day 7: Certification & Standards",
      category: "kitchen",
      section: "Training Schedule",
      contentType: "assessment",
      content: "═══════════════════════════════════════\nDAY 7 — CERTIFICATION & STANDARDS\nTraining Phase: CERTIFY\n═══════════════════════════════════════\n\nObjective: Confirm readiness for independent kitchen work through written assessment, practical evaluation, and formal certification.\n\nDuration: 6–8 Hours\n\n─── MORNING SESSION: FULL SHIFT SIMULATION ───\n\nThe trainee works a complete simulated shift with minimal trainer intervention:\n• Station setup from memory (no checklist reference)\n• Service execution: 10–15 tickets across assigned station\n• Communication: all kitchen calls used correctly\n• Closing: full station breakdown without prompting\n\n─── AFTERNOON SESSION: WRITTEN ASSESSMENT ───\n\n═══════════════════════════════════════\nKITCHEN TRAINING — WRITTEN ASSESSMENT\n═══════════════════════════════════════\nPass Criteria: 9 out of 10 correct (90%)\n\n1. What is the safe cold-holding temperature for perishable food items?\n   _______________________________________________\n\n2. A ticket prints with an allergy note. List the three steps you must take before preparing that dish.\n   _______________________________________________\n\n3. What does FIFO stand for, and why is it important?\n   _______________________________________________\n\n4. Name the correct cutting board color for: (a) raw poultry, (b) vegetables, (c) ready-to-eat items.\n   _______________________________________________\n\n5. A steak is ordered medium-rare. What is the target internal temperature?\n   _______________________________________________\n\n6. You hear \"Fire two chicken, one steak mid\" called by expo. What is your response?\n   _______________________________________________\n\n7. What is the maximum time a food item can remain in the Danger Zone before it must be discarded?\n   _______________________________________________\n\n8. List three items on the 5-Point Quality Check you perform before sending a plate to the window.\n   _______________________________________________\n\n9. What is the proper cooling procedure for hot food going into storage? (Two-stage cooling)\n   _______________________________________________\n\n10. You have a conflict with a coworker during service. What is the correct course of action?\n    _______________________________________________\n\n─── TRAINER DAILY SIGN-OFF SHEET ───\n\nThis sheet must be completed by the trainer at the end of each training day.\n\n┌──────┬──────────────────────┬────────┬────────────────┬────────────┐\n│ Day  │ Topic                │ Status │ Trainer Initials│ Date       │\n├──────┼──────────────────────┼────────┼────────────────┼────────────┤\n│  1   │ Orientation & Safety │ ______ │ __________     │ __________ │\n│  2   │ Prep & Inventory     │ ______ │ __________     │ __________ │\n│  3   │ Cooking Stations     │ ______ │ __________     │ __________ │\n│  4   │ Line Execution       │ ______ │ __________     │ __________ │\n│  5   │ Speed & Quality      │ ______ │ __________     │ __________ │\n│  6   │ Station Close        │ ______ │ __________     │ __________ │\n│  7   │ Certification        │ ______ │ __________     │ __________ │\n└──────┴──────────────────────┴────────┴────────────────┴────────────┘\n\nStatus: P = Pass, F = Fail (requires repeat), N/A = Not applicable\n\n─── 90-DAY PROBATIONARY PERIOD ───\n\n   ┌─────────────────────────────────────────────┐\n   │  ⚠ 90-DAY PROBATION NOTICE                  │\n   ├─────────────────────────────────────────────┤\n   │                                               │\n   │  Upon successful completion of this 7-day     │\n   │  training program, you enter a 90-day         │\n   │  probationary period. During this time:       │\n   │                                               │\n   │  • Performance is reviewed at 30, 60, and     │\n   │    90 days by {{kitchenManager}}              │\n   │  • You may be reassigned stations based on    │\n   │    performance and kitchen needs              │\n   │  • Continued employment is contingent on      │\n   │    meeting quality and speed standards        │\n   │  • A final review at Day 90 determines        │\n   │    full team membership                       │\n   │                                               │\n   │  Reviews will be documented and stored in     │\n   │  your employee file.                          │\n   │                                               │\n   └─────────────────────────────────────────────┘\n\n─── CERTIFICATION CLOSING ───\n\n   ┌─────────────────────────────────────────────┐\n   │                                               │\n   │  \"A kitchen team is only as strong as its     │\n   │   weakest station. You have trained to be     │\n   │   reliable, consistent, and professional.     │\n   │   From this point forward, the line depends   │\n   │   on you. Set up with discipline. Cook with   │\n   │   precision. Close with pride.                │\n   │                                               │\n   │   Welcome to the team.\"                       │\n   │                                               │\n   │         — {{executiveChef}}, Executive Chef   │\n   │           {{restaurantName}}                  │\n   │                                               │\n   └─────────────────────────────────────────────┘\n\n─── END OF TRAINING PROGRAM ───",
      keyPoints: ["Written assessment (90% pass)", "10-question test", "Trainer Sign-Off Sheet", "90-day probation period", "30/60/90 day reviews", "Full shift simulation", "Certification closing"],
      sequenceOrder: 9,
    },
    {
      title: "Kitchen Policies Summary",
      category: "kitchen",
      section: "Policies",
      contentType: "checklist",
      content: "═══════════════════════════════════════\nKITCHEN POLICIES & STANDARDS\n═══════════════════════════════════════\n\nATTENDANCE:\n□ Arrive 15 minutes before your scheduled shift — in uniform, ready to work\n□ Notify {{kitchenManager}} at least 4 hours in advance for any absence\n□ Shift swaps must be approved by {{kitchenManager}} in writing before the swap occurs\n□ Progressive discipline for unexcused absences:\n  1st occurrence → Verbal warning (documented)\n  2nd occurrence → Written warning\n  3rd occurrence → Final warning / suspension\n  4th occurrence → Termination\n\nUNIFORM STANDARDS:\n□ Clean chef coat or restaurant-issued kitchen shirt\n□ Black pants, clean and pressed\n□ Non-slip, closed-toe shoes (required — no exceptions)\n□ Hair fully restrained at all times\n□ No jewelry below the elbow\n□ Apron provided — must be worn during all prep and service\n□ Name tag visible if issued\n\nHEALTH & SAFETY:\n□ Cold holding: 41°F or below\n□ Hot holding: 135°F or above\n□ Poultry internal temp: 165°F\n□ Danger zone: 41°F – 135°F (discard after 4 hours)\n□ Gloves required for all ready-to-eat food handling\n□ Wash hands after handling raw proteins, using restroom, or switching tasks\n□ Separate cutting boards for raw proteins vs. ready-to-eat items\n□ Food Handler's Permit required within 30 days of hire\n□ Sani buckets at every station, refreshed every 2 hours\n□ Report illness (vomiting, diarrhea, jaundice, fever) to {{kitchenManager}} — do not come in\n\nBREAKS:\n□ One 30-minute unpaid break per shift over 6 hours\n□ One free meal per shift (staff menu or approved items)\n□ Eat in designated break area only — never at your station or in prep areas\n□ Smoke breaks: designated area only, wash hands before returning\n\nCELL PHONES:\n□ No personal phones in the kitchen during service\n□ Phones stored in locker or designated area\n□ Use the restaurant phone for emergencies\n□ Music: only if approved by {{kitchenManager}} and at appropriate volume\n\nZERO TOLERANCE:\n□ Harassment or discrimination of any kind\n□ Working under the influence of drugs or alcohol\n□ Theft of food, equipment, or personal property\n□ Falsifying time records\n□ Knowingly serving unsafe food",
      keyPoints: ["15-minute early arrival", "4-hour call-out notice", "Progressive discipline", "Temperature standards", "30-day permit deadline", "Zero tolerance policies"],
      sequenceOrder: 10,
    },
    {
      title: "Station Setup & Closing",
      category: "kitchen",
      section: "Operations",
      contentType: "procedure",
      content: "═══════════════════════════════════════\nDAILY STATION OPERATIONS\n═══════════════════════════════════════\n\nPRE-SERVICE STATION SETUP:\n□ Arrive in full uniform, clock in, check assignment board\n□ Review daily prep list posted by Sous Chef\n□ Pull proteins and prepped items from walk-in (check dates — FIFO)\n□ Set up mise en place per station setup card\n□ Verify all equipment is on, heated, and functioning\n□ Stock backup items within reach (extra pans, utensils, towels)\n□ Check sani bucket — fresh solution, clean towel\n□ Confirm printer/ticket rail is working at your station\n□ Taste and verify sauces, dressings, and soups before service\n□ Report any equipment issues or 86'd items to {{kitchenManager}} immediately\n\nDURING SERVICE:\n□ Maintain station cleanliness — wipe as you go\n□ Communicate all calls loudly and clearly\n□ Monitor protein temps with thermometer — never guess\n□ Restock mid-service before you run out (anticipate needs)\n□ Alert expo of any delays BEFORE the ticket time passes\n□ Never send a plate you wouldn't eat yourself\n\nEND-OF-SHIFT CLOSING:\n□ Complete station-specific close-down checklist\n□ All food items wrapped, labeled (item + date + initials), and stored per FIFO\n□ Station surfaces sanitized with approved solution\n□ Equipment turned off or set to overnight holding\n□ Floor swept and mopped in your area\n□ Trash removed, new liner in place\n□ Side towels and aprons in laundry bin\n□ Complete Sanitation Log entry (walk-in temp, freezer temp, signature)\n□ Check out with {{kitchenManager}} — do not leave until walk-through is complete\n\nCLEANING SCHEDULES:\n┌──────────────────────┬──────────────────────────────┐\n│ Daily (AM)            │ Griddle cleaning, prep area   │\n│ Daily (PM)            │ Fryers filtered, floors mopped│\n│ Weekly (Monday)       │ Walk-in cooler deep clean     │\n│ Weekly (Friday)       │ Oven interior cleaning        │\n│ Weekly (Sunday)       │ Hood vent degreasing          │\n│ Monthly               │ Fryer oil full replacement    │\n│ Monthly               │ Freezer defrost and clean     │\n│ Quarterly             │ Equipment calibration check   │\n└──────────────────────┴──────────────────────────────┘",
      keyPoints: ["Pre-service checklist", "During-service standards", "FIFO at close", "Sanitation Log", "Manager walk-through required", "Cleaning schedule"],
      sequenceOrder: 11,
    },
    {
      title: "Kitchen Assessment Questions",
      category: "kitchen",
      section: "Assessments",
      contentType: "assessment",
      content: "═══════════════════════════════════════\nKITCHEN KNOWLEDGE ASSESSMENT\nReference Study Guide\n═══════════════════════════════════════\n\nThis section provides the complete question bank for kitchen training assessments. Trainers may use these for verbal quizzes during training days or as a study reference for the Day 7 written test.\n\nFOOD SAFETY:\n• What is the safe cold-holding temperature? → 41°F or below\n• What is the safe hot-holding temperature? → 135°F or above\n• What internal temperature must poultry reach? → 165°F\n• What is the Danger Zone temperature range? → 41°F – 135°F\n• How long can food remain in the Danger Zone? → Maximum 4 hours total\n• What are the two stages of proper cooling? → 135→70°F in 2 hours, then 70→41°F in 4 hours\n• When must you wash your hands? → After restroom, handling raw protein, touching face/hair, switching tasks, sneezing, handling trash\n• What does cross-contamination mean and how do you prevent it? → Transfer of harmful bacteria between items; prevent with separate cutting boards, utensils, handwashing, and proper storage order\n\nPREP & INVENTORY:\n• What does FIFO stand for and why is it important? → First In First Out; prevents spoilage and waste\n• What information must appear on every storage label? → Item name, prep date, use-by date, initials\n• What is the correct shelf order in the walk-in (top to bottom)? → Ready-to-eat → produce → cooked meat → raw seafood → raw ground meat → raw poultry\n• What cutting board color is used for raw poultry? → Yellow\n• What cutting board color is used for ready-to-eat items? → White\n\nSTATION OPERATIONS:\n• What is mise en place and why does it matter? → \"Everything in its place\" — ensures speed and consistency during service\n• What temperature should fryer oil be set to? → 350°F\n• Name three items on the 5-Point Quality Check → Temperature correct, portion size matches spec, plate matches house photo, modifiers honored, rim clean\n\nCOMMUNICATION:\n• What does \"86\" mean? → Item is sold out\n• What is the correct response when you hear a call from expo? → \"Heard\" or \"Yes chef\"\n• What do you say when walking behind someone? → \"Behind\"\n• What do you say when carrying a knife? → \"Sharp\"\n• What does \"all day\" mean? → Total count of an item across all active tickets\n\nEMERGENCY PROTOCOLS:\n• What is the first step if you get burned? → Cool under running water for 10+ minutes, then report to manager\n• What do you do if you find a pest? → Report to management immediately, do not handle\n• What is the protocol for a fryer fire? → Turn off fryer, cover with metal lid or use Class K extinguisher — NEVER use water\n• What do you do if a coworker is injured? → Alert manager immediately, do not move injured person unless in danger, call 911 if serious\n\nTEAMWORK & CONDUCT:\n• How do you report a conflict with a coworker? → Report to direct supervisor or {{kitchenManager}}, never during active service\n• What is the chain of command? → Line Cook → Sous Chef → Kitchen Manager → Executive Chef\n• Can you leave before the closing walk-through? → No — {{kitchenManager}} must complete walk-through first",
      keyPoints: ["Complete question bank", "Food safety standards", "FIFO and storage", "Station operations", "Kitchen communication", "Emergency protocols"],
      sequenceOrder: 12,
    },
  ];

  if (!hasServer) {
    for (const template of serverTemplates) {
      await storage.createTemplate(template);
    }
  }

  if (!hasKitchen) {
    for (const template of kitchenTemplates) {
      await storage.createTemplate(template);
    }
  }

  const bartenderTemplates = [
    {
      title: "Bartender Training Manual Overview",
      category: "bartender",
      section: "Introduction",
      contentType: "overview",
      content: "═══════════════════════════════════════\nBARTENDER TRAINING MANUAL\n{{restaurantName}}\n═══════════════════════════════════════\n\n\"The bar is the highest-margin, highest-risk station in this building. What happens here directly affects revenue, liability, and the reputation of this restaurant on every single shift. You are being trained to run it right.\"\n\n═══════════════════════════════════════\nHOW THIS TRAINING WORKS\n═══════════════════════════════════════\n\nYour training follows a structured 7-day program built on a proven three-phase model:\n\n  SHADOW → PERFORM → CERTIFY\n\nPhase 1 — Shadow (Days 1–2)\nObserve the bar operation from open to close. Learn the layout, products, compliance requirements, and rhythm of service. No independent bartending yet.\n\nPhase 2 — Perform (Days 3–6)\nHands-on execution under direct supervision. You will build drinks, operate the POS, handle cash, interact with guests, and close the bar with a trainer beside you.\n\nPhase 3 — Certify (Day 7)\nDemonstrate that you can run the bar independently. You must pass both a written assessment (90% minimum) and a practical evaluation before working unsupervised.\n\n═══════════════════════════════════════\nTABLE OF CONTENTS\n═══════════════════════════════════════\n\nDay 1 — Orientation, Bar Layout & Compliance\nDay 2 — Spirits, Beer & Wine Knowledge\nDay 3 — Cocktail Fundamentals & Signature Drinks\nDay 4 — POS, Cash Handling & Speed Bar Operations\nDay 5 — Guest Experience, Upselling & Conflict De-escalation\nDay 6 — Bar Close, Inventory & Sanitation Standards\nDay 7 — Assessment, Certification & Standards\n\n═══════════════════════════════════════\nBEFORE YOUR FIRST DAY\n═══════════════════════════════════════\n\n□ Non-slip, closed-toe shoes (required — no exceptions)\n□ Dress code: {{uniformDiningRoom}}\n□ Hair pulled back and secured\n□ No excessive jewelry — nothing that can fall into a drink\n□ Nails trimmed short, no polish or acrylics\n□ Alcohol server certification (must be obtained within 30 days of hire)\n□ Direct deposit form submitted to {{hrContactEmail}}",
      keyPoints: ["Shadow → Perform → Certify model", "7-day training program", "90% written test required", "Highest-margin station", "Compliance critical"],
      sequenceOrder: 1,
    },
    {
      title: "Bar Team & Chain of Command",
      category: "bartender",
      section: "Organization",
      contentType: "overview",
      content: "═══════════════════════════════════════\nBAR CHAIN OF COMMAND\n═══════════════════════════════════════\n\n{{ownerNames}} — Owner\n├── Final authority on beverage program, hiring, and operations\n│\n├── {{barManager}} — Bar Manager / GM\n│   ├── Oversees bar scheduling, ordering, inventory, and labor\n│   ├── Handles disciplinary issues and performance reviews\n│   ├── Your direct report for scheduling, call-outs, and concerns\n│   └── Approves all voids, comps, and cash discrepancies\n│\n├── {{headBartender}} — Head Bartender\n│   ├── Lead trainer for all new bartender hires\n│   ├── Runs the bar during service when Bar Manager is off-site\n│   ├── Sets the standard for speed, accuracy, and guest interaction\n│   └── Conducts Day 7 practical evaluation\n│\n├── Bartenders\n│   ├── Responsible for the full bar operation during assigned shifts\n│   ├── Expected to know all signature cocktails, draft program, and wine list\n│   └── Maintain compliance, cleanliness, and cost control standards\n│\n└── Barbacks\n    ├── Ice, glassware, garnish restocking during service\n    ├── Keg changes and backup supply runs\n    └── Assist with bar breakdown and closing duties\n\nTipping Structure: {{tippingStructure}}\nBreak Policy: {{breakPolicy}}\n\n⚠ IMPORTANT: Always follow the chain of command. Bring concerns to {{headBartender}} first. If unresolved, escalate to {{barManager}}. Never skip levels unless the situation involves safety or harassment.",
      keyPoints: ["Clear chain of command", "Head Bartender leads training", "Bar Manager approves voids/comps", "Tipping structure defined", "Escalation protocol"],
      sequenceOrder: 2,
    },
    {
      title: "Day 1: Orientation, Bar Layout & Compliance",
      category: "bartender",
      section: "Training Schedule",
      contentType: "procedure",
      content: "═══════════════════════════════════════\nDAY 1 — ORIENTATION, BAR LAYOUT & COMPLIANCE\nTraining Phase: SHADOW\n═══════════════════════════════════════\n\nObjective: Learn the bar layout, meet the team, and understand compliance requirements that protect you, the restaurant, and every guest.\n\nDuration: 6–8 Hours\n\n─── MORNING SESSION ───\n\n1. Welcome & Team Introductions\n   • Meet {{barManager}}, {{headBartender}}, and shift team\n   • Review training schedule and expectations for the week\n   • Tour assigned locker/changing area\n\n2. Bar Layout Orientation Checklist\n   □ Well stations identified and stocked\n   □ Speed rail contents memorized\n   □ Back bar organization understood\n   □ Refrigeration units: location and contents\n   □ Garnish station setup and location\n   □ Glass locations by type (rocks, highball, martini, wine, pint, shot)\n   □ Ice bin location and backup ice supply\n   □ POS terminal location and login ({{posSystem}})\n   □ Tip jar or tip-out container location\n   □ Manager on duty introduction complete\n\n─── AFTERNOON SESSION ───\n\n3. Compliance Standards — Non-Negotiable\n\n   Permit Type: {{alcoholPermit}}\n\n   ┌──────────────────────┬───────────────────────────────────────────┐\n   │ RULE                  │ STANDARD                                  │\n   ├──────────────────────┼───────────────────────────────────────────┤\n   │ Legal drinking age     │ 21+ — ID every guest who appears under 30 │\n   │ Acceptable IDs         │ State Driver's License, US Passport,      │\n   │                        │ Military ID, State ID Card                │\n   │ Intoxication standard  │ You are liable. When in doubt, stop.      │\n   │ Last call timing       │ Per closing protocol — no exceptions      │\n   │ Minors at the bar      │ Seated service only with food order and   │\n   │                        │ parent/guardian present                   │\n   │ Refused service        │ Document name, time, reason — tell        │\n   │                        │ manager immediately                       │\n   └──────────────────────┴───────────────────────────────────────────┘\n\n   ⚠ YOUR ALCOHOL SERVER CERTIFICATION IS YOUR LIVELIHOOD\n   Serving a minor or an intoxicated guest does not just cost the restaurant — it can cost you your personal license, your job, and result in criminal charges. There is no situation where a sale is worth that risk.\n\n4. Dress Code & Conduct\n   • Dress standard: {{uniformDiningRoom}}\n   • Phone policy: phones off the bar surface during service\n   • Tipping structure: {{tippingStructure}}\n   • Bar closing time: {{closingTime}}\n\n─── END OF DAY 1 ───\n\nAssessment: Verbal compliance quiz — trainee must correctly state legal drinking age, acceptable IDs, what to do when a guest appears intoxicated, and the refused service documentation process.\n\nTrainer Notes: Mark pass/fail in Daily Sign-Off Sheet.",
      keyPoints: ["Bar layout orientation", "Compliance standards", "ID verification protocol", "Intoxication liability", "Speed rail memorization", "POS location"],
      sequenceOrder: 3,
    },
    {
      title: "Day 2: Spirits, Beer & Wine Knowledge",
      category: "bartender",
      section: "Training Schedule",
      contentType: "procedure",
      content: "═══════════════════════════════════════\nDAY 2 — SPIRITS, BEER & WINE KNOWLEDGE\nTraining Phase: SHADOW\n═══════════════════════════════════════\n\nObjective: Build product knowledge across spirits, beer, and wine. Understand the well/call/premium distinction, proper pours, and responsible service indicators.\n\nDuration: 6–8 Hours\n\n─── MORNING SESSION ───\n\n1. The Back Bar — Know What You're Pouring\n\n   SPIRITS CATEGORIES:\n   Each category with well (speed rail) selection and call/premium options:\n   • Vodka: Well / Call / Premium\n   • Gin: Well / Call\n   • Rum: Well / Call (light, dark, spiced)\n   • Tequila: Well / Call / Premium (blanco, reposado, añejo)\n   • Whiskey: Well bourbon / Call bourbon / Rye / Scotch options\n   • Brandy / Cognac (if applicable)\n   • Liqueurs and modifiers: triple sec, amaretto, Kahlúa, etc.\n\n   \"Know your well vs. call vs. premium distinction cold. A guest who asks for 'a margarita' gets well tequila. A guest who asks for Patrón gets charged accordingly. Every time.\"\n\n2. Beer Program\n\n   Draft lines: {{draftBeerCount}} taps\n\n   ┌─────────────────────────────────────────────┐\n   │     DRAFT POUR STANDARD                      │\n   ├─────────────────────────────────────────────┤\n   │ □ Glass clean and chilled                     │\n   │ □ Hold at 45° angle on first half             │\n   │ □ Straighten for second half                  │\n   │ □ 1-inch head — no more, no less              │\n   │ □ Wipe tap handle after each pour             │\n   └─────────────────────────────────────────────┘\n\n   • 16oz pint standard for draft\n   • Know the full bottle/can selection\n   • Know flavor profiles: IPA (hoppy/bitter), lager (clean/crisp), stout (roasty/dark), wheat (light/fruity)\n\n─── AFTERNOON SESSION ───\n\n3. Wine Service\n   • House red / house white / house rosé selections\n   • By-the-glass pours: 5oz standard, 6oz generous, never above 6oz\n   • Bottle service: present label, open at table, taste pour for host\n   • Storage: reds at room temp, whites and rosés chilled, opened bottles sealed and dated\n\n4. Responsible Alcohol Knowledge\n\n   ┌──────────────────────┬───────────────────────────────────────────┐\n   │ FACTOR                │ EFFECT ON INTOXICATION                    │\n   ├──────────────────────┼───────────────────────────────────────────┤\n   │ Body weight            │ Lower weight = faster intoxication        │\n   │ Food consumption       │ Food slows alcohol absorption             │\n   │ Drink speed            │ Faster consumption = faster impairment    │\n   │ Drink type             │ High ABV spirits hit faster than beer     │\n   │ Medications            │ Unpredictable — err on side of caution    │\n   └──────────────────────┴───────────────────────────────────────────┘\n\n   \"You cannot know every guest's situation. You can know what to watch for.\"\n\n   Intoxication Warning Signs:\n   • Slurred speech\n   • Loss of balance or coordination\n   • Repeated questions or confusion\n   • Becoming louder, aggressive, or overly friendly\n   • Glassy or unfocused eyes\n\n─── END OF DAY 2 ───\n\nAssessment: Product knowledge quiz — trainee must identify well vs. call for 3 spirit categories, demonstrate a proper draft pour, and state the standard wine pour size.\n\nTrainer Notes: Mark pass/fail in Daily Sign-Off Sheet.",
      keyPoints: ["Well/Call/Premium distinction", "Draft pour standard", "Wine service protocol", "Intoxication warning signs", "Product knowledge", "Responsible service"],
      sequenceOrder: 4,
    },
    {
      title: "Day 3: Cocktail Fundamentals & Signature Drinks",
      category: "bartender",
      section: "Training Schedule",
      contentType: "procedure",
      content: "═══════════════════════════════════════\nDAY 3 — COCKTAIL FUNDAMENTALS & SIGNATURE DRINKS\nTraining Phase: PERFORM (supervised)\n═══════════════════════════════════════\n\nObjective: Master bar technique fundamentals, standard pour control, signature cocktails, and classic cocktail recipes.\n\nDuration: 6–8 Hours\n\n─── MORNING SESSION ───\n\n1. Bar Technique Fundamentals\n\n   ┌──────────────────────┬──────────────────────┬───────────────────────────┐\n   │ TECHNIQUE             │ WHEN TO USE           │ METHOD                     │\n   ├──────────────────────┼──────────────────────┼───────────────────────────┤\n   │ Shake                 │ Citrus, cream, juice  │ 10–12 sec hard shake w/ice │\n   │ Stir                  │ Spirit-forward, no    │ 30 sec gentle stir,        │\n   │                       │ citrus                │ minimal dilution           │\n   │ Build                 │ Simple highballs      │ Pour over ice in glass     │\n   │ Muddle                │ Fresh herbs, fruit    │ Press firmly, don't shred  │\n   │ Layer                 │ Shots, specialty      │ Pour over back of spoon    │\n   │ Strain                │ After shake/stir      │ Hawthorne (shaken),        │\n   │                       │                       │ julep (stirred)            │\n   └──────────────────────┴──────────────────────┴───────────────────────────┘\n\n2. Standard Pour Guide — Cost Control\n\n   ┌──────────────────────┬──────────────────────┬───────────────────────────┐\n   │ SPIRIT TYPE           │ STANDARD POUR         │ COST IMPLICATION           │\n   ├──────────────────────┼──────────────────────┼───────────────────────────┤\n   │ Well spirits          │ 1.5 oz               │ Every 0.5 oz over =        │\n   │                       │                       │ measurable pour cost       │\n   │ Call / Premium        │ 1.5 oz               │ Same standard — no free    │\n   │                       │                       │ pours for regulars         │\n   │ Wine by the glass     │ 5 oz                 │ 6 oz max — train to 5      │\n   │ Beer draft            │ 16 oz pint           │ 1-inch head standard       │\n   │ Shots                 │ 1.5 oz               │ Jigger every time          │\n   └──────────────────────┴──────────────────────┴───────────────────────────┘\n\n   ⚠ FREE POURING IS NOT A SKILL. IT'S A LIABILITY.\n   A bartender who free pours may feel fast and experienced. They are also pouring 0.25–0.5 oz over on every drink, every shift. At 80 drinks a night, that's 20–40 oz of lost product — potentially $40–80 in unrecorded pour cost per shift. Jigger every pour, every time.\n\n─── AFTERNOON SESSION ───\n\n3. Signature Cocktails — {{restaurantName}}\n\n   These are the drinks guests will ask about before they open the menu. Know them by name, ingredients, and story.\n\n   Signature Cocktail #1: {{signatureCocktail1}}\n   • Glassware, ice, build method, garnish, and price — per house recipe card\n\n   Signature Cocktail #2: {{signatureCocktail2}}\n   • Glassware, ice, build method, garnish, and price — per house recipe card\n\n   Signature Cocktail #3: {{signatureCocktail3}}\n   • Glassware, ice, build method, garnish, and price — per house recipe card\n\n4. Classic Cocktail Quick Reference\n\n   Every bartender must know these:\n\n   ┌──────────────────┬──────────────┬──────────────────────┬──────────────┐\n   │ COCKTAIL          │ BASE          │ KEY INGREDIENTS       │ GLASS         │\n   ├──────────────────┼──────────────┼──────────────────────┼──────────────┤\n   │ Old Fashioned     │ Bourbon/Rye  │ Sugar, bitters, peel  │ Rocks         │\n   │ Manhattan         │ Rye/Bourbon  │ Sweet vermouth, bit.  │ Coupe         │\n   │ Negroni           │ Gin          │ Campari, sweet verm.  │ Rocks         │\n   │ Margarita         │ Tequila      │ Triple sec, lime      │ Rocks/salted  │\n   │ Daiquiri          │ Rum          │ Lime, simple syrup    │ Coupe         │\n   │ Whiskey Sour      │ Bourbon      │ Lemon, simple syrup   │ Rocks         │\n   │ Mojito            │ Rum          │ Mint, lime, soda      │ Highball      │\n   │ Moscow Mule       │ Vodka        │ Ginger beer, lime     │ Copper mug    │\n   │ Aperol Spritz     │ Aperol       │ Prosecco, soda        │ Wine glass    │\n   │ Espresso Martini  │ Vodka        │ Espresso, coffee liq. │ Martini       │\n   └──────────────────┴──────────────┴──────────────────────┴──────────────┘\n\n─── END OF DAY 3 ───\n\nAssessment: Cocktail execution test — trainee must build one signature cocktail from memory with correct technique and pour, and identify the correct technique (shake/stir/build) for three classic cocktails.\n\nTrainer Notes: Mark pass/fail in Daily Sign-Off Sheet.",
      keyPoints: ["Bar techniques (shake/stir/build)", "Standard pour guide", "Jigger-every-pour policy", "Signature cocktails", "Classic cocktail reference", "Cost control"],
      sequenceOrder: 5,
    },
    {
      title: "Day 4: POS, Cash Handling & Speed Bar",
      category: "bartender",
      section: "Training Schedule",
      contentType: "procedure",
      content: "═══════════════════════════════════════\nDAY 4 — POS, CASH HANDLING & SPEED BAR OPERATIONS\nTraining Phase: PERFORM (supervised)\n═══════════════════════════════════════\n\nObjective: Master POS operations, cash handling procedures, and speed bar techniques for high-volume service.\n\nDuration: 6–8 Hours\n\n─── MORNING SESSION ───\n\n1. POS Operations — {{posSystem}}\n\n   Opening a Bar Tab:\n   Step 1: Swipe or enter card at {{posSystem}} terminal\n   Step 2: Open tab under guest name or seat number\n   Step 3: Add drinks as ordered — never from memory\n   Step 4: Confirm tab total with guest before closing\n   Step 5: Close tab — prompt for tip on screen\n\n   Splitting Checks:\n   • Split by seat: use seat assignment on ticket\n   • Split evenly: divide total before tip prompt\n   • Partial split: run one card, adjust remaining balance\n   • Cash + card: ring cash payment first, run card for remainder\n\n   Voids and Comps:\n   • Void: manager approval required before closing ticket\n   • Comp: manager PIN required — never comp without authorization\n   • Document reason for every void and comp\n\n   \"Every unaccounted void is a red flag in your end-of-night report. Own your numbers.\"\n\n2. Cash Handling Standards\n\n   ┌─────────────────────────────────────────────┐\n   │     CASH HANDLING PROTOCOL                    │\n   ├─────────────────────────────────────────────┤\n   │ □ Count your bank before service — confirm    │\n   │   with manager                                │\n   │ □ Never leave drawer open between             │\n   │   transactions                                │\n   │ □ Large bills: verify with counterfeit pen    │\n   │   or UV light                                 │\n   │ □ At close: count drawer, record total,       │\n   │   drop excess to safe                         │\n   │ □ Discrepancies over $5: report to manager    │\n   │   before leaving                              │\n   └─────────────────────────────────────────────┘\n\n─── AFTERNOON SESSION ───\n\n3. Speed Bar Operations\n\n   Working a Rush — The Priority Stack:\n\n   Step 1: Acknowledge every guest within 30 seconds of sitting down — eye contact and \"I'll be right with you\" if you're buried\n   Step 2: Run tickets in order — no skipping, no favoritism\n   Step 3: Build drinks in batches: all rocks drinks together, all shaken drinks together\n   Step 4: Keep your well stocked — restock ice, garnish, and well spirits before service, not during\n   Step 5: Never let a ticket sit over 4 minutes without a status update to the guest\n\n   \"Speed is not about moving fast. It's about moving in the right order.\"\n\n4. Multi-Ticket Management\n   • Read the full ticket before starting — identify modifiers and allergy notes\n   • Build drinks in logical order: built drinks first (fastest), then shaken, then blended\n   • Communicate with barback: \"I need ice\" / \"Running low on limes\" — don't wait until empty\n   • If you're going to miss a 4-minute target, tell the guest: \"Just a minute more — I've got you next\"\n\n─── END OF DAY 4 ───\n\nAssessment: POS and cash test — trainee must open a tab, add drinks, split a check two ways, process a void with manager approval, and count down a cash drawer within $2 accuracy.\n\nTrainer Notes: Mark pass/fail in Daily Sign-Off Sheet.",
      keyPoints: ["POS tab management", "Cash handling protocol", "Speed bar priority stack", "Void/comp procedures", "Batch drink building", "4-minute ticket standard"],
      sequenceOrder: 6,
    },
    {
      title: "Day 5: Guest Experience, Upselling & De-escalation",
      category: "bartender",
      section: "Training Schedule",
      contentType: "procedure",
      content: "═══════════════════════════════════════\nDAY 5 — GUEST EXPERIENCE, UPSELLING & CONFLICT DE-ESCALATION\nTraining Phase: PERFORM (supervised)\n═══════════════════════════════════════\n\nObjective: Develop guest interaction skills, upselling techniques, cut-off protocol, and conflict de-escalation methods.\n\nDuration: 6–8 Hours\n\n─── MORNING SESSION ───\n\n1. The Bartender Guest Sequence\n\n   Step 1: GREET — within 30 seconds, eye contact, genuine (not scripted)\n   Step 2: READ — are they in a hurry? Want to chat? On a date? Alone? Adjust accordingly\n   Step 3: RECOMMEND — lead with a signature cocktail or current feature before asking \"what do you want?\"\n   Step 4: BUILD — make the drink with intention, not just speed\n   Step 5: CHECK BACK — 2 minutes after first drink delivery: \"How is that?\" is a reorder opportunity\n   Step 6: ANTICIPATE — watch glass levels; offer the next round before they have to ask\n   Step 7: CLOSE — thank them by name if you got it; invite them back specifically\n\n2. Upsell Language — Beverage\n\n   Instead of: \"What can I get you?\"\n   Say: \"Can I start you with one of our {{signatureCocktail1}}s tonight?\"\n\n   Instead of: \"Do you want well or call?\"\n   Say: \"We've got [Premium Brand] — want to go with that?\"\n\n   Instead of: \"Another beer?\"\n   Say: \"Ready for another [specific beer they ordered]?\"\n\n   \"Specificity closes. Generic questions get generic answers. Know what they ordered, use it.\"\n\n─── AFTERNOON SESSION ───\n\n3. Cut-Off Protocol — The Right Way\n\n   This is the highest-stakes moment in bartending.\n\n   Step 1: Do not argue — never debate whether someone is intoxicated\n   Step 2: Be direct, not apologetic: \"I'm not able to serve you another drink tonight.\" Period.\n   Step 3: Offer water and food — immediately, without being asked\n   Step 4: Notify the manager — do not handle alone\n   Step 5: Do not let them drive — offer to call a rideshare; document the offer\n   Step 6: Log it: time, description, what was said, manager notified\n\n   ⚠ YOU ARE THE LAST LINE OF DEFENSE\n   The law does not care if the guest seemed fine two drinks ago. It cares what happened when they left. Document every cut-off. Notify your manager every time. No exceptions for regulars, big tippers, or \"they're fine.\"\n\n4. Conflict De-escalation — 4-Step CALM Method\n\n   ┌─────────────────────────────────────────────┐\n   │     THE CALM METHOD                           │\n   ├─────────────────────────────────────────────┤\n   │                                               │\n   │  C — Control your tone.                       │\n   │      Lower your voice when theirs rises.      │\n   │      Never match aggression.                  │\n   │                                               │\n   │  A — Acknowledge the frustration.             │\n   │      \"I understand you're frustrated\"          │\n   │      costs nothing and de-escalates.           │\n   │                                               │\n   │  L — Limit the options.                       │\n   │      Give them two choices, both acceptable   │\n   │      to you. No open-ended negotiation.        │\n   │                                               │\n   │  M — Move the manager in.                     │\n   │      If CALM doesn't work in 60 seconds,      │\n   │      step back and get the manager.            │\n   │                                               │\n   └─────────────────────────────────────────────┘\n\n   \"Your job is to de-escalate, not to win. The guest doesn't need to feel wrong — they need to feel heard.\"\n\n─── END OF DAY 5 ───\n\nAssessment: Guest interaction evaluation — trainee must demonstrate the 7-step guest sequence, role-play one upsell conversation, and walk through the cut-off protocol verbally.\n\nTrainer Notes: Mark pass/fail in Daily Sign-Off Sheet.",
      keyPoints: ["7-step guest sequence", "Upsell language scripts", "CALM de-escalation method", "Cut-off protocol", "Documentation requirements", "Rideshare offer protocol"],
      sequenceOrder: 7,
    },
    {
      title: "Day 6: Bar Close, Inventory & Sanitation",
      category: "bartender",
      section: "Training Schedule",
      contentType: "procedure",
      content: "═══════════════════════════════════════\nDAY 6 — BAR CLOSE, INVENTORY & SANITATION\nTraining Phase: PERFORM (supervised)\n═══════════════════════════════════════\n\nObjective: Master bar closing procedures, pre-service inventory checks, and sanitation standards specific to bar operations.\n\nDuration: 6–8 Hours\n\n─── MORNING SESSION: SERVICE SHIFT ───\n\nTrainee works a supervised service shift applying everything learned Days 1–5. Trainer observes but allows trainee to run the bar with minimal intervention.\n\n─── AFTERNOON SESSION: CLOSING PROCEDURES ───\n\n1. Bar Close Checklist\n\n   BEFORE LAST CALL:\n   □ Alert guests 30 minutes before close (closing time: {{closingTime}})\n   □ Begin final round push — no new tabs after last call\n   □ Restock garnish station and replenish ice for next shift\n\n   AFTER LAST CALL:\n   □ All tabs closed and reconciled\n   □ Drawer counted and drop completed\n   □ All open bottles returned to speed rail or locked storage\n   □ Draft lines flushed (if required by policy)\n   □ Bar top sanitized with approved solution\n   □ Glass washer run and emptied\n   □ All glassware polished and racked\n   □ Garnish containers covered and dated\n   □ Ice bin emptied, washed, and left to dry\n   □ Bar mats removed, washed, and hung\n   □ Floor swept and mopped behind bar\n   □ Waste log completed (pours, breakage, comp)\n   □ Manager sign-off before clocking out\n\n2. Pre-Service Inventory Check\n\n   \"You don't need to do the full inventory count — that's a manager function. But you are responsible for knowing your par levels and flagging low stock before service, not during it.\"\n\n   □ Well spirits at par\n   □ Signature cocktail ingredients stocked ({{signatureCocktail1}}, {{signatureCocktail2}}, {{signatureCocktail3}})\n   □ Garnishes prepped and sufficient\n   □ Ice at full capacity\n   □ Glassware count sufficient for projected cover count\n   □ Draft lines functional and tapped\n\n3. Sanitation Standards — Bar Specific\n\n   ┌──────────────────────┬──────────────────────┬───────────────────────────┐\n   │ SURFACE / ITEM        │ CLEANING FREQUENCY    │ STANDARD                   │\n   ├──────────────────────┼──────────────────────┼───────────────────────────┤\n   │ Bar top               │ Every 30 min during  │ Sanitizer solution, clean  │\n   │                       │ service               │ cloth                      │\n   │ Speed rail            │ End of night          │ Remove bottles, wipe down, │\n   │                       │                       │ replace                    │\n   │ Bar mats              │ End of night          │ Remove, wash, hang dry     │\n   │ Ice bin               │ End of night          │ Empty, wash, air dry —     │\n   │                       │                       │ never leave ice overnight  │\n   │ Glass washer          │ Every 2 hours +       │ Brush, run empty cycle,    │\n   │                       │ end of night           │ check sanitizer level      │\n   │ Garnish containers    │ End of night          │ Cover, date, refrigerate   │\n   │ Blender/shaker tins   │ After each use        │ Hot water rinse min;       │\n   │                       │                       │ full wash at close         │\n   └──────────────────────┴──────────────────────┴───────────────────────────┘\n\n   ⚠ THE ICE BIN IS THE MOST COMMONLY FAILED ITEM IN BAR HEALTH INSPECTIONS.\n   Old ice = bacterial growth. Empty it every night. No exceptions.\n\n─── END OF DAY 6 ───\n\nAssessment: Closing procedure test — trainee must complete the bar close checklist in sequence, demonstrate proper ice bin cleaning, and complete a pre-service inventory check.\n\nTrainer Notes: Mark pass/fail in Daily Sign-Off Sheet.",
      keyPoints: ["Bar close checklist", "Last call protocol", "Ice bin cleaning", "Pre-service inventory", "Sanitation schedule", "Manager sign-off required"],
      sequenceOrder: 8,
    },
    {
      title: "Day 7: Assessment, Certification & Standards",
      category: "bartender",
      section: "Training Schedule",
      contentType: "assessment",
      content: "═══════════════════════════════════════\nDAY 7 — ASSESSMENT, CERTIFICATION & STANDARDS\nTraining Phase: CERTIFY\n═══════════════════════════════════════\n\nObjective: Confirm readiness for independent bar operation through written assessment, practical evaluation, and formal certification.\n\nDuration: 6–8 Hours\n\n─── MORNING SESSION: FULL SHIFT SIMULATION ───\n\nThe trainee works a complete simulated bar shift with minimal trainer intervention:\n• Bar setup from memory (no checklist reference)\n• Service execution: handle 15–20 drink orders across walk-ups and tickets\n• POS: open tabs, process payments, handle a split check and a void\n• Guest interaction: demonstrate the 7-step guest sequence\n• Closing: full bar breakdown without prompting\n\n─── AFTERNOON SESSION: WRITTEN ASSESSMENT ───\n\n═══════════════════════════════════════\nBARTENDER TRAINING — WRITTEN ASSESSMENT\n═══════════════════════════════════════\nPass Criteria: 9 out of 10 correct (90%)\nScore below 9 requires an additional training day before certification.\n\n1. What is the legal drinking age, and what IDs are acceptable at {{restaurantName}}?\n   _______________________________________________\n\n2. A guest orders a margarita and doesn't specify tequila. What do you pour and why?\n   _______________________________________________\n\n3. What is the standard pour for well spirits, and why does free pouring create a cost problem?\n   _______________________________________________\n\n4. A guest is showing signs of intoxication — slurred speech, repeating questions. Walk through every step you take from that moment forward.\n   _______________________________________________\n\n5. What is the difference between a shake and a stir, and when do you use each?\n   _______________________________________________\n\n6. Name the 3 signature cocktails at {{restaurantName}} and their base spirits.\n   _______________________________________________\n\n7. A guest wants to split a check four ways between two cards and cash. Walk through the steps in {{posSystem}}.\n   _______________________________________________\n\n8. What do you do when you need to void a drink after the ticket has been opened?\n   _______________________________________________\n\n9. Name 5 items on the bar close checklist and explain why the ice bin matters specifically.\n   _______________________________________________\n\n10. A guest becomes aggressive after you've cut them off. Walk through the CALM method.\n    _______________________________________________\n\n─── PRACTICAL EVALUATION ───\n\nTo be completed by {{barManager}} or {{headBartender}} on Day 7.\n\n□ Poured a well cocktail to spec using a jigger — correct pour, correct glass\n□ Built one signature cocktail from memory — correct ingredients and method\n□ Demonstrated proper draft pour — 45° angle, correct head\n□ Opened a tab, ran a modification, and closed it in {{posSystem}}\n□ Verbally walked through the cut-off protocol\n□ Completed bar close checklist in correct sequence\n\nPractical Evaluation Result: ☐ Pass  ☐ Additional Day Required\n\n─── TRAINER DAILY SIGN-OFF SHEET ───\n\n┌──────┬──────────────────────────────┬────────┬────────────────┬────────────────┬────────────┐\n│ Day  │ Topics Covered               │ Status │ Trainer Init.  │ Trainee Init.  │ Date       │\n├──────┼──────────────────────────────┼────────┼────────────────┼────────────────┼────────────┤\n│  1   │ Orientation, Layout, Compli. │ ______ │ __________     │ __________     │ __________ │\n│  2   │ Spirits, Beer & Wine         │ ______ │ __________     │ __________     │ __________ │\n│  3   │ Cocktails & Signature Drinks │ ______ │ __________     │ __________     │ __________ │\n│  4   │ POS, Cash & Speed Bar        │ ______ │ __________     │ __________     │ __________ │\n│  5   │ Guest Exp. & De-escalation   │ ______ │ __________     │ __________     │ __________ │\n│  6   │ Bar Close & Sanitation       │ ______ │ __________     │ __________     │ __________ │\n│  7   │ Assessment & Certification   │ ______ │ __________     │ __________     │ __________ │\n└──────┴──────────────────────────────┴────────┴────────────────┴────────────────┴────────────┘\n\nStatus: P = Pass, F = Fail (requires repeat), N/A = Not applicable\n\nManager Final Sign-Off: _______________ Date: ________\n\n─── 90-DAY PROBATIONARY PERIOD ───\n\n   ┌─────────────────────────────────────────────┐\n   │  ⚠ 90-DAY PROBATION NOTICE                  │\n   ├─────────────────────────────────────────────┤\n   │                                               │\n   │  All bar staff operate under a 90-day         │\n   │  probationary period beginning on the first   │\n   │  day of employment. Certification completes   │\n   │  your training — it does not end your          │\n   │  probation. Performance standards, attendance, │\n   │  conduct, and pour accuracy are evaluated      │\n   │  through day 90. Continued employment is       │\n   │  confirmed at the close of the probationary    │\n   │  period by your direct supervisor.             │\n   │                                               │\n   └─────────────────────────────────────────────┘\n\n─── CERTIFICATION CLOSING ───\n\n   ┌─────────────────────────────────────────────┐\n   │                                               │\n   │  \"You passed the test and you know the        │\n   │   drinks. That's the minimum.                 │\n   │                                               │\n   │   The bar is the first thing a guest sees     │\n   │   when they walk in and the last thing they   │\n   │   remember when they leave. Every pour,       │\n   │   every interaction, every close-out says     │\n   │   something about this restaurant.            │\n   │                                               │\n   │   You're not just a bartender here.           │\n   │   You're the standard.                        │\n   │                                               │\n   │   Hold it.\"                                   │\n   │                                               │\n   │         — {{barManager}}                      │\n   │           {{restaurantName}}                  │\n   │                                               │\n   └─────────────────────────────────────────────┘\n\n─── END OF TRAINING PROGRAM ───",
      keyPoints: ["Written assessment (90% pass)", "10-question test", "Practical evaluation", "Trainer Sign-Off Sheet", "90-day probation period", "Certification closing"],
      sequenceOrder: 9,
    },
    {
      title: "Bar Policies Summary",
      category: "bartender",
      section: "Policies",
      contentType: "checklist",
      content: "═══════════════════════════════════════\nBAR POLICIES & STANDARDS\n═══════════════════════════════════════\n\nATTENDANCE:\n□ Arrive 15 minutes before your scheduled shift — in dress code, ready to work\n□ Notify {{barManager}} at least 4 hours in advance for any absence\n□ Shift swaps must be approved by {{barManager}} in writing before the swap occurs\n□ Progressive discipline for unexcused absences:\n  1st occurrence → Verbal warning (documented)\n  2nd occurrence → Written warning\n  3rd occurrence → Final warning / suspension\n  4th occurrence → Termination\n\nDRESS CODE:\n□ {{uniformDiningRoom}}\n□ Hair pulled back and secured\n□ No excessive jewelry — nothing that can fall into a drink\n□ Nails trimmed short, no polish\n□ Apron if provided — must be worn during service\n□ Name tag visible if issued\n\nALCOHOL COMPLIANCE:\n□ Alcohol server certification required within 30 days of hire\n□ ID every guest who appears under 30\n□ Acceptable IDs: State Driver's License, US Passport, Military ID, State ID Card\n□ Never serve a visibly intoxicated guest — document and notify manager\n□ Log all refused service incidents: time, description, action taken\n□ Permit type: {{alcoholPermit}}\n\nCASH HANDLING:\n□ Count bank before service — confirm with manager\n□ Never leave drawer open between transactions\n□ Large bills verified with counterfeit pen\n□ Cash drawer counted at close, excess dropped to safe\n□ Discrepancies over $5 reported to manager before leaving\n\nBREAKS:\n□ Break policy: {{breakPolicy}}\n□ Eat in designated break area only — never behind the bar\n□ Smoke breaks: designated area only, wash hands before returning\n\nCELL PHONES:\n□ No personal phones on the bar surface during service\n□ Phones stored in locker or designated area\n□ Use the restaurant phone for emergencies\n\nZERO TOLERANCE:\n□ Serving minors or intoxicated guests\n□ Drinking alcohol while on duty\n□ Harassment or discrimination of any kind\n□ Theft of product, cash, or personal property\n□ Falsifying time records or pour counts",
      keyPoints: ["15-minute early arrival", "Alcohol compliance requirements", "Cash handling standards", "Progressive discipline", "Zero tolerance policies", "ID verification protocol"],
      sequenceOrder: 10,
    },
    {
      title: "Bar Operations & Procedures",
      category: "bartender",
      section: "Operations",
      contentType: "procedure",
      content: "═══════════════════════════════════════\nDAILY BAR OPERATIONS\n═══════════════════════════════════════\n\nPRE-SERVICE SETUP:\n□ Arrive in dress code, clock in, check assignment board\n□ Count cash bank — confirm with manager\n□ Set up speed rail: verify all well bottles are full and in position\n□ Prep garnish station: citrus wheels, wedges, cherries, olives, herbs\n□ Check ice levels — fill ice bin to capacity\n□ Stock glassware: rocks, highball, martini, wine, pint, shot\n□ Verify draft lines are tapped and pouring correctly\n□ Test POS terminal — confirm login works\n□ Review 86 list and daily specials\n□ Taste-check any batch cocktails or fresh juices\n□ Report any equipment issues or low stock to {{barManager}} immediately\n\nDURING SERVICE:\n□ Acknowledge every new guest within 30 seconds\n□ Lead with signature cocktails — not \"what do you want?\"\n□ Jigger every pour — no free pouring\n□ Ring every drink before making it — never from memory\n□ Monitor intoxication levels continuously\n□ Restock mid-service before running out (anticipate needs)\n□ Clean bar top every 30 minutes minimum\n□ Never leave the bar unattended — coordinate bathroom breaks with barback or manager\n\nEND-OF-SHIFT CLOSING:\n□ Complete bar close checklist in full\n□ All tabs closed and reconciled in {{posSystem}}\n□ Cash drawer counted, recorded, excess dropped to safe\n□ Speed rail bottles returned, bar locked if applicable\n□ Ice bin emptied, washed, and left to air dry\n□ Glassware polished and racked\n□ Bar mats removed, washed, hung to dry\n□ Garnish containers covered, dated, refrigerated\n□ Glass washer run, emptied, and cleaned\n□ Bar top and surfaces sanitized\n□ Floor swept and mopped behind bar\n□ Waste log completed (pours, breakage, comps)\n□ Check out with {{barManager}} — do not leave until sign-off is complete\n\nWEEKLY TASKS:\n┌──────────────────────┬──────────────────────────────┐\n│ Monday               │ Speed rail deep clean          │\n│ Tuesday              │ Back bar organization check    │\n│ Wednesday            │ Glassware inventory count      │\n│ Thursday             │ Draft line cleaning            │\n│ Friday               │ Garnish prep for weekend       │\n│ Saturday             │ Full bar inventory review      │\n│ Sunday               │ Equipment check and log        │\n└──────────────────────┴──────────────────────────────┘",
      keyPoints: ["Pre-service setup checklist", "During-service standards", "Jigger-every-pour policy", "30-second guest acknowledgment", "Manager sign-off at close", "Weekly task schedule"],
      sequenceOrder: 11,
    },
    {
      title: "Bartender Assessment Questions",
      category: "bartender",
      section: "Assessments",
      contentType: "assessment",
      content: "═══════════════════════════════════════\nBARTENDER KNOWLEDGE ASSESSMENT\nReference Study Guide\n═══════════════════════════════════════\n\nThis section provides the complete question bank for bartender training assessments. Trainers may use these for verbal quizzes during training days or as a study reference for the Day 7 written test.\n\nALCOHOL COMPLIANCE:\n• What is the legal drinking age? → 21\n• What IDs are acceptable? → State Driver's License, US Passport, Military ID, State ID Card\n• When should you ID a guest? → When they appear under 30\n• What do you do if a guest has no valid ID? → Politely decline service, no exceptions\n• What do you do when a guest shows signs of intoxication? → Stop service, be direct, offer water/food, notify manager, document, offer rideshare\n• What is your personal liability for serving a minor? → Criminal charges, loss of certification, termination\n\nSPIRITS & PRODUCT KNOWLEDGE:\n• What's the difference between well and call spirits? → Well is the default/house brand on the speed rail; call is a specific brand requested by the guest\n• What is the standard pour for well spirits? → 1.5 oz\n• Why is free pouring a cost problem? → Over-pouring 0.25–0.5 oz per drink across 80 drinks = $40–80 in lost product per shift\n• What is the standard wine pour? → 5 oz (6 oz maximum)\n• What is the proper draft pour technique? → 45° angle first half, straighten for second half, 1-inch head\n• Name three tequila categories → Blanco, Reposado, Añejo\n\nCOCKTAIL KNOWLEDGE:\n• When do you shake vs. stir a cocktail? → Shake when there's citrus, cream, or juice; stir for spirit-forward drinks without citrus\n• What is the shake duration? → 10–12 seconds hard shake with ice\n• Name the base spirit for: Old Fashioned, Margarita, Negroni → Bourbon/Rye, Tequila, Gin\n• What are the 3 signature cocktails at {{restaurantName}}? → {{signatureCocktail1}}, {{signatureCocktail2}}, {{signatureCocktail3}}\n• What is muddling and when do you use it? → Pressing fresh herbs or fruit firmly (not shredding); used for mojitos, old fashioneds with fruit, etc.\n\nPOS & CASH HANDLING:\n• How do you open a bar tab in {{posSystem}}? → Swipe/enter card, open under guest name or seat number, add drinks as ordered\n• What is required before voiding a drink? → Manager approval/PIN\n• How do you handle a cash + card split? → Ring cash payment first, run card for remainder\n• What do you do with a cash discrepancy over $5? → Report to manager before leaving\n• Can you comp a drink without manager approval? → No, never\n\nGUEST EXPERIENCE:\n• What is the 30-second rule? → Acknowledge every new guest within 30 seconds of sitting down\n• Name the 7 steps of the bartender guest sequence → Greet, Read, Recommend, Build, Check Back, Anticipate, Close\n• How do you upsell without being pushy? → Lead with specifics (signature cocktail name, premium brand), not generic questions\n\nCONFLICT & SAFETY:\n• What is the CALM method? → Control your tone, Acknowledge frustration, Limit options, Move the manager in\n• What are 5 signs of intoxication? → Slurred speech, loss of balance, repeated questions, increased volume/aggression, glassy eyes\n• What do you do if a cut-off guest wants to drive? → Offer to call a rideshare, document the offer, notify manager\n\nCLOSING & SANITATION:\n• Why does the ice bin matter in health inspections? → Old ice = bacterial growth; must be emptied, washed, and air-dried every night\n• How often should the bar top be cleaned during service? → Every 30 minutes minimum\n• What goes in the waste log? → Pours, breakage, and comps\n• Can you leave before the manager sign-off? → No — manager must complete walk-through first",
      keyPoints: ["Complete question bank", "Compliance standards", "Product knowledge", "Cocktail techniques", "POS procedures", "Guest experience", "Sanitation protocols"],
      sequenceOrder: 12,
    },
  ];

  if (!hasBartender) {
    for (const template of bartenderTemplates) {
      await storage.createTemplate(template);
    }
  }

  const managerTemplates = [
    {
      title: "Manager Training Manual Overview",
      category: "manager",
      section: "Introduction",
      contentType: "overview",
      content: "═══════════════════════════════════════\nMANAGER TRAINING MANUAL\n{{restaurantName}}\n2-Week Certification Program\n═══════════════════════════════════════\n\n\"Every other training manual in this building teaches someone how to do one job. This one teaches you how to be responsible for all of them.\n\nA manager at {{restaurantName}} does not just supervise. They set the standard, hold the line, and make the call when no one else can. That is not a title. It is an obligation.\"\n\n───────────────────────────────────────\nYOUR TEAM\n───────────────────────────────────────\nRestaurant: {{restaurantName}}\nOwner: {{ownerNames}}\nGeneral Manager: {{gm}}\n\n───────────────────────────────────────\nTABLE OF CONTENTS\n───────────────────────────────────────\nDay 1 — Orientation, Leadership Philosophy & Role Scope\nDay 2 — FOH Operations: Server, Host & Busser Standards\nDay 3 — BOH Operations: Kitchen Standards & Food Safety\nDay 4 — Bar Operations: TABC, Pour Standards & Bar Management\nDay 5 — POS Mastery, Cash Handling & End-of-Night Reconciliation\nDay 6 — Labor Management, Scheduling & Prime Cost\nDay 7 — Food Cost, Inventory & Vendor Management\nDay 8 — HR, Documentation & TWC Compliance\nDay 9 — Guest Experience, Complaint Resolution & Crisis Management\nDay 10 — Opening/Closing Procedures, Assessment & Certification\n\n───────────────────────────────────────\nTRAINING MODEL\n───────────────────────────────────────\nThis is a 10-day, 2-week certification program. Each day builds on the previous one. The manager role requires working knowledge of every position in the building, plus the financial, HR, legal, and operational responsibilities that no other role carries.\n\n┌──────────┬───────────────────────────────────────┐\n│ Week 1   │ Days 1–5: Operations & Position Mastery│\n│ Week 2   │ Days 6–10: Business, HR & Certification│\n└──────────┴───────────────────────────────────────┘\n\n───────────────────────────────────────\nBEFORE YOUR FIRST DAY\n───────────────────────────────────────\n□ Review all position manuals (Server, Kitchen, Bartender)\n□ Obtain POS login credentials for {{posSystem}}\n□ Obtain scheduling access for {{schedulingApp}}\n□ Review reservation system access for {{reservationSystem}}\n□ Review current menu and daily specials\n□ Bring a notebook — you will be writing things down\n□ Dress code: professional, ready to work every position\n□ Arrive 15 minutes before your scheduled start time",
      keyPoints: ["2-week / 10-day certification program", "Covers all positions plus business operations", "Week 1: Operations & Position Mastery", "Week 2: Business, HR & Certification", "Pre-arrival checklist included"],
      sequenceOrder: 1,
    },
    {
      title: "Day 1: Orientation, Leadership Philosophy & Role Scope",
      category: "manager",
      section: "Day 1",
      contentType: "procedure",
      content: "═══════════════════════════════════════\nDAY 1 — ORIENTATION, LEADERSHIP PHILOSOPHY & ROLE SCOPE\n═══════════════════════════════════════\n\n───────────────────────────────────────\nWHAT THE MANAGER OWNS\n───────────────────────────────────────\n\n┌──────────────────────┬──────────────────────┬──────────────────────┐\n│ FOH                  │ BOH                  │ BUSINESS             │\n├──────────────────────┼──────────────────────┼──────────────────────┤\n│ Server performance   │ Kitchen execution    │ Labor cost %         │\n│ Host floor mgmt      │ Food safety          │ Food cost %          │\n│ Busser coverage      │ Station setup/close  │ Prime cost tracking  │\n│ Guest complaints     │ Temp & FIFO          │ Cash reconciliation  │\n│ Bar service & TABC   │ Waste & portions     │ Scheduling accuracy  │\n│ Table turn mgmt      │ Ticket times         │ Vendor relationships │\n│ Team communication   │ Staff accountability │ HR documentation     │\n└──────────────────────┴──────────────────────┴──────────────────────┘\n\n\"If it happens in this building, it is your responsibility. The owner is not here to manage the problems. You are.\"\n\n───────────────────────────────────────\nTHE MANAGER'S MINDSET — 5 PRINCIPLES\n───────────────────────────────────────\n\n1. THE STANDARD IS THE STANDARD.\nNot the standard on a good night. The standard every night. When you accept less, you have lowered the bar permanently.\n\n2. MATH RUNS THE RESTAURANT.\nYour opinion about food cost doesn't matter. The percentage does. Learn it, watch it, act on it.\n\n3. DOCUMENT EVERYTHING.\nThe TWC does not care what you remember. Neither does a plaintiff's attorney. Write it down.\n\n4. LEAD THROUGH PRESENCE.\nA manager who disappears into the office during a dinner rush has failed before the first ticket drops.\n\n5. YOU ARE ALWAYS BEING WATCHED.\nHow you handle a bad night teaches your staff how to handle every bad night after you're gone.\n\n───────────────────────────────────────\nMANAGER AUTHORITY & LIMITS\n───────────────────────────────────────\n\nAUTHORIZED WITHOUT OWNER APPROVAL:\n• Comp a meal or round of drinks for a legitimate guest complaint\n• Send a staff member home for conduct or performance violations\n• Void a POS transaction with documented reason\n• Call emergency services in a safety situation\n• Refuse service to an intoxicated guest\n\nALWAYS REQUIRES OWNER NOTIFICATION:\n• Any termination\n• Any injury on property\n• Any police involvement\n• Any comp exceeding house threshold\n• Any vendor contract or pricing change\n\n───────────────────────────────────────\nDAY 1 SIGN-OFF\n───────────────────────────────────────\nTrainee: _______________ Trainer: _______________ Date: ___________",
      keyPoints: ["3-column responsibility grid: FOH, BOH, Business", "5 leadership principles", "Manager authority levels defined", "Owner notification triggers", "Comp and void authority"],
      sequenceOrder: 2,
    },
    {
      title: "Day 2: FOH Operations — Server, Host & Busser Standards",
      category: "manager",
      section: "Day 2",
      contentType: "procedure",
      content: "═══════════════════════════════════════\nDAY 2 — FOH OPERATIONS: SERVER, HOST & BUSSER STANDARDS\n═══════════════════════════════════════\n\n\"You cannot hold a standard you don't know. Before you manage the FOH, you must know what excellent FOH performance looks like at every position.\"\n\n───────────────────────────────────────\nSERVER STANDARDS — WHAT YOU'RE EVALUATING\n───────────────────────────────────────\n\n┌──────────────────────┬────────────────────────────────┬────────────────────────────────┐\n│ STANDARD             │ WHAT GOOD LOOKS LIKE           │ RED FLAG                       │\n├──────────────────────┼────────────────────────────────┼────────────────────────────────┤\n│ Table greeting       │ Within 2 min of seating        │ Guest flags you first          │\n│ ROAR recovery        │ Used without prompting         │ Server argues with guest       │\n│ Allergen protocol    │ 5-step chain every time        │ \"I think it's fine\"            │\n│ Check-back timing    │ 2 min after food delivery      │ Empty glass, no contact        │\n│ Ticket awareness     │ Communicates delays proactively│ Guest asks \"where's our food?\" │\n│ Upsell behavior      │ Specific recommendations       │ \"What do you want to drink?\"   │\n└──────────────────────┴────────────────────────────────┴────────────────────────────────┘\n\n───────────────────────────────────────\nROAR — MANAGER REINFORCEMENT\n───────────────────────────────────────\n\nR — RECOVER THE MOMENT.\nWhen a server brings you a complaint, your job is to appear at the table within 90 seconds.\n\nO — OWN IT.\nNo explanations, no deflection. \"I'm sorry, that's not the experience we want you to have here.\"\n\nA — ACT.\nComp, replace, or resolve — decide on the spot and execute.\n\nR — RETAIN THE GUEST.\nBefore they leave: \"I hope we'll see you again. I'll make sure it's right next time.\"\n\n\"A manager who handles a complaint well turns a negative review into a return visit. A manager who deflects turns it into a Google post.\"\n\n───────────────────────────────────────\nHOST FLOOR MANAGEMENT — WHAT YOU'RE WATCHING\n───────────────────────────────────────\n□ Sections rotating evenly — no server double-sat while others are empty\n□ Wait times quoted accurately — no complaints about longer-than-quoted waits\n□ No-show protocol being followed in {{reservationSystem}}\n□ Tables turning at or near {{avgTurnTime}} minutes\n□ Host communicating with servers before seating — not after\n□ Floor never exceeds {{totalCovers}} seated at one time\n\n───────────────────────────────────────\nBUSSER ACCOUNTABILITY\n───────────────────────────────────────\n• Reset time target: table cleared and reset within 3 minutes of guest departure\n• If resets are backing up: pull a server to assist, or reset yourself — the floor doesn't wait\n• FLOW framework: Fill, Look, Out with dirty, Wipe before set — visible and active in every section\n\n───────────────────────────────────────\nDAY 2 SIGN-OFF\n───────────────────────────────────────\nTrainee: _______________ Trainer: _______________ Date: ___________",
      keyPoints: ["Server evaluation standards table", "ROAR complaint recovery protocol", "Host floor management checklist", "Busser FLOW framework", "Table turn time targets"],
      sequenceOrder: 3,
    },
    {
      title: "Day 3: BOH Operations — Kitchen Standards & Food Safety",
      category: "manager",
      section: "Day 3",
      contentType: "procedure",
      content: "═══════════════════════════════════════\nDAY 3 — BOH OPERATIONS: KITCHEN STANDARDS & FOOD SAFETY\n═══════════════════════════════════════\n\n\"The kitchen does not run itself. It runs because someone is holding the standard. That someone is you when the chef isn't there — and sometimes when they are.\"\n\n───────────────────────────────────────\nFOOD SAFETY STANDARDS YOU MUST KNOW\n───────────────────────────────────────\n\n┌─────────────────────────┬──────────────────────────────┐\n│ STANDARD                │ REQUIREMENT                  │\n├─────────────────────────┼──────────────────────────────┤\n│ Cold storage            │ 40°F or below                │\n│ Hot holding             │ 135°F or above               │\n│ Cooked poultry          │ 165°F internal               │\n│ Ground meat             │ 160°F internal               │\n│ Whole cuts / steak      │ 145°F + 3 min rest           │\n│ Reheating               │ 165°F within 2 hours         │\n│ FIFO                    │ First in, first out — always │\n│ Date labeling           │ All prepped items labeled    │\n│ Cross-contamination     │ Raw proteins below produce   │\n└─────────────────────────┴──────────────────────────────┘\n\nA health code violation is a management failure, not a kitchen failure. The manager on duty is responsible for food safety compliance during their shift. Ignorance is not a defense with a health inspector.\n\n───────────────────────────────────────\nKITCHEN TICKET TIME STANDARDS\n───────────────────────────────────────\n\n┌──────────────────────┬──────────────┐\n│ ITEM TYPE            │ TARGET TIME  │\n├──────────────────────┼──────────────┤\n│ Appetizers           │ 8–10 minutes │\n│ Entrees              │ 18–22 minutes│\n│ Burgers / Sandwiches │ 12–15 minutes│\n│ Desserts             │ 5–7 minutes  │\n└──────────────────────┴──────────────┘\n\nWhen tickets are running long: communicate to the floor manager and host immediately — do not let servers find out from guests.\n\n───────────────────────────────────────\nBOH MANAGER RESPONSIBILITIES DURING SERVICE\n───────────────────────────────────────\n□ Pre-service: station setup complete, temps verified, mise en place confirmed\n□ Service: periodic line walk every 30 minutes minimum\n□ Ticket time monitoring: flag anything over target to Expo or Sous Chef\n□ 86 communication: confirm 86'd items reach all servers immediately via POS or verbal\n□ Post-service: close-down checklist completed and signed off before BOH staff clock out\n□ Waste log reviewed\n\n───────────────────────────────────────\nKITCHEN HIERARCHY — MANAGER'S ROLE\n───────────────────────────────────────\n• Executive Chef: culinary decisions, recipe standards, menu\n• Sous Chef: line execution, staff performance during service\n• Kitchen Manager: operational oversight, ordering, equipment\n• Manager on Duty: safety compliance, labor accountability, bridge between FOH and BOH\n\n\"Do not cross into the chef's culinary lane. Do hold the line on safety, labor, and conduct.\"\n\n───────────────────────────────────────\nDAY 3 SIGN-OFF\n───────────────────────────────────────\nTrainee: _______________ Trainer: _______________ Date: ___________",
      keyPoints: ["Food safety temperature standards", "FIFO and cross-contamination rules", "Ticket time targets by item type", "BOH service checklist", "Kitchen hierarchy boundaries"],
      sequenceOrder: 4,
    },
    {
      title: "Day 4: Bar Operations — TABC, Pour Standards & Bar Management",
      category: "manager",
      section: "Day 4",
      contentType: "procedure",
      content: "═══════════════════════════════════════\nDAY 4 — BAR OPERATIONS: TABC, POUR STANDARDS & BAR MANAGEMENT\n═══════════════════════════════════════\n\n───────────────────────────────────────\nTABC — MANAGER-LEVEL RESPONSIBILITY\n───────────────────────────────────────\n\nPermit Type: {{alcoholPermit}}\n\nAs the manager on duty, you are the final line of TABC accountability. Every staff member's violation is a management failure.\n\n┌─────────────────────────────┬────────────────────────────────────────────┐\n│ YOUR RESPONSIBILITY         │ STANDARD                                   │\n├─────────────────────────────┼────────────────────────────────────────────┤\n│ Verify staff carding        │ ID every guest under 30 — spot check       │\n│ Monitor intoxication        │ You can cut off before bartender does       │\n│ Document refused service    │ Name, time, reason, your initials          │\n│ Last call enforcement       │ No exceptions — regulars, big tippers, all │\n│ Incident log                │ Any TABC incident logged before end of shift│\n└─────────────────────────────┴────────────────────────────────────────────┘\n\nA TABC violation on your shift is your violation. License suspension, fines, and criminal exposure attach to the permit holder and the manager on duty. There is no situation where a sale justifies the risk.\n\n───────────────────────────────────────\nBAR COST CONTROLS — WHAT TO WATCH\n───────────────────────────────────────\n\n┌──────────────────────┬────────────────────────────────┬────────────────────────────────┐\n│ METRIC               │ WHAT IT MEANS                  │ RED FLAG                       │\n├──────────────────────┼────────────────────────────────┼────────────────────────────────┤\n│ Variance report      │ Actual vs. expected pours      │ Over-variance = free pour/theft│\n│ Comp/void rate       │ % of bar sales                 │ Above 3% = investigation       │\n│ Waste log gaps       │ Missing breakage entries        │ Unlogged waste = hidden cost   │\n│ Drawer variance      │ Cash over/short at close        │ Over $10 = documentation       │\n└──────────────────────┴────────────────────────────────┴────────────────────────────────┘\n\n───────────────────────────────────────\nCALM — MANAGER DEPLOYMENT\n───────────────────────────────────────\n\nWhen a bartender invokes CALM and it hasn't resolved within 60 seconds, you are already walking toward the bar. Your arrival should be calm, not reactive.\n\nC — COOL the situation. Your presence changes the dynamic.\nA — ASSESS quickly. Get the bartender's brief before engaging the guest.\nL — LEAD the resolution. \"Hi, I'm the manager. Can I help sort this out?\"\nM — MANAGE the outcome. If removal is needed: \"I need to ask you to finish up for the evening. I'd be happy to call you a rideshare.\" — one time, clearly, calmly. Then document.\n\n───────────────────────────────────────\nDAY 4 SIGN-OFF\n───────────────────────────────────────\nTrainee: _______________ Trainer: _______________ Date: ___________",
      keyPoints: ["TABC manager-level accountability", "Alcohol permit compliance", "Bar cost control metrics", "CALM de-escalation framework", "Variance report monitoring"],
      sequenceOrder: 5,
    },
    {
      title: "Day 5: POS Mastery, Cash Handling & Reconciliation",
      category: "manager",
      section: "Day 5",
      contentType: "procedure",
      content: "═══════════════════════════════════════\nDAY 5 — POS MASTERY, CASH HANDLING & END-OF-NIGHT RECONCILIATION\n═══════════════════════════════════════\n\n───────────────────────────────────────\n{{posSystem}} — MANAGER FUNCTIONS\n───────────────────────────────────────\n\nVOIDS:\n1. Pull the ticket in {{posSystem}}\n2. Select void with reason code\n3. Enter manager PIN\n4. Document: item voided, reason, time, your name\n5. Retain the void record — reviewed in end-of-night report\n\nCOMPS:\n1. Determine comp amount and reason\n2. Apply comp in {{posSystem}} with reason code\n3. Manager PIN required\n4. Document: table, amount, reason, resolution outcome\n5. Comp report reviewed weekly — pattern of high comp rates flagged to owner\n\nDRAWER PULLS AND SAFE DROPS:\n{{safeDropProcedure}}\n\nStandard:\n1. Count drawer before service — confirm starting bank with opening manager\n2. Mid-service pull if drawer exceeds threshold\n3. End of night: count drawer, record total, complete drop slip, deposit in safe\n4. Variance over $10: document before leaving, notify owner if over $25\n\n───────────────────────────────────────\nEND-OF-NIGHT RECONCILIATION CHECKLIST\n───────────────────────────────────────\n□ All POS tickets closed — no open tabs\n□ Void report pulled and reviewed\n□ Comp report pulled and reviewed\n□ All drawers counted and drops completed\n□ Cash drop slip completed and signed\n□ Sales summary pulled from {{posSystem}}\n□ Labor hours pulled from {{schedulingApp}}\n□ Labor cost % calculated for the shift (see Day 6)\n□ Any incidents, complaints, or notable events logged\n□ All staff clocked out\n□ Building secured per closing checklist\n\n───────────────────────────────────────\nTHEFT PREVENTION — WHAT TO WATCH\n───────────────────────────────────────\n\nThe most common restaurant theft is invisible. It doesn't look like cash from a drawer. It looks like consistent voids on one server's tickets, under-rings on high-volume items, or a bartender whose variance report is always slightly off. Watch the patterns, not just the moments.\n\nRED FLAGS:\n• A specific employee with disproportionate void or comp rates\n• Drawer variance that's always slightly short on the same person's shifts\n• Bar variance on one spirit that doesn't match breakage logs\n• Tickets modified after payment on a regular basis\n\n───────────────────────────────────────\nDAY 5 SIGN-OFF\n───────────────────────────────────────\nTrainee: _______________ Trainer: _______________ Date: ___________",
      keyPoints: ["POS void and comp procedures", "Safe drop protocol", "End-of-night reconciliation checklist", "Theft prevention red flags", "Drawer variance documentation"],
      sequenceOrder: 6,
    },
    {
      title: "Day 6: Labor Management, Scheduling & Prime Cost",
      category: "manager",
      section: "Day 6",
      contentType: "procedure",
      content: "═══════════════════════════════════════\nDAY 6 — LABOR MANAGEMENT, SCHEDULING & PRIME COST\n═══════════════════════════════════════\n\n───────────────────────────────────────\nTHE NUMBERS YOU OWN\n───────────────────────────────────────\n\nTarget Labor %: {{laborTargetPct}}\nTarget Food Cost %: {{foodCostTarget}}\nTarget Prime Cost %: {{primeCostTarget}}\n\n\"Prime cost is labor plus food cost as a percentage of total sales. It is the single most important number in your restaurant. If prime cost is under control, everything else is manageable. If it isn't, nothing else matters.\"\n\nPRIME COST FORMULA:\n(Total Labor Cost + Total Food Cost) / Total Sales = Prime Cost %\n\nIf prime cost exceeds {{primeCostTarget}}: identify which component is over — labor or food — and act on that one specifically.\n\n───────────────────────────────────────\nLABOR % — REAL-TIME MANAGEMENT\n───────────────────────────────────────\n\nCALCULATING SHIFT LABOR %:\n(Total hours worked x average hourly rate) / projected sales for shift = labor %\n\nDURING SERVICE LEVERS:\n• Projected sales dropping: cut a shift early — communicate with empathy, document the decision\n• Sales running over: do not add staff mid-shift without calculating the cost impact first\n• Overtime approaching: flag before it happens, never after\n\n───────────────────────────────────────\n{{schedulingApp}} — MANAGER RESPONSIBILITIES\n───────────────────────────────────────\n□ Schedule published minimum 7 days in advance\n□ All positions covered for each shift: server, host, busser, bar, kitchen\n□ No employee scheduled into overtime without owner approval\n□ Availability conflicts resolved before publishing — not the day of\n□ Shift swaps documented in {{schedulingApp}} — verbal swaps are not swaps\n□ Break policy enforced: {{breakPolicy}}\n□ Employee meal policy enforced: {{employeeMealPolicy}}\n\n───────────────────────────────────────\nCUTTING STAFF DURING A SLOW SERVICE\n───────────────────────────────────────\n\nScript:\n\"Hey [name] — it's slowed down more than we expected tonight. I'm going to go ahead and cut you. Thank you for tonight — I'll see you [next scheduled shift].\"\n\n\"A clean, direct cut is a sign of respect. A manager who keeps extra staff on because they're uncomfortable with the conversation is spending $40-80 in unnecessary labor per hour. That's a decision, not a kindness.\"\n\n───────────────────────────────────────\nDAY 6 SIGN-OFF\n───────────────────────────────────────\nTrainee: _______________ Trainer: _______________ Date: ___________",
      keyPoints: ["Prime cost formula and targets", "Real-time labor % calculation", "Scheduling responsibilities checklist", "Staff cutting scripts", "Break and meal policy enforcement"],
      sequenceOrder: 7,
    },
    {
      title: "Day 7: Food Cost, Inventory & Vendor Management",
      category: "manager",
      section: "Day 7",
      contentType: "procedure",
      content: "═══════════════════════════════════════\nDAY 7 — FOOD COST, INVENTORY & VENDOR MANAGEMENT\n═══════════════════════════════════════\n\n───────────────────────────────────────\nFOOD COST — HOW IT WORKS\n───────────────────────────────────────\n\nTarget Food Cost %: {{foodCostTarget}}\n\nFOOD COST FORMULA:\n(Beginning Inventory + Purchases - Ending Inventory) / Total Food Sales = Food Cost %\n\nWHAT MOVES FOOD COST:\n• Portion variance (cooks plating over spec)\n• Waste (prep errors, spoilage, expired product)\n• Theft (unlogged consumption, staff meals off the record)\n• Menu pricing (items priced below cost threshold)\n• Vendor price changes (same product, higher invoice)\n\n───────────────────────────────────────\nINVENTORY — MANAGER'S ROLE\n───────────────────────────────────────\n\nWeekly inventory responsibilities:\n□ Count completed on the same day each week — consistency matters\n□ Count conducted by two people — manager + one other, never alone\n□ Variance from prior week identified and explained before reporting to owner\n□ FIFO verified during count — expired or unlabeled product pulled immediately\n□ Waste log reviewed and reconciled against inventory variance\n\n\"An unexplained inventory variance is not a math problem. It is a management problem. Find the source before it repeats.\"\n\n───────────────────────────────────────\nVENDOR MANAGEMENT\n───────────────────────────────────────\n\nVendor List: {{vendorList}}\n\nManager responsibilities:\n• Receive every delivery personally or designate a trained staff member — never a new hire\n• Check invoice against PO before signing — price changes happen without notice\n• Reject product that doesn't meet spec: wrong temp, wrong count, wrong quality\n• Document all rejections with vendor rep name and date\n• Flag any invoice price increase to owner immediately — do not absorb it silently\n\nA signed delivery receipt is a legal agreement that the product was received as invoiced. Never sign for a delivery you haven't checked.\n\n───────────────────────────────────────\nMENU ENGINEERING BASICS\n───────────────────────────────────────\n\n┌──────────────┬──────────────────────┬──────────────────────┐\n│              │ HIGH POPULARITY      │ LOW POPULARITY       │\n├──────────────┼──────────────────────┼──────────────────────┤\n│ HIGH MARGIN  │ STARS — promote      │ PUZZLES — market more│\n│ LOW MARGIN   │ PLOW HORSES — reprice│ DOGS — remove/reprice│\n└──────────────┴──────────────────────┴──────────────────────┘\n\n\"Menu engineering is not a chef conversation. It's a math conversation. Know which items are Stars and which are Dogs before any menu discussion.\"\n\n───────────────────────────────────────\nDAY 7 SIGN-OFF\n───────────────────────────────────────\nTrainee: _______________ Trainer: _______________ Date: ___________",
      keyPoints: ["Food cost formula and drivers", "Weekly inventory protocol", "Vendor delivery verification", "Invoice and PO reconciliation", "Menu engineering 2x2 matrix"],
      sequenceOrder: 8,
    },
    {
      title: "Day 8: HR, Documentation & TWC Compliance",
      category: "manager",
      section: "Day 8",
      contentType: "procedure",
      content: "═══════════════════════════════════════\nDAY 8 — HR, DOCUMENTATION & TWC COMPLIANCE\n═══════════════════════════════════════\n\n\"A restaurant's biggest legal exposure is almost never a health code issue. It's an HR issue. A termination without documentation. A harassment complaint with no paper trail. A wage dispute with no written policy. The manager who documents correctly protects the business.\"\n\n───────────────────────────────────────\nTHE DOCUMENTATION RULE\n───────────────────────────────────────\n\n\"If it wasn't written down, it didn't happen.\"\n\nEvery HR action requires:\n1. DATE AND TIME of the incident or conversation\n2. NAMES of all parties involved\n3. DESCRIPTION of what occurred — factual, not editorial\n4. ACTION TAKEN — verbal warning, written warning, suspension, termination\n5. EMPLOYEE ACKNOWLEDGMENT — signature or documented refusal to sign\n6. MANAGER SIGNATURE and name\n\n───────────────────────────────────────\nPROGRESSIVE DISCIPLINE SEQUENCE\n───────────────────────────────────────\n\n1. VERBAL WARNING\nDocumented in writing even though it's verbal. Employee signs acknowledgment.\n\n2. WRITTEN WARNING\nSpecific violation, prior warning referenced, expected behavior going forward, consequence if repeated.\n\n3. FINAL WRITTEN WARNING / SUSPENSION\nLast step before termination. Owner notified at this stage.\n\n4. TERMINATION\nOwner approval required. Final pay per Texas law. Documentation complete before the conversation.\n\nTexas is an at-will employment state — but \"at-will\" does not mean undocumented. The TWC will request your documentation in any unemployment or wrongful termination dispute. If you don't have it, the presumption goes against the employer.\n\n───────────────────────────────────────\nTERMINATION PROTOCOL\n───────────────────────────────────────\n\n1. Owner approval confirmed before proceeding\n2. Conduct the conversation privately — never on the floor\n3. Be direct and brief: \"We're letting you go as of today. Here is your final paycheck.\"\n4. Collect keys, access cards, uniforms immediately\n5. Revoke POS and system access same day\n6. Document the conversation: what was said, employee's response\n7. Do not discuss the reason with other staff\n\n───────────────────────────────────────\nMANDATORY DOCUMENTATION TRIGGERS\n───────────────────────────────────────\n□ Any verbal or written warning\n□ Any termination\n□ Any workplace injury — even minor\n□ Any guest complaint involving a specific employee\n□ Any TABC incident\n□ Any cash variance over $25\n□ Any harassment or hostile workplace report\n□ Any accommodation request\n\n───────────────────────────────────────\nORIENTATION PERIOD & EVALUATION SCHEDULE\n───────────────────────────────────────\n• Orientation period: {{orientationPeriod}} days\n• Evaluation schedule: {{evaluationSchedule}}\n• 90-day probation applies to all new hires — see individual role manuals\n• Performance reviews documented and signed by both manager and employee\n\n───────────────────────────────────────\nDAY 8 SIGN-OFF\n───────────────────────────────────────\nTrainee: _______________ Trainer: _______________ Date: ___________",
      keyPoints: ["Documentation rule: 6 required elements", "Progressive discipline 4-step sequence", "Termination protocol", "Mandatory documentation triggers", "TWC compliance requirements"],
      sequenceOrder: 9,
    },
    {
      title: "Day 9: Guest Experience, Complaint Resolution & Crisis Management",
      category: "manager",
      section: "Day 9",
      contentType: "procedure",
      content: "═══════════════════════════════════════\nDAY 9 — GUEST EXPERIENCE, COMPLAINT RESOLUTION & CRISIS MANAGEMENT\n═══════════════════════════════════════\n\n\"A server manages a table. A manager manages the room. Your job is to see the whole floor at once — know which tables are happy, which are waiting too long, and which are about to become a problem — before the problem happens.\"\n\n───────────────────────────────────────\nPROACTIVE TABLE TOUCH PROTOCOL\n───────────────────────────────────────\n\n1. Visit every table within 10 minutes of entree delivery — not to check on the server, to check on the guest\n2. Script: \"Good evening — I'm [name], the manager tonight. How is everything tasting?\"\n3. If the answer is anything less than enthusiastic: stay, dig in, resolve it before they leave\n4. If the answer is great: \"Wonderful — enjoy the rest of your evening.\" Keep moving.\n5. Log any complaint or concern before end of shift\n\n───────────────────────────────────────\nHEAR — MANAGER DEPLOYMENT\n───────────────────────────────────────\n\nH — HEAR THEM OUT COMPLETELY.\nDo not interrupt. Do not explain. Do not defend.\n\nE — EMPATHIZE WITHOUT EXCUSING.\n\"That's not what we want for you, and I'm sorry.\"\n\nA — ACT WITH AUTHORITY.\nA manager has comp power, replacement power, and follow-up power. Use them.\n\nR — RESOLVE AND RETAIN.\nEnd every interaction with a reason to come back.\n\n\"The guest who leaves unhappy and says nothing is more dangerous than the one who complains. The complainer gives you a chance. Chase that chance.\"\n\n───────────────────────────────────────\nCRISIS RESPONSE — QUICK REFERENCE\n───────────────────────────────────────\n\nEmergency Contacts: {{emergencyContacts}}\n\n┌──────────────────────────┬───────────────────────────────┬───────────────────────────────┐\n│ SITUATION                │ FIRST ACTION                  │ SECOND ACTION                 │\n├──────────────────────────┼───────────────────────────────┼───────────────────────────────┤\n│ Medical emergency        │ Call 911 immediately          │ Clear space, notify owner     │\n│ Fire                     │ Evacuate all guests & staff   │ Call 911, do not re-enter     │\n│ Violent guest / fight    │ Call 911 if physical           │ Remove others, document       │\n│ Food safety complaint    │ Isolate the dish/batch        │ Pull from service, document   │\n│ Slip/fall injury         │ Render assistance, call 911   │ Document, photograph area     │\n│ Power/equipment failure  │ Assess food temp safety       │ Notify owner, call contacts   │\n└──────────────────────────┴───────────────────────────────┴───────────────────────────────┘\n\n\"In any crisis, your sequence is: people first, then product, then property, then paperwork. In that order. Every time.\"\n\n───────────────────────────────────────\nONLINE REVIEWS — MANAGER RESPONSE STANDARD\n───────────────────────────────────────\n• Negative reviews responded to within 24 hours — factual, non-defensive, solution-oriented\n• Never argue publicly — acknowledge, apologize for the experience, invite them back\n• Flag patterns (multiple complaints about same server, dish, wait time) to owner\n• Positive reviews acknowledged — a brief thank-you response builds the brand\n\n───────────────────────────────────────\nDAY 9 SIGN-OFF\n───────────────────────────────────────\nTrainee: _______________ Trainer: _______________ Date: ___________",
      keyPoints: ["Table touch protocol — 5-step process", "HEAR complaint framework", "Crisis response quick reference table", "Review response standards", "People-product-property-paperwork priority"],
      sequenceOrder: 10,
    },
    {
      title: "Day 10: Opening/Closing Procedures, Assessment & Certification",
      category: "manager",
      section: "Day 10",
      contentType: "procedure",
      content: "═══════════════════════════════════════\nDAY 10 — OPENING/CLOSING PROCEDURES, ASSESSMENT & CERTIFICATION\n═══════════════════════════════════════\n\n───────────────────────────────────────\nOPENING MANAGER CHECKLIST\n───────────────────────────────────────\n\nBUILDING & SAFETY:\n□ Building secured and alarm deactivated\n□ Walk all areas: dining room, bar, kitchen, restrooms — note any issues\n□ Temperature logs checked: walk-in cooler, freezer, line coolers all at spec\n□ Any equipment issues flagged to owner or maintenance immediately\n\nFOH SETUP:\n□ Reservation sheet or {{reservationSystem}} pulled for the day — VIPs and special occasions noted\n□ Server sections assigned\n□ Host stand stocked\n□ Dining room walked — all tables set to standard\n\nBOH SETUP:\n□ Prep list confirmed with kitchen\n□ Delivery schedule for the day confirmed\n□ Line walk before service: temps, mise en place, station readiness\n\nSTAFF:\n□ Lineup / pre-shift meeting conducted before doors open\n□ Any 86'd items communicated to all staff\n□ Daily specials communicated and confirmed with kitchen\n□ Any staff issues (no-shows, call-outs) covered or escalated\n\n───────────────────────────────────────\nPRE-SHIFT LINEUP — THE 5-MINUTE STANDARD\n───────────────────────────────────────\n\nEvery shift starts with a lineup. Non-negotiable.\n\nCover in 5 minutes:\n1. 86'D ITEMS — what's off the menu tonight and why\n2. SPECIALS — what to recommend and what the food costs\n3. RESERVATIONS — large parties, VIPs, special occasions, dietary flags\n4. FOCUS FOR TONIGHT — one specific standard to reinforce\n5. QUESTIONS — 60 seconds, then everyone gets to work\n\n\"A lineup is not a meeting. It is a calibration. Five minutes before service is worth an hour of correction during it.\"\n\n───────────────────────────────────────\nCLOSING MANAGER CHECKLIST\n───────────────────────────────────────\n\nFINANCIAL:\n□ All POS tickets closed\n□ Void and comp reports pulled and reviewed\n□ All drawers counted, drops completed, variances documented\n□ Safe drop completed per {{safeDropProcedure}}\n□ Sales summary saved\n\nSTAFF:\n□ All staff clocked out in {{schedulingApp}}\n□ Any incidents, complaints, or discipline documented\n□ Tomorrow's opening manager notified of any carryover issues\n\nBUILDING:\n□ All food properly stored, labeled, and dated\n□ Kitchen close-down verified — line walk completed\n□ Bar close verified — ice bin empty, tabs closed, waste log complete\n□ All lights off, equipment secured\n□ Doors locked, alarm set\n\n───────────────────────────────────────\nDAY 10 SIGN-OFF\n───────────────────────────────────────\nTrainee: _______________ Trainer: _______________ Date: ___________",
      keyPoints: ["Opening manager checklist — 4 categories", "Pre-shift lineup 5-minute standard", "Closing manager checklist — 3 categories", "Safe drop and POS reconciliation", "Building security procedures"],
      sequenceOrder: 11,
    },
    {
      title: "Manager Assessment & Certification",
      category: "manager",
      section: "Assessment",
      contentType: "assessment",
      content: "═══════════════════════════════════════\nMANAGER WRITTEN ASSESSMENT\n15 Questions — Pass Requirement: 13 out of 15\n═══════════════════════════════════════\n\nScore below 13 requires additional training days before certification.\n\n1. What are the three numbers that define financial health at {{restaurantName}}? State the targets for each.\n\n2. Walk through the prime cost formula. If food cost is running at 34% and labor at 29%, what is prime cost and what do you do?\n\n3. A server's void rate is 3x the floor average over the past two weeks. Walk through your response.\n\n4. A guest at Table 7 tells you their steak was overcooked and their server was dismissive. Walk through the full HEAR protocol.\n\n5. It's 7:45pm on a Saturday. Ticket times are running 32 minutes on entrees. What are your next three actions in order?\n\n6. A line cook calls out 45 minutes before service. Walk through your decision process.\n\n7. You discover during a mid-shift count that a drawer is $47 short. What do you do?\n\n8. A server tells you a guest mentioned a shellfish allergy after being seated. Walk through every step you take.\n\n9. What is the TABC documentation requirement when you refuse service to a guest?\n\n10. An employee tells you they witnessed a coworker harassing another staff member. Walk through your response and documentation.\n\n11. You need to terminate an employee for repeated no-call/no-shows. Walk through the full protocol from owner approval to final paycheck.\n\n12. What four things do you cover in a pre-shift lineup and why does it happen before service, not during?\n\n13. A health inspector arrives during dinner service. What are your first three actions?\n\n14. Your food cost variance this week is 4 points over target. Name three places you look first.\n\n15. Walk through the full end-of-night reconciliation checklist.\n\n═══════════════════════════════════════\nPRACTICAL EVALUATION\nCompleted by Owner or General Manager\n═══════════════════════════════════════\n\n□ Conducted a pre-shift lineup with staff — covered all 5 required elements\n□ Performed a full table touch sequence during a live service\n□ Calculated shift labor % using actual hours and sales\n□ Completed an end-of-night POS reconciliation — voids, comps, drawer count\n□ Walked through a simulated termination conversation\n□ Demonstrated opening and closing checklist execution\n\nPractical Evaluation Result: □ Pass  □ Additional Days Required\n\n═══════════════════════════════════════\nTRAINER/OWNER DAILY SIGN-OFF SHEET\n═══════════════════════════════════════\n\n┌──────┬───────────────────────────────────────┬──────────┬──────────────┬──────────┐\n│ DAY  │ TOPICS COVERED                        │ TRAINER  │ MGR TRAINEE  │ DATE     │\n├──────┼───────────────────────────────────────┼──────────┼──────────────┼──────────┤\n│ 1    │ Orientation, Leadership, Role Scope    │ ________ │ ____________ │ ________ │\n│ 2    │ FOH Operations: Server, Host, Busser   │ ________ │ ____________ │ ________ │\n│ 3    │ BOH Operations: Kitchen, Food Safety   │ ________ │ ____________ │ ________ │\n│ 4    │ Bar Operations: TABC, Pour Standards   │ ________ │ ____________ │ ________ │\n│ 5    │ POS Mastery, Cash Handling, Reconcile  │ ________ │ ____________ │ ________ │\n│ 6    │ Labor Management, Scheduling, Prime    │ ________ │ ____________ │ ________ │\n│ 7    │ Food Cost, Inventory, Vendors          │ ________ │ ____________ │ ________ │\n│ 8    │ HR, Documentation, TWC Compliance      │ ________ │ ____________ │ ________ │\n│ 9    │ Guest Experience, Complaints, Crisis   │ ________ │ ____________ │ ________ │\n│ 10   │ Opening/Closing, Assessment            │ ________ │ ____________ │ ________ │\n└──────┴───────────────────────────────────────┴──────────┴──────────────┴──────────┘\n\nOwner Final Sign-Off: _______________ Date: ________\n\n═══════════════════════════════════════\n90-DAY PROBATION CARD\n═══════════════════════════════════════\n\nAll management staff operate under a 90-day probationary period beginning on the first day of employment. Certification completes your training — it does not end your probation. Financial performance, staff accountability, documentation compliance, and operational standards are evaluated through day 90. Continued employment in a management role is confirmed at the close of the probationary period by the owner.\n\n═══════════════════════════════════════\nUPON CERTIFICATION\n═══════════════════════════════════════\n\n\"You have spent two weeks learning every station in this building. You know how the server handles a complaint, how the kitchen calls a ticket, how the bartender cuts someone off, and how the host holds a room together.\n\nNow you are responsible for all of it.\n\nThe standard at {{restaurantName}} does not change because the night is hard, the kitchen is short, or the floor is in the weeds. It holds because you hold it.\n\nThat is the job. Own it completely.\"",
      keyPoints: ["15-question written assessment", "13/15 pass requirement", "6-point practical evaluation", "10-day trainer sign-off sheet", "90-day probation card", "Certification closing statement"],
      sequenceOrder: 12,
    },
    {
      title: "Manager Policies & Standards",
      category: "manager",
      section: "Policies",
      contentType: "policy",
      content: "═══════════════════════════════════════\nMANAGER POLICIES & STANDARDS\n{{restaurantName}}\n═══════════════════════════════════════\n\n───────────────────────────────────────\nATTENDANCE & PUNCTUALITY\n───────────────────────────────────────\n• Managers arrive 15 minutes before scheduled shift — no exceptions\n• Call-outs must be communicated to owner/GM directly, not via text to another manager\n• No-call/no-show is grounds for immediate termination review\n• Managers do not leave until closing checklist is complete and signed\n\n───────────────────────────────────────\nPROFESSIONAL CONDUCT\n───────────────────────────────────────\n• Managers do not consume alcohol on shift — ever\n• Personal phone use is prohibited during service hours\n• Relationships with subordinate staff must be disclosed to ownership immediately\n• Managers set the standard — if you wouldn't accept it from a server, don't do it yourself\n\n───────────────────────────────────────\nFINANCIAL ACCOUNTABILITY\n───────────────────────────────────────\n• End-of-night reconciliation is mandatory every shift — not optional on slow nights\n• Comp and void authority carries documentation responsibility — no undocumented comps\n• Cash handling: any variance documented same night, owner notified if over $25\n• Weekly financial reports reviewed before owner meeting\n\n───────────────────────────────────────\nCONFIDENTIALITY\n───────────────────────────────────────\n• Financial data (sales, labor %, food cost) is confidential — not shared with non-management staff\n• Employee HR records, warnings, and termination details are confidential\n• Vendor pricing and contract terms are confidential\n• Violation of confidentiality is grounds for immediate termination\n\n───────────────────────────────────────\nCONFLICT OF INTEREST\n───────────────────────────────────────\n• No personal relationships with vendors that could influence purchasing decisions\n• No accepting gifts, meals, or favors from vendors without owner approval\n• No outside employment with a competing restaurant without disclosure\n\n───────────────────────────────────────\nKEY HOLDER RESPONSIBILITIES\n───────────────────────────────────────\n• Keys and alarm codes are non-transferable — do not share with non-authorized personnel\n• Lost keys must be reported to owner immediately — locks may be re-keyed at manager's expense\n• Alarm code changes communicated by owner only — do not write codes on visible surfaces",
      keyPoints: ["Attendance standards for managers", "Professional conduct expectations", "Financial accountability requirements", "Confidentiality policy", "Conflict of interest rules", "Key holder responsibilities"],
      sequenceOrder: 13,
    },
    {
      title: "Manager Assessment Questions — Study Reference",
      category: "manager",
      section: "Assessments",
      contentType: "assessment",
      content: "═══════════════════════════════════════\nMANAGER KNOWLEDGE ASSESSMENT\nReference Study Guide\n═══════════════════════════════════════\n\nThis section provides the complete question bank for manager training assessments. Trainers may use these for verbal quizzes during training or as a study reference for the Day 10 written test.\n\nFINANCIAL MANAGEMENT:\n• What is prime cost? → Total labor + total food cost as a percentage of total sales\n• What is the target labor %? → {{laborTargetPct}}\n• What is the target food cost %? → {{foodCostTarget}}\n• What is the target prime cost %? → {{primeCostTarget}}\n• How do you calculate shift labor %? → (Total hours x avg hourly rate) / projected sales\n• What is the food cost formula? → (Beginning inventory + purchases - ending inventory) / food sales\n• When do you cut staff during a slow service? → When projected sales indicate labor % will exceed target; communicate directly, document\n• What triggers an owner notification for cash variance? → Over $25\n\nOPERATIONS:\n• What are the 5 pre-shift lineup elements? → 86'd items, specials, reservations, focus for tonight, questions\n• What is the table turn time target? → {{avgTurnTime}} minutes\n• What is the maximum cover count? → {{totalCovers}}\n• When should 86'd items reach all servers? → Immediately via POS or verbal\n• What is the ticket time target for entrees? → 18-22 minutes\n• What is the opening manager's first physical action? → Walk all areas (dining, bar, kitchen, restrooms)\n\nFOOD SAFETY:\n• What is the cold storage requirement? → 40°F or below\n• What is the hot holding requirement? → 135°F or above\n• What is the internal temp for poultry? → 165°F\n• What does FIFO stand for? → First In, First Out\n• Who is responsible for food safety on shift? → The manager on duty\n\nTABC & BAR:\n• What is the alcohol permit type? → {{alcoholPermit}}\n• When do you ID a guest? → When they appear under 30\n• What do you document when refusing service? → Name, time, reason, your initials\n• What is CALM? → Cool the situation, Assess quickly, Lead the resolution, Manage the outcome\n• What bar metric above 3% requires investigation? → Comp/void rate as % of bar sales\n\nHR & DOCUMENTATION:\n• What 6 elements are required for every HR action? → Date/time, names, description, action taken, employee acknowledgment, manager signature\n• What is the progressive discipline sequence? → Verbal warning, written warning, final warning/suspension, termination\n• When is owner approval required for discipline? → At final warning/suspension stage and before any termination\n• What does \"at-will\" mean in practice? → Employment can end at any time, but documentation is still required for TWC compliance\n\nGUEST EXPERIENCE:\n• What is the table touch timeline? → Within 10 minutes of entree delivery\n• What is HEAR? → Hear them out, Empathize without excusing, Act with authority, Resolve and retain\n• What is the crisis priority sequence? → People, product, property, paperwork\n• What is the negative review response timeline? → Within 24 hours\n• What is ROAR? → Recover the moment, Own it, Act, Retain the guest",
      keyPoints: ["Complete study guide for all 10 days", "Financial formulas and targets", "Operations standards", "Food safety requirements", "TABC and bar management", "HR documentation rules", "Guest experience frameworks"],
      sequenceOrder: 14,
    },
  ];

  if (!hasManager) {
    for (const template of managerTemplates) {
      await storage.createTemplate(template);
    }
  }
}

async function seedRestaurantHolidays() {
  await db.execute(sql`
    DELETE FROM restaurant_holidays
    WHERE id NOT IN (
      SELECT MIN(id) FROM restaurant_holidays GROUP BY name
    )
  `);

  const allExisting = await db.select().from(restaurantHolidays);
  const existingNames = new Set(allExisting.map(h => h.name));

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
