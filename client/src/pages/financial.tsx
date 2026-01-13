import { useState, useRef, useEffect } from "react";
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
  ChefHat, BarChart3, FileSpreadsheet, CheckCircle
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

export default function FinancialPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [docType, setDocType] = useState("other");
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("docType", docType);
    uploadMutation.mutate(formData);
  };

  const askQuestion = async () => {
    if (!question.trim() || isStreaming) return;

    setIsStreaming(true);
    setStreamingContent("");

    try {
      const response = await fetch("/api/financial/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, documentId: selectedDocId || undefined }),
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
              if (data.content) {
                content += data.content;
                setStreamingContent(content);
              }
              if (data.done) {
                queryClient.invalidateQueries({ queryKey: ["/api/financial/messages"] });
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to get response", variant: "destructive" });
    } finally {
      setIsStreaming(false);
      setQuestion("");
    }
  };

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
        <p className="text-muted-foreground text-center">
          Sign in to upload your financial reports and get AI-powered analysis
        </p>
        <Button asChild>
          <Link href="/">Go to Home</Link>
        </Button>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
      case "ready":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getDocTypeIcon = (type: string) => {
    switch (type) {
      case "pl_statement":
        return <BarChart3 className="h-4 w-4" />;
      case "sales_report":
        return <TrendingUp className="h-4 w-4" />;
      case "labor_report":
        return <Users className="h-4 w-4" />;
      case "inventory":
        return <ChefHat className="h-4 w-4" />;
      default:
        return <FileSpreadsheet className="h-4 w-4" />;
    }
  };

  const formatDocType = (type: string) => {
    const types: Record<string, string> = {
      pl_statement: "P&L Statement",
      sales_report: "Sales Report",
      labor_report: "Labor Report",
      inventory: "Inventory",
      other: "Other",
    };
    return types[type] || type;
  };

  const metrics = selectedDoc?.extract?.structuredMetrics;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard" data-testid="link-back-dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Financial Report
                </CardTitle>
                <CardDescription>
                  Upload your sales reports, P&L statements, labor reports, or inventory data for analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="docType" className="mb-2 block">Document Type</Label>
                    <Select value={docType} onValueChange={setDocType}>
                      <SelectTrigger data-testid="select-doc-type">
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
                  <div className="flex-1">
                    <Label htmlFor="file" className="mb-2 block">File (PDF, CSV, Excel)</Label>
                    <Input
                      id="file"
                      type="file"
                      ref={fileInputRef}
                      accept=".pdf,.csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      disabled={uploadMutation.isPending}
                      data-testid="input-file-upload"
                    />
                  </div>
                </div>
                {uploadMutation.isPending && (
                  <div className="flex items-center gap-2 mt-4 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Uploading...</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Your Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {docsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : documents?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No documents uploaded yet. Upload your first financial report above.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documents?.map((doc) => (
                      <div
                        key={doc.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover-elevate ${
                          selectedDocId === doc.id ? "border-primary bg-accent/50" : ""
                        }`}
                        onClick={() => setSelectedDocId(doc.id)}
                        data-testid={`doc-item-${doc.id}`}
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(doc.status)}
                          {getDocTypeIcon(doc.docType)}
                          <div>
                            <p className="font-medium">{doc.originalName}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDocType(doc.docType)} • {(doc.fileSize / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={doc.status === "ready" ? "default" : doc.status === "processing" ? "secondary" : "destructive"}>
                            {doc.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMutation.mutate(doc.id);
                            }}
                            data-testid={`btn-delete-doc-${doc.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {metrics.revenue?.total && (
                            <div className="p-4 rounded-lg bg-accent/50">
                              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <DollarSign className="h-4 w-4" />
                                <span className="text-sm">Revenue</span>
                              </div>
                              <p className="text-2xl font-bold">${metrics.revenue.total.toLocaleString()}</p>
                            </div>
                          )}
                          {metrics.costs?.foodCostPercent && (
                            <div className="p-4 rounded-lg bg-accent/50">
                              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <ChefHat className="h-4 w-4" />
                                <span className="text-sm">Food Cost</span>
                              </div>
                              <p className="text-2xl font-bold">{metrics.costs.foodCostPercent.toFixed(1)}%</p>
                            </div>
                          )}
                          {metrics.labor?.laborPercent && (
                            <div className="p-4 rounded-lg bg-accent/50">
                              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Users className="h-4 w-4" />
                                <span className="text-sm">Labor Cost</span>
                              </div>
                              <p className="text-2xl font-bold">{metrics.labor.laborPercent.toFixed(1)}%</p>
                            </div>
                          )}
                          {metrics.primeCost?.percent && (
                            <div className="p-4 rounded-lg bg-accent/50">
                              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Percent className="h-4 w-4" />
                                <span className="text-sm">Prime Cost</span>
                              </div>
                              <p className="text-2xl font-bold">{metrics.primeCost.percent.toFixed(1)}%</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <Card className="flex flex-col h-[calc(100vh-220px)]">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Ask About Your Financials
                </CardTitle>
                <CardDescription>
                  {selectedDocId 
                    ? `Analyzing: ${documents?.find(d => d.id === selectedDocId)?.originalName}`
                    : "Ask general questions about your uploaded documents"
                  }
                </CardDescription>
                {documents && documents.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <Label className="text-sm">Focus on:</Label>
                    <Select 
                      value={selectedDocId?.toString() || "all"} 
                      onValueChange={(v) => setSelectedDocId(v === "all" ? null : Number(v))}
                    >
                      <SelectTrigger className="w-[250px]" data-testid="select-analysis-doc">
                        <SelectValue placeholder="All documents" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Documents</SelectItem>
                        {documents.filter(d => d.status === "ready").map((doc) => (
                          <SelectItem key={doc.id} value={doc.id.toString()}>
                            {doc.originalName}
                          </SelectItem>
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
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Ask questions about your financial data</p>
                        <p className="text-sm mt-2">
                          Try: "What's my food cost percentage?" or "How can I improve my margins?"
                        </p>
                      </div>
                    )}
                    
                    {messages?.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-accent"
                          }`}
                        >
                          {msg.role === "user" ? (
                            <p>{msg.content}</p>
                          ) : (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {streamingContent && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] p-3 rounded-lg bg-accent">
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{streamingContent}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>

                <div className="flex gap-2 pt-4 border-t mt-auto">
                  <Input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask about your financial data..."
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && askQuestion()}
                    disabled={isStreaming}
                    data-testid="input-financial-question"
                  />
                  <Button 
                    onClick={askQuestion} 
                    disabled={isStreaming || !question.trim()}
                    data-testid="btn-send-question"
                  >
                    {isStreaming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
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
