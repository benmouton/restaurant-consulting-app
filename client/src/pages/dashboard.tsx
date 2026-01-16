import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/hooks/use-admin";
import { useRole } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  Shield
} from "lucide-react";
import type { Domain } from "@shared/schema";

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
};

export default function Dashboard() {
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
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-primary" />
            <span className="font-bold">The Restaurant Consultant</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/templates">
              <Button variant="outline" size="sm" data-testid="button-templates-nav">
                <GraduationCap className="h-4 w-4 mr-2" />
                Templates
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
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback>
                  {user?.firstName?.[0] || user?.email?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm">
                  {user?.firstName || user?.email || "User"}
                </span>
                <Badge variant="secondary" className="text-xs" data-testid="badge-user-role">
                  {roleLabel}
                </Badge>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => logout()}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="text-muted-foreground">
            Select a domain to explore frameworks, checklists, and scripts.
          </p>
        </div>

        {/* Domains Grid */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Operational Domains</h2>
          {domainsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-8 w-8 mb-3" />
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {domains?.map((domain) => {
                const IconComponent = iconMap[domain.icon] || ClipboardList;
                return (
                  <Link key={domain.id} href={`/domain/${domain.slug}`}>
                    <Card 
                      className="hover-elevate cursor-pointer h-full transition-all"
                      data-testid={`card-domain-${domain.slug}`}
                    >
                      <CardContent className="pt-6">
                        <IconComponent className="h-8 w-8 text-primary mb-3" />
                        <h3 className="font-semibold text-sm mb-1">{domain.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
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

        {/* Quick Access: AI Consultant */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              AI Consultant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
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
