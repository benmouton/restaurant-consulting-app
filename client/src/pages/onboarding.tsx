import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ChefHat, Loader2, Crown, Users, ClipboardList, ArrowRight, ArrowLeft, SkipForward } from "lucide-react";
import { USER_ROLES, type User, type UserRole } from "@shared/models/auth";
import { BrandLogoNav, BrandLogoWithTagline } from "@/components/BrandLogo";

interface OnboardingPageProps {
  user: User & { isTestUser?: boolean };
}

const roleDescriptions = {
  [USER_ROLES.OWNER]: {
    title: "Owner",
    description: "Full access to all features including financial analysis, P&L tools, and strategic planning",
    icon: Crown,
  },
  [USER_ROLES.GENERAL_MANAGER]: {
    title: "General Manager",
    description: "Access to operations, training, staff management, and daily reporting tools",
    icon: Users,
  },
  [USER_ROLES.MANAGER]: {
    title: "Manager",
    description: "Access to shift operations, checklists, and team communication tools",
    icon: ClipboardList,
  },
};

export default function OnboardingPage({ user }: OnboardingPageProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [restaurantName, setRestaurantName] = useState(user.restaurantName || "");
  const [role, setRole] = useState<UserRole>(USER_ROLES.OWNER);

  const totalSteps = 3;

  const isTestUser = !!(user as any).isTestUser;

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; phone: string; restaurantName: string; role: UserRole }) => {
      const endpoint = isTestUser ? "/api/test-access/user" : "/api/auth/user";
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/auth/user"], updatedUser);
      localStorage.removeItem("onboarding-skipped");
      toast({
        title: "Welcome to The Restaurant Consultant!",
        description: `Your experience is now personalized for ${updatedUser.restaurantName}.`,
      });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!firstName.trim() || !phone.trim() || !restaurantName.trim()) {
      toast({
        title: "Required fields",
        description: "Please fill in all fields before continuing.",
        variant: "destructive",
      });
      return;
    }
    updateProfileMutation.mutate({ firstName: firstName.trim(), phone: phone.trim(), restaurantName: restaurantName.trim(), role });
  };

  const canProceed = () => {
    if (step === 1) return firstName.trim().length > 0 && phone.trim().length > 0;
    if (step === 2) return restaurantName.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <BrandLogoNav />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            localStorage.setItem("onboarding-skipped", "true");
            navigate("/");
          }}
          className="text-muted-foreground"
          data-testid="btn-skip-onboarding"
        >
          <SkipForward className="h-4 w-4 mr-1" />
          Skip for now
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="flex items-center justify-center gap-2 mb-8">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i + 1 <= step ? "bg-primary w-12" : "bg-muted w-8"
                }`}
                data-testid={`progress-step-${i + 1}`}
              />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                  <BrandLogoWithTagline />
                </div>
                <h1 className="text-2xl font-bold tracking-tight" data-testid="text-onboarding-title">Let's get you set up</h1>
                <p className="text-muted-foreground mt-1">Tell us about yourself so we can personalize your experience.</p>
              </div>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Your Name</Label>
                    <Input
                      id="firstName"
                      placeholder="Enter your name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      data-testid="input-first-name"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      data-testid="input-phone"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold tracking-tight" data-testid="text-onboarding-restaurant">Your Restaurant</h1>
                <p className="text-muted-foreground mt-1">This name will be used throughout all templates and materials.</p>
              </div>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="restaurantName">Restaurant Name</Label>
                    <Input
                      id="restaurantName"
                      placeholder="Enter your restaurant name"
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                      data-testid="input-restaurant-name"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      This replaces example restaurant names in all templates.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold tracking-tight" data-testid="text-onboarding-role">Your Role</h1>
                <p className="text-muted-foreground mt-1">This determines which tools and features you see.</p>
              </div>
              <RadioGroup value={role} onValueChange={(value) => setRole(value as UserRole)} className="space-y-3">
                {Object.entries(roleDescriptions).map(([roleKey, roleInfo]) => {
                  const Icon = roleInfo.icon;
                  return (
                    <Card
                      key={roleKey}
                      className={`cursor-pointer transition-colors ${
                        role === roleKey ? "border-primary bg-primary/5" : "hover-elevate"
                      }`}
                      onClick={() => setRole(roleKey as UserRole)}
                      data-testid={`role-option-${roleKey}`}
                    >
                      <CardContent className="p-4 flex items-start gap-3">
                        <RadioGroupItem value={roleKey} id={roleKey} className="mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            <Label htmlFor={roleKey} className="font-medium cursor-pointer">
                              {roleInfo.title}
                            </Label>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{roleInfo.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </RadioGroup>
            </div>
          )}

          <div className="flex items-center justify-between mt-8 gap-4">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)} data-testid="btn-onboarding-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            ) : (
              <div />
            )}
            <Button
              onClick={handleNext}
              disabled={!canProceed() || updateProfileMutation.isPending}
              data-testid="btn-onboarding-next"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : step === totalSteps ? (
                "Complete Setup"
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Step {step} of {totalSteps}
          </p>
        </div>
      </div>
    </div>
  );
}
