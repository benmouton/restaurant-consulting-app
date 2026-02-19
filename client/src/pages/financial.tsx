import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Upload, FileText, Trash2, TrendingUp, DollarSign, Users, 
  Percent, Send, MessageSquare, ArrowLeft, Loader2, AlertCircle,
  ChefHat, BarChart3, FileSpreadsheet, CheckCircle, Sparkles
} from "lucide-react";
import type { FinancialDocument, FinancialMessage } from "@shared/schema";
import ReactMarkdown from "react-markdown";

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

function healthColor(status: HealthStatus) {
  if (status === "healthy") return "text-green-600 dark:text-green-400";
  if (status === "watch") return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function healthBg(status: HealthStatus) {
  if (status === "healthy") return "bg-green-50 dark:bg-green-950/30";
  if (status === "watch") return "bg-yellow-50 dark:bg-yellow-950/30";
  return "bg-red-50 dark:bg-red-950/30";
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
  if (metrics?.operatingExpenses?.total && metrics?.revenue?.total) {
    const opPct = (metrics.operatingExpenses.total / metrics.revenue.total) * 100;
    if (opPct > 20) {
      concerns.push(`Operating expenses at ${opPct.toFixed(1)}% of revenue — look for savings in rent, utilities, or marketing.`);
    }
  }
  return concerns;
}

const questionSets: Record<string, string[]> = {
  pl_statement: [
    "What's my prime cost percentage and is it within target?",
    "Which expense category has the biggest opportunity for savings?",
    "What would my profit look like if I reduced food cost by 2%?",
    "Is my labor cost sustainable at this revenue level?",
    "How do my delivery fees compare to what I'm making from delivery sales?",
    "What should my break-even monthly revenue be?",
    "If I raised menu prices 5%, how would that impact my margins?",
  ],
  sales_report: [
    "What's my average daily revenue?",
    "Which day of the week generates the most sales?",
    "What's my revenue per seat?",
    "Am I trending up or down?",
  ],
  labor_report: [
    "Am I scheduling too many hours for the revenue I'm generating?",
    "What's my labor cost per cover?",
    "Where can I reduce overtime?",
  ],
  general: [
    "What should I focus on to improve profitability?",
    "What are industry benchmarks for restaurant costs?",
    "How can I reduce my prime cost?",
  ],
};

const FULL_ANALYSIS_PROMPT = "Provide a comprehensive financial analysis covering: 1) Revenue health and trends, 2) Cost structure breakdown, 3) Prime cost analysis, 4) Profit margin assessment, 5) Three biggest concerns, and 6) Three specific recommended actions with expected impact. Use the restaurant industry benchmarks to evaluate each metric.";

export default function FinancialPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [docType, setDocType] = useState("other");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: () => {
      toast({ title: "Upload failed", description: "Please try again", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/financial/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/documents"] });
      if (selectedDocId) setSelectedDocId(null);
      toast({ title: "Document deleted" });
    },
  });

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const detected = detectDocTypeFromFilename(file.name);
    setDocType(detected);
  };

  const handleUploadClick = () => {
    if (!selectedFile) return;
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

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
        <h1 className="text-2xl font-bold">Financial Insights</h1>
        <p className="text-muted-foreground text-center">Sign in to upload your financial reports and get expert analysis</p>
        <Button asChild><Link href="/">Go to Home</Link></Button>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    if (status === "processing") return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
    if (status === "ready") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === "failed") return <AlertCircle className="h-4 w-4 text-red-500" />;
    return null;
  };

  const getDocTypeIcon = (type: string) => {
    if (type === "pl_statement") return <BarChart3 className="h-4 w-4" />;
    if (type === "sales_report") return <TrendingUp className="h-4 w-4" />;
    if (type === "labor_report") return <Users className="h-4 w-4" />;
    if (type === "inventory") return <ChefHat className="h-4 w-4" />;
    return <FileSpreadsheet className="h-4 w-4" />;
  };

  const formatDocType = (type: string) => {
    const types: Record<string, string> = { pl_statement: "P&L Statement", sales_report: "Sales Report", labor_report: "Labor Report", inventory: "Inventory", other: "Other" };
    return types[type] || type;
  };

  const metrics = selectedDoc?.extract?.structuredMetrics;
  const concerns = metrics ? generateConcerns(metrics) : [];

  const selectedDocType = selectedDocId ? documents?.find(d => d.id === selectedDocId)?.docType : null;
  const suggestions = questionSets[selectedDocType || ""] || questionSets.general;
  const followUps = suggestions.slice(0, 3);

  const handleSuggestionClick = (q: string) => {
    if (isStreaming) return;
    setQuestion(q);
    askQuestion(q);
  };

  const handleFullAnalysis = () => {
    if (isStreaming) return;
    setQuestion(FULL_ANALYSIS_PROMPT);
    askQuestion(FULL_ANALYSIS_PROMPT);
  };

  const selectedDocReady = selectedDocId && documents?.find(d => d.id === selectedDocId)?.status === "ready";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard" data-testid="link-back-dashboard"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Financial Insights</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        <Tabs defaultValue="documents" className="space-y-4">
          <TabsList>
            <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
            <TabsTrigger value="analysis" data-testid="tab-analysis">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="space-y-4">
            {/* Upload Card with Drag & Drop */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Upload Financial Report</CardTitle>
                <CardDescription>Upload your sales reports, P&L statements, labor reports, or inventory data for analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  data-testid="dropzone-upload"
                  className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                    data-testid="input-file-upload"
                  />
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-medium">Drag & drop your financial report here, or click to browse</p>
                  <p className="text-sm text-muted-foreground mt-1">Supports PDF, CSV, and Excel files</p>
                  <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><FileText className="h-3 w-3" />PDF</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><FileSpreadsheet className="h-3 w-3" />CSV</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><FileSpreadsheet className="h-3 w-3" />Excel</span>
                  </div>
                </div>

                {selectedFile && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    {uploadMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 items-end flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="docType" className="mb-2 block">Document Type</Label>
                    <Select value={docType} onValueChange={setDocType}>
                      <SelectTrigger data-testid="select-doc-type"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pl_statement">P&L Statement</SelectItem>
                        <SelectItem value="sales_report">Sales Report</SelectItem>
                        <SelectItem value="labor_report">Labor Report</SelectItem>
                        <SelectItem value="inventory">Inventory</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleUploadClick} disabled={!selectedFile || uploadMutation.isPending} data-testid="btn-upload">
                    {uploadMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Uploading...</> : <><Upload className="h-4 w-4 mr-2" />Upload</>}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Documents List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Your Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {docsLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : documents?.length === 0 ? (
                  <div data-testid="empty-state-docs" className="py-8 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { icon: BarChart3, title: "P&L Statement", desc: "Cost analysis, margin health, savings opportunities" },
                        { icon: TrendingUp, title: "Sales Report", desc: "Revenue trends, per-seat metrics, day-of-week patterns" },
                        { icon: Users, title: "Labor Report", desc: "Labor % analysis, overtime flags, scheduling efficiency" },
                        { icon: ChefHat, title: "Inventory Report", desc: "Waste identification, par optimization, cost trends" },
                      ].map((item) => (
                        <div key={item.title} className="flex items-start gap-3 p-3 rounded-lg bg-accent/30">
                          <item.icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium text-sm">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground text-center">Most POS systems (Toast, Square, Clover) can export these as CSV or Excel</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents?.map((doc) => (
                      <div
                        key={doc.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover-elevate ${selectedDocId === doc.id ? "border-primary bg-accent/50" : ""}`}
                        onClick={() => setSelectedDocId(doc.id)}
                        data-testid={`doc-item-${doc.id}`}
                      >
                        <div className="flex items-center gap-3 flex-wrap">
                          {getStatusIcon(doc.status)}
                          {getDocTypeIcon(doc.docType)}
                          <div>
                            <p className="font-medium">{doc.originalName}</p>
                            <p className="text-sm text-muted-foreground">{formatDocType(doc.docType)} {"\u2022"} {(doc.fileSize / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={doc.status === "ready" ? "default" : doc.status === "processing" ? "secondary" : "destructive"}>{doc.status}</Badge>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(doc.id); }} data-testid={`btn-delete-doc-${doc.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Document Summary with Metric Cards & Concerns */}
            {selectedDoc && selectedDoc.extract && (
              <Card>
                <CardHeader>
                  <CardTitle>Document Summary</CardTitle>
                  <CardDescription>{selectedDoc.document.originalName}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedDoc.extract.errorMessage ? (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-5 w-5" />
                      <p>{selectedDoc.extract.errorMessage}</p>
                    </div>
                  ) : (
                    <>
                      {selectedDoc.extract.summary && (
                        <p className="text-muted-foreground">{selectedDoc.extract.summary}</p>
                      )}
                      {metrics && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                          {metrics.revenue?.total != null && (
                            <div className="p-4 rounded-lg bg-accent/50" data-testid="metric-card-revenue">
                              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <DollarSign className="h-4 w-4" /><span className="text-sm">Revenue</span>
                              </div>
                              <p className="text-2xl font-bold">${metrics.revenue.total.toLocaleString()}</p>
                            </div>
                          )}
                          {metrics.costs?.foodCostPercent != null && (() => {
                            const s = getHealthStatus("food", metrics.costs.foodCostPercent);
                            return (
                              <div className={`p-4 rounded-lg ${healthBg(s)}`} data-testid="metric-card-food">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                  <ChefHat className="h-4 w-4" /><span className="text-sm">Food Cost</span>
                                </div>
                                <p className="text-2xl font-bold">{metrics.costs.foodCostPercent.toFixed(1)}%</p>
                                <Badge variant="outline" className={`mt-1 ${healthColor(s)} no-default-hover-elevate no-default-active-elevate`}>{healthBadgeText(s)}</Badge>
                              </div>
                            );
                          })()}
                          {metrics.labor?.laborPercent != null && (() => {
                            const s = getHealthStatus("labor", metrics.labor.laborPercent);
                            return (
                              <div className={`p-4 rounded-lg ${healthBg(s)}`} data-testid="metric-card-labor">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                  <Users className="h-4 w-4" /><span className="text-sm">Labor Cost</span>
                                </div>
                                <p className="text-2xl font-bold">{metrics.labor.laborPercent.toFixed(1)}%</p>
                                <Badge variant="outline" className={`mt-1 ${healthColor(s)} no-default-hover-elevate no-default-active-elevate`}>{healthBadgeText(s)}</Badge>
                              </div>
                            );
                          })()}
                          {metrics.primeCost?.percent != null && (() => {
                            const s = getHealthStatus("prime", metrics.primeCost.percent);
                            return (
                              <div className={`p-4 rounded-lg ${healthBg(s)}`} data-testid="metric-card-prime">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                  <Percent className="h-4 w-4" /><span className="text-sm">Prime Cost</span>
                                </div>
                                <p className="text-2xl font-bold">{metrics.primeCost.percent.toFixed(1)}%</p>
                                <Badge variant="outline" className={`mt-1 ${healthColor(s)} no-default-hover-elevate no-default-active-elevate`}>{healthBadgeText(s)}</Badge>
                              </div>
                            );
                          })()}
                          {metrics.profitability?.netMargin != null && (() => {
                            const s = getHealthStatus("net", metrics.profitability.netMargin);
                            return (
                              <div className={`p-4 rounded-lg ${healthBg(s)}`} data-testid="metric-card-net">
                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                  <TrendingUp className="h-4 w-4" /><span className="text-sm">Net Profit</span>
                                </div>
                                <p className="text-2xl font-bold">{metrics.profitability.netMargin.toFixed(1)}%</p>
                                <Badge variant="outline" className={`mt-1 ${healthColor(s)} no-default-hover-elevate no-default-active-elevate`}>{healthBadgeText(s)}</Badge>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {concerns.length > 0 && (
                        <Card data-testid="key-concerns-section">
                          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />Key Concerns
                            </CardTitle>
                            <Badge variant="secondary">{concerns.length}</Badge>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {concerns.map((c, i) => (
                              <div key={i} className="flex items-start gap-3">
                                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                                <p className="text-sm">{c}</p>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      {extract && (
                        <Link href={`/consultant?prompt=${encodeURIComponent("Based on my financial data, what should I focus on to improve my margins?")}&context=${encodeURIComponent(`Financial data: Food cost ${extract.foodCost || 'unknown'}%, Labor cost ${extract.laborCost || 'unknown'}%, Revenue ${extract.revenue || 'unknown'}, Net profit ${extract.netProfit || 'unknown'}%`)}`}>
                          <Button variant="outline" className="w-full mt-2" data-testid="btn-discuss-financials">
                            <ChefHat className="h-4 w-4 mr-2" />
                            Discuss These Numbers with the Consultant
                          </Button>
                        </Link>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-4">
            <Card className="flex flex-col h-[calc(100vh-220px)]">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />Ask About Your Financials</CardTitle>
                  <Button onClick={handleFullAnalysis} disabled={!selectedDocReady || isStreaming} data-testid="btn-full-analysis">
                    <Sparkles className="h-4 w-4 mr-2" />Run Full Analysis
                  </Button>
                </div>
                <CardDescription>
                  {selectedDocId
                    ? `Analyzing: ${documents?.find(d => d.id === selectedDocId)?.originalName}`
                    : "Ask general questions about your uploaded documents"}
                </CardDescription>
                {documents && documents.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Label className="text-sm">Focus on:</Label>
                    <Select value={selectedDocId?.toString() || "all"} onValueChange={(v) => setSelectedDocId(v === "all" ? null : Number(v))}>
                      <SelectTrigger className="w-[250px]" data-testid="select-analysis-doc"><SelectValue placeholder="All documents" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Documents</SelectItem>
                        {documents.filter(d => d.status === "ready").map((doc) => (
                          <SelectItem key={doc.id} value={doc.id.toString()}>{doc.originalName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="flex-1 overflow-hidden flex flex-col">
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4 pb-4">
                    {(!messages || messages.length === 0) && !streamingContent && (
                      <div className="text-center py-8 space-y-4">
                        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">Ask questions about your financial data</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {suggestions.map((q, i) => (
                            <Button key={i} variant="outline" className="text-sm" onClick={() => handleSuggestionClick(q)} disabled={isStreaming} data-testid={`suggested-question-${i}`}>
                              {q}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {messages?.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent"}`}>
                          {msg.role === "user" ? <p>{msg.content}</p> : (
                            <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {streamingContent && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] p-3 rounded-lg bg-accent">
                          <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{streamingContent}</ReactMarkdown></div>
                        </div>
                      </div>
                    )}

                    {messages && messages.length > 0 && !streamingContent && !isStreaming && (
                      <div className="flex flex-wrap justify-center gap-2 pt-2">
                        {followUps.map((q, i) => (
                          <Button key={i} variant="outline" className="text-sm" onClick={() => handleSuggestionClick(q)} data-testid={`suggested-question-followup-${i}`}>
                            {q}
                          </Button>
                        ))}
                      </div>
                    )}
                    
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>

                <div className="flex gap-2 pt-4 border-t mt-auto flex-wrap">
                  <Input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask about your financial data..."
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && askQuestion()}
                    disabled={isStreaming}
                    data-testid="input-financial-question"
                    className="flex-1 min-w-[200px]"
                  />
                  <Button onClick={() => askQuestion()} disabled={isStreaming || !question.trim()} data-testid="btn-send-question">
                    {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
