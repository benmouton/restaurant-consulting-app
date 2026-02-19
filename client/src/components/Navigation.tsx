import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { useAdmin } from "@/hooks/use-admin";
import { useSubscription } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";
import { LayoutDashboard, BookOpen, LogOut, Building2, Shield, CreditCard, Settings, ChevronDown, UserCog, MessageSquare, Download, Share, Plus, ArrowUp, X } from "lucide-react";
import { BrandLogoNav } from "@/components/BrandLogo";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function Navigation() {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const { roleLabel } = useRole();
  const { isAdmin } = useAdmin();
  const { subscriptionStatus } = useSubscription();
  const { canShowInstallOption, canPromptNative, isIOS, promptInstall } = usePwaInstall();
  const [showIOSDialog, setShowIOSDialog] = useState(false);

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/manual", label: "Operations Manual", icon: BookOpen },
    ...(isAdmin ? [{ href: "/admin", label: "Admin Dashboard", icon: Settings }] : []),
  ];

  return (
    <>
    <nav className="fixed left-0 top-0 z-50 flex h-16 w-full items-center justify-between border-b bg-white/80 px-4 backdrop-blur-md transition-all lg:h-full lg:w-72 lg:flex-col lg:border-r lg:border-b-0 lg:px-6 lg:py-8">
      {/* Brand */}
      <div className="lg:w-full lg:mb-10">
        <BrandLogoNav />
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
            {canShowInstallOption && (
              <DropdownMenuItem
                onClick={async () => {
                  if (canPromptNative) {
                    await promptInstall();
                  } else if (isIOS) {
                    setShowIOSDialog(true);
                  }
                }}
                className="cursor-pointer"
                data-testid="button-install-app"
              >
                <Download className="mr-2 h-4 w-4" />
                Install App
              </DropdownMenuItem>
            )}
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

    <Dialog open={showIOSDialog} onOpenChange={setShowIOSDialog}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add to Home Screen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary shrink-0">
              <Share className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">1. Tap the Share button</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                Look for <ArrowUp className="h-3 w-3 inline" /> at the bottom of Safari
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary shrink-0">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">2. Tap "Add to Home Screen"</p>
              <p className="text-xs text-muted-foreground">Scroll down in the share menu to find it</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary shrink-0">
              <Download className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">3. Tap "Add"</p>
              <p className="text-xs text-muted-foreground">Confirm to add the app to your homescreen</p>
            </div>
          </div>
        </div>
        <Button onClick={() => setShowIOSDialog(false)} className="w-full mt-2" data-testid="button-ios-install-close">
          Got it
        </Button>
      </DialogContent>
    </Dialog>
    </>
  );
}
