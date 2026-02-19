import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  UserPlus, 
  Mail, 
  Loader2, 
  Trash2, 
  Crown,
  Building,
  RefreshCw,
  Clock,
  AlertTriangle
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
  firstName: string | null;
  lastName: string | null;
  email: string;
  profileImageUrl: string | null;
  joinedAt: string;
}

interface OrganizationInvite {
  id: number;
  email: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

const orgRoleOptions = [
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "shift_lead", label: "Shift Lead" },
  { value: "viewer", label: "Viewer" },
];

function getOrgRoleLabel(role: string): string {
  return orgRoleOptions.find(r => r.value === role)?.label || role;
}

function getMemberDisplayName(member: OrganizationMember): string {
  if (member.firstName && member.lastName) return `${member.firstName} ${member.lastName}`;
  if (member.firstName) return member.firstName;
  if (member.email) return member.email.split("@")[0];
  return member.email || "Team Member";
}

function isMemberProfileIncomplete(member: OrganizationMember): boolean {
  return !(member.firstName && member.lastName);
}

function getMemberInitials(member: OrganizationMember): string {
  if (member.firstName && member.lastName) return `${member.firstName[0]}${member.lastName[0]}`;
  if (member.firstName) return member.firstName[0];
  if (member.email) return member.email[0].toUpperCase();
  return "?";
}

function isInviteExpired(expiresAt: string): boolean {
  return new Date() > new Date(expiresAt);
}

export default function OrganizationManagement() {
  const { toast } = useToast();
  const [orgName, setOrgName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
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
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const response = await apiRequest("POST", "/api/organization/invite", { email, role });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/invites"] });
      setInviteEmail("");
      setInviteRole("viewer");
      setIsInviting(false);
      toast({
        title: "Invite sent",
        description: "Invitation sent! It expires in 7 days.",
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

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest("PATCH", `/api/organization/members/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/members"] });
      toast({
        title: "Role updated",
        description: "Team member role has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role.",
        variant: "destructive",
      });
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId: number) => {
      await apiRequest("DELETE", `/api/organization/invites/${inviteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/invites"] });
      toast({
        title: "Invite cancelled",
        description: "The pending invitation has been cancelled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel invitation.",
        variant: "destructive",
      });
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (inviteId: number) => {
      const response = await apiRequest("POST", `/api/organization/invites/${inviteId}/resend`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/invites"] });
      toast({
        title: "Invite resent",
        description: "A fresh invitation has been sent. It expires in 7 days.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resend invitation.",
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
      sendInviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
    }
  };

  const handleResendAllExpired = () => {
    const expiredInvites = invites.filter(i => i.status === "pending" && isInviteExpired(i.expiresAt));
    expiredInvites.forEach(invite => {
      resendInviteMutation.mutate(invite.id);
    });
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
              <div className="flex gap-2 flex-wrap">
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

  const pendingInvites = invites.filter(i => i.status === "pending");
  const expiredCount = pendingInvites.filter(i => isInviteExpired(i.expiresAt)).length;

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
        <div className="flex items-center gap-3 flex-wrap">
          <Building className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium break-words" data-testid="text-org-name">{organization.name}</span>
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
              {members.map((member) => {
                const displayName = getMemberDisplayName(member);
                const profileIncomplete = isMemberProfileIncomplete(member);
                return (
                  <div 
                    key={member.id} 
                    className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-md"
                    data-testid={`member-${member.userId}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="h-8 w-8 shrink-0">
                        {member.profileImageUrl ? (
                          <AvatarImage src={member.profileImageUrl} alt={displayName} />
                        ) : null}
                        <AvatarFallback className="text-xs">
                          {getMemberInitials(member)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate" data-testid={`text-member-name-${member.userId}`}>
                            {displayName}
                            {member.role === "owner" && (
                              <Crown className="h-3 w-3 inline ml-1 text-amber-500" />
                            )}
                          </p>
                          {profileIncomplete && (
                            <Badge variant="secondary" className="text-xs">
                              Profile incomplete
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs" data-testid={`badge-role-${member.userId}`}>
                            {getOrgRoleLabel(member.role)}
                          </Badge>
                        </div>
                        {member.email && !profileIncomplete && (
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {organization.isOwner && member.role !== "owner" && (
                        <>
                          <Select
                            value={member.role}
                            onValueChange={(newRole) => updateRoleMutation.mutate({ userId: member.userId, role: newRole })}
                          >
                            <SelectTrigger className="w-[120px]" data-testid={`select-role-${member.userId}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {orgRoleOptions.filter(r => r.value !== "owner").map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                                  Are you sure you want to remove {displayName} from your organization? 
                                  They will lose access to shared documents.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => removeMemberMutation.mutate(member.userId)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
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
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger data-testid="select-invite-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="shift_lead">Shift Lead</SelectItem>
                      <SelectItem value="viewer">Viewer (Read-only)</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2 flex-wrap">
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

            {pendingInvites.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <h4 className="text-sm font-medium">Pending Invitations ({pendingInvites.length})</h4>
                    {expiredCount > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResendAllExpired}
                        disabled={resendInviteMutation.isPending}
                        data-testid="btn-resend-all-expired"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Resend All Expired ({expiredCount})
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Invitations expire after 7 days. Resend to generate a new link.
                  </p>
                  {invitesLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <div className="space-y-2">
                      {pendingInvites.map((invite) => {
                        const expired = isInviteExpired(invite.expiresAt);
                        return (
                          <div 
                            key={invite.id} 
                            className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-md"
                            data-testid={`invite-${invite.id}`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm truncate">{invite.email}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  {expired ? (
                                    <>
                                      <AlertTriangle className="h-3 w-3 text-destructive" />
                                      <span className="text-destructive">Expired {new Date(invite.expiresAt).toLocaleDateString()}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="h-3 w-3" />
                                      Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge
                                variant={expired ? "destructive" : "secondary"}
                                data-testid={`badge-invite-status-${invite.id}`}
                              >
                                {expired ? "Expired" : "Pending"}
                              </Badge>
                              {expired && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => resendInviteMutation.mutate(invite.id)}
                                  disabled={resendInviteMutation.isPending}
                                  data-testid={`btn-resend-invite-${invite.id}`}
                                >
                                  {resendInviteMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  ) : (
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                  )}
                                  Resend
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => cancelInviteMutation.mutate(invite.id)}
                                disabled={cancelInviteMutation.isPending}
                                data-testid={`btn-cancel-invite-${invite.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
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
