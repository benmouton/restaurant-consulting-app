# Replit Prompt — Facilities & Asset Protection Major Upgrade

Paste this directly into Replit chat:

---

I need a **major upgrade** to the **Facilities & Asset Protection** page. Keep the established dark theme: background `#0f1117`, gold/amber accent `#b8860b` / `#d4a017`, card backgrounds `#1a1d2e`, white primary text, muted gray secondary text. Match the visual style used across all other upgraded sections (Kitchen Operations, HR & Documentation, Staffing & Labor, Training Systems, Cost & Margin Control, Reviews & Reputation, SOPs & Scalability, Crisis Management).

**DO NOT CHANGE:**
- Any existing AI API call logic or Claude API integration
- The 5-tab structure: Breakdown / PM Schedule / Equipment / Vendors / Dashboard
- The equipment type list (Refrigeration/Ice, Cooking Equipment, Dish Machine, HVAC, Plumbing, Electrical, POS & Network, Other)
- The quick-check hints per equipment type
- The priority/severity logic (During Active Service + Safety Risk flags)
- The Principles and Frameworks accordion content
- Page routing or file structure
- Any other domain pages

---

## 1. Page Header — Asset Health Strip

Below the "Facilities & Asset Protection" title and subtitle, add a horizontal strip of 4 dark metric cards with gold left border:

- **Open Issues** — count of logged issues with status "Open" or "In Progress". Show in amber if > 0, green if 0. Default: "0 open" in muted text.
- **Resolved This Month** — count of issues marked Resolved in the current calendar month. Default: "0 this month"
- **Equipment Logged** — count of saved equipment entries. Default: "0 assets tracked"
- **Next PM Due** — name of earliest upcoming preventative maintenance task + days until due. E.g., "Walk-in Cooler · 4 days". Show in amber if ≤ 7 days, red if overdue. Default: "No PM scheduled"

Style: compact dark cards (`#1a1d2e`), gold left border 3px, muted label above, bold value below. Horizontal scroll on mobile.

---

## 2. Breakdown Tab — Elevated Styling + AI Output Upgrade

### Card Styling
- Add a subtle animated gold shimmer/glow on the card border (same treatment used on all other upgraded sections). Use a CSS keyframe animation that pulses the border from `#b8860b22` to `#d4a01744` over 3 seconds, looping.
- The "HIGH — Workaround needed" and similar priority banners: restyle with an icon on the left (⚠️ for HIGH, 🔴 for CRITICAL, 🟡 for MEDIUM), bold colored label, and a short contextual sub-text based on the combination of Active Service + Safety Risk flags:
  - In Service + Safety Risk → `#ef4444` red banner — "CRITICAL — Safety hazard during active service. Stop use immediately if risk to staff or guests."
  - In Service + No Safety Risk → `#f59e0b` amber banner — "HIGH — Workaround needed — service is active"
  - Closed + Safety Risk → `#f59e0b` amber banner — "ELEVATED — Safety issue. Resolve before next service."
  - Closed + No Safety Risk → `#374151` gray banner — "LOW — Log for scheduled repair."

### Issue Log Form Improvements
- Add a **Repair Priority** field (Auto-Calculated): display it as a read-only badge that updates live as the user fills out the form. Shows "CRITICAL / HIGH / ELEVATED / LOW" based on In-Service + Safety Risk combination. Gold badge styling with colored dot.
- Add an **Estimated Downtime** dropdown:
  - Still operational (workaround in place)
  - < 2 hours
  - Half day
  - Full day or more
  - Unknown
- Add a **Who Discovered It?** dropdown: Manager on Duty / Kitchen Staff / Front of House / Vendor / Owner
- The "Suggested Vendors for [Equipment Type]" section: when no vendors exist, show a styled empty state card with a gold "Add Vendor" shortcut button that switches to the Vendors tab directly.

### AI Triage Output Card Upgrade
The current response renders as raw markdown with `**bold**` asterisks visible. Fix this and upgrade the output:

Replace the plain text output area with a structured output card with these sections parsed from the AI response:

**A) Situation Summary** — gray background card, 2–3 sentence summary
**B) Priority Level** — colored badge (CRITICAL/HIGH/ELEVATED/LOW) + tier label + 1-line service impact statement
**C) Immediate Actions** — numbered list with each step as its own row, bold action verb, description text. Each row has a checkbox the manager can tap to mark complete.
**D) Vendor / Repair Script** — styled differently (slightly lighter background), with:
  - "Who to call" as a bold label
  - The call script in a blockquote-style box with slightly different background
  - Authorization limit language in a gold-bordered inset box
  - Questions to ask as a bulleted list
**E) Documentation Checklist** — 4–5 checkboxes for what to record (time logged, vendor called, ETA received, repair completed, invoice filed)

Add three action buttons below the output card:
- **Copy Triage Report** — copies clean plain text version to clipboard
- **Save to Issue Log** — saves the issue + AI response to the Dashboard tab's issue list with status "Open"
- **Start Vendor Call** — if a vendor phone number exists for this equipment type, shows their number with a `tel:` link; otherwise shows "Add vendor first" and links to Vendors tab

---

## 3. PM Schedule Tab — Elevated Styling + Output Upgrade

### Card Styling
- Same gold shimmer border animation as Breakdown tab card.

### PM Schedule Form Improvements
- Add **Service Frequency** selector before the Generate button:
  - High Volume (open 7 days, heavy use)
  - Standard (5–6 days/week)
  - Low Volume (< 5 days/week or seasonal)
  - This informs the AI to calibrate PM intervals appropriately.
- Add **Last PM Completed** date field (optional) — used by the AI to flag what's overdue in the output.
- **Fail-Silent Monitors** (already exists) — restyle as a multi-select chip group: each chip has a gold border on select, background fills to `#b8860b22`. Show a small info tooltip on hover/tap explaining each monitor type.

### PM Schedule Output Upgrade
Replace plain text output with a structured PM Schedule card:

**Schedule Table View** — render the AI's PM schedule as a styled table with columns:
  | Task | Frequency | Last Done | Next Due | Who |
  - Rows alternate `#1a1d2e` / `#111827`
  - "Next Due" column: color-code amber if ≤ 30 days, red if overdue based on Last PM Completed date entered
  - Frequency badge (Daily / Weekly / Monthly / Quarterly / Annual) in a colored pill

**Fail-Silent Escalation Rules** — if any Fail-Silent monitors were selected, render these as a separate card section with a red left border. Title: "Escalation Thresholds". Format as: Monitor name → Threshold → Action required.

**Export PM Schedule** button — generates a clean, print-ready plain text or markdown version. Uses `window.print()` with a print stylesheet that renders white background, black text, with the restaurant name at top.

**Save PM Schedule** button — saves to localStorage, with equipment type + date as key. Saved schedules accessible from Dashboard tab.

---

## 4. Equipment Tab — Elevated Styling + Asset Log Upgrade

### Card Styling
- Same gold shimmer border animation.

### Equipment Log Form Improvements
- Add **Purchase / Install Date** field (optional date picker)
- Add **Warranty Expiration** field (optional date picker) — if a date is entered and it's within 60 days, show an amber "Expiring Soon" badge in the saved equipment card
- Add **Equipment Criticality** toggle:
  - Revenue-Critical (direct impact on service if down)
  - Support Equipment (operation continues without it)
  This generates a more targeted equipment log.
- Add **Serial Number / Asset Tag** field (optional)

### Equipment Log Output Card
Replace plain text output with a structured Equipment Profile card:

**Header row:** Equipment name + type badge (gold) + criticality badge (red for Revenue-Critical, gray for Support)
**Sections:**
  - Maintenance History (from AI: recommended service intervals + common failure points)
  - Documented Issues Log (starts empty, links to Breakdown tab to log issues against this equipment)
  - PM Intervals Summary (3–5 key tasks + intervals as a compact list)
  - Failure Risk Flags (2–3 operator warnings in amber-bordered callout boxes)

**Action buttons:**
- **Save Equipment Profile** — saves to localStorage, appears in Equipment list below
- **Create PM Schedule** — switches to PM Schedule tab with this equipment type pre-selected

### Saved Equipment Library
Below the form, add a **Saved Equipment** section:
- Grid of equipment cards (2-col desktop, 1-col mobile)
- Each card: equipment name, type badge, last service date, warranty status badge, criticality badge
- Expand to show notes + edit/delete options
- Cards sorted by: Revenue-Critical first, then alphabetical
- Empty state: "No equipment logged yet. Add your first asset above."

---

## 5. Vendors Tab — Elevated Styling + Vendor Profile Upgrade

### Card Styling
- Same shimmer animation on card border
- The "No vendors added yet" empty state: add an illustration/icon treatment and a short motivational line — "Your vendor bench determines how fast you recover. Build it before you need it."

### Add Vendor Form Improvements
Add these fields to the vendor form:
- **Equipment Types Covered** — multi-select chip group using the existing equipment type list. Chips fill gold on select.
- **Emergency/After-Hours Available?** — Yes / No / Unsure toggle. If Yes, show a second phone field: "After-Hours Number"
- **Average Response Time** — dropdown: < 2 hours / 2–4 hours / Same day / Next day / Unknown
- **Authorized Up To $** — dollar amount field. Used in the Breakdown tab's call script to pre-populate the authorization limit language.
- **Notes / History** — text area for repair history notes, preferred contact name, etc.

### Vendor Card Redesign
Existing vendor list cards: restyle significantly:
- Card background `#1a1d2e`, left border colored by equipment type (gold for Cooking, blue for Refrigeration, green for HVAC, etc.)
- Top row: Vendor name (bold) + emergency availability badge (green "24/7" or gray "Business Hours")
- Second row: Equipment types covered as small pills
- Third row: Phone + after-hours phone (if applicable) + `tel:` link buttons styled as small gold buttons
- Bottom row: Avg. response time + authorization limit + edit/delete icons
- On mobile: tap the vendor card to expand full details

### Vendor Search & Filter
- The existing "All Vendors" filter dropdown: add equipment type options dynamically based on saved vendors
- Add a sort option: By response time / By equipment type / Recently added

---

## 6. Dashboard Tab — Elevated Styling + Issue Management Upgrade

### Metric Cards Restyle
The 4 existing stat cards (Open Issues / In Progress / Resolved / Avg. Days to Fix):
- Same style as other upgraded section dashboards: dark background with colored top border (red for Open, amber for In Progress, green for Resolved, gold for Avg. Days)
- Value displayed large (48px) in the matching color
- Add a small sparkline or trend arrow if more than 3 data points exist: ↑ getting worse / ↓ improving / → stable

### Issue Status Pipeline View
Add a **Kanban-style status view** as an option toggle (List View / Pipeline View):

Pipeline View shows 3 columns:
- **Open** — red header
- **In Progress** — amber header  
- **Resolved** — green header

Each issue card in the pipeline:
- Equipment type badge (top left)
- Issue summary (bold)
- Priority badge (CRITICAL/HIGH/ELEVATED/LOW)
- Days open (bottom right, amber if > 3 days open)
- Tap to expand: shows full AI triage response, checklist progress, vendor called status

### Issue Detail Expanded View
When an issue card is tapped/clicked, expand to show:
- Full AI triage response (structured, same format as Breakdown output card)
- **Status Update** dropdown: Open → In Progress → Resolved → Won't Fix
- **Resolution Notes** text field
- **Repair Cost Logged** dollar field — feeds into dashboard metrics
- **Vendor Used** field (links to Vendors tab records)
- **Days to Fix** auto-calculated from logged date to resolved date

### Dashboard Metrics Expansion
Below the 4 top cards, add:
- **Equipment Failure Breakdown** — horizontal bar chart of issue count by equipment type. Use a simple CSS bar chart (no external charting library needed). Gold bars, labeled.
- **Cost This Month** — sum of all repair costs logged this month. Show in amber if > user-set budget threshold.
- **Time to Resolution** — average days from log to resolved, displayed as a trend (last 30 days vs. prior 30 days).
- **PM Compliance Rate** — percentage of PM tasks marked complete vs. scheduled. Simple gauge or fraction display.

### Saved PM Schedules Section
Below the metrics, add a collapsible "Saved PM Schedules" section:
- List of saved PM schedules from localStorage
- Each row: equipment type + date saved + "View" button (opens modal with full schedule) + "Print" button
- Empty state: "No PM schedules saved yet. Build one in the PM Schedule tab."

---

## 7. Cross-Tab Integration

These connections make the module behave as a unified system rather than 5 isolated tools:

1. **Breakdown → Dashboard**: "Save to Issue Log" button on the triage output card saves the issue with all fields to the Dashboard, automatically sets status to "Open".

2. **Breakdown → Vendors**: If no vendor exists for the equipment type, the "Suggested Vendors" section shows a gold "Add Vendor →" button that navigates to the Vendors tab with equipment type pre-filtered.

3. **Equipment → PM Schedule**: "Create PM Schedule" button on a saved equipment card pre-fills the PM Schedule tab with that equipment type and navigates to it.

4. **PM Schedule → Dashboard**: "Save PM Schedule" saves to Dashboard's Saved PM Schedules section.

5. **Dashboard → Breakdown**: "Log Issue" button on Dashboard navigates to Breakdown tab.

6. **Vendors → Breakdown**: Vendor phone number and authorization limit auto-populate into the triage output card's Vendor Script section for matching equipment types.

---

## 8. Loading & Micro-Interaction Polish

- **Loading shimmer skeletons** on all AI-generating actions. While generating, replace the output area with 5–6 shimmer bars (animated `#1a1d2e` → `#252840` gradient sweep). Button shows "Generating triage response..." / "Building PM schedule..." / "Generating equipment log..." with a spinner.
- **Checkbox completion animation**: when a triage checklist item is checked, the row fades to 60% opacity with a gold strikethrough. Add a subtle haptic trigger via Capacitor Haptics plugin: `Haptics.impact({ style: ImpactStyle.Light })`.
- **Save confirmations**: after any save action, show a brief 2-second toast notification in the bottom center — dark background, gold left border, checkmark icon, "Issue saved to Dashboard" / "Equipment profile saved" / "Vendor added". Auto-dismisses.
- **Tab indicator**: the active tab gets a gold bottom border underline (same as the other upgraded sections), not just a background fill.
- **Empty states**: all empty state messages get a subtle icon treatment (wrench icon for equipment, calendar icon for PM, etc.) and a short directive sentence.

---

## 9. Color Reference (Match All Other Upgraded Sections)

```
Background:        #0f1117
Card background:   #1a1d2e
Card alt row:      #111827
Gold accent:       #b8860b / #d4a017
Input background:  #111827
Input border:      #374151
Input focus ring:  #d4a017
Text primary:      #ffffff
Text muted:        #9ca3af
Critical red:      #ef4444
High amber:        #f59e0b
Resolved green:    #22c55e
In-progress blue:  #3b82f6
Border radius:     12px (cards), 8px (inputs)
```

---

## 10. Mobile Responsiveness

- Header metric strip: horizontal scroll on mobile, no text wrapping
- All tab content cards: full width, 16px padding on mobile
- Form grids: single column below 640px
- Equipment cards grid: single column on mobile
- Vendor cards: single column, full contact buttons on mobile
- Dashboard Kanban: single column stack on mobile (all 3 columns stacked vertically)
- All buttons: minimum 44px touch target height
- Triage output card sections: stack vertically on mobile

---

## 11. Implementation Order

1. Page header Asset Health Strip
2. Card border shimmer animation (all 5 tab cards)
3. Breakdown: priority banner restyle + new form fields + live priority badge
4. Breakdown: AI output → structured triage card with checkboxes + 3 action buttons
5. PM Schedule: form additions + structured table output + Export + Save
6. Equipment: form additions + structured equipment profile output + Saved Equipment Library
7. Vendors: form additions + vendor card restyle + filter improvements
8. Dashboard: metric card restyle + Kanban pipeline view + issue detail expanded view + metrics expansion + PM Schedules section
9. Cross-tab integration (all 6 connections)
10. Loading shimmer skeletons on all 3 AI tabs
11. Checkbox haptics + save confirmation toasts
12. Principles/Frameworks accordion polish — match gold chevron treatment
13. Mobile responsiveness pass

Make all changes to the Facilities & Asset Protection page files only. Preserve all existing AI API logic, equipment type data, quick-check hints, priority logic, and accordion content exactly as-is.
