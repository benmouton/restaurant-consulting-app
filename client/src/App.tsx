import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { OnboardingModal } from "@/components/onboarding-modal";
import { SubscriptionGate } from "@/components/subscription-gate";
import { RoleGate } from "@/components/role-gate";
import { USER_ROLES } from "@shared/models/auth";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import DomainPage from "@/pages/domain";
import ConsultantPage from "@/pages/consultant";
import TemplatesPage from "@/pages/templates";
import FinancialPage from "@/pages/financial";
import SchedulingPage from "@/pages/scheduling";
import SubscriptionPage from "@/pages/subscription";
import SubscriptionSuccessPage from "@/pages/subscription-success";
import SubscriptionCancelPage from "@/pages/subscription-cancel";
import AdminDashboard from "@/pages/admin";
import EmployeeLoginPage from "@/pages/employee-login";
import EmployeeAcceptInvitePage from "@/pages/employee-accept-invite";
import EmployeePortalPage from "@/pages/employee-portal";
import ProfilePage from "@/pages/profile";
import PrivacyPolicy from "@/pages/privacy";
import DataDeletion from "@/pages/data-deletion";
import TermsOfService from "@/pages/terms";
import NotFound from "@/pages/not-found";

function ProtectedPage({ component: Component }: { component: React.ComponentType }) {
  return (
    <SubscriptionGate>
      <Component />
    </SubscriptionGate>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {user && <OnboardingModal user={user} />}
      <Switch>
        <Route path="/" component={user ? Dashboard : Landing} />
        <Route path="/subscribe" component={SubscriptionPage} />
        <Route path="/subscription/success" component={SubscriptionSuccessPage} />
        <Route path="/subscription/cancel" component={SubscriptionCancelPage} />
        <Route path="/domain/:slug">
          {user ? <ProtectedPage component={DomainPage} /> : <Landing />}
        </Route>
        <Route path="/consultant">
          {user ? <ProtectedPage component={ConsultantPage} /> : <Landing />}
        </Route>
        <Route path="/templates">
          {user ? <ProtectedPage component={TemplatesPage} /> : <Landing />}
        </Route>
        <Route path="/scheduling">
          {user ? <ProtectedPage component={SchedulingPage} /> : <Landing />}
        </Route>
        <Route path="/financial">
          {user ? (
            <SubscriptionGate>
              <RoleGate requiredRole={USER_ROLES.OWNER}>
                <FinancialPage />
              </RoleGate>
            </SubscriptionGate>
          ) : <Landing />}
        </Route>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/profile">
          {user ? <ProfilePage /> : <Landing />}
        </Route>
        {/* Public Pages */}
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/data-deletion" component={DataDeletion} />
        <Route path="/terms" component={TermsOfService} />
        {/* Employee Portal Routes - separate from main app auth */}
        <Route path="/employee/login" component={EmployeeLoginPage} />
        <Route path="/employee/accept-invite" component={EmployeeAcceptInvitePage} />
        <Route path="/employee" component={EmployeePortalPage} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
