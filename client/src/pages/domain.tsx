import { useState, useRef } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Upload
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

function DailyTaskReminder() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string>("");

  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const generateDailyTasks = async () => {
    setIsLoading(true);
    setTasks("");

    try {
      const res = await fetch("/api/consultant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `As an experienced restaurant consultant, provide today's priority tasks for a restaurant owner/operator. Today is ${dayOfWeek}.

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

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Daily Operator Priorities
            </CardTitle>
            <CardDescription className="mt-1">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {dayOfWeek}, {todayDate}
              </span>
            </CardDescription>
          </div>
          {lastGenerated && (
            <span className="text-xs text-muted-foreground">
              Generated at {lastGenerated}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Get AI-powered task recommendations based on what successful restaurant operators typically prioritize on {dayOfWeek}s.
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
      </CardContent>
    </Card>
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

        {/* Food Cost Calculator - only show for costs domain */}
        {slug === "costs" && <FoodCostCalculator />}

        {/* Review Response Generator - only show for reviews domain */}
        {slug === "reviews" && <ReviewResponseGenerator />}

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
