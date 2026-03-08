import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import OnboardingPage from "@/pages/onboarding";
import { SubscriptionGate } from "@/components/subscription-gate";
import { RoleGate } from "@/components/role-gate";
import { USER_ROLES } from "@shared/models/auth";
import { isNativeApp } from "@/lib/native";
import { useBiometric } from "@/hooks/use-native-features";
import { OfflineBanner } from "@/components/OfflineBanner";
import { OnboardingProgressBar } from "@/components/onboarding/OnboardingProgressBar";
import { Shield, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import DomainPage from "@/pages/domain";
import ConsultantPage from "@/pages/consultant";
import TemplatesPage from "@/pages/templates";
import PlaybooksPage from "@/pages/playbooks";
import FinancialPage from "@/pages/financial";
import PrimeCostPage from "@/pages/prime-cost";
import TrainingLogPage from "@/pages/training-log";
import SopGeneratorPage from "@/pages/sop-generator";
import MenuEngineeringPage from "@/pages/menu-engineering";
import SchedulingPage from "@/pages/scheduling";
import SubscriptionPage from "@/pages/subscription";
import SubscriptionSuccessPage from "@/pages/subscription-success";
import SubscriptionCancelPage from "@/pages/subscription-cancel";
import AdminDashboard from "@/pages/admin";
import EmployeeLoginPage from "@/pages/employee-login";
import EmployeeAcceptInvitePage from "@/pages/employee-accept-invite";
import EmployeePortalPage from "@/pages/employee-portal";
import AcceptInvitePage from "@/pages/accept-invite";
import MessagesPage from "@/pages/messages";
import ProfilePage from "@/pages/profile";
import PrivacyPolicy from "@/pages/privacy";
import DataDeletion from "@/pages/data-deletion";
import TermsOfService from "@/pages/terms";
import SupportPage from "@/pages/support";
import AppsPage from "@/pages/apps";
import CertificationPage from "@/pages/certification";
import TestAccessPage from "@/pages/test-access";
import ReviewLoginPage from "@/pages/review-login";
import LoginPage from "@/pages/login";
import NativeLoginPage from "@/pages/native-login";
import PricingPage from "@/pages/pricing";
import NotFound from "@/pages/not-found";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { TestAccessBanner } from "@/components/TestAccessBanner";

function ProtectedPage({ component: Component }: { component: React.ComponentType }) {
  return (
    <SubscriptionGate>
      <Component />
    </SubscriptionGate>
  );
}

function PaidProtectedPage({ component: Component }: { component: React.ComponentType }) {
  return (
    <SubscriptionGate requirePaid>
      <Component />
    </SubscriptionGate>
  );
}

function BiometricGuard({ children }: { children: React.ReactNode }) {
  const { enabled, verified, verify } = useBiometric();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isNativeApp()) {
      setChecked(true);
      return;
    }
    if (!enabled) {
      setChecked(true);
      return;
    }
    if (verified) {
      setChecked(true);
      return;
    }
    verify().then(() => setChecked(true));
  }, [enabled, verified, verify]);

  if (!checked && isNativeApp() && enabled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 p-6">
          <div className="p-4 rounded-full bg-primary/10 inline-flex">
            <Fingerprint className="h-12 w-12 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Locked</h2>
          <p className="text-muted-foreground text-sm">Authenticate to continue</p>
          <Button onClick={() => verify().then(() => setChecked(true))} data-testid="button-unlock">
            <Shield className="h-4 w-4 mr-2" />
            Unlock
          </Button>
        </div>
      </div>
    );
  }

  if (isNativeApp() && enabled && !verified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 p-6">
          <div className="p-4 rounded-full bg-primary/10 inline-flex">
            <Fingerprint className="h-12 w-12 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Authentication Required</h2>
          <p className="text-muted-foreground text-sm">Use Face ID or Touch ID to unlock</p>
          <Button onClick={() => verify()} data-testid="button-unlock">
            <Shield className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function Router() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (location === "/support") return <SupportPage />;
  if (location === "/apps") return <AppsPage />;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <OfflineBanner />
      <TestAccessBanner />
      {user && <OnboardingProgressBar />}
      <Switch>
        <Route path="/">
          {user ? <Dashboard /> : <Landing />}
        </Route>
        <Route path="/onboarding">
          {user ? <OnboardingPage user={user} /> : <Landing />}
        </Route>
        <Route path="/subscribe" component={SubscriptionPage} />
        <Route path="/pricing" component={PricingPage} />
        <Route path="/subscription/success" component={SubscriptionSuccessPage} />
        <Route path="/subscription/cancel" component={SubscriptionCancelPage} />
        <Route path="/domain/:slug">
          {user ? <ProtectedPage component={DomainPage} /> : <Landing />}
        </Route>
        <Route path="/consultant">
          {user ? <ProtectedPage component={ConsultantPage} /> : <Landing />}
        </Route>
        <Route path="/training-log">
          {user ? <PaidProtectedPage component={TrainingLogPage} /> : <Landing />}
        </Route>
        <Route path="/sop-generator">
          {user ? <PaidProtectedPage component={SopGeneratorPage} /> : <Landing />}
        </Route>
        <Route path="/menu-engineering">
          {user ? <PaidProtectedPage component={MenuEngineeringPage} /> : <Landing />}
        </Route>
        <Route path="/templates">
          {user ? <ProtectedPage component={TemplatesPage} /> : <Landing />}
        </Route>
        <Route path="/playbooks">
          {user ? <PaidProtectedPage component={PlaybooksPage} /> : <Landing />}
        </Route>
        <Route path="/scheduling">
          {user ? <PaidProtectedPage component={SchedulingPage} /> : <Landing />}
        </Route>
        <Route path="/financial/prime-cost">
          {user ? (
            <PaidProtectedPage component={() => (
              <RoleGate requiredRole={USER_ROLES.OWNER}>
                <PrimeCostPage />
              </RoleGate>
            )} />
          ) : <Landing />}
        </Route>
        <Route path="/financial">
          {user ? (
            <PaidProtectedPage component={() => (
              <RoleGate requiredRole={USER_ROLES.OWNER}>
                <FinancialPage />
              </RoleGate>
            )} />
          ) : <Landing />}
        </Route>
        <Route path="/admin">
          {user ? <ProtectedPage component={AdminDashboard} /> : <Landing />}
        </Route>
        <Route path="/profile">
          {user ? <ProtectedPage component={ProfilePage} /> : <Landing />}
        </Route>
        <Route path="/messages">
          {user ? <ProtectedPage component={MessagesPage} /> : <Landing />}
        </Route>
        <Route path="/certification">
          {user ? <ProtectedPage component={CertificationPage} /> : <Landing />}
        </Route>
        {/* Public Pages */}
        <Route path="/login" component={LoginPage} />
        <Route path="/native-login" component={NativeLoginPage} />
        <Route path="/review-login" component={ReviewLoginPage} />
        <Route path="/test-access/:token" component={TestAccessPage} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/data-deletion" component={DataDeletion} />
        <Route path="/terms" component={TermsOfService} />
        <Route path="/support" component={SupportPage} />
        <Route path="/apps" component={AppsPage} />
        {/* Organization invite acceptance */}
        <Route path="/accept-invite/:token" component={AcceptInvitePage} />
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
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <BiometricGuard>
            <Router />
          </BiometricGuard>
          <PwaInstallBanner />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
