import { useMemo, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { FREE_DOMAIN_COUNT, TOTAL_DOMAIN_COUNT } from "@/config/tierConfig";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/hooks/use-admin";
import { useRole } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useOfflineCache, useNetworkStatus } from "@/hooks/use-native-features";
import { hapticTap, isNativeApp } from "@/lib/native";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Crown,
  Users,
  GraduationCap,
  CalendarDays,
  FileText,
  ChefHat,
  DollarSign,
  Star,
  ClipboardList,
  AlertTriangle,
  LogOut,
  MessageSquare,
  ArrowRight,
  BarChart3,
  Shield,
  Calendar,
  Wrench,
  UserCog,
  ChevronDown,
  Menu,
  Share2,
  BookOpen,
  Sparkles,
  Library,
  Briefcase,
  Zap,
  Lock,
  CreditCard,
  ExternalLink,
  Scale,
  BookMarked,
  X,
} from "lucide-react";
import type { Domain } from "@shared/schema";
import { BrandLogoNav } from "@/components/BrandLogo";
import { useTierAccess } from "@/hooks/use-tier-access";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Crown,
  Users,
  GraduationCap,
  CalendarDays,
  FileText,
  ChefHat,
  DollarSign,
  Star,
  ClipboardList,
  AlertTriangle,
  Wrench,
  Share2,
};

interface TimeContext {
  greeting: string;
  subtitle: string;
  prioritySlugs: string[];
  priorityLabel: string;
  prioritySubtitles: Record<string, string>;
}

function getTimeContext(): TimeContext {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const isFriSat = day === 5 || day === 6;
  const isMonday = day === 1;

  let greeting: string;
  let subtitle: string;
  let prioritySlugs: string[] = [];
  let priorityLabel: string;
  let prioritySubtitles: Record<string, string> = {};

  if (hour < 12) {
    greeting = "Good morning";
    subtitle = "Here's what to focus on before service";
  } else if (hour < 17) {
    greeting = "Good afternoon";
    subtitle = "Mid-shift priorities";
  } else {
    greeting = "Good evening";
    subtitle = "Closing out the day";
  }

  if (hour >= 5 && hour < 10) {
    prioritySlugs = ["kitchen", "sops"];
    priorityLabel = "Focus for this morning";
    prioritySubtitles = {
      kitchen: "Start the day right — prep and readiness",
      sops: "Systems check before the rush",
    };
  } else if (hour >= 10 && hour < 14) {
    prioritySlugs = ["service", "staffing"];
    priorityLabel = "Priority right now";
    prioritySubtitles = {
      service: "Lunch service — guest experience first",
      staffing: "Coverage and labor efficiency",
    };
  } else if (hour >= 14 && hour < 17) {
    prioritySlugs = ["costs", "training"];
    priorityLabel = "Pre-dinner priorities";
    prioritySubtitles = {
      costs: "Mid-day review — margins and waste",
      training: "Use the lull to sharpen the team",
    };
  } else if (hour >= 17 && hour < 21) {
    prioritySlugs = ["kitchen", "crisis"];
    priorityLabel = "Priority for tonight";
    prioritySubtitles = {
      kitchen: "Dinner service — stay ahead of the rush",
      crisis: "Be ready for anything tonight",
    };
  } else if (hour >= 21 || hour < 1) {
    prioritySlugs = ["sops", "staffing"];
    priorityLabel = "Closing systems";
    prioritySubtitles = {
      sops: "Close-out checklists and handoff",
      staffing: "Tomorrow's schedule review",
    };
  } else {
    prioritySlugs = ["hr", "facilities"];
    priorityLabel = "Night audit";
    prioritySubtitles = {
      hr: "Documentation and compliance review",
      facilities: "Equipment and maintenance check",
    };
  }

  if (isFriSat && !prioritySlugs.includes("crisis")) {
    prioritySlugs = [...prioritySlugs.slice(0, 1), "crisis"];
    prioritySubtitles["crisis"] = "Weekend volume — be prepared";
  }

  if (isMonday) {
    const mondayExtras = ["costs", "hr"].filter(s => !prioritySlugs.includes(s));
    prioritySlugs = [...prioritySlugs.slice(0, 1), ...mondayExtras.slice(0, 1)];
    prioritySubtitles["costs"] = prioritySubtitles["costs"] || "Monday numbers review";
    prioritySubtitles["hr"] = prioritySubtitles["hr"] || "Start the week clean";
  }

  return { greeting, subtitle, prioritySlugs: prioritySlugs.slice(0, 2), priorityLabel, prioritySubtitles };
}

const VISITED_KEY = "trc_recently_visited";

function getRecentlyVisited(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(VISITED_KEY) || "[]").slice(0, 3);
  } catch { return []; }
}

function trackVisit(slug: string) {
  if (typeof window === "undefined") return;
  try {
    const prev = getRecentlyVisited().filter(s => s !== slug);
    localStorage.setItem(VISITED_KEY, JSON.stringify([slug, ...prev].slice(0, 3)));
  } catch {}
}

function getPlaybookCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const data = localStorage.getItem("trc_playbooks");
    if (!data) return 0;
    return JSON.parse(data).length || 0;
  } catch { return 0; }
}

function getConsultantSessionCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const data = localStorage.getItem("trc_consultant_sessions");
    if (!data) return 0;
    return JSON.parse(data) || 0;
  } catch { return 0; }
}

function getFacilityIssueCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const data = localStorage.getItem("trc_facility_issues");
    if (!data) return 0;
    return JSON.parse(data) || 0;
  } catch { return 0; }
}

const SCHEDULING_TILE = {
  id: -1,
  slug: "scheduling",
  name: "Staff Scheduling",
  description: "Manage your team schedule, staff roster, positions, and announcements.",
  icon: "Calendar",
  sequenceOrder: 4,
};

const APP_SUITE = [
  {
    name: "The Restaurant Consultant",
    tagline: "Full-stack operator platform",
    icon: Crown,
    isCurrent: true,
    url: "",
  },
  {
    name: "Review Responder",
    tagline: "Expert responses to customer reviews",
    icon: Star,
    isCurrent: false,
    url: "https://apps.apple.com",
  },
  {
    name: "ChefScale",
    tagline: "Recipe scaling and food cost tracking",
    icon: Scale,
    isCurrent: false,
    url: "https://apps.apple.com",
  },
  {
    name: "MyCookbook",
    tagline: "Your recipes, organized and scaled",
    icon: BookMarked,
    isCurrent: false,
    url: "https://apps.apple.com",
  },
];

const CONSULTANT_CHIPS = [
  "What's the single most important system I'm probably missing?",
  "We're struggling with food cost. Where do I start?",
  "Help me build a 90-day plan for a new kitchen manager.",
];

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user, logout, isLoading: authLoading } = useAuth();
  const { isAdmin } = useAdmin();
  const { roleLabel, permissions } = useRole();
  const { isDomainLocked, isFreeTier, tier } = useTierAccess();
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    const dismissedAt = localStorage.getItem('upgradeBannerDismissedAt');
    if (!dismissedAt) return false;
    return Date.now() - parseInt(dismissedAt) < 7 * 24 * 60 * 60 * 1000;
  });

  const { data: domainsRaw, isLoading: domainsLoading } = useQuery<Domain[]>({
    queryKey: ["/api/domains"],
  });

  const domains = useOfflineCache("domains", domainsRaw);
  const { isOnline } = useNetworkStatus();

  const timeContext = useMemo(() => getTimeContext(), []);
  const [recentlyVisited, setRecentlyVisited] = useState<string[]>([]);

  useEffect(() => {
    setRecentlyVisited(getRecentlyVisited());
  }, []);

  const priorityDomains = useMemo(() => {
    if (!domains || domains.length === 0) return [];
    return timeContext.prioritySlugs
      .map(slug => domains.find(d => d.slug === slug))
      .filter(Boolean) as Domain[];
  }, [domains, timeContext.prioritySlugs]);

  const orderedTiles = useMemo(() => {
    if (!domains) return [];
    const sorted = [...domains].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    const kitchenIdx = sorted.findIndex(d => d.slug === "kitchen");
    const costIdx = sorted.findIndex(d => d.slug === "costs");
    const staffingIdx = sorted.findIndex(d => d.slug === "staffing");
    const insertPos = Math.max(kitchenIdx, costIdx, staffingIdx) + 1;
    const result: (Domain | typeof SCHEDULING_TILE)[] = [...sorted];
    result.splice(Math.min(insertPos, 3), 0, SCHEDULING_TILE as any);
    return result;
  }, [domains]);

  const needsOnboarding = user && !user.restaurantName;
  const [skippedOnboarding, setSkippedOnboarding] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("onboarding-skipped");
  });

  useEffect(() => {
    if (needsOnboarding && !skippedOnboarding) {
      navigate("/onboarding");
    }
  }, [needsOnboarding, skippedOnboarding, navigate]);

  const handleDomainClick = useCallback((slug: string) => {
    hapticTap();
    trackVisit(slug);
    setRecentlyVisited(getRecentlyVisited());
  }, []);

  const playbooks = useMemo(() => getPlaybookCount(), []);
  const consultantSessions = useMemo(() => getConsultantSessionCount(), []);
  const facilityIssues = useMemo(() => getFacilityIssueCount(), []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f1117" }}>
        <div className="animate-pulse" style={{ color: "#d4a017" }}>Loading...</div>
      </div>
    );
  }

  const tierLabel = tier === "pro" ? "Pro Plan" : tier === "basic" ? "Basic Plan" : "Free Plan";
  const isOwner = roleLabel?.toLowerCase() === "owner";

  return (
    <div className="min-h-screen" style={{ background: "#0f1117" }}>
      {/* Header - preserved */}
      <header
        className="sticky top-0 z-50 backdrop-blur"
        style={{
          background: "rgba(15,17,23,0.95)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <BrandLogoNav />
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-resources-nav">
                    <Library className="h-4 w-4 mr-2" />
                    Resources
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={() => navigate("/templates")} className="cursor-pointer" data-testid="button-templates-nav">
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Templates
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/playbooks")} className="cursor-pointer" data-testid="button-playbooks-nav">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Playbooks
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-tools-nav">
                    <Briefcase className="h-4 w-4 mr-2" />
                    Tools
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {permissions.canAccessFinancials && (
                    <DropdownMenuItem onClick={() => navigate("/financial")} className="cursor-pointer" data-testid="button-financial-nav">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Financial
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate("/certification")} className="cursor-pointer" data-testid="button-certification-nav">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Certification
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link href="/consultant">
                <Button variant="outline" size="sm" data-testid="button-consultant-nav">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Consultant
                </Button>
              </Link>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild className="md:hidden">
                <Button variant="outline" size="icon" data-testid="button-mobile-menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Resources</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigate("/templates")} className="cursor-pointer">
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Templates
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/playbooks")} className="cursor-pointer">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Playbooks
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Tools</DropdownMenuLabel>
                {permissions.canAccessFinancials && (
                  <DropdownMenuItem onClick={() => navigate("/financial")} className="cursor-pointer">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Financial
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate("/certification")} className="cursor-pointer">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Certification
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/consultant")} className="cursor-pointer">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Consultant
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/scheduling")} className="cursor-pointer">
                  <Calendar className="mr-2 h-4 w-4" />
                  Scheduling
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer">
                      <Shield className="mr-2 h-4 w-4" />
                      Admin
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer" data-testid="button-user-menu">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profileImageUrl || undefined} />
                  <AvatarFallback>
                    {user?.firstName?.[0] || user?.email?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-sm text-white">
                    {user?.firstName || user?.email || "User"}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{roleLabel}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: !isFreeTier ? "rgba(184,134,11,0.2)" : "rgba(255,255,255,0.06)", color: !isFreeTier ? "#d4a017" : "rgba(255,255,255,0.5)" }} data-testid="badge-current-plan">
                      {tierLabel}
                    </span>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 hidden sm:block" style={{ color: "rgba(255,255,255,0.4)" }} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate("/profile")}
                  className="cursor-pointer"
                  data-testid="button-profile"
                >
                  <UserCog className="mr-2 h-4 w-4" />
                  Account Settings
                </DropdownMenuItem>
                {!isNativeApp() && (
                  <DropdownMenuItem
                    onClick={() => navigate("/pricing")}
                    className="cursor-pointer"
                    data-testid="button-manage-plan"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    {isFreeTier ? "Upgrade Plan" : "Manage Plan"}
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem
                    onClick={() => navigate("/admin")}
                    className="cursor-pointer"
                    data-testid="button-admin-user-menu"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="text-destructive focus:text-destructive cursor-pointer"
                  data-testid="button-logout"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-10">
        {needsOnboarding && skippedOnboarding && (
          <div
            className="mb-4 p-3 rounded-lg flex items-center justify-between gap-4 flex-wrap"
            style={{ background: "rgba(184,134,11,0.06)", border: "1px solid rgba(184,134,11,0.2)" }}
            data-testid="banner-complete-setup"
          >
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              Complete your restaurant setup to personalize templates and tools.
            </p>
            <Button size="sm" variant="outline" onClick={() => navigate("/onboarding")} data-testid="btn-complete-setup-banner">
              Complete Setup
            </Button>
          </div>
        )}

        {/* Greeting Section */}
        <div className="mb-6 sm:mb-8" style={{ animation: "playbookStaggerIn 0.4s ease both" }}>
          <div className="flex items-center gap-2 mb-1">
            {isOwner && <Crown className="h-6 w-6" style={{ color: "#d4a017", animation: "shimmer 2s ease-in-out" }} />}
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="text-welcome">
              <span style={{ color: "rgba(255,255,255,0.5)" }}>{timeContext.greeting},</span>{" "}
              <span className="text-white">{user?.firstName || "there"}</span>
            </h1>
          </div>
          <p className="text-sm sm:text-[15px] italic" style={{ color: "#b8860b" }} data-testid="text-subtitle">
            {timeContext.subtitle}
          </p>
          <p className="text-[13px] mt-2" style={{ color: "rgba(255,255,255,0.35)" }}>
            <span style={{ color: "#d4a017" }}>{tierLabel}</span>
            {" · "}{roleLabel}
            {user?.restaurantName && <>{" · "}{user.restaurantName}</>}
          </p>
        </div>

        {/* Operator Command Strip */}
        <div
          className="flex gap-3 mb-8 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0"
          style={{ animation: "playbookStaggerIn 0.4s ease 0.08s both" }}
        >
          {[
            {
              label: "Tonight's Priority",
              value: priorityDomains[0]?.name || "—",
              icon: Zap,
              onClick: () => priorityDomains[0] && navigate(`/domain/${priorityDomains[0].slug}`),
            },
            {
              label: "Active Staff",
              value: "— staff",
              icon: Users,
              onClick: () => navigate("/scheduling"),
            },
            {
              label: "Open Issues",
              value: facilityIssues > 0 ? `${facilityIssues} open` : "—",
              icon: Wrench,
              onClick: () => navigate("/domain/facilities"),
            },
            {
              label: "Playbooks Built",
              value: playbooks > 0 ? `${playbooks}` : "—",
              icon: BookOpen,
              onClick: () => navigate("/playbooks"),
            },
            {
              label: "Consultant Sessions",
              value: consultantSessions > 0 ? `${consultantSessions}` : "—",
              icon: MessageSquare,
              onClick: () => navigate("/consultant"),
            },
          ].map((card, idx) => (
            <div
              key={idx}
              className="flex-shrink-0 p-3 rounded-lg cursor-pointer transition-all"
              style={{
                background: "#1a1d2e",
                borderLeft: "3px solid #b8860b",
                minWidth: "160px",
                animation: `playbookStaggerIn 0.4s ease ${0.08 + idx * 0.04}s both`,
              }}
              onClick={card.onClick}
              data-testid={`command-card-${idx}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <card.icon className="h-3.5 w-3.5" style={{ color: "#d4a017" }} />
                <span className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>{card.label}</span>
              </div>
              <p className="text-sm font-semibold text-white truncate">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Priority for Tonight */}
        {priorityDomains.length > 0 && !domainsLoading && (
          <div className="mb-8 sm:mb-10" data-testid="section-priority" style={{ animation: "playbookStaggerIn 0.4s ease 0.16s both" }}>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4" style={{ color: "#d4a017" }} />
              <h2
                className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: "#d4a017" }}
                data-testid="text-priority-label"
              >
                {timeContext.priorityLabel}
              </h2>
              <div className="h-[2px] w-10" style={{ background: "#b8860b" }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {priorityDomains.map((domain) => {
                const IconComponent = iconMap[domain.icon] || ClipboardList;
                const locked = isDomainLocked(domain.slug);
                return (
                  <Link key={domain.id} href={`/domain/${domain.slug}`} onClick={() => handleDomainClick(domain.slug)}>
                    <div
                      className="p-5 rounded-xl cursor-pointer transition-all relative"
                      style={{
                        background: "rgba(184,134,11,0.06)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderTop: "2px solid #b8860b",
                      }}
                      data-testid={`card-priority-${domain.slug}`}
                    >
                      <div className="absolute top-3 right-3">
                        <span
                          className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: "rgba(184,134,11,0.2)",
                            color: "#d4a017",
                            animation: "tonightBadgePulse 2s ease-in-out infinite",
                          }}
                        >
                          Tonight
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg" style={{ background: "rgba(184,134,11,0.1)" }}>
                          <IconComponent className="h-7 w-7" style={{ color: locked ? "rgba(255,255,255,0.3)" : "#d4a017" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[15px] text-white flex items-center gap-2">
                            {domain.name}
                            {locked && <Lock className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />}
                          </h3>
                          <p className="text-xs italic mt-0.5" style={{ color: "#b8860b" }}>
                            {timeContext.prioritySubtitles[domain.slug] || domain.description}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* All Domains Grid */}
        <div className="mb-8 sm:mb-10" style={{ animation: "playbookStaggerIn 0.4s ease 0.24s both" }}>
          <h2 className="text-lg sm:text-xl font-semibold mb-4 tracking-tight text-white">All Domains</h2>
          {domainsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="p-5 rounded-xl" style={{ background: "#1a1d2e" }}>
                  <Skeleton className="h-9 w-9 mb-4 rounded-md" />
                  <Skeleton className="h-5 w-24 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {orderedTiles.map((domain, idx) => {
                const isSchedulingTile = domain.slug === "scheduling";
                const IconComponent = isSchedulingTile ? Calendar : (iconMap[domain.icon] || ClipboardList);
                const locked = isSchedulingTile ? false : isDomainLocked(domain.slug);
                const isPriority = timeContext.prioritySlugs.includes(domain.slug);
                const isVisited = recentlyVisited.includes(domain.slug);
                const href = isSchedulingTile ? "/scheduling" : `/domain/${domain.slug}`;

                return (
                  <Link key={domain.slug} href={href} onClick={() => handleDomainClick(domain.slug)}>
                    <div
                      className="group p-5 rounded-xl cursor-pointer transition-all relative h-full"
                      style={{
                        background: isPriority ? "rgba(184,134,11,0.04)" : "#1a1d2e",
                        border: isPriority ? "1px solid rgba(184,134,11,0.3)" : "1px solid rgba(255,255,255,0.06)",
                        borderTop: isPriority ? "2px solid #b8860b" : undefined,
                        animation: `playbookStaggerIn 0.4s ease ${0.24 + idx * 0.04}s both`,
                      }}
                      data-testid={`card-domain-${domain.slug}`}
                    >
                      {locked && (
                        <div className="absolute top-3 right-3">
                          <Lock className="h-4 w-4" style={{ color: "rgba(255,255,255,0.2)" }} />
                        </div>
                      )}
                      {isVisited && !locked && (
                        <div className="absolute top-3 right-3 w-2 h-2 rounded-full" style={{ background: "#d4a017" }} title="Recently visited" />
                      )}
                      {isPriority && !locked && (
                        <div className="absolute top-3 right-3">
                          <span
                            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(184,134,11,0.2)", color: "#d4a017", animation: "tonightBadgePulse 2s ease-in-out infinite" }}
                          >
                            Tonight
                          </span>
                        </div>
                      )}
                      <div className="mb-4">
                        <IconComponent
                          className="h-9 w-9 transition-transform duration-200 group-hover:scale-[1.08]"
                          style={{ color: locked ? "rgba(255,255,255,0.25)" : "#d4a017" }}
                        />
                      </div>
                      <h3 className="font-semibold text-[15px] mb-1.5 tracking-tight text-white">{domain.name}</h3>
                      <p className="text-[13px] line-clamp-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {locked ? (isNativeApp() ? "Premium domain" : "Upgrade to unlock") : domain.description}
                      </p>
                      <ArrowRight
                        className="absolute bottom-4 right-4 h-4 w-4 transition-all duration-200 group-hover:translate-x-1"
                        style={{ color: "rgba(184,134,11,0.4)" }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {isFreeTier && !domainsLoading && !isNativeApp() && !bannerDismissed && (() => {
          const hasExported = typeof window !== 'undefined' && localStorage.getItem('hasExportedManual');
          const consultantUsedUp = typeof window !== 'undefined' && localStorage.getItem('consultantLimitReached');

          let bannerText = `You're using ${FREE_DOMAIN_COUNT} of ${TOTAL_DOMAIN_COUNT} domains. Unlock everything starting at $10/month.`;
          if (consultantUsedUp) {
            bannerText = "You've used your free consultant messages this month. Unlock unlimited expert guidance.";
          } else if (hasExported) {
            bannerText = "You built your first training manual. Unlock all four role manuals and the full operations toolkit.";
          }

          return (
            <div className="mb-8 sm:mb-10" style={{ animation: "playbookStaggerIn 0.4s ease 0.48s both" }}>
              <div
                className="p-5 rounded-xl flex items-center justify-between gap-4"
                style={{
                  background: "rgba(184,134,11,0.06)",
                  border: "1px solid rgba(184,134,11,0.2)",
                }}
                data-testid="card-upgrade-nudge"
              >
                <Link href="/pricing" className="flex items-center gap-3 min-w-0 cursor-pointer flex-1">
                  <div className="p-2 rounded-lg" style={{ background: "rgba(184,134,11,0.15)" }}>
                    <Sparkles className="h-5 w-5" style={{ color: "#d4a017" }} />
                  </div>
                  <p className="text-sm font-medium text-white">
                    {bannerText}
                  </p>
                </Link>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href="/pricing">
                    <ArrowRight className="h-5 w-5 cursor-pointer" style={{ color: "#d4a017" }} />
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('upgradeBannerDismissedAt', Date.now().toString());
                      }
                      setBannerDismissed(true);
                    }}
                    className="bg-transparent border-none cursor-pointer p-1"
                    style={{ color: '#6b7280' }}
                    data-testid="btn-dismiss-upgrade-banner"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ALSTIG INC App Suite Banner */}
        <div
          className="mb-8 sm:mb-10 p-5 sm:p-6 rounded-xl"
          style={{
            background: "#1a1d2e",
            border: "1px solid rgba(255,255,255,0.06)",
            animation: "playbookStaggerIn 0.4s ease 0.52s both",
          }}
          data-testid="section-app-suite"
        >
          <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4" style={{ color: "#d4a017" }} />
              <h3 className="text-base font-bold text-white">More Tools from The Restaurant Consultant</h3>
            </div>
            <p className="text-[13px] italic" style={{ color: "#b8860b" }}>Built by operators, for operators.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {APP_SUITE.map((app, idx) => (
              <div
                key={idx}
                className="group p-4 rounded-lg relative transition-all"
                style={{
                  background: "#0f1117",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                data-testid={`app-card-${idx}`}
              >
                {app.isCurrent && (
                  <span
                    className="absolute top-3 right-3 text-[9px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(184,134,11,0.3)", color: "#d4a017" }}
                  >
                    You're here
                  </span>
                )}
                <app.icon className="h-7 w-7 mb-3" style={{ color: "#d4a017" }} />
                <p className="font-semibold text-sm text-white mb-1">{app.name}</p>
                <p className="text-[12px] mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>{app.tagline}</p>
                {!app.isCurrent && (
                  <button
                    className="text-[12px] font-medium flex items-center gap-1 transition-colors"
                    style={{ color: "#d4a017" }}
                    onClick={(e) => {
                      e.preventDefault();
                      if (isNativeApp()) {
                        try {
                          (window as any).Capacitor?.Plugins?.App?.openUrl?.({ url: app.url });
                        } catch {
                          window.open(app.url, "_blank");
                        }
                      } else {
                        window.open(app.url, "_blank");
                      }
                    }}
                    data-testid={`app-link-${idx}`}
                  >
                    Open App <ExternalLink className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-[12px] mt-4" style={{ color: "rgba(255,255,255,0.25)" }}>
            All apps by The Restaurant Consultant ·{" "}
            <a href="https://restaurantai.consulting" target="_blank" rel="noopener noreferrer" style={{ color: "#d4a017" }}>
              restaurantai.consulting
            </a>
          </p>
        </div>

        {/* Consultant Bottom Card */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "#1a1d2e",
            border: "1px solid rgba(255,255,255,0.06)",
            borderTop: "3px solid #b8860b",
            animation: "playbookStaggerIn 0.4s ease 0.56s both",
          }}
          data-testid="card-consultant-bottom"
        >
          <div className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg" style={{ background: "rgba(184,134,11,0.1)" }}>
                  <MessageSquare className="h-6 w-6" style={{ color: "#d4a017" }} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">The Consultant</h3>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Ask anything about restaurant operations. No fluff, just practical answers.
                  </p>
                </div>
              </div>
              <Link href="/consultant">
                <Button
                  className="text-white font-semibold flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #b8860b, #d4a017)" }}
                  data-testid="button-open-consultant"
                >
                  Open Consultant
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 sm:overflow-x-auto sm:flex-nowrap">
              {CONSULTANT_CHIPS.map((chip, idx) => (
                <Link
                  key={idx}
                  href={`/consultant?prompt=${encodeURIComponent(chip)}`}
                >
                  <button
                    className="text-[13px] px-3.5 py-2 rounded-full transition-colors flex-shrink-0 text-left"
                    style={{
                      background: "rgba(184,134,11,0.06)",
                      border: "1px solid rgba(184,134,11,0.4)",
                      color: "white",
                    }}
                    data-testid={`consultant-chip-${idx}`}
                  >
                    {chip}
                  </button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
