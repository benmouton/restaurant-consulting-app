# The Restaurant Consultant

## Overview

A full-stack web application designed for restaurant owners and operators to build durable operational systems. The app provides an AI-powered restaurant consultant, operational framework content organized by domain, training templates, and staff management tools. Built on real-world restaurant operations methodology from Mouton's Bistro.

The core philosophy: "Restaurants fail from lack of structure, not lack of effort." The system helps independent restaurants build repeatable systems that remove chaos through service standards, training protocols, accountability frameworks, and operational discipline.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for UI transitions
- **Build Tool**: Vite with hot module replacement

**Key Design Decisions**:
- Path aliases configured: `@/` for client src, `@shared/` for shared code
- Authentication state managed via `useAuth` hook connected to Replit Auth
- Chat interface uses streaming responses with real-time markdown rendering
- Component library based on Radix UI primitives for accessibility

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Style**: RESTful endpoints under `/api/*`
- **Authentication**: Replit Auth via OpenID Connect with Passport.js
- **Session Management**: PostgreSQL-backed sessions via connect-pg-simple

**Key Design Decisions**:
- Server code in `server/` directory, shared types in `shared/`
- Modular integration pattern in `server/replit_integrations/` for auth, chat, image generation, and batch processing
- Custom build script bundles server with esbuild, client with Vite
- Production builds output to `dist/` with static file serving

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` with domain models in `shared/models/`
- **Migrations**: Drizzle Kit with `db:push` command

**Core Tables**:
- `users` and `sessions`: Replit Auth user management with role-based access
- `conversations` and `messages`: AI chat history
- `domains` and `framework_content`: Operational framework structure
- `user_bookmarks`: User-saved content
- `training_templates`: Staff training materials (FOH/BOH)
- `staff_positions`: Staff positions with color coding (FOH/BOH departments)
- `staff_members`: Employee records linked to positions
- `shifts`: Weekly shift scheduling with status (scheduled/open/completed)
- `shift_applications`: Staff applications for open shifts
- `staff_announcements`: Team announcements with priority levels
- `announcement_reads`: Tracking which users have read announcements

### Staff Scheduling System
A Sling-style scheduling system for managing restaurant shifts:
- **Weekly Calendar View**: Visual shift display with position-based color coding
- **Staff Management**: Add/edit staff members with position assignments and hourly pay rates
- **Position Management**: Define positions (Server, Bartender, Line Cook, etc.) with custom colors
- **Pay Rate Tracking**: Staff members have hourly rates stored for labor cost calculation
- **Daily Labor Cost**: Schedule view shows estimated labor cost per day based on scheduled shifts and staff pay rates
- **Open Shift Tracking**: Mark shifts as open and allow staff to apply
- **Announcements**: Post team announcements with priority levels (low, normal, high, urgent)
- **Dashboard Integration**: Quick stats showing staff count, positions, today's shifts, week shifts, open shifts, and unread announcements

### Employee Portal System
Separate authentication system for staff members to access scheduling without full platform access:
- **Invite System**: Owners/GMs generate unique invite links for staff members via "Send Invite" button
- **Employee Authentication**: Email/password login separate from Replit Auth, stored in staff_members table
- **Restricted Access**: Employees can only view their schedule, announcements, and apply for open shifts
- **Billing Integration**: Each employee with portal access adds $5/month to the subscription

**Key Implementation Details**:
- `inviteToken`: Unique one-time token for invite links
- `inviteStatus`: Tracks "none", "pending", or "accepted" status
- `passwordHash`: bcrypt-hashed passwords for employee login
- `ownerId`: Links staff member to subscription owner for billing
- Employee routes under `/employee/*` with dedicated session management
- Stripe subscription automatically updated when employees accept invites or are removed

### Role-Based Access Control (RBAC)
The application implements a three-tier role hierarchy:
- **Owner**: Full access to all features including financial analysis, P&L tools, strategic planning, and staff management
- **General Manager**: Access to operations, training, AI consulting, and staff management. Cannot access financial tools
- **Manager**: Access to shift operations, checklists, training, and AI consulting. Cannot access financials or send to staff features

**Key Implementation Details**:
- Role is selected during onboarding and can be changed in Account Settings
- `useRole` hook provides permissions and role checking throughout the app
- `RoleGate` component protects routes/features requiring specific roles
- Default role is "manager" (lowest privilege) for security when role is undefined
- Role constants defined in `shared/models/auth.ts` (USER_ROLES)
- Permissions mapped per role in `client/src/hooks/use-role.ts`

### AI Integration
- **Provider**: OpenAI API via Replit AI Integrations
- **Use Cases**: 
  - Restaurant consultant chat with streaming responses
  - Image generation for operational materials
- **System Prompt**: Extensive domain-specific prompt for restaurant operations consulting, including proven frameworks like SHADOW → PERFORM → CERTIFY training model and ROAR task management

## External Dependencies

### Third-Party Services
- **Replit Auth**: OpenID Connect authentication with automatic user provisioning
- **OpenAI API**: Chat completions and image generation via Replit AI Integrations environment variables (`AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`)
- **PostgreSQL**: Database provisioned via Replit with `DATABASE_URL` environment variable

### Required Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Express session encryption key
- `AI_INTEGRATIONS_OPENAI_API_KEY`: OpenAI API key
- `AI_INTEGRATIONS_OPENAI_BASE_URL`: OpenAI base URL
- `ISSUER_URL`: OIDC issuer (defaults to Replit)
- `REPL_ID`: Replit environment identifier

### Key NPM Packages
- **UI**: Radix UI primitives, shadcn/ui, Framer Motion, react-markdown
- **Data**: Drizzle ORM, drizzle-zod, @tanstack/react-query
- **Auth**: passport, openid-client, express-session
- **Build**: Vite, esbuild, tsx