import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  Clock, 
  Bell, 
  LogOut, 
  Loader2,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Shift, StaffAnnouncement } from "@shared/schema";

interface EmployeeInfo {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  positionId: number | null;
}

export default function EmployeePortalPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employee, isLoading: employeeLoading, error } = useQuery<EmployeeInfo>({
    queryKey: ["/api/employee/me"],
    retry: false,
  });

  const { data: myShifts, isLoading: shiftsLoading } = useQuery<Shift[]>({
    queryKey: ["/api/employee/schedule"],
    enabled: !!employee,
  });

  const { data: announcements, isLoading: announcementsLoading } = useQuery<StaffAnnouncement[]>({
    queryKey: ["/api/employee/announcements"],
    enabled: !!employee,
  });

  const { data: openShifts, isLoading: openShiftsLoading } = useQuery<Shift[]>({
    queryKey: ["/api/employee/open-shifts"],
    enabled: !!employee,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/employee/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/employee/login");
    },
  });

  if (employeeLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !employee) {
    setLocation("/employee/login");
    return null;
  }

  const upcomingShifts = myShifts?.filter(s => {
    const shiftDate = new Date(s.date);
    return shiftDate >= new Date(new Date().toDateString());
  }).slice(0, 5) || [];

  const activeAnnouncements = announcements?.filter(a => {
    if (a.expiresAt && new Date(a.expiresAt) < new Date()) return false;
    return true;
  }) || [];

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const priorityColors = {
    low: "bg-muted text-muted-foreground",
    normal: "bg-primary/10 text-primary",
    high: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    urgent: "bg-red-500/10 text-red-600 dark:text-red-400",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Staff Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {employee.firstName} {employee.lastName}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              data-testid="btn-employee-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Welcome back, {employee.firstName}!</h1>
          <p className="text-muted-foreground">View your schedule and stay updated with team announcements.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                My Upcoming Shifts
              </CardTitle>
              <CardDescription>
                Your scheduled shifts for the coming days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {shiftsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : upcomingShifts.length === 0 ? (
                <p className="text-muted-foreground text-sm">No upcoming shifts scheduled.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingShifts.map(shift => (
                    <div key={shift.id} className="p-3 border rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-medium">{formatDate(shift.date)}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                        </p>
                      </div>
                      <Badge variant="secondary" className="capitalize">
                        {shift.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Open Shifts
              </CardTitle>
              <CardDescription>
                Shifts available for pickup
              </CardDescription>
            </CardHeader>
            <CardContent>
              {openShiftsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : openShifts?.length === 0 ? (
                <p className="text-muted-foreground text-sm">No open shifts available.</p>
              ) : (
                <div className="space-y-3">
                  {openShifts?.slice(0, 5).map(shift => (
                    <div key={shift.id} className="p-3 border rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-medium">{formatDate(shift.date)}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        Open
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Team Announcements
            </CardTitle>
            <CardDescription>
              Important updates from management
            </CardDescription>
          </CardHeader>
          <CardContent>
            {announcementsLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : activeAnnouncements.length === 0 ? (
              <p className="text-muted-foreground text-sm">No announcements at this time.</p>
            ) : (
              <div className="space-y-4">
                {activeAnnouncements.map(announcement => (
                  <div key={announcement.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium">{announcement.title}</h3>
                      <Badge className={priorityColors[announcement.priority as keyof typeof priorityColors] || priorityColors.normal}>
                        {announcement.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {announcement.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Posted {new Date(announcement.createdAt!).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
