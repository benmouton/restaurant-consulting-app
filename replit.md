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

### Food Costing System
Advanced tools for calculating plate costs and tracking weekly food cost percentages:
- **Plate Builder**: Add multiple ingredients with quantity, unit, cost per unit, and category
- **Ingredient Memory**: Save frequently used ingredients to a library for quick reuse
- **Waste Buffer Presets**: Auto-add waste based on category (protein +5%, produce +10%, dairy +3%, dry goods +2%)
- **Smart Target Defaults**: Food cost presets by restaurant type (casual 28%, brunch 30%, seafood 32%, quick service 25%)
- **Reality Check**: Instant feedback on margin status with color-coded warnings
- **Weekly Tracker**: Compare total food purchases vs total food sales to track actual food cost %
- **Historical Data**: View past weeks' food cost performance with variance from target

**Database Tables**:
- `savedIngredients`: User's saved ingredient library with cost, unit, category, waste buffer
- `savedPlates`: Costed plates with ingredients array, total cost, menu price, food cost %
- `foodCostPeriods`: Weekly/monthly tracking periods with purchases, sales, actual %, target %

**API Endpoints**:
- `GET/POST /api/ingredients`: List and save ingredients
- `GET/POST /api/plates`: List and save costed plates
- `GET/POST /api/food-cost-periods`: Track weekly/monthly food cost

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
  - Social media post generation with platform-specific captions
- **System Prompt**: Extensive domain-specific prompt for restaurant operations consulting, including proven frameworks like SHADOW → PERFORM → CERTIFY training model and ROAR task management

### Leadership Command Center
Enhanced daily task tool in the Ownership and Leadership domain with personalized AI recommendations:

**Features** (5 tabs):
- **Priorities Tab**: AI generates daily tasks based on day of week, restaurant profile, and key challenges
- **Crisis Tab**: Quick-fix emergency guidance for 6 crisis types:
  - Staff No-Show
  - Equipment Failure
  - Unexpected Rush
  - Guest Complaint
  - Delivery Problem
  - Health/Safety Issue
- **Follow-up Tab**: Interactive conversational mode to ask follow-up questions about priorities
- **Progress Tab**: Task completion tracking dashboard with:
  - Period selector (week/month) for stats filtering
  - Completion rate statistics and trends
  - Weekly trends bar chart
  - Category breakdown (prep, staffing, inventory, etc.)
  - GitHub-style activity heatmap showing daily completion patterns (8 weeks)
- **Reminders Tab**: Browser notification reminders for daily tasks:
  - Request notification permission
  - Customizable reminder time
  - localStorage persistence of preferences
  - lastReminderDate tracking to prevent duplicate same-day notifications
  - Test notification button

**Restaurant Profile Setup**: 3-step wizard to capture restaurant context:
- Step 1: Basic info (name, type, seat count, staff count)
- Step 2: Operations (location type, peak hours, labor %, food cost %)
- Step 3: Key challenges (up to 3 operational challenges)

**Database Tables**:
- `restaurant_profiles`: Stores user restaurant profile data including type, size, challenges, and financial targets
- `dailyTaskCompletions`: Tracks individual task completions with date, category, and completion status

**API Endpoints**:
- `GET /api/restaurant-profile`: Get user's restaurant profile
- `POST /api/restaurant-profile`: Save/update restaurant profile
- `GET /api/daily-tasks`: List daily tasks for user
- `POST /api/daily-tasks`: Create a daily task completion record
- `PATCH /api/daily-tasks/:id`: Update task completion status
- `GET /api/daily-tasks/stats`: Get task completion statistics for a date range
- `GET /api/daily-tasks/trends/:weeks`: Get weekly completion trends
- `GET /api/daily-tasks/heatmap`: Get daily completion data for heatmap visualization

**Component Location**: `client/src/pages/domain.tsx` (DailyTaskReminder, TaskProgressDashboard, DailyHeatmap, NotificationReminders components)

### Social Media Post Builder
AI-powered social media content creation tool available in the Social Media domain:
- **Multi-step Wizard**: Post type selection → Platforms → Event details → Tone/style → AI generation
- **Post Types**: Event promotion, Menu feature, Staff spotlight, Holiday tie-in, Weekly special, General engagement
- **Platform Support**: Instagram, Facebook, Google Business Profile with platform-specific caption optimization
- **Brand Voice Settings**: Restaurant name, voice adjectives, emoji level, hashtag style, never-say list
- **Holiday Calendar**: 25 seeded restaurant holidays (National Pizza Day, Valentine's Day, etc.) with suggested content angles

**Direct Posting Integration**:
- **OAuth Flows**: Meta (Facebook Pages + Instagram) and Google Business Profile OAuth with secure state validation
- **Token Encryption**: AES-256-GCM encryption for secure access token storage
- **Posting APIs**: Direct posting to Facebook Pages, Instagram Content Publishing, and Google Business Profile
- **Post History**: Track status of published posts across all platforms

**Database Tables**:
- `brand_voice_settings`: User-specific brand voice configuration
- `restaurant_holidays`: Seeded calendar of national food days and holidays
- `connected_accounts`: OAuth tokens (encrypted) for social media platforms
- `scheduled_posts`: Posts created by users with scheduling support
- `post_results`: Per-platform posting results with status tracking

**Required Environment Variables for Social Posting**:
- `ENCRYPTION_KEY`: Key for AES-256-GCM token encryption
- `META_APP_ID` / `META_APP_SECRET`: Meta (Facebook/Instagram) OAuth credentials
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Google Business Profile OAuth credentials

**Component Location**: `client/src/components/social-media/SocialPostBuilder.tsx`
**Service Location**: `server/socialMediaService.ts`

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