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
    - **Kitchen**: Real-time readiness and execution engine with structured inputs, deterministic scoring, alerts, and structured debriefs.
- **Content & Training**: Enhanced content accordions for operational frameworks (Principles, Frameworks, Checklists, Scripts), including interactive elements and metric displays.
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