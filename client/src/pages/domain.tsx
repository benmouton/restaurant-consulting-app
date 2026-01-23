import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
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
  Upload,
  Users,
  AlertTriangle,
  Shield,
  Wrench
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

function KitchenComplianceEngine() {
  const { toast } = useToast();
  const [mode, setMode] = useState<"readiness" | "alerts" | "debrief" | "coaching">("readiness");
  const [prepCompletion, setPrepCompletion] = useState<string>("");
  const [wasteNotes, setWasteNotes] = useState<string>("");
  const [ticketTimes, setTicketTimes] = useState<string>("");
  const [windowDelays, setWindowDelays] = useState<string>("");
  const [volumeStaffing, setVolumeStaffing] = useState<string>("");
  const [managerNotes, setManagerNotes] = useState<string>("");
  const [analysis, setAnalysis] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

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
              }
            } catch {}
          }
        }
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

  const modeLabels = {
    readiness: "Readiness Score",
    alerts: "Service Alerts",
    debrief: "KM Debrief",
    coaching: "Coaching Focus"
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Kitchen Execution & Line Discipline Engine
        </CardTitle>
        <CardDescription>
          Turn prep, ticket flow, and window discipline into measurable standards. Where is the system failing — not who?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="readiness" data-testid="tab-readiness">Readiness</TabsTrigger>
            <TabsTrigger value="alerts" data-testid="tab-alerts">Alerts</TabsTrigger>
            <TabsTrigger value="debrief" data-testid="tab-debrief">Debrief</TabsTrigger>
            <TabsTrigger value="coaching" data-testid="tab-coaching">Coaching</TabsTrigger>
          </TabsList>

          <TabsContent value="readiness" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Pre-service readiness check. Are we actually prepared?</p>
            <div>
              <Label htmlFor="prepCompletion">Prep Completion Status</Label>
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
                <Label htmlFor="wasteNotes">Waste Log Trends</Label>
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
  const [priorIncidents, setPriorIncidents] = useState<string>("none");
  const [policyAware, setPolicyAware] = useState<string>("yes");
  const [documentation, setDocumentation] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

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
    { value: "none", label: "First occurrence" },
    { value: "verbal", label: "Prior verbal coaching" },
    { value: "written", label: "Prior written warning" },
    { value: "final", label: "On final written warning" },
    { value: "multiple", label: "Multiple prior incidents" },
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

      const res = await fetch("/api/consultant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `Generate State Workforce Commission-compliant HR documentation for a restaurant employee issue.

ISSUE TYPE: ${issueLabel}
EMPLOYEE NAME: ${employeeName || "[Employee Name]"}
EMPLOYEE ROLE: ${employeeRole || "[Position]"}
INCIDENT DATE: ${incidentDate || "[Date]"}

WHAT HAPPENED:
${description}

PRIOR DISCIPLINE HISTORY: ${priorLabel}
EMPLOYEE WAS AWARE OF POLICY: ${policyAware === "yes" ? "Yes" : "No/Unclear"}

Based on progressive discipline principles and Workforce Commission standards, generate a compliant HR document.

First, determine the appropriate documentation level:
- Documented Coaching (first occurrence, minor issue)
- Written Warning (repeated issue or moderate severity)
- Final Written Warning (pattern of behavior or serious issue)
- Performance Improvement Plan (ongoing performance failure)
- Termination Documentation (policy warrants immediate termination or final warning violated)

Then produce a complete document with these sections:

---
[DOCUMENT TYPE: Coaching Memo / Written Warning / Final Written Warning / etc.]

DATE: ${incidentDate || "[Date]"}
EMPLOYEE: ${employeeName || "[Employee Name]"}
POSITION: ${employeeRole || "[Position]"}

STATEMENT OF FACTS:
[Objective description - who, what, when, where. No opinions or emotional language.]

POLICY/STANDARD VIOLATED:
[Specific policy or expectation that was not met]

PRIOR COMMUNICATION OF EXPECTATIONS:
[How/when employee was made aware of this standard]

PRIOR DISCIPLINE (if applicable):
[Reference any prior coaching or warnings]

IMPACT:
[How this affected operations, guests, team, or safety]

REQUIRED CORRECTIVE ACTION:
[Specific, measurable actions the employee must take]

CONSEQUENCES FOR FAILURE TO IMPROVE:
[Clear statement of what happens if behavior continues]

EMPLOYEE ACKNOWLEDGMENT:
[ ] I have read and understand this document
[ ] I understand that failure to improve may result in further discipline up to and including termination

Employee Signature: _________________ Date: _______
Manager Signature: _________________ Date: _______
---

AT-WILL STATEMENT:
[Standard at-will employment language]

NOTES FOR MANAGER:
[Any additional guidance on follow-up, documentation retention, or next steps]

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
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap font-mono text-sm">
                {documentation}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={copyToClipboard} data-testid="btn-copy-hr-doc">
              <Copy className="h-4 w-4 mr-2" />
              Copy Documentation
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
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

            <div>
              <Label htmlFor="currentStaff">Current Scheduled Staff</Label>
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
  const { toast } = useToast();
  const [role, setRole] = useState<string>("server");
  const [phase, setPhase] = useState<string>("certify");
  const [scenario, setScenario] = useState<string>("");
  const [traineeResponse, setTraineeResponse] = useState<string>("");
  const [evaluation, setEvaluation] = useState<string>("");
  const [isGeneratingScenario, setIsGeneratingScenario] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [currentStep, setCurrentStep] = useState<"setup" | "scenario" | "response" | "result">("setup");

  const roles = [
    { value: "server", label: "Server" },
    { value: "bartender", label: "Bartender" },
    { value: "host", label: "Host" },
    { value: "food-runner", label: "Food Runner" },
    { value: "busser", label: "Busser" },
    { value: "line-cook", label: "Line Cook" },
    { value: "prep-cook", label: "Prep Cook" },
    { value: "kitchen-manager", label: "Kitchen Manager" },
    { value: "shift-lead", label: "Shift Lead" },
  ];

  const phases = [
    { value: "shadow", label: "Shadow Phase", description: "Learning by observation - knowledge check" },
    { value: "perform", label: "Perform Phase", description: "Guided practice - can execute with support" },
    { value: "certify", label: "Certify Phase", description: "Independent execution - pressure test" },
  ];

  const generateScenario = async () => {
    setIsGeneratingScenario(true);
    setScenario("");
    setTraineeResponse("");
    setEvaluation("");

    try {
      const roleLabel = roles.find(r => r.value === role)?.label || role;
      const phaseInfo = phases.find(p => p.value === phase);

      const res = await fetch("/api/consultant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `Generate a realistic restaurant certification scenario for skills testing.

ROLE: ${roleLabel}
CERTIFICATION PHASE: ${phaseInfo?.label} (${phaseInfo?.description})

Based on the Shadow → Perform → Certify training model:
- SHADOW: Test knowledge/observation ("What should happen when...")
- PERFORM: Test execution with guidance ("Walk me through how you would...")
- CERTIFY: Pressure test - real situation, real stakes ("You're in the middle of a Friday rush and...")

Generate ONE specific, pressure-testing scenario appropriate for this role and phase. Make it:
1. Realistic and specific (use actual times, table numbers, guest counts)
2. Include a problem or challenge the trainee must handle
3. For CERTIFY phase: Add time pressure and multiple competing priorities
4. End with a direct question to the trainee about what they would do

Format as:
SCENARIO: [The situation description]

QUESTION: [Direct question to the trainee - start with "What do you do?" or similar]

Keep it concise but specific. This is a real certification test, not a hypothetical discussion.`,
        }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to generate scenario");

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
                setScenario(content);
              }
            } catch {}
          }
        }
        setCurrentStep("scenario");
      }
    } catch (err) {
      toast({ title: "Failed to generate scenario", variant: "destructive" });
    } finally {
      setIsGeneratingScenario(false);
    }
  };

  const evaluateResponse = async () => {
    if (!traineeResponse.trim()) {
      toast({ title: "Please enter the trainee's response", variant: "destructive" });
      return;
    }

    setIsEvaluating(true);
    setEvaluation("");

    try {
      const roleLabel = roles.find(r => r.value === role)?.label || role;
      const phaseInfo = phases.find(p => p.value === phase);

      const res = await fetch("/api/consultant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `Evaluate this trainee's response to a certification scenario. Be specific and actionable.

ROLE: ${roleLabel}
CERTIFICATION PHASE: ${phaseInfo?.label}

SCENARIO PRESENTED:
${scenario}

TRAINEE'S RESPONSE:
"${traineeResponse}"

Evaluate against these restaurant service standards:
- Immediate acknowledgment (no delays)
- No excuse language ("We're busy" / "It's not my fault")
- Guest-first language and empathy
- Correct escalation awareness (knowing when to get a manager)
- Staying within comp authority limits
- Proper timing and urgency
- Following standard scripts and procedures

Provide a structured evaluation:

RESULT: [PASS / CONDITIONAL PASS / FAIL]

STANDARDS MET:
✅ [List specific standards they demonstrated correctly]

STANDARDS MISSED:
❌ [List specific gaps - be concrete about what was wrong]

REQUIRED RETRAINING: [If CONDITIONAL or FAIL]
🔁 [Specific skills/scripts to review]

MANAGER SIGN-OFF CHECKLIST:
☐ [If PASS: items manager should verify before final certification]
☐ [If FAIL: items to complete before re-testing]

FEEDBACK FOR TRAINEE:
[2-3 sentences of direct, constructive feedback they can use immediately]

Be rigorous but fair. This is pressure testing, not theory.`,
        }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to evaluate response");

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
                setEvaluation(content);
              }
            } catch {}
          }
        }
        setCurrentStep("result");
      }
    } catch (err) {
      toast({ title: "Failed to evaluate response", variant: "destructive" });
    } finally {
      setIsEvaluating(false);
    }
  };

  const resetTest = () => {
    setScenario("");
    setTraineeResponse("");
    setEvaluation("");
    setCurrentStep("setup");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!" });
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Skills Certification Engine
        </CardTitle>
        <CardDescription>
          Certify readiness based on behavior, not completion. Simulate real service situations and evaluate against your standards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Setup Phase */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="certRole">Role Being Certified</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="certRole" className="mt-1" data-testid="select-cert-role">
                <SelectValue placeholder="Select role..." />
              </SelectTrigger>
              <SelectContent>
                {roles.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="certPhase">Certification Phase</Label>
            <Select value={phase} onValueChange={setPhase}>
              <SelectTrigger id="certPhase" className="mt-1" data-testid="select-cert-phase">
                <SelectValue placeholder="Select phase..." />
              </SelectTrigger>
              <SelectContent>
                {phases.map(p => (
                  <SelectItem key={p.value} value={p.value}>
                    <span className="font-medium">{p.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {phases.find(p => p.value === phase)?.description}
            </p>
          </div>
        </div>

        {/* Generate Scenario Button */}
        {currentStep === "setup" && (
          <Button 
            onClick={generateScenario} 
            disabled={isGeneratingScenario}
            className="w-full"
            data-testid="btn-generate-scenario"
          >
            {isGeneratingScenario ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating pressure test scenario...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Certification Scenario
              </>
            )}
          </Button>
        )}

        {/* Scenario Display */}
        {scenario && (
          <div className="space-y-4">
            <div className="p-4 bg-accent/50 rounded-lg border-l-4 border-primary">
              <div className="flex justify-between items-start mb-2">
                <Badge variant="secondary">
                  {phases.find(p => p.value === phase)?.label} Test
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(scenario)}
                  data-testid="btn-copy-scenario"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {scenario}
              </div>
            </div>

            {/* Trainee Response Input */}
            {currentStep === "scenario" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="traineeResponse">Trainee's Response</Label>
                  <Textarea
                    id="traineeResponse"
                    placeholder="Enter exactly what the trainee said or would say in this situation..."
                    className="mt-1 min-h-[120px]"
                    value={traineeResponse}
                    onChange={(e) => setTraineeResponse(e.target.value)}
                    data-testid="input-trainee-response"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Record their actual words and actions, not a summary
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={evaluateResponse} 
                    disabled={isEvaluating || !traineeResponse.trim()}
                    className="flex-1"
                    data-testid="btn-evaluate-response"
                  >
                    {isEvaluating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Evaluating against standards...
                      </>
                    ) : (
                      <>
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Evaluate Response
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={resetTest} data-testid="btn-reset-test">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Evaluation Result */}
        {evaluation && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <Badge variant="outline">Certification Evaluation</Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(evaluation)}
                  data-testid="btn-copy-evaluation"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {evaluation}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={generateScenario} disabled={isGeneratingScenario} className="flex-1" data-testid="btn-new-scenario">
                <Sparkles className="h-4 w-4 mr-2" />
                New Scenario
              </Button>
              <Button variant="outline" onClick={resetTest} data-testid="btn-start-over">
                <RefreshCw className="h-4 w-4 mr-2" />
                Start Over
              </Button>
            </div>
          </div>
        )}
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

function DailyTaskReminder() {
  const { toast } = useToast();
  const { permissions } = useRole();
  const [tasks, setTasks] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string>("");
  const [staffMessage, setStaffMessage] = useState<string>("");
  const [isGeneratingStaffMessage, setIsGeneratingStaffMessage] = useState(false);

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

const CRISIS_TYPES = [
  { id: "kitchen_backed_up", label: "Kitchen backed up / ticket times blown", icon: Clock },
  { id: "guests_angry", label: "Guests angry / multiple complaints", icon: MessageSquare },
  { id: "staff_conflict", label: "Staff conflict or panic", icon: Users },
  { id: "walkout", label: "Walkout or call-off mid-shift", icon: AlertTriangle },
  { id: "system_failure", label: "POS / system failure", icon: AlertTriangle },
  { id: "owner_overwhelmed", label: "Owner or manager overwhelmed", icon: AlertTriangle },
];

function CrisisResponseEngine() {
  const { toast } = useToast();
  const [selectedCrises, setSelectedCrises] = useState<string[]>([]);
  const [otherDescription, setOtherDescription] = useState<string>("");
  const [additionalContext, setAdditionalContext] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState<"intake" | "response">("intake");

  const toggleCrisis = (id: string) => {
    setSelectedCrises(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const getCrisisResponse = async () => {
    if (selectedCrises.length === 0 && !otherDescription.trim()) {
      toast({ title: "Please select what's happening", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setResponse("");
    setStep("response");

    const crisisLabels = selectedCrises.map(id => 
      CRISIS_TYPES.find(c => c.id === id)?.label
    ).filter(Boolean);

    const prompt = `You are an elite restaurant crisis response AI. You follow military-grade protocols adapted from luxury hospitality incident playbooks and airline cockpit crisis procedures.

A manager just reported the following crisis situation:

ACTIVE ISSUES:
${crisisLabels.map(l => `• ${l}`).join('\n')}
${otherDescription ? `• Other: ${otherDescription}` : ''}

${additionalContext ? `ADDITIONAL CONTEXT:\n${additionalContext}` : ''}

RESPOND IN THIS EXACT STRUCTURE AND ORDER:

═══════════════════════════════════════════
1. NAME THE MOMENT
═══════════════════════════════════════════

Start with: "Understood. You are in recovery mode. We're stabilizing first, then fixing."

Then provide ONE calming statement that tells them they are executing a plan, not failing.

═══════════════════════════════════════════
2. TAKE COMMAND
═══════════════════════════════════════════

Start with: "One person must take control right now."

Then issue 2-3 direct instructions. No options. No debate. Examples:
• "You are running expo. Nothing plates without your call."
• "Pause seating immediately."
• "Reduce menu complexity if needed."

═══════════════════════════════════════════
3. CONTAIN THE DAMAGE
═══════════════════════════════════════════

Ask ONE critical containment question, then provide IF YES and IF NO responses.

Example: "Can current staff absorb this volume if seating pauses for 15 minutes?"
• IF YES: "Proceed. Do not reopen sections until ticket flow stabilizes."
• IF NO: "Close sections. Combine tables. Communicate the adjustment now."

═══════════════════════════════════════════
4. GUEST COMMUNICATION SCRIPT
═══════════════════════════════════════════

Provide EXACT language to use with guests (not guidance):

Primary script: "We hit an unexpected rush and are slightly behind. I'm personally tracking your order and will update you before you have to ask."

If anger escalates: "Thank you for your patience. We value your time, and I'm making this right."

═══════════════════════════════════════════
5. STAFF STABILIZATION
═══════════════════════════════════════════

Provide leadership behavior prompts:
• "Speak calmly. Short instructions only. No side conversations."
${selectedCrises.includes('walkout') ? `
WALKOUT PROTOCOL:
• "Do not chase. Reassign sections. Thank remaining staff out loud."
• This is disruptive — not catastrophic. Adjust coverage now.` : ''}
${selectedCrises.includes('owner_overwhelmed') ? `
OWNER OVERWHELM PROTOCOL:
• "You are not the emergency. The system is."
• Delegate one decision immediately
• Focus on guest-facing stability only` : ''}

═══════════════════════════════════════════
6. RECOVERY ACTIONS
═══════════════════════════════════════════

"Has ticket flow returned to manageable pace?"

IF YES:
• Touch all affected tables
• Comp strategically, not emotionally
• Thank guests for patience

IF NO:
• Maintain containment
• Do not reopen sections
• Maintain communication cadence every 10 minutes

═══════════════════════════════════════════
7. POST-SHIFT DEBRIEF
═══════════════════════════════════════════

End with: "After service, document this incident. Answer these exactly:"

• What broke first?
• Why did it break?
• What system failed?
• What change prevents recurrence?

"If it's not written down, it will happen again."

═══════════════════════════════════════════
FINAL MESSAGE
═══════════════════════════════════════════

"Crisis handled. Stability restored or contained.
Debrief after service. Systems improve tomorrow."

SAFETY RULES - NEVER:
• Assign blame
• Suggest yelling, threats, or discipline during service
• Recommend chasing staff
• Encourage public arguments
• Escalate emotionally

ALWAYS:
• Default to containment
• Protect guest perception
• Preserve staff dignity
• Reinforce leadership authority`;

    try {
      const res = await fetch("/api/consultant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to get crisis response");

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
      toast({ title: "Failed to get crisis response", variant: "destructive" });
      setStep("intake");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(response);
    toast({ title: "Copied to clipboard!" });
  };

  const resetIntake = () => {
    setStep("intake");
    setResponse("");
    setSelectedCrises([]);
    setOtherDescription("");
    setAdditionalContext("");
  };

  return (
    <Card className="mb-8 border-destructive/30">
      <CardHeader className="bg-destructive/5">
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Shield className="h-5 w-5" />
          Crisis Response Command Center
        </CardTitle>
        <CardDescription>
          Control the moment. Protect the system. Get immediate crisis playbook guidance.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {step === "intake" ? (
          <>
            <div>
              <Label className="text-base font-semibold">What's happening right now?</Label>
              <p className="text-sm text-muted-foreground mb-3">Select all that apply</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {CRISIS_TYPES.map((crisis) => {
                  const isSelected = selectedCrises.includes(crisis.id);
                  return (
                    <Button
                      key={crisis.id}
                      type="button"
                      variant={isSelected ? "destructive" : "outline"}
                      onClick={() => toggleCrisis(crisis.id)}
                      className="flex items-center justify-start gap-3 h-auto py-3 text-left"
                      data-testid={`crisis-option-${crisis.id}`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-destructive-foreground bg-destructive-foreground/20' : 'border-muted-foreground'
                      }`}>
                        {isSelected && <CheckSquare className="h-3 w-3" />}
                      </div>
                      <crisis.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">{crisis.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="otherDescription">Other (describe in one sentence)</Label>
              <Input
                id="otherDescription"
                placeholder="e.g., Health inspector arrived unexpectedly..."
                className="mt-1"
                value={otherDescription}
                onChange={(e) => setOtherDescription(e.target.value)}
                data-testid="input-other-crisis"
              />
            </div>

            <div>
              <Label htmlFor="additionalContext">Additional context (optional)</Label>
              <Textarea
                id="additionalContext"
                placeholder="Any other details that would help... How long has this been going on? What have you tried?"
                className="mt-1 min-h-[80px]"
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                data-testid="textarea-crisis-context"
              />
            </div>

            <Button 
              onClick={getCrisisResponse} 
              disabled={isGenerating || (selectedCrises.length === 0 && !otherDescription.trim())}
              variant="destructive"
              className="w-full"
              data-testid="btn-get-crisis-response"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Crisis Protocol...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Get Crisis Response Protocol
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={resetIntake} data-testid="btn-new-crisis">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  New Crisis
                </Button>
              </div>
              {response && (
                <Button variant="outline" size="sm" onClick={copyToClipboard} data-testid="btn-copy-crisis-response">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              )}
            </div>

            {isGenerating && !response && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-destructive" />
              </div>
            )}

            {response && (
              <div className="p-4 bg-accent/50 rounded-lg whitespace-pre-wrap text-sm font-mono border border-destructive/20">
                {response}
              </div>
            )}
          </>
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
            <div className="flex items-center justify-between">
              <Label>Generated {mode === "capture" ? "SOP" : mode === "checklist" ? "Checklist" : "Audit Report"}</Label>
              <Button variant="outline" size="sm" onClick={copyToClipboard} data-testid="btn-copy-sop">
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
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
  const [mode, setMode] = useState<"breakdown" | "pm" | "log">("breakdown");
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
        <Tabs value={mode} onValueChange={(v) => { setMode(v as "breakdown" | "pm" | "log"); clearForm(); }}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="breakdown" data-testid="tab-breakdown">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Breakdown
            </TabsTrigger>
            <TabsTrigger value="pm" data-testid="tab-pm">
              <Calendar className="h-4 w-4 mr-2" />
              PM Schedule
            </TabsTrigger>
            <TabsTrigger value="log" data-testid="tab-log">
              <FileOutput className="h-4 w-4 mr-2" />
              Equipment Log
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
        </Tabs>

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

        {/* Kitchen Compliance Engine - only show for kitchen domain */}
        {slug === "kitchen" && <KitchenComplianceEngine />}

        {/* SOP Capture Engine - only show for sops domain */}
        {slug === "sops" && <SOPCaptureEngine />}

        {/* Crisis Response Engine - only show for crisis domain */}
        {slug === "crisis" && <CrisisResponseEngine />}

        {/* Facility Command Center - only show for facilities domain */}
        {slug === "facilities" && <FacilityCommandCenter />}

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
