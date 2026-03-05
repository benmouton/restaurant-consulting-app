# Replit Prompt — Cost & Margin Control Major Upgrade

Paste this directly into Replit chat:

---

I need a **major upgrade** to the **Cost & Margin Control** page. Keep the established dark theme: background `#0f1117`, gold/amber accent `#b8860b` / `#d4a017`, card backgrounds `#1a1d2e`, white primary text, muted gray secondary text. Match the visual style used across all other upgraded sections (Kitchen Operations, HR & Documentation, Staffing & Labor, Training Systems, Service Standards).

**DO NOT CHANGE:**
- Any existing save/load logic for plates or weekly checks
- The scoring logic, waste multiplier math, or food cost percentage calculations
- The tab structure (New Plate / Weekly Check / Saved)
- Page routing or file structure
- Any other domain pages

---

## 1. Page Header — Margin Status Strip

Below the "Cost & Margin Control" title and subtitle, add a horizontal strip of 4 dark metric cards with gold left border:

- **Average Food Cost %** — calculated from all saved Weekly Checks. Show value in green if ≤ target, amber if 1–3% over, red if 3%+ over. Default: "No data yet" in muted text.
- **Plates Costed** — count of saved plates. Default: "0 plates saved"
- **Highest Cost Plate** — name + cost of the most expensive saved plate. Default: "--"
- **Last Weekly Check** — date of last saved check + status ("On target · 28.2%" or "Over target · 31.0%"). Default: "No check saved"

Style: compact dark cards (`#1a1d2e`), gold left border 3px, muted label text above, larger bold value below. Horizontal scroll on mobile.

---

## 2. Food Cost Tools Card — Elevated Styling

- Add a subtle animated gold shimmer/glow on the card border (CSS keyframe animation, same low-intensity treatment used on the Skills Certification Engine and other premium cards across the app)
- Card background: `#1a1d2e`, border radius 12px
- Tab bar (New Plate / Weekly Check / Saved): active tab gets white text on dark filled background, inactive tabs are muted gray. Smooth underline or fill transition on tab change.

---

## 3. NEW PLATE TAB — Major UX Upgrade

### Plate Name Field
- Label: "What are you costing?" — keep as-is
- Add a subtle gold underline focus effect on the input (no full border highlight, just bottom border gold glow on focus)
- Placeholder stays: "e.g., 8oz Ribeye with sides"

### Ingredient Entry Row — Visual Upgrade
- The 5-field row (name, amount, unit, cost/unit, category) gets refined styling:
  - All inputs: dark background `#111827`, subtle `#374151` border, gold focus ring
  - The unit dropdown (oz, lbs, each, etc.) and category dropdown (Protein, Produce, Dairy, Dry Goods, Other) get consistent dark dropdown styling with gold checkmark on selected item
  - Category dropdown: show a colored dot before the label to visually signal waste multiplier:
    - Protein (+5%) → amber dot
    - Produce (+10%) → orange dot  
    - Dairy (+3%) → blue dot
    - Dry Goods (+2%) → gray dot
    - Other → white dot

### Live Cost Preview — NEW
As soon as ingredient name + amount + cost/unit are entered (before clicking "Add Ingredient"), show a subtle inline preview below the row:
```
→ Steak · 8 oz @ $2.45/oz · Protein waste applied · Est. cost: $20.58
```
Styled in muted gold text, small font, fades in with a 150ms opacity transition.

### "Add Ingredient" Button
- Keep the existing gold button style
- Add a brief ripple/pulse animation on click confirmation
- After adding, briefly flash the new ingredient card green to confirm addition

### Ingredient List — Upgraded Cards
Each added ingredient renders as a dark card row (`#111827` background):
- Left: ingredient name in white, amount + cost detail in muted text below (e.g., "8 oz @ $2.45/oz · +5% waste applied")
- Right: calculated cost in gold/amber, star (save/favorite) icon, × remove icon
- On hover: subtle background lighten, slight scale (1.01)
- Star icon: clicking marks as a "frequently used ingredient" (saves to local ingredient library — see section 6)

### Total Plate Cost
- Display in a distinct summary bar below the ingredients list
- Label: "Total Plate Cost" in white
- Value: large gold/amber text
- Animate count-up on change (numbers tick up/down as ingredients are added/removed — 300ms ease)

### Target Food Cost + Menu Price Section
- Target Food Cost dropdown: dark styled, same chevron/gold-check treatment as other dropdowns
- Dropdown options with restaurant type labels (keep existing: Casual Dining 28%, Brunch/Breakfast 30%, Seafood/Fine Dining 32%, Quick Service 25%) — add a small percentage badge next to each for clarity
- Menu Price input: keep "Leave blank for suggestion" placeholder
- If left blank: after plate is calculated, auto-suggest a menu price below the input in muted text:
  ```
  Suggested price: $73.50 (at 28% food cost)
  ```

### Margin Result Banner — NEW
After clicking "Cost This Plate", show a prominent result banner inside the card (replaces or appears below the inputs):

```
┌──────────────────────────────────────────────────────┐
│  8 Oz Ribeye                                          │
│  Plate Cost: $20.58     Menu Price: $73.50            │
│                                                        │
│  Food Cost %    Margin $    Margin %                  │
│     28.0%        $52.92      72.0%                    │
│                                                        │
│  ✅ On target for Casual Dining                       │
│                                                        │
│  [★ Save Plate]   [+ Add Ingredient]   [New Plate]   │
└──────────────────────────────────────────────────────┘
```

- Banner background: dark `#111827` with gold left border
- Color-code food cost %: green ≤ target, amber 1–3% over, red 3%+
- Status line: green check "On target" or amber warning "X% over your target — reprice or respec to reclaim $Y/plate"
- The dollar leak message is key: **"That's $Y that leaked somewhere."** — match the exact language already on the Weekly Check tab, keep it consistent

---

## 4. WEEKLY CHECK TAB — Upgraded UI

The Weekly Check tab already has strong logic. Upgrade the visual presentation:

### Input Fields
- "What you paid for food" and "What you sold in food" inputs: dark background, gold focus ring, number-spinner arrows styled to match dark theme (or hidden — pure keyboard input is fine)
- "Your target" dropdown: consistent dark dropdown styling

### Result Display — Upgraded Banner
Replace or upgrade the current result box:

```
┌──────────────────────────────────────────────────────┐
│  Week of [date]                                       │
│                                                        │
│         30.0%                                         │
│    Your actual food cost                              │
│                                                        │
│  Food Spend: $4,500    Food Sales: $15,000            │
│  Target: 28% (Casual Dining)                          │
│                                                        │
│  ⚠️  You're 2.0% over target.                         │
│      That's $300 that leaked somewhere.               │
│                                                        │
│  [Save This Week]                                     │
└──────────────────────────────────────────────────────┘
```

- Large central percentage: color-coded (green/amber/red based on vs. target)
- Background: dark `#111827` with left border colored to match status
- The leak dollar amount ("$300 that leaked somewhere") in amber/gold bold — this is the emotional hook, make it prominent
- Animate the percentage on calculation: count-up from 0 to actual % over 600ms

### Trend Mini-Chart — NEW (if saved weeks exist)
Below the result banner, if there are 2+ saved weekly checks, show a small sparkline or bar chart of the last 4–8 weeks of food cost %. Color each bar green/amber/red vs. target. Label: "Recent trend" in muted text. Keep it compact — 80px tall max.

---

## 5. SAVED TAB — Upgraded Display

### Saved Plates
Each saved plate renders as a dark card:
- Plate name (bold white), date saved (muted, right-aligned)
- Food Cost % badge (color-coded green/amber/red)
- Plate cost + suggested menu price in a two-column layout
- "Load" button (gold outline) to reload into New Plate tab for editing
- "Delete" button (red icon, confirm before delete)
- On hover: card slightly lifts (box-shadow increase)

### Saved Weekly Checks
Each saved week renders as a compact row card:
- Date range label (e.g., "Week of Mar 3, 2026")
- Food % in color-coded badge
- Food spend vs. food sales in muted text
- Status label: "On target" (green) or "Over by X%" (amber/red)

### Empty States
Both empty states (no saved plates, no saved checks) should be designed — not just plain text:
- Faint grid or dot pattern background
- Icon (plate icon for plates, calendar icon for weekly checks)
- Explanatory text: "Cost your first plate to see it here" / "Save your first weekly check to start tracking your trend"
- Primary action button (gold)

---

## 6. Ingredient Library — NEW FEATURE

When an operator stars (★) an ingredient in the New Plate tab, it saves to a local ingredient library. This dramatically speeds up future plate costing.

### Library UI
- Accessible via a small "My Ingredients" link/button below the ingredient entry row in the New Plate tab
- Opens an inline expandable panel (not a new page) showing saved ingredients as chips:
  - Chip format: "Steak (8oz · $2.45/oz · Protein)"
  - Clicking a chip auto-fills the ingredient row with those values
  - Each chip has a small × to remove from library
- On first use: "No saved ingredients yet. Star any ingredient to save it here."

This is a UI-only enhancement. Store the ingredient library in localStorage (key: `trc_ingredient_library`).

---

## 7. Principles Accordion — Visual Upgrade

Match the treatment from other upgraded sections:
- Smooth CSS transition on expand/collapse (max-height animation, 300ms ease)
- Gold chevron rotates 180° on expand
- Principle blockquote: 3px gold left border, subtle background tint (`rgba(184, 134, 11, 0.08)`)
- Framework section: render WHAT TO TRACK items as a small formatted list (bullet-style), not a raw text blob
- Checklist section: render checklist items as styled checkbox rows (visual only — not interactive unless already wired)
- Multiple sections individually expandable

---

## 8. Design Tokens (match all other upgraded sections exactly)

```
Page background:   #0f1117
Card background:   #1a1d2e
Input background:  #111827
Input border:      #374151
Input focus ring:  #d4a017
Gold accent:       #b8860b / #d4a017
Text primary:      #ffffff
Text muted:        #9ca3af
On target green:   #22c55e
Warning amber:     #f59e0b
Danger red:        #ef4444
Border radius:     12px (cards), 8px (inputs)
```

---

## 9. Mobile Responsiveness

- Header metric strip: horizontal scroll on mobile, no text wrapping
- Ingredient entry row: stack to 2-column grid on screens < 640px (name+amount on row 1, unit+cost+category on row 2)
- Result banners: full width, readable at 375px
- Trend chart: horizontal scroll if needed on very small screens
- Saved cards: single column on mobile
- Ingredient library panel: full width on mobile

---

Make all changes to the Cost & Margin Control page files only. Preserve all existing calculation logic, save/load functionality, and tab structure exactly as-is.
