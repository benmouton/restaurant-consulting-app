# Replit Prompt — SOPs & Scalability Major Upgrade

Paste this directly into Replit chat:

---

I need a **major upgrade** to the **SOPs & Scalability** page. Keep the established dark theme: background `#0f1117`, gold/amber accent `#b8860b` / `#d4a017`, card backgrounds `#1a1d2e`, white primary text, muted gray secondary text. Match the visual style used across all other upgraded sections (Kitchen Operations, HR & Documentation, Staffing & Labor, Training Systems, Cost & Margin Control, Reviews & Reputation).

**DO NOT CHANGE:**
- Any existing AI API call logic or Claude API integration
- The three-tab structure: Capture SOP / Quick Checklist / Audit
- The Principles and Frameworks accordion content
- Page routing or file structure
- Any other domain pages

---

## 1. Page Header — SOP Health Strip

Below the "SOPs & Scalability" title and subtitle, add a horizontal strip of 4 dark metric cards with gold left border:

- **SOPs Documented** — count of saved SOPs. Default: "0 SOPs saved" in muted text.
- **Checklists Built** — count of saved checklists. Default: "0 checklists saved"
- **Last Audit Run** — date and result snippet of the most recent Scalability Audit. E.g., "2 days ago · 2 gaps found". Default: "No audit run yet"
- **Oldest SOP** — name + date of the oldest saved SOP that hasn't been reviewed. If age > 90 days, badge it amber "Review Due". Default: "--"

Style: compact dark cards (`#1a1d2e`), gold left border 3px, muted label above, bold value below. Horizontal scroll on mobile.

---

## 2. Smart SOP Capture Tab — Elevated Styling + Output Upgrade

### Card Styling
- Add a 1px gold shimmer/glow animation on the card border that pulses slowly (same treatment used on Training Systems / HR cards). Use a CSS `@keyframes` that animates `box-shadow` from `0 0 0px rgba(212,160,23,0)` to `0 0 18px rgba(212,160,23,0.18)` on a 3s loop.

### Form Field Enhancements
- **Task/Procedure Name**: Keep as-is but add a subtle gold focus ring (`outline: 2px solid #d4a017; outline-offset: 2px`)
- **Role Owner**: Keep as-is
- **Trigger (When?)**: Keep as-is — but add a small clock icon (⏰ or Lucide `Clock`) inside the input prefix area
- Add a **Frequency** dropdown below the three existing fields: Daily · Per Shift · Weekly · Monthly · As Needed · On Hire · Emergency Only. Style to match existing inputs.
- Add a **Complexity** toggle below Frequency: `Simple (< 5 steps)` | `Standard (5–15 steps)` | `Complex (15+ steps)`. Three pill buttons, gold fill on selected.
- **Describe the Workflow textarea**: Increase min-height to 160px. Add a live character count in bottom-right corner of the textarea (muted gray, e.g., "247 / 2000").

### Generated SOP Output Card
When the AI returns the SOP, render it in a structured card instead of raw markdown:

```
┌─────────────────────────────────────────────────────────┐
│ [Gold badge: SOP GENERATED]          [Role Owner chip]  │
│ ─────────────────────────────────────────────────────── │
│ 📋 Task: Opening Cash Drawer                            │
│ 👤 Owner: Shift Lead   🕐 Trigger: Start of every shift │
│ 🔁 Frequency: Daily    ⚡ Complexity: Simple            │
│ ─────────────────────────────────────────────────────── │
│ PURPOSE                                                 │
│  [AI-generated purpose paragraph]                       │
│                                                         │
│ STEPS                                                   │
│  1. ● [Step text]                                       │
│  2. ● [Step text]                                       │
│  ...                                                    │
│                                                         │
│ FAILURE POINTS                                          │
│  ⚠ [Common mistake 1]                                   │
│  ⚠ [Common mistake 2]                                   │
│                                                         │
│ SECOND LOCATION TEST                                    │
│  ✓ / ✗  [Can someone unfamiliar run this?]              │
│ ─────────────────────────────────────────────────────── │
│  [📋 Copy SOP]  [💾 Save SOP]  [🔄 Regenerate]         │
└─────────────────────────────────────────────────────────┘
```

- Card background: `#1a1d2e`, border: `1px solid #d4a017`
- Section headers (PURPOSE, STEPS, FAILURE POINTS, SECOND LOCATION TEST): uppercase, 11px, letter-spacing 0.08em, gold color `#d4a017`
- Step numbers: gold bold
- Failure points: amber `⚠` prefix, muted text
- Second Location Test result: green `✓` if passes, red `✗` if gaps found
- Action bar at bottom: three outlined buttons — Copy SOP, Save SOP, Regenerate

### Update the AI system prompt for Capture SOP to return structured JSON:
```json
{
  "purpose": "string",
  "steps": ["string"],
  "failure_points": ["string"],
  "second_location_test": {
    "passes": true/false,
    "notes": "string"
  },
  "estimated_training_time": "string"
}
```
Parse this JSON on the frontend and render into the structured card above. Include `estimated_training_time` as a small badge ("~5 min to train") near the Role Owner chip.

---

## 3. Quick Checklist Tab — Elevated Styling + Output Upgrade

### Form Field Enhancements
- **Checklist Name**: keep as-is, gold focus ring
- Add a **Station/Area** dropdown: Front of House · Back of House · Bar · Host Stand · Expo · Office · Any. Style to match.
- Add a **Shift** toggle: Opening · Mid · Closing · All Shifts — pill buttons, gold on selected
- **List the Steps textarea**: min-height 140px, live character count

### Generated Checklist Output Card
When AI returns the checklist:

```
┌─────────────────────────────────────────────────────────┐
│ [Gold badge: CHECKLIST READY]    [Station chip] [Shift] │
│ Closing Checklist                                       │
│ ─────────────────────────────────────────────────────── │
│ PRE-SERVICE                                             │
│  ☐  [Item]                                              │
│  ☐  [Item]                                              │
│                                                         │
│ DURING SERVICE                                          │
│  ☐  [Item]                                              │
│                                                         │
│ CLOSE OUT                                               │
│  ☐  [Item]                                              │
│ ─────────────────────────────────────────────────────── │
│  [📋 Copy]  [🖨 Print View]  [💾 Save]                  │
└─────────────────────────────────────────────────────────┘
```

- Checkbox items: actual styled `☐` using a custom CSS class — square border `1px solid #374151`, 16px, checkbox hover highlights gold border
- Section groupings: uppercase, 11px, letter-spacing, gold
- Print View button opens a print-optimized white version of the checklist (white background, black text, proper margins, large checkboxes, restaurant name at top) — `window.print()` with a `@media print` stylesheet injected dynamically

### Update checklist AI system prompt to return structured JSON:
```json
{
  "sections": [
    {
      "title": "string",
      "items": ["string"]
    }
  ],
  "total_items": number,
  "estimated_completion_time": "string"
}
```
Show `estimated_completion_time` as a small badge near the checklist title.

---

## 4. Audit Tab — Elevated Styling + Output Upgrade

### Visual Enhancements
- The "SOP Freshness Check" alert box: give it a proper styled warning card with amber left border `3px solid #f59e0b`, amber icon, dark background `#1f1a0f`. 
- Add a **Review Frequency** field below the textarea: How often is this process done? (Daily / Weekly / Monthly / Rarely / Never documented) — dropdown, styled to match
- Add a **Team Size** field: Solo / 2–5 staff / 6–15 staff / 16+ staff

### Scalability Audit Output Card
When AI returns the audit:

```
┌─────────────────────────────────────────────────────────┐
│ [Gold badge: AUDIT COMPLETE]                            │
│ Scalability Score: 74/100  [amber bar]                  │
│ ─────────────────────────────────────────────────────── │
│ SECOND LOCATION TEST                                    │
│  ✓ PASSES / ✗ FAILS — [one-line verdict]               │
│                                                         │
│ GAPS FOUND  (2)                                         │
│  ⚠ [Gap 1]                                              │
│  ⚠ [Gap 2]                                              │
│                                                         │
│ STRENGTHS  (3)                                          │
│  ✓ [Strength 1]                                         │
│  ✓ [Strength 2]                                         │
│  ✓ [Strength 3]                                         │
│                                                         │
│ RECOMMENDED FIXES                                       │
│  → [Fix 1]                                              │
│  → [Fix 2]                                              │
│ ─────────────────────────────────────────────────────── │
│  [📋 Copy Report]  [💾 Save Audit]                      │
└─────────────────────────────────────────────────────────┘
```

- Scalability Score: a horizontal bar, gold if ≥80, amber if 60–79, red if <60
- Gaps count badge: red pill
- Strengths count badge: green pill
- Recommended Fixes: gold `→` arrow prefix, slightly brighter text

### Update Audit AI system prompt to return structured JSON:
```json
{
  "scalability_score": number,
  "second_location_test_passes": true/false,
  "second_location_verdict": "string",
  "gaps": ["string"],
  "strengths": ["string"],
  "recommended_fixes": ["string"]
}
```

---

## 5. Saved SOPs Library (new section below the tool card)

Add a collapsible **"Saved SOPs & Checklists"** section below the Smart SOP Capture card, collapsed by default. When opened:

- Two sub-tabs: **SOPs** | **Checklists**
- Each saved item renders as a compact card: title, role/station chip, trigger/shift chip, date saved, age badge (green if <30 days, amber if 30–90 days, red if >90 days with "Review Due" label)
- Each card has a ⋮ menu: View Full SOP · Duplicate · Delete
- Empty state: muted text "No SOPs saved yet — generate your first above"
- Saved data stored in `localStorage` under keys `sops_library` and `checklists_library`

---

## 6. Loading States

During AI generation on all three tabs:
- Disable the Generate button and show a spinner + label:
  - Capture SOP: "Structuring your SOP..."
  - Quick Checklist: "Building checklist..."
  - Audit: "Running scalability audit..."
- Add a subtle pulsing skeleton placeholder where the output card will appear — two horizontal shimmer bars to indicate content loading

---

## 7. Design Tokens (match existing app)

```
Background:        #0f1117
Card background:   #1a1d2e
Input background:  #111827
Input border:      #374151
Input focus ring:  #d4a017
Gold accent:       #b8860b / #d4a017
Text primary:      #ffffff
Text muted:        #9ca3af
Success green:     #22c55e
Warning amber:     #f59e0b
Danger red:        #ef4444
Border radius:     12px (cards), 8px (inputs/buttons)
Card shimmer:      box-shadow 0 0 18px rgba(212,160,23,0.18)
```

---

## 8. Mobile Responsiveness

- Header metric strip: horizontal scroll on mobile, no text wrapping
- Frequency / Complexity / Shift toggles: wrap naturally with flex-wrap
- Form fields: single column below 640px
- Output cards: full width, all sections stacked vertically
- Print View button: functional on mobile (opens print dialog)
- Saved Library cards: single column on mobile
- All textareas: min-height 100px, full width

---

## 9. Implementation Order

1. Page header SOP Health Strip
2. Card border shimmer animation (all three tab cards)
3. Capture SOP: new Frequency dropdown + Complexity toggle + character count
4. Capture SOP: structured JSON output card with Copy/Save/Regenerate
5. Quick Checklist: Station + Shift fields + structured checklist output card + Print View
6. Audit: styled warning box + Review Frequency + Team Size + structured audit output card with score bar
7. Saved SOPs Library section (localStorage)
8. Loading shimmer skeletons on all three tabs
9. Principles/Frameworks accordion polish — match gold chevron treatment from other sections
10. Mobile responsiveness pass

Make all changes to the SOPs & Scalability page files only. Preserve all existing AI API logic, accordion content, and tab structure exactly as-is.
