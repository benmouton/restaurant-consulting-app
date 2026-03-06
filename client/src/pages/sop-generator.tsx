import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UpgradeGate } from "@/components/upgrade-gate";
import { Button } from "@/components/ui/button";
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
  ArrowLeft, Wine, ChefHat, Users, ClipboardList,
  ChevronDown, ChevronRight, Check, AlertTriangle,
  Printer, Download, Share2, RefreshCw, Loader2,
  LogOut, UserCog, FileText, LayoutGrid, LayoutList,
  BookOpen,
} from "lucide-react";
import type { GeneratedSop } from "@shared/schema";

const SOP_TEMPLATES = [
  { key: "tabc-compliance", title: "TABC Compliance Protocol", category: "bar", description: "Alcohol service standards, ID verification, and cut-off procedure", requiredVariables: ["restaurantName", "ownerNames", "alcoholPermit", "barManager", "closingTime"] },
  { key: "bar-opening", title: "Bar Opening Procedure", category: "bar", description: "Consistent bar setup for every service period", requiredVariables: ["restaurantName", "barManager", "posSystem", "draftBeerCount", "signatureCocktail1", "signatureCocktail2", "signatureCocktail3"] },
  { key: "bar-closing", title: "Bar Closing Procedure", category: "bar", description: "Close-down sequence and cash reconciliation", requiredVariables: ["restaurantName", "closingTime", "posSystem", "safeDropProcedure"] },
  { key: "intoxicated-guest", title: "Intoxicated Guest Protocol", category: "bar", description: "Response protocol for intoxicated guests", requiredVariables: ["restaurantName", "barManager", "generalManager", "ownerNames", "emergencyContacts"] },
  { key: "health-inspection-prep", title: "Health Inspection Preparation", category: "kitchen", description: "Daily and weekly standards for inspection readiness", requiredVariables: ["restaurantName", "generalManager", "ownerNames"] },
  { key: "vendor-receiving", title: "Vendor Receiving Procedure", category: "kitchen", description: "Delivery inspection, temperature checks, and quality verification", requiredVariables: ["restaurantName", "ownerNames", "vendorList"] },
  { key: "temperature-log", title: "Temperature Log Procedure", category: "kitchen", description: "Shift-level temperature logging and out-of-range protocol", requiredVariables: ["restaurantName", "generalManager", "emergencyContacts"] },
  { key: "station-closedown", title: "Station Close-Down Procedure", category: "kitchen", description: "Station-by-station close-down checklist with manager sign-off", requiredVariables: ["restaurantName"] },
  { key: "new-hire-onboarding", title: "New Hire Onboarding Procedure", category: "foh", description: "First-day orientation, paperwork, and training program introduction", requiredVariables: ["restaurantName", "ownerNames", "conceptCuisine", "posSystem", "schedulingApp", "employeeMealPolicy", "parkingPolicy", "dressCode", "orientationDays"] },
  { key: "reservation-handling", title: "Reservation Handling Procedure", category: "foh", description: "Reservation taking, confirmation, and no-show protocol", requiredVariables: ["restaurantName", "reservationSystem", "generalManager", "privateRooms"] },
  { key: "large-party", title: "Large Party Service Procedure", category: "foh", description: "Coordinated service for parties of 8+", requiredVariables: ["restaurantName", "posSystem", "generalManager"] },
  { key: "guest-complaint-escalation", title: "Guest Complaint Escalation Procedure", category: "foh", description: "HEAR framework for complaint resolution and documentation", requiredVariables: ["restaurantName", "ownerNames"] },
  { key: "cash-handling", title: "Cash Handling Procedure", category: "management", description: "Opening bank, drawer management, and end-of-night reconciliation", requiredVariables: ["restaurantName", "posSystem", "ownerNames", "generalManager", "safeDropProcedure"] },
  { key: "safe-drop", title: "Safe Drop Procedure", category: "management", description: "Cash drop documentation and safe access protocol", requiredVariables: ["restaurantName", "ownerNames", "generalManager", "safeDropProcedure"] },
  { key: "end-of-night-manager", title: "End-of-Night Manager Checklist", category: "management", description: "Closing manager checklist covering financial, staff, and building", requiredVariables: ["restaurantName", "posSystem", "schedulingApp"] },
  { key: "employee-discipline", title: "Employee Discipline Procedure", category: "management", description: "Progressive discipline sequence and TWC documentation", requiredVariables: ["restaurantName", "ownerNames", "schedulingApp"] },
];

const CATEGORIES = [
  { key: "bar", label: "Bar", icon: Wine },
  { key: "kitchen", label: "Kitchen", icon: ChefHat },
  { key: "foh", label: "Front of House", icon: Users },
  { key: "management", label: "Management", icon: ClipboardList },
];

const VARIABLE_LABELS: Record<string, string> = {
  restaurantName: "Restaurant name",
  ownerNames: "Owner name",
  alcoholPermit: "Alcohol permit type",
  barManager: "Bar manager name",
  closingTime: "Closing time",
  posSystem: "POS system",
  draftBeerCount: "Draft beer count",
  signatureCocktail1: "Signature cocktail 1",
  signatureCocktail2: "Signature cocktail 2",
  signatureCocktail3: "Signature cocktail 3",
  safeDropProcedure: "Safe drop procedure",
  generalManager: "General manager",
  emergencyContacts: "Emergency contacts",
  vendorList: "Vendor list",
  conceptCuisine: "Cuisine concept",
  schedulingApp: "Scheduling app",
  employeeMealPolicy: "Employee meal policy",
  parkingPolicy: "Parking info",
  dressCode: "Dress code",
  orientationDays: "Orientation period",
  reservationSystem: "Reservation system",
  privateRooms: "Private rooms",
};

function formatDate(d: string | Date | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatSopContentForPrint(content: string): string {
  let html = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/^(═{3,}.*?)$/gm, '<hr class="thick-rule" />');
  html = html.replace(/^(───────.*?)$/gm, '<hr class="thin-rule" />');
  html = html.replace(/^☐\s(.*)$/gm, '<div class="checklist-item">$1</div>');
  html = html.replace(/^□\s(.*)$/gm, '<div class="checklist-item">$1</div>');
  html = html.replace(/^•\s(.*)$/gm, '<div class="bullet-item">$1</div>');
  html = html.replace(/^- (.*)$/gm, '<div class="bullet-item">$1</div>');
  html = html.replace(
    /^([A-Z][A-Z\s&,/:—\-'()]{5,})$/gm,
    '<h3 class="section-heading">$1</h3>'
  );
  html = html.replace(
    /^(STEP \d+:.*)$/gm,
    '<h4 class="step-heading">$1</h4>'
  );

  const lines = html.split("\n");
  let result = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      result += '<div class="spacer"></div>';
    } else if (trimmed.startsWith("<")) {
      result += trimmed;
    } else {
      result += `<p>${trimmed}</p>`;
    }
  }
  return result;
}

function printSop(restaurantName: string, sopTitle: string, content: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  const formatted = formatSopContentForPrint(content);
  printWindow.document.write(`<!DOCTYPE html><html><head><title>${sopTitle} - ${restaurantName}</title>
<style>
@page { size: letter; margin: 1in; }
body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; line-height: 1.6; color: #111; max-width: 7in; margin: 0 auto; padding: 0; }
h3.section-heading { font-size: 12pt; margin: 18px 0 8px 0; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
h4.step-heading { font-size: 11pt; margin: 14px 0 6px 0; font-weight: bold; }
.checklist-item { padding-left: 24px; position: relative; margin: 4px 0; }
.checklist-item::before { content: "\\2610"; position: absolute; left: 0; }
.bullet-item { padding-left: 20px; position: relative; margin: 3px 0; }
.bullet-item::before { content: "\\2022"; position: absolute; left: 6px; }
hr.thick-rule { border: none; border-top: 3px double #333; margin: 16px 0; }
hr.thin-rule { border: none; border-top: 1px solid #ccc; margin: 12px 0; }
.spacer { height: 8px; }
p { margin: 3px 0; }
</style></head><body>${formatted}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 400);
}

function printAllSops(restaurantName: string, sops: GeneratedSop[]) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  let allContent = "";
  sops.forEach((sop, idx) => {
    const formatted = formatSopContentForPrint(sop.content);
    allContent += `<div class="sop-section${idx > 0 ? " page-break" : ""}">${formatted}</div>`;
  });

  printWindow.document.write(`<!DOCTYPE html><html><head><title>${restaurantName} - Complete Operations Manual</title>
<style>
@page { size: letter; margin: 1in; }
body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; line-height: 1.6; color: #111; max-width: 7in; margin: 0 auto; padding: 0; }
h3.section-heading { font-size: 12pt; margin: 18px 0 8px 0; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
h4.step-heading { font-size: 11pt; margin: 14px 0 6px 0; font-weight: bold; }
.checklist-item { padding-left: 24px; position: relative; margin: 4px 0; }
.checklist-item::before { content: "\\2610"; position: absolute; left: 0; }
.bullet-item { padding-left: 20px; position: relative; margin: 3px 0; }
.bullet-item::before { content: "\\2022"; position: absolute; left: 6px; }
hr.thick-rule { border: none; border-top: 3px double #333; margin: 16px 0; }
hr.thin-rule { border: none; border-top: 1px solid #ccc; margin: 12px 0; }
.spacer { height: 8px; }
p { margin: 3px 0; }
.page-break { page-break-before: always; }
.cover { text-align: center; padding-top: 3in; }
.cover h1 { font-size: 28pt; margin: 0 0 8px 0; }
.cover h2 { font-size: 16pt; font-weight: normal; color: #555; margin: 0 0 40px 0; }
.cover .date { font-size: 11pt; color: #777; }
.toc { page-break-after: always; }
.toc h2 { font-size: 14pt; margin-bottom: 16px; }
.toc-item { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dotted #ccc; font-size: 10.5pt; }
.toc-category { font-weight: bold; margin-top: 12px; margin-bottom: 4px; font-size: 11pt; text-transform: uppercase; letter-spacing: 1px; }
</style></head><body>
<div class="cover">
<h1>${restaurantName}</h1>
<h2>Complete Operations Manual</h2>
<p class="date">${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
<p style="margin-top: 40px; font-size: 10pt; color: #999;">Confidential — Internal Use Only</p>
</div>
<div class="toc">
<h2>TABLE OF CONTENTS</h2>
${["bar", "kitchen", "foh", "management"].map(cat => {
    const catSops = sops.filter(s => s.sopCategory === cat);
    if (catSops.length === 0) return "";
    const label = cat === "foh" ? "Front of House" : cat.charAt(0).toUpperCase() + cat.slice(1);
    return `<div class="toc-category">${label}</div>${catSops.map(s => `<div class="toc-item"><span>${s.sopTitle}</span><span>v${s.version}</span></div>`).join("")}`;
  }).join("")}
</div>
${allContent}
</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}

export default function SopGeneratorPage() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [selectedSop, setSelectedSop] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ bar: true, kitchen: true, foh: true, management: true });
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const { data: generatedSops = [], isLoading: sopsLoading } = useQuery<GeneratedSop[]>({
    queryKey: ["/api/sops"],
  });

  const { data: variableStatus = {} } = useQuery<Record<string, { set: string[]; missing: string[] }>>({
    queryKey: ["/api/sops/variables"],
  });

  const { data: handbookSettings } = useQuery<any>({
    queryKey: ["/api/handbook-settings"],
  });

  const generatedMap = useMemo(() => {
    const map: Record<string, GeneratedSop> = {};
    generatedSops.forEach(s => { map[s.sopKey] = s; });
    return map;
  }, [generatedSops]);

  const generatedCount = generatedSops.length;
  const restaurantName = handbookSettings?.restaurantName || user?.restaurantName || "your restaurant";

  const generateMutation = useMutation({
    mutationFn: async (sopKey: string) => {
      return apiRequest("POST", "/api/sops/generate", { sopKey });
    },
    onSuccess: async (res) => {
      const sop = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/sops"] });
      toast({ title: `${sop.sopTitle} generated` });
      setSelectedSop(sop.sopKey);
    },
    onError: (err: any) => {
      toast({ title: err.message || "Failed to generate SOP", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/sops/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sops"] });
      toast({ title: "SOP deleted" });
    },
  });

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const selectedTemplate = SOP_TEMPLATES.find(t => t.key === selectedSop);
  const selectedGenerated = selectedSop ? generatedMap[selectedSop] : null;
  const selectedVarStatus = selectedSop ? variableStatus[selectedSop] : null;

  const handlePrint = (sop: GeneratedSop) => {
    printSop(restaurantName, sop.sopTitle, sop.content);
  };

  const handlePrintAll = () => {
    if (generatedSops.length === 0) {
      toast({ title: "No SOPs generated yet", variant: "destructive" });
      return;
    }
    const ordered = [...generatedSops].sort((a, b) => {
      const catOrder = ["bar", "kitchen", "foh", "management"];
      return catOrder.indexOf(a.sopCategory) - catOrder.indexOf(b.sopCategory);
    });
    printAllSops(restaurantName, ordered);
  };

  if (!user) return null;

  return (
    <UpgradeGate domain="sop-generator">
      <div className="min-h-screen" style={{ backgroundColor: "#0f1117" }}>
        <header className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between" style={{ backgroundColor: "#0f1117", borderBottom: "1px solid #1a1d2e" }}>
          <div className="flex items-center gap-3">
            <Link href="/domain/sops">
              <Button variant="ghost" size="icon" className="text-white" data-testid="btn-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white" data-testid="text-page-title">SOP Generator</h1>
              <p className="text-xs" style={{ color: "#9ca3af" }}>Standard operating procedures for {restaurantName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {generatedSops.length > 0 && (
              <Button
                onClick={handlePrintAll}
                className="text-sm font-semibold"
                style={{ backgroundColor: "#d4a017", color: "#0f1117" }}
                data-testid="btn-export-all"
              >
                <BookOpen className="h-4 w-4 mr-1" /> Export Complete Operations Manual
              </Button>
            )}
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
                <DropdownMenuItem onClick={() => navigate("/settings")} className="text-white cursor-pointer">
                  <UserCog className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => logout?.()} className="cursor-pointer" style={{ color: "#ef4444" }}>
                  <LogOut className="mr-2 h-4 w-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="p-4 max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* LEFT PANEL: SOP Library */}
            <div className="w-full lg:w-[30%] lg:min-w-[320px] flex-shrink-0">
              <div className="sticky top-[73px]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-white font-semibold text-sm" data-testid="text-library-title">SOP Library</h2>
                    <p className="text-[11px] mt-0.5" style={{ color: "#9ca3af" }}>
                      Select an SOP to generate. Each one is personalized to {restaurantName}.
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setViewMode("list")} className="p-1.5 rounded bg-transparent border-none cursor-pointer" style={{ color: viewMode === "list" ? "#d4a017" : "#6b7280" }} data-testid="btn-view-list">
                      <LayoutList className="h-4 w-4" />
                    </button>
                    <button onClick={() => setViewMode("grid")} className="p-1.5 rounded bg-transparent border-none cursor-pointer" style={{ color: viewMode === "grid" ? "#d4a017" : "#6b7280" }} data-testid="btn-view-grid">
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>{generatedCount} of 16 SOPs generated</span>
                    <span className="text-xs font-medium" style={{ color: "#d4a017" }}>{Math.round((generatedCount / 16) * 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#2a2d3e" }}>
                    <div className="h-full rounded-full transition-all" style={{ backgroundColor: "#d4a017", width: `${(generatedCount / 16) * 100}%` }} />
                  </div>
                </div>

                {viewMode === "list" ? (
                  <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1" data-testid="sop-library-list">
                    {CATEGORIES.map(cat => {
                      const catTemplates = SOP_TEMPLATES.filter(t => t.category === cat.key);
                      const expanded = expandedCategories[cat.key] !== false;
                      const catGenCount = catTemplates.filter(t => generatedMap[t.key]).length;
                      return (
                        <div key={cat.key}>
                          <button
                            onClick={() => toggleCategory(cat.key)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left bg-transparent border-none cursor-pointer"
                            style={{ backgroundColor: "#1a1d2e" }}
                            data-testid={`category-${cat.key}`}
                          >
                            <div className="flex items-center gap-2">
                              <cat.icon className="h-4 w-4" style={{ color: "#d4a017" }} />
                              <span className="text-sm font-medium text-white">{cat.label}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#252840", color: "#9ca3af" }}>{catGenCount}/{catTemplates.length}</span>
                            </div>
                            {expanded ? <ChevronDown className="h-4 w-4" style={{ color: "#d4a017" }} /> : <ChevronRight className="h-4 w-4" style={{ color: "#6b7280" }} />}
                          </button>
                          {expanded && (
                            <div className="mt-1 space-y-1 pl-2">
                              {catTemplates.map(tmpl => {
                                const gen = generatedMap[tmpl.key];
                                const isSelected = selectedSop === tmpl.key;
                                return (
                                  <button
                                    key={tmpl.key}
                                    onClick={() => setSelectedSop(tmpl.key)}
                                    className="w-full text-left px-3 py-2.5 rounded-lg bg-transparent border-none cursor-pointer transition-all"
                                    style={{
                                      backgroundColor: isSelected ? "#252840" : "transparent",
                                      borderLeft: isSelected ? "2px solid #d4a017" : "2px solid transparent",
                                    }}
                                    data-testid={`sop-item-${tmpl.key}`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="text-sm text-white font-medium truncate">{tmpl.title}</p>
                                        <p className="text-[11px] mt-0.5 truncate" style={{ color: "#6b7280" }}>{tmpl.description}</p>
                                      </div>
                                    </div>
                                    <div className="mt-1.5 flex items-center gap-2">
                                      {gen ? (
                                        <>
                                          <Check className="h-3 w-3" style={{ color: "#d4a017" }} />
                                          <span className="text-[10px]" style={{ color: "#d4a017" }}>Generated {formatDate(gen.lastGeneratedAt)}</span>
                                        </>
                                      ) : (
                                        <span className="text-[10px]" style={{ color: "#6b7280" }}>— Not yet generated</span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1" data-testid="sop-library-grid">
                    {SOP_TEMPLATES.map(tmpl => {
                      const gen = generatedMap[tmpl.key];
                      const catInfo = CATEGORIES.find(c => c.key === tmpl.category);
                      const CatIcon = catInfo?.icon || FileText;
                      const isSelected = selectedSop === tmpl.key;
                      return (
                        <button
                          key={tmpl.key}
                          onClick={() => setSelectedSop(tmpl.key)}
                          className="p-3 rounded-lg text-left bg-transparent border-none cursor-pointer transition-all"
                          style={{
                            backgroundColor: isSelected ? "#252840" : "#1a1d2e",
                            border: isSelected ? "1px solid #b8860b" : "1px solid transparent",
                          }}
                          data-testid={`sop-card-${tmpl.key}`}
                        >
                          <CatIcon className="h-4 w-4 mb-1.5" style={{ color: "#d4a017" }} />
                          <p className="text-xs text-white font-medium leading-tight">{tmpl.title}</p>
                          <p className="text-[10px] mt-1 leading-tight" style={{ color: "#6b7280" }}>{tmpl.description}</p>
                          <div className="mt-2">
                            {gen ? (
                              <span className="text-[9px] font-medium" style={{ color: "#d4a017" }}>Generated {formatDate(gen.lastGeneratedAt)}</span>
                            ) : (
                              <span className="text-[9px]" style={{ color: "#6b7280" }}>Not generated</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT PANEL: SOP Preview / Document View */}
            <div className="flex-1 min-w-0">
              {!selectedSop ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <FileText className="h-12 w-12 mb-4" style={{ color: "#2a2d3e" }} />
                  <p className="text-white font-medium mb-1">Select an SOP from the library</p>
                  <p className="text-sm" style={{ color: "#6b7280" }}>Choose a procedure to preview, generate, or view.</p>
                </div>
              ) : selectedGenerated ? (
                <div data-testid="sop-document-view">
                  {/* Action bar */}
                  <div className="sticky top-[73px] z-10 flex items-center gap-2 p-3 rounded-lg mb-4" style={{ backgroundColor: "#1a1d2e", borderBottom: "1px solid #2a2d3e" }} data-testid="sop-action-bar">
                    <Button
                      onClick={() => handlePrint(selectedGenerated)}
                      variant="ghost"
                      className="text-white text-xs"
                      data-testid="btn-print-sop"
                    >
                      <Printer className="h-4 w-4 mr-1" /> Print
                    </Button>
                    <Button
                      onClick={() => {
                        handlePrint(selectedGenerated);
                        toast({ title: 'Select "Save as PDF" in the print dialog' });
                      }}
                      variant="ghost"
                      className="text-white text-xs"
                      data-testid="btn-download-pdf"
                    >
                      <Download className="h-4 w-4 mr-1" /> Download PDF
                    </Button>
                    <Button
                      onClick={() => {
                        const blob = new Blob([selectedGenerated.content], { type: "text/plain" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${restaurantName.replace(/\s+/g, "-")}-${selectedGenerated.sopTitle.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast({ title: "Document exported" });
                      }}
                      variant="ghost"
                      className="text-white text-xs"
                      data-testid="btn-share-export"
                    >
                      <Share2 className="h-4 w-4 mr-1" /> Export
                    </Button>
                    <div className="flex-1" />
                    <Button
                      onClick={() => generateMutation.mutate(selectedSop!)}
                      disabled={generateMutation.isPending}
                      variant="ghost"
                      className="text-xs"
                      style={{ color: "#d4a017" }}
                      data-testid="btn-regenerate-sop"
                    >
                      {generateMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                      Regenerate
                    </Button>
                    <span className="text-[10px] px-2 py-1 rounded" style={{ backgroundColor: "#252840", color: "#9ca3af" }}>v{selectedGenerated.version}</span>
                  </div>

                  {/* Rendered document */}
                  <div className="rounded-lg p-6 md:p-8" style={{ backgroundColor: "#1a1d2e" }} data-testid="sop-rendered-content">
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono" style={{ color: "#e5e7eb" }}>
                      {selectedGenerated.content}
                    </pre>
                  </div>
                </div>
              ) : selectedTemplate ? (
                <div className="rounded-lg p-6" style={{ backgroundColor: "#1a1d2e" }} data-testid="sop-preview">
                  <h2 className="text-xl font-bold text-white mb-1">{selectedTemplate.title}</h2>
                  <p className="text-sm mb-4" style={{ color: "#9ca3af" }}>
                    {CATEGORIES.find(c => c.key === selectedTemplate.category)?.label} · 1–2 pages · ~3 min read
                  </p>

                  <div className="mb-5">
                    <h3 className="text-xs uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>What this SOP covers</h3>
                    <p className="text-sm text-white leading-relaxed">{selectedTemplate.description}</p>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>Variables from your Setup</h3>
                    <div className="space-y-1.5">
                      {selectedTemplate.requiredVariables.map(v => {
                        const isSet = selectedVarStatus?.set?.includes(v);
                        const isMissing = selectedVarStatus?.missing?.includes(v);
                        return (
                          <div key={v} className="flex items-center gap-2 text-sm">
                            {isSet ? (
                              <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#22c55e" }} />
                            ) : (
                              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#d4a017" }} />
                            )}
                            <span style={{ color: isSet ? "#e5e7eb" : "#d4a017" }}>
                              {VARIABLE_LABELS[v] || v}
                            </span>
                            {isMissing && (
                              <Link href="/templates?tab=handbook">
                                <span className="text-[10px] underline cursor-pointer" style={{ color: "#d4a017" }}>complete in Setup</span>
                              </Link>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Button
                    onClick={() => generateMutation.mutate(selectedTemplate.key)}
                    disabled={generateMutation.isPending}
                    className="font-semibold"
                    style={{ backgroundColor: "#d4a017", color: "#0f1117" }}
                    data-testid="btn-generate-sop"
                  >
                    {generateMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                    ) : (
                      "Generate SOP"
                    )}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </UpgradeGate>
  );
}
