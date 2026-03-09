import { Link } from "wouter";
import { BrandLogoNav } from "@/components/BrandLogo";

const apps = [
  {
    name: "The Restaurant Consultant",
    category: "Business / Food & Drink",
    description: "Consulting for independent restaurant owners. Get expert guidance on operations, financials, menu strategy, and staff management — on demand.",
    link: "#",
  },
  {
    name: "MyCookbook",
    category: "Food & Drink",
    description: "Build and organize your personal recipe collection. Save recipes, scale ingredients, and keep your culinary creations in one place.",
    link: "https://apps.apple.com/us/app/mycookbook-recipe-box/id6759684127",
  },
  {
    name: "ChefScale",
    category: "Food & Drink / Utilities",
    description: "Professional recipe scaling for chefs and home cooks. Instantly scale any recipe up or down with precision — perfect for meal prep, catering, and batch cooking.",
    link: "https://apps.apple.com/us/app/chefscale/id6759728525",
  },
  {
    name: "Review Responder",
    category: "Business",
    description: "Generated responses to your customer reviews. Save time and maintain a professional online presence across all your restaurant's review platforms.",
    link: "#",
  },
];

const AppStoreBadge = () => (
  <svg viewBox="0 0 120 40" className="h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="40" rx="6" fill="#000" />
    <rect x="0.5" y="0.5" width="119" height="39" rx="5.5" stroke="#A6A6A6" />
    <text x="60" y="15" textAnchor="middle" fill="#fff" fontSize="7" fontFamily="system-ui, sans-serif">Download on the</text>
    <text x="60" y="28" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="600" fontFamily="system-ui, sans-serif">App Store</text>
  </svg>
);

export default function AppsPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0a0a0a', color: '#ffffff' }}>
      <header style={{ borderBottom: '1px solid #1a1a1a', padding: '16px 0' }}>
        <div className="container mx-auto px-4 flex items-center justify-between">
          <BrandLogoNav linkTo="/" />
          <nav className="flex items-center gap-4">
            <Link href="/support" className="text-sm hover:underline" style={{ color: '#999' }} data-testid="link-nav-support">Support</Link>
            <Link href="/">
              <span className="text-sm hover:underline" style={{ color: '#999' }} data-testid="link-nav-home">Home</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-3xl px-4 py-12 md:py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-3" data-testid="text-apps-title">
            Our Apps
          </h1>
          <p style={{ color: '#999', fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
            Powerful tools for restaurant owners and culinary professionals — built by ALSTIG INC.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {apps.map((app, i) => (
            <div
              key={app.name}
              className="rounded-lg p-6 flex flex-col"
              style={{ backgroundColor: '#111111', border: '1px solid #1a1a1a' }}
              data-testid={`app-card-${i}`}
            >
              <span
                className="inline-block self-start text-xs font-medium px-2.5 py-1 rounded-full mb-3"
                style={{ backgroundColor: 'rgba(201,168,76,0.12)', color: '#c9a84c' }}
                data-testid={`app-category-${i}`}
              >
                {app.category}
              </span>
              <h2 className="text-lg font-semibold mb-2" data-testid={`app-name-${i}`}>{app.name}</h2>
              <p className="text-sm mb-5 flex-1" style={{ color: '#999', lineHeight: '1.7' }}>
                {app.description}
              </p>
              <a
                href={app.link}
                className="inline-block self-start transition-opacity hover:opacity-80"
                data-testid={`app-store-link-${i}`}
                aria-label={`Download ${app.name} on the App Store`}
              >
                <AppStoreBadge />
              </a>
            </div>
          ))}
        </div>
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
