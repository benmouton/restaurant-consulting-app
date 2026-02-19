import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  ChefHat, 
  LogOut, 
  ArrowLeft,
  Calendar,
  Users,
  Plus,
  Clock,
  ChevronLeft,
  ChevronRight,
  Bell,
  Briefcase,
  Trash2,
  Edit,
  AlertTriangle,
  Mail,
  Copy,
  Check,
  Loader2,
  DollarSign,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { StaffPosition, StaffMember, Shift, StaffAnnouncement } from "@shared/schema";

function getWeekDates(startDate: Date): Date[] {
  const dates = [];
  const start = new Date(startDate);
  start.setDate(start.getDate() - start.getDay());
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date);
  }
  return dates;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

function calculateShiftHours(startTime: string, endTime: string): number {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  let totalMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
  
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }
  
  return totalMinutes / 60;
}

export default function SchedulingPage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const initialTab = urlParams.get("tab") || "schedule";
  const [activeTab, setActiveTab] = useState(initialTab);
  
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const tabParam = params.get("tab");
    if (tabParam && ["schedule", "staff", "positions", "announcements"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchString]);
  
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() - today.getDay());
    return today;
  });
  
  const [showAddShift, setShowAddShift] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  
  const [newShift, setNewShift] = useState({ date: "", startTime: "09:00", endTime: "17:00", staffMemberId: "", positionId: "", notes: "" });
  const [newStaff, setNewStaff] = useState({ firstName: "", lastName: "", email: "", phone: "", positionId: "", hourlyRate: "" });
  const [newPosition, setNewPosition] = useState({ name: "", color: "#3B82F6", department: "FOH" });
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", content: "", priority: "normal" });
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [invitingMemberId, setInvitingMemberId] = useState<number | null>(null);

  const weekDates = getWeekDates(currentWeekStart);
  const startDate = formatDate(weekDates[0]);
  const endDate = formatDate(weekDates[6]);

  const { data: positions = [] } = useQuery<StaffPosition[]>({
    queryKey: ["/api/scheduling/positions"],
  });

  const { data: staff = [] } = useQuery<StaffMember[]>({
    queryKey: ["/api/scheduling/staff"],
  });

  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: ["/api/scheduling/shifts", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/scheduling/shifts?start=${startDate}&end=${endDate}`, { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to fetch shifts");
      return res.json();
    },
  });

  const { data: openShifts = [] } = useQuery<Shift[]>({
    queryKey: ["/api/scheduling/shifts/open"],
  });

  const { data: announcements = [] } = useQuery<StaffAnnouncement[]>({
    queryKey: ["/api/scheduling/announcements"],
  });

  const createShiftMutation = useMutation({
    mutationFn: async (data: typeof newShift) => {
      return apiRequest("POST", "/api/scheduling/shifts", {
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        staffMemberId: data.staffMemberId ? parseInt(data.staffMemberId) : null,
        positionId: data.positionId ? parseInt(data.positionId) : null,
        notes: data.notes || null,
        status: data.staffMemberId ? "scheduled" : "open",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/shifts/open"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/stats"] });
      setShowAddShift(false);
      setNewShift({ date: "", startTime: "09:00", endTime: "17:00", staffMemberId: "", positionId: "", notes: "" });
      toast({ title: "Shift created successfully" });
    },
    onError: () => toast({ title: "Failed to create shift", variant: "destructive" }),
  });

  const deleteShiftMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/scheduling/shifts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/shifts/open"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/stats"] });
      toast({ title: "Shift deleted" });
    },
  });

  const createStaffMutation = useMutation({
    mutationFn: async (data: typeof newStaff) => {
      // Initiate Stripe checkout for $5 employee fee
      const response = await apiRequest("POST", "/api/scheduling/staff/checkout", {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone || null,
        positionId: data.positionId ? parseInt(data.positionId) : null,
        hourlyRate: data.hourlyRate || null,
      });
      const result = await response.json();
      if (result.url) {
        window.location.href = result.url;
      }
      return result;
    },
    onError: () => toast({ title: "Failed to start checkout", variant: "destructive" }),
  });

  // Handle payment success - complete employee creation
  const completeStaffMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest("POST", "/api/scheduling/staff/complete", { sessionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/stats"] });
      toast({ title: "Staff member added successfully!" });
      // Clear the URL params
      window.history.replaceState({}, '', '/scheduling?tab=staff');
    },
    onError: () => toast({ title: "Failed to complete staff creation", variant: "destructive" }),
  });

  // Check for payment success on page load
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const payment = params.get('payment');
    const sessionId = params.get('session_id');
    
    if (payment === 'success' && sessionId) {
      completeStaffMutation.mutate(sessionId);
    } else if (payment === 'cancelled') {
      toast({ title: "Payment cancelled", description: "Employee was not added" });
      window.history.replaceState({}, '', '/scheduling?tab=staff');
    }
  }, [searchString]);

  const deleteStaffMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/scheduling/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/stats"] });
      toast({ title: "Staff member removed" });
    },
  });

  const inviteStaffMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/employee/invite/${id}`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/staff"] });
      setInviteUrl(data.inviteUrl);
      setShowInviteDialog(true);
      setInvitingMemberId(null);
      toast({ title: "Invite link generated!" });
    },
    onError: (error: any) => {
      setInvitingMemberId(null);
      toast({ 
        title: "Failed to generate invite", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleSendInvite = (member: StaffMember) => {
    if (!member.email) {
      toast({ 
        title: "Email required", 
        description: "Add an email address before sending an invite",
        variant: "destructive" 
      });
      return;
    }
    setInvitingMemberId(member.id);
    inviteStaffMutation.mutate(member.id);
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
    toast({ title: "Invite link copied!" });
  };

  const createPositionMutation = useMutation({
    mutationFn: async (data: typeof newPosition) => {
      return apiRequest("POST", "/api/scheduling/positions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/stats"] });
      setShowAddPosition(false);
      setNewPosition({ name: "", color: "#3B82F6", department: "FOH" });
      toast({ title: "Position created" });
    },
    onError: () => toast({ title: "Failed to create position", variant: "destructive" }),
  });

  const deletePositionMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/scheduling/positions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/stats"] });
      toast({ title: "Position deleted" });
    },
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: typeof newAnnouncement) => {
      return apiRequest("POST", "/api/scheduling/announcements", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/stats"] });
      setShowAddAnnouncement(false);
      setNewAnnouncement({ title: "", content: "", priority: "normal" });
      toast({ title: "Announcement created" });
    },
    onError: () => toast({ title: "Failed to create announcement", variant: "destructive" }),
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/scheduling/announcements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/stats"] });
      toast({ title: "Announcement deleted" });
    },
  });

  const navigateWeek = (direction: number) => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + (direction * 7));
    setCurrentWeekStart(newStart);
  };

  const getStaffName = (staffMemberId: number | null) => {
    if (!staffMemberId) return "Open Shift";
    const member = staff.find(s => s.id === staffMemberId);
    return member ? `${member.firstName} ${member.lastName}` : "Unknown";
  };

  const getPositionName = (positionId: number | null) => {
    if (!positionId) return "";
    const position = positions.find(p => p.id === positionId);
    return position?.name || "";
  };

  const getPositionColor = (positionId: number | null) => {
    if (!positionId) return "#6B7280";
    const position = positions.find(p => p.id === positionId);
    return position?.color || "#6B7280";
  };

  const getShiftsForDate = (date: string) => {
    return shifts.filter(s => s.date === date);
  };

  const calculateDayLaborCost = (dayShifts: Shift[]) => {
    let totalCost = 0;
    let hasRates = false;
    
    for (const shift of dayShifts) {
      if (shift.staffMemberId) {
        const member = staff.find(s => s.id === shift.staffMemberId);
        if (member && member.hourlyRate) {
          const rate = parseFloat(member.hourlyRate);
          if (!isNaN(rate) && rate > 0) {
            hasRates = true;
            const hours = calculateShiftHours(shift.startTime, shift.endTime);
            totalCost += hours * rate;
          }
        }
      }
    }
    
    return { totalCost, hasRates };
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <ChefHat className="h-6 w-6 text-primary" />
              <span className="font-bold hidden sm:inline">Staff Scheduling</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="schedule" data-testid="tab-schedule">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="staff" data-testid="tab-staff">
              <Users className="h-4 w-4 mr-2" />
              Staff
            </TabsTrigger>
            <TabsTrigger value="positions" data-testid="tab-positions">
              <Briefcase className="h-4 w-4 mr-2" />
              Positions
            </TabsTrigger>
            <TabsTrigger value="announcements" data-testid="tab-announcements">
              <Bell className="h-4 w-4 mr-2" />
              Announcements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)} data-testid="btn-prev-week">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium min-w-[200px] text-center">
                  {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <Button variant="outline" size="icon" onClick={() => navigateWeek(1)} data-testid="btn-next-week">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/domain/staffing">
                  <Button variant="outline" data-testid="btn-labor-impact">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Check Labor Impact
                  </Button>
                </Link>
                <Dialog open={showAddShift} onOpenChange={setShowAddShift}>
                  <DialogTrigger asChild>
                    <Button data-testid="btn-add-shift">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Shift
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Shift</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Date</Label>
                      <Input 
                        type="date" 
                        value={newShift.date} 
                        onChange={(e) => setNewShift(s => ({ ...s, date: e.target.value }))}
                        className="mt-1"
                        data-testid="input-shift-date"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Start Time</Label>
                        <Input 
                          type="time" 
                          value={newShift.startTime}
                          onChange={(e) => setNewShift(s => ({ ...s, startTime: e.target.value }))}
                          className="mt-1"
                          data-testid="input-shift-start"
                        />
                      </div>
                      <div>
                        <Label>End Time</Label>
                        <Input 
                          type="time" 
                          value={newShift.endTime}
                          onChange={(e) => setNewShift(s => ({ ...s, endTime: e.target.value }))}
                          className="mt-1"
                          data-testid="input-shift-end"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Position</Label>
                      <Select value={newShift.positionId} onValueChange={(v) => setNewShift(s => ({ ...s, positionId: v }))}>
                        <SelectTrigger className="mt-1" data-testid="select-shift-position">
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent>
                          {positions.map(p => (
                            <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Assign To (leave empty for open shift)</Label>
                      <Select value={newShift.staffMemberId} onValueChange={(v) => setNewShift(s => ({ ...s, staffMemberId: v }))}>
                        <SelectTrigger className="mt-1" data-testid="select-shift-staff">
                          <SelectValue placeholder="Leave open or assign..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Open Shift</SelectItem>
                          {staff.map(s => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.firstName} {s.lastName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Notes (optional)</Label>
                      <Textarea 
                        value={newShift.notes}
                        onChange={(e) => setNewShift(s => ({ ...s, notes: e.target.value }))}
                        className="mt-1"
                        placeholder="Any special instructions..."
                        data-testid="input-shift-notes"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddShift(false)}>Cancel</Button>
                    <Button 
                      onClick={() => createShiftMutation.mutate(newShift)}
                      disabled={!newShift.date || createShiftMutation.isPending}
                      data-testid="btn-save-shift"
                    >
                      {createShiftMutation.isPending ? "Saving..." : "Save Shift"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              </div>
            </div>

            {shifts.length > 0 && (
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{shifts.length} shifts</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{new Set(shifts.filter(s => s.staffMemberId).map(s => s.staffMemberId)).size} staff scheduled</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{shifts.reduce((sum, s) => sum + calculateShiftHours(s.startTime, s.endTime), 0).toFixed(1)} total hours</span>
                </div>
                {shifts.some(s => s.status === "open") && (
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {shifts.filter(s => s.status === "open").length} open
                  </Badge>
                )}
              </div>
            )}

            {(() => {
              const gaps: { day: string; issue: string }[] = [];
              weekDates.forEach(date => {
                const dateStr = formatDate(date);
                const dayShifts = getShiftsForDate(dateStr);
                if (dayShifts.length === 0) return;
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const positionsUsed = new Set(dayShifts.filter(s => s.positionId).map(s => s.positionId));
                const allPositionIds = new Set(positions.map(p => p.id));
                allPositionIds.forEach(pid => {
                  if (!positionsUsed.has(pid)) {
                    const pName = positions.find(p => p.id === pid)?.name;
                    if (pName) gaps.push({ day: dayName, issue: `No ${pName} scheduled` });
                  }
                });
                const openCount = dayShifts.filter(s => s.status === "open").length;
                if (openCount > 0) {
                  gaps.push({ day: dayName, issue: `${openCount} open shift${openCount > 1 ? "s" : ""}` });
                }
              });
              if (gaps.length === 0) return null;
              return (
                <div className="p-3 border border-orange-500/30 bg-orange-500/5 rounded-lg" data-testid="coverage-gaps">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-700 dark:text-orange-400">Coverage Gaps ({gaps.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {gaps.slice(0, 8).map((gap, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/30">
                        {gap.day}: {gap.issue}
                      </Badge>
                    ))}
                    {gaps.length > 8 && (
                      <Badge variant="outline" className="text-xs">+{gaps.length - 8} more</Badge>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-7 gap-2">
              {weekDates.map((date, i) => {
                const dateStr = formatDate(date);
                const dayShifts = getShiftsForDate(dateStr);
                const isToday = dateStr === formatDate(new Date());
                const { totalCost, hasRates } = calculateDayLaborCost(dayShifts);
                
                return (
                  <div key={i} className={`min-h-[200px] border rounded-lg p-2 flex flex-col ${isToday ? 'border-primary bg-primary/5' : ''}`}>
                    <div className="text-center mb-2">
                      <div className="text-xs text-muted-foreground">
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className={`text-lg font-semibold ${isToday ? 'text-primary' : ''}`}>
                        {date.getDate()}
                      </div>
                    </div>
                    <div className="space-y-1 flex-1">
                      {dayShifts.map(shift => (
                        <div 
                          key={shift.id}
                          className="text-xs p-2 rounded cursor-pointer group relative"
                          style={{ backgroundColor: `${getPositionColor(shift.positionId)}20`, borderLeft: `3px solid ${getPositionColor(shift.positionId)}` }}
                          data-testid={`shift-${shift.id}`}
                        >
                          <div className="font-medium truncate">{getStaffName(shift.staffMemberId)}</div>
                          <div className="text-muted-foreground">{formatTime(shift.startTime)} - {formatTime(shift.endTime)}</div>
                          {shift.status === "open" && (
                            <Badge variant="outline" className="text-[10px] mt-1 bg-orange-500/10 text-orange-600">Open</Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100"
                            onClick={() => deleteShiftMutation.mutate(shift.id)}
                            data-testid={`btn-delete-shift-${shift.id}`}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      {dayShifts.length === 0 && (
                        <div className="flex-1 flex items-center justify-center">
                          <span className="text-[10px] text-muted-foreground/50">No shifts</span>
                        </div>
                      )}
                    </div>
                    {dayShifts.length > 0 && hasRates && (
                      <div className="mt-2 pt-2 border-t border-dashed text-center" data-testid={`labor-cost-${dateStr}`}>
                        <div className="text-xs text-muted-foreground">Labor Cost</div>
                        <div className="text-sm font-semibold text-green-600 dark:text-green-500" data-testid={`labor-cost-value-${dateStr}`}>${totalCost.toFixed(2)}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {shifts.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <Calendar className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="font-medium mb-1">No shifts scheduled this week</p>
                  <p className="text-sm text-muted-foreground mb-4">Add your first shift to get started, or set up positions first.</p>
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" onClick={() => setActiveTab("positions")} data-testid="btn-setup-positions">
                      Set Up Positions
                    </Button>
                    <Button onClick={() => setShowAddShift(true)} data-testid="btn-first-shift">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Shift
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {openShifts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-600">
                    <AlertTriangle className="h-5 w-5" />
                    Open Shifts ({openShifts.length})
                  </CardTitle>
                  <CardDescription>These shifts need to be filled</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {openShifts.map(shift => (
                      <div key={shift.id} className="p-3 border rounded-lg flex items-center justify-between">
                        <div>
                          <div className="font-medium">{new Date(shift.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                          <div className="text-sm text-muted-foreground">{formatTime(shift.startTime)} - {formatTime(shift.endTime)}</div>
                          {shift.positionId && <Badge variant="secondary" className="mt-1">{getPositionName(shift.positionId)}</Badge>}
                        </div>
                        <Button variant="outline" size="sm">Fill</Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="staff" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Staff Members ({staff.length})</h2>
              <Dialog open={showAddStaff} onOpenChange={setShowAddStaff}>
                <DialogTrigger asChild>
                  <Button data-testid="btn-add-staff">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Staff
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Staff Member</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>First Name</Label>
                        <Input 
                          value={newStaff.firstName}
                          onChange={(e) => setNewStaff(s => ({ ...s, firstName: e.target.value }))}
                          className="mt-1"
                          data-testid="input-staff-first-name"
                        />
                      </div>
                      <div>
                        <Label>Last Name</Label>
                        <Input 
                          value={newStaff.lastName}
                          onChange={(e) => setNewStaff(s => ({ ...s, lastName: e.target.value }))}
                          className="mt-1"
                          data-testid="input-staff-last-name"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Email (optional)</Label>
                      <Input 
                        type="email"
                        value={newStaff.email}
                        onChange={(e) => setNewStaff(s => ({ ...s, email: e.target.value }))}
                        className="mt-1"
                        data-testid="input-staff-email"
                      />
                    </div>
                    <div>
                      <Label>Phone (optional)</Label>
                      <Input 
                        value={newStaff.phone}
                        onChange={(e) => setNewStaff(s => ({ ...s, phone: e.target.value }))}
                        className="mt-1"
                        data-testid="input-staff-phone"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Position</Label>
                        <Select value={newStaff.positionId} onValueChange={(v) => setNewStaff(s => ({ ...s, positionId: v }))}>
                          <SelectTrigger className="mt-1" data-testid="select-staff-position">
                            <SelectValue placeholder="Select position" />
                          </SelectTrigger>
                          <SelectContent>
                            {positions.map(p => (
                              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Pay Rate ($/hr)</Label>
                        <Input 
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="15.00"
                          value={newStaff.hourlyRate}
                          onChange={(e) => setNewStaff(s => ({ ...s, hourlyRate: e.target.value }))}
                          className="mt-1"
                          data-testid="input-staff-hourly-rate"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="flex-col sm:flex-row gap-2">
                    <p className="text-xs text-muted-foreground w-full sm:w-auto">A $5 fee applies per new employee</p>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowAddStaff(false)}>Cancel</Button>
                      <Button 
                        onClick={() => createStaffMutation.mutate(newStaff)}
                        disabled={!newStaff.firstName || !newStaff.lastName || createStaffMutation.isPending}
                        data-testid="btn-save-staff"
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        {createStaffMutation.isPending ? "Processing..." : "Add Staff - $5"}
                      </Button>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {staff.map(member => (
                <Card key={member.id} className="relative group" data-testid={`staff-card-${member.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{member.firstName} {member.lastName}</h3>
                          {member.inviteStatus === "accepted" && (
                            <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          )}
                          {member.inviteStatus === "pending" && (
                            <Badge variant="outline" className="text-amber-600 border-amber-600 text-xs">
                              Pending
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          {member.positionId && (
                            <Badge variant="secondary">{getPositionName(member.positionId)}</Badge>
                          )}
                          {member.hourlyRate && (
                            <Badge variant="outline" className="text-green-600 border-green-600" data-testid={`badge-hourly-rate-${member.id}`}>
                              <DollarSign className="h-3 w-3 mr-0.5" />
                              {parseFloat(member.hourlyRate).toFixed(2)}/hr
                            </Badge>
                          )}
                        </div>
                        {member.email && <p className="text-sm text-muted-foreground mt-2">{member.email}</p>}
                        {member.phone && <p className="text-sm text-muted-foreground">{member.phone}</p>}
                        {(() => {
                          const memberShifts = shifts.filter(s => s.staffMemberId === member.id);
                          const totalHours = memberShifts.reduce((sum, s) => sum + calculateShiftHours(s.startTime, s.endTime), 0);
                          if (totalHours === 0) return null;
                          return (
                            <p className="text-sm text-muted-foreground mt-1">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {totalHours.toFixed(1)} hrs this week
                            </p>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-1">
                        {member.inviteStatus !== "accepted" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100"
                            onClick={() => handleSendInvite(member)}
                            disabled={invitingMemberId === member.id}
                            title={member.email ? "Send portal invite" : "Add email first"}
                            data-testid={`btn-invite-staff-${member.id}`}
                          >
                            {invitingMemberId === member.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100"
                          onClick={() => deleteStaffMutation.mutate(member.id)}
                          data-testid={`btn-delete-staff-${member.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {staff.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No staff members yet. Add your first team member!
                </div>
              )}
            </div>

            {/* Invite Link Dialog */}
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Employee Invite Link</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    Share this link with the employee. They'll use it to create their account and access the staff scheduling portal.
                  </p>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={inviteUrl} 
                      readOnly 
                      className="font-mono text-xs"
                      data-testid="input-invite-url"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={copyInviteLink}
                      data-testid="btn-copy-invite"
                    >
                      {inviteCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="p-3 bg-amber-500/10 rounded-lg">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      <strong>Note:</strong> Each active employee adds $5/month to your subscription.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => setShowInviteDialog(false)}>Done</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="positions" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Positions ({positions.length})</h2>
              <Dialog open={showAddPosition} onOpenChange={setShowAddPosition}>
                <DialogTrigger asChild>
                  <Button data-testid="btn-add-position">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Position
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Position</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Position Name</Label>
                      <Input 
                        value={newPosition.name}
                        onChange={(e) => setNewPosition(p => ({ ...p, name: e.target.value }))}
                        placeholder="e.g., Server, Bartender, Line Cook"
                        className="mt-1"
                        data-testid="input-position-name"
                      />
                    </div>
                    <div>
                      <Label>Department</Label>
                      <Select value={newPosition.department} onValueChange={(v) => setNewPosition(p => ({ ...p, department: v }))}>
                        <SelectTrigger className="mt-1" data-testid="select-position-department">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FOH">Front of House (FOH)</SelectItem>
                          <SelectItem value="BOH">Back of House (BOH)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Color</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input 
                          type="color"
                          value={newPosition.color}
                          onChange={(e) => setNewPosition(p => ({ ...p, color: e.target.value }))}
                          className="w-12 h-10 p-1"
                          data-testid="input-position-color"
                        />
                        <span className="text-sm text-muted-foreground">Used for schedule display</span>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddPosition(false)}>Cancel</Button>
                    <Button 
                      onClick={() => createPositionMutation.mutate(newPosition)}
                      disabled={!newPosition.name || createPositionMutation.isPending}
                      data-testid="btn-save-position"
                    >
                      {createPositionMutation.isPending ? "Saving..." : "Add Position"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {positions.map(position => (
                <Card key={position.id} className="relative group" data-testid={`position-card-${position.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: position.color }}
                        />
                        <div>
                          <h3 className="font-semibold">{position.name}</h3>
                          <Badge variant="outline" className="mt-1">{position.department}</Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100"
                        onClick={() => deletePositionMutation.mutate(position.id)}
                        data-testid={`btn-delete-position-${position.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {positions.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No positions yet. Add positions like Server, Bartender, Line Cook, etc.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="announcements" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Announcements ({announcements.length})</h2>
              <Dialog open={showAddAnnouncement} onOpenChange={setShowAddAnnouncement}>
                <DialogTrigger asChild>
                  <Button data-testid="btn-add-announcement">
                    <Plus className="h-4 w-4 mr-2" />
                    New Announcement
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Announcement</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Title</Label>
                      <Input 
                        value={newAnnouncement.title}
                        onChange={(e) => setNewAnnouncement(a => ({ ...a, title: e.target.value }))}
                        placeholder="e.g., Staff Meeting Friday"
                        className="mt-1"
                        data-testid="input-announcement-title"
                      />
                    </div>
                    <div>
                      <Label>Message</Label>
                      <Textarea 
                        value={newAnnouncement.content}
                        onChange={(e) => setNewAnnouncement(a => ({ ...a, content: e.target.value }))}
                        placeholder="Enter your announcement..."
                        className="mt-1 min-h-[100px]"
                        data-testid="input-announcement-content"
                      />
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <Select value={newAnnouncement.priority} onValueChange={(v) => setNewAnnouncement(a => ({ ...a, priority: v }))}>
                        <SelectTrigger className="mt-1" data-testid="select-announcement-priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddAnnouncement(false)}>Cancel</Button>
                    <Button 
                      onClick={() => createAnnouncementMutation.mutate(newAnnouncement)}
                      disabled={!newAnnouncement.title || !newAnnouncement.content || createAnnouncementMutation.isPending}
                      data-testid="btn-save-announcement"
                    >
                      {createAnnouncementMutation.isPending ? "Posting..." : "Post Announcement"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {announcements.map(announcement => {
                const priorityColors: Record<string, string> = {
                  low: "bg-gray-100 text-gray-700",
                  normal: "bg-blue-100 text-blue-700",
                  high: "bg-orange-100 text-orange-700",
                  urgent: "bg-red-100 text-red-700",
                };
                return (
                  <Card key={announcement.id} className="relative group" data-testid={`announcement-card-${announcement.id}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{announcement.title}</h3>
                            <Badge className={priorityColors[announcement.priority]}>{announcement.priority}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{announcement.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {announcement.createdAt && new Date(announcement.createdAt).toLocaleDateString('en-US', { 
                              month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
                            })}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {staff.length > 0 ? `Visible to ${staff.length} staff` : "No staff members yet"}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100"
                          onClick={() => deleteAnnouncementMutation.mutate(announcement.id)}
                          data-testid={`btn-delete-announcement-${announcement.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {announcements.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No announcements yet. Create one to communicate with your team!
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
