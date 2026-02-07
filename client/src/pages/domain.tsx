import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { jsPDF } from "jspdf";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
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
  UserMinus,
  Timer,
  MessageCircleWarning,
  Package,
  ShieldAlert,
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

function FoodCostCalculator() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("plate-builder");
  
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

  const addIngredient = () => {
    if (!newIngredient.name || !newIngredient.quantity || !newIngredient.costPerUnit) {
      toast({ title: "Fill in ingredient name, amount, and cost", variant: "destructive" });
      return;
    }

    const calculatedCost = calculateIngredientCost(newIngredient);
    const ingredient: PlateIngredient = {
      id: Date.now().toString(),
      ...newIngredient,
      wasteBuffer: CATEGORY_WASTE_DEFAULTS[newIngredient.category] || "0",
      calculatedCost,
    };

    setPlateIngredients([...plateIngredients, ingredient]);
    setNewIngredient({ name: "", quantity: "", unit: "oz", costPerUnit: "", category: "other" });
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

  const getMarginStatus = () => {
    if (totalPlateCost === 0) return null;
    if (actualFoodCostPercent === 0 && menuPriceNum === 0) {
      if (suggestedPrice > 0) {
        return { color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950", message: `Price this at $${suggestedPrice.toFixed(2)} to hit ${targetFoodCost}% food cost` };
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
      toast({ title: `${ing.name} saved to your ingredient library!` });
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
      setPlateName("");
      setPlateIngredients([]);
      setMenuPrice("");
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
      setWeeklyPurchases("");
      setWeeklySales("");
    } catch (err) {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Food Cost Tools
        </CardTitle>
        <CardDescription>
          Build plates, track costs, know if you're making money
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="plate-builder" className="text-xs sm:text-sm py-2" data-testid="tab-plate-builder">New Plate</TabsTrigger>
            <TabsTrigger value="weekly-check" className="text-xs sm:text-sm py-2" data-testid="tab-weekly-check">Weekly Check</TabsTrigger>
            <TabsTrigger value="saved" className="text-xs sm:text-sm py-2" data-testid="tab-saved">Saved</TabsTrigger>
          </TabsList>

          <TabsContent value="plate-builder" className="space-y-6">
            <div>
              <Label htmlFor="plateName" className="text-base">What are you costing?</Label>
              <Input
                id="plateName"
                placeholder="e.g., 8oz Ribeye with sides"
                className="mt-2 text-lg h-12"
                value={plateName}
                onChange={(e) => setPlateName(e.target.value)}
                data-testid="input-plate-name"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Ingredients</Label>
                {savedIngredients && savedIngredients.length > 0 && (
                  <Select onValueChange={(id) => {
                    const saved = savedIngredients.find((s: any) => s.id.toString() === id);
                    if (saved) selectSavedIngredient(saved);
                  }}>
                    <SelectTrigger className="w-48" data-testid="select-saved-ingredient">
                      <SelectValue placeholder="Use saved..." />
                    </SelectTrigger>
                    <SelectContent>
                      {savedIngredients.map((s: any) => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name} (${s.costPerUnit}/{s.unit})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <Input
                  placeholder="Ingredient name"
                  className="col-span-2 sm:col-span-1 h-12"
                  value={newIngredient.name}
                  onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                  data-testid="input-new-ingredient-name"
                />
                <Input
                  type="number"
                  placeholder="Amount"
                  className="h-12"
                  value={newIngredient.quantity}
                  onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
                  data-testid="input-new-ingredient-qty"
                />
                <Select value={newIngredient.unit} onValueChange={(v) => setNewIngredient({ ...newIngredient, unit: v })}>
                  <SelectTrigger className="h-12" data-testid="select-new-ingredient-unit">
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
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Cost/unit"
                    className="pl-8 h-12"
                    value={newIngredient.costPerUnit}
                    onChange={(e) => setNewIngredient({ ...newIngredient, costPerUnit: e.target.value })}
                    data-testid="input-new-ingredient-cost"
                  />
                </div>
                <Select value={newIngredient.category} onValueChange={(v) => setNewIngredient({ ...newIngredient, category: v })}>
                  <SelectTrigger className="h-12" data-testid="select-new-ingredient-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="protein">Protein (+5%)</SelectItem>
                    <SelectItem value="produce">Produce (+10%)</SelectItem>
                    <SelectItem value="dairy">Dairy (+3%)</SelectItem>
                    <SelectItem value="dry_goods">Dry Goods (+2%)</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addIngredient} className="w-full h-12 text-base" data-testid="btn-add-ingredient">
                Add Ingredient
              </Button>
            </div>

            {plateIngredients.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 font-medium text-sm flex justify-between">
                  <span>Ingredients on this plate</span>
                  <span>Cost</span>
                </div>
                {plateIngredients.map((ing) => (
                  <div key={ing.id} className="px-4 py-3 border-t flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{ing.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {ing.quantity} {ing.unit} @ ${ing.costPerUnit}/{ing.unit}
                        {parseFloat(ing.wasteBuffer) > 0 && <span className="ml-1">(+{ing.wasteBuffer}% waste)</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">${ing.calculatedCost.toFixed(2)}</span>
                      <Button variant="ghost" size="icon" onClick={() => saveIngredientToLibrary(ing)} title="Save to library" data-testid={`btn-save-ingredient-${ing.id}`}>
                        <Star className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeIngredient(ing.id)} data-testid={`btn-remove-ingredient-${ing.id}`}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="px-4 py-3 border-t bg-accent/30 flex justify-between items-center">
                  <span className="font-semibold text-lg">Total Plate Cost</span>
                  <span className="font-bold text-xl text-primary">${totalPlateCost.toFixed(2)}</span>
                </div>
              </div>
            )}

            {totalPlateCost > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-base">Target Food Cost</Label>
                    <Select value={targetFoodCost} onValueChange={setTargetFoodCost}>
                      <SelectTrigger className="mt-2 h-12" data-testid="select-target-fc">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FOOD_COST_PRESETS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label} ({p.value}%)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-base">Your Menu Price (optional)</Label>
                    <div className="relative mt-2">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.50"
                        placeholder="Leave blank for suggestion"
                        className="pl-8 h-12"
                        value={menuPrice}
                        onChange={(e) => setMenuPrice(e.target.value)}
                        data-testid="input-menu-price"
                      />
                    </div>
                  </div>
                </div>

                {marginStatus && (
                  <div className={`p-4 rounded-lg ${marginStatus.bg}`}>
                    <div className="flex items-start gap-3">
                      <AlertTriangle className={`h-5 w-5 mt-0.5 ${marginStatus.color}`} />
                      <div>
                        <p className={`font-semibold ${marginStatus.color}`}>
                          {menuPriceNum > 0 ? `${actualFoodCostPercent.toFixed(1)}% food cost` : "Reality Check"}
                        </p>
                        <p className="text-sm mt-1">{marginStatus.message}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button onClick={savePlate} disabled={!plateName} className="flex-1 h-12" data-testid="btn-save-plate">
                    Save This Plate
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="weekly-check" className="space-y-6">
            <div className="text-center py-4">
              <h3 className="text-lg font-semibold">Did you make money on food this week?</h3>
              <p className="text-muted-foreground mt-1">Just two numbers. That's it.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-base">What you paid for food</Label>
                <div className="relative mt-2">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="Total food purchases"
                    className="pl-10 h-14 text-lg"
                    value={weeklyPurchases}
                    onChange={(e) => setWeeklyPurchases(e.target.value)}
                    data-testid="input-weekly-purchases"
                  />
                </div>
              </div>
              <div>
                <Label className="text-base">What you sold in food</Label>
                <div className="relative mt-2">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="Total food sales"
                    className="pl-10 h-14 text-lg"
                    value={weeklySales}
                    onChange={(e) => setWeeklySales(e.target.value)}
                    data-testid="input-weekly-sales"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-base">Your target</Label>
              <Select value={targetWeeklyFC} onValueChange={setTargetWeeklyFC}>
                <SelectTrigger className="mt-2 h-12" data-testid="select-weekly-target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOOD_COST_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label} ({p.value}%)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {weeklySalesNum > 0 && weeklyPurchasesNum > 0 && (
              <div className={`p-6 rounded-lg ${weeklyVariance <= 0 ? "bg-green-50 dark:bg-green-950" : weeklyVariance <= 3 ? "bg-yellow-50 dark:bg-yellow-950" : "bg-red-50 dark:bg-red-950"}`}>
                <div className="text-center">
                  <div className={`text-4xl font-bold ${weeklyVariance <= 0 ? "text-green-600" : weeklyVariance <= 3 ? "text-yellow-600" : "text-red-600"}`}>
                    {actualWeeklyFC.toFixed(1)}%
                  </div>
                  <p className="text-lg mt-1">Your actual food cost</p>
                  
                  <div className="mt-4 pt-4 border-t border-current/20">
                    {weeklyVariance <= 0 ? (
                      <p className="text-green-700 dark:text-green-400">
                        You're {Math.abs(weeklyVariance).toFixed(1)}% under target. That's ${Math.abs(dollarVariance).toFixed(0)} extra profit this week!
                      </p>
                    ) : (
                      <p className={weeklyVariance <= 3 ? "text-yellow-700 dark:text-yellow-400" : "text-red-700 dark:text-red-400"}>
                        You're {weeklyVariance.toFixed(1)}% over target. That's ${dollarVariance.toFixed(0)} that leaked somewhere.
                      </p>
                    )}
                  </div>

                  {weeklyVariance > 2 && (
                    <div className="mt-4 text-left bg-background/50 p-3 rounded text-sm">
                      <p className="font-medium mb-1">Where money leaks:</p>
                      <ul className="text-muted-foreground space-y-1">
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

            <Button onClick={saveWeeklyData} disabled={!weeklyPurchases || !weeklySales} className="w-full h-12" data-testid="btn-save-weekly">
              Save This Week
            </Button>

            {foodCostPeriods && foodCostPeriods.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium mb-3">Recent Weeks</h4>
                <div className="space-y-2">
                  {foodCostPeriods.slice(0, 5).map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center p-3 bg-muted/30 rounded">
                      <span className="text-sm">{new Date(p.periodEnd).toLocaleDateString()}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">${parseFloat(p.totalPurchases).toLocaleString()} / ${parseFloat(p.totalSales).toLocaleString()}</span>
                        <Badge variant={parseFloat(p.actualFoodCostPercent) <= parseFloat(p.targetFoodCostPercent) ? "default" : "destructive"}>
                          {p.actualFoodCostPercent}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="saved" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4" /> Saved Ingredients
                </h4>
                {!savedIngredients || savedIngredients.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No saved ingredients yet. Add ingredients to plates and save them!</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {savedIngredients.map((ing: any) => (
                      <div key={ing.id} className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <div className="font-medium">{ing.name}</div>
                          <div className="text-sm text-muted-foreground">${ing.costPerUnit}/{ing.unit}</div>
                        </div>
                        <Badge variant="secondary">{ing.category}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <ChefHat className="h-4 w-4" /> Saved Plates
                </h4>
                {!savedPlates || savedPlates.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No saved plates yet. Build and save your first plate!</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {savedPlates.map((plate: any) => (
                      <div key={plate.id} className="p-3 border rounded">
                        <div className="flex justify-between items-start">
                          <div className="font-medium">{plate.name}</div>
                          <span className="font-semibold text-primary">${plate.totalCost}</span>
                        </div>
                        {plate.menuPrice && (
                          <div className="text-sm text-muted-foreground mt-1">
                            Menu: ${plate.menuPrice} ({plate.foodCostPercent}% FC)
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function KitchenComplianceEngine() {
  const { toast } = useToast();
  const [mode, setMode] = useState<"readiness" | "alerts" | "debrief" | "coaching" | "quick-debrief">("readiness");
  const [prepCompletion, setPrepCompletion] = useState<string>("");
  const [wasteNotes, setWasteNotes] = useState<string>("");
  const [ticketTimes, setTicketTimes] = useState<string>("");
  const [windowDelays, setWindowDelays] = useState<string>("");
  const [volumeStaffing, setVolumeStaffing] = useState<string>("");
  const [managerNotes, setManagerNotes] = useState<string>("");
  const [projectedCovers, setProjectedCovers] = useState<string>("");
  const [staffCount, setStaffCount] = useState<string>("");
  const [analysis, setAnalysis] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [readinessScore, setReadinessScore] = useState<number | null>(null);
  const [readinessLevel, setReadinessLevel] = useState<"green" | "yellow" | "red" | "critical" | null>(null);
  const [selectedDaypart, setSelectedDaypart] = useState<string>("dinner");
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  
  // Quick debrief state
  const [whatWentWell, setWhatWentWell] = useState<string>("");
  const [whatSucked, setWhatSucked] = useState<string>("");
  const [fixForTomorrow, setFixForTomorrow] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingField, setRecordingField] = useState<string | null>(null);

  const today = new Date();
  const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
  const shiftDate = today.toISOString().split('T')[0];

  // Preset configurations
  const daypartPresets: Record<string, { covers: string; staff: string; notes: string }> = {
    "normal-weekday-lunch": { covers: "60-80", staff: "3 cooks, 2 prep", notes: "Standard lunch service" },
    "normal-weekday-dinner": { covers: "80-100", staff: "4 cooks, 1 prep", notes: "Standard dinner service" },
    "busy-friday-dinner": { covers: "140-160", staff: "5 cooks, 2 prep", notes: "High volume expected, ensure backup pars" },
    "busy-saturday-dinner": { covers: "150-180", staff: "5 cooks, 2 prep", notes: "Peak volume, full backup pars required" },
    "large-party": { covers: "150+", staff: "5 cooks, 2 prep", notes: "Large party expected - confirm timing with FOH" },
    "holiday-weekend": { covers: "120-150", staff: "5 cooks, 2 prep", notes: "Holiday weekend - expect walk-in traffic" },
    "slow-monday": { covers: "40-60", staff: "2 cooks, 1 prep", notes: "Lighter volume - opportunity for deep cleaning" },
  };

  // Load historical data
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
          setPrepCompletion(data.prepCompletion || "");
          setWasteNotes(data.wasteNotes || "");
          setVolumeStaffing(data.volumeStaffing || `${data.projectedCovers || ""} covers, ${data.staffCount || ""} staff`);
          setProjectedCovers(data.projectedCovers?.toString() || "");
          setStaffCount(data.staffCount?.toString() || "");
          toast({ title: "Loaded yesterday's data" });
        } else {
          toast({ title: "No data from yesterday", variant: "destructive" });
        }
      }
    } catch (error) {
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
          const lastShift = shifts[0];
          setPrepCompletion(lastShift.prepCompletion || "");
          setWasteNotes(lastShift.wasteNotes || "");
          setVolumeStaffing(`${lastShift.projectedCovers || ""} covers, ${lastShift.staffCount || ""} staff`);
          setProjectedCovers(lastShift.projectedCovers?.toString() || "");
          setStaffCount(lastShift.staffCount?.toString() || "");
          toast({ title: `Loaded last ${dayOfWeek}'s data` });
        } else {
          toast({ title: `No data from last ${dayOfWeek}`, variant: "destructive" });
        }
      }
    } catch (error) {
      toast({ title: "Failed to load historical data", variant: "destructive" });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const applyPreset = (presetKey: string) => {
    const preset = daypartPresets[presetKey];
    if (preset) {
      // Extract numeric cover count from range (e.g., "60-80" -> 70)
      const coverMatch = preset.covers.match(/(\d+)/);
      const numCovers = coverMatch ? coverMatch[1] : preset.covers;
      setProjectedCovers(numCovers);
      
      // Extract staff count from preset (e.g., "3 cooks, 2 prep" -> 5)
      const staffMatch = preset.staff.match(/(\d+)/g);
      if (staffMatch) {
        const totalStaff = staffMatch.reduce((sum, n) => sum + parseInt(n), 0);
        setStaffCount(totalStaff.toString());
      }
      
      setVolumeStaffing(`${preset.covers} covers projected, ${preset.staff}`);
      setManagerNotes(preset.notes);
      setSelectedPreset(presetKey);
      toast({ title: "Preset applied" });
    }
  };

  // Save current shift data
  const saveShiftData = async () => {
    setIsSaving(true);
    try {
      // Parse numeric values from strings, handling ranges like "60-80"
      const parseCovers = (val: string) => {
        const match = val.match(/(\d+)/);
        return match ? parseInt(match[1]) : null;
      };
      
      await apiRequest("/api/kitchen-shifts", {
        method: "POST",
        body: JSON.stringify({
          shiftDate,
          dayOfWeek,
          daypart: selectedDaypart,
          projectedCovers: projectedCovers ? parseCovers(projectedCovers) : null,
          staffCount: staffCount ? parseInt(staffCount) : null,
          prepCompletion,
          wasteNotes,
          ticketTimes,
          windowDelays,
          managerNotes,
          readinessScore,
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen-shifts"] });
      toast({ title: "Shift data saved" });
    } catch (error) {
      toast({ title: "Failed to save shift data", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Quick debrief save
  const saveQuickDebrief = async () => {
    if (!whatWentWell && !whatSucked && !fixForTomorrow) {
      toast({ title: "Please fill in at least one field", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await apiRequest("/api/kitchen-shifts/debrief", {
        method: "POST",
        body: JSON.stringify({
          shiftDate,
          dayOfWeek,
          daypart: selectedDaypart,
          whatWentWell,
          whatSucked,
          fixForTomorrow,
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen-shifts"] });
      toast({ title: "Debrief saved! Great work." });
      setWhatWentWell("");
      setWhatSucked("");
      setFixForTomorrow("");
    } catch (error) {
      toast({ title: "Failed to save debrief", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Voice input support
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
        case "prep": setPrepCompletion(prev => prev + " " + transcript); break;
        case "waste": setWasteNotes(prev => prev + " " + transcript); break;
        case "tickets": setTicketTimes(prev => prev + " " + transcript); break;
        case "window": setWindowDelays(prev => prev + " " + transcript); break;
        case "manager": setManagerNotes(prev => prev + " " + transcript); break;
        case "wellDone": setWhatWentWell(prev => prev + " " + transcript); break;
        case "sucked": setWhatSucked(prev => prev + " " + transcript); break;
        case "fix": setFixForTomorrow(prev => prev + " " + transcript); break;
      }
      toast({ title: "Voice captured" });
    };

    recognition.onerror = () => {
      toast({ title: "Voice recognition failed", variant: "destructive" });
    };

    recognition.onend = () => {
      setIsRecording(false);
      setRecordingField(null);
    };

    recognition.start();
  };

  // Parse readiness score from AI response
  const parseReadinessScore = (text: string) => {
    const match = text.match(/KITCHEN READINESS SCORE:\s*\[?(\d+)/i);
    if (match) {
      const score = parseInt(match[1]);
      setReadinessScore(score);
      if (score >= 85) setReadinessLevel("green");
      else if (score >= 70) setReadinessLevel("yellow");
      else if (score >= 50) setReadinessLevel("red");
      else setReadinessLevel("critical");
    }
  };

  const generateAnalysis = async () => {
    setIsGenerating(true);
    setAnalysis("");

    try {
      let prompt = "";
      
      if (mode === "readiness") {
        prompt = `Generate a Kitchen Readiness Score for pre-service assessment.

PREP COMPLETION STATUS:
${prepCompletion || "Not specified"}

WASTE LOG TRENDS:
${wasteNotes || "No waste issues noted"}

VOLUME VS STAFFING:
${volumeStaffing || "Standard"}

MANAGER NOTES:
${managerNotes || "None"}

Analyze and produce a structured readiness assessment:

KITCHEN READINESS SCORE: [XX/100]

Based on:
• Prep completion timing and quality
• Par level accuracy
• Waste pattern analysis
• Staffing vs projected volume

RISK FACTORS:
• [Flag specific risks before doors open]
• [Identify stations at risk]
• [Note any repeating patterns]

STATION-BY-STATION CHECK:
□ Grill: [status]
□ Sauté: [status]
□ Pantry/Cold: [status]
□ Fry: [status]
□ Expo: [status]

PRE-SERVICE ACTIONS REQUIRED:
1. [Immediate priority]
2. [Secondary priority]
3. [Watch items]

KM BRIEFING POINTS:
[2-3 specific messages for the team based on risk areas]

Flag risks before they become service failures.`;
      } else if (mode === "alerts") {
        prompt = `Generate Service Execution Alerts based on during-service observations.

TICKET TIMING DATA:
${ticketTimes || "Not specified"}

WINDOW/EXPO DELAYS:
${windowDelays || "None noted"}

VOLUME VS STAFFING:
${volumeStaffing || "Standard"}

MANAGER NOTES:
${managerNotes || "None"}

Standards for reference:
• Appetizers: 8–10 minutes
• Entrées: 15–18 minutes after apps clear
• Desserts: 6–8 minutes
• Window dwell max: 90 seconds

Generate real-time style alerts:

ACTIVE ALERTS:

[CRITICAL] Immediate action required:
[e.g., "Entrée tickets exceeding 18 minutes. Check grill station pacing."]

[WARNING] Monitor closely:
[e.g., "Window dwell approaching 90 seconds on 3 tickets. Call runners."]

[ON TRACK]:
[What's working well]

BOTTLENECK ANALYSIS:
• Primary bottleneck: [station/position]
• Root cause: [system issue, not person]
• Immediate fix: [specific action]

EXPO COMMUNICATION CHECK:
• Are "heard" calls happening? [Yes/No/Partial]
• Are "walking" calls clear? [Yes/No/Partial]
• Are "pick up" calls timely? [Yes/No/Partial]

RUNNER DEPLOYMENT:
[Recommendation for runner positioning based on flow]

These are real-time corrections, not post-shift analysis.`;
      } else if (mode === "debrief") {
        prompt = `Generate a Post-Shift KM Debrief based on service performance.

TICKET TIMING OBSERVATIONS:
${ticketTimes || "Not specified"}

WINDOW/EXPO ISSUES:
${windowDelays || "None noted"}

PREP ISSUES DISCOVERED:
${prepCompletion || "None"}

WASTE DURING SERVICE:
${wasteNotes || "None noted"}

VOLUME VS STAFFING:
${volumeStaffing || "Standard"}

MANAGER NOTES:
${managerNotes || "None"}

Generate a structured KM debrief:

SERVICE SUMMARY:
[Overall assessment - 2-3 sentences]

WHAT BROKE:
1. [Primary breakdown]
2. [Secondary breakdown]
3. [Third issue if applicable]

WHY IT BROKE (System-Level Analysis):
• [Root cause 1 - focus on system, not person]
• [Root cause 2]
• [Root cause 3]

WHAT TO FIX TOMORROW:
□ [Specific prep adjustment]
□ [Staffing/positioning change]
□ [Communication improvement]
□ [Equipment or par level fix]

TOP BREAKDOWN DETAIL:
• Issue: [specific description]
• Root Cause: [system-level why]
• Fix: [concrete action for next shift]

PATTERN WATCH:
[Any issues that have occurred multiple shifts - flag for system redesign]

DOCUMENTATION REQUIRED:
[Any incidents that need formal documentation]

Focus on systems, not personalities. If the same issue repeats, redesign first.`;
      } else {
        prompt = `Generate a BOH Coaching Focus recommendation based on service observations.

TICKET TIMING DATA:
${ticketTimes || "Not specified"}

WINDOW/EXPO ISSUES:
${windowDelays || "None noted"}

MANAGER NOTES:
${managerNotes || "None"}

Identify ONE specific coaching focus to prevent scattershot corrections:

BOH COACHING FOCUS

TARGET: [Station or Position]

BEHAVIOR TO COACH:
[Specific, observable behavior - not attitude or effort]

STANDARD BEING MISSED:
[What should happen instead]

EVIDENCE:
[Specific observations that support this focus]
• [Example 1]
• [Example 2]

COACHING SCRIPT:
"Hey, can I grab you for a second?"

[Opening - acknowledge the work]

[Specific observation - no accusations]

[Standard reminder - what we need]

[Commitment ask]

[Close - back to work]

WHY THIS MATTERS:
[Connect to guest experience or team impact]

VERIFICATION:
[How to check if coaching worked next shift]

DO NOT COACH:
[Other issues to ignore for now - one focus at a time]

One behavior. One conversation. Consistent follow-up.`;
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
                if (mode === "readiness") {
                  parseReadinessScore(content);
                }
              }
            } catch {}
          }
        }
      }
      
      // Auto-save shift data after generating analysis
      if (mode === "readiness") {
        await saveShiftData();
      }
    } catch (err) {
      toast({ title: "Failed to generate analysis", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(analysis);
    toast({ title: "Copied to clipboard!" });
  };

  const modeLabels: Record<string, string> = {
    readiness: "Readiness Score",
    alerts: "Service Alerts",
    debrief: "KM Debrief",
    coaching: "Coaching Focus",
    "quick-debrief": "Quick Debrief"
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

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Kitchen Command Center
        </CardTitle>
        <CardDescription>
          Real-time kitchen readiness, service alerts, and post-shift debriefs. Data-driven decisions, not gut feelings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Readiness Score Gauge - shows when score is available */}
        {readinessScore !== null && readinessLevel && (
          <div className={`p-4 rounded-lg border-2 ${
            readinessLevel === "green" ? "border-green-500 bg-green-500/10" :
            readinessLevel === "yellow" ? "border-yellow-500 bg-yellow-500/10" :
            readinessLevel === "red" ? "border-red-500 bg-red-500/10" :
            "border-red-700 bg-red-700/20"
          }`}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className={`text-4xl font-bold ${
                  readinessLevel === "green" ? "text-green-600 dark:text-green-400" :
                  readinessLevel === "yellow" ? "text-yellow-600 dark:text-yellow-400" :
                  readinessLevel === "red" ? "text-red-600 dark:text-red-400" :
                  "text-red-700 dark:text-red-300"
                }`}>
                  {readinessScore}/100
                </div>
                <div>
                  <div className={`text-lg font-semibold ${
                    readinessLevel === "green" ? "text-green-700 dark:text-green-300" :
                    readinessLevel === "yellow" ? "text-yellow-700 dark:text-yellow-300" :
                    readinessLevel === "red" ? "text-red-700 dark:text-red-300" :
                    "text-red-800 dark:text-red-200"
                  }`}>
                    {readinessLevel === "green" ? "Ready - Go crush it!" :
                     readinessLevel === "yellow" ? "Manageable - Address issues" :
                     readinessLevel === "red" ? "At Risk - Immediate action needed" :
                     "Critical - Escalate now"}
                  </div>
                  <p className="text-sm text-muted-foreground">{dayOfWeek} {selectedDaypart}</p>
                </div>
              </div>
              <div className="w-full md:w-48 h-3 bg-secondary rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    readinessLevel === "green" ? "bg-green-500" :
                    readinessLevel === "yellow" ? "bg-yellow-500" :
                    readinessLevel === "red" ? "bg-red-500" :
                    "bg-red-700"
                  }`}
                  style={{ width: `${readinessScore}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="readiness" data-testid="tab-readiness">Readiness</TabsTrigger>
            <TabsTrigger value="alerts" data-testid="tab-alerts">Alerts</TabsTrigger>
            <TabsTrigger value="quick-debrief" data-testid="tab-quick-debrief">Quick Debrief</TabsTrigger>
            <TabsTrigger value="debrief" data-testid="tab-debrief">Full Debrief</TabsTrigger>
            <TabsTrigger value="coaching" data-testid="tab-coaching">Coaching</TabsTrigger>
          </TabsList>

          <TabsContent value="readiness" className="space-y-4 mt-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm text-muted-foreground">Pre-service readiness check. Are we actually prepared?</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={selectedDaypart} onValueChange={setSelectedDaypart}>
                  <SelectTrigger className="w-28" data-testid="select-daypart">
                    <SelectValue placeholder="Daypart" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                    <SelectItem value="brunch">Brunch</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadYesterday}
                  disabled={isLoadingHistory}
                  data-testid="btn-load-yesterday"
                >
                  {isLoadingHistory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4 mr-1" />}
                  Yesterday
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadLastWeek}
                  disabled={isLoadingHistory}
                  data-testid="btn-load-last-week"
                >
                  {isLoadingHistory ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4 mr-1" />}
                  Last {dayOfWeek}
                </Button>
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <Label>Quick Preset</Label>
              <Select value={selectedPreset} onValueChange={applyPreset}>
                <SelectTrigger className="mt-1" data-testid="select-preset">
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
              <div className="flex items-center">
                <Label htmlFor="prepCompletion">Prep Completion Status</Label>
                <VoiceButton field="prep" label="Dictate prep status" />
              </div>
              <Textarea
                id="prepCompletion"
                placeholder="e.g., Prep signed off at 4:45 (15 min late), protein par adjusted down yesterday, sauté station behind on mise..."
                className="mt-1 min-h-[80px]"
                value={prepCompletion}
                onChange={(e) => setPrepCompletion(e.target.value)}
                data-testid="input-prep-completion"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center">
                  <Label htmlFor="wasteNotes">Waste Log Trends</Label>
                  <VoiceButton field="waste" label="Dictate waste notes" />
                </div>
                <Textarea
                  id="wasteNotes"
                  placeholder="e.g., Repeating waste on sauté station, over-prepped garnishes last 3 days..."
                  className="mt-1 min-h-[60px]"
                  value={wasteNotes}
                  onChange={(e) => setWasteNotes(e.target.value)}
                  data-testid="input-waste-notes"
                />
              </div>
              <div>
                <Label htmlFor="volumeStaffingReadiness">Volume vs Staffing</Label>
                <Textarea
                  id="volumeStaffingReadiness"
                  placeholder="e.g., 130 covers projected, full staff, large party at 7..."
                  className="mt-1 min-h-[60px]"
                  value={volumeStaffing}
                  onChange={(e) => setVolumeStaffing(e.target.value)}
                  data-testid="input-volume-staffing-readiness"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">During-service execution alerts. Is ticket flow breaking down?</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ticketTimesAlerts">Ticket Timing Observations</Label>
                <Textarea
                  id="ticketTimesAlerts"
                  placeholder="e.g., Apps at 12 min, entrées pushing 20 min, grill backed up..."
                  className="mt-1 min-h-[80px]"
                  value={ticketTimes}
                  onChange={(e) => setTicketTimes(e.target.value)}
                  data-testid="input-ticket-times-alerts"
                />
              </div>
              <div>
                <Label htmlFor="windowDelaysAlerts">Window / Expo Delays</Label>
                <Textarea
                  id="windowDelaysAlerts"
                  placeholder="e.g., Food sitting 2+ min multiple times, runners not responding to calls..."
                  className="mt-1 min-h-[80px]"
                  value={windowDelays}
                  onChange={(e) => setWindowDelays(e.target.value)}
                  data-testid="input-window-delays-alerts"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="volumeStaffingAlerts">Current Volume vs Staffing</Label>
              <Input
                id="volumeStaffingAlerts"
                placeholder="e.g., 85 covers in, 4 servers, 3 cooks"
                className="mt-1"
                value={volumeStaffing}
                onChange={(e) => setVolumeStaffing(e.target.value)}
                data-testid="input-volume-staffing-alerts"
              />
            </div>
          </TabsContent>

          <TabsContent value="quick-debrief" className="space-y-4 mt-4">
            <div className="text-center pb-4 border-b">
              <h3 className="text-lg font-semibold">60-Second Post-Service Debrief</h3>
              <p className="text-sm text-muted-foreground">Quick capture while it's fresh. Don't overthink it.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center">
                  <Label htmlFor="whatWentWell" className="text-green-600 dark:text-green-400 font-medium">What went well?</Label>
                  <VoiceButton field="wellDone" label="Dictate what went well" />
                </div>
                <Textarea
                  id="whatWentWell"
                  placeholder="One thing that worked tonight..."
                  className="mt-1 min-h-[60px] border-green-500/30 focus:border-green-500"
                  value={whatWentWell}
                  onChange={(e) => setWhatWentWell(e.target.value)}
                  data-testid="input-what-went-well"
                />
              </div>

              <div>
                <div className="flex items-center">
                  <Label htmlFor="whatSucked" className="text-red-600 dark:text-red-400 font-medium">What sucked?</Label>
                  <VoiceButton field="sucked" label="Dictate what went wrong" />
                </div>
                <Textarea
                  id="whatSucked"
                  placeholder="One thing that broke down..."
                  className="mt-1 min-h-[60px] border-red-500/30 focus:border-red-500"
                  value={whatSucked}
                  onChange={(e) => setWhatSucked(e.target.value)}
                  data-testid="input-what-sucked"
                />
              </div>

              <div>
                <div className="flex items-center">
                  <Label htmlFor="fixForTomorrow" className="text-blue-600 dark:text-blue-400 font-medium">One fix for tomorrow</Label>
                  <VoiceButton field="fix" label="Dictate tomorrow's fix" />
                </div>
                <Textarea
                  id="fixForTomorrow"
                  placeholder="The one thing we're changing..."
                  className="mt-1 min-h-[60px] border-blue-500/30 focus:border-blue-500"
                  value={fixForTomorrow}
                  onChange={(e) => setFixForTomorrow(e.target.value)}
                  data-testid="input-fix-tomorrow"
                />
              </div>

              <Button 
                onClick={saveQuickDebrief}
                disabled={isSaving || (!whatWentWell && !whatSucked && !fixForTomorrow)}
                className="w-full"
                data-testid="btn-save-quick-debrief"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
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
            <p className="text-sm text-muted-foreground">Post-shift analysis. What broke, why, and what to fix tomorrow.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ticketTimesDebrief">Ticket Timing Issues</Label>
                <Textarea
                  id="ticketTimesDebrief"
                  placeholder="e.g., Entrées averaged 22 min during 7-8pm push..."
                  className="mt-1 min-h-[80px]"
                  value={ticketTimes}
                  onChange={(e) => setTicketTimes(e.target.value)}
                  data-testid="input-ticket-times-debrief"
                />
              </div>
              <div>
                <Label htmlFor="windowDelaysDebrief">Window Problems</Label>
                <Textarea
                  id="windowDelaysDebrief"
                  placeholder="e.g., Window congestion 7:15-8:00, 6 instances of food dying..."
                  className="mt-1 min-h-[80px]"
                  value={windowDelays}
                  onChange={(e) => setWindowDelays(e.target.value)}
                  data-testid="input-window-delays-debrief"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="prepIssuesDebrief">Prep Issues Discovered</Label>
                <Textarea
                  id="prepIssuesDebrief"
                  placeholder="e.g., Ran out of compound butter, mislabeled containers..."
                  className="mt-1 min-h-[60px]"
                  value={prepCompletion}
                  onChange={(e) => setPrepCompletion(e.target.value)}
                  data-testid="input-prep-issues-debrief"
                />
              </div>
              <div>
                <Label htmlFor="wasteDebrief">Service Waste</Label>
                <Textarea
                  id="wasteDebrief"
                  placeholder="e.g., 4 remakes on grill, 2 wrong-plate fires..."
                  className="mt-1 min-h-[60px]"
                  value={wasteNotes}
                  onChange={(e) => setWasteNotes(e.target.value)}
                  data-testid="input-waste-debrief"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="managerNotesDebrief">Manager Notes</Label>
              <Textarea
                id="managerNotesDebrief"
                placeholder="e.g., Runner coverage insufficient, new cook struggled on grill..."
                className="mt-1 min-h-[60px]"
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
                data-testid="input-manager-notes-debrief"
              />
            </div>
          </TabsContent>

          <TabsContent value="coaching" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Identify ONE behavior to coach. Prevents scattershot corrections.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ticketTimesCoaching">Ticket/Timing Observations</Label>
                <Textarea
                  id="ticketTimesCoaching"
                  placeholder="e.g., Consistent delays from sauté, grill timing off..."
                  className="mt-1 min-h-[80px]"
                  value={ticketTimes}
                  onChange={(e) => setTicketTimes(e.target.value)}
                  data-testid="input-ticket-times-coaching"
                />
              </div>
              <div>
                <Label htmlFor="windowDelaysCoaching">Communication Issues</Label>
                <Textarea
                  id="windowDelaysCoaching"
                  placeholder="e.g., Missed 'pick up' calls, no 'heard' confirmations..."
                  className="mt-1 min-h-[80px]"
                  value={windowDelays}
                  onChange={(e) => setWindowDelays(e.target.value)}
                  data-testid="input-window-delays-coaching"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="managerNotesCoaching">Specific Observations</Label>
              <Textarea
                id="managerNotesCoaching"
                placeholder="e.g., Expo not calling clear pick-ups, delays correlated with expo silence..."
                className="mt-1 min-h-[60px]"
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
                data-testid="input-manager-notes-coaching"
              />
            </div>
          </TabsContent>
        </Tabs>

        <Button 
          onClick={generateAnalysis} 
          disabled={isGenerating}
          className="w-full"
          data-testid="btn-generate-kitchen"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating {modeLabels[mode]}...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate {modeLabels[mode]}
            </>
          )}
        </Button>

        {analysis && (
          <div className="mt-4 space-y-4">
            <div className="p-4 bg-accent/50 rounded-lg">
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {analysis}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={copyToClipboard} data-testid="btn-copy-kitchen">
              <Copy className="h-4 w-4 mr-2" />
              Copy to Clipboard
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(documentation);
    toast({ title: "Copied to clipboard!" });
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

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          HR Documentation & Compliance Engine
        </CardTitle>
        <CardDescription>
          Generate Workforce Commission-compliant documentation. If it goes to a hearing, will this document stand?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="issueType">Issue Type</Label>
            <Select value={issueType} onValueChange={setIssueType}>
              <SelectTrigger id="issueType" className="mt-1" data-testid="select-hr-issue-type">
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
            <Label htmlFor="priorIncidents">Prior Discipline History</Label>
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
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="employeeName">Employee Name</Label>
            <Input
              id="employeeName"
              placeholder="e.g., John Smith"
              className="mt-1"
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
              className="mt-1"
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
              className="mt-1"
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
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="description">What Happened (Plain Language)</Label>
          <Textarea
            id="description"
            placeholder="Describe what happened in plain language. Include: when, where, what occurred, who was involved, and any impact on operations or guests. The AI will convert this into objective, compliant documentation."
            className="mt-1 min-h-[120px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            data-testid="input-hr-description"
          />
          <p className="text-xs text-muted-foreground mt-1">
            No legal wording needed - just describe the facts
          </p>
        </div>

        <Button 
          onClick={generateDocumentation} 
          disabled={isGenerating || !issueType || !description}
          className="w-full"
          data-testid="btn-generate-hr-doc"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating compliant documentation...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate HR Documentation
            </>
          )}
        </Button>

        {documentation && (
          <div className="mt-4 space-y-4">
            <div className="p-4 bg-accent/50 rounded-lg border">
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm overflow-x-auto" style={{ overflowWrap: 'break-word', wordWrap: 'break-word' }}>
                {documentation.split('\n').map((line, i) => {
                  const trimmed = line.trim();
                  if (/^\s*[=]{3,}\s*$/.test(line) || /^\s*[-]{3,}\s*$/.test(line)) {
                    return <hr key={i} className="my-2 border-muted-foreground/30" />;
                  }
                  if (!trimmed) return <div key={i} className="h-2" />;
                  const bold = (t: string) => t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                  const keywords = ['EMPLOYEE DISCIPLINE', 'ACKNOWLEDGMENT', 'AT-WILL', 'DOCUMENT COPY'];
                  const isTitleLine = keywords.some(k => trimmed.includes(k));
                  const isAllCaps = trimmed === trimmed.toUpperCase() && trimmed.length > 3 && /[A-Z]/.test(trimmed) && !/^[_\s]+$/.test(trimmed) && !/^[^A-Za-z]*$/.test(trimmed);
                  const isCheckbox = trimmed.startsWith('[ ]') || trimmed.startsWith('[X]') || trimmed.startsWith('[x]');
                  const isLabelLine = /^[A-Z][A-Z\s\/]*:/.test(trimmed) && trimmed.indexOf(':') < 35;

                  if (isTitleLine) {
                    return <h2 key={i} className="text-base font-bold text-center my-1">{trimmed.replace(/\*\*/g, '')}</h2>;
                  }
                  if (isAllCaps) {
                    return <h3 key={i} className="text-sm font-bold mt-3 mb-1">{trimmed}</h3>;
                  }
                  if (isCheckbox) {
                    const checked = trimmed.startsWith('[X]') || trimmed.startsWith('[x]');
                    const label = trimmed.substring(3).trim().replace(/^-\s*/, '');
                    return (
                      <div key={i} className="flex items-start gap-2 ml-1 my-0.5">
                        <div className={`mt-0.5 w-4 h-4 border rounded flex-shrink-0 flex items-center justify-center ${checked ? 'bg-primary border-primary' : 'border-muted-foreground/50'}`}>
                          {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <span className="text-sm">{label}</span>
                      </div>
                    );
                  }
                  if (isLabelLine) {
                    const colonIdx = trimmed.indexOf(':');
                    const label = trimmed.substring(0, colonIdx + 1);
                    const value = trimmed.substring(colonIdx + 1).trim();
                    return (
                      <p key={i} className="text-sm my-0.5">
                        <span className="font-semibold">{label}</span>{value ? ` ${value}` : ''}
                      </p>
                    );
                  }
                  return <p key={i} className="text-sm my-0.5" dangerouslySetInnerHTML={{ __html: bold(trimmed) }} />;
                })}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={copyToClipboard} data-testid="btn-copy-hr-doc">
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={printDocument} data-testid="btn-print-hr-doc">
                <FileText className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" size="sm" onClick={shareDocument} data-testid="btn-share-hr-doc">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={saveDocument} 
                disabled={isSaving || savedDocId !== null}
                data-testid="btn-save-hr-doc"
              >
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckSquare className="h-4 w-4 mr-2" />}
                {savedDocId ? "Saved" : "Save to HR Records"}
              </Button>
            </div>
            
            {savedDocId && (
              <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                <p className="text-sm font-medium">Upload Signed Document</p>
                <p className="text-xs text-muted-foreground">
                  After printing and getting signatures, scan or photograph the signed document and upload it here.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
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
                  Upload Signed Scan
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
  
  const { data: documents, isLoading } = useQuery<any[]>({
    queryKey: ["/api/hr-documents"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/hr-documents/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Document deleted" });
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
          {!documents || documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No HR documents saved yet. Generate and save documentation above to start building records.
            </p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc: any) => (
                <div key={doc.id} className="p-4 border rounded-lg flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-medium">{doc.employeeName}</span>
                      {doc.employeePosition && (
                        <Badge variant="secondary" className="text-xs">{doc.employeePosition}</Badge>
                      )}
                      <Badge variant={doc.disciplineLevel === "third" ? "destructive" : doc.disciplineLevel === "second" ? "default" : "outline"} className="text-xs">
                        {disciplineLevelLabels[doc.disciplineLevel] || doc.disciplineLevel}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {issueTypeLabels[doc.issueType] || doc.issueType}
                      {doc.incidentDate && ` - ${new Date(doc.incidentDate).toLocaleDateString()}`}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Created: {new Date(doc.createdAt).toLocaleDateString()}
                      {doc.signedAt && (
                        <span className="ml-2 text-green-600 dark:text-green-400">
                          <CheckSquare className="h-3 w-3 inline mr-1" />
                          Signed copy uploaded
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedDoc(doc); setShowPreview(true); }}
                      data-testid={`btn-view-hr-doc-${doc.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {doc.scanFilename && (
                      <Button
                        variant="outline"
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
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this HR document?")) {
                          deleteMutation.mutate(doc.id);
                        }
                      }}
                      data-testid={`btn-delete-hr-doc-${doc.id}`}
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

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>HR Document - {selectedDoc?.employeeName}</DialogTitle>
            <DialogDescription>
              {disciplineLevelLabels[selectedDoc?.disciplineLevel] || selectedDoc?.disciplineLevel}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-accent/30 rounded-lg border font-mono text-sm whitespace-pre-wrap overflow-auto max-h-[50vh]">
            {selectedDoc?.documentContent || "No content available"}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)} data-testid="btn-close-hr-doc-preview">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LaborDemandEngine() {
  const { toast } = useToast();
  const [daypart, setDaypart] = useState<string>("dinner");
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
    { value: "quiet-monday", label: "Quiet Monday Lunch", covers: "45", avgCheck: "32", positions: "4" },
    { value: "normal-weekday", label: "Normal Weekday Dinner", covers: "75", avgCheck: "48", positions: "6" },
    { value: "busy-friday", label: "Busy Friday Dinner", covers: "140", avgCheck: "55", positions: "10" },
    { value: "busy-saturday", label: "Busy Saturday Night", covers: "165", avgCheck: "58", positions: "12" },
    { value: "sunday-brunch", label: "Sunday Brunch Rush", covers: "120", avgCheck: "35", positions: "8" },
    { value: "slow-tuesday", label: "Slow Tuesday Evening", covers: "55", avgCheck: "42", positions: "5" },
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

    return {
      projectedSales,
      laborBudget,
      maxLaborCost,
      actualLaborPercent,
      neededPositions,
      positionGap,
      scheduled
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
    if (preset && preset.covers) {
      setProjectedCovers(preset.covers);
      setAvgCheck(preset.avgCheck || "45");
      setScheduledPositions(preset.positions || "");
      toast({ title: `Applied "${preset.label}" preset` });
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

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Labor Demand & Cut-Decision Engine
        </CardTitle>
        <CardDescription>
          Cover-driven staffing decisions. No guessing, no hoping—just data-driven labor actions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Actions Bar */}
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b">
          <div className="flex-1 min-w-[200px]">
            <Select onValueChange={applyPreset}>
              <SelectTrigger className="h-9" data-testid="select-preset">
                <SelectValue placeholder="Quick Presets..." />
              </SelectTrigger>
              <SelectContent>
                {quickPresets.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
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

        {/* Real-time Metrics Dashboard */}
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

        {/* Quick Recommendation */}
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

        {/* Mode Toggle */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as "preshift" | "midshift")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preshift" data-testid="tab-preshift">Pre-Shift Planning</TabsTrigger>
            <TabsTrigger value="midshift" data-testid="tab-midshift">Mid-Shift Decision</TabsTrigger>
          </TabsList>

          <TabsContent value="preshift" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            {/* New: Scheduled Positions Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>
          </TabsContent>

          <TabsContent value="midshift" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <Button 
          onClick={generateRecommendation} 
          disabled={isGenerating || !projectedCovers}
          className="w-full"
          data-testid="btn-generate-labor"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating {mode === "preshift" ? "staffing plan" : "cut decision"}...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              {mode === "preshift" ? "Generate Staffing Plan" : "Get Labor Decision"}
            </>
          )}
        </Button>

        {recommendation && (
          <div className="mt-4 space-y-4">
            <div className="p-4 bg-accent/50 rounded-lg">
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {recommendation}
              </div>
            </div>
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

function SkillsCertificationEngine() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Skills Certification Engine
        </CardTitle>
        <CardDescription>
          Certify readiness based on behavior, not completion. Configure your restaurant's standards, generate scenarios, and evaluate with a transparent rubric.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/certification">
          <Button className="w-full" data-testid="btn-open-certification">
            <Sparkles className="h-4 w-4 mr-2" />
            Open Certification Engine
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function GuestRecoveryAdvisor() {
  const { toast } = useToast();
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
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Guest Recovery Decision Advisor
        </CardTitle>
        <CardDescription>
          Get real-time guidance on how to recover a service failure—within your comp limits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="issueType">Issue Type</Label>
            <Select value={issueType} onValueChange={setIssueType}>
              <SelectTrigger id="issueType" className="mt-1" data-testid="select-issue-type">
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
            <Label htmlFor="responderRole">Who is Responding?</Label>
            <Select value={responderRole} onValueChange={setResponderRole}>
              <SelectTrigger id="responderRole" className="mt-1" data-testid="select-responder-role">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="timeDelay">Time Delay (minutes over expected)</Label>
            <Input
              id="timeDelay"
              type="number"
              placeholder="e.g., 18"
              className="mt-1"
              value={timeDelay}
              onChange={(e) => setTimeDelay(e.target.value)}
              data-testid="input-time-delay"
            />
          </div>
          <div>
            <Label htmlFor="checkValue">Check Value ($)</Label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="checkValue"
                type="number"
                placeholder="e.g., 96"
                className="pl-9"
                value={checkValue}
                onChange={(e) => setCheckValue(e.target.value)}
                data-testid="input-check-value"
              />
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="additionalContext">Additional Context (optional)</Label>
          <Textarea
            id="additionalContext"
            placeholder="e.g., Server already apologized, guest is a regular, celebrating anniversary..."
            className="mt-1 min-h-[80px]"
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            data-testid="input-additional-context"
          />
        </div>

        <Button 
          onClick={generateRecovery} 
          disabled={isGenerating || !issueType}
          className="w-full"
          data-testid="btn-generate-recovery"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating recovery advice...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Get Recovery Advice
            </>
          )}
        </Button>

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

// Quick-fix crisis types for leadership command center
const QUICK_CRISIS_TYPES = [
  { id: 'no_show', label: 'Staff No-Show', Icon: UserMinus },
  { id: 'equipment', label: 'Equipment Failure', Icon: Wrench },
  { id: 'rush', label: 'Unexpected Rush', Icon: Timer },
  { id: 'complaint', label: 'Guest Complaint', Icon: MessageCircleWarning },
  { id: 'delivery', label: 'Delivery Problem', Icon: Package },
  { id: 'health', label: 'Health/Safety Issue', Icon: ShieldAlert },
];

function DailyTaskReminder() {
  const { toast } = useToast();
  const { permissions } = useRole();
  const [tasks, setTasks] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string>("");
  const [staffMessage, setStaffMessage] = useState<string>("");
  const [isGeneratingStaffMessage, setIsGeneratingStaffMessage] = useState(false);
  
  // New states for enhanced features
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [activeTab, setActiveTab] = useState<'priorities' | 'crisis' | 'chat' | 'progress' | 'reminders'>('priorities');
  const [crisisType, setCrisisType] = useState<string>('');
  const [crisisResponse, setCrisisResponse] = useState<string>('');
  const [isGeneratingCrisis, setIsGeneratingCrisis] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: string; content: string}[]>([]);
  const [isChattingLoading, setIsChattingLoading] = useState(false);

  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Load restaurant profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/restaurant-profile', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        if (!data) {
          setShowProfileSetup(true);
        }
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
      const parts = [];
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

  const generateDailyTasks = async () => {
    setIsLoading(true);
    setTasks("");

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

Format as a clear, prioritized list with 5-7 specific tasks for TODAY (${dayOfWeek}). Each task should be actionable and include the "why" behind it. Be specific to restaurant operations.`,
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
                setTasks(content);
              }
            } catch {}
          }
        }
        setLastGenerated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      toast({ title: "Failed to generate tasks", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCrisisMode = async (type: string) => {
    setCrisisType(type);
    setIsGeneratingCrisis(true);
    setCrisisResponse("");

    const crisisLabel = QUICK_CRISIS_TYPES.find(c => c.id === type)?.label || type;
    const personalContext = buildPersonalizedPrompt();

    try {
      const res = await fetch("/api/consultant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `URGENT: I'm dealing with a ${crisisLabel} right now and need immediate help.
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
                setCrisisResponse(content);
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      toast({ title: "Failed to generate crisis response", variant: "destructive" });
    } finally {
      setIsGeneratingCrisis(false);
    }
  };

  const handleFollowUp = async () => {
    if (!followUpQuestion.trim()) return;
    
    const userMessage = followUpQuestion.trim();
    setFollowUpQuestion('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChattingLoading(true);

    const personalContext = buildPersonalizedPrompt();
    const previousContext = tasks ? `\n\nPrevious priorities generated:\n${tasks}` : '';
    const chatContext = chatHistory.length > 0 
      ? `\n\nPrevious conversation:\n${chatHistory.map(m => `${m.role}: ${m.content}`).join('\n')}`
      : '';

    try {
      const res = await fetch("/api/consultant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `You are helping a restaurant owner/operator with their daily operations.
${personalContext}${previousContext}${chatContext}

User's follow-up question: ${userMessage}

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
        setChatHistory(prev => [...prev, { role: 'assistant', content }]);
      }
    } catch (err) {
      toast({ title: "Failed to get response", variant: "destructive" });
    } finally {
      setIsChattingLoading(false);
    }
  };

  const generateStaffMessage = async () => {
    if (!tasks) return;
    
    setIsGeneratingStaffMessage(true);
    setStaffMessage("");

    try {
      const res = await fetch("/api/consultant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `Convert the following operator priorities into a friendly, motivational message for restaurant staff. 

The message should:
- Be warm and encouraging in tone
- Focus on what the TEAM needs to accomplish today
- Remove any management-only details (like P&L review, vendor negotiations, etc.)
- Be concise and easy to read on a phone
- Start with a greeting like "Hey team!" or "Good morning team!"
- End with something motivational
- Use simple bullet points for key priorities
- Keep it under 200 words

Here are today's operator priorities to convert:

${tasks}

Generate ONLY the staff message, nothing else.`,
        }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to generate staff message");

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
                setStaffMessage(content);
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      toast({ title: "Failed to generate staff message", variant: "destructive" });
    } finally {
      setIsGeneratingStaffMessage(false);
    }
  };

  const copyStaffMessageToClipboard = async () => {
    if (!staffMessage) return;
    
    try {
      await navigator.clipboard.writeText(staffMessage);
      toast({ title: "Copied to clipboard!", description: "Ready to paste into your staff messaging app" });
    } catch (err) {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  if (isLoadingProfile) {
    return (
      <Card className="mb-8">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Profile Setup Dialog */}
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

      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Leadership Command Center
              </CardTitle>
              <CardDescription className="mt-1">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {dayOfWeek}, {todayDate}
                  {profile?.restaurantName && (
                    <Badge variant="secondary" className="ml-2">{profile.restaurantName}</Badge>
                  )}
                </span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {lastGenerated && (
                <span className="text-xs text-muted-foreground">
                  Last: {lastGenerated}
                </span>
              )}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowProfileSetup(true)}
                data-testid="btn-edit-profile"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="priorities" data-testid="tab-priorities">
                <Sparkles className="h-4 w-4 mr-2" />
                Priorities
              </TabsTrigger>
              <TabsTrigger value="crisis" data-testid="tab-crisis">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Crisis
              </TabsTrigger>
              <TabsTrigger value="chat" data-testid="tab-chat">
                <MessageSquare className="h-4 w-4 mr-2" />
                Follow-up
              </TabsTrigger>
              <TabsTrigger value="progress" data-testid="tab-progress">
                <CheckSquare className="h-4 w-4 mr-2" />
                Progress
              </TabsTrigger>
              <TabsTrigger value="reminders" data-testid="tab-reminders">
                <Bell className="h-4 w-4 mr-2" />
                Reminders
              </TabsTrigger>
            </TabsList>

            {/* Priorities Tab */}
            <TabsContent value="priorities" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Get AI-powered task recommendations personalized for your restaurant on {dayOfWeek}s.
              </p>

              <Button 
                onClick={generateDailyTasks} 
                disabled={isLoading}
                className="w-full"
                data-testid="btn-generate-daily-tasks"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating your {dayOfWeek} priorities...
                  </>
                ) : tasks ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Today's Priorities
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Get Today's Priorities
                  </>
                )}
              </Button>

              {tasks && (
                <div className="mt-4 p-4 bg-accent/50 rounded-lg">
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {tasks}
                  </div>
                </div>
              )}

              {tasks && permissions.canSendToStaff && (
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Send to Staff</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Convert today's priorities into a friendly team message ready to share.
                  </p>
                  
                  {!staffMessage ? (
                    <Button 
                      onClick={generateStaffMessage} 
                      disabled={isGeneratingStaffMessage}
                      variant="outline"
                      className="w-full"
                      data-testid="btn-generate-staff-message"
                    >
                      {isGeneratingStaffMessage ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating team message...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Generate Staff Message
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                        <div className="text-sm whitespace-pre-wrap">
                          {staffMessage}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={copyStaffMessageToClipboard}
                          className="flex-1"
                          data-testid="btn-copy-staff-message"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy to Clipboard
                        </Button>
                        <Button 
                          onClick={generateStaffMessage} 
                          disabled={isGeneratingStaffMessage}
                          variant="outline"
                          data-testid="btn-regenerate-staff-message"
                        >
                          {isGeneratingStaffMessage ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Crisis Mode Tab */}
            <TabsContent value="crisis" className="space-y-4 mt-4">
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm font-medium text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Quick Fix Mode
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Get immediate step-by-step guidance for common restaurant emergencies.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {QUICK_CRISIS_TYPES.map((crisis) => (
                  <Button
                    key={crisis.id}
                    variant={crisisType === crisis.id ? "default" : "outline"}
                    className="h-auto py-3 flex flex-col items-center gap-1"
                    onClick={() => handleCrisisMode(crisis.id)}
                    disabled={isGeneratingCrisis}
                    data-testid={`btn-crisis-${crisis.id}`}
                  >
                    <crisis.Icon className="h-5 w-5" />
                    <span className="text-xs">{crisis.label}</span>
                  </Button>
                ))}
              </div>

              {isGeneratingCrisis && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm">Generating crisis response...</span>
                </div>
              )}

              {crisisResponse && !isGeneratingCrisis && (
                <div className="p-4 bg-accent/50 rounded-lg">
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {crisisResponse}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Chat/Follow-up Tab */}
            <TabsContent value="chat" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Ask follow-up questions about your priorities or get deeper guidance on any topic.
              </p>

              {/* Chat History */}
              {chatHistory.length > 0 && (
                <div className="space-y-3 max-h-64 overflow-y-auto p-2 bg-muted/30 rounded-lg">
                  {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-primary/10 ml-8' : 'bg-accent mr-8'}`}>
                      <p className="text-xs font-medium mb-1 text-muted-foreground">
                        {msg.role === 'user' ? 'You' : 'Consultant'}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Textarea
                  placeholder="Ask a follow-up question... e.g., 'How should I handle labor assessment for my 20-person team?'"
                  value={followUpQuestion}
                  onChange={(e) => setFollowUpQuestion(e.target.value)}
                  className="flex-1 min-h-[80px]"
                  data-testid="input-followup"
                />
              </div>
              <Button 
                onClick={handleFollowUp}
                disabled={isChattingLoading || !followUpQuestion.trim()}
                className="w-full"
                data-testid="btn-send-followup"
              >
                {isChattingLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Getting response...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Ask Question
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Progress Tracking Tab */}
            <TabsContent value="progress" className="space-y-4 mt-4">
              <TaskProgressDashboard />
            </TabsContent>

            {/* Reminders Tab */}
            <TabsContent value="reminders" className="space-y-4 mt-4">
              <NotificationReminders />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
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
    labor: 'bg-blue-500',
    inventory: 'bg-green-500',
    training: 'bg-purple-500', 
    service: 'bg-orange-500',
    admin: 'bg-gray-500',
    finance: 'bg-red-500',
    uncategorized: 'bg-slate-400'
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
                  <div className={`w-2 h-2 rounded-full ${categoryColors[cat] || 'bg-slate-400'}`} />
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

function ReviewResponseGenerator() {
  const { toast } = useToast();
  const [review, setReview] = useState<string>("");
  const [reviewType, setReviewType] = useState<string>("negative");
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [yourName, setYourName] = useState<string>("");
  const [yourTitle, setYourTitle] = useState<string>("Manager");
  const [response, setResponse] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setScreenshotPreview(result);
      setScreenshotBase64(result.split(',')[1]);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const generateResponse = async () => {
    if (!review.trim() && !screenshotBase64) {
      toast({ title: "Please paste a review or upload a screenshot", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setResponse("");

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

The response should:
- Be warm and genuine, not corporate or robotic
- Thank them for their feedback
- ${reviewType === "negative" ? "Acknowledge their concern without being defensive or making excuses" : "Express genuine appreciation for their kind words"}
- ${reviewType === "negative" ? "Offer to make it right and invite them to reach out directly" : "Invite them to visit again"}
- Sign off with ${yourName || "[Your Name]"}, ${yourTitle || "Manager"}
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

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Review Response Generator
        </CardTitle>
        <CardDescription>
          Paste a customer review and get a professional, friendly response
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="reviewType">Review Type</Label>
            <Select value={reviewType} onValueChange={setReviewType}>
              <SelectTrigger className="mt-1" data-testid="select-review-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="negative">
                  <span className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-destructive" />
                    Negative Review
                  </span>
                </SelectItem>
                <SelectItem value="positive">
                  <span className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    Positive Review
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="restaurantName">Restaurant Name (optional)</Label>
            <Input
              id="restaurantName"
              placeholder="Your Restaurant"
              className="mt-1"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              data-testid="input-restaurant-name"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="yourName">Your Name</Label>
            <Input
              id="yourName"
              placeholder="John"
              className="mt-1"
              value={yourName}
              onChange={(e) => setYourName(e.target.value)}
              data-testid="input-your-name"
            />
          </div>
          <div>
            <Label htmlFor="yourTitle">Your Title</Label>
            <Input
              id="yourTitle"
              placeholder="Manager"
              className="mt-1"
              value={yourTitle}
              onChange={(e) => setYourTitle(e.target.value)}
              data-testid="input-your-title"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="review">Paste the Customer Review</Label>
          <Textarea
            id="review"
            placeholder="Paste the customer's review here..."
            className="mt-1 min-h-[120px]"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            onPaste={handlePaste}
            data-testid="textarea-review"
          />
        </div>

        <div>
          <Label>Or Upload a Screenshot of the Review</Label>
          <div 
            className="mt-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-accent/30"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            data-testid="screenshot-drop-zone"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
              data-testid="input-screenshot"
            />
            {screenshotPreview ? (
              <div className="relative inline-block">
                <img 
                  src={screenshotPreview} 
                  alt="Review screenshot" 
                  className="max-h-48 mx-auto rounded-md"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeScreenshot();
                  }}
                  data-testid="btn-remove-screenshot"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="py-4">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Drag & drop a screenshot here, or click to upload
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  You can also paste (Ctrl+V) directly into the text area above
                </p>
              </div>
            )}
          </div>
        </div>

        <Button 
          onClick={generateResponse} 
          disabled={isGenerating || (!review.trim() && !screenshotBase64)}
          className="w-full"
          data-testid="btn-generate-response"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Response
            </>
          )}
        </Button>

        {response && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label>Generated Response</Label>
              <Button variant="outline" size="sm" onClick={copyToClipboard} data-testid="btn-copy-response">
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
            <div className="p-4 bg-accent/50 rounded-lg whitespace-pre-wrap text-sm">
              {response}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
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
      <CardHeader className="bg-destructive/5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="h-5 w-5" />
              Crisis Command Center
              {mode === "chat" && crisisStartTime && (
                <Badge variant="outline" className="ml-2 text-destructive border-destructive/50">
                  <Clock className="h-3 w-3 mr-1" />
                  {getElapsedTime()} active
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {mode === "start" && "Real-time crisis support. I'll guide you through it."}
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
            <Label className="text-base font-semibold">What's happening?</Label>
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
          AI-Powered SOP Capture
        </CardTitle>
        <CardDescription>
          Describe how a task is actually performed. The AI converts it into standardized, transferable documentation.
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
              Describe how your best performer does this task. The AI will convert it into a structured SOP.
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
              : "Paste your existing SOP or describe how the process currently works. The AI will audit it for scalability..."
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
      
      if (mode === "breakdown") {
        prompt = `You are "Facility Command Center," an AI maintenance operations assistant for a live restaurant.
Your job is to prevent downtime, control repair costs, and keep the restaurant service-ready.

SITUATION:
- Equipment/Problem: ${issueGoal}
- Equipment Type: ${equipmentLabel || "Not specified"}
- Currently in active service: ${inActiveService === "yes" ? "YES" : "NO"}
- Safety risk present: ${safetyRisk === "yes" ? "YES - PRIORITIZE SAFETY" : "No"}
${equipmentName ? `- Equipment name/model: ${equipmentName}` : ""}
${lastServiceDate ? `- Last service date: ${lastServiceDate}` : ""}
${symptoms ? `- Symptoms: ${symptoms}` : ""}

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="activeService">Are we in active service?</Label>
                <Select value={inActiveService} onValueChange={setInActiveService}>
                  <SelectTrigger id="activeService" className="mt-1" data-testid="select-active-service">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No - Not in service</SelectItem>
                    <SelectItem value="yes">Yes - Currently serving guests</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="safetyRisk">Safety risk present?</Label>
                <Select value={safetyRisk} onValueChange={setSafetyRisk}>
                  <SelectTrigger id="safetyRisk" className="mt-1" data-testid="select-safety-risk">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No safety risk</SelectItem>
                    <SelectItem value="yes">Yes - Safety hazard present</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

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
              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{issueStats?.avgResolutionDays || 0}</div>
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

const contentTypeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  principle: { icon: Lightbulb, label: "Principle", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  output: { icon: FileOutput, label: "Framework", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  checklist: { icon: CheckSquare, label: "Checklist", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  script: { icon: ScriptIcon, label: "Script", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
};

export default function DomainPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, logout } = useAuth();

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
        <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
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

        {/* Daily Task Reminder - only show for leadership domain */}
        {slug === "leadership" && <DailyTaskReminder />}

        {/* Guest Recovery Advisor - only show for service domain */}
        {slug === "service" && <GuestRecoveryAdvisor />}

        {/* Food Cost Calculator - only show for costs domain */}
        {slug === "costs" && <FoodCostCalculator />}

        {/* Review Response Generator - only show for reviews domain */}
        {slug === "reviews" && <ReviewResponseGenerator />}

        {/* Skills Certification Engine - only show for training domain */}
        {slug === "training" && <SkillsCertificationEngine />}

        {/* Labor Demand Engine - only show for staffing domain */}
        {slug === "staffing" && <LaborDemandEngine />}

        {/* HR Compliance Engine - only show for hr domain */}
        {slug === "hr" && <HRComplianceEngine />}
        {slug === "hr" && <HRRecordsViewer />}

        {/* Kitchen Compliance Engine - only show for kitchen domain */}
        {slug === "kitchen" && <KitchenComplianceEngine />}

        {/* SOP Capture Engine - only show for sops domain */}
        {slug === "sops" && <SOPCaptureEngine />}

        {/* Crisis Response Engine - only show for crisis domain */}
        {slug === "crisis" && <CrisisResponseEngine />}

        {/* Facility Command Center - only show for facilities domain */}
        {slug === "facilities" && <FacilityCommandCenter />}

        {/* Social Media Post Builder - only show for social-media domain */}
        {slug === "social-media" && <SocialPostBuilder />}

        {/* Content Accordion */}
        <Accordion type="multiple" className="space-y-4">
          {content.map((item) => {
            const typeConfig = contentTypeConfig[item.contentType] || contentTypeConfig.output;
            const IconComponent = typeConfig.icon;
            
            return (
              <AccordionItem 
                key={item.id} 
                value={`item-${item.id}`}
                className="border rounded-lg px-4"
                data-testid={`accordion-item-${item.id}`}
              >
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3 text-left">
                    <Badge variant="secondary" className={typeConfig.color}>
                      <IconComponent className="h-3 w-3 mr-1" />
                      {typeConfig.label}
                    </Badge>
                    <span className="font-medium">{item.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className={`whitespace-pre-wrap text-sm leading-relaxed ${
                    item.contentType === 'script' || item.contentType === 'checklist' 
                      ? 'font-mono bg-muted p-4 rounded-md' 
                      : item.contentType === 'principle'
                      ? 'border-l-4 border-primary pl-4 italic text-muted-foreground'
                      : ''
                  }`}>
                    {item.content}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Back Link */}
        <div className="mt-8 pt-8 border-t border-border">
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to All Domains
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
