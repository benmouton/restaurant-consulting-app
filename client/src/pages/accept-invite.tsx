import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { BrandLogoFull } from "@/components/BrandLogo";
import { Loader2, Users, CheckCircle, XCircle, MessageSquare, ArrowRight } from "lucide-react";

interface InviteDetails {
  organizationName: string;
  email: string;
  recipientName?: string;
  personalMessage?: string;
  inviterName?: string;
  relationship?: string;
}

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [acceptedOrg, setAcceptedOrg] = useState<string | null>(null);

  const { data: inviteDetails, isLoading: inviteLoading, error: inviteError } = useQuery<InviteDetails>({
    queryKey: ["/api/organization/invite", token],
    queryFn: async () => {
      const res = await fetch(`/api/organization/invite/${token}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Invalid or expired invite");
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const acceptInviteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/organization/accept-invite", { token });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      setAcceptedOrg(data.organization?.name || inviteDetails?.organizationName);
      toast({
        title: "Welcome to the team!",
        description: "You now have access to shared documents.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation.",
        variant: "destructive",
      });
    },
  });

  const handleAcceptInvite = () => {
    acceptInviteMutation.mutate();
  };

  const inviterDisplay = inviteDetails?.inviterName || "A team member";
  const recipientDisplay = inviteDetails?.recipientName || "";

  if (authLoading || inviteLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 gap-6">
        <BrandLogoFull />
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle data-testid="text-invite-title">
              {recipientDisplay 
                ? `Hey ${recipientDisplay}, ${inviterDisplay} invited you!` 
                : "You're Invited!"}
            </CardTitle>
            <CardDescription>
              Sign in to accept your invitation to join {inviteDetails?.organizationName || "the team"} on The Restaurant Consultant.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {inviteDetails?.personalMessage && (
              <div className="bg-muted/50 p-4 rounded-md space-y-2">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground font-medium">{inviterDisplay}'s message:</p>
                </div>
                <p className="text-sm whitespace-pre-line" data-testid="text-personal-message">
                  {inviteDetails.personalMessage}
                </p>
              </div>
            )}
            <Button 
              className="w-full" 
              onClick={() => {
                const returnTo = encodeURIComponent(window.location.pathname);
                window.location.href = `/api/login?returnTo=${returnTo}`;
              }}
              data-testid="btn-login-to-accept"
            >
              Sign in to Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 gap-6">
        <BrandLogoFull />
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              {(inviteError as Error).message || "This invitation link is invalid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => navigate("/")}
              data-testid="btn-go-home"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (acceptedOrg) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 gap-6">
        <BrandLogoFull />
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle data-testid="text-welcome-title">Welcome to {acceptedOrg}!</CardTitle>
            <CardDescription>
              You now have access to shared HR documents and can collaborate with your team.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full" 
              onClick={() => navigate("/domain/accountability")}
              data-testid="btn-view-documents"
            >
              View HR Documents
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => navigate("/")}
              data-testid="btn-go-dashboard"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 gap-6">
      <BrandLogoFull />
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle data-testid="text-join-title">
            {recipientDisplay 
              ? `Hey ${recipientDisplay}, join ${inviteDetails?.organizationName}` 
              : `Join ${inviteDetails?.organizationName}`}
          </CardTitle>
          <CardDescription>
            {inviterDisplay} invited you to collaborate on The Restaurant Consultant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {inviteDetails?.personalMessage && (
            <>
              <div className="bg-muted/50 p-4 rounded-md space-y-2">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground font-medium">{inviterDisplay}'s message:</p>
                </div>
                <p className="text-sm whitespace-pre-line" data-testid="text-personal-message">
                  {inviteDetails.personalMessage}
                </p>
              </div>
              <Separator />
            </>
          )}

          <div className="bg-muted/50 p-4 rounded-md text-center">
            <p className="text-sm text-muted-foreground">Invitation for:</p>
            <p className="font-medium" data-testid="text-invite-email">{inviteDetails?.email}</p>
          </div>
          
          <Button 
            className="w-full" 
            onClick={handleAcceptInvite}
            disabled={acceptInviteMutation.isPending}
            data-testid="btn-accept-invite"
          >
            {acceptInviteMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Joining...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Accept Invitation
              </>
            )}
          </Button>
          
          <Button 
            variant="ghost" 
            className="w-full" 
            onClick={() => navigate("/")}
            data-testid="btn-decline-invite"
          >
            Decline
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
