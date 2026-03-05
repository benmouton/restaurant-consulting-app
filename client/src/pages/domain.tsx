import { useState, useRef, useEffect, useMemo } from "react";
import { extractTextFromImage } from '../lib/visionOCR';
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { jsPDF } from "jspdf";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { useTierAccess } from "@/hooks/use-tier-access";
import { UpgradeGate } from "@/components/upgrade-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  ArrowLeft,
  ChefHat,
  Lightbulb,
  FileOutput,
  FileText,
  CheckSquare,
  MessageSquare as ScriptIcon,
  LogOut,
  Calculator,
  DollarSign,
  Percent,
  MessageSquare,
  Star,
  Copy,
  Loader2,
  Sparkles,
  Calendar,
  Clock,
  RefreshCw,
  Image,
  X,
  Upload,
  Users,
  AlertTriangle,
  Shield,
  Wrench,
  Printer,
  Send,
  ChevronLeft,
  Eye,
  Trash2,
  Settings,
  Package,
  Bell,
  BellRing,
  Save,
  TrendingUp,
  TrendingDown,
  Check,
  Info,
  LayoutDashboard,
  Plus,
  Phone,
  Mail,
  Edit,
  Mic,
  History,
  Share2,
  Target,
  Flame,
  ThermometerSun,
  Utensils,
  XCircle,
  CheckCircle2,
  ArrowRight,
  Search,
  Lock,
  Zap,
  GraduationCap,
  ClipboardList,
  ClipboardCheck,
  Coffee,
  Moon,
  Sun,
  Sunrise,
  UtensilsCrossed,
  CloudSun,
  ChevronDown,
  Gauge,
  Timer,
  BookOpen,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SocialPostBuilder from "@/components/social-media/SocialPostBuilder";
import type { Domain, FrameworkContent } from "@shared/schema";

interface PlateIngredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  costPerUnit: string;
  category: string;
  wasteBuffer: string;
  calculatedCost: number;
}

const UNIT_CONVERSIONS: Record<string, number> = {
  lb: 16,
  oz: 1,
  each: 1,
  case: 1,
  gal: 128,
  cup: 8,
  tbsp: 0.5,
  tsp: 0.167,
};

const CATEGORY_WASTE_DEFAULTS: Record<string, string> = {
  protein: "5",
  produce: "10",
  dairy: "3",
  dry_goods: "2",
  other: "0",
};

const FOOD_COST_PRESETS = [
  { label: "Casual Dining", value: "28" },
  { label: "Brunch/Breakfast", value: "30" },
  { label: "Seafood/Fine Dining", value: "32" },
  { label: "Quick Service", value: "25" },
];

const CATEGORY_DOTS: Record<string, string> = {
  protein: '#f59e0b',
  produce: '#f97316',
  dairy: '#3b82f6',
  dry_goods: '#9ca3af',
  other: '#ffffff',
};

function MarginStatusStrip() {
  const { data: savedPlates } = useQuery<any[]>({ queryKey: ["/api/plates"] });
  const { data: foodCostPeriods } = useQuery<any[]>({ queryKey: ["/api/food-cost-periods"] });

  const plateCount = savedPlates?.length || 0;
  const highestCost = savedPlates && savedPlates.length > 0
    ? savedPlates.reduce((max: any, p: any) => parseFloat(p.totalCost) > parseFloat(max.totalCost) ? p : max, savedPlates[0])
    : null;

  const avgFC = foodCostPeriods && foodCostPeriods.length > 0
    ? foodCostPeriods.reduce((sum: number, p: any) => sum + parseFloat(p.actualFoodCostPercent || "0"), 0) / foodCostPeriods.length
    : null;
  const avgTarget = foodCostPeriods && foodCostPeriods.length > 0
    ? parseFloat(foodCostPeriods[0].targetFoodCostPercent || "28")
    : 28;
  const avgFCColor = avgFC !== null
    ? avgFC <= avgTarget ? '#22c55e' : avgFC <= avgTarget + 3 ? '#f59e0b' : '#ef4444'
    : '#9ca3af';

  const lastPeriod = foodCostPeriods && foodCostPeriods.length > 0 ? foodCostPeriods[0] : null;
  const lastPeriodStatus = lastPeriod
    ? parseFloat(lastPeriod.actualFoodCostPercent) <= parseFloat(lastPeriod.targetFoodCostPercent)
      ? `On target · ${lastPeriod.actualFoodCostPercent}%`
      : `Over target · ${lastPeriod.actualFoodCostPercent}%`
    : null;
  const lastPeriodColor = lastPeriod
    ? parseFloat(lastPeriod.actualFoodCostPercent) <= parseFloat(lastPeriod.targetFoodCostPercent) ? '#22c55e' : '#f59e0b'
    : '#9ca3af';

  const cards = [
    { label: "Average Food Cost %", value: avgFC !== null ? `${avgFC.toFixed(1)}%` : "No data yet", color: avgFCColor, muted: avgFC === null },
    { label: "Plates Costed", value: plateCount > 0 ? `${plateCount} plates saved` : "0 plates saved", color: '#d4a017', muted: plateCount === 0 },
    { label: "Highest Cost Plate", value: highestCost ? `${highestCost.name} · $${highestCost.totalCost}` : "--", color: '#d4a017', muted: !highestCost },
    { label: "Last Weekly Check", value: lastPeriod ? new Date(lastPeriod.periodEnd).toLocaleDateString() : "No check saved", sub: lastPeriodStatus, color: lastPeriodColor, muted: !lastPeriod },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 mb-6 scrollbar-thin" data-testid="margin-status-strip">
      {cards.map((card: any, i: number) => (
        <div key={i} className="flex-shrink-0 min-w-[180px] rounded-lg p-3 border-l-[3px]" style={{ background: '#1a1d2e', borderLeftColor: '#b8860b' }}>
          <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>{card.label}</p>
          <p className={`text-sm font-semibold truncate ${card.muted ? 'text-gray-500' : ''}`} style={!card.muted ? { color: card.color } : undefined} data-testid={`margin-strip-${i}`}>{card.value}</p>
          {card.sub && <p className="text-xs mt-0.5" style={{ color: card.color }}>{card.sub}</p>}
        </div>
      ))}
    </div>
  );
}

function FoodCostCalculator() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("plate-builder");
  const [showIngredientLibrary, setShowIngredientLibrary] = useState(false);
  const [plateSaved, setPlateSaved] = useState(false);
  const [weeklySaved, setWeeklySaved] = useState(false);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const [plateName, setPlateName] = useState("");
  const [plateIngredients, setPlateIngredients] = useState<PlateIngredient[]>([]);
  const [targetFoodCost, setTargetFoodCost] = useState("28");
  const [menuPrice, setMenuPrice] = useState("");

  const [newIngredient, setNewIngredient] = useState({
    name: "",
    quantity: "",
    unit: "oz",
    costPerUnit: "",
    category: "other",
  });

  const [weeklyPurchases, setWeeklyPurchases] = useState("");
  const [weeklySales, setWeeklySales] = useState("");
  const [targetWeeklyFC, setTargetWeeklyFC] = useState("28");

  const [localLibrary, setLocalLibrary] = useState<any[]>(() => {
    try {
      if (typeof window !== 'undefined') return JSON.parse(localStorage.getItem('trc_ingredient_library') || '[]');
      return [];
    } catch { return []; }
  });

  const saveToLocalLibrary = (ing: PlateIngredient) => {
    const entry = { name: ing.name, quantity: ing.quantity, unit: ing.unit, costPerUnit: ing.costPerUnit, category: ing.category };
    const exists = localLibrary.some((l: any) => l.name === ing.name && l.unit === ing.unit);
    if (exists) { toast({ title: `${ing.name} is already in your library` }); return; }
    const updated = [...localLibrary, entry];
    setLocalLibrary(updated);
    localStorage.setItem('trc_ingredient_library', JSON.stringify(updated));
    toast({ title: `${ing.name} saved to your ingredient library!` });
  };

  const removeFromLocalLibrary = (idx: number) => {
    const updated = localLibrary.filter((_: any, i: number) => i !== idx);
    setLocalLibrary(updated);
    localStorage.setItem('trc_ingredient_library', JSON.stringify(updated));
  };

  const loadFromLibrary = (lib: any) => {
    setNewIngredient({ name: lib.name, quantity: lib.quantity || "", unit: lib.unit, costPerUnit: lib.costPerUnit, category: lib.category });
  };

  const { data: savedIngredients } = useQuery<any[]>({
    queryKey: ["/api/ingredients"],
  });

  const { data: savedPlates } = useQuery<any[]>({
    queryKey: ["/api/plates"],
  });

  const { data: foodCostPeriods } = useQuery<any[]>({
    queryKey: ["/api/food-cost-periods"],
  });

  const calculateIngredientCost = (ing: typeof newIngredient): number => {
    const qty = parseFloat(ing.quantity) || 0;
    const cost = parseFloat(ing.costPerUnit) || 0;
    const waste = parseFloat(CATEGORY_WASTE_DEFAULTS[ing.category] || "0");
    const wasteMultiplier = 1 + (waste / 100);
    return qty * cost * wasteMultiplier;
  };

  const liveCostPreview = useMemo(() => {
    if (!newIngredient.name || !newIngredient.quantity || !newIngredient.costPerUnit) return null;
    const cost = calculateIngredientCost(newIngredient);
    if (cost <= 0) return null;
    const waste = CATEGORY_WASTE_DEFAULTS[newIngredient.category] || "0";
    const catLabel = newIngredient.category === "dry_goods" ? "Dry Goods" : newIngredient.category.charAt(0).toUpperCase() + newIngredient.category.slice(1);
    return { cost, waste, catLabel };
  }, [newIngredient]);

  const addIngredient = () => {
    if (!newIngredient.name || !newIngredient.quantity || !newIngredient.costPerUnit) {
      toast({ title: "Fill in ingredient name, amount, and cost", variant: "destructive" });
      return;
    }

    const calculatedCost = calculateIngredientCost(newIngredient);
    const id = Date.now().toString();
    const ingredient: PlateIngredient = {
      id,
      ...newIngredient,
      wasteBuffer: CATEGORY_WASTE_DEFAULTS[newIngredient.category] || "0",
      calculatedCost,
    };

    setPlateIngredients([...plateIngredients, ingredient]);
    setNewIngredient({ name: "", quantity: "", unit: "oz", costPerUnit: "", category: "other" });
    setJustAddedId(id);
    setTimeout(() => setJustAddedId(null), 600);
  };

  const removeIngredient = (id: string) => {
    setPlateIngredients(plateIngredients.filter(i => i.id !== id));
  };

  const selectSavedIngredient = (saved: any) => {
    setNewIngredient({
      name: saved.name,
      quantity: "",
      unit: saved.unit,
      costPerUnit: saved.costPerUnit,
      category: saved.category,
    });
  };

  const totalPlateCost = plateIngredients.reduce((sum, ing) => sum + ing.calculatedCost, 0);
  const targetFoodCostNum = parseFloat(targetFoodCost) || 28;
  const suggestedPrice = totalPlateCost > 0 ? totalPlateCost / (targetFoodCostNum / 100) : 0;
  const menuPriceNum = parseFloat(menuPrice) || 0;
  const actualFoodCostPercent = menuPriceNum > 0 ? (totalPlateCost / menuPriceNum) * 100 : 0;
  const marginDollar = menuPriceNum > 0 ? menuPriceNum - totalPlateCost : 0;
  const marginPercent = menuPriceNum > 0 ? (marginDollar / menuPriceNum) * 100 : 0;

  const getMarginStatus = () => {
    if (totalPlateCost === 0) return null;
    if (actualFoodCostPercent === 0 && menuPriceNum === 0) {
      if (suggestedPrice > 0) {
        return { color: "text-primary", bg: "bg-primary/10", message: `Price this at $${suggestedPrice.toFixed(2)} to hit ${targetFoodCost}% food cost` };
      }
      return null;
    }
    if (actualFoodCostPercent <= targetFoodCostNum - 3) {
      return { color: "text-green-600", bg: "bg-green-50 dark:bg-green-950", message: "Great margins! This plate is profitable." };
    }
    if (actualFoodCostPercent <= targetFoodCostNum + 2) {
      return { color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950", message: "Acceptable margins. Watch portion sizes." };
    }
    return { color: "text-red-600", bg: "bg-red-50 dark:bg-red-950", message: `High food cost! Raise price to $${suggestedPrice.toFixed(2)} or reduce portions.` };
  };

  const getPortionCostWarning = (ing: PlateIngredient): string | null => {
    const cost = parseFloat(ing.costPerUnit);
    if (isNaN(cost) || cost <= 0) return null;
    const thresholds: Record<string, number> = {
      oz: 8, lb: 30, each: 25, cup: 15, tbsp: 5,
    };
    const threshold = thresholds[ing.unit] || 20;
    if (cost > threshold) return `Double-check this cost — $${cost.toFixed(2)}/${ing.unit} seems high for ${ing.name}`;
    return null;
  };

  const marginStatus = getMarginStatus();

  const weeklyPurchasesNum = parseFloat(weeklyPurchases) || 0;
  const weeklySalesNum = parseFloat(weeklySales) || 0;
  const actualWeeklyFC = weeklySalesNum > 0 ? (weeklyPurchasesNum / weeklySalesNum) * 100 : 0;
  const targetWeeklyFCNum = parseFloat(targetWeeklyFC) || 28;
  const weeklyVariance = actualWeeklyFC - targetWeeklyFCNum;
  const dollarVariance = weeklySalesNum > 0 ? (weeklyVariance / 100) * weeklySalesNum : 0;

  const saveIngredientToLibrary = async (ing: PlateIngredient) => {
    try {
      await apiRequest("POST", "/api/ingredients", {
        name: ing.name,
        costPerUnit: ing.costPerUnit,
        unit: ing.unit,
        category: ing.category,
        wasteBuffer: ing.wasteBuffer,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ingredients"] });
      saveToLocalLibrary(ing);
    } catch (err) {
      toast({ title: "Failed to save ingredient", variant: "destructive" });
    }
  };

  const savePlate = async () => {
    if (!plateName || plateIngredients.length === 0) {
      toast({ title: "Add a name and at least one ingredient", variant: "destructive" });
      return;
    }
    try {
      await apiRequest("POST", "/api/plates", {
        name: plateName,
        ingredients: plateIngredients,
        totalCost: totalPlateCost.toFixed(2),
        menuPrice: menuPrice || null,
        foodCostPercent: actualFoodCostPercent > 0 ? actualFoodCostPercent.toFixed(1) : null,
        targetFoodCost,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/plates"] });
      toast({ title: "Plate saved!" });
      setPlateSaved(true);
      setTimeout(() => setPlateSaved(false), 2000);
    } catch (err) {
      toast({ title: "Failed to save plate", variant: "destructive" });
    }
  };

  const saveWeeklyData = async () => {
    if (!weeklyPurchases || !weeklySales) {
      toast({ title: "Enter both purchases and sales", variant: "destructive" });
      return;
    }
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    try {
      await apiRequest("POST", "/api/food-cost-periods", {
        periodType: "week",
        periodStart: weekAgo.toISOString().split("T")[0],
        periodEnd: today.toISOString().split("T")[0],
        totalPurchases: weeklyPurchases,
        totalSales: weeklySales,
        targetFoodCostPercent: targetWeeklyFC,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/food-cost-periods"] });
      toast({ title: "Week saved!" });
      setWeeklySaved(true);
      setTimeout(() => setWeeklySaved(false), 2000);
      setWeeklyPurchases("");
      setWeeklySales("");
    } catch (err) {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  const startNewPlate = () => {
    setPlateName("");
    setPlateIngredients([]);
    setMenuPrice("");
    setPlateSaved(false);
  };

  const loadPlateForEditing = (plate: any) => {
    setPlateName(plate.name);
    setPlateIngredients(plate.ingredients || []);
    setMenuPrice(plate.menuPrice || "");
    setTargetFoodCost(plate.targetFoodCost || "28");
    setActiveTab("plate-builder");
    toast({ title: `Loaded "${plate.name}" for editing` });
  };

  const fcStatusColor = (fc: number, target: number) => {
    if (fc <= target) return '#22c55e';
    if (fc <= target + 3) return '#f59e0b';
    return '#ef4444';
  };

  const displayFCPct = menuPriceNum > 0 ? actualFoodCostPercent : (suggestedPrice > 0 ? targetFoodCostNum : 0);
  const displayPrice = menuPriceNum > 0 ? menuPriceNum : suggestedPrice;

  return (
    <Card className="mb-8 relative overflow-hidden" style={{ background: '#1a1d2e', borderColor: '#2a2d3e' }}>
      <div className="absolute inset-0 rounded-lg pointer-events-none" style={{
        background: 'linear-gradient(90deg, transparent 0%, rgba(212,160,23,0.08) 50%, transparent 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 3s linear infinite',
      }} />
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" style={{ color: '#d4a017' }} />
          <span className="text-white">Food Cost Tools</span>
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-4 rounded-full" style={{ background: '#d4a017' }} />
          <CardDescription style={{ color: '#9ca3af' }}>
            Build plates, track costs, know if you're making money
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="border-b" style={{ borderColor: '#2a2d3e' }}>
            <TabsList className="grid w-full grid-cols-3 bg-transparent h-auto p-0">
              {[
                { value: "plate-builder", label: "New Plate", Icon: ChefHat },
                { value: "weekly-check", label: "Weekly Check", Icon: Calendar },
                { value: "saved", label: "Saved", Icon: Star },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  data-testid={`tab-${tab.value}`}
                  className="text-xs sm:text-sm py-2.5 px-1 rounded-none border-b-2 border-transparent data-[state=active]:border-b-0 data-[state=active]:bg-transparent"
                  style={{ color: activeTab === tab.value ? '#ffffff' : '#9ca3af', borderBottomColor: activeTab === tab.value ? '#d4a017' : 'transparent' }}
                >
                  <tab.Icon className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="plate-builder" className="space-y-6">
            <div>
              <Label htmlFor="plateName" className="text-base text-white">What are you costing?</Label>
              <Input
                id="plateName"
                placeholder="e.g., 8oz Ribeye with sides"
                className="mt-2 text-lg h-12 border-b-2 border-t-0 border-x-0 rounded-none focus:border-b-2"
                style={{ background: '#111827', borderBottomColor: '#374151' }}
                value={plateName}
                onChange={(e) => setPlateName(e.target.value)}
                data-testid="input-plate-name"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Label className="text-base text-white">Ingredients</Label>
                <div className="flex items-center gap-2">
                  {savedIngredients && savedIngredients.length > 0 && (
                    <Select onValueChange={(id) => {
                      const saved = savedIngredients.find((s: any) => s.id.toString() === id);
                      if (saved) selectSavedIngredient(saved);
                    }}>
                      <SelectTrigger className="w-40" style={{ background: '#111827', borderColor: '#374151' }} data-testid="select-saved-ingredient">
                        <SelectValue placeholder="Use saved..." />
                      </SelectTrigger>
                      <SelectContent>
                        {savedIngredients.map((s: any) => (
                          <SelectItem key={s.id} value={s.id.toString()}>{s.name} (${s.costPerUnit}/{s.unit})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <button onClick={() => setShowIngredientLibrary(!showIngredientLibrary)} className="text-xs px-2 py-1 rounded" style={{ color: '#d4a017', border: '1px solid rgba(212,160,23,0.3)' }} data-testid="btn-my-ingredients">
                    My Ingredients
                  </button>
                </div>
              </div>

              {showIngredientLibrary && (
                <div className="rounded-lg p-3 space-y-2" style={{ background: '#111827', border: '1px solid #2a2d3e', animation: 'slideDown 200ms ease' }}>
                  <p className="text-xs font-medium" style={{ color: '#d4a017' }}>Ingredient Library</p>
                  {localLibrary.length === 0 ? (
                    <p className="text-xs" style={{ color: '#6b7280' }}>No saved ingredients yet. Star any ingredient to save it here.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {localLibrary.map((lib: any, idx: number) => (
                        <button key={idx} onClick={() => loadFromLibrary(lib)} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ background: 'rgba(212,160,23,0.1)', color: '#d4a017', border: '1px solid rgba(212,160,23,0.25)' }} data-testid={`lib-chip-${idx}`}>
                          {lib.name} ({lib.quantity ? `${lib.quantity}${lib.unit}` : lib.unit} · ${lib.costPerUnit}/{lib.unit})
                          <span onClick={(e) => { e.stopPropagation(); removeFromLocalLibrary(idx); }} className="ml-1">
                            <X className="h-3 w-3" />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <Input
                  placeholder="Ingredient name"
                  className="col-span-2 sm:col-span-1 h-12"
                  style={{ background: '#111827', borderColor: '#374151' }}
                  value={newIngredient.name}
                  onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                  data-testid="input-new-ingredient-name"
                />
                <Input
                  type="number"
                  placeholder="Amount"
                  className="h-12"
                  style={{ background: '#111827', borderColor: '#374151' }}
                  value={newIngredient.quantity}
                  onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
                  data-testid="input-new-ingredient-qty"
                />
                <Select value={newIngredient.unit} onValueChange={(v) => setNewIngredient({ ...newIngredient, unit: v })}>
                  <SelectTrigger className="h-12" style={{ background: '#111827', borderColor: '#374151' }} data-testid="select-new-ingredient-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oz">oz</SelectItem>
                    <SelectItem value="lb">lb</SelectItem>
                    <SelectItem value="each">each</SelectItem>
                    <SelectItem value="cup">cup</SelectItem>
                    <SelectItem value="tbsp">tbsp</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#9ca3af' }} />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Cost/unit"
                    className="pl-8 h-12"
                    style={{ background: '#111827', borderColor: '#374151' }}
                    value={newIngredient.costPerUnit}
                    onChange={(e) => setNewIngredient({ ...newIngredient, costPerUnit: e.target.value })}
                    data-testid="input-new-ingredient-cost"
                  />
                </div>
                <Select value={newIngredient.category} onValueChange={(v) => setNewIngredient({ ...newIngredient, category: v })}>
                  <SelectTrigger className="h-12" style={{ background: '#111827', borderColor: '#374151' }} data-testid="select-new-ingredient-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_DOTS).map(([key, dotColor]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
                          {key === 'dry_goods' ? 'Dry Goods' : key.charAt(0).toUpperCase() + key.slice(1)} (+{CATEGORY_WASTE_DEFAULTS[key] || '0'}%)
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {liveCostPreview && (
                <div className="flex items-center gap-1.5 text-xs px-1 transition-opacity duration-150" style={{ color: '#b8860b', opacity: liveCostPreview ? 1 : 0 }} data-testid="live-cost-preview">
                  <ArrowRight className="h-3 w-3 shrink-0" />
                  <span>{newIngredient.name} · {newIngredient.quantity} {newIngredient.unit} @ ${newIngredient.costPerUnit}/{newIngredient.unit} · {liveCostPreview.catLabel} waste applied · Est. cost: ${liveCostPreview.cost.toFixed(2)}</span>
                </div>
              )}

              <Button onClick={addIngredient} className="w-full h-12 text-base text-white" style={{ background: '#b8860b' }} data-testid="btn-add-ingredient">
                Add Ingredient
              </Button>
            </div>

            {plateIngredients.length > 0 && (
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #2a2d3e' }}>
                <div className="px-4 py-2 font-medium text-sm flex justify-between" style={{ background: '#111827', color: '#9ca3af' }}>
                  <span>Ingredients on this plate</span>
                  <span>Cost</span>
                </div>
                {plateIngredients.map((ing) => (
                  <div key={ing.id} className="px-4 py-3 flex items-center justify-between gap-2 transition-colors duration-300" style={{
                    borderTop: '1px solid #2a2d3e',
                    background: justAddedId === ing.id ? 'rgba(34,197,94,0.08)' : '#111827',
                  }}>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">{ing.name}</div>
                      <div className="text-sm" style={{ color: '#9ca3af' }}>
                        {ing.quantity} {ing.unit} @ ${ing.costPerUnit}/{ing.unit}
                        {parseFloat(ing.wasteBuffer) > 0 && <span className="ml-1">(+{ing.wasteBuffer}% waste applied)</span>}
                      </div>
                      {(() => {
                        const warning = getPortionCostWarning(ing);
                        return warning ? (
                          <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: '#f59e0b' }}>
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            {warning}
                          </p>
                        ) : null;
                      })()}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold" style={{ color: '#d4a017' }}>${ing.calculatedCost.toFixed(2)}</span>
                      <Button variant="ghost" size="icon" onClick={() => saveIngredientToLibrary(ing)} title="Save to library" data-testid={`btn-save-ingredient-${ing.id}`}>
                        <Star className="h-4 w-4" style={{ color: localLibrary.some((l: any) => l.name === ing.name) ? '#d4a017' : '#9ca3af' }} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeIngredient(ing.id)} data-testid={`btn-remove-ingredient-${ing.id}`}>
                        <X className="h-4 w-4" style={{ color: '#9ca3af' }} />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="px-4 py-3 flex justify-between items-center" style={{ borderTop: '1px solid #2a2d3e', background: 'rgba(212,160,23,0.06)' }}>
                  <span className="font-semibold text-lg text-white">Total Plate Cost</span>
                  <span className="font-bold text-xl" style={{ color: '#d4a017' }} data-testid="text-total-plate-cost">${totalPlateCost.toFixed(2)}</span>
                </div>
              </div>
            )}

            {totalPlateCost > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-base text-white">Target Food Cost</Label>
                    <Select value={targetFoodCost} onValueChange={setTargetFoodCost}>
                      <SelectTrigger className="mt-2 h-12" style={{ background: '#111827', borderColor: '#374151' }} data-testid="select-target-fc">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FOOD_COST_PRESETS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            <span className="flex items-center gap-2">{p.label} <Badge className="text-[10px]" style={{ background: 'rgba(212,160,23,0.15)', color: '#d4a017', borderColor: 'rgba(212,160,23,0.3)' }}>{p.value}%</Badge></span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-base text-white">Your Menu Price (optional)</Label>
                    <div className="relative mt-2">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#9ca3af' }} />
                      <Input
                        type="number"
                        step="0.50"
                        placeholder="Leave blank for suggestion"
                        className="pl-8 h-12"
                        style={{ background: '#111827', borderColor: '#374151' }}
                        value={menuPrice}
                        onChange={(e) => setMenuPrice(e.target.value)}
                        data-testid="input-menu-price"
                      />
                    </div>
                    {!menuPrice && suggestedPrice > 0 && (
                      <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>Suggested price: ${suggestedPrice.toFixed(2)} (at {targetFoodCost}% food cost)</p>
                    )}
                  </div>
                </div>

                {(marginStatus || (totalPlateCost > 0 && displayPrice > 0)) && (
                  <div className="rounded-lg p-5 border-l-[3px]" style={{
                    background: '#111827',
                    borderLeftColor: displayFCPct <= targetFoodCostNum ? '#22c55e' : displayFCPct <= targetFoodCostNum + 3 ? '#f59e0b' : '#ef4444',
                    border: '1px solid #2a2d3e',
                    borderLeft: `3px solid ${displayFCPct <= targetFoodCostNum ? '#22c55e' : displayFCPct <= targetFoodCostNum + 3 ? '#f59e0b' : '#ef4444'}`,
                  }} data-testid="margin-result-banner">
                    <p className="text-lg font-bold text-white mb-3">{plateName || "Plate"}</p>
                    <div className="flex items-center gap-3 mb-3 text-sm" style={{ color: '#9ca3af' }}>
                      <span>Plate Cost: <strong className="text-white">${totalPlateCost.toFixed(2)}</strong></span>
                      <span>Menu Price: <strong className="text-white">${displayPrice.toFixed(2)}</strong></span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 py-3 mb-3" style={{ borderTop: '1px solid #2a2d3e', borderBottom: '1px solid #2a2d3e' }}>
                      <div className="text-center">
                        <p className="text-[11px] uppercase tracking-wider" style={{ color: '#9ca3af' }}>Food Cost %</p>
                        <p className="text-xl font-bold" style={{ color: fcStatusColor(displayFCPct, targetFoodCostNum) }}>{displayFCPct.toFixed(1)}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[11px] uppercase tracking-wider" style={{ color: '#9ca3af' }}>Margin $</p>
                        <p className="text-xl font-bold text-white">${(displayPrice - totalPlateCost).toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[11px] uppercase tracking-wider" style={{ color: '#9ca3af' }}>Margin %</p>
                        <p className="text-xl font-bold text-white">{displayPrice > 0 ? ((displayPrice - totalPlateCost) / displayPrice * 100).toFixed(1) : '0.0'}%</p>
                      </div>
                    </div>
                    {displayFCPct <= targetFoodCostNum ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: '#22c55e' }} />
                        <p className="text-sm" style={{ color: '#22c55e' }}>On target for {FOOD_COST_PRESETS.find(p => p.value === targetFoodCost)?.label || 'your category'}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: '#f59e0b' }} />
                        <p className="text-sm" style={{ color: '#f59e0b' }}>
                          {(displayFCPct - targetFoodCostNum).toFixed(1)}% over your target — reprice or respec to reclaim ${((displayFCPct - targetFoodCostNum) / 100 * displayPrice).toFixed(2)}/plate
                        </p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Button onClick={savePlate} disabled={!plateName} size="sm" className="text-white" style={plateSaved ? { background: '#166534' } : { background: '#b8860b' }} data-testid="btn-save-plate">
                        {plateSaved ? <><Check className="h-4 w-4 mr-1" /> Saved</> : <><Star className="h-4 w-4 mr-1" /> Save Plate</>}
                      </Button>
                      <Button onClick={startNewPlate} variant="outline" size="sm" data-testid="btn-new-plate">
                        <Plus className="h-4 w-4 mr-1" /> New Plate
                      </Button>
                    </div>
                  </div>
                )}

                {marginStatus && !displayPrice && (
                  <div className="p-4 rounded-lg" style={{ background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.2)' }}>
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 mt-0.5" style={{ color: '#d4a017' }} />
                      <div>
                        <p className="font-semibold" style={{ color: '#d4a017' }}>Reality Check</p>
                        <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>{marginStatus.message}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="weekly-check" className="space-y-6">
            <div className="text-center py-4" style={{ borderBottom: '1px solid #2a2d3e' }}>
              <h3 className="text-lg font-semibold text-white">Did you make money on food this week?</h3>
              <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>Just two numbers. That's it.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-base text-white">What you paid for food</Label>
                <div className="relative mt-2">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: '#9ca3af' }} />
                  <Input
                    type="number"
                    placeholder="Total food purchases"
                    className="pl-10 h-14 text-lg"
                    style={{ background: '#111827', borderColor: '#374151' }}
                    value={weeklyPurchases}
                    onChange={(e) => setWeeklyPurchases(e.target.value)}
                    data-testid="input-weekly-purchases"
                  />
                </div>
              </div>
              <div>
                <Label className="text-base text-white">What you sold in food</Label>
                <div className="relative mt-2">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: '#9ca3af' }} />
                  <Input
                    type="number"
                    placeholder="Total food sales"
                    className="pl-10 h-14 text-lg"
                    style={{ background: '#111827', borderColor: '#374151' }}
                    value={weeklySales}
                    onChange={(e) => setWeeklySales(e.target.value)}
                    data-testid="input-weekly-sales"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-base text-white">Your target</Label>
              <Select value={targetWeeklyFC} onValueChange={setTargetWeeklyFC}>
                <SelectTrigger className="mt-2 h-12" style={{ background: '#111827', borderColor: '#374151' }} data-testid="select-weekly-target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOOD_COST_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex items-center gap-2">{p.label} <Badge className="text-[10px]" style={{ background: 'rgba(212,160,23,0.15)', color: '#d4a017', borderColor: 'rgba(212,160,23,0.3)' }}>{p.value}%</Badge></span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {weeklySalesNum > 0 && weeklyPurchasesNum > 0 && (
              <div className="rounded-lg p-6 border-l-[3px]" style={{
                background: '#111827',
                borderLeftColor: weeklyVariance <= 0 ? '#22c55e' : weeklyVariance <= 3 ? '#f59e0b' : '#ef4444',
                border: '1px solid #2a2d3e',
                borderLeft: `3px solid ${weeklyVariance <= 0 ? '#22c55e' : weeklyVariance <= 3 ? '#f59e0b' : '#ef4444'}`,
              }} data-testid="weekly-result-banner">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>Week of {new Date().toLocaleDateString()}</p>
                  <div className="text-5xl font-bold" style={{ color: weeklyVariance <= 0 ? '#22c55e' : weeklyVariance <= 3 ? '#f59e0b' : '#ef4444' }}>
                    {actualWeeklyFC.toFixed(1)}%
                  </div>
                  <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>Your actual food cost</p>

                  <div className="flex justify-center gap-6 mt-4 pt-4" style={{ borderTop: '1px solid #2a2d3e' }}>
                    <div className="text-center">
                      <p className="text-[11px] uppercase" style={{ color: '#9ca3af' }}>Food Spend</p>
                      <p className="text-sm font-semibold text-white">${weeklyPurchasesNum.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] uppercase" style={{ color: '#9ca3af' }}>Food Sales</p>
                      <p className="text-sm font-semibold text-white">${weeklySalesNum.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] uppercase" style={{ color: '#9ca3af' }}>Target</p>
                      <p className="text-sm font-semibold text-white">{targetWeeklyFC}%</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4" style={{ borderTop: '1px solid #2a2d3e' }}>
                    {weeklyVariance <= 0 ? (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-5 w-5" style={{ color: '#22c55e' }} />
                        <p className="text-sm" style={{ color: '#22c55e' }}>
                          You're {Math.abs(weeklyVariance).toFixed(1)}% under target. That's ${Math.abs(dollarVariance).toFixed(0)} extra profit this week!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <AlertTriangle className="h-5 w-5" style={{ color: '#f59e0b' }} />
                          <p className="text-sm" style={{ color: weeklyVariance <= 3 ? '#f59e0b' : '#ef4444' }}>
                            You're {weeklyVariance.toFixed(1)}% over target.
                          </p>
                        </div>
                        <p className="text-lg font-bold" style={{ color: '#d4a017' }} data-testid="text-dollar-leak">
                          That's ${dollarVariance.toFixed(0)} that leaked somewhere.
                        </p>
                      </div>
                    )}
                  </div>

                  {weeklyVariance > 2 && (
                    <div className="mt-4 text-left p-3 rounded text-sm" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                      <p className="font-medium mb-1" style={{ color: '#f59e0b' }}>Where money leaks:</p>
                      <ul className="space-y-1" style={{ color: '#9ca3af' }}>
                        <li>- Portions bigger than spec</li>
                        <li>- Waste not tracked</li>
                        <li>- Supplier prices increased</li>
                        <li>- Menu mix shifted to higher-cost items</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button onClick={saveWeeklyData} disabled={!weeklyPurchases || !weeklySales} className="w-full h-12 text-white" style={weeklySaved ? { background: '#166534' } : { background: '#b8860b' }} data-testid="btn-save-weekly">
              {weeklySaved ? <><Check className="h-4 w-4 mr-2" /> Week Saved</> : "Save This Week"}
            </Button>

            {foodCostPeriods && foodCostPeriods.length >= 2 && (
              <div className="mt-4" data-testid="trend-chart">
                <p className="text-xs mb-2" style={{ color: '#9ca3af' }}>Recent trend</p>
                <div className="flex items-end gap-1 h-[60px]">
                  {foodCostPeriods.slice(0, 8).reverse().map((p: any, i: number) => {
                    const fc = parseFloat(p.actualFoodCostPercent) || 0;
                    const target = parseFloat(p.targetFoodCostPercent) || 28;
                    const maxFC = Math.max(...foodCostPeriods.slice(0, 8).map((pp: any) => parseFloat(pp.actualFoodCostPercent) || 0), 35);
                    const height = Math.max(8, (fc / maxFC) * 52);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${fc.toFixed(1)}% · ${new Date(p.periodEnd).toLocaleDateString()}`}>
                        <div className="w-full rounded-t" style={{ height: `${height}px`, background: fc <= target ? '#22c55e' : fc <= target + 3 ? '#f59e0b' : '#ef4444' }} />
                        <span className="text-[8px]" style={{ color: '#6b7280' }}>{fc.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {foodCostPeriods && foodCostPeriods.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-3 text-white">Recent Weeks</h4>
                <div className="space-y-2">
                  {foodCostPeriods.slice(0, 5).map((p: any) => {
                    const fc = parseFloat(p.actualFoodCostPercent);
                    const target = parseFloat(p.targetFoodCostPercent);
                    return (
                      <div key={p.id} className="flex justify-between items-center p-3 rounded" style={{ background: '#111827', border: '1px solid #2a2d3e' }}>
                        <span className="text-sm text-white">{new Date(p.periodEnd).toLocaleDateString()}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm" style={{ color: '#9ca3af' }}>${parseFloat(p.totalPurchases).toLocaleString()} / ${parseFloat(p.totalSales).toLocaleString()}</span>
                          <Badge className="text-[10px]" style={{
                            background: fc <= target ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                            color: fc <= target ? '#22c55e' : '#ef4444',
                            borderColor: fc <= target ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
                          }}>{p.actualFoodCostPercent}%</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="saved" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-white">
                  <Star className="h-4 w-4" style={{ color: '#d4a017' }} /> Saved Ingredients
                </h4>
                {!savedIngredients || savedIngredients.length === 0 ? (
                  <div className="py-8 text-center rounded-lg" style={{ background: '#111827', border: '1px dashed #2a2d3e' }}>
                    <Star className="h-8 w-8 mx-auto mb-2" style={{ color: '#374151' }} />
                    <p className="text-sm" style={{ color: '#6b7280' }}>No saved ingredients yet.</p>
                    <p className="text-xs mt-1" style={{ color: '#4b5563' }}>Add ingredients to plates and star them to save here.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {savedIngredients.map((ing: any) => (
                      <div key={ing.id} className="flex justify-between items-center p-3 rounded" style={{ background: '#111827', border: '1px solid #2a2d3e' }}>
                        <div>
                          <div className="font-medium text-white">{ing.name}</div>
                          <div className="text-sm" style={{ color: '#9ca3af' }}>${ing.costPerUnit}/{ing.unit}</div>
                        </div>
                        <Badge className="text-[10px]" style={{ background: 'rgba(212,160,23,0.1)', color: '#d4a017', borderColor: 'rgba(212,160,23,0.3)' }}>{ing.category}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-white">
                  <ChefHat className="h-4 w-4" style={{ color: '#d4a017' }} /> Saved Plates
                </h4>
                {!savedPlates || savedPlates.length === 0 ? (
                  <div className="py-8 text-center rounded-lg" style={{ background: '#111827', border: '1px dashed #2a2d3e' }}>
                    <ChefHat className="h-8 w-8 mx-auto mb-2" style={{ color: '#374151' }} />
                    <p className="text-sm" style={{ color: '#6b7280' }}>No saved plates yet.</p>
                    <p className="text-xs mt-1" style={{ color: '#4b5563' }}>Cost your first plate to see it here.</p>
                    <Button onClick={() => setActiveTab("plate-builder")} size="sm" className="mt-3 text-white" style={{ background: '#b8860b' }}>Cost a Plate</Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-auto">
                    {savedPlates.map((plate: any) => {
                      const fc = plate.foodCostPercent ? parseFloat(plate.foodCostPercent) : null;
                      const target = parseFloat(plate.targetFoodCost) || 28;
                      return (
                        <div key={plate.id} className="p-3 rounded space-y-2" style={{ background: '#111827', border: '1px solid #2a2d3e' }}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-white truncate">{plate.name}</span>
                            <Badge className="text-[10px] shrink-0" style={{
                              background: fc !== null ? (fc <= target ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)') : 'rgba(156,163,175,0.15)',
                              color: fc !== null ? (fc <= target ? '#22c55e' : '#ef4444') : '#9ca3af',
                              borderColor: fc !== null ? (fc <= target ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)') : 'rgba(156,163,175,0.3)',
                            }}>
                              {fc !== null ? `${plate.foodCostPercent}%` : "No price set"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm" style={{ color: '#9ca3af' }}>
                            <span>Cost: ${plate.totalCost}</span>
                            {plate.menuPrice && <span>Price: ${plate.menuPrice}</span>}
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs" style={{ color: '#6b7280' }}>
                              Saved {plate.createdAt ? new Date(plate.createdAt).toLocaleDateString() : "recently"}
                            </p>
                            <Button onClick={() => loadPlateForEditing(plate)} variant="outline" size="sm" className="text-xs h-7" style={{ borderColor: '#d4a017', color: '#d4a017' }} data-testid={`btn-load-plate-${plate.id}`}>
                              Load
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {foodCostPeriods && foodCostPeriods.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-white">
                  <Calendar className="h-4 w-4" style={{ color: '#d4a017' }} /> Saved Weekly Checks
                </h4>
                <div className="space-y-2">
                  {foodCostPeriods.map((p: any) => {
                    const fc = parseFloat(p.actualFoodCostPercent);
                    const target = parseFloat(p.targetFoodCostPercent);
                    return (
                      <div key={p.id} className="flex justify-between items-center p-3 rounded" style={{ background: '#111827', border: '1px solid #2a2d3e' }}>
                        <div>
                          <p className="text-sm text-white">Week of {new Date(p.periodStart).toLocaleDateString()}</p>
                          <p className="text-xs" style={{ color: '#9ca3af' }}>${parseFloat(p.totalPurchases).toLocaleString()} spend / ${parseFloat(p.totalSales).toLocaleString()} sales</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="text-[10px]" style={{
                            background: fc <= target ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                            color: fc <= target ? '#22c55e' : '#ef4444',
                            borderColor: fc <= target ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
                          }}>{p.actualFoodCostPercent}%</Badge>
                          <span className="text-xs" style={{ color: fc <= target ? '#22c55e' : '#ef4444' }}>
                            {fc <= target ? 'On target' : `Over by ${(fc - target).toFixed(1)}%`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function KitchenStatusStrip() {
  const { data: lastShift } = useQuery<any>({ queryKey: ["/api/kitchen-shifts/latest"] });
  const { data: lastDebrief } = useQuery<any>({ queryKey: ["/api/kitchen-shifts/last-debrief"] });

  const scoreVal = lastShift?.readinessScore ?? null;
  const scoreLabel = scoreVal !== null
    ? scoreVal >= 85 ? "Ready" : scoreVal >= 70 ? "Caution" : "At Risk"
    : null;
  const scoreColor = scoreVal !== null
    ? scoreVal >= 85 ? "#22c55e" : scoreVal >= 70 ? "#f59e0b" : "#ef4444"
    : "#9ca3af";

  const eightySixText = lastShift?.readinessInputs?.eightyShortages
    ? (Array.isArray(lastShift.readinessInputs.eightyShortages)
        ? lastShift.readinessInputs.eightyShortages.join(", ")
        : lastShift.readinessInputs.eightyShortages)
    : null;

  const hc = lastShift?.staffCount || lastShift?.readinessInputs?.headcount;
  const covers = lastShift?.projectedCovers || lastShift?.readinessInputs?.forecastedCovers;

  const debriefAge = lastDebrief?.createdAt
    ? (() => {
        const diff = Date.now() - new Date(lastDebrief.createdAt).getTime();
        const hours = Math.floor(diff / 3600000);
        if (hours < 1) return "Just now";
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
      })()
    : null;
  const debriefNote = lastDebrief?.debriefStructured?.bottleneck || lastDebrief?.whatSucked;

  const cards = [
    {
      label: "Tonight's Status",
      value: scoreVal !== null ? `${scoreVal}/100` : "No check run yet",
      sub: scoreLabel,
      color: scoreColor,
      muted: scoreVal === null,
    },
    {
      label: "Last 86'd Items",
      value: eightySixText || "No active 86 list",
      sub: null,
      color: eightySixText ? "#ef4444" : "#9ca3af",
      muted: !eightySixText,
    },
    {
      label: "BOH vs. Covers",
      value: hc && covers ? `${hc} staff · ${covers} covers` : "--",
      sub: hc && covers ? `${(parseInt(covers) / parseInt(hc)).toFixed(1)} covers/cook` : null,
      color: "#d4a017",
      muted: !hc || !covers,
    },
    {
      label: "Last Debrief",
      value: debriefAge || "No debrief logged",
      sub: debriefNote ? (debriefNote.length > 40 ? debriefNote.slice(0, 40) + "..." : debriefNote) : null,
      color: "#d4a017",
      muted: !debriefAge,
    },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 mb-6 scrollbar-thin" data-testid="kitchen-status-strip">
      {cards.map((card, i) => (
        <div key={i} className="flex-shrink-0 min-w-[180px] rounded-lg p-3 border-l-[3px]" style={{ background: '#1a1d2e', borderLeftColor: '#b8860b' }}>
          <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>{card.label}</p>
          <p className={`text-sm font-semibold ${card.muted ? 'text-gray-500' : 'text-white'}`} style={!card.muted ? { color: card.color } : undefined} data-testid={`kitchen-strip-${i}`}>
            {card.value}
          </p>
          {card.sub && <p className="text-xs mt-0.5" style={{ color: card.muted ? '#6b7280' : card.color }}>{card.sub}</p>}
        </div>
      ))}
    </div>
  );
}

const BOTTLENECK_INSIGHTS: Record<string, { issue: string; action: string }> = {
  saute: { issue: "ticket backup when multiple saute dishes fire simultaneously", action: "Stagger fires, pre-portion proteins" },
  grill: { issue: "long cook times creating window congestion", action: "Pre-mark proteins, communicate fire times to expo" },
  fry: { issue: "oil temp drops on high-volume pushes", action: "Batch sizes, recovery time between drops" },
  pantry: { issue: "cold app bottleneck delays first courses", action: "Pre-plate components, dedicated pantry runner" },
  expo: { issue: "plating inconsistency and window congestion", action: "Standardize plate photos, call picks up sooner" },
};

function KitchenComplianceEngine() {
  const { toast } = useToast();
  const [mode, setMode] = useState<"readiness" | "alerts" | "debrief" | "coaching" | "quick-debrief">("readiness");
  const [analysis, setAnalysis] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [readinessScore, setReadinessScore] = useState<number | null>(null);
  const [readinessLevel, setReadinessLevel] = useState<"green" | "yellow" | "red" | "critical" | null>(null);
  const [selectedDaypart, setSelectedDaypart] = useState<string>("dinner");
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingField, setRecordingField] = useState<string | null>(null);

  const [stationIssues, setStationIssues] = useState<Record<string, string>>({});

  const [readinessInputs, setReadinessInputs] = useState({
    prepSignedOff: false,
    prepSignOffTime: "",
    stations: { saute: true, grill: true, fry: true, pantry: true, expo: true } as Record<string, boolean>,
    parShortages: [] as string[],
    eightySixItems: [] as string[],
    headcount: "",
    forecastedCovers: "",
    largeParty: false,
    largePartySize: "",
    largePartyTime: "",
    largePartySeating: "",
  });

  const [alertsInputs, setAlertsInputs] = useState({
    avgAppTime: "",
    avgEntreeTime: "",
    windowHolding: false,
    coverPace: "",
    bottleneckStation: "",
    managerNotes: "",
  });

  const [debriefInputs, setDebriefInputs] = useState({
    bottleneck: "",
    rootCause: "",
    fixOwner: "",
    fixDueBy: "next-shift",
    whatWentWell: "",
    whatSucked: "",
    fixForTomorrow: "",
  });

  const [coachingInputs, setCoachingInputs] = useState({
    targetStation: "",
    behavior: "",
    customBehavior: "",
  });

  const [fullDebriefInputs, setFullDebriefInputs] = useState({
    ticketTimes: "",
    windowDelays: "",
    prepIssues: "",
    serviceWaste: "",
    managerNotes: "",
  });

  const [parShortageInput, setParShortageInput] = useState("");
  const [eightySixInput, setEightySixInput] = useState("");
  const [quickDebriefSaved, setQuickDebriefSaved] = useState(false);
  const [kitchenCopied, setKitchenCopied] = useState(false);

  const today = new Date();
  const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
  const shiftDate = today.toISOString().split('T')[0];

  const { data: lastDebrief } = useQuery<any>({
    queryKey: ["/api/kitchen-shifts/last-debrief"],
  });

  const stationList = [
    { key: "saute", label: "Saut\u00e9", icon: Flame },
    { key: "grill", label: "Grill", icon: ThermometerSun },
    { key: "fry", label: "Fry", icon: Utensils },
    { key: "pantry", label: "Pantry", icon: Package },
    { key: "expo", label: "Expo", icon: Target },
  ];

  const coachingBehaviors = [
    "Not calling picks up",
    "Slow station recovery",
    "Not communicating timing",
    "Mise en place breakdown",
    "Not reading tickets ahead",
    "Plating inconsistency",
    "Not maintaining clean station",
    "custom",
  ];

  const rootCauseOptions = [
    { value: "prep-issue", label: "Prep issue" },
    { value: "staffing-gap", label: "Staffing gap" },
    { value: "communication", label: "Communication breakdown" },
    { value: "equipment", label: "Equipment failure" },
    { value: "volume-spike", label: "Volume spike" },
    { value: "training-gap", label: "Training gap" },
    { value: "other", label: "Other" },
  ];

  const daypartPresets: Record<string, { covers: string; headcount: string }> = {
    "normal-weekday-lunch": { covers: "70", headcount: "5" },
    "normal-weekday-dinner": { covers: "90", headcount: "5" },
    "busy-friday-dinner": { covers: "150", headcount: "7" },
    "busy-saturday-dinner": { covers: "165", headcount: "7" },
    "large-party": { covers: "150", headcount: "7" },
    "holiday-weekend": { covers: "135", headcount: "7" },
    "slow-monday": { covers: "50", headcount: "3" },
  };

  const getServiceStartHour = () => {
    if (selectedDaypart === "lunch") return 11;
    if (selectedDaypart === "brunch") return 10;
    return 17;
  };

  const calculateReadinessScore = () => {
    let prep = 0;
    if (readinessInputs.prepSignedOff) {
      prep = 30;
      if (readinessInputs.prepSignOffTime) {
        const [h, m] = readinessInputs.prepSignOffTime.split(":").map(Number);
        const signOffMinutes = h * 60 + m;
        const serviceMinutes = getServiceStartHour() * 60;
        const minutesBefore = serviceMinutes - signOffMinutes;
        if (minutesBefore < 15) prep = 15;
      }
    }

    const shortageCount = readinessInputs.parShortages.length;
    const pars = Math.max(0, 20 - shortageCount * 5);

    const hc = parseInt(readinessInputs.headcount) || 0;
    const covers = parseInt(readinessInputs.forecastedCovers) || 0;
    let staffing = 5;
    if (hc > 0 && covers > 0) {
      const ratio = covers / hc;
      if (ratio <= 25) staffing = 20;
      else if (ratio <= 30) staffing = 15;
      else staffing = 5;
    } else if (hc > 0) {
      staffing = 15;
    }

    const stationsDown = Object.values(readinessInputs.stations).filter(v => !v).length;
    const ticketFlow = Math.max(0, 20 - stationsDown * 4);

    const eightySixCount = readinessInputs.eightySixItems.length;
    const lineSet = Math.max(0, 10 - eightySixCount * 2);

    const total = prep + pars + staffing + ticketFlow + lineSet;

    const breakdown = { prep, pars, staffing, ticketFlow, lineSet };
    const categories = [
      { label: "Prep", score: prep, max: 30 },
      { label: "Pars", score: pars, max: 20 },
      { label: "Staffing", score: staffing, max: 20 },
      { label: "Ticket Flow", score: ticketFlow, max: 20 },
      { label: "Line Set", score: lineSet, max: 10 },
    ];

    const topDrivers = [...categories].sort((a, b) => b.score - a.score).slice(0, 3).map(c => c.label);

    const topFixes = categories
      .filter(c => c.score < c.max)
      .map(c => ({ label: c.label, points: c.max - c.score }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 3);

    return { total, breakdown, topDrivers, topFixes, categories };
  };

  const scoreData = calculateReadinessScore();

  const applyScore = (total: number) => {
    setReadinessScore(total);
    if (total >= 85) setReadinessLevel("green");
    else if (total >= 70) setReadinessLevel("yellow");
    else if (total >= 50) setReadinessLevel("red");
    else setReadinessLevel("critical");
  };

  const hydrateFromShift = (data: any) => {
    if (data.readinessInputs) {
      setReadinessInputs(prev => ({ ...prev, ...data.readinessInputs }));
    } else {
      setReadinessInputs(prev => ({
        ...prev,
        forecastedCovers: data.projectedCovers?.toString() || prev.forecastedCovers,
        headcount: data.staffCount?.toString() || prev.headcount,
      }));
    }
    if (data.alertsInputs) {
      setAlertsInputs(prev => ({ ...prev, ...data.alertsInputs }));
    }
    if (data.debriefStructured) {
      setDebriefInputs(prev => ({ ...prev, ...data.debriefStructured }));
    }
  };

  const loadYesterday = async () => {
    setIsLoadingHistory(true);
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const res = await fetch(`/api/kitchen-shifts/${yesterdayStr}/${selectedDaypart}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          hydrateFromShift(data);
          toast({ title: "Loaded yesterday's data" });
        } else {
          toast({ title: "No data from yesterday", variant: "destructive" });
        }
      }
    } catch {
      toast({ title: "Failed to load historical data", variant: "destructive" });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadLastWeek = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/kitchen-shifts/recent/${dayOfWeek}/${selectedDaypart}`, { credentials: "include" });
      if (res.ok) {
        const shifts = await res.json();
        if (shifts && shifts.length > 0) {
          hydrateFromShift(shifts[0]);
          toast({ title: `Loaded last ${dayOfWeek}'s data` });
        } else {
          toast({ title: `No data from last ${dayOfWeek}`, variant: "destructive" });
        }
      }
    } catch {
      toast({ title: "Failed to load historical data", variant: "destructive" });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const applyPreset = (presetKey: string) => {
    const preset = daypartPresets[presetKey];
    if (preset) {
      setReadinessInputs(prev => ({
        ...prev,
        forecastedCovers: preset.covers,
        headcount: preset.headcount,
      }));
      setSelectedPreset(presetKey);
      toast({ title: "Preset applied" });
    }
  };

  const saveShiftData = async () => {
    setIsSaving(true);
    try {
      await apiRequest("POST", "/api/kitchen-shifts", {
        shiftDate,
        dayOfWeek,
        daypart: selectedDaypart,
        projectedCovers: readinessInputs.forecastedCovers ? parseInt(readinessInputs.forecastedCovers) : null,
        staffCount: readinessInputs.headcount ? parseInt(readinessInputs.headcount) : null,
        prepCompletion: readinessInputs.prepSignedOff ? `Signed off at ${readinessInputs.prepSignOffTime || "on time"}` : "Not signed off",
        wasteNotes: readinessInputs.eightySixItems.length > 0 ? `86'd: ${readinessInputs.eightySixItems.join(", ")}` : "",
        managerNotes: alertsInputs.managerNotes,
        readinessScore: scoreData.total,
        readinessInputs,
        alertsInputs,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen-shifts"] });
      toast({ title: "Shift data saved" });
    } catch {
      toast({ title: "Failed to save shift data", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const saveQuickDebrief = async () => {
    if (!debriefInputs.whatWentWell && !debriefInputs.whatSucked && !debriefInputs.fixForTomorrow) {
      toast({ title: "Please fill in at least one field", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await apiRequest("POST", "/api/kitchen-shifts/debrief", {
        shiftDate,
        dayOfWeek,
        daypart: selectedDaypart,
        whatWentWell: debriefInputs.whatWentWell,
        whatSucked: debriefInputs.whatSucked,
        fixForTomorrow: debriefInputs.fixForTomorrow,
        debriefStructured: {
          bottleneck: debriefInputs.bottleneck,
          rootCause: debriefInputs.rootCause,
          fixOwner: debriefInputs.fixOwner,
          fixDueBy: debriefInputs.fixDueBy,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen-shifts/last-debrief"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen-shifts/latest"] });
      toast({ title: "Debrief saved! Great work." });
      setQuickDebriefSaved(true);
      setTimeout(() => setQuickDebriefSaved(false), 2000);
      setDebriefInputs({
        bottleneck: "",
        rootCause: "",
        fixOwner: "",
        fixDueBy: "next-shift",
        whatWentWell: "",
        whatSucked: "",
        fixForTomorrow: "",
      });
    } catch {
      toast({ title: "Failed to save debrief", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const startVoiceInput = (field: string) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({ title: "Voice input not supported in this browser", variant: "destructive" });
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    setIsRecording(true);
    setRecordingField(field);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      switch (field) {
        case "wellDone": setDebriefInputs(prev => ({ ...prev, whatWentWell: prev.whatWentWell + " " + transcript })); break;
        case "sucked": setDebriefInputs(prev => ({ ...prev, whatSucked: prev.whatSucked + " " + transcript })); break;
        case "fix": setDebriefInputs(prev => ({ ...prev, fixForTomorrow: prev.fixForTomorrow + " " + transcript })); break;
        case "managerNotes": setAlertsInputs(prev => ({ ...prev, managerNotes: prev.managerNotes + " " + transcript })); break;
        case "fullTickets": setFullDebriefInputs(prev => ({ ...prev, ticketTimes: prev.ticketTimes + " " + transcript })); break;
        case "fullWindow": setFullDebriefInputs(prev => ({ ...prev, windowDelays: prev.windowDelays + " " + transcript })); break;
        case "fullPrep": setFullDebriefInputs(prev => ({ ...prev, prepIssues: prev.prepIssues + " " + transcript })); break;
        case "fullWaste": setFullDebriefInputs(prev => ({ ...prev, serviceWaste: prev.serviceWaste + " " + transcript })); break;
        case "fullManager": setFullDebriefInputs(prev => ({ ...prev, managerNotes: prev.managerNotes + " " + transcript })); break;
      }
      toast({ title: "Voice captured" });
    };
    recognition.onerror = () => { toast({ title: "Voice recognition failed", variant: "destructive" }); };
    recognition.onend = () => { setIsRecording(false); setRecordingField(null); };
    recognition.start();
  };

  const generateAnalysis = async () => {
    setIsGenerating(true);
    setAnalysis("");
    try {
      let prompt = "";

      if (mode === "readiness") {
        applyScore(scoreData.total);
        const stationStatus = stationList.map(s => `${s.label}: ${readinessInputs.stations[s.key] ? "Ready" : "NOT READY"}`).join(", ");
        const stationIssuesList = Object.entries(stationIssues)
          .filter(([_, v]) => v.trim())
          .map(([k, v]) => `${stationList.find(s => s.key === k)?.label || k}: ${v}`)
          .join(", ");
        prompt = `Generate a Kitchen Readiness Assessment.

DETERMINISTIC SCORE: ${scoreData.total}/100
Breakdown: Prep ${scoreData.breakdown.prep}/30, Pars ${scoreData.breakdown.pars}/20, Staffing ${scoreData.breakdown.staffing}/20, Ticket Flow ${scoreData.breakdown.ticketFlow}/20, Line Set ${scoreData.breakdown.lineSet}/10

STRUCTURED DATA:
- Prep signed off: ${readinessInputs.prepSignedOff ? `Yes at ${readinessInputs.prepSignOffTime || "on time"}` : "No"}
- Station Status: ${stationStatus}
${stationIssuesList ? `- Station Issues: ${stationIssuesList}` : ""}
- Par shortages: ${readinessInputs.parShortages.length > 0 ? readinessInputs.parShortages.join(", ") : "None"}
- 86'd items: ${readinessInputs.eightySixItems.length > 0 ? readinessInputs.eightySixItems.join(", ") : "None"}
- BOH headcount: ${readinessInputs.headcount || "Not set"}
- Forecasted covers: ${readinessInputs.forecastedCovers || "Not set"}
${readinessInputs.largeParty ? `- Large party: ${readinessInputs.largePartySize} at ${readinessInputs.largePartyTime}` : ""}

Top improvement areas: ${scoreData.topFixes.map(f => `${f.label} (+${f.points} pts)`).join(", ") || "None"}

Based on this data, provide:

KITCHEN READINESS SCORE: [${scoreData.total}/100]

RISK FACTORS:
- [Flag specific risks]

PRE-SERVICE ACTIONS REQUIRED:
1. [Immediate priority]
2. [Secondary priority]

KM BRIEFING POINTS:
[2-3 messages for the team]

Flag risks before they become service failures.`;
      } else if (mode === "alerts") {
        const appTime = parseInt(alertsInputs.avgAppTime) || 0;
        const entreeTime = parseInt(alertsInputs.avgEntreeTime) || 0;
        prompt = `Generate Service Execution Alerts.

STRUCTURED METRICS:
- Avg appetizer time: ${appTime > 0 ? `${appTime} min` : "Not tracked"} (standard: 8-10 min)
- Avg entr\u00e9e time: ${entreeTime > 0 ? `${entreeTime} min` : "Not tracked"} (standard: 15-18 min)
- Window holding: ${alertsInputs.windowHolding ? "YES - food sitting" : "No"}
- Cover pace: ${alertsInputs.coverPace || "Not set"}
- Bottleneck station: ${alertsInputs.bottleneckStation || "None identified"}
- Manager notes: ${alertsInputs.managerNotes || "None"}

Generate real-time alerts:

ACTIVE ALERTS:
[CRITICAL] / [WARNING] / [ON TRACK] based on the metrics above.

BOTTLENECK ANALYSIS:
- Primary bottleneck and root cause
- Immediate fix

RUNNER DEPLOYMENT:
[Recommendation based on flow]`;
      } else if (mode === "debrief") {
        const quickDebriefContext = debriefInputs.bottleneck || debriefInputs.rootCause
          ? `\nQUICK DEBRIEF DATA:\n- Bottleneck: ${debriefInputs.bottleneck || "Not set"}\n- Root cause: ${debriefInputs.rootCause || "Not set"}\n- Fix owner: ${debriefInputs.fixOwner || "Not set"}\n- What went well: ${debriefInputs.whatWentWell || "Not captured"}\n- What sucked: ${debriefInputs.whatSucked || "Not captured"}\n- Fix for tomorrow: ${debriefInputs.fixForTomorrow || "Not captured"}\n`
          : "";
        prompt = `Generate a Post-Shift KM Debrief.

TICKET TIMING OBSERVATIONS:
${fullDebriefInputs.ticketTimes || "Not specified"}

WINDOW/EXPO ISSUES:
${fullDebriefInputs.windowDelays || "None noted"}

PREP ISSUES DISCOVERED:
${fullDebriefInputs.prepIssues || "None"}

WASTE DURING SERVICE:
${fullDebriefInputs.serviceWaste || "None noted"}

MANAGER NOTES:
${fullDebriefInputs.managerNotes || "None"}
${quickDebriefContext}
Generate a structured KM debrief:

SERVICE SUMMARY:
[Overall assessment]

WHAT BROKE:
1. [Primary breakdown]
2. [Secondary breakdown]

WHY IT BROKE (System-Level):
- [Root causes]

WHAT TO FIX TOMORROW:
- [Specific actions]

PATTERN WATCH:
[Recurring issues]

Focus on systems, not personalities.`;
      } else if (mode === "coaching") {
        const behaviorText = coachingInputs.behavior === "custom" ? coachingInputs.customBehavior : coachingInputs.behavior;
        prompt = `Generate a BOH Coaching Focus recommendation.

TARGET STATION: ${coachingInputs.targetStation || "Not specified"}
BEHAVIOR TO COACH: ${behaviorText || "Not specified"}

Generate ONE specific coaching focus:

BOH COACHING FOCUS

TARGET: ${coachingInputs.targetStation || "[Station]"}

BEHAVIOR TO COACH:
${behaviorText || "[Behavior]"}

TALK TRACK:
"Hey, can I grab you for a second?"
[Opening - acknowledge the work]
[Specific observation - no accusations]
[Standard reminder]
[Commitment ask]
[Close]

OBSERVABLE STANDARD:
[What correct behavior looks like]

VERIFICATION DRILL:
[How to check if coaching worked next shift]

One behavior. One conversation. Consistent follow-up.`;
      } else {
        prompt = `Generate a quick debrief summary.
What went well: ${debriefInputs.whatWentWell || "Not specified"}
What sucked: ${debriefInputs.whatSucked || "Not specified"}
Fix for tomorrow: ${debriefInputs.fixForTomorrow || "Not specified"}
Bottleneck: ${debriefInputs.bottleneck || "Not specified"}
Root cause: ${debriefInputs.rootCause || "Not specified"}

Provide actionable summary and follow-up plan.`;
      }

      const res = await fetch("/api/consultant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to generate analysis");

      const reader = res.body?.getReader();
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
                setAnalysis(content);
              }
            } catch {}
          }
        }
      }

      if (mode === "readiness") {
        await saveShiftData();
      }
    } catch {
      toast({ title: "Failed to generate analysis", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboardKitchen = () => {
    navigator.clipboard.writeText(analysis);
    setKitchenCopied(true);
    setTimeout(() => setKitchenCopied(false), 2000);
    toast({ title: "Copied to clipboard!" });
  };

  const modeLabels: Record<string, string> = {
    readiness: "Readiness Score",
    alerts: "Service Alerts",
    debrief: "KM Debrief",
    coaching: "Coaching Focus",
    "quick-debrief": "Quick Debrief",
  };

  const VoiceButton = ({ field, label }: { field: string; label: string }) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={`ml-2 ${isRecording && recordingField === field ? "text-destructive animate-pulse" : ""}`}
      onClick={() => startVoiceInput(field)}
      disabled={isRecording}
      data-testid={`btn-voice-${field}`}
    >
      <Mic className="h-4 w-4" />
    </Button>
  );

  const addParShortage = () => {
    const items = parShortageInput.split(",").map(s => s.trim()).filter(Boolean);
    if (items.length > 0) {
      setReadinessInputs(prev => ({
        ...prev,
        parShortages: [...prev.parShortages, ...items],
      }));
      setParShortageInput("");
    }
  };

  const removeParShortage = (idx: number) => {
    setReadinessInputs(prev => ({
      ...prev,
      parShortages: prev.parShortages.filter((_, i) => i !== idx),
    }));
  };

  const addEightySixItem = () => {
    const items = eightySixInput.split(",").map(s => s.trim()).filter(Boolean);
    if (items.length > 0) {
      setReadinessInputs(prev => ({
        ...prev,
        eightySixItems: [...prev.eightySixItems, ...items],
      }));
      setEightySixInput("");
    }
  };

  const removeEightySixItem = (idx: number) => {
    setReadinessInputs(prev => ({
      ...prev,
      eightySixItems: prev.eightySixItems.filter((_, i) => i !== idx),
    }));
  };

  const coversPerCook = useMemo(() => {
    const hc = parseInt(readinessInputs.headcount) || 0;
    const covers = parseInt(readinessInputs.forecastedCovers) || 0;
    if (hc === 0 || covers === 0) return null;
    return covers / hc;
  }, [readinessInputs.headcount, readinessInputs.forecastedCovers]);

  const getCoversPerCookColor = (ratio: number) => {
    if (ratio <= 15) return { color: "#22c55e", label: "On track" };
    if (ratio <= 20) return { color: "#f59e0b", label: "Watch closely" };
    return { color: "#ef4444", label: "Understaffed" };
  };

  const getScoreBarColor = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct >= 80) return "bg-green-500";
    if (pct >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getAlertBadge = (value: number, low: number, high: number, label: string) => {
    if (value === 0) return <Badge variant="outline" data-testid={`badge-${label}`}>{label}: --</Badge>;
    if (value >= low && value <= high) return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30" data-testid={`badge-${label}`}><CheckCircle2 className="h-3 w-3 mr-1" />{label}: {value}m</Badge>;
    return <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" data-testid={`badge-${label}`}><AlertTriangle className="h-3 w-3 mr-1" />{label}: {value}m</Badge>;
  };

  const renderStructuredKitchenOutput = () => {
    if (!analysis) return null;

    if (mode === "alerts") {
      const alertBlocks: { severity: string; title: string; desc: string }[] = [];
      const lines = analysis.split("\n");
      let currentSeverity = "";
      let currentTitle = "";
      let currentDesc = "";
      for (const line of lines) {
        const critMatch = line.match(/\[CRITICAL\]\s*(.*)/i);
        const warnMatch = line.match(/\[WARNING\]\s*(.*)/i);
        const trackMatch = line.match(/\[ON\s*TRACK\]\s*(.*)/i);
        const highMatch = line.match(/\[HIGH\]\s*(.*)/i);
        const medMatch = line.match(/\[MEDIUM\]\s*(.*)/i);
        const lowMatch = line.match(/\[LOW\]\s*(.*)/i);
        const match = critMatch || highMatch || warnMatch || medMatch || trackMatch || lowMatch;
        if (match) {
          if (currentSeverity) alertBlocks.push({ severity: currentSeverity, title: currentTitle, desc: currentDesc.trim() });
          currentSeverity = critMatch || highMatch ? "HIGH" : warnMatch || medMatch ? "MEDIUM" : "LOW";
          currentTitle = match[1] || "";
          currentDesc = "";
        } else if (currentSeverity) {
          currentDesc += line + "\n";
        }
      }
      if (currentSeverity) alertBlocks.push({ severity: currentSeverity, title: currentTitle, desc: currentDesc.trim() });

      if (alertBlocks.length > 0) {
        return (
          <div className="space-y-3">
            {alertBlocks.map((alert, i) => (
              <div key={i} className="rounded-lg p-4 border-l-[3px]" style={{
                background: '#1a1d2e',
                borderLeftColor: alert.severity === "HIGH" ? '#ef4444' : alert.severity === "MEDIUM" ? '#f59e0b' : '#3b82f6',
              }}>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`text-[10px] ${
                    alert.severity === "HIGH" ? 'bg-red-900/50 text-red-400 border-red-600/30' :
                    alert.severity === "MEDIUM" ? 'bg-amber-900/50 text-amber-400 border-amber-600/30' :
                    'bg-blue-900/50 text-blue-400 border-blue-600/30'
                  }`} data-testid={`alert-badge-${i}`}>{alert.severity}</Badge>
                  <span className="text-sm font-semibold text-white">{alert.title}</span>
                </div>
                <p className="text-xs whitespace-pre-wrap" style={{ color: '#9ca3af' }}>{alert.desc}</p>
              </div>
            ))}
          </div>
        );
      }
    }

    if (mode === "debrief") {
      const sections: { title: string; items: string[]; type: "broke" | "cause" | "fix" }[] = [];
      const brokeMatch = analysis.match(/WHAT BROKE[:\s]*\n([\s\S]*?)(?=(?:WHY IT BROKE|ROOT CAUSE|WHAT TO FIX|PATTERN|$))/i);
      const causeMatch = analysis.match(/(?:WHY IT BROKE|ROOT CAUSE)[:\s]*\n([\s\S]*?)(?=(?:WHAT TO FIX|TOMORROW|PATTERN|$))/i);
      const fixMatch = analysis.match(/(?:WHAT TO FIX|TOMORROW'?S? FIX)[:\s]*\n([\s\S]*?)(?=(?:PATTERN|$))/i);
      const extractItems = (text: string) => text.split("\n").map(l => l.replace(/^[-\d.•*]+\s*/, "").trim()).filter(Boolean);
      if (brokeMatch) sections.push({ title: "What Broke", items: extractItems(brokeMatch[1]), type: "broke" });
      if (causeMatch) sections.push({ title: "Root Causes", items: extractItems(causeMatch[1]), type: "cause" });
      if (fixMatch) sections.push({ title: "Tomorrow's Fixes", items: extractItems(fixMatch[1]), type: "fix" });

      if (sections.length > 0) {
        const colors = { broke: { bg: '#2d1b1b', border: '#ef4444', icon: '#ef4444' }, cause: { bg: '#2d2a1b', border: '#f59e0b', icon: '#f59e0b' }, fix: { bg: '#1b2d1b', border: '#22c55e', icon: '#22c55e' } };
        return (
          <div className="space-y-4">
            {sections.map((section, i) => (
              <div key={i} className="rounded-lg p-4 border-l-[3px]" style={{ background: colors[section.type].bg, borderLeftColor: colors[section.type].border }}>
                <div className="flex items-center gap-2 mb-2">
                  {section.type === "broke" ? <XCircle className="h-4 w-4" style={{ color: colors[section.type].icon }} /> :
                   section.type === "cause" ? <AlertTriangle className="h-4 w-4" style={{ color: colors[section.type].icon }} /> :
                   <Check className="h-4 w-4" style={{ color: colors[section.type].icon }} />}
                  <span className="text-sm font-semibold" style={{ color: colors[section.type].icon }}>{section.title}</span>
                </div>
                <ul className="space-y-1">
                  {section.items.map((item, j) => (
                    <li key={j} className="text-xs flex items-start gap-2" style={{ color: '#d1d5db' }}>
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: colors[section.type].icon }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <button onClick={() => window.print()} className="text-xs flex items-center gap-1" style={{ color: '#9ca3af' }} data-testid="btn-print-debrief">
              <Printer className="h-3 w-3" /> Print Debrief
            </button>
          </div>
        );
      }
    }

    if (mode === "coaching") {
      const focusMatch = analysis.match(/(?:THE FOCUS|BEHAVIOR TO COACH)[:\s]*\n?(.*?)(?:\n\n|\n(?=[A-Z]))/is);
      const watchMatch = analysis.match(/(?:WHAT TO WATCH|OBSERVABLE)[:\s]*\n([\s\S]*?)(?=(?:WHAT TO SAY|TALK TRACK|$))/i);
      const sayMatch = analysis.match(/(?:WHAT TO SAY|TALK TRACK)[:\s]*\n([\s\S]*?)(?=(?:WHAT GOOD|OBSERVABLE STANDARD|VERIFICATION|$))/i);
      const goodMatch = analysis.match(/(?:WHAT GOOD LOOKS LIKE|OBSERVABLE STANDARD)[:\s]*\n([\s\S]*?)(?=(?:FOLLOW UP|VERIFICATION|$))/i);
      const followMatch = analysis.match(/(?:FOLLOW UP|VERIFICATION)[:\s]*\n([\s\S]*?)$/i);
      const hasStructure = focusMatch || watchMatch || sayMatch;

      if (hasStructure) {
        return (
          <div className="space-y-4 rounded-lg p-5" style={{ background: '#1a1d2e' }}>
            {focusMatch && (
              <div>
                <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: '#d4a017' }}>The Focus</p>
                <p className="text-lg font-bold text-white">{focusMatch[1].trim()}</p>
              </div>
            )}
            {watchMatch && (
              <div>
                <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: '#d4a017' }}>What to Watch</p>
                <ul className="space-y-1.5">
                  {watchMatch[1].split("\n").map(l => l.replace(/^[-\d.•*]+\s*/, "").trim()).filter(Boolean).map((item, i) => (
                    <li key={i} className="text-sm flex items-start gap-2 text-gray-300">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#d4a017' }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {sayMatch && (
              <div className="border-l-[3px] pl-4 py-2" style={{ borderLeftColor: '#d4a017', background: 'rgba(212,160,23,0.05)' }}>
                <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: '#d4a017' }}>What to Say</p>
                <p className="text-sm italic whitespace-pre-wrap" style={{ color: '#e5e7eb' }}>{sayMatch[1].trim()}</p>
              </div>
            )}
            {goodMatch && (
              <div className="rounded-lg p-3" style={{ background: '#111827', border: '1px solid #2a2d3e' }}>
                <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: '#22c55e' }}>What Good Looks Like</p>
                <p className="text-sm whitespace-pre-wrap" style={{ color: '#d1d5db' }}>{goodMatch[1].trim()}</p>
              </div>
            )}
            {followMatch && (
              <div className="flex items-start gap-2 pt-2" style={{ borderTop: '1px solid #2a2d3e' }}>
                <Clock className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#f59e0b' }} />
                <div>
                  <p className="text-[11px] uppercase tracking-wider" style={{ color: '#f59e0b' }}>Follow Up By</p>
                  <p className="text-sm" style={{ color: '#d1d5db' }}>{followMatch[1].trim()}</p>
                </div>
              </div>
            )}
          </div>
        );
      }
    }

    return (
      <div className="p-4 rounded-lg whitespace-pre-wrap text-sm" style={{ background: '#1a1d2e', color: '#d1d5db' }}>
        {analysis}
      </div>
    );
  };

  const liveScoreLevel = scoreData.total >= 80 ? "Ready" : scoreData.total >= 60 ? "Caution" : "Not Ready";
  const liveScoreColor = scoreData.total >= 80 ? "#22c55e" : scoreData.total >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <Card className="mb-8 relative overflow-hidden" style={{ background: '#1a1d2e', borderColor: '#2a2d3e' }}>
      <div className="absolute inset-0 rounded-lg pointer-events-none" style={{
        background: 'linear-gradient(90deg, transparent 0%, rgba(212,160,23,0.08) 50%, transparent 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 3s linear infinite',
      }} />
      <CardHeader className="relative">
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Sparkles className="h-5 w-5" style={{ color: '#d4a017' }} />
          <span className="text-white">Kitchen Command Center</span>
          {mode === "readiness" && (
            <Badge
              className={`text-xs ${
                scoreData.total >= 80 ? "bg-green-500/15 text-green-400 border-green-500/30" :
                scoreData.total >= 60 ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" :
                "bg-red-500/15 text-red-400 border-red-500/30"
              } ${scoreData.total < 60 ? "animate-pulse" : ""}`}
              data-testid="badge-readiness-status"
            >
              {scoreData.total >= 80 ? "Ready" : scoreData.total >= 60 ? "Caution" : "Not Ready"}
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-4 rounded-full" style={{ background: '#d4a017' }} />
          <CardDescription style={{ color: '#9ca3af' }}>
            Real-time kitchen readiness, service alerts, and post-shift debriefs. Data-driven decisions, not gut feelings.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 relative">
        {readinessScore !== null && readinessLevel && mode === "readiness" && (
          <div className="p-4 rounded-lg border-l-[3px]" style={{
            background: readinessLevel === "green" ? 'rgba(34,197,94,0.08)' : readinessLevel === "yellow" ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
            borderLeftColor: readinessLevel === "green" ? '#22c55e' : readinessLevel === "yellow" ? '#f59e0b' : '#ef4444',
            border: `1px solid ${readinessLevel === "green" ? 'rgba(34,197,94,0.2)' : readinessLevel === "yellow" ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`,
            borderLeft: `3px solid ${readinessLevel === "green" ? '#22c55e' : readinessLevel === "yellow" ? '#f59e0b' : '#ef4444'}`,
          }}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="text-4xl font-bold" style={{ color: readinessLevel === "green" ? '#22c55e' : readinessLevel === "yellow" ? '#f59e0b' : '#ef4444' }} data-testid="text-readiness-score">
                  {readinessScore}/100
                </div>
                <div>
                  <div className="text-lg font-semibold" style={{ color: readinessLevel === "green" ? '#22c55e' : readinessLevel === "yellow" ? '#f59e0b' : '#ef4444' }} data-testid="text-readiness-level">
                    {readinessLevel === "green" ? "Ready - Go crush it!" :
                     readinessLevel === "yellow" ? "Manageable - Address issues" :
                     readinessLevel === "red" ? "At Risk - Immediate action needed" :
                     "Critical - Escalate now"}
                  </div>
                  <p className="text-sm" style={{ color: '#9ca3af' }}>{dayOfWeek} {selectedDaypart}</p>
                </div>
              </div>
              <div className="w-full md:w-48 h-3 rounded-full overflow-hidden" style={{ background: '#111827' }}>
                <div className="h-full transition-all duration-500 rounded-full" style={{
                  width: `${readinessScore}%`,
                  background: readinessLevel === "green" ? '#22c55e' : readinessLevel === "yellow" ? '#f59e0b' : '#ef4444',
                }} />
              </div>
            </div>
          </div>
        )}

        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="w-full">
          <div className="border-b" style={{ borderColor: '#2a2d3e' }}>
            <TabsList className="grid w-full grid-cols-5 bg-transparent h-auto p-0">
              {[
                { value: "readiness", label: "Readiness", Icon: Gauge },
                { value: "alerts", label: "Alerts", Icon: AlertTriangle },
                { value: "quick-debrief", label: "Quick", Icon: Timer },
                { value: "debrief", label: "Debrief", Icon: ClipboardList },
                { value: "coaching", label: "Coach", Icon: Target },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  data-testid={`tab-${tab.value}`}
                  className="text-xs sm:text-sm py-2.5 px-1 rounded-none border-b-2 border-transparent data-[state=active]:border-b-0 data-[state=active]:bg-transparent"
                  style={{
                    color: mode === tab.value ? '#ffffff' : '#9ca3af',
                    borderBottomColor: mode === tab.value ? '#d4a017' : 'transparent',
                  }}
                >
                  <tab.Icon className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="readiness" className="space-y-4 mt-4">
            {lastDebrief && (lastDebrief.fixForTomorrow || lastDebrief.debriefStructured?.fixForTomorrow) && (
              <div className="p-3 rounded-lg" style={{ background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.2)' }}>
                <div className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#d4a017' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#d4a017' }}>Last shift's fix</p>
                    <p className="text-sm" style={{ color: '#9ca3af' }} data-testid="text-last-debrief-fix">
                      {lastDebrief.debriefStructured?.fixForTomorrow || lastDebrief.fixForTomorrow}
                      {(lastDebrief.debriefStructured?.fixOwner) && <span> — Owner: {lastDebrief.debriefStructured.fixOwner}</span>}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm" style={{ color: '#9ca3af' }}>Pre-service readiness check. Are we actually prepared?</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={selectedDaypart} onValueChange={setSelectedDaypart}>
                  <SelectTrigger className="w-28" style={{ background: '#111827', borderColor: '#374151' }} data-testid="select-daypart">
                    <SelectValue placeholder="Daypart" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                    <SelectItem value="brunch">Brunch</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={loadYesterday} disabled={isLoadingHistory} data-testid="btn-load-yesterday">
                  {isLoadingHistory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4 mr-1" />}
                  Yesterday
                </Button>
                <Button variant="outline" size="sm" onClick={loadLastWeek} disabled={isLoadingHistory} data-testid="btn-load-last-week">
                  {isLoadingHistory ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4 mr-1" />}
                  Last {dayOfWeek}
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-white">Quick Preset</Label>
              <Select value={selectedPreset} onValueChange={applyPreset}>
                <SelectTrigger className="mt-1" style={{ background: '#111827', borderColor: '#374151' }} data-testid="select-preset">
                  <SelectValue placeholder="Load a scenario preset..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal-weekday-lunch">Normal Weekday Lunch</SelectItem>
                  <SelectItem value="normal-weekday-dinner">Normal Weekday Dinner</SelectItem>
                  <SelectItem value="busy-friday-dinner">Busy Friday Dinner</SelectItem>
                  <SelectItem value="busy-saturday-dinner">Busy Saturday Dinner</SelectItem>
                  <SelectItem value="large-party">Large Party (150+)</SelectItem>
                  <SelectItem value="holiday-weekend">Holiday Weekend</SelectItem>
                  <SelectItem value="slow-monday">Slow Monday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1 block text-white">Prep Sign-Off</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className={readinessInputs.prepSignedOff ? "text-white border-green-600" : ""}
                  style={readinessInputs.prepSignedOff ? { background: '#166534', borderColor: '#22c55e' } : {}}
                  onClick={() => setReadinessInputs(prev => ({ ...prev, prepSignedOff: true }))}
                  data-testid="btn-prep-yes"
                >
                  <Check className="h-4 w-4 mr-1" /> Yes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={!readinessInputs.prepSignedOff ? "text-white border-amber-600" : ""}
                  style={!readinessInputs.prepSignedOff ? { background: '#92400e', borderColor: '#f59e0b' } : {}}
                  onClick={() => setReadinessInputs(prev => ({ ...prev, prepSignedOff: false, prepSignOffTime: "" }))}
                  data-testid="btn-prep-no"
                >
                  <XCircle className="h-4 w-4 mr-1" /> No
                </Button>
                {readinessInputs.prepSignedOff && (
                  <Input
                    type="time"
                    className="w-36"
                    style={{ background: '#111827', borderColor: '#374151' }}
                    value={readinessInputs.prepSignOffTime}
                    onChange={(e) => setReadinessInputs(prev => ({ ...prev, prepSignOffTime: e.target.value }))}
                    data-testid="input-prep-time"
                  />
                )}
              </div>
              <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Has the kitchen been formally signed off on prep?</p>
            </div>

            <div>
              <Label className="mb-1 block text-white">Station Status</Label>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {stationList.map(station => {
                    const isReady = readinessInputs.stations[station.key];
                    const Icon = station.icon;
                    return (
                      <Button
                        key={station.key}
                        variant="outline"
                        size="sm"
                        className="text-white"
                        style={isReady ? { background: '#166534', borderColor: '#22c55e' } : { background: '#7f1d1d', borderColor: '#ef4444' }}
                        onClick={() => {
                          setReadinessInputs(prev => ({
                            ...prev,
                            stations: { ...prev.stations, [station.key]: !prev.stations[station.key] },
                          }));
                          if (readinessInputs.stations[station.key]) {
                          } else {
                            setStationIssues(prev => { const n = {...prev}; delete n[station.key]; return n; });
                          }
                        }}
                        data-testid={`btn-station-${station.key}`}
                      >
                        <Icon className="h-4 w-4 mr-1" />
                        {station.label}
                      </Button>
                    );
                  })}
                </div>
                {stationList.some(s => !readinessInputs.stations[s.key]) && (
                  <>
                    <div style={{ borderTop: '1px solid #2a2d3e' }} className="pt-2" />
                    <div className="space-y-2 pl-1" style={{ transition: 'max-height 300ms ease, opacity 300ms ease' }}>
                      {stationList.filter(s => !readinessInputs.stations[s.key]).map(station => (
                        <div key={station.key} className="flex items-center gap-2" style={{ animation: 'slideDown 200ms ease' }}>
                          <Badge className="text-xs shrink-0 border" style={{ background: '#7f1d1d', color: '#fca5a5', borderColor: '#991b1b' }}>{station.label}</Badge>
                          <Input
                            placeholder={`What's the issue? (e.g., "${station.label === "Saut\u00e9" ? "Pilot light out" : "No cook until 5pm"}")`}
                            style={{ background: '#111827', borderColor: '#374151' }}
                            value={stationIssues[station.key] || ""}
                            onChange={(e) => setStationIssues(prev => ({ ...prev, [station.key]: e.target.value }))}
                            data-testid={`input-station-issue-${station.key}`}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <Label className="mb-1 block text-white">Par Shortages</Label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Item(s) short, comma-separated"
                  style={{ background: '#111827', borderColor: '#374151' }}
                  value={parShortageInput}
                  onChange={(e) => setParShortageInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addParShortage(); } }}
                  data-testid="input-par-shortage"
                />
                <Button variant="outline" size="sm" onClick={addParShortage} data-testid="btn-add-shortage">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {readinessInputs.parShortages.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {readinessInputs.parShortages.map((item, idx) => (
                    <Badge key={idx} className="gap-1 border" style={{ background: 'rgba(212,160,23,0.1)', color: '#d4a017', borderColor: 'rgba(212,160,23,0.3)' }} data-testid={`badge-shortage-${idx}`}>
                      {item}
                      <button onClick={() => removeParShortage(idx)} className="ml-1">
                        <XCircle className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label className="mb-1 block text-white">86 List</Label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Items currently 86'd, comma-separated"
                  style={{ background: '#111827', borderColor: '#374151' }}
                  value={eightySixInput}
                  onChange={(e) => setEightySixInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEightySixItem(); } }}
                  data-testid="input-86-list"
                />
                <Button variant="outline" size="sm" onClick={addEightySixItem} data-testid="btn-add-86">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {readinessInputs.eightySixItems.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mt-2">
                  {readinessInputs.eightySixItems.map((item, idx) => (
                    <Badge key={idx} className="gap-1 border" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }} data-testid={`badge-86-${idx}`}>
                      {item}
                      <button onClick={() => removeEightySixItem(idx)} className="ml-1">
                        <XCircle className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <button onClick={() => setReadinessInputs(prev => ({ ...prev, eightySixItems: [] }))} className="text-xs ml-2" style={{ color: '#ef4444' }} data-testid="btn-clear-86">
                    Clear All
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="headcount" className="text-white">BOH Headcount</Label>
                <Input
                  id="headcount"
                  type="number"
                  placeholder="Staff on shift"
                  className="mt-1"
                  style={{ background: '#111827', borderColor: '#374151' }}
                  value={readinessInputs.headcount}
                  onChange={(e) => setReadinessInputs(prev => ({ ...prev, headcount: e.target.value }))}
                  data-testid="input-headcount"
                />
              </div>
              <div>
                <Label htmlFor="forecastedCovers" className="text-white">Forecasted Covers</Label>
                <Input
                  id="forecastedCovers"
                  type="number"
                  placeholder="Expected covers"
                  className="mt-1"
                  style={{ background: '#111827', borderColor: '#374151' }}
                  value={readinessInputs.forecastedCovers}
                  onChange={(e) => setReadinessInputs(prev => ({ ...prev, forecastedCovers: e.target.value }))}
                  data-testid="input-forecasted-covers"
                />
              </div>
            </div>
            {coversPerCook !== null && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#111827', border: '1px solid #2a2d3e' }} data-testid="covers-per-cook">
                <Gauge className="h-4 w-4" style={{ color: getCoversPerCookColor(coversPerCook).color }} />
                <span className="text-sm font-semibold" style={{ color: getCoversPerCookColor(coversPerCook).color }}>
                  {coversPerCook.toFixed(1)} covers/cook
                </span>
                <span className="text-xs" style={{ color: '#9ca3af' }}>{getCoversPerCookColor(coversPerCook).label}</span>
              </div>
            )}

            <div>
              <Label className="mb-1 block text-white">Large Party</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReadinessInputs(prev => ({ ...prev, largeParty: !prev.largeParty }))}
                data-testid="btn-large-party"
              >
                {readinessInputs.largeParty ? <ChevronDown className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                Large Party
              </Button>
              {readinessInputs.largeParty && (
                <div className="mt-2 p-3 rounded-lg space-y-2" style={{ background: '#111827', border: '1px solid #2a2d3e', animation: 'slideDown 200ms ease' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: '#9ca3af' }}>Party Details</span>
                    <button onClick={() => setReadinessInputs(prev => ({ ...prev, largeParty: false, largePartySize: "", largePartyTime: "", largePartySeating: "" }))} data-testid="btn-remove-large-party">
                      <X className="h-3.5 w-3.5" style={{ color: '#9ca3af' }} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs" style={{ color: '#9ca3af' }}>Party Size</Label>
                      <Input type="number" placeholder="e.g. 20" className="mt-0.5" style={{ background: '#1a1d2e', borderColor: '#374151' }} value={readinessInputs.largePartySize} onChange={(e) => setReadinessInputs(prev => ({ ...prev, largePartySize: e.target.value }))} data-testid="input-large-party-size" />
                    </div>
                    <div>
                      <Label className="text-xs" style={{ color: '#9ca3af' }}>Arrival Time</Label>
                      <Input placeholder="7:30 PM" className="mt-0.5" style={{ background: '#1a1d2e', borderColor: '#374151' }} value={readinessInputs.largePartyTime} onChange={(e) => setReadinessInputs(prev => ({ ...prev, largePartyTime: e.target.value }))} data-testid="input-large-party-time" />
                    </div>
                    <div>
                      <Label className="text-xs" style={{ color: '#9ca3af' }}>Seated Where</Label>
                      <Input placeholder="Patio" className="mt-0.5" style={{ background: '#1a1d2e', borderColor: '#374151' }} value={readinessInputs.largePartySeating} onChange={(e) => setReadinessInputs(prev => ({ ...prev, largePartySeating: e.target.value }))} data-testid="input-large-party-seating" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 rounded-lg space-y-3" style={{ background: '#111827', border: '1px solid #2a2d3e' }}>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-1 text-white">
                  <TrendingUp className="h-4 w-4" style={{ color: '#d4a017' }} /> Score Breakdown
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: liveScoreColor }} data-testid="text-live-score">{scoreData.total}/100</span>
                  <Badge className="text-[10px]" style={{
                    background: scoreData.total >= 80 ? 'rgba(34,197,94,0.15)' : scoreData.total >= 60 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                    color: liveScoreColor,
                    borderColor: scoreData.total >= 80 ? 'rgba(34,197,94,0.3)' : scoreData.total >= 60 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)',
                  }} data-testid="badge-live-score">{liveScoreLevel}</Badge>
                </div>
              </div>
              {scoreData.categories.map(cat => (
                <div key={cat.label} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-white">{cat.label}</span>
                    <span className="text-xs" style={{ color: '#9ca3af' }}>{cat.score}/{cat.max}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1a1d2e' }}>
                    <div
                      className="h-full transition-all duration-300 rounded-full"
                      style={{
                        width: `${(cat.score / cat.max) * 100}%`,
                        background: (cat.score / cat.max) >= 0.8 ? '#22c55e' : (cat.score / cat.max) >= 0.5 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                </div>
              ))}
              {scoreData.topFixes.length > 0 && (
                <div className="pt-2 space-y-1" style={{ borderTop: '1px solid #2a2d3e' }}>
                  <p className="text-xs font-medium" style={{ color: '#9ca3af' }}>Top improvements</p>
                  {scoreData.topFixes.map((fix, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1 text-white">
                        <ArrowRight className="h-3 w-3" style={{ color: '#d4a017' }} /> {fix.label}
                      </span>
                      <span className="font-medium" style={{ color: '#22c55e' }}>+{fix.points} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4 mt-4">
            <p className="text-sm" style={{ color: '#9ca3af' }}>During-service execution alerts. Is ticket flow breaking down?</p>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg p-2.5" style={{ background: '#111827', border: '1px solid #2a2d3e' }}>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: '#9ca3af' }}>Apps</p>
                {(() => {
                  const v = parseInt(alertsInputs.avgAppTime) || 0;
                  const inRange = v >= 8 && v <= 10;
                  return <p className="text-sm font-semibold" style={{ color: v === 0 ? '#6b7280' : inRange ? '#22c55e' : '#ef4444' }}>{v > 0 ? `${v}m` : '--'}</p>;
                })()}
              </div>
              <div className="rounded-lg p-2.5" style={{ background: '#111827', border: '1px solid #2a2d3e' }}>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: '#9ca3af' }}>Entr\u00e9es</p>
                {(() => {
                  const v = parseInt(alertsInputs.avgEntreeTime) || 0;
                  const inRange = v >= 15 && v <= 18;
                  return <p className="text-sm font-semibold" style={{ color: v === 0 ? '#6b7280' : inRange ? '#22c55e' : '#ef4444' }}>{v > 0 ? `${v}m` : '--'}</p>;
                })()}
              </div>
              <div className="rounded-lg p-2.5" style={{ background: '#111827', border: '1px solid #2a2d3e' }}>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: '#9ca3af' }}>Window</p>
                <p className={`text-sm font-semibold ${alertsInputs.windowHolding ? 'animate-pulse' : ''}`} style={{ color: alertsInputs.windowHolding ? '#ef4444' : '#22c55e' }}>
                  {alertsInputs.windowHolding ? 'Holding' : 'Clear'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="avgAppTime" className="text-white">Avg App Time (min)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="avgAppTime"
                    type="number"
                    placeholder="e.g. 9"
                    style={{ background: '#111827', borderColor: '#374151' }}
                    value={alertsInputs.avgAppTime}
                    onChange={(e) => setAlertsInputs(prev => ({ ...prev, avgAppTime: e.target.value }))}
                    data-testid="input-avg-app-time"
                  />
                  <Badge className="text-[10px] shrink-0" style={{ background: 'rgba(212,160,23,0.1)', color: '#d4a017', borderColor: 'rgba(212,160,23,0.3)' }}>Std: 8-10</Badge>
                </div>
              </div>
              <div>
                <Label htmlFor="avgEntreeTime" className="text-white">Avg Entr\u00e9e Time (min)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="avgEntreeTime"
                    type="number"
                    placeholder="e.g. 16"
                    style={{ background: '#111827', borderColor: '#374151' }}
                    value={alertsInputs.avgEntreeTime}
                    onChange={(e) => setAlertsInputs(prev => ({ ...prev, avgEntreeTime: e.target.value }))}
                    data-testid="input-avg-entree-time"
                  />
                  <Badge className="text-[10px] shrink-0" style={{ background: 'rgba(212,160,23,0.1)', color: '#d4a017', borderColor: 'rgba(212,160,23,0.3)' }}>Std: 15-18</Badge>
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-1 block text-white">Window Holding</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-white"
                  style={alertsInputs.windowHolding ? { background: '#7f1d1d', borderColor: '#ef4444' } : {}}
                  onClick={() => setAlertsInputs(prev => ({ ...prev, windowHolding: true }))}
                  data-testid="btn-window-yes"
                >
                  <AlertTriangle className="h-4 w-4 mr-1" /> Yes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-white"
                  style={!alertsInputs.windowHolding ? { background: '#166534', borderColor: '#22c55e' } : {}}
                  onClick={() => setAlertsInputs(prev => ({ ...prev, windowHolding: false }))}
                  data-testid="btn-window-no"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" /> No
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Cover Pace</Label>
                <Select value={alertsInputs.coverPace} onValueChange={(v) => setAlertsInputs(prev => ({ ...prev, coverPace: v }))}>
                  <SelectTrigger className="mt-1" style={{ background: '#111827', borderColor: '#374151' }} data-testid="select-cover-pace">
                    <SelectValue placeholder="Select pace..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ahead">Ahead</SelectItem>
                    <SelectItem value="on-pace">On Pace</SelectItem>
                    <SelectItem value="behind">Behind</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white">Bottleneck Station</Label>
                <Select value={alertsInputs.bottleneckStation} onValueChange={(v) => setAlertsInputs(prev => ({ ...prev, bottleneckStation: v }))}>
                  <SelectTrigger className="mt-1" style={{ background: '#111827', borderColor: '#374151' }} data-testid="select-bottleneck-alerts">
                    <SelectValue placeholder="Select station..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="saute">Saut\u00e9</SelectItem>
                    <SelectItem value="grill">Grill</SelectItem>
                    <SelectItem value="fry">Fry</SelectItem>
                    <SelectItem value="pantry">Pantry</SelectItem>
                    <SelectItem value="expo">Expo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {alertsInputs.bottleneckStation && alertsInputs.bottleneckStation !== "none" && BOTTLENECK_INSIGHTS[alertsInputs.bottleneckStation] && (
              <div className="rounded-lg p-3 border-l-[3px]" style={{ background: 'rgba(212,160,23,0.06)', borderLeftColor: '#d4a017' }} data-testid="bottleneck-insight">
                <p className="text-xs" style={{ color: '#d4a017' }}>
                  {stationList.find(s => s.key === alertsInputs.bottleneckStation)?.label} bottlenecks typically cause {BOTTLENECK_INSIGHTS[alertsInputs.bottleneckStation].issue}.
                </p>
                <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                  Coach action: {BOTTLENECK_INSIGHTS[alertsInputs.bottleneckStation].action}
                </p>
              </div>
            )}

            <div>
              <div className="flex items-center">
                <Label htmlFor="managerNotesAlerts" className="text-white">Manager Notes</Label>
                <VoiceButton field="managerNotes" label="Dictate manager notes" />
              </div>
              <Textarea
                id="managerNotesAlerts"
                placeholder="Additional context about current service..."
                className="mt-1 min-h-[60px]"
                style={{ background: '#111827', borderColor: '#374151' }}
                value={alertsInputs.managerNotes}
                onChange={(e) => setAlertsInputs(prev => ({ ...prev, managerNotes: e.target.value }))}
                data-testid="input-manager-notes-alerts"
              />
            </div>
          </TabsContent>

          <TabsContent value="quick-debrief" className="space-y-4 mt-4">
            <div className="text-center pb-4" style={{ borderBottom: '1px solid #2a2d3e' }}>
              <h3 className="text-lg font-semibold text-white">60-Second Post-Service Debrief</h3>
              <p className="text-sm" style={{ color: '#9ca3af' }}>Quick capture while it's fresh. Don't overthink it.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Bottleneck Station</Label>
                <Select value={debriefInputs.bottleneck} onValueChange={(v) => setDebriefInputs(prev => ({ ...prev, bottleneck: v }))}>
                  <SelectTrigger className="mt-1" style={{ background: '#111827', borderColor: '#374151' }} data-testid="select-bottleneck-debrief">
                    <SelectValue placeholder="Select station..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="saute">Saut\u00e9</SelectItem>
                    <SelectItem value="grill">Grill</SelectItem>
                    <SelectItem value="fry">Fry</SelectItem>
                    <SelectItem value="pantry">Pantry</SelectItem>
                    <SelectItem value="expo">Expo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white">Root Cause</Label>
                <Select value={debriefInputs.rootCause} onValueChange={(v) => setDebriefInputs(prev => ({ ...prev, rootCause: v }))}>
                  <SelectTrigger className="mt-1" style={{ background: '#111827', borderColor: '#374151' }} data-testid="select-root-cause">
                    <SelectValue placeholder="Select root cause..." />
                  </SelectTrigger>
                  <SelectContent>
                    {rootCauseOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fixOwner" className="text-white">Fix Owner</Label>
                <Input
                  id="fixOwner"
                  placeholder="Who's responsible?"
                  className="mt-1"
                  style={{ background: '#111827', borderColor: '#374151' }}
                  value={debriefInputs.fixOwner}
                  onChange={(e) => setDebriefInputs(prev => ({ ...prev, fixOwner: e.target.value }))}
                  data-testid="input-fix-owner"
                />
              </div>
              <div>
                <Label className="text-white">Fix Due By</Label>
                <Select value={debriefInputs.fixDueBy} onValueChange={(v) => setDebriefInputs(prev => ({ ...prev, fixDueBy: v }))}>
                  <SelectTrigger className="mt-1" style={{ background: '#111827', borderColor: '#374151' }} data-testid="select-fix-due-by">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="next-shift">Next shift</SelectItem>
                    <SelectItem value="tomorrow-am">Tomorrow AM</SelectItem>
                    <SelectItem value="end-of-week">End of week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center">
                  <Label htmlFor="whatWentWell" className="text-lg font-semibold" style={{ color: '#22c55e' }}>What went well?</Label>
                  <VoiceButton field="wellDone" label="Dictate what went well" />
                </div>
                <Textarea
                  id="whatWentWell"
                  placeholder="One thing that worked tonight..."
                  className="mt-1 min-h-[60px]"
                  style={{ background: '#111827', borderColor: 'rgba(34,197,94,0.3)' }}
                  value={debriefInputs.whatWentWell}
                  onChange={(e) => setDebriefInputs(prev => ({ ...prev, whatWentWell: e.target.value }))}
                  data-testid="input-what-went-well"
                />
              </div>

              <div>
                <div className="flex items-center">
                  <Label htmlFor="whatSucked" className="text-lg font-semibold" style={{ color: '#ef4444' }}>What sucked?</Label>
                  <VoiceButton field="sucked" label="Dictate what went wrong" />
                </div>
                <Textarea
                  id="whatSucked"
                  placeholder="One thing that broke down..."
                  className="mt-1 min-h-[60px]"
                  style={{ background: '#111827', borderColor: 'rgba(239,68,68,0.3)' }}
                  value={debriefInputs.whatSucked}
                  onChange={(e) => setDebriefInputs(prev => ({ ...prev, whatSucked: e.target.value }))}
                  data-testid="input-what-sucked"
                />
              </div>

              <div>
                <div className="flex items-center">
                  <Label htmlFor="fixForTomorrow" className="text-lg font-semibold" style={{ color: '#d4a017' }}>One fix for tomorrow</Label>
                  <VoiceButton field="fix" label="Dictate tomorrow's fix" />
                </div>
                <Textarea
                  id="fixForTomorrow"
                  placeholder="The one thing we're changing..."
                  className="mt-1 min-h-[60px]"
                  style={{ background: '#111827', borderColor: 'rgba(212,160,23,0.3)' }}
                  value={debriefInputs.fixForTomorrow}
                  onChange={(e) => setDebriefInputs(prev => ({ ...prev, fixForTomorrow: e.target.value }))}
                  data-testid="input-fix-tomorrow"
                />
              </div>

              <Button
                onClick={saveQuickDebrief}
                disabled={isSaving || (!debriefInputs.whatWentWell && !debriefInputs.whatSucked && !debriefInputs.fixForTomorrow)}
                className="w-full text-white"
                style={quickDebriefSaved ? { background: '#166534' } : {}}
                data-testid="btn-save-quick-debrief"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : quickDebriefSaved ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Debrief Logged
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Log Debrief & Close Out
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="debrief" className="space-y-4 mt-4">
            <p className="text-sm" style={{ color: '#9ca3af' }}>Post-shift analysis. What broke, why, and what to fix tomorrow.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center">
                  <Label htmlFor="ticketTimesDebrief" className="text-white">Ticket Timing Issues</Label>
                  <VoiceButton field="fullTickets" label="Dictate ticket times" />
                </div>
                <div className="relative">
                  <Textarea
                    id="ticketTimesDebrief"
                    placeholder="e.g., Entr\u00e9es averaged 22 min during 7-8pm push..."
                    className="mt-1 min-h-[100px]"
                    style={{ background: '#111827', borderColor: '#374151' }}
                    value={fullDebriefInputs.ticketTimes}
                    onChange={(e) => setFullDebriefInputs(prev => ({ ...prev, ticketTimes: e.target.value }))}
                    data-testid="input-ticket-times-debrief"
                  />
                  <span className="absolute bottom-2 right-2 text-[10px]" style={{ color: '#6b7280' }}>{fullDebriefInputs.ticketTimes.length} / 300</span>
                </div>
              </div>
              <div>
                <div className="flex items-center">
                  <Label htmlFor="windowDelaysDebrief" className="text-white">Window Problems</Label>
                  <VoiceButton field="fullWindow" label="Dictate window issues" />
                </div>
                <div className="relative">
                  <Textarea
                    id="windowDelaysDebrief"
                    placeholder="e.g., Window congestion 7:15-8:00, 6 instances of food dying..."
                    className="mt-1 min-h-[100px]"
                    style={{ background: '#111827', borderColor: '#374151' }}
                    value={fullDebriefInputs.windowDelays}
                    onChange={(e) => setFullDebriefInputs(prev => ({ ...prev, windowDelays: e.target.value }))}
                    data-testid="input-window-delays-debrief"
                  />
                  <span className="absolute bottom-2 right-2 text-[10px]" style={{ color: '#6b7280' }}>{fullDebriefInputs.windowDelays.length} / 300</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center">
                  <Label htmlFor="prepIssuesDebrief" className="text-white">Prep Issues Discovered</Label>
                  <VoiceButton field="fullPrep" label="Dictate prep issues" />
                </div>
                <div className="relative">
                  <Textarea
                    id="prepIssuesDebrief"
                    placeholder="e.g., Ran out of compound butter, mislabeled containers..."
                    className="mt-1 min-h-[80px]"
                    style={{ background: '#111827', borderColor: '#374151' }}
                    value={fullDebriefInputs.prepIssues}
                    onChange={(e) => setFullDebriefInputs(prev => ({ ...prev, prepIssues: e.target.value }))}
                    data-testid="input-prep-issues-debrief"
                  />
                  <span className="absolute bottom-2 right-2 text-[10px]" style={{ color: '#6b7280' }}>{fullDebriefInputs.prepIssues.length} / 300</span>
                </div>
              </div>
              <div>
                <div className="flex items-center">
                  <Label htmlFor="wasteDebrief" className="text-white">Service Waste</Label>
                  <VoiceButton field="fullWaste" label="Dictate waste notes" />
                </div>
                <div className="relative">
                  <Textarea
                    id="wasteDebrief"
                    placeholder="e.g., 4 remakes on grill, 2 wrong-plate fires..."
                    className="mt-1 min-h-[80px]"
                    style={{ background: '#111827', borderColor: '#374151' }}
                    value={fullDebriefInputs.serviceWaste}
                    onChange={(e) => setFullDebriefInputs(prev => ({ ...prev, serviceWaste: e.target.value }))}
                    data-testid="input-waste-debrief"
                  />
                  <span className="absolute bottom-2 right-2 text-[10px]" style={{ color: '#6b7280' }}>{fullDebriefInputs.serviceWaste.length} / 300</span>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center">
                <Label htmlFor="managerNotesDebrief" className="text-white">Manager Notes</Label>
                <VoiceButton field="fullManager" label="Dictate manager notes" />
              </div>
              <div className="relative">
                <Textarea
                  id="managerNotesDebrief"
                  placeholder="e.g., Runner coverage insufficient, new cook struggled on grill..."
                  className="mt-1 min-h-[80px]"
                  style={{ background: '#111827', borderColor: '#374151' }}
                  value={fullDebriefInputs.managerNotes}
                  onChange={(e) => setFullDebriefInputs(prev => ({ ...prev, managerNotes: e.target.value }))}
                  data-testid="input-manager-notes-debrief"
                />
                <span className="absolute bottom-2 right-2 text-[10px]" style={{ color: '#6b7280' }}>{fullDebriefInputs.managerNotes.length} / 300</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="coaching" className="space-y-4 mt-4">
            <p className="text-sm" style={{ color: '#9ca3af' }}>Identify ONE behavior to coach. Prevents scattershot corrections.</p>

            <div>
              <Label className="text-white">Target Station</Label>
              <Select value={coachingInputs.targetStation} onValueChange={(v) => setCoachingInputs(prev => ({ ...prev, targetStation: v }))}>
                <SelectTrigger className="mt-1" style={{ background: '#111827', borderColor: '#374151' }} data-testid="select-coaching-station">
                  <SelectValue placeholder="Select station..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="saute"><span className="flex items-center gap-2"><Flame className="h-3.5 w-3.5" style={{ color: '#ef4444' }} /> Saut\u00e9</span></SelectItem>
                  <SelectItem value="grill"><span className="flex items-center gap-2"><ThermometerSun className="h-3.5 w-3.5" style={{ color: '#f59e0b' }} /> Grill</span></SelectItem>
                  <SelectItem value="fry"><span className="flex items-center gap-2"><Utensils className="h-3.5 w-3.5" style={{ color: '#d4a017' }} /> Fry</span></SelectItem>
                  <SelectItem value="pantry"><span className="flex items-center gap-2"><Package className="h-3.5 w-3.5" style={{ color: '#22c55e' }} /> Pantry</span></SelectItem>
                  <SelectItem value="expo"><span className="flex items-center gap-2"><ClipboardList className="h-3.5 w-3.5" style={{ color: '#3b82f6' }} /> Expo</span></SelectItem>
                  <SelectItem value="dish"><span className="flex items-center gap-2"><UtensilsCrossed className="h-3.5 w-3.5" style={{ color: '#9ca3af' }} /> Dish</span></SelectItem>
                  <SelectItem value="foh-support"><span className="flex items-center gap-2"><Users className="h-3.5 w-3.5" style={{ color: '#a78bfa' }} /> FOH Support</span></SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white text-base font-semibold">Behavior to Coach</Label>
              <Select value={coachingInputs.behavior} onValueChange={(v) => setCoachingInputs(prev => ({ ...prev, behavior: v }))}>
                <SelectTrigger className="mt-1 text-base py-3" style={{ background: '#111827', borderColor: '#374151' }} data-testid="select-coaching-behavior">
                  <SelectValue placeholder="Select behavior..." />
                </SelectTrigger>
                <SelectContent>
                  {coachingBehaviors.map(b => (
                    <SelectItem key={b} value={b}>{b === "custom" ? "Custom..." : b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {coachingInputs.behavior && coachingInputs.behavior !== "custom" && (
              <div className="p-3 border-l-[3px] rounded-r-lg" style={{ borderLeftColor: '#d4a017', background: 'rgba(212,160,23,0.06)' }} data-testid="coaching-preview">
                <p className="text-sm italic" style={{ color: '#9ca3af' }}>
                  This coaching session will focus on: <span className="font-medium text-white">{coachingInputs.behavior}</span>
                </p>
              </div>
            )}

            {coachingInputs.behavior === "custom" && (
              <div>
                <Label htmlFor="customBehavior" className="text-white">Describe the behavior</Label>
                <Input
                  id="customBehavior"
                  placeholder="Specific observable behavior..."
                  className="mt-1"
                  style={{ background: '#111827', borderColor: '#374151' }}
                  value={coachingInputs.customBehavior}
                  onChange={(e) => setCoachingInputs(prev => ({ ...prev, customBehavior: e.target.value }))}
                  data-testid="input-custom-behavior"
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {mode !== "quick-debrief" && (
          <div className="sticky bottom-0 z-50 pt-3 pb-[env(safe-area-inset-bottom)] -mx-6 px-6 border-t" style={{ background: '#1a1d2e', borderColor: '#2a2d3e' }}>
            <Button
              onClick={generateAnalysis}
              disabled={isGenerating}
              className="w-full text-white"
              style={{ background: '#b8860b' }}
              data-testid="btn-generate-kitchen"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === "readiness" ? "Calculating readiness..." :
                   mode === "alerts" ? "Analyzing service flow..." :
                   mode === "debrief" ? "Building debrief..." :
                   "Creating coaching plan..."}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate {modeLabels[mode]}
                </>
              )}
            </Button>
          </div>
        )}

        {analysis && (
          <div className="mt-4 space-y-3">
            {renderStructuredKitchenOutput()}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyToClipboardKitchen} data-testid="btn-copy-kitchen">
                {kitchenCopied ? <Check className="h-4 w-4 mr-2" style={{ color: '#22c55e' }} /> : <Copy className="h-4 w-4 mr-2" />}
                {kitchenCopied ? "Copied" : "Copy to Clipboard"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const HR_SEVERITY_DOTS: Record<string, string> = {
  attendance: '#eab308',
  ncns: '#eab308',
  performance: '#f97316',
  conduct: '#f97316',
  'guest-incident': '#f97316',
  safety: '#ef4444',
  insubordination: '#ef4444',
  'cash-handling': '#ef4444',
};

const HR_DISCIPLINE_BADGE_STYLES: Record<string, string> = {
  first: 'bg-yellow-900/40 text-yellow-400 border border-yellow-600/30',
  second: 'bg-amber-900/40 text-amber-400 border border-amber-600/30',
  third: 'bg-red-900/40 text-red-400 border border-red-600/30',
};

function HRStatusStrip() {
  const { data: documents } = useQuery<any[]>({
    queryKey: ["/api/hr-documents"],
  });
  const totalRecords = documents?.length || 0;
  const pendingCount = documents?.filter((d: any) => !d.scanFilename && !d.signedAt).length || 0;
  const now = new Date();
  const thisMonthCount = documents?.filter((d: any) => {
    const created = new Date(d.createdAt);
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length || 0;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 mb-6 scrollbar-thin" data-testid="hr-status-strip">
      <div className="flex-shrink-0 min-w-[180px] rounded-lg p-3 border-l-[3px]" style={{ background: '#1a1d2e', borderLeftColor: '#b8860b' }}>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Total HR Records</div>
        <div className="text-xl font-bold text-white mt-1" data-testid="text-total-hr-records">{totalRecords}</div>
      </div>
      <div className="flex-shrink-0 min-w-[180px] rounded-lg p-3 border-l-[3px]" style={{ background: '#1a1d2e', borderLeftColor: '#b8860b' }}>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Pending Signatures</div>
        <div className={`text-xl font-bold mt-1 ${pendingCount > 0 ? 'text-amber-400' : 'text-white'}`} data-testid="text-pending-sigs">{pendingCount}</div>
      </div>
      <div className="flex-shrink-0 min-w-[180px] rounded-lg p-3 border-l-[3px]" style={{ background: '#1a1d2e', borderLeftColor: '#b8860b' }}>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">This Month</div>
        <div className="text-xl font-bold text-white mt-1" data-testid="text-this-month-hr">{thisMonthCount}</div>
      </div>
    </div>
  );
}

function ProgressiveDisciplineIndicator({ step }: { step: string }) {
  const steps = [
    { value: 'first', label: '1st', sublabel: 'Warning' },
    { value: 'second', label: '2nd', sublabel: 'Suspension' },
    { value: 'third', label: '3rd', sublabel: 'Term.' },
  ];
  const activeIdx = steps.findIndex(s => s.value === step);

  return (
    <div className="flex items-center gap-0 mt-2 px-1" data-testid="discipline-indicator">
      {steps.map((s, i) => {
        const isActive = i === activeIdx;
        const isPast = i < activeIdx;
        return (
          <div key={s.value} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center"
                style={{
                  borderColor: isActive ? '#d4a017' : isPast ? '#b8860b' : 'rgba(255,255,255,0.15)',
                  background: isActive ? '#d4a017' : isPast ? 'rgba(184,134,11,0.3)' : 'transparent',
                  boxShadow: isActive ? '0 0 8px rgba(212,160,23,0.4)' : 'none',
                }}
              />
              <span className="text-[10px] mt-1" style={{ color: isActive ? '#d4a017' : '#6b7280' }}>{s.label}</span>
              <span className="text-[9px]" style={{ color: isActive ? '#d4a017' : '#4b5563' }}>{s.sublabel}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="w-8 h-0.5 mx-0.5 -mt-5" style={{ background: isPast || isActive ? 'rgba(184,134,11,0.5)' : 'rgba(255,255,255,0.08)' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function EmployeeDisciplineTrailModal({ open, onClose, employeeName, documents }: { open: boolean; onClose: () => void; employeeName: string; documents: any[] }) {
  const employeeDocs = documents
    .filter((d: any) => d.employeeName === employeeName)
    .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const disciplineLevelLabels: Record<string, string> = {
    first: 'Verbal/Written Warning',
    second: '3 Shift Suspension',
    third: '5 Shift Suspension/Termination',
  };

  const highestLevel = employeeDocs.reduce((max: string, d: any) => {
    const order: Record<string, number> = { first: 1, second: 2, third: 3 };
    return (order[d.disciplineLevel] || 0) > (order[max] || 0) ? d.disciplineLevel : max;
  }, 'first');

  const nextStep = highestLevel === 'first' ? '3 Shift Suspension' : highestLevel === 'second' ? '5 Shift Suspension or Termination' : 'Immediate Termination';

  const issueTypeLabels: Record<string, string> = {
    attendance: 'Attendance', ncns: 'No-Call/No-Show', performance: 'Performance',
    conduct: 'Conduct', 'guest-incident': 'Guest Incident', safety: 'Safety',
    insubordination: 'Insubordination', 'cash-handling': 'Cash Handling',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" style={{ color: '#d4a017' }} />
            Discipline Trail: {employeeName}
          </DialogTitle>
          <DialogDescription>
            {employeeDocs.length} record{employeeDocs.length !== 1 ? 's' : ''} on file
          </DialogDescription>
        </DialogHeader>

        {employeeDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No records found for this employee.</p>
        ) : (
          <div className="relative pl-6 space-y-4 py-2">
            <div className="absolute left-[11px] top-4 bottom-4 w-0.5" style={{ background: 'rgba(184,134,11,0.3)' }} />
            {employeeDocs.map((doc: any, i: number) => (
              <div key={doc.id} className="relative" data-testid={`trail-entry-${doc.id}`}>
                <div className="absolute -left-6 top-1 w-3 h-3 rounded-full border-2" style={{ borderColor: '#d4a017', background: i === employeeDocs.length - 1 ? '#d4a017' : '#1a1d2e' }} />
                <div className="rounded-lg p-3 border" style={{ background: '#1a1d2e', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs text-muted-foreground">
                      {doc.incidentDate ? new Date(doc.incidentDate).toLocaleDateString() : new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                    <Badge className={`text-[10px] px-1.5 py-0 ${HR_DISCIPLINE_BADGE_STYLES[doc.disciplineLevel] || ''}`}>
                      {disciplineLevelLabels[doc.disciplineLevel] || doc.disciplineLevel}
                    </Badge>
                    {(doc.scanFilename || doc.signedAt) ? (
                      <Badge className="text-[10px] px-1.5 py-0 bg-green-500/15 text-green-400 border-green-500/30">Signed</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-400 border-amber-500/30">Pending</Badge>
                    )}
                  </div>
                  <div className="text-sm text-white/80">{issueTypeLabels[doc.issueType] || doc.issueType}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {employeeDocs.length > 0 && (
          <div className="rounded-lg p-3 mt-2" style={{ background: 'rgba(184,134,11,0.08)', border: '1px solid rgba(184,134,11,0.25)' }} data-testid="next-step-callout">
            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#d4a017' }}>Next Step</div>
            <p className="text-sm text-white/90">
              If {employeeName} receives another notice, the next step is: <span className="font-semibold" style={{ color: '#d4a017' }}>{nextStep}</span>
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="btn-close-trail">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HRComplianceEngine() {
  const { toast } = useToast();
  const [issueType, setIssueType] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [employeeName, setEmployeeName] = useState<string>("");
  const [employeeRole, setEmployeeRole] = useState<string>("");
  const [incidentDate, setIncidentDate] = useState<string>("");
  const [priorIncidents, setPriorIncidents] = useState<string>("first");
  const [policyAware, setPolicyAware] = useState<string>("yes");
  const [documentation, setDocumentation] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [savedDocId, setSavedDocId] = useState<number | null>(null);
  const [copiedState, setCopiedState] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const issueTypes = [
    { value: "attendance", label: "Attendance / Tardiness" },
    { value: "ncns", label: "No-Call / No-Show" },
    { value: "performance", label: "Performance Failure" },
    { value: "conduct", label: "Conduct / Policy Violation" },
    { value: "guest-incident", label: "Guest-Related Incident" },
    { value: "safety", label: "Safety / Compliance Issue" },
    { value: "insubordination", label: "Insubordination" },
    { value: "cash-handling", label: "Cash Handling Violation" },
  ];

  const priorIncidentOptions = [
    { value: "first", label: "1st Instance - Verbal/Written Warning" },
    { value: "second", label: "2nd Instance - 3 Shift Suspension" },
    { value: "third", label: "3rd Instance - 5 Shift Suspension/Termination" },
  ];

  const generateDocumentation = async () => {
    if (!issueType || !description) {
      toast({ title: "Please select issue type and describe what happened", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setDocumentation("");

    try {
      const issueLabel = issueTypes.find(i => i.value === issueType)?.label || issueType;
      const priorLabel = priorIncidentOptions.find(p => p.value === priorIncidents)?.label || priorIncidents;

      const disciplineInfo = priorIncidents === "first" 
        ? { level: "VERBAL/WRITTEN WARNING", consequence: "a 3 shift suspension" }
        : priorIncidents === "second" 
        ? { level: "3 SHIFT SUSPENSION", consequence: "a 5 shift suspension or termination" }
        : { level: "5 SHIFT SUSPENSION / TERMINATION", consequence: "immediate termination" };

      const res = await fetch("/api/consultant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `Generate a printable, Workforce Commission-compliant progressive discipline document for a restaurant employee.

DISCIPLINE LEVEL: ${disciplineInfo.level}
ISSUE TYPE: ${issueLabel}
EMPLOYEE NAME: ${employeeName || "[Employee Name]"}
EMPLOYEE ROLE: ${employeeRole || "[Position]"}
INCIDENT DATE: ${incidentDate || "[Date]"}

WHAT HAPPENED:
${description}

EMPLOYEE WAS AWARE OF POLICY: ${policyAware === "yes" ? "Yes" : "No/Unclear"}

This is the progressive discipline framework:
- 1st Instance: Verbal/Written Warning
- 2nd Instance: 3 Shift Suspension  
- 3rd Instance: 5 Shift Suspension or Termination

Generate a PRINTABLE document with clear sections. Format it to look professional when printed:

================================================================================
                        EMPLOYEE DISCIPLINE NOTICE
================================================================================

DOCUMENT TYPE: ${disciplineInfo.level}

DATE OF NOTICE: ${incidentDate || "_____________"}
EMPLOYEE NAME: ${employeeName || "_________________________________"}
POSITION: ${employeeRole || "_________________________________"}

--------------------------------------------------------------------------------
STATEMENT OF FACTS
--------------------------------------------------------------------------------
[Objective description - who, what, when, where. No opinions or emotional language.]

--------------------------------------------------------------------------------
POLICY/STANDARD VIOLATED
--------------------------------------------------------------------------------
[Specific policy or expectation that was not met]

--------------------------------------------------------------------------------
PRIOR COMMUNICATION OF EXPECTATIONS
--------------------------------------------------------------------------------
[How/when employee was made aware of this standard]

--------------------------------------------------------------------------------
IMPACT ON OPERATIONS
--------------------------------------------------------------------------------
[How this affected operations, guests, team, or safety]

--------------------------------------------------------------------------------
DISCIPLINARY ACTION
--------------------------------------------------------------------------------
Based on our progressive discipline policy, this ${disciplineInfo.level} is being issued.

${priorIncidents === "second" ? "The employee is hereby suspended for THREE (3) scheduled shifts without pay, effective immediately." : priorIncidents === "third" ? "The employee is hereby suspended for FIVE (5) scheduled shifts without pay OR terminated, effective immediately." : "This serves as a formal warning. No suspension at this time."}

--------------------------------------------------------------------------------
REQUIRED CORRECTIVE ACTION
--------------------------------------------------------------------------------
[Specific, measurable actions the employee must take]

--------------------------------------------------------------------------------
CONSEQUENCES FOR FUTURE VIOLATIONS
--------------------------------------------------------------------------------
Any future violation of company policy will result in ${disciplineInfo.consequence}.

================================================================================
                           ACKNOWLEDGMENT
================================================================================

[ ] I have read and understand this document.
[ ] I understand the corrective action required of me.
[ ] I understand that further violations will result in additional discipline
    up to and including termination.

Note: Signing this document does not indicate agreement with the contents,
only acknowledgment of receipt.

EMPLOYEE SIGNATURE: _________________________________  DATE: _______________

PRINT NAME: _________________________________


MANAGER SIGNATURE: _________________________________  DATE: _______________

PRINT NAME: _________________________________

WITNESS (if applicable): ___________________________  DATE: _______________


================================================================================
                        AT-WILL EMPLOYMENT STATEMENT
================================================================================
Employment with this company is "at-will" and may be terminated by either 
party at any time, with or without cause or notice. This discipline does 
not alter the at-will nature of employment.

================================================================================
                          DOCUMENT COPY DISTRIBUTION
================================================================================
[ ] Original - Employee Personnel File
[ ] Copy - Employee
[ ] Copy - Manager's Records

Ensure all language is:
- Objective and factual (no emotional language)
- Consistent with progressive discipline
- Defensible if reviewed by Workforce Commission
- Clear about expectations and consequences`,
        }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to generate documentation");

      const reader = res.body?.getReader();
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
                setDocumentation(content);
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      toast({ title: "Failed to generate documentation", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const getPdfFileName = () => `HR_Notice_${employeeName?.replace(/\s+/g, '_') || 'Employee'}_${new Date().toISOString().split('T')[0]}.pdf`;

  const buildPdf = (): jsPDF | null => {
    if (!documentation) return null;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: 'letter'
    });
    
    const margin = 0.75;
    const pageWidth = 8.5;
    const pageHeight = 11;
    const contentWidth = pageWidth - (margin * 2);
    const bottomMargin = 0.75;
    let y = margin;

    const addNewPageIfNeeded = (spaceNeeded: number = 0.3) => {
      if (y + spaceNeeded > pageHeight - bottomMargin) {
        doc.addPage();
        y = margin;
        return true;
      }
      return false;
    };

    const cleanText = documentation
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/(?<!\S)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1')
      .replace(/^#{1,6}\s/gm, '');

    const lines = cleanText.split('\n');

    const isSeparator = (l: string) => /^\s*[=]{3,}\s*$/.test(l) || /^\s*[-]{3,}\s*$/.test(l);
    const isTitleHeading = (t: string) => {
      const keywords = ['EMPLOYEE DISCIPLINE', 'ACKNOWLEDGMENT', 'AT-WILL', 'DOCUMENT COPY'];
      return keywords.some(k => t.includes(k));
    };
    const isSectionHeading = (t: string) => {
      if (t.length < 4 || t.length > 80) return false;
      if (!/[A-Z]/.test(t)) return false;
      return t === t.toUpperCase() && !/^[_\s]+$/.test(t) && !/^[^A-Za-z]*$/.test(t);
    };

    const renderWrappedText = (text: string, fontSize: number, font: string, fontStyle: string, maxWidth: number, lineHeight: number) => {
      doc.setFont(font, fontStyle);
      doc.setFontSize(fontSize);
      const wrappedLines = doc.splitTextToSize(text, maxWidth);
      const totalHeight = wrappedLines.length * lineHeight;
      addNewPageIfNeeded(totalHeight);
      wrappedLines.forEach((wl: string) => {
        addNewPageIfNeeded(lineHeight);
        doc.text(wl, margin, y);
        y += lineHeight;
      });
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (isSeparator(line)) {
        addNewPageIfNeeded(0.15);
        doc.setDrawColor(0);
        doc.setLineWidth(line.trim().startsWith('=') ? 0.02 : 0.01);
        doc.line(margin, y, pageWidth - margin, y);
        y += 0.2;
        continue;
      }

      const trimmed = line.trim();

      if (!trimmed) {
        y += 0.1;
        continue;
      }

      const isCheckbox = trimmed.startsWith('[ ]') || trimmed.startsWith('[X]') || trimmed.startsWith('[x]');

      if (isTitleHeading(trimmed)) {
        addNewPageIfNeeded(0.4);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        const headingLines = doc.splitTextToSize(trimmed, contentWidth);
        headingLines.forEach((hl: string) => {
          addNewPageIfNeeded(0.22);
          doc.text(hl, pageWidth / 2, y, { align: "center" });
          y += 0.22;
        });
        y += 0.08;
      } else if (isSectionHeading(trimmed)) {
        addNewPageIfNeeded(0.35);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        const headingLines = doc.splitTextToSize(trimmed, contentWidth);
        headingLines.forEach((hl: string) => {
          addNewPageIfNeeded(0.22);
          doc.text(hl, margin, y);
          y += 0.22;
        });
        y += 0.05;
      } else if (isCheckbox) {
        renderWrappedText(trimmed, 10, "helvetica", "normal", contentWidth, 0.18);
      } else if (/^[A-Z][A-Z\s\/]*:/.test(trimmed) && trimmed.indexOf(':') < 35) {
        const colonIdx = trimmed.indexOf(':');
        const label = trimmed.substring(0, colonIdx + 1);
        const value = trimmed.substring(colonIdx + 1).trim();
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        const labelWidth = doc.getTextWidth(label + " ");

        if (value && contentWidth - labelWidth > 1.5) {
          const valueLines = doc.splitTextToSize(value, contentWidth - labelWidth);
          const totalHeight = Math.max(0.2, valueLines.length * 0.18);
          addNewPageIfNeeded(totalHeight);
          doc.text(label, margin, y);
          doc.setFont("helvetica", "normal");
          valueLines.forEach((vl: string, idx: number) => {
            if (idx === 0) {
              doc.text(vl, margin + labelWidth, y);
            } else {
              y += 0.18;
              doc.text(vl, margin + labelWidth, y);
            }
          });
          y += 0.2;
        } else {
          addNewPageIfNeeded(0.4);
          doc.text(label, margin, y);
          y += 0.18;
          if (value) {
            doc.setFont("helvetica", "normal");
            renderWrappedText(value, 10, "helvetica", "normal", contentWidth, 0.18);
          }
        }
      } else {
        renderWrappedText(trimmed, 10, "helvetica", "normal", contentWidth, 0.18);
      }
    }

    return doc;
  };

  const printDocument = () => {
    if (!documentation) {
      toast({ title: "Please generate the documentation first", variant: "destructive" });
      return;
    }
    const doc = buildPdf();
    if (!doc) return;
    doc.save(getPdfFileName());
    toast({ title: "PDF downloaded!" });
  };

  const shareDocument = async () => {
    if (!documentation) {
      toast({ title: "Please generate the documentation first", variant: "destructive" });
      return;
    }
    const doc = buildPdf();
    if (!doc) return;

    const fileName = getPdfFileName();
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
      try {
        await navigator.share({
          title: `HR Notice - ${employeeName || 'Employee'}`,
          text: `Employee discipline documentation for ${employeeName || 'employee'}`,
          files: [pdfFile],
        });
        toast({ title: "Shared successfully!" });
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          toast({ title: "Share cancelled or failed", variant: "destructive" });
        }
      }
    } else if (navigator.share) {
      try {
        await navigator.share({
          title: `HR Notice - ${employeeName || 'Employee'}`,
          text: documentation,
        });
        toast({ title: "Shared successfully!" });
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          toast({ title: "Share cancelled or failed", variant: "destructive" });
        }
      }
    } else {
      emailDocument();
    }
  };

  const emailDocument = () => {
    if (!documentation) {
      toast({ title: "Please generate the documentation first", variant: "destructive" });
      return;
    }
    const subject = encodeURIComponent(`HR Notice - ${employeeName || 'Employee'} - ${incidentDate || new Date().toLocaleDateString()}`);
    const bodyText = documentation
      .replace(/\*\*/g, '')
      .replace(/(?<!\S)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1')
      .replace(/^#{1,6}\s/gm, '');
    const body = encodeURIComponent(bodyText);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
    toast({ title: "Opening email client..." });
  };

  const saveDocument = async () => {
    if (!documentation || !employeeName || !issueType) {
      toast({ title: "Please complete the form and generate documentation first", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/hr-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          employeeName,
          employeePosition: employeeRole,
          issueType,
          disciplineLevel: priorIncidents,
          incidentDate,
          documentContent: documentation,
        }),
      });
      if (!res.ok) throw new Error("Failed to save document");
      const data = await res.json();
      setSavedDocId(data.id);
      toast({ title: "Document saved! You can now upload the signed scan." });
    } catch (err) {
      toast({ title: "Failed to save document", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!savedDocId) {
      toast({ title: "Please save the document first", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("scan", file);
      const res = await fetch(`/api/hr-documents/${savedDocId}/scan`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload scan");
      toast({ title: "Signed document uploaded successfully!" });
    } catch (err) {
      toast({ title: "Failed to upload scan", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const copyToClipboardHR = () => {
    navigator.clipboard.writeText(documentation);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
    toast({ title: "Copied to clipboard!" });
  };

  useEffect(() => {
    if (documentation && outputRef.current) {
      outputRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [documentation]);

  return (
    <Card className="mb-8 relative overflow-hidden">
      <div className="absolute inset-0 rounded-lg pointer-events-none" style={{
        background: 'linear-gradient(90deg, transparent, rgba(184,134,11,0.08), transparent)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 3s ease-in-out infinite',
      }} />
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" style={{ color: '#d4a017' }} />
          HR Documentation & Compliance Engine
        </CardTitle>
        <div className="flex items-start gap-0 mt-1">
          <div className="w-[3px] rounded-full self-stretch mr-3 shrink-0" style={{ background: '#b8860b' }} />
          <CardDescription>
            Generate Workforce Commission-compliant documentation. If it goes to a hearing, will this document stand?
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="issueType">Issue Type</Label>
            <Select value={issueType} onValueChange={setIssueType}>
              <SelectTrigger id="issueType" className="mt-1" data-testid="select-hr-issue-type">
                <SelectValue placeholder="Select issue type..." />
              </SelectTrigger>
              <SelectContent>
                {issueTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: HR_SEVERITY_DOTS[type.value] || '#6b7280' }} />
                      {type.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="priorIncidents">Discipline Step</Label>
            <Select value={priorIncidents} onValueChange={setPriorIncidents}>
              <SelectTrigger id="priorIncidents" className="mt-1" data-testid="select-prior-incidents">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorIncidentOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ProgressiveDisciplineIndicator step={priorIncidents} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="employeeName">Employee Name</Label>
            <Input
              id="employeeName"
              placeholder="e.g., John Smith"
              className="mt-1 border-0 border-b-2 border-transparent rounded-none focus:border-amber-500 focus-visible:ring-0 focus-visible:ring-offset-0"
              style={{ background: '#1a1d2e' }}
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              data-testid="input-employee-name"
            />
          </div>
          <div>
            <Label htmlFor="employeeRole">Position</Label>
            <Input
              id="employeeRole"
              placeholder="e.g., Server"
              className="mt-1 border-0 border-b-2 border-transparent rounded-none focus:border-amber-500 focus-visible:ring-0 focus-visible:ring-offset-0"
              style={{ background: '#1a1d2e' }}
              value={employeeRole}
              onChange={(e) => setEmployeeRole(e.target.value)}
              data-testid="input-employee-role"
            />
          </div>
          <div>
            <Label htmlFor="incidentDate">Incident Date</Label>
            <Input
              id="incidentDate"
              type="date"
              className="mt-1 border-0 border-b-2 border-transparent rounded-none focus:border-amber-500 focus-visible:ring-0 focus-visible:ring-offset-0"
              style={{ background: '#1a1d2e' }}
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              data-testid="input-incident-date"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="policyAware">Was employee aware of the policy/expectation?</Label>
          <Select value={policyAware} onValueChange={setPolicyAware}>
            <SelectTrigger id="policyAware" className="mt-1" data-testid="select-policy-aware">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes - policy was clearly communicated</SelectItem>
              <SelectItem value="no">No / Unclear</SelectItem>
              <SelectItem value="unclear">Unclear - policy exists but communication not documented</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="description">What Happened (Plain Language)</Label>
          <div className="relative">
            <Textarea
              id="description"
              placeholder="Describe what happened in plain language. Include: when, where, what occurred, who was involved, and any impact on operations or guests."
              className="mt-1 min-h-[120px] focus:ring-1 focus:ring-amber-500/40"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="input-hr-description"
            />
            <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground" data-testid="text-char-count">
              {description.length} characters
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            No legal wording needed — just describe the facts
          </p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            Emotional language will be removed. Objective documentation will be generated.
          </p>
        </div>

        <Button 
          onClick={generateDocumentation} 
          disabled={isGenerating || !issueType || !description}
          className="w-full"
          style={{ background: '#b8860b' }}
          data-testid="btn-generate-hr-doc"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate HR Documentation
            </>
          )}
        </Button>

        {documentation && (
          <div className="mt-4 space-y-4" ref={outputRef}>
            <div className="rounded-lg border overflow-hidden" style={{ background: '#1e2035' }}>
              <div className="p-4 overflow-x-auto" style={{ overflowWrap: 'break-word', wordWrap: 'break-word' }}>
                {documentation.split('\n').map((line, i) => {
                  const trimmed = line.trim();
                  if (/^\s*[=]{3,}\s*$/.test(line)) {
                    return <hr key={i} className="my-3" style={{ borderColor: 'rgba(184,134,11,0.3)' }} />;
                  }
                  if (/^\s*[-]{3,}\s*$/.test(line)) {
                    return <hr key={i} className="my-2" style={{ borderColor: 'rgba(184,134,11,0.15)' }} />;
                  }
                  if (!trimmed) return <div key={i} className="h-2" />;
                  const bold = (t: string) => t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                  const keywords = ['EMPLOYEE DISCIPLINE', 'ACKNOWLEDGMENT', 'AT-WILL', 'DOCUMENT COPY'];
                  const isTitleLine = keywords.some(k => trimmed.includes(k));
                  const isAllCaps = trimmed === trimmed.toUpperCase() && trimmed.length > 3 && /[A-Z]/.test(trimmed) && !/^[_\s]+$/.test(trimmed) && !/^[^A-Za-z]*$/.test(trimmed);
                  const isCheckbox = trimmed.startsWith('[ ]') || trimmed.startsWith('[X]') || trimmed.startsWith('[x]');
                  const isLabelLine = /^[A-Z][A-Z\s\/]*:/.test(trimmed) && trimmed.indexOf(':') < 35;

                  if (isTitleLine) {
                    return <h2 key={i} className="text-base font-bold text-center my-2 tracking-wide" style={{ color: '#d4a017' }}>{trimmed.replace(/\*\*/g, '')}</h2>;
                  }
                  if (isAllCaps) {
                    return <h3 key={i} className="text-xs font-bold mt-4 mb-1 uppercase tracking-widest" style={{ color: '#d4a017' }}>{trimmed}</h3>;
                  }
                  if (isCheckbox) {
                    const checked = trimmed.startsWith('[X]') || trimmed.startsWith('[x]');
                    const label = trimmed.substring(3).trim().replace(/^-\s*/, '');
                    return (
                      <div key={i} className="flex items-start gap-2.5 ml-1 my-1">
                        <div
                          className="mt-0.5 w-4 h-4 rounded-sm flex-shrink-0 flex items-center justify-center border"
                          style={{
                            background: checked ? '#b8860b' : 'transparent',
                            borderColor: checked ? '#b8860b' : 'rgba(255,255,255,0.2)',
                          }}
                        >
                          {checked && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className="text-sm text-white/90">{label}</span>
                      </div>
                    );
                  }
                  if (isLabelLine) {
                    const colonIdx = trimmed.indexOf(':');
                    const label = trimmed.substring(0, colonIdx + 1);
                    const value = trimmed.substring(colonIdx + 1).trim();
                    return (
                      <p key={i} className="text-sm my-0.5 text-white/90">
                        <span className="font-semibold text-white">{label}</span>{value ? ` ${value}` : ''}
                      </p>
                    );
                  }
                  return <p key={i} className="text-sm my-0.5 text-white/80" dangerouslySetInnerHTML={{ __html: bold(trimmed) }} />;
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={copyToClipboardHR} data-testid="btn-copy-hr-doc">
                {copiedState ? <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" /> : <Copy className="h-4 w-4 mr-2" />}
                {copiedState ? 'Copied' : 'Copy'}
              </Button>
              <Button variant="outline" size="sm" onClick={printDocument} data-testid="btn-print-hr-doc">
                <Printer className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" size="sm" onClick={shareDocument} data-testid="btn-share-hr-doc">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button 
                size="sm" 
                onClick={saveDocument} 
                disabled={isSaving || savedDocId !== null}
                style={{ background: savedDocId ? '#22c55e' : '#b8860b' }}
                data-testid="btn-save-hr-doc"
              >
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : savedDocId ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {savedDocId ? "Saved" : "Save to HR Records"}
              </Button>
            </div>
            
            {savedDocId && (
              <div className="p-4 rounded-lg space-y-3" style={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-sm font-medium text-white">Upload Signed Document</p>
                <p className="text-xs text-muted-foreground">
                  After printing and getting signatures, scan or photograph the signed document and upload it here.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  capture="environment"
                  onChange={handleScanUpload}
                  className="hidden"
                  id="scan-upload"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  data-testid="btn-upload-scan"
                >
                  {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Upload Signed Copy
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HRRecordsViewer() {
  const { toast } = useToast();
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name" | "severity">("date");
  const [filterEmployee, setFilterEmployee] = useState<string | null>(null);
  const [filterChip, setFilterChip] = useState<"all" | "pending" | "signed" | "month">("all");
  const [trailEmployee, setTrailEmployee] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const uploadRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const { data: documents, isLoading } = useQuery<any[]>({
    queryKey: ["/api/hr-documents"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/hr-documents/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Document deleted" });
      setShowDeleteConfirm(null);
      queryClient.invalidateQueries({ queryKey: ["/api/hr-documents"] });
    },
    onError: () => {
      toast({ title: "Failed to delete document", variant: "destructive" });
    },
  });

  const disciplineLevelLabels: Record<string, string> = {
    first: "Verbal/Written Warning",
    second: "3 Shift Suspension",
    third: "5 Shift Suspension/Termination",
  };

  const issueTypeLabels: Record<string, string> = {
    attendance: "Attendance",
    ncns: "No-Call/No-Show",
    performance: "Performance",
    conduct: "Conduct",
    "guest-incident": "Guest Incident",
    safety: "Safety",
    insubordination: "Insubordination",
    "cash-handling": "Cash Handling",
  };

  const handleRecordScanUpload = async (docId: number, file: File) => {
    try {
      const formData = new FormData();
      formData.append("scan", file);
      const res = await fetch(`/api/hr-documents/${docId}/scan`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload scan");
      toast({ title: "Signed document uploaded!" });
      queryClient.invalidateQueries({ queryKey: ["/api/hr-documents"] });
    } catch {
      toast({ title: "Failed to upload scan", variant: "destructive" });
    }
  };

  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    let filtered = [...documents];
    
    if (filterEmployee) {
      filtered = filtered.filter((d: any) => d.employeeName === filterEmployee);
    }

    if (filterChip === "pending") {
      filtered = filtered.filter((d: any) => !d.scanFilename && !d.signedAt);
    } else if (filterChip === "signed") {
      filtered = filtered.filter((d: any) => d.scanFilename || d.signedAt);
    } else if (filterChip === "month") {
      const now = new Date();
      filtered = filtered.filter((d: any) => {
        const created = new Date(d.createdAt);
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      });
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((d: any) => 
        d.employeeName?.toLowerCase().includes(q) ||
        d.employeePosition?.toLowerCase().includes(q) ||
        (issueTypeLabels[d.issueType] || d.issueType)?.toLowerCase().includes(q)
      );
    }
    
    filtered.sort((a: any, b: any) => {
      if (sortBy === "name") return (a.employeeName || "").localeCompare(b.employeeName || "");
      if (sortBy === "severity") {
        const order: Record<string, number> = { third: 3, second: 2, first: 1 };
        return (order[b.disciplineLevel] || 0) - (order[a.disciplineLevel] || 0);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    return filtered;
  }, [documents, searchQuery, sortBy, filterEmployee, filterChip]);

  const filterChips: { value: typeof filterChip; label: string }[] = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending Signature" },
    { value: "signed", label: "Signed" },
    { value: "month", label: "This Month" },
  ];

  if (isLoading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            HR Document Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            HR Document Records
          </CardTitle>
          <CardDescription>
            View and manage stored discipline documentation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents && documents.length > 0 && (
            <div className="space-y-3 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, position, or issue..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-hr-search"
                  />
                </div>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-40" data-testid="select-hr-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Sort by Date</SelectItem>
                    <SelectItem value="name">Sort by Name</SelectItem>
                    <SelectItem value="severity">Sort by Severity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin" data-testid="filter-chips">
                {filterChips.map(chip => (
                  <button
                    key={chip.value}
                    onClick={() => setFilterChip(chip.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                      filterChip === chip.value
                        ? 'text-white'
                        : 'text-muted-foreground border-white/10'
                    }`}
                    style={filterChip === chip.value ? { background: '#b8860b', borderColor: '#b8860b' } : {}}
                    data-testid={`chip-${chip.value}`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {filterEmployee && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    Showing history for: {filterEmployee}
                    <button onClick={() => setFilterEmployee(null)} className="ml-1">
                      <XCircle className="h-3 w-3" />
                    </button>
                  </Badge>
                </div>
              )}
              <p className="text-xs text-muted-foreground" data-testid="text-hr-record-count">
                Showing {filteredDocuments.length} of {documents.length} record{documents.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
          {!documents || documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No HR documents saved yet. Generate and save documentation above to start building records.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc: any) => {
                const isSigned = doc.scanFilename || doc.signedAt;
                return (
                  <div key={doc.id} className="p-4 rounded-lg flex flex-col gap-3 md:flex-row md:items-center md:justify-between" style={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.08)' }} data-testid={`hr-record-${doc.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium text-white">{doc.employeeName}</span>
                        {doc.employeePosition && (
                          <Badge variant="secondary" className="text-xs">{doc.employeePosition}</Badge>
                        )}
                        <Badge className={`text-xs ${HR_DISCIPLINE_BADGE_STYLES[doc.disciplineLevel] || ''}`}>
                          {disciplineLevelLabels[doc.disciplineLevel] || doc.disciplineLevel}
                        </Badge>
                        {isSigned ? (
                          <Badge className="text-xs bg-green-500/15 text-green-400 border-green-500/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Signed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30">
                            <span className="relative flex h-2 w-2 mr-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                            Pending Signature
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {issueTypeLabels[doc.issueType] || doc.issueType}
                        {doc.incidentDate && ` - ${new Date(doc.incidentDate).toLocaleDateString()}`}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Created: {new Date(doc.createdAt).toLocaleDateString()}
                        {doc.signedAt && (
                          <span className="ml-2 text-green-400">
                            <CheckCircle2 className="h-3 w-3 inline mr-1" />
                            Signed copy uploaded
                          </span>
                        )}
                      </div>

                      {!isSigned && (
                        <div className="mt-2">
                          <input
                            ref={el => { uploadRefs.current[doc.id] = el; }}
                            type="file"
                            accept="image/*,.pdf"
                            capture="environment"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleRecordScanUpload(doc.id, file);
                            }}
                            className="hidden"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => uploadRefs.current[doc.id]?.click()}
                            data-testid={`btn-upload-signed-${doc.id}`}
                          >
                            <Upload className="h-3.5 w-3.5 mr-1.5" />
                            Upload Signed Copy
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTrailEmployee(doc.employeeName)}
                        title={`Discipline trail for ${doc.employeeName}`}
                        data-testid={`btn-history-${doc.id}`}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSelectedDoc(doc); setShowPreview(true); }}
                        data-testid={`btn-view-hr-doc-${doc.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {doc.scanFilename && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/api/hr-documents/${doc.id}/scan`, "_blank")}
                          data-testid={`btn-view-scan-${doc.id}`}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(doc.id)}
                        data-testid={`btn-delete-hr-doc-${doc.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>HR Document - {selectedDoc?.employeeName}</DialogTitle>
            <DialogDescription>
              {disciplineLevelLabels[selectedDoc?.disciplineLevel] || selectedDoc?.disciplineLevel}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 rounded-lg border font-mono text-sm whitespace-pre-wrap overflow-auto max-h-[50vh]" style={{ background: '#1a1d2e' }}>
            {selectedDoc?.documentContent || "No content available"}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)} data-testid="btn-close-hr-doc-preview">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm !== null} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete HR Record</DialogTitle>
            <DialogDescription>
              Delete this HR record? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)} data-testid="btn-cancel-delete">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => showDeleteConfirm !== null && deleteMutation.mutate(showDeleteConfirm)}
              disabled={deleteMutation.isPending}
              data-testid="btn-confirm-delete"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {trailEmployee && documents && (
        <EmployeeDisciplineTrailModal
          open={!!trailEmployee}
          onClose={() => setTrailEmployee(null)}
          employeeName={trailEmployee}
          documents={documents}
        />
      )}
    </>
  );
}

function StaffingMetricStrip() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 mb-6 scrollbar-thin" data-testid="staffing-metric-strip">
      <div className="flex-shrink-0 min-w-[180px] rounded-lg p-3 border-l-[3px]" style={{ background: '#1a1d2e', borderLeftColor: '#b8860b' }}>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Labor % This Week</div>
        <div className="text-xl font-bold text-white mt-1" data-testid="text-labor-week">-- %</div>
        <div className="text-[10px] text-muted-foreground">Connect your POS</div>
      </div>
      <div className="flex-shrink-0 min-w-[180px] rounded-lg p-3 border-l-[3px]" style={{ background: '#1a1d2e', borderLeftColor: '#b8860b' }}>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Scheduled Hours</div>
        <div className="text-xl font-bold text-white mt-1" data-testid="text-scheduled-hours">0 hrs</div>
        <div className="text-[10px] text-muted-foreground">This week</div>
      </div>
      <div className="flex-shrink-0 min-w-[180px] rounded-lg p-3 border-l-[3px]" style={{ background: '#1a1d2e', borderLeftColor: '#b8860b' }}>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Staff on Floor Now</div>
        <div className="text-xl font-bold text-white mt-1 flex items-center gap-2" data-testid="text-staff-now">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          -- on floor
        </div>
      </div>
      <div className="flex-shrink-0 min-w-[180px] rounded-lg p-3 border-l-[3px]" style={{ background: '#1a1d2e', borderLeftColor: '#b8860b' }}>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Next Scheduled Cut</div>
        <div className="text-xl font-bold mt-1" style={{ color: '#d4a017' }} data-testid="text-next-cut">No cut scheduled</div>
      </div>
    </div>
  );
}

const PRESET_ICONS: Record<string, typeof Coffee> = {
  "quiet-monday": Coffee,
  "normal-weekday": UtensilsCrossed,
  "busy-friday": Flame,
  "busy-saturday": Moon,
  "sunday-brunch": Sunrise,
  "slow-tuesday": CloudSun,
};

function parseStaffBreakdown(text: string): { role: string; count: number }[] {
  if (!text.trim()) return [];
  const chips: { role: string; count: number }[] = [];
  const parts = text.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
  for (const part of parts) {
    const match = part.match(/^(\d+)\s+(.+)$/);
    if (match) {
      chips.push({ count: parseInt(match[1]), role: match[2].trim() });
    } else {
      const match2 = part.match(/^(.+?)\s*[:=]\s*(\d+)$/);
      if (match2) {
        chips.push({ count: parseInt(match2[2]), role: match2[1].trim() });
      }
    }
  }
  return chips;
}

function parseStructuredOutput(text: string): { section: string; type: string; content: string }[] {
  const sections: { section: string; type: string; content: string }[] = [];
  const sectionPatterns = [
    { pattern: /(?:^|\n)(PROJECTED SALES|Projected Sales)[:\s]*([\s\S]*?)(?=\n[A-Z]{2,}|\n\n[A-Z]|$)/i, type: "info" },
    { pattern: /(?:^|\n)(RECOMMENDED STAFFING|Staffing Recommendation)[:\s]*([\s\S]*?)(?=\n[A-Z]{2,}[:\s]|\n\n[A-Z]|$)/i, type: "staffing" },
    { pattern: /(?:^|\n)(CUT (?:EVALUATION WINDOW|TIMELINE|RECOMMENDATION))[:\s]*([\s\S]*?)(?=\n[A-Z]{2,}[:\s]|\n\n[A-Z]|$)/i, type: "cut" },
    { pattern: /(?:^|\n)(LABOR (?:RISK ASSESSMENT|COST BREAKDOWN))[:\s]*([\s\S]*?)(?=\n[A-Z]{2,}[:\s]|\n\n[A-Z]|$)/i, type: "risk" },
    { pattern: /(?:^|\n)(HOLD INSTRUCTIONS|MANAGER (?:ACTIONS|NOTES))[:\s]*([\s\S]*?)(?=\n[A-Z]{2,}[:\s]|\n\n[A-Z]|$)/i, type: "action" },
    { pattern: /(?:^|\n)(PRE-SHIFT BRIEFING NOTES|REMAINING SHIFT GUIDANCE)[:\s]*([\s\S]*?)(?=\n[A-Z]{2,}[:\s]|\n\n[A-Z]|$)/i, type: "briefing" },
    { pattern: /(?:^|\n)(RISK FLAGS?|WARNING)[:\s]*([\s\S]*?)(?=\n[A-Z]{2,}[:\s]|\n\n[A-Z]|$)/i, type: "warning" },
    { pattern: /(?:^|\n)(VARIANCE)[:\s]*([\s\S]*?)(?=\n[A-Z]{2,}[:\s]|\n\n[A-Z]|$)/i, type: "info" },
    { pattern: /(?:^|\n)(DECISION)[:\s]*([\s\S]*?)(?=\n[A-Z]{2,}[:\s]|\n\n[A-Z]|$)/i, type: "action" },
    { pattern: /(?:^|\n)(NEXT EVALUATION)[:\s]*([\s\S]*?)(?=\n[A-Z]{2,}[:\s]|\n\n[A-Z]|$)/i, type: "info" },
  ];

  for (const { pattern, type } of sectionPatterns) {
    const match = text.match(pattern);
    if (match) {
      sections.push({ section: match[1].trim(), type, content: match[2].trim() });
    }
  }
  return sections;
}

function StructuredOutputRenderer({ text }: { text: string }) {
  const sections = parseStructuredOutput(text);

  if (sections.length < 2) {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
        {text}
      </div>
    );
  }

  const sectionStyles: Record<string, { border: string; icon: typeof DollarSign }> = {
    info: { border: 'border-l-blue-500/50', icon: Info },
    staffing: { border: 'border-l-[#b8860b]', icon: Users },
    cut: { border: 'border-l-amber-500/50', icon: Clock },
    risk: { border: 'border-l-red-500/50', icon: AlertTriangle },
    action: { border: 'border-l-green-500/50', icon: ClipboardCheck },
    briefing: { border: 'border-l-purple-500/50', icon: MessageSquare },
    warning: { border: 'border-l-amber-500/50', icon: AlertTriangle },
  };

  return (
    <div className="space-y-3">
      {sections.map((s, i) => {
        const style = sectionStyles[s.type] || sectionStyles.info;
        const Icon = style.icon;
        const lines = s.content.split('\n').filter(l => l.trim());
        const isChecklist = s.type === 'action' && lines.every(l => l.trim().startsWith('-') || l.trim().startsWith('*'));

        return (
          <div key={i} className={`rounded-lg border-l-[3px] p-3 ${style.border}`} style={{ background: '#1a1d2e' }} data-testid={`output-section-${i}`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-4 w-4 shrink-0" style={{ color: '#d4a017' }} />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#d4a017' }}>{s.section}</span>
            </div>
            {isChecklist ? (
              <div className="space-y-1.5">
                {lines.map((line, li) => (
                  <label key={li} className="flex items-start gap-2 text-sm text-white/90 cursor-pointer">
                    <input type="checkbox" className="mt-1 rounded border-gray-600" />
                    <span>{line.replace(/^[-*]\s*/, '')}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">{s.content}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LaborDemandEngine() {
  const { toast } = useToast();
  const [showSample, setShowSample] = useState(false);
  const [daypart, setDaypart] = useState<string>(() => new Date().getHours() < 15 ? "lunch" : "dinner");
  const [dayOfWeek, setDayOfWeek] = useState<string>(new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase());
  const [projectedCovers, setProjectedCovers] = useState<string>("");
  const [actualCovers, setActualCovers] = useState<string>("");
  const [reservations, setReservations] = useState<string>("");
  const [currentStaff, setCurrentStaff] = useState<string>("");
  const [laborTarget, setLaborTarget] = useState<string>("28");
  const [avgCheck, setAvgCheck] = useState<string>("45");
  const [avgHourlyWage, setAvgHourlyWage] = useState<string>("18");
  const [hoursPerShift, setHoursPerShift] = useState<string>("6");
  const [scheduledPositions, setScheduledPositions] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<string>("");
  const [serviceNotes, setServiceNotes] = useState<string>("");
  const [recommendation, setRecommendation] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccessFlash, setShowSuccessFlash] = useState(false);
  const [mode, setMode] = useState<"preshift" | "midshift">("preshift");

  const dayparts = [
    { value: "lunch", label: "Lunch (11am-3pm)" },
    { value: "dinner", label: "Dinner (5pm-10pm)" },
    { value: "brunch", label: "Brunch" },
    { value: "late-night", label: "Late Night" },
  ];

  const daysOfWeek = [
    { value: "monday", label: "Monday" },
    { value: "tuesday", label: "Tuesday" },
    { value: "wednesday", label: "Wednesday" },
    { value: "thursday", label: "Thursday" },
    { value: "friday", label: "Friday" },
    { value: "saturday", label: "Saturday" },
    { value: "sunday", label: "Sunday" },
  ];

  const quickPresets = [
    { value: "quiet-monday", label: "Quiet Monday Lunch", covers: "35", avgCheck: "22", positions: "5", laborTarget: "30", wage: "17", hours: "5", day: "monday", daypart: "lunch" },
    { value: "normal-weekday", label: "Normal Weekday Dinner", covers: "75", avgCheck: "38", positions: "8", laborTarget: "28", wage: "18", hours: "6", day: "wednesday", daypart: "dinner" },
    { value: "busy-friday", label: "Busy Friday Dinner", covers: "140", avgCheck: "45", positions: "13", laborTarget: "26", wage: "19", hours: "6", day: "friday", daypart: "dinner" },
    { value: "busy-saturday", label: "Busy Saturday Night", covers: "165", avgCheck: "48", positions: "15", laborTarget: "25", wage: "19", hours: "7", day: "saturday", daypart: "dinner" },
    { value: "sunday-brunch", label: "Sunday Brunch Rush", covers: "120", avgCheck: "32", positions: "11", laborTarget: "30", wage: "17", hours: "5", day: "sunday", daypart: "brunch" },
    { value: "slow-tuesday", label: "Slow Tuesday Evening", covers: "45", avgCheck: "35", positions: "6", laborTarget: "32", wage: "17", hours: "6", day: "tuesday", daypart: "dinner" },
  ];

  const calculateLaborMetrics = () => {
    const covers = parseFloat(projectedCovers) || 0;
    const check = parseFloat(avgCheck) || 45;
    const target = parseFloat(laborTarget) || 28;
    const wage = parseFloat(avgHourlyWage) || 18;
    const hours = parseFloat(hoursPerShift) || 6;
    const scheduled = parseFloat(scheduledPositions) || 0;

    const projectedSales = covers * check;
    const laborBudget = projectedSales * (target / 100);
    const maxLaborCost = scheduled * wage * hours;
    const actualLaborPercent = projectedSales > 0 ? (maxLaborCost / projectedSales) * 100 : 0;
    const neededPositions = wage > 0 && hours > 0 ? laborBudget / (wage * hours) : 0;
    const positionGap = neededPositions - scheduled;
    const costPerCover = covers > 0 ? maxLaborCost / covers : 0;
    const variance = laborBudget - maxLaborCost;

    return {
      projectedSales,
      laborBudget,
      maxLaborCost,
      actualLaborPercent,
      neededPositions,
      positionGap,
      scheduled,
      costPerCover,
      variance,
    };
  };

  const metrics = calculateLaborMetrics();

  const getLaborColorClass = (percent: number) => {
    if (percent === 0) return "bg-muted text-muted-foreground";
    if (percent < 26) return "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30";
    if (percent <= 32) return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30";
    return "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30";
  };

  const getGapColorClass = (gap: number) => {
    if (gap === 0) return "text-muted-foreground";
    if (gap > 0.5) return "text-green-600 dark:text-green-400";
    if (gap < -0.5) return "text-red-600 dark:text-red-400";
    return "text-yellow-600 dark:text-yellow-400";
  };

  const getQuickRecommendation = () => {
    const { actualLaborPercent, positionGap, projectedSales, scheduled } = metrics;
    if (!projectedCovers || projectedSales === 0) return null;
    
    if (scheduled === 0) {
      return { text: "Enter scheduled positions to see staffing recommendation", type: "info" };
    }
    
    if (actualLaborPercent > 32 && positionGap < -0.5) {
      const cutCount = Math.ceil(Math.abs(positionGap));
      return { 
        text: `Running ${actualLaborPercent.toFixed(1)}% labor. Consider cutting ${cutCount} position${cutCount > 1 ? 's' : ''} after peak.`, 
        type: "warning" 
      };
    }
    if (actualLaborPercent < 26 && positionGap > 0.5) {
      const addCount = Math.floor(positionGap);
      return { 
        text: `Labor at ${actualLaborPercent.toFixed(1)}%. Room to add ${addCount} position${addCount > 1 ? 's' : ''} if needed.`, 
        type: "success" 
      };
    }
    if (Math.abs(positionGap) <= 0.5) {
      return { 
        text: `Staffing looks good at ${actualLaborPercent.toFixed(1)}% labor. Hold current levels.`, 
        type: "success" 
      };
    }
    return { 
      text: `Projected labor: ${actualLaborPercent.toFixed(1)}%. Monitor and adjust as needed.`, 
      type: "info" 
    };
  };

  const applyPreset = (presetValue: string) => {
    const preset = quickPresets.find(p => p.value === presetValue);
    if (preset) {
      setProjectedCovers(preset.covers);
      setAvgCheck(preset.avgCheck);
      setScheduledPositions(preset.positions);
      setLaborTarget(preset.laborTarget);
      setAvgHourlyWage(preset.wage);
      setHoursPerShift(preset.hours);
      setDayOfWeek(preset.day);
      setDaypart(preset.daypart);
      toast({
        title: `Preset loaded: ${preset.label}`,
        className: "border-[#b8860b]/50",
      });
    }
  };

  const useLastWeekData = () => {
    const storageKey = `labor-history-${dayOfWeek}-${daypart}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const data = JSON.parse(saved);
      setProjectedCovers(data.covers || "");
      setAvgCheck(data.avgCheck || "45");
      setScheduledPositions(data.positions || "");
      setReservations(data.reservations || "");
      toast({ title: "Loaded last week's data", description: `${data.date || "Previous"} values applied` });
    } else {
      toast({ title: "No history found", description: `No saved data for ${dayOfWeek} ${daypart}`, variant: "destructive" });
    }
  };

  const saveCurrentData = () => {
    const storageKey = `labor-history-${dayOfWeek}-${daypart}`;
    const data = {
      covers: projectedCovers,
      avgCheck,
      positions: scheduledPositions,
      reservations,
      date: new Date().toLocaleDateString()
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
    toast({ title: "Data saved", description: "Use 'Last Week' button to recall this data" });
  };

  const quickRec = getQuickRecommendation();

  const staffChips = parseStaffBreakdown(currentStaff);
  const staffChipTotal = staffChips.reduce((sum, c) => sum + c.count, 0);
  const scheduledNum = parseInt(scheduledPositions) || 0;
  const staffMismatch = staffChips.length > 0 && scheduledNum > 0 && staffChipTotal !== scheduledNum;

  const midshiftHasData = actualCovers || currentTime || serviceNotes;

  const getVarianceBadge = () => {
    const v = metrics.variance;
    if (v >= 0) return { label: "On Target", className: "bg-green-500/20 text-green-400 border-green-500/30" };
    if (v >= -50) return { label: "Watch", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
    return { label: "Over Budget", className: "bg-red-500/20 text-red-400 border-red-500/30" };
  };

  const generateRecommendation = async () => {
    if (!projectedCovers) {
      toast({ title: "Please enter projected covers", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setRecommendation("");

    try {
      const dayLabel = daysOfWeek.find(d => d.value === dayOfWeek)?.label || dayOfWeek;
      const daypartLabel = dayparts.find(d => d.value === daypart)?.label || daypart;

      const prompt = mode === "preshift" 
        ? `Generate a pre-shift labor recommendation for a restaurant.

DAY: ${dayLabel}
DAYPART: ${daypartLabel}
PROJECTED COVERS: ${projectedCovers}
RESERVATIONS ON BOOKS: ${reservations || "Not specified"}
CURRENT SCHEDULED STAFF: ${currentStaff || "Not specified"}
LABOR TARGET: ${laborTarget}% of sales
AVERAGE CHECK: $${avgCheck}

Based on cover-driven scheduling principles:
- Standard ratios: 1 server per 15-20 covers, 1 bartender per 25-30 guests, 1 cook per 30-40 covers
- Fridays/Saturdays require tighter staffing
- Weather and events impact walk-ins
- Labor should be scheduled to projection, not preference

Provide a structured pre-shift recommendation:

PROJECTED SALES: $[calculate from covers x avg check]

RECOMMENDED STAFFING:
- Servers: [number] 
- Bartenders: [number]
- Hosts: [number]
- Cooks: [number]
- Food Runners/Expo: [number]

LABOR RISK ASSESSMENT: [Low/Moderate/High] - explain why

CUT EVALUATION WINDOW: [specific time] - when to reassess

HOLD INSTRUCTIONS: [specific guidance for the shift lead]

PRE-SHIFT BRIEFING NOTES: [2-3 key points to communicate to staff]

Be directive, not suggestive. This removes emotion from staffing decisions.`
        : `Generate a mid-shift labor decision for a restaurant.

DAY: ${dayLabel}
DAYPART: ${daypartLabel}
PROJECTED COVERS: ${projectedCovers}
ACTUAL COVERS SO FAR: ${actualCovers}
CURRENT TIME: ${currentTime || "Mid-service"}
CURRENT STAFF ON FLOOR: ${currentStaff || "Not specified"}
LABOR TARGET: ${laborTarget}% of sales
AVERAGE CHECK: $${avgCheck}
SERVICE NOTES: ${serviceNotes || "None"}

Calculate variance and make a clear decision:
- If actual < projected by 20%+: recommend cuts
- If actual > projected by 15%+: recommend adds or holds
- Consider remaining service time
- Factor in ticket times and service stress

Provide a decisive mid-shift recommendation:

VARIANCE: [actual vs projected, % difference]

DECISION: [HOLD / CUT / ADD] - be specific

${actualCovers && parseInt(actualCovers) < parseInt(projectedCovers) * 0.85 ? `
CUT RECOMMENDATION:
- Role to cut: [specific role]
- Who goes first: [seniority-based or section-based]
- Cut time: [specific time]
- Cut script: "We're slower than projected tonight. I'm going to let you go at [time]. Thank you for your flexibility."
` : ''}

NEXT EVALUATION: [when to reassess]

MANAGER NOTES: [documentation for labor log]

REMAINING SHIFT GUIDANCE: [specific instructions]

This is a directive, not a suggestion. Hope is not a staffing strategy.`;

      const res = await fetch("/api/consultant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to generate recommendation");

      const reader = res.body?.getReader();
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
                setRecommendation(content);
              }
            } catch {}
          }
        }
      }

      setShowSuccessFlash(true);
      setTimeout(() => setShowSuccessFlash(false), 1500);
    } catch (err) {
      toast({ title: "Failed to generate recommendation", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(recommendation);
    toast({ title: "Copied to clipboard!" });
  };

  const hasFormData = parseFloat(projectedCovers) > 0 && parseFloat(scheduledPositions) > 0;

  return (
    <Card className="mb-8 relative overflow-hidden" style={{
      boxShadow: showSuccessFlash
        ? '0 0 20px rgba(184, 134, 11, 0.4)'
        : undefined,
      transition: 'box-shadow 0.5s ease',
    }}>
      <div className="absolute inset-0 rounded-lg pointer-events-none" style={{
        background: 'linear-gradient(90deg, transparent, rgba(184,134,11,0.08), transparent)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 3s ease-in-out infinite',
      }} />
      <style>{`@keyframes shimmer { 0%, 100% { background-position: 200% 0; } 50% { background-position: -200% 0; } }`}</style>
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" style={{ color: '#d4a017' }} />
          Labor Demand & Cut-Decision Engine
        </CardTitle>
        <CardDescription>
          Cover-driven staffing decisions. No guessing, no hoping — just data-driven labor actions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 relative">
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b">
          <div className="flex-1 min-w-[200px]">
            <Select onValueChange={applyPreset}>
              <SelectTrigger className="h-9" data-testid="select-preset">
                <SelectValue placeholder="Quick Presets..." />
              </SelectTrigger>
              <SelectContent>
                {quickPresets.map(p => {
                  const Icon = PRESET_ICONS[p.value] || Coffee;
                  return (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0" style={{ color: '#d4a017' }} />
                        {p.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={useLastWeekData} data-testid="btn-last-week">
            <History className="h-4 w-4 mr-1" />
            Last Week
          </Button>
          <Button variant="outline" size="sm" onClick={saveCurrentData} data-testid="btn-save-data">
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>

        {projectedCovers && parseFloat(projectedCovers) > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-accent/30 text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Projected Sales</div>
              <div className="text-xl font-bold mt-1" data-testid="text-projected-sales">${metrics.projectedSales.toLocaleString()}</div>
            </div>
            <div className={`p-3 rounded-lg text-center border ${getLaborColorClass(metrics.actualLaborPercent)}`}>
              <div className="text-xs uppercase tracking-wide">Labor %</div>
              <div className="text-xl font-bold mt-1" data-testid="text-labor-percent">
                {metrics.actualLaborPercent > 0 ? `${metrics.actualLaborPercent.toFixed(1)}%` : "--"}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-accent/30 text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Needed Positions</div>
              <div className="text-xl font-bold mt-1" data-testid="text-needed-positions">{metrics.neededPositions.toFixed(1)}</div>
            </div>
            <div className="p-3 rounded-lg bg-accent/30 text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Gap</div>
              <div className={`text-xl font-bold mt-1 flex items-center justify-center gap-1 ${getGapColorClass(metrics.positionGap)}`} data-testid="text-position-gap">
                {metrics.scheduled > 0 ? (
                  <>
                    {metrics.positionGap > 0.1 ? <TrendingUp className="h-4 w-4" /> : 
                     metrics.positionGap < -0.1 ? <TrendingDown className="h-4 w-4" /> : null}
                    {metrics.positionGap > 0 ? "+" : ""}{metrics.positionGap.toFixed(1)}
                  </>
                ) : "--"}
              </div>
            </div>
          </div>
        )}

        {quickRec && (
          <div className={`p-3 rounded-lg border flex items-start gap-2 ${
            quickRec.type === "warning" ? "bg-yellow-500/10 border-yellow-500/30" :
            quickRec.type === "success" ? "bg-green-500/10 border-green-500/30" :
            "bg-accent/30 border-transparent"
          }`} data-testid="text-quick-recommendation">
            {quickRec.type === "warning" ? <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" /> :
             quickRec.type === "success" ? <Check className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" /> :
             <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
            <span className="text-sm">{quickRec.text}</span>
          </div>
        )}

        <Tabs value={mode} onValueChange={(v) => setMode(v as "preshift" | "midshift")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="preshift"
              data-testid="tab-preshift"
              className="data-[state=active]:border-b-2 data-[state=active]:border-[#b8860b]"
            >
              <ClipboardList className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Pre-Shift Planning</span>
              <span className="sm:hidden">Pre-Shift</span>
            </TabsTrigger>
            <TabsTrigger
              value="midshift"
              data-testid="tab-midshift"
              className="relative data-[state=active]:border-b-2 data-[state=active]:border-[#b8860b]"
            >
              <Zap className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Mid-Shift Decision</span>
              <span className="sm:hidden">Mid-Shift</span>
              {midshiftHasData && mode !== "midshift" && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preshift" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="dayOfWeek">Day</Label>
                <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                  <SelectTrigger id="dayOfWeek" className="mt-1" data-testid="select-day">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map(d => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="daypart">Daypart</Label>
                <Select value={daypart} onValueChange={setDaypart}>
                  <SelectTrigger id="daypart" className="mt-1" data-testid="select-daypart">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dayparts.map(d => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="projectedCovers">Projected Covers</Label>
                <Input
                  id="projectedCovers"
                  type="number"
                  placeholder="e.g., 112"
                  className="mt-1"
                  value={projectedCovers}
                  onChange={(e) => setProjectedCovers(e.target.value)}
                  data-testid="input-projected-covers"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="reservations">Reservations on Books</Label>
                <Input
                  id="reservations"
                  type="number"
                  placeholder="e.g., 45"
                  className="mt-1"
                  value={reservations}
                  onChange={(e) => setReservations(e.target.value)}
                  data-testid="input-reservations"
                />
              </div>
              <div>
                <Label htmlFor="avgCheck">Average Check ($)</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="avgCheck"
                    type="number"
                    placeholder="45"
                    className="pl-9"
                    value={avgCheck}
                    onChange={(e) => setAvgCheck(e.target.value)}
                    data-testid="input-avg-check"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="laborTarget">Labor Target (%)</Label>
                <div className="relative mt-1">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="laborTarget"
                    type="number"
                    placeholder="28"
                    className="pl-9"
                    value={laborTarget}
                    onChange={(e) => setLaborTarget(e.target.value)}
                    data-testid="input-labor-target"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="scheduledPositions">Scheduled Positions (Total)</Label>
                <Input
                  id="scheduledPositions"
                  type="number"
                  placeholder="e.g., 8"
                  className="mt-1"
                  value={scheduledPositions}
                  onChange={(e) => setScheduledPositions(e.target.value)}
                  data-testid="input-scheduled-positions"
                />
              </div>
              <div>
                <Label htmlFor="avgHourlyWage">Avg Hourly Wage ($)</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="avgHourlyWage"
                    type="number"
                    placeholder="18"
                    className="pl-9"
                    value={avgHourlyWage}
                    onChange={(e) => setAvgHourlyWage(e.target.value)}
                    data-testid="input-avg-wage"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="hoursPerShift">Hours per Shift</Label>
                <Input
                  id="hoursPerShift"
                  type="number"
                  placeholder="6"
                  className="mt-1"
                  value={hoursPerShift}
                  onChange={(e) => setHoursPerShift(e.target.value)}
                  data-testid="input-hours-shift"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="currentStaff">Staff Breakdown (optional detail)</Label>
              <Textarea
                id="currentStaff"
                placeholder="e.g., 4 servers, 2 bartenders, 1 host, 4 cooks, 1 expo"
                className="mt-1 min-h-[60px]"
                value={currentStaff}
                onChange={(e) => setCurrentStaff(e.target.value)}
                data-testid="input-current-staff"
              />
              {staffChips.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap gap-1.5" data-testid="staff-chips">
                    {staffChips.map((chip, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: '#1a1d2e', color: '#d4a017', border: '1px solid rgba(184,134,11,0.3)' }}>
                        <span className="font-bold">{chip.count}</span>
                        <span className="text-white/80 capitalize">{chip.role}</span>
                      </span>
                    ))}
                  </div>
                  {staffMismatch && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-500" data-testid="staff-mismatch-warning">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      Staff breakdown ({staffChipTotal}) doesn't match scheduled positions ({scheduledNum})
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="midshift" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="projectedCoversMid">Projected Covers</Label>
                <Input
                  id="projectedCoversMid"
                  type="number"
                  placeholder="e.g., 112"
                  className="mt-1"
                  value={projectedCovers}
                  onChange={(e) => setProjectedCovers(e.target.value)}
                  data-testid="input-projected-covers-mid"
                />
              </div>
              <div>
                <Label htmlFor="actualCovers">Actual Covers (so far)</Label>
                <Input
                  id="actualCovers"
                  type="number"
                  placeholder="e.g., 78"
                  className="mt-1"
                  value={actualCovers}
                  onChange={(e) => setActualCovers(e.target.value)}
                  data-testid="input-actual-covers"
                />
              </div>
              <div>
                <Label htmlFor="currentTime">Current Time</Label>
                <Input
                  id="currentTime"
                  type="time"
                  className="mt-1"
                  value={currentTime}
                  onChange={(e) => setCurrentTime(e.target.value)}
                  data-testid="input-current-time"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="avgCheckMid">Average Check ($)</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="avgCheckMid"
                    type="number"
                    placeholder="45"
                    className="pl-9"
                    value={avgCheck}
                    onChange={(e) => setAvgCheck(e.target.value)}
                    data-testid="input-avg-check-mid"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="laborTargetMid">Labor Target (%)</Label>
                <div className="relative mt-1">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="laborTargetMid"
                    type="number"
                    placeholder="28"
                    className="pl-9"
                    value={laborTarget}
                    onChange={(e) => setLaborTarget(e.target.value)}
                    data-testid="input-labor-target-mid"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="currentStaffMid">Current Staff on Floor</Label>
              <Textarea
                id="currentStaffMid"
                placeholder="e.g., 4 servers, 2 bartenders, 1 host"
                className="mt-1 min-h-[60px]"
                value={currentStaff}
                onChange={(e) => setCurrentStaff(e.target.value)}
                data-testid="input-current-staff-mid"
              />
              {staffChips.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {staffChips.map((chip, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: '#1a1d2e', color: '#d4a017', border: '1px solid rgba(184,134,11,0.3)' }}>
                      <span className="font-bold">{chip.count}</span>
                      <span className="text-white/80 capitalize">{chip.role}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="serviceNotes">Service Notes (optional)</Label>
              <Textarea
                id="serviceNotes"
                placeholder="e.g., Ticket times stable, one server struggling, large party at 8:30..."
                className="mt-1 min-h-[60px]"
                value={serviceNotes}
                onChange={(e) => setServiceNotes(e.target.value)}
                data-testid="input-service-notes"
              />
            </div>
          </TabsContent>
        </Tabs>

        {hasFormData && (
          <div className="rounded-lg border-t-[3px] p-4 space-y-3" style={{ background: '#1a1d2e', borderTopColor: '#b8860b' }} data-testid="labor-math-preview">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#d4a017' }}>
              <Calculator className="h-3.5 w-3.5 inline mr-1.5" />
              Labor Math Preview
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-muted-foreground">Projected Revenue</span>
                <span className="font-semibold text-white">${metrics.projectedSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-muted-foreground">Labor Budget</span>
                <span className="font-semibold text-white">${metrics.laborBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-muted-foreground">Scheduled Labor Cost</span>
                <span className="font-semibold text-white">${metrics.maxLaborCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-muted-foreground">Cost Per Cover</span>
                <span className="font-semibold text-white">${metrics.costPerCover.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-sm font-medium text-white">Variance</span>
              <div className="flex items-center gap-2">
                <span className={`font-bold text-lg ${metrics.variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {metrics.variance >= 0 ? '+' : ''}${metrics.variance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${getVarianceBadge().className}`} data-testid="badge-variance">
                  {getVarianceBadge().label}
                </Badge>
              </div>
            </div>
          </div>
        )}

        <Button 
          onClick={generateRecommendation} 
          disabled={isGenerating || !projectedCovers}
          className="w-full"
          style={{ background: '#b8860b' }}
          data-testid="btn-generate-labor"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing labor demand...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              {mode === "preshift" ? "Generate Staffing Plan" : "Get Labor Decision"}
            </>
          )}
        </Button>

        {!recommendation && !isGenerating && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSample(!showSample)}
            className="text-xs text-muted-foreground mt-2"
            data-testid="btn-toggle-sample-labor"
          >
            {showSample ? "Hide example output" : "See example output"}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
        {showSample && !recommendation && (
          <div className="mt-2 rounded-lg p-4 space-y-3" style={{ border: '1px dashed rgba(184,134,11,0.4)', background: 'rgba(26,29,46,0.5)' }} data-testid="sample-output-panel">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">This is an example</div>
            <div className="rounded-lg border-l-[3px] p-3 border-l-blue-500/50" style={{ background: '#1a1d2e' }}>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4" style={{ color: '#d4a017' }} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#d4a017' }}>Projected Sales</span>
              </div>
              <div className="text-sm text-white/90">$6,750 (150 covers x $45 avg check)</div>
            </div>
            <div className="rounded-lg border-l-[3px] p-3 border-l-[#b8860b]" style={{ background: '#1a1d2e' }}>
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4" style={{ color: '#d4a017' }} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#d4a017' }}>Recommended Staffing</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {[{r:'Servers',c:5},{r:'Bartenders',c:2},{r:'Hosts',c:1},{r:'Cooks',c:4},{r:'Expo',c:1}].map((s,i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(184,134,11,0.15)', color: '#d4a017' }}>
                    <span className="font-bold">{s.c}</span> {s.r}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-lg border-l-[3px] p-3 border-l-amber-500/50" style={{ background: '#1a1d2e' }}>
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4" style={{ color: '#d4a017' }} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#d4a017' }}>Cut Evaluation Window</span>
              </div>
              <div className="text-sm text-white/90">8:30 PM — if covers &lt; 100 by then, cut 1 server and 1 cook</div>
            </div>
            <div className="rounded-lg border-l-[3px] p-3 border-l-green-500/50" style={{ background: '#1a1d2e' }}>
              <div className="flex items-center gap-2 mb-1">
                <ClipboardCheck className="h-4 w-4" style={{ color: '#d4a017' }} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#d4a017' }}>Hold Instructions</span>
              </div>
              <div className="text-sm text-white/90">Hold current levels through peak. Labor budget: $1,890 (28% target).</div>
            </div>
          </div>
        )}

        {recommendation && (
          <div className="mt-4 space-y-4" data-testid="labor-output">
            <StructuredOutputRenderer text={recommendation} />
            <Button variant="outline" size="sm" onClick={copyToClipboard} data-testid="btn-copy-labor">
              <Copy className="h-4 w-4 mr-2" />
              Copy to Clipboard
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TrainingMetricStrip({ content }: { content: any[] }) {
  const checklistCount = content.filter(c => c.contentType === 'checklist').length;
  const scriptCount = content.filter(c => c.contentType === 'script').length;
  const frameworkCount = content.filter(c => c.contentType === 'output').length;
  const allConfigured = checklistCount > 0 && scriptCount > 0 && frameworkCount > 0;

  return (
    <div className="flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-thin">
      {[
        { label: "ACTIVE TRAINEES", value: "0 active", sub: "Manage in Scheduling", link: "/scheduling" },
        { label: "CERTIFICATIONS THIS MONTH", value: "0", sub: "Run tests to track" },
        { label: "STANDARDS CONFIGURED", value: allConfigured ? "Complete" : "Incomplete", color: allConfigured ? "text-green-400" : "text-amber-400" },
      ].map((m) => (
        <div
          key={m.label}
          className="border-l-2 border-primary rounded-lg p-3 min-w-[160px] flex-shrink-0"
          style={{ background: "#111827" }}
          data-testid={`training-metric-${m.label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <div className="text-[10px] font-semibold tracking-wider text-muted-foreground mb-1">{m.label}</div>
          <div className={`text-sm font-bold ${m.color || 'text-foreground'}`}>{m.value}</div>
          {m.sub && <div className="text-[10px] text-muted-foreground mt-0.5">{m.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function SkillsCertificationEngine() {
  return (
    <Card className="mb-8 relative overflow-hidden certification-shimmer" data-testid="card-certification-engine">
      <div className="absolute inset-0 pointer-events-none rounded-lg" style={{
        background: 'linear-gradient(135deg, transparent 40%, rgba(184,134,11,0.08) 50%, transparent 60%)',
        backgroundSize: '200% 200%',
        animation: 'shimmer 4s ease-in-out infinite',
      }} />
      <style>{`
        @keyframes shimmer {
          0%, 100% { background-position: 200% 200%; }
          50% { background-position: 0% 0%; }
        }
        .certification-shimmer { border: 1px solid rgba(184,134,11,0.2); }
        .certification-shimmer:hover { border-color: rgba(184,134,11,0.4); }
      `}</style>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          Skills Certification Engine
        </CardTitle>
        <CardDescription>
          Certify readiness based on behavior, not completion. Configure your restaurant's standards, generate scenarios, and evaluate with a transparent rubric.
        </CardDescription>
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            { Icon: Zap, text: "Role-specific scenarios" },
            { Icon: Target, text: "Transparent rubric scoring" },
            { Icon: Check, text: "Behavior-based pass/fail" },
          ].map((pill) => (
            <span
              key={pill.text}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border"
              style={{ borderColor: 'rgba(184,134,11,0.3)', color: '#d4a017', background: 'rgba(184,134,11,0.08)' }}
            >
              <pill.Icon className="h-3 w-3" /> {pill.text}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <Link href="/certification">
          <Button
            className="w-full"
            data-testid="btn-open-certification"
          >
            <GraduationCap className="h-4 w-4 mr-2" />
            Open Certification Engine
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function ServiceMetricStrip({ contentCount }: { contentCount: number }) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-8 overflow-x-auto">
      {[
        { label: "COMP BUDGET THIS WEEK", value: "Set comp budget \u2192", accent: true },
        { label: "ACTIVE SERVICE STANDARDS", value: `${contentCount} configured` },
        { label: "RECOVERY PROTOCOLS", value: "9 issue types covered" },
      ].map((m) => (
        <div
          key={m.label}
          className="border-l-2 border-primary rounded-lg p-3"
          style={{ background: "#111827", borderColor: m.accent ? "#d97706" : undefined }}
          data-testid={`metric-${m.label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <div className="text-[10px] font-semibold tracking-wider text-muted-foreground mb-1">{m.label}</div>
          <div className="text-sm font-bold text-foreground">{m.value}</div>
        </div>
      ))}
    </div>
  );
}

function GuestRecoveryAdvisor() {
  const { toast } = useToast();
  const [showSample, setShowSample] = useState(false);
  const [issueType, setIssueType] = useState<string>("");
  const [timeDelay, setTimeDelay] = useState<string>("");
  const [checkValue, setCheckValue] = useState<string>("");
  const [responderRole, setResponderRole] = useState<string>("server");
  const [additionalContext, setAdditionalContext] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const issueTypes = [
    { value: "late-food", label: "Late Food" },
    { value: "wrong-item", label: "Wrong Item Delivered" },
    { value: "cold-food", label: "Cold/Poor Quality Food" },
    { value: "staff-attitude", label: "Staff Attitude Issue" },
    { value: "long-wait-seat", label: "Long Wait for Seating" },
    { value: "forgotten-item", label: "Forgotten Item/Course" },
    { value: "billing-error", label: "Billing Error" },
    { value: "cleanliness", label: "Cleanliness Issue" },
    { value: "other", label: "Other Issue" },
  ];

  const roles = [
    { value: "server", label: "Server" },
    { value: "bartender", label: "Bartender" },
    { value: "host", label: "Host" },
    { value: "shift-lead", label: "Shift Lead" },
    { value: "manager", label: "Manager" },
  ];

  const generateRecovery = async () => {
    if (!issueType) {
      toast({ title: "Please select an issue type", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setResponse("");

    try {
      const issueLabel = issueTypes.find(i => i.value === issueType)?.label || issueType;
      const roleLabel = roles.find(r => r.value === responderRole)?.label || responderRole;

      const res = await fetch("/api/consultant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `As a restaurant recovery specialist, provide a specific guest recovery recommendation for this situation:

ISSUE TYPE: ${issueLabel}
${timeDelay ? `TIME DELAY: ${timeDelay} minutes over expected` : ""}
${checkValue ? `CHECK VALUE: $${checkValue}` : ""}
RESPONDER ROLE: ${roleLabel}
${additionalContext ? `ADDITIONAL CONTEXT: ${additionalContext}` : ""}

Based on standard restaurant comp authority limits:
- Server: Free dessert, free non-alcoholic drink, item replacement
- Bartender: One round comped, free appetizer  
- Shift Lead: Up to $25 in comps
- Manager: Up to $100, full meal if warranted
- Over $100: Owner notification required

Provide a structured response with:

1. RECOVERY SCRIPT (what to say to the guest - use warm, professional language)

2. APPROVED COMP RANGE (specific items or dollar amount based on the responder's authority and situation severity)

3. REQUIRED FOLLOW-UP STEPS (what must happen after the initial recovery)

4. ESCALATION NEEDED? (Yes/No and why - if the situation exceeds the responder's authority)

Keep the response practical and immediately actionable. This is real-time guidance for a live service situation.`,
        }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to generate recovery advice");

      const reader = res.body?.getReader();
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
                setResponse(content);
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      toast({ title: "Failed to generate recovery advice", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(response);
    toast({ title: "Copied to clipboard!" });
  };

  return (
    <Card className="mb-8 border-t-2 border-t-primary">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Guest Recovery Decision Advisor
            </CardTitle>
            <CardDescription className="mt-1">
              Get real-time guidance on how to recover a service failure—within your comp limits
            </CardDescription>
          </div>
          <span className="text-[10px] font-semibold tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-full whitespace-nowrap">
            Real-time guidance
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="issueType" className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
              Issue Type
            </Label>
            <Select value={issueType} onValueChange={setIssueType}>
              <SelectTrigger id="issueType" className="mt-1 py-3 focus:ring-2 focus:ring-primary/50" data-testid="select-issue-type">
                <SelectValue placeholder="Select issue type..." />
              </SelectTrigger>
              <SelectContent>
                {issueTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="responderRole" className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-blue-400" />
              Who is Responding?
            </Label>
            <Select value={responderRole} onValueChange={setResponderRole}>
              <SelectTrigger id="responderRole" className="mt-1 py-3 focus:ring-2 focus:ring-primary/50" data-testid="select-responder-role">
                <SelectValue placeholder="Select role..." />
              </SelectTrigger>
              <SelectContent>
                {roles.map(role => (
                  <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="timeDelay">Time Delay (minutes over expected)</Label>
            <Input
              id="timeDelay"
              type="number"
              placeholder="e.g., 18"
              className="mt-1 py-3 focus:ring-2 focus:ring-primary/50"
              value={timeDelay}
              onChange={(e) => setTimeDelay(e.target.value)}
              data-testid="input-time-delay"
            />
            <p className="text-xs text-muted-foreground mt-1">How many minutes past the expected time?</p>
          </div>
          <div>
            <Label htmlFor="checkValue">Check Value ($)</Label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="checkValue"
                type="number"
                placeholder="e.g., 96"
                className="pl-9 py-3 focus:ring-2 focus:ring-primary/50"
                value={checkValue}
                onChange={(e) => setCheckValue(e.target.value)}
                data-testid="input-check-value"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total check value helps calibrate comp recommendation</p>
          </div>
        </div>

        <div>
          <Label htmlFor="additionalContext">Additional Context (optional)</Label>
          <Textarea
            id="additionalContext"
            placeholder="e.g., Server already apologized, guest is a regular, celebrating anniversary..."
            className="mt-1 min-h-[120px] focus:ring-2 focus:ring-primary/50"
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            data-testid="input-additional-context"
          />
        </div>

        <Button 
          onClick={generateRecovery} 
          disabled={isGenerating || !issueType}
          className="w-full hover:brightness-110 transition-all"
          data-testid="btn-generate-recovery"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing situation...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Get Recovery Advice <span className="ml-1">&rarr;</span>
            </>
          )}
        </Button>

        {!response && !isGenerating && (
          <button
            onClick={() => setShowSample(!showSample)}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors mt-2 flex items-center gap-1"
            data-testid="btn-toggle-sample-recovery"
          >
            {showSample ? "Hide example output" : (<><span>&darr;</span> See example output</>)}
          </button>
        )}
        {showSample && !response && (
          <div className="mt-2 rounded-lg border border-primary/20 overflow-hidden" data-testid="sample-recovery-output">
            <div className="px-3 py-2 bg-primary/5 border-b border-primary/10">
              <span className="text-xs font-semibold text-primary tracking-wide">EXAMPLE OUTPUT</span>
            </div>
            <div className="p-3 text-xs text-muted-foreground space-y-2">
              <div>
                <span className="font-semibold text-foreground">RECOVERY SCRIPT:</span>
                <p className="pl-3 italic mt-0.5">"I sincerely apologize for the wait. Let me get that corrected right away and I'd like to offer a complimentary dessert for the trouble."</p>
              </div>
              <div>
                <span className="font-semibold text-foreground">APPROVED COMP:</span>
                <span className="ml-1">Free dessert + comped appetizer (~$18)</span>
              </div>
              <div>
                <span className="font-semibold text-foreground">FOLLOW-UP:</span>
                <span className="ml-1">Check back within 5 minutes, alert manager on duty</span>
              </div>
            </div>
          </div>
        )}

        {response && (
          <div className="mt-4 space-y-4">
            <div className="p-4 bg-accent/50 rounded-lg">
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {response}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={copyToClipboard} data-testid="btn-copy-recovery">
              <Copy className="h-4 w-4 mr-2" />
              Copy to Clipboard
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Restaurant profile types
interface RestaurantProfile {
  restaurantName?: string;
  restaurantType?: string;
  seatCount?: number;
  staffCount?: number;
  location?: string;
  city?: string;
  peakDays?: string[];
  peakHours?: string;
  keyChallenge1?: string;
  keyChallenge2?: string;
  keyChallenge3?: string;
  averageLaborPercent?: number;
  averageFoodCostPercent?: number;
}

const LCC_CRISIS_TYPES = [
  { id: "no-show", label: "Staff No-Show", icon: "👤", urgent: true },
  { id: "equipment", label: "Equipment Failure", icon: "🔧", urgent: true },
  { id: "rush", label: "Unexpected Rush", icon: "⚡", urgent: false },
  { id: "complaint", label: "Guest Complaint", icon: "💬", urgent: false },
  { id: "delivery", label: "Delivery Problem", icon: "📦", urgent: false },
  { id: "health", label: "Health/Safety Issue", icon: "🛡️", urgent: true },
];

const TAG_COLORS: Record<string, string> = {
  Operations: "#f59e0b",
  Inventory: "#3b82f6",
  Leadership: "#8b5cf6",
  Revenue: "#10b981",
  Training: "#f97316",
  Staffing: "#ec4899",
  Service: "#06b6d4",
  Finance: "#ef4444",
  Admin: "#6b7280",
};

const URGENCY_STYLES: Record<string, { dot: string; label: string }> = {
  high: { dot: "#ef4444", label: "High Priority" },
  medium: { dot: "#f59e0b", label: "Medium Priority" },
  low: { dot: "#6b7280", label: "Low Priority" },
};

interface PriorityTask {
  id: number;
  title: string;
  why: string;
  action: string;
  tag: string;
  urgency: string;
}

function parsePrioritiesFromText(text: string): PriorityTask[] {
  const tasks: PriorityTask[] = [];
  const lines = text.split('\n').filter(l => l.trim());
  
  let currentTask: Partial<PriorityTask> | null = null;
  let taskId = 1;
  
  for (const line of lines) {
    const numberedMatch = line.match(/^\*?\*?\d+[\.\)]\s*\*?\*?\s*(.+)/);
    if (numberedMatch) {
      if (currentTask?.title) {
        tasks.push({
          id: taskId++,
          title: currentTask.title,
          why: currentTask.why || '',
          action: currentTask.action || currentTask.title,
          tag: currentTask.tag || 'Operations',
          urgency: currentTask.urgency || (taskId <= 3 ? 'high' : taskId <= 5 ? 'medium' : 'low'),
        });
      }
      let title = numberedMatch[1].replace(/\*\*/g, '').trim();
      const colonIdx = title.indexOf(':');
      let tag = 'Operations';
      if (colonIdx > 0 && colonIdx < 30) {
        const possibleTag = title.substring(0, colonIdx).trim();
        if (TAG_COLORS[possibleTag]) {
          tag = possibleTag;
          title = title.substring(colonIdx + 1).trim();
        }
      }
      currentTask = { title, tag, why: '', action: '' };
    } else if (currentTask) {
      const lowerLine = line.toLowerCase().trim();
      if (lowerLine.startsWith('why') || lowerLine.includes('why it matters') || lowerLine.includes('because')) {
        currentTask.why = line.replace(/^\*?\*?why[:\s]*/i, '').replace(/\*\*/g, '').replace(/^[-–•]\s*/, '').trim();
      } else if (lowerLine.startsWith('action') || lowerLine.startsWith('do this') || lowerLine.startsWith('step')) {
        currentTask.action = line.replace(/^\*?\*?action[:\s]*/i, '').replace(/\*\*/g, '').replace(/^[-–•]\s*/, '').trim();
      } else if (!currentTask.action && !currentTask.why) {
        currentTask.action = (currentTask.action ? currentTask.action + ' ' : '') + line.replace(/^[-–•]\s*/, '').replace(/\*\*/g, '').trim();
      } else if (currentTask.why && !line.match(/^\d+[\.\)]/)) {
        currentTask.why = (currentTask.why ? currentTask.why + ' ' : '') + line.replace(/^[-–•]\s*/, '').replace(/\*\*/g, '').trim();
      }
    }
  }
  
  if (currentTask?.title) {
    tasks.push({
      id: taskId,
      title: currentTask.title,
      why: currentTask.why || '',
      action: currentTask.action || currentTask.title,
      tag: currentTask.tag || 'Operations',
      urgency: taskId <= 2 ? 'high' : taskId <= 4 ? 'medium' : 'low',
    });
  }
  
  return tasks;
}

function CCPrioritiesTab({ profile, buildPersonalizedPrompt, onRawTextChange }: { profile: RestaurantProfile | null; buildPersonalizedPrompt: () => string; onRawTextChange?: (text: string) => void }) {
  const { toast } = useToast();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [priorities, setPriorities] = useState<PriorityTask[]>([]);
  const [rawText, setRawText] = useState("");
  const [completed, setCompleted] = useState<Record<number, boolean>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const handleGenerate = async () => {
    setState("loading");
    setRawText("");
    setPriorities([]);
    setCompleted({});

    const personalContext = buildPersonalizedPrompt();

    try {
      const res = await fetch("/api/consultant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `As an experienced restaurant consultant, provide today's priority tasks for a restaurant owner/operator. Today is ${dayOfWeek}.
${personalContext}
Based on typical restaurant operations, provide specific, actionable tasks that should be prioritized on ${dayOfWeek}. Consider:

MONDAY: Week setup, reviewing weekend performance, scheduling adjustments, inventory orders, staff meetings, P&L review from prior week
TUESDAY: Training focus, vendor deliveries, prep for mid-week, checking reservations, marketing planning
WEDNESDAY: Mid-week check-in, labor review, guest feedback review, equipment checks, menu adjustments
THURSDAY: Weekend prep begins, confirming staffing, inventory check, reservations review, pre-weekend briefing prep
FRIDAY: Peak service prep, final staffing confirmation, quality checks, team briefing, ensuring weekend readiness
SATURDAY: Full service mode, floor presence, guest engagement, real-time problem solving, team support
SUNDAY: Wrap-up day, week review, staff appreciation, next week planning, reset and recovery

Format EXACTLY 5 tasks as a numbered list. For each task, include:
- The task title on the numbered line
- "Action:" followed by the specific steps to take
- "Why:" followed by the reason it matters

Be specific to restaurant operations.`,
        }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to generate tasks");

      const reader = res.body?.getReader();
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
                setRawText(content);
              }
            } catch {}
          }
        }
        onRawTextChange?.(content);
        const parsed = parsePrioritiesFromText(content);
        if (parsed.length === 0 && content.trim()) {
          setPriorities([{
            id: 1,
            title: content.split('\n').find(l => l.trim())?.replace(/^\*?\*?\d+[\.\)]\s*/, '').replace(/\*\*/g, '').trim() || "Review today's priorities",
            why: '',
            action: content.trim(),
            tag: 'Operations',
            urgency: 'medium',
          }]);
        } else {
          setPriorities(parsed);
        }
        setState("done");
      } else {
        toast({ title: "Failed to generate tasks", variant: "destructive" });
        setState("idle");
      }
    } catch (err) {
      toast({ title: "Failed to generate tasks", variant: "destructive" });
      setState("idle");
    }
  };

  const toggleComplete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompleted((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (state === "idle") {
    return (
      <div style={{ padding: "8px 0 4px" }}>
        <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
          Get personalized task recommendations for your restaurant today.
        </p>
        <button
          onClick={handleGenerate}
          data-testid="btn-generate-daily-tasks"
          style={{
            width: "100%",
            padding: "14px 20px",
            background: "linear-gradient(135deg, #d97706, #b45309)",
            border: "none",
            borderRadius: 10,
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            letterSpacing: "0.01em",
          }}
        >
          <span>✦</span> Get Today's Priorities
        </button>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div style={{ padding: "24px 0", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "#d97706", marginBottom: 12 }}>
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#d97706" }} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>Generating your {dayOfWeek} priorities…</span>
        </div>
        <div style={{ height: 3, background: "#1f2937", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: "60%", background: "linear-gradient(90deg, #d97706, #f59e0b)", borderRadius: 99, animation: "lcc-progress 2s ease-in-out forwards" }} />
        </div>
        {rawText && (
          <div style={{ marginTop: 16, padding: "12px 14px", background: "#111827", border: "1px solid #1f2937", borderRadius: 10, textAlign: "left" }}>
            <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{rawText}</p>
          </div>
        )}
      </div>
    );
  }

  const completedCount = Object.values(completed).filter(Boolean).length;
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div style={{ paddingTop: 4 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          {todayLabel} · {priorities.length} priorities
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 12, color: "#d97706", fontWeight: 600 }}>
            {completedCount}/{priorities.length} done
          </div>
          <button
            onClick={handleGenerate}
            data-testid="btn-refresh-priorities"
            style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 14, padding: 2 }}
            title="Refresh priorities"
          >
            ↻
          </button>
        </div>
      </div>

      <div style={{ height: 3, background: "#1f2937", borderRadius: 99, marginBottom: 16, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: priorities.length > 0 ? `${(completedCount / priorities.length) * 100}%` : "0%",
          background: "linear-gradient(90deg, #d97706, #f59e0b)",
          borderRadius: 99,
          transition: "width 0.4s ease",
        }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {priorities.map((task, i) => {
          const isExpanded = expandedId === task.id;
          const isDone = completed[task.id];
          return (
            <div
              key={task.id}
              onClick={() => setExpandedId(isExpanded ? null : task.id)}
              data-testid={`priority-card-${task.id}`}
              style={{
                background: isDone ? "rgba(16,185,129,0.06)" : "#111827",
                border: `1px solid ${isDone ? "rgba(16,185,129,0.2)" : isExpanded ? "rgba(217,119,6,0.4)" : "#1f2937"}`,
                borderRadius: 10,
                padding: "12px 14px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                opacity: isDone ? 0.65 : 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <button
                  onClick={(e) => toggleComplete(task.id, e)}
                  data-testid={`priority-check-${task.id}`}
                  style={{
                    width: 20, height: 20, borderRadius: 6,
                    border: `2px solid ${isDone ? "#10b981" : "#374151"}`,
                    background: isDone ? "#10b981" : "transparent",
                    color: "#fff", fontSize: 11, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    cursor: "pointer", flexShrink: 0, marginTop: 1,
                    transition: "all 0.15s",
                  }}
                >
                  {isDone && "✓"}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: URGENCY_STYLES[task.urgency]?.dot || "#6b7280", flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: 13, fontWeight: 600, color: isDone ? "#6b7280" : "#f3f4f6",
                      textDecoration: isDone ? "line-through" : "none",
                      lineHeight: 1.3,
                    }}>
                      {i + 1}. {task.title}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: TAG_COLORS[task.tag] || "#9ca3af",
                      background: `${TAG_COLORS[task.tag] || "#9ca3af"}18`,
                      padding: "2px 7px", borderRadius: 99, letterSpacing: "0.04em",
                    }}>
                      {task.tag.toUpperCase()}
                    </span>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #1f2937" }}>
                      {task.action && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.08em", marginBottom: 4 }}>ACTION</div>
                          <p style={{ fontSize: 13, color: "#d1d5db", lineHeight: 1.6, margin: 0 }}>{task.action}</p>
                        </div>
                      )}
                      {task.why && (
                        <div style={{ borderLeft: "3px solid #d97706", paddingLeft: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.08em", marginBottom: 4 }}>WHY IT MATTERS</div>
                          <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>{task.why}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <span style={{ color: "#374151", fontSize: 12, flexShrink: 0, marginTop: 2 }}>
                  {isExpanded ? "▲" : "▼"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CCCrisisTab({ buildPersonalizedPrompt }: { buildPersonalizedPrompt: () => string }) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<typeof LCC_CRISIS_TYPES[0] | null>(null);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCrisis = async (crisis: typeof LCC_CRISIS_TYPES[0]) => {
    setSelected(crisis);
    setLoading(true);
    setResponse("");

    const personalContext = buildPersonalizedPrompt();

    try {
      const res = await fetch("/api/consultant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `URGENT: I'm dealing with a ${crisis.label} right now and need immediate help.
${personalContext}
Provide a 5-step crisis response plan that I can execute RIGHT NOW:
1. Immediate action (what to do in the next 5 minutes)
2. Short-term fix (next 30 minutes)
3. Communication plan (who to notify and what to say)
4. Guest impact mitigation
5. Follow-up action (within 24 hours)

Keep it practical, actionable, and specific to restaurant operations. No fluff - I need real solutions fast.`,
        }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to generate crisis response");

      const reader = res.body?.getReader();
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
                setResponse(content);
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      toast({ title: "Failed to generate crisis response", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const formatResponse = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("**") && line.endsWith("**")) {
        return <div key={i} style={{ fontWeight: 700, color: "#f3f4f6", marginTop: i > 0 ? 12 : 0, marginBottom: 6, fontSize: 13 }}>{line.replace(/\*\*/g, "")}</div>;
      }
      if (line.match(/^\d+\./)) {
        const numMatch = line.match(/^\d+/);
        return <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <span style={{ color: "#d97706", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{numMatch?.[0]}.</span>
          <span style={{ color: "#d1d5db", fontSize: 13, lineHeight: 1.5 }}>{line.replace(/^\d+\.\s/, "").replace(/\*\*/g, "")}</span>
        </div>;
      }
      if (line.trim() === "") return <div key={i} style={{ height: 4 }} />;
      return <div key={i} style={{ color: "#d1d5db", fontSize: 13, lineHeight: 1.5 }}>{line.replace(/\*\*/g, "")}</div>;
    });
  };

  if (selected) {
    return (
      <div>
        <button
          onClick={() => { setSelected(null); setResponse(""); }}
          data-testid="btn-crisis-back"
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#6b7280", fontSize: 13, cursor: "pointer", marginBottom: 14, padding: 0 }}
        >
          ← Back to Crisis Menu
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 20 }}>{selected.icon}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#f3f4f6" }}>{selected.label}</div>
            {selected.urgent && <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 600, letterSpacing: "0.05em" }}>HIGH URGENCY</div>}
          </div>
        </div>
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 10, padding: "14px 16px", minHeight: 120 }}>
          {loading && !response ? (
            <div style={{ color: "#d97706", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#d97706" }} />
              Getting guidance…
            </div>
          ) : response ? (
            <div>{formatResponse(response)}</div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#ef4444", fontSize: 16 }}>⚠</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fca5a5" }}>Quick Fix Mode</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>Immediate step-by-step guidance for common emergencies.</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {LCC_CRISIS_TYPES.map((c) => (
          <button
            key={c.id}
            onClick={() => handleCrisis(c)}
            data-testid={`btn-crisis-${c.id}`}
            style={{
              background: "#111827",
              border: `1px solid ${c.urgent ? "rgba(239,68,68,0.2)" : "#1f2937"}`,
              borderRadius: 10,
              padding: "14px 12px",
              cursor: "pointer",
              textAlign: "left" as const,
              transition: "all 0.15s",
              position: "relative" as const,
            }}
          >
            {c.urgent && (
              <div style={{ position: "absolute" as const, top: 8, right: 8, width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} />
            )}
            <div style={{ fontSize: 20, marginBottom: 6 }}>{c.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#f3f4f6" }}>{c.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CCFollowUpTab({ buildPersonalizedPrompt, rawPrioritiesText }: { buildPersonalizedPrompt: () => string; rawPrioritiesText: string }) {
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleAsk = async () => {
    if (!question.trim()) return;
    const q = question;
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);

    const personalContext = buildPersonalizedPrompt();
    const previousContext = rawPrioritiesText ? `\n\nPrevious priorities generated:\n${rawPrioritiesText}` : '';
    const chatContext = messages.length > 0
      ? `\n\nPrevious conversation:\n${messages.map(m => `${m.role}: ${m.text}`).join('\n')}`
      : '';

    try {
      const res = await fetch("/api/consultant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `You are helping a restaurant owner/operator with their daily operations.
${personalContext}${previousContext}${chatContext}

User's follow-up question: ${q}

Provide a helpful, specific response. Be concise but thorough.`,
        }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to get response");

      const reader = res.body?.getReader();
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
              }
            } catch {}
          }
        }
        setMessages((prev) => [...prev, { role: "assistant", text: content }]);
      }
    } catch (err) {
      toast({ title: "Failed to get response", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
        Ask follow-up questions about your priorities or get deeper guidance on any topic.
      </p>

      {messages.length > 0 && (
        <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: m.role === "user" ? "rgba(217,119,6,0.1)" : "#111827",
              border: `1px solid ${m.role === "user" ? "rgba(217,119,6,0.2)" : "#1f2937"}`,
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "92%",
            }}>
              <div style={{ fontSize: 13, color: m.role === "user" ? "#fcd34d" : "#d1d5db", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{m.text}</div>
            </div>
          ))}
          {loading && (
            <div style={{ padding: "10px 14px", background: "#111827", border: "1px solid #1f2937", borderRadius: 10, alignSelf: "flex-start" }}>
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#d97706" }} />
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); }}}
          placeholder="e.g., 'How should I handle labor assessment for my 20-person team?'"
          rows={3}
          data-testid="input-followup"
          style={{
            width: "100%", padding: "12px 14px",
            background: "#111827", border: "1px solid #1f2937",
            borderRadius: 10, color: "#f3f4f6", fontSize: 13,
            resize: "none", fontFamily: "inherit", outline: "none",
            lineHeight: 1.5, boxSizing: "border-box" as const,
          }}
        />
        <button
          onClick={handleAsk}
          disabled={!question.trim() || loading}
          data-testid="btn-send-followup"
          style={{
            padding: "12px 20px",
            background: question.trim() && !loading ? "linear-gradient(135deg, #d97706, #b45309)" : "#1f2937",
            border: "none", borderRadius: 10,
            color: question.trim() && !loading ? "#fff" : "#4b5563",
            fontSize: 14, fontWeight: 600, cursor: question.trim() && !loading ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          ✦ Ask Question
        </button>
      </div>
    </div>
  );
}

const LCC_TABS = [
  { id: "priorities", label: "Priorities", icon: "✦" },
  { id: "crisis", label: "Crisis", icon: "⚠" },
  { id: "followup", label: "Follow-up", icon: "💬" },
  { id: "progress", label: "Progress", icon: "✓" },
  { id: "reminders", label: "Reminders", icon: "🔔" },
];

function DailyTaskReminder() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("priorities");
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [rawPrioritiesText, setRawPrioritiesText] = useState("");

  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/restaurant-profile', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        if (!data) setShowProfileSetup(true);
      } else {
        setShowProfileSetup(true);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      setShowProfileSetup(true);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const saveProfile = async (newProfile: RestaurantProfile) => {
    try {
      const res = await fetch('/api/restaurant-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfile),
        credentials: 'include',
      });
      if (res.ok) {
        const saved = await res.json();
        setProfile(saved);
        setShowProfileSetup(false);
        toast({ title: 'Profile saved!', description: 'Your priorities will now be personalized.' });
      }
    } catch (err) {
      toast({ title: 'Failed to save profile', variant: 'destructive' });
    }
  };

  const buildPersonalizedPrompt = () => {
    let contextBlock = '';
    if (profile) {
      const parts: string[] = [];
      if (profile.restaurantName) parts.push(`Restaurant: ${profile.restaurantName}`);
      if (profile.restaurantType) parts.push(`Type: ${profile.restaurantType.replace('_', ' ')}`);
      if (profile.seatCount) parts.push(`Seats: ${profile.seatCount}`);
      if (profile.staffCount) parts.push(`Staff: ${profile.staffCount}`);
      if (profile.location) parts.push(`Location: ${profile.location}`);
      if (profile.peakDays?.length) parts.push(`Peak days: ${profile.peakDays.join(', ')}`);
      if (profile.peakHours) parts.push(`Peak hours: ${profile.peakHours}`);
      if (profile.keyChallenge1) parts.push(`Key challenge: ${profile.keyChallenge1.replace('_', ' ')}`);
      if (profile.keyChallenge2) parts.push(`Secondary challenge: ${profile.keyChallenge2.replace('_', ' ')}`);
      if (profile.averageLaborPercent) parts.push(`Target labor: ${profile.averageLaborPercent}%`);
      if (profile.averageFoodCostPercent) parts.push(`Target food cost: ${profile.averageFoodCostPercent}%`);
      if (parts.length > 0) {
        contextBlock = `\n\nRESTAURANT CONTEXT:\n${parts.join('\n')}\n\nPersonalize your recommendations based on this specific restaurant's profile, challenges, and operation style.`;
      }
    }
    return contextBlock;
  };

  if (isLoadingProfile) {
    return (
      <div className="mb-8" style={{ background: "#0f172a", border: "1px solid #1f2937", borderRadius: 16, padding: "32px", display: "flex", justifyContent: "center" }}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tabContent: Record<string, JSX.Element> = {
    priorities: <CCPrioritiesTab profile={profile} buildPersonalizedPrompt={buildPersonalizedPrompt} onRawTextChange={setRawPrioritiesText} />,
    crisis: <CCCrisisTab buildPersonalizedPrompt={buildPersonalizedPrompt} />,
    followup: <CCFollowUpTab buildPersonalizedPrompt={buildPersonalizedPrompt} rawPrioritiesText={rawPrioritiesText} />,
    progress: <TaskProgressDashboard />,
    reminders: <NotificationReminders />,
  };

  return (
    <>
      <Dialog open={showProfileSetup} onOpenChange={setShowProfileSetup}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Personalize Your Priorities
            </DialogTitle>
            <DialogDescription>
              Tell us about your restaurant to get tailored recommendations.
            </DialogDescription>
          </DialogHeader>
          <RestaurantProfileForm 
            initialProfile={profile || {}} 
            onSave={saveProfile}
            onCancel={() => setShowProfileSetup(false)}
          />
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes lcc-progress { from { width: 0%; } to { width: 80%; } }
      `}</style>

      <div className="mb-8" style={{ background: "#0f172a", border: "1px solid #1f2937", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px 0", borderBottom: "1px solid #1f2937" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ color: "#d97706", fontSize: 16 }}>📅</span>
                <span style={{ fontSize: 17, fontWeight: 700, color: "#f3f4f6" }}>Leadership Command Center</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 24, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>🕐 {todayDate}</span>
                {profile?.restaurantName && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#d97706", background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.2)", padding: "2px 8px", borderRadius: 99 }}>
                    {profile.restaurantName}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowProfileSetup(true)}
              data-testid="btn-edit-profile"
              style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer", fontSize: 18, padding: 4 }}
            >
              ⚙
            </button>
          </div>

          <div style={{ display: "flex", gap: 0, marginBottom: "-1px" }}>
            {LCC_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`tab-${tab.id}`}
                style={{
                  flex: 1,
                  padding: "10px 4px",
                  background: "none",
                  border: "none",
                  borderBottom: `2px solid ${activeTab === tab.id ? "#d97706" : "transparent"}`,
                  color: activeTab === tab.id ? "#d97706" : "#4b5563",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  letterSpacing: "0.03em",
                  transition: "all 0.15s",
                  display: "flex",
                  flexDirection: "column" as const,
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <span style={{ fontSize: tab.id === "reminders" ? 13 : 14 }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: "18px 20px" }}>
          {tabContent[activeTab]}
        </div>
      </div>
    </>
  );
}

// Task Progress Dashboard Component
function TaskProgressDashboard() {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');
  
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const startDate = selectedPeriod === 'week' ? weekAgo : monthAgo;
  
  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    byCategory: Record<string, { total: number; completed: number }>;
  }>({
    queryKey: ['/api/daily-tasks/stats', startDate, today],
  });
  
  const { data: trends, isLoading: trendsLoading } = useQuery<{
    weekStart: string;
    completed: number;
    total: number;
  }[]>({
    queryKey: ['/api/daily-tasks/trends', 8],
  });
  
  const { data: todayTasks, isLoading: todayLoading } = useQuery<any[]>({
    queryKey: ['/api/daily-tasks', today],
  });
  
  const categoryLabels: Record<string, string> = {
    labor: 'Labor',
    inventory: 'Inventory', 
    training: 'Training',
    service: 'Service',
    admin: 'Admin',
    finance: 'Finance',
    uncategorized: 'Other'
  };
  
  const categoryColors: Record<string, string> = {
    labor: 'bg-primary',
    inventory: 'bg-green-500',
    training: 'bg-purple-500', 
    service: 'bg-orange-500',
    admin: 'bg-muted-foreground',
    finance: 'bg-red-500',
    uncategorized: 'bg-muted-foreground'
  };
  
  if (statsLoading || trendsLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">View:</span>
        <Button
          variant={selectedPeriod === 'week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedPeriod('week')}
          data-testid="btn-period-week"
        >
          This Week
        </Button>
        <Button
          variant={selectedPeriod === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedPeriod('month')}
          data-testid="btn-period-month"
        >
          This Month
        </Button>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-lg bg-muted/50 text-center">
          <p className="text-2xl font-bold text-primary">{stats?.completedTasks || 0}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
        <div className="p-4 rounded-lg bg-muted/50 text-center">
          <p className="text-2xl font-bold">{stats?.totalTasks || 0}</p>
          <p className="text-xs text-muted-foreground">Total Tasks</p>
        </div>
        <div className="p-4 rounded-lg bg-muted/50 text-center">
          <p className="text-2xl font-bold text-green-600">{stats?.completionRate || 0}%</p>
          <p className="text-xs text-muted-foreground">Rate</p>
        </div>
      </div>
      
      {/* Weekly Trend Bars */}
      {trends && trends.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Weekly Trends</h4>
          <div className="flex items-end gap-1 h-24 p-3 bg-muted/30 rounded-lg">
            {trends.map((week, idx) => {
              const maxTotal = Math.max(...trends.map(w => w.total), 1);
              const height = week.total > 0 ? (week.completed / maxTotal) * 100 : 0;
              const rate = week.total > 0 ? Math.round((week.completed / week.total) * 100) : 0;
              
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className="w-full bg-primary/80 rounded-t transition-all duration-300"
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${week.completed}/${week.total} tasks (${rate}%)`}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    W{trends.length - idx}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Task completion over the past {trends.length} weeks
          </p>
        </div>
      )}
      
      {/* Category Breakdown */}
      {stats?.byCategory && Object.keys(stats.byCategory).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">By Category</h4>
          <div className="space-y-2">
            {Object.entries(stats.byCategory).map(([cat, data]) => {
              const rate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${categoryColors[cat] || 'bg-muted-foreground'}`} />
                  <span className="text-sm flex-1">{categoryLabels[cat] || cat}</span>
                  <span className="text-xs text-muted-foreground">
                    {data.completed}/{data.total}
                  </span>
                  <Badge variant={rate >= 80 ? "default" : rate >= 50 ? "secondary" : "outline"}>
                    {rate}%
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Day-by-Day Heatmap */}
      <DailyHeatmap />
      
      {/* Empty State */}
      {(!stats?.totalTasks || stats.totalTasks === 0) && (
        <div className="text-center py-6 text-muted-foreground">
          <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No tasks tracked yet.</p>
          <p className="text-xs">Tasks you complete from generated priorities will appear here.</p>
        </div>
      )}
    </div>
  );
}

// Daily Heatmap Component for visual task completion insights
function DailyHeatmap() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Calculate date range for the past 8 weeks
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Fetch daily completion data
  const { data: dailyData, isLoading } = useQuery<{ date: string; completed: number; total: number }[]>({
    queryKey: ['/api/daily-tasks/heatmap', startDate, endDate],
  });
  
  // Generate the grid structure for 8 weeks
  const now = new Date();
  const gridData: { date: string; dayOfWeek: number; weekIndex: number }[] = [];
  
  for (let week = 0; week < 8; week++) {
    for (let day = 0; day < 7; day++) {
      const date = new Date(now);
      date.setDate(now.getDate() - ((7 - now.getDay()) + (week * 7) + (6 - day)));
      
      if (date <= now) {
        gridData.push({
          date: date.toISOString().split('T')[0],
          dayOfWeek: day,
          weekIndex: week,
        });
      }
    }
  }
  
  const getIntensityColor = (completed: number, total: number) => {
    if (total === 0) return 'bg-muted';
    const rate = completed / total;
    if (rate < 0.25) return 'bg-green-200 dark:bg-green-900';
    if (rate < 0.5) return 'bg-green-300 dark:bg-green-700';
    if (rate < 0.75) return 'bg-green-400 dark:bg-green-600';
    return 'bg-green-500 dark:bg-green-500';
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  // Create a lookup map for quick access
  const dataByDate = new Map(dailyData?.map(d => [d.date, d]) || []);
  
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Activity Heatmap</h4>
      <div className="flex gap-1">
        <div className="flex flex-col gap-1 text-[10px] text-muted-foreground pr-1">
          {days.map(day => (
            <div key={day} className="h-3 flex items-center">{day}</div>
          ))}
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {[...Array(8)].map((_, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-1">
              {days.map((_, dayIdx) => {
                const cell = gridData.find(d => d.weekIndex === (7 - weekIdx) && d.dayOfWeek === dayIdx);
                const dayData = cell ? dataByDate.get(cell.date) : null;
                const hasData = dayData && dayData.total > 0;
                
                return (
                  <div
                    key={`${weekIdx}-${dayIdx}`}
                    className={`w-3 h-3 rounded-sm ${
                      cell 
                        ? (hasData 
                            ? getIntensityColor(dayData!.completed, dayData!.total)
                            : 'bg-muted/50')
                        : 'bg-muted/30'
                    }`}
                    title={cell 
                      ? (hasData 
                          ? `${cell.date}: ${dayData!.completed}/${dayData!.total} tasks (${Math.round((dayData!.completed / dayData!.total) * 100)}%)` 
                          : `${cell.date}: No tasks`)
                      : 'No data'}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-0.5">
          <div className="w-3 h-3 rounded-sm bg-muted" />
          <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900" />
          <div className="w-3 h-3 rounded-sm bg-green-300 dark:bg-green-700" />
          <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-600" />
          <div className="w-3 h-3 rounded-sm bg-green-500" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

// Notification Reminders Component
function NotificationReminders() {
  const { toast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');
  
  // Check notification support and permission on mount, and re-check on focus
  useEffect(() => {
    const checkPermission = () => {
      if (!('Notification' in window)) {
        setNotificationPermission('unsupported');
      } else {
        setNotificationPermission(Notification.permission);
      }
    };
    
    checkPermission();
    
    // Re-check permission when window gains focus (user might have changed it in settings)
    window.addEventListener('focus', checkPermission);
    
    // Load saved preferences from localStorage
    const savedEnabled = localStorage.getItem('dailyReminderEnabled');
    const savedTime = localStorage.getItem('dailyReminderTime');
    if (savedEnabled === 'true') setReminderEnabled(true);
    if (savedTime) setReminderTime(savedTime);
    
    return () => window.removeEventListener('focus', checkPermission);
  }, []);
  
  // Set up reminder using setTimeout to fire at exact time, once per day
  useEffect(() => {
    if (!reminderEnabled || notificationPermission !== 'granted') return;
    
    // Save preferences
    localStorage.setItem('dailyReminderEnabled', 'true');
    localStorage.setItem('dailyReminderTime', reminderTime);
    
    const scheduleNextReminder = () => {
      const now = new Date();
      const [hours, minutes] = reminderTime.split(':').map(Number);
      
      // Calculate the next reminder time
      const nextReminder = new Date(now);
      nextReminder.setHours(hours, minutes, 0, 0);
      
      // If we've passed today's reminder time, schedule for tomorrow
      if (now >= nextReminder) {
        nextReminder.setDate(nextReminder.getDate() + 1);
      }
      
      const msUntilReminder = nextReminder.getTime() - now.getTime();
      
      // Schedule the notification
      const timeoutId = setTimeout(() => {
        const today = new Date().toISOString().split('T')[0];
        const lastReminderDate = localStorage.getItem('lastReminderDate');
        
        // Only show if we haven't already reminded today
        if (lastReminderDate !== today) {
          showNotification();
          localStorage.setItem('lastReminderDate', today);
        }
        
        // Schedule the next day's reminder
        scheduleNextReminder();
      }, msUntilReminder);
      
      return timeoutId;
    };
    
    const timeoutId = scheduleNextReminder();
    
    return () => clearTimeout(timeoutId);
  }, [reminderEnabled, reminderTime, notificationPermission]);
  
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast({ title: 'Notifications not supported', description: 'Your browser does not support notifications.', variant: 'destructive' });
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        toast({ title: 'Notifications enabled', description: 'You can now receive daily reminders.' });
      } else if (permission === 'denied') {
        toast({ title: 'Notifications blocked', description: 'Please enable notifications in your browser settings.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({ title: 'Error', description: 'Failed to request notification permission.', variant: 'destructive' });
    }
  };
  
  const showNotification = () => {
    if (notificationPermission !== 'granted') return;
    
    const notification = new Notification('Daily Task Reminder', {
      body: 'Time to check your daily priorities and keep your restaurant running smoothly!',
      icon: '/favicon.ico',
      tag: 'daily-reminder', // Prevents duplicate notifications
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  };
  
  const testNotification = () => {
    if (notificationPermission !== 'granted') {
      toast({ title: 'Permission required', description: 'Please enable notifications first.', variant: 'destructive' });
      return;
    }
    showNotification();
    toast({ title: 'Test notification sent', description: 'Check your notifications!' });
  };
  
  const toggleReminder = (enabled: boolean) => {
    setReminderEnabled(enabled);
    localStorage.setItem('dailyReminderEnabled', enabled ? 'true' : 'false');
    
    if (enabled) {
      toast({ title: 'Reminder enabled', description: `You'll be reminded at ${reminderTime} every day.` });
    } else {
      toast({ title: 'Reminder disabled' });
    }
  };
  
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Set up daily reminders to stay on top of your restaurant priorities.
      </p>
      
      {/* Notification Permission Status */}
      <div className="p-4 bg-muted/30 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {notificationPermission === 'granted' ? (
              <BellRing className="h-5 w-5 text-green-500" />
            ) : (
              <Bell className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="font-medium">Browser Notifications</span>
          </div>
          <Badge variant={notificationPermission === 'granted' ? 'default' : 'secondary'}>
            {notificationPermission === 'granted' ? 'Enabled' : 
             notificationPermission === 'denied' ? 'Blocked' : 
             notificationPermission === 'unsupported' ? 'Not Supported' : 'Not Set'}
          </Badge>
        </div>
        
        {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
          <Button onClick={requestPermission} variant="outline" size="sm" data-testid="btn-enable-notifications">
            <Bell className="h-4 w-4 mr-2" />
            Enable Notifications
          </Button>
        )}
        
        {notificationPermission === 'denied' && (
          <p className="text-xs text-muted-foreground">
            Notifications are blocked. Please enable them in your browser settings by clicking the lock icon in the address bar.
          </p>
        )}
      </div>
      
      {/* Reminder Settings */}
      {notificationPermission === 'granted' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="font-medium">Daily Priority Reminder</p>
              <p className="text-sm text-muted-foreground">Get notified to check your daily tasks</p>
            </div>
            <Button
              variant={reminderEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleReminder(!reminderEnabled)}
              data-testid="btn-toggle-reminder"
            >
              {reminderEnabled ? 'On' : 'Off'}
            </Button>
          </div>
          
          {reminderEnabled && (
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <Label htmlFor="reminderTime" className="text-sm font-medium">Reminder Time</Label>
                <p className="text-xs text-muted-foreground">What time should we remind you?</p>
              </div>
              <Input
                type="time"
                id="reminderTime"
                value={reminderTime}
                onChange={(e) => {
                  setReminderTime(e.target.value);
                  localStorage.setItem('dailyReminderTime', e.target.value);
                }}
                className="w-32"
                data-testid="input-reminder-time"
              />
            </div>
          )}
          
          <Button 
            onClick={testNotification} 
            variant="outline" 
            size="sm" 
            className="w-full"
            data-testid="btn-test-notification"
          >
            <BellRing className="h-4 w-4 mr-2" />
            Test Notification
          </Button>
        </div>
      )}
      
      {notificationPermission === 'unsupported' && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Your browser doesn't support notifications. Try using a modern browser like Chrome, Firefox, or Edge.
          </p>
        </div>
      )}
    </div>
  );
}

// Restaurant Profile Setup Form Component
function RestaurantProfileForm({ 
  initialProfile, 
  onSave, 
  onCancel 
}: { 
  initialProfile: RestaurantProfile; 
  onSave: (profile: RestaurantProfile) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<RestaurantProfile>(initialProfile);
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const updateField = (field: keyof RestaurantProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="flex gap-1">
        {[1, 2, 3].map((s) => (
          <div 
            key={s} 
            className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h3 className="font-medium">Basic Information</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="restaurantName">Restaurant Name</Label>
              <Input
                id="restaurantName"
                value={formData.restaurantName || ''}
                onChange={(e) => updateField('restaurantName', e.target.value)}
                placeholder="Your restaurant name"
                data-testid="input-restaurant-name"
              />
            </div>
            <div>
              <Label htmlFor="restaurantType">Restaurant Type</Label>
              <Select value={formData.restaurantType || ''} onValueChange={(v) => updateField('restaurantType', v)}>
                <SelectTrigger data-testid="select-restaurant-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fine_dining">Fine Dining</SelectItem>
                  <SelectItem value="casual">Casual Dining</SelectItem>
                  <SelectItem value="fast_casual">Fast Casual</SelectItem>
                  <SelectItem value="quick_service">Quick Service</SelectItem>
                  <SelectItem value="bar">Bar/Lounge</SelectItem>
                  <SelectItem value="cafe">Cafe/Coffee Shop</SelectItem>
                  <SelectItem value="brunch">Brunch Spot</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="seatCount">Seat Count</Label>
                <Input
                  id="seatCount"
                  type="number"
                  value={formData.seatCount || ''}
                  onChange={(e) => updateField('seatCount', parseInt(e.target.value) || undefined)}
                  placeholder="e.g., 80"
                  data-testid="input-seat-count"
                />
              </div>
              <div>
                <Label htmlFor="staffCount">Staff Count</Label>
                <Input
                  id="staffCount"
                  type="number"
                  value={formData.staffCount || ''}
                  onChange={(e) => updateField('staffCount', parseInt(e.target.value) || undefined)}
                  placeholder="e.g., 25"
                  data-testid="input-staff-count"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="font-medium">Operations</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="location">Location Type</Label>
              <Select value={formData.location || ''} onValueChange={(v) => updateField('location', v)}>
                <SelectTrigger data-testid="select-location">
                  <SelectValue placeholder="Select location type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urban">Urban</SelectItem>
                  <SelectItem value="suburban">Suburban</SelectItem>
                  <SelectItem value="rural">Rural</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="peakHours">Peak Hours</Label>
              <Select value={formData.peakHours || ''} onValueChange={(v) => updateField('peakHours', v)}>
                <SelectTrigger data-testid="select-peak-hours">
                  <SelectValue placeholder="Select peak hours" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="brunch">Brunch</SelectItem>
                  <SelectItem value="all_day">All Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="laborPercent">Avg Labor %</Label>
                <Input
                  id="laborPercent"
                  type="number"
                  value={formData.averageLaborPercent || ''}
                  onChange={(e) => updateField('averageLaborPercent', parseInt(e.target.value) || undefined)}
                  placeholder="e.g., 30"
                  data-testid="input-labor-percent"
                />
              </div>
              <div>
                <Label htmlFor="foodCostPercent">Avg Food Cost %</Label>
                <Input
                  id="foodCostPercent"
                  type="number"
                  value={formData.averageFoodCostPercent || ''}
                  onChange={(e) => updateField('averageFoodCostPercent', parseInt(e.target.value) || undefined)}
                  placeholder="e.g., 28"
                  data-testid="input-food-cost-percent"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h3 className="font-medium">Key Challenges</h3>
          <p className="text-sm text-muted-foreground">What are your biggest operational challenges?</p>
          <div className="space-y-3">
            {[1, 2, 3].map((num) => (
              <div key={num}>
                <Label htmlFor={`challenge${num}`}>Challenge #{num}</Label>
                <Select 
                  value={(formData as any)[`keyChallenge${num}`] || ''} 
                  onValueChange={(v) => updateField(`keyChallenge${num}` as keyof RestaurantProfile, v)}
                >
                  <SelectTrigger data-testid={`select-challenge-${num}`}>
                    <SelectValue placeholder={num === 1 ? "Primary challenge" : "Optional"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high_turnover">High Staff Turnover</SelectItem>
                    <SelectItem value="food_costs">Food Cost Control</SelectItem>
                    <SelectItem value="labor_costs">Labor Cost Management</SelectItem>
                    <SelectItem value="consistency">Service Consistency</SelectItem>
                    <SelectItem value="scheduling">Scheduling Complexity</SelectItem>
                    <SelectItem value="training">Staff Training</SelectItem>
                    <SelectItem value="reviews">Managing Reviews</SelectItem>
                    <SelectItem value="inventory">Inventory Management</SelectItem>
                    <SelectItem value="marketing">Marketing/Visibility</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        {step > 1 ? (
          <Button variant="outline" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        ) : (
          <Button variant="ghost" onClick={onCancel}>
            Skip for now
          </Button>
        )}
        {step < totalSteps ? (
          <Button onClick={() => setStep(step + 1)}>
            Next
          </Button>
        ) : (
          <Button onClick={handleSubmit} data-testid="btn-save-profile">
            Save Profile
          </Button>
        )}
      </div>
    </div>
  );
}

const REVIEW_TYPES = [
  { value: "negative", label: "Negative Review", color: '#ef4444', icon: Star },
  { value: "positive", label: "Positive Review", color: '#d4a017', icon: Star },
  { value: "mixed", label: "Mixed Review", color: '#f59e0b', icon: Star },
  { value: "fake", label: "Fake/Defamatory Review", color: '#ef4444', icon: AlertTriangle },
];

const RESPONSE_TONES = [
  { value: "professional", label: "Professional & Empathetic" },
  { value: "brief", label: "Brief & Direct" },
  { value: "recovery", label: "Recovery-Focused" },
  { value: "factual", label: "Factual Correction" },
  { value: "warm", label: "Warm & Personal" },
  { value: "firm", label: "Firm but Fair" },
];

const TONE_INSTRUCTIONS: Record<string, string> = {
  professional: "Professional and empathetic — warm but polished",
  brief: "Brief and direct — short, sincere, no fluff",
  recovery: "Recovery-focused — invite them back, offer to make it right",
  factual: "Factual correction — politely and professionally address inaccuracies while remaining respectful",
  warm: "Warm and personal — write like a caring host who remembers their regulars, friendly and heartfelt",
  firm: "Firm but fair — professionally push back on unfair claims without being defensive, stand by your team while remaining respectful",
};

const REVIEW_BEST_PRACTICES = [
  { title: "Respond within 24 hours", body: "Platforms surface recent responses. Speed signals you care." },
  { title: "Never argue publicly", body: "Take heated disputes offline. \"Please reach out to us directly at [contact info].\"" },
  { title: "Thank every reviewer", body: "Even negative ones. It shows professionalism to all future readers." },
  { title: "Don't offer compensation publicly", body: "It invites gaming the system. Offer privately if warranted." },
  { title: "Use the reviewer's name if known", body: "Personalizes the response. Avoid \"Dear Customer.\"" },
  { title: "Keep it under 150 words", body: "Long responses look defensive. Short ones look confident." },
];

function ReputationStatusStrip({ responseCount, lastType, lastTone }: { responseCount: number; lastType: string; lastTone: string }) {
  const lastTypeLabel = REVIEW_TYPES.find(t => t.value === lastType)?.label || "--";
  const lastToneLabel = RESPONSE_TONES.find(t => t.value === lastTone)?.label || "--";
  const cards = [
    { label: "Responses Generated", value: responseCount > 0 ? `${responseCount} responses` : "0 responses", muted: responseCount === 0 },
    { label: "Last Response Type", value: responseCount > 0 ? `${lastTypeLabel} · ${lastToneLabel}` : "--", muted: responseCount === 0 },
    { label: "Templates Available", value: "6 templates ready", muted: false },
    { label: "Response Streak", value: "Start your streak", muted: true, amber: true },
  ];
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 mb-6 scrollbar-thin" data-testid="reputation-status-strip">
      {cards.map((card, i) => (
        <div key={i} className="flex-shrink-0 min-w-[180px] rounded-lg p-3 border-l-[3px]" style={{ background: '#1a1d2e', borderLeftColor: '#b8860b' }}>
          <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>{card.label}</p>
          <p className={`text-sm font-semibold truncate`} style={{ color: card.muted ? (card.amber ? '#d4a017' : '#6b7280') : '#ffffff' }} data-testid={`rep-strip-${i}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}

function ReviewResponseGenerator() {
  const { toast } = useToast();
  const [review, setReview] = useState<string>("");
  const [reviewType, setReviewType] = useState<string>("negative");
  const [responseTone, setResponseTone] = useState<string>("professional");
  const [response, setResponse] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [copyState, setCopyState] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedResponse, setEditedResponse] = useState("");
  const [responseCount, setResponseCount] = useState(0);
  const [showRegenTone, setShowRegenTone] = useState(false);
  const [expandedPractice, setExpandedPractice] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [restaurantName, setRestaurantName] = useState<string>(() => {
    try { if (typeof window !== 'undefined') return localStorage.getItem('trc_review_restaurant') || ''; } catch {} return '';
  });
  const [yourName, setYourName] = useState<string>(() => {
    try { if (typeof window !== 'undefined') return localStorage.getItem('trc_review_name') || ''; } catch {} return '';
  });
  const [yourTitle, setYourTitle] = useState<string>(() => {
    try { if (typeof window !== 'undefined') return localStorage.getItem('trc_review_title') || 'Manager'; } catch {} return 'Manager';
  });
  const [savedFields, setSavedFields] = useState<Record<string, boolean>>({});

  const persistField = (key: string, value: string, fieldKey: string) => {
    try { localStorage.setItem(key, value); } catch {}
    setSavedFields(prev => ({ ...prev, [fieldKey]: true }));
    setTimeout(() => setSavedFields(prev => ({ ...prev, [fieldKey]: false })), 2000);
  };

  const isNative = useMemo(() => {
    try {
      const { Capacitor } = (window as any);
      return Capacitor?.isNativePlatform?.() === true;
    } catch { return false; }
  }, []);

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: "Please upload an image file", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Image must be less than 10MB", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result as string;
      setScreenshotPreview(result);
      setScreenshotBase64(result.split(',')[1]);

      const ocrText = await extractTextFromImage(result);
      if (ocrText && ocrText.trim().length > 0) {
        setReview(ocrText.trim());
        setScreenshotBase64(null);
        setOcrSuccess(true);
        toast({ title: "Review text extracted — review and edit if needed" });
      } else {
        toast({ title: "Couldn't extract text — please paste the review manually" });
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleImageUpload(file);
            e.preventDefault();
            return;
          }
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const removeScreenshot = () => {
    setScreenshotPreview(null);
    setScreenshotBase64(null);
    setOcrSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getReviewTypeInstruction = () => {
    switch (reviewType) {
      case "negative": return "Acknowledge their concern without being defensive or making excuses. Offer to make it right and invite them to reach out directly.";
      case "positive": return "Express genuine appreciation for their kind words. Invite them to visit again.";
      case "mixed": return "Thank them for the positive aspects they mentioned. Address the concerns they raised without being defensive. Balance acknowledgment with commitment to improve.";
      case "fake": return "Politely and professionally note that you have no record matching this description. Stick to facts. Invite them to contact you directly to resolve any genuine concerns. Do not accuse them directly of lying.";
      default: return "";
    }
  };

  const generateResponse = async (overrideTone?: string) => {
    if (!review.trim() && !screenshotBase64) {
      toast({ title: "Please paste a review or upload a screenshot", variant: "destructive" });
      return;
    }

    const toneToUse = overrideTone || responseTone;
    if (overrideTone) setResponseTone(overrideTone);
    setIsGenerating(true);
    setResponse("");
    setIsEditing(false);
    setShowRegenTone(false);

    try {
      const imageInstruction = screenshotBase64
        ? "I have attached a screenshot of the review. Please analyze the image to understand the customer's feedback and generate an appropriate response."
        : "";

      const textInstruction = review.trim()
        ? `CUSTOMER REVIEW TEXT:\n"${review}"`
        : "Please extract the review text from the attached screenshot.";

      const res = await fetch("/api/consultant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `Generate a professional, polite, and friendly response to this ${reviewType} customer review for my restaurant${restaurantName ? ` called "${restaurantName}"` : ""}.

${imageInstruction}

IMPORTANT NAME EXTRACTION RULE: Read the review text carefully. If the reviewer's name is visible (commonly shown as "- John" at the end, or the review is signed, or the platform shows it like "Bobby D." or "Sarah M."), extract the first name only and use it in the greeting (e.g., "Hi Bobby,"). If no name can be identified, use "Hi there," instead. Never output a literal bracket placeholder like [Customer's Name].

The response should:
- Be warm and genuine, not corporate or robotic
- Thank them for their feedback
- ${getReviewTypeInstruction()}
- Sign off with ${yourName || "[Your Name]"}, ${yourTitle || "Manager"}
- Response tone: ${TONE_INSTRUCTIONS[toneToUse] || TONE_INSTRUCTIONS.professional}
- Keep it concise (3-4 sentences max)
- Never argue with the customer or blame staff

${textInstruction}

Generate ONLY the response text, nothing else.`,
          image: screenshotBase64 || undefined,
        }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to generate response");

      const reader = res.body?.getReader();
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
                setResponse(content);
              }
            } catch {}
          }
        }
      }
      setResponseCount(prev => prev + 1);
    } catch (err) {
      toast({ title: "Failed to generate response", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    const text = isEditing ? editedResponse : response;
    navigator.clipboard.writeText(text);
    setCopyState(true);
    setTimeout(() => setCopyState(false), 2000);
  };

  const displayResponse = isEditing ? editedResponse : response;
  const toneLabel = RESPONSE_TONES.find(t => t.value === responseTone)?.label || responseTone;
  const typeLabel = REVIEW_TYPES.find(t => t.value === reviewType)?.label || reviewType;

  const TEMPLATES = [
    { title: "Thank You for Positive Review", type: "Positive", color: '#22c55e', template: `Thank you so much for taking the time to share your experience! We're thrilled to hear you enjoyed your visit. Our team works hard to make every guest feel welcome, and feedback like yours makes it all worthwhile. We can't wait to see you again soon!\n\nWarm regards,\n${yourName || "[Your Name]"}, ${yourTitle || "Manager"}` },
    { title: "Apologize and Invite Back", type: "Negative", color: '#ef4444', template: `Thank you for sharing your feedback — we sincerely apologize that your experience didn't meet the standard we hold ourselves to. This isn't reflective of what we strive to deliver, and we'd love the opportunity to make it right. Please reach out to us directly so we can ensure your next visit is the experience you deserve.\n\nSincerely,\n${yourName || "[Your Name]"}, ${yourTitle || "Manager"}` },
    { title: "Address Specific Complaint", type: "Negative", color: '#ef4444', template: `Thank you for bringing this to our attention. We take all feedback seriously and have shared your concerns with our team. We're committed to improving and would appreciate the chance to speak with you directly about your experience. Please don't hesitate to contact us.\n\nBest regards,\n${yourName || "[Your Name]"}, ${yourTitle || "Manager"}` },
    { title: "Correct Misinformation Professionally", type: "Correction", color: '#f59e0b', template: `Thank you for your review. We appreciate all feedback and want to ensure accurate information is shared. We'd like to clarify a few points and would welcome the opportunity to discuss your experience directly. Please feel free to reach out to us — we value every guest and want to make sure things are right.\n\nRespectfully,\n${yourName || "[Your Name]"}, ${yourTitle || "Manager"}` },
    { title: "Thank Customer for Return Visit", type: "Positive", color: '#22c55e', template: `We love seeing familiar faces! Thank you for coming back and for taking the time to share your experience. It means the world to us that you continue to choose us, and we'll keep working to earn that loyalty every time. See you again soon!\n\nCheers,\n${yourName || "[Your Name]"}, ${yourTitle || "Manager"}` },
    { title: "Respond to Fake/Defamatory Review", type: "Correction", color: '#ef4444', template: `We take all feedback seriously. However, we have no record of a visit matching this description on the date mentioned. We pride ourselves on transparency and accountability, and we'd genuinely like to understand your experience better. Please contact us directly so we can look into this further.\n\nRespectfully,\n${yourName || "[Your Name]"}, ${yourTitle || "Manager"}` },
  ];

  return (
    <>
    <ReputationStatusStrip responseCount={responseCount} lastType={reviewType} lastTone={responseTone} />

    <Card className="mb-8 relative overflow-hidden" style={{ background: '#1a1d2e', borderColor: '#2a2d3e' }}>
      <div className="absolute inset-0 rounded-lg pointer-events-none" style={{
        background: 'linear-gradient(90deg, transparent 0%, rgba(212,160,23,0.08) 50%, transparent 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 3s linear infinite',
      }} />
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" style={{ color: '#d4a017' }} />
          <span className="text-white">Review Response Generator</span>
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-4 rounded-full" style={{ background: '#d4a017' }} />
          <CardDescription style={{ color: '#9ca3af' }}>
            Paste a customer review and get a professional, friendly response
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="reviewType" className="text-white">Review Type</Label>
            <Select value={reviewType} onValueChange={setReviewType}>
              <SelectTrigger className="mt-1" style={{ background: '#111827', borderColor: '#374151' }} data-testid="select-review-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REVIEW_TYPES.map(rt => (
                  <SelectItem key={rt.value} value={rt.value}>
                    <span className="flex items-center gap-2">
                      <rt.icon className="h-4 w-4" style={{ color: rt.color }} />
                      {rt.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="restaurantName" className="text-white">Restaurant Name (optional)</Label>
            <div className="relative">
              <Input
                id="restaurantName"
                placeholder="Your Restaurant"
                className="mt-1"
                style={{ background: '#111827', borderColor: '#374151' }}
                value={restaurantName}
                onChange={(e) => { setRestaurantName(e.target.value); persistField('trc_review_restaurant', e.target.value, 'restaurant'); }}
                data-testid="input-restaurant-name"
              />
              {savedFields.restaurant && <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#d4a017' }} />}
            </div>
          </div>
        </div>

        <div>
          <Label className="text-white">Response Tone</Label>
          <Select value={responseTone} onValueChange={setResponseTone}>
            <SelectTrigger className="mt-1" style={{ background: '#111827', borderColor: '#374151' }} data-testid="select-response-tone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESPONSE_TONES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="yourName" className="text-white">Your Name</Label>
            <Input
              id="yourName"
              placeholder="John"
              className="mt-1"
              style={{ background: '#111827', borderColor: '#374151' }}
              value={yourName}
              onChange={(e) => { setYourName(e.target.value); persistField('trc_review_name', e.target.value, 'name'); }}
              data-testid="input-your-name"
            />
            {yourName && <p className="text-[10px] mt-0.5" style={{ color: '#6b7280' }}>Saved for next time</p>}
          </div>
          <div>
            <Label htmlFor="yourTitle" className="text-white">Your Title</Label>
            <Input
              id="yourTitle"
              placeholder="Manager"
              className="mt-1"
              style={{ background: '#111827', borderColor: '#374151' }}
              value={yourTitle}
              onChange={(e) => { setYourTitle(e.target.value); persistField('trc_review_title', e.target.value, 'title'); }}
              data-testid="input-your-title"
            />
            {yourTitle && yourTitle !== "Manager" && <p className="text-[10px] mt-0.5" style={{ color: '#6b7280' }}>Saved for next time</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="review" className="text-white">Paste the Customer Review</Label>
          <div className="relative">
            <Textarea
              id="review"
              placeholder="Paste the customer's review here... or upload a screenshot below to extract the text automatically"
              className="mt-1 min-h-[120px] focus:ring-1"
              style={{ background: '#111827', borderColor: '#374151' }}
              value={review}
              onChange={(e) => setReview(e.target.value)}
              onPaste={handlePaste}
              data-testid="textarea-review"
            />
            <span className="absolute bottom-2 right-3 text-[10px]" style={{ color: '#6b7280' }}>{review.length} chars</span>
          </div>
        </div>

        {ocrSuccess && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: '#22c55e' }} />
            <p className="text-xs" style={{ color: '#22c55e' }}>Text extracted from screenshot — review before generating</p>
            <button onClick={() => setOcrSuccess(false)} className="ml-auto"><X className="h-3 w-3" style={{ color: '#22c55e' }} /></button>
          </div>
        )}

        <div>
          {isNative ? (
            <>
              <Label className="text-white">Or Upload a Screenshot of the Review</Label>
              <div
                className="mt-1 rounded-lg p-4 text-center cursor-pointer transition-colors"
                style={{ border: '2px dashed rgba(212,160,23,0.4)', background: screenshotPreview ? '#111827' : 'transparent' }}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                data-testid="screenshot-drop-zone"
              >
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); }} data-testid="input-screenshot" />
                {screenshotPreview ? (
                  <div className="relative inline-block">
                    <img src={screenshotPreview} alt="Review screenshot" className="max-h-48 mx-auto rounded-md" />
                    <button onClick={(e) => { e.stopPropagation(); removeScreenshot(); }} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#ef4444' }} data-testid="btn-remove-screenshot">
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="py-4">
                    <Upload className="h-8 w-8 mx-auto mb-2" style={{ color: '#d4a017' }} />
                    <p className="text-sm" style={{ color: '#9ca3af' }}>Drag & drop a screenshot here, or click to upload</p>
                    <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Works best with Google, Yelp, and TripAdvisor review screenshots</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-lg p-3 mt-1" style={{ background: '#111827', border: '1px solid #2a2d3e' }}>
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 shrink-0" style={{ color: '#6b7280' }} />
                <p className="text-xs" style={{ color: '#6b7280' }}>Screenshot upload and OCR available in the iOS app. On web, paste the review text directly above.</p>
              </div>
            </div>
          )}
        </div>

        <Button
          onClick={() => generateResponse()}
          disabled={isGenerating || (!review.trim() && !screenshotBase64)}
          className="w-full h-[52px] text-white"
          style={{ background: isGenerating ? '#374151' : '#b8860b' }}
          data-testid="btn-generate-response"
        >
          {isGenerating ? (
            <span className="flex items-center gap-2 italic" style={{ color: '#d4a017' }}>
              <Loader2 className="h-4 w-4 animate-spin" />
              Crafting your response...
            </span>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Response
            </>
          )}
        </Button>

        {displayResponse && (
          <div className="mt-4 rounded-xl p-5 border-l-[3px]" style={{ background: '#111827', borderLeftColor: '#d4a017', border: '1px solid #2a2d3e', borderLeft: '3px solid #d4a017' }} data-testid="response-output-card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">Generated Response</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyToClipboard} className="h-7 text-xs" style={{ borderColor: copyState ? '#22c55e' : '#d4a017', color: copyState ? '#22c55e' : '#d4a017' }} data-testid="btn-copy-response">
                  {copyState ? <><Check className="h-3 w-3 mr-1" /> Copied!</> : <><Copy className="h-3 w-3 mr-1" /> Copy</>}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { if (!isEditing) setEditedResponse(response); setIsEditing(!isEditing); }} className="h-7 text-xs" style={{ borderColor: isEditing ? '#22c55e' : '#9ca3af', color: isEditing ? '#22c55e' : '#9ca3af' }} data-testid="btn-edit-response">
                  {isEditing ? "Done" : "Edit"}
                </Button>
              </div>
            </div>

            {isEditing ? (
              <Textarea
                value={editedResponse}
                onChange={(e) => setEditedResponse(e.target.value)}
                className="min-h-[150px] text-sm"
                style={{ background: '#0f1117', borderColor: '#374151', color: '#ffffff' }}
                data-testid="textarea-edit-response"
              />
            ) : (
              <div className="whitespace-pre-wrap text-sm text-white leading-relaxed">{displayResponse}</div>
            )}

            <div className="mt-4 pt-3 flex items-center justify-between flex-wrap gap-2" style={{ borderTop: '1px solid #2a2d3e' }}>
              <div className="flex items-center gap-3 text-[11px]" style={{ color: '#6b7280' }}>
                <span>Tone: {toneLabel}</span>
                <span>Type: {typeLabel}</span>
                <span>{displayResponse.length} chars</span>
              </div>
              <div className="relative">
                <button onClick={() => setShowRegenTone(!showRegenTone)} className="text-xs flex items-center gap-1" style={{ color: '#d4a017' }} data-testid="btn-regen-tone">
                  <RefreshCw className="h-3 w-3" /> Regenerate with different tone
                </button>
                {showRegenTone && (
                  <div className="absolute right-0 bottom-full mb-1 rounded-lg p-1 z-10 min-w-[200px]" style={{ background: '#1a1d2e', border: '1px solid #2a2d3e' }}>
                    {RESPONSE_TONES.filter(t => t.value !== responseTone).map(t => (
                      <button key={t.value} onClick={() => generateResponse(t.value)} className="w-full text-left px-3 py-1.5 text-xs rounded" style={{ color: '#9ca3af' }} data-testid={`regen-tone-${t.value}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    <Card className="mb-8" style={{ background: '#1a1d2e', borderColor: '#2a2d3e' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-5 w-5" style={{ color: '#d4a017' }} />
          <span className="text-white">Response Templates</span>
        </CardTitle>
        <CardDescription style={{ color: '#9ca3af' }}>
          Quick-start templates you can customize
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TEMPLATES.map((tmpl, idx) => (
            <div key={idx} className="p-3 rounded-lg space-y-2 relative" style={{ background: '#111827', border: '1px solid #2a2d3e' }} data-testid={`template-card-${idx}`}>
              <div className="absolute top-2 right-2">
                <Badge className="text-[9px]" style={{ background: `${tmpl.color}20`, color: tmpl.color, borderColor: `${tmpl.color}40` }}>{tmpl.type}</Badge>
              </div>
              <p className="text-sm font-medium text-white pr-16">{tmpl.title}</p>
              <p className="text-xs line-clamp-2" style={{ color: '#9ca3af' }}>{tmpl.template}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setResponse(tmpl.template);
                  toast({ title: "Template loaded — customize it before sending!" });
                }}
                className="h-7 text-xs"
                style={{ borderColor: '#d4a017', color: '#d4a017' }}
                data-testid={`btn-template-${idx}`}
              >
                Use Template
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    <Card className="mb-8" style={{ background: '#1a1d2e', borderColor: '#2a2d3e' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-5 w-5" style={{ color: '#d4a017' }} />
          <span className="text-white">Review Response Best Practices</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {REVIEW_BEST_PRACTICES.map((bp, idx) => (
          <div key={idx} className="rounded-lg overflow-hidden" style={{ border: '1px solid #2a2d3e' }}>
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-left"
              style={{ background: '#111827' }}
              onClick={() => setExpandedPractice(expandedPractice === idx ? null : idx)}
              data-testid={`practice-${idx}`}
            >
              <span className="text-sm font-medium text-white">{bp.title}</span>
              <ChevronDown className="h-4 w-4 transition-transform duration-300" style={{ color: '#d4a017', transform: expandedPractice === idx ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>
            <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: expandedPractice === idx ? '200px' : '0px' }}>
              <div className="px-4 py-3 border-l-[3px]" style={{ borderLeftColor: '#d4a017', background: 'rgba(184,134,11,0.04)' }}>
                <p className="text-sm" style={{ color: '#9ca3af' }}>{bp.body}</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
    </>
  );
}

const CRISIS_TYPES = [
  { id: "kitchen_backed_up", label: "Kitchen backed up / ticket times blown", icon: Clock },
  { id: "guests_angry", label: "Guests angry / multiple complaints", icon: MessageSquare },
  { id: "staff_conflict", label: "Staff conflict or panic", icon: Users },
  { id: "walkout", label: "Walkout or call-off mid-shift", icon: AlertTriangle },
  { id: "system_failure", label: "POS / system failure", icon: AlertTriangle },
  { id: "owner_overwhelmed", label: "Owner or manager overwhelmed", icon: AlertTriangle },
  { id: "health_inspector", label: "Health inspector / surprise visit", icon: AlertTriangle },
  { id: "food_safety", label: "Food safety / contamination issue", icon: AlertTriangle },
];

const IMMEDIATE_ACTIONS: Record<string, { step1: string; step2: string; step3: string }> = {
  kitchen_backed_up: {
    step1: "Call all-hands to the line \u2014 every available person",
    step2: "86 any items over 15-minute ticket time",
    step3: "Communicate wait times to FOH immediately",
  },
  walkout: {
    step1: "Lock down the floor \u2014 assess who's still here",
    step2: "Consolidate sections and simplify the menu",
    step3: "Call in any available off-duty staff",
  },
  health_inspector: {
    step1: "Assign one person to accompany the inspector",
    step2: "Quick-sweep visible violations: temps, dates, handwashing",
    step3: "Pull recent cleaning logs and temp records",
  },
  system_failure: {
    step1: "Assess safety risk \u2014 shut down if needed",
    step2: "Identify workarounds for service continuation",
    step3: "Call emergency repair service",
  },
  guests_angry: {
    step1: "Manager to the table immediately",
    step2: "Listen fully \u2014 don't interrupt or defend",
    step3: "Offer a specific resolution, not just an apology",
  },
  food_safety: {
    step1: "Stop serving the affected item immediately",
    step2: "Isolate and label the product \u2014 do not discard yet",
    step3: "Document everything: times, temps, batch numbers",
  },
  staff_conflict: {
    step1: "Separate the individuals immediately",
    step2: "Pull each aside privately \u2014 get both sides",
    step3: "Reassign positions to keep service running",
  },
  owner_overwhelmed: {
    step1: "Stop \u2014 take one deep breath, then prioritize",
    step2: "Delegate the three biggest fires to your strongest people",
    step3: "Focus only on the one thing that will collapse without you",
  },
};

const SEVERITY_LEVELS = [
  { id: "mild", label: "Manageable", description: "We can handle this, need guidance", color: "bg-yellow-500" },
  { id: "moderate", label: "Serious", description: "Things are getting out of control", color: "bg-orange-500" },
  { id: "critical", label: "Critical", description: "Full emergency, need help NOW", color: "bg-red-600" },
];

interface CrisisMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

const CRISIS_SYSTEM_PROMPT = `You are an elite restaurant crisis response AI operating in REAL-TIME COMMAND MODE. You are calm, direct, and immediately actionable. You speak like a seasoned restaurant GM who has seen everything.

CRITICAL RULES:
1. Keep responses SHORT and ACTIONABLE - max 3-4 sentences per response unless you need to give a protocol
2. ASK FOLLOW-UP QUESTIONS to understand the situation better
3. CHECK IN on progress - "Did that work?" "What's happening now?" "Has the situation changed?"
4. ADAPT your guidance based on their updates
5. Be calm but urgent - this is a real crisis happening NOW
6. Never lecture or over-explain - they don't have time
7. Provide EXACT scripts they can use word-for-word with guests and staff
8. If things escalate, escalate your response. If things calm down, shift to recovery mode.

YOUR PERSONALITY:
- Confident and decisive - "Here's what you do right now..."
- Supportive but not soft - "You've got this. Focus."
- Practical - scripts, numbers, specific actions
- Aware this is happening in real-time - "How are things looking now?" "Update me when you've done that."

RESPONSE FORMAT:
- Start with the most critical action first
- Use bullet points for multiple steps
- End with a check-in question when appropriate
- If they report improvement, acknowledge and shift to recovery/prevention

Remember: They are IN THE CRISIS RIGHT NOW. Every word must earn its place.`;

function CrisisResponseEngine() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<CrisisMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState<"start" | "severity" | "chat">("start");
  const [selectedCrisis, setSelectedCrisis] = useState<string | null>(null);
  const [severity, setSeverity] = useState<string | null>(null);
  const [crisisStartTime, setCrisisStartTime] = useState<Date | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startCrisis = (crisisId: string) => {
    setSelectedCrisis(crisisId);
    setMode("severity");
  };

  const selectSeverity = async (severityId: string) => {
    setSeverity(severityId);
    setMode("chat");
    setCrisisStartTime(new Date());
    
    const crisis = CRISIS_TYPES.find(c => c.id === selectedCrisis);
    const sev = SEVERITY_LEVELS.find(s => s.id === severityId);
    
    const initialMessage = `${crisis?.label || selectedCrisis} - ${sev?.label} severity`;
    
    const userMessage: CrisisMessage = {
      id: Date.now().toString(),
      role: "user",
      content: initialMessage,
      timestamp: new Date(),
    };
    
    setMessages([userMessage]);
    await sendToAI(initialMessage, [userMessage], severityId);
  };

  const sendToAI = async (userInput: string, allMessages: CrisisMessage[], currentSeverity?: string) => {
    setIsGenerating(true);
    
    const crisis = CRISIS_TYPES.find(c => c.id === selectedCrisis);
    const sev = SEVERITY_LEVELS.find(s => s.id === (currentSeverity || severity));
    
    const contextPrompt = `
CURRENT CRISIS: ${crisis?.label || selectedCrisis}
SEVERITY: ${sev?.label || severity} - ${sev?.description || ""}
${crisisStartTime ? `TIME IN CRISIS: ${Math.round((Date.now() - crisisStartTime.getTime()) / 60000)} minutes` : ""}

CONVERSATION HISTORY:
${allMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}

USER'S LATEST UPDATE: ${userInput}

Respond as the crisis command AI. Be direct, short, and actionable. Ask follow-up questions to understand and help.`;

    try {
      const res = await fetch("/api/consultant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          question: contextPrompt,
          systemPrompt: CRISIS_SYSTEM_PROMPT,
        }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to get response");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      const assistantMessage: CrisisMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

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
                setMessages(prev => 
                  prev.map(m => m.id === assistantMessage.id ? { ...m, content } : m)
                );
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      toast({ title: "Failed to get response", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isGenerating) return;

    const userMessage: CrisisMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue("");
    
    await sendToAI(userMessage.content, updatedMessages);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const resetCrisis = () => {
    setMode("start");
    setSelectedCrisis(null);
    setSeverity(null);
    setMessages([]);
    setCrisisStartTime(null);
    setInputValue("");
  };

  const getElapsedTime = () => {
    if (!crisisStartTime) return "";
    const minutes = Math.round((Date.now() - crisisStartTime.getTime()) / 60000);
    return `${minutes}m`;
  };

  return (
    <Card className="mb-8 border-destructive/30">
      <CardHeader className="bg-red-500/10">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-destructive text-lg">
              <Shield className="h-6 w-6" />
              Crisis Command Center
              {mode === "chat" && crisisStartTime && (
                <Badge variant="outline" className="ml-2 text-destructive border-destructive/50">
                  <Clock className="h-3 w-3 mr-1" />
                  {getElapsedTime()} active
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              {mode === "start" && "Select what's happening. Get immediate action steps."}
              {mode === "severity" && "How serious is the situation right now?"}
              {mode === "chat" && "I'm here with you. Update me as things change."}
            </CardDescription>
          </div>
          {mode === "chat" && (
            <Button variant="outline" size="sm" onClick={resetCrisis} data-testid="btn-end-crisis">
              <X className="h-4 w-4 mr-2" />
              End Session
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {mode === "start" && (
          <div className="space-y-4">
            <Label className="text-lg font-bold text-destructive">What's happening?</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CRISIS_TYPES.map((crisis) => (
                <Button
                  key={crisis.id}
                  variant="outline"
                  onClick={() => startCrisis(crisis.id)}
                  className="flex items-center justify-start gap-3 h-auto py-4 text-left"
                  data-testid={`crisis-start-${crisis.id}`}
                >
                  <crisis.icon className="h-5 w-5 text-destructive flex-shrink-0" />
                  <span className="text-sm">{crisis.label}</span>
                </Button>
              ))}
            </div>
            <div className="pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedCrisis("custom");
                  setMode("severity");
                }}
                className="w-full text-muted-foreground"
                data-testid="crisis-start-other"
              >
                Something else not listed above
              </Button>
            </div>
          </div>
        )}

        {mode === "severity" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="sm" onClick={() => setMode("start")} data-testid="btn-crisis-back">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {CRISIS_TYPES.find(c => c.id === selectedCrisis)?.label || "Custom crisis"}
              </span>
            </div>
            <Label className="text-base font-semibold">How serious is it right now?</Label>
            <div className="grid gap-3">
              {SEVERITY_LEVELS.map((sev) => (
                <Button
                  key={sev.id}
                  variant="outline"
                  onClick={() => selectSeverity(sev.id)}
                  className="flex items-center justify-start gap-4 h-auto py-4 text-left"
                  data-testid={`severity-${sev.id}`}
                >
                  <div className={`w-3 h-3 rounded-full ${sev.color} flex-shrink-0`} />
                  <div>
                    <div className="font-medium">{sev.label}</div>
                    <div className="text-sm text-muted-foreground">{sev.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {mode === "chat" && (
          <div className="space-y-4">
            {selectedCrisis && IMMEDIATE_ACTIONS[selectedCrisis] && (
              <div className="p-4 border-2 border-red-500/30 bg-red-500/5 rounded-lg" data-testid="first-60-seconds">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <span className="font-bold text-red-700 dark:text-red-400">First 60 Seconds</span>
                </div>
                <ol className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-red-600 dark:text-red-400 shrink-0">1.</span>
                    <span className="text-sm">{IMMEDIATE_ACTIONS[selectedCrisis].step1}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-red-600 dark:text-red-400 shrink-0">2.</span>
                    <span className="text-sm">{IMMEDIATE_ACTIONS[selectedCrisis].step2}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-red-600 dark:text-red-400 shrink-0">3.</span>
                    <span className="text-sm">{IMMEDIATE_ACTIONS[selectedCrisis].step3}</span>
                  </li>
                </ol>
              </div>
            )}
            <div className="h-[400px] overflow-y-auto border rounded-lg p-4 bg-accent/20">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-4 ${message.role === "user" ? "text-right" : "text-left"}`}
                >
                  <div
                    className={`inline-block max-w-[85%] p-3 rounded-lg ${
                      message.role === "user"
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-card border"
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    <div className={`text-xs mt-1 ${
                      message.role === "user" ? "text-destructive-foreground/70" : "text-muted-foreground"
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              {isGenerating && messages[messages.length - 1]?.role === "user" && (
                <div className="text-left mb-4">
                  <div className="inline-block p-3 rounded-lg bg-card border">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex gap-2">
              <Textarea
                placeholder="Update me... What's happening now? Did that work?"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[60px] resize-none"
                disabled={isGenerating}
                data-testid="crisis-chat-input"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isGenerating}
                variant="destructive"
                size="icon"
                data-testid="crisis-chat-send"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setInputValue("Things are getting worse");
                }}
                disabled={isGenerating}
                className="text-xs"
                data-testid="quick-escalate"
              >
                Things are getting worse
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setInputValue("It's starting to calm down");
                }}
                disabled={isGenerating}
                className="text-xs"
                data-testid="quick-improving"
              >
                It's starting to calm down
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setInputValue("I did what you said. Now what?");
                }}
                disabled={isGenerating}
                className="text-xs"
                data-testid="quick-next"
              >
                Did it. Now what?
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setInputValue("Give me a script for what to say to guests");
                }}
                disabled={isGenerating}
                className="text-xs"
                data-testid="quick-script"
              >
                Need a guest script
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SOPCaptureEngine() {
  const { toast } = useToast();
  const [mode, setMode] = useState<"capture" | "checklist" | "audit">("capture");
  const [workflowDescription, setWorkflowDescription] = useState<string>("");
  const [taskName, setTaskName] = useState<string>("");
  const [roleOwner, setRoleOwner] = useState<string>("");
  const [trigger, setTrigger] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showExampleSOP, setShowExampleSOP] = useState(false);

  const generateSOP = async () => {
    if (!workflowDescription.trim()) {
      toast({ title: "Please describe the workflow first", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setResult("");

    try {
      let prompt = "";
      
      if (mode === "capture") {
        prompt = `You are an expert restaurant operations consultant specializing in SOP documentation.

Convert the following workflow description into a structured, professional SOP document.

TASK/PROCEDURE NAME: ${taskName || "Not specified"}
ROLE OWNER: ${roleOwner || "To be assigned"}
TRIGGER: ${trigger || "As needed"}

WORKFLOW DESCRIPTION:
${workflowDescription}

Generate a complete SOP in this EXACT format:

═══════════════════════════════════════════
SOP: ${taskName || "[Task Name]"}
═══════════════════════════════════════════

PURPOSE:
[One clear sentence explaining why this procedure exists]

OWNER:
${roleOwner || "[Role - not person name]"}

TRIGGER:
${trigger || "[When this procedure is initiated]"}

CHECKLIST:
□ Step 1: [Action verb] [specific action]
□ Step 2: [Action verb] [specific action]
□ Step 3: [Action verb] [specific action]
[Continue with all steps - max 15 items]

VERIFICATION:
[How a manager confirms this was done correctly]

FAILURE PROTOCOL:
[What to do if steps cannot be completed or issues arise]

NOTES:
• [Any important reminders or common mistakes]
• [Equipment or supplies needed]
• [Time estimates if applicable]

═══════════════════════════════════════════

Make it practical, actionable, and ready to post at the workstation. Use clear action verbs. No fluff.`;
      } else if (mode === "checklist") {
        prompt = `You are an expert restaurant operations consultant.

Convert this workflow description into a CLEAN, PRINTABLE CHECKLIST ONLY.

TASK: ${taskName || "Daily Task"}
WORKFLOW DESCRIPTION:
${workflowDescription}

Generate a checklist following these rules:
- Maximum 15 items
- Actionable verbs only ("Verify," "Stock," "Confirm," "Check," "Clean," "Count")
- Checkboxes only - no explanations
- Ready to be posted at point of use
- Include space for initials and time

FORMAT:

═══════════════════════════════════════════
${taskName || "CHECKLIST"}
Date: _______ Shift: _______ Manager: _______
═══════════════════════════════════════════

□ _________________________ Initials: ___ Time: ___
□ _________________________ Initials: ___ Time: ___
[Fill in all steps from the workflow]

═══════════════════════════════════════════
VERIFIED BY: _____________ TIME: ___________
═══════════════════════════════════════════

Make it clean enough to print and post.`;
      } else {
        prompt = `You are an expert restaurant operations consultant.

Audit this workflow description against the "Second Location Test" standards.

WORKFLOW DESCRIPTION:
${workflowDescription}

Evaluate against these criteria:

THE SECOND LOCATION TEST:
□ Could a new manager run this without calling the owner?
□ Could a new hire execute this using only what's written?
□ Does this rely on one person's memory or judgment?
□ Would this work tomorrow in a different building?
□ Is this documented — or just "how we do it"?

Generate an audit report:

═══════════════════════════════════════════
SOP SCALABILITY AUDIT
═══════════════════════════════════════════

OVERALL RATING: [READY / NEEDS WORK / NOT SCALABLE]

SECOND LOCATION TEST RESULTS:

1. New manager independence: [PASS/FAIL]
   • [Explanation]

2. New hire execution: [PASS/FAIL]
   • [Explanation]

3. Memory dependency: [PASS/FAIL]
   • [Explanation]

4. Location portability: [PASS/FAIL]
   • [Explanation]

5. Proper documentation: [PASS/FAIL]
   • [Explanation]

GAPS IDENTIFIED:
• [List specific missing elements]
• [List ambiguous instructions]
• [List person-dependent steps]

RECOMMENDATIONS TO FIX:
1. [Specific action to improve]
2. [Specific action to improve]
3. [Specific action to improve]

VERDICT:
[Is this a system or a dependency? One clear statement]

═══════════════════════════════════════════

Be honest. If it's not scalable, say so. Dependencies don't scale.`;
      }

      const res = await fetch("/api/consultant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to generate SOP");

      const reader = res.body?.getReader();
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
                setResult(content);
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      toast({ title: "Failed to generate SOP", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    toast({ title: "Copied to clipboard!" });
  };

  const printChecklist = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      const title = taskName || (mode === "capture" ? "SOP Document" : mode === "checklist" ? "Checklist" : "Audit Report");
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <style>
              body {
                font-family: 'Courier New', Courier, monospace;
                padding: 40px;
                max-width: 800px;
                margin: 0 auto;
                line-height: 1.6;
              }
              pre {
                white-space: pre-wrap;
                word-wrap: break-word;
                font-size: 12px;
              }
              @media print {
                body { padding: 20px; }
              }
            </style>
          </head>
          <body>
            <pre>${result}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Smart SOP Capture
        </CardTitle>
        <CardDescription>
          Describe how a task is actually performed. It gets converted into standardized, transferable documentation.
          No theory. No guessing. Capture reality.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="capture" data-testid="tab-sop-capture">Capture SOP</TabsTrigger>
            <TabsTrigger value="checklist" data-testid="tab-sop-checklist">Quick Checklist</TabsTrigger>
            <TabsTrigger value="audit" data-testid="tab-sop-audit">Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="capture" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Describe how your best performer does this task. It will be converted into a structured SOP.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="taskName">Task/Procedure Name</Label>
                <Input
                  id="taskName"
                  placeholder="e.g., Opening Cash Drawer"
                  className="mt-1"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  data-testid="input-task-name"
                />
              </div>
              <div>
                <Label htmlFor="roleOwner">Role Owner</Label>
                <Input
                  id="roleOwner"
                  placeholder="e.g., Shift Lead"
                  className="mt-1"
                  value={roleOwner}
                  onChange={(e) => setRoleOwner(e.target.value)}
                  data-testid="input-role-owner"
                />
              </div>
              <div>
                <Label htmlFor="trigger">Trigger (When?)</Label>
                <Input
                  id="trigger"
                  placeholder="e.g., Start of every shift"
                  className="mt-1"
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                  data-testid="input-trigger"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="checklist" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Get a clean, printable checklist ready to post at the workstation.
            </p>
            <div>
              <Label htmlFor="checklistTaskName">Checklist Name</Label>
              <Input
                id="checklistTaskName"
                placeholder="e.g., Closing Checklist, Pre-Service Checklist"
                className="mt-1"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                data-testid="input-checklist-task-name"
              />
            </div>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Test your workflow against the "Second Location Test." Would this survive turnover and expansion?
            </p>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium">SOP Freshness Check</span>
              </div>
              <p className="text-xs text-muted-foreground">
                SOPs should be reviewed at least every 90 days. Run an audit on each SOP periodically to make sure
                your documentation reflects how things are actually done — not how they were done 6 months ago.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div>
          <Label htmlFor="workflowDescription">
            {mode === "capture" ? "Describe the Workflow" : mode === "checklist" ? "List the Steps" : "Paste Your Current SOP or Describe the Process"}
          </Label>
          <Textarea
            id="workflowDescription"
            placeholder={mode === "capture" 
              ? "e.g., First thing in the morning, the shift lead goes to the office and gets the cash drawer from the safe. They count it twice to verify the starting amount matches the log. Then they take it to the register, open the drawer, and do a test transaction to make sure the system is working..."
              : mode === "checklist"
              ? "e.g., Count starting cash, verify safe log, transport to register, test POS system, verify receipt printer, stock register tape..."
              : "Paste your existing SOP or describe how the process currently works. It will be audited for scalability..."
            }
            className="mt-1 min-h-[150px]"
            value={workflowDescription}
            onChange={(e) => setWorkflowDescription(e.target.value)}
            data-testid="textarea-workflow-description"
          />
        </div>

        <Button 
          onClick={generateSOP} 
          disabled={isGenerating || !workflowDescription.trim()}
          className="w-full"
          data-testid="btn-generate-sop"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {mode === "capture" ? "Generating SOP..." : mode === "checklist" ? "Creating Checklist..." : "Auditing..."}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              {mode === "capture" ? "Generate SOP" : mode === "checklist" ? "Generate Checklist" : "Run Scalability Audit"}
            </>
          )}
        </Button>

        {mode === "capture" && (
          <div className="border-t pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExampleSOP(!showExampleSOP)}
              className="text-xs text-muted-foreground"
              data-testid="btn-toggle-example-sop"
            >
              {showExampleSOP ? "Hide example output" : "See example output →"}
            </Button>
            {showExampleSOP && (
              <div className="mt-3 p-4 bg-muted/50 rounded-lg text-sm space-y-3">
                <div>
                  <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Example: Opening Cash Drawer</p>
                </div>
                <div>
                  <p className="font-medium">Purpose</p>
                  <p className="text-muted-foreground text-xs">Standardize the opening cash count process to ensure accuracy and prevent discrepancies across shifts.</p>
                </div>
                <div>
                  <p className="font-medium">Role Owner</p>
                  <p className="text-muted-foreground text-xs">Opening Manager / Shift Lead</p>
                </div>
                <div>
                  <p className="font-medium">Trigger</p>
                  <p className="text-muted-foreground text-xs">Before the first transaction of each business day.</p>
                </div>
                <div>
                  <p className="font-medium">Steps</p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Retrieve the cash drawer from the safe using the opening key</li>
                    <li>Count all denominations and record on the Opening Count Sheet</li>
                    <li>Compare to the expected starting bank amount ($200.00)</li>
                    <li>Note any discrepancies and report to GM immediately</li>
                    <li>Sign the count sheet and place in the manager's box</li>
                    <li>Load the drawer into the POS terminal</li>
                  </ol>
                </div>
                <div>
                  <p className="font-medium">Verification / Sign-off</p>
                  <p className="text-muted-foreground text-xs">Opening count must match expected bank. Any variance over $1.00 requires GM notification before service begins.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label>Generated {mode === "capture" ? "SOP" : mode === "checklist" ? "Checklist" : "Audit Report"}</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={printChecklist} data-testid="btn-print-sop">
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={copyToClipboard} data-testid="btn-copy-sop">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>
            <div className="p-4 bg-accent/50 rounded-lg whitespace-pre-wrap text-sm font-mono">
              {result}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FacilityCommandCenter() {
  const { toast } = useToast();
  const [mode, setMode] = useState<"breakdown" | "pm" | "log" | "vendors" | "dashboard">("breakdown");
  const [inActiveService, setInActiveService] = useState<string>("no");
  const [safetyRisk, setSafetyRisk] = useState<string>("no");
  const [equipmentType, setEquipmentType] = useState<string>("");
  const [issueGoal, setIssueGoal] = useState<string>("");
  const [equipmentName, setEquipmentName] = useState<string>("");
  const [lastServiceDate, setLastServiceDate] = useState<string>("");
  const [symptoms, setSymptoms] = useState<string>("");
  const [failSilentMonitors, setFailSilentMonitors] = useState<string[]>([]);
  const [response, setResponse] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Vendor state
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [vendorSearch, setVendorSearch] = useState<string>("");
  
  // Issue logging state
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");

  // Fetch vendors
  const { data: vendors = [], refetch: refetchVendors } = useQuery<any[]>({
    queryKey: ["/api/vendors"],
    enabled: mode === "vendors" || mode === "breakdown" || mode === "dashboard",
  });

  // Fetch facility issues
  const { data: issues = [], refetch: refetchIssues } = useQuery<any[]>({
    queryKey: ["/api/facility-issues"],
    enabled: mode === "dashboard",
  });

  // Fetch issue stats
  const { data: issueStats } = useQuery<{ open: number; inProgress: number; resolved: number; avgResolutionDays: number }>({
    queryKey: ["/api/facility-issues/stats"],
    enabled: mode === "dashboard",
  });

  // Create vendor mutation
  const createVendorMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/vendors", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setShowVendorForm(false);
      setEditingVendor(null);
      toast({ title: "Vendor added successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to add vendor", variant: "destructive" });
    },
  });

  // Update vendor mutation
  const updateVendorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest("PUT", `/api/vendors/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setShowVendorForm(false);
      setEditingVendor(null);
      toast({ title: "Vendor updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update vendor", variant: "destructive" });
    },
  });

  // Delete vendor mutation
  const deleteVendorMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/vendors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Vendor deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete vendor", variant: "destructive" });
    },
  });

  // Toggle vendor favorite
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("PATCH", `/api/vendors/${id}/favorite`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
    },
  });

  // Create facility issue mutation  
  const createIssueMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/facility-issues", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facility-issues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/facility-issues/stats"] });
      setShowIssueForm(false);
      toast({ title: "Issue logged successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to log issue", variant: "destructive" });
    },
  });

  // Update issue status mutation
  const updateIssueMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest("PUT", `/api/facility-issues/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facility-issues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/facility-issues/stats"] });
      toast({ title: "Issue updated" });
    },
  });

  // Resolve issue mutation
  const resolveIssueMutation = useMutation({
    mutationFn: async ({ id, repairNotes, repairCost }: { id: number; repairNotes?: string; repairCost?: string }) => {
      return await apiRequest("PATCH", `/api/facility-issues/${id}/resolve`, { repairNotes, repairCost });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facility-issues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/facility-issues/stats"] });
      toast({ title: "Issue resolved!" });
    },
  });

  // Filter vendors
  const filteredVendors = vendors.filter(v => {
    const matchesFilter = vendorFilter === "all" || v.specialty === vendorFilter || (vendorFilter === "favorite" && v.isFavorite);
    const matchesSearch = !vendorSearch || v.name.toLowerCase().includes(vendorSearch.toLowerCase()) || v.notes?.toLowerCase().includes(vendorSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Get suggested vendors based on equipment type
  const getSuggestedVendors = () => {
    if (!equipmentType) return [];
    const specialtyMap: Record<string, string> = {
      refrigeration: "refrigeration",
      cooking: "cooking",
      dish: "dish",
      hvac: "hvac",
      plumbing: "plumbing",
      electrical: "electrical",
      pos: "pos",
    };
    const specialty = specialtyMap[equipmentType] || "general";
    return vendors.filter(v => v.specialty === specialty || v.specialty === "general").slice(0, 3);
  };

  const equipmentTypes = [
    { value: "refrigeration", label: "Refrigeration / Ice" },
    { value: "cooking", label: "Cooking Equipment" },
    { value: "dish", label: "Dish Machine" },
    { value: "hvac", label: "HVAC" },
    { value: "plumbing", label: "Plumbing" },
    { value: "electrical", label: "Electrical" },
    { value: "pos", label: "POS & Network" },
    { value: "other", label: "Other" },
  ];

  const failSilentOptions = [
    { value: "temps", label: "Temps (walk-in, reach-in)" },
    { value: "ice-sanitation", label: "Ice machine sanitation interval" },
    { value: "hood-ansul", label: "Hood/ANSUL checks" },
    { value: "hvac-filters", label: "HVAC filter cadence" },
    { value: "dish-sanitizer", label: "Dish machine sanitizer ppm/temp log" },
  ];

  const toggleFailSilent = (value: string) => {
    setFailSilentMonitors(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const QUICK_TROUBLESHOOT: Record<string, string[]> = {
    refrigeration: ["Check door seal for gaps", "Clean condenser coils", "Verify evaporator fan is running", "Check defrost timer", "Ensure proper airflow (not overpacked)"],
    cooking: ["Check pilot light / igniter", "Verify gas supply valve is open", "Calibrate thermostat with oven thermometer", "Check thermocouple connection", "Clean burner tubes"],
    dish: ["Check water supply valves", "Clean spray arms and filters", "Verify chemical levels", "Inspect fill valve and drain"],
    hvac: ["Check thermostat batteries and settings", "Replace air filter", "Verify breaker hasn't tripped", "Check if vents are blocked"],
    plumbing: ["Check shut-off valves", "Inspect for visible leaks", "Verify hot water heater is functioning", "Check grease trap levels"],
    electrical: ["Check breaker panel for tripped breakers", "Verify outlets with a tester", "Look for burn marks or unusual smells", "Check GFCI reset buttons"],
    pos: ["Power cycle the terminal", "Check network/ethernet cables", "Verify payment processor connection", "Restart the router"],
    other: ["Document the issue clearly with photos", "Check if issue is isolated or affects multiple areas", "Note when problem first appeared"],
  };

  const quickTips = QUICK_TROUBLESHOOT[equipmentType] || [];

  const getBreakdownPriority = () => {
    const isDuringService = inActiveService === "yes";
    const isSafetyRisk = safetyRisk === "yes";
    if (isDuringService && isSafetyRisk) return { level: "CRITICAL", text: "Act now — safety risk during active service", color: "text-red-700 dark:text-red-400 bg-red-500/10 border-red-500/30" };
    if (isDuringService && !isSafetyRisk) return { level: "HIGH", text: "Workaround needed — service is active", color: "text-orange-700 dark:text-orange-400 bg-orange-500/10 border-orange-500/30" };
    if (!isDuringService && isSafetyRisk) return { level: "HIGH", text: "Fix before opening — safety risk", color: "text-orange-700 dark:text-orange-400 bg-orange-500/10 border-orange-500/30" };
    return { level: "STANDARD", text: "Schedule repair — no immediate risk", color: "text-primary bg-primary/10 border-primary/30" };
  };

  const generateResponse = async () => {
    if (mode === "breakdown" && !issueGoal) {
      toast({ title: "Please describe the issue", variant: "destructive" });
      return;
    }
    if (mode === "pm" && !equipmentType) {
      toast({ title: "Please select equipment type", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setResponse("");

    try {
      const equipmentLabel = equipmentTypes.find(e => e.value === equipmentType)?.label || equipmentType;
      const failSilentLabels = failSilentMonitors.map(f => 
        failSilentOptions.find(o => o.value === f)?.label || f
      ).join(", ");

      let prompt = "";
      
      const breakdownPriority = getBreakdownPriority();

      if (mode === "breakdown") {
        prompt = `You are "Facility Command Center," an AI maintenance operations assistant for a live restaurant.
Your job is to prevent downtime, control repair costs, and keep the restaurant service-ready.

SITUATION:
- Equipment/Problem: ${issueGoal}
- Equipment Type: ${equipmentLabel || "Not specified"}
- Priority: ${breakdownPriority.level} (${breakdownPriority.text})
- Service Status: ${inActiveService === "yes" ? "Active — restaurant is currently serving" : "Not in service"}
- Safety Risk: ${safetyRisk === "yes" ? "YES - PRIORITIZE SAFETY" : "No"}
${equipmentName ? `- Equipment name/model: ${equipmentName}` : ""}
${lastServiceDate ? `- Last service date: ${lastServiceDate}` : ""}
${symptoms ? `- Symptoms: ${symptoms}` : ""}
${quickTips.length > 0 ? `- Quick troubleshooting tips were shown to the operator: ${quickTips.join("; ")}` : ""}

Follow this order: Recognize → Contain → Triage → Decide → Document.

Provide response in this EXACT format:

A) SITUATION SUMMARY (1-2 lines)

B) PRIORITY LEVEL
Tier 1 (service-critical) / Tier 2 (service-impacting) / Tier 3 (non-critical)
Service Impact: [describe]

C) IMMEDIATE ACTIONS (numbered list, max 7 items)
${inActiveService === "yes" ? "PRIORITIZE containment and service continuity" : ""}

D) VENDOR / REPAIR SCRIPT
- Who to call
- What to say
- Authorization limit language
- Questions to ask

E) LOG ENTRY
Date: [today]
Issue: 
Action Taken:
Next Step:
Owner:

IMPORTANT: Never recommend unsafe workarounds for gas, electrical, refrigeration, or fire suppression.`;
      } else if (mode === "pm") {
        prompt = `You are "Facility Command Center," an AI maintenance operations assistant for a live restaurant.
Build a comprehensive preventative maintenance plan.

EQUIPMENT FOCUS: ${equipmentLabel}
${equipmentName ? `Equipment name/model: ${equipmentName}` : ""}
${lastServiceDate ? `Last service date: ${lastServiceDate}` : ""}
${failSilentMonitors.length > 0 ? `Fail-Silent Monitors requested: ${failSilentLabels}` : ""}

Provide response in this EXACT format:

A) EQUIPMENT TIER CLASSIFICATION
Classify into Tier 1 (service-critical), Tier 2 (service-impacting), Tier 3 (non-critical)

B) PREVENTATIVE MAINTENANCE SCHEDULE

DAILY (opening/closing):
- [max 5 items with specific action verbs]

WEEKLY:
- [max 5 items with day to perform]

MONTHLY:
- [max 5 items with week of month]

QUARTERLY:
- [max 3 items with professional service needs]

C) POSTED CHECKLIST (max 15 items)
Format each as: ☐ [Action verb] [specific task] - [time/initials required]

D) MANAGER VERIFICATION ROUTINE
- Who checks
- When they check
- What "pass" means

${failSilentMonitors.length > 0 ? `E) FAIL-SILENT MONITORING LOG
For each monitored item (${failSilentLabels}):
- Acceptable range
- Check frequency
- Escalation threshold ("if X, then Y")
- Log format` : ""}`;
      } else {
        prompt = `You are "Facility Command Center," an AI maintenance operations assistant for a live restaurant.
Create an equipment log entry and maintenance history template.

EQUIPMENT: ${equipmentName || equipmentLabel || "General Equipment"}
Type: ${equipmentLabel}
${lastServiceDate ? `Last service date: ${lastServiceDate}` : ""}
${symptoms ? `Current issues/symptoms: ${symptoms}` : ""}
${issueGoal ? `Notes: ${issueGoal}` : ""}

Provide response in this EXACT format:

A) EQUIPMENT LOG ENTRY

Equipment ID: [suggest format]
Name/Model: ${equipmentName || "[To be filled]"}
Location: [To be filled]
Category: ${equipmentLabel}
Tier: [1/2/3 with justification]
Install Date: [To be filled]
Warranty Expires: [To be filled]
Service Contract: [Yes/No, vendor name]

B) MAINTENANCE HISTORY TEMPLATE
| Date | Issue | Action | Cost | Technician | Next Due |
|------|-------|--------|------|------------|----------|
| | | | | | |

C) RECURRING FAILURE TRACKING
- Common failure modes for this equipment type
- Warning signs to watch for
- Preventive measures

D) VENDOR CONTACTS TEMPLATE
Primary Vendor:
- Company:
- Phone:
- Account #:
- Typical response time:
- Authorization limit:

Emergency After-Hours:
- Contact:
- Phone:`;
      }

      const res = await fetch("/api/consultant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to generate response");

      const reader = res.body?.getReader();
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
                setResponse(content);
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      toast({ title: "Failed to generate response", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(response);
    toast({ title: "Copied to clipboard!" });
  };

  const clearForm = () => {
    setIssueGoal("");
    setEquipmentName("");
    setLastServiceDate("");
    setSymptoms("");
    setResponse("");
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          Facility Command Center
        </CardTitle>
        <CardDescription>
          Prevent downtime. Track repairs. Enforce PM schedules.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={mode} onValueChange={(v) => { setMode(v as "breakdown" | "pm" | "log" | "vendors" | "dashboard"); clearForm(); }}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="breakdown" data-testid="tab-breakdown" className="text-xs sm:text-sm">
              <AlertTriangle className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Breakdown</span>
              <span className="sm:hidden">Issue</span>
            </TabsTrigger>
            <TabsTrigger value="pm" data-testid="tab-pm" className="text-xs sm:text-sm">
              <Calendar className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">PM Schedule</span>
              <span className="sm:hidden">PM</span>
            </TabsTrigger>
            <TabsTrigger value="log" data-testid="tab-log" className="text-xs sm:text-sm">
              <FileOutput className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Equipment</span>
              <span className="sm:hidden">Log</span>
            </TabsTrigger>
            <TabsTrigger value="vendors" data-testid="tab-vendors" className="text-xs sm:text-sm">
              <Users className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Vendors</span>
              <span className="sm:hidden">Vendors</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" data-testid="tab-dashboard" className="text-xs sm:text-sm">
              <LayoutDashboard className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Dash</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="breakdown" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">During Active Service?</Label>
                <Button
                  variant={inActiveService === "yes" ? "default" : "outline"}
                  size="sm"
                  className={`w-full mt-1 ${inActiveService === "yes" ? "bg-red-600 text-white" : ""}`}
                  onClick={() => setInActiveService(inActiveService === "yes" ? "no" : "yes")}
                  data-testid="btn-during-service"
                >
                  {inActiveService === "yes" ? "Yes — In Service" : "No — Closed/Prep"}
                </Button>
              </div>
              <div>
                <Label className="text-xs">Safety Risk?</Label>
                <Button
                  variant={safetyRisk === "yes" ? "default" : "outline"}
                  size="sm"
                  className={`w-full mt-1 ${safetyRisk === "yes" ? "bg-red-600 text-white" : ""}`}
                  onClick={() => setSafetyRisk(safetyRisk === "yes" ? "no" : "yes")}
                  data-testid="btn-safety-risk"
                >
                  {safetyRisk === "yes" ? "Yes — Safety Risk" : "No Safety Risk"}
                </Button>
              </div>
            </div>
            {(inActiveService === "yes" || safetyRisk === "yes") && (() => {
              const priority = getBreakdownPriority();
              return (
                <div className={`p-3 border rounded-lg ${priority.color}`} data-testid="breakdown-priority">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span className="font-bold text-sm">{priority.level}</span>
                    <span className="text-sm">— {priority.text}</span>
                  </div>
                </div>
              );
            })()}

            <div>
              <Label htmlFor="equipmentType">Equipment Type</Label>
              <Select value={equipmentType} onValueChange={setEquipmentType}>
                <SelectTrigger id="equipmentType" className="mt-1" data-testid="select-equipment-type">
                  <SelectValue placeholder="Select equipment type..." />
                </SelectTrigger>
                <SelectContent>
                  {equipmentTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {quickTips.length > 0 && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-xs font-medium text-primary mb-2">Quick checks before calling for repair:</p>
                <ul className="space-y-1">
                  {quickTips.map((tip, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <Check className="h-3 w-3 shrink-0 mt-0.5 text-primary" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <Label htmlFor="issueGoal">Issue / Problem Description</Label>
              <Textarea
                id="issueGoal"
                placeholder="e.g., Walk-in cooler reading 45°F, ice machine not producing, fryer won't heat..."
                className="mt-1 min-h-[80px]"
                value={issueGoal}
                onChange={(e) => setIssueGoal(e.target.value)}
                data-testid="textarea-issue"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="equipmentName">Equipment Name/Model (optional)</Label>
                <Input
                  id="equipmentName"
                  placeholder="e.g., True T-49 Reach-in"
                  className="mt-1"
                  value={equipmentName}
                  onChange={(e) => setEquipmentName(e.target.value)}
                  data-testid="input-equipment-name"
                />
              </div>
              <div>
                <Label htmlFor="symptoms">Symptoms (optional)</Label>
                <Input
                  id="symptoms"
                  placeholder="e.g., temp high, leaking, error code E5"
                  className="mt-1"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  data-testid="input-symptoms"
                />
              </div>
            </div>

            {/* Suggested Vendors */}
            {equipmentType && (
              <div className="p-3 bg-accent/30 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Suggested Vendors for {equipmentTypes.find(t => t.value === equipmentType)?.label}</span>
                </div>
                {getSuggestedVendors().length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {getSuggestedVendors().map((vendor: any) => (
                      <div key={vendor.id} className="flex items-center gap-2 p-2 bg-background rounded border text-sm" data-testid={`suggested-vendor-${vendor.id}`}>
                        <span className="font-medium">{vendor.name}</span>
                        {vendor.phone && (
                          <a href={`tel:${vendor.phone}`} className="text-primary hover:underline flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {vendor.phone}
                          </a>
                        )}
                        {vendor.isEmergency && <Badge variant="destructive" className="text-xs">24/7</Badge>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No vendors for this equipment type yet. Add them in the <span className="font-medium">Vendors</span> tab for quick access during emergencies.
                  </p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pm" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="pmEquipmentType">Equipment Type</Label>
              <Select value={equipmentType} onValueChange={setEquipmentType}>
                <SelectTrigger id="pmEquipmentType" className="mt-1" data-testid="select-pm-equipment-type">
                  <SelectValue placeholder="Select equipment type..." />
                </SelectTrigger>
                <SelectContent>
                  {equipmentTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="pmEquipmentName">Specific Equipment (optional)</Label>
              <Input
                id="pmEquipmentName"
                placeholder="e.g., Walk-in cooler, All fryers, Ice machine"
                className="mt-1"
                value={equipmentName}
                onChange={(e) => setEquipmentName(e.target.value)}
                data-testid="input-pm-equipment-name"
              />
            </div>

            <div className="space-y-2">
              <Label>Fail-Silent Monitors (optional)</Label>
              <p className="text-sm text-muted-foreground">Select items to include monitoring logs and escalation thresholds</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {failSilentOptions.map(option => (
                  <Badge
                    key={option.value}
                    variant={failSilentMonitors.includes(option.value) ? "default" : "outline"}
                    className="cursor-pointer toggle-elevate"
                    onClick={() => toggleFailSilent(option.value)}
                    data-testid={`badge-fail-silent-${option.value}`}
                  >
                    {option.label}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="log" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="logEquipmentType">Equipment Type</Label>
              <Select value={equipmentType} onValueChange={setEquipmentType}>
                <SelectTrigger id="logEquipmentType" className="mt-1" data-testid="select-log-equipment-type">
                  <SelectValue placeholder="Select equipment type..." />
                </SelectTrigger>
                <SelectContent>
                  {equipmentTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="logEquipmentName">Equipment Name/Model</Label>
              <Input
                id="logEquipmentName"
                placeholder="e.g., Hoshizaki KM-320MAJ Ice Machine"
                className="mt-1"
                value={equipmentName}
                onChange={(e) => setEquipmentName(e.target.value)}
                data-testid="input-log-equipment-name"
              />
            </div>

            <div>
              <Label htmlFor="lastService">Last Service Date (optional)</Label>
              <Input
                id="lastService"
                type="date"
                className="mt-1"
                value={lastServiceDate}
                onChange={(e) => setLastServiceDate(e.target.value)}
                data-testid="input-last-service"
              />
            </div>

            <div>
              <Label htmlFor="logNotes">Notes / Current Issues (optional)</Label>
              <Textarea
                id="logNotes"
                placeholder="Any notes about this equipment, recurring issues, or maintenance history..."
                className="mt-1 min-h-[80px]"
                value={issueGoal}
                onChange={(e) => setIssueGoal(e.target.value)}
                data-testid="textarea-log-notes"
              />
            </div>
          </TabsContent>

          {/* Vendor Directory Tab */}
          <TabsContent value="vendors" className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row gap-2 justify-between">
              <div className="flex gap-2 flex-1">
                <Input
                  placeholder="Search vendors..."
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  className="max-w-xs"
                  data-testid="input-vendor-search"
                />
                <Select value={vendorFilter} onValueChange={setVendorFilter}>
                  <SelectTrigger className="w-40" data-testid="select-vendor-filter">
                    <SelectValue placeholder="Filter by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    <SelectItem value="favorite">Favorites</SelectItem>
                    <SelectItem value="refrigeration">Refrigeration</SelectItem>
                    <SelectItem value="hvac">HVAC</SelectItem>
                    <SelectItem value="plumbing">Plumbing</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="cooking">Cooking Equipment</SelectItem>
                    <SelectItem value="dish">Dish Machine</SelectItem>
                    <SelectItem value="pos">POS & Network</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => { setEditingVendor(null); setShowVendorForm(true); }} data-testid="btn-add-vendor">
                <Plus className="h-4 w-4 mr-2" />
                Add Vendor
              </Button>
            </div>

            {/* Vendor Form Dialog */}
            {showVendorForm && (
              <div className="p-4 border rounded-lg bg-accent/20 space-y-4">
                <h4 className="font-semibold">{editingVendor ? "Edit Vendor" : "Add New Vendor"}</h4>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const data = {
                    name: formData.get("name") as string,
                    specialty: formData.get("specialty") as string,
                    phone: formData.get("phone") as string,
                    email: formData.get("email") as string,
                    website: formData.get("website") as string,
                    notes: formData.get("notes") as string,
                    responseTime: formData.get("responseTime") as string,
                    callOutFee: formData.get("callOutFee") as string,
                    accountNumber: formData.get("accountNumber") as string,
                    rating: parseInt(formData.get("rating") as string) || 0,
                    isEmergency: formData.get("isEmergency") === "on",
                  };
                  if (editingVendor) {
                    updateVendorMutation.mutate({ id: editingVendor.id, data });
                  } else {
                    createVendorMutation.mutate(data);
                  }
                }} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Vendor Name *</Label>
                      <Input name="name" required defaultValue={editingVendor?.name || ""} data-testid="input-vendor-name" />
                    </div>
                    <div>
                      <Label>Specialty *</Label>
                      <Select name="specialty" defaultValue={editingVendor?.specialty || "general"}>
                        <SelectTrigger data-testid="select-vendor-specialty">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="refrigeration">Refrigeration</SelectItem>
                          <SelectItem value="hvac">HVAC</SelectItem>
                          <SelectItem value="plumbing">Plumbing</SelectItem>
                          <SelectItem value="electrical">Electrical</SelectItem>
                          <SelectItem value="cooking">Cooking Equipment</SelectItem>
                          <SelectItem value="dish">Dish Machine</SelectItem>
                          <SelectItem value="pos">POS & Network</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input name="phone" type="tel" defaultValue={editingVendor?.phone || ""} data-testid="input-vendor-phone" />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input name="email" type="email" defaultValue={editingVendor?.email || ""} data-testid="input-vendor-email" />
                    </div>
                    <div>
                      <Label>Website</Label>
                      <Input name="website" type="url" placeholder="https://..." defaultValue={editingVendor?.website || ""} data-testid="input-vendor-website" />
                    </div>
                    <div>
                      <Label>Response Time</Label>
                      <Input name="responseTime" placeholder="e.g., Same day, 2-4 hours" defaultValue={editingVendor?.responseTime || ""} data-testid="input-vendor-response" />
                    </div>
                    <div>
                      <Label>Call-Out Fee</Label>
                      <Input name="callOutFee" placeholder="e.g., $150" defaultValue={editingVendor?.callOutFee || ""} data-testid="input-vendor-fee" />
                    </div>
                    <div>
                      <Label>Account Number</Label>
                      <Input name="accountNumber" defaultValue={editingVendor?.accountNumber || ""} data-testid="input-vendor-account" />
                    </div>
                    <div>
                      <Label>Rating (1-5)</Label>
                      <Select name="rating" defaultValue={String(editingVendor?.rating || 0)}>
                        <SelectTrigger data-testid="select-vendor-rating">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Not rated</SelectItem>
                          <SelectItem value="1">1 Star</SelectItem>
                          <SelectItem value="2">2 Stars</SelectItem>
                          <SelectItem value="3">3 Stars</SelectItem>
                          <SelectItem value="4">4 Stars</SelectItem>
                          <SelectItem value="5">5 Stars</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input type="checkbox" name="isEmergency" id="isEmergency" defaultChecked={editingVendor?.isEmergency} />
                      <Label htmlFor="isEmergency">24/7 Emergency Available</Label>
                    </div>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea name="notes" placeholder="Additional notes about this vendor..." defaultValue={editingVendor?.notes || ""} data-testid="textarea-vendor-notes" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={createVendorMutation.isPending || updateVendorMutation.isPending} data-testid="btn-save-vendor">
                      {(createVendorMutation.isPending || updateVendorMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {editingVendor ? "Update Vendor" : "Add Vendor"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => { setShowVendorForm(false); setEditingVendor(null); }} data-testid="btn-cancel-vendor">
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Vendor List */}
            <div className="space-y-2">
              {filteredVendors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {vendors.length === 0 ? "No vendors added yet. Add your first repair vendor above." : "No vendors match your search."}
                </div>
              ) : (
                filteredVendors.map((vendor: any) => (
                  <div key={vendor.id} className="p-3 border rounded-lg hover-elevate flex flex-col sm:flex-row sm:items-center gap-2 justify-between" data-testid={`vendor-card-${vendor.id}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{vendor.name}</span>
                        <Badge variant="outline" className="text-xs">{vendor.specialty}</Badge>
                        {vendor.isFavorite && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                        {vendor.isEmergency && <Badge variant="destructive" className="text-xs">24/7</Badge>}
                        {vendor.rating > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            {[...Array(vendor.rating)].map((_, i) => (
                              <Star key={i} className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            ))}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground flex flex-wrap gap-3 mt-1">
                        {vendor.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{vendor.phone}</span>}
                        {vendor.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{vendor.email}</span>}
                        {vendor.responseTime && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{vendor.responseTime}</span>}
                        {vendor.callOutFee && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{vendor.callOutFee}</span>}
                      </div>
                      {vendor.notes && <p className="text-sm text-muted-foreground mt-1 italic">{vendor.notes}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => toggleFavoriteMutation.mutate(vendor.id)} data-testid={`btn-favorite-${vendor.id}`}>
                        <Star className={`h-4 w-4 ${vendor.isFavorite ? "text-yellow-500 fill-yellow-500" : ""}`} />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { setEditingVendor(vendor); setShowVendorForm(true); }} data-testid={`btn-edit-vendor-${vendor.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteVendorMutation.mutate(vendor.id)} data-testid={`btn-delete-vendor-${vendor.id}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Issues Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4 mt-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{issueStats?.open || 0}</div>
                <div className="text-xs text-muted-foreground">Open Issues</div>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 text-center">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{issueStats?.inProgress || 0}</div>
                <div className="text-xs text-muted-foreground">In Progress</div>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{issueStats?.resolved || 0}</div>
                <div className="text-xs text-muted-foreground">Resolved</div>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 text-center">
                <div className="text-2xl font-bold text-primary">{issueStats?.avgResolutionDays || 0}</div>
                <div className="text-xs text-muted-foreground">Avg. Days to Fix</div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <h4 className="font-semibold">Recent Issues</h4>
              <Button size="sm" onClick={() => setShowIssueForm(true)} data-testid="btn-log-issue">
                <Plus className="h-4 w-4 mr-2" />
                Log Issue
              </Button>
            </div>

            {/* Issue Form */}
            {showIssueForm && (
              <div className="p-4 border rounded-lg bg-accent/20 space-y-3">
                <h4 className="font-semibold">Log New Issue</h4>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const vendorId = formData.get("vendorId") as string;
                  const selectedVendor = vendors.find((v: any) => v.id === parseInt(vendorId));
                  createIssueMutation.mutate({
                    equipmentType: formData.get("equipmentType") as string,
                    equipmentName: formData.get("equipmentName") as string,
                    description: formData.get("description") as string,
                    urgencyLevel: formData.get("urgencyLevel") as string,
                    vendorId: vendorId ? parseInt(vendorId) : null,
                    vendorName: selectedVendor?.name || null,
                  });
                }} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Equipment Type *</Label>
                      <Select name="equipmentType" required>
                        <SelectTrigger data-testid="select-issue-equipment">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {equipmentTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Urgency Level</Label>
                      <Select name="urgencyLevel" defaultValue="medium">
                        <SelectTrigger data-testid="select-issue-urgency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="critical">Critical - Safety/Service Stop</SelectItem>
                          <SelectItem value="high">High - Major Impact</SelectItem>
                          <SelectItem value="medium">Medium - Can Work Around</SelectItem>
                          <SelectItem value="low">Low - Minor Annoyance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Equipment Name</Label>
                      <Input name="equipmentName" placeholder="e.g., Walk-in cooler #1" data-testid="input-issue-name" />
                    </div>
                    <div>
                      <Label>Assigned Vendor</Label>
                      <Select name="vendorId">
                        <SelectTrigger data-testid="select-issue-vendor">
                          <SelectValue placeholder="Select vendor..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No vendor assigned</SelectItem>
                          {vendors.map((v: any) => (
                            <SelectItem key={v.id} value={String(v.id)}>{v.name} ({v.specialty})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Description *</Label>
                    <Textarea name="description" required placeholder="Describe the issue..." data-testid="textarea-issue-description" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={createIssueMutation.isPending} data-testid="btn-submit-issue">
                      {createIssueMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Log Issue
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowIssueForm(false)}>Cancel</Button>
                  </div>
                </form>
              </div>
            )}

            {/* Issues List */}
            <div className="space-y-2">
              {issues.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No issues logged yet. Track equipment problems and repairs here.
                </div>
              ) : (
                issues.slice(0, 10).map((issue: any) => (
                  <div key={issue.id} className="p-3 border rounded-lg" data-testid={`issue-card-${issue.id}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={
                            issue.urgencyLevel === "critical" ? "destructive" :
                            issue.urgencyLevel === "high" ? "default" : "outline"
                          } className="text-xs">{issue.urgencyLevel}</Badge>
                          <Badge variant="outline" className="text-xs">{issue.equipmentType}</Badge>
                          <Badge variant={
                            issue.status === "open" ? "destructive" :
                            issue.status === "resolved" || issue.status === "closed" ? "default" : "secondary"
                          } className="text-xs">{issue.status.replace("_", " ")}</Badge>
                        </div>
                        <p className="font-medium mt-1">{issue.equipmentName || issue.equipmentType}</p>
                        <p className="text-sm text-muted-foreground">{issue.description}</p>
                        {issue.vendorName && <p className="text-sm mt-1">Vendor: {issue.vendorName}</p>}
                        <p className="text-xs text-muted-foreground mt-1">Reported: {new Date(issue.reportedAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-1">
                        {issue.status !== "resolved" && issue.status !== "closed" && (
                          <>
                            <Select 
                              value={issue.status} 
                              onValueChange={(v) => updateIssueMutation.mutate({ id: issue.id, data: { status: v } })}
                            >
                              <SelectTrigger className="w-28 text-xs" data-testid={`select-status-${issue.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="waiting_parts">Waiting Parts</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button size="sm" variant="outline" onClick={() => resolveIssueMutation.mutate({ id: issue.id })} data-testid={`btn-resolve-${issue.id}`}>
                              <Check className="h-4 w-4 mr-1" />
                              Resolve
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {(mode === "breakdown" || mode === "pm" || mode === "log") && (
          <Button 
            onClick={generateResponse} 
            disabled={isGenerating || (mode === "breakdown" && !issueGoal) || (mode === "pm" && !equipmentType)}
            className="w-full"
            data-testid="btn-generate-facility"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {mode === "breakdown" ? "Generating triage response..." : mode === "pm" ? "Building PM schedule..." : "Creating equipment log..."}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {mode === "breakdown" ? "Log an Issue" : mode === "pm" ? "Build PM Schedule" : "Generate Equipment Log"}
              </>
            )}
          </Button>
        )}

        {response && (
          <div className="mt-4 space-y-4">
            <div className="p-4 bg-accent/50 rounded-lg">
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {response}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={copyToClipboard} data-testid="btn-copy-facility">
              <Copy className="h-4 w-4 mr-2" />
              Copy to Clipboard
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChecklistRenderer({ text }: { text: string }) {
  const lines = text.split('\n');
  const checkableItems: number[] = [];
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (trimmed.startsWith('#') || trimmed.endsWith(':')) return;
    const isCheckItem = trimmed.match(/^[-•□✓✔☐☑]\s|^\[\s?\]\s|^\[x\]\s/i);
    if (isCheckItem || trimmed.length > 5) checkableItems.push(i);
  });

  const [checked, setChecked] = useState<Set<number>>(new Set());
  const toggleCheck = (idx: number) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  return (
    <div>
      {checkableItems.length > 0 && (
        <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground" data-testid="checklist-progress">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${(checked.size / checkableItems.length) * 100}%`, background: '#b8860b' }}
            />
          </div>
          <span className="font-medium" style={{ color: checked.size === checkableItems.length ? '#22c55e' : '#d4a017' }}>
            {checked.size} of {checkableItems.length} completed
          </span>
        </div>
      )}
      <div className="space-y-2">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return null;
          if (trimmed.startsWith('#') || trimmed.endsWith(':')) {
            return (
              <div key={i} className="mt-4 mb-1">
                <div className="text-[10px] font-bold tracking-wider uppercase" style={{ color: '#d4a017' }}>
                  {trimmed.replace(/^#+\s*/, '').replace(/:$/, '')}
                </div>
                <div className="h-px mt-1" style={{ background: 'rgba(212,160,23,0.2)' }} />
              </div>
            );
          }
          const isCheckItem = trimmed.match(/^[-•□✓✔☐☑]\s|^\[\s?\]\s|^\[x\]\s/i);
          const cleanText = trimmed.replace(/^[-•□✓✔☐☑]\s|^\[\s?\]\s|^\[x\]\s/i, '').trim();
          if (isCheckItem || trimmed.length > 5) {
            const isChecked = checked.has(i);
            return (
              <label key={i} className="flex items-start gap-3 cursor-pointer group py-1" data-testid={`checklist-item-${i}`}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  className="mt-0.5 h-4 w-4 rounded border-2 cursor-pointer shrink-0 accent-primary"
                  style={{ accentColor: '#b8860b' }}
                  onChange={() => toggleCheck(i)}
                />
                <span className={`text-sm leading-relaxed transition-colors ${isChecked ? 'line-through text-muted-foreground/50' : 'text-muted-foreground group-hover:text-foreground'}`}>
                  {cleanText || trimmed}
                </span>
              </label>
            );
          }
          return <div key={i} className="text-sm text-muted-foreground leading-relaxed">{trimmed}</div>;
        })}
      </div>
    </div>
  );
}

function renderChecklistContent(text: string) {
  return <ChecklistRenderer text={text} />;
}

function renderScriptContent(text: string) {
  const allLines = text.split('\n');
  const sections: { header: string | null; steps: { num: string; text: string; isQuote: boolean }[] }[] = [];
  let currentSection: { header: string | null; steps: { num: string; text: string; isQuote: boolean }[] } = { header: null, steps: [] };
  let currentStep: { num: string; text: string; isQuote: boolean } | null = null;

  for (const line of allLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const headerMatch = trimmed.match(/^(?:WHEN\s|IF\s|AFTER\s|BEFORE\s|DURING\s).{10,}/i) || 
                         (trimmed === trimmed.toUpperCase() && trimmed.length > 10 && !trimmed.match(/^\d/));
    if (headerMatch && currentSection.steps.length > 0) {
      if (currentStep) { currentSection.steps.push(currentStep); currentStep = null; }
      sections.push(currentSection);
      currentSection = { header: trimmed, steps: [] };
      continue;
    }
    if (headerMatch && currentSection.steps.length === 0 && !currentSection.header) {
      currentSection.header = trimmed;
      continue;
    }

    const stepMatch = trimmed.match(/^(\d+)[\.\)]\s*(.+)/);
    if (stepMatch) {
      if (currentStep) currentSection.steps.push(currentStep);
      const isQuote = stepMatch[2].includes('"') || stepMatch[2].includes('"') || stepMatch[2].includes('"');
      currentStep = { num: stepMatch[1], text: stepMatch[2].replace(/\*\*/g, ''), isQuote };
    } else if (currentStep) {
      currentStep.text += ' ' + trimmed.replace(/\*\*/g, '');
      if (trimmed.includes('"') || trimmed.includes('"')) currentStep.isQuote = true;
    } else {
      currentSection.steps.push({ num: '', text: trimmed.replace(/\*\*/g, ''), isQuote: false });
    }
  }
  if (currentStep) currentSection.steps.push(currentStep);
  if (currentSection.steps.length > 0 || currentSection.header) sections.push(currentSection);

  const numberedStepsExist = sections.some(s => s.steps.some(st => st.num));
  if (!numberedStepsExist) {
    return <div className="whitespace-pre-wrap text-sm leading-relaxed border-l-4 pl-4" style={{ borderColor: 'rgba(184,134,11,0.3)' }}>{text}</div>;
  }

  return (
    <div className="space-y-4">
      {sections.map((section, si) => (
        <div key={si}>
          {section.header && (
            <div className="font-bold text-sm text-foreground mb-3">{section.header}</div>
          )}
          <div className="relative">
            {section.steps.filter(s => s.num).length > 1 && (
              <div className="absolute left-[11px] top-7 bottom-3 w-px" style={{ background: 'rgba(184,134,11,0.2)' }} />
            )}
            <div className="space-y-3">
              {section.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 relative" data-testid={`script-step-${si}-${i}`}>
                  {step.num ? (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 z-10"
                      style={{ background: 'rgba(184,134,11,0.15)', color: '#d4a017', border: '1.5px solid rgba(184,134,11,0.4)' }}>
                      {step.num}
                    </div>
                  ) : (
                    <div className="w-6 shrink-0" />
                  )}
                  {step.isQuote ? (
                    <div className="flex-1 rounded-lg p-2.5 text-sm text-muted-foreground leading-relaxed" style={{ background: '#1a1d2e' }}>
                      <span className="text-primary/50 mr-1">"</span>{step.text}<span className="text-primary/50 ml-1">"</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground leading-relaxed pt-0.5 flex-1">{step.text}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function renderFrameworkContent(text: string) {
  const phasePattern = /^(?:PHASE\s+(\d+))[:\s—–-]*(.*)$/im;
  const phaseSections = text.split(/\n(?=PHASE\s+\d)/i);

  if (phaseSections.length > 1) {
    const phases: { num: string; title: string; items: string[] }[] = [];
    for (const section of phaseSections) {
      const lines = section.trim().split('\n');
      const headerMatch = lines[0]?.match(/^PHASE\s+(\d+)[:\s—–-]*(.*)/i);
      if (headerMatch) {
        const items = lines.slice(1).map(l => l.trim()).filter(Boolean).map(l => l.replace(/^[-•]\s*/, ''));
        phases.push({ num: headerMatch[1], title: headerMatch[2].trim() || `Phase ${headerMatch[1]}`, items });
      } else {
        const items = lines.map(l => l.trim()).filter(Boolean).map(l => l.replace(/^[-•]\s*/, ''));
        phases.push({ num: '', title: '', items });
      }
    }

    return (
      <div className="space-y-3">
        {phases.map((phase, i) => (
          <div key={i} className="rounded-lg border border-border/50 p-4" data-testid={`framework-phase-${phase.num || i}`}>
            <div className="flex items-start gap-3 mb-2">
              {phase.num && (
                <div className="w-7 h-7 rounded-full border-2 border-primary flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {phase.num}
                </div>
              )}
              <div className="font-semibold text-sm text-foreground pt-0.5">{phase.title}</div>
            </div>
            {phase.items.length > 0 && (
              <ul className="space-y-1 ml-10">
                {phase.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  }

  const sections = text.split(/\n(?=(?:SERVER|BARTENDER|HOST|MANAGER|SHIFT LEAD|BOH|FOH|KITCHEN|BAR)[:\s])/i);

  if (sections.length <= 1) {
    const lines = text.split('\n');
    const bulletLines = lines.filter(l => l.trim()).map(l => l.trim());
    const hasBullets = bulletLines.some(l => /^[-•*]\s/.test(l));

    if (hasBullets || bulletLines.length > 2) {
      return (
        <ul className="space-y-1.5">
          {bulletLines.map((line, i) => {
            const cleaned = line.replace(/^[-•*]\s*/, '');
            const roleMatch = cleaned.match(/^(SERVER|BARTENDER|HOST|MANAGER|SHIFT LEAD|BOH|FOH|KITCHEN|BAR)[:\s]/i);
            if (roleMatch) {
              return (
                <li key={i} className="mt-3 first:mt-0">
                  <span className="inline-block text-[10px] font-bold tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded mr-2">
                    {roleMatch[1].toUpperCase()}
                  </span>
                  <span className="text-sm text-muted-foreground">{cleaned.slice(roleMatch[0].length).trim()}</span>
                </li>
              );
            }
            return (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                {cleaned}
              </li>
            );
          })}
        </ul>
      );
    }

    return (
      <div className="space-y-1">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return null;
          return <div key={i} className="text-sm text-muted-foreground leading-relaxed">{trimmed}</div>;
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((section, i) => {
        const firstLine = section.trim().split('\n')[0];
        const roleMatch = firstLine.match(/^(SERVER|BARTENDER|HOST|MANAGER|SHIFT LEAD|BOH|FOH|KITCHEN|BAR)[:\s]/i);
        const roleName = roleMatch ? roleMatch[1].toUpperCase() : null;
        const sectionContent = roleMatch
          ? section.trim().split('\n').map((l, li) => li === 0 ? l.slice(roleMatch[0].length).trim() : l.trim()).filter(Boolean).join('\n')
          : section.trim();

        return (
          <div key={i} className="rounded-lg border border-border/50 p-3" data-testid={`framework-role-${roleName?.toLowerCase() || i}`}>
            {roleName && (
              <span className="inline-block text-[10px] font-bold tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded mb-2">
                {roleName}
              </span>
            )}
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{sectionContent}</div>
          </div>
        );
      })}
    </div>
  );
}

function ServiceQuickReference({ content }: { content: any[] }) {
  const quickRecoveryProtocols = [
    { issue: "Late Food", recovery: "Free dessert or comp drink", authority: "Server authority up to $20" },
    { issue: "Wrong Item", recovery: "Replace immediately + comp item", authority: "Server authority" },
    { issue: "Guest Complaint", recovery: "Manager visit + appropriate comp", authority: "Manager up to $100" },
  ];

  const checklistItems = content.filter(c => c.contentType === 'checklist');
  const timingLines: string[] = [];
  for (const item of checklistItems) {
    const lines = (item.content || '').split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes('minute') || line.toLowerCase().includes('second') || line.toLowerCase().includes('timing')) {
        timingLines.push(line.trim().replace(/^[-•□]\s*/, ''));
        if (timingLines.length >= 4) break;
      }
    }
    if (timingLines.length >= 4) break;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-primary/20 p-4" style={{ background: "#111827" }}>
        <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Top Recovery Protocols
        </h4>
        <div className="space-y-2">
          {quickRecoveryProtocols.map((p, i) => (
            <div key={i} className="flex items-start gap-3 text-sm" data-testid={`quick-ref-protocol-${i}`}>
              <div className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</div>
              <div>
                <span className="font-semibold text-foreground">{p.issue}:</span>{' '}
                <span className="text-muted-foreground">{p.recovery}</span>
                <span className="text-xs text-primary/70 ml-2">({p.authority})</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {timingLines.length > 0 && (
        <div className="rounded-lg border border-primary/20 p-4" style={{ background: "#111827" }}>
          <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Non-Negotiable Timing Standards
          </h4>
          <div className="space-y-1.5">
            {timingLines.map((line, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {timingLines.length === 0 && (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-center">
          <p className="text-sm text-muted-foreground">Timing standards will appear here once configured in your checklists.</p>
        </div>
      )}

      <div className="rounded-lg border border-primary/20 p-4" style={{ background: "#111827" }}>
        <h4 className="text-sm font-bold text-foreground mb-3">Comp Authority Limits</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { role: "Server", limit: "Dessert / non-alc drink" },
            { role: "Bartender", limit: "One round / appetizer" },
            { role: "Shift Lead", limit: "Up to $25" },
            { role: "Manager", limit: "Up to $100" },
          ].map((r) => (
            <div key={r.role} className="flex items-center gap-2 p-2 rounded bg-muted/30">
              <span className="font-semibold text-foreground">{r.role}:</span>
              <span className="text-muted-foreground">{r.limit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrainingQuickReference({ content }: { content: any[] }) {
  const checklistItems = content.filter(c => c.contentType === 'checklist');
  const scriptItems = content.filter(c => c.contentType === 'script');

  const firstFiveChecklist: string[] = [];
  for (const item of checklistItems) {
    const lines = (item.content || '').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.endsWith(':') && trimmed.length > 5) {
        firstFiveChecklist.push(trimmed.replace(/^[-•□✓✔☐☑]\s|^\[\s?\]\s|^\[x\]\s/i, '').trim());
        if (firstFiveChecklist.length >= 5) break;
      }
    }
    if (firstFiveChecklist.length >= 5) break;
  }

  const firstThreeSteps: { num: string; text: string }[] = [];
  for (const item of scriptItems) {
    const lines = (item.content || '').split('\n');
    for (const line of lines) {
      const match = line.trim().match(/^(\d+)[\.\)]\s*(.+)/);
      if (match) {
        firstThreeSteps.push({ num: match[1], text: match[2].replace(/\*\*/g, '') });
        if (firstThreeSteps.length >= 3) break;
      }
    }
    if (firstThreeSteps.length >= 3) break;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-primary/20 p-4" style={{ background: "#111827" }}>
        <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          Training Phases at a Glance
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { name: "Shadow Phase", desc: "Observe and narrate. Walk-through with guidance." },
            { name: "Perform Phase", desc: "Handle scenarios with less guidance, more complexity." },
            { name: "Certify Phase", desc: "Randomized high-pressure test. Must pass to certify." },
          ].map((phase, i) => (
            <div key={i} className="p-3 rounded-lg border border-border/50" data-testid={`training-phase-card-${i}`}>
              <div className="text-[10px] font-bold tracking-wider uppercase mb-1" style={{ color: '#d4a017' }}>{phase.name}</div>
              <div className="text-xs text-muted-foreground">{phase.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {firstFiveChecklist.length > 0 && (
        <div className="rounded-lg border border-primary/20 p-4" style={{ background: "#111827" }}>
          <div className="text-[10px] font-bold tracking-wider uppercase mb-3" style={{ color: '#d4a017' }}>
            BEFORE FIRST SOLO SHIFT
          </div>
          <div className="space-y-2">
            {firstFiveChecklist.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#d4a017' }} />
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {firstThreeSteps.length > 0 && (
        <div className="rounded-lg border border-primary/20 p-4" style={{ background: "#111827" }}>
          <div className="text-[10px] font-bold tracking-wider uppercase mb-3" style={{ color: '#d4a017' }}>
            PERFORMANCE CONVERSATION FLOW
          </div>
          <div className="relative">
            {firstThreeSteps.length > 1 && (
              <div className="absolute left-[11px] top-6 bottom-1 w-px" style={{ background: 'rgba(184,134,11,0.2)' }} />
            )}
            <div className="space-y-2">
              {firstThreeSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 z-10"
                    style={{ background: 'rgba(184,134,11,0.15)', color: '#d4a017', border: '1.5px solid rgba(184,134,11,0.4)' }}>
                    {step.num}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pt-0.5">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {firstFiveChecklist.length === 0 && firstThreeSteps.length === 0 && (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-center">
          <p className="text-sm text-muted-foreground">Add checklists and scripts to see a condensed reference view here.</p>
        </div>
      )}
    </div>
  );
}

function ServiceContentAccordion({ content, slug }: { content: any[]; slug: string }) {
  const [viewMode, setViewMode] = useState<'full' | 'quick'>('full');
  const hasQuickRef = slug === "service" || slug === "training";
  const typeOrder = ["principle", "output", "checklist", "script"] as const;
  const grouped = typeOrder
    .map(type => ({
      type,
      config: contentTypeConfig[type],
      items: content.filter(c => c.contentType === type),
    }));
  const populatedGroups = grouped.filter(g => g.items.length > 0);
  const emptyGroups = grouped.filter(g => g.items.length === 0);

  return (
    <div>
      {hasQuickRef && (
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant={viewMode === 'full' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('full')}
            data-testid="btn-view-full-standards"
          >
            Full Standards
          </Button>
          <Button
            variant={viewMode === 'quick' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('quick')}
            data-testid="btn-view-quick-reference"
          >
            <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
            Quick Reference
          </Button>
        </div>
      )}

      {viewMode === 'quick' && slug === "service" ? (
        <ServiceQuickReference content={content} />
      ) : viewMode === 'quick' && slug === "training" ? (
        <TrainingQuickReference content={content} />
      ) : (
        <>
          <Accordion type="multiple" className="space-y-4" defaultValue={populatedGroups.length > 0 ? [`group-${populatedGroups[0].type}`] : []}>
            {populatedGroups.map(({ type, config, items }) => {
              const IconComponent = config.icon;
              const preview = items[0]?.content?.slice(0, 100).replace(/\n/g, " ").trim();

              return (
                <AccordionItem
                  key={type}
                  value={`group-${type}`}
                  className="border rounded-lg px-4 transition-all duration-200"
                  data-testid={`accordion-group-${type}`}
                >
                  <AccordionTrigger className="hover:no-underline py-4 [&[data-state=open]>div>div>svg]:rotate-0 [&>svg]:transition-transform [&>svg]:duration-200">
                    <div className="flex flex-col gap-1 text-left w-full mr-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant="secondary" className={config.color}>
                          <IconComponent className="h-3 w-3 mr-1" />
                          {config.label} ({items.length})
                        </Badge>
                      </div>
                      {preview && (
                        <p className="text-xs text-muted-foreground line-clamp-1 max-w-prose pl-0.5">
                          {preview}{items[0]?.content && items[0].content.length > 100 ? "..." : ""}
                        </p>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 space-y-4">
                    {items.map((item) => (
                      <div key={item.id} className="border-l-2 border-primary/30 pl-4" data-testid={`accordion-item-${item.id}`}>
                        <h4 className="font-medium text-sm mb-3">{item.title}</h4>
                        {type === 'checklist' ? (
                          renderChecklistContent(item.content || '')
                        ) : type === 'script' ? (
                          renderScriptContent(item.content || '')
                        ) : type === 'output' ? (
                          renderFrameworkContent(item.content || '')
                        ) : type === 'principle' ? (
                          <div className="border-l-4 pl-4 py-2 rounded-r italic text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap" style={{ borderLeftColor: '#b8860b', background: 'rgba(184,134,11,0.04)' }}>
                            {item.content}
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                            {item.content}
                          </div>
                        )}
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {emptyGroups.length > 0 && slug === "service" && (
            <div className="mt-4 space-y-3">
              {emptyGroups.map(({ type, config }) => {
                const IconComponent = config.icon;
                return (
                  <div key={type} className="border border-dashed border-muted-foreground/20 rounded-lg p-4" data-testid={`empty-section-${type}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="secondary" className={`${config.color} opacity-60`}>
                        <IconComponent className="h-3 w-3 mr-1" />
                        {config.label} (0)
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Add your standards here. They'll appear on the Quick Reference view.
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const contentTypeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  principle: { icon: Lightbulb, label: "Principle", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  output: { icon: FileOutput, label: "Framework", color: "bg-primary/10 text-primary" },
  checklist: { icon: CheckSquare, label: "Checklist", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  script: { icon: ScriptIcon, label: "Script", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
};

export default function DomainPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, logout } = useAuth();
  const { isDomainLocked } = useTierAccess();

  const { data, isLoading } = useQuery<{ domain: Domain; content: FrameworkContent[] }>({
    queryKey: ["/api/domains", slug],
    queryFn: async () => {
      const res = await fetch(`/api/domains/${slug}`);
      if (!res.ok) throw new Error("Failed to fetch domain");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChefHat className="h-6 w-6 text-primary" />
              <span className="font-bold">The Restaurant Consultant</span>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-full mb-8" />
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Domain Not Found</h1>
          <Link href="/">
            <Button>Return Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { domain, content } = data;
  const domainLocked = slug ? isDomainLocked(slug) : false;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
              <span className="font-bold hidden sm:inline">The Restaurant Consultant</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => logout()}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Domain Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{domain.name}</h1>
          <p className="text-muted-foreground">{domain.description}</p>
        </div>
        {domainLocked ? (
          <UpgradeGate domain={slug || ""}>
            <ServiceContentAccordion content={content} slug={slug || ""} />
          </UpgradeGate>
        ) : (
        <>

        {/* Daily Task Reminder - only show for leadership domain */}
        {slug === "leadership" && <DailyTaskReminder />}

        {/* Service Metric Strip + Guest Recovery Advisor - only show for service domain */}
        {slug === "service" && <ServiceMetricStrip contentCount={content.length} />}
        {slug === "service" && <GuestRecoveryAdvisor />}

        {/* Food Cost Calculator - only show for costs domain */}
        {slug === "costs" && <MarginStatusStrip />}
        {slug === "costs" && <FoodCostCalculator />}

        {/* Review Response Generator - only show for reviews domain */}
        {slug === "reviews" && <ReviewResponseGenerator />}

        {/* Training Metric Strip + Skills Certification Engine - only show for training domain */}
        {slug === "training" && <TrainingMetricStrip content={content} />}
        {slug === "training" && <SkillsCertificationEngine />}

        {/* Staffing Metric Strip + Labor Demand Engine - only show for staffing domain */}
        {slug === "staffing" && <StaffingMetricStrip />}
        {slug === "staffing" && <LaborDemandEngine />}

        {/* HR Status Strip + Compliance Engine + Records - only show for hr domain */}
        {slug === "hr" && <HRStatusStrip />}
        {slug === "hr" && <HRComplianceEngine />}
        {slug === "hr" && <HRRecordsViewer />}

        {/* Kitchen Status Strip + Command Center - only show for kitchen domain */}
        {slug === "kitchen" && <KitchenStatusStrip />}
        {slug === "kitchen" && <KitchenComplianceEngine />}

        {/* SOP Capture Engine - only show for sops domain */}
        {slug === "sops" && <SOPCaptureEngine />}

        {/* Crisis Response Engine - only show for crisis domain */}
        {slug === "crisis" && <CrisisResponseEngine />}

        {/* Facility Command Center - only show for facilities domain */}
        {slug === "facilities" && <FacilityCommandCenter />}

        {/* Social Media Post Builder - only show for social-media domain */}
        {slug === "social-media" && <SocialPostBuilder />}

        {/* Content Accordion - Grouped by type */}
        <ServiceContentAccordion content={content} slug={slug || ""} />

        {/* Back Link */}
        <div className="mt-8 pt-8 border-t border-border">
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to All Domains
            </Button>
          </Link>
        </div>
        </>
        )}
      </main>
    </div>
  );
}
