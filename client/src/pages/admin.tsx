import { useQuery } from "@tanstack/react-query";
import { useAdmin } from "@/hooks/use-admin";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, DollarSign, TrendingUp, Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

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

export default function AdminDashboard() {
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: allUsers, isLoading: usersLoading } = useQuery<UserInfo[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAdmin,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAdmin,
  });

  const subscribers = allUsers?.filter(u => u.stripeCustomerId) || [];

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
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((u) => (
                      <tr key={u.id} className="border-b last:border-0" data-testid={`row-user-${u.id}`}>
                        <td className="py-3 px-4">
                          <div className="font-medium">
                            {u.firstName || u.lastName 
                              ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() 
                              : 'Unknown User'}
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
                          ) : (
                            <span className="text-muted-foreground text-sm">No subscription</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {u.createdAt ? format(new Date(u.createdAt), 'MMM d, yyyy') : '—'}
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
      </div>
    </div>
  );
}
