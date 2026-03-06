import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  ChevronDown,
  BookOpen,
  ListChecks,
  FileText,
  Mic,
  MicOff,
  Trash2,
  Copy,
  Edit,
  MoreVertical,
  Users,
  Clock,
  CheckCircle2,
  Printer,
  ChevronRight,
  LogOut,
  UserCog,
  Search,
  Share2,
  Play,
  X,
  Lightbulb,
  ChevronUp,
  Timer,
  RotateCcw,
  Pause,
  Check,
  FolderOpen,
  Layers,
  Sparkles,
  Wand2,
} from "lucide-react";
import { isNativeApp, nativeShare, hapticTap, hapticSuccess } from "@/lib/native";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Playbook, InsertPlaybook } from "@shared/schema";

const categories = [
  { value: "opening", label: "Opening" },
  { value: "closing", label: "Closing" },
  { value: "prep", label: "Prep" },
  { value: "service", label: "Service" },
  { value: "cleaning", label: "Cleaning" },
  { value: "safety", label: "Safety" },
  { value: "training", label: "Training" },
  { value: "other", label: "Other" },
];

const roles = [
  { value: "boh", label: "Back of House" },
  { value: "foh", label: "Front of House" },
  { value: "management", label: "Management" },
  { value: "all", label: "All Roles" },
];

const modes = [
  { value: "checklist", label: "Quick Checklist", icon: ListChecks, desc: "Simple bullet points (60–180 sec)" },
  { value: "step_by_step", label: "Step-by-Step", icon: FileText, desc: "Numbered steps with details (3–8 min)" },
  { value: "deep_procedure", label: "Deep Procedure", icon: BookOpen, desc: "Full narrative with context" },
];

const CATEGORY_COLORS: Record<string, string> = {
  opening: "#b8860b",
  closing: "#3b82f6",
  prep: "#f59e0b",
  service: "#10b981",
  cleaning: "#14b8a6",
  safety: "#ef4444",
  training: "#8b5cf6",
  other: "#6b7280",
};

const STARTER_IDEAS = [
  { title: "Opening Manager Checklist", category: "opening", mode: "checklist" },
  { title: "Closing Server Sidework", category: "closing", mode: "checklist" },
  { title: "Line Check Procedure", category: "prep", mode: "step_by_step" },
  { title: "Walk-In Organization Standards", category: "prep", mode: "deep_procedure" },
  { title: "Table Turnover Protocol", category: "service", mode: "checklist" },
  { title: "Complaint Escalation Steps", category: "service", mode: "step_by_step" },
  { title: "Nightly Deep Clean Stations", category: "cleaning", mode: "checklist" },
  { title: "Health Inspection Prep", category: "safety", mode: "step_by_step" },
  { title: "New Hire First Week Plan", category: "training", mode: "deep_procedure" },
  { title: "Cash Drop & Drawer Close", category: "closing", mode: "step_by_step" },
  { title: "Shift Handoff Communication", category: "service", mode: "checklist" },
  { title: "Equipment Failure Response", category: "safety", mode: "step_by_step" },
];

type SortOption = "recent" | "az" | "category" | "role";

function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function parseChecklistItems(content: string): string[] {
  if (!content) return [];
  return content
    .split("\n")
    .map(line => line.replace(/^[-*]\s*\[[ x]?\]\s*/i, "").replace(/^[-*]\s*/, "").replace(/^\d+\.\s*/, "").trim())
    .filter(line => line.length > 0);
}

export default function PlaybooksPage() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingPlaybookId, setEditingPlaybookId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [showIdeas, setShowIdeas] = useState(false);
  const [isRunMode, setIsRunMode] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [runTimerActive, setRunTimerActive] = useState(false);
  const [runTimerSeconds, setRunTimerSeconds] = useState(0);
  const [improveExpanded, setImproveExpanded] = useState(false);
  const [improveText, setImproveText] = useState("");
  const [improveResult, setImproveResult] = useState("");
  const [isImproving, setIsImproving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [aiAssist, setAiAssist] = useState(true);
  const [categoryChips, setCategoryChips] = useState<Set<string>>(new Set());

  const [newPlaybook, setNewPlaybook] = useState<Partial<InsertPlaybook>>({
    title: "",
    description: "",
    context: "",
    category: "opening",
    role: "all",
    mode: "checklist",
    status: "draft",
  });

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: playbooks, isLoading } = useQuery<Playbook[]>({
    queryKey: ["/api/playbooks"],
  });

  useEffect(() => {
    if (runTimerActive) {
      timerRef.current = setInterval(() => {
        setRunTimerSeconds(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [runTimerActive]);

  const createMutation = useMutation({
    mutationFn: async (data: Partial<InsertPlaybook>) => {
      const res = await apiRequest("POST", "/api/playbooks", data);
      return res.json();
    },
    onSuccess: (playbook) => {
      queryClient.invalidateQueries({ queryKey: ["/api/playbooks"] });
      setSelectedPlaybook(playbook);
      setIsCreating(false);
      setGeneratedContent("");
      toast({ title: "Playbook created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertPlaybook> }) => {
      const res = await apiRequest("PUT", `/api/playbooks/${id}`, data);
      return res.json();
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["/api/playbooks"] });
      setSelectedPlaybook(updated);
      toast({ title: "Playbook updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/playbooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playbooks"] });
      setSelectedPlaybook(null);
      toast({ title: "Playbook deleted" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/playbooks/${id}/duplicate`);
      return res.json();
    },
    onSuccess: (playbook) => {
      queryClient.invalidateQueries({ queryKey: ["/api/playbooks"] });
      setSelectedPlaybook(playbook);
      toast({ title: "Playbook duplicated" });
    },
  });

  const filteredPlaybooks = (playbooks || [])
    .filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
      const matchesRole = roleFilter === "all" || p.role === roleFilter;
      const matchesChips = categoryChips.size === 0 || categoryChips.has(p.category);
      return matchesSearch && matchesCategory && matchesRole && matchesChips;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "az": return a.title.localeCompare(b.title);
        case "category": return a.category.localeCompare(b.category);
        case "role": return (a.role || "all").localeCompare(b.role || "all");
        default: return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });

  const totalPlaybooks = playbooks?.length || 0;
  const categoriesCovered = new Set(playbooks?.map(p => p.category) || []).size;
  const rolesCovered = new Set(playbooks?.map(p => p.role).filter(Boolean) || []).size;
  const lastCreated = playbooks?.length
    ? [...playbooks].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0]
    : null;

  const categoryCounts = (playbooks || []).reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  const handleGenerate = useCallback(async () => {
    if (!newPlaybook.title) return;
    setIsGenerating(true);
    setGeneratedContent("");

    try {
      const res = await fetch("/api/playbooks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: newPlaybook.title,
          description: newPlaybook.description,
          context: newPlaybook.context,
          category: newPlaybook.category,
          role: newPlaybook.role,
          mode: newPlaybook.mode,
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          const lines = text.split("\n");
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
      }
    } catch {
      toast({ title: "Generation failed", variant: "destructive" });
    }
    setIsGenerating(false);
  }, [newPlaybook, toast]);

  const handleImprove = useCallback(async () => {
    if (!selectedPlaybook || !improveText) return;
    setIsImproving(true);
    setImproveResult("");

    try {
      const res = await fetch("/api/playbooks/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: selectedPlaybook.title,
          currentContent: selectedPlaybook.content || "",
          improvement: improveText,
          mode: selectedPlaybook.mode,
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          const lines = text.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  fullContent += data.content;
                  setImproveResult(fullContent);
                }
              } catch {}
            }
          }
        }
      }
    } catch {
      toast({ title: "Improvement failed", variant: "destructive" });
    }
    setIsImproving(false);
  }, [selectedPlaybook, improveText, toast]);

  const handleCreatePlaybook = () => {
    if (!newPlaybook.title) {
      toast({ title: "Please enter a title", variant: "destructive" });
      return;
    }
    const data = { ...newPlaybook } as any;
    if (aiAssist && generatedContent) {
      data.content = generatedContent;
    }
    if (editingPlaybookId) {
      updateMutation.mutate({ id: editingPlaybookId, data });
      setEditingPlaybookId(null);
      setIsCreating(false);
    } else {
      createMutation.mutate(data as InsertPlaybook);
    }
  };

  const handleReplaceContent = (content: string) => {
    if (!selectedPlaybook) return;
    updateMutation.mutate({ id: selectedPlaybook.id, data: { content } });
    setImproveResult("");
    setImproveText("");
    setImproveExpanded(false);
  };

  const handleSaveAsNewVersion = (content: string) => {
    if (!selectedPlaybook) return;
    updateMutation.mutate({
      id: selectedPlaybook.id,
      data: { content, version: (selectedPlaybook.version || 1) + 1 },
    });
    setImproveResult("");
    setImproveText("");
    setImproveExpanded(false);
  };

  const openCreateWithIdea = (idea: typeof STARTER_IDEAS[0]) => {
    setNewPlaybook({
      title: idea.title,
      description: "",
      context: "",
      category: idea.category,
      role: "all",
      mode: idea.mode,
      status: "draft",
    });
    setGeneratedContent("");
    setEditingPlaybookId(null);
    setShowIdeas(false);
    setIsCreating(true);
  };

  const copyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const sharePlaybook = async (playbook: Playbook) => {
    if (isNativeApp()) {
      hapticTap();
      nativeShare({
        title: playbook.title,
        text: `${playbook.title}\n\n${playbook.content || playbook.description || ""}`,
        url: `https://restaurantai.consulting/playbooks`,
      });
    } else {
      copyContent(`${playbook.title}\n\n${playbook.content || ""}`);
    }
  };

  const printPlaybook = () => {
    window.print();
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const enterRunMode = () => {
    setIsRunMode(true);
    setCheckedItems(new Set());
    setRunTimerSeconds(0);
    setRunTimerActive(true);
  };

  const exitRunMode = () => {
    setIsRunMode(false);
    setRunTimerActive(false);
  };

  const toggleCheckItem = (idx: number) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
    if (isNativeApp()) hapticTap();
  };

  const renderChecklistContent = (content: string) => {
    const items = parseChecklistItems(content);
    const total = items.length;
    const checked = checkedItems.size;
    const allDone = total > 0 && checked >= total;
    const pct = total > 0 ? Math.round((checked / total) * 100) : 0;

    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "#0f1117" }}>
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${pct}%`, background: allDone ? "#b8860b" : "linear-gradient(90deg, #b8860b, #d4a017)" }}
            />
          </div>
          <span className="text-sm font-medium" style={{ color: "#d4a017" }}>{checked} of {total} complete</span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{pct}%</span>
        </div>
        {allDone && (
          <div
            className="mb-4 p-4 rounded-lg flex items-center gap-3"
            style={{
              background: "rgba(184,134,11,0.15)",
              border: "1.5px solid #b8860b",
              animation: "playbookCompletionSlide 0.25s ease",
            }}
          >
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: "#d4a017" }} />
            <div className="flex-1">
              <span className="font-semibold text-white">Playbook Complete</span>
              <span className="text-xs ml-2" style={{ color: "rgba(255,255,255,0.5)" }}>{new Date().toLocaleTimeString()}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              style={{ color: "#d4a017" }}
              onClick={() => { setCheckedItems(new Set()); setRunTimerSeconds(0); }}
              data-testid="button-reset-run"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset & Run Again
            </Button>
          </div>
        )}
        <div className="space-y-2">
          {items.map((item, idx) => {
            const isChecked = checkedItems.has(idx);
            return (
              <div
                key={idx}
                className="flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all"
                style={{
                  background: isChecked ? "rgba(184,134,11,0.08)" : "#0f1117",
                  border: `1px solid ${isChecked ? "rgba(184,134,11,0.3)" : "rgba(255,255,255,0.06)"}`,
                  minHeight: "48px",
                  opacity: isChecked ? 0.7 : 1,
                }}
                onClick={() => toggleCheckItem(idx)}
                data-testid={`run-item-${idx}`}
              >
                <div
                  className="flex items-center justify-center w-6 h-6 rounded flex-shrink-0"
                  style={{
                    border: isChecked ? "none" : "2px solid rgba(255,255,255,0.3)",
                    background: isChecked ? "#b8860b" : "transparent",
                  }}
                >
                  {isChecked && (
                    <Check
                      className="h-4 w-4 text-white"
                      style={{ animation: "playbookCheckBounce 0.2s ease" }}
                    />
                  )}
                </div>
                <span
                  className="text-[15px] flex-1"
                  style={{
                    color: isChecked ? "rgba(255,255,255,0.5)" : "#e2e8f0",
                    textDecoration: isChecked ? "line-through" : "none",
                    lineHeight: 1.7,
                  }}
                >
                  {item}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStepByStepContent = (content: string) => {
    const lines = content.split("\n").filter(l => l.trim());
    let stepNum = 0;
    return (
      <div className="space-y-4">
        {lines.map((line, idx) => {
          const stepMatch = line.match(/^\d+\.\s*(.*)/);
          if (stepMatch) {
            stepNum++;
            return (
              <div key={idx} className="flex items-start gap-3">
                <div
                  className="flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 text-sm font-semibold"
                  style={{ background: "#b8860b", color: "#0f1117" }}
                >
                  {stepNum}
                </div>
                <p className="text-[15px] font-medium" style={{ color: "#e2e8f0", lineHeight: 1.7 }}>{stepMatch[1]}</p>
              </div>
            );
          }
          return (
            <p key={idx} className="text-[15px] pl-10" style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.7 }}>{line}</p>
          );
        })}
      </div>
    );
  };

  const renderDeepProcedureContent = (content: string) => {
    const lines = content.split("\n");
    return (
      <div className="space-y-2">
        {lines.map((line, idx) => {
          if (line.startsWith("## ")) {
            return (
              <h3 key={idx} className="text-xs font-bold uppercase tracking-widest mt-6 mb-2" style={{ color: "#d4a017" }}>
                {line.replace(/^##\s*/, "")}
              </h3>
            );
          }
          if (line.startsWith("# ")) {
            return (
              <h2 key={idx} className="text-sm font-bold uppercase tracking-widest mt-6 mb-2" style={{ color: "#d4a017" }}>
                {line.replace(/^#\s*/, "")}
              </h2>
            );
          }
          if (line.trim() === "") return <div key={idx} className="h-2" />;
          return (
            <p key={idx} className="text-[15px]" style={{ color: "#e2e8f0", lineHeight: 1.7 }}>{line}</p>
          );
        })}
      </div>
    );
  };

  const renderContent = (playbook: Playbook) => {
    if (!playbook.content) {
      return (
        <div className="text-center py-8">
          <ListChecks className="h-12 w-12 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.3)" }} />
          <p style={{ color: "rgba(255,255,255,0.5)" }}>No content yet</p>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>Edit this playbook to add content</p>
        </div>
      );
    }

    if (isRunMode && playbook.mode === "checklist") {
      return renderChecklistContent(playbook.content);
    }

    switch (playbook.mode) {
      case "checklist":
        return renderChecklistContent(playbook.content);
      case "step_by_step":
        return renderStepByStepContent(playbook.content);
      case "deep_procedure":
        return renderDeepProcedureContent(playbook.content);
      default:
        return <p className="text-[15px]" style={{ color: "#e2e8f0", lineHeight: 1.7 }}>{playbook.content}</p>;
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#0f1117" }}>
      <OfflineBanner />
      <header
        className="sticky top-0 z-50 backdrop-blur"
        style={{
          background: "rgba(15,17,23,0.95)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" style={{ color: "rgba(255,255,255,0.7)" }} />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6" style={{ color: "#d4a017" }} />
              <span className="font-bold text-white">Living Playbooks</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer" data-testid="button-user-menu">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback>{user?.firstName?.[0] || user?.email?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <span className="text-sm hidden md:inline text-white">{user?.firstName || user?.email || "User"}</span>
              <ChevronDown className="h-4 w-4" style={{ color: "rgba(255,255,255,0.5)" }} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer" data-testid="button-profile">
                <UserCog className="mr-2 h-4 w-4" />
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive cursor-pointer" data-testid="button-logout">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6" style={{ animation: "playbookStaggerIn 0.4s ease both" }}>
          <h1 className="text-3xl font-bold mb-2 text-white">Living Playbooks & Repeatable Execution</h1>
          <p style={{ color: "rgba(255,255,255,0.5)" }}>
            Systems that work on your worst night. Build playbooks your team will actually follow.
          </p>
        </div>

        {/* Intelligence Strip */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
          style={{ animation: "playbookStaggerIn 0.4s ease 0.08s both" }}
        >
          {[
            { label: "Total Playbooks", value: totalPlaybooks > 0 ? `${totalPlaybooks} playbook${totalPlaybooks !== 1 ? "s" : ""}` : "0 playbooks", icon: BookOpen },
            { label: "Categories Covered", value: `${categoriesCovered} of 8`, icon: Layers },
            { label: "Roles Covered", value: `${rolesCovered} of 4`, icon: Users },
            { label: "Last Created", value: lastCreated ? `${lastCreated.title.slice(0, 20)}${lastCreated.title.length > 20 ? "..." : ""} · ${timeAgo(lastCreated.createdAt)}` : "None yet", icon: Clock },
          ].map((metric, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg"
              style={{
                background: "#1a1d2e",
                borderLeft: "3px solid #b8860b",
                animation: `playbookStaggerIn 0.4s ease ${0.08 + idx * 0.06}s both`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <metric.icon className="h-3.5 w-3.5" style={{ color: "#d4a017" }} />
                <span className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>{metric.label}</span>
              </div>
              <p className="text-sm font-semibold text-white truncate">{metric.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel */}
          <div
            className="lg:col-span-1"
            style={{ animation: "playbookStaggerIn 0.4s ease 0.16s both" }}
          >
            <div
              className="rounded-xl p-4"
              style={{ background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-base font-bold text-white">Your Playbooks</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    style={{ color: "#d4a017" }}
                    onClick={() => { setShowIdeas(true); setSelectedPlaybook(null); }}
                    data-testid="button-ideas"
                  >
                    <Lightbulb className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-white text-xs font-semibold"
                    style={{ background: "linear-gradient(135deg, #b8860b, #d4a017)", border: "none" }}
                    onClick={() => {
                      setNewPlaybook({ title: "", description: "", context: "", category: "opening", role: "all", mode: "checklist", status: "draft" });
                      setGeneratedContent("");
                      setAiAssist(true);
                      setEditingPlaybookId(null);
                      setIsCreating(true);
                    }}
                    data-testid="button-create-playbook"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    New
                  </Button>
                </div>
              </div>

              {/* Search + Filter Row */}
              <div className="flex items-center gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                  <input
                    placeholder="Search playbooks..."
                    className="w-full pl-8 pr-3 py-2 rounded-lg text-sm text-white placeholder:text-gray-500 outline-none"
                    style={{
                      background: "#0f1117",
                      border: "1.5px solid transparent",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "#b8860b"}
                    onBlur={e => e.currentTarget.style.borderColor = "transparent"}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-playbooks"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-8 text-xs flex-1" style={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} data-testid="select-category-filter">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[c.value] }} />
                          {c.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-8 text-xs flex-1" style={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} data-testid="select-role-filter">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Chip Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
                <button
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
                  style={{
                    background: categoryChips.size === 0 ? "rgba(184,134,11,0.15)" : "transparent",
                    border: categoryChips.size === 0 ? "1px solid #b8860b" : "1px solid rgba(255,255,255,0.1)",
                    color: categoryChips.size === 0 ? "#d4a017" : "rgba(255,255,255,0.5)",
                  }}
                  onClick={() => setCategoryChips(new Set())}
                  data-testid="chip-all"
                >
                  All
                </button>
                {categories.map(c => {
                  const active = categoryChips.has(c.value);
                  return (
                    <button
                      key={c.value}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
                      style={{
                        background: active ? `${CATEGORY_COLORS[c.value]}20` : "transparent",
                        border: active ? `1px solid ${CATEGORY_COLORS[c.value]}` : "1px solid rgba(255,255,255,0.1)",
                        color: active ? CATEGORY_COLORS[c.value] : "rgba(255,255,255,0.5)",
                      }}
                      onClick={() => {
                        setCategoryChips(prev => {
                          const next = new Set(prev);
                          if (next.has(c.value)) next.delete(c.value);
                          else next.add(c.value);
                          return next;
                        });
                      }}
                      data-testid={`chip-${c.value}`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[c.value] }} />
                      {c.label}
                      {categoryCounts[c.value] ? <span className="ml-0.5 opacity-70">({categoryCounts[c.value]})</span> : null}
                    </button>
                  );
                })}
              </div>

              {/* Quick-Sort Bar */}
              <div className="flex items-center gap-1 text-xs mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
                <span>Sort:</span>
                {([
                  { key: "recent" as SortOption, label: "Most Recent" },
                  { key: "az" as SortOption, label: "A–Z" },
                  { key: "category" as SortOption, label: "Category" },
                  { key: "role" as SortOption, label: "Role" },
                ]).map((s, idx) => (
                  <span key={s.key}>
                    {idx > 0 && <span className="mx-0.5">·</span>}
                    <button
                      className="transition-colors"
                      style={{
                        color: sortBy === s.key ? "#d4a017" : "rgba(255,255,255,0.4)",
                        textDecoration: sortBy === s.key ? "underline" : "none",
                        textUnderlineOffset: "2px",
                      }}
                      onClick={() => setSortBy(s.key)}
                      data-testid={`sort-${s.key}`}
                    >
                      {s.label}
                    </button>
                  </span>
                ))}
              </div>

              {/* Playbook List */}
              <ScrollArea className="h-[45vh]">
                {isLoading ? (
                  <div className="p-4 text-center" style={{ color: "rgba(255,255,255,0.5)" }}>Loading...</div>
                ) : filteredPlaybooks.length === 0 ? (
                  <div className="p-6 text-center">
                    <BookOpen className="h-12 w-12 mx-auto mb-3" style={{ color: "#b8860b" }} />
                    <p className="text-base font-medium text-white mb-1">No playbooks yet</p>
                    <p className="text-[13px] mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Build your first operational playbook — the one your team will actually follow.
                    </p>
                    <Button
                      className="text-white text-sm font-semibold"
                      style={{ background: "linear-gradient(135deg, #b8860b, #d4a017)" }}
                      onClick={() => {
                        setNewPlaybook({ title: "", description: "", context: "", category: "opening", role: "all", mode: "checklist", status: "draft" });
                        setGeneratedContent("");
                        setAiAssist(true);
                        setEditingPlaybookId(null);
                        setIsCreating(true);
                      }}
                      data-testid="button-create-first"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Playbook
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredPlaybooks.map((playbook, idx) => (
                      <div
                        key={playbook.id}
                        className="p-3 rounded-lg cursor-pointer transition-all group"
                        style={{
                          background: selectedPlaybook?.id === playbook.id ? "rgba(184,134,11,0.1)" : "#0f1117",
                          border: selectedPlaybook?.id === playbook.id
                            ? "1px solid rgba(184,134,11,0.4)"
                            : "1px solid rgba(255,255,255,0.06)",
                          borderLeft: selectedPlaybook?.id === playbook.id ? "3px solid #b8860b" : undefined,
                          animation: `playbookStaggerIn 0.3s ease ${idx * 0.04}s both`,
                        }}
                        onClick={() => {
                          setSelectedPlaybook(playbook);
                          setShowIdeas(false);
                          setIsRunMode(false);
                          setImproveExpanded(false);
                          setImproveResult("");
                        }}
                        data-testid={`playbook-item-${playbook.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ background: CATEGORY_COLORS[playbook.category] || "#6b7280" }}
                              />
                              <h3 className="font-medium text-sm text-white truncate">{playbook.title}</h3>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 pl-[18px]">
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                                style={{
                                  background: "rgba(255,255,255,0.06)",
                                  color: "rgba(255,255,255,0.5)",
                                }}
                              >
                                {roles.find(r => r.value === playbook.role)?.label || "All Roles"}
                              </span>
                              <span className="text-[10px] italic" style={{ color: "rgba(255,255,255,0.3)" }}>
                                {modes.find(m => m.value === playbook.mode)?.label}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                              {timeAgo(playbook.createdAt)}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={e => e.stopPropagation()}
                                  data-testid={`playbook-menu-${playbook.id}`}
                                >
                                  <MoreVertical className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.4)" }} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPlaybook(playbook);
                                    setNewPlaybook({ ...playbook });
                                    setEditingPlaybookId(playbook.id);
                                    setGeneratedContent(playbook.content || "");
                                    setIsCreating(true);
                                  }}
                                >
                                  <Edit className="h-3.5 w-3.5 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); duplicateMutation.mutate(playbook.id); }}>
                                  <Copy className="h-3.5 w-3.5 mr-2" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(playbook.id); }}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Right Panel */}
          <div
            className="lg:col-span-2"
            style={{ animation: "playbookStaggerIn 0.4s ease 0.24s both" }}
          >
            {showIdeas ? (
              /* Starter Ideas Panel */
              <div
                className="rounded-xl p-6"
                style={{ background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <button
                    className="p-1 rounded"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                    onClick={() => setShowIdeas(false)}
                    data-testid="button-back-from-ideas"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <Lightbulb className="h-5 w-5" style={{ color: "#d4a017" }} />
                  <h2 className="text-lg font-bold text-white">Playbook Starter Ideas</h2>
                </div>
                <p className="text-sm mb-6 ml-8" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Common playbooks operators at restaurants like yours build first.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {STARTER_IDEAS.map((idea, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg group cursor-pointer transition-all"
                      style={{
                        background: "#0f1117",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                      onClick={() => openCreateWithIdea(idea)}
                      data-testid={`idea-${idx}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: CATEGORY_COLORS[idea.category] }} />
                        <span className="text-sm font-semibold text-white">{idea.title}</span>
                      </div>
                      <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {categories.find(c => c.value === idea.category)?.label} · {modes.find(m => m.value === idea.mode)?.label}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs font-semibold"
                        style={{ color: "#d4a017", border: "1px solid rgba(184,134,11,0.3)" }}
                        data-testid={`idea-use-${idx}`}
                      >
                        Use This
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : selectedPlaybook ? (
              /* Playbook Viewer */
              <div
                className="rounded-xl"
                style={{ background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {/* Viewer Header */}
                <div className="p-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {isRunMode ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-white">{selectedPlaybook.title} — Running Now</h2>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "#0f1117" }}>
                          <Timer className="h-4 w-4" style={{ color: "#d4a017" }} />
                          <span className="text-sm font-mono text-white">{formatTimer(runTimerSeconds)}</span>
                          <button
                            onClick={() => setRunTimerActive(!runTimerActive)}
                            className="p-1"
                            data-testid="button-timer-toggle"
                          >
                            {runTimerActive ? (
                              <Pause className="h-3 w-3" style={{ color: "#d4a017" }} />
                            ) : (
                              <Play className="h-3 w-3" style={{ color: "#d4a017" }} />
                            )}
                          </button>
                          <button
                            onClick={() => setRunTimerSeconds(0)}
                            className="p-1"
                            data-testid="button-timer-reset"
                          >
                            <RotateCcw className="h-3 w-3" style={{ color: "rgba(255,255,255,0.4)" }} />
                          </button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={exitRunMode}
                          style={{ color: "rgba(255,255,255,0.5)" }}
                          data-testid="button-exit-run"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Exit Run Mode
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ background: CATEGORY_COLORS[selectedPlaybook.category] || "#6b7280" }}
                        />
                        <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                          {categories.find(c => c.value === selectedPlaybook.category)?.label}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-bold text-white mb-2">{selectedPlaybook.title}</h2>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-[10px] px-2 py-0.5 rounded font-medium"
                              style={{
                                background: `${CATEGORY_COLORS[selectedPlaybook.category]}20`,
                                color: CATEGORY_COLORS[selectedPlaybook.category],
                              }}
                            >
                              {roles.find(r => r.value === selectedPlaybook.role)?.label || "All Roles"}
                            </span>
                            <span
                              className="text-[10px] px-2 py-0.5 rounded font-medium"
                              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
                            >
                              {modes.find(m => m.value === selectedPlaybook.mode)?.label}
                            </span>
                            {selectedPlaybook.version && selectedPlaybook.version > 1 && (
                              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                                v{selectedPlaybook.version}
                              </span>
                            )}
                          </div>
                          <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                            Created {selectedPlaybook.createdAt ? new Date(selectedPlaybook.createdAt).toLocaleDateString() : "—"}
                          </p>
                        </div>
                        {/* Action Tray */}
                        <div className="flex items-center gap-1">
                          {selectedPlaybook.mode === "checklist" && selectedPlaybook.content && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              style={{ color: "#d4a017" }}
                              onClick={enterRunMode}
                              data-testid="button-run"
                            >
                              <Play className="h-3.5 w-3.5 mr-1" />
                              Run
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            style={{ color: "rgba(255,255,255,0.5)" }}
                            onClick={() => copyContent(selectedPlaybook.content || selectedPlaybook.title)}
                            data-testid="button-copy"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            style={{ color: "rgba(255,255,255,0.5)" }}
                            onClick={() => sharePlaybook(selectedPlaybook)}
                            data-testid="button-share"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            style={{ color: "rgba(255,255,255,0.5)" }}
                            onClick={printPlaybook}
                            data-testid="button-print"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            style={{ color: "rgba(255,255,255,0.5)" }}
                            onClick={() => {
                              setNewPlaybook({ ...selectedPlaybook });
                              setEditingPlaybookId(selectedPlaybook.id);
                              setGeneratedContent(selectedPlaybook.content || "");
                              setIsCreating(true);
                            }}
                            data-testid="button-edit"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            style={{ color: "rgba(255,255,255,0.5)" }}
                            onClick={() => deleteMutation.mutate(selectedPlaybook.id)}
                            data-testid="button-delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  {renderContent(selectedPlaybook)}

                  {/* Improve This Playbook panel */}
                  {!isRunMode && selectedPlaybook.content && (
                    <div className="mt-6 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <button
                        className="flex items-center gap-2 w-full text-left"
                        onClick={() => setImproveExpanded(!improveExpanded)}
                        data-testid="button-improve-toggle"
                      >
                        <Wand2 className="h-4 w-4" style={{ color: "#d4a017" }} />
                        <span className="text-sm font-medium text-white">Improve This Playbook</span>
                        {improveExpanded ? (
                          <ChevronUp className="h-4 w-4 ml-auto" style={{ color: "#d4a017" }} />
                        ) : (
                          <ChevronDown className="h-4 w-4 ml-auto" style={{ color: "#d4a017" }} />
                        )}
                      </button>

                      {improveExpanded && (
                        <div className="mt-3 space-y-3">
                          <textarea
                            className="w-full p-3 rounded-lg text-sm text-white placeholder:text-gray-500 outline-none resize-none"
                            style={{
                              background: "#0f1117",
                              border: "1.5px solid rgba(255,255,255,0.1)",
                              minHeight: "80px",
                            }}
                            onFocus={e => e.currentTarget.style.borderColor = "#b8860b"}
                            onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
                            placeholder="e.g., Make this stricter about handwashing steps, Add a section for closing manager sign-off..."
                            value={improveText}
                            onChange={e => setImproveText(e.target.value)}
                            data-testid="input-improve"
                          />
                          <Button
                            className="text-white text-sm font-semibold"
                            style={{
                              background: "linear-gradient(135deg, #b8860b, #d4a017)",
                              opacity: !improveText || isImproving ? 0.5 : 1,
                            }}
                            disabled={!improveText || isImproving}
                            onClick={handleImprove}
                            data-testid="button-regenerate"
                          >
                            <Sparkles className="h-3.5 w-3.5 mr-1" />
                            {isImproving ? "Regenerating..." : "Regenerate with Changes"}
                          </Button>

                          {improveResult && (
                            <div className="mt-3">
                              <div
                                className="p-4 rounded-lg text-[15px]"
                                style={{
                                  background: "#0f1117",
                                  border: "1px solid rgba(184,134,11,0.3)",
                                  color: "#e2e8f0",
                                  lineHeight: 1.7,
                                  whiteSpace: "pre-wrap",
                                }}
                                data-testid="text-improve-result"
                              >
                                {improveResult}
                              </div>
                              <div className="flex items-center gap-2 mt-3">
                                <Button
                                  size="sm"
                                  className="text-white text-xs font-semibold"
                                  style={{ background: "linear-gradient(135deg, #b8860b, #d4a017)" }}
                                  onClick={() => handleReplaceContent(improveResult)}
                                  data-testid="button-replace-playbook"
                                >
                                  Replace Playbook
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs"
                                  style={{ color: "#d4a017", border: "1px solid rgba(184,134,11,0.3)" }}
                                  onClick={() => handleSaveAsNewVersion(improveResult)}
                                  data-testid="button-save-version"
                                >
                                  Save as New Version
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Empty State */
              <div
                className="rounded-xl flex flex-col items-center justify-center"
                style={{
                  background: "#1a1d2e",
                  border: "1px solid rgba(255,255,255,0.06)",
                  minHeight: "400px",
                }}
              >
                <BookOpen className="h-16 w-16 mb-4" style={{ color: "#b8860b" }} />
                <h3 className="text-lg font-semibold text-white mb-2">Select a playbook or create a new one</h3>
                <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Your playbooks appear here — ready to run, share, or improve.
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    className="text-white text-sm font-semibold"
                    style={{ background: "linear-gradient(135deg, #b8860b, #d4a017)" }}
                    onClick={() => {
                      setNewPlaybook({ title: "", description: "", context: "", category: "opening", role: "all", mode: "checklist", status: "draft" });
                      setGeneratedContent("");
                      setAiAssist(true);
                      setEditingPlaybookId(null);
                      setIsCreating(true);
                    }}
                    data-testid="button-create-new"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Playbook
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-sm"
                    style={{ color: "#d4a017", border: "1px solid rgba(184,134,11,0.3)" }}
                    onClick={() => { setShowIdeas(true); }}
                    data-testid="button-view-ideas"
                  >
                    <Lightbulb className="h-4 w-4 mr-2" />
                    View Playbook Ideas
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Playbook Modal */}
      <Dialog open={isCreating} onOpenChange={(open) => { setIsCreating(open); if (!open) setEditingPlaybookId(null); }}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          style={{
            background: "#1a1d2e",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px",
          }}
        >
          <DialogHeader>
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5" style={{ color: "#d4a017" }} />
              <div>
                <DialogTitle className="text-white text-lg">{editingPlaybookId ? "Edit Playbook" : "Create New Playbook"}</DialogTitle>
                <DialogDescription style={{ color: "rgba(255,255,255,0.4)" }}>
                  Choose how you want to capture this process.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-sm text-white">Title</Label>
              <input
                placeholder="e.g., Opening Sidework Checklist"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-gray-500 outline-none"
                style={{ background: "#0f1117", border: "1.5px solid rgba(255,255,255,0.1)" }}
                onFocus={e => e.currentTarget.style.borderColor = "#b8860b"}
                onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
                value={newPlaybook.title}
                onChange={(e) => setNewPlaybook(prev => ({ ...prev, title: e.target.value }))}
                data-testid="input-playbook-title"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-sm text-white">Description <span style={{ color: "rgba(255,255,255,0.3)" }}>(optional)</span></Label>
              <textarea
                placeholder="Brief description of this playbook..."
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-gray-500 outline-none resize-none"
                style={{ background: "#0f1117", border: "1.5px solid rgba(255,255,255,0.1)", minHeight: "60px" }}
                onFocus={e => e.currentTarget.style.borderColor = "#b8860b"}
                onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
                value={newPlaybook.description || ""}
                onChange={(e) => setNewPlaybook(prev => ({ ...prev, description: e.target.value }))}
                data-testid="input-playbook-description"
              />
            </div>

            {/* Context */}
            <div className="space-y-1.5">
              <Label className="text-sm text-white">Additional Context <span style={{ color: "rgba(255,255,255,0.3)" }}>(optional)</span></Label>
              <textarea
                placeholder="e.g., We run 5 stations, service starts at 11am, our POS is Toast, Spanish-speaking kitchen team..."
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-gray-500 outline-none resize-none"
                style={{ background: "#0f1117", border: "1.5px solid rgba(255,255,255,0.1)", minHeight: "60px" }}
                onFocus={e => e.currentTarget.style.borderColor = "#b8860b"}
                onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
                value={newPlaybook.context || ""}
                onChange={(e) => setNewPlaybook(prev => ({ ...prev, context: e.target.value }))}
                data-testid="input-playbook-context"
              />
              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                The more context you give, the more specific your playbook will be.
              </p>
            </div>

            {/* Category + Role */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm text-white">Category</Label>
                <Select value={newPlaybook.category} onValueChange={(v) => setNewPlaybook(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger
                    style={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
                    data-testid="select-playbook-category"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[newPlaybook.category || "opening"] }} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[c.value] }} />
                          {c.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-white">Assign to Role</Label>
                <Select value={newPlaybook.role || "all"} onValueChange={(v) => setNewPlaybook(prev => ({ ...prev, role: v }))}>
                  <SelectTrigger
                    style={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
                    data-testid="select-playbook-role"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assist Toggle */}
            <div
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div>
                <span className="text-sm font-semibold text-white">Assist</span>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Generate a first draft based on your title and context
                </p>
              </div>
              <button
                className="w-10 h-5 rounded-full relative transition-colors"
                style={{ background: aiAssist ? "#b8860b" : "rgba(255,255,255,0.15)" }}
                onClick={() => setAiAssist(!aiAssist)}
                data-testid="toggle-ai-assist"
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ left: aiAssist ? "22px" : "2px" }}
                />
              </button>
            </div>

            {/* Creation Mode - only when assist is on */}
            {aiAssist && (
              <div className="space-y-2">
                <Label className="text-sm text-white">Creation Mode</Label>
                <div className="grid gap-2">
                  {modes.map(m => {
                    const selected = newPlaybook.mode === m.value;
                    return (
                      <div
                        key={m.value}
                        className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all relative"
                        style={{
                          background: selected ? "rgba(184,134,11,0.12)" : "#0f1117",
                          border: selected ? "1.5px solid #b8860b" : "1px solid rgba(255,255,255,0.1)",
                        }}
                        onClick={() => setNewPlaybook(prev => ({ ...prev, mode: m.value }))}
                        data-testid={`mode-${m.value}`}
                      >
                        <m.icon className="h-5 w-5" style={{ color: selected ? "#d4a017" : "rgba(255,255,255,0.4)" }} />
                        <div>
                          <p className="text-sm font-medium" style={{ color: selected ? "white" : "rgba(255,255,255,0.8)" }}>{m.label}</p>
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{m.desc}</p>
                        </div>
                        {selected && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 className="h-4 w-4" style={{ color: "#d4a017" }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Generate preview */}
            {aiAssist && newPlaybook.title && (
              <div className="space-y-2">
                {!generatedContent && !isGenerating && (
                  <Button
                    className="w-full text-white text-sm font-semibold"
                    style={{ background: "linear-gradient(135deg, #b8860b, #d4a017)" }}
                    onClick={handleGenerate}
                    data-testid="button-generate"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    Generate Draft
                  </Button>
                )}
                {isGenerating && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: "#d4a017" }}>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Generating your playbook...
                  </div>
                )}
                {generatedContent && (
                  <div
                    className="p-3 rounded-lg text-sm max-h-48 overflow-y-auto"
                    style={{
                      background: "#0f1117",
                      border: isGenerating ? "1.5px solid #b8860b" : "1px solid rgba(255,255,255,0.1)",
                      color: "#e2e8f0",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.6,
                    }}
                    data-testid="text-generated-content"
                  >
                    {generatedContent}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsCreating(false)}
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Cancel
            </Button>
            <Button
              className="text-white font-semibold"
              style={{
                background: "linear-gradient(135deg, #b8860b, #d4a017)",
                opacity: !newPlaybook.title || createMutation.isPending ? 0.5 : 1,
              }}
              disabled={!newPlaybook.title || createMutation.isPending}
              onClick={handleCreatePlaybook}
              data-testid="button-save-playbook"
            >
              {createMutation.isPending || updateMutation.isPending ? (editingPlaybookId ? "Saving..." : "Creating...") : (editingPlaybookId ? "Save Changes" : "Create Playbook")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
