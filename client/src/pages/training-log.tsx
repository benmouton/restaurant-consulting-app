import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UpgradeGate } from "@/components/upgrade-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, Users, Award, Clock, CalendarCheck, Plus,
  Eye, Pencil, Trash2, Download, Search, X, Check,
  AlertTriangle, LogOut, UserCog, GraduationCap, ChevronDown,
} from "lucide-react";
import type { StaffMember, StaffPosition, TrainingRecord } from "@shared/schema";

const MANUAL_TYPES = ["server", "kitchen", "bartender", "host", "busser", "manager"] as const;
const MANUAL_LABELS: Record<string, string> = {
  server: "Server Manual",
  kitchen: "Kitchen Manual",
  bartender: "Bartender Manual",
  host: "Host Manual",
  busser: "Busser Manual",
  manager: "Manager Manual",
};

const ROLE_COLORS: Record<string, string> = {
  Server: "#3b82f6",
  Bartender: "#d4a017",
  Host: "#14b8a6",
  Busser: "#6b7280",
  "Kitchen Staff": "#f97316",
  Kitchen: "#f97316",
  Manager: "#b8860b",
};

const ROLE_OPTIONS = ["Server", "Bartender", "Host", "Busser", "Kitchen Staff", "Manager"];

function formatDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d + "T12:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function relativeTime(d: string | null): string {
  if (!d) return "—";
  const now = new Date();
  const date = new Date(d + "T12:00:00");
  const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "today";
  if (diff === 1) return "yesterday";
  if (diff < 30) return `${diff} days ago`;
  if (diff < 60) return "1 month ago";
  return `${Math.floor(diff / 30)} months ago`;
}

function getPositionName(member: StaffMember, positions: StaffPosition[]): string {
  if (member.positionId) {
    const pos = positions.find(p => p.id === member.positionId);
    if (pos) return pos.name;
  }
  return "—";
}

type StatusFilter = "all" | "active" | "in-training" | "certified" | "inactive";
type FilterCard = "total" | "certified" | "training" | "month" | null;

export default function TrainingLogPage() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [manualFilter, setManualFilter] = useState("all");
  const [filterCard, setFilterCard] = useState<FilterCard>(null);

  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<StaffMember | null>(null);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TrainingRecord | null>(null);
  const [preselectedStaffId, setPreselectedStaffId] = useState<number | null>(null);
  const [showDetailView, setShowDetailView] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "staff" | "record"; id: number } | null>(null);
  const [showPostAddPrompt, setShowPostAddPrompt] = useState<{ name: string; role: string; id: number } | null>(null);
  const [showManagerBanner, setShowManagerBanner] = useState(false);

  const [empFirstName, setEmpFirstName] = useState("");
  const [empLastName, setEmpLastName] = useState("");
  const [empRole, setEmpRole] = useState("");
  const [empHireDate, setEmpHireDate] = useState(new Date().toISOString().split("T")[0]);
  const [empStatus, setEmpStatus] = useState("active");
  const [empNotes, setEmpNotes] = useState("");

  const [recStaffId, setRecStaffId] = useState<number | null>(null);
  const [recManualType, setRecManualType] = useState("");
  const [recStartDate, setRecStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [recCertDate, setRecCertDate] = useState("");
  const [recScore, setRecScore] = useState("");
  const [recPassed, setRecPassed] = useState<boolean | null>(null);
  const [recCertifiedBy, setRecCertifiedBy] = useState("");
  const [recExtraDays, setRecExtraDays] = useState("0");
  const [recNotes, setRecNotes] = useState("");

  const { data: staff = [], isLoading: staffLoading } = useQuery<StaffMember[]>({
    queryKey: ["/api/training/staff"],
  });

  const { data: positions = [] } = useQuery<StaffPosition[]>({
    queryKey: ["/api/scheduling/positions"],
  });

  const { data: records = [] } = useQuery<TrainingRecord[]>({
    queryKey: ["/api/training/records"],
  });

  const { data: summary } = useQuery<{
    totalStaff: number;
    fullyCertified: number;
    inTraining: number;
    certsThisMonth: number;
  }>({
    queryKey: ["/api/training/summary"],
  });

  const staffRecordMap = useMemo(() => {
    const map: Record<number, TrainingRecord[]> = {};
    records.forEach(r => {
      if (!map[r.staffMemberId]) map[r.staffMemberId] = [];
      map[r.staffMemberId].push(r);
    });
    return map;
  }, [records]);

  const filteredStaff = useMemo(() => {
    let result = [...staff];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q)
      );
    }

    if (roleFilter !== "all") {
      result = result.filter(s => {
        const posName = getPositionName(s, positions);
        return posName.toLowerCase() === roleFilter.toLowerCase();
      });
    }

    if (filterCard === "certified") {
      result = result.filter(s => {
        const recs = staffRecordMap[s.id] || [];
        return recs.some(r => r.certified);
      });
    } else if (filterCard === "training") {
      result = result.filter(s => {
        const recs = staffRecordMap[s.id] || [];
        return recs.some(r => !r.certified);
      });
    } else if (filterCard === "month") {
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStr = monthStart.toISOString().split("T")[0];
      result = result.filter(s => {
        const recs = staffRecordMap[s.id] || [];
        return recs.some(r => r.certified && r.certificationDate && r.certificationDate >= monthStr);
      });
    }

    if (statusFilter !== "all") {
      result = result.filter(s => {
        if (statusFilter === "inactive") return s.status === "inactive" || s.status === "terminated";
        if (statusFilter === "active") return s.status === "active";
        if (statusFilter === "in-training") {
          const recs = staffRecordMap[s.id] || [];
          return recs.some(r => !r.certified) && s.status === "active";
        }
        if (statusFilter === "certified") {
          const recs = staffRecordMap[s.id] || [];
          return recs.some(r => r.certified);
        }
        return true;
      });
    }

    if (manualFilter !== "all") {
      result = result.filter(s => {
        const recs = staffRecordMap[s.id] || [];
        return recs.some(r => r.manualType === manualFilter);
      });
    }

    return result.sort((a, b) => {
      const aPos = getPositionName(a, positions);
      const bPos = getPositionName(b, positions);
      if (aPos !== bPos) return aPos.localeCompare(bPos);
      return (a.hireDate || "").localeCompare(b.hireDate || "");
    });
  }, [staff, searchQuery, roleFilter, statusFilter, manualFilter, filterCard, staffRecordMap, positions]);

  const saveEmployeeMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingEmployee) {
        return apiRequest("PUT", `/api/training/staff/${editingEmployee.id}`, data);
      }
      return apiRequest("POST", "/api/training/staff", data);
    },
    onSuccess: async (res) => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/summary"] });
      const saved = await res.json();
      if (!editingEmployee) {
        setShowPostAddPrompt({ name: `${empFirstName} ${empLastName}`, role: empRole, id: saved.id });
      }
      resetEmployeeForm();
      setShowEmployeeModal(false);
      toast({ title: editingEmployee ? "Employee updated" : "Employee added" });
    },
    onError: (err: any) => {
      toast({ title: err.message || "Failed to save", variant: "destructive" });
    },
  });

  const saveRecordMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingRecord) {
        return apiRequest("PUT", `/api/training/records/${editingRecord.id}`, data);
      }
      return apiRequest("POST", "/api/training/records", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/summary"] });
      const wasCertifying = !editingRecord && recCertDate && recCertifiedBy && (parseInt(recScore) >= 90);
      resetRecordForm();
      setShowTrainingModal(false);
      toast({ title: editingRecord ? "Record updated" : "Training record created" });
      if (wasCertifying) {
        const certCount = records.filter(r => r.certified).length + 1;
        const dismissed = typeof window !== "undefined" && localStorage.getItem("manager-manual-banner-dismissed");
        if (certCount >= 3 && !dismissed) {
          setShowManagerBanner(true);
        }
      }
    },
    onError: (err: any) => {
      toast({ title: err.message || "Failed to save", variant: "destructive" });
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/training/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/summary"] });
      setDeleteConfirm(null);
      toast({ title: "Employee deactivated" });
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/training/records/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/summary"] });
      setDeleteConfirm(null);
      toast({ title: "Record deleted" });
    },
  });

  const resetEmployeeForm = () => {
    setEmpFirstName("");
    setEmpLastName("");
    setEmpRole("");
    setEmpHireDate(new Date().toISOString().split("T")[0]);
    setEmpStatus("active");
    setEmpNotes("");
    setEditingEmployee(null);
  };

  const resetRecordForm = () => {
    setRecStaffId(null);
    setRecManualType("");
    setRecStartDate(new Date().toISOString().split("T")[0]);
    setRecCertDate("");
    setRecScore("");
    setRecPassed(null);
    setRecCertifiedBy("");
    setRecExtraDays("0");
    setRecNotes("");
    setEditingRecord(null);
    setPreselectedStaffId(null);
  };

  const openEditEmployee = (member: StaffMember) => {
    setEditingEmployee(member);
    setEmpFirstName(member.firstName);
    setEmpLastName(member.lastName);
    setEmpRole(getPositionName(member, positions));
    setEmpHireDate(member.hireDate || "");
    setEmpStatus(member.status || "active");
    setEmpNotes("");
    setShowEmployeeModal(true);
  };

  const openAddTraining = (staffId: number) => {
    resetRecordForm();
    setPreselectedStaffId(staffId);
    setRecStaffId(staffId);
    setShowTrainingModal(true);
  };

  const openEditRecord = (record: TrainingRecord) => {
    setEditingRecord(record);
    setRecStaffId(record.staffMemberId);
    setRecManualType(record.manualType);
    setRecStartDate(record.trainingStartDate);
    setRecCertDate(record.certificationDate || "");
    setRecScore(record.assessmentScore?.toString() || "");
    setRecPassed(record.assessmentPassed ?? null);
    setRecCertifiedBy(record.certifiedBy || "");
    setRecExtraDays((record.additionalTrainingDays || 0).toString());
    setRecNotes(record.notes || "");
    setShowTrainingModal(true);
  };

  const handleSaveEmployee = () => {
    const posMatch = positions.find(p => p.name.toLowerCase() === empRole.toLowerCase());
    saveEmployeeMutation.mutate({
      firstName: empFirstName,
      lastName: empLastName,
      positionId: posMatch?.id || null,
      hireDate: empHireDate,
      status: empStatus,
    });
  };

  const handleSaveRecord = () => {
    const score = recScore ? parseInt(recScore) : null;
    const passed = score !== null ? score >= 90 : recPassed;
    saveRecordMutation.mutate({
      staffMemberId: recStaffId,
      manualType: recManualType,
      trainingStartDate: recStartDate,
      certificationDate: recCertDate || null,
      assessmentScore: score,
      assessmentPassed: passed,
      certifiedBy: recCertifiedBy || null,
      additionalTrainingDays: parseInt(recExtraDays) || 0,
      notes: recNotes || null,
    });
  };

  const handleExportCSV = () => {
    const header = "Employee Name,Role,Hire Date,Manual,Start Date,Cert Date,Score,Passed,Certified By,Notes";
    const rows = records.map(r => {
      const member = staff.find(s => s.id === r.staffMemberId);
      const name = member ? `${member.firstName} ${member.lastName}` : "Unknown";
      const role = member ? getPositionName(member, positions) : "—";
      const hireDate = member?.hireDate || "";
      return `"${name}","${role}","${hireDate}","${MANUAL_LABELS[r.manualType] || r.manualType}","${r.trainingStartDate}","${r.certificationDate || ""}","${r.assessmentScore ?? ""}","${r.assessmentPassed ? "Yes" : r.assessmentPassed === false ? "No" : ""}","${r.certifiedBy || ""}","${(r.notes || "").replace(/"/g, '""')}"`;
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `training-records-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportIndividual = useCallback((staffId: number) => {
    const member = staff.find(s => s.id === staffId);
    if (!member) return;
    const memberRecords = staffRecordMap[staffId] || [];
    const name = `${member.firstName} ${member.lastName}`;
    const role = getPositionName(member, positions);

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `<!DOCTYPE html>
<html><head><title>Training Record - ${name}</title>
<style>
body{font-family:Georgia,serif;margin:40px;color:#111;line-height:1.6}
h1{font-size:24px;margin-bottom:4px}
h2{font-size:18px;color:#333;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:24px}
.meta{color:#666;font-size:13px;margin-bottom:24px}
table{width:100%;border-collapse:collapse;margin:12px 0}
th,td{text-align:left;padding:8px 12px;border:1px solid #ddd;font-size:13px}
th{background:#f5f5f5;font-weight:600}
.sig{margin-top:40px;border-top:1px solid #999;padding-top:8px;font-size:13px;color:#666}
.footer{margin-top:40px;font-size:11px;color:#999;text-align:center}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}
.certified{background:#dcfce7;color:#166534}
.in-progress{background:#fef3c7;color:#92400e}
@media print{body{margin:20px}}
</style></head><body>
<h1>Employee Training Record</h1>
<p class="meta">${name} &middot; ${role} &middot; Hired ${formatDate(member.hireDate)}</p>
<p class="meta">Export Date: ${formatDate(new Date().toISOString().split("T")[0])}</p>
<h2>Training History</h2>
${memberRecords.length === 0 ? "<p>No training records on file.</p>" : `
<table>
<thead><tr><th>Manual</th><th>Start Date</th><th>Cert Date</th><th>Score</th><th>Status</th><th>Certified By</th><th>Notes</th></tr></thead>
<tbody>
${memberRecords.map(r => `<tr>
<td>${MANUAL_LABELS[r.manualType] || r.manualType}</td>
<td>${formatDate(r.trainingStartDate)}</td>
<td>${r.certificationDate ? formatDate(r.certificationDate) : "—"}</td>
<td>${r.assessmentScore !== null ? `${r.assessmentScore}/100` : "—"}</td>
<td><span class="badge ${r.certified ? "certified" : "in-progress"}">${r.certified ? "Certified" : "In Progress"}</span></td>
<td>${r.certifiedBy || "—"}</td>
<td>${r.notes || "—"}</td>
</tr>`).join("")}
</tbody></table>`}
<h2>Certification Summary</h2>
<table>
<thead><tr><th>Manual</th><th>Status</th></tr></thead>
<tbody>
${MANUAL_TYPES.map(mt => {
  const rec = memberRecords.find(r => r.manualType === mt);
  const status = rec ? (rec.certified ? "Certified" : "In Progress") : "Not Started";
  return `<tr><td>${MANUAL_LABELS[mt]}</td><td><span class="badge ${rec?.certified ? "certified" : rec ? "in-progress" : ""}">${status}</span></td></tr>`;
}).join("")}
</tbody></table>
<div class="sig">Manager Signature: ___________________________ Date: ___________</div>
<div class="footer">Confidential &mdash; Internal Use Only</div>
</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }, [staff, staffRecordMap, positions]);

  const detailMember = showDetailView ? staff.find(s => s.id === showDetailView) : null;
  const detailRecords = showDetailView ? (staffRecordMap[showDetailView] || []) : [];

  const isCertifying = !editingRecord && recCertDate && recCertifiedBy && (recScore ? parseInt(recScore) >= 90 : recPassed);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0f1117" }}>
      <header className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between" style={{ backgroundColor: "#0f1117", borderBottom: "1px solid #1a1d2e" }}>
        <div className="flex items-center gap-3">
          <Link href="/templates">
            <Button variant="ghost" size="icon" className="text-white" data-testid="btn-back-templates">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white" data-testid="text-page-title">Training Log</h1>
            <p className="text-xs" style={{ color: "#9ca3af" }}>Staff certifications and training records</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => { resetEmployeeForm(); setShowEmployeeModal(true); }}
            className="text-sm font-semibold"
            style={{ backgroundColor: "#d4a017", color: "#0f1117" }}
            data-testid="btn-add-employee"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Employee
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full" data-testid="btn-user-menu">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profileImageUrl || ""} />
                  <AvatarFallback style={{ backgroundColor: "#1a1d2e", color: "#d4a017" }}>{user?.firstName?.[0] || "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" style={{ backgroundColor: "#1a1d2e", border: "1px solid #2a2d3e" }}>
              <DropdownMenuLabel className="text-white">{user?.firstName} {user?.lastName}</DropdownMenuLabel>
              <DropdownMenuSeparator style={{ backgroundColor: "#2a2d3e" }} />
              <DropdownMenuItem onClick={() => navigate("/profile")} className="text-white cursor-pointer"><UserCog className="h-4 w-4 mr-2" /> Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => logout()} className="cursor-pointer" style={{ color: "#ef4444" }}><LogOut className="h-4 w-4 mr-2" /> Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <UpgradeGate domain="training-log">
          <div className="space-y-6">

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="section-cert-strip">
              {[
                { label: "Total Staff", value: summary?.totalStaff ?? 0, icon: Users, filter: "total" as FilterCard },
                { label: "Fully Certified", value: summary?.fullyCertified ?? 0, icon: Award, filter: "certified" as FilterCard },
                { label: "In Training", value: summary?.inTraining ?? 0, icon: Clock, filter: "training" as FilterCard },
                { label: "Certs This Month", value: summary?.certsThisMonth ?? 0, icon: CalendarCheck, filter: "month" as FilterCard },
              ].map((card, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg cursor-pointer transition-all"
                  style={{
                    backgroundColor: filterCard === card.filter ? "#252840" : "#1a1d2e",
                    borderLeft: `3px solid ${filterCard === card.filter ? "#d4a017" : "#b8860b"}`,
                  }}
                  onClick={() => setFilterCard(prev => prev === card.filter ? null : card.filter)}
                  data-testid={`cert-card-${card.filter}`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <card.icon className="h-3.5 w-3.5" style={{ color: "#d4a017" }} />
                    <span className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>{card.label}</span>
                  </div>
                  <p className="text-xl font-bold text-white">{card.value}</p>
                </div>
              ))}
            </div>

            {showManagerBanner && (
              <div className="flex items-center gap-3 p-4 rounded-lg" style={{ backgroundColor: "#1a1d2e", border: "1px solid #b8860b" }} data-testid="banner-manager-manual">
                <GraduationCap className="h-5 w-5 flex-shrink-0" style={{ color: "#d4a017" }} />
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">Your team is growing. Time to build the Manager Manual?</p>
                  <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>A certification program for your leadership team — covering operations, labor, food cost, and crisis management.</p>
                </div>
                <Link href="/templates?tab=manager">
                  <Button className="text-xs font-semibold flex-shrink-0" style={{ backgroundColor: "#d4a017", color: "#0f1117" }} data-testid="btn-manager-manual-cta" onClick={() => { setShowManagerBanner(false); if (typeof window !== "undefined") localStorage.setItem("manager-manual-banner-dismissed", "1"); }}>
                    Build It
                  </Button>
                </Link>
                <button
                  className="text-white bg-transparent border-none cursor-pointer p-1"
                  onClick={() => { setShowManagerBanner(false); if (typeof window !== "undefined") localStorage.setItem("manager-manual-banner-dismissed", "1"); }}
                  data-testid="btn-dismiss-manager-banner"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center" data-testid="section-filters">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#6b7280" }} />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  style={{ backgroundColor: "#12141f", border: "1px solid #2a2d3e", color: "white" }}
                  data-testid="input-search"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer" style={{ color: "#6b7280" }}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-md px-3 py-2 text-sm"
                style={{ backgroundColor: "#12141f", border: "1px solid #2a2d3e", color: "white" }}
                data-testid="select-role-filter"
              >
                <option value="all">All Roles</option>
                {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="rounded-md px-3 py-2 text-sm"
                style={{ backgroundColor: "#12141f", border: "1px solid #2a2d3e", color: "white" }}
                data-testid="select-status-filter"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="in-training">In Training</option>
                <option value="certified">Certified</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={manualFilter}
                onChange={(e) => setManualFilter(e.target.value)}
                className="rounded-md px-3 py-2 text-sm"
                style={{ backgroundColor: "#12141f", border: "1px solid #2a2d3e", color: "white" }}
                data-testid="select-manual-filter"
              >
                <option value="all">All Manuals</option>
                {MANUAL_TYPES.map(m => <option key={m} value={m}>{MANUAL_LABELS[m]}</option>)}
              </select>
            </div>

            {staffLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg animate-pulse" style={{ backgroundColor: "#1a1d2e" }} />)}
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="p-10 rounded-xl text-center" style={{ backgroundColor: "#1a1d2e", border: "1px solid #2a2d3e" }} data-testid="empty-state">
                <GraduationCap className="h-10 w-10 mx-auto mb-3" style={{ color: "#4a4d5e" }} />
                <p className="text-white font-medium mb-1">{staff.length === 0 ? "No staff members yet." : "No matches found."}</p>
                <p className="text-sm mb-4" style={{ color: "#9ca3af" }}>
                  {staff.length === 0 ? "Add your first employee to start tracking certifications." : "Try adjusting your filters."}
                </p>
                {staff.length === 0 && (
                  <Button onClick={() => { resetEmployeeForm(); setShowEmployeeModal(true); }} className="font-semibold" style={{ backgroundColor: "#d4a017", color: "#0f1117" }} data-testid="btn-add-employee-empty">
                    <Plus className="h-4 w-4 mr-1" /> Add Employee
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #2a2d3e" }} data-testid="table-staff">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: "#b8860b", color: "#0f1117" }}>
                        <th className="text-left py-2.5 px-3 font-semibold">Employee</th>
                        <th className="text-left py-2.5 px-3 font-semibold">Role</th>
                        <th className="text-left py-2.5 px-3 font-semibold hidden sm:table-cell">Hire Date</th>
                        <th className="text-left py-2.5 px-3 font-semibold">Manuals</th>
                        <th className="text-left py-2.5 px-3 font-semibold hidden md:table-cell">Last Certified</th>
                        <th className="text-left py-2.5 px-3 font-semibold">Status</th>
                        <th className="text-right py-2.5 px-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStaff.map((member, idx) => {
                        const recs = staffRecordMap[member.id] || [];
                        const certCount = recs.filter(r => r.certified).length;
                        const hasInProgress = recs.some(r => !r.certified);
                        const lastCertDate = recs.filter(r => r.certified && r.certificationDate).sort((a, b) => (b.certificationDate || "").localeCompare(a.certificationDate || ""))[0]?.certificationDate;
                        const posName = getPositionName(member, positions);
                        const roleColor = ROLE_COLORS[posName] || "#6b7280";
                        const isInactive = member.status === "inactive" || member.status === "terminated";
                        const statusColor = isInactive ? "#6b7280" : hasInProgress ? "#d4a017" : certCount > 0 ? "#22c55e" : "rgba(255,255,255,0.35)";
                        const statusText = isInactive ? (member.status === "terminated" ? "Terminated" : "Inactive") : hasInProgress ? "In Training" : certCount > 0 ? "Active" : "Active";

                        return (
                          <tr
                            key={member.id}
                            style={{ backgroundColor: idx % 2 === 0 ? "#1a1d2e" : "#12141f" }}
                            data-testid={`row-staff-${member.id}`}
                          >
                            <td className="py-2.5 px-3">
                              <span className="font-medium" style={{ color: "#d4a017" }}>{member.firstName} {member.lastName}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${roleColor}22`, color: roleColor }}>
                                {posName}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-white hidden sm:table-cell">{formatDate(member.hireDate)}</td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <span className="text-white text-xs">{certCount} of 6</span>
                                <div className="w-16 h-1.5 rounded-full" style={{ backgroundColor: "#2a2d3e" }}>
                                  <div className="h-full rounded-full" style={{ width: `${(certCount / 6) * 100}%`, backgroundColor: "#d4a017" }} />
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 hidden md:table-cell" title={lastCertDate ? formatDate(lastCertDate) : ""}>
                              <span style={{ color: "#9ca3af" }}>{relativeTime(lastCertDate || null)}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${statusColor}22`, color: statusColor }}>
                                {statusText}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => setShowDetailView(member.id)} className="p-1.5 rounded bg-transparent border-none cursor-pointer" style={{ color: "#9ca3af" }} data-testid={`btn-view-${member.id}`}><Eye className="h-3.5 w-3.5" /></button>
                                <button onClick={() => openEditEmployee(member)} className="p-1.5 rounded bg-transparent border-none cursor-pointer" style={{ color: "#9ca3af" }} data-testid={`btn-edit-${member.id}`}><Pencil className="h-3.5 w-3.5" /></button>
                                <button onClick={() => openAddTraining(member.id)} className="p-1.5 rounded bg-transparent border-none cursor-pointer" style={{ color: "#d4a017" }} data-testid={`btn-add-training-${member.id}`}><Plus className="h-3.5 w-3.5" /></button>
                                <button onClick={() => handleExportIndividual(member.id)} className="p-1.5 rounded bg-transparent border-none cursor-pointer" style={{ color: "#9ca3af" }} data-testid={`btn-export-${member.id}`}><Download className="h-3.5 w-3.5" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {records.length > 0 && (
                  <div className="py-2.5 px-3 text-center" style={{ backgroundColor: "#12141f", borderTop: "1px solid #2a2d3e" }}>
                    <button onClick={handleExportCSV} className="text-xs bg-transparent border-none cursor-pointer underline underline-offset-4" style={{ color: "#d4a017" }} data-testid="btn-export-csv">
                      <Download className="h-3 w-3 inline mr-1" /> Export all records as CSV
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </UpgradeGate>
      </main>

      {showEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div className="max-w-lg w-full mx-4 p-6 rounded-xl" style={{ backgroundColor: "#1a1d2e", border: "1px solid #b8860b" }} data-testid="modal-employee">
            <h3 className="text-white font-semibold text-lg mb-4">{editingEmployee ? "Edit Employee" : "Add Employee"}</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "#9ca3af" }}>First Name *</label>
                <Input value={empFirstName} onChange={(e) => setEmpFirstName(e.target.value)} style={{ backgroundColor: "#12141f", border: "1px solid #2a2d3e", color: "white" }} data-testid="input-emp-first" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "#9ca3af" }}>Last Name *</label>
                <Input value={empLastName} onChange={(e) => setEmpLastName(e.target.value)} style={{ backgroundColor: "#12141f", border: "1px solid #2a2d3e", color: "white" }} data-testid="input-emp-last" />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "#9ca3af" }}>Role *</label>
              <select value={empRole} onChange={(e) => setEmpRole(e.target.value)} className="w-full rounded-md px-3 py-2 text-sm" style={{ backgroundColor: "#12141f", border: "1px solid #2a2d3e", color: "white" }} data-testid="select-emp-role">
                <option value="">Select role</option>
                {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "#9ca3af" }}>Hire Date *</label>
                <Input type="date" value={empHireDate} onChange={(e) => setEmpHireDate(e.target.value)} style={{ backgroundColor: "#12141f", border: "1px solid #2a2d3e", color: "white" }} data-testid="input-emp-hire" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "#9ca3af" }}>Status</label>
                <select value={empStatus} onChange={(e) => setEmpStatus(e.target.value)} className="w-full rounded-md px-3 py-2 text-sm" style={{ backgroundColor: "#12141f", border: "1px solid #2a2d3e", color: "white" }} data-testid="select-emp-status">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
            </div>
            <div className="mb-6">
              <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "#9ca3af" }}>Notes (optional)</label>
              <Input value={empNotes} onChange={(e) => setEmpNotes(e.target.value)} placeholder='e.g. "Part-time, weekend shifts only"' style={{ backgroundColor: "#12141f", border: "1px solid #2a2d3e", color: "white" }} data-testid="input-emp-notes" />
            </div>
            <Button
              onClick={handleSaveEmployee}
              disabled={saveEmployeeMutation.isPending || !empFirstName || !empLastName || !empRole}
              className="w-full font-semibold text-base py-3"
              style={{ backgroundColor: "#d4a017", color: "#0f1117" }}
              data-testid="btn-save-employee"
            >
              {saveEmployeeMutation.isPending ? "Saving..." : editingEmployee ? "Save Changes" : "Add Employee"}
            </Button>
            <button onClick={() => { setShowEmployeeModal(false); resetEmployeeForm(); }} className="w-full text-center mt-3 text-xs bg-transparent border-none cursor-pointer" style={{ color: "#9ca3af" }}>Cancel</button>
          </div>
        </div>
      )}

      {showPostAddPrompt && (() => {
        const roleManualMap: Record<string, string> = {
          "Server": "server",
          "Bartender": "bartender",
          "Host": "host",
          "Busser": "busser",
          "Kitchen Staff": "kitchen",
          "Kitchen": "kitchen",
          "Manager": "manager",
        };
        const manualTab = roleManualMap[showPostAddPrompt.role];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
            <div className="max-w-md w-full mx-4 p-6 rounded-xl" style={{ backgroundColor: "#1a1d2e", border: "1px solid #b8860b" }} data-testid="modal-post-add">
              <p className="text-white mb-1 font-medium">{showPostAddPrompt.name} has been added as a {showPostAddPrompt.role}.</p>
              <p className="text-sm mb-4" style={{ color: "#9ca3af" }}>Would you like to start a training record for them now?</p>
              <div className="flex gap-3">
                <Button onClick={() => { openAddTraining(showPostAddPrompt.id); setShowPostAddPrompt(null); }} className="flex-1 font-semibold" style={{ backgroundColor: "#d4a017", color: "#0f1117" }} data-testid="btn-start-training">
                  <Plus className="h-4 w-4 mr-1" /> Start Training Record
                </Button>
                <Button onClick={() => setShowPostAddPrompt(null)} variant="ghost" className="text-white" data-testid="btn-not-yet">Not yet</Button>
              </div>
              {manualTab && (
                <div className="mt-4 pt-3 border-t" style={{ borderColor: "#2a2d3e" }}>
                  <p className="text-xs mb-2" style={{ color: "#9ca3af" }}>
                    Make sure you have a {MANUAL_LABELS[manualTab]} ready for their training.
                  </p>
                  <Link href={`/templates?tab=${manualTab}`}>
                    <button
                      className="text-xs font-medium underline bg-transparent border-none cursor-pointer"
                      style={{ color: "#d4a017" }}
                      onClick={() => setShowPostAddPrompt(null)}
                      data-testid="link-generate-manual"
                    >
                      Go to {MANUAL_LABELS[manualTab]}
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {showTrainingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div className="max-w-lg w-full mx-4 p-6 rounded-xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "#1a1d2e", border: "1px solid #b8860b" }} data-testid="modal-training">
            <h3 className="text-white font-semibold text-lg mb-4">{editingRecord ? "Edit Training Record" : "Start Training Record"}</h3>

            <div className="mb-4">
              <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "#9ca3af" }}>Employee</label>
              {preselectedStaffId || editingRecord ? (
                <p className="text-white text-sm">{(() => { const m = staff.find(s => s.id === (preselectedStaffId || editingRecord?.staffMemberId)); return m ? `${m.firstName} ${m.lastName}` : "—"; })()}</p>
              ) : (
                <select value={recStaffId || ""} onChange={(e) => setRecStaffId(parseInt(e.target.value))} className="w-full rounded-md px-3 py-2 text-sm" style={{ backgroundColor: "#12141f", border: "1px solid #2a2d3e", color: "white" }} data-testid="select-rec-staff">
                  <option value="">Select employee</option>
                  {staff.filter(s => s.status === "active").map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                </select>
              )}
            </div>

            <div className="mb-4">
              <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "#9ca3af" }}>Manual / Training Program *</label>
              <select
                value={recManualType}
                onChange={(e) => setRecManualType(e.target.value)}
                disabled={!!editingRecord}
                className="w-full rounded-md px-3 py-2 text-sm"
                style={{ backgroundColor: "#12141f", border: "1px solid #2a2d3e", color: "white" }}
                data-testid="select-rec-manual"
              >
                <option value="">Select manual</option>
                {MANUAL_TYPES.map(m => <option key={m} value={m}>{MANUAL_LABELS[m]}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "#9ca3af" }}>Training Start Date *</label>
                <Input type="date" value={recStartDate} onChange={(e) => setRecStartDate(e.target.value)} style={{ backgroundColor: "#12141f", border: "1px solid #2a2d3e", color: "white" }} data-testid="input-rec-start" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "#9ca3af" }}>Certification Date</label>
                <Input type="date" value={recCertDate} onChange={(e) => setRecCertDate(e.target.value)} style={{ backgroundColor: "#12141f", border: "1px solid #2a2d3e", color: "white" }} data-testid="input-rec-cert-date" />
                <p className="text-[10px] mt-1" style={{ color: "#6b7280" }}>Leave blank if still in training</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "#9ca3af" }}>Assessment Score</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={recScore}
                    onChange={(e) => {
                      setRecScore(e.target.value);
                      const s = parseInt(e.target.value);
                      if (!isNaN(s)) setRecPassed(s >= 90);
                    }}
                    placeholder="—"
                    className="w-20"
                    style={{ backgroundColor: "#12141f", border: "1px solid #2a2d3e", color: "white" }}
                    data-testid="input-rec-score"
                  />
                  <span className="text-sm" style={{ color: "#6b7280" }}>/ 100</span>
                </div>
                {recScore && (
                  <p className="text-[10px] mt-1" style={{ color: parseInt(recScore) >= 90 ? "#22c55e" : "#ef4444" }}>
                    {parseInt(recScore) >= 90 ? "Passed (90%+ threshold)" : "Below passing threshold (90%)"}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "#9ca3af" }}>Additional Training Days</label>
                <Input type="number" min="0" value={recExtraDays} onChange={(e) => setRecExtraDays(e.target.value)} className="w-20" style={{ backgroundColor: "#12141f", border: "1px solid #2a2d3e", color: "white" }} data-testid="input-rec-extra-days" />
                <p className="text-[10px] mt-1" style={{ color: "#6b7280" }}>Beyond standard program</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "#9ca3af" }}>Certified By (Manager Name) {recCertDate ? "*" : ""}</label>
              <Input value={recCertifiedBy} onChange={(e) => setRecCertifiedBy(e.target.value)} placeholder="Manager name" style={{ backgroundColor: "#12141f", border: "1px solid #2a2d3e", color: "white" }} data-testid="input-rec-certified-by" />
              {recCertDate && !recCertifiedBy && (
                <p className="text-[10px] mt-1" style={{ color: "#d4a017" }}>Required to mark as certified</p>
              )}
            </div>

            <div className="mb-6">
              <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "#9ca3af" }}>Notes</label>
              <Input value={recNotes} onChange={(e) => setRecNotes(e.target.value)} placeholder='e.g. "Strong on TABC, needs work on POS."' style={{ backgroundColor: "#12141f", border: "1px solid #2a2d3e", color: "white" }} data-testid="input-rec-notes" />
            </div>

            <Button
              onClick={handleSaveRecord}
              disabled={saveRecordMutation.isPending || !recStaffId || !recManualType || !recStartDate}
              className="w-full font-semibold text-base py-3"
              style={{ backgroundColor: "#d4a017", color: "#0f1117" }}
              data-testid="btn-save-record"
            >
              {saveRecordMutation.isPending ? "Saving..." : isCertifying ? "Certify Employee" : editingRecord ? "Save Changes" : "Start Training"}
            </Button>
            <button onClick={() => { setShowTrainingModal(false); resetRecordForm(); }} className="w-full text-center mt-3 text-xs bg-transparent border-none cursor-pointer" style={{ color: "#9ca3af" }}>Cancel</button>
          </div>
        </div>
      )}

      {showDetailView && detailMember && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div className="w-full sm:max-w-2xl mx-0 sm:mx-4 rounded-t-xl sm:rounded-xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "#1a1d2e", border: "1px solid #2a2d3e" }} data-testid="modal-detail">
            <div className="p-6 border-b" style={{ borderColor: "#2a2d3e" }}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-white">{detailMember.firstName} {detailMember.lastName}</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleExportIndividual(detailMember.id)} className="p-2 rounded bg-transparent border-none cursor-pointer" style={{ color: "#d4a017" }} data-testid="btn-detail-export"><Download className="h-4 w-4" /></button>
                  <button onClick={() => openEditEmployee(detailMember)} className="p-2 rounded bg-transparent border-none cursor-pointer" style={{ color: "#9ca3af" }} data-testid="btn-detail-edit"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setShowDetailView(null)} className="p-2 rounded bg-transparent border-none cursor-pointer" style={{ color: "#9ca3af" }} data-testid="btn-detail-close"><X className="h-4 w-4" /></button>
                </div>
              </div>
              <p className="text-sm" style={{ color: "#9ca3af" }}>
                {getPositionName(detailMember, positions)} &middot; Hired {formatDate(detailMember.hireDate)} &middot; {detailMember.status === "active" ? "Active" : detailMember.status === "terminated" ? "Terminated" : "Inactive"}
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
                {MANUAL_TYPES.map(mt => {
                  const rec = detailRecords.find(r => r.manualType === mt);
                  const isCert = rec?.certified;
                  const inProg = rec && !rec.certified;
                  return (
                    <div key={mt} className="text-center p-2 rounded-lg" style={{ backgroundColor: "#12141f", border: `1px solid ${isCert ? "#22c55e33" : inProg ? "#d4a01733" : "#2a2d3e"}` }}>
                      <span className="text-lg">{isCert ? "✓" : inProg ? "⏳" : "—"}</span>
                      <p className="text-[10px] mt-1" style={{ color: isCert ? "#22c55e" : inProg ? "#d4a017" : "#6b7280" }}>
                        {MANUAL_LABELS[mt].replace(" Manual", "")}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#d4a017" }}>Training History</h3>
                <button onClick={() => openAddTraining(detailMember.id)} className="text-xs font-medium bg-transparent border-none cursor-pointer flex items-center gap-1" style={{ color: "#d4a017" }} data-testid="btn-detail-add-training">
                  <Plus className="h-3 w-3" /> Add Training
                </button>
              </div>

              {detailRecords.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: "#6b7280" }}>No training records yet.</p>
              ) : (
                <div className="space-y-3">
                  {detailRecords.map(rec => {
                    const isCert = rec.certified;
                    const borderColor = isCert ? "#22c55e" : "#d4a017";
                    const days = rec.certificationDate ? Math.ceil((new Date(rec.certificationDate + "T12:00:00").getTime() - new Date(rec.trainingStartDate + "T12:00:00").getTime()) / (1000 * 60 * 60 * 24)) : null;

                    return (
                      <div key={rec.id} className="p-4 rounded-lg" style={{ backgroundColor: "#12141f", border: `1px solid ${borderColor}33` }} data-testid={`record-card-${rec.id}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span style={{ color: borderColor }}>{isCert ? "✓" : "⏳"}</span>
                            <span className="font-semibold text-sm" style={{ color: isCert ? "#d4a017" : "#9ca3af" }}>
                              {(MANUAL_LABELS[rec.manualType] || rec.manualType).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs" style={{ color: "#9ca3af" }}>
                              {isCert ? formatDate(rec.certificationDate) : "In Progress"}
                            </span>
                            <button onClick={() => openEditRecord(rec)} className="p-1 bg-transparent border-none cursor-pointer" style={{ color: "#6b7280" }} data-testid={`btn-edit-record-${rec.id}`}><Pencil className="h-3 w-3" /></button>
                            <button onClick={() => setDeleteConfirm({ type: "record", id: rec.id })} className="p-1 bg-transparent border-none cursor-pointer" style={{ color: "#6b7280" }} data-testid={`btn-delete-record-${rec.id}`}><Trash2 className="h-3 w-3" /></button>
                          </div>
                        </div>
                        {isCert && rec.certifiedBy && (
                          <p className="text-xs mb-1" style={{ color: "#9ca3af" }}>Certified by: {rec.certifiedBy}</p>
                        )}
                        {rec.assessmentScore !== null && (
                          <p className="text-xs mb-1" style={{ color: "#9ca3af" }}>
                            Score: {rec.assessmentScore}/100 &middot; {rec.assessmentPassed ? "Passed" : "Needs Additional Training"}
                          </p>
                        )}
                        {days !== null && (
                          <p className="text-xs mb-1" style={{ color: "#9ca3af" }}>
                            Training: {formatDate(rec.trainingStartDate)} &ndash; {formatDate(rec.certificationDate)} ({days} days)
                          </p>
                        )}
                        {!isCert && (
                          <p className="text-xs mb-1" style={{ color: "#9ca3af" }}>Started: {formatDate(rec.trainingStartDate)}</p>
                        )}
                        {rec.notes && <p className="text-xs italic mt-1" style={{ color: "#6b7280" }}>"{rec.notes}"</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div className="max-w-sm w-full mx-4 p-6 rounded-xl" style={{ backgroundColor: "#1a1d2e", border: "1px solid #2a2d3e" }} data-testid="modal-delete-confirm">
            <h3 className="text-white font-semibold mb-2">
              {deleteConfirm.type === "staff" ? "Deactivate this employee?" : "Delete this training record?"}
            </h3>
            <p className="text-sm mb-4" style={{ color: "#9ca3af" }}>
              {deleteConfirm.type === "staff" ? "The employee will be marked as inactive." : "This action cannot be undone."}
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setDeleteConfirm(null)} variant="ghost" className="flex-1 text-white" data-testid="btn-cancel-delete">Cancel</Button>
              <Button
                onClick={() => {
                  if (deleteConfirm.type === "staff") deleteStaffMutation.mutate(deleteConfirm.id);
                  else deleteRecordMutation.mutate(deleteConfirm.id);
                }}
                className="flex-1"
                style={{ backgroundColor: "#ef4444", color: "white" }}
                disabled={deleteStaffMutation.isPending || deleteRecordMutation.isPending}
                data-testid="btn-confirm-delete"
              >
                {deleteConfirm.type === "staff" ? "Deactivate" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
