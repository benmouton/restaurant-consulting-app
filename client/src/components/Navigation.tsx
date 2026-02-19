import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { useAdmin } from "@/hooks/use-admin";
import { useSubscription } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";
import { LayoutDashboard, BookOpen, LogOut, Building2, Shield, CreditCard, Settings, ChevronDown, UserCog, MessageSquare } from "lucide-react";
import logoImage from "@/assets/logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export function Navigation() {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const { roleLabel } = useRole();
  const { isAdmin } = useAdmin();
  const { subscriptionStatus } = useSubscription();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/manual", label: "Operations Manual", icon: BookOpen },
    ...(isAdmin ? [{ href: "/admin", label: "Admin Dashboard", icon: Settings }] : []),
  ];

  return (
    <nav className="fixed left-0 top-0 z-50 flex h-16 w-full items-center justify-between border-b bg-white/80 px-4 backdrop-blur-md transition-all lg:h-full lg:w-72 lg:flex-col lg:border-r lg:border-b-0 lg:px-6 lg:py-8">
      {/* Brand */}
      <div className="flex items-center gap-3 lg:w-full lg:mb-10">
        <img src={logoImage} alt="Restaurant Operations Consulting" className="h-12 w-12 rounded-lg object-contain" />
        <div>
          <h1 className="font-display text-sm font-bold tracking-tight text-primary leading-tight">Restaurant Ops<br/>Consulting</h1>
        </div>
      </div>

      {/* Links */}
      <div className="hidden items-center gap-2 lg:flex lg:w-full lg:flex-col lg:items-stretch lg:gap-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn(
              "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
              isActive 
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/10" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}>
              <item.icon className={cn("h-5 w-5", isActive ? "text-accent" : "text-muted-foreground group-hover:text-foreground")} />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* User & Logout */}
      <div className="lg:mt-auto lg:w-full lg:border-t lg:pt-6">
        <DropdownMenu modal={true}>
          <DropdownMenuTrigger 
            className="flex w-full items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
            data-testid="button-user-menu"
          >
            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-border bg-muted">
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary text-xs font-bold text-primary-foreground">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-hidden text-left">
              <p className="truncate text-sm font-semibold text-foreground">{user?.firstName} {user?.lastName}</p>
              <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <div className="px-2 py-2 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Restaurant:</span>
                <span className="font-medium truncate">{user?.restaurantName || "Not set"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Role:</span>
                <Badge variant="secondary" className="text-xs">{roleLabel}</Badge>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2 text-sm">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="default" className="text-xs">Admin</Badge>
                </div>
              )}
              {subscriptionStatus && (
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Subscription:</span>
                  <Badge variant={subscriptionStatus === "active" ? "default" : "secondary"} className="text-xs capitalize">
                    {subscriptionStatus}
                  </Badge>
                </div>
              )}
            </div>
            
            <DropdownMenuSeparator />
            <Link href="/messages">
              <DropdownMenuItem 
                className="cursor-pointer"
                data-testid="button-messages"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Team Messages
              </DropdownMenuItem>
            </Link>
            <Link href="/profile">
              <DropdownMenuItem 
                className="cursor-pointer"
                data-testid="button-profile"
              >
                <UserCog className="mr-2 h-4 w-4" />
                Account Settings
              </DropdownMenuItem>
            </Link>
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
    </nav>
  );
}
