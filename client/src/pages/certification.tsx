import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Sparkles,
  Settings,
  ClipboardCheck,
  BarChart3,
  Loader2,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
  Award,
  ShieldAlert,
  MessageSquare,
  ChevronRight,
  FileText,
  Zap,
  Eye,
  GraduationCap,
} from "lucide-react";
import type { RestaurantStandards, CertificationAttempt } from "@shared/schema";

const DEFAULT_STANDARDS = {
  servicePhilosophy: "Warm, fast, professional service. Never argue with guests. Every interaction should make them feel valued.",
  stepsOfService: {
    greetingTiming: "30 seconds",
    checkBackTiming: "2 minutes after food delivery",
    preBusExpectations: "Clear plates within 1 minute of guest finishing",
    paymentFlow: "Present check within 2 minutes of request, process payment within 1 minute",
  },
  speedTargets: {
    drinks: "3 minutes",
    appetizers: "8 minutes",
    entrees: "15 minutes",
  },
  recoveryFramework: {
    method: "ROAR",
    steps: ["Recognize the issue immediately", "Own the problem personally", "Act to fix it now", "Report to manager and follow up"],
  },
  alcoholPolicy: {
    idRules: "ID everyone who appears under 35",
    maxDrinksAtOnce: "2 drinks per person at a time",
    cutOffRules: "Cut off after signs of intoxication - slurred speech, unsteady, aggressive",
    managerEscalation: "Always involve manager for cut-off situations",
  },
  safetyRules: [
    "Danger zone: Keep hot food above 140°F, cold food below 40°F",
    "Raw chicken always on bottom shelf",
    "Wash hands after touching raw proteins",
    "Clean and sanitize cutting boards between proteins",
    "Check expiration dates daily",
    "Report broken equipment immediately",
    "Wet floor signs always deployed",
    "Allergen cross-contamination awareness",
    "FIFO (First In, First Out) rotation",
    "No bare-hand contact with ready-to-eat food",
  ],
  criticalErrors: [
    "Fails to address food safety issue (allergen, temperature violation)",
    "Serves alcohol to visibly intoxicated guest",
    "Ignores allergy warning or cross-contamination risk",
    "Argues with guest or uses hostile/aggressive language",
    "Suggests falsifying tips, time records, or any documentation",
    "Leaves service floor unattended during active service",
    "Fails to escalate when manager involvement is required",
  ],
  rubricWeights: {
    prioritization: 25,
    guestCommunication: 25,
    recovery: 20,
    policyCompliance: 20,
    professionalism: 10,
  },
};

const ROLES = [
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

const PHASES = [
  { value: "shadow", label: "Shadow Phase", description: "Knowledge + judgment scenarios. Lower difficulty, more guidance." },
  { value: "perform", label: "Perform Phase", description: "Less guidance, more complexity. Adds interruptions and stricter scoring." },
  { value: "certify", label: "Certify Phase", description: "Must demonstrate perfect compliance. Randomized, high-pressure." },
];

function StandardsEditor() {
  const { toast } = useToast();
  const [name, setName] = useState("My Restaurant Standards");
  const [philosophy, setPhilosophy] = useState(DEFAULT_STANDARDS.servicePhilosophy);
  const [greetingTiming, setGreetingTiming] = useState(DEFAULT_STANDARDS.stepsOfService.greetingTiming);
  const [checkBackTiming, setCheckBackTiming] = useState(DEFAULT_STANDARDS.stepsOfService.checkBackTiming);
  const [preBus, setPreBus] = useState(DEFAULT_STANDARDS.stepsOfService.preBusExpectations);
  const [paymentFlow, setPaymentFlow] = useState(DEFAULT_STANDARDS.stepsOfService.paymentFlow);
  const [drinkTarget, setDrinkTarget] = useState(DEFAULT_STANDARDS.speedTargets.drinks);
  const [appTarget, setAppTarget] = useState(DEFAULT_STANDARDS.speedTargets.appetizers);
  const [entreeTarget, setEntreeTarget] = useState(DEFAULT_STANDARDS.speedTargets.entrees);
  const [recoveryMethod, setRecoveryMethod] = useState(DEFAULT_STANDARDS.recoveryFramework.method);
  const [recoverySteps, setRecoverySteps] = useState(DEFAULT_STANDARDS.recoveryFramework.steps.join("\n"));
  const [idRules, setIdRules] = useState(DEFAULT_STANDARDS.alcoholPolicy.idRules);
  const [maxDrinks, setMaxDrinks] = useState(DEFAULT_STANDARDS.alcoholPolicy.maxDrinksAtOnce);
  const [cutOff, setCutOff] = useState(DEFAULT_STANDARDS.alcoholPolicy.cutOffRules);
  const [escalation, setEscalation] = useState(DEFAULT_STANDARDS.alcoholPolicy.managerEscalation);
  const [safetyRules, setSafetyRules] = useState(DEFAULT_STANDARDS.safetyRules.join("\n"));
  const [criticalErrors, setCriticalErrors] = useState(DEFAULT_STANDARDS.criticalErrors.join("\n"));
  const [passThreshold, setPassThreshold] = useState(85);
  const [prioritizationWeight, setPrioritizationWeight] = useState(25);
  const [communicationWeight, setCommunicationWeight] = useState(25);
  const [recoveryWeight, setRecoveryWeight] = useState(20);
  const [complianceWeight, setComplianceWeight] = useState(20);
  const [professionalismWeight, setProfessionalismWeight] = useState(10);

  const { data: existingStandards, isLoading: loadingStandards } = useQuery<RestaurantStandards[]>({
    queryKey: ["/api/standards"],
  });

  const { data: activeStandards } = useQuery<RestaurantStandards>({
    queryKey: ["/api/standards/active"],
  });

  useEffect(() => {
    if (activeStandards) {
      setName(activeStandards.name);
      setPhilosophy((activeStandards.servicePhilosophy as string) || "");
      setPassThreshold(activeStandards.passThreshold);
      const sos = activeStandards.stepsOfService as any;
      if (sos) {
        setGreetingTiming(sos.greetingTiming || "");
        setCheckBackTiming(sos.checkBackTiming || "");
        setPreBus(sos.preBusExpectations || "");
        setPaymentFlow(sos.paymentFlow || "");
      }
      const st = activeStandards.speedTargets as any;
      if (st) {
        setDrinkTarget(st.drinks || "");
        setAppTarget(st.appetizers || "");
        setEntreeTarget(st.entrees || "");
      }
      const rf = activeStandards.recoveryFramework as any;
      if (rf) {
        setRecoveryMethod(rf.method || "");
        setRecoverySteps((rf.steps || []).join("\n"));
      }
      const ap = activeStandards.alcoholPolicy as any;
      if (ap) {
        setIdRules(ap.idRules || "");
        setMaxDrinks(ap.maxDrinksAtOnce || "");
        setCutOff(ap.cutOffRules || "");
        setEscalation(ap.managerEscalation || "");
      }
      const sr = activeStandards.safetyRules as any;
      if (Array.isArray(sr)) setSafetyRules(sr.join("\n"));
      const ce = activeStandards.criticalErrors as any;
      if (Array.isArray(ce)) setCriticalErrors(ce.join("\n"));
      const rw = activeStandards.rubricWeights as any;
      if (rw) {
        setPrioritizationWeight(rw.prioritization || 25);
        setCommunicationWeight(rw.guestCommunication || 25);
        setRecoveryWeight(rw.recovery || 20);
        setComplianceWeight(rw.policyCompliance || 20);
        setProfessionalismWeight(rw.professionalism || 10);
      }
    }
  }, [activeStandards]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        servicePhilosophy: philosophy,
        stepsOfService: { greetingTiming, checkBackTiming, preBusExpectations: preBus, paymentFlow },
        speedTargets: { drinks: drinkTarget, appetizers: appTarget, entrees: entreeTarget },
        recoveryFramework: { method: recoveryMethod, steps: recoverySteps.split("\n").filter(Boolean) },
        alcoholPolicy: { idRules, maxDrinksAtOnce: maxDrinks, cutOffRules: cutOff, managerEscalation: escalation },
        safetyRules: safetyRules.split("\n").filter(Boolean),
        criticalErrors: criticalErrors.split("\n").filter(Boolean),
        rubricWeights: {
          prioritization: prioritizationWeight,
          guestCommunication: communicationWeight,
          recovery: recoveryWeight,
          policyCompliance: complianceWeight,
          professionalism: professionalismWeight,
        },
        passThreshold,
        isActive: true,
      };

      if (activeStandards) {
        return apiRequest("PUT", `/api/standards/${activeStandards.id}`, payload);
      } else {
        return apiRequest("POST", "/api/standards", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/standards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/standards/active"] });
      toast({ title: "Standards saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save standards", variant: "destructive" });
    },
  });

  const loadDefaults = () => {
    setPhilosophy(DEFAULT_STANDARDS.servicePhilosophy);
    setGreetingTiming(DEFAULT_STANDARDS.stepsOfService.greetingTiming);
    setCheckBackTiming(DEFAULT_STANDARDS.stepsOfService.checkBackTiming);
    setPreBus(DEFAULT_STANDARDS.stepsOfService.preBusExpectations);
    setPaymentFlow(DEFAULT_STANDARDS.stepsOfService.paymentFlow);
    setDrinkTarget(DEFAULT_STANDARDS.speedTargets.drinks);
    setAppTarget(DEFAULT_STANDARDS.speedTargets.appetizers);
    setEntreeTarget(DEFAULT_STANDARDS.speedTargets.entrees);
    setRecoveryMethod(DEFAULT_STANDARDS.recoveryFramework.method);
    setRecoverySteps(DEFAULT_STANDARDS.recoveryFramework.steps.join("\n"));
    setIdRules(DEFAULT_STANDARDS.alcoholPolicy.idRules);
    setMaxDrinks(DEFAULT_STANDARDS.alcoholPolicy.maxDrinksAtOnce);
    setCutOff(DEFAULT_STANDARDS.alcoholPolicy.cutOffRules);
    setEscalation(DEFAULT_STANDARDS.alcoholPolicy.managerEscalation);
    setSafetyRules(DEFAULT_STANDARDS.safetyRules.join("\n"));
    setCriticalErrors(DEFAULT_STANDARDS.criticalErrors.join("\n"));
    setPrioritizationWeight(25);
    setCommunicationWeight(25);
    setRecoveryWeight(20);
    setComplianceWeight(20);
    setProfessionalismWeight(10);
    setPassThreshold(85);
    toast({ title: "Default template loaded" });
  };

  const totalWeight = prioritizationWeight + communicationWeight + recoveryWeight + complianceWeight + professionalismWeight;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-standards-title">Restaurant Standards</h2>
          <p className="text-sm text-muted-foreground">Configure the standards your staff will be tested against</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={loadDefaults} data-testid="btn-load-defaults">
            <FileText className="h-4 w-4 mr-2" />
            Load Default Template
          </Button>
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="btn-save-standards">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Standards
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="standardsName">Standards Name</Label>
          <Input id="standardsName" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" data-testid="input-standards-name" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Service Philosophy</CardTitle>
          <CardDescription>Your restaurant's core service values in one or two sentences</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea value={philosophy} onChange={(e) => setPhilosophy(e.target.value)} className="min-h-[80px]" data-testid="input-philosophy" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Steps of Service</CardTitle>
          <CardDescription>Define your expected service timing and flow</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Greeting Timing</Label>
              <Input value={greetingTiming} onChange={(e) => setGreetingTiming(e.target.value)} className="mt-1" data-testid="input-greeting-timing" />
            </div>
            <div>
              <Label>Check-Back Timing</Label>
              <Input value={checkBackTiming} onChange={(e) => setCheckBackTiming(e.target.value)} className="mt-1" data-testid="input-checkback-timing" />
            </div>
            <div>
              <Label>Pre-Bus Expectations</Label>
              <Input value={preBus} onChange={(e) => setPreBus(e.target.value)} className="mt-1" data-testid="input-prebus" />
            </div>
            <div>
              <Label>Payment Flow</Label>
              <Input value={paymentFlow} onChange={(e) => setPaymentFlow(e.target.value)} className="mt-1" data-testid="input-payment-flow" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Speed Targets</CardTitle>
          <CardDescription>Maximum time from order to delivery</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Drinks</Label>
              <Input value={drinkTarget} onChange={(e) => setDrinkTarget(e.target.value)} className="mt-1" data-testid="input-drink-target" />
            </div>
            <div>
              <Label>Appetizers</Label>
              <Input value={appTarget} onChange={(e) => setAppTarget(e.target.value)} className="mt-1" data-testid="input-app-target" />
            </div>
            <div>
              <Label>Entrees</Label>
              <Input value={entreeTarget} onChange={(e) => setEntreeTarget(e.target.value)} className="mt-1" data-testid="input-entree-target" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recovery Framework</CardTitle>
          <CardDescription>How staff should handle guest complaints and service failures</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Method Name (e.g., ROAR, HEAR, LEAD)</Label>
            <Input value={recoveryMethod} onChange={(e) => setRecoveryMethod(e.target.value)} className="mt-1" data-testid="input-recovery-method" />
          </div>
          <div>
            <Label>Steps (one per line)</Label>
            <Textarea value={recoverySteps} onChange={(e) => setRecoverySteps(e.target.value)} className="mt-1 min-h-[100px]" data-testid="input-recovery-steps" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alcohol Policy</CardTitle>
          <CardDescription>ID requirements, serving limits, and cut-off procedures</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>ID Rules</Label>
              <Input value={idRules} onChange={(e) => setIdRules(e.target.value)} className="mt-1" data-testid="input-id-rules" />
            </div>
            <div>
              <Label>Max Drinks at Once</Label>
              <Input value={maxDrinks} onChange={(e) => setMaxDrinks(e.target.value)} className="mt-1" data-testid="input-max-drinks" />
            </div>
            <div>
              <Label>Cut-Off Rules</Label>
              <Input value={cutOff} onChange={(e) => setCutOff(e.target.value)} className="mt-1" data-testid="input-cutoff-rules" />
            </div>
            <div>
              <Label>Manager Escalation</Label>
              <Input value={escalation} onChange={(e) => setEscalation(e.target.value)} className="mt-1" data-testid="input-escalation" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Safety & Sanitation Rules</CardTitle>
          <CardDescription>One rule per line - your top enforced safety standards</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea value={safetyRules} onChange={(e) => setSafetyRules(e.target.value)} className="min-h-[150px]" data-testid="input-safety-rules" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            Critical Errors (Auto-Fail)
          </CardTitle>
          <CardDescription>If a trainee commits any of these, they automatically fail regardless of score. One per line.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea value={criticalErrors} onChange={(e) => setCriticalErrors(e.target.value)} className="min-h-[120px]" data-testid="input-critical-errors" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scoring Rubric Weights</CardTitle>
          <CardDescription>
            Adjust how much each category counts toward the total score (must total 100). 
            Current total: <span className={totalWeight === 100 ? "text-green-600 font-bold" : "text-destructive font-bold"}>{totalWeight}/100</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label>Prioritization & Triage</Label>
              <Input type="number" min={0} max={100} value={prioritizationWeight} onChange={(e) => setPrioritizationWeight(Number(e.target.value))} className="mt-1" data-testid="input-weight-prioritization" />
            </div>
            <div>
              <Label>Guest Communication</Label>
              <Input type="number" min={0} max={100} value={communicationWeight} onChange={(e) => setCommunicationWeight(Number(e.target.value))} className="mt-1" data-testid="input-weight-communication" />
            </div>
            <div>
              <Label>Recovery & Escalation</Label>
              <Input type="number" min={0} max={100} value={recoveryWeight} onChange={(e) => setRecoveryWeight(Number(e.target.value))} className="mt-1" data-testid="input-weight-recovery" />
            </div>
            <div>
              <Label>Policy & Safety Compliance</Label>
              <Input type="number" min={0} max={100} value={complianceWeight} onChange={(e) => setComplianceWeight(Number(e.target.value))} className="mt-1" data-testid="input-weight-compliance" />
            </div>
            <div>
              <Label>Professionalism & Brand Fit</Label>
              <Input type="number" min={0} max={100} value={professionalismWeight} onChange={(e) => setProfessionalismWeight(Number(e.target.value))} className="mt-1" data-testid="input-weight-professionalism" />
            </div>
          </div>
          <div>
            <Label>Pass Threshold (score needed to pass)</Label>
            <div className="flex items-center gap-3 mt-1">
              <Input type="number" min={0} max={100} value={passThreshold} onChange={(e) => setPassThreshold(Number(e.target.value))} className="w-24" data-testid="input-pass-threshold" />
              <span className="text-sm text-muted-foreground">out of 100</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || totalWeight !== 100} className="w-full" data-testid="btn-save-standards-bottom">
        {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        {totalWeight !== 100 ? `Weights must total 100 (currently ${totalWeight})` : "Save Standards"}
      </Button>
    </div>
  );
}

function CertificationTest() {
  const { toast } = useToast();
  const [role, setRole] = useState("server");
  const [phase, setPhase] = useState("shadow");
  const [traineeName, setTraineeName] = useState("");
  const [scenario, setScenario] = useState("");
  const [traineeDo, setTraineeDo] = useState("");
  const [traineeSay, setTraineeSay] = useState("");
  const [evaluation, setEvaluation] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [currentStep, setCurrentStep] = useState<"setup" | "scenario" | "response" | "result">("setup");

  const { data: activeStandards } = useQuery<RestaurantStandards>({
    queryKey: ["/api/standards/active"],
  });

  const saveMutation = useMutation({
    mutationFn: async (evalResult: { totalScore: number; passed: boolean; hasCriticalError: boolean; criticalErrorDetails?: string }) => {
      return apiRequest("POST", "/api/certification/attempts", {
        standardsId: activeStandards?.id || null,
        traineeName: traineeName || "Anonymous",
        role,
        phase,
        scenarioJson: { text: scenario },
        traineeDo,
        traineeSay,
        evaluationJson: { text: evaluation },
        totalScore: evalResult.totalScore,
        passed: evalResult.passed,
        hasCriticalError: evalResult.hasCriticalError,
        criticalErrorDetails: evalResult.criticalErrorDetails || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/certification/attempts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/certification/attempts/stats"] });
      toast({ title: "Attempt saved to records" });
    },
  });

  const generateScenario = async () => {
    if (!traineeName.trim()) {
      toast({ title: "Please enter the trainee's name", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setScenario("");
    setTraineeDo("");
    setTraineeSay("");
    setEvaluation("");

    try {
      const body: any = { role, phase };
      if (activeStandards) body.standardsId = activeStandards.id;

      const res = await fetch("/api/certification/generate-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to generate scenario");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let content = "";

      if (reader) {
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
    } catch {
      toast({ title: "Failed to generate scenario", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const insertTemplate = () => {
    setTraineeDo("1. \n2. \n3. \n4. \n5. ");
    setTraineeSay("Table __: \"\"\n\nTable __: \"\"\n\nKitchen/Manager: \"\"");
  };

  const evaluateResponse = async () => {
    if (!traineeDo.trim() && !traineeSay.trim()) {
      toast({ title: "Please enter the trainee's DO and/or SAY response", variant: "destructive" });
      return;
    }

    setIsEvaluating(true);
    setEvaluation("");

    try {
      const body: any = {
        scenarioText: scenario,
        traineeDo,
        traineeSay,
        role,
        phase,
      };
      if (activeStandards) body.standardsId = activeStandards.id;

      const res = await fetch("/api/certification/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to evaluate");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let content = "";

      if (reader) {
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

        const scoreMatch = content.match(/TOTAL\s*(?:SCORE)?:?\s*(\d+)/i);
        const passMatch = content.match(/(?:RESULT|VERDICT|OVERALL):?\s*(PASS|FAIL|CONDITIONAL\s*PASS)/i);
        const critMatch = content.match(/CRITICAL\s*ERROR/i);

        const totalScore = scoreMatch ? parseInt(scoreMatch[1]) : 0;
        const passedText = passMatch ? passMatch[1].toUpperCase() : "";
        const passed = passedText === "PASS";
        const hasCriticalError = !!critMatch && content.match(/CRITICAL\s*ERROR.*?(?:YES|DETECTED|TRIGGERED|FOUND)/i) !== null;

        saveMutation.mutate({
          totalScore,
          passed,
          hasCriticalError,
          criticalErrorDetails: hasCriticalError ? "Critical error detected in evaluation" : undefined,
        });
      }
    } catch {
      toast({ title: "Failed to evaluate response", variant: "destructive" });
    } finally {
      setIsEvaluating(false);
    }
  };

  const resetTest = () => {
    setScenario("");
    setTraineeDo("");
    setTraineeSay("");
    setEvaluation("");
    setCurrentStep("setup");
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="space-y-6">
      {!activeStandards && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">No standards configured</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Go to the Standards tab to set up your restaurant's standards. Without them, generic industry defaults will be used.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeStandards && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          Using standards: <span className="font-medium text-foreground">{activeStandards.name}</span>
          <Badge variant="secondary">{activeStandards.passThreshold}+ to pass</Badge>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="traineeName">Trainee Name</Label>
            <Input
              id="traineeName"
              placeholder="Enter trainee's name..."
              value={traineeName}
              onChange={(e) => setTraineeName(e.target.value)}
              className="mt-1"
              data-testid="input-trainee-name"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Role Being Certified</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="mt-1" data-testid="select-cert-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Certification Phase</Label>
              <Select value={phase} onValueChange={setPhase}>
                <SelectTrigger className="mt-1" data-testid="select-cert-phase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHASES.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {PHASES.find(p => p.value === phase)?.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {currentStep === "setup" && (
        <Button
          onClick={generateScenario}
          disabled={isGenerating || !traineeName.trim()}
          className="w-full"
          data-testid="btn-generate-scenario"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating {PHASES.find(p => p.value === phase)?.label} scenario...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Certification Scenario
            </>
          )}
        </Button>
      )}

      {scenario && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">Scenario</CardTitle>
                <Badge variant="secondary">{PHASES.find(p => p.value === phase)?.label}</Badge>
                <Badge variant="outline">{ROLES.find(r => r.value === role)?.label}</Badge>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copyText(scenario)} data-testid="btn-copy-scenario">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
              {scenario}
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === "scenario" && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Trainee Response</CardTitle>
              <Button variant="outline" size="sm" onClick={insertTemplate} data-testid="btn-insert-template">
                <FileText className="h-4 w-4 mr-2" />
                Insert Template
              </Button>
            </div>
            <CardDescription>
              Split the response into what they DO (actions) and what they SAY (exact words)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-500" />
                What They DO (action steps, in order)
              </Label>
              <Textarea
                placeholder={"1. Walk to Table 12 immediately\n2. Apologize for the delay\n3. Check the kitchen on the missing appetizer\n4. Notify manager about the cold food..."}
                value={traineeDo}
                onChange={(e) => setTraineeDo(e.target.value)}
                className="mt-1 min-h-[120px]"
                data-testid="input-trainee-do"
              />
              <p className="text-xs text-muted-foreground mt-1">Step-by-step: what do they physically do, in what order?</p>
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-green-500" />
                What They SAY (verbatim, per table/person)
              </Label>
              <Textarea
                placeholder={'Table 12: "I apologize for the wait. Let me check on those right now."\n\nTable 15: "How is everything tasting?"\n\nManager: "Cold food at Table 12, can you come by?"'}
                value={traineeSay}
                onChange={(e) => setTraineeSay(e.target.value)}
                className="mt-1 min-h-[150px]"
                data-testid="input-trainee-say"
              />
              <p className="text-xs text-muted-foreground mt-1">Exact words, addressed to each table or person in the scenario</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={evaluateResponse}
                disabled={isEvaluating || (!traineeDo.trim() && !traineeSay.trim())}
                className="flex-1"
                data-testid="btn-evaluate"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Evaluating against rubric...
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    Evaluate Response
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={resetTest} data-testid="btn-reset-test">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {evaluation && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Certification Evaluation</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => copyText(evaluation)} data-testid="btn-copy-evaluation">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
              {evaluation}
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === "result" && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { resetTest(); }} className="flex-1" data-testid="btn-new-test">
            <RefreshCw className="h-4 w-4 mr-2" />
            New Test (Same Trainee)
          </Button>
          <Button variant="outline" onClick={() => { setTraineeName(""); resetTest(); }} data-testid="btn-new-trainee">
            <Users className="h-4 w-4 mr-2" />
            New Trainee
          </Button>
        </div>
      )}
    </div>
  );
}

function AttemptHistory() {
  const { data: attempts, isLoading } = useQuery<CertificationAttempt[]>({
    queryKey: ["/api/certification/attempts"],
  });

  const { data: stats } = useQuery<{
    totalAttempts: number;
    passed: number;
    failed: number;
    avgScore: number;
    byRole: Record<string, { attempts: number; passed: number; avgScore: number }>;
    byCategory: Record<string, number>;
  }>({
    queryKey: ["/api/certification/attempts/stats"],
  });

  const [selectedAttempt, setSelectedAttempt] = useState<CertificationAttempt | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {stats && stats.totalAttempts > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold" data-testid="text-total-attempts">{stats.totalAttempts}</div>
              <p className="text-xs text-muted-foreground">Total Tests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600" data-testid="text-passed-count">{stats.passed}</div>
              <p className="text-xs text-muted-foreground">Passed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-destructive" data-testid="text-failed-count">{stats.failed}</div>
              <p className="text-xs text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold" data-testid="text-avg-score">{stats.avgScore}</div>
              <p className="text-xs text-muted-foreground">Avg Score</p>
            </CardContent>
          </Card>
        </div>
      )}

      {stats && Object.keys(stats.byRole).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance by Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.byRole).map(([roleName, data]) => {
                const passRate = data.attempts > 0 ? Math.round((data.passed / data.attempts) * 100) : 0;
                return (
                  <div key={roleName} className="flex items-center gap-3">
                    <div className="w-28 text-sm font-medium capitalize">{roleName.replace("-", " ")}</div>
                    <div className="flex-1">
                      <Progress value={passRate} className="h-2" />
                    </div>
                    <div className="w-20 text-right text-xs text-muted-foreground">
                      {data.passed}/{data.attempts} ({passRate}%)
                    </div>
                    <Badge variant="secondary" className="text-xs">{data.avgScore} avg</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {stats && Object.keys(stats.byCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tests by Phase</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCategory).map(([phaseName, count]) => (
                <Badge key={phaseName} variant="outline" className="capitalize">
                  {phaseName}: {count as number}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Attempts</CardTitle>
        </CardHeader>
        <CardContent>
          {!attempts || attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No certification tests yet. Run your first test to see results here.</p>
          ) : (
            <div className="space-y-2">
              {attempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex flex-wrap items-center gap-2 p-3 rounded-lg border hover-elevate cursor-pointer"
                  onClick={() => setSelectedAttempt(selectedAttempt?.id === attempt.id ? null : attempt)}
                  data-testid={`attempt-row-${attempt.id}`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {attempt.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : attempt.hasCriticalError ? (
                      <ShieldAlert className="h-4 w-4 text-destructive flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    )}
                    <span className="font-medium text-sm truncate">{attempt.traineeName}</span>
                  </div>
                  <Badge variant="outline" className="capitalize text-xs">{attempt.role.replace("-", " ")}</Badge>
                  <Badge variant="secondary" className="capitalize text-xs">{attempt.phase}</Badge>
                  {attempt.totalScore !== null && (
                    <Badge variant={attempt.passed ? "default" : "destructive"} className="text-xs">
                      {attempt.totalScore}/100
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {attempt.createdAt ? new Date(attempt.createdAt).toLocaleDateString() : ""}
                  </span>
                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${selectedAttempt?.id === attempt.id ? "rotate-90" : ""}`} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedAttempt && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedAttempt.traineeName} - {ROLES.find(r => r.value === selectedAttempt.role)?.label} ({selectedAttempt.phase})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedAttempt.scenarioJson ? (
              <div>
                <Label className="text-xs text-muted-foreground">Scenario</Label>
                <div className="mt-1 text-sm whitespace-pre-wrap p-3 bg-muted rounded-lg">
                  {String((selectedAttempt.scenarioJson as any)?.text || JSON.stringify(selectedAttempt.scenarioJson))}
                </div>
              </div>
            ) : null}
            {selectedAttempt.traineeDo && (
              <div>
                <Label className="text-xs text-muted-foreground">What They Did</Label>
                <div className="mt-1 text-sm whitespace-pre-wrap p-3 bg-muted rounded-lg">{selectedAttempt.traineeDo}</div>
              </div>
            )}
            {selectedAttempt.traineeSay && (
              <div>
                <Label className="text-xs text-muted-foreground">What They Said</Label>
                <div className="mt-1 text-sm whitespace-pre-wrap p-3 bg-muted rounded-lg">{selectedAttempt.traineeSay}</div>
              </div>
            )}
            {selectedAttempt.evaluationJson ? (
              <div>
                <Label className="text-xs text-muted-foreground">Evaluation</Label>
                <div className="mt-1 text-sm whitespace-pre-wrap p-3 bg-muted rounded-lg">
                  {String((selectedAttempt.evaluationJson as any)?.text || JSON.stringify(selectedAttempt.evaluationJson))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CertificationPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("test");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="btn-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <GraduationCap className="h-5 w-5 text-primary" />
              Skills Certification Engine
            </h1>
            <p className="text-sm text-muted-foreground">
              Behavior-based certification with transparent rubric scoring
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="test" data-testid="tab-test">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Certify</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">
              <BarChart3 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="standards" data-testid="tab-standards">
              <Settings className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Standards</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="test">
            <CertificationTest />
          </TabsContent>

          <TabsContent value="dashboard">
            <AttemptHistory />
          </TabsContent>

          <TabsContent value="standards">
            <StandardsEditor />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
