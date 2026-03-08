import { Link } from "wouter";
import { Mail, ChevronRight } from "lucide-react";
import { BrandLogoNav } from "@/components/BrandLogo";

const faqs = [
  {
    q: "How do I cancel my subscription?",
    a: "You can cancel anytime through your iPhone or iPad Settings \u2192 Apple ID \u2192 Subscriptions.",
  },
  {
    q: "I'm having trouble signing in with Apple.",
    a: "Make sure your Apple ID is active and that you've allowed The Restaurant Consultant in your Apple ID privacy settings. If the issue persists, email us.",
  },
  {
    q: "How do I restore my purchases?",
    a: 'Open the app, go to Settings or the subscription screen, and tap "Restore Purchases."',
  },
  {
    q: "My question isn't listed here.",
    a: "Email us at support@restaurantai.consulting and we'll respond within 1 business day.",
  },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0a', color: '#ffffff' }}>
      <header style={{ borderBottom: '1px solid #1a1a1a', padding: '16px 0' }}>
        <div className="container mx-auto px-4 flex items-center justify-between">
          <BrandLogoNav linkTo="/" />
          <nav className="flex items-center gap-4">
            <Link href="/apps" className="text-sm hover:underline" style={{ color: '#999' }} data-testid="link-nav-apps">Apps</Link>
            <Link href="/">
              <span className="text-sm hover:underline" style={{ color: '#999' }} data-testid="link-nav-home">Home</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-12 md:py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-support-title">
            The Restaurant Consultant
          </h1>
          <p style={{ color: '#c9a84c', fontSize: '16px' }}>
            Guidance for restaurant owners and operators
          </p>
          <p className="mt-2 text-sm" style={{ color: '#666' }}>
            by ALSTIG INC
          </p>
        </div>

        <section className="mb-12">
          <div
            className="rounded-lg p-6 md:p-8 text-center"
            style={{ backgroundColor: '#111111', border: '1px solid #1a1a1a' }}
            data-testid="section-contact"
          >
            <Mail className="h-8 w-8 mx-auto mb-3" style={{ color: '#c9a84c' }} />
            <h2 className="text-xl font-semibold mb-2">Contact Support</h2>
            <p className="text-sm mb-4" style={{ color: '#999' }}>
              Have a question or need help? We're here for you.
            </p>
            <a
              href="mailto:support@restaurantai.consulting"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#c9a84c', color: '#0a0a0a' }}
              data-testid="link-support-email"
            >
              support@restaurantai.consulting
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </section>

        <section className="mb-12" data-testid="section-faq">
          <h2 className="text-xl font-semibold mb-6" style={{ borderBottom: '1px solid #1a1a1a', paddingBottom: '12px' }}>
            Frequently Asked Questions
          </h2>
          <div className="space-y-0">
            {faqs.map((faq, i) => (
              <div
                key={i}
                style={{
                  borderBottom: i < faqs.length - 1 ? '1px solid #1a1a1a' : 'none',
                  paddingBottom: '24px',
                  marginBottom: i < faqs.length - 1 ? '24px' : '0',
                }}
                data-testid={`faq-${i}`}
              >
                <h3 className="font-medium mb-2" style={{ fontSize: '15px' }}>
                  {faq.q}
                </h3>
                <p style={{ color: '#999', fontSize: '14px', lineHeight: '1.7' }}>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid #1a1a1a', padding: '24px 0' }}>
        <div className="container mx-auto px-4 text-center text-sm" style={{ color: '#666' }}>
          <p>
            &copy; 2026 ALSTIG INC
            <span className="mx-2">&middot;</span>
            <Link href="/privacy" className="hover:underline" style={{ color: '#999' }} data-testid="link-privacy">Privacy Policy</Link>
            <span className="mx-2">&middot;</span>
            <Link href="/terms" className="hover:underline" style={{ color: '#999' }} data-testid="link-terms">Terms of Use</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
