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
  Wrench
} from "lucide-react";

const domains = [
  { name: "Leadership", icon: Crown, desc: "Owner to architect transition" },
  { name: "Service", icon: Users, desc: "Enforceable standards" },
  { name: "Training", icon: GraduationCap, desc: "Systems that stick" },
  { name: "Staffing", icon: CalendarDays, desc: "Labor cost control" },
  { name: "HR & Docs", icon: FileText, desc: "Legal protection" },
  { name: "Kitchen", icon: ChefHat, desc: "BOH discipline" },
  { name: "Costs", icon: DollarSign, desc: "Margin protection" },
  { name: "Reviews", icon: Star, desc: "Reputation management" },
  { name: "SOPs", icon: ClipboardList, desc: "Scalable systems" },
  { name: "Crisis", icon: AlertTriangle, desc: "Recovery playbooks" },
  { name: "Facilities", icon: Wrench, desc: "Asset protection" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">The Restaurant Consultant</span>
          </div>
          <Button asChild data-testid="button-login-header">
            <a href="/api/login">Sign In</a>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Replace Chaos with{" "}
            <span className="text-primary">Systems</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            A hands-on restaurant consultant built by real service, real payroll, real guests, and real consequences. 
            Not theory. Not motivation. <strong>Structure.</strong>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild data-testid="button-get-started">
              <a href="/api/login">
                Get Started for $10/month
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            No contracts. Cancel anytime. Works on your worst nights.
          </p>
        </div>
      </section>

      {/* AI Consultant Feature */}
      <section className="py-20 px-4 bg-card border-y border-border">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <MessageSquare className="h-12 w-12 text-primary mb-4" />
              <h2 className="text-3xl font-bold mb-4">
                Ask Anything. Get Real Answers.
              </h2>
              <p className="text-muted-foreground mb-6">
                An AI consultant trained on decades of real restaurant operations. 
                Ask it anything—from handling a walkout to structuring your comp policy.
                No fluff. Direct, actionable guidance.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm">"How do I handle a server who keeps over-portioning?"</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm">"Give me a script for cutting staff on a slow night."</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm">"What should I do when the kitchen gets slammed?"</span>
                </li>
              </ul>
            </div>
            <Card className="p-4 bg-background">
              <div className="space-y-4">
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm font-medium">You:</p>
                  <p className="text-sm text-muted-foreground">My food cost jumped 4% this month. Where do I start?</p>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium">Consultant:</p>
                  <p className="text-sm text-muted-foreground">
                    A 4% jump is a system failure, not a mystery. Start with three things: 
                    (1) Check your waste log—if you don't have one, that's problem one. 
                    (2) Spot-check 10 proteins at service tonight—are they hitting spec? 
                    (3) Review your last three vendor invoices for price creep...
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="py-16 px-4 bg-card border-y border-border">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <h3 className="font-semibold text-lg mb-2">Structure Over Motivation</h3>
              <p className="text-muted-foreground text-sm">
                I don't sell inspiration. I sell systems that work when you're not there.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Systems Over Heroics</h3>
              <p className="text-muted-foreground text-sm">
                If one person has to save every shift, you don't have a business—you have a dependency.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Clarity Over Chaos</h3>
              <p className="text-muted-foreground text-sm">
                Every recommendation is tested against a slammed dinner rush. If it doesn't hold up, it doesn't belong.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10 Domains */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-4">
            11 Operational Domains
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Complete frameworks covering every area where restaurants succeed or fail.
            Principles, checklists, scripts, and decision trees ready to implement.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {domains.map((domain) => (
              <Card key={domain.name} className="hover-elevate">
                <CardContent className="pt-6 text-center">
                  <domain.icon className="h-8 w-8 mx-auto mb-3 text-primary" />
                  <h3 className="font-semibold text-sm">{domain.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{domain.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">Built for Operators, Not Theorists</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            This is for owners who are tired of carrying everything themselves and ready to build systems that run without them.
          </p>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <Card className="p-6">
              <CheckCircle className="h-6 w-6 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Independent Owners</h3>
              <p className="text-sm text-muted-foreground">
                Stop being the only one who can solve every problem.
              </p>
            </Card>
            <Card className="p-6">
              <CheckCircle className="h-6 w-6 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Small Groups (Under 10)</h3>
              <p className="text-sm text-muted-foreground">
                Build systems before you scale, not after things break.
              </p>
            </Card>
            <Card className="p-6">
              <CheckCircle className="h-6 w-6 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Rising Managers</h3>
              <p className="text-sm text-muted-foreground">
                Learn to lead, not babysit. Build real operational skills.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-4">
            Start Building Real Systems Today
          </h2>
          <p className="text-primary-foreground/80 mb-8">
            $10/month. 10 operational frameworks. AI consultant included. 
            If it wouldn't hold up during a slammed dinner rush, it's not in here.
          </p>
          <Button size="lg" variant="secondary" asChild data-testid="button-cta-bottom">
            <a href="/api/login">
              Get Started Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; 2025 The Restaurant Consultant. Built by operators, for operators.</p>
        </div>
      </footer>
    </div>
  );
}
