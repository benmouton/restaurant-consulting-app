import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { LayoutDashboard, BookOpen, LogOut, UtensilsCrossed } from "lucide-react";

export function Navigation() {
  const [location] = useLocation();
  const { logout, user } = useAuth();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/manual", label: "Operations Manual", icon: BookOpen },
  ];

  return (
    <nav className="fixed left-0 top-0 z-50 flex h-16 w-full items-center justify-between border-b bg-white/80 px-4 backdrop-blur-md transition-all lg:h-full lg:w-72 lg:flex-col lg:border-r lg:border-b-0 lg:px-6 lg:py-8">
      {/* Brand */}
      <div className="flex items-center gap-3 lg:w-full lg:mb-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <UtensilsCrossed className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-primary">Mouton's Bistro</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Staff Portal</p>
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

      {/* Mobile Menu Placeholder (simplified for this generation) */}
      <div className="lg:hidden">
        {/* Mobile menu trigger would go here */}
      </div>

      {/* User & Logout */}
      <div className="hidden w-full border-t pt-6 lg:mt-auto lg:block">
        <div className="mb-4 flex items-center gap-3 px-2">
          <div className="h-10 w-10 overflow-hidden rounded-full border border-border bg-muted">
             {user?.profileImageUrl ? (
               <img src={user.profileImageUrl} alt="Profile" className="h-full w-full object-cover" />
             ) : (
               <div className="flex h-full w-full items-center justify-center bg-primary text-xs font-bold text-primary-foreground">
                 {user?.firstName?.[0]}{user?.lastName?.[0]}
               </div>
             )}
          </div>
          <div className="overflow-hidden">
            <p className="truncate text-sm font-semibold text-foreground">{user?.firstName} {user?.lastName}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </nav>
  );
}
