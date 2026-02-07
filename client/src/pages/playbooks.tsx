import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
  CheckSquare,
  ListChecks,
  FileText,
  Mic,
  MicOff,
  Camera,
  Trash2,
  Copy,
  Edit,
  MoreVertical,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Smartphone,
  Printer,
  GraduationCap,
  ClipboardCheck,
  ChevronRight,
  Image,
  LogOut,
  UserCog,
  Search,
  Filter,
  Star,
  StarOff
} from "lucide-react";
import type { Playbook, PlaybookStep, InsertPlaybook, InsertPlaybookStep } from "@shared/schema";

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
  { value: "checklist", label: "Quick Checklist", icon: ListChecks, desc: "Simple bullet points (60-180 sec)" },
  { value: "step_by_step", label: "Step-by-Step", icon: FileText, desc: "Numbered steps with details (3-8 min)" },
  { value: "deep_procedure", label: "Deep Procedure", icon: BookOpen, desc: "Full narrative with context" },
];

function getStatusColor(status: string) {
  switch (status) {
    case "active": return "bg-green-500/10 text-green-600 dark:text-green-400";
    case "draft": return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
    case "archived": return "bg-muted text-muted-foreground";
    default: return "bg-muted text-muted-foreground";
  }
}

function getScoreColor(score: number | null | undefined) {
  if (!score) return "text-muted-foreground";
  if (score >= 90) return "text-green-600 dark:text-green-400";
  if (score >= 70) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

export default function PlaybooksPage() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("list");
  
  const [newPlaybook, setNewPlaybook] = useState<Partial<InsertPlaybook>>({
    title: "",
    description: "",
    category: "opening",
    role: "all",
    mode: "checklist",
    status: "draft",
  });
  
  const [steps, setSteps] = useState<Partial<InsertPlaybookStep>[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);

  const { data: playbooks, isLoading } = useQuery<Playbook[]>({
    queryKey: ["/api/playbooks"],
  });

  const { data: playbookSteps } = useQuery<PlaybookStep[]>({
    queryKey: ["/api/playbooks", selectedPlaybook?.id, "steps"],
    enabled: !!selectedPlaybook,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<InsertPlaybook>) => {
      const res = await apiRequest("POST", "/api/playbooks", data);
      return res.json();
    },
    onSuccess: (playbook) => {
      queryClient.invalidateQueries({ queryKey: ["/api/playbooks"] });
      setSelectedPlaybook(playbook);
      setIsCreating(false);
      toast({ title: "Playbook created!" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertPlaybook> }) => {
      const res = await apiRequest("PUT", `/api/playbooks/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playbooks"] });
      setIsEditing(false);
      toast({ title: "Playbook updated!" });
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
      toast({ title: "Playbook duplicated!" });
    },
  });

  const saveStepsMutation = useMutation({
    mutationFn: async ({ playbookId, steps }: { playbookId: number; steps: Partial<InsertPlaybookStep>[] }) => {
      const res = await apiRequest("PUT", `/api/playbooks/${playbookId}/steps/bulk`, { 
        steps: steps.map((s, i) => ({ ...s, playbookId, stepNumber: i + 1 }))
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playbooks"] });
      toast({ title: "Steps saved!" });
    },
  });

  const filteredPlaybooks = playbooks?.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }) || [];

  const startVoiceInput = (stepIndex: number) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({ title: "Voice input not supported in this browser", variant: "destructive" });
      return;
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    setIsRecording(true);
    setCurrentStepIndex(stepIndex);
    
    recognitionRef.current.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setSteps(prev => prev.map((s, i) => i === stepIndex ? { ...s, content: transcript } : s));
    };
    
    recognitionRef.current.onerror = () => {
      setIsRecording(false);
      setCurrentStepIndex(null);
    };
    
    recognitionRef.current.onend = () => {
      setIsRecording(false);
      setCurrentStepIndex(null);
    };
    
    recognitionRef.current.start();
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setCurrentStepIndex(null);
  };

  const addStep = () => {
    setSteps(prev => [...prev, { content: "", stepNumber: prev.length + 1 }]);
  };

  const removeStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreatePlaybook = () => {
    if (!newPlaybook.title) {
      toast({ title: "Please enter a title", variant: "destructive" });
      return;
    }
    createMutation.mutate(newPlaybook as InsertPlaybook);
  };

  const handleSaveSteps = () => {
    if (!selectedPlaybook) return;
    saveStepsMutation.mutate({ playbookId: selectedPlaybook.id, steps });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="font-bold">Living Playbooks</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1 rounded-lg hover-elevate cursor-pointer" data-testid="button-user-menu">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profileImageUrl || undefined} />
                  <AvatarFallback>{user?.firstName?.[0] || user?.email?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <span className="text-sm hidden md:inline">{user?.firstName || user?.email || "User"}</span>
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
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Living Playbooks & Repeatable Execution</h1>
          <p className="text-muted-foreground">
            We don't write SOPs. We build playbooks that people actually follow — and improve every month.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">Your Playbooks</CardTitle>
                  <Dialog open={isCreating} onOpenChange={setIsCreating}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-create-playbook">
                        <Plus className="h-4 w-4 mr-1" />
                        New
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Create New Playbook</DialogTitle>
                        <DialogDescription>
                          Choose how you want to capture this process.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input
                            placeholder="e.g., Opening Sidework Checklist"
                            value={newPlaybook.title}
                            onChange={(e) => setNewPlaybook(prev => ({ ...prev, title: e.target.value }))}
                            data-testid="input-playbook-title"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description (optional)</Label>
                          <Textarea
                            placeholder="Brief description of this playbook..."
                            value={newPlaybook.description || ""}
                            onChange={(e) => setNewPlaybook(prev => ({ ...prev, description: e.target.value }))}
                            data-testid="input-playbook-description"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={newPlaybook.category} onValueChange={(v) => setNewPlaybook(prev => ({ ...prev, category: v }))}>
                              <SelectTrigger data-testid="select-playbook-category">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map(c => (
                                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Assign to Role</Label>
                            <Select value={newPlaybook.role || "all"} onValueChange={(v) => setNewPlaybook(prev => ({ ...prev, role: v }))}>
                              <SelectTrigger data-testid="select-playbook-role">
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
                        <div className="space-y-3">
                          <Label>Creation Mode</Label>
                          <div className="grid gap-2">
                            {modes.map(m => (
                              <div
                                key={m.value}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${newPlaybook.mode === m.value ? 'border-primary bg-primary/5' : 'border-border hover-elevate'}`}
                                onClick={() => setNewPlaybook(prev => ({ ...prev, mode: m.value }))}
                                data-testid={`mode-${m.value}`}
                              >
                                <m.icon className={`h-5 w-5 ${newPlaybook.mode === m.value ? 'text-primary' : 'text-muted-foreground'}`} />
                                <div>
                                  <p className="font-medium text-sm">{m.label}</p>
                                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
                        <Button onClick={handleCreatePlaybook} disabled={createMutation.isPending} data-testid="button-save-playbook">
                          Create Playbook
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search playbooks..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="input-search-playbooks"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[120px]" data-testid="select-category-filter">
                      <Filter className="h-4 w-4 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {categories.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[50vh]">
                  {isLoading ? (
                    <div className="p-4 text-center text-muted-foreground">Loading...</div>
                  ) : filteredPlaybooks.length === 0 ? (
                    <div className="p-6 text-center">
                      <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">No playbooks yet</p>
                      <p className="text-sm text-muted-foreground mt-1">Create your first playbook to get started</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredPlaybooks.map((playbook) => (
                        <div
                          key={playbook.id}
                          className={`p-4 cursor-pointer transition-colors hover-elevate ${selectedPlaybook?.id === playbook.id ? 'bg-muted' : ''}`}
                          onClick={() => {
                            setSelectedPlaybook(playbook);
                            setActiveTab("view");
                          }}
                          data-testid={`playbook-item-${playbook.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium truncate">{playbook.title}</h3>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={getStatusColor(playbook.status)}>
                                  {playbook.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground capitalize">{playbook.category}</span>
                              </div>
                              {playbook.auditPassRate !== null && playbook.auditPassRate !== undefined && (
                                <div className="flex items-center gap-2 mt-2">
                                  <Progress value={playbook.auditPassRate} className="h-1.5 flex-1" />
                                  <span className={`text-xs font-medium ${getScoreColor(playbook.auditPassRate)}`}>
                                    {playbook.auditPassRate}%
                                  </span>
                                </div>
                              )}
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {selectedPlaybook ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {selectedPlaybook.title}
                        <Badge variant="outline" className={getStatusColor(selectedPlaybook.status)}>
                          {selectedPlaybook.status}
                        </Badge>
                      </CardTitle>
                      {selectedPlaybook.description && (
                        <CardDescription className="mt-1">{selectedPlaybook.description}</CardDescription>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid="button-playbook-menu">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setIsEditing(true)} data-testid="button-edit-playbook">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateMutation.mutate(selectedPlaybook.id)} data-testid="button-duplicate-playbook">
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(selectedPlaybook.id)} data-testid="button-delete-playbook">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {roles.find(r => r.value === selectedPlaybook.role)?.label || "All Roles"}
                    </span>
                    {selectedPlaybook.totalAcknowledgments !== null && selectedPlaybook.totalAcknowledgments !== undefined && selectedPlaybook.totalAcknowledgments > 0 && (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        {selectedPlaybook.totalAcknowledgments} acknowledgments
                      </span>
                    )}
                    {selectedPlaybook.totalAudits !== null && selectedPlaybook.totalAudits !== undefined && selectedPlaybook.totalAudits > 0 && (
                      <span className="flex items-center gap-1">
                        <ClipboardCheck className="h-4 w-4" />
                        {selectedPlaybook.totalAudits} audits
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-4">
                      <TabsTrigger value="view" className="flex items-center gap-1" data-testid="tab-view">
                        <BookOpen className="h-4 w-4" />
                        View
                      </TabsTrigger>
                      <TabsTrigger value="edit" className="flex items-center gap-1" data-testid="tab-edit">
                        <Edit className="h-4 w-4" />
                        Edit Steps
                      </TabsTrigger>
                      <TabsTrigger value="mobile" className="flex items-center gap-1" data-testid="tab-mobile">
                        <Smartphone className="h-4 w-4" />
                        Mobile View
                      </TabsTrigger>
                      <TabsTrigger value="audit" className="flex items-center gap-1" data-testid="tab-audit">
                        <ClipboardCheck className="h-4 w-4" />
                        Audit
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="view">
                      {playbookSteps && playbookSteps.length > 0 ? (
                        <div className="space-y-3">
                          {playbookSteps.map((step, idx) => (
                            <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg border">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium text-sm flex-shrink-0">
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{step.content}</p>
                                {step.visualCue && (
                                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                                    <Image className="h-3 w-3" />
                                    {step.visualCue}
                                  </p>
                                )}
                                {step.commonFailure && (
                                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Common failure: {step.commonFailure}
                                  </p>
                                )}
                              </div>
                              {step.isCheckpoint && (
                                <Badge variant="outline" className="bg-orange-500/10 text-orange-600">
                                  Checkpoint
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <ListChecks className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No steps added yet</p>
                          <p className="text-sm mt-1">Switch to Edit Steps tab to add checklist items</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="edit">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">
                            Add steps using voice, text, or photos
                          </p>
                          <Button size="sm" onClick={addStep} data-testid="button-add-step">
                            <Plus className="h-4 w-4 mr-1" />
                            Add Step
                          </Button>
                        </div>
                        {steps.length === 0 && playbookSteps && playbookSteps.length > 0 && (
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => setSteps(playbookSteps.map(s => ({ ...s })))}
                            data-testid="button-load-existing-steps"
                          >
                            Load existing {playbookSteps.length} steps
                          </Button>
                        )}
                        {steps.length === 0 && (!playbookSteps || playbookSteps.length === 0) && (
                          <div className="text-center py-8 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground mb-3">Start by adding your first step</p>
                            <Button onClick={addStep} data-testid="button-add-first-step">
                              <Plus className="h-4 w-4 mr-1" />
                              Add First Step
                            </Button>
                          </div>
                        )}
                        <div className="space-y-3">
                          {steps.map((step, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground font-medium text-sm flex-shrink-0">
                                {idx + 1}
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Textarea
                                    placeholder="Describe this step..."
                                    value={step.content || ""}
                                    onChange={(e) => setSteps(prev => prev.map((s, i) => i === idx ? { ...s, content: e.target.value } : s))}
                                    className="flex-1 min-h-[60px]"
                                    data-testid={`input-step-${idx}`}
                                  />
                                  <div className="flex flex-col gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => isRecording && currentStepIndex === idx ? stopVoiceInput() : startVoiceInput(idx)}
                                      className={isRecording && currentStepIndex === idx ? "text-red-500" : ""}
                                      data-testid={`button-voice-step-${idx}`}
                                    >
                                      {isRecording && currentStepIndex === idx ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => removeStep(idx)} data-testid={`button-remove-step-${idx}`}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <label className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                      checked={step.isCheckpoint || false}
                                      onCheckedChange={(checked) => setSteps(prev => prev.map((s, i) => i === idx ? { ...s, isCheckpoint: !!checked } : s))}
                                    />
                                    Critical checkpoint
                                  </label>
                                  <label className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                      checked={step.requiredPhoto || false}
                                      onCheckedChange={(checked) => setSteps(prev => prev.map((s, i) => i === idx ? { ...s, requiredPhoto: !!checked } : s))}
                                    />
                                    Photo required
                                  </label>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {steps.length > 0 && (
                          <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setSteps([])}>
                              Clear All
                            </Button>
                            <Button onClick={handleSaveSteps} disabled={saveStepsMutation.isPending} data-testid="button-save-steps">
                              Save Steps
                            </Button>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="mobile">
                      <div className="max-w-sm mx-auto">
                        <div className="border rounded-xl p-4 bg-muted/30">
                          <div className="text-center mb-4">
                            <h3 className="font-bold">{selectedPlaybook.title}</h3>
                            <p className="text-sm text-muted-foreground">{playbookSteps?.length || 0} steps</p>
                          </div>
                          {playbookSteps && playbookSteps.length > 0 ? (
                            <div className="space-y-3">
                              {playbookSteps.map((step, idx) => (
                                <div key={step.id} className="flex items-center gap-3 p-4 bg-background rounded-lg">
                                  <Checkbox id={`mobile-step-${step.id}`} data-testid={`mobile-check-${idx}`} />
                                  <label htmlFor={`mobile-step-${step.id}`} className="flex-1 text-sm">
                                    {step.content}
                                  </label>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-center text-muted-foreground py-8">No steps to display</p>
                          )}
                          <Button className="w-full mt-4" data-testid="button-acknowledge">
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            I have completed this checklist
                          </Button>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="audit">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">Spot Check Audit</h3>
                            <p className="text-sm text-muted-foreground">Walk through each step and mark pass/fail</p>
                          </div>
                          <Button variant="outline" data-testid="button-start-audit">
                            <ClipboardCheck className="h-4 w-4 mr-2" />
                            Start New Audit
                          </Button>
                        </div>
                        {playbookSteps && playbookSteps.length > 0 ? (
                          <div className="space-y-3">
                            {playbookSteps.map((step, idx) => (
                              <div key={step.id} className="flex items-center gap-3 p-3 rounded-lg border">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground font-medium text-sm flex-shrink-0">
                                  {idx + 1}
                                </div>
                                <p className="flex-1 text-sm">{step.content}</p>
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700 hover:bg-green-100" data-testid={`audit-pass-${idx}`}>
                                    <CheckCircle2 className="h-5 w-5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-100" data-testid={`audit-fail-${idx}`}>
                                    <XCircle className="h-5 w-5" />
                                  </Button>
                                  {step.requiredPhoto && (
                                    <Button variant="ghost" size="icon" data-testid={`audit-photo-${idx}`}>
                                      <Camera className="h-5 w-5" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-muted-foreground py-8">Add steps to enable audits</p>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
                <CardFooter className="border-t pt-4 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" data-testid="button-print">
                      <Printer className="h-4 w-4 mr-1" />
                      Print
                    </Button>
                    <Button variant="outline" size="sm" data-testid="button-training-mode">
                      <GraduationCap className="h-4 w-4 mr-1" />
                      Training Mode
                    </Button>
                  </div>
                  {selectedPlaybook.status === "draft" && (
                    <Button 
                      onClick={() => updateMutation.mutate({ id: selectedPlaybook.id, data: { status: "active" } })}
                      data-testid="button-activate"
                    >
                      Activate Playbook
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ) : (
              <Card className="flex items-center justify-center min-h-[400px]">
                <div className="text-center p-6">
                  <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a Playbook</h3>
                  <p className="text-muted-foreground mb-4">
                    Choose a playbook from the list or create a new one
                  </p>
                  <Button onClick={() => setIsCreating(true)} data-testid="button-create-first">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Playbook
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}