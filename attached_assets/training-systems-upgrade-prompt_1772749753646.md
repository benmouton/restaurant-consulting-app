# Replit Prompt — Training Systems Page Upgrade

Paste this directly into Replit chat:

---

I need you to upgrade the **Training Systems** page with significant UI and UX improvements. Keep the existing dark theme: background `#0f1117`, gold/amber accent `#b8860b` / `#d4a017`, card backgrounds `#1a1d2e` or similar slightly lighter than page BG, white primary text, muted gray secondary text. Match the visual style established in the Ownership & Leadership and Service Standards pages.

**Do NOT change:**
- Any AI API call logic or prompt text in the Skills Certification Engine
- The certification scenario generation logic
- Standards configuration data or schemas
- Page routing or file structure
- Any other domain pages

---

## 1. Page Header — Add a Training Status Strip

Below the "Training Systems" title, add a horizontal metric strip with 3 dark cards (gold left border accent):

- **Active Trainees** — count of staff currently in a training phase (placeholder: "0 active" with link to Scheduling)
- **Certifications This Month** — count of passed certification tests run this month (pull from cert history, default "0")
- **Standards Configured** — show "Complete" in green if all Standards fields are filled, "Incomplete" in amber if not, with a link to the Standards tab

Style as compact horizontal cards, gold left border, muted label text on top, larger white value below. On mobile, these scroll horizontally.

---

## 2. Skills Certification Engine Card — Elevated Styling

The existing "Skills Certification Engine" promo card should be upgraded:

- Add a subtle animated gold shimmer/glow on the card border (CSS animation, low intensity — just enough to make it feel premium and alive)
- Replace the generic `✦` sparkle icon with a graduation cap emoji or a proper SVG icon
- Add 3 small feature pills below the description text:
  - `⚡ Role-specific scenarios`
  - `📊 Transparent rubric scoring`
  - `✓ Behavior-based pass/fail`
- Style pills as dark rounded tags with gold text and a faint gold border
- The "Open Certification Engine" button should have a subtle hover animation (brightness up, slight scale)

---

## 3. Accordion Sections — Upgraded Rendering

The 4 accordion sections (Principle, Framework, Checklist, Script) need visual and interaction upgrades:

### All Sections:
- Add a smooth CSS transition for expand/collapse (max-height animation, not just display toggle)
- The section header row should have a hover state (subtle background highlight on hover)
- Section type badges (Principle, Framework, Checklist, Script) should be color-coded:
  - **Principle** → amber/gold badge
  - **Framework** → blue badge (`#3b6fd4` or similar)
  - **Checklist** → green badge (`#2d7a4f` or similar)
  - **Script** → purple badge (`#6b3fa0` or similar)

### Principle Section (expanded):
- Render the blockquote with a gold left border, italic text, and slightly larger font size
- Add a label: `CORE PRINCIPLE` in small caps, gold color, above the quote
- Faint background tint on the quote card

### Framework Section (expanded):
- Parse the content to detect phases (PHASE 1, PHASE 2, PHASE 3, etc.)
- Render each phase as its own card with:
  - Phase number as a numbered circle (gold outline, number inside)
  - Phase title bold and white
  - Bullet items below in muted gray
- If no phases are detected, render as a clean bulleted list (not raw text)

### Checklist Section (expanded):
- Render checklist items as actual interactive checkboxes
- Style: dark checkbox with gold checkmark when checked
- Group items if headers are detected (e.g., "BEFORE THEY TOUCH A GUEST:" becomes a section label)
- Section label in small caps, gold, with a thin gold underline
- Add a progress indicator at the top: `"3 of 12 completed"` — this resets on page reload (session-only state, no persistence needed)

### Script Section (expanded):
- Detect numbered steps (1. 2. 3.) and render as a vertical step flow:
  - Step number in a gold circle
  - Step text beside it, white
  - Thin connecting line between steps (gold, 1px)
- Detect quoted/example text and render in a speech bubble style card (dark background, rounded, small quote icon)
- If "WHEN SOMEONE FAILS A STANDARD" or similar header exists, render it as a bold section label above the steps

---

## 4. Quick Reference Panel — Manager View

Below the accordion sections, add a collapsible "Quick Reference" panel:

**Label:** `📋 Manager Quick Reference` — with a toggle arrow

**When expanded, show:**
- A "Training Phases at a Glance" card:
  - 3 columns: Shadow Phase / Perform Phase / Certify Phase
  - Each column: phase name bold, 1-2 line description of what it means
  - Style as a mini table with gold column headers

- A "Non-Negotiables Checklist" card:
  - Pull the first 5 items from the Checklist section and display as a condensed dark card
  - Label: `BEFORE FIRST SOLO SHIFT` in small caps gold

- A "When They Fail a Standard" card:
  - Pull the Script section content (first 3 steps) as a condensed numbered list
  - Label: `PERFORMANCE CONVERSATION FLOW` in small caps gold

This panel is for at-a-glance manager reference without expanding every accordion individually.

---

## 5. Empty States

If any accordion section has no content yet:
- Show a dashed-border ghost card inside the expanded section
- Message: `"No [section type] configured yet."`
- Gold text button: `"+ Configure in Standards"`
- Do not show empty raw text areas

---

## 6. Certification Engine — Internal Upgrades

Inside the Skills Certification Engine modal/page (the Certify / Dashboard / Standards tabs):

### Certify Tab:
- The trainee search input should have a gold focus ring (not default browser blue)
- Role dropdown items should show role-specific icons (🍽️ Server, 🍸 Bartender, 🚪 Host, 🏃 Food Runner, 🧹 Busser, 👨‍🍳 Line Cook, 🔪 Prep Cook, 👔 Kitchen Manager, ⭐ Shift Lead)
- The certification phase description card (Shadow Phase card with description) should animate in when a phase is selected
- The "Generate Certification Scenario" button should pulse subtly when all fields are filled and it's ready to generate

### Standards Tab:
- Section headings (Service Philosophy, Steps of Service, Speed Targets, etc.) should use the same gold left border style as the rest of the app
- Input fields should have a gold focus ring
- The scoring rubric weight inputs should have a visual progress bar below each field showing proportion of total (e.g., Prioritization & Triage = 25/100 → 25% filled gold bar)
- The pass threshold field should show a color indicator: green if ≥ 80, amber if 70–79, red if < 70
- "Save Standards" button: add a success state — after saving, briefly show a green checkmark and "Standards saved" text before returning to normal state

### Dashboard Tab:
- The empty state ("No Certification Data Yet") card should be better designed:
  - Add a faint grid pattern background to the empty state card
  - The "What You'll See Here" preview items should be styled as mini preview cards (not just icon + text rows)
  - The "Run First Certification Test" button should be gold and prominent

---

## 7. Mobile Responsiveness

- Metric strip: horizontal scroll on mobile, no wrapping
- Accordion sections: adequate tap targets (min 48px header height)
- Certification Engine tabs: ensure tab labels don't truncate on small screens (may need icon-only on very small screens)
- Quick Reference panel: stacked single-column layout on mobile

---

Make all changes to the Training Systems page and Skills Certification Engine component files only. Preserve all existing functionality, data fetching, and API logic exactly as-is.
