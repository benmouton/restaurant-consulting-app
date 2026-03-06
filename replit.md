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
- **Consulting Engine**: AI-driven consultant chat with domain-specific context, smart prompt starters, and conversation history.
- **Operational Command Centers**: Specialized modules for Leadership, Crisis Management, Facility Management, and Kitchen Operations, each with tailored tools and AI assistance.
- **Content & Training**: Dynamic training templates, a handbook builder, and personalized content generation based on restaurant-specific information.
- **Labor Demand Engine**: Forecasting and analysis for labor needs.
- **HR Documentation Engine**: Tools for progressive discipline tracking and policy management.
- **Living Playbooks**: AI-generated and customizable operational playbooks with different execution modes (checklist, step-by-step).
- **Employee Handbook Builder**: Comprehensive tool for creating custom employee handbooks with detailed setup sections.
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