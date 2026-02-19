import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAdmin } from "@/hooks/use-admin";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, DollarSign, TrendingUp, Shield, ArrowLeft, Trash2, Eye, X, Building, Link2, Copy, Ban, RefreshCw, Plus, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserInfo {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  restaurantName: string | null;
  role: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  createdAt: string | null;
}

interface Stats {
  totalUsers: number;
  activeSubscribers: number;
  totalRevenue: number;
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

interface TestAccessToken {
  id: number;
  token: string;
  name: string;
  email: string | null;
  accessLevel: string;
  durationDays: number;
  createdAt: string;
  expiresAt: string;
  status: string;
  usedAt: string | null;
  userId: string | null;
  createdBy: string;
  revokedAt: string | null;
}

export default function AdminDashboard() {
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [userToRemove, setUserToRemove] = useState<UserInfo | null>(null);
  const [testName, setTestName] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testDuration, setTestDuration] = useState("7");
  const [generatedLink, setGeneratedLink] = useState("");
  const [showLinkField, setShowLinkField] = useState(false);

  const { data: allUsers, isLoading: usersLoading } = useQuery<UserInfo[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAdmin,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAdmin,
  });

  const { data: orgMembers = [] } = useQuery<OrganizationMember[]>({
    queryKey: ["/api/organization/members"],
    enabled: isAdmin,
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setUserToRemove(null);
      setSelectedUser(null);
      toast({
        title: "User deleted",
        description: "The user has been permanently removed from the platform.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user.",
        variant: "destructive",
      });
    },
  });

  const { data: testAccessTokens = [] } = useQuery<TestAccessToken[]>({
    queryKey: ["/api/admin/test-access"],
    enabled: isAdmin,
  });

  const createTestAccessMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; durationDays: number; accessLevel: string }) => {
      const res = await apiRequest("POST", "/api/admin/test-access", data);
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/test-access"] });
      const link = `${window.location.origin}/test-access/${data.token}`;
      setGeneratedLink(link);
      setShowLinkField(true);
      const savedEmail = testEmail;
      setTestName("");
      setTestEmail("");
      setTestDuration("7");
      toast({
        title: data.emailSent ? "Link created & email sent" : "Test link created",
        description: data.emailSent 
          ? `An invitation email has been sent to ${savedEmail}.`
          : "The test access link has been generated. Copy and share it manually.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create test access link.",
        variant: "destructive",
      });
    },
  });

  const testAccessActionMutation = useMutation({
    mutationFn: async ({ id, action, additionalDays }: { id: number; action: string; additionalDays?: number }) => {
      await apiRequest("PATCH", `/api/admin/test-access/${id}`, { action, additionalDays });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/test-access"] });
      toast({
        title: "Action completed",
        description: "The test access link has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update test access link.",
        variant: "destructive",
      });
    },
  });

  const deleteTestAccessMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/test-access/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/test-access"] });
      toast({
        title: "Link deleted",
        description: "The test access link has been deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete test access link.",
        variant: "destructive",
      });
    },
  });

  const subscribers = allUsers?.filter(u => u.stripeCustomerId) || [];
  
  const isOrgMember = (userId: string) => orgMembers.some(m => m.userId === userId);
  const getOrgMember = (userId: string) => orgMembers.find(m => m.userId === userId);

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
      </div>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to view this page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => setLocation("/")} data-testid="button-go-home">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-admin-title">Admin Dashboard</h1>
            <p className="text-muted-foreground">View subscribers and platform statistics</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-users">
                {statsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : stats?.totalUsers ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Registered accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-active-subscribers">
                {statsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : stats?.activeSubscribers ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Paying members</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-monthly-revenue">
                {statsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : `$${stats?.totalRevenue ?? 0}`}
              </div>
              <p className="text-xs text-muted-foreground">$10/month per subscriber</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>All Registered Users ({allUsers?.length || 0})</CardTitle>
            <CardDescription>Everyone who has signed up for the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !allUsers?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                No users yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">User</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Restaurant</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Role</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Subscription</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Joined</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((u) => (
                      <tr 
                        key={u.id} 
                        className="border-b last:border-0 cursor-pointer hover-elevate" 
                        onClick={() => setSelectedUser(u)}
                        data-testid={`row-user-${u.id}`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="font-medium">
                              {u.firstName || u.lastName 
                                ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() 
                                : 'Unknown User'}
                            </div>
                            {isOrgMember(u.id) && (
                              <Badge variant="outline" className="text-xs">
                                <Building className="h-3 w-3 mr-1" />
                                Org
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{u.email || 'No email'}</div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {u.restaurantName || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" data-testid={`badge-role-${u.id}`}>
                            {u.role || 'Not set'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {u.stripeCustomerId ? (
                            <Badge 
                              variant={u.subscriptionStatus === 'active' ? 'default' : 'secondary'}
                              data-testid={`badge-status-${u.id}`}
                            >
                              {u.subscriptionStatus || 'pending'}
                            </Badge>
                          ) : isOrgMember(u.id) ? (
                            <Badge variant="secondary" className="text-xs">Via Organization</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">No subscription</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {u.createdAt ? format(new Date(u.createdAt), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); setSelectedUser(u); }}
                            data-testid={`btn-view-user-${u.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Subscribers ({subscribers.length})</CardTitle>
            <CardDescription>Users who have subscribed to the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !subscribers.length ? (
              <div className="text-center py-8 text-muted-foreground">
                No subscribers yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">User</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Restaurant</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((sub) => (
                      <tr key={sub.id} className="border-b last:border-0" data-testid={`row-subscriber-${sub.id}`}>
                        <td className="py-3 px-4">
                          <div className="font-medium">
                            {sub.firstName || sub.lastName 
                              ? `${sub.firstName ?? ''} ${sub.lastName ?? ''}`.trim() 
                              : 'Unknown User'}
                          </div>
                          <div className="text-sm text-muted-foreground">{sub.email || 'No email'}</div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {sub.restaurantName || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge 
                            variant={sub.subscriptionStatus === 'active' ? 'default' : 'secondary'}
                            data-testid={`badge-sub-status-${sub.id}`}
                          >
                            {sub.subscriptionStatus || 'pending'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {sub.createdAt ? format(new Date(sub.createdAt), 'MMM d, yyyy') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 mb-6">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Link2 className="h-6 w-6" />
            Test Access Manager
          </h2>
          <p className="text-muted-foreground">Create and manage test access links</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Test Access Link
            </CardTitle>
            <CardDescription>Generate a shareable link for test users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="test-name">Name *</Label>
                <Input
                  id="test-name"
                  placeholder="Enter name"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  data-testid="input-test-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-email">Email (optional)</Label>
                <Input
                  id="test-email"
                  placeholder="Enter email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  data-testid="input-test-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-duration">Access Duration</Label>
                <Select value={testDuration} onValueChange={setTestDuration}>
                  <SelectTrigger data-testid="select-duration">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={() => {
                if (!testName.trim()) {
                  toast({ title: "Error", description: "Name is required.", variant: "destructive" });
                  return;
                }
                createTestAccessMutation.mutate({
                  name: testName.trim(),
                  email: testEmail.trim(),
                  durationDays: parseInt(testDuration),
                  accessLevel: "full",
                });
              }}
              disabled={createTestAccessMutation.isPending}
              data-testid="button-generate-link"
            >
              {createTestAccessMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Generate Test Link
            </Button>

            {showLinkField && generatedLink && (
              <div className="flex items-center gap-2 mt-4">
                <Input
                  readOnly
                  value={generatedLink}
                  className="flex-1"
                  data-testid="input-generated-link"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLink);
                    toast({ title: "Copied", description: "Link copied to clipboard." });
                  }}
                  data-testid="button-copy-link"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Access Links</CardTitle>
            <CardDescription>Track and manage all generated test access links</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <Badge variant="outline">Total: {testAccessTokens.length}</Badge>
              <Badge variant="default">Active: {testAccessTokens.filter(t => t.status === "active").length}</Badge>
              <Badge variant="secondary">Used: {testAccessTokens.filter(t => t.status === "used").length}</Badge>
              <Badge variant="outline" className="text-amber-600">Expired: {testAccessTokens.filter(t => t.status === "expired").length}</Badge>
              <Badge variant="destructive">Revoked: {testAccessTokens.filter(t => t.status === "revoked").length}</Badge>
            </div>

            {testAccessTokens.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No test access links created yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Used</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testAccessTokens.map((token) => (
                      <TableRow key={token.id} data-testid={`row-test-access-${token.id}`}>
                        <TableCell className="font-medium">{token.name}</TableCell>
                        <TableCell className="text-muted-foreground">{token.email || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              token.status === "active" ? "default" :
                              token.status === "used" ? "secondary" :
                              token.status === "revoked" ? "destructive" : "outline"
                            }
                            className={token.status === "expired" ? "text-amber-600" : ""}
                          >
                            {token.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(token.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(token.expiresAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{token.usedAt ? "Yes" : "No"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                const link = `${window.location.origin}/test-access/${token.token}`;
                                navigator.clipboard.writeText(link);
                                toast({ title: "Copied", description: "Link copied to clipboard." });
                              }}
                              data-testid={`button-copy-link-${token.id}`}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {token.email && token.status === "active" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  testAccessActionMutation.mutate(
                                    { id: token.id, action: "send_email" },
                                    {
                                      onSuccess: () => {
                                        toast({ title: "Email sent", description: `Invitation email sent to ${token.email}.` });
                                      },
                                    }
                                  );
                                }}
                                disabled={testAccessActionMutation.isPending}
                                data-testid={`button-send-email-${token.id}`}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            {(token.status === "active" || token.status === "used") && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => testAccessActionMutation.mutate({ id: token.id, action: "revoke" })}
                                data-testid={`button-revoke-${token.id}`}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => testAccessActionMutation.mutate({ id: token.id, action: "extend", additionalDays: 7 })}
                              data-testid={`button-extend-${token.id}`}
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                            {token.status === "expired" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => testAccessActionMutation.mutate({ id: token.id, action: "resend" })}
                                data-testid={`button-resend-${token.id}`}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteTestAccessMutation.mutate(token.id)}
                              data-testid={`button-delete-${token.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Detail Dialog - portalled, so it's OK outside max-w-7xl */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              User Details
              {selectedUser && isOrgMember(selectedUser.id) && (
                <Badge variant="outline" className="text-xs">
                  <Building className="h-3 w-3 mr-1" />
                  Organization Member
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              View user information and manage organization membership
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-sm" data-testid="detail-user-name">
                    {selectedUser.firstName || selectedUser.lastName 
                      ? `${selectedUser.firstName ?? ''} ${selectedUser.lastName ?? ''}`.trim() 
                      : 'Unknown User'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm" data-testid="detail-user-email">{selectedUser.email || 'No email'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Restaurant</label>
                  <p className="text-sm" data-testid="detail-user-restaurant">{selectedUser.restaurantName || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Role</label>
                  <p className="text-sm" data-testid="detail-user-role">
                    <Badge variant="outline">{selectedUser.role || 'Not set'}</Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Subscription</label>
                  <p className="text-sm" data-testid="detail-user-subscription">
                    {selectedUser.stripeCustomerId ? (
                      <Badge variant={selectedUser.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                        {selectedUser.subscriptionStatus || 'pending'}
                      </Badge>
                    ) : isOrgMember(selectedUser.id) ? (
                      <Badge variant="secondary">Via Organization</Badge>
                    ) : (
                      <span className="text-muted-foreground">No subscription</span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Joined</label>
                  <p className="text-sm" data-testid="detail-user-joined">
                    {selectedUser.createdAt ? format(new Date(selectedUser.createdAt), 'MMM d, yyyy') : '—'}
                  </p>
                </div>
              </div>
              
              {selectedUser.id !== user?.id && (
                <div className="pt-4 border-t">
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => setUserToRemove(selectedUser)}
                    data-testid="btn-delete-user"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete User
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!userToRemove} onOpenChange={(open) => !open && setUserToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {userToRemove?.firstName || userToRemove?.lastName ? `${userToRemove?.firstName ?? ''} ${userToRemove?.lastName ?? ''}`.trim() : 'this user'}? 
              This action cannot be undone and will remove all their data from the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToRemove && deleteUserMutation.mutate(userToRemove.id)}
              className="bg-destructive text-destructive-foreground"
              disabled={deleteUserMutation.isPending}
              data-testid="btn-confirm-delete"
            >
              {deleteUserMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
