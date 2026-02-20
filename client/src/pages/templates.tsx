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
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
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
  Calendar
} from "lucide-react";
import { HandbookBuilder } from "@/components/handbook/HandbookBuilder";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TrainingTemplate } from "@shared/schema";

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

const contentTypeColors: Record<string, string> = {
  overview: "bg-primary/10 text-primary",
  procedure: "bg-green-500/10 text-green-600 dark:text-green-400",
  checklist: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  assessment: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
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
      return <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400" data-testid={`badge-status-${assignment.id}`}>Completed</Badge>;
    }
    if (isOverdue) {
      return <Badge variant="secondary" className="bg-red-500/10 text-red-600 dark:text-red-400" data-testid={`badge-status-${assignment.id}`}>Overdue</Badge>;
    }
    return <Badge variant="secondary" className="bg-primary/10 text-primary" data-testid={`badge-status-${assignment.id}`}>In Progress</Badge>;
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
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="flex flex-wrap items-center gap-2 p-0" data-testid="button-toggle-progress-panel">
              <GraduationCap className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Employee Training Progress</CardTitle>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${panelOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAssignForm(!showAssignForm)}
            data-testid="button-assign-training"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Training
          </Button>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-2">
            {showAssignForm && (
              <Card className="mb-4">
                <CardContent className="pt-4">
                  <form onSubmit={handleSubmitAssignment} className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[180px]">
                      <label className="text-sm font-medium text-muted-foreground mb-1 block">Employee Name</label>
                      <Input
                        value={employeeName}
                        onChange={(e) => setEmployeeName(e.target.value)}
                        placeholder="Employee name"
                        required
                        data-testid="input-employee-name"
                      />
                    </div>
                    <div className="flex-1 min-w-[180px]">
                      <label className="text-sm font-medium text-muted-foreground mb-1 block">Trainer Name</label>
                      <Input
                        value={trainerName}
                        onChange={(e) => setTrainerName(e.target.value)}
                        placeholder="Who will sign off"
                        data-testid="input-trainer-name"
                      />
                    </div>
                    <div className="min-w-[160px]">
                      <label className="text-sm font-medium text-muted-foreground mb-1 block">Start Date</label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        data-testid="input-start-date"
                      />
                    </div>
                    <Button type="submit" disabled={createMutation.isPending || !employeeName.trim()} data-testid="button-submit-assignment">
                      {createMutation.isPending ? "Assigning..." : "Submit"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                No training assignments for {categoryLabel}. Click "Assign Training" to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment) => {
                  const completedDays = assignment.completions.length;
                  const progressPercent = Math.round((completedDays / assignment.totalDays) * 100);
                  const isExpanded = expandedAssignment === assignment.id;
                  const allDaysComplete = completedDays >= assignment.totalDays;
                  const day7Complete = assignment.completions.some(c => c.dayNumber === 7);

                  return (
                    <Card key={assignment.id} data-testid={`assignment-card-${assignment.id}`}>
                      <CardContent className="pt-4 pb-3">
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                            <span className="font-semibold text-sm truncate" data-testid={`text-employee-name-${assignment.id}`}>
                              {assignment.employeeName}
                            </span>
                            <span className="text-muted-foreground text-sm">
                              {categoryLabel}: Day {completedDays} of {assignment.totalDays} ({progressPercent}%)
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
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                        <Progress
                          value={progressPercent}
                          className={`h-2 ${assignment.status === "completed" ? "[&>div]:bg-green-500" : ""}`}
                          data-testid={`progress-bar-${assignment.id}`}
                        />

                        {isExpanded && (
                          <div className="mt-4 space-y-2">
                            {Array.from({ length: assignment.totalDays }, (_, i) => i + 1).map((dayNum) => {
                              const completion = assignment.completions.find(c => c.dayNumber === dayNum);
                              const dayTitle = getDayTitle(assignment.templateCategory, dayNum);

                              return (
                                <div
                                  key={dayNum}
                                  className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border last:border-0"
                                  data-testid={`day-row-${assignment.id}-${dayNum}`}
                                >
                                  {completion ? (
                                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                      <span className="text-sm">
                                        Day {dayNum}: {dayTitle}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        Completed by {completion.signedOffBy} on {new Date(completion.completedAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                                      <Clock className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                                      <span className="text-sm text-muted-foreground">
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
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function TrainingDashboardSummary() {
  const { data: allAssignments } = useQuery<TrainingAssignment[]>({
    queryKey: ["/api/training-assignments"],
  });

  if (!allAssignments || allAssignments.length === 0) return null;

  const inProgress = allAssignments.filter(a => a.status !== "completed");
  const completed = allAssignments.filter(a => a.status === "completed");
  const recentlyCertified = completed.filter(a => {
    if (!a.completedDate) return false;
    const daysSince = Math.floor((Date.now() - new Date(a.completedDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince <= 7;
  });
  const overdue = inProgress.filter(a => {
    const daysSinceStart = Math.floor((Date.now() - new Date(a.startDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceStart > 14;
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" data-testid="training-dashboard-summary">
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">In Training</span>
          </div>
          <div className="text-2xl font-bold" data-testid="stat-in-training">{inProgress.length}</div>
          {inProgress.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {inProgress.map(a => a.employeeName).slice(0, 2).join(", ")}
              {inProgress.length > 2 && ` +${inProgress.length - 2} more`}
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Award className="h-4 w-4 text-green-500" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Certified</span>
          </div>
          <div className="text-2xl font-bold" data-testid="stat-certified">{completed.length}</div>
          {recentlyCertified.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {recentlyCertified.length} in the last 7 days
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-red-500" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overdue</span>
          </div>
          <div className={`text-2xl font-bold ${overdue.length > 0 ? "text-red-600 dark:text-red-400" : ""}`} data-testid="stat-overdue">{overdue.length}</div>
          {overdue.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Started 14+ days ago
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Assigned</span>
          </div>
          <div className="text-2xl font-bold" data-testid="stat-total">{allAssignments.length}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {allAssignments.filter(a => a.templateCategory === "server").length} server, {allAssignments.filter(a => a.templateCategory === "kitchen").length} kitchen
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TemplatesPage() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<TrainingTemplate | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("server");

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

  const groupedBySection = currentTemplates.reduce<Record<string, TrainingTemplate[]>>((acc, template) => {
    if (!acc[template.section]) {
      acc[template.section] = [];
    }
    acc[template.section].push(template);
    return acc;
  }, {});

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
              <span className="font-bold">Training Templates</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-muted cursor-pointer" data-testid="button-user-menu">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profileImageUrl || undefined} />
                  <AvatarFallback>
                    {user?.firstName?.[0] || user?.email?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm hidden md:inline">
                  {user?.firstName || user?.email || "User"}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
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

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Real Training Templates</h1>
          <p className="text-muted-foreground">
            {user?.restaurantName ? (
              <>These training templates are personalized for <strong>{user.restaurantName}</strong>. Use them to build consistent, repeatable systems.</>
            ) : (
              <>These examples demonstrate how the consulting philosophy translates into actual training materials. Use these as models for building your own systems.</>
            )}
          </p>
        </div>

        <TrainingDashboardSummary />

        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-6">
          <TabsList className="flex flex-wrap gap-1 h-auto w-full max-w-4xl">
            <TabsTrigger value="server" className="flex flex-wrap items-center gap-2" data-testid="tab-server">
              <Users className="h-4 w-4" />
              Server
            </TabsTrigger>
            <TabsTrigger value="kitchen" className="flex flex-wrap items-center gap-2" data-testid="tab-kitchen">
              <ChefHat className="h-4 w-4" />
              Kitchen
            </TabsTrigger>
            <TabsTrigger value="host" className="flex flex-wrap items-center gap-2" data-testid="tab-host">
              Host
            </TabsTrigger>
            <TabsTrigger value="bartender" className="flex flex-wrap items-center gap-2" data-testid="tab-bartender">
              Bartender
            </TabsTrigger>
            <TabsTrigger value="manager" className="flex flex-wrap items-center gap-2" data-testid="tab-manager">
              Manager
            </TabsTrigger>
            <TabsTrigger value="busser" className="flex flex-wrap items-center gap-2" data-testid="tab-busser">
              Busser
            </TabsTrigger>
            <TabsTrigger value="handbook" className="flex flex-wrap items-center gap-2" data-testid="tab-handbook">
              <BookOpen className="h-4 w-4" />
              Handbook
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeCategory === "handbook" ? (
          <HandbookBuilder user={user} />
        ) : ["host", "bartender", "manager", "busser"].includes(activeCategory) ? (
          <Card className="min-h-[400px] flex items-center justify-center">
            <CardContent className="text-center py-12">
              <GraduationCap className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-semibold text-xl mb-2">
                {activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Training
              </h3>
              <Badge variant="secondary" className="mb-4">Coming Soon</Badge>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
                {activeCategory === "host" && "Structured training for hosts and hostesses covering reservation management, seating flow, guest experience, and waitlist management."}
                {activeCategory === "bartender" && "Comprehensive bartender training covering cocktail preparation, speed techniques, responsible alcohol service, and bar inventory management."}
                {activeCategory === "manager" && "Shift lead and manager training covering labor management, conflict resolution, opening/closing procedures, and operational decision-making."}
                {activeCategory === "busser" && "Food runner and busser training covering table turnover, support service, dish handling, and team coordination during peak service."}
              </p>
              <p className="text-xs text-muted-foreground">
                Until this track is available, use the Server or Kitchen training programs as a starting framework and customize with your own notes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div>
          <TrainingProgressPanel activeCategory={activeCategory} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  {activeCategory === "server" ? "Server Manual" : "Kitchen Manual"}
                </CardTitle>
                <CardDescription>
                  7-day training program with structured daily objectives
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[60vh]">
                  {isLoading ? (
                    <div className="p-4 space-y-4">
                      {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="p-2">
                      {Object.entries(groupedBySection).map(([section, sectionTemplates]) => (
                        <div key={section} className="mb-4">
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {section}
                          </div>
                          {sectionTemplates.map((template) => {
                            const Icon = contentTypeIcons[template.contentType] || FileText;
                            const isSelected = selectedTemplate?.id === template.id;
                            return (
                              <button
                                key={template.id}
                                onClick={() => setSelectedTemplate(template)}
                                className={`w-full text-left p-3 rounded-md transition-colors ${
                                  isSelected 
                                    ? "bg-primary/10 border border-primary/20" 
                                    : "hover-elevate"
                                }`}
                                data-testid={`template-item-${template.id}`}
                              >
                                <div className="flex items-start gap-2">
                                  <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">
                                      {template.title}
                                    </div>
                                    <Badge 
                                      variant="secondary" 
                                      className={`mt-1 text-xs ${contentTypeColors[template.contentType] || ""}`}
                                    >
                                      {template.contentType}
                                    </Badge>
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
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {selectedTemplate ? (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl">
                        {personalizeContent(selectedTemplate.title, user?.restaurantName)}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {selectedTemplate.section}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
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
                                  body { 
                                    font-family: system-ui, -apple-system, sans-serif; 
                                    padding: 40px; 
                                    max-width: 800px; 
                                    margin: 0 auto;
                                    line-height: 1.6;
                                  }
                                  h1 { margin-bottom: 8px; font-size: 24px; }
                                  .section { color: #666; margin-bottom: 16px; font-size: 14px; }
                                  .badge { 
                                    display: inline-block; 
                                    background: #f3f4f6; 
                                    padding: 4px 8px; 
                                    border-radius: 4px; 
                                    font-size: 12px;
                                    margin-right: 8px;
                                    margin-bottom: 8px;
                                  }
                                  .key-points { margin-bottom: 24px; }
                                  .content { 
                                    white-space: pre-wrap; 
                                    font-family: monospace; 
                                    background: #f9fafb; 
                                    padding: 20px; 
                                    border-radius: 8px;
                                    border: 1px solid #e5e7eb;
                                    font-size: 13px;
                                  }
                                  @media print {
                                    body { padding: 20px; }
                                    .no-print { display: none; }
                                  }
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
                        data-testid="btn-print-template"
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                      </Button>
                      <Badge 
                        variant="secondary"
                        className={contentTypeColors[selectedTemplate.contentType] || ""}
                      >
                        {selectedTemplate.contentType}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedTemplate.keyPoints && selectedTemplate.keyPoints.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-sm mb-2 text-muted-foreground uppercase tracking-wide">
                        Key Points
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedTemplate.keyPoints.map((point, i) => (
                          <Badge key={i} variant="outline">
                            {personalizeContent(point, user?.restaurantName)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap font-mono text-sm bg-muted/50 p-4 rounded-lg border">
                      {personalizeContent(selectedTemplate.content, user?.restaurantName)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center min-h-[400px]">
                <CardContent className="text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Select a Template</h3>
                  <p className="text-muted-foreground text-sm max-w-xs">
                    Choose a training template from the list to view its contents and see how structured training programs are built.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        </div>
        )}
      </main>
    </div>
  );
}
