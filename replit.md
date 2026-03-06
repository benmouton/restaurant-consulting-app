# The Restaurant Consultant

## Overview
The Restaurant Consultant is a full-stack web application providing independent restaurant owners with robust operational systems. It offers an expert operations consultant, a comprehensive framework of content, training templates, and staff management tools. The project aims to deliver repeatable systems to address operational challenges, enhance efficiency, and act as an invisible expert. Key capabilities include advanced staff scheduling, labor demand analysis, food costing, financial insights, AI-powered consulting, operational command centers (Leadership, Crisis, Facility, Kitchen), and an employee portal.

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
- **Key Design Decisions**: Modular integration pattern, custom build scripts.

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema**: Covers users, sessions, conversations, and restaurant management entities.

### Core Features
- **Staff Scheduling**: Advanced scheduling interface with AI features for schedule building and labor impact analysis. Includes employee portal integration.
- **Financial Insights**: Tools for document upload, financial analysis, text extraction, and an AI-powered financial consultant.
- **Consulting Engine**: AI-driven consultant chat with dynamic system prompt that injects operator's full restaurant profile and financial data. Context indicator bar shows restaurant name, prime cost status, and variance. System prompt includes restaurant profile, financial metrics, variances, operational context, and behavioral instructions. Endpoint: `/api/consultant/ask` with dynamic `buildConsultantSystemPrompt(userId)`. Context API: `/api/consultant/context`.
- **Operational Command Centers**: Specialized modules for Leadership, Crisis Management, Facility Management, and Kitchen Operations, each with tailored tools and AI assistance.
- **Content & Training**: Dynamic training templates (Server, Kitchen, Bartender, Manager), a handbook builder, and personalized content generation based on restaurant-specific information. Kitchen manual templates feature expanded industry-standard content with Temperature Reference Card, FIFO protocol, cross-contamination prevention, station setup checklists, kitchen calls reference, ticket reading/timing standards, quality check protocol, station close-down checklists, sanitation log, 10-question written assessment, trainer sign-off sheet, 90-day probation card, and certification closing block. Bartender manual covers bar layout, TABC/alcohol compliance, spirits/beer/wine knowledge, cocktail fundamentals with classic reference table, POS/cash handling, speed bar operations, guest experience with upsell scripts, CALM de-escalation method, bar close/sanitation checklists, and full certification with 10-question written assessment. Manager manual is a 10-day/2-week certification program covering orientation/leadership, FOH operations (ROAR), BOH/food safety, bar/TABC (CALM), POS/cash handling, labor/prime cost, food cost/inventory/vendors, HR/TWC compliance, guest experience/crisis (HEAR), opening/closing procedures, 15-question written assessment, practical evaluation, trainer sign-off, 90-day probation card. Templates use {{variable}} placeholders mapped to handbook_settings fields. Bar Program setup fields: barManager, headBartender, alcoholPermit, signatureCocktail1/2/3, draftBeerCount, closingTime. Manager Operations setup fields: laborTargetPct, foodCostTarget, primeCostTarget, safeDropProcedure, vendorList, emergencyContacts, reservationSystem, totalCovers, avgTurnTime, openingTime.
- **Manual Export System**: Print, PDF (via browser print-to-PDF), and DOCX export for all training manuals. Sticky action bar with Print/Download PDF/Share & Export buttons. DOCX export uses the `docx` package with structured headings, checklists, bullet items, tables, and professional formatting. Export utility: `client/src/lib/manualExport.ts`.
- **Labor Demand Engine**: Forecasting and analysis for labor needs.
- **HR Documentation Engine**: Tools for progressive discipline tracking and policy management.
- **Living Playbooks**: AI-generated and customizable operational playbooks with different execution modes (checklist, step-by-step).
- **Employee Handbook Builder**: Comprehensive tool for creating custom employee handbooks with detailed setup sections. Financial Profile section added with fields: weeklyRevenue, avgCheck, weeklyCovers, foodCostActual, laborCostActual, operatingDays, serviceModel, topChallenge. Auto-calculated prime cost (target and actual) with amber/green indicators. Completeness calculation weighted: 40% basic fields, 60% financial fields.
- **Reviews & Reputation**: AI-powered response generation for customer reviews, including OCR capabilities.
- **Social Media**: A social media management tool for post creation, scheduling, and brand voice preview, integrated with external platforms.
- **Dashboard**: A personalized landing page providing an overview of key operational metrics, quick access to features, and dynamic priority displays.
- **Subscription & Access Control**: Freemium model with domain-based feature gating and Role-Based Access Control (Owner, General Manager, Manager).
- **Marketing & Onboarding**: Conversion-optimized landing page and a multi-step onboarding wizard.

## External Dependencies

### Third-Party Services
- **Replit Auth**: User authentication.
- **OpenAI API**: AI capabilities.
- **PostgreSQL**: Database hosting.
- **Stripe**: Subscription management.
- **Meta (Facebook/Instagram) API**: Direct social media posting.
- **Google Business Profile API**: Direct social media posting.

### Capacitor (iOS Native)
- **Native Plugins**: Used for browser functionality, preferences, push notifications, camera, haptics, sharing, network status, Apple sign-in, biometric authentication, and ML Kit text recognition.