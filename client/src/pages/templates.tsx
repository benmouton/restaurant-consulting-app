import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ChefHat, 
  LogOut,
  ArrowLeft,
  Users,
  BookOpen,
  ClipboardList,
  FileText,
  CheckSquare,
  GraduationCap,
  Printer,
  UserCog,
  ChevronDown,
  UserPlus,
  CheckCircle2,
  Clock,
  Trash2,
  Award,
  Calendar,
  Share2,
  Copy,
  Edit3,
  Sparkles,
  X,
  Loader2,
  ChevronRight,
  Wine,
  Briefcase,
  HandMetal,
  StickyNote,
  Shield,
} from "lucide-react";
import { isNativeApp, nativeShare, hapticTap, hapticSuccess } from "@/lib/native";
import { useOfflineCache } from "@/hooks/use-native-features";
import { OfflineBanner } from "@/components/OfflineBanner";
import { HandbookBuilder } from "@/components/handbook/HandbookBuilder";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TrainingTemplate } from "@shared/schema";
import ReactMarkdown from "react-markdown";

function personalizeContent(content: string, restaurantName: string | null | undefined): string {
  if (!restaurantName) return content;
  return content.replace(/Mouton's Bistro & Bar|Mouton's Bistro|Mouton's/gi, restaurantName);
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

const contentTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  overview: BookOpen,
  procedure: FileText,
  checklist: ClipboardList,
  assessment: CheckSquare,
};

const contentTypeColors: Record<string, { bg: string; text: string; label: string }> = {
  overview: { bg: "rgba(212,160,23,0.15)", text: "#d4a017", label: "Overview" },
  procedure: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", label: "Procedure" },
  policy: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b", label: "Policy" },
  quiz: { bg: "rgba(34,197,94,0.15)", text: "#22c55e", label: "Quiz" },
  checklist: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", label: "Checklist" },
  assessment: { bg: "rgba(34,197,94,0.15)", text: "#22c55e", label: "Assessment" },
};

const serverDayTitles: Record<number, string> = {
  1: "Orientation",
  2: "Menu Knowledge",
  3: "Beverage & Compliance",
  4: "Service Steps",
  5: "Advanced Service",
  6: "Complex Scenarios",
  7: "Final Evaluation",
};

const kitchenDayTitles: Record<number, string> = {
  1: "Kitchen Orientation",
  2: "Station Training",
  3: "Prep & Production",
  4: "Line Operations",
  5: "Plating & Quality",
  6: "Rush Management",
  7: "Final Assessment",
};

function getDayTitle(category: string, dayNumber: number): string {
  const titles = category === "server" ? serverDayTitles : kitchenDayTitles;
  return titles[dayNumber] || `Day ${dayNumber}`;
}

const COMING_SOON_ROLES: Record<string, { icon: React.ComponentType<{ className?: string }>; description: string; responsibilities: string }> = {
  host: {
    icon: Users,
    description: "Structured training for hosts and hostesses covering reservation management, seating flow, guest experience, and waitlist management.",
    responsibilities: "Greeting guests, managing reservations, seating rotation, waitlist management, phone handling, first impression standards",
  },
  bartender: {
    icon: Wine,
    description: "Comprehensive bartender training covering cocktail preparation, speed techniques, responsible alcohol service, and bar inventory management.",
    responsibilities: "Cocktail preparation, speed bartending, responsible alcohol service, bar inventory, guest interaction, bar cleanliness",
  },
  manager: {
    icon: Briefcase,
    description: "Shift lead and manager training covering labor management, conflict resolution, opening/closing procedures, and operational decision-making.",
    responsibilities: "Shift management, labor cost control, conflict resolution, opening/closing procedures, team leadership, operational decisions",
  },
  busser: {
    icon: HandMetal,
    description: "Food runner and busser training covering table turnover, support service, dish handling, and team coordination during peak service.",
    responsibilities: "Table clearing, resetting, food running, dish handling, team coordination, cleanliness standards",
  },
};

interface TrainingCompletion {
  id: number;
  assignmentId: number;
  dayNumber: number;
  completedAt: string;
  signedOffBy: string;
  notes: string | null;
}

interface TrainingAssignment {
  id: number;
  userId: string;
  employeeName: string;
  templateCategory: string;
  totalDays: number;
  status: string;
  startDate: string;
  completedDate: string | null;
  createdAt: string;
  completions: TrainingCompletion[];
}

function TrainingIntelligenceStrip() {
  const { data: allAssignments } = useQuery<TrainingAssignment[]>({
    queryKey: ["/api/training-assignments"],
  });
  const { data: templates } = useQuery<TrainingTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const rolesWithManuals = templates
    ? new Set(templates.map(t => t.category)).size
    : 0;

  const staffAssigned = allAssignments?.length || 0;
  const handbookPolicies = 0;
  const handbookStatus = "Not Started";

  const metrics = [
    { label: "Roles with Manuals", value: `${rolesWithManuals}`, icon: BookOpen },
    { label: "Handbook Status", value: handbookStatus, icon: Shield },
    { label: "Staff Assigned", value: `${staffAssigned}`, icon: Users },
    { label: "Handbook Policies", value: `${handbookPolicies}`, icon: FileText },
  ];

  return (
    <div className="flex gap-3 mb-6 overflow-x-auto pb-2" data-testid="training-intelligence-strip">
      {metrics.map((metric, i) => (
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
  );
}

function TrainingProgressPanel({ activeCategory }: { activeCategory: string }) {
  const { toast } = useToast();
  const [panelOpen, setPanelOpen] = useState(true);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [expandedAssignment, setExpandedAssignment] = useState<number | null>(null);
  const [employeeName, setEmployeeName] = useState("");
  const [trainerName, setTrainerName] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);

  const { data: allAssignments, isLoading } = useQuery<TrainingAssignment[]>({
    queryKey: ["/api/training-assignments"],
  });

  const assignments = allAssignments?.filter(a => a.templateCategory === activeCategory) || [];

  const createMutation = useMutation({
    mutationFn: async (data: { employeeName: string; templateCategory: string; totalDays: number; startDate: string }) => {
      const res = await apiRequest("POST", "/api/training-assignments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-assignments"] });
      setShowAssignForm(false);
      setEmployeeName("");
      setTrainerName("");
      setStartDate(new Date().toISOString().split("T")[0]);
      toast({ title: "Training assigned successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign training", description: error.message, variant: "destructive" });
    },
  });

  const completeDayMutation = useMutation({
    mutationFn: async ({ assignmentId, dayNumber, signedOffBy }: { assignmentId: number; dayNumber: number; signedOffBy: string }) => {
      const res = await apiRequest("POST", `/api/training-assignments/${assignmentId}/days`, { dayNumber, signedOffBy, notes: null });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-assignments"] });
      toast({ title: "Day marked as complete" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to mark day complete", description: error.message, variant: "destructive" });
    },
  });

  const uncompleteDayMutation = useMutation({
    mutationFn: async ({ completionId }: { completionId: number }) => {
      await apiRequest("DELETE", `/api/training-day-completions/${completionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-assignments"] });
      toast({ title: "Day completion removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove completion", description: error.message, variant: "destructive" });
    },
  });

  const certifyMutation = useMutation({
    mutationFn: async ({ assignmentId }: { assignmentId: number }) => {
      const res = await apiRequest("PATCH", `/api/training-assignments/${assignmentId}`, {
        status: "completed",
        completedDate: new Date().toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-assignments"] });
      toast({ title: "Employee certified successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to certify employee", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ assignmentId }: { assignmentId: number }) => {
      await apiRequest("DELETE", `/api/training-assignments/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-assignments"] });
      toast({ title: "Assignment removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove assignment", description: error.message, variant: "destructive" });
    },
  });

  function getStatusBadge(assignment: TrainingAssignment) {
    const daysSinceStart = Math.floor((Date.now() - new Date(assignment.startDate).getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = assignment.status !== "completed" && daysSinceStart > 14;

    if (assignment.status === "completed") {
      return <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate" style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e' }} data-testid={`badge-status-${assignment.id}`}>Completed</Badge>;
    }
    if (isOverdue) {
      return <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }} data-testid={`badge-status-${assignment.id}`}>Overdue</Badge>;
    }
    return <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate" style={{ backgroundColor: 'rgba(212,160,23,0.15)', color: '#d4a017' }} data-testid={`badge-status-${assignment.id}`}>In Progress</Badge>;
  }

  function getRoleBadge(category: string) {
    const colors: Record<string, { bg: string; text: string }> = {
      server: { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa' },
      kitchen: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
    };
    const c = colors[category] || { bg: 'rgba(156,163,175,0.15)', text: '#9ca3af' };
    return (
      <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate" style={{ backgroundColor: c.bg, color: c.text }}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </Badge>
    );
  }

  function handleSubmitAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeName.trim()) return;
    createMutation.mutate({
      employeeName: employeeName.trim(),
      templateCategory: activeCategory,
      totalDays: 7,
      startDate,
    });
  }

  const categoryLabel = activeCategory === "server" ? "Server Training" : "Kitchen Training";

  return (
    <Collapsible open={panelOpen} onOpenChange={setPanelOpen} className="mb-6">
      <div className="rounded-lg" style={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e' }}>
        <div className="flex items-center justify-between gap-2 flex-wrap p-4 pb-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 p-0 text-white" data-testid="button-toggle-progress-panel">
              <GraduationCap className="h-5 w-5" style={{ color: '#d4a017' }} />
              <span className="text-lg font-semibold">Employee Training Progress</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${panelOpen ? "rotate-180" : ""}`} style={{ color: '#9ca3af' }} />
            </Button>
          </CollapsibleTrigger>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAssignForm(!showAssignForm)}
            style={{ borderColor: '#d4a017', color: '#d4a017' }}
            data-testid="button-assign-training"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Training
          </Button>
        </div>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2">
            {showAssignForm && (
              <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: '#0f1117', border: '1px solid #2a2d3e' }}>
                <form onSubmit={handleSubmitAssignment} className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[180px]">
                    <label className="text-sm font-medium mb-1 block" style={{ color: '#9ca3af' }}>Employee Name</label>
                    <Input
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      placeholder="Employee name"
                      required
                      className="border-[#2a2d3e] text-white focus:ring-[#d4a017]"
                      style={{ backgroundColor: '#0f1117' }}
                      data-testid="input-employee-name"
                    />
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <label className="text-sm font-medium mb-1 block" style={{ color: '#9ca3af' }}>Trainer Name</label>
                    <Input
                      value={trainerName}
                      onChange={(e) => setTrainerName(e.target.value)}
                      placeholder="Who will sign off"
                      className="border-[#2a2d3e] text-white focus:ring-[#d4a017]"
                      style={{ backgroundColor: '#0f1117' }}
                      data-testid="input-trainer-name"
                    />
                  </div>
                  <div className="min-w-[160px]">
                    <label className="text-sm font-medium mb-1 block" style={{ color: '#9ca3af' }}>Start Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="border-[#2a2d3e] text-white focus:ring-[#d4a017]"
                      style={{ backgroundColor: '#0f1117' }}
                      data-testid="input-start-date"
                    />
                  </div>
                  <Button type="submit" disabled={createMutation.isPending || !employeeName.trim()} style={{ backgroundColor: '#d4a017', color: '#0f1117' }} data-testid="button-submit-assignment">
                    {createMutation.isPending ? "Assigning..." : "Submit"}
                  </Button>
                </form>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" style={{ backgroundColor: '#2a2d3e' }} />
                ))}
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-6 text-sm" style={{ color: '#9ca3af' }}>
                <Clock className="h-8 w-8 mx-auto mb-2" style={{ color: '#4a4d5e' }} />
                No training assignments for {categoryLabel}. Click "Assign Training" to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment) => {
                  const completedDays = assignment.completions.length;
                  const progressPercent = Math.round((completedDays / assignment.totalDays) * 100);
                  const isExpanded = expandedAssignment === assignment.id;
                  const day7Complete = assignment.completions.some(c => c.dayNumber === 7);

                  return (
                    <div
                      key={assignment.id}
                      className="rounded-lg p-4"
                      style={{ backgroundColor: '#0f1117', border: '1px solid #2a2d3e' }}
                      data-testid={`assignment-card-${assignment.id}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                          <span className="font-semibold text-sm truncate text-white" data-testid={`text-employee-name-${assignment.id}`}>
                            {assignment.employeeName}
                          </span>
                          {getRoleBadge(assignment.templateCategory)}
                          <span className="text-sm" style={{ color: '#9ca3af' }}>
                            Day {completedDays} of {assignment.totalDays} ({progressPercent}%)
                          </span>
                          {getStatusBadge(assignment)}
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          {day7Complete && assignment.status !== "completed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => certifyMutation.mutate({ assignmentId: assignment.id })}
                              disabled={certifyMutation.isPending}
                              style={{ borderColor: '#d4a017', color: '#d4a017' }}
                              data-testid={`button-certify-${assignment.id}`}
                            >
                              <Award className="h-4 w-4 mr-1" />
                              Certify
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setExpandedAssignment(isExpanded ? null : assignment.id)}
                            className="text-white"
                            data-testid={`button-expand-${assignment.id}`}
                          >
                            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate({ assignmentId: assignment.id })}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-assignment-${assignment.id}`}
                          >
                            <Trash2 className="h-4 w-4" style={{ color: '#9ca3af' }} />
                          </Button>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#2a2d3e' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${progressPercent}%`,
                            backgroundColor: assignment.status === "completed" ? '#22c55e' : '#d4a017',
                          }}
                        />
                      </div>

                      {isExpanded && (
                        <div className="mt-4 space-y-2">
                          {Array.from({ length: assignment.totalDays }, (_, i) => i + 1).map((dayNum) => {
                            const completion = assignment.completions.find(c => c.dayNumber === dayNum);
                            const dayTitle = getDayTitle(assignment.templateCategory, dayNum);

                            return (
                              <div
                                key={dayNum}
                                className="flex flex-wrap items-center justify-between gap-2 py-2"
                                style={{ borderBottom: '1px solid #2a2d3e' }}
                                data-testid={`day-row-${assignment.id}-${dayNum}`}
                              >
                                {completion ? (
                                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                                    <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: '#22c55e' }} />
                                    <span className="text-sm text-white">
                                      Day {dayNum}: {dayTitle}
                                    </span>
                                    <span className="text-xs" style={{ color: '#9ca3af' }}>
                                      Completed by {completion.signedOffBy} on {new Date(completion.completedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                                    <Clock className="h-4 w-4 shrink-0" style={{ color: '#4a4d5e' }} />
                                    <span className="text-sm" style={{ color: '#9ca3af' }}>
                                      Day {dayNum}: {dayTitle}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  {completion ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => uncompleteDayMutation.mutate({ completionId: completion.id })}
                                      disabled={uncompleteDayMutation.isPending}
                                      className="text-white"
                                      data-testid={`button-uncomplete-day-${assignment.id}-${dayNum}`}
                                    >
                                      Undo
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => completeDayMutation.mutate({
                                        assignmentId: assignment.id,
                                        dayNumber: dayNum,
                                        signedOffBy: trainerName || "Manager",
                                      })}
                                      disabled={completeDayMutation.isPending}
                                      style={{ borderColor: '#2a2d3e', color: '#d4a017' }}
                                      data-testid={`button-complete-day-${assignment.id}-${dayNum}`}
                                    >
                                      <CheckSquare className="h-3 w-3 mr-1" />
                                      Mark Complete
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function ComingSoonTab({ role }: { role: string }) {
  const { toast } = useToast();
  const roleConfig = COMING_SOON_ROLES[role];
  const RoleIcon = roleConfig?.icon || GraduationCap;
  const [responsibilities, setResponsibilities] = useState(roleConfig?.responsibilities || "");
  const [duration, setDuration] = useState("5 days");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGeneratedContent("");

    try {
      const response = await fetch("/api/training/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          role: role.charAt(0).toUpperCase() + role.slice(1),
          responsibilities: responsibilities.trim() || undefined,
          duration,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullContent += data.content;
                setGeneratedContent(fullContent);
              }
            } catch {}
          }
        }
      }
    } catch {
      toast({ title: "Failed to generate training content", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6" style={{ animation: 'scheduleStaggerIn 0.3s ease-out both' }}>
      <div className="rounded-lg p-6" style={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(212,160,23,0.15)' }}>
            <Sparkles className="h-5 w-5" style={{ color: '#d4a017' }} />
          </div>
          <div>
            <h3 className="font-semibold text-white text-lg">Quick-Start Outline</h3>
            <p className="text-sm" style={{ color: '#9ca3af' }}>Generate a training outline for this role instantly</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block" style={{ color: '#9ca3af' }}>Key Responsibilities</label>
            <Textarea
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              placeholder="Describe the key responsibilities for this role..."
              rows={3}
              className="border-[#2a2d3e] text-white focus:ring-[#d4a017] resize-none"
              style={{ backgroundColor: '#0f1117' }}
              data-testid={`textarea-responsibilities-${role}`}
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[180px]">
              <label className="text-sm font-medium mb-1.5 block" style={{ color: '#9ca3af' }}>Training Duration</label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="border-[#2a2d3e] text-white" style={{ backgroundColor: '#0f1117' }} data-testid={`select-duration-${role}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3 days">3 Days</SelectItem>
                  <SelectItem value="5 days">5 Days</SelectItem>
                  <SelectItem value="7 days">7 Days</SelectItem>
                  <SelectItem value="10 days">10 Days</SelectItem>
                  <SelectItem value="14 days">14 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{ backgroundColor: '#d4a017', color: '#0f1117' }}
              data-testid={`button-generate-${role}`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>

        {generatedContent && (
          <div className="mt-6">
            <div className="rounded-lg p-4" style={{ backgroundColor: '#0f1117', border: '1px solid #2a2d3e', borderLeftWidth: '3px', borderLeftColor: '#d4a017', animation: isGenerating ? 'goldStreamBorder 2s ease-in-out infinite' : 'none' }}>
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>{generatedContent}</ReactMarkdown>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(generatedContent);
                  toast({ title: "Copied to clipboard" });
                }}
                style={{ borderColor: '#2a2d3e', color: '#9ca3af' }}
                data-testid={`button-copy-generated-${role}`}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg p-6" style={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e' }}>
        <div className="flex items-center gap-3 mb-3">
          <RoleIcon className="h-6 w-6 gold-text" />
          <h3 className="font-semibold text-white text-lg">
            {role.charAt(0).toUpperCase() + role.slice(1)} Training
          </h3>
          <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate italic" style={{ backgroundColor: 'rgba(156,163,175,0.15)', color: '#9ca3af' }}>
            Soon
          </Badge>
        </div>
        <p className="text-sm mb-3" style={{ color: '#9ca3af' }}>
          {roleConfig?.description}
        </p>
        <p className="text-xs" style={{ color: '#6b7280' }}>
          Until this track is available, use the Server or Kitchen training programs as a starting framework and customize with your own notes.
        </p>
      </div>
    </div>
  );
}

function CustomizePanel({ template, restaurantName, onClose }: { template: TrainingTemplate; restaurantName?: string | null; onClose: () => void }) {
  const { toast } = useToast();
  const [customPrompt, setCustomPrompt] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCustomize = async () => {
    if (!customPrompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setGeneratedContent("");

    try {
      const context = `Original training content for "${template.title}" (${template.section}):\n\n${template.content.slice(0, 1500)}`;
      const response = await fetch("/api/consultant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          question: `Customize this training content based on: ${customPrompt}`,
          context,
        }),
      });

      if (!response.ok) throw new Error("Failed");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                full += data.content;
                setGeneratedContent(full);
              }
            } catch {}
          }
        }
      }
    } catch {
      toast({ title: "Failed to customize", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReplace = () => {
    if (!generatedContent) return;
    const key = `template-notes-${template.id}`;
    localStorage.setItem(key, generatedContent);
    toast({ title: "Content saved as notes" });
    onClose();
  };

  const handleAddAsNotes = () => {
    if (!generatedContent) return;
    const key = `template-notes-${template.id}`;
    const existing = localStorage.getItem(key) || "";
    localStorage.setItem(key, existing ? `${existing}\n\n---\n\n${generatedContent}` : generatedContent);
    toast({ title: "Added to notes" });
    onClose();
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex" style={{ animation: 'scheduleStaggerIn 0.2s ease-out both' }}>
      <div className="w-[380px] max-w-full h-full overflow-y-auto" style={{ backgroundColor: '#1a1d2e', borderLeft: '1px solid #2a2d3e' }}>
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid #2a2d3e' }}>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: '#d4a017' }} />
            <span className="font-semibold text-white">Customize This Section</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white" data-testid="button-close-customize">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          <div className="rounded-lg p-3" style={{ backgroundColor: '#0f1117', border: '1px solid #2a2d3e' }}>
            <p className="text-xs" style={{ color: '#9ca3af' }}>
              Customizing: <span className="text-white font-medium">{template.title}</span>
            </p>
            {restaurantName && (
              <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                For: <span style={{ color: '#d4a017' }}>{restaurantName}</span>
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block" style={{ color: '#9ca3af' }}>What would you like to change?</label>
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g., Adjust for a fast-casual concept with counter service..."
              rows={4}
              className="border-[#2a2d3e] text-white focus:ring-[#d4a017] resize-none"
              style={{ backgroundColor: '#0f1117' }}
              data-testid="textarea-customize-prompt"
            />
          </div>

          <Button
            onClick={handleCustomize}
            disabled={isGenerating || !customPrompt.trim()}
            className="w-full"
            style={{ backgroundColor: '#d4a017', color: '#0f1117' }}
            data-testid="button-customize-generate"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Customization
              </>
            )}
          </Button>

          {generatedContent && (
            <div className="space-y-3">
              <div className="rounded-lg p-3" style={{ backgroundColor: '#0f1117', border: '1px solid #2a2d3e', borderLeftWidth: '3px', borderLeftColor: '#d4a017' }}>
                <div className="prose prose-sm prose-invert max-w-none text-sm">
                  <ReactMarkdown>{generatedContent}</ReactMarkdown>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddAsNotes}
                  style={{ borderColor: '#2a2d3e', color: '#d4a017' }}
                  data-testid="button-add-as-notes"
                >
                  <StickyNote className="h-3 w-3 mr-1" />
                  Add as Notes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReplace}
                  style={{ borderColor: '#2a2d3e', color: '#9ca3af' }}
                  data-testid="button-replace-section"
                >
                  Replace Section
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 bg-black/50" onClick={onClose} />
    </div>
  );
}

export default function TemplatesPage() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<TrainingTemplate | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("server");
  const [showEditNotes, setShowEditNotes] = useState(false);
  const [editNotesContent, setEditNotesContent] = useState("");
  const [showCustomize, setShowCustomize] = useState(false);

  const { data: templates, isLoading } = useQuery<TrainingTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const serverTemplates = templates?.filter(t => t.category === "server") || [];
  const kitchenTemplates = templates?.filter(t => t.category === "kitchen") || [];

  const currentTemplates = activeCategory === "server" ? serverTemplates : kitchenTemplates;

  useEffect(() => {
    if (currentTemplates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(currentTemplates[0]);
    }
  }, [templates]);

  useEffect(() => {
    if (currentTemplates.length > 0) {
      setSelectedTemplate(currentTemplates[0]);
    } else {
      setSelectedTemplate(null);
    }
  }, [activeCategory]);

  useEffect(() => {
    if (selectedTemplate) {
      const key = `template-notes-${selectedTemplate.id}`;
      setEditNotesContent(localStorage.getItem(key) || "");
    }
  }, [selectedTemplate]);

  const groupedBySection = currentTemplates.reduce<Record<string, TrainingTemplate[]>>((acc, template) => {
    if (!acc[template.section]) {
      acc[template.section] = [];
    }
    acc[template.section].push(template);
    return acc;
  }, {});

  const handleSaveNotes = () => {
    if (!selectedTemplate) return;
    const key = `template-notes-${selectedTemplate.id}`;
    if (editNotesContent.trim()) {
      localStorage.setItem(key, editNotesContent);
    } else {
      localStorage.removeItem(key);
    }
    toast({ title: "Notes saved" });
  };

  const isComingSoonTab = ["host", "bartender", "manager", "busser"].includes(activeCategory);
  const hasContent = ["server", "kitchen"].includes(activeCategory);
  const tabHasTemplates = (cat: string) => {
    if (cat === "server") return serverTemplates.length > 0;
    if (cat === "kitchen") return kitchenTemplates.length > 0;
    return false;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f1117' }}>
      <header className="border-b sticky top-0 z-50 backdrop-blur" style={{ borderColor: '#2a2d3e', backgroundColor: 'rgba(15,17,23,0.95)', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back" className="text-white">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <ChefHat className="h-6 w-6" style={{ color: '#d4a017' }} />
              <span className="font-bold text-white">Training Templates</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer" data-testid="button-user-menu">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profileImageUrl || undefined} />
                  <AvatarFallback style={{ backgroundColor: '#2a2d3e', color: '#d4a017' }}>
                    {user?.firstName?.[0] || user?.email?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm hidden md:inline text-white">
                  {user?.firstName || user?.email || "User"}
                </span>
                <ChevronDown className="h-4 w-4" style={{ color: '#9ca3af' }} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => navigate("/profile")}
                  className="cursor-pointer"
                  data-testid="button-profile"
                >
                  <UserCog className="mr-2 h-4 w-4" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => logout()}
                  className="text-destructive focus:text-destructive cursor-pointer"
                  data-testid="button-logout"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-white">Training Templates</h1>
          <p style={{ color: '#9ca3af' }}>
            {user?.restaurantName ? (
              <>Personalized for <strong style={{ color: '#d4a017' }}>{user.restaurantName}</strong>. Build consistent, repeatable training systems.</>
            ) : (
              <>Build consistent, repeatable training systems using proven restaurant frameworks.</>
            )}
          </p>
        </div>

        <TrainingIntelligenceStrip />

        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-1 min-w-max pb-2">
            {[
              { value: "server", label: "Server", icon: Users },
              { value: "kitchen", label: "Kitchen", icon: ChefHat },
              { value: "host", label: "Host", icon: Users, comingSoon: true },
              { value: "bartender", label: "Bartender", icon: Wine, comingSoon: true },
              { value: "manager", label: "Manager", icon: Briefcase, comingSoon: true },
              { value: "busser", label: "Busser", icon: HandMetal, comingSoon: true },
              { value: "handbook", label: "Handbook", icon: BookOpen },
            ].map((tab) => {
              const isActive = activeCategory === tab.value;
              const hasData = tabHasTemplates(tab.value);
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveCategory(tab.value)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                  style={{
                    backgroundColor: isActive ? '#1a1d2e' : 'transparent',
                    borderBottom: isActive ? '2px solid #d4a017' : '2px solid transparent',
                    color: isActive ? '#ffffff' : tab.comingSoon ? '#6b7280' : '#9ca3af',
                    fontStyle: tab.comingSoon ? 'italic' : 'normal',
                  }}
                  data-testid={`tab-${tab.value}`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {tab.comingSoon && (
                    <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-[10px] px-1.5 py-0" style={{ backgroundColor: 'rgba(156,163,175,0.15)', color: '#6b7280' }}>
                      Soon
                    </Badge>
                  )}
                  {!tab.comingSoon && !isActive && hasData && (
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#d4a017' }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {activeCategory === "handbook" ? (
          <HandbookBuilder user={user} />
        ) : isComingSoonTab ? (
          <ComingSoonTab role={activeCategory} />
        ) : (
          <div>
            <TrainingProgressPanel activeCategory={activeCategory} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="rounded-lg" style={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e' }}>
                  <div className="p-4" style={{ borderBottom: '1px solid #2a2d3e' }}>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" style={{ color: '#d4a017' }} />
                      <span className="font-semibold text-white text-lg">
                        {activeCategory === "server" ? "Server Manual" : "Kitchen Manual"}
                      </span>
                    </div>
                    <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>
                      7-day training program with structured daily objectives
                    </p>
                  </div>
                  <ScrollArea className="h-[60vh]">
                    {isLoading ? (
                      <div className="p-4 space-y-4">
                        {[...Array(6)].map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full" style={{ backgroundColor: '#2a2d3e' }} />
                        ))}
                      </div>
                    ) : (
                      <div className="p-2">
                        {Object.entries(groupedBySection).map(([section, sectionTemplates]) => (
                          <div key={section} className="mb-4">
                            <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide" style={{ color: '#d4a017' }}>
                              {section}
                            </div>
                            {sectionTemplates.map((template) => {
                              const Icon = contentTypeIcons[template.contentType] || FileText;
                              const isSelected = selectedTemplate?.id === template.id;
                              const typeColor = contentTypeColors[template.contentType] || contentTypeColors.overview;
                              return (
                                <button
                                  key={template.id}
                                  onClick={() => setSelectedTemplate(template)}
                                  className="w-full text-left p-3 rounded-md transition-colors"
                                  style={{
                                    backgroundColor: isSelected ? 'rgba(212,160,23,0.08)' : 'transparent',
                                    borderLeft: isSelected ? '3px solid #d4a017' : '3px solid transparent',
                                  }}
                                  data-testid={`template-item-${template.id}`}
                                >
                                  <div className="flex items-start gap-2">
                                    <span style={{ color: isSelected ? '#d4a017' : '#9ca3af' }}><Icon className="h-4 w-4 mt-0.5" /></span>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm truncate" style={{ color: isSelected ? '#ffffff' : '#c0c0c0' }}>
                                        {template.title}
                                      </div>
                                      <span
                                        className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded"
                                        style={{ backgroundColor: typeColor.bg, color: typeColor.text }}
                                      >
                                        {typeColor.label}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>

              <div className="lg:col-span-2">
                {selectedTemplate ? (
                  <div className="rounded-lg" style={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e' }}>
                    <div className="p-4" style={{ borderBottom: '1px solid #2a2d3e' }}>
                      <div className="flex items-center gap-2 text-xs mb-2" style={{ color: '#9ca3af' }}>
                        <span>{activeCategory === "server" ? "Server Manual" : "Kitchen Manual"}</span>
                        <ChevronRight className="h-3 w-3" />
                        <span>{selectedTemplate.section}</span>
                        <ChevronRight className="h-3 w-3" />
                        <span className="text-white">{selectedTemplate.title}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <h2 className="text-xl font-bold text-white">
                            {personalizeContent(selectedTemplate.title, user?.restaurantName)}
                          </h2>
                          <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>
                            {selectedTemplate.section}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {(() => {
                            const tc = contentTypeColors[selectedTemplate.contentType] || contentTypeColors.overview;
                            return (
                              <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: tc.bg, color: tc.text }}>
                                {tc.label}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      {selectedTemplate.keyPoints && selectedTemplate.keyPoints.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-xs mb-2 uppercase tracking-wide" style={{ color: '#9ca3af' }}>
                            Key Points
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedTemplate.keyPoints.map((point, i) => (
                              <span
                                key={i}
                                className="text-xs px-2.5 py-1 rounded-full"
                                style={{ border: '1px solid #d4a017', color: '#d4a017' }}
                              >
                                {personalizeContent(point, user?.restaurantName)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div
                        className="whitespace-pre-wrap text-sm p-4 rounded-lg"
                        style={{ backgroundColor: '#0f1117', border: '1px solid #2a2d3e', color: '#c0c0c0', fontFamily: 'monospace' }}
                        data-testid="template-content"
                      >
                        {personalizeContent(selectedTemplate.content, user?.restaurantName)}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-4" style={{ borderTop: '1px solid #2a2d3e', paddingTop: '1rem' }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(personalizeContent(selectedTemplate.content, user?.restaurantName));
                            toast({ title: "Copied to clipboard" });
                          }}
                          style={{ borderColor: '#2a2d3e', color: '#9ca3af' }}
                          data-testid="btn-copy-template"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowEditNotes(!showEditNotes)}
                          style={{ borderColor: '#2a2d3e', color: showEditNotes ? '#d4a017' : '#9ca3af' }}
                          data-testid="btn-edit-notes"
                        >
                          <Edit3 className="h-3 w-3 mr-1" />
                          Edit Notes
                        </Button>
                        {isNativeApp() && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              hapticTap();
                              nativeShare({
                                title: selectedTemplate.title,
                                text: `Training Template: ${selectedTemplate.title}\n\n${selectedTemplate.content.slice(0, 200)}...`,
                                url: `https://restaurantai.consulting/templates`,
                              });
                            }}
                            style={{ borderColor: '#2a2d3e', color: '#9ca3af' }}
                            data-testid="btn-share-template"
                          >
                            <Share2 className="h-3 w-3 mr-1" />
                            Share
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const printContent = personalizeContent(selectedTemplate.content, user?.restaurantName);
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              printWindow.document.write(`
                                <!DOCTYPE html>
                                <html>
                                <head>
                                  <title>${personalizeContent(selectedTemplate.title, user?.restaurantName)}</title>
                                  <style>
                                    body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
                                    h1 { margin-bottom: 8px; font-size: 24px; }
                                    .section { color: #666; margin-bottom: 16px; font-size: 14px; }
                                    .badge { display: inline-block; background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px; margin-bottom: 8px; }
                                    .key-points { margin-bottom: 24px; }
                                    .content { white-space: pre-wrap; font-family: monospace; background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; font-size: 13px; }
                                    @media print { body { padding: 20px; } .no-print { display: none; } }
                                  </style>
                                </head>
                                <body>
                                  <h1>${escapeHtml(personalizeContent(selectedTemplate.title, user?.restaurantName))}</h1>
                                  <div class="section">${escapeHtml(selectedTemplate.section)} | ${escapeHtml(selectedTemplate.contentType)}</div>
                                  ${selectedTemplate.keyPoints?.length ? `
                                    <div class="key-points">
                                      <strong>Key Points:</strong><br/>
                                      ${selectedTemplate.keyPoints.map(p => `<span class="badge">${escapeHtml(personalizeContent(p, user?.restaurantName))}</span>`).join('')}
                                    </div>
                                  ` : ''}
                                  <div class="content">${escapeHtml(printContent)}</div>
                                </body>
                                </html>
                              `);
                              printWindow.document.close();
                              printWindow.print();
                            }
                          }}
                          style={{ borderColor: '#2a2d3e', color: '#9ca3af' }}
                          data-testid="btn-print-template"
                        >
                          <Printer className="h-3 w-3 mr-1" />
                          Print
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCustomize(true)}
                          style={{ borderColor: '#d4a017', color: '#d4a017' }}
                          data-testid="btn-customize-template"
                        >
                          <Sparkles className="h-3 w-3 mr-1" />
                          Customize
                        </Button>
                      </div>

                      {showEditNotes && (
                        <div className="mt-4" style={{ animation: 'scheduleStaggerIn 0.2s ease-out both' }}>
                          <Textarea
                            value={editNotesContent}
                            onChange={(e) => setEditNotesContent(e.target.value)}
                            placeholder="Add your notes for this template..."
                            rows={4}
                            className="border-[#2a2d3e] text-white focus:ring-[#d4a017] resize-none mb-2"
                            style={{ backgroundColor: '#0f1117' }}
                            data-testid="textarea-edit-notes"
                          />
                          <Button
                            size="sm"
                            onClick={handleSaveNotes}
                            style={{ backgroundColor: '#d4a017', color: '#0f1117' }}
                            data-testid="btn-save-notes"
                          >
                            Save Notes
                          </Button>
                          {editNotesContent && (
                            <div className="mt-3 rounded-lg p-3" style={{ backgroundColor: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.2)' }}>
                              <div className="flex items-center gap-1.5 mb-1">
                                <StickyNote className="h-3 w-3" style={{ color: '#d4a017' }} />
                                <span className="text-xs font-medium" style={{ color: '#d4a017' }}>Saved Notes</span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap" style={{ color: '#c0c0c0' }}>{editNotesContent}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg h-full flex items-center justify-center min-h-[400px]" style={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e' }}>
                    <div className="text-center">
                      <BookOpen className="h-12 w-12 mx-auto mb-4" style={{ color: '#4a4d5e' }} />
                      <h3 className="font-semibold text-lg mb-2 text-white">Select a Template</h3>
                      <p className="text-sm max-w-xs" style={{ color: '#9ca3af' }}>
                        Choose a training template from the list to view its contents.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {showCustomize && selectedTemplate && (
        <CustomizePanel
          template={selectedTemplate}
          restaurantName={user?.restaurantName}
          onClose={() => setShowCustomize(false)}
        />
      )}
    </div>
  );
}
