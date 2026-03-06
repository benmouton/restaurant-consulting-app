import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UpgradeGate } from "@/components/upgrade-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Plus, Pencil, Trash2, Search, Upload,
  Download, Printer, Star, FileText, BarChart3,
  ChevronDown, ChevronRight, X, Loader2, TrendingUp,
  AlertTriangle, Target, DollarSign, Gem, HelpCircle, CircleX,
} from "lucide-react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import type { MenuItem, MenuCategory } from "@shared/schema";

const DEFAULT_CATEGORIES = [
  "Appetizers", "Soups & Salads", "Entrées", "Sides",
  "Desserts", "Cocktails", "Beer & Wine", "Non-Alcoholic",
];

const QUADRANT_COLORS: Record<string, string> = {
  star: "#d4a017",
  plowhorse: "#3b82f6",
  puzzle: "#8b5cf6",
  dog: "#ef4444",
};

const QUADRANT_LABELS: Record<string, string> = {
  star: "Star",
  plowhorse: "Plowhorse",
  puzzle: "Puzzle",
  dog: "Dog",
};

const QUADRANT_ICON_COMPONENTS: Record<string, any> = {
  star: Star,
  plowhorse: TrendingUp,
  puzzle: HelpCircle,
  dog: CircleX,
};

interface AnalysisData {
  items: (MenuItem & { quadrant: string })[];
  summary: {
    totalItems: number;
    avgFoodCostPct: number;
    totalWeeklyContribution: number;
    needsAttention: number;
    stars: number;
    plowhorses: number;
    puzzles: number;
    dogs: number;
    avgCM: number;
    avgPopularity: number;
    foodCostTarget: number | null;
  };
  quadrants: {
    stars: (MenuItem & { quadrant: string })[];
    plowhorses: (MenuItem & { quadrant: string })[];
    puzzles: (MenuItem & { quadrant: string })[];
    dogs: (MenuItem & { quadrant: string })[];
  };
}

function n(val: string | number | null | undefined): number {
  return parseFloat(String(val || 0)) || 0;
}

function fmtDollar(val: number): string {
  return "$" + val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function fmtPct(val: number): string {
  return val.toFixed(1) + "%";
}

function foodCostColor(pct: number, target: number | null): string {
  if (!target) return "#e5e7eb";
  if (pct <= target) return "#22c55e";
  if (pct <= target + 5) return "#d4a017";
  return "#ef4444";
}

function getQuadrantAction(quadrant: string, item: MenuItem & { quadrant: string }): string {
  const name = item.name;
  const cm = fmtDollar(n(item.contributionMargin));
  const fc = fmtPct(n(item.foodCostPct));
  const units = item.weeklyUnitsSold || 0;

  switch (quadrant) {
    case "star":
      return `Feature on your menu. Train servers to recommend ${name} first.`;
    case "plowhorse":
      return units > 40
        ? `A $1–2 price increase is unlikely to reduce volume on a popular item. Alternatively: review portion size and prep yield.`
        : `Review portion cost and consider a modest price increase. At ${units} units/week, a small bump won't hurt volume.`;
    case "puzzle":
      return `Add to the server upsell script. Consider a featured callout on the menu. Do not discount — the ${cm} margin is the point.`;
    case "dog":
      return `Remove from the menu, or reprice significantly upward. If it has sentimental value: move it off-menu and make it a special.`;
    default:
      return "";
  }
}

export default function MenuEngineeringPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"matrix" | "items" | "report">("items");
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<(MenuItem & { quadrant?: string }) | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterQuadrant, setFilterQuadrant] = useState<string>("all");
  const [expandedQuadrants, setExpandedQuadrants] = useState<Record<string, boolean>>({ star: true, plowhorse: true, puzzle: true, dog: true });

  const [itemName, setItemName] = useState("");
  const [itemCategory, setItemCategory] = useState<string>("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCost, setItemCost] = useState("");
  const [itemUnits, setItemUnits] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [itemActive, setItemActive] = useState(true);

  const [csvPreview, setCsvPreview] = useState<any[] | null>(null);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  const { data: categories = [], isLoading: catsLoading } = useQuery<MenuCategory[]>({
    queryKey: ["/api/menu/categories"],
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu/items"],
  });

  const { data: analysis } = useQuery<AnalysisData>({
    queryKey: ["/api/menu/analysis"],
  });

  const { data: handbookSettings } = useQuery<any>({
    queryKey: ["/api/handbook-settings"],
  });

  const foodCostTarget = analysis?.summary?.foodCostTarget
    ?? (handbookSettings?.foodCostTarget ? parseFloat(handbookSettings.foodCostTarget) : null);

  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => apiRequest("POST", "/api/menu/categories", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu/categories"] });
      setNewCategoryName("");
      setShowCategoryModal(false);
      toast({ title: "Category added" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/menu/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu/categories"] });
      toast({ title: "Category removed" });
    },
  });

  const initDefaultCategories = useMutation({
    mutationFn: async () => {
      for (const name of DEFAULT_CATEGORIES) {
        await apiRequest("POST", "/api/menu/categories", { name, displayOrder: DEFAULT_CATEGORIES.indexOf(name) });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu/categories"] });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/menu/items", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menu/analysis"] });
      if (data.warnings?.length) toast({ title: data.warnings[0] });
      else toast({ title: "Item saved" });
      closeItemModal();
    },
    onError: (err: any) => toast({ title: err.message || "Failed to save item", variant: "destructive" }),
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/menu/items/${id}`, data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menu/analysis"] });
      if (data.warnings?.length) toast({ title: data.warnings[0] });
      else toast({ title: "Item updated" });
      closeItemModal();
    },
    onError: (err: any) => toast({ title: err.message || "Failed to update item", variant: "destructive" }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/menu/items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menu/analysis"] });
      toast({ title: "Item deleted" });
    },
  });

  const importItemsMutation = useMutation({
    mutationFn: async (rows: any[]) => {
      const results = [];
      for (const row of rows) {
        try {
          const res = await apiRequest("POST", "/api/menu/items", row);
          results.push({ success: true });
        } catch (e: any) {
          results.push({ success: false, error: e.message });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const ok = results.filter(r => r.success).length;
      const fail = results.filter(r => !r.success).length;
      queryClient.invalidateQueries({ queryKey: ["/api/menu/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menu/analysis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menu/categories"] });
      toast({ title: `${ok} items imported${fail > 0 ? `. ${fail} rows had errors.` : "."}` });
      setCsvPreview(null);
    },
  });

  useMemo(() => {
    if (categories.length === 0 && !catsLoading && items.length === 0 && user) {
      initDefaultCategories.mutate();
    }
  }, [catsLoading]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam === "matrix" || tabParam === "items" || tabParam === "report") {
      setActiveTab(tabParam);
    } else if (items.length > 0 && activeTab === "items") {
      setActiveTab("matrix");
    }
  }, [items.length]);

  function openAddItem() {
    setEditingItem(null);
    setItemName(""); setItemCategory(""); setItemDescription("");
    setItemPrice(""); setItemCost(""); setItemUnits(""); setItemNotes("");
    setItemActive(true);
    setShowItemModal(true);
  }

  function openEditItem(item: MenuItem & { quadrant?: string }) {
    setEditingItem(item);
    setItemName(item.name);
    setItemCategory(item.categoryId ? String(item.categoryId) : "");
    setItemDescription(item.description || "");
    setItemPrice(String(n(item.menuPrice)));
    setItemCost(String(n(item.itemCost)));
    setItemUnits(String(item.weeklyUnitsSold || 0));
    setItemNotes(item.notes || "");
    setItemActive(item.isActive !== false);
    setShowItemModal(true);
  }

  function closeItemModal() {
    setShowItemModal(false);
    setEditingItem(null);
  }

  function saveItem() {
    const data = {
      name: itemName,
      categoryId: itemCategory ? parseInt(itemCategory) : null,
      description: itemDescription || null,
      menuPrice: itemPrice,
      itemCost: itemCost,
      weeklyUnitsSold: parseInt(itemUnits) || 0,
      notes: itemNotes || null,
      isActive: itemActive,
    };
    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, data });
    } else {
      createItemMutation.mutate(data);
    }
  }

  const livePrice = parseFloat(itemPrice) || 0;
  const liveCost = parseFloat(itemCost) || 0;
  const liveUnits = parseInt(itemUnits) || 0;
  const liveFcPct = livePrice > 0 ? (liveCost / livePrice) * 100 : 0;
  const liveCM = livePrice - liveCost;
  const liveWeeklyRev = livePrice * liveUnits;
  const liveWeeklyCM = liveCM * liveUnits;

  const liveQuadrant = useMemo(() => {
    if (!analysis || analysis.summary.totalItems < 3) return null;
    const highPop = liveUnits >= analysis.summary.avgPopularity;
    const highCM = liveCM >= analysis.summary.avgCM;
    if (highPop && highCM) return "star";
    if (highPop && !highCM) return "plowhorse";
    if (!highPop && highCM) return "puzzle";
    return "dog";
  }, [analysis, liveUnits, liveCM]);

  const filteredItems = useMemo(() => {
    if (!analysis) return items;
    let list = analysis.items;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q));
    }
    if (filterCategory !== "all") {
      list = list.filter(i => String(i.categoryId) === filterCategory);
    }
    if (filterQuadrant !== "all") {
      list = list.filter(i => i.quadrant === filterQuadrant);
    }
    return list;
  }, [analysis, items, searchQuery, filterCategory, filterQuadrant]);

  const categoryMap = useMemo(() => {
    const m: Record<number, string> = {};
    categories.forEach(c => { m[c.id] = c.name; });
    return m;
  }, [categories]);

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) {
        setCsvErrors(["File must have a header row and at least one data row"]);
        return;
      }
      const rows: any[] = [];
      const errors: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        if (cols.length < 4) {
          errors.push(`Row ${i + 1}: not enough columns`);
          continue;
        }
        const [name, category, priceStr, costStr, unitsStr, desc] = cols;
        const price = parseFloat(priceStr);
        const cost = parseFloat(costStr);
        if (!name) { errors.push(`Row ${i + 1}: missing item name`); continue; }
        if (isNaN(price) || price <= 0) { errors.push(`Row ${i + 1}: invalid menu price`); continue; }
        if (isNaN(cost) || cost < 0) { errors.push(`Row ${i + 1}: invalid item cost`); continue; }
        rows.push({
          name,
          categoryName: category || "Uncategorized",
          menuPrice: price.toFixed(2),
          itemCost: cost.toFixed(2),
          weeklyUnitsSold: parseInt(unitsStr) || 0,
          description: desc || null,
        });
      }
      setCsvPreview(rows);
      setCsvErrors(errors);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function confirmCsvImport() {
    if (!csvPreview) return;
    const catMap: Record<string, number> = {};
    categories.forEach(c => { catMap[c.name.toLowerCase()] = c.id; });

    const itemsToCreate = [];
    for (const row of csvPreview) {
      let catId = catMap[row.categoryName.toLowerCase()];
      if (!catId && row.categoryName) {
        try {
          const res = await apiRequest("POST", "/api/menu/categories", { name: row.categoryName });
          const newCat = await res.json();
          catId = newCat.id;
          catMap[row.categoryName.toLowerCase()] = catId;
        } catch {}
      }
      itemsToCreate.push({
        name: row.name,
        categoryId: catId || null,
        menuPrice: row.menuPrice,
        itemCost: row.itemCost,
        weeklyUnitsSold: row.weeklyUnitsSold,
        description: row.description,
      });
    }
    importItemsMutation.mutate(itemsToCreate);
  }

  function downloadCsvTemplate() {
    const csv = `Item Name,Category,Menu Price,Item Cost,Weekly Units Sold,Description\nFilet Mignon,Entrées,38.00,14.20,42,8oz center cut\nChicken Fried Steak,Entrées,18.00,8.10,67,Hand-breaded with cream gravy\nVieux Carré,Cocktails,14.00,3.50,8,Classic New Orleans cocktail`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "menu-engineering-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    if (!analysis) return;
    const header = "Item,Category,Price,Cost,Food Cost %,Contribution Margin,Units/Wk,Weekly Revenue,Quadrant\n";
    const rows = analysis.items.map(i => {
      const cat = i.categoryId ? categoryMap[i.categoryId] || "" : "";
      return `"${i.name}","${cat}",${n(i.menuPrice).toFixed(2)},${n(i.itemCost).toFixed(2)},${n(i.foodCostPct).toFixed(1)},${n(i.contributionMargin).toFixed(2)},${i.weeklyUnitsSold || 0},${n(i.weeklyRevenue).toFixed(2)},${QUADRANT_LABELS[i.quadrant] || ""}`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const rn = handbookSettings?.restaurantName || "Restaurant";
    a.href = url; a.download = `${rn.replace(/\s+/g, "-")}-Menu-Engineering-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function printReport() {
    if (!analysis) return;
    const rn = handbookSettings?.restaurantName || user?.restaurantName || "Restaurant";
    const owner = handbookSettings?.ownerNames || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Owner";
    const s = analysis.summary;
    const target = s.foodCostTarget;

    let priorityActions = "";
    if (analysis.quadrants.dogs.length > 0) {
      const dogRevPct = analysis.summary.totalItems > 0
        ? ((analysis.quadrants.dogs.reduce((sum, d) => sum + n(d.weeklyRevenue), 0) /
          analysis.items.reduce((sum, i) => sum + n(i.weeklyRevenue), 0)) * 100).toFixed(0)
        : "0";
      priorityActions += `<li>Your ${analysis.quadrants.dogs.length} Dogs represent ${Math.round(analysis.quadrants.dogs.length / s.totalItems * 100)}% of your menu items but only ${dogRevPct}% of weekly revenue. Removing or repricing ${Math.min(5, analysis.quadrants.dogs.length)} of them would reduce menu complexity without meaningful revenue impact.</li>`;
    }
    if (analysis.quadrants.plowhorses.length > 0) {
      const phAvgFc = analysis.quadrants.plowhorses.reduce((sum, p) => sum + n(p.foodCostPct), 0) / analysis.quadrants.plowhorses.length;
      const phWeeklyRev = analysis.quadrants.plowhorses.reduce((sum, p) => sum + n(p.weeklyRevenue), 0);
      const revPct = analysis.items.reduce((sum, i) => sum + n(i.weeklyRevenue), 0) > 0
        ? ((phWeeklyRev / analysis.items.reduce((sum, i) => sum + n(i.weeklyRevenue), 0)) * 100).toFixed(0) : "0";
      const top5 = analysis.quadrants.plowhorses.slice(0, 5);
      const addlContrib = top5.reduce((sum, p) => sum + (p.weeklyUnitsSold || 0), 0);
      priorityActions += `<li>Your Plowhorses generate ${revPct}% of weekly revenue but run a ${phAvgFc.toFixed(0)}% average food cost${target ? ` — ${(phAvgFc - target).toFixed(0)}pts over your target` : ""}. A $1 price increase across your top ${Math.min(5, analysis.quadrants.plowhorses.length)} Plowhorses would generate an additional ${fmtDollar(addlContrib)} weekly contribution.</li>`;
    }
    if (analysis.quadrants.puzzles.length > 0) {
      const topPuzzle = analysis.quadrants.puzzles.sort((a, b) => n(b.contributionMargin) - n(a.contributionMargin))[0];
      priorityActions += `<li>Your Puzzles have the highest average contribution margin on the menu. ${topPuzzle.name} at ${fmtDollar(n(topPuzzle.contributionMargin))} contribution margin is being ordered only ${topPuzzle.weeklyUnitsSold || 0} times per week. It belongs in your server upsell script.</li>`;
    }

    const itemRows = analysis.items
      .sort((a, b) => {
        const qOrder: Record<string, number> = { star: 0, plowhorse: 1, puzzle: 2, dog: 3 };
        const diff = (qOrder[a.quadrant] || 0) - (qOrder[b.quadrant] || 0);
        if (diff !== 0) return diff;
        return n(b.contributionMargin) - n(a.contributionMargin);
      })
      .map(i => `<tr><td>${i.name}</td><td>${i.categoryId ? categoryMap[i.categoryId] || "" : ""}</td><td>${fmtDollar(n(i.menuPrice))}</td><td>${fmtDollar(n(i.itemCost))}</td><td>${fmtPct(n(i.foodCostPct))}</td><td>${fmtDollar(n(i.contributionMargin))}</td><td>${i.weeklyUnitsSold || 0}</td><td>${fmtDollar(n(i.weeklyRevenue))}</td><td>${QUADRANT_LABELS[i.quadrant] || ""}</td></tr>`)
      .join("");

    const pw = window.open("", "_blank");
    if (!pw) return;
    pw.document.write(`<!DOCTYPE html><html><head><title>${rn} - Menu Engineering Analysis</title>
<style>
@page { size: letter; margin: 0.75in; }
body { font-family: Georgia, serif; font-size: 10.5pt; line-height: 1.5; color: #111; max-width: 7.5in; margin: 0 auto; }
.cover { text-align: center; padding-top: 2.5in; page-break-after: always; }
.cover h1 { font-size: 24pt; margin: 0 0 4px; } .cover h2 { font-size: 14pt; font-weight: normal; color: #555; margin: 0 0 30px; }
.cover .date { font-size: 10pt; color: #777; }
h2 { font-size: 13pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin: 24px 0 12px; text-transform: uppercase; letter-spacing: 1px; }
table { width: 100%; border-collapse: collapse; font-size: 9pt; margin: 12px 0; }
th { background: #333; color: #fff; padding: 6px 8px; text-align: left; } td { padding: 5px 8px; border-bottom: 1px solid #ddd; }
tr:nth-child(even) { background: #f9f9f9; }
.metric-row { display: flex; gap: 16px; margin: 8px 0; } .metric { flex: 1; }
.metric label { font-size: 9pt; color: #666; text-transform: uppercase; } .metric .val { font-size: 14pt; font-weight: bold; }
ul { margin: 8px 0; padding-left: 20px; } li { margin: 6px 0; font-style: italic; }
.quad-section { margin: 16px 0; } .quad-section h3 { font-size: 11pt; }
</style></head><body>
<div class="cover"><h1>${rn}</h1><h2>Menu Engineering Analysis</h2><p class="date">${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p><p style="margin-top:10px;font-size:10pt;color:#555;">Prepared by ${owner}</p><p style="font-size:9pt;color:#999;margin-top:30px;">${s.totalItems} items analyzed</p></div>
<h2>Executive Summary</h2>
<div class="metric-row"><div class="metric"><label>Total Active Items</label><div class="val">${s.totalItems}</div></div><div class="metric"><label>Avg Food Cost %</label><div class="val">${fmtPct(s.avgFoodCostPct)}${target ? ` <span style="font-size:9pt;color:${s.avgFoodCostPct > target ? '#c00' : '#090'}">(target: ${target}%)</span>` : ""}</div></div><div class="metric"><label>Avg Contribution Margin</label><div class="val">${fmtDollar(s.avgCM)}</div></div><div class="metric"><label>Total Weekly Contribution</label><div class="val">${fmtDollar(s.totalWeeklyContribution)}</div></div></div>
<div class="metric-row"><div class="metric"><label>Stars</label><div class="val">${s.stars} items (${s.totalItems > 0 ? Math.round(s.stars/s.totalItems*100) : 0}%)</div></div><div class="metric"><label>Plowhorses</label><div class="val">${s.plowhorses} items (${s.totalItems > 0 ? Math.round(s.plowhorses/s.totalItems*100) : 0}%)</div></div><div class="metric"><label>Puzzles</label><div class="val">${s.puzzles} items (${s.totalItems > 0 ? Math.round(s.puzzles/s.totalItems*100) : 0}%)</div></div><div class="metric"><label>Dogs</label><div class="val">${s.dogs} items (${s.totalItems > 0 ? Math.round(s.dogs/s.totalItems*100) : 0}%)</div></div></div>
<h2>Priority Actions</h2><ul>${priorityActions || "<li>Add more items to generate priority actions.</li>"}</ul>
<h2>Full Item Analysis</h2><table><thead><tr><th>Item</th><th>Category</th><th>Price</th><th>Cost</th><th>FC%</th><th>CM</th><th>Units/Wk</th><th>Weekly Rev</th><th>Quadrant</th></tr></thead><tbody>${itemRows}</tbody></table>
</body></html>`);
    pw.document.close();
    pw.focus();
    setTimeout(() => pw.print(), 400);
  }

  if (!user) return null;

  return (
    <UpgradeGate domain="menu-engineering">
      <div className="min-h-screen" style={{ backgroundColor: "#0f1117" }}>
        <header className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between" style={{ backgroundColor: "#0f1117", borderBottom: "1px solid #1a1d2e" }}>
          <div className="flex items-center gap-3">
            <Link href="/domain/costs">
              <Button variant="ghost" size="icon" className="text-white" data-testid="btn-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white" data-testid="text-page-title">Menu Engineering</h1>
              <p className="text-xs" style={{ color: "#9ca3af" }}>Analyze every item on your menu</p>
            </div>
          </div>
        </header>

        {/* Tab bar */}
        <div className="px-4 pt-3 flex gap-1" style={{ borderBottom: "1px solid #1a1d2e" }}>
          {[
            { key: "matrix" as const, label: "Matrix", icon: BarChart3 },
            { key: "items" as const, label: "Menu Items", icon: FileText },
            { key: "report" as const, label: "Report", icon: TrendingUp },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-4 py-2.5 text-sm font-medium rounded-t-lg border-none cursor-pointer flex items-center gap-1.5"
              style={{
                backgroundColor: activeTab === tab.key ? "#1a1d2e" : "transparent",
                color: activeTab === tab.key ? "#d4a017" : "#6b7280",
                borderBottom: activeTab === tab.key ? "2px solid #d4a017" : "2px solid transparent",
              }}
              data-testid={`tab-${tab.key}`}
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 max-w-7xl mx-auto">
          {/* ==================== MATRIX TAB ==================== */}
          {activeTab === "matrix" && (
            <div data-testid="matrix-tab">
              {/* Summary Stats Strip */}
              <div className="flex gap-3 overflow-x-auto pb-2 mb-6 scrollbar-thin" data-testid="summary-strip">
                {[
                  { label: "Total Menu Items", value: analysis?.summary.totalItems ?? 0, sub: "active items" },
                  { label: "Avg Food Cost %", value: fmtPct(analysis?.summary.avgFoodCostPct ?? 0), sub: foodCostTarget ? `Target: ${foodCostTarget}%` : null, subColor: analysis && foodCostTarget ? (analysis.summary.avgFoodCostPct > foodCostTarget ? "#d4a017" : "#22c55e") : "#9ca3af" },
                  { label: "Weekly Contribution", value: fmtDollar(analysis?.summary.totalWeeklyContribution ?? 0), sub: "total margin" },
                  { label: "Needs Attention", value: analysis?.summary.needsAttention ?? 0, sub: "Dogs + Puzzles", subColor: (analysis?.summary.needsAttention ?? 0) > 0 ? "#ef4444" : "#9ca3af" },
                ].map((card, i) => (
                  <div key={i} className="flex-shrink-0 min-w-[180px] rounded-lg p-3 border-l-[3px]" style={{ background: "#1a1d2e", borderLeftColor: "#b8860b" }}>
                    <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: "#9ca3af" }}>{card.label}</p>
                    <p className="text-xl font-bold text-white" data-testid={`stat-${i}`}>{card.value}</p>
                    {card.sub && <p className="text-xs mt-0.5" style={{ color: card.subColor || "#9ca3af" }}>{card.sub}</p>}
                  </div>
                ))}
              </div>

              {/* Scatter Plot Matrix */}
              {(!analysis || analysis.summary.totalItems < 3) ? (
                <div className="rounded-lg p-12 text-center" style={{ backgroundColor: "#1a1d2e", border: "1px solid #b8860b" }}>
                  <BarChart3 className="h-10 w-10 mx-auto mb-3" style={{ color: "#2a2d3e" }} />
                  <p className="text-white font-medium mb-1">Add at least 3 menu items with sales data to generate the matrix.</p>
                  <p className="text-sm" style={{ color: "#6b7280" }}>Go to the Menu Items tab to start adding items.</p>
                </div>
              ) : (
                <div className="rounded-lg p-4" style={{ backgroundColor: "#12141f", border: "1px solid #b8860b" }} data-testid="scatter-matrix">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white">Menu Engineering Matrix</h3>
                    <div className="flex gap-3">
                      {(["star", "plowhorse", "puzzle", "dog"] as const).map(q => (
                        <span key={q} className="flex items-center gap-1 text-[10px]">
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: QUADRANT_COLORS[q] }} />
                          <span style={{ color: "#9ca3af" }}>{QUADRANT_LABELS[q]}s</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
                      <XAxis
                        type="number"
                        dataKey="cm"
                        name="Contribution Margin"
                        tick={{ fill: "#9ca3af", fontSize: 11 }}
                        label={{ value: "Contribution Margin ($)", position: "bottom", fill: "#6b7280", fontSize: 11, offset: 20 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="units"
                        name="Weekly Units"
                        tick={{ fill: "#9ca3af", fontSize: 11 }}
                        label={{ value: "Popularity (Units/Week)", angle: -90, position: "insideLeft", fill: "#6b7280", fontSize: 11, offset: -10 }}
                      />
                      <ReferenceLine
                        x={analysis.summary.avgCM}
                        stroke="#6b7280"
                        strokeDasharray="5 5"
                        label={{ value: `Avg CM: ${fmtDollar(analysis.summary.avgCM)}`, fill: "#6b7280", fontSize: 10, position: "top" }}
                      />
                      <ReferenceLine
                        y={analysis.summary.avgPopularity}
                        stroke="#6b7280"
                        strokeDasharray="5 5"
                        label={{ value: `Avg Units: ${analysis.summary.avgPopularity.toFixed(0)}`, fill: "#6b7280", fontSize: 10, position: "right" }}
                      />
                      <Tooltip
                        content={({ payload }) => {
                          if (!payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "#1a1d2e", border: "1px solid #2a2d3e" }}>
                              <p className="font-semibold text-white mb-1">{d.name}</p>
                              <p style={{ color: "#9ca3af" }}>Price: {fmtDollar(d.price)} | Cost: {fmtPct(d.fcPct)}</p>
                              <p style={{ color: "#9ca3af" }}>CM: {fmtDollar(d.cm)} | {d.units} units/wk</p>
                              <p className="mt-1 font-medium flex items-center gap-1" style={{ color: QUADRANT_COLORS[d.quadrant] }}>{(() => { const Icon = QUADRANT_ICON_COMPONENTS[d.quadrant]; return Icon ? <Icon className="h-3 w-3" /> : null; })()} {QUADRANT_LABELS[d.quadrant]}</p>
                            </div>
                          );
                        }}
                      />
                      <Scatter
                        data={analysis.items.map(i => ({
                          cm: n(i.contributionMargin),
                          units: i.weeklyUnitsSold || 0,
                          name: i.name,
                          price: n(i.menuPrice),
                          fcPct: n(i.foodCostPct),
                          quadrant: i.quadrant,
                          rev: n(i.weeklyRevenue),
                        }))}
                      >
                        {analysis.items.map((item, idx) => {
                          const rev = n(item.weeklyRevenue);
                          const maxRev = Math.max(...analysis.items.map(i => n(i.weeklyRevenue)));
                          const size = Math.max(40, Math.min(200, (rev / (maxRev || 1)) * 180 + 40));
                          return (
                            <Cell
                              key={idx}
                              fill={QUADRANT_COLORS[item.quadrant] || "#6b7280"}
                              fillOpacity={0.7}
                              r={Math.sqrt(size / Math.PI)}
                            />
                          );
                        })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Quadrant Action Cards */}
              {analysis && analysis.summary.totalItems >= 3 && (
                <div className="mt-6 space-y-3" data-testid="quadrant-cards">
                  {([
                    { key: "star", title: "Stars — Protect and Promote", desc: "These are your best performers. High margin, high popularity. Don't change them — feature them.", items: analysis.quadrants.stars },
                    { key: "plowhorse", title: "Plowhorses — Reprice or Reengineer", desc: "Guests love these but the margin is thin. Raise the price, reduce the cost, or both.", items: analysis.quadrants.plowhorses },
                    { key: "puzzle", title: "Puzzles — Reposition or Promote", desc: "High margin but guests aren't ordering them. A positioning or awareness problem, not a price problem.", items: analysis.quadrants.puzzles },
                    { key: "dog", title: "Dogs — Evaluate for Removal", desc: "Low margin and low popularity. Every Dog on the menu costs you in complexity, inventory, and staff attention.", items: analysis.quadrants.dogs },
                  ] as const).map(section => {
                    const expanded = expandedQuadrants[section.key] !== false;
                    return (
                      <div key={section.key} className="rounded-lg overflow-hidden" style={{ backgroundColor: "#1a1d2e", border: `1px solid ${QUADRANT_COLORS[section.key]}40` }} data-testid={`quadrant-${section.key}`}>
                        <button
                          onClick={() => setExpandedQuadrants(prev => ({ ...prev, [section.key]: !prev[section.key] }))}
                          className="w-full flex items-center justify-between p-4 text-left bg-transparent border-none cursor-pointer"
                          style={{ borderLeft: `3px solid ${QUADRANT_COLORS[section.key]}` }}
                        >
                          <div>
                            <span className="text-sm font-semibold text-white flex items-center gap-1.5">{(() => { const Icon = QUADRANT_ICON_COMPONENTS[section.key]; return Icon ? <Icon className="h-4 w-4" style={{ color: QUADRANT_COLORS[section.key] }} /> : null; })()} {section.title}</span>
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${QUADRANT_COLORS[section.key]}20`, color: QUADRANT_COLORS[section.key] }}>{section.items.length}</span>
                          </div>
                          {expanded ? <ChevronDown className="h-4 w-4" style={{ color: "#6b7280" }} /> : <ChevronRight className="h-4 w-4" style={{ color: "#6b7280" }} />}
                        </button>
                        {expanded && (
                          <div className="px-4 pb-4">
                            <p className="text-xs mb-3" style={{ color: "#9ca3af" }}>{section.desc}</p>
                            {section.items.length === 0 ? (
                              <p className="text-xs" style={{ color: "#6b7280" }}>No items in this quadrant.</p>
                            ) : (
                              <div className="space-y-2">
                                {section.items.map(item => (
                                  <div key={item.id} className="rounded p-3" style={{ backgroundColor: "#12141f" }}>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                                      <span className="font-medium text-white min-w-[140px]">{item.name}</span>
                                      <span style={{ color: "#9ca3af" }}>{fmtDollar(n(item.menuPrice))}</span>
                                      <span style={{ color: "#9ca3af" }}>Cost: {fmtDollar(n(item.itemCost))} ({fmtPct(n(item.foodCostPct))})</span>
                                      <span style={{ color: "#9ca3af" }}>CM: {fmtDollar(n(item.contributionMargin))}</span>
                                      <span style={{ color: "#9ca3af" }}>{item.weeklyUnitsSold || 0} sold/wk</span>
                                    </div>
                                    <p className="text-xs mt-1.5" style={{ color: QUADRANT_COLORS[section.key] }}>
                                      → {getQuadrantAction(section.key, item)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================== MENU ITEMS TAB ==================== */}
          {activeTab === "items" && (
            <div data-testid="items-tab">
              {/* Category pills */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-thin" data-testid="category-pills">
                <button
                  onClick={() => setFilterCategory("all")}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border-none cursor-pointer"
                  style={{
                    backgroundColor: filterCategory === "all" ? "#d4a017" : "#1a1d2e",
                    color: filterCategory === "all" ? "#0f1117" : "#9ca3af",
                  }}
                  data-testid="pill-all"
                >
                  All
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setFilterCategory(String(cat.id))}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border-none cursor-pointer"
                    style={{
                      backgroundColor: filterCategory === String(cat.id) ? "#d4a017" : "#1a1d2e",
                      color: filterCategory === String(cat.id) ? "#0f1117" : "#9ca3af",
                    }}
                    data-testid={`pill-cat-${cat.id}`}
                  >
                    {cat.name}
                  </button>
                ))}
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border-none cursor-pointer flex items-center gap-1"
                  style={{ backgroundColor: "#1a1d2e", color: "#d4a017" }}
                  data-testid="btn-add-category"
                >
                  <Plus className="h-3 w-3" /> Add Category
                </button>
              </div>

              {/* Filter bar */}
              <div className="flex flex-wrap gap-3 mb-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#6b7280" }} />
                  <Input
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-sm"
                    style={{ backgroundColor: "#1a1d2e", borderColor: "#2a2d3e", color: "#e5e7eb" }}
                    data-testid="input-search"
                  />
                </div>
                <Select value={filterQuadrant} onValueChange={setFilterQuadrant}>
                  <SelectTrigger className="w-[150px] text-sm" style={{ backgroundColor: "#1a1d2e", borderColor: "#2a2d3e", color: "#e5e7eb" }} data-testid="select-quadrant">
                    <SelectValue placeholder="All Quadrants" />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: "#1a1d2e", borderColor: "#2a2d3e" }}>
                    <SelectItem value="all">All Quadrants</SelectItem>
                    <SelectItem value="star">Stars</SelectItem>
                    <SelectItem value="plowhorse">Plowhorses</SelectItem>
                    <SelectItem value="puzzle">Puzzles</SelectItem>
                    <SelectItem value="dog">Dogs</SelectItem>
                  </SelectContent>
                </Select>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
                <Button
                  variant="ghost"
                  className="text-sm"
                  style={{ color: "#9ca3af" }}
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="btn-import-csv"
                >
                  <Upload className="h-4 w-4 mr-1" /> Import CSV
                </Button>
                <Button
                  onClick={openAddItem}
                  className="text-sm font-semibold"
                  style={{ backgroundColor: "#d4a017", color: "#0f1117" }}
                  data-testid="btn-add-item"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>

              {/* CSV Preview */}
              {csvPreview && (
                <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: "#1a1d2e", border: "1px solid #b8860b" }} data-testid="csv-preview">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white">CSV Import Preview — {csvPreview.length} items</h3>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setCsvPreview(null)} className="text-xs" style={{ color: "#9ca3af" }}>Cancel</Button>
                      <Button size="sm" onClick={confirmCsvImport} disabled={importItemsMutation.isPending} className="text-xs font-semibold" style={{ backgroundColor: "#d4a017", color: "#0f1117" }} data-testid="btn-confirm-import">
                        {importItemsMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                        Import {csvPreview.length} Items
                      </Button>
                    </div>
                  </div>
                  {csvErrors.length > 0 && (
                    <div className="mb-3 p-2 rounded text-xs" style={{ backgroundColor: "#ef444420", color: "#ef4444" }}>
                      {csvErrors.map((e, i) => <p key={i}>{e}</p>)}
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ backgroundColor: "#b8860b", color: "#0f1117" }}>
                          <th className="px-3 py-2 text-left font-semibold">Item</th>
                          <th className="px-3 py-2 text-left font-semibold">Category</th>
                          <th className="px-3 py-2 text-right font-semibold">Price</th>
                          <th className="px-3 py-2 text-right font-semibold">Cost</th>
                          <th className="px-3 py-2 text-right font-semibold">Units/Wk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.map((row, i) => (
                          <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#1a1d2e" : "#12141f" }}>
                            <td className="px-3 py-2 text-white">{row.name}</td>
                            <td className="px-3 py-2" style={{ color: "#9ca3af" }}>{row.categoryName}</td>
                            <td className="px-3 py-2 text-right text-white">${row.menuPrice}</td>
                            <td className="px-3 py-2 text-right text-white">${row.itemCost}</td>
                            <td className="px-3 py-2 text-right text-white">{row.weeklyUnitsSold}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {items.length === 0 && !itemsLoading ? (
                <div className="rounded-lg p-12 text-center" style={{ backgroundColor: "#1a1d2e" }} data-testid="empty-state">
                  <FileText className="h-10 w-10 mx-auto mb-3" style={{ color: "#2a2d3e" }} />
                  <p className="text-white font-medium mb-1">No menu items yet.</p>
                  <p className="text-sm mb-4" style={{ color: "#6b7280" }}>Add your first item to start engineering your menu.</p>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={openAddItem} className="text-sm font-semibold" style={{ backgroundColor: "#d4a017", color: "#0f1117" }} data-testid="btn-add-first">
                      <Plus className="h-4 w-4 mr-1" /> Add Item
                    </Button>
                    <Button variant="ghost" className="text-sm" style={{ color: "#9ca3af" }} onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-1" /> Import CSV
                    </Button>
                  </div>
                  <button onClick={downloadCsvTemplate} className="mt-3 text-[11px] underline bg-transparent border-none cursor-pointer" style={{ color: "#d4a017" }} data-testid="btn-download-template">
                    Download CSV template
                  </button>
                </div>
              ) : (
                <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "#1a1d2e" }} data-testid="items-table">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: "#b8860b", color: "#0f1117" }}>
                          <th className="px-3 py-2.5 text-left font-semibold">Item</th>
                          <th className="px-3 py-2.5 text-left font-semibold hidden md:table-cell">Category</th>
                          <th className="px-3 py-2.5 text-right font-semibold">Price</th>
                          <th className="px-3 py-2.5 text-right font-semibold">Cost</th>
                          <th className="px-3 py-2.5 text-right font-semibold">FC%</th>
                          <th className="px-3 py-2.5 text-right font-semibold hidden sm:table-cell">CM</th>
                          <th className="px-3 py-2.5 text-right font-semibold hidden lg:table-cell">Units/Wk</th>
                          <th className="px-3 py-2.5 text-right font-semibold hidden lg:table-cell">Wkly Rev</th>
                          <th className="px-3 py-2.5 text-center font-semibold">Quadrant</th>
                          <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.map((item, idx) => (
                          <tr key={item.id} style={{ backgroundColor: idx % 2 === 0 ? "#1a1d2e" : "#12141f" }} data-testid={`row-item-${item.id}`}>
                            <td className="px-3 py-2.5 text-white font-medium">{item.name}</td>
                            <td className="px-3 py-2.5 hidden md:table-cell" style={{ color: "#9ca3af" }}>{item.categoryId ? categoryMap[item.categoryId] || "—" : "—"}</td>
                            <td className="px-3 py-2.5 text-right text-white">{fmtDollar(n(item.menuPrice))}</td>
                            <td className="px-3 py-2.5 text-right text-white">{fmtDollar(n(item.itemCost))}</td>
                            <td className="px-3 py-2.5 text-right font-medium" style={{ color: foodCostColor(n(item.foodCostPct), foodCostTarget) }}>{fmtPct(n(item.foodCostPct))}</td>
                            <td className="px-3 py-2.5 text-right text-white hidden sm:table-cell">{fmtDollar(n(item.contributionMargin))}</td>
                            <td className="px-3 py-2.5 text-right hidden lg:table-cell" style={{ color: "#9ca3af" }}>{item.weeklyUnitsSold || 0}</td>
                            <td className="px-3 py-2.5 text-right hidden lg:table-cell" style={{ color: "#9ca3af" }}>{fmtDollar(n(item.weeklyRevenue))}</td>
                            <td className="px-3 py-2.5 text-center">
                              {"quadrant" in item && (item as any).quadrant ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${QUADRANT_COLORS[(item as any).quadrant]}20`, color: QUADRANT_COLORS[(item as any).quadrant] }}>
                                  {QUADRANT_LABELS[(item as any).quadrant]}
                                </span>
                              ) : (
                                <span className="text-[10px]" style={{ color: "#6b7280" }}>—</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <div className="flex justify-end gap-1">
                                <button onClick={() => openEditItem(item)} className="p-1.5 rounded bg-transparent border-none cursor-pointer" style={{ color: "#9ca3af" }} data-testid={`btn-edit-${item.id}`}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Delete "${item.name}"?`)) deleteItemMutation.mutate(item.id);
                                  }}
                                  className="p-1.5 rounded bg-transparent border-none cursor-pointer"
                                  style={{ color: "#ef4444" }}
                                  data-testid={`btn-delete-${item.id}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== REPORT TAB ==================== */}
          {activeTab === "report" && (
            <div data-testid="report-tab">
              {(!analysis || analysis.summary.totalItems === 0) ? (
                <div className="rounded-lg p-12 text-center" style={{ backgroundColor: "#1a1d2e" }}>
                  <TrendingUp className="h-10 w-10 mx-auto mb-3" style={{ color: "#2a2d3e" }} />
                  <p className="text-white font-medium mb-1">No data for report yet.</p>
                  <p className="text-sm" style={{ color: "#6b7280" }}>Add menu items to generate your analysis report.</p>
                </div>
              ) : (
                <>
                  {/* Action bar */}
                  <div className="flex items-center gap-2 p-3 rounded-lg mb-4" style={{ backgroundColor: "#1a1d2e" }} data-testid="report-actions">
                    <Button variant="ghost" className="text-white text-xs" onClick={printReport} data-testid="btn-print-report">
                      <Printer className="h-4 w-4 mr-1" /> Print Report
                    </Button>
                    <Button variant="ghost" className="text-white text-xs" onClick={() => { printReport(); toast({ title: 'Select "Save as PDF" in the print dialog' }); }} data-testid="btn-pdf-report">
                      <Download className="h-4 w-4 mr-1" /> Download PDF
                    </Button>
                    <Button variant="ghost" className="text-white text-xs" onClick={exportCsv} data-testid="btn-csv-export">
                      <FileText className="h-4 w-4 mr-1" /> Export CSV
                    </Button>
                  </div>

                  {/* Executive Summary */}
                  <div className="rounded-lg p-6 mb-4" style={{ backgroundColor: "#1a1d2e" }}>
                    <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "#d4a017" }}>Executive Summary</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-[11px] uppercase" style={{ color: "#6b7280" }}>Total Active Items</p>
                        <p className="text-2xl font-bold text-white">{analysis.summary.totalItems}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase" style={{ color: "#6b7280" }}>Avg Food Cost %</p>
                        <p className="text-2xl font-bold" style={{ color: foodCostColor(analysis.summary.avgFoodCostPct, foodCostTarget) }}>
                          {fmtPct(analysis.summary.avgFoodCostPct)}
                        </p>
                        {foodCostTarget && (
                          <p className="text-xs" style={{ color: analysis.summary.avgFoodCostPct > foodCostTarget ? "#d4a017" : "#22c55e" }}>
                            Target: {foodCostTarget}% ({analysis.summary.avgFoodCostPct > foodCostTarget ? "+" : ""}{(analysis.summary.avgFoodCostPct - foodCostTarget).toFixed(1)}pts)
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] uppercase" style={{ color: "#6b7280" }}>Avg Contribution Margin</p>
                        <p className="text-2xl font-bold text-white">{fmtDollar(analysis.summary.avgCM)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase" style={{ color: "#6b7280" }}>Total Weekly Contribution</p>
                        <p className="text-2xl font-bold text-white">{fmtDollar(analysis.summary.totalWeeklyContribution)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: "Stars", count: analysis.summary.stars, color: QUADRANT_COLORS.star },
                        { label: "Plowhorses", count: analysis.summary.plowhorses, color: QUADRANT_COLORS.plowhorse },
                        { label: "Puzzles", count: analysis.summary.puzzles, color: QUADRANT_COLORS.puzzle },
                        { label: "Dogs", count: analysis.summary.dogs, color: QUADRANT_COLORS.dog },
                      ].map(q => (
                        <div key={q.label} className="rounded p-3" style={{ backgroundColor: "#12141f", borderLeft: `3px solid ${q.color}` }}>
                          <p className="text-xs" style={{ color: "#6b7280" }}>{q.label}</p>
                          <p className="text-lg font-bold text-white">{q.count} <span className="text-xs font-normal" style={{ color: "#6b7280" }}>({analysis.summary.totalItems > 0 ? Math.round(q.count / analysis.summary.totalItems * 100) : 0}%)</span></p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Priority Actions */}
                  <div className="rounded-lg p-6 mb-4" style={{ backgroundColor: "#1a1d2e" }}>
                    <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "#d4a017" }}>Priority Actions</h2>
                    <div className="space-y-3">
                      {analysis.quadrants.dogs.length > 0 && (() => {
                        const totalRev = analysis.items.reduce((s, i) => s + n(i.weeklyRevenue), 0);
                        const dogRev = analysis.quadrants.dogs.reduce((s, d) => s + n(d.weeklyRevenue), 0);
                        const dogRevPct = totalRev > 0 ? (dogRev / totalRev * 100).toFixed(0) : "0";
                        return (
                          <div className="flex gap-3 p-3 rounded" style={{ backgroundColor: "#12141f" }}>
                            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
                            <p className="text-sm text-white leading-relaxed">
                              Your {analysis.quadrants.dogs.length} Dogs represent {Math.round(analysis.quadrants.dogs.length / analysis.summary.totalItems * 100)}% of your menu items but only {dogRevPct}% of weekly revenue. Removing or repricing {Math.min(5, analysis.quadrants.dogs.length)} of them would reduce menu complexity without meaningful revenue impact.
                            </p>
                          </div>
                        );
                      })()}
                      {analysis.quadrants.plowhorses.length > 0 && (() => {
                        const phAvgFc = analysis.quadrants.plowhorses.reduce((s, p) => s + n(p.foodCostPct), 0) / analysis.quadrants.plowhorses.length;
                        const totalRev = analysis.items.reduce((s, i) => s + n(i.weeklyRevenue), 0);
                        const phRev = analysis.quadrants.plowhorses.reduce((s, p) => s + n(p.weeklyRevenue), 0);
                        const revPct = totalRev > 0 ? (phRev / totalRev * 100).toFixed(0) : "0";
                        const top5 = analysis.quadrants.plowhorses.slice(0, 5);
                        const addl = top5.reduce((s, p) => s + (p.weeklyUnitsSold || 0), 0);
                        return (
                          <div className="flex gap-3 p-3 rounded" style={{ backgroundColor: "#12141f" }}>
                            <Target className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#3b82f6" }} />
                            <p className="text-sm text-white leading-relaxed">
                              Your Plowhorses generate {revPct}% of weekly revenue but run a {phAvgFc.toFixed(0)}% average food cost{foodCostTarget ? ` — ${(phAvgFc - foodCostTarget).toFixed(0)}pts over your target` : ""}. A $1 price increase across your top {Math.min(5, analysis.quadrants.plowhorses.length)} Plowhorses would generate an additional {fmtDollar(addl)} weekly contribution.
                            </p>
                          </div>
                        );
                      })()}
                      {analysis.quadrants.puzzles.length > 0 && (() => {
                        const topPuzzle = [...analysis.quadrants.puzzles].sort((a, b) => n(b.contributionMargin) - n(a.contributionMargin))[0];
                        return (
                          <div className="flex gap-3 p-3 rounded" style={{ backgroundColor: "#12141f" }}>
                            <Star className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#8b5cf6" }} />
                            <p className="text-sm text-white leading-relaxed">
                              Your Puzzles have the highest average contribution margin on the menu. {topPuzzle.name} at {fmtDollar(n(topPuzzle.contributionMargin))} contribution margin is being ordered only {topPuzzle.weeklyUnitsSold || 0} times per week. It belongs in your server upsell script.
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Full Item Table */}
                  <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "#1a1d2e" }}>
                    <h2 className="text-sm font-bold uppercase tracking-wider p-4 pb-2" style={{ color: "#d4a017" }}>Full Item Analysis</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ backgroundColor: "#b8860b", color: "#0f1117" }}>
                            <th className="px-3 py-2 text-left font-semibold">Item</th>
                            <th className="px-3 py-2 text-left font-semibold">Category</th>
                            <th className="px-3 py-2 text-right font-semibold">Price</th>
                            <th className="px-3 py-2 text-right font-semibold">Cost</th>
                            <th className="px-3 py-2 text-right font-semibold">FC%</th>
                            <th className="px-3 py-2 text-right font-semibold">CM</th>
                            <th className="px-3 py-2 text-right font-semibold">Units/Wk</th>
                            <th className="px-3 py-2 text-right font-semibold">Wkly Rev</th>
                            <th className="px-3 py-2 text-center font-semibold">Quadrant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysis.items
                            .sort((a, b) => {
                              const qo: Record<string, number> = { star: 0, plowhorse: 1, puzzle: 2, dog: 3 };
                              const diff = (qo[a.quadrant] || 0) - (qo[b.quadrant] || 0);
                              if (diff !== 0) return diff;
                              return n(b.contributionMargin) - n(a.contributionMargin);
                            })
                            .map((item, idx) => (
                              <tr key={item.id} style={{ backgroundColor: idx % 2 === 0 ? "#1a1d2e" : "#12141f" }}>
                                <td className="px-3 py-2 text-white font-medium">{item.name}</td>
                                <td className="px-3 py-2" style={{ color: "#9ca3af" }}>{item.categoryId ? categoryMap[item.categoryId] || "" : ""}</td>
                                <td className="px-3 py-2 text-right text-white">{fmtDollar(n(item.menuPrice))}</td>
                                <td className="px-3 py-2 text-right text-white">{fmtDollar(n(item.itemCost))}</td>
                                <td className="px-3 py-2 text-right" style={{ color: foodCostColor(n(item.foodCostPct), foodCostTarget) }}>{fmtPct(n(item.foodCostPct))}</td>
                                <td className="px-3 py-2 text-right text-white">{fmtDollar(n(item.contributionMargin))}</td>
                                <td className="px-3 py-2 text-right" style={{ color: "#9ca3af" }}>{item.weeklyUnitsSold || 0}</td>
                                <td className="px-3 py-2 text-right" style={{ color: "#9ca3af" }}>{fmtDollar(n(item.weeklyRevenue))}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${QUADRANT_COLORS[item.quadrant]}20`, color: QUADRANT_COLORS[item.quadrant] }}>
                                    {QUADRANT_LABELS[item.quadrant]}
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ==================== ADD/EDIT ITEM MODAL ==================== */}
        <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
          <DialogContent className="max-w-[580px]" style={{ backgroundColor: "#1a1d2e", border: "1px solid #b8860b" }}>
            <DialogHeader>
              <DialogTitle className="text-white">{editingItem ? "Edit Item" : "Add Menu Item"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <Label className="text-xs text-white">Item Name *</Label>
                <Input value={itemName} onChange={e => setItemName(e.target.value)} placeholder="e.g. Filet Mignon" style={{ backgroundColor: "#12141f", borderColor: "#2a2d3e", color: "#e5e7eb" }} data-testid="input-item-name" />
              </div>
              <div>
                <Label className="text-xs text-white">Category</Label>
                <Select value={itemCategory} onValueChange={setItemCategory}>
                  <SelectTrigger style={{ backgroundColor: "#12141f", borderColor: "#2a2d3e", color: "#e5e7eb" }} data-testid="select-item-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: "#1a1d2e", borderColor: "#2a2d3e" }}>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-white">Description (optional)</Label>
                <Input value={itemDescription} onChange={e => setItemDescription(e.target.value)} placeholder="For your reference" style={{ backgroundColor: "#12141f", borderColor: "#2a2d3e", color: "#e5e7eb" }} data-testid="input-item-desc" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-white">Menu Price *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "#6b7280" }} />
                    <Input type="number" step="0.01" min="0" value={itemPrice} onChange={e => setItemPrice(e.target.value)} className="pl-8" style={{ backgroundColor: "#12141f", borderColor: "#2a2d3e", color: "#e5e7eb" }} data-testid="input-item-price" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-white">Item Cost *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "#6b7280" }} />
                    <Input type="number" step="0.01" min="0" value={itemCost} onChange={e => setItemCost(e.target.value)} className="pl-8" style={{ backgroundColor: "#12141f", borderColor: "#2a2d3e", color: "#e5e7eb" }} data-testid="input-item-cost" />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-xs text-white">Est. Weekly Units Sold</Label>
                <Input type="number" min="0" value={itemUnits} onChange={e => setItemUnits(e.target.value)} placeholder="0" style={{ backgroundColor: "#12141f", borderColor: "#2a2d3e", color: "#e5e7eb" }} data-testid="input-item-units" />
                <p className="text-[10px] mt-1" style={{ color: "#6b7280" }}>How many of this item do you sell in a typical week? This determines where it falls on the popularity axis.</p>
              </div>
              <div>
                <Label className="text-xs text-white">Notes (optional)</Label>
                <Textarea value={itemNotes} onChange={e => setItemNotes(e.target.value)} rows={2} style={{ backgroundColor: "#12141f", borderColor: "#2a2d3e", color: "#e5e7eb" }} data-testid="input-item-notes" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={itemActive} onChange={e => setItemActive(e.target.checked)} className="rounded" data-testid="check-item-active" />
                <Label className="text-xs text-white cursor-pointer">Include in menu engineering analysis</Label>
              </div>

              {/* Live Preview */}
              {(livePrice > 0 || liveCost > 0) && (
                <div className="rounded-lg p-4" style={{ backgroundColor: "#12141f", border: "1px solid #2a2d3e", transition: "all 0.15s ease" }} data-testid="live-preview">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] uppercase" style={{ color: "#6b7280" }}>Food Cost</p>
                      <p className="text-lg font-bold" style={{ color: foodCostColor(liveFcPct, foodCostTarget) }}>
                        {fmtPct(liveFcPct)}
                        {foodCostTarget && <span className="text-xs ml-1" style={{ color: liveFcPct > foodCostTarget ? "#d4a017" : "#22c55e" }}>{liveFcPct > foodCostTarget ? "▲" : "▼"} target</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase" style={{ color: "#6b7280" }}>Contribution</p>
                      <p className="text-lg font-bold text-white">{fmtDollar(liveCM)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase" style={{ color: "#6b7280" }}>Weekly Revenue</p>
                      <p className="text-lg font-bold text-white">{fmtDollar(liveWeeklyRev)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase" style={{ color: "#6b7280" }}>Weekly CM</p>
                      <p className="text-lg font-bold text-white">{fmtDollar(liveWeeklyCM)}</p>
                    </div>
                  </div>
                  {liveQuadrant && liveUnits > 0 && (
                    <div className="mt-3 pt-3" style={{ borderTop: "1px solid #2a2d3e" }}>
                      <p className="text-xs" style={{ color: "#9ca3af" }}>
                        Based on your current menu, this item would be: <span className="font-semibold inline-flex items-center gap-1" style={{ color: QUADRANT_COLORS[liveQuadrant] }}>{(() => { const Icon = QUADRANT_ICON_COMPONENTS[liveQuadrant]; return Icon ? <Icon className="h-3 w-3" /> : null; })()} {QUADRANT_LABELS[liveQuadrant].toUpperCase()}</span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={saveItem}
                disabled={!itemName || !itemPrice || !itemCost || createItemMutation.isPending || updateItemMutation.isPending}
                className="w-full font-semibold"
                style={{ backgroundColor: "#d4a017", color: "#0f1117" }}
                data-testid="btn-save-item"
              >
                {(createItemMutation.isPending || updateItemMutation.isPending) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Item
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ==================== ADD CATEGORY MODAL ==================== */}
        <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
          <DialogContent className="max-w-[400px]" style={{ backgroundColor: "#1a1d2e", border: "1px solid #b8860b" }}>
            <DialogHeader>
              <DialogTitle className="text-white">Add Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder="e.g. Appetizers"
                style={{ backgroundColor: "#12141f", borderColor: "#2a2d3e", color: "#e5e7eb" }}
                data-testid="input-category-name"
              />
              <Button
                onClick={() => newCategoryName.trim() && createCategoryMutation.mutate(newCategoryName.trim())}
                disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                className="w-full font-semibold"
                style={{ backgroundColor: "#d4a017", color: "#0f1117" }}
                data-testid="btn-save-category"
              >
                Add Category
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </UpgradeGate>
  );
}
