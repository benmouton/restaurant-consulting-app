import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { FREE_DOMAIN_COUNT, TOTAL_DOMAIN_COUNT } from "@/config/tierConfig";
import { startLogin } from "@/lib/native";
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
  ArrowRight,
  MessageSquare,
  Wrench,
  Share2,
  Check,
  ChevronDown,
  ChevronUp,
  Shield,
  BookOpen,
  FileStack,
  BarChart3
} from "lucide-react";
import { BrandLogoNav } from "@/components/BrandLogo";
import screenshotKitchen from "@/assets/images/screenshot-kitchen.png";
import screenshotHr from "@/assets/images/screenshot-hr.png";
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
    question: "My labor cost is over target. What do I check first?",
    answer: "Three things, in order: (1) Pull your actual hours versus your projected hours for the last two weeks\u2014are you overstaffing openers or closers? Most labor waste happens in the first and last hour of a shift. (2) Check your cut discipline\u2014are managers cutting servers when covers drop, or are they letting people stand around? (3) Look at overtime\u2014one employee at 48 hours costs more than two at 24. Fix the schedule before you cut heads."
  },
  {
    question: "How do I write up an employee without a TWC problem later?",
    answer: "Three rules: (1) Be specific\u2014'showed up 12 minutes late on 3/4, 3/7, and 3/11' beats 'has attendance issues.' Dates, times, witnesses. (2) State the policy they violated\u2014cite your handbook section. If you don't have one, build it today. (3) Document the conversation\u2014'employee was informed this is a written warning. Next occurrence may result in termination.' Have them sign it. If they refuse, note 'employee declined to sign' with a witness signature. TWC wants a paper trail. Give them one."
  },
  {
    question: "We're losing money on a popular dish. What do I do?",
    answer: "Popular but unprofitable is a Plowhorse\u2014it drives traffic but bleeds margin. Three options: (1) Re-engineer the plate\u2014swap one expensive protein component for a cheaper one without changing the identity. Can you use chicken thigh instead of breast? House-made sauce instead of purchased? (2) Reduce the portion by 10%\u2014most guests won't notice if you plate it correctly. (3) Raise the price $1.50-2.00 and reposition it on the menu. Test for two weeks and watch the mix. Don't kill a Plowhorse\u2014fix it."
  }
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

function TrainingManualMockup() {
  return (
    <div
      className="w-full rounded-lg overflow-hidden"
      style={{ backgroundColor: '#12141f', border: '1px solid #2a2d3e' }}
    >
      <div className="p-5">
        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#b8860b' }}>Server Training Manual</p>
        <p className="text-sm font-semibold text-white mb-0.5">Mouton's Bistro & Bar</p>
        <p className="text-xs" style={{ color: '#6b7280' }}>7-Day Certification Program</p>
      </div>
      <div className="px-5 pb-4 space-y-2.5">
        {[
          { day: "Day 1: Orientation & Standards", pct: 100 },
          { day: "Day 2: Menu Knowledge", pct: 85 },
          { day: "Day 3: POS & Service Flow", pct: 70 },
          { day: "Day 4: Upselling & Guest Experience", pct: 55 },
          { day: "Day 5: Sidework & Closing", pct: 40 },
        ].map((item) => (
          <div key={item.day}>
            <p className="text-xs mb-1" style={{ color: '#9ca3af' }}>{item.day}</p>
            <div className="h-1.5 rounded-full" style={{ backgroundColor: '#2a2d3e' }}>
              <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: 'linear-gradient(90deg, #b8860b, #d4a017)' }} />
            </div>
          </div>
        ))}
      </div>
      <div className="px-5 pb-5 pt-2 flex gap-2">
        <div className="px-3 py-1.5 rounded text-xs font-medium" style={{ backgroundColor: '#b8860b', color: '#0f1117' }}>Download PDF</div>
        <div className="px-3 py-1.5 rounded text-xs font-medium" style={{ border: '1px solid #2a2d3e', color: '#9ca3af' }}>Share</div>
      </div>
    </div>
  );
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
    <div className="min-h-screen" style={{ backgroundColor: '#0f1117' }}>
      {/* 1. Nav */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: '#0f1117', borderBottom: '1px solid #2a2d3e', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <BrandLogoNav linkTo="/" />
          <Button
            onClick={() => { window.location.href = "/login"; }}
            data-testid="button-login-header"
            style={{ backgroundColor: '#b8860b', color: '#0f1117', fontWeight: 600, border: 'none' }}
            className="hover:opacity-90"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* 2. Hero */}
      <section className="py-16 md:py-24 px-4" style={{ backgroundColor: '#0f1117' }}>
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 text-white" data-testid="text-hero-headline">
            Replace Chaos with{" "}
            <span style={{ color: '#d4a017' }}>Systems</span>
          </h1>
          <p className="text-xl mb-3 max-w-2xl mx-auto" style={{ color: '#6b7280' }}>
            Built on real service, real payroll, and real consequences — not theory.
          </p>
          <p className="text-xl mb-3 max-w-2xl mx-auto text-white font-bold">
            Structure.
          </p>
          <p className="text-base mb-8 max-w-xl mx-auto" style={{ color: '#6b7280' }}>
            Used by independent operators to cut labor costs, protect margins, and stop firefighting every shift.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => { window.location.href = "/login"; }}
              data-testid="button-get-started"
              style={{ backgroundColor: '#b8860b', color: '#0f1117', fontWeight: 600, border: 'none', padding: '14px 28px', borderRadius: '6px' }}
              className="hover:opacity-90"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
          <p className="text-sm font-medium italic mt-4" style={{ color: '#d4a017' }} data-testid="text-tagline">
            Systems that work on your worst night.
          </p>
          <p className="text-sm mt-2" style={{ color: '#6b7280' }}>
            {FREE_DOMAIN_COUNT} core domains free forever. No credit card required.
          </p>
          <p className="text-sm mt-3" data-testid="text-social-proof">
            <span className="font-semibold text-white">Built by Ben Mouton</span>
            <span style={{ color: '#6b7280' }}> — restaurant owner, operator, and consultant.</span>
          </p>
        </div>
      </section>

      {/* 3. Chat Demo */}
      <section className="py-16 md:py-20 px-4" style={{ backgroundColor: '#0f1117' }}>
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
            <div>
              <MessageSquare className="h-10 w-10 mb-4" style={{ color: '#b8860b' }} />
              <h2 className="text-3xl font-bold mb-4 text-white">
                Ask Anything. Get Real Answers.
              </h2>
              <p className="mb-6" style={{ color: '#6b7280' }}>
                An operations consultant built on decades of real restaurant experience. 
                Ask anything — from handling a walkout to structuring your comp policy.
                No fluff. Direct, actionable guidance.
              </p>
              <div className="space-y-2">
                {consultantExamples.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => handleExampleClick(i)}
                    className="w-full flex items-start gap-2 p-3 rounded-md text-left transition-all"
                    style={{
                      backgroundColor: '#1a1d2e',
                      border: activeExample === i ? '1px solid #d4a017' : '1px solid #b8860b',
                      borderRadius: '6px',
                      color: activeExample === i ? '#d4a017' : 'white',
                    }}
                    data-testid={`btn-example-${i}`}
                  >
                    <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" style={{ color: activeExample === i ? '#d4a017' : '#6b7280' }} />
                    <span className={`text-sm ${activeExample === i ? "font-medium" : ""}`}>
                      "{ex.question}"
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-6">
                <Button variant="outline" onClick={() => { window.location.href = "/login"; }} data-testid="btn-try-consultant">
                  Try it yourself
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
            <div
              className="p-4 rounded-lg md:sticky md:top-20 z-50"
              style={{ backgroundColor: '#1a1d2e', border: '1px solid #b8860b', borderRadius: '8px' }}
            >
              <div className="space-y-4">
                <div className="p-3 rounded-md" style={{ backgroundColor: '#12141f' }}>
                  <p className="text-xs font-medium uppercase mb-1" style={{ color: '#6b7280' }}>You:</p>
                  <p className="text-sm text-white">{consultantExamples[activeExample].question}</p>
                </div>
                <div className="p-3 min-h-[120px]">
                  <p className="text-xs font-medium uppercase mb-1" style={{ color: '#6b7280' }}>Consultant:</p>
                  {isTyping ? (
                    <div className="flex items-center gap-2 text-sm" style={{ color: '#6b7280' }}>
                      <TypingDots /> Thinking...
                    </div>
                  ) : showAnswer ? (
                    <p className="text-sm text-white">
                      <TypewriterText text={consultantExamples[activeExample].answer} />
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Testimonial Placeholder */}
      {/* PLACEHOLDER: replace with real testimonial */}
      <section className="py-12 md:py-16 px-4" style={{ backgroundColor: '#0f1117' }}>
        <div className="mx-auto" style={{ maxWidth: '680px' }}>
          <div
            className="relative p-6 md:p-8 lg:p-10"
            style={{
              backgroundColor: '#1a1d2e',
              borderLeft: '3px solid #b8860b',
              borderRadius: '4px',
            }}
            data-testid="testimonial-block"
          >
            <span
              className="absolute select-none"
              style={{ color: '#b8860b', fontSize: '64px', lineHeight: '0', top: '28px', left: '16px', opacity: 0.3 }}
              aria-hidden="true"
            >
              "
            </span>
            <p className="text-white italic mb-4 pl-6" style={{ fontSize: '18px', lineHeight: '1.8' }}>
              I generated our Server and Manager manuals in one afternoon. New hire training went from three days of chaos to a system that works whether I'm in the building or not.
            </p>
            <p className="pl-6" style={{ color: '#6b7280', fontSize: '14px' }}>
              — Independent Restaurant Owner, Texas
            </p>
          </div>
        </div>
      </section>

      {/* 5. Three Product Capability Cards */}
      <section className="py-12 md:py-16 px-4" style={{ backgroundColor: '#1a1d2e', borderTop: '1px solid #2a2d3e', borderBottom: '1px solid #2a2d3e' }}>
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 text-center">
            <div className="p-4">
              <FileStack className="h-8 w-8 mx-auto mb-3" style={{ color: '#b8860b' }} />
              <h3 className="font-semibold text-white mb-2" style={{ fontSize: '20px', fontWeight: 600 }}>Training Manuals in 30 Seconds</h3>
              <p className="text-sm" style={{ color: '#6b7280' }}>
                Six role-specific manuals — Server, Kitchen, Bartender, Host, Busser, Manager — personalized to your restaurant the moment you click Generate. No starting from scratch. No generic templates.
              </p>
            </div>
            <div className="p-4">
              <BarChart3 className="h-8 w-8 mx-auto mb-3" style={{ color: '#b8860b' }} />
              <h3 className="font-semibold text-white mb-2" style={{ fontSize: '20px', fontWeight: 600 }}>Your Prime Cost, Every Week</h3>
              <p className="text-sm" style={{ color: '#6b7280' }}>
                Enter three numbers. Get your prime cost percentage versus your target, a 4-week trend, and a plain-language status: on track, watch this, or act now. Operators who track weekly make better decisions than operators who find out at month end.
              </p>
            </div>
            <div className="p-4">
              <Shield className="h-8 w-8 mx-auto mb-3" style={{ color: '#b8860b' }} />
              <h3 className="font-semibold text-white mb-2" style={{ fontSize: '20px', fontWeight: 600 }}>An Ops Consultant Who Knows Your Restaurant</h3>
              <p className="text-sm" style={{ color: '#6b7280' }}>
                Not a generic chatbot. An operations consultant pre-loaded with your restaurant name, your concept, your financial targets, and your team. Ask it about your food cost. It answers with your numbers, not a tutorial.
              </p>
            </div>
          </div>
          <p className="text-center mt-8 italic" style={{ color: '#6b7280', fontSize: '14px' }}>
            "Every recommendation is tested against a slammed dinner rush. If it doesn't hold up, it doesn't belong."
          </p>
        </div>
      </section>

      {/* 6. See It In Action */}
      <section className="py-16 md:py-20 px-4" style={{ backgroundColor: '#0f1117' }}>
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-3 text-white" data-testid="text-screenshots-heading">
            See It In Action
          </h2>
          <p className="text-center mb-10 max-w-2xl mx-auto" style={{ color: '#6b7280' }}>
            Real tools, real dashboards. Not mockups — this is what you get on day one.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div
              className="group transition-all"
              style={{
                backgroundColor: '#1a1d2e',
                border: '1px solid #2a2d3e',
                borderRadius: '8px',
                padding: '16px',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#b8860b'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#2a2d3e'; }}
              data-testid="screenshot-0"
            >
              <TrainingManualMockup />
              <div className="mt-3">
                <p className="font-semibold text-white" style={{ fontSize: '16px' }}>Training Manual Generator</p>
                <p className="mt-1" style={{ color: '#6b7280', fontSize: '14px' }}>Six personalized manuals. One Generate button. Ready to print in 30 seconds.</p>
              </div>
            </div>
            {[
              { img: screenshotConsultant, caption: "Ask any operations question. Get real answers, not motivational quotes.", label: "Operations Consultant" },
              { img: screenshotKitchen, caption: "Know if your kitchen is ready before service — not during it.", label: "Kitchen Command Center" },
              { img: screenshotHr, caption: "Generate proper documentation in seconds. Protect yourself legally.", label: "HR & Compliance" },
            ].map((item, i) => (
              <div
                key={i}
                className="group transition-all"
                style={{
                  backgroundColor: '#1a1d2e',
                  border: '1px solid #2a2d3e',
                  borderRadius: '8px',
                  padding: '16px',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#b8860b'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#2a2d3e'; }}
                data-testid={`screenshot-${i + 1}`}
              >
                <div className="overflow-hidden" style={{ borderRadius: '6px' }}>
                  <img 
                    src={item.img} 
                    alt={item.label} 
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
                <div className="mt-3">
                  <p className="font-semibold text-white" style={{ fontSize: '16px' }}>{item.label}</p>
                  <p className="mt-1" style={{ color: '#6b7280', fontSize: '14px' }}>{item.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Inline Pricing Callout */}
      <section className="py-12 md:py-16 px-4" style={{ backgroundColor: '#1a1d2e' }}>
        <div className="container mx-auto max-w-xl text-center">
          <p className="text-white text-lg font-semibold mb-1">
            {FREE_DOMAIN_COUNT} core domains free forever. No credit card required.
          </p>
          <p className="mb-6" style={{ color: '#6b7280' }}>
            Full platform access from <span style={{ color: '#d4a017', fontWeight: 600 }}>$10/month</span>.
          </p>
          <Button
            size="lg"
            onClick={() => { window.location.href = "/login"; }}
            style={{ backgroundColor: '#b8860b', color: '#0f1117', fontWeight: 600, border: 'none' }}
            className="hover:opacity-90"
            data-testid="button-pricing-inline"
          >
            Get Started Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <div className="mt-4">
            <Link href="/pricing" className="text-sm hover:underline" style={{ color: '#d4a017' }} data-testid="link-view-pricing">
              Want to see everything that's included? View full pricing
            </Link>
          </div>
        </div>
      </section>

      {/* 8. FAQ Section */}
      <section className="py-16 md:py-20 px-4" style={{ backgroundColor: '#0f1117' }}>
        <div className="mx-auto" style={{ maxWidth: '680px' }}>
          <h2 className="font-semibold text-white mb-10" style={{ fontSize: '28px', fontWeight: 600 }} data-testid="text-faq-heading">
            Common Questions
          </h2>
          <div className="space-y-0">
            {[
              {
                q: "Is this built for independent restaurants or large chains?",
                a: "Independent operators only. The systems, the language, and the tools are built for owners who are in their restaurant — not regional managers running reports from a corporate office."
              },
              {
                q: "Do I need to be tech-savvy to use this?",
                a: "No. If you can send an email, you can use this platform. Setup takes 5 minutes. Your first training manual takes 30 seconds."
              },
              {
                q: "What's the difference between the free plan and paid?",
                a: "Free gives you 3 core domains — Kitchen Operations, Crisis Management, and Ownership & Leadership. Paid unlocks everything: all 6 training manuals, prime cost tracking, menu engineering, HR documentation, scheduling tools, and the full Consultant."
              },
            ].map((item, i, arr) => (
              <div
                key={i}
                style={{
                  paddingBottom: '32px',
                  marginBottom: i < arr.length - 1 ? '32px' : '0',
                  borderBottom: i < arr.length - 1 ? '1px solid #2a2d3e' : 'none',
                }}
                data-testid={`faq-${i}`}
              >
                <h3 className="text-white mb-2" style={{ fontWeight: 600, fontSize: '17px' }}>{item.q}</h3>
                <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: '1.7' }}>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. 12 Domains - Expandable */}
      <section className="py-16 md:py-20 px-4" style={{ backgroundColor: '#1a1d2e', borderTop: '1px solid #2a2d3e', borderBottom: '1px solid #2a2d3e' }}>
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-3 text-white">
            12 Operational Domains
          </h2>
          <p className="text-center mb-10 max-w-2xl mx-auto" style={{ color: '#6b7280' }}>
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

      {/* 10. Credibility */}
      <section className="py-16 md:py-20 px-4" style={{ backgroundColor: '#0f1117' }}>
        <div className="container mx-auto max-w-3xl text-center">
          <BookOpen className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4 text-white" data-testid="text-credibility-heading">
            Built by an Operator, for Operators
          </h2>
          <p className="mb-6 max-w-2xl mx-auto" style={{ color: '#6b7280' }}>
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
        </div>
      </section>

      {/* 11. Who It's For */}
      <section className="py-16 md:py-20 px-4" style={{ backgroundColor: '#1a1d2e', borderTop: '1px solid #2a2d3e', borderBottom: '1px solid #2a2d3e' }}>
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-3 text-white">Built for Operators, Not Theorists</h2>
          <p className="text-center mb-8 max-w-2xl mx-auto" style={{ color: '#6b7280' }}>
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
              <h3 className="font-semibold mb-2">Working GMs</h3>
              <p className="text-sm text-muted-foreground">
                You know how to run a shift. Now learn how to run the business behind the shift — labor, food cost, documentation, and systems that scale.
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
            <p className="text-xs max-w-lg mx-auto" style={{ color: '#6b7280' }}>
              This isn't for chains with corporate support teams, consultants looking for templates to resell, or anyone looking for motivation without execution.
            </p>
          </div>
        </div>
      </section>

      {/* 12. Closing CTA */}
      <section className="px-4" style={{ backgroundColor: '#1a1d2e', borderTop: '1px solid #b8860b', borderBottom: '1px solid #b8860b', padding: '80px 24px' }}>
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="font-bold mb-4 text-white text-[28px] md:text-[36px]" data-testid="text-closing-cta">
            Stop Running on Gut Feel.
          </h2>
          <p className="mb-8" style={{ color: '#6b7280', fontSize: '16px' }}>
            The operators who survive aren't working harder. They're running better systems.
          </p>
          <Button
            size="lg"
            onClick={() => { window.location.href = "/login"; }}
            style={{ backgroundColor: '#b8860b', color: '#0f1117', fontWeight: 600, border: 'none' }}
            className="hover:opacity-90"
            data-testid="button-cta-bottom"
          >
            Get Started Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="mt-4" style={{ color: '#6b7280', fontSize: '13px' }}>
            {FREE_DOMAIN_COUNT} domains free. No credit card required.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4" style={{ borderTop: '1px solid #2a2d3e' }}>
        <div className="container mx-auto flex flex-col items-center gap-4 text-sm" style={{ color: '#6b7280' }}>
          <BrandLogoNav linkTo="/" />
          <p className="italic text-xs" style={{ color: '#6b7280' }}>Systems that work on your worst night.</p>
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
