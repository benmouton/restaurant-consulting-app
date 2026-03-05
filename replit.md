# The Restaurant Consultant

## Overview
The Restaurant Consultant is a full-stack web application designed to empower independent restaurant owners and operators with robust operational systems. It offers an expert operations consultant, a comprehensive framework of content, training templates, and staff management tools. The project's core vision is to provide repeatable systems to address operational challenges, foster discipline, and enhance efficiency. Key capabilities include advanced staff scheduling, employee portal access, labor demand analysis, food costing, and an expert-driven leadership command center. The application aims to be an invisible expert, focusing on delivering solutions without exposing its underlying technology.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **Styling**: Tailwind CSS with shadcn/ui (New York style)
- **Animations**: Framer Motion
- **Build Tool**: Vite
- **Key Design Decisions**: Path aliases, Replit Auth integration, streaming chat with markdown, Radix UI-based components.

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Style**: RESTful endpoints
- **Authentication**: Replit Auth (OpenID Connect) with Passport.js
- **Session Management**: PostgreSQL-backed sessions (`connect-pg-simple`)
- **Key Design Decisions**: Modular integration pattern, custom build scripts, production builds to `dist/`.

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema**: Defined in `shared/schema.ts` and `shared/models/`. Core tables cover users, sessions, conversations, operational data, and various restaurant management entities.

### Core Features & Implementations
- **Staff Management**: Comprehensive scheduling system (Sling-style), employee portal, labor demand analysis with real-time calculations and recommendations.
- **Financial Management**: Food costing system with plate costing, ingredient memory, and historical tracking.
- **Subscription & Access Control**: Freemium tiers (Free/Basic/Pro) with domain-based feature gating and Role-Based Access Control (Owner, General Manager, Manager).
- **Consulting Engine**: OpenAI-powered operational consultant with persistent conversation history, context-aware suggestions, formatted responses, and support for image/social media post generation.
- **Operational Command Centers**:
    - **Leadership**: Daily task management, crisis guidance, progress tracking, and reminders.
    - **Facility**: Equipment issue triage, preventive maintenance, equipment log, and vendor directory.
    - **Kitchen**: Real-time readiness and execution engine with structured inputs, deterministic scoring, alerts, and structured debriefs. `KitchenStatusStrip` (4 gold-bordered cards: Tonight's Status with score/color, Last 86'd Items, BOH vs. Covers ratio, Last Debrief age). `KitchenComplianceEngine` with shimmer border, 5 tabs with icons (Gauge/AlertTriangle/Timer/ClipboardList/Target) and gold active border. Readiness tab: prep sign-off green/amber buttons with helper text, station status with slide-down note inputs for not-ready stations, par shortage amber chips, 86 list red chips with Clear All, live covers/cook ratio (green <=15, amber 16-20, red 21+), large party expanded section (Party Size/Arrival Time/Seated Where), live Score Breakdown with color-coded badge and progress bars. Alerts tab: 3 micro-cards (Apps/Entrees/Window) with live updates, badge-styled timing standards, bottleneck insights callout, structured alert output cards (HIGH/MEDIUM/LOW severity badges). Quick tab: 18px bold colored labels, log success green state. Debrief tab: char counters on all 5 textareas, structured output with What Broke (red)/Root Causes (amber)/Tomorrow's Fixes (green) color-coded cards, Print Debrief button. Coach tab: station icons in dropdown, behavior preview callout with gold left border, structured coaching card (The Focus/What to Watch/What to Say blockquote/What Good Looks Like/Follow Up By).
- **Content & Training**: Enhanced content accordions for operational frameworks (Principles, Frameworks, Checklists, Scripts), including interactive elements and metric displays.
- **Labor Demand Engine** (`domain.tsx`): `StaffingMetricStrip` (4 gold-bordered cards: labor %, scheduled hours, staff on floor, next cut), `LaborDemandEngine` with shimmer border, 6 quick presets with icons and full auto-fill (day, daypart, covers, check, labor target, positions, wage, hours), live `Labor Math Preview` panel (projected revenue, labor budget, scheduled cost, cost per cover, variance with On Target/Watch/Over Budget badge), smart staff breakdown parsing into chips with mismatch warning, `StructuredOutputRenderer` for parsed AI output (sections: Staffing Recommendation, Cut Timeline, Labor Cost Breakdown, Manager Actions, Risk Flags rendered as cards with gold headers and left borders, manager actions as checkable items), inline example preview with dashed gold border, tab icons (ClipboardList pre-shift, Zap mid-shift) with gold active border and amber pulse badge on mid-shift when data entered.
- **HR Documentation Engine** (`domain.tsx`): `HRStatusStrip` (3 gold-bordered cards: total records, pending signatures in amber, this month), `HRComplianceEngine` with shimmer border, severity dots on issue types (yellow/orange/red), `ProgressiveDisciplineIndicator` (3-dot visual strip below Discipline Step dropdown, gold-highlighted active step), bottom-border-only focus inputs, 3 policy awareness options, character count on description textarea, styled document output (gold section headers, amber custom checkboxes, divider lines), action bar (Copy with checkmark state, Download PDF with print-white styling, Share, Save to HR Records with gold/green state). `HRRecordsViewer` with 4 filter chips (All/Pending Signature/Signed/This Month), color-coded discipline badges (yellow/amber/orange/red), pending signature pulse indicator, per-record Upload Signed Copy button with Capacitor camera support, proper delete confirmation dialog. `EmployeeDisciplineTrailModal` (vertical timeline with amber connecting line, gold dots, discipline level badges, next-step callout card).
- **Living Playbooks**: SOP management system with various creation modes (Quick Checklist, Step-by-Step, Deep Procedure), mobile checklist view, audit capabilities, and acknowledgment tracking.
- **Employee Handbook Builder**: Customizable handbook generation tool with policy configuration and print-ready output.
- **Marketing & Onboarding**: Conversion-optimized landing page with interactive previews, product screenshots, and a multi-step onboarding wizard for new users.

## External Dependencies

### Third-Party Services
- **Replit Auth**: User authentication.
- **OpenAI API**: AI capabilities via Replit AI Integrations.
- **PostgreSQL**: Database hosting.
- **Stripe**: Subscription management.
- **Meta (Facebook/Instagram) API**: Direct social media posting.
- **Google Business Profile API**: Direct social media posting.

### Required Environment Variables
- `DATABASE_URL`
- `SESSION_SECRET`
- `AI_INTEGRATIONS_OPENAI_API_KEY`
- `AI_INTEGRATIONS_OPENAI_BASE_URL`
- `ISSUER_URL`
- `REPL_ID`
- `ENCRYPTION_KEY`
- `META_APP_ID`, `META_APP_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### Capacitor (iOS Native)
- **App ID**: `com.alstiginc.restaurantconsultant`
- **Native Plugins**: @capacitor/browser, @capacitor/preferences, @capacitor/push-notifications, @capacitor/camera, @capacitor/haptics, @capacitor/share, @capacitor/network, @capacitor-community/apple-sign-in, capacitor-native-biometric

### Key NPM Packages
- **UI**: Radix UI primitives, shadcn/ui, Framer Motion, react-markdown
- **Data**: Drizzle ORM, drizzle-zod, @tanstack/react-query
- **Auth**: passport, openid-client, express-session
- **Build**: Vite, esbuild, tsx
- **Native**: @capacitor/core, @capacitor/cli, @capacitor/ios