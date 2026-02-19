import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Crown, 
  Users, 
  GraduationCap, 
  CalendarDays, 
  FileText, 
  ChefHat, 
  DollarSign, 
  Star, 
  ClipboardList, 
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  MessageSquare,
  Wrench,
  Share2,
  Check,
  ChevronDown,
  ChevronUp,
  Shield,
  BookOpen,
  TrendingUp,
  Flame
} from "lucide-react";
import { BrandLogoNav } from "@/components/BrandLogo";
import screenshotKitchen from "@/assets/images/screenshot-kitchen.png";
import screenshotHr from "@/assets/images/screenshot-hr.png";
import screenshotFoodcost from "@/assets/images/screenshot-foodcost.png";
import screenshotConsultant from "@/assets/images/screenshot-consultant.png";

const domains = [
  { 
    name: "Leadership", icon: Crown, desc: "Owner to architect transition",
    tagline: "Stop managing. Start building the machine that manages itself.",
    tools: ["Daily Priority Engine", "Command Center Dashboard", "Crisis Decision Framework"]
  },
  { 
    name: "Service", icon: Users, desc: "Enforceable standards",
    tagline: "Great service isn't a personality trait. It's a system.",
    tools: ["Service Standards Builder", "Guest Recovery Scripts", "Floor Management SOPs"]
  },
  { 
    name: "Training", icon: GraduationCap, desc: "Systems that stick",
    tagline: "Train once, execute forever. No more re-explaining.",
    tools: ["7-Day Training Programs", "Skills Certification Engine", "Progress Tracking"]
  },
  { 
    name: "Staffing", icon: CalendarDays, desc: "Labor cost control",
    tagline: "Labor is your biggest cost. Stop guessing at it.",
    tools: ["Labor Demand Engine", "Shift Scheduling", "Cut-Decision Calculator"]
  },
  { 
    name: "HR & Docs", icon: FileText, desc: "Legal protection",
    tagline: "Document everything. Protect yourself before you need to.",
    tools: ["Written Warning Generator", "Progressive Discipline Tracker", "Employee Handbook Builder"]
  },
  { 
    name: "Kitchen", icon: ChefHat, desc: "BOH discipline",
    tagline: "The kitchen is a system, not a personality contest.",
    tools: ["Readiness Scoring", "Station Status Tracking", "Post-Shift Debrief"]
  },
  { 
    name: "Costs", icon: DollarSign, desc: "Margin protection",
    tagline: "Know your numbers or your numbers will bury you.",
    tools: ["Plate Cost Calculator", "Waste Buffer Analysis", "Weekly Cost Tracking"]
  },
  { 
    name: "Reviews", icon: Star, desc: "Reputation management",
    tagline: "Every review is a systems audit disguised as feedback.",
    tools: ["Response Generator", "Pattern Analysis", "Recovery Playbooks"]
  },
  { 
    name: "SOPs", icon: ClipboardList, desc: "Scalable systems",
    tagline: "If it's not written down, it doesn't exist.",
    tools: ["Living Playbooks", "Quick Checklists", "Audit & Spot-Check"]
  },
  { 
    name: "Crisis", icon: AlertTriangle, desc: "Recovery playbooks",
    tagline: "Chaos is inevitable. Your response doesn't have to be.",
    tools: ["Scenario Response Scripts", "Emergency Protocols", "Recovery Frameworks"]
  },
  { 
    name: "Facilities", icon: Wrench, desc: "Asset protection",
    tagline: "Equipment fails when you can't afford it to. Plan ahead.",
    tools: ["PM Scheduling", "Vendor Directory", "Equipment Log"]
  },
  { 
    name: "Social Media", icon: Share2, desc: "Platform strategy",
    tagline: "Show up consistently. Stop posting randomly.",
    tools: ["Post Builder", "Multi-Platform Publishing", "Brand Voice Settings"]
  },
];

const consultantExamples = [
  {
    question: "My food cost jumped 4% this month. Where do I start?",
    answer: "A 4% jump is a system failure, not a mystery. Start with three things: (1) Check your waste log\u2014if you don't have one, that's problem one. (2) Spot-check 10 proteins at service tonight\u2014are they hitting spec? (3) Review your last three vendor invoices for price creep. Most of the time it's a combination of portion drift and vendor increases nobody caught."
  },
  {
    question: "How do I handle a server who keeps over-portioning?",
    answer: "This isn't a conversation problem\u2014it's a systems problem. First: do you have portioning specs posted at every station? If not, you're asking people to guess. Second: weigh 5 plates at random during service tonight. Show the server the actual cost difference between their portions and spec. Make it about math, not feelings. Third: if it continues after documented coaching, it's a progressive discipline issue."
  },
  {
    question: "Give me a script for cutting staff on a slow night.",
    answer: "Here's your script: 'Hey [name], we're running light tonight. I'm going to cut you at [time]. Get your sidework done, close out your tables, and tip out by [time]. Thanks for being flexible.' The key: cut early, cut decisively. Don't wait until 8pm hoping it picks up. Check your covers at 5:30\u2014if you're 30% below projection, start cutting immediately. Every hour you wait costs you $15-25 per extra server."
  },
  {
    question: "What should I do when the kitchen gets slammed?",
    answer: "Stop talking and start triaging. (1) Call out ticket times\u2014'Table 12 is at 18 minutes, that's priority.' (2) Consolidate the board\u2014group similar items to batch cook. (3) Pull one person off prep to expedite or run food. (4) Communicate with the floor: 'We're running 5 minutes long on entr\u00e9es\u2014buy me time with table touches.' After service, debrief: what broke and what system prevents it next time?"
  }
];

const pricingFeatures = [
  "All 12 operational domains",
  "Operations Consultant (unlimited)",
  "Kitchen Command Center",
  "HR Documentation & Compliance Engine",
  "Training Templates & Programs",
  "Skills Certification Engine",
  "Food Cost Tools & Plate Costing",
  "Staff Scheduling & Labor Demand",
  "Financial Insights & Analysis",
  "Crisis Management Playbooks",
  "Review Response Generator",
  "Social Media Post Builder",
  "Employee Handbook Builder",
  "Living Playbooks & SOPs",
];

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
    </span>
  );
}

function TypewriterText({ text, onComplete }: { text: string; onComplete?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    indexRef.current = 0;

    const interval = setInterval(() => {
      indexRef.current += 1;
      const chunk = Math.min(indexRef.current * 3, text.length);
      setDisplayed(text.slice(0, chunk));
      if (chunk >= text.length) {
        setDone(true);
        clearInterval(interval);
        onComplete?.();
      }
    }, 20);

    return () => clearInterval(interval);
  }, [text]);

  return <>{displayed}{!done && <span className="animate-pulse">|</span>}</>;
}

export default function Landing() {
  const [activeExample, setActiveExample] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [showAnswer, setShowAnswer] = useState(true);
  const [expandedDomain, setExpandedDomain] = useState<number | null>(null);

  function handleExampleClick(index: number) {
    if (index === activeExample) return;
    setShowAnswer(false);
    setIsTyping(true);
    setActiveExample(index);
    setTimeout(() => {
      setIsTyping(false);
      setShowAnswer(true);
    }, 800);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <BrandLogoNav linkTo="/" />
          <Button asChild data-testid="button-login-header">
            <a href="/api/login">Sign In</a>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4" data-testid="text-hero-headline">
            Replace Chaos with{" "}
            <span className="text-primary">Systems</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-3 max-w-2xl mx-auto">
            A hands-on restaurant consultant built by real service, real payroll, real guests, and real consequences. 
            Not theory. Not motivation. <strong>Structure.</strong>
          </p>
          <p className="text-base text-foreground/70 mb-8 max-w-xl mx-auto">
            Used by independent restaurant owners to cut labor costs, protect margins, and stop firefighting every shift.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild data-testid="button-get-started">
              <a href="/api/login">
                Start Your 7-Day Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </div>
          <p className="text-sm text-primary font-medium italic mt-4" data-testid="text-tagline">
            Systems that work on your worst night.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Then $10/month. No contracts. Cancel anytime.
          </p>
          <p className="text-sm font-medium mt-3" data-testid="text-social-proof">
            Built by Ben Mouton — restaurant owner, operator, and consultant.
          </p>
        </div>
      </section>

      {/* Consultant Feature - Interactive */}
      <section className="py-16 md:py-20 px-4 bg-card border-y border-border">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
            <div>
              <MessageSquare className="h-10 w-10 text-primary mb-4" />
              <h2 className="text-3xl font-bold mb-4">
                Ask Anything. Get Real Answers.
              </h2>
              <p className="text-muted-foreground mb-6">
                An operations consultant built on decades of real restaurant experience. 
                Ask anything — from handling a walkout to structuring your comp policy.
                No fluff. Direct, actionable guidance.
              </p>
              <div className="space-y-2">
                {consultantExamples.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => handleExampleClick(i)}
                    className={`w-full flex items-start gap-2 p-3 rounded-md text-left transition-colors ${
                      activeExample === i 
                        ? "bg-primary/10 border border-primary/20" 
                        : "hover-elevate"
                    }`}
                    data-testid={`btn-example-${i}`}
                  >
                    <MessageSquare className={`h-4 w-4 mt-0.5 shrink-0 ${activeExample === i ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm ${activeExample === i ? "font-medium" : "text-muted-foreground"}`}>
                      "{ex.question}"
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-6">
                <Button asChild variant="outline" data-testid="btn-try-consultant">
                  <a href="/api/login">
                    Try it yourself
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            <Card className="p-4 bg-background md:sticky md:top-20 z-50">
              <div className="space-y-4">
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-xs font-medium text-muted-foreground mb-1">You:</p>
                  <p className="text-sm">{consultantExamples[activeExample].question}</p>
                </div>
                <div className="p-3 min-h-[120px]">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Consultant:</p>
                  {isTyping ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TypingDots /> Thinking...
                    </div>
                  ) : showAnswer ? (
                    <p className="text-sm text-muted-foreground">
                      <TypewriterText text={consultantExamples[activeExample].answer} />
                    </p>
                  ) : null}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="py-12 md:py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 text-center">
            <div className="p-4">
              <Shield className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-2">Structure Over Motivation</h3>
              <p className="text-muted-foreground text-sm">
                I don't sell inspiration. I sell systems that work when you're not there.
              </p>
            </div>
            <div className="p-4">
              <TrendingUp className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-2">Systems Over Heroics</h3>
              <p className="text-muted-foreground text-sm">
                If one person has to save every shift, you don't have a business — you have a dependency.
              </p>
            </div>
            <div className="p-4">
              <Flame className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-2">Clarity Over Chaos</h3>
              <p className="text-muted-foreground text-sm">
                Every recommendation is tested against a slammed dinner rush. If it doesn't hold up, it doesn't belong.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* See It In Action - Product Screenshots */}
      <section className="py-16 md:py-20 px-4 bg-card border-y border-border">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-3" data-testid="text-screenshots-heading">
            See It In Action
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
            Real tools, real dashboards. Not mockups — this is what you get on day one.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { img: screenshotKitchen, caption: "Know if your kitchen is ready before service — not during it.", label: "Kitchen Command Center" },
              { img: screenshotConsultant, caption: "Ask any operations question. Get real answers, not motivational quotes.", label: "Operations Consultant" },
              { img: screenshotFoodcost, caption: "Build plates, track costs, protect margins — all in one place.", label: "Food Cost Tools" },
              { img: screenshotHr, caption: "Generate proper documentation in seconds. Protect yourself legally.", label: "HR & Compliance" },
            ].map((item, i) => (
              <div key={i} className="group" data-testid={`screenshot-${i}`}>
                <div className="rounded-md overflow-hidden border border-border bg-background">
                  <img 
                    src={item.img} 
                    alt={item.label} 
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
                <div className="mt-3 px-1">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Credibility / About Section */}
      <section className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <BookOpen className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4" data-testid="text-credibility-heading">
            Built by an Operator, for Operators
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            I built every system in this platform because I needed them in my own restaurants. 
            They're not theoretical — they've been tested on real floors, during real rushes, with real staff.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 text-center mt-8">
            <Card className="p-4">
              <p className="text-2xl font-bold text-primary">20+</p>
              <p className="text-sm text-muted-foreground">Years in restaurant operations</p>
            </Card>
            <Card className="p-4">
              <p className="text-2xl font-bold text-primary">12</p>
              <p className="text-sm text-muted-foreground">Complete operational frameworks</p>
            </Card>
            <Card className="p-4">
              <p className="text-2xl font-bold text-primary">Real</p>
              <p className="text-sm text-muted-foreground">Battle-tested systems</p>
            </Card>
          </div>
          <p className="text-sm text-muted-foreground mt-8 italic">
            "Every framework in this platform has been tested at Mouton's Bistro & Bar — 
            during rushes, staff shortages, and the kind of nights that break restaurants without systems."
          </p>
          <p className="text-sm font-medium mt-2">— Ben Mouton, Founder</p>
        </div>
      </section>

      {/* 12 Domains - Expandable */}
      <section className="py-16 md:py-20 px-4 bg-card border-y border-border">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-3">
            12 Operational Domains
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
            Complete frameworks covering every area where restaurants succeed or fail.
            Tap any domain to see what's inside.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {domains.map((domain, i) => {
              const isExpanded = expandedDomain === i;
              return (
                <Card 
                  key={domain.name} 
                  className={`overflow-visible cursor-pointer transition-all ${isExpanded ? "ring-1 ring-primary/30" : "hover-elevate"}`}
                  onClick={() => setExpandedDomain(isExpanded ? null : i)}
                  data-testid={`domain-card-${i}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                        <domain.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm">{domain.name}</h3>
                        <p className="text-xs text-muted-foreground">{domain.desc}</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground italic mb-2">{domain.tagline}</p>
                        <div className="space-y-1">
                          {domain.tools.map((tool) => (
                            <div key={tool} className="flex items-center gap-2">
                              <Check className="h-3 w-3 text-primary shrink-0" />
                              <span className="text-xs">{tool}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Breakdown */}
      <section className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-3" data-testid="text-pricing-heading">
            $10/month — Everything. No Tiers. No Upsells.
          </h2>
          <p className="text-muted-foreground mb-8">
            The power of $10/month is that it's a no-brainer for any restaurant. Here's everything that's included:
          </p>
          <Card className="p-6 md:p-8 text-left">
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {pricingFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                7-day free trial. No contracts. Cancel anytime.
              </p>
              <Button size="lg" asChild className="mt-4" data-testid="button-pricing-cta">
                <a href="/api/login">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-16 md:py-20 px-4 bg-card border-y border-border">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-3">Built for Operators, Not Theorists</h2>
          <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
            This is for owners who are tired of carrying everything themselves and ready to build systems that run without them.
          </p>
          <div className="grid md:grid-cols-3 gap-4 text-left">
            <Card className="p-5">
              <Crown className="h-6 w-6 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Independent Owners</h3>
              <p className="text-sm text-muted-foreground">
                You're the owner, GM, HR department, and line cook. Stop wearing every hat — build systems so your restaurant runs without you on the line.
              </p>
            </Card>
            <Card className="p-5">
              <Users className="h-6 w-6 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Small Groups (Under 10)</h3>
              <p className="text-sm text-muted-foreground">
                Growing from 1 to 3 locations breaks everything that worked at one. Get systems in place before your second location exposes every gap.
              </p>
            </Card>
            <Card className="p-5">
              <GraduationCap className="h-6 w-6 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Rising Managers</h3>
              <p className="text-sm text-muted-foreground">
                Your owner promoted you because you're great on the floor. Now learn the business side — P&L, labor planning, progressive discipline — before you learn it the hard way.
              </p>
            </Card>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground max-w-lg mx-auto">
              This isn't for chains with corporate support teams, consultants looking for templates to resell, or anyone looking for motivation without execution.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Placeholder */}
      <section className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-3">What Operators Are Saying</h2>
          <p className="text-muted-foreground mb-8">
            We're just getting started, and our founding members are already seeing results.
          </p>
          <Card className="p-6 md:p-8">
            <p className="text-muted-foreground italic mb-4">
              "Every framework in this platform has been tested at Mouton's Bistro & Bar. 
              These aren't templates I found online — they're systems I built because I needed them to survive real service."
            </p>
            <p className="text-sm font-medium">— Ben Mouton, Founder & Operator</p>
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">
                Be one of our founding members.
              </p>
              <Button asChild variant="outline" data-testid="btn-founding-member">
                <a href="/api/login">
                  Join as a Founding Member
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 md:py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-4">
            Start Building Real Systems Today
          </h2>
          <p className="text-primary-foreground/80 mb-3">
            Systems that work on your worst night. $10/month. No contracts.
          </p>
          <p className="text-primary-foreground/70 mb-8 text-sm">
            12 operational domains. Expert consultant included. If it wouldn't hold up during a slammed dinner rush, it's not in here.
          </p>
          <Button size="lg" variant="secondary" asChild data-testid="button-cta-bottom">
            <a href="/api/login">
              Start Your 7-Day Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </Button>
          <p className="text-primary-foreground/60 text-sm mt-4">
            No credit card required for trial. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t border-border">
        <div className="container mx-auto flex flex-col items-center gap-4 text-sm text-muted-foreground">
          <BrandLogoNav linkTo="/" />
          <p className="italic text-xs text-muted-foreground">Systems that work on your worst night.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/privacy" className="hover:underline" data-testid="link-privacy">Privacy Policy</Link>
            <span>|</span>
            <Link href="/terms" className="hover:underline" data-testid="link-terms">Terms of Service</Link>
          </div>
          <p>&copy; 2026 The Restaurant Consultant. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
