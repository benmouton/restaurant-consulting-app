# The Restaurant Consultant

## Overview
A full-stack web application for restaurant owners and operators, designed to build durable operational systems. It offers an AI-powered consultant, operational framework content, training templates, and staff management tools. The project's vision is to provide independent restaurants with repeatable systems to overcome operational challenges and foster discipline. Key capabilities include comprehensive staff scheduling, employee portal access, labor demand analysis, food costing, and an AI-driven leadership command center.

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
- **Core Tables**: `users`, `sessions`, `conversations`, `messages`, `domains`, `framework_content`, `user_bookmarks`, `training_templates`, `staff_positions`, `staff_members`, `shifts`, `shift_applications`, `staff_announcements`, `announcement_reads`, `savedIngredients`, `savedPlates`, `foodCostPeriods`, `restaurant_profiles`, `dailyTaskCompletions`, `brand_voice_settings`, `restaurant_holidays`, `connected_accounts`, `scheduled_posts`, `post_results`.

### Core Features & Implementations
- **Staff Scheduling System**: Sling-style scheduling with weekly calendar, staff/position management, pay rate tracking, daily labor cost calculation, open shift tracking, and announcements.
- **Employee Portal System**: Separate authentication for staff to view schedules and announcements, managed via invite links and `staff_members` table. Integrates with Stripe for billing based on employee access.
- **Labor Demand & Cut-Decision Engine**: Cover-driven staffing tool with real-time labor calculations, metrics dashboard, color-coded labor percentage, gap indicators, and quick recommendations. Supports pre-shift planning and mid-shift decisions.
- **Food Costing System**: Tools for plate costing, ingredient memory, waste buffer presets, target defaults, and weekly food cost tracking with historical data.
- **Role-Based Access Control (RBAC)**: Three roles (Owner, General Manager, Manager) with distinct feature access, implemented via `useRole` hook and `RoleGate` component.
- **AI Integration**: Utilizes OpenAI API via Replit AI Integrations for restaurant consulting chat, image generation, and social media post generation, driven by a domain-specific system prompt.
- **Leadership Command Center**: Daily task management tool with AI-generated priorities, crisis guidance, follow-up mode, progress tracking dashboard (completion rates, trends, heatmap), and browser notification reminders. Features a restaurant profile setup wizard.
- **Social Media Post Builder**: AI-powered content creation for various post types and platforms (Instagram, Facebook, Google Business Profile) with brand voice settings. Includes direct posting integration via OAuth and token encryption, and a holiday calendar.

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