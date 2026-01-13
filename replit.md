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
- `users` and `sessions`: Replit Auth user management
- `conversations` and `messages`: AI chat history
- `domains` and `framework_content`: Operational framework structure
- `user_bookmarks`: User-saved content
- `training_templates`: Staff training materials (FOH/BOH)

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