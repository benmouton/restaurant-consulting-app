import { useState, useEffect, useRef, useMemo } from "react";
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
  ArrowLeft, TrendingUp, TrendingDown, DollarSign, LogOut,
  UserCog, Pencil, Trash2, Download, AlertTriangle, Check,
  ChevronLeft, ChevronRight, Minus, ChevronDown,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { PrimeCostEntry, HandbookSettings } from "@shared/schema";
import { isNativeApp } from "@/lib/native";

function getMostRecentSunday(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCurrency(val: string | number): string {
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "$0";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

type PrimeStatus = "on-track" | "watch" | "act-now";

function getStatus(primePct: number, target: number): PrimeStatus {
  const diff = primePct - target;
  if (diff <= 0) return "on-track";
  if (diff <= 4) return "watch";
  return "act-now";
}

function getStatusConfig(status: PrimeStatus) {
  switch (status) {
    case "on-track": return { label: "ON TRACK", color: "#22c55e", icon: Check };
    case "watch": return { label: "WATCH THIS", color: "#d4a017", icon: AlertTriangle };
    case "act-now": return { label: "ACT NOW", color: "#ef4444", icon: AlertTriangle };
  }
}

function getActionLine(foodOver: boolean, laborOver: boolean): string {
  if (foodOver && !laborOver) return "Your food cost is driving the variance. Check portion control and waste logs before next service.";
  if (!foodOver && laborOver) return "Your labor cost is driving the variance. Review this week's schedule against actual hours and look for overtime.";
  if (foodOver && laborOver) return "Both food and labor are over target. Start with food cost — it's typically faster to correct. Pull your waste log and portion records first.";
  return "You're running clean this week. Stay consistent.";
}

export default function PrimeCostPage() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [weekEnding, setWeekEnding] = useState(getMostRecentSunday);
  const [foodCost, setFoodCost] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [totalSales, setTotalSales] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isFirstEntry, setIsFirstEntry] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const { data: entries, isLoading: entriesLoading } = useQuery<PrimeCostEntry[]>({
    queryKey: ["/api/prime-cost"],
  });

  const { data: summary } = useQuery<{
    entries: PrimeCostEntry[];
    targets: { foodCostTarget: number | null; laborTarget: number | null; primeCostTarget: number | null };
    trendDirection: "up" | "down" | "flat" | null;
    totalEntries: number;
  }>({
    queryKey: ["/api/prime-cost/summary"],
  });

  const { data: handbookSettings } = useQuery<HandbookSettings | null>({
    queryKey: ["/api/handbook-settings"],
  });

  const targets = summary?.targets || { foodCostTarget: null, laborTarget: null, primeCostTarget: null };
  const hasTargets = targets.primeCostTarget !== null;

  const existingForWeek = useMemo(() => {
    return entries?.find(e => e.weekEnding === weekEnding);
  }, [entries, weekEnding]);

  useEffect(() => {
    if (existingForWeek && !editingId) {
      setFoodCost(existingForWeek.foodCost);
      setLaborCost(existingForWeek.laborCost);
      setTotalSales(existingForWeek.totalSales);
      setNotes(existingForWeek.notes || "");
    }
  }, [existingForWeek, editingId]);

  const livePreview = useMemo(() => {
    const food = parseFloat(foodCost) || 0;
    const labor = parseFloat(laborCost) || 0;
    const sales = parseFloat(totalSales) || 0;
    if (sales <= 0) return null;
    return {
      foodPct: (food / sales) * 100,
      laborPct: (labor / sales) * 100,
      primePct: ((food + labor) / sales) * 100,
    };
  }, [foodCost, laborCost, totalSales]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingId) {
        return apiRequest("PUT", `/api/prime-cost/${editingId}`, data);
      }
      return apiRequest("POST", "/api/prime-cost", data);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prime-cost"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prime-cost/summary"] });
      if (!entries || entries.length === 0) {
        setIsFirstEntry(true);
      }
      setFoodCost("");
      setLaborCost("");
      setTotalSales("");
      setNotes("");
      setEditingId(null);
      toast({ title: "Week saved" });
    },
    onError: (err: any) => {
      toast({ title: err.message || "Failed to save", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (isFirstEntry) {
      toast({ title: "First week tracked. Come back next Monday with your new numbers." });
      setIsFirstEntry(false);
    }
  }, [isFirstEntry]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/prime-cost/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prime-cost"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prime-cost/summary"] });
      setDeleteConfirmId(null);
      toast({ title: "Entry deleted" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      weekEnding,
      foodCost,
      laborCost,
      totalSales,
      notes,
    });
  };

  const handleEdit = (entry: PrimeCostEntry) => {
    setEditingId(entry.id);
    setWeekEnding(entry.weekEnding);
    setFoodCost(entry.foodCost);
    setLaborCost(entry.laborCost);
    setTotalSales(entry.totalSales);
    setNotes(entry.notes || "");
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleExportCSV = () => {
    if (!entries || entries.length === 0) return;
    const restaurantName = handbookSettings?.restaurantName || "restaurant";
    const today = new Date().toISOString().split("T")[0];
    const header = "Week Ending,Food Cost ($),Labor Cost ($),Total Sales ($),Food Cost %,Labor Cost %,Prime Cost %,Target Prime Cost %,Variance,Notes";
    const rows = entries.map(e => {
      const pct = parseFloat(e.primeCostPct || "0");
      const target = targets.primeCostTarget || 0;
      const variance = (pct - target).toFixed(1);
      return `${e.weekEnding},${e.foodCost},${e.laborCost},${e.totalSales},${e.foodCostPct},${e.laborCostPct},${e.primeCostPct},${target},${variance},"${(e.notes || "").replace(/"/g, '""')}"`;
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${restaurantName.replace(/\s+/g, "-")}-prime-cost-history-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartData = useMemo(() => {
    if (!summary?.entries || summary.entries.length === 0) return [];
    return [...summary.entries].reverse().map(e => ({
      week: formatDate(e.weekEnding),
      prime: parseFloat(e.primeCostPct || "0"),
      food: parseFloat(e.foodCostPct || "0"),
      labor: parseFloat(e.laborCostPct || "0"),
    }));
  }, [summary]);

  const latestEntry = entries?.[0];
  const latestPrime = latestEntry ? parseFloat(latestEntry.primeCostPct || "0") : null;
  const latestFood = latestEntry ? parseFloat(latestEntry.foodCostPct || "0") : null;
  const latestLabor = latestEntry ? parseFloat(latestEntry.laborCostPct || "0") : null;

  const PAGE_SIZE = 8;
  const paginatedEntries = entries?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) || [];
  const totalPages = Math.ceil((entries?.length || 0) / PAGE_SIZE);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0f1117" }}>
      <header
        className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: "#0f1117", borderBottom: "1px solid #1a1d2e" }}
      >
        <div className="flex items-center gap-3">
          <Link href="/financial">
            <Button variant="ghost" size="icon" className="text-white" data-testid="btn-back-financial">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white" data-testid="text-page-title">Prime Cost Tracker</h1>
            <p className="text-xs" style={{ color: "#9ca3af" }}>Weekly financial pulse</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" data-testid="btn-user-menu">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl || ""} />
                <AvatarFallback style={{ backgroundColor: "#1a1d2e", color: "#d4a017" }}>
                  {user?.firstName?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" style={{ backgroundColor: "#1a1d2e", border: "1px solid #2a2d3e" }}>
            <DropdownMenuLabel className="text-white">{user?.firstName} {user?.lastName}</DropdownMenuLabel>
            <DropdownMenuSeparator style={{ backgroundColor: "#2a2d3e" }} />
            <DropdownMenuItem onClick={() => navigate("/profile")} className="text-white cursor-pointer">
              <UserCog className="h-4 w-4 mr-2" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => logout()} className="cursor-pointer" style={{ color: "#ef4444" }}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <UpgradeGate domain="costs">
          <div className="space-y-6">

            {entriesLoading && (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 rounded-xl animate-pulse" style={{ backgroundColor: "#1a1d2e" }} />
                ))}
              </div>
            )}

            {!entriesLoading && !hasTargets && (
              <div
                className="p-4 rounded-lg flex items-center gap-3"
                style={{ background: "rgba(212,160,23,0.08)", border: "1px solid rgba(212,160,23,0.3)" }}
                data-testid="banner-missing-targets"
              >
                <AlertTriangle className="h-5 w-5 flex-shrink-0" style={{ color: "#d4a017" }} />
                <p className="text-sm" style={{ color: "#f59e0b" }}>
                  Set your food cost and labor targets in Setup to see how your weekly numbers compare.
                </p>
                <Link
                  href="/templates"
                  className="text-sm font-semibold flex-shrink-0 ml-auto"
                  style={{ color: "#d4a017" }}
                  data-testid="link-complete-setup"
                >
                  Complete Setup
                </Link>
              </div>
            )}

            {!entriesLoading && latestEntry && hasTargets && latestPrime !== null ? (() => {
              const status = getStatus(latestPrime, targets.primeCostTarget!);
              const config = getStatusConfig(status);
              const StatusIcon = config.icon;
              const foodOver = latestFood !== null && targets.foodCostTarget !== null && latestFood > targets.foodCostTarget;
              const laborOver = latestLabor !== null && targets.laborTarget !== null && latestLabor > targets.laborTarget;
              const variance = (latestPrime - targets.primeCostTarget!).toFixed(1);

              return (
                <div
                  className="p-5 rounded-xl"
                  style={{ backgroundColor: "#1a1d2e", border: `1px solid ${config.color}33` }}
                  data-testid="card-status-header"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: "#9ca3af" }}>
                      Prime Cost — Week Ending {formatDate(latestEntry.weekEnding)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-4 mb-4">
                    <span className="text-3xl font-bold text-white" data-testid="text-current-prime">{latestPrime.toFixed(1)}%</span>
                    <span className="text-sm" style={{ color: "#9ca3af" }}>Target: {targets.primeCostTarget}%</span>
                    <span className="text-sm font-medium" style={{ color: config.color }}>
                      {parseFloat(variance) > 0 ? `▲ ${variance}pts over` : parseFloat(variance) < 0 ? `▼ ${Math.abs(parseFloat(variance)).toFixed(1)}pts under` : "On target"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-6 mb-4 text-sm">
                    <div>
                      <span className="text-white">Food Cost: {latestFood?.toFixed(1)}%</span>
                      {targets.foodCostTarget !== null && (
                        <span className="ml-2" style={{ color: foodOver ? "#d4a017" : "#22c55e" }}>
                          (target {targets.foodCostTarget}%) {foodOver ? "▲" : "✓"}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-white">Labor Cost: {latestLabor?.toFixed(1)}%</span>
                      {targets.laborTarget !== null && (
                        <span className="ml-2" style={{ color: laborOver ? "#d4a017" : "#22c55e" }}>
                          (target {targets.laborTarget}%) {laborOver ? "▲" : "✓"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3" style={{ borderTop: "1px solid #2a2d3e" }}>
                    <StatusIcon className="h-4 w-4" style={{ color: config.color }} />
                    <span className="text-sm font-semibold" style={{ color: config.color }} data-testid="text-status-label">{config.label}</span>
                  </div>
                  <p className="text-sm mt-2" style={{ color: "#9ca3af" }} data-testid="text-action-line">
                    {getActionLine(foodOver, laborOver)}
                  </p>
                </div>
              );
            })() : !entriesLoading && !latestEntry && (
              <div
                className="p-8 rounded-xl text-center"
                style={{ backgroundColor: "#1a1d2e", border: "1px solid #2a2d3e" }}
                data-testid="card-empty-status"
              >
                <DollarSign className="h-10 w-10 mx-auto mb-3" style={{ color: "#4a4d5e" }} />
                <p className="text-white font-medium mb-1">No entries yet</p>
                <p className="text-sm" style={{ color: "#9ca3af" }}>Add your first week below to start tracking.</p>
              </div>
            )}

            <div
              className="p-5 rounded-xl"
              style={{ backgroundColor: "#1a1d2e", border: "1px solid #b8860b" }}
              data-testid="card-trend-chart"
            >
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "#d4a017" }}>
                4-Week Trend
              </h3>
              {chartData.length >= 2 ? (
                <>
                  <div className="rounded-lg p-3" style={{ backgroundColor: "#12141f" }}>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
                        <XAxis dataKey="week" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={{ stroke: "#2a2d3e" }} />
                        <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={{ stroke: "#2a2d3e" }} tickFormatter={(v) => `${v}%`} domain={[0, (dataMax: number) => Math.ceil(dataMax + 5)]} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#1a1d2e", border: "1px solid #d4a017", borderRadius: 8, color: "white" }}
                          formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name === "prime" ? "Prime Cost" : name === "food" ? "Food Cost" : "Labor Cost"]}
                        />
                        {hasTargets && (
                          <ReferenceLine y={targets.primeCostTarget!} stroke="#d4a017" strokeDasharray="6 4" label={{ value: "Target", position: "right", fill: "#d4a017", fontSize: 11 }} />
                        )}
                        <Line type="monotone" dataKey="prime" stroke="#d4a017" strokeWidth={2} dot={{ fill: "#d4a017", r: 4 }} name="prime" />
                        <Line type="monotone" dataKey="food" stroke="#ffffff" strokeWidth={1} dot={{ fill: "#ffffff", r: 3 }} name="food" />
                        <Line type="monotone" dataKey="labor" stroke="#9ca3af" strokeWidth={1} strokeDasharray="4 4" dot={{ fill: "#9ca3af", r: 3 }} name="labor" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {summary?.trendDirection && (
                    <p className="text-sm mt-3" style={{
                      color: summary.trendDirection === "down" ? "#22c55e" : summary.trendDirection === "up" ? "#d4a017" : "#9ca3af"
                    }} data-testid="text-trend-summary">
                      {summary.trendDirection === "down" && summary.entries.length >= 2 && (
                        <>▼ Down {Math.abs(parseFloat(summary.entries[0].primeCostPct || "0") - parseFloat(summary.entries[1].primeCostPct || "0")).toFixed(1)}pts from last week — trending in the right direction.</>
                      )}
                      {summary.trendDirection === "up" && summary.entries.length >= 2 && (
                        <>▲ Up {Math.abs(parseFloat(summary.entries[0].primeCostPct || "0") - parseFloat(summary.entries[1].primeCostPct || "0")).toFixed(1)}pts from last week — review this week's drivers.</>
                      )}
                      {summary.trendDirection === "flat" && <>→ Flat week-over-week.</>}
                    </p>
                  )}
                </>
              ) : (
                <div className="rounded-lg p-8 text-center" style={{ backgroundColor: "#12141f" }}>
                  <p className="text-sm" style={{ color: "#9ca3af" }}>Add 2 or more weeks to see your trend.</p>
                </div>
              )}
            </div>

            <div ref={formRef} className="p-5 rounded-xl" style={{ backgroundColor: "#1a1d2e", border: "1px solid #b8860b" }} data-testid="card-entry-form">
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "#d4a017" }}>
                {editingId ? "Edit Entry" : "Enter This Week's Numbers"}
              </h3>

              {existingForWeek && !editingId && (
                <div className="p-3 rounded-lg mb-4 text-sm" style={{ background: "rgba(212,160,23,0.08)", border: "1px solid rgba(212,160,23,0.2)", color: "#f59e0b" }}>
                  You already have an entry for this week. Saving will update it.
                </div>
              )}

              <div className="mb-4">
                <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "#9ca3af" }}>Week Ending (Sunday)</label>
                <Input
                  type="date"
                  value={weekEnding}
                  onChange={(e) => { setWeekEnding(e.target.value); setEditingId(null); }}
                  className="max-w-[200px]"
                  style={{ backgroundColor: "#12141f", border: "1px solid #2a2d3e", color: "white" }}
                  data-testid="input-week-ending"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "#9ca3af" }}>Food Cost This Week</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#9ca3af" }}>$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={foodCost}
                      onChange={(e) => setFoodCost(e.target.value)}
                      placeholder="0.00"
                      className="pl-7"
                      style={{ backgroundColor: "#12141f", border: "1px solid #2a2d3e", color: "white" }}
                      data-testid="input-food-cost"
                    />
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: "#6b7280" }}>Total spent on food purchases and invoices</p>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "#9ca3af" }}>Labor Cost This Week</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#9ca3af" }}>$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={laborCost}
                      onChange={(e) => setLaborCost(e.target.value)}
                      placeholder="0.00"
                      className="pl-7"
                      style={{ backgroundColor: "#12141f", border: "1px solid #2a2d3e", color: "white" }}
                      data-testid="input-labor-cost"
                    />
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: "#6b7280" }}>Total payroll including management, FOH, and BOH</p>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "#9ca3af" }}>Total Sales This Week</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#9ca3af" }}>$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={totalSales}
                      onChange={(e) => setTotalSales(e.target.value)}
                      placeholder="0.00"
                      className="pl-7"
                      style={{ backgroundColor: "#12141f", border: "1px solid #2a2d3e", color: "white" }}
                      data-testid="input-total-sales"
                    />
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: "#6b7280" }}>Gross revenue before discounts and comps</p>
                </div>
              </div>

              {livePreview && (
                <div
                  className="p-4 rounded-lg mb-4"
                  style={{ backgroundColor: "#12141f", border: "1px solid #2a2d3e", transition: "all 0.2s ease" }}
                  data-testid="card-live-preview"
                >
                  <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-white">Food Cost: {livePreview.foodPct.toFixed(1)}%</span>
                      {targets.foodCostTarget !== null && (
                        <span style={{ color: livePreview.foodPct > targets.foodCostTarget ? "#d4a017" : "#22c55e" }}>
                          target {targets.foodCostTarget}% {livePreview.foodPct > targets.foodCostTarget ? "▲" : "✓"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white">Labor Cost: {livePreview.laborPct.toFixed(1)}%</span>
                      {targets.laborTarget !== null && (
                        <span style={{ color: livePreview.laborPct > targets.laborTarget ? "#d4a017" : "#22c55e" }}>
                          target {targets.laborTarget}% {livePreview.laborPct > targets.laborTarget ? "▲" : "✓"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">Prime Cost: {livePreview.primePct.toFixed(1)}%</span>
                      {targets.primeCostTarget !== null && (
                        <span style={{ color: livePreview.primePct > targets.primeCostTarget ? "#d4a017" : "#22c55e" }}>
                          target {targets.primeCostTarget}% {livePreview.primePct > targets.primeCostTarget ? "▲" : "✓"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "#9ca3af" }}>Notes (optional)</label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.substring(0, 200))}
                  placeholder='e.g. "Short-staffed Wed/Thu, higher labor. Crawfish delivery spike."'
                  maxLength={200}
                  style={{ backgroundColor: "#12141f", border: "1px solid #2a2d3e", color: "white" }}
                  data-testid="input-notes"
                />
                <p className="text-[11px] mt-1 text-right" style={{ color: "#6b7280" }}>{notes.length}/200</p>
              </div>

              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !foodCost || !laborCost || !totalSales}
                className="w-full font-semibold text-base py-3"
                style={{ backgroundColor: "#d4a017", color: "#0f1117" }}
                data-testid="btn-save-week"
              >
                {saveMutation.isPending ? "Saving..." : editingId ? "Update Entry" : "Save Week"}
              </Button>

              {editingId && (
                <button
                  onClick={() => { setEditingId(null); setFoodCost(""); setLaborCost(""); setTotalSales(""); setNotes(""); }}
                  className="w-full text-center mt-2 text-xs bg-transparent border-none cursor-pointer"
                  style={{ color: "#9ca3af" }}
                >
                  Cancel editing
                </button>
              )}
            </div>

            {entries && entries.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #2a2d3e" }} data-testid="table-history">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: "#b8860b", color: "#0f1117" }}>
                        <th className="text-left py-2.5 px-3 font-semibold">Week Ending</th>
                        <th className="text-right py-2.5 px-3 font-semibold">Food %</th>
                        <th className="text-right py-2.5 px-3 font-semibold">Labor %</th>
                        <th className="text-right py-2.5 px-3 font-semibold">Prime %</th>
                        <th className="text-right py-2.5 px-3 font-semibold">vs Target</th>
                        <th className="text-left py-2.5 px-3 font-semibold">Notes</th>
                        <th className="text-right py-2.5 px-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedEntries.map((entry, idx) => {
                        const pct = parseFloat(entry.primeCostPct || "0");
                        const target = targets.primeCostTarget || 0;
                        const diff = pct - target;
                        const varianceColor = diff <= 0 ? "#22c55e" : diff <= 4 ? "#d4a017" : "#ef4444";
                        const varianceText = diff > 0 ? `+${diff.toFixed(1)}pts` : diff < 0 ? `${diff.toFixed(1)}pts` : "on target";

                        return (
                          <tr
                            key={entry.id}
                            style={{ backgroundColor: idx % 2 === 0 ? "#1a1d2e" : "#12141f" }}
                            data-testid={`row-entry-${entry.id}`}
                          >
                            <td className="py-2.5 px-3 text-white">{formatDate(entry.weekEnding)}</td>
                            <td className="py-2.5 px-3 text-right text-white">{parseFloat(entry.foodCostPct || "0").toFixed(1)}%</td>
                            <td className="py-2.5 px-3 text-right text-white">{parseFloat(entry.laborCostPct || "0").toFixed(1)}%</td>
                            <td className="py-2.5 px-3 text-right text-white font-semibold">{pct.toFixed(1)}%</td>
                            <td className="py-2.5 px-3 text-right font-medium" style={{ color: varianceColor }}>{varianceText}</td>
                            <td className="py-2.5 px-3 max-w-[120px]" style={{ color: "#9ca3af" }} title={entry.notes || ""}>
                              {entry.notes ? (entry.notes.length > 40 ? entry.notes.substring(0, 40) + "..." : entry.notes) : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => handleEdit(entry)} className="p-1.5 rounded bg-transparent border-none cursor-pointer" style={{ color: "#9ca3af" }} data-testid={`btn-edit-${entry.id}`}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => setDeleteConfirmId(entry.id)} className="p-1.5 rounded bg-transparent border-none cursor-pointer" style={{ color: "#9ca3af" }} data-testid={`btn-delete-${entry.id}`}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 py-3" style={{ backgroundColor: "#1a1d2e", borderTop: "1px solid #2a2d3e" }}>
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 bg-transparent border-none cursor-pointer disabled:opacity-30" style={{ color: "#9ca3af" }}>
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs" style={{ color: "#9ca3af" }}>Page {page + 1} of {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1 bg-transparent border-none cursor-pointer disabled:opacity-30" style={{ color: "#9ca3af" }}>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div className="py-2.5 px-3 text-center" style={{ backgroundColor: "#12141f", borderTop: "1px solid #2a2d3e" }}>
                  <button onClick={handleExportCSV} className="text-xs bg-transparent border-none cursor-pointer underline underline-offset-4" style={{ color: "#d4a017" }} data-testid="btn-export-csv">
                    <Download className="h-3 w-3 inline mr-1" />
                    Export history as CSV
                  </button>
                </div>
              </div>
            )}

          </div>
        </UpgradeGate>
      </main>

      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div className="max-w-sm w-full mx-4 p-6 rounded-xl" style={{ backgroundColor: "#1a1d2e", border: "1px solid #2a2d3e" }} data-testid="modal-delete-confirm">
            <h3 className="text-white font-semibold mb-2">Delete this entry?</h3>
            <p className="text-sm mb-4" style={{ color: "#9ca3af" }}>This action cannot be undone.</p>
            <div className="flex gap-3">
              <Button onClick={() => setDeleteConfirmId(null)} variant="ghost" className="flex-1 text-white" data-testid="btn-cancel-delete">
                Cancel
              </Button>
              <Button
                onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
                className="flex-1"
                style={{ backgroundColor: "#ef4444", color: "white" }}
                disabled={deleteMutation.isPending}
                data-testid="btn-confirm-delete"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
