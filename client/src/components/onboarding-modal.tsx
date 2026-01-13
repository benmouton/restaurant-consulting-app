import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChefHat, Loader2 } from "lucide-react";
import type { User } from "@shared/models/auth";

interface OnboardingModalProps {
  user: User;
}

export function OnboardingModal({ user }: OnboardingModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [restaurantName, setRestaurantName] = useState(user.restaurantName || "");

  const isOpen = !user.restaurantName;

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; restaurantName: string }) => {
      const res = await fetch("/api/auth/user", {
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
      toast({
        title: "Welcome to Restaurant Consultant!",
        description: `Your templates will now be personalized for ${updatedUser.restaurantName}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !restaurantName.trim()) {
      toast({
        title: "Required fields",
        description: "Please enter both your name and restaurant name.",
        variant: "destructive",
      });
      return;
    }
    updateProfileMutation.mutate({ firstName: firstName.trim(), restaurantName: restaurantName.trim() });
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <ChefHat className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">Welcome to Restaurant Consultant</DialogTitle>
          </div>
          <DialogDescription>
            Let's personalize your experience. Your restaurant name will be used throughout all training templates and materials.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Your Name</Label>
            <Input
              id="firstName"
              placeholder="Enter your name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              data-testid="input-first-name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="restaurantName">Restaurant Name</Label>
            <Input
              id="restaurantName"
              placeholder="Enter your restaurant name"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              data-testid="input-restaurant-name"
              required
            />
            <p className="text-xs text-muted-foreground">
              This name will replace example restaurant names in all templates.
            </p>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={updateProfileMutation.isPending}
            data-testid="btn-complete-setup"
          >
            {updateProfileMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Setting up...
              </>
            ) : (
              "Complete Setup"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
