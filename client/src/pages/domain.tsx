import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
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
import { 
  ArrowLeft,
  ChefHat,
  Lightbulb,
  FileOutput,
  CheckSquare,
  MessageSquare as ScriptIcon,
  LogOut,
  Calculator,
  DollarSign,
  Percent
} from "lucide-react";
import type { Domain, FrameworkContent } from "@shared/schema";

function FoodCostCalculator() {
  const [ingredientCost, setIngredientCost] = useState<string>("");
  const [yieldPercent, setYieldPercent] = useState<string>("80");
  const [portionOz, setPortionOz] = useState<string>("");
  const [targetFoodCost, setTargetFoodCost] = useState<string>("28");
  const [coversPerShift, setCoversPerShift] = useState<string>("100");
  const [overPortionOz, setOverPortionOz] = useState<string>("2");

  const ingredientCostNum = parseFloat(ingredientCost) || 0;
  const yieldPercentNum = parseFloat(yieldPercent) || 100;
  const portionOzNum = parseFloat(portionOz) || 0;
  const targetFoodCostNum = parseFloat(targetFoodCost) || 30;
  const coversNum = parseFloat(coversPerShift) || 0;
  const overPortionOzNum = parseFloat(overPortionOz) || 0;

  const usableCost = ingredientCostNum / (yieldPercentNum / 100);
  const costPerOz = usableCost / 16;
  const plateCost = costPerOz * portionOzNum;
  const recommendedPrice = plateCost / (targetFoodCostNum / 100);
  const marginLossPerShift = costPerOz * overPortionOzNum * coversNum;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Food Cost Calculator
        </CardTitle>
        <CardDescription>
          Calculate your plate cost, menu price, and margin loss from over-portioning
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="plate-cost" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="plate-cost" data-testid="tab-plate-cost">Plate Cost</TabsTrigger>
            <TabsTrigger value="menu-price" data-testid="tab-menu-price">Menu Price</TabsTrigger>
            <TabsTrigger value="margin-loss" data-testid="tab-margin-loss">Margin Loss</TabsTrigger>
          </TabsList>

          <TabsContent value="plate-cost" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="ingredientCost">Ingredient Cost ($/lb)</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="ingredientCost"
                    type="number"
                    step="0.01"
                    placeholder="12.00"
                    className="pl-9"
                    value={ingredientCost}
                    onChange={(e) => setIngredientCost(e.target.value)}
                    data-testid="input-ingredient-cost"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="yieldPercent">Yield After Trim (%)</Label>
                <div className="relative mt-1">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="yieldPercent"
                    type="number"
                    step="1"
                    placeholder="80"
                    className="pl-9"
                    value={yieldPercent}
                    onChange={(e) => setYieldPercent(e.target.value)}
                    data-testid="input-yield-percent"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="portionOz">Portion Size (oz)</Label>
                <Input
                  id="portionOz"
                  type="number"
                  step="0.5"
                  placeholder="10"
                  className="mt-1"
                  value={portionOz}
                  onChange={(e) => setPortionOz(e.target.value)}
                  data-testid="input-portion-oz"
                />
              </div>
            </div>

            {ingredientCostNum > 0 && portionOzNum > 0 && (
              <div className="mt-4 p-4 bg-accent/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Usable Cost ($/lb)</span>
                  <span className="font-medium">${usableCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost per Ounce</span>
                  <span className="font-medium">${costPerOz.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg border-t pt-2 mt-2">
                  <span className="font-semibold">Plate Cost</span>
                  <span className="font-bold text-primary">${plateCost.toFixed(2)}</span>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="menu-price" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="plateCostDisplay">Plate Cost ($)</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="plateCostDisplay"
                    type="number"
                    step="0.01"
                    className="pl-9"
                    value={plateCost > 0 ? plateCost.toFixed(2) : ""}
                    readOnly
                    placeholder="Calculate in Plate Cost tab"
                    data-testid="input-plate-cost-display"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Calculated from Plate Cost tab</p>
              </div>
              <div>
                <Label htmlFor="targetFoodCost">Target Food Cost (%)</Label>
                <div className="relative mt-1">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="targetFoodCost"
                    type="number"
                    step="1"
                    placeholder="28"
                    className="pl-9"
                    value={targetFoodCost}
                    onChange={(e) => setTargetFoodCost(e.target.value)}
                    data-testid="input-target-food-cost"
                  />
                </div>
              </div>
            </div>

            {plateCost > 0 && (
              <div className="mt-4 p-4 bg-accent/50 rounded-lg">
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Recommended Menu Price</span>
                  <span className="font-bold text-primary">${recommendedPrice.toFixed(2)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Round UP to ${Math.ceil(recommendedPrice)}.00 or ${(Math.ceil(recommendedPrice * 2) / 2).toFixed(2)}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="margin-loss" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="costPerOzDisplay">Cost per Ounce ($)</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="costPerOzDisplay"
                    type="number"
                    step="0.01"
                    className="pl-9"
                    value={costPerOz > 0 ? costPerOz.toFixed(2) : ""}
                    readOnly
                    placeholder="Calculate in Plate Cost tab"
                    data-testid="input-cost-per-oz-display"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="overPortionOz">Over-Portion (oz)</Label>
                <Input
                  id="overPortionOz"
                  type="number"
                  step="0.5"
                  placeholder="2"
                  className="mt-1"
                  value={overPortionOz}
                  onChange={(e) => setOverPortionOz(e.target.value)}
                  data-testid="input-over-portion-oz"
                />
              </div>
              <div>
                <Label htmlFor="coversPerShift">Covers per Shift</Label>
                <Input
                  id="coversPerShift"
                  type="number"
                  step="1"
                  placeholder="100"
                  className="mt-1"
                  value={coversPerShift}
                  onChange={(e) => setCoversPerShift(e.target.value)}
                  data-testid="input-covers-per-shift"
                />
              </div>
            </div>

            {costPerOz > 0 && (
              <div className="mt-4 p-4 bg-destructive/10 rounded-lg">
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Margin Loss per Shift</span>
                  <span className="font-bold text-destructive">${marginLossPerShift.toFixed(2)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  That's ${(marginLossPerShift * 30).toFixed(0)}/month or ${(marginLossPerShift * 365).toFixed(0)}/year in lost margin
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
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

        {/* Food Cost Calculator - only show for costs domain */}
        {slug === "costs" && <FoodCostCalculator />}

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
