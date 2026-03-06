# The Restaurant Consultant

## Overview
The Restaurant Consultant is a full-stack web application designed to provide independent restaurant owners and operators with robust operational systems. It offers an expert operations consultant, a comprehensive framework of content, training templates, and staff management tools. The project aims to deliver repeatable systems to address operational challenges, foster discipline, enhance efficiency, and act as an invisible expert. Key capabilities include advanced staff scheduling, employee portal access, labor demand analysis, food costing, and an expert-driven leadership command center.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **Styling**: Tailwind CSS with shadcn/ui (New York style), Radix UI-based components
- **Animations**: Framer Motion
- **Build Tool**: Vite
- **Key Design Decisions**: Path aliases, Replit Auth integration, streaming chat with markdown.

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Style**: RESTful endpoints
- **Authentication**: Replit Auth (OpenID Connect) with Passport.js
- **Session Management**: PostgreSQL-backed sessions (`connect-pg-simple`)
- **Key Design Decisions**: Modular integration pattern, custom build scripts, production builds to `dist/`.

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema**: Defined in `shared/schema.ts` and `shared/models/`, covering users, sessions, conversations, and restaurant management entities.

### Core Features & Implementations
- **Staff Management**: Comprehensive scheduling, employee portal, labor demand analysis.
- **Financial Management**: Food costing system with plate costing, ingredient memory, and historical tracking. Includes `MarginStatusStrip` and `FoodCostCalculator` with detailed input and output views.
- **Subscription & Access Control**: Freemium tiers (Free/Basic/Pro) with domain-based feature gating and Role-Based Access Control (Owner, General Manager, Manager).
- **Consulting Engine**: OpenAI-powered operational consultant with persistent conversation history, context-aware suggestions, and formatted responses.
- **Operational Command Centers**:
    - **Leadership**: Daily task management, crisis guidance, progress tracking.
    - **Crisis Management**: `CrisisReadinessStrip` and `CrisisResponseEngine` with scenario selection, severity triage, phase tracking, and post-crisis debriefing. Includes an "Owner Overwhelmed" mode.
    - **Facility**: `AssetHealthStrip` and `FacilityCommandCenter` for breakdown logging, PM scheduling, equipment management, and vendor tracking.
    - **Kitchen**: `KitchenStatusStrip` and `KitchenComplianceEngine` for real-time readiness, alerts, quick logging, debriefing, and coaching.
- **Content & Training**: Enhanced content accordions for operational frameworks (Principles, Frameworks, Checklists, Scripts).
- **Labor Demand Engine**: `StaffingMetricStrip` and `LaborDemandEngine` for labor forecasting, staffing recommendations, and cost analysis.
- **HR Documentation Engine**: `HRStatusStrip` and `HRComplianceEngine` for progressive discipline tracking, policy management, and HR records viewing.
- **Living Playbooks**: SOP management system with various creation modes, mobile checklist view, audit capabilities.
- **Employee Handbook Builder**: Customizable handbook generation.
- **Reviews & Reputation**: `ReputationStatusStrip` and `ReviewResponseGenerator` for AI-powered review responses, including OCR for review text.
- **Marketing & Onboarding**: Conversion-optimized landing page and multi-step onboarding wizard.

## External Dependencies

### Third-Party Services
- **Replit Auth**: User authentication.
- **OpenAI API**: AI capabilities via Replit AI Integrations.
- **PostgreSQL**: Database hosting.
- **Stripe**: Subscription management.
- **Meta (Facebook/Instagram) API**: Direct social media posting.
- **Google Business Profile API**: Direct social media posting.

### Capacitor (iOS Native)
- **Native Plugins**: @capacitor/browser, @capacitor/preferences, @capacitor/push-notifications, @capacitor/camera, @capacitor/haptics, @capacitor/share, @capacitor/network, @capacitor-community/apple-sign-in, capacitor-native-biometric, @capacitor-mlkit/text-recognition.