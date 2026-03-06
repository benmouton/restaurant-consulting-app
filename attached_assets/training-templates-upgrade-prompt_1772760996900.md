# Replit Prompt — Training Templates Major Upgrade

Paste this directly into Replit chat:

---

I need a **major upgrade** to the **Training Templates** page. Keep the established dark theme: background `#0f1117`, gold/amber accent `#b8860b` / `#d4a017`, card backgrounds `#1a1d2e`, white primary text, muted gray secondary text. Match the visual style used across all other upgraded sections (Kitchen Operations, HR & Documentation, Staffing & Labor, Training Systems, Cost & Margin Control, Reviews & Reputation, SOPs & Scalability, Crisis Management, Facilities & Asset Protection, Social Media, Staff Scheduling, Ask the Consultant).

**DO NOT CHANGE:**
- Any existing AI API call logic or Claude API integration
- The existing 7-tab structure: Server / Kitchen / Host / Bartender / Manager / Busser / Handbook
- The existing Server and Kitchen manual content (Day 1–7 structure, all section copy)
- The Employee Training Progress accordion and "Assign Training" button logic
- The Handbook Builder logic: Setup / Policies / Preview sub-tabs, all form fields and their save logic, policy toggle logic, Print button, Save Settings button
- All existing handbook field data (restaurant name, owner, address, phone, email, mission, scheduling app dropdown, holidays, uniform policy, employee benefits, all policy content)
- The Principles and Frameworks accordion content (if present)
- Page routing or file structure
- Any other domain pages

---

## 1. Page Header — Training Intelligence Strip

Below the "Real Training Templates" title and subtitle, add a horizontal strip of 4 dark metric cards with gold left border:

- **Roles with Manuals** — count of tabs that have full content (not "Coming Soon"). Default: "2 of 6 roles"
- **Handbook Status** — "Complete" (gold) if Setup fields are filled + at least 1 policy toggled, "In Progress" (amber) if some fields filled, "Not Started" (muted) if empty. Default: "Not Started"
- **Staff Assigned** — total count of active training assignments across all role tabs. Default: "0 assigned"
- **Handbook Policies** — count of currently toggled-on policies out of 12. Default: "0 of 12"

Style: compact dark cards (`#1a1d2e`), gold left border 3px, muted label on top, white value below. Matches the exact card style from all other upgraded sections.

---

## 2. Tab Bar — Visual Upgrade + Coming Soon State

Redesign the 7-tab navigation bar:

**Active tab:** Gold border (`#b8860b`), white text, `#1a1d2e` background.
**Inactive tab (has content — Server, Kitchen, Handbook):** Muted white text, dark background, subtle border. Small gold dot indicator below label.
**Inactive tab (Coming Soon — Host, Bartender, Manager, Busser):** Muted gray text, italic, no dot. Small "Soon" badge in top-right corner of the tab chip (gold outlined, tiny text, `8px`).

The gold active border should animate in (150ms ease) when switching tabs — matches the chip treatment from other sections.

---

## 3. Coming Soon Tabs — Replace Empty State with AI-Powered Preview Builder

Currently Host, Bartender, Manager, and Busser tabs show an empty centered "Coming Soon" card. Replace each with a more useful interim state:

**Layout (same for all 4 Coming Soon tabs):**

### Top: AI Quick-Start Panel
A dark card (`#1a1d2e`) with gold left border titled "**Generate a [Role] Training Outline**" with subtitle "No full manual yet — but AI can build you a working outline in seconds."

Two fields:
1. **Key Responsibilities** — placeholder text per role:
   - Host: "Greet guests, manage waitlist, seat parties, answer phones"
   - Bartender: "Craft cocktails, manage bar inventory, responsible alcohol service"
   - Manager: "Open/close procedures, labor management, conflict resolution, shift reports"
   - Busser: "Table turnover, support servers, dish handling, section cleanliness"
2. **Training Duration** — dropdown: "3 days", "5 days", "7 days", "10 days", "2 weeks"

Gold "**Generate [Role] Outline**" button (shimmer on hover). On click: calls Claude API with a system prompt: `"You are an expert restaurant training director. Generate a structured training outline for a [role] at [restaurant name]. Format as: Day 1: [Title] — [2-3 bullet objectives]. Day 2: [Title] — etc. Keep it practical and operator-ready."` Display the streaming response in a styled output card below the button (same streaming treatment as other AI outputs across the platform — gold left border during streaming, turns static on complete).

### Bottom: Coming Soon Details Card
Keep the existing description text and "Until this track is available…" note but restyle:
- Dark card, muted border
- Role icon in gold (different per role: 🎭 Host, 🍸 Bartender, 👔 Manager, 🍽️ Busser)
- "Coming Soon" badge: gold outlined chip (not the plain gray badge currently shown)
- Add: "Notify me when this launches" checkbox (stores preference in localStorage per role)

---

## 4. Server & Kitchen Tabs — Visual Overhaul (No Content Changes)

### Left Panel (Manual Table of Contents)
Redesign the left sidebar panel:

- Card background: `#1a1d2e`, border: 1px solid `rgba(255,255,255,0.06)`
- Role header: gold graduation cap icon, white role name, muted description
- Section labels (INTRODUCTION, TRAINING SCHEDULE, etc.): gold uppercase tracking-widest, `10px`, muted — same treatment as section dividers used across the platform
- Selected item: `rgba(184,134,11,0.15)` background, gold left border 3px, white text
- Unselected item: dark background, muted text, subtle hover state
- Type badges ("overview", "procedure", "policy", "quiz"): each gets a distinct color:
  - `overview` → gold `#b8860b`
  - `procedure` → blue `#3b82f6`
  - `policy` → amber `#f59e0b`
  - `quiz` → green `#10b981`
  (Currently all badges are the same color — color-coding them instantly communicates content type at a glance)
- Smooth scroll-into-view when an item is selected

### Right Panel (Content Viewer)
Redesign the content display panel:

- Card background: `#1a1d2e`
- Section title: white, `20px`, bold
- Breadcrumb: muted gray, `12px` (e.g., "Server Manual → Training Schedule → Day 1")
- KEY POINTS chips: styled as gold-outlined chips (not flat dark chips). Gold border `1px solid #b8860b`, `rgba(184,134,11,0.08)` fill, white text
- Content body: muted white `#e2e8f0`, `15px`, line-height `1.7` — same as content body treatment across the platform
- **Action tray** (top-right of content panel, alongside existing Print button):
  - 📋 **Copy** — copies the section content to clipboard
  - ✏️ **Edit Notes** — opens an inline notes textarea below the content (saves to localStorage per section). Gold "Save Note" button. Saved note appears as a gold-bordered callout block below the main content with label "Your Notes"
  - 📤 **Share** — Web Share API / clipboard: copies the section title + content as plain text
  - 🖨️ **Print** — preserves existing print behavior
- Type badge shown in top-right of content panel (matches color scheme above)

---

## 5. Employee Training Progress — Visual Overhaul + Assign Training Modal Upgrade

### Accordion Header
- Gold graduation cap icon (already present — keep)
- "Employee Training Progress" label: white, bold
- Gold chevron (matches accordion treatment across all upgraded sections)
- Collapsed/expanded state with 200ms ease animation

### Empty State
Replace the plain clock icon + gray text with:
- Gold graduation cap SVG (48px)
- "No training assigned yet" in white
- Sub-text: "Assign a training track to a staff member to track their progress here." in muted gray
- Gold "Assign Training" button (matches gold button style: gradient, shimmer on hover)

### Assign Training Modal Upgrade
When "Assign Training" is clicked, upgrade the modal to match the platform's modal style:
- Dark background `#1a1d2e`, border `rgba(255,255,255,0.1)`, border-radius `12px`
- Modal title: "Assign Training Track" with graduation cap icon
- Fields:
  1. **Staff Member Name** — text input (gold focus ring)
  2. **Role** — dropdown: Server / Kitchen / Host / Bartender / Manager / Busser (matching the tab structure)
  3. **Start Date** — date input
  4. **Notes** — optional textarea (e.g., "returning employee, skip Day 1")
- Gold "Assign Training" button, muted "Cancel" button
- On save: adds a progress card to the accordion showing: name, role badge (color-coded by role), start date, day progress bar (e.g., "Day 2 of 7"), and a "Mark Complete" button

### Active Assignment Cards
When assignments exist, show them as dark cards (`#1a1d2e`) with:
- Left: colored role badge (Server = gold, Kitchen = blue, etc.)
- Center: staff name (white, bold), role + start date (muted)
- Right: progress bar (gold fill, dark track) showing day X of 7, "Mark Complete" ghost button
- Tap/click on card: expands inline to show which days are completed with checkboxes (stored in localStorage)

---

## 6. Handbook Tab — Visual Overhaul (No Logic Changes)

### Sub-tab Bar (Setup / Policies / Preview)
Redesign to match the platform's inner tab treatment:
- Active sub-tab: white text, `#0f1117` background (full dark fill), no border
- Inactive sub-tab: muted gray text, `#1a1d2e` background
- Gold bottom border on active tab (2px)

### Setup Sub-tab
- Section headers (Restaurant Information, Operations, Uniform Policy, Employee Benefits): gold icon + white label, matching the section divider treatment from other modules
- All input fields: `#0f1117` background, gold focus ring (`#b8860b`, 1.5px), white text, rounded `8px`
- Scheduling App dropdown: styled to match platform dropdowns (dark background, gold chevron)
- Holiday chips: gold-outlined remove × button
- "Add a holiday" input: gold focus ring, "Add" button as gold outlined ghost button
- Uniform Policy textareas: same dark input treatment
- Completeness indicator: small progress bar under the section header showing what % of Setup fields are filled (e.g., "Restaurant Information — 4 of 6 fields complete"). Gold fill on progress bar.

### Policies Sub-tab
- Section header "Standard Policies" + "12 of 12 policies included" badge: badge styled as gold chip
- Each policy row: `#1a1d2e` card, subtle bottom border `rgba(255,255,255,0.04)`
- Checkbox: when checked → gold fill with white checkmark (matches platform checkbox style)
- Policy name: white bold; description: muted gray `13px`
- On hover: subtle gold left border appears (2px, `rgba(184,134,11,0.4)`)
- "Add Custom Policy" button at bottom of list: gold outlined ghost button with + icon. Clicking opens an inline form (Policy Name + Description fields) that adds a new toggleable row to the list (stored in localStorage).

### Preview Sub-tab
- Handbook preview container: white background (`#ffffff`), dark text — this is intentional since it's a print document preview. Add a thin gold outer border `2px solid #b8860b` around the white preview card to frame it within the dark UI.
- Add a floating action bar above the preview (inside the sub-tab, not on the page): Print button (matches existing), + **Download as PDF** button (gold, shimmer) using `window.print()` with `@media print` CSS, + **Copy All Text** (ghost button).
- "MOUTON'S BISTRO & BAR" heading in the preview: style in a slightly larger font + add a thin gold rule below it (matching what's already partially there).

---

## 7. AI Training Enhancement — "Customize This Section" Button

On each content section in the Server and Kitchen manuals, add a small "✨ Customize with AI" ghost button in the action tray. On click:

Opens a slide-in panel (right side, 380px wide, dark `#1a1d2e`, gold top border) titled "Customize This Section":
- Pre-filled context: section name + first 200 chars of content shown in a muted blockquote
- **Customization Request** textarea: placeholder "e.g., Add a section about our signature dishes, Make this stricter about late arrivals, Add bilingual Spanish instructions..."
- Gold "**Generate Customization**" button (shimmer on hover)
- On click: calls Claude API with system prompt: `"You are a restaurant training expert. The operator wants to customize the following training section for their restaurant [restaurant name]. Rewrite or extend the section based on their request, keeping the same structured format. Section: [section title]. Original content: [first 300 chars]. Operator request: [textarea value]."` Stream the response in a styled output card below.
- Below the output: "**Replace Section**" button (gold) + "**Add as Notes**" button (ghost) — Replace overwrites the section content in localStorage; Add as Notes appends to the notes field from section 4.

---

## 8. Cross-Tab Integration

1. **Handbook Setup → Training Tabs:** The restaurant name from Handbook Setup populates the personalization subtitle ("These training templates are personalized for **[Restaurant Name]**") dynamically instead of being hardcoded.
2. **Training Assignments → Header Strip:** The "Staff Assigned" metric card (section 1) reads from localStorage training assignment count in real time.
3. **Policies Toggle → Header Strip:** The "Handbook Policies" metric card reads from the live toggle state.
4. **Handbook Completeness → Header Strip:** "Handbook Status" reads from Setup field completion + policy toggle state.

---

## 9. Visual Polish & Animations

- **Staggered entrance:** Header strip → tab bar → content panels fade in with 80ms offsets
- **Tab switch:** Content panel fades out (100ms) and fades in (150ms) — no slide, just crossfade
- **Badge color-coding:** Type badges (overview/procedure/policy/quiz) animate color fill in on first render (200ms)
- **TOC item select:** Gold left border slides in from left (150ms ease)
- **Assign Training modal:** Slides up from bottom (250ms ease), backdrop blur
- **Handbook completeness bars:** Animate fill width on first render (400ms ease)
- **Gold button shimmer:** Diagonal light sweep on hover — matches all other upgraded sections
- **Coming Soon AI output:** Same gold streaming border + typing dots treatment from Ask the Consultant upgrade
- **Toast notifications:** Bottom-center, dark background, gold left border, auto-dismiss 2.5s — for Copy confirmations, Save Notes, Assign Training saved

---

## 10. Mobile Responsiveness

- Tab bar: horizontal scroll, no line wrap, Coming Soon tabs retain "Soon" badge
- Server/Kitchen layout: single column on mobile (TOC collapses to a dropdown selector at top, content panel below)
- Assign Training modal: full-width bottom sheet on mobile
- Header strip: 2×2 grid on mobile
- Handbook sub-tabs: full-width pill tabs
- Preview panel: pinch-to-zoom on mobile (add `touch-action: pan-zoom` to preview container)
- "Customize with AI" panel: full-screen overlay on mobile instead of side panel

---

## Implementation Order

1. Page header Training Intelligence strip (4 metric cards)
2. Tab bar redesign (active/inactive states, Coming Soon badges)
3. Coming Soon tabs: AI Quick-Start Generator + restyle empty state
4. Server/Kitchen TOC left panel visual overhaul (badge colors, selected state)
5. Server/Kitchen content right panel overhaul (breadcrumb, chips, action tray)
6. "Customize with AI" slide-in panel + Claude API integration
7. Employee Training Progress empty state + modal upgrade
8. Active assignment cards with progress bars
9. Handbook Setup sub-tab field redesign + completeness bars
10. Handbook Policies sub-tab redesign + Add Custom Policy
11. Handbook Preview sub-tab framing + Download/Copy buttons
12. Cross-tab integration (all 4 data connections)
13. All animations + transitions
14. Mobile responsiveness pass

Make all changes to the Training Templates page files only. Preserve all existing manual content, handbook field data, policy logic, Print functionality, Save Settings logic, and accordion behavior exactly as-is.
