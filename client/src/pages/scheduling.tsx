import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { isNativeApp } from "@/lib/native";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  ChefHat, LogOut, ArrowLeft, Calendar, Users, Plus, Clock, ChevronLeft, ChevronRight,
  Bell, Briefcase, Trash2, Edit, AlertTriangle, Mail, Copy, Check, Loader2, DollarSign,
  TrendingUp, X, CalendarPlus, UserPlus, Sparkles, BarChart3, Megaphone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { StaffPosition, StaffMember, Shift, StaffAnnouncement } from "@shared/schema";

const POSITION_COLORS = ["#d4a017", "#14b8a6", "#f43f5e", "#8b5cf6", "#0ea5e9", "#84cc16", "#f97316", "#ec4899"];

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
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  return totalMinutes / 60;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getInitialColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return POSITION_COLORS[Math.abs(hash) % POSITION_COLORS.length];
}

function getPositionColorByIndex(index: number): string {
  return POSITION_COLORS[index % POSITION_COLORS.length];
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
  const [showShiftDetail, setShowShiftDetail] = useState<Shift | null>(null);
  const [showLaborPanel, setShowLaborPanel] = useState(false);
  const [showBuildSchedule, setShowBuildSchedule] = useState(false);
  
  const [newShift, setNewShift] = useState({ date: "", startTime: "09:00", endTime: "17:00", staffMemberId: "", positionId: "", notes: "", hourlyRate: "" });
  const [newStaff, setNewStaff] = useState({ firstName: "", lastName: "", email: "", phone: "", positionId: "", hourlyRate: "" });
  const [newPosition, setNewPosition] = useState({ name: "", color: POSITION_COLORS[0], department: "FOH", description: "", minRate: "", maxRate: "" });
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", content: "", priority: "normal", audience: "all" });
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [invitingMemberId, setInvitingMemberId] = useState<number | null>(null);

  const [laborRevenue, setLaborRevenue] = useState("");
  const [laborPercent, setLaborPercent] = useState("");
  const [laborAnalysis, setLaborAnalysis] = useState<any>(null);
  const [laborAnalyzing, setLaborAnalyzing] = useState(false);
  const [laborError, setLaborError] = useState("");

  const [buildPrompt, setBuildPrompt] = useState("");
  const [buildResult, setBuildResult] = useState<any>(null);
  const [buildLoading, setBuildLoading] = useState(false);
  const [buildError, setBuildError] = useState("");

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

  const positionColorMap = useMemo(() => {
    const map: Record<number, string> = {};
    positions.forEach((p, i) => {
      map[p.id] = p.color || getPositionColorByIndex(i);
    });
    return map;
  }, [positions]);

  const weekMetrics = useMemo(() => {
    const totalShifts = shifts.length;
    const totalHours = shifts.reduce((sum, s) => sum + calculateShiftHours(s.startTime, s.endTime), 0);
    let laborCost = 0;
    shifts.forEach(s => {
      if (s.staffMemberId) {
        const member = staff.find(m => m.id === s.staffMemberId);
        if (member?.hourlyRate) {
          const rate = parseFloat(member.hourlyRate);
          if (!isNaN(rate)) laborCost += calculateShiftHours(s.startTime, s.endTime) * rate;
        }
      }
    });
    const daysWithShifts = new Set(shifts.map(s => s.date)).size;
    const coveragePercent = Math.round((daysWithShifts / 7) * 100);
    const uniqueStaff = new Set(shifts.filter(s => s.staffMemberId).map(s => s.staffMemberId)).size;
    return { totalShifts, totalHours, laborCost, coveragePercent, uniqueStaff };
  }, [shifts, staff]);

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
      setNewShift({ date: "", startTime: "09:00", endTime: "17:00", staffMemberId: "", positionId: "", notes: "", hourlyRate: "" });
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
      setShowShiftDetail(null);
      toast({ title: "Shift deleted" });
    },
  });

  const createStaffMutation = useMutation({
    mutationFn: async (data: typeof newStaff) => {
      if (isNativeApp()) {
        toast({ title: "Add Staff on the Web", description: "Visit restaurantai.consulting to add team members." });
        return null;
      }
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

  const completeStaffMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest("POST", "/api/scheduling/staff/complete", { sessionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/stats"] });
      toast({ title: "Staff member added successfully!" });
      window.history.replaceState({}, '', '/scheduling?tab=staff');
    },
    onError: () => toast({ title: "Failed to complete staff creation", variant: "destructive" }),
  });

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
      toast({ title: "Failed to generate invite", description: error.message, variant: "destructive" });
    },
  });

  const handleSendInvite = (member: StaffMember) => {
    if (!member.email) {
      toast({ title: "Email required", description: "Add an email address before sending an invite", variant: "destructive" });
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
      return apiRequest("POST", "/api/scheduling/positions", { name: data.name, color: data.color, department: data.department });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/stats"] });
      setShowAddPosition(false);
      setNewPosition({ name: "", color: POSITION_COLORS[0], department: "FOH", description: "", minRate: "", maxRate: "" });
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
      return apiRequest("POST", "/api/scheduling/announcements", { title: data.title, content: data.content, priority: data.priority });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/stats"] });
      setShowAddAnnouncement(false);
      setNewAnnouncement({ title: "", content: "", priority: "normal", audience: "all" });
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
    return positionColorMap[positionId] || "#6B7280";
  };

  const getShiftsForDate = (date: string) => {
    return shifts.filter(s => s.date === date);
  };

  const handleAddShiftForDate = (dateStr: string) => {
    setNewShift(s => ({ ...s, date: dateStr }));
    setShowAddShift(true);
  };

  const handleAnalyzeLabor = async () => {
    if (!laborRevenue || !laborPercent) return;
    setLaborAnalyzing(true);
    setLaborError("");
    try {
      const shiftData = shifts.map(s => ({
        date: s.date,
        staffName: getStaffName(s.staffMemberId),
        position: getPositionName(s.positionId),
        startTime: s.startTime,
        endTime: s.endTime,
        hours: calculateShiftHours(s.startTime, s.endTime),
        hourlyRate: s.staffMemberId ? (staff.find(m => m.id === s.staffMemberId)?.hourlyRate || null) : null,
      }));
      const staffData = staff.map(m => ({
        name: `${m.firstName} ${m.lastName}`,
        position: getPositionName(m.positionId),
        hourlyRate: m.hourlyRate,
      }));
      const res = await apiRequest("POST", "/api/scheduling/labor-analysis", {
        weeklyRevenue: parseFloat(laborRevenue),
        idealLaborPercent: parseFloat(laborPercent),
        shifts: shiftData,
        staff: staffData,
      });
      const data = await res.json();
      setLaborAnalysis(data);
    } catch {
      setLaborError("Analysis unavailable. Please check your connection.");
    } finally {
      setLaborAnalyzing(false);
    }
  };

  const handleBuildSchedule = async () => {
    if (!buildPrompt.trim()) return;
    setBuildLoading(true);
    setBuildError("");
    try {
      const staffData = staff.map(m => ({ name: `${m.firstName} ${m.lastName}`, position: getPositionName(m.positionId), hourlyRate: m.hourlyRate }));
      const positionData = positions.map(p => ({ name: p.name, department: p.department }));
      const res = await apiRequest("POST", "/api/scheduling/build-schedule", {
        prompt: buildPrompt,
        staff: staffData,
        positions: positionData,
      });
      const data = await res.json();
      setBuildResult(data);
    } catch {
      setBuildError("Could not generate schedule. Please try again.");
    } finally {
      setBuildLoading(false);
    }
  };

  const handleAddSuggestedShift = (suggestedShift: any) => {
    const dayMap: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
    const dayIndex = dayMap[suggestedShift.day.toLowerCase()] ?? -1;
    if (dayIndex === -1) return;
    const date = new Date(weekDates[dayIndex]);
    const dateStr = formatDate(date);

    const matchedStaff = staff.find(s => `${s.firstName} ${s.lastName}`.toLowerCase() === suggestedShift.staffName?.toLowerCase());
    const matchedPosition = positions.find(p => p.name.toLowerCase() === suggestedShift.position?.toLowerCase());

    createShiftMutation.mutate({
      date: dateStr,
      startTime: suggestedShift.startTime || "09:00",
      endTime: suggestedShift.endTime || "17:00",
      staffMemberId: matchedStaff ? String(matchedStaff.id) : "",
      positionId: matchedPosition ? String(matchedPosition.id) : "",
      notes: "",
      hourlyRate: "",
    });
  };

  const handleAddAllSuggested = () => {
    if (!buildResult?.shifts) return;
    buildResult.shifts.forEach((s: any) => handleAddSuggestedShift(s));
  };

  const shiftAutoHours = newShift.startTime && newShift.endTime
    ? calculateShiftHours(newShift.startTime, newShift.endTime).toFixed(1)
    : "0.0";

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f1117' }}>
      <header className="border-b sticky top-0 z-50 backdrop-blur" style={{ borderColor: '#2a2d3e', backgroundColor: 'rgba(15,17,23,0.95)', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back" className="text-white hover:bg-white/10">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <ChefHat className="h-6 w-6" style={{ color: '#d4a017' }} />
              <span className="font-bold hidden sm:inline text-white">Staff Scheduling</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout" className="text-white hover:bg-white/10">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Labor Strip */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2" data-testid="labor-strip">
          {[
            { label: "Total Shifts", value: `${weekMetrics.totalShifts} shifts`, icon: Calendar },
            { label: "Scheduled Hours", value: `${weekMetrics.totalHours.toFixed(1)} hrs`, icon: Clock },
            { label: "Est. Labor Cost", value: `$${weekMetrics.laborCost.toFixed(2)}`, icon: DollarSign },
            { label: "% of Coverage", value: `${weekMetrics.coveragePercent}%`, icon: BarChart3 },
            { label: "Staff Scheduled", value: `${weekMetrics.uniqueStaff} staff`, icon: Users },
          ].map((metric, i) => (
            <div
              key={metric.label}
              className="flex-shrink-0 min-w-[150px] rounded-lg p-4"
              style={{
                backgroundColor: '#1a1d2e',
                borderLeft: '3px solid #d4a017',
                animation: `scheduleStaggerIn 0.3s ease-out ${i * 30}ms both`,
              }}
              data-testid={`metric-${metric.label.toLowerCase().replace(/ /g, '-')}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <metric.icon className="h-3.5 w-3.5" style={{ color: '#9ca3af' }} />
                <span className="text-xs" style={{ color: '#9ca3af' }}>{metric.label}</span>
              </div>
              <div className="text-lg font-bold text-white">{metric.value}</div>
            </div>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4" style={{ backgroundColor: '#1a1d2e' }}>
            <TabsTrigger value="schedule" data-testid="tab-schedule" className="data-[state=active]:bg-[#d4a017]/20 data-[state=active]:text-[#d4a017] text-gray-400">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="staff" data-testid="tab-staff" className="data-[state=active]:bg-[#d4a017]/20 data-[state=active]:text-[#d4a017] text-gray-400">
              <Users className="h-4 w-4 mr-2" />
              Staff
            </TabsTrigger>
            <TabsTrigger value="positions" data-testid="tab-positions" className="data-[state=active]:bg-[#d4a017]/20 data-[state=active]:text-[#d4a017] text-gray-400">
              <Briefcase className="h-4 w-4 mr-2" />
              Positions
            </TabsTrigger>
            <TabsTrigger value="announcements" data-testid="tab-announcements" className="data-[state=active]:bg-[#d4a017]/20 data-[state=active]:text-[#d4a017] text-gray-400">
              <Bell className="h-4 w-4 mr-2" />
              Announce
            </TabsTrigger>
          </TabsList>

          {/* ====== SCHEDULE TAB ====== */}
          <TabsContent value="schedule" className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)} data-testid="btn-prev-week"
                  className="border-[#2a2d3e] text-white hover:bg-white/10">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium min-w-[200px] text-center text-white">
                  {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <Button variant="outline" size="icon" onClick={() => navigateWeek(1)} data-testid="btn-next-week"
                  className="border-[#2a2d3e] text-white hover:bg-white/10">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setShowLaborPanel(true)} data-testid="btn-labor-impact"
                  className="border-[#2a2d3e] text-white hover:bg-white/10">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Check Labor Impact
                </Button>
                <Button variant="outline" onClick={() => setShowBuildSchedule(true)} data-testid="btn-build-schedule"
                  style={{ borderColor: '#d4a017', color: '#d4a017' }}
                  className="hover:bg-[#d4a017]/10">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Build Schedule
                </Button>
                <Button onClick={() => setShowAddShift(true)} data-testid="btn-add-shift"
                  style={{ backgroundColor: '#d4a017', color: '#0f1117' }}
                  className="hover:opacity-90 font-semibold">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Shift
                </Button>
              </div>
            </div>

            {/* Coverage Gaps */}
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
                if (openCount > 0) gaps.push({ day: dayName, issue: `${openCount} open shift${openCount > 1 ? "s" : ""}` });
              });
              if (gaps.length === 0) return null;
              return (
                <div className="p-3 rounded-lg" style={{ border: '1px solid rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.05)' }} data-testid="coverage-gaps">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4" style={{ color: '#f59e0b' }} />
                    <span className="text-sm font-medium" style={{ color: '#f59e0b' }}>Coverage Gaps ({gaps.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {gaps.slice(0, 8).map((gap, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                        {gap.day}: {gap.issue}
                      </span>
                    ))}
                    {gaps.length > 8 && <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#2a2d3e', color: '#9ca3af' }}>+{gaps.length - 8} more</span>}
                  </div>
                </div>
              );
            })()}

            {/* Week Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {weekDates.map((date, i) => {
                const dateStr = formatDate(date);
                const dayShifts = getShiftsForDate(dateStr);
                const isToday = dateStr === formatDate(new Date());
                const isPast = date < new Date(new Date().toDateString());

                return (
                  <div
                    key={i}
                    className="min-h-[200px] rounded-lg p-2 flex flex-col cursor-pointer group/day"
                    style={{
                      backgroundColor: '#1a1d2e',
                      border: isToday ? '1px solid #d4a017' : '1px solid #2a2d3e',
                      ...(isToday ? { background: 'linear-gradient(to bottom, rgba(212,160,23,0.05), #1a1d2e)' } : {}),
                      animation: `scheduleStaggerIn 0.3s ease-out ${i * 20}ms both`,
                    }}
                    data-testid={`day-column-${dateStr}`}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('[data-shift-chip]')) return;
                      handleAddShiftForDate(dateStr);
                    }}
                  >
                    <div className="text-center mb-2">
                      <div className="text-xs" style={{ color: '#9ca3af', opacity: isPast && !isToday ? 0.65 : 1 }}>
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="text-lg font-semibold" style={{ color: isToday ? '#d4a017' : 'white', opacity: isPast && !isToday ? 0.65 : 1 }}>
                        {date.getDate()}
                      </div>
                    </div>
                    <div className="space-y-1.5 flex-1">
                      {dayShifts.map(shift => {
                        const posColor = getPositionColor(shift.positionId);
                        return (
                          <div
                            key={shift.id}
                            data-shift-chip="true"
                            className="text-xs p-2 rounded cursor-pointer transition-shadow"
                            style={{
                              backgroundColor: '#2a2d3e',
                              borderLeft: `3px solid ${posColor}`,
                              animation: 'shiftPopIn 0.15s ease-out both',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowShiftDetail(shift);
                            }}
                            data-testid={`shift-${shift.id}`}
                          >
                            <div className="font-medium text-white truncate">{getStaffName(shift.staffMemberId)}</div>
                            <div style={{ color: '#9ca3af' }}>{formatTime(shift.startTime)} - {formatTime(shift.endTime)}</div>
                            {shift.positionId && (
                              <div className="flex items-center gap-1 mt-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: posColor }} />
                                <span style={{ color: '#9ca3af' }} className="text-[10px]">{getPositionName(shift.positionId)}</span>
                              </div>
                            )}
                            {shift.status === "open" && (
                              <span className="inline-block text-[10px] mt-1 px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>Open</span>
                            )}
                          </div>
                        );
                      })}
                      {dayShifts.length === 0 && (
                        <div className="flex-1 flex items-center justify-center opacity-0 group-hover/day:opacity-100 transition-opacity">
                          <Plus className="h-5 w-5" style={{ color: '#d4a017' }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty State */}
            {shifts.length === 0 && (
              <div className="rounded-lg p-8 text-center" style={{ border: '2px dashed #2a2d3e', backgroundColor: '#1a1d2e' }}>
                <CalendarPlus className="h-12 w-12 mx-auto mb-3" style={{ color: '#d4a017', opacity: 0.6 }} />
                <p className="font-semibold text-white text-lg mb-1">No shifts scheduled this week</p>
                <p className="text-sm mb-5" style={{ color: '#9ca3af' }}>Set up your positions and staff first, then add shifts to build your schedule.</p>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" onClick={() => setActiveTab("positions")} data-testid="btn-setup-positions"
                    className="border-white/20 text-white hover:bg-white/10">
                    Set Up Positions
                  </Button>
                  <Button onClick={() => setShowAddShift(true)} data-testid="btn-first-shift"
                    style={{ backgroundColor: '#d4a017', color: '#0f1117', animation: 'goldPulseRing 2s ease-out 1' }}
                    className="font-semibold">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Shift
                  </Button>
                </div>
              </div>
            )}

            {/* Open Shifts */}
            {openShifts.length > 0 && (
              <div className="rounded-lg p-4" style={{ backgroundColor: '#1a1d2e', border: '1px solid rgba(245,158,11,0.3)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5" style={{ color: '#f59e0b' }} />
                  <span className="font-semibold text-white">Open Shifts ({openShifts.length})</span>
                  <span className="text-xs" style={{ color: '#9ca3af' }}>These shifts need to be filled</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {openShifts.map(shift => (
                    <div key={shift.id} className="p-3 rounded-lg flex items-center justify-between" style={{ backgroundColor: '#2a2d3e', border: '1px solid #3a3d4e' }}>
                      <div>
                        <div className="font-medium text-white text-sm">{new Date(shift.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                        <div className="text-xs" style={{ color: '#9ca3af' }}>{formatTime(shift.startTime)} - {formatTime(shift.endTime)}</div>
                        {shift.positionId && <span className="inline-block text-xs mt-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: `${getPositionColor(shift.positionId)}20`, color: getPositionColor(shift.positionId) }}>{getPositionName(shift.positionId)}</span>}
                      </div>
                      <Button variant="outline" size="sm" className="border-[#d4a017] text-[#d4a017] hover:bg-[#d4a017]/10">Fill</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ====== STAFF TAB ====== */}
          <TabsContent value="staff" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Staff Members ({staff.length})</h2>
              <Button onClick={() => setShowAddStaff(true)} data-testid="btn-add-staff"
                style={{ backgroundColor: '#d4a017', color: '#0f1117' }} className="font-semibold">
                <Plus className="h-4 w-4 mr-2" />
                Add Staff
              </Button>
            </div>

            {staff.length === 0 ? (
              <div className="rounded-lg p-8 text-center" style={{ border: '2px dashed #2a2d3e', backgroundColor: '#1a1d2e' }}>
                <UserPlus className="h-12 w-12 mx-auto mb-3" style={{ color: '#d4a017', opacity: 0.6 }} />
                <p className="font-semibold text-white text-lg mb-1">No staff members yet</p>
                <p className="text-sm mb-5" style={{ color: '#9ca3af' }}>Add your team to start building your schedule.</p>
                <Button onClick={() => setShowAddStaff(true)} data-testid="btn-first-staff"
                  style={{ backgroundColor: '#d4a017', color: '#0f1117', animation: 'goldPulseRing 2s ease-out 1' }} className="font-semibold">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Staff Member
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {staff.map((member, i) => {
                  const memberShifts = shifts.filter(s => s.staffMemberId === member.id);
                  const totalHours = memberShifts.reduce((sum, s) => sum + calculateShiftHours(s.startTime, s.endTime), 0);
                  const avatarColor = getInitialColor(`${member.firstName} ${member.lastName}`);
                  return (
                    <div
                      key={member.id}
                      className="rounded-xl p-4 flex items-center gap-4 group"
                      style={{
                        backgroundColor: '#1a1d2e',
                        border: '1px solid #2a2d3e',
                        animation: `scheduleStaggerIn 0.3s ease-out ${i * 30}ms both`,
                      }}
                      data-testid={`staff-card-${member.id}`}
                    >
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ backgroundColor: avatarColor }}>
                        {getInitials(member.firstName, member.lastName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white">{member.firstName} {member.lastName}</span>
                          {member.inviteStatus === "accepted" && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>Active</span>
                          )}
                          {member.inviteStatus === "pending" && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>Pending</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {member.positionId && (
                            <span className="text-xs" style={{ color: '#9ca3af' }}>{getPositionName(member.positionId)}</span>
                          )}
                          {member.hourlyRate && (
                            <span className="text-xs" style={{ color: '#d4a017' }}>${parseFloat(member.hourlyRate).toFixed(2)}/hr</span>
                          )}
                          {member.email && <span className="text-xs" style={{ color: '#6b7280' }}>{member.email}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {totalHours > 0 && (
                          <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#2a2d3e', color: '#d4a017' }}>
                            {memberShifts.length} shifts
                          </span>
                        )}
                        {member.inviteStatus !== "accepted" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                            style={{ color: '#9ca3af' }}
                            onClick={() => handleSendInvite(member)}
                            disabled={invitingMemberId === member.id}
                            title={member.email ? "Send portal invite" : "Add email first"}
                            data-testid={`btn-invite-staff-${member.id}`}
                          >
                            {invitingMemberId === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          style={{ color: '#ef4444' }}
                          onClick={() => deleteStaffMutation.mutate(member.id)}
                          data-testid={`btn-delete-staff-${member.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Invite Link Dialog */}
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
              <DialogContent style={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e' }}>
                <DialogHeader>
                  <DialogTitle className="text-white">Employee Invite Link</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm" style={{ color: '#9ca3af' }}>
                    Share this link with the employee. They'll use it to create their account and access the staff scheduling portal.
                  </p>
                  <div className="flex items-center gap-2">
                    <Input value={inviteUrl} readOnly className="font-mono text-xs bg-[#2a2d3e] border-[#3a3d4e] text-white" data-testid="input-invite-url" />
                    <Button variant="outline" size="icon" onClick={copyInviteLink} data-testid="btn-copy-invite" className="border-[#3a3d4e] text-white">
                      {inviteCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}>
                    <p className="text-sm" style={{ color: '#f59e0b' }}>
                      <strong>Note:</strong> {isNativeApp() ? "Manage billing at restaurantai.consulting." : "Each active employee adds $5/month to your subscription."}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => setShowInviteDialog(false)} style={{ backgroundColor: '#d4a017', color: '#0f1117' }}>Done</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ====== POSITIONS TAB ====== */}
          <TabsContent value="positions" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Positions ({positions.length})</h2>
              <Button onClick={() => setShowAddPosition(true)} data-testid="btn-add-position"
                style={{ backgroundColor: '#d4a017', color: '#0f1117' }} className="font-semibold">
                <Plus className="h-4 w-4 mr-2" />
                Add Position
              </Button>
            </div>

            {positions.length === 0 ? (
              <div className="rounded-lg p-8 text-center" style={{ border: '2px dashed #2a2d3e', backgroundColor: '#1a1d2e' }}>
                <Briefcase className="h-12 w-12 mx-auto mb-3" style={{ color: '#d4a017', opacity: 0.6 }} />
                <p className="font-semibold text-white text-lg mb-1">No positions yet</p>
                <p className="text-sm mb-5" style={{ color: '#9ca3af' }}>Add roles like Server, Bartender, Line Cook before building your schedule.</p>
                <Button onClick={() => setShowAddPosition(true)} data-testid="btn-first-position"
                  style={{ backgroundColor: '#d4a017', color: '#0f1117', animation: 'goldPulseRing 2s ease-out 1' }} className="font-semibold">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Position
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {positions.map((position, i) => {
                  const staffCount = staff.filter(s => s.positionId === position.id).length;
                  const posColor = positionColorMap[position.id] || getPositionColorByIndex(i);
                  return (
                    <div
                      key={position.id}
                      className="rounded-xl p-4 flex items-center gap-4 group"
                      style={{
                        backgroundColor: '#1a1d2e',
                        border: '1px solid #2a2d3e',
                        animation: `scheduleStaggerIn 0.3s ease-out ${i * 30}ms both`,
                      }}
                      data-testid={`position-card-${position.id}`}
                    >
                      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: posColor }} />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-white">{position.name}</span>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs" style={{ color: '#9ca3af' }}>{staffCount} staff assigned</span>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#2a2d3e', color: '#9ca3af' }}>{position.department}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        style={{ color: '#ef4444' }}
                        onClick={() => deletePositionMutation.mutate(position.id)}
                        data-testid={`btn-delete-position-${position.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ====== ANNOUNCEMENTS TAB ====== */}
          <TabsContent value="announcements" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Announcements ({announcements.length})</h2>
              <Button onClick={() => setShowAddAnnouncement(true)} data-testid="btn-add-announcement"
                style={{ backgroundColor: '#d4a017', color: '#0f1117' }} className="font-semibold">
                <Plus className="h-4 w-4 mr-2" />
                New Announcement
              </Button>
            </div>

            {announcements.length === 0 ? (
              <div className="rounded-lg p-8 text-center" style={{ border: '2px dashed #2a2d3e', backgroundColor: '#1a1d2e' }}>
                <Megaphone className="h-12 w-12 mx-auto mb-3" style={{ color: '#d4a017', opacity: 0.6 }} />
                <p className="font-semibold text-white text-lg mb-1">No announcements yet</p>
                <p className="text-sm mb-5" style={{ color: '#9ca3af' }}>Use announcements to communicate schedule changes, policy updates, or team messages.</p>
                <Button onClick={() => setShowAddAnnouncement(true)} data-testid="btn-first-announcement"
                  style={{ backgroundColor: '#d4a017', color: '#0f1117', animation: 'goldPulseRing 2s ease-out 1' }} className="font-semibold">
                  <Plus className="h-4 w-4 mr-2" />
                  New Announcement
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((announcement, i) => {
                  const priorityColorMap: Record<string, { bg: string; text: string }> = {
                    low: { bg: 'rgba(107,114,128,0.15)', text: '#9ca3af' },
                    normal: { bg: 'rgba(212,160,23,0.15)', text: '#d4a017' },
                    high: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
                    urgent: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
                  };
                  const pColor = priorityColorMap[announcement.priority] || priorityColorMap.normal;
                  return (
                    <div
                      key={announcement.id}
                      className="rounded-xl p-4 group"
                      style={{
                        backgroundColor: '#1a1d2e',
                        border: '1px solid #2a2d3e',
                        borderLeft: '3px solid #d4a017',
                        animation: `scheduleStaggerIn 0.3s ease-out ${i * 30}ms both`,
                      }}
                      data-testid={`announcement-card-${announcement.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Bell className="h-4 w-4" style={{ color: '#d4a017' }} />
                            <span className="font-semibold text-white">{announcement.title}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: pColor.bg, color: pColor.text }}>
                              {announcement.priority}
                            </span>
                            {announcement.createdAt && (
                              <span className="text-xs ml-auto" style={{ color: '#6b7280' }}>
                                {new Date(announcement.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                          <p className="text-sm line-clamp-3" style={{ color: '#9ca3af' }}>{announcement.content}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#2a2d3e', color: '#9ca3af' }}>
                              {staff.length > 0 ? `All Staff (${staff.length})` : "No staff members yet"}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ml-2"
                          style={{ color: '#ef4444' }}
                          onClick={() => deleteAnnouncementMutation.mutate(announcement.id)}
                          data-testid={`btn-delete-announcement-${announcement.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* ====== ADD SHIFT MODAL ====== */}
      <Dialog open={showAddShift} onOpenChange={setShowAddShift}>
        <DialogContent className="sm:max-w-[480px]" style={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: '16px' }}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full" style={{ backgroundColor: '#d4a017' }} />
              <DialogTitle className="text-white">Add Shift</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-300">Date</Label>
              <Input type="date" value={newShift.date} onChange={(e) => setNewShift(s => ({ ...s, date: e.target.value }))}
                className="mt-1 bg-[#2a2d3e] border-[#3a3d4e] text-white" data-testid="input-shift-date" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Start Time</Label>
                <Input type="time" value={newShift.startTime} onChange={(e) => setNewShift(s => ({ ...s, startTime: e.target.value }))}
                  className="mt-1 bg-[#2a2d3e] border-[#3a3d4e] text-white" data-testid="input-shift-start" />
              </div>
              <div>
                <Label className="text-gray-300">End Time</Label>
                <Input type="time" value={newShift.endTime} onChange={(e) => setNewShift(s => ({ ...s, endTime: e.target.value }))}
                  className="mt-1 bg-[#2a2d3e] border-[#3a3d4e] text-white" data-testid="input-shift-end" />
              </div>
            </div>
            {newShift.startTime && newShift.endTime && (
              <div className="text-sm font-medium" style={{ color: '#d4a017' }}>{shiftAutoHours} hrs</div>
            )}
            <div>
              <Label className="text-gray-300">Staff Member</Label>
              {staff.length === 0 ? (
                <div className="mt-1 p-3 rounded-lg text-sm" style={{ backgroundColor: '#2a2d3e', color: '#9ca3af' }}>
                  No staff yet.{" "}
                  <button className="underline" style={{ color: '#d4a017' }} onClick={() => { setShowAddShift(false); setActiveTab("staff"); }}>
                    Add staff first
                  </button>
                </div>
              ) : (
                <Select value={newShift.staffMemberId} onValueChange={(v) => setNewShift(s => ({ ...s, staffMemberId: v }))}>
                  <SelectTrigger className="mt-1 bg-[#2a2d3e] border-[#3a3d4e] text-white" data-testid="select-shift-staff">
                    <SelectValue placeholder="Leave open or assign..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open Shift</SelectItem>
                    {staff.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.firstName} {s.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label className="text-gray-300">Position</Label>
              {positions.length === 0 ? (
                <div className="mt-1 p-3 rounded-lg text-sm" style={{ backgroundColor: '#2a2d3e', color: '#9ca3af' }}>
                  No positions yet.{" "}
                  <button className="underline" style={{ color: '#d4a017' }} onClick={() => { setShowAddShift(false); setActiveTab("positions"); }}>
                    Add positions first
                  </button>
                </div>
              ) : (
                <Select value={newShift.positionId} onValueChange={(v) => setNewShift(s => ({ ...s, positionId: v }))}>
                  <SelectTrigger className="mt-1 bg-[#2a2d3e] border-[#3a3d4e] text-white" data-testid="select-shift-position">
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label className="text-gray-300">Hourly Rate (optional)</Label>
              <Input type="number" step="0.01" min="0" placeholder="$0.00"
                value={newShift.hourlyRate} onChange={(e) => setNewShift(s => ({ ...s, hourlyRate: e.target.value }))}
                className="mt-1 bg-[#2a2d3e] border-[#3a3d4e] text-white" data-testid="input-shift-hourly-rate" />
            </div>
            <div>
              <Label className="text-gray-300">Notes (optional)</Label>
              <Input value={newShift.notes} onChange={(e) => setNewShift(s => ({ ...s, notes: e.target.value }))}
                placeholder="Any special instructions..."
                className="mt-1 bg-[#2a2d3e] border-[#3a3d4e] text-white" data-testid="input-shift-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddShift(false)} className="border-[#3a3d4e] text-white hover:bg-white/10">Cancel</Button>
            <Button onClick={() => {
              const submitData = { ...newShift, staffMemberId: newShift.staffMemberId === "open" ? "" : newShift.staffMemberId };
              createShiftMutation.mutate(submitData);
            }}
              disabled={!newShift.date || createShiftMutation.isPending}
              style={{ backgroundColor: '#d4a017', color: '#0f1117' }} className="font-semibold"
              data-testid="btn-save-shift">
              {createShiftMutation.isPending ? "Saving..." : "Save Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== ADD STAFF MODAL ====== */}
      <Dialog open={showAddStaff} onOpenChange={setShowAddStaff}>
        <DialogContent className="sm:max-w-[480px]" style={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: '16px' }}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full" style={{ backgroundColor: '#d4a017' }} />
              <DialogTitle className="text-white">Add Staff Member</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">First Name</Label>
                <Input value={newStaff.firstName} onChange={(e) => setNewStaff(s => ({ ...s, firstName: e.target.value }))}
                  className="mt-1 bg-[#2a2d3e] border-[#3a3d4e] text-white" data-testid="input-staff-first-name" />
              </div>
              <div>
                <Label className="text-gray-300">Last Name</Label>
                <Input value={newStaff.lastName} onChange={(e) => setNewStaff(s => ({ ...s, lastName: e.target.value }))}
                  className="mt-1 bg-[#2a2d3e] border-[#3a3d4e] text-white" data-testid="input-staff-last-name" />
              </div>
            </div>
            <div>
              <Label className="text-gray-300">Email (optional)</Label>
              <Input type="email" value={newStaff.email} onChange={(e) => setNewStaff(s => ({ ...s, email: e.target.value }))}
                className="mt-1 bg-[#2a2d3e] border-[#3a3d4e] text-white" data-testid="input-staff-email" />
            </div>
            <div>
              <Label className="text-gray-300">Phone (optional)</Label>
              <Input value={newStaff.phone} onChange={(e) => setNewStaff(s => ({ ...s, phone: e.target.value }))}
                className="mt-1 bg-[#2a2d3e] border-[#3a3d4e] text-white" data-testid="input-staff-phone" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Position</Label>
                {positions.length === 0 ? (
                  <div className="mt-1 p-3 rounded-lg text-sm" style={{ backgroundColor: '#2a2d3e', color: '#9ca3af' }}>
                    <button className="underline" style={{ color: '#d4a017' }} onClick={() => { setShowAddStaff(false); setActiveTab("positions"); }}>
                      Add positions first
                    </button>
                  </div>
                ) : (
                  <Select value={newStaff.positionId} onValueChange={(v) => setNewStaff(s => ({ ...s, positionId: v }))}>
                    <SelectTrigger className="mt-1 bg-[#2a2d3e] border-[#3a3d4e] text-white" data-testid="select-staff-position">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label className="text-gray-300">Pay Rate ($/hr)</Label>
                <Input type="number" step="0.01" min="0" placeholder="15.00"
                  value={newStaff.hourlyRate} onChange={(e) => setNewStaff(s => ({ ...s, hourlyRate: e.target.value }))}
                  className="mt-1 bg-[#2a2d3e] border-[#3a3d4e] text-white" data-testid="input-staff-hourly-rate" />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!isNativeApp() && <p className="text-xs w-full sm:w-auto" style={{ color: '#9ca3af' }}>A $5 fee applies per new employee</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddStaff(false)} className="border-[#3a3d4e] text-white hover:bg-white/10">Cancel</Button>
              <Button onClick={() => createStaffMutation.mutate(newStaff)}
                disabled={!newStaff.firstName || !newStaff.lastName || createStaffMutation.isPending}
                style={{ backgroundColor: '#d4a017', color: '#0f1117' }} className="font-semibold"
                data-testid="btn-save-staff">
                <DollarSign className="h-4 w-4 mr-1" />
                {createStaffMutation.isPending ? "Processing..." : isNativeApp() ? "Add Staff" : "Add Staff - $5"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== ADD POSITION MODAL ====== */}
      <Dialog open={showAddPosition} onOpenChange={setShowAddPosition}>
        <DialogContent className="sm:max-w-[480px]" style={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: '16px' }}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full" style={{ backgroundColor: '#d4a017' }} />
              <DialogTitle className="text-white">Add Position</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-300">Position Name</Label>
              <Input value={newPosition.name} onChange={(e) => setNewPosition(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Server, Bartender, Line Cook"
                className="mt-1 bg-[#2a2d3e] border-[#3a3d4e] text-white" data-testid="input-position-name" />
            </div>
            <div>
              <Label className="text-gray-300">Department</Label>
              <Select value={newPosition.department} onValueChange={(v) => setNewPosition(p => ({ ...p, department: v }))}>
                <SelectTrigger className="mt-1 bg-[#2a2d3e] border-[#3a3d4e] text-white" data-testid="select-position-department">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FOH">Front of House (FOH)</SelectItem>
                  <SelectItem value="BOH">Back of House (BOH)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Color</Label>
              <div className="flex items-center gap-2 mt-2">
                {POSITION_COLORS.map(color => (
                  <button
                    key={color}
                    className="w-8 h-8 rounded-full transition-transform"
                    style={{
                      backgroundColor: color,
                      border: newPosition.color === color ? '3px solid white' : '2px solid transparent',
                      transform: newPosition.color === color ? 'scale(1.15)' : 'scale(1)',
                    }}
                    onClick={() => setNewPosition(p => ({ ...p, color }))}
                    data-testid={`color-swatch-${color}`}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label className="text-gray-300">Description (optional)</Label>
              <Input value={newPosition.description} onChange={(e) => setNewPosition(p => ({ ...p, description: e.target.value }))}
                placeholder="Brief description of this role"
                className="mt-1 bg-[#2a2d3e] border-[#3a3d4e] text-white" data-testid="input-position-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Min. Hourly Rate</Label>
                <Input type="number" step="0.01" min="0" placeholder="$0.00"
                  value={newPosition.minRate} onChange={(e) => setNewPosition(p => ({ ...p, minRate: e.target.value }))}
                  className="mt-1 bg-[#2a2d3e] border-[#3a3d4e] text-white" data-testid="input-position-min-rate" />
              </div>
              <div>
                <Label className="text-gray-300">Max. Hourly Rate</Label>
                <Input type="number" step="0.01" min="0" placeholder="$0.00"
                  value={newPosition.maxRate} onChange={(e) => setNewPosition(p => ({ ...p, maxRate: e.target.value }))}
                  className="mt-1 bg-[#2a2d3e] border-[#3a3d4e] text-white" data-testid="input-position-max-rate" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPosition(false)} className="border-[#3a3d4e] text-white hover:bg-white/10">Cancel</Button>
            <Button onClick={() => createPositionMutation.mutate(newPosition)}
              disabled={!newPosition.name || createPositionMutation.isPending}
              style={{ backgroundColor: '#d4a017', color: '#0f1117' }} className="font-semibold"
              data-testid="btn-save-position">
              {createPositionMutation.isPending ? "Saving..." : "Save Position"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== ADD ANNOUNCEMENT MODAL ====== */}
      <Dialog open={showAddAnnouncement} onOpenChange={setShowAddAnnouncement}>
        <DialogContent className="sm:max-w-[480px]" style={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: '16px' }}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full" style={{ backgroundColor: '#d4a017' }} />
              <DialogTitle className="text-white">New Announcement</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-300">Title</Label>
              <Input value={newAnnouncement.title} onChange={(e) => setNewAnnouncement(a => ({ ...a, title: e.target.value }))}
                placeholder="e.g., Staff Meeting Friday"
                className="mt-1 bg-[#2a2d3e] border-[#3a3d4e] text-white" data-testid="input-announcement-title" />
            </div>
            <div>
              <Label className="text-gray-300">Message</Label>
              <Textarea value={newAnnouncement.content} onChange={(e) => setNewAnnouncement(a => ({ ...a, content: e.target.value }))}
                placeholder="Enter your announcement..."
                className="mt-1 min-h-[100px] bg-[#2a2d3e] border-[#3a3d4e] text-white" data-testid="input-announcement-content" />
              <div className="text-xs text-right mt-1" style={{ color: '#6b7280' }}>{newAnnouncement.content.length} characters</div>
            </div>
            <div>
              <Label className="text-gray-300">Audience</Label>
              <Select value={newAnnouncement.audience} onValueChange={(v) => setNewAnnouncement(a => ({ ...a, audience: v }))}>
                <SelectTrigger className="mt-1 bg-[#2a2d3e] border-[#3a3d4e] text-white" data-testid="select-announcement-audience">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {positions.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Priority</Label>
              <Select value={newAnnouncement.priority} onValueChange={(v) => setNewAnnouncement(a => ({ ...a, priority: v }))}>
                <SelectTrigger className="mt-1 bg-[#2a2d3e] border-[#3a3d4e] text-white" data-testid="select-announcement-priority">
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
            <Button variant="outline" onClick={() => setShowAddAnnouncement(false)} className="border-[#3a3d4e] text-white hover:bg-white/10">Cancel</Button>
            <Button onClick={() => createAnnouncementMutation.mutate(newAnnouncement)}
              disabled={!newAnnouncement.title || !newAnnouncement.content || createAnnouncementMutation.isPending}
              style={{ backgroundColor: '#d4a017', color: '#0f1117' }} className="font-semibold"
              data-testid="btn-save-announcement">
              {createAnnouncementMutation.isPending ? "Posting..." : "Send Announcement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== SHIFT DETAIL MODAL ====== */}
      <Dialog open={!!showShiftDetail} onOpenChange={() => setShowShiftDetail(null)}>
        <DialogContent style={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: '16px' }}>
          {showShiftDetail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 rounded-full" style={{ backgroundColor: getPositionColor(showShiftDetail.positionId) }} />
                  <div>
                    <DialogTitle className="text-white">{getStaffName(showShiftDetail.staffMemberId)}</DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {showShiftDetail.positionId && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${getPositionColor(showShiftDetail.positionId)}20`, color: getPositionColor(showShiftDetail.positionId) }}>
                          {getPositionName(showShiftDetail.positionId)}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: '#9ca3af' }}>
                        {new Date(showShiftDetail.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-3 py-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#2a2d3e' }}>
                    <div className="text-xs" style={{ color: '#9ca3af' }}>Time</div>
                    <div className="text-sm font-medium text-white">{formatTime(showShiftDetail.startTime)} - {formatTime(showShiftDetail.endTime)}</div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#2a2d3e' }}>
                    <div className="text-xs" style={{ color: '#9ca3af' }}>Hours</div>
                    <div className="text-sm font-medium text-white">{calculateShiftHours(showShiftDetail.startTime, showShiftDetail.endTime).toFixed(1)} hrs</div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#2a2d3e' }}>
                    <div className="text-xs" style={{ color: '#9ca3af' }}>Est. Cost</div>
                    <div className="text-sm font-medium" style={{ color: '#d4a017' }}>
                      {(() => {
                        if (!showShiftDetail.staffMemberId) return "--";
                        const member = staff.find(m => m.id === showShiftDetail.staffMemberId);
                        if (!member?.hourlyRate) return "--";
                        const rate = parseFloat(member.hourlyRate);
                        const hours = calculateShiftHours(showShiftDetail.startTime, showShiftDetail.endTime);
                        return `$${(rate * hours).toFixed(2)}`;
                      })()}
                    </div>
                  </div>
                </div>
                {showShiftDetail.notes && (
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#2a2d3e' }}>
                    <div className="text-xs mb-1" style={{ color: '#9ca3af' }}>Notes</div>
                    <div className="text-sm text-white">{showShiftDetail.notes}</div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowShiftDetail(null)} className="border-[#3a3d4e] text-white hover:bg-white/10">Close</Button>
                <Button variant="outline" onClick={() => { deleteShiftMutation.mutate(showShiftDetail.id); }}
                  className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                  data-testid="btn-delete-shift-detail">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Shift
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ====== LABOR IMPACT PANEL ====== */}
      {showLaborPanel && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowLaborPanel(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative w-full sm:w-[400px] h-full overflow-y-auto p-6"
            style={{ backgroundColor: '#0f1117', borderLeft: '1px solid #2a2d3e', animation: 'scheduleStaggerIn 0.3s ease-out both' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" style={{ color: '#d4a017' }} />
                <h3 className="text-lg font-bold text-white">Labor Impact Analysis</h3>
              </div>
              <button onClick={() => setShowLaborPanel(false)} className="p-2 rounded-lg" style={{ color: '#9ca3af' }}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Weekly Revenue Target</Label>
                <Input type="number" placeholder="$0" value={laborRevenue} onChange={(e) => setLaborRevenue(e.target.value)}
                  className="mt-1 bg-[#1a1d2e] border-[#2a2d3e] text-white" data-testid="input-labor-revenue" />
              </div>
              <div>
                <Label className="text-gray-300">Ideal Labor %</Label>
                <div className="relative">
                  <Input type="number" placeholder="28" value={laborPercent} onChange={(e) => setLaborPercent(e.target.value)}
                    className="mt-1 bg-[#1a1d2e] border-[#2a2d3e] text-white pr-8" data-testid="input-labor-percent" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 mt-0.5">%</span>
                </div>
              </div>
              <Button onClick={handleAnalyzeLabor} disabled={!laborRevenue || !laborPercent || laborAnalyzing}
                style={{ backgroundColor: '#d4a017', color: '#0f1117' }} className="w-full font-semibold" data-testid="btn-analyze-labor">
                {laborAnalyzing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</> : "Analyze"}
              </Button>

              {laborAnalyzing && (
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-16 rounded-lg animate-pulse" style={{ backgroundColor: '#1a1d2e' }} />
                  ))}
                </div>
              )}

              {laborError && (
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e' }}>
                  <p className="text-sm" style={{ color: '#9ca3af' }}>{laborError}</p>
                  <Button variant="outline" size="sm" className="mt-2 border-[#3a3d4e] text-white" onClick={handleAnalyzeLabor}>Retry</Button>
                </div>
              )}

              {laborAnalysis && (
                <div className="space-y-4" style={{ animation: 'scheduleStaggerIn 0.3s ease-out both' }}>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-lg text-center" style={{ backgroundColor: '#1a1d2e' }}>
                      <div className="text-xs" style={{ color: '#9ca3af' }}>Labor Cost</div>
                      <div className="text-lg font-bold text-white">${(laborAnalysis.laborCostTotal || 0).toFixed(0)}</div>
                    </div>
                    <div className="p-3 rounded-lg text-center" style={{ backgroundColor: '#1a1d2e' }}>
                      <div className="text-xs" style={{ color: '#9ca3af' }}>Projected %</div>
                      <div className="text-lg font-bold text-white">{(laborAnalysis.laborPercentProjected || 0).toFixed(1)}%</div>
                    </div>
                    <div className="p-3 rounded-lg text-center" style={{ backgroundColor: '#1a1d2e' }}>
                      <div className="text-xs" style={{ color: '#9ca3af' }}>vs Target</div>
                      <div className="text-lg font-bold" style={{ color: laborAnalysis.overUnderTarget?.includes('over') ? '#ef4444' : '#22c55e' }}>
                        {laborAnalysis.overUnderTarget || "--"}
                      </div>
                    </div>
                  </div>

                  {laborAnalysis.topRiskDay && (
                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#1a1d2e', borderLeft: '3px solid #f59e0b' }}>
                      <div className="text-xs mb-1" style={{ color: '#9ca3af' }}>Highest Cost Day</div>
                      <div className="text-sm font-medium text-white">{laborAnalysis.topRiskDay}</div>
                    </div>
                  )}

                  {laborAnalysis.coverageGaps?.length > 0 && (
                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#1a1d2e' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4" style={{ color: '#f59e0b' }} />
                        <span className="text-sm font-medium text-white">Coverage Gaps</span>
                      </div>
                      <ul className="space-y-1">
                        {laborAnalysis.coverageGaps.map((gap: string, i: number) => (
                          <li key={i} className="text-sm flex items-start gap-2" style={{ color: '#9ca3af' }}>
                            <span style={{ color: '#f59e0b' }}>-</span> {gap}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {laborAnalysis.recommendations?.length > 0 && (
                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#1a1d2e' }}>
                      <div className="text-sm font-medium text-white mb-2">Recommendations</div>
                      <div className="space-y-2">
                        {laborAnalysis.recommendations.map((rec: string, i: number) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: '#d4a017', color: '#0f1117' }}>{i + 1}</span>
                            <span className="text-sm" style={{ color: '#9ca3af' }}>{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====== BUILD SCHEDULE MODAL ====== */}
      <Dialog open={showBuildSchedule} onOpenChange={setShowBuildSchedule}>
        <DialogContent className="sm:max-w-[560px] max-h-[80vh] overflow-y-auto" style={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: '16px' }}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5" style={{ color: '#d4a017' }} />
              <DialogTitle className="text-white">Build Schedule</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-300">Describe your scheduling needs</Label>
              <Textarea
                value={buildPrompt}
                onChange={(e) => setBuildPrompt(e.target.value)}
                placeholder="e.g. I need 2 servers and 1 bartender Fri-Sun, 4pm-10pm, under $800 labor"
                className="mt-1 min-h-[80px] bg-[#2a2d3e] border-[#3a3d4e] text-white"
                data-testid="input-build-schedule-prompt"
              />
            </div>
            <Button onClick={handleBuildSchedule} disabled={!buildPrompt.trim() || buildLoading}
              style={{ backgroundColor: '#d4a017', color: '#0f1117' }} className="w-full font-semibold" data-testid="btn-generate-schedule">
              {buildLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : "Generate Schedule"}
            </Button>

            {buildLoading && (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="h-12 rounded-lg animate-pulse" style={{ backgroundColor: '#2a2d3e' }} />
                ))}
              </div>
            )}

            {buildError && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#2a2d3e' }}>
                <p className="text-sm" style={{ color: '#9ca3af' }}>{buildError}</p>
                <Button variant="outline" size="sm" className="mt-2 border-[#3a3d4e] text-white" onClick={handleBuildSchedule}>Retry</Button>
              </div>
            )}

            {buildResult?.shifts && (
              <div className="space-y-3" style={{ animation: 'scheduleStaggerIn 0.3s ease-out both' }}>
                {buildResult.notes && (
                  <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: '#2a2d3e', color: '#9ca3af', borderLeft: '3px solid #d4a017' }}>
                    {buildResult.notes}
                  </div>
                )}

                <div className="text-sm font-medium text-white">
                  {buildResult.shifts.length} shifts suggested ({buildResult.totalEstimatedHours?.toFixed(1) || "?"} total hours)
                </div>

                {(() => {
                  const grouped: Record<string, any[]> = {};
                  buildResult.shifts.forEach((s: any) => {
                    if (!grouped[s.day]) grouped[s.day] = [];
                    grouped[s.day].push(s);
                  });
                  return Object.entries(grouped).map(([day, dayShifts]) => (
                    <div key={day}>
                      <div className="text-xs font-medium mb-1.5" style={{ color: '#d4a017' }}>{day}</div>
                      <div className="space-y-1.5">
                        {dayShifts.map((s: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#2a2d3e', border: '1px solid #3a3d4e' }}>
                            <div>
                              <div className="text-sm font-medium text-white">{s.staffName}</div>
                              <div className="text-xs" style={{ color: '#9ca3af' }}>
                                {s.position} | {formatTime(s.startTime)} - {formatTime(s.endTime)} ({s.estimatedHours}h)
                              </div>
                            </div>
                            <Button size="sm" onClick={() => handleAddSuggestedShift(s)}
                              style={{ backgroundColor: '#d4a017', color: '#0f1117' }} className="text-xs font-semibold"
                              data-testid={`btn-add-suggested-${day}-${i}`}>
                              Add
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}

                <Button onClick={handleAddAllSuggested}
                  style={{ backgroundColor: '#d4a017', color: '#0f1117' }} className="w-full font-semibold"
                  data-testid="btn-add-all-suggested">
                  Add All Shifts
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
