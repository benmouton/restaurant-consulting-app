import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/hooks/use-admin";
import { useRole } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  CreditCard
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

function getTimeContext(): { greeting: string; subtitle: string; prioritySlugs: string[]; priorityLabel: string } {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const isFriSat = day === 5 || day === 6;
  const isMonday = day === 1;

  let greeting: string;
  let subtitle: string;
  let prioritySlugs: string[] = [];
  let priorityLabel: string;

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

  if (hour < 11) {
    prioritySlugs = ["staffing", "kitchen"];
    priorityLabel = "Focus for this morning";
  } else if (hour < 15) {
    prioritySlugs = ["service", "costs"];
    priorityLabel = "Priority right now";
  } else if (hour < 17) {
    prioritySlugs = ["staffing", "training"];
    priorityLabel = "Pre-dinner priorities";
  } else {
    prioritySlugs = ["service", "kitchen"];
    priorityLabel = "Priority for tonight";
  }

  if (isFriSat && !prioritySlugs.includes("crisis")) {
    prioritySlugs = [...prioritySlugs.slice(0, 2), "crisis"];
  }

  if (isMonday) {
    const mondayExtras = ["costs", "hr"].filter(s => !prioritySlugs.includes(s));
    prioritySlugs = [...prioritySlugs.slice(0, 1), ...mondayExtras.slice(0, 2)];
  }

  return { greeting, subtitle, prioritySlugs: prioritySlugs.slice(0, 3), priorityLabel };
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user, logout, isLoading: authLoading } = useAuth();
  const { isAdmin } = useAdmin();
  const { roleLabel, permissions } = useRole();
  const { isDomainLocked, isFreeTier, tier } = useTierAccess();
  
  const { data: domains, isLoading: domainsLoading } = useQuery<Domain[]>({
    queryKey: ["/api/domains"],
  });

  const timeContext = useMemo(() => getTimeContext(), []);

  const priorityDomains = useMemo(() => {
    if (!domains || domains.length === 0) return [];
    const matched = timeContext.prioritySlugs
      .map(slug => domains.find(d => d.slug === slug))
      .filter(Boolean) as Domain[];
    if (matched.length >= 2) return matched;
    const fallback = domains.filter(d => !matched.some(m => m.id === d.id)).slice(0, 3 - matched.length);
    return [...matched, ...fallback];
  }, [domains, timeContext.prioritySlugs]);

  const needsOnboarding = user && !user.restaurantName;
  const [skippedOnboarding, setSkippedOnboarding] = useState(() => !!localStorage.getItem("onboarding-skipped"));

  useEffect(() => {
    if (needsOnboarding && !skippedOnboarding) {
      navigate("/onboarding");
    }
  }, [needsOnboarding, skippedOnboarding, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 glass-header z-50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2">
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
              <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1 rounded-lg hover-elevate cursor-pointer" data-testid="button-user-menu">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profileImageUrl || undefined} />
                  <AvatarFallback>
                    {user?.firstName?.[0] || user?.email?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-sm">
                    {user?.firstName || user?.email || "User"}
                  </span>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs" data-testid="badge-user-role">
                      {roleLabel}
                    </Badge>
                    <Link href="/pricing">
                      <Badge 
                        variant={isFreeTier ? "outline" : "default"} 
                        className={`text-xs cursor-pointer ${!isFreeTier ? 'bg-primary/90 text-primary-foreground' : ''}`}
                        data-testid="badge-current-plan"
                      >
                        {tier === "free" ? "Free Plan" : tier === "basic" ? "Basic Plan" : tier === "pro" ? "Pro Plan" : "Free Plan"}
                      </Badge>
                    </Link>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
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
                <DropdownMenuItem 
                  onClick={() => navigate("/pricing")}
                  className="cursor-pointer"
                  data-testid="button-manage-plan"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {isFreeTier ? "Upgrade Plan" : "Manage Plan"}
                </DropdownMenuItem>
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

      <main className="container mx-auto px-4 py-6 sm:py-10">
        {needsOnboarding && skippedOnboarding && (
          <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between gap-4 flex-wrap" data-testid="banner-complete-setup">
            <p className="text-sm text-muted-foreground">
              Complete your restaurant setup to personalize templates and tools.
            </p>
            <Button size="sm" variant="outline" onClick={() => navigate("/onboarding")} data-testid="btn-complete-setup-banner">
              Complete Setup
            </Button>
          </div>
        )}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 tracking-tight" data-testid="text-welcome">
            {timeContext.greeting}{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground" data-testid="text-subtitle">
            {timeContext.subtitle}
          </p>
        </div>

        {priorityDomains.length > 0 && !domainsLoading && (
          <div className="mb-8 sm:mb-10" data-testid="section-priority">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground" data-testid="text-priority-label">
                {timeContext.priorityLabel}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {priorityDomains.map((domain) => {
                const IconComponent = iconMap[domain.icon] || ClipboardList;
                const locked = isDomainLocked(domain.slug);
                return (
                  <Link key={domain.id} href={`/domain/${domain.slug}`}>
                    <Card 
                      className={`premium-card hover-elevate cursor-pointer h-full border-l-2 ${locked ? 'border-l-muted-foreground/30 opacity-75' : 'border-l-primary'}`}
                      data-testid={`card-priority-${domain.slug}`}
                    >
                      <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                        <div className={`p-2 rounded-md flex-shrink-0 ${locked ? 'bg-muted' : 'bg-primary/10'}`}>
                          <IconComponent className={`h-6 w-6 ${locked ? 'text-muted-foreground' : 'text-primary'}`} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base tracking-tight flex items-center gap-2">
                            {domain.name}
                            {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {locked ? "Upgrade to unlock" : domain.description}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-auto" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-8 sm:mb-10">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 tracking-tight">All Domains</h2>
          {domainsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {[...Array(10)].map((_, i) => (
                <Card key={i} className="premium-card">
                  <CardContent className="p-5 sm:p-7">
                    <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 mb-4 rounded-md" />
                    <Skeleton className="h-5 w-24 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {domains?.map((domain) => {
                const IconComponent = iconMap[domain.icon] || ClipboardList;
                const locked = isDomainLocked(domain.slug);
                return (
                  <Link key={domain.id} href={locked ? "/pricing" : `/domain/${domain.slug}`}>
                    <Card 
                      className={`premium-card hover-elevate cursor-pointer h-full relative ${locked ? 'opacity-75' : ''}`}
                      data-testid={`card-domain-${domain.slug}`}
                    >
                      {locked && (
                        <div className="absolute top-3 right-3">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <CardContent className="p-5 sm:p-7">
                        <div className="mb-4">
                          <IconComponent className={`h-10 w-10 sm:h-12 sm:w-12 ${locked ? 'text-muted-foreground' : 'text-primary'}`} />
                        </div>
                        <h3 className="font-semibold text-sm sm:text-base mb-2 tracking-tight">{domain.name}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                          {locked ? "Upgrade to unlock this domain" : domain.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <Card className="premium-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-md bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                Staff Scheduling
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <p className="text-muted-foreground mb-4 text-sm">
                Manage your team schedule, staff roster, positions, and announcements.
              </p>
              <Link href="/scheduling">
                <Button data-testid="button-open-scheduling">
                  Open Scheduling
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-md bg-primary/10">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                Consultant
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <p className="text-muted-foreground mb-4 text-sm">
                Ask the consultant anything about restaurant operations. No fluff, just practical answers.
              </p>
              <Link href="/consultant">
                <Button data-testid="button-open-consultant">
                  Open Consultant
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
