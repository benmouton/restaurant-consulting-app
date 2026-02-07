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
  Sparkles
} from "lucide-react";
import type { Domain } from "@shared/schema";
import logoImage from "@/assets/logo.png";

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

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user, logout, isLoading: authLoading } = useAuth();
  const { isAdmin } = useAdmin();
  const { roleLabel, permissions } = useRole();
  
  const { data: domains, isLoading: domainsLoading } = useQuery<Domain[]>({
    queryKey: ["/api/domains"],
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with glassmorphism */}
      <header className="border-b border-border sticky top-0 glass-header z-50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <img src={logoImage} alt="The AI Restaurant Consultant" className="h-9 w-9 rounded-xl object-contain flex-shrink-0 ring-1 ring-primary/20" />
            <span className="font-bold text-sm sm:text-base tracking-tight truncate">The AI Restaurant Consultant</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              <Link href="/templates">
                <Button variant="outline" size="sm" data-testid="button-templates-nav">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Templates
                </Button>
              </Link>
              <Link href="/playbooks">
                <Button variant="outline" size="sm" data-testid="button-playbooks-nav">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Playbooks
                </Button>
              </Link>
              {permissions.canAccessFinancials && (
                <Link href="/financial">
                  <Button variant="outline" size="sm" data-testid="button-financial-nav">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Financial
                  </Button>
                </Link>
              )}
              <Link href="/certification">
                <Button variant="outline" size="sm" data-testid="button-certification-nav">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Certification
                </Button>
              </Link>
              <Link href="/consultant">
                <Button variant="outline" size="sm" data-testid="button-consultant-nav">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Ask Consultant
                </Button>
              </Link>
              {isAdmin && (
                <Link href="/admin">
                  <Button variant="outline" size="sm" data-testid="button-admin-nav">
                    <Shield className="h-4 w-4 mr-2" />
                    Admin
                  </Button>
                </Link>
              )}
            </div>
            
            {/* Mobile Navigation Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="md:hidden">
                <Button variant="outline" size="icon" data-testid="button-mobile-menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Navigation</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/templates")} className="cursor-pointer">
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Templates
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/playbooks")} className="cursor-pointer">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Playbooks
                </DropdownMenuItem>
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
                <DropdownMenuItem onClick={() => navigate("/consultant")} className="cursor-pointer">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Ask Consultant
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/scheduling")} className="cursor-pointer">
                  <Calendar className="mr-2 h-4 w-4" />
                  Scheduling
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer">
                    <Shield className="mr-2 h-4 w-4" />
                    Admin
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-muted cursor-pointer" data-testid="button-user-menu">
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
                  <Badge variant="secondary" className="text-xs" data-testid="badge-user-role">
                    {roleLabel}
                  </Badge>
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-10 sm:py-16">
        {/* Welcome - Premium typography */}
        <div className="mb-10 sm:mb-14">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 tracking-tight">
            Welcome{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
            Select a domain to explore frameworks, checklists, and scripts.
          </p>
        </div>

        {/* Domains Grid - Premium Cards */}
        <div className="mb-12 sm:mb-16">
          <h2 className="text-xl sm:text-2xl font-semibold mb-6 tracking-tight">Operational Domains</h2>
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
                return (
                  <Link key={domain.id} href={`/domain/${domain.slug}`}>
                    <Card 
                      className="premium-card hover-elevate cursor-pointer h-full"
                      data-testid={`card-domain-${domain.slug}`}
                    >
                      <CardContent className="p-5 sm:p-7">
                        <div className="mb-4">
                          <IconComponent className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                        </div>
                        <h3 className="font-semibold text-sm sm:text-base mb-2 tracking-tight">{domain.name}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                          {domain.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Scheduling Section - Premium Card */}
        <Card className="mb-6 premium-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
              <div className="p-2 rounded-md bg-primary/10">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              Staff Scheduling
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <p className="text-muted-foreground mb-5 text-sm sm:text-base">
              Manage your team schedule, staff roster, positions, and announcements. 
              Build shifts, track open coverage, and keep your team informed.
            </p>
            <Link href="/scheduling">
              <Button data-testid="button-open-scheduling">
                Open Scheduling
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Quick Access: AI Consultant - Premium Card */}
        <Card className="premium-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
              <div className="p-2 rounded-md bg-primary/10">
                <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              AI Consultant
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <p className="text-muted-foreground mb-5 text-sm sm:text-base">
              Got a specific question? Ask the consultant anything about restaurant operations. 
              No fluff, just practical answers.
            </p>
            <Link href="/consultant">
              <Button data-testid="button-open-consultant">
                Open Consultant
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
