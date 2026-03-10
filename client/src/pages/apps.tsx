import { Link } from "wouter";
import { BrandLogoNav } from "@/components/BrandLogo";

const apps = [
  {
    name: "The Restaurant Consultant",
    category: "Business / Food & Drink",
    description: "Operations. Financials. Staffing. Training. All in one place — built by a working restaurant owner who's been in the weeds with you.",
    link: "https://restaurantai.consulting/",
  },
  {
    name: "MyCookbook",
    category: "Food & Drink",
    description: "Your recipes. Your way. Build and organize your personal cookbook, scale ingredients by cover count, and keep every recipe you've ever created in one place.",
    link: "https://apps.apple.com/us/app/mycookbook-recipe-box/id6759684127",
  },
  {
    name: "ChefScale",
    category: "Food & Drink / Utilities",
    description: "Scale any recipe instantly — from a single portion to a full catering run. Precision scaling built for professional kitchens and serious home cooks.",
    link: "https://apps.apple.com/us/app/chefscale/id6759728525",
  },
  {
    name: "Review Responder",
    category: "Business",
    description: "Turn every review into a reputation win. Generate professional, on-brand responses to Google and Yelp reviews in seconds.",
    link: "#",
  },
];

const cardStyles = `
@keyframes goldPulse {
  0%, 100% { box-shadow: 0 0 0px rgba(212, 160, 23, 0.0); border-color: rgba(184, 134, 11, 0.3); }
  50% { box-shadow: 0 0 18px rgba(212, 160, 23, 0.25); border-color: rgba(212, 160, 23, 0.7); }
}
@keyframes fadeUpIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes expandWidth {
  from { width: 0; }
  to { width: 80px; }
}
.apps-card {
  opacity: 0;
  animation: fadeUpIn 0.5s ease forwards, goldPulse 4s ease-in-out 0.6s infinite;
  border: 1px solid rgba(184, 134, 11, 0.3);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.apps-card:nth-child(1) { animation-delay: 0s, 0.6s; }
.apps-card:nth-child(2) { animation-delay: 0.1s, 0.7s; }
.apps-card:nth-child(3) { animation-delay: 0.2s, 0.8s; }
.apps-card:nth-child(4) { animation-delay: 0.3s, 0.9s; }
.apps-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(212, 160, 23, 0.15);
}
.apps-gold-divider {
  height: 2px;
  background: linear-gradient(90deg, #b8860b, #d4a017, #b8860b);
  animation: expandWidth 0.8s ease-out forwards;
  margin: 16px auto 0;
}
.apps-store-btn {
  position: relative;
  overflow: hidden;
  border: 1px solid #b8860b;
  background: transparent;
  color: white;
  border-radius: 999px;
  padding: 8px 20px;
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.2s;
  text-decoration: none;
  display: inline-block;
}
.apps-store-btn::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 60%;
  height: 100%;
  background: linear-gradient(120deg, transparent, rgba(212, 160, 23, 0.25), transparent);
  transition: left 0.4s ease;
}
.apps-store-btn:hover::after { left: 160%; }
.apps-store-btn:hover { border-color: #d4a017; transform: scale(1.02); }
`;

export default function AppsPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0f1117', color: '#ffffff' }}>
      <style>{cardStyles}</style>

      <header style={{ borderBottom: '1px solid #2a2d3e', padding: '16px 0' }}>
        <div className="container mx-auto px-4 flex items-center justify-between">
          <BrandLogoNav linkTo="/" />
          <nav className="flex items-center gap-4">
            <Link href="/support" className="text-sm hover:underline" style={{ color: '#9ca3af' }} data-testid="link-nav-support">Support</Link>
            <Link href="/">
              <span className="text-sm hover:underline" style={{ color: '#9ca3af' }} data-testid="link-nav-home">Home</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto max-w-4xl px-4 pt-16 pb-12 md:pt-24 md:pb-16">
          <div className="text-center mb-14">
            <h1
              className="text-3xl md:text-5xl font-bold mb-4"
              style={{ lineHeight: 1.2 }}
              data-testid="text-apps-title"
            >
              Built for the Floor. Built for the Office. Built for You.
            </h1>
            <p style={{ color: '#9ca3af', fontSize: '17px', maxWidth: '520px', margin: '0 auto' }}>
              Four tools from The Restaurant Consultant — built by operators, for operators.
            </p>
            <div className="apps-gold-divider" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {apps.map((app, i) => (
              <div
                key={app.name}
                className="apps-card rounded-xl p-6 flex flex-col"
                style={{ backgroundColor: '#1a1d2e', borderRadius: '12px' }}
                data-testid={`app-card-${i}`}
              >
                <span
                  className="inline-block self-start text-xs font-medium px-3 py-1 rounded-full mb-4"
                  style={{ backgroundColor: 'rgba(184, 134, 11, 0.2)', color: '#d4a017' }}
                  data-testid={`app-category-${i}`}
                >
                  {app.category}
                </span>
                <h2 className="text-xl font-bold mb-3" data-testid={`app-name-${i}`}>{app.name}</h2>
                <p className="text-sm mb-6 flex-1" style={{ color: '#9ca3af', lineHeight: '1.8' }}>
                  {app.description}
                </p>
                <a
                  href={app.link}
                  className="apps-store-btn self-start"
                  target={app.link !== '#' ? '_blank' : undefined}
                  rel={app.link !== '#' ? 'noopener noreferrer' : undefined}
                  data-testid={`app-store-link-${i}`}
                  aria-label={`Download ${app.name} on the App Store`}
                >
                  Download on the App Store
                </a>
              </div>
            ))}
          </div>
        </section>

        <section
          className="w-full py-16 md:py-20"
          style={{
            backgroundColor: '#1a1d2e',
            borderTop: '1px solid rgba(184, 134, 11, 0.3)',
            borderBottom: '1px solid rgba(184, 134, 11, 0.3)',
            boxShadow: '0 0 18px rgba(212, 160, 23, 0.08)',
          }}
        >
          <div className="container mx-auto max-w-2xl px-4 text-center">
            <h2
              className="text-2xl md:text-3xl font-bold mb-4"
              style={{ letterSpacing: '0.03em' }}
              data-testid="text-banner-headline"
            >
              All four apps. One team. One mission.
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '16px', lineHeight: '1.8', maxWidth: '480px', margin: '0 auto' }}>
              The Restaurant Consultant exists to help independent operators run tighter, smarter, and more profitable restaurants.
            </p>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid #2a2d3e', padding: '24px 0' }}>
        <div className="container mx-auto px-4 text-center text-sm" style={{ color: '#6b7280' }}>
          <p>
            &copy; 2026 The Restaurant Consultant
            <span className="mx-2">&middot;</span>
            <Link href="/privacy" className="hover:underline" style={{ color: '#9ca3af' }} data-testid="link-privacy">Privacy Policy</Link>
            <span className="mx-2">&middot;</span>
            <Link href="/terms" className="hover:underline" style={{ color: '#9ca3af' }} data-testid="link-terms">Terms of Use</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
