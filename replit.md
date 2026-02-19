# The Restaurant Consultant

## Overview
A full-stack web application for restaurant owners and operators, designed to build durable operational systems. It offers an expert operations consultant, operational framework content, training templates, and staff management tools. The project's vision is to provide independent restaurants with repeatable systems to overcome operational challenges and foster discipline. Key capabilities include comprehensive staff scheduling, employee portal access, labor demand analysis, food costing, and an expert-driven leadership command center.

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
- **Key Design Decisions**: Path aliases (`@/`, `@shared/`), Replit Auth integration via `useAuth` hook, streaming chat with markdown, Radix UI-based components.

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Style**: RESTful endpoints (`/api/*`)
- **Authentication**: Replit Auth (OpenID Connect) with Passport.js
- **Session Management**: PostgreSQL-backed sessions (`connect-pg-simple`)
- **Key Design Decisions**: Modular integration pattern (`server/replit_integrations/`), custom build scripts (`esbuild` for server, `Vite` for client), production builds to `dist/`.

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema**: Defined in `shared/schema.ts` and `shared/models/`
- **Core Tables**: `users`, `sessions`, `conversations`, `messages`, `domains`, `framework_content`, `user_bookmarks`, `training_templates`, `staff_positions`, `staff_members`, `shifts`, `shift_applications`, `staff_announcements`, `announcement_reads`, `savedIngredients`, `savedPlates`, `foodCostPeriods`, `restaurant_profiles`, `dailyTaskCompletions`, `brand_voice_settings`, `restaurant_holidays`, `connected_accounts`, `scheduled_posts`, `post_results`, `repair_vendors`, `facility_issues`, `kitchen_shift_data`, `playbooks`, `playbook_steps`, `playbook_assignments`, `playbook_acknowledgments`, `playbook_audits`, `handbook_settings`.

### Core Features & Implementations
- **Staff Scheduling System**: Sling-style scheduling with weekly calendar, staff/position management, pay rate tracking, daily labor cost calculation, open shift tracking, and announcements.
- **Employee Portal System**: Separate authentication for staff to view schedules and announcements, managed via invite links and `staff_members` table. Integrates with Stripe for billing based on employee access.
- **Labor Demand & Cut-Decision Engine**: Cover-driven staffing tool with real-time labor calculations, metrics dashboard, color-coded labor percentage, gap indicators, and quick recommendations. Supports pre-shift planning and mid-shift decisions.
- **Food Costing System**: Tools for plate costing, ingredient memory, waste buffer presets, target defaults, and weekly food cost tracking with historical data.
- **Role-Based Access Control (RBAC)**: Three roles (Owner, General Manager, Manager) with distinct feature access, implemented via `useRole` hook and `RoleGate` component.
- **Consulting Engine**: OpenAI-powered restaurant operations consultant with conversation history persistence (conversations/messages tables with userId), 8 clickable starter questions organized by 4 categories (Staffing, Cost, Service, Leadership), context-aware question suggestions based on restaurant profile (type, staff count, time of day), conversation history sidebar with load/delete/new, deep-link support via URL query params (?prompt=&context=), formatted responses with bold key terms and "Bottom line:" summaries, and streaming chat. Also supports image generation and social media post generation via domain-specific system prompt.
- **Leadership Command Center**: Daily task management tool with personalized priorities, crisis guidance, follow-up mode, progress tracking dashboard (completion rates, trends, heatmap), and browser notification reminders. Features a restaurant profile setup wizard.
- **Social Media Post Builder**: Expert content creation for various post types and platforms (Instagram, Facebook, Google Business Profile, LinkedIn, X/Twitter, Nextdoor) with brand voice settings. Includes direct posting integration via OAuth and token encryption, and a holiday calendar.
- **Smart Dashboard**: Time-based priority domain highlights (morning/afternoon/evening/weekend-aware), contextual greetings, consolidated navigation (Resources dropdown, Tools dropdown, standalone Ask Consultant), and onboarding redirect for new users.
- **Onboarding Flow**: Full-screen 3-step wizard at `/onboarding` (personal info, restaurant name, role selection) with skip option and dashboard banner for incomplete setup. Replaced modal-based onboarding.
- **Facility Command Center**: Crisis management hub with 5 tabs:
  - **Breakdown**: Equipment issue triage with AI-generated response scripts, vendor suggestions based on equipment type.
  - **PM Schedule**: Preventative maintenance planning with fail-silent monitoring.
  - **Equipment Log**: Equipment registration and maintenance history.
  - **Vendor Directory**: Repair vendor rolodex with specialty filtering, ratings, 24/7 flags, favorites, and contact info.
  - **Issues Dashboard**: Active issues tracker with status management (open/in progress/waiting parts/resolved), stats cards, and resolution tracking.
- **Kitchen Command Center**: Real-time kitchen readiness and execution engine with 5 tabs, structured data-driven inputs, and deterministic scoring:
  - **Readiness**: Structured inputs (prep sign-off toggle + time, 5 station status toggles, par shortage tags, 86 list, headcount, forecasted covers, large party toggle). Deterministic scoring breakdown (Prep 30pts, Pars 20pts, Staffing 20pts, Ticket Flow 20pts, Line Set 10pts) with top improvement areas. Carryover from last shift's debrief. Load-yesterday/last-week buttons hydrate full structured data. Daypart presets auto-fill structured inputs.
  - **Alerts**: Structured metrics (avg app/entrée times with standard references, window holding toggle, cover pace select, bottleneck station select) with color-coded status badges and AI decision support.
  - **Quick Debrief**: 60-second capture with structured dropdowns (bottleneck station, root cause, fix owner, due by) plus voice-enabled text areas. Saves debriefStructured JSON for carryover.
  - **Full Debrief**: Comprehensive post-shift analysis with free-text inputs and AI-generated system-level breakdown.
  - **Coaching**: Single-behavior picker (target station + behavior select with 7 common options) generating AI talk track, observable standard, and verification drill.
  - Historical data persistence via `kitchen_shift_data` table with JSONB columns (readiness_inputs, alerts_inputs, debrief_structured, score_breakdown, coaching_focus) for pattern detection and structured data recall.
- **Living Playbooks**: SOP management system redesigned for actual restaurant adoption:
  - **Quick Checklist Mode**: Bullet points, voice dictation, photo upload (60-180 sec creation time).
  - **Step-by-Step Mode**: Numbered steps with decision points (3-8 min creation).
  - **Deep Procedure Mode**: Full narrative with context for complex tasks.
  - **Mobile Checklist View**: One task per screen with big checkmarks for phone use.
  - **Audit/Spot-Check**: Walk through steps, mark pass/fail, photo proof capture.
  - **Acknowledgment Tracking**: Daily "I have read & understand" per role/shift.
  - **Duplicate & Copy**: Clone existing playbooks for quick variations.
  - **Version Tracking**: Track changes over time with audit pass rates.
- **Landing Page**: Conversion-optimized public marketing page with:
  - **Hero**: "Replace Chaos with Systems" headline, 7-day free trial CTA, social proof
  - **Interactive Consultant Preview**: 4 clickable example questions that swap chat preview with typing animation
  - **Product Screenshots**: "See It In Action" section with 4 generated images (Kitchen, Consultant, Food Cost, HR)
  - **Credibility Section**: "Built by an Operator" with stats cards and founder quote
  - **Expandable Domain Cards**: 12 clickable cards revealing taglines and tools inside each domain
  - **Pricing Breakdown**: Full feature checklist showing $10/month value proposition
  - **Audience Targeting**: Stronger pain-point copy for Independent Owners, Small Groups, Rising Managers + exclusion disclaimer
  - **Testimonials Placeholder**: Founding member CTA
  - **Mobile-responsive**: Sticky header, responsive grids, full-width CTAs on mobile
  - Generated product screenshot images stored in `client/src/assets/images/`
- **Employee Handbook Builder**: Comprehensive handbook generation tool integrated into Templates page:
  - **Customizable Restaurant Info**: Restaurant name, phone, address, owner/operator names, mission statement.
  - **Policy Configuration**: Uniform policies (dining room and kitchen), employee meal policy, parking policy, closed holidays, scheduling app used.
  - **Complete Handbook Generation**: 20+ sections covering employment policies, conduct standards, harassment, safety, customer service, payroll, and emergency procedures.
  - **Print-Ready Output**: Professional formatting with XSS protection, signature acknowledgment section.
  - **Auto-Save**: Settings persist to database via `handbook_settings` table.

## External Dependencies

### Third-Party Services
- **Replit Auth**: OpenID Connect for user authentication.
- **OpenAI API**: Provided via Replit AI Integrations for AI capabilities.
- **PostgreSQL**: Database hosted via Replit.
- **Stripe**: For subscription updates related to employee portal access.
- **Meta (Facebook/Instagram) API**: For direct social media posting.
- **Google Business Profile API**: For direct social media posting.

### Required Environment Variables
- `DATABASE_URL`
- `SESSION_SECRET`
- `AI_INTEGRATIONS_OPENAI_API_KEY`
- `AI_INTEGRATIONS_OPENAI_BASE_URL`
- `ISSUER_URL`
- `REPL_ID`
- `ENCRYPTION_KEY` (for social media tokens)
- `META_APP_ID`, `META_APP_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### Key NPM Packages
- **UI**: Radix UI primitives, shadcn/ui, Framer Motion, react-markdown
- **Data**: Drizzle ORM, drizzle-zod, @tanstack/react-query
- **Auth**: passport, openid-client, express-session
- **Build**: Vite, esbuild, tsx