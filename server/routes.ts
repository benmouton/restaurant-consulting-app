import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Integrations
  await setupAuth(app);
  registerAuthRoutes(app);
  registerChatRoutes(app);
  registerImageRoutes(app);

  // Manual Routes
  app.get(api.manual.list.path, isAuthenticated, async (req, res) => {
    const sections = await storage.getManualSections();
    res.json(sections);
  });

  app.get(api.manual.get.path, isAuthenticated, async (req, res) => {
    const section = await storage.getManualSection(Number(req.params.id));
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }
    res.json(section);
  });

  // Progress Routes
  app.get(api.progress.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const progress = await storage.getUserProgress(userId);
    res.json(progress);
  });

  app.post(api.progress.mark.path, isAuthenticated, async (req: any, res) => {
    try {
      const { sectionId } = api.progress.mark.input.parse(req.body);
      const userId = req.user.claims.sub;
      const progress = await storage.markSectionAsRead(userId, sectionId);
      res.status(201).json(progress);
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

  // Seed Data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingSections = await storage.getManualSections();
  if (existingSections.length > 0) return;

  const sections = [
    {
      title: "SECTION 1: HOW WE THINK ABOUT THE JOB HERE",
      content: `Our Core Rule\nYour job is not just to do tasks — it’s to protect the system.\nEvery role exists for one reason:\nTo give guests a consistent, smooth, and confident experience — even on bad days.\nIf something feels chaotic, slow, or unclear, it’s usually a system problem, not a people problem. Your responsibility is to follow the system exactly and flag breakdowns immediately.`,
      category: "Core Philosophy",
      sequenceOrder: 1,
      role: "ALL"
    },
    {
      title: "SECTION 2: EXECUTION FIRST, FIX LATER",
      content: `Two-Speed Rule (Non-Negotiable)\nSpeed A: Guest Experience (FAST)\nGuests always come first\nWe do not argue, debate, or investigate while a guest is waiting\nFix the moment, not the mystery\n\nSpeed B: Corrections & Coaching (LATER)\nMistakes are reviewed after service\nSystems are adjusted outside guest view\nCoaching never happens in front of guests\n\nWhat This Means for You\nDuring service: execute\nAfter service: explain, report, improve`,
      category: "Operations",
      sequenceOrder: 2,
      role: "ALL"
    },
    {
      title: "SECTION 3: FAILURE POINT AWARENESS",
      content: `What We Train For\nWe do not assume perfect days.\nWe train for where things usually go wrong.\nCommon failure points:\nOrders not entered correctly or on time\nTickets dying in the kitchen window\nTables stalling without updates\nFood running without verification\nGuests feeling ignored during waits\n\nYour Responsibility\nIf you see a breakdown:\nStabilize the guest experience\nAlert a lead or manager\nDocument or communicate what failed\nDo not:\nCover up errors\nBlame coworkers\n“Hope it fixes itself”`,
      category: "Problem Solving",
      sequenceOrder: 3,
      role: "ALL"
    },
    {
      title: "SECTION 4: ROLE CLARITY & OWNERSHIP",
      content: `One Role = One Outcome\nYou are responsible for:\nYour station\nYour tickets\nYour tables\nYour communication\n\nYou are not responsible for:\nFixing the entire restaurant\nDoing someone else’s job unless directed\nMaking judgment calls outside your role\nIf you’re unsure — ask early, not late.`,
      category: "Roles",
      sequenceOrder: 4,
      role: "ALL"
    },
    {
      title: "SECTION 5: TIME = VALUE (WHY PACING MATTERS)",
      content: `What We Sell\nWe don’t just sell food.\nWe sell time, flow, and comfort.\nEvery minute a guest waits without information:\nLowers trust\nIncreases frustration\nReduces return likelihood\n\nServer Expectations\nGreet promptly\nSet expectations early (“Food is about X minutes”)\nUpdate guests before they ask\nClose checks smoothly and confidently\nSilence feels like neglect to guests — even if the kitchen is busy.`,
      category: "Service Standards",
      sequenceOrder: 5,
      role: "FOH"
    },
    {
      title: "SECTION 6: SYSTEMS OVER HEROICS",
      content: `The Anti-Hero Rule\nWe do not rely on:\nMemory\nGuessing\n“I thought someone else did it”\nOne strong person saving the shift\n\nWe rely on:\nPOS accuracy\nChecklists\nClear handoffs\nVerbal confirmations\n\nIf the system says:\nEnter it → ENTER IT\nCheck it → CHECK IT\nCall it → CALL IT\nDoing it “your way” breaks consistency.`,
      category: "Operations",
      sequenceOrder: 6,
      role: "ALL"
    },
    {
      title: "SECTION 7: COMMUNICATION STANDARDS",
      content: `Clear Beats Clever\nUse:\nDirect language\nShort confirmations\nEye contact and verbal acknowledgment\nExamples:\n“Order is in.”\n“Table 12 needs a check.”\n“Running food for 14.”\n“Guest waiting on manager.”\n\nAvoid:\nVague signals\nAssumptions\nSide conversations during service`,
      category: "Communication",
      sequenceOrder: 7,
      role: "ALL"
    },
    {
      title: "SECTION 8: AUTHORITY WITHOUT ATTITUDE",
      content: `How Leadership Works Here\nAuthority comes from:\nSystems\nRoles\nResponsibility\n\nNot:\nVolume\nEmotion\nSeniority alone\n\nIf someone reminds you of a process:\nAcknowledge it\nCorrect it\nMove on\nDefensiveness slows the team.`,
      category: "Culture",
      sequenceOrder: 8,
      role: "ALL"
    },
    {
      title: "SECTION 9: PROFESSIONALISM UNDER PRESSURE",
      content: `Pressure Is Expected\nBusy nights are not emergencies.\nThey are planned stress.\nProfessional behavior means:\nCalm voice\nClean language\nFocused movement\nNo public frustration\nGuests judge the restaurant by how we act when it’s busy — not when it’s slow.`,
      category: "Culture",
      sequenceOrder: 9,
      role: "ALL"
    },
    {
      title: "SECTION 10: REPORTING & CONTINUOUS IMPROVEMENT",
      content: `What We Want You to Speak Up About\nRepeated guest complaints\nConfusing procedures\nBottlenecks\nEquipment issues\nMenu confusion\n\nHow to Report\nAfter service\nTo a lead or manager\nWith facts, not blame\nExample:\n“Table 23 waited because tickets backed up at expo — maybe we need clearer calls.”`,
      category: "Feedback",
      sequenceOrder: 10,
      role: "ALL"
    },
    {
      title: "SECTION 11: THE STANDARD",
      content: `We don’t aim for perfect.\nWe aim for repeatable excellence.\nThat means:\nSame experience on a Tuesday or Saturday\nSame confidence no matter who’s on shift\nSame professionalism even when things go wrong\nIf you follow the system, we have your back.`,
      category: "Core Philosophy",
      sequenceOrder: 11,
      role: "ALL"
    },
    {
      title: "FINAL EXPECTATION",
      content: `Do the system right.\nCommunicate clearly.\nProtect the guest experience.\nImprove after the shift.`,
      category: "Summary",
      sequenceOrder: 12,
      role: "ALL"
    }
  ];

  for (const section of sections) {
    await storage.createManualSection(section);
  }
}
