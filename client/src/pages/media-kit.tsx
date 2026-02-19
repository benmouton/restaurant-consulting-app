import { useEffect } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, MapPin, ExternalLink, Star } from "lucide-react";
import { SiInstagram, SiLinkedin, SiFacebook } from "react-icons/si";

function useMediaKitMeta() {
  useEffect(() => {
    const original = document.title;
    document.title = "Ben Mouton — Restaurant Owner, Operator, Consultant";

    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("og:title", "Ben Mouton — Restaurant Owner, Operator, Consultant");
    setMeta("og:description", "35+ years in the restaurant industry. Builder of The Restaurant Consultant.");
    setMeta("og:image", "/images/og-image.png");
    setMeta("og:type", "profile");
    setMeta("og:url", `${window.location.origin}/media-kit`);

    return () => {
      document.title = original;
    };
  }, []);
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <Card className="bg-white/5 border-white/10 p-6 text-center flex-1 min-w-[140px] print:bg-transparent print:border-gray-300">
      <p className="text-2xl font-bold text-cyan-400 mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
        {value}
      </p>
      <p className="text-sm text-gray-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {label}
      </p>
    </Card>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <Card className="bg-white/5 border-white/10 p-6 print:bg-transparent print:border-gray-300">
      <h4 className="text-base font-semibold text-white mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {title}
      </h4>
      <p className="text-sm text-gray-400 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {description}
      </p>
    </Card>
  );
}

function PhilosophyBlock({ title, quote }: { title: string; quote: string }) {
  return (
    <div className="border-l-2 border-cyan-400/40 pl-6 py-2">
      <p className="text-xl font-semibold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
        "{title}"
      </p>
      <p className="text-gray-400 text-base leading-relaxed italic" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        "{quote}"
      </p>
    </div>
  );
}

function PressCard({ source, headline, detail }: { source: string; headline: string; detail?: string }) {
  return (
    <Card className="bg-white/5 border-white/10 p-5 flex items-start gap-3 print:bg-transparent print:border-gray-300">
      <Star className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
      <div>
        <p className="text-xs text-cyan-400 uppercase tracking-wider mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {source}
        </p>
        <p className="text-sm text-white leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {headline}
        </p>
        {detail && (
          <p className="text-xs text-gray-500 mt-1">{detail}</p>
        )}
      </div>
    </Card>
  );
}

export default function MediaKitPage() {
  useMediaKitMeta();

  return (
    <div
      className="min-h-screen text-white print:text-black print:bg-white print:[&_*]:!border-gray-300 print:[&_.text-gray-400]:!text-gray-600 print:[&_.text-gray-500]:!text-gray-500 print:[&_.text-cyan-400]:!text-gray-800"
      style={{ backgroundColor: "#0d1117", fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">

        {/* ── SECTION 1: Hero ── */}
        <section className="mb-20" data-testid="section-hero">
          <p className="text-cyan-400 text-sm uppercase tracking-[0.2em] mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Media Kit
          </p>
          <h1
            className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Ben Mouton
          </h1>
          <p
            className="text-xl md:text-2xl text-gray-400 mb-10"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Restaurant Owner. Operator. Consultant.
          </p>

          <div className="text-gray-300 text-base md:text-lg leading-relaxed space-y-5 mb-12">
            <p>
              I've spent 35 years in restaurants — not behind a desk, but on the line,
              on the floor, and in the office closing the books at midnight.
            </p>
            <p>
              In 2012, I opened Mouton's Bistro & Bar — Cajun-Creole food with a Texas
              backbone. I've built, expanded, hired, fired, trained, bled margin, rebuilt
              systems, survived COVID shutdowns, and closed a location after 12 years when
              the numbers stopped making sense.
            </p>
            <p>I don't speak theory. I speak operations.</p>
            <p>Now I'm building the tools I wish I'd had from day one.</p>
          </div>

          <hr className="border-white/10 mb-10" />

          <div className="flex flex-wrap gap-4">
            <StatCard value="35+ Years" label="Restaurant Experience" />
            <StatCard value="2 Locations" label="Leander & Cedar Park, TX" />
            <StatCard value="Cajun-Creole" label="Texas-Louisiana Cuisine" />
          </div>
        </section>

        {/* ── SECTION 2: The Story ── */}
        <section className="mb-20" data-testid="section-story">
          <h2
            className="text-3xl md:text-4xl font-bold text-white mb-8"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            From New Orleans Roots to Texas Tables
          </h2>

          <div className="text-gray-300 text-base leading-[1.8] space-y-5">
            <p>
              Ben Mouton grew up in Texas but spent his holidays in New Orleans, where
              food wasn't a trend — it was identity.
            </p>
            <p>
              He studied culinary arts in New Orleans, then returned to Texas in 2000
              and spent the next decade doing what most consultants never do: working.
              Waiting tables. Bartending. Managing. Learning how restaurants actually
              succeed — and how they quietly fail.
            </p>
            <p>
              In January 2012, he opened Mouton's Southern Bistro in Leander, Texas.
              The idea was simple: real Cajun and Creole flavors, grounded in Texas
              ingredients, served without pretense.
            </p>
            <p>
              The restaurant grew. A second location opened in Cedar Park. Signature
              dishes rooted in family history became staples.
            </p>
            <p>
              But growth came with pressure: rising food costs, labor volatility,
              vendor shocks, and eventually a pandemic shutdown. In 2024, after 12 years,
              the original Leander location closed — not out of emotion, but because
              the math no longer worked.
            </p>
            <p className="text-white font-medium">
              Every shift reinforced the same truth:
            </p>
            <p className="text-cyan-400 text-lg font-medium italic">
              Restaurants don't survive on passion. They survive on structure.
            </p>
          </div>
        </section>

        {/* ── SECTION 3: The Restaurant Consultant ── */}
        <section className="mb-20" data-testid="section-platform">
          <h2
            className="text-3xl md:text-4xl font-bold text-white mb-8"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Why I Built The Restaurant Consultant
          </h2>

          <div className="text-gray-300 text-base leading-[1.8] space-y-5 mb-12">
            <p>
              After 35 years in restaurants — and over a decade as an owner — I
              realized something uncomfortable:
            </p>
            <p>
              Independent operators are expected to master finance, HR law, staffing
              models, training systems, food cost control, crisis response, vendor
              negotiation, marketing, and leadership — with no structured operating system.
            </p>
            <p>
              You can hire a consultant at $200/hour. Or read advice written by someone
              who's never run a Friday night with two call-outs.
            </p>
            <p>Neither solves the real problem.</p>
            <p className="text-white font-medium">So I built what I needed.</p>
            <p>
              The Restaurant Consultant is built around 12 operational domains — the
              areas where restaurants actually win or fail:
            </p>
            <p className="text-cyan-400 font-medium">
              Leadership. Service. Training. Staffing. HR. Kitchen. Costs. Reviews.
              SOPs. Crisis. Facilities. Social Media.
            </p>
            <p>
              Every framework inside it has been tested at Mouton's Bistro & Bar.
            </p>
            <p className="text-white font-medium italic">
              If it doesn't hold up during a slammed dinner rush, it doesn't belong.
            </p>
            <p>This isn't motivation. It's operational infrastructure.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FeatureCard
              title="12 Operational Domains"
              description="Full-spectrum restaurant systems"
            />
            <FeatureCard
              title="Operations Consultant Engine"
              description="Direct, practical answers to real-world problems"
            />
            <FeatureCard
              title="Kitchen Command Center"
              description="Pre-shift readiness scoring with live station visibility"
            />
            <FeatureCard
              title="Skills Certification Engine"
              description="Behavior-based certification with objective rubrics"
            />
            <FeatureCard
              title="Structured Training Programs"
              description="7-day onboarding frameworks built for speed and clarity"
            />
            <FeatureCard
              title="HR Documentation Engine"
              description="Workforce Commission-compliant documentation in plain language"
            />
          </div>
        </section>

        {/* ── SECTION 4: Philosophy ── */}
        <section className="mb-20" data-testid="section-philosophy">
          <h2
            className="text-3xl md:text-4xl font-bold text-white mb-10"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            How I Think About Restaurants
          </h2>

          <div className="space-y-10">
            <PhilosophyBlock
              title="Structure Over Motivation"
              quote="I don't sell inspiration. I build systems that function when you're not there."
            />
            <PhilosophyBlock
              title="Systems Over Heroics"
              quote="If one person has to save every shift, you don't have a business — you have a bottleneck."
            />
            <PhilosophyBlock
              title="Clarity Over Chaos"
              quote="Every recommendation is tested against real pressure. If it collapses during a rush, it gets rebuilt."
            />
          </div>
        </section>

        {/* ── SECTION 5: Press ── */}
        <section className="mb-20" data-testid="section-press">
          <h2
            className="text-3xl md:text-4xl font-bold text-white mb-8"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            In the Press
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PressCard
              source="Community Impact"
              headline="Mouton's Southern Bistro undergoes expansions, renovations after 10 years"
              detail="2022"
            />
            <PressCard
              source="Community Impact"
              headline="Ben Mouton opened Mouton's Southern Bistro in Leander in early 2012"
            />
            <PressCard
              source="Yelp"
              headline="4+ stars, 426 reviews at Cedar Park location"
            />
            <PressCard
              source="TripAdvisor"
              headline="4.2 stars, 169 reviews"
            />
          </div>
        </section>

        {/* ── SECTION 6: Contact / CTA ── */}
        <section className="mb-16" data-testid="section-contact">
          <h2
            className="text-3xl md:text-4xl font-bold text-white mb-10"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Get in Touch
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="space-y-4 text-gray-300">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
                <span>Cedar Park, Texas</span>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
                <a href="mailto:benmouton@gmail.com" className="hover:text-cyan-400 transition-colors">
                  benmouton@gmail.com
                </a>
              </div>
              <div className="flex items-start gap-3">
                <ExternalLink className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
                <div>
                  <p className="font-medium text-white">Mouton's Bistro & Bar</p>
                  <p className="text-sm text-gray-500">1821 S Lakeline Blvd #104</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-gray-300">
              <div className="flex items-start gap-3">
                <ExternalLink className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
                <a href="/" className="hover:text-cyan-400 transition-colors">
                  The Restaurant Consultant
                </a>
              </div>
              <div className="flex items-center gap-4 pt-2">
                <a
                  href="https://www.instagram.com/moutonsbistro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-cyan-400 transition-colors"
                  aria-label="Instagram"
                >
                  <SiInstagram className="w-5 h-5" />
                </a>
                <a
                  href="https://www.linkedin.com/in/benmouton"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-cyan-400 transition-colors"
                  aria-label="LinkedIn"
                >
                  <SiLinkedin className="w-5 h-5" />
                </a>
                <a
                  href="https://www.facebook.com/moutonsbistro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-cyan-400 transition-colors"
                  aria-label="Facebook"
                >
                  <SiFacebook className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          <hr className="border-white/10 mb-10" />

          <div className="text-center">
            <a href="/">
              <Button
                className="bg-cyan-500 text-black font-semibold px-10 text-base"
                data-testid="button-cta-try"
              >
                Try The Restaurant Consultant — $10/month
              </Button>
            </a>
            <p className="text-gray-500 text-sm mt-3">
              Built by an operator, for operators. No contracts. Cancel anytime.
            </p>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-white/10 pt-8 text-center text-gray-500 text-sm print:text-gray-700">
          <p>&copy; 2026 Ben Mouton. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
            <span>|</span>
            <Link href="/terms" className="hover:text-gray-300 transition-colors">Terms of Service</Link>
          </div>
        </footer>

      </div>
    </div>
  );
}
