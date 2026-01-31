import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  UserPlus, 
  Mail, 
  Loader2, 
  Trash2, 
  Crown,
  Building
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Organization {
  id: number;
  name: string;
  ownerId: string;
  isOwner: boolean;
  createdAt: string;
}

interface OrganizationMember {
  id: number;
  organizationId: number;
  userId: string;
  role: string;
  firstName: string;
  lastName: string;
  email: string;
  joinedAt: string;
}

interface OrganizationInvite {
  id: number;
  email: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export default function OrganizationManagement() {
  const { toast } = useToast();
  const [orgName, setOrgName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  const { data: organization, isLoading: orgLoading } = useQuery<Organization | null>({
    queryKey: ["/api/organization"],
  });

  const { data: members = [], isLoading: membersLoading } = useQuery<OrganizationMember[]>({
    queryKey: ["/api/organization/members"],
    enabled: !!organization,
  });

  const { data: invites = [], isLoading: invitesLoading } = useQuery<OrganizationInvite[]>({
    queryKey: ["/api/organization/invites"],
    enabled: !!organization?.isOwner,
  });

  const createOrgMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/organization", { name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      setOrgName("");
      setIsCreating(false);
      toast({
        title: "Organization created",
        description: "Your organization has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create organization.",
        variant: "destructive",
      });
    },
  });

  const sendInviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/organization/invite", { email });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/invites"] });
      setInviteEmail("");
      setIsInviting(false);
      toast({
        title: "Invite sent",
        description: "An invitation email has been sent.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation.",
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/organization/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/members"] });
      toast({
        title: "Member removed",
        description: "The team member has been removed from your organization.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member.",
        variant: "destructive",
      });
    },
  });

  const handleCreateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (orgName.trim()) {
      createOrgMutation.mutate(orgName.trim());
    }
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteEmail.trim()) {
      sendInviteMutation.mutate(inviteEmail.trim());
    }
  };

  if (orgLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!organization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Team Organization
          </CardTitle>
          <CardDescription>
            Create an organization to share HR documents with your team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isCreating ? (
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <Input
                  placeholder="Organization name (e.g., Mouton's Bistro)"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  data-testid="input-org-name"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={createOrgMutation.isPending || !orgName.trim()}
                  data-testid="btn-confirm-create-org"
                >
                  {createOrgMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Create Organization
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreating(false)}
                  data-testid="btn-cancel-create-org"
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button onClick={() => setIsCreating(true)} data-testid="btn-create-org">
              <Building className="h-4 w-4 mr-2" />
              Create Organization
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Organization
        </CardTitle>
        <CardDescription>
          {organization.isOwner 
            ? "Manage your team members and invite new people to collaborate"
            : "You are a member of this organization"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-3">
          <Building className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium" data-testid="text-org-name">{organization.name}</span>
          {organization.isOwner && (
            <Badge variant="secondary" data-testid="badge-owner">
              <Crown className="h-3 w-3 mr-1" />
              Owner
            </Badge>
          )}
        </div>

        <Separator />

        <div>
          <h4 className="text-sm font-medium mb-3">Team Members ({members.length})</h4>
          {membersLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div 
                  key={member.id} 
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                  data-testid={`member-${member.userId}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                      {member.firstName?.[0]}{member.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {member.firstName} {member.lastName}
                        {member.role === "owner" && (
                          <Crown className="h-3 w-3 inline ml-1 text-amber-500" />
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  {organization.isOwner && member.role !== "owner" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          data-testid={`btn-remove-member-${member.userId}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove {member.firstName} {member.lastName} from your organization? 
                            They will lose access to shared documents.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeMemberMutation.mutate(member.userId)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {organization.isOwner && (
          <>
            <Separator />

            <div>
              <h4 className="text-sm font-medium mb-3">Invite Team Members</h4>
              {isInviting ? (
                <form onSubmit={handleSendInvite} className="space-y-3">
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    data-testid="input-invite-email"
                  />
                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      disabled={sendInviteMutation.isPending || !inviteEmail.trim()}
                      data-testid="btn-confirm-invite"
                    >
                      {sendInviteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Mail className="h-4 w-4 mr-2" />
                      )}
                      Send Invite
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsInviting(false)}
                      data-testid="btn-cancel-invite"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <Button variant="outline" onClick={() => setIsInviting(true)} data-testid="btn-invite-member">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Team Member
                </Button>
              )}
            </div>

            {invites.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3">Pending Invitations</h4>
                  {invitesLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <div className="space-y-2">
                      {invites.filter(i => i.status === "pending").map((invite) => (
                        <div 
                          key={invite.id} 
                          className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                          data-testid={`invite-${invite.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm">{invite.email}</p>
                              <p className="text-xs text-muted-foreground">
                                Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary">Pending</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
