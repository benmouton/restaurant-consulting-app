# Restaurant Consultant Application Design Guidelines

## Design Approach
**System**: Fluent Design + Carbon Design hybrid for enterprise productivity
**Rationale**: Professional business tool requiring data clarity, efficiency, and authoritative presence

## Typography
**Families**: 
- Primary: Inter (headings, UI elements)
- Secondary: IBM Plex Sans (body text, data tables)

**Scale**:
- H1: 32px/semibold (page headers)
- H2: 24px/semibold (section titles)
- H3: 18px/medium (card headers)
- Body: 15px/regular (content)
- Small: 13px/regular (metadata, captions)

## Layout System
**Spacing Units**: Use Tailwind units 2, 4, 6, 8, 12, 16
- Component padding: p-6
- Section spacing: mb-8 to mb-12
- Card gaps: gap-6
- Sidebar padding: p-4

**Grid Structure**:
- Sidebar: Fixed 280px width
- Main content: Full remaining width with max-w-7xl container
- Dashboard cards: 3-column grid (lg:grid-cols-3) for metrics, 2-column (lg:grid-cols-2) for detailed sections

## Navigation Architecture

**Sidebar (280px fixed)**:
- Logo area at top (h-16)
- Primary nav sections with icon + label
- Sections: Dashboard, Frameworks, Training, Consulting, Financial Tools, Resources
- User profile/settings at bottom
- Collapsible sub-navigation for nested items

**Top Bar**:
- Breadcrumb navigation (left)
- Search bar (center-right)
- Notifications + user avatar (right)
- Height: 64px

## Core Components

**Dashboard Cards**:
- Elevated appearance with subtle borders
- Header with title + action icon
- Metric cards: Large number (32px), label below (13px), trend indicator
- Content cards: Standard padding (p-6), organized data sections

**Data Tables**:
- Zebra striping for rows
- Sticky headers on scroll
- Action buttons (right-aligned in rows)
- Sortable columns with clear indicators
- Pagination controls at bottom

**Forms**:
- Left-aligned labels above inputs
- Input height: h-10
- Clear validation states with inline error messages
- Multi-step forms with progress indicator
- Action buttons: primary (right), secondary (left)

**Consulting Interface**:
- Chat-style conversation panel (right side, 400px)
- Input area with send button at bottom
- Conversation bubbles: Consultant responses (left-aligned), user queries (right-aligned)
- Suggested prompts as clickable chips

**Framework/Template Cards**:
- Grid layout (3 columns desktop, 1 mobile)
- Preview thumbnail at top
- Title + brief description
- Tags for categorization
- "Use Template" CTA button

## Visual Hierarchy

**Page Structure**:
1. Page header with title + primary action (h-20)
2. Quick stats/metrics bar (if applicable)
3. Main content area with appropriate grid
4. Secondary information in right rail (if needed)

**Emphasis Patterns**:
- Primary CTAs: Solid buttons, prominent placement
- Data visualization: Charts with clear legends, minimal decoration
- Status indicators: Subtle badges (completed/in-progress/pending)

## Images

**Hero Image**: 
None - This is a dashboard application. Instead, use illustrated graphics for empty states and onboarding screens.

**Supporting Images**:
- Framework templates: Preview screenshots (16:9 ratio)
- Training modules: Course thumbnails (4:3 ratio)
- User avatars: 40px circular
- Empty states: Centered illustrations (300x200px) with helpful text

**Placement**:
- Dashboard: Metric visualization charts, no decorative images
- Framework library: Grid of template preview cards
- Training section: Course thumbnails in list/grid view
- AI interface: Small bot avatar (32px) for AI responses

## Animations
Minimal, performance-focused:
- Sidebar expand/collapse: 200ms ease
- Card hover: Subtle elevation shift
- Data table sorting: Smooth 150ms transitions
- No scroll-triggered animations

## Responsive Behavior
- Desktop (1024px+): Full sidebar + multi-column grids
- Tablet (768-1023px): Collapsible sidebar + 2-column grids
- Mobile (<768px): Hamburger menu + single column, bottom tab navigation for key sections