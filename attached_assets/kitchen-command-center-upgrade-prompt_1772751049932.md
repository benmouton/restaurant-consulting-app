# Replit Prompt — Kitchen Operations / Kitchen Command Center Major Upgrade

Paste this directly into Replit chat:

---

I need a **major upgrade** to the **Kitchen Operations** page and specifically the **Kitchen Command Center** component. Keep the established dark theme: background `#0f1117`, gold/amber accent `#b8860b` / `#d4a017`, card backgrounds `#1a1d2e`, white primary text, muted gray secondary text. Match the visual style used across the other upgraded sections (Service Standards, Training Systems, Staffing & Labor, HR & Documentation).

**DO NOT CHANGE:**
- Any AI API call logic or prompt text for any of the 5 tabs (Readiness, Alerts, Quick, Debrief, Coach)
- The scoring logic or score calculations in Readiness
- The Quick Preset options or their data
- The Station Status toggle logic
- Page routing or file structure
- Any other domain pages

---

## 1. Page Header — Kitchen Status Strip

Below the "Kitchen Operations" title and subtitle, add a horizontal strip of 4 dark metric cards with gold left border:

- **Tonight's Status** — pull from the last saved Readiness score. Show "Ready" (green), "Caution" (amber), or "At Risk" (red) with the score (e.g., "72/100 · Caution"). Default: "No check run yet" in muted text.
- **Last 86'd Items** — show the most recent 86 list entries as a comma-separated muted string. Default: "No active 86 list"
- **BOH Headcount vs. Covers** — show the ratio from the last readiness check. E.g., "5 staff · 70 covers". Default: "--"
- **Last Debrief** — show how many hours/days since the last Quick or Debrief was logged. E.g., "Last night · Grill bottleneck". Default: "No debrief logged"

Style: compact dark cards (`#1a1d2e`), 3px gold left border, muted label text above, larger white or color-coded value below. Horizontal scroll on mobile.

---

## 2. Kitchen Command Center Card — Elevated Card Styling

- Add a subtle animated gold shimmer on the card border (CSS keyframe animation, 3s loop, very low opacity — same treatment as the Skills Certification Engine and Labor Demand Engine cards)
- The card title line (`✦ Kitchen Command Center`) should have the ✦ icon in gold/amber (`#d4a017`)
- The "Not Ready / Caution / Ready" badge should pulse on "Not Ready" (subtle red pulse) and be static on "Caution" (amber) and "Ready" (green)

---

## 3. Tab Bar — Visual Upgrade

The 5 tabs (Readiness, Alerts, Quick, Debrief, Coach) should be upgraded:

- Active tab: white text, dark background pill with subtle inner glow — NOT just a white bottom border
- Inactive tabs: muted gray text, transparent background, hover state brightens to light gray
- Add a small icon before each label:
  - Readiness: `⚡` or a checkmark circle
  - Alerts: `🔔` or a warning triangle  
  - Quick: `⏱` (stopwatch)
  - Debrief: `📋` or clipboard
  - Coach: `🎯` or target
- Tab bar has a subtle bottom border separator (`#2a2d3e`)
- Smooth CSS transition on tab switch (100ms opacity + slight y-translate on content)

---

## 4. Readiness Tab — Major Form Upgrade

### Prep Sign-Off
- Currently: Yes/No toggle buttons
- Upgrade: Make the Yes button visually "checked" with a green fill and white checkmark icon, No button "active" with amber fill and X icon. Clear visual state — no ambiguity.
- Add helper text below: "Has the kitchen been formally signed off on prep?" in muted gray, 12px

### Station Status
- Currently: colored pill buttons per station (Sauté, Grill, Fry, Pantry, Expo)
- Upgrade: 
  - Green = fully set (icon + station name, bright green background pill)
  - When a station is toggled to "not ready," it turns amber/red and reveals an inline text input below it for notes (e.g., "Grill → late cook" as seen in the screenshots)
  - The note inputs should appear with a smooth slide-down animation (max-height CSS transition)
  - Add a thin horizontal rule between the station pills row and the note inputs

### Par Shortages Field
- Upgrade to a tag/chip input system:
  - User types an item and hits Enter or the + button → it becomes a removable chip below the input
  - Chips styled as dark amber-bordered pills with an × to remove
  - Replace the raw text input with this chip input UX

### 86 List Field
- Same chip input treatment as Par Shortages — type item, press Enter → becomes a removable chip
- 86'd chips should be styled RED (subtle red border, red text) to visually distinguish from par shortage chips
- Add a "Clear All" link in muted red if any chips exist

### BOH Headcount & Forecasted Covers
- Add a live ratio display below the two inputs, updated on keystroke:
  - Shows: "**X.X covers/cook**" (Forecasted Covers ÷ BOH Headcount)
  - Color code: ≤ 15 = green, 16–20 = amber, 21+ = red
  - Example: "14.0 covers/cook · On track" or "22.0 covers/cook · ⚠ Understaffed"
- This gives the operator an immediate signal before generating a score

### Large Party
- Current: `+ Large Party` button
- Upgrade: clicking it expands an inline section with:
  - `Party Size` number input
  - `Arrival Time` text input (e.g., "7:30 PM")
  - `Seated Where` text input
  - Small × to collapse/remove

### Score Breakdown — Visual Upgrade
- Each category (Prep, Pars, Staffing, Ticket Flow, Line Set) should have:
  - Label and score (e.g., "Staffing · 5/20") on one line
  - Progress bar beneath — green if full score, amber if 50–99%, red if < 50%
  - Bar has rounded ends, height 6px, smooth fill
- **Total score is calculated live as inputs change** and shown in the score breakdown panel header:
  - "Current Score: 55/100" with a color-coded badge (Not Ready / Caution / Ready)
  - Updates in real time as fields are filled — so operators see their score improving as they complete the check
- "Top improvements" section (already exists in screenshots) — keep and style as:
  - Gold `→` arrow prefix
  - Item name in white
  - `+X pts` in green on the right

### Generate Readiness Score Button
- After generating, if score exists:
  - Show a floating result banner above the button (already partially exists — the "60/100 At Risk" card)
  - Upgrade this banner:
    - Full-width card with color-coded left border (red/amber/green)
    - Large score in matching color
    - Status label ("At Risk · Immediate action needed" / "Caution · Address before service" / "Ready · Good to go")
    - Sub-label showing service type + day (e.g., "Thursday dinner")
    - A progress bar showing the score
    - "Shift data saved ✓" toast notification (bottom of screen, slides up, auto-dismisses in 3s) — already exists, keep and style to match the design system

---

## 5. Alerts Tab — Upgrade

### Timing Fields (Avg App Time / Avg Entrée Time)
- Add real-time status indicator next to each field:
  - Green check if within standard range (8–10 app, 15–18 entrée)
  - Amber warning if slightly over
  - Red flag if significantly over
- The `Std: 8-10` and `Std: 15-18` hints should be styled more visibly as a pill badge, not plain text

### Current Status Strip
- The "Apps: -- · Entrées: -- · Window: Clear" strip at top of Alerts tab:
  - Upgrade to 3 colored micro-cards (compact, dark `#1a1d2e`)
  - Each updates as user fills in the fields
  - Window: Clear = green badge, Window Holding = red badge (pulse animation)

### Cover Pace & Bottleneck Dropdowns
- Style selects with custom dark styling consistent with the rest of the app
- When a bottleneck station is selected, show a brief callout below: "Grill bottlenecks typically cause [X]. Coach action: [Y]" — use inline static content mapped to each station option

### Generate Service Alerts Button
- Same gold full-width button style, matching the other tabs
- After generating: parse AI output into structured alert cards:
  - Each alert card has a severity badge (HIGH / MEDIUM / LOW) color-coded (red / amber / blue)
  - Icon, title, and 1–2 sentence description
  - Cards stacked vertically with subtle dividers

---

## 6. Quick Tab (60-Second Post-Service Debrief) — Upgrade

### Labels
- "What went well?" → keep the gold/green label but make it larger and bolder (18px, semibold)
- "What sucked?" → keep the red label styling — this is great, keep it
- "One fix for tomorrow" → keep amber label

### Mic Icons
- The microphone 🎤 icons next to each label — add a hover state: on hover, show a tooltip "Tap to dictate (if supported)"

### Log Debrief & Close Out Button
- After logging:
  - Show a success state on the button: green background, checkmark, "Debrief Logged ✓"
  - Returns to normal state after 2s

---

## 7. Debrief Tab — KM Debrief Upgrade

### Textarea Fields
- All 5 textareas (Ticket Timing Issues, Window Problems, Prep Issues Discovered, Service Waste, Manager Notes) should have:
  - Character counter in bottom-right corner (e.g., "0 / 300")
  - Slightly larger min-height so they don't feel cramped
  - Gold focus ring on active field (consistent with rest of app)

### Generate KM Debrief Button
- After generating: parse AI output into a structured debrief output card:
  - **What Broke** section — bulleted items in red-tinted cards
  - **Root Causes** section — bulleted items in amber-tinted cards
  - **Tomorrow's Fixes** section — numbered action items in green-tinted cards
  - Each section has a colored left border and icon
  - Print button (`🖨 Print Debrief`) in muted text at bottom of output card

---

## 8. Coach Tab — Upgrade

### Target Station Dropdown
- Add icons next to each station in the dropdown options (Sauté 🔥, Grill 🥩, Fry 🍟, Pantry 🥗, Expo 📋)

### Behavior to Coach Dropdown
- This is the key field — style it prominently with a larger font and more padding
- When a behavior is selected, show a brief inline preview below:
  - "This coaching session will focus on: [behavior]"
  - Styled as a muted italic line in a gold-bordered left-border callout

### Generate Coaching Focus Button
- After generating: parse output into a structured coaching card:
  - **The Focus** — single sentence in large bold text
  - **What to Watch** — 2–3 observable behaviors as checklist items
  - **What to Say** — the script/words to use, styled as a blockquote with left gold border
  - **What Good Looks Like** — success criteria as a small card
  - **Follow Up By** — a single action item with timestamp guidance

---

## 9. Principles / Framework / Checklist Accordion — Visual Upgrade (Below Main Card)

These already exist and partially work. Upgrade:
- Smooth CSS max-height transition on expand/collapse (150ms ease)
- Gold chevron icon rotates 180° on expand
- **Principle** accordion: blockquote text gets gold left border and subtle dark background tint (`#1a1d2e`)
- **Framework** accordion: parse the bullet content into proper visual bullets (not a text blob) — each `•` separated item becomes its own line with a gold dot prefix
- **Checklist** accordion: parse the `□` items into actual styled checkboxes — interactive, checkable during a shift
- **Script** accordion: if present, render as numbered step flow — gold numbered circles, connected by a thin vertical line

---

## 10. Design Tokens (Match Existing System)

```
Background:        #0f1117
Card background:   #1a1d2e
Border:            #2a2d3e
Primary text:      #ffffff
Secondary text:    #9ca3af
Gold accent:       #d4a017
Gold muted:        #b8860b
Success green:     #22c55e
Warning amber:     #f59e0b
Danger red:        #ef4444
Input background:  #111827
Input border:      #374151
Input focus ring:  #d4a017
```

---

## 11. Mobile Responsiveness

- Header metric strip: horizontal scroll on mobile, no text wrapping
- Tab bar: if labels truncate on small screens, reduce font size to 11px or icon-only fallback
- Form grids: collapse to single column below 640px
- Station status chips: wrap naturally (flexbox wrap)
- Score breakdown bars: full width on all screen sizes
- Floating result banner: full width, stacks vertically on mobile
- All textareas: min-height 80px, full width

---

Make all changes to the Kitchen Operations page and Kitchen Command Center component files only. Preserve all existing API logic, scoring calculations, tab functionality, preset data, and save/history features exactly as-is.
