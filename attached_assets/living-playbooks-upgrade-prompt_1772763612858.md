# Replit Prompt — Living Playbooks Major Upgrade

Paste this directly into Replit chat:

---

I need a **major upgrade** to the **Living Playbooks** page. Keep the established dark theme: background `#0f1117`, gold/amber accent `#b8860b` / `#d4a017`, card backgrounds `#1a1d2e`, white primary text, muted gray secondary text. Match the visual style used across all other upgraded sections (Kitchen Operations, HR & Documentation, Staffing & Labor, Training Systems, Cost & Margin Control, Reviews & Reputation, SOPs & Scalability, Crisis Management, Facilities & Asset Protection, Social Media, Staff Scheduling, Ask the Consultant, Training Templates).

**DO NOT CHANGE:**
- Any existing AI API call logic or Claude API integration
- The existing playbook creation logic (title, description, category, role assignment, creation mode)
- The 3 Creation Modes: Quick Checklist / Step-by-Step / Deep Procedure — their labels, descriptions, and generation behavior
- The Category dropdown options: Opening, Closing, Prep, Service, Cleaning, Safety, Training, Other
- The Assign to Role dropdown options: Back of House, Front of House, Management, All Roles
- The existing search and filter logic
- The Principles and Frameworks accordion content (if present)
- Page routing or file structure
- Any other domain pages

---

## 1. Page Header — Playbook Intelligence Strip

Below the "Living Playbooks & Repeatable Execution" title and subtitle, add a horizontal strip of 4 dark metric cards with gold left border:

- **Total Playbooks** — count of all saved playbooks. Default: "0 playbooks"
- **Categories Covered** — count of distinct categories used across saved playbooks. Default: "0 of 8"
- **Roles Covered** — count of distinct role assignments used. Default: "0 of 4"
- **Last Created** — title of the most recently created playbook + how long ago (e.g., "Opening Checklist · 2 days ago"). Default: "None yet"

Style: compact dark cards (`#1a1d2e`), gold left border 3px, muted label on top, white value below. Matches the exact card style from all other upgraded sections. Values update in real time as playbooks are created.

---

## 2. Left Panel — "Your Playbooks" Full Redesign

### Panel Header
- "Your Playbooks" label: white bold `16px`
- **+ New** button: full gold gradient (`#b8860b` → `#d4a017`), shimmer on hover, white text, rounded `8px`. Icon: plus sign.
- Panel background: `#1a1d2e`, border: 1px solid `rgba(255,255,255,0.06)`, border-radius `12px`

### Search + Filter Row
- Search input: `#0f1117` background, gold focus ring (`#b8860b`, 1.5px), rounded `8px`, magnifier icon in muted gray. Placeholder: "Search playbooks..."
- Filter dropdown: styled dark dropdown with gold chevron. Options: All / Opening / Closing / Prep / Service / Cleaning / Safety / Training / Other
- **Add a second filter:** Role dropdown (All Roles / BOH / FOH / Management) — placed to the right of the category filter. Currently only category filtering exists — role filtering is a meaningful new addition.

### Empty State (no playbooks)
Replace the plain open-book icon + gray text with:
- Gold open-book SVG icon (48px, gold stroke)
- "No playbooks yet" in white `16px`
- Sub-text: "Build your first operational playbook — the one your team will actually follow." in muted gray `13px`
- Gold "**+ Create Your First Playbook**" button (full gold, shimmer, centered below)

### Playbook List Cards (when playbooks exist)
Each saved playbook appears as a card in the left panel:

- Background: `#0f1117`, border: 1px solid `rgba(255,255,255,0.06)`, border-radius `8px`, padding `12px 14px`
- **Selected state:** gold left border 3px, `rgba(184,134,11,0.1)` background tint
- **Hover state:** subtle gold border appears (`rgba(184,134,11,0.3)`)
- Left: Category color dot (unique color per category — see color map below) + Playbook title in white `14px` bold
- Below title: Role badge chip (small, muted, matches the badge color-coding system) + Creation mode label (muted gray italic, e.g., "Quick Checklist")
- Right: Timestamp (muted gray, e.g., "3 days ago") + kebab menu (⋮) icon on hover — opens a 3-option dropdown: Edit, Duplicate, Delete
- On click: loads the playbook into the right panel viewer

**Category color dot map:**
- Opening → gold `#b8860b`
- Closing → blue `#3b82f6`
- Prep → amber `#f59e0b`
- Service → green `#10b981`
- Cleaning → teal `#14b8a6`
- Safety → red `#ef4444`
- Training → purple `#8b5cf6`
- Other → muted gray `#6b7280`

### Quick-Sort Bar
Above the playbook list (below search/filter row), add a compact sort row:
- **Sort by:** Most Recent (default) / A–Z / Category / Role
- Display as small text links separated by `·`, active sort underlined in gold
- Zero chrome — no border, no card, just inline text

---

## 3. Right Panel — Playbook Viewer Full Redesign

### Empty State (no playbook selected)
Replace the plain book icon + "Select a Playbook" message with:
- Gold open-book SVG (64px)
- "Select a playbook or create a new one" in white `18px`
- Sub-text: "Your playbooks appear here — ready to run, share, or improve." in muted gray
- Two CTA buttons side by side:
  - Gold filled: "**+ Create New Playbook**" (shimmer on hover)
  - Ghost outlined: "**View AI Playbook Ideas**" — clicking opens the AI Starter Ideas panel (see section 5)

### Playbook Viewer (when a playbook is selected)
When a playbook is selected from the left panel, the right panel becomes a full content viewer:

**Header area:**
- Category color dot + Category label (muted, uppercase `10px` tracking-widest) — breadcrumb style
- Playbook title: white `22px` bold
- Role badge chip + Creation mode chip side by side (color-coded, small)
- Timestamp: "Created [date] · Last updated [date]" in muted gray `12px`

**Action tray (top-right of viewer):**
- 📋 **Copy** — copies full playbook content as plain text, "Copied!" toast
- 📤 **Share** — Web Share API / clipboard fallback: shares title + content
- 🖨️ **Print** — `window.print()` with `@media print` CSS (dark background swapped to white for print)
- ✏️ **Edit** — reopens the Create modal pre-filled with this playbook's data for editing
- 🗑️ **Delete** — tap-hold (500ms) to prevent accidental deletion, confirmation toast

**Content display:**
- Content body rendered from the AI-generated text stored at creation time
- For **Quick Checklist** content: render as tappable checkbox list. Each checkbox has a gold check when ticked. Progress bar at top shows "X of Y complete" with gold fill. Checkboxes reset on page reload (session-only — this is a run-mode, not a completion tracker).
- For **Step-by-Step** content: numbered steps in white, with step number in a gold circle badge (24px, gold fill, dark text)
- For **Deep Procedure** content: rich text with section headers in gold uppercase + body text in muted white
- All three modes: content in `#e2e8f0`, `15px`, line-height `1.7` — matches content body treatment across the platform

**"Improve This Playbook" AI Panel:**
A collapsible section at the bottom of the viewer (below the content) with a gold chevron toggle:
- Label: "✨ Improve This Playbook with AI"
- When expanded: textarea with placeholder "e.g., Make this stricter about handwashing steps, Add a section for closing manager sign-off, Translate into simpler language for new hires..."
- Gold "**Regenerate with Changes**" button (shimmer on hover)
- On click: calls Claude API with system prompt: `"You are a restaurant operations expert. The operator wants to improve the following playbook for their restaurant. Rewrite it incorporating their requested changes, keeping the same format (checklist/steps/narrative). Playbook title: [title]. Current content: [content]. Requested improvement: [textarea value]."` Stream the result in a styled output card below.
- Below the output: "**Replace Playbook**" (gold) + "**Save as New Version**" (ghost) buttons

---

## 4. Create New Playbook Modal — Full Upgrade

Redesign the modal to match the platform's modal treatment across all other upgraded sections:

**Modal container:**
- Background `#1a1d2e`, border `1px solid rgba(255,255,255,0.1)`, border-radius `12px`
- Slides up from bottom (250ms ease), backdrop blur

**Header:**
- Title "Create New Playbook" in white `20px` bold
- Subtitle "Choose how you want to capture this process." in muted gray
- Gold open-book icon to the left of the title

**Fields:**
1. **Title** — text input, `#0f1117` background, gold focus ring, placeholder "e.g., Opening Sidework Checklist"
2. **Description (optional)** — textarea, same dark treatment, 3 rows, auto-expand to 5 max
3. **Category** — styled dark dropdown, gold chevron. Options: Opening / Closing / Prep / Service / Cleaning / Safety / Training / Other. When selected, the category color dot (from the map above) appears inside the dropdown left of the selected value.
4. **Assign to Role** — styled dark dropdown, gold chevron. Options: All Roles / Back of House / Front of House / Management

**NEW FIELD — Context (optional):**
Add a new field between Description and Category:
- Label: "**Additional Context** (optional)"
- Placeholder: "e.g., We run 5 stations, service starts at 11am, our POS is Toast, Spanish-speaking kitchen team..."
- This context is injected into the AI generation prompt to personalize the output. Muted helper text below: "The more context you give, the more specific your playbook will be."

**Creation Mode selector:**
Redesign the 3 mode cards to match the platform's selection card treatment:

- **Unselected:** `#0f1117` background, muted border `rgba(255,255,255,0.1)`, muted icon + white label + gray description
- **Selected:** `rgba(184,134,11,0.12)` background, gold border `1.5px solid #b8860b`, gold icon, white bold label, muted description, gold checkmark in top-right corner
- Selection animates in with 150ms ease (border + background fill)

Mode cards (preserve existing labels and descriptions exactly):
- ✅ **Quick Checklist** — "Simple bullet points (60–180 sec)"
- 📄 **Step-by-Step** — "Numbered steps with details (3–8 min)"
- 📖 **Deep Procedure** — "Full narrative with context"

**NEW: AI Assist Toggle**
Below the Creation Mode cards, add a toggle row:
- Label: "**AI Assist**" (white, bold) + sub-label "Let AI write a first draft based on your title and context" (muted gray)
- Toggle: gold when ON (default ON), gray when OFF
- When OFF: hides the Creation Mode selector (the playbook becomes a blank template the user writes manually)
- When ON (default): shows Creation Mode selector as normal

**Modal footer:**
- "Cancel" ghost button (muted, left)
- "**Create Playbook**" gold button (gradient, shimmer on hover, right) — disabled + dimmed if Title is empty

---

## 5. AI Starter Ideas Panel

Accessible from the empty state right panel "View AI Playbook Ideas" button AND from a persistent "💡 Ideas" icon button in the left panel header (next to + New).

**Layout:** Full-width panel that replaces the right panel content (with a back arrow to return to viewer):

**Header:** "💡 Playbook Starter Ideas" + subtitle "Common playbooks operators at restaurants like yours build first."

**Pre-built idea cards — 12 cards in a 3-column grid (2-column on mobile):**

Each card:
- Background: `#1a1d2e`, subtle border, rounded `8px`
- Category color dot in top-left
- Playbook title in white bold (e.g., "Opening Manager Checklist")
- Category + Mode label in muted gray (e.g., "Opening · Quick Checklist")
- Gold "**Use This**" ghost button on hover/tap — clicking pre-fills the Create modal with this title, category, and mode selected, then opens it

The 12 starter ideas:
1. Opening Manager Checklist — Opening · Quick Checklist
2. Closing Server Sidework — Closing · Quick Checklist
3. Line Check Procedure — Prep · Step-by-Step
4. Walk-In Organization Standards — Prep · Deep Procedure
5. Table Turnover Protocol — Service · Quick Checklist
6. Complaint Escalation Steps — Service · Step-by-Step
7. Nightly Deep Clean Stations — Cleaning · Quick Checklist
8. Health Inspection Prep — Safety · Step-by-Step
9. New Hire First Week Plan — Training · Deep Procedure
10. Cash Drop & Drawer Close — Closing · Step-by-Step
11. Shift Handoff Communication — Service · Quick Checklist
12. Equipment Failure Response — Safety · Step-by-Step

---

## 6. Run Mode — Checklist Execution View

For playbooks created as "Quick Checklist," add a **Run Mode** button in the viewer action tray (▶ Run):

On click: the content switches from a static document to an interactive run view:
- Full-width layout, single column
- Title at top: "[Playbook Title] — Running Now"
- Each checklist item becomes a large tappable row:
  - Unchecked: white text, dark row with subtle border
  - Checked: gold checkmark, strikethrough text, row dims to muted (preserves readability)
  - Tap anywhere on the row to toggle
- Progress bar at top: gold fill, "X of Y complete", percentage label right-aligned
- When all items checked: progress bar turns full gold, a completion banner appears: "✅ Playbook Complete — [timestamp]" with a "Reset & Run Again" ghost button
- **Timer:** small countdown/count-up timer in top-right (start/pause/reset). Useful for time-sensitive checklists like line check (target: under 15 min).
- **Exit Run Mode** button (ghost, top-left): returns to viewer without resetting checkboxes (checkboxes persist until manually reset or page reload)

---

## 7. Playbook Categories Sidebar Filter (Enhanced)

Upgrade the left panel filter to include a collapsible **Category Quick-Filter** section below the search/filter row:

A horizontal scrollable row of category chips (same color dot + label):
- 🟡 Opening · 🔵 Closing · 🟠 Prep · 🟢 Service · 🩵 Cleaning · 🔴 Safety · 🟣 Training · ⚫ Other

Clicking a chip filters the playbook list to that category. Active chip gets gold border + color fill. "All" chip resets. Multiple chips can be selected simultaneously. Chips display a count badge (e.g., "Opening (3)") once playbooks exist.

This replaces needing to interact with the dropdown filter above — the chips are faster on mobile.

---

## 8. Cross-Module Integration

1. **Training Templates → Playbooks:** When the Training Templates "Customize with AI" feature generates a customized section, add a "**Save as Playbook**" button on the output. Clicking pre-fills the Create Playbook modal with the content, category = Training, mode = Step-by-Step.
2. **Staff Scheduling → Playbooks:** On the Staff Scheduling page's "Build Schedule AI" feature (if present), add a "**Save as Playbook**" button on the output — pre-fills with category = Service.
3. **Playbook count → Header strip:** "Total Playbooks" and "Categories Covered" read from localStorage in real time.

---

## 9. Visual Polish & Animations

- **Staggered entrance:** Header strip → left panel → right panel empty state fade in with 80ms offsets
- **Playbook list item enter:** New playbooks slide in from top of list with 200ms ease after creation
- **Modal open:** Slides up from bottom (250ms ease), backdrop blur `rgba(0,0,0,0.6)`
- **Creation mode card select:** Gold border + background fill animate in 150ms ease, gold checkmark fades in
- **Run Mode transition:** Content fades out (100ms), run view fades in (200ms)
- **Checklist item check:** Strikethrough animates left-to-right (150ms), gold checkmark bounces in (scale 0→1.2→1, 200ms)
- **Progress bar fill:** Smooth width transition (300ms ease) on each check
- **Completion banner:** Slides down from top of run view (250ms ease), gold border pulse
- **Gold button shimmer:** Diagonal light sweep on hover — matches all other upgraded sections
- **Category dot:** Pulses once on first render (scale 1→1.3→1, 300ms) to draw attention
- **Toast notifications:** Bottom-center, dark background, gold left border, auto-dismiss 2.5s

---

## 10. Mobile Responsiveness

- Left panel collapses to a bottom sheet drawer (drag up to open, drag down to dismiss) on mobile — triggered by a floating "📋 Playbooks" pill button at bottom of screen
- Right panel becomes full-screen on mobile when a playbook is selected
- Create modal: full-screen bottom sheet on mobile, not centered dialog
- Category chip filter: horizontal scroll, no wrap
- AI Starter Ideas: 2-column grid on mobile, 1-column on very small screens
- Run Mode: optimized for one-handed use — large tap targets (min 48px row height), timer in top-right, progress bar always visible at top
- Header strip: 2×2 grid on mobile

---

## Implementation Order

1. Page header Intelligence strip (4 metric cards)
2. Left panel redesign: header, search/filter, role filter, empty state, quick-sort
3. Playbook list cards: color dots, role badges, hover states, kebab menu
4. Right panel empty state + two CTA buttons
5. Playbook viewer: header, breadcrumb, action tray, content rendering by mode (checklist/steps/narrative)
6. "Improve This Playbook" AI panel + Claude API integration
7. Create modal: all field redesigns + Context field + AI Assist toggle + mode card redesign
8. AI Starter Ideas panel (12 cards)
9. Run Mode: checklist execution view + timer + progress bar + completion banner
10. Category chip quick-filter sidebar
11. Cross-module integration hooks
12. All animations + transitions
13. Mobile responsiveness pass

Make all changes to the Living Playbooks page files only. Preserve all existing playbook creation logic, AI generation behavior, category and role dropdown options, and creation mode behavior exactly as-is.
