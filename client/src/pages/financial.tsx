import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
  Upload, FileText, Trash2, TrendingUp, DollarSign, Users,
  Send, ArrowLeft, Loader2, AlertCircle,
  BarChart3, FileSpreadsheet, CheckCircle, Sparkles,
  ChevronDown, ChevronUp, Copy, Pin, Share2,
  RefreshCw, LogOut, UserCog, Clock, Layers,
  MessageSquare, Eye, RotateCcw, BookOpen, ChefHat,
  AlertTriangle, Check, ArrowRight, ExternalLink, X, Package
} from "lucide-react";
import type { FinancialDocument, FinancialMessage } from "@shared/schema";
import ReactMarkdown from "react-markdown";
import { isNativeApp, nativeShare } from "@/lib/native";

interface FinancialExtract {
  id: number;
  documentId: number;
  rawText: string | null;
  structuredMetrics: any;
  summary: string | null;
  errorMessage: string | null;
}

interface DocumentWithExtract {
  document: FinancialDocument;
  extract: FinancialExtract | null;
}

interface SavedInsight {
  id: string;
  content: string;
  timestamp: Date;
  docType: string;
}

interface AnalysisResult {
  healthScore: number;
  alerts: string[];
  wins: string[];
  actionItems: string[];
  metrics: { name: string; value: string; benchmark: string; status: "good" | "warn" | "bad" }[];
  rawText: string;
}

type HealthStatus = "healthy" | "watch" | "high" | "low";

function getHealthStatus(type: string, value: number): HealthStatus {
  if (type === "food") return value < 30 ? "healthy" : value <= 34 ? "watch" : "high";
  if (type === "labor") return value < 28 ? "healthy" : value <= 33 ? "watch" : "high";
  if (type === "prime") return value < 60 ? "healthy" : value <= 65 ? "watch" : "high";
  if (type === "net") return value > 10 ? "healthy" : value >= 5 ? "watch" : "low";
  return "healthy";
}

function healthBadgeText(status: HealthStatus): string {
  if (status === "healthy") return "Healthy";
  if (status === "watch") return "Watch";
  if (status === "high") return "High";
  return "Low";
}

function detectDocTypeFromFilename(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("p&l") || lower.includes("profit")) return "pl_statement";
  if (lower.includes("labor") || lower.includes("payroll")) return "labor_report";
  if (lower.includes("sales")) return "sales_report";
  if (lower.includes("inventory")) return "inventory";
  return "other";
}

function generateConcerns(metrics: any): string[] {
  const concerns: string[] = [];
  if (metrics?.costs?.foodCostPercent && metrics.costs.foodCostPercent > 30) {
    concerns.push(`Your food cost is ${metrics.costs.foodCostPercent.toFixed(1)}% — industry target is under 30%. Review supplier pricing and portion sizes.`);
  }
  if (metrics?.labor?.laborPercent && metrics.labor.laborPercent > 28) {
    concerns.push(`Labor cost at ${metrics.labor.laborPercent.toFixed(1)}% exceeds the 28% benchmark. Evaluate scheduling efficiency and overtime.`);
  }
  if (metrics?.primeCost?.percent && metrics.primeCost.percent > 60) {
    concerns.push(`Prime cost (food + labor) at ${metrics.primeCost.percent.toFixed(1)}% — target under 60% for healthy margins.`);
  }
  if (metrics?.profitability?.netMargin != null && metrics.profitability.netMargin < 5) {
    concerns.push(`Net profit margin at ${metrics.profitability.netMargin.toFixed(1)}% is below the 5% minimum. Focus on reducing your highest cost categories.`);
  }
  return concerns;
}

const questionSets: Record<string, string[]> = {
  pl_statement: [
    "What should I focus on to improve profitability?",
    "Where are my biggest cost savings opportunities?",
    "How does my food cost % compare to industry benchmarks?",
    "What's my net profit margin and is it healthy?",
  ],
  sales_report: [
    "Which day of the week is my highest revenue?",
    "What's my revenue per available seat hour (RevPASH)?",
    "Are there revenue trends I should be aware of?",
    "What does my day-of-week pattern tell me about staffing?",
  ],
  labor_report: [
    "What is my labor % and is it on target?",
    "Where am I over-scheduled relative to revenue?",
    "Are there overtime patterns I should address?",
    "How can I improve scheduling efficiency?",
  ],
  inventory: [
    "What are my highest-waste line items?",
    "Where should I adjust my par levels?",
    "What items are hurting my food cost the most?",
    "How do I reduce shrinkage in my top 10 items?",
  ],
  general: [
    "What are industry benchmarks for restaurant food cost %?",
    "What's a healthy prime cost target for a casual dining concept?",
    "How can I reduce my prime cost?",
    "What should my labor % be for a full-service restaurant?",
  ],
};

const FULL_ANALYSIS_PROMPT = "Provide a comprehensive financial analysis. Structure your response EXACTLY like this:\n\nHEALTH_SCORE: [number 0-100]\n\nALERTS:\n- [alert 1]\n- [alert 2]\n- [alert 3]\n\nWINS:\n- [win 1]\n- [win 2]\n- [win 3]\n\nACTION_ITEMS:\n- [action 1]\n- [action 2]\n- [action 3]\n- [action 4]\n- [action 5]\n\nMETRICS:\n[metric name] | [your value] | [benchmark] | [good/warn/bad]\n[metric name] | [your value] | [benchmark] | [good/warn/bad]\n\nDETAILED_ANALYSIS:\n[Full narrative analysis covering revenue health, cost structure, prime cost, profit margins, and specific recommendations with expected impact]";

const DOC_TYPE_ICONS: Record<string, typeof BarChart3> = {
  pl_statement: BarChart3,
  sales_report: TrendingUp,
  labor_report: Users,
  inventory: Package,
  other: FileSpreadsheet,
};

const DOC_TYPE_LABELS: Record<string, string> = {
  pl_statement: "P&L Statement",
  sales_report: "Sales Report",
  labor_report: "Labor Report",
  inventory: "Inventory Report",
  other: "Other",
};

const DOC_TYPE_DESCS: Record<string, string> = {
  pl_statement: "Cost analysis, margin health, savings opportunities",
  sales_report: "Revenue trends, per-seat metrics, day-of-week patterns",
  labor_report: "Labor % analysis, overtime flags, scheduling efficiency",
  inventory: "Waste identification, par optimization, cost trends",
};

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
  return `${days}d ago`;
}

function parseAnalysisResult(text: string): AnalysisResult | null {
  try {
    const scoreMatch = text.match(/HEALTH_SCORE:\s*(\d+)/);
    const alertsMatch = text.match(/ALERTS:\n([\s\S]*?)(?=\n\nWINS:)/);
    const winsMatch = text.match(/WINS:\n([\s\S]*?)(?=\n\nACTION_ITEMS:)/);
    const actionsMatch = text.match(/ACTION_ITEMS:\n([\s\S]*?)(?=\n\nMETRICS:)/);
    const metricsMatch = text.match(/METRICS:\n([\s\S]*?)(?=\n\nDETAILED_ANALYSIS:)/);
    const detailedMatch = text.match(/DETAILED_ANALYSIS:\n([\s\S]*)/);

    if (!scoreMatch) return null;

    const parseItems = (block: string | undefined) =>
      (block || "").split("\n").map(l => l.replace(/^-\s*/, "").trim()).filter(l => l.length > 0);

    const parseMetrics = (block: string | undefined) =>
      (block || "").split("\n").filter(l => l.includes("|")).map(l => {
        const parts = l.split("|").map(p => p.trim());
        return {
          name: parts[0] || "",
          value: parts[1] || "",
          benchmark: parts[2] || "",
          status: (parts[3] as "good" | "warn" | "bad") || "good",
        };
      });

    return {
      healthScore: parseInt(scoreMatch[1]) || 0,
      alerts: parseItems(alertsMatch?.[1]).slice(0, 3),
      wins: parseItems(winsMatch?.[1]).slice(0, 3),
      actionItems: parseItems(actionsMatch?.[1]),
      metrics: parseMetrics(metricsMatch?.[1]),
      rawText: detailedMatch?.[1]?.trim() || text,
    };
  } catch {
    return null;
  }
}

export default function FinancialPage() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading, logout } = useAuth();
  const { toast } = useToast();
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [docType, setDocType] = useState("other");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<"documents" | "analysis">("documents");
  const [analysesRun, setAnalysesRun] = useState(0);
  const [savedInsights, setSavedInsights] = useState<SavedInsight[]>([]);
  const [insightsExpanded, setInsightsExpanded] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [actionChecks, setActionChecks] = useState<Set<number>>(new Set());
  const [viewingDocText, setViewingDocText] = useState<string | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: documents, isLoading: docsLoading } = useQuery<FinancialDocument[]>({
    queryKey: ["/api/financial/documents"],
    enabled: !!user,
  });

  const { data: selectedDoc } = useQuery<DocumentWithExtract>({
    queryKey: ["/api/financial/documents", selectedDocId],
    queryFn: async () => {
      const res = await fetch(`/api/financial/documents/${selectedDocId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch document");
      return res.json();
    },
    enabled: !!selectedDocId,
  });

  const { data: messages } = useQuery<FinancialMessage[]>({
    queryKey: ["/api/financial/messages", selectedDocId],
    queryFn: async () => {
      const url = selectedDocId
        ? `/api/financial/messages?documentId=${selectedDocId}`
        : "/api/financial/messages";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!user,
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/financial/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/documents"] });
      toast({ title: "Document uploaded", description: "Processing your document..." });
      setSelectedFile(null);
      setExtractionStatus("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: () => {
      toast({ title: "Upload failed", description: "Please try again", variant: "destructive" });
      setExtractionStatus("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/financial/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/documents"] });
      if (selectedDocId) setSelectedDocId(null);
      toast({ title: "Document removed" });
    },
  });

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const detected = detectDocTypeFromFilename(file.name);
    setDocType(detected);
  };

  const handleUploadClick = () => {
    if (!selectedFile) return;
    setExtractionStatus("Reading document...");
    setTimeout(() => setExtractionStatus("Extracting financial data..."), 1500);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("docType", docType);
    uploadMutation.mutate(formData);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const askQuestion = useCallback(async (q?: string) => {
    const text = q || question;
    if (!text.trim() || isStreaming) return;
    setIsStreaming(true);
    setStreamingContent("");
    setAnalysesRun(prev => prev + 1);
    try {
      const response = await fetch("/api/financial/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, documentId: selectedDocId || undefined }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to get response");
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        let content = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter(line => line.startsWith("data: "));
          for (const line of lines) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) { content += data.content; setStreamingContent(content); }
              if (data.done) { queryClient.invalidateQueries({ queryKey: ["/api/financial/messages"] }); }
            } catch {}
          }
        }

        if (text === FULL_ANALYSIS_PROMPT) {
          const parsed = parseAnalysisResult(content);
          if (parsed) {
            setAnalysisResult(parsed);
            setActionChecks(new Set());
          }
        }
      }
    } catch {
      toast({ title: "Error", description: "Failed to get response", variant: "destructive" });
    } finally {
      setIsStreaming(false);
      setQuestion("");
    }
  }, [question, isStreaming, selectedDocId, toast]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const [pendingViewDoc, setPendingViewDoc] = useState(false);
  useEffect(() => {
    if (pendingViewDoc && selectedDoc?.extract?.rawText) {
      setViewingDocText(selectedDoc.extract.rawText);
      setPendingViewDoc(false);
    }
  }, [pendingViewDoc, selectedDoc]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#0f1117" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#d4a017" }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4" style={{ background: "#0f1117" }}>
        <h1 className="text-2xl font-bold text-white">Financial Insights</h1>
        <p style={{ color: "rgba(255,255,255,0.5)" }}>Sign in to upload your financial reports and get expert analysis</p>
        <Button asChild><Link href="/">Go to Home</Link></Button>
      </div>
    );
  }

  const metrics = selectedDoc?.extract?.structuredMetrics;
  const concerns = metrics ? generateConcerns(metrics) : [];
  const selectedDocType = selectedDocId ? documents?.find(d => d.id === selectedDocId)?.docType : null;
  const suggestions = questionSets[selectedDocType || ""] || questionSets.general;
  const hasDocuments = documents && documents.length > 0;
  const selectedDocReady = selectedDocId
    ? documents?.find(d => d.id === selectedDocId)?.status === "ready"
    : documents?.some(d => d.status === "ready");

  const totalDocs = documents?.length || 0;
  const docTypesCovered = new Set(documents?.map(d => d.docType).filter(t => t !== "other") || []).size;
  const lastUpload = documents?.length
    ? [...documents].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0]
    : null;

  const docsByType = (documents || []).reduce<Record<string, FinancialDocument>>((acc, d) => {
    if (!acc[d.docType] || new Date(d.createdAt || 0) > new Date(acc[d.docType].createdAt || 0)) {
      acc[d.docType] = d;
    }
    return acc;
  }, {});

  const handleSuggestionClick = (q: string) => {
    if (isStreaming) return;
    askQuestion(q);
  };

  const handleFullAnalysis = () => {
    if (isStreaming) return;
    askQuestion(FULL_ANALYSIS_PROMPT);
  };

  const saveInsight = (content: string) => {
    const insight: SavedInsight = {
      id: Date.now().toString(),
      content: content.slice(0, 500),
      timestamp: new Date(),
      docType: selectedDocType || "general",
    };
    setSavedInsights(prev => {
      const next = [insight, ...prev];
      return next.slice(0, 8);
    });
    toast({ title: "Insight saved" });
  };

  const removeInsight = (id: string) => {
    setSavedInsights(prev => prev.filter(i => i.id !== id));
  };

  const exportInsights = () => {
    const text = savedInsights.map(i => `[${i.docType}] ${i.content}`).join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
    toast({ title: "All insights copied to clipboard" });
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const shareResponse = (q: string, a: string) => {
    const text = `Q: ${q}\n\nA: ${a}`;
    if (isNativeApp()) {
      nativeShare({ title: "Financial Insight", text, url: "" });
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard" });
    }
  };

  const saveAsPlaybook = () => {
    if (!analysisResult) return;
    const content = analysisResult.actionItems.map(item => `- [ ] ${item}`).join("\n");
    const date = new Date().toLocaleDateString();
    navigate(`/playbooks?prefill=${encodeURIComponent(JSON.stringify({
      title: `Financial Action Plan · ${date}`,
      category: "other",
      mode: "checklist",
      content,
    }))}`);
  };

  const askConsultantAboutAnalysis = () => {
    if (!analysisResult) return;
    const alertsSummary = analysisResult.alerts.slice(0, 3).join("; ");
    navigate(`/consultant?prompt=${encodeURIComponent(`I just ran a financial analysis. My top issues were: ${alertsSummary}. Can you give me an operator-level plan to address these?`)}`);
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  };

  const HealthScoreDonut = ({ score }: { score: number }) => {
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (score / 100) * circumference;
    const color = scoreColor(score);
    return (
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ animation: "financialScoreArc 0.6s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{score}</span>
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>/ 100</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ background: "#0f1117" }}>
      <header
        className="sticky top-0 z-50 backdrop-blur"
        style={{
          background: "rgba(15,17,23,0.95)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="link-back-dashboard">
                <ArrowLeft className="h-4 w-4" style={{ color: "rgba(255,255,255,0.7)" }} />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6" style={{ color: "#d4a017" }} />
              <span className="font-bold text-white">Financial Insights</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer" data-testid="button-user-menu">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback>{user?.firstName?.[0] || user?.email?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <span className="text-sm hidden md:inline text-white">{user?.firstName || "User"}</span>
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
              <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                <UserCog className="mr-2 h-4 w-4" />Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="mb-6" style={{ animation: "playbookStaggerIn 0.4s ease both" }}>
          <h1 className="text-3xl font-bold mb-2 text-white">Financial Insights</h1>
          <p style={{ color: "rgba(255,255,255,0.5)" }}>
            Upload your financial reports for expert analysis, benchmarking, and actionable recommendations.
          </p>
        </div>

        <Link href="/financial/prime-cost">
          <div
            className="p-4 rounded-xl mb-6 flex items-center justify-between cursor-pointer transition-all"
            style={{ backgroundColor: "#1a1d2e", border: "1px solid #b8860b" }}
            data-testid="link-prime-cost-tracker"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: "rgba(212,160,23,0.12)" }}>
                <DollarSign className="h-5 w-5" style={{ color: "#d4a017" }} />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Weekly Prime Cost Tracker</p>
                <p className="text-xs" style={{ color: "#9ca3af" }}>Track food cost + labor cost vs. sales every week</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4" style={{ color: "#d4a017" }} />
          </div>
        </Link>

        {/* Intelligence Strip */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
          style={{ animation: "playbookStaggerIn 0.4s ease 0.08s both" }}
        >
          {[
            { label: "Documents Uploaded", value: totalDocs > 0 ? `${totalDocs} uploaded` : "0 uploaded", icon: FileText },
            { label: "Document Types", value: `${docTypesCovered} of 4`, icon: Layers },
            { label: "Analyses Run", value: `${analysesRun} analyses`, icon: Sparkles },
            { label: "Last Upload", value: lastUpload ? `${lastUpload.originalName?.slice(0, 20) || "Document"} · ${timeAgo(lastUpload.createdAt)}` : "No uploads yet", icon: Clock },
          ].map((m, idx) => (
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
                <m.icon className="h-3.5 w-3.5" style={{ color: "#d4a017" }} />
                <span className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>{m.label}</span>
              </div>
              <p className="text-sm font-semibold text-white truncate">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Tab Bar */}
        <div
          className="flex items-center gap-1 mb-6 p-1 rounded-lg"
          style={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.06)", animation: "playbookStaggerIn 0.4s ease 0.16s both" }}
        >
          {[
            { key: "documents" as const, label: "Documents", badge: totalDocs > 0 ? `(${totalDocs})` : "" },
            { key: "analysis" as const, label: "Analysis", badge: "" },
          ].map(tab => (
            <button
              key={tab.key}
              className="flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all"
              style={{
                background: activeTab === tab.key ? "#1a1d2e" : "transparent",
                color: activeTab === tab.key ? "white" : "rgba(255,255,255,0.4)",
                borderBottom: activeTab === tab.key ? "2px solid #b8860b" : "2px solid transparent",
              }}
              onClick={() => setActiveTab(tab.key)}
              data-testid={`tab-${tab.key}`}
            >
              {tab.label} {tab.badge && <span className="ml-1 opacity-60">{tab.badge}</span>}
            </button>
          ))}
        </div>

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <div className="space-y-6" style={{ animation: "playbookStaggerIn 0.4s ease 0.24s both" }}>
            {/* Upload Zone */}
            <div
              className="rounded-xl p-6"
              style={{ background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div
                data-testid="dropzone-upload"
                className="relative rounded-xl p-8 text-center cursor-pointer transition-all"
                style={{
                  background: isDragging ? "rgba(184,134,11,0.06)" : "#0f1117",
                  border: isDragging ? "1.5px solid #b8860b" : "1.5px dashed rgba(184,134,11,0.4)",
                  animation: isDragging ? "financialDragPulse 1s ease infinite" : "none",
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.csv,.xlsx,.xls,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                  data-testid="input-file-upload"
                />
                {extractionStatus ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin" style={{ color: "#d4a017" }} />
                    <p className="text-sm font-medium text-white">{extractionStatus}</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 mx-auto mb-3" style={{ color: "#b8860b", transform: isDragging ? "scale(1.1)" : "scale(1)", transition: "transform 0.2s" }} />
                    <p className="font-medium text-white">
                      Drag & drop your financial report here, or <span style={{ color: "#d4a017" }}>click to browse</span>
                    </p>
                    <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Supports PDF, CSV, Excel, and image files</p>
                    <div className="flex items-center justify-center gap-3 mt-3">
                      {["PDF", "CSV", "Excel", "Image"].map(fmt => (
                        <span
                          key={fmt}
                          className="text-xs px-2.5 py-1 rounded-full"
                          style={{ border: "1px solid rgba(184,134,11,0.4)", color: "#d4a017" }}
                        >
                          {fmt}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {selectedFile && !uploadMutation.isPending && (
                <div className="flex items-center gap-3 p-3 rounded-lg mt-4" style={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <FileText className="h-5 w-5" style={{ color: "#d4a017" }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-white truncate">{selectedFile.name}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <div className="flex-1">
                  <Label className="text-sm text-white mb-1.5 block">Document Type</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger
                      style={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
                      data-testid="select-doc-type"
                    >
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pl_statement">P&L Statement</SelectItem>
                      <SelectItem value="sales_report">Sales Report</SelectItem>
                      <SelectItem value="labor_report">Labor Report</SelectItem>
                      <SelectItem value="inventory">Inventory</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    className="text-white font-semibold"
                    style={{
                      background: "linear-gradient(135deg, #b8860b, #d4a017)",
                      opacity: !selectedFile || uploadMutation.isPending ? 0.5 : 1,
                    }}
                    onClick={handleUploadClick}
                    disabled={!selectedFile || uploadMutation.isPending}
                    data-testid="btn-upload"
                  >
                    {uploadMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</>
                    ) : (
                      <><Upload className="h-4 w-4 mr-2" />Upload</>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Your Documents */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-base font-bold text-white">Your Documents</h2>
                {totalDocs > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                    {totalDocs} uploaded
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {["pl_statement", "sales_report", "labor_report", "inventory"].map((type) => {
                  const doc = docsByType[type];
                  const Icon = DOC_TYPE_ICONS[type] || FileSpreadsheet;
                  const isUploaded = !!doc && doc.status === "ready";
                  const isProcessing = !!doc && doc.status === "processing";
                  const isFailed = !!doc && doc.status === "failed";

                  return (
                    <div
                      key={type}
                      className="p-4 rounded-lg transition-all"
                      style={{
                        background: isUploaded ? "rgba(184,134,11,0.06)" : "#1a1d2e",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderLeft: isUploaded ? "3px solid #b8860b" : "1px solid rgba(255,255,255,0.06)",
                      }}
                      data-testid={`doc-card-${type}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: "#d4a017" }} />
                          <div className="min-w-0">
                            <p className="font-semibold text-[15px] text-white">{DOC_TYPE_LABELS[type]}</p>
                            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{DOC_TYPE_DESCS[type]}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isUploaded && (
                            <>
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              <span className="text-xs text-white truncate max-w-[100px]">{doc?.originalName?.slice(0, 24)}</span>
                            </>
                          )}
                          {isProcessing && <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#d4a017" }} />}
                          {isFailed && (
                            <span className="text-xs flex items-center gap-1" style={{ color: "#ef4444" }}>
                              <AlertCircle className="h-3 w-3" />Failed
                            </span>
                          )}
                          {!doc && (
                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Not uploaded</span>
                          )}
                        </div>
                      </div>

                      {isUploaded && doc && (
                        <div className="flex items-center gap-2 mt-3 pl-8">
                          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>{timeAgo(doc.createdAt)}</span>
                          <button
                            className="text-[11px] flex items-center gap-0.5"
                            style={{ color: "rgba(255,255,255,0.4)" }}
                            onClick={() => {
                              if (selectedDocId === doc.id && selectedDoc?.extract?.rawText) {
                                setViewingDocText(selectedDoc.extract.rawText);
                              } else {
                                setSelectedDocId(doc.id);
                                setPendingViewDoc(true);
                              }
                            }}
                            data-testid={`view-doc-${type}`}
                          >
                            <Eye className="h-3 w-3" />View
                          </button>
                          <button
                            className="text-[11px] flex items-center gap-0.5"
                            style={{ color: "rgba(255,255,255,0.4)" }}
                            onClick={() => fileInputRef.current?.click()}
                            data-testid={`replace-doc-${type}`}
                          >
                            <RotateCcw className="h-3 w-3" />Replace
                          </button>
                          <button
                            className="text-[11px] flex items-center gap-0.5"
                            style={{ color: "rgba(255,255,255,0.4)" }}
                            onClick={() => deleteMutation.mutate(doc.id)}
                            data-testid={`remove-doc-${type}`}
                          >
                            <Trash2 className="h-3 w-3" />Remove
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* POS info callout */}
              <div
                className="mt-4 p-3 rounded-lg italic text-sm"
                style={{
                  background: "rgba(184,134,11,0.06)",
                  borderLeft: "3px solid #b8860b",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                Most POS systems (Toast, Square, Clover) can export these as CSV or Excel from their Reports section.
              </div>
            </div>

            {/* Document Summary */}
            {selectedDoc?.extract && !selectedDoc.extract.errorMessage && metrics && (
              <div className="rounded-xl p-6" style={{ background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.06)" }}>
                <h3 className="text-base font-bold text-white mb-4">Document Summary — {selectedDoc.document.originalName}</h3>
                {selectedDoc.extract.summary && (
                  <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>{selectedDoc.extract.summary}</p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {metrics.revenue?.total != null && (
                    <div className="p-3 rounded-lg" style={{ background: "#0f1117", borderLeft: "3px solid #10b981" }} data-testid="metric-card-revenue">
                      <div className="flex items-center gap-1 mb-1">
                        <DollarSign className="h-3.5 w-3.5" style={{ color: "#d4a017" }} />
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Revenue</span>
                      </div>
                      <p className="text-xl font-bold text-white">${metrics.revenue.total.toLocaleString()}</p>
                    </div>
                  )}
                  {metrics.costs?.foodCostPercent != null && (() => {
                    const s = getHealthStatus("food", metrics.costs.foodCostPercent);
                    return (
                      <div className="p-3 rounded-lg" style={{ background: "#0f1117", borderLeft: `3px solid ${s === "healthy" ? "#10b981" : s === "watch" ? "#f59e0b" : "#ef4444"}` }} data-testid="metric-card-food">
                        <div className="flex items-center gap-1 mb-1">
                          <ChefHat className="h-3.5 w-3.5" style={{ color: "#d4a017" }} />
                          <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Food Cost</span>
                        </div>
                        <p className="text-xl font-bold text-white">{metrics.costs.foodCostPercent.toFixed(1)}%</p>
                        <span className="text-[10px] font-medium" style={{ color: s === "healthy" ? "#10b981" : s === "watch" ? "#f59e0b" : "#ef4444" }}>{healthBadgeText(s)}</span>
                      </div>
                    );
                  })()}
                  {metrics.labor?.laborPercent != null && (() => {
                    const s = getHealthStatus("labor", metrics.labor.laborPercent);
                    return (
                      <div className="p-3 rounded-lg" style={{ background: "#0f1117", borderLeft: `3px solid ${s === "healthy" ? "#10b981" : s === "watch" ? "#f59e0b" : "#ef4444"}` }} data-testid="metric-card-labor">
                        <div className="flex items-center gap-1 mb-1">
                          <Users className="h-3.5 w-3.5" style={{ color: "#d4a017" }} />
                          <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Labor Cost</span>
                        </div>
                        <p className="text-xl font-bold text-white">{metrics.labor.laborPercent.toFixed(1)}%</p>
                        <span className="text-[10px] font-medium" style={{ color: s === "healthy" ? "#10b981" : s === "watch" ? "#f59e0b" : "#ef4444" }}>{healthBadgeText(s)}</span>
                      </div>
                    );
                  })()}
                  {metrics.primeCost?.percent != null && (() => {
                    const s = getHealthStatus("prime", metrics.primeCost.percent);
                    return (
                      <div className="p-3 rounded-lg" style={{ background: "#0f1117", borderLeft: `3px solid ${s === "healthy" ? "#10b981" : s === "watch" ? "#f59e0b" : "#ef4444"}` }} data-testid="metric-card-prime">
                        <div className="flex items-center gap-1 mb-1">
                          <BarChart3 className="h-3.5 w-3.5" style={{ color: "#d4a017" }} />
                          <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Prime Cost</span>
                        </div>
                        <p className="text-xl font-bold text-white">{metrics.primeCost.percent.toFixed(1)}%</p>
                        <span className="text-[10px] font-medium" style={{ color: s === "healthy" ? "#10b981" : s === "watch" ? "#f59e0b" : "#ef4444" }}>{healthBadgeText(s)}</span>
                      </div>
                    );
                  })()}
                  {metrics.profitability?.netMargin != null && (() => {
                    const s = getHealthStatus("net", metrics.profitability.netMargin);
                    return (
                      <div className="p-3 rounded-lg" style={{ background: "#0f1117", borderLeft: `3px solid ${s === "healthy" ? "#10b981" : s === "watch" ? "#f59e0b" : "#ef4444"}` }} data-testid="metric-card-net">
                        <div className="flex items-center gap-1 mb-1">
                          <TrendingUp className="h-3.5 w-3.5" style={{ color: "#d4a017" }} />
                          <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Net Profit</span>
                        </div>
                        <p className="text-xl font-bold text-white">{metrics.profitability.netMargin.toFixed(1)}%</p>
                        <span className="text-[10px] font-medium" style={{ color: s === "healthy" ? "#10b981" : s === "watch" ? "#f59e0b" : "#ef4444" }}>{healthBadgeText(s)}</span>
                      </div>
                    );
                  })()}
                </div>

                {concerns.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-white">
                      <AlertTriangle className="h-4 w-4" style={{ color: "#ef4444" }} />
                      Key Concerns
                    </h4>
                    {concerns.map((c, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded" style={{ background: "rgba(239,68,68,0.06)", borderLeft: "3px solid #ef4444" }}>
                        <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{c}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Analysis Tab */}
        {activeTab === "analysis" && (
          <div className="space-y-4" style={{ animation: "playbookStaggerIn 0.4s ease 0.24s both" }}>
            {/* Upload gate warning */}
            {!hasDocuments && (
              <div
                className="p-4 rounded-lg flex items-start gap-3"
                style={{ background: "rgba(184,134,11,0.08)", border: "1.5px solid rgba(184,134,11,0.4)" }}
              >
                <Upload className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: "#d4a017" }} />
                <div className="flex-1">
                  <p className="font-semibold text-white text-sm">Upload a financial document first.</p>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Go to the Documents tab to upload your P&L, Sales Report, Labor Report, or Inventory data — then come back here to analyze it.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs"
                    style={{ color: "#d4a017", border: "1px solid rgba(184,134,11,0.3)" }}
                    onClick={() => setActiveTab("documents")}
                    data-testid="button-go-documents"
                  >
                    Go to Documents
                  </Button>
                </div>
              </div>
            )}

            {/* Saved Insights Panel */}
            {savedInsights.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.06)" }}>
                <button
                  className="w-full flex items-center justify-between p-4"
                  onClick={() => setInsightsExpanded(!insightsExpanded)}
                  data-testid="button-toggle-insights"
                >
                  <div className="flex items-center gap-2">
                    <Pin className="h-4 w-4" style={{ color: "#d4a017" }} />
                    <span className="text-sm font-medium text-white">Saved Insights</span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(184,134,11,0.2)", color: "#d4a017" }}>
                      {savedInsights.length}
                    </span>
                  </div>
                  {insightsExpanded ? <ChevronUp className="h-4 w-4" style={{ color: "#d4a017" }} /> : <ChevronDown className="h-4 w-4" style={{ color: "#d4a017" }} />}
                </button>
                {insightsExpanded && (
                  <div className="px-4 pb-4 space-y-2">
                    {savedInsights.map(insight => (
                      <div key={insight.id} className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "#0f1117", borderLeft: "3px solid #b8860b" }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs line-clamp-3" style={{ color: "rgba(255,255,255,0.7)" }}>{insight.content}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{timeAgo(insight.timestamp)}</span>
                            <span className="text-[10px] px-1 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                              {DOC_TYPE_LABELS[insight.docType] || "General"}
                            </span>
                          </div>
                        </div>
                        <button onClick={() => removeInsight(insight.id)} className="p-1 flex-shrink-0">
                          <X className="h-3 w-3" style={{ color: "rgba(255,255,255,0.3)" }} />
                        </button>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      style={{ color: "#d4a017", border: "1px solid rgba(184,134,11,0.3)" }}
                      onClick={exportInsights}
                      data-testid="button-export-insights"
                    >
                      <Share2 className="h-3 w-3 mr-1" />Export All Insights
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Full Analysis Results Card */}
            {analysisResult && (
              <div className="rounded-xl p-6" style={{ background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between gap-4 mb-6">
                  <h3 className="text-lg font-bold text-white">Financial Analysis Results</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      style={{ color: "rgba(255,255,255,0.5)" }}
                      onClick={handleFullAnalysis}
                      data-testid="button-rerun"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />Re-run
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      style={{ color: "#d4a017", border: "1px solid rgba(184,134,11,0.3)" }}
                      onClick={() => copyText(analysisResult.rawText)}
                      data-testid="button-copy-report"
                    >
                      <Copy className="h-3 w-3 mr-1" />Copy Full Report
                    </Button>
                  </div>
                </div>

                {/* Health Score + Alerts/Wins */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="flex flex-col items-center justify-center p-4 rounded-lg" style={{ background: "#0f1117" }}>
                    <HealthScoreDonut score={analysisResult.healthScore} />
                    <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>Financial Health Score</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1" style={{ color: "#ef4444" }}>
                      <AlertTriangle className="h-3 w-3" />Top Alerts
                    </h4>
                    {analysisResult.alerts.map((alert, i) => (
                      <div key={i} className="p-2.5 rounded text-xs" style={{ background: "rgba(239,68,68,0.06)", borderLeft: "3px solid #ef4444", color: "rgba(255,255,255,0.7)" }}>
                        {alert}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1" style={{ color: "#10b981" }}>
                      <CheckCircle className="h-3 w-3" />Top Wins
                    </h4>
                    {analysisResult.wins.map((win, i) => (
                      <div key={i} className="p-2.5 rounded text-xs" style={{ background: "rgba(16,185,129,0.06)", borderLeft: "3px solid #10b981", color: "rgba(255,255,255,0.7)" }}>
                        {win}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Items */}
                {analysisResult.actionItems.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" style={{ color: "#d4a017" }} />
                      Action Items
                    </h4>
                    <div className="space-y-2">
                      {analysisResult.actionItems.map((item, idx) => {
                        const isChecked = actionChecks.has(idx);
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-3 rounded-lg cursor-pointer"
                            style={{
                              background: "#0f1117",
                              border: `1px solid ${isChecked ? "rgba(184,134,11,0.3)" : "rgba(255,255,255,0.06)"}`,
                              opacity: isChecked ? 0.6 : 1,
                            }}
                            onClick={() => setActionChecks(prev => {
                              const next = new Set(prev);
                              if (next.has(idx)) next.delete(idx); else next.add(idx);
                              return next;
                            })}
                            data-testid={`action-item-${idx}`}
                          >
                            <div
                              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                              style={{
                                border: isChecked ? "none" : "2px solid rgba(255,255,255,0.3)",
                                background: isChecked ? "#b8860b" : "transparent",
                              }}
                            >
                              {isChecked && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <span className="text-sm" style={{ color: isChecked ? "rgba(255,255,255,0.4)" : "#e2e8f0", textDecoration: isChecked ? "line-through" : "none" }}>
                              {item}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3 text-xs"
                      style={{ color: "#d4a017", border: "1px solid rgba(184,134,11,0.3)" }}
                      onClick={saveAsPlaybook}
                      data-testid="button-save-as-playbook"
                    >
                      <BookOpen className="h-3 w-3 mr-1" />Save as Playbook
                    </Button>
                  </div>
                )}

                {/* Metrics Table */}
                {analysisResult.metrics.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" style={{ color: "#d4a017" }} />
                      Key Metrics Extracted
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" style={{ minWidth: "500px" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <th className="text-left py-2 px-3 text-xs uppercase tracking-wider" style={{ color: "#d4a017" }}>Metric</th>
                            <th className="text-left py-2 px-3 text-xs uppercase tracking-wider" style={{ color: "#d4a017" }}>Your Number</th>
                            <th className="text-left py-2 px-3 text-xs uppercase tracking-wider" style={{ color: "#d4a017" }}>Benchmark</th>
                            <th className="text-left py-2 px-3 text-xs uppercase tracking-wider" style={{ color: "#d4a017" }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysisResult.metrics.map((m, idx) => (
                            <tr key={idx} style={{ background: idx % 2 === 0 ? "#0f1117" : "#1a1d2e" }}>
                              <td className="py-2 px-3 text-white">{m.name}</td>
                              <td className="py-2 px-3 text-white font-medium">{m.value}</td>
                              <td className="py-2 px-3" style={{ color: "rgba(255,255,255,0.5)" }}>{m.benchmark}</td>
                              <td className="py-2 px-3">
                                {m.status === "good" && <CheckCircle className="h-4 w-4" style={{ color: "#10b981" }} />}
                                {m.status === "warn" && <AlertTriangle className="h-4 w-4" style={{ color: "#f59e0b" }} />}
                                {m.status === "bad" && <AlertCircle className="h-4 w-4" style={{ color: "#ef4444" }} />}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Cross-module link */}
                <div className="flex items-center gap-2 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    style={{ color: "#d4a017", border: "1px solid rgba(184,134,11,0.3)" }}
                    onClick={askConsultantAboutAnalysis}
                    data-testid="button-ask-consultant"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />Ask the Consultant about this
                  </Button>
                </div>
              </div>
            )}

            {/* Chat Container */}
            <div className="rounded-xl flex flex-col" style={{ background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.06)", height: "calc(100vh - 500px)", minHeight: "400px" }}>
              {/* Chat Header */}
              <div className="p-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" style={{ color: "#d4a017" }} />
                      Ask About Your Financials
                    </h3>
                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {selectedDocId
                        ? `Analyzing: ${documents?.find(d => d.id === selectedDocId)?.originalName}`
                        : "Ask general questions about your uploaded documents"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasDocuments && (
                      <Select value={selectedDocId?.toString() || "all"} onValueChange={(v) => setSelectedDocId(v === "all" ? null : Number(v))}>
                        <SelectTrigger className="w-[200px] h-8 text-xs" style={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} data-testid="select-analysis-doc">
                          <SelectValue placeholder="All documents" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Documents</SelectItem>
                          {documents?.filter(d => d.status === "ready").map((doc) => (
                            <SelectItem key={doc.id} value={doc.id.toString()}>{doc.originalName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      className="h-8 text-xs text-white font-semibold"
                      style={{
                        background: "linear-gradient(135deg, #b8860b, #d4a017)",
                        opacity: !selectedDocReady || isStreaming ? 0.5 : 1,
                      }}
                      onClick={handleFullAnalysis}
                      disabled={!selectedDocReady || isStreaming}
                      data-testid="btn-full-analysis"
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1" />Run Full Analysis
                    </Button>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <ScrollArea className="flex-1 px-4">
                <div className="space-y-4 py-4">
                  {(!messages || messages.length === 0) && !streamingContent && (
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 mx-auto mb-3" style={{ color: "#b8860b" }} />
                      <p className="text-base font-medium text-white mb-1">No analysis yet</p>
                      <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                        Upload a financial document, then ask a question or run a full analysis.
                      </p>
                    </div>
                  )}

                  {messages?.map((msg, msgIdx) => (
                    <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className="max-w-[80%] p-4"
                        style={msg.role === "user" ? {
                          background: "rgba(184,134,11,0.15)",
                          border: "1px solid rgba(212,160,23,0.3)",
                          borderRadius: "12px 12px 2px 12px",
                        } : {
                          background: "#1a1d2e",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: "12px 12px 12px 2px",
                        }}
                      >
                        {msg.role !== "user" && (
                          <p className="text-[11px] mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                            Financial Insights · {timeAgo(msg.createdAt)}
                          </p>
                        )}
                        {msg.role === "user" ? (
                          <p className="text-sm text-white">{msg.content}</p>
                        ) : (
                          <div className="prose prose-sm prose-invert max-w-none text-sm" style={{ color: "#e2e8f0" }}>
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        )}
                        {msg.role === "user" && (
                          <p className="text-[10px] mt-1 text-right" style={{ color: "rgba(255,255,255,0.3)" }}>{timeAgo(msg.createdAt)}</p>
                        )}
                        {msg.role !== "user" && (
                          <div className="flex items-center gap-1 mt-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                            <button className="p-1.5 rounded" style={{ color: "rgba(255,255,255,0.4)" }} onClick={() => copyText(msg.content)} data-testid={`copy-msg-${msgIdx}`}>
                              <Copy className="h-3 w-3" />
                            </button>
                            <button className="p-1.5 rounded" style={{ color: "rgba(255,255,255,0.4)" }} onClick={() => saveInsight(msg.content)} data-testid={`pin-msg-${msgIdx}`}>
                              <Pin className="h-3 w-3" />
                            </button>
                            <button className="p-1.5 rounded" style={{ color: "rgba(255,255,255,0.4)" }} onClick={() => { askQuestion("Can you go deeper on that?"); }} data-testid={`followup-msg-${msgIdx}`}>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                            <button className="p-1.5 rounded" style={{ color: "rgba(255,255,255,0.4)" }} onClick={() => {
                              const prevUser = messages?.[msgIdx - 1];
                              shareResponse(prevUser?.content || "", msg.content);
                            }} data-testid={`share-msg-${msgIdx}`}>
                              <Share2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isStreaming && !streamingContent && (
                    <div className="flex justify-start">
                      <div className="p-4 rounded-xl" style={{ background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="flex gap-1.5">
                          {[0, 1, 2].map(i => (
                            <div
                              key={i}
                              className="w-2 h-2 rounded-full"
                              style={{
                                background: "#d4a017",
                                animation: `consultantTypingDot 1.2s ease-in-out ${i * 0.15}s infinite`,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {streamingContent && (
                    <div className="flex justify-start">
                      <div
                        className="max-w-[80%] p-4"
                        style={{
                          background: "#1a1d2e",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: "12px 12px 12px 2px",
                          borderLeft: "3px solid #b8860b",
                          animation: "goldStreamBorder 2s ease infinite",
                        }}
                      >
                        <p className="text-[11px] mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Financial Insights</p>
                        <div className="prose prose-sm prose-invert max-w-none text-sm" style={{ color: "#e2e8f0" }}>
                          <ReactMarkdown>{streamingContent}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Question chips */}
                  {(!isStreaming && !streamingContent) && (
                    <div className="flex flex-wrap gap-2 pt-2 justify-center">
                      {suggestions.slice(0, 4).map((q, i) => (
                        <button
                          key={i}
                          className="text-[13px] px-3.5 py-2 rounded-full transition-colors"
                          style={{
                            background: "#1a1d2e",
                            border: "1px solid rgba(184,134,11,0.5)",
                            color: "white",
                          }}
                          onClick={() => handleSuggestionClick(q)}
                          disabled={isStreaming}
                          data-testid={`suggested-question-${i}`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {/* Input Row */}
              <div className="p-4 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2">
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask about your financial data..."
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && askQuestion()}
                    disabled={isStreaming}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm text-white placeholder:text-gray-500 outline-none"
                    style={{
                      background: "#0f1117",
                      border: "1.5px solid rgba(255,255,255,0.1)",
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = "#b8860b"}
                    onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
                    data-testid="input-financial-question"
                  />
                  <Button
                    className="h-10 w-10 p-0 flex-shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #b8860b, #d4a017)",
                      opacity: isStreaming || !question.trim() ? 0.5 : 1,
                    }}
                    onClick={() => askQuestion()}
                    disabled={isStreaming || !question.trim()}
                    data-testid="btn-send-question"
                  >
                    {isStreaming ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4 text-white" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* View Document Text Modal */}
      {viewingDocText && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-2xl max-h-[80vh] rounded-xl overflow-hidden mx-4" style={{ background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 className="text-sm font-bold text-white">Extracted Document Text</h3>
              <button onClick={() => setViewingDocText(null)} className="p-1">
                <X className="h-4 w-4" style={{ color: "rgba(255,255,255,0.5)" }} />
              </button>
            </div>
            <ScrollArea className="p-4" style={{ maxHeight: "calc(80vh - 60px)" }}>
              <pre className="text-xs whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.7)" }}>{viewingDocText}</pre>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
