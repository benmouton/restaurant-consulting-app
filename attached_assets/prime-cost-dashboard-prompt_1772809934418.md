# Replit Prompt — Weekly Prime Cost Dashboard

Paste this directly into Replit chat:

---

Build a **Weekly Prime Cost Dashboard** as a new module within the Financial Insights domain. This is a new feature — not a redesign of anything existing. It is the platform's primary retention mechanism: an operator who enters their numbers every week builds a data history they can't walk away from.

Match the established dark theme throughout: background `#0f1117`, gold/amber accent `#b8860b` / `#d4a017`, card backgrounds `#1a1d2e`, white primary text, muted gray secondary text.

**DO NOT CHANGE:**
- Any existing Financial Insights content or calculators
- Setup page or its variable system
- Any other domain pages, training manuals, or modules
- Stripe/RevenueCat subscription logic
- Tier gating — this feature is locked behind paid tier (Basic and Pro), gated via existing UpgradeGate component

---

## WHAT THIS FEATURE DOES

An operator enters three numbers once a week:
1. Total food cost for the week (dollars spent on food)
2. Total labor cost for the week (total payroll including management)
3. Total sales for the week (gross revenue)

The platform calculates their prime cost percentage, compares it to their stated target from Setup, shows a 4-week rolling trend, and gives them a plain-language status with one specific action if they're off target.

That's it. Simple, weekly, irreplaceable.

---

## DATABASE SCHEMA

Create a new table `prime_cost_entries`:

```sql
CREATE TABLE prime_cost_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_ending DATE NOT NULL,           -- Sunday of the week being entered
  food_cost DECIMAL(10,2) NOT NULL,    -- dollars
  labor_cost DECIMAL(10,2) NOT NULL,   -- dollars
  total_sales DECIMAL(10,2) NOT NULL,  -- dollars
  food_cost_pct DECIMAL(5,2),          -- calculated: food_cost / total_sales * 100
  labor_cost_pct DECIMAL(5,2),         -- calculated: labor_cost / total_sales * 100
  prime_cost_pct DECIMAL(5,2),         -- calculated: (food_cost + labor_cost) / total_sales * 100
  notes TEXT,                          -- optional operator note for the week
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, week_ending)         -- one entry per user per week
);
```

Calculate and store the percentages server-side on insert/update — never trust client-side math for financial records.

---

## API ENDPOINTS

```
GET    /api/prime-cost              — fetch all entries for current user, ordered by week_ending DESC
POST   /api/prime-cost              — create or update entry for a given week_ending date
PUT    /api/prime-cost/:id          — update an existing entry
DELETE /api/prime-cost/:id          — delete an entry (with confirmation)
GET    /api/prime-cost/summary      — returns last 4 weeks + targets + trend direction
```

All endpoints require authentication. All endpoints verify the entry belongs to the requesting user before any read/write/delete.

Server-side validation on POST/PUT:
- `week_ending` must be a valid date, not in the future beyond next Sunday
- `food_cost`, `labor_cost`, `total_sales` must be positive numbers
- `total_sales` must be greater than zero
- `food_cost + labor_cost` must be less than `total_sales * 1.5` — flag if prime cost exceeds 150% (data entry error)

---

## PAGE STRUCTURE — `/financial-insights/prime-cost`

Add "Prime Cost Tracker" as a tab or section within the Financial Insights domain. It sits at the top of the Financial Insights page — this is the primary feature, not a secondary calculator.

---

### SECTION 1: STATUS HEADER

Full-width card at the top. Pulls targets from Setup (`{{foodCostTarget}}`, `{{laborCostTarget}}`, `{{primeCostTarget}}`).

If the user has at least one entry, show the current week's status:

```
┌─────────────────────────────────────────────────────────┐
│  PRIME COST — WEEK ENDING [date]                        │
│                                                          │
│  63.2%          Target: 60%          ▲ 3.2pts over      │
│                                                          │
│  Food Cost: 33.1%  (target 30%)  ▲ 3.1pts               │
│  Labor Cost: 30.1%  (target 30%)  ✓ on target           │
│                                                          │
│  STATUS: ⚠️ WATCH THIS                                   │
│  Your food cost is driving the variance. Check portion   │
│  control and waste logs before next service.             │
└─────────────────────────────────────────────────────────┘
```

**Status logic — three states:**

| Condition | Status | Color | Icon |
|---|---|---|---|
| Prime cost at or under target | ON TRACK | Green `#22c55e` | ✓ |
| Prime cost 1–4 pts over target | WATCH THIS | Amber `#d4a017` | ⚠️ |
| Prime cost 5+ pts over target | ACT NOW | Red `#ef4444` | 🔴 |

**Plain-language action line — generate based on which component is over:**

- Food cost over, labor on target → *"Your food cost is driving the variance. Check portion control and waste logs before next service."*
- Labor over, food on target → *"Your labor cost is driving the variance. Review this week's schedule against actual hours and look for overtime."*
- Both over → *"Both food and labor are over target. Start with food cost — it's typically faster to correct. Pull your waste log and portion records first."*
- Both on target → *"You're running clean this week. Stay consistent."*
- No targets set in Setup → Show amber card: *"Set your food cost and labor targets in Setup to see personalized status."* with a gold link to the Setup Financial Profile section.

If no entries yet, show an empty state in place of the status header:
```
No entries yet. Add your first week below to start tracking.
```

---

### SECTION 2: 4-WEEK TREND CHART

Render a line chart showing up to the last 4 weeks of prime cost % over time.

Use recharts (already available in the project). Three lines:
- **Prime cost %** — gold line `#d4a017`, bold, 2px stroke
- **Food cost %** — white line, 1px stroke
- **Labor cost %** — muted gray line, 1px stroke, dashed

Add a horizontal reference line at the prime cost target value — amber dashed line labeled "Target".

X-axis: week ending dates, formatted as "Mar 3", "Mar 10" etc.
Y-axis: percentage, range from 0 to max(actual prime cost + 5), labeled with % symbol.

Chart background: `#12141f`. Grid lines: `#2a2d3e`. Tooltip: dark card with gold accent showing all three values on hover.

If fewer than 2 entries exist: show the chart area as empty with a centered message: *"Add 2 or more weeks to see your trend."*

Below the chart, a one-line trend summary:
- If latest prime cost is lower than the previous week: *"▼ Down [X]pts from last week — trending in the right direction."* in green
- If higher: *"▲ Up [X]pts from last week — review this week's drivers."* in amber
- If equal: *"→ Flat week-over-week."* in gray
- If only one entry: no trend line shown

---

### SECTION 3: WEEKLY ENTRY FORM

Dark card with gold section title: **"Enter This Week's Numbers"**

**Week Ending Date selector:**
- Default to the most recent Sunday (auto-calculated)
- Allow selecting any prior Sunday via a date picker — operators may need to backfill
- If an entry already exists for the selected week: load those values into the form fields and show an amber note: *"You already have an entry for this week. Saving will update it."*

**Three input fields — large, clear, operator-friendly:**

```
Food Cost This Week
$ [___________]
Total spent on food purchases and invoices

Labor Cost This Week  
$ [___________]
Total payroll including management, FOH, and BOH

Total Sales This Week
$ [___________]
Gross revenue before discounts and comps
```

Each field: dark background `#12141f`, gold focus border, `$` prefix, accepts numeric input with comma formatting. Tab order: food cost → labor → sales → save.

**Live preview — updates as they type:**

Below the three fields, a live calculation card that updates in real time:

```
┌──────────────────────────────────────┐
│  Food Cost:   33.1%   target 30%  ▲  │
│  Labor Cost:  30.1%   target 30%  ✓  │
│  Prime Cost:  63.2%   target 60%  ▲  │
└──────────────────────────────────────┘
```

Color-coded: green checkmark if at/under target, amber triangle if over. This updates live — operators can see their prime cost in real time before saving. This is the most important UX detail in the entire feature.

**Notes field (optional):**
```
Notes (optional)
[_________________________________]
e.g. "Short-staffed Wed/Thu, higher labor. Crawfish delivery spike."
```
Single line, max 200 characters. This is how operators build a narrative around their numbers over time.

**Save button:** Gold, full width, `font-size: 16px`. Label: **"Save Week"**. Loading state: "Saving..." with spinner. Success state: brief green flash + "✓ Saved" before returning to normal.

---

### SECTION 4: ENTRY HISTORY TABLE

Below the entry form, a table of all past entries — most recent first.

Columns:
| Week Ending | Food Cost % | Labor Cost % | Prime Cost % | vs. Target | Notes | Actions |
|---|---|---|---|---|---|---|

- **vs. Target:** show the prime cost variance in colored text — green if under, amber if 1–4 over, red if 5+ over. Format: "+3.2pts" or "-1.1pts"
- **Notes:** truncated to 40 chars with tooltip showing full text on hover
- **Actions:** Edit (pencil icon) | Delete (trash icon, requires confirmation modal)

Clicking Edit loads that week's values back into the entry form above and scrolls to it.

Empty state: *"No entries yet. Your history will appear here once you start tracking."*

Pagination: show 8 entries per page if history grows beyond 8 weeks. Most operators will have 4–12 weeks of data.

---

### SECTION 5: EXPORT

At the bottom of the history table, a small text link: **"Export history as CSV"**

Exports all entries for the current user as a `.csv` file with columns: Week Ending, Food Cost ($), Labor Cost ($), Total Sales ($), Food Cost %, Labor Cost %, Prime Cost %, Target Prime Cost %, Variance, Notes.

File name: `[RestaurantName]-prime-cost-history-[YYYY-MM-DD].csv`

No PDF needed here — this data belongs in a spreadsheet.

---

## NAVIGATION & ENTRY POINT

**Financial Insights domain:** Add "Prime Cost Tracker" as the first and primary section/tab. If Financial Insights currently has other calculators, they move below this.

**Dashboard — add a Prime Cost widget to the Operator Command Strip** (the live status panel at the top of the dashboard):

If the user has entries: show their most recent prime cost % with a colored status dot.
```
Prime Cost  63.2%  ⚠️
```
Click anywhere on the widget navigates to `/financial-insights/prime-cost`.

If no entries yet:
```
Prime Cost  —  Set up →
```
Gold "Set up →" link navigates to the prime cost entry form.

**After a user saves their first entry:** show a brief toast notification:
*"First week tracked. Come back next Monday with your new numbers."*

---

## EMAIL REMINDER (if email is configured in the project)

If the platform has email capability (Resend, SendGrid, or similar), add a Monday morning reminder for users who haven't entered their numbers for the current week by Monday at noon.

Subject: *"Your prime cost — did last week hold?"*
Body: One paragraph, operator tone. Link directly to the entry form. No unsubscribe dark patterns — clear opt-out in user settings.

If email is not configured: skip this entirely, note it as a future addition, do not add placeholder code.

---

## SETUP INTEGRATION

Pull `{{foodCostTarget}}`, `{{laborCostTarget}}`, and `{{primeCostTarget}}` from Setup for all target comparisons.

If these fields are empty: show a persistent amber banner at the top of the prime cost page:
```
⚠️ Set your food cost and labor targets in Setup to see
how your weekly numbers compare.  →  Complete Setup
```

"Complete Setup" is a gold link to the Setup Financial Profile section. This banner disappears once targets are set.

---

## TIER GATING

This feature is locked to paid tiers (Basic and Pro). Wrap the entire Prime Cost Tracker in the existing `<UpgradeGate>` component with domain key `'financial-insights'`.

Add to the upgrade gate copy map for this specific feature:
```
headline: "Your Prime Cost Is Either Under Control or It Isn't"
sub: "Weekly tracking with 4-week trend. The operators who know their prime cost number every Monday make better decisions than the ones who find out at month end."
```

Free users see the blur overlay with this copy. Paid users have full access.

---

## RENDERING STANDARDS

All new components match existing platform standards exactly:
- Status header card: `border: 1px solid` with status color (green/amber/red), `background: #1a1d2e`
- Entry form card: `border: 1px solid #b8860b`, `background: #1a1d2e`
- Live preview card: `background: #12141f`, `border: 1px solid #2a2d3e`, updates with `transition: all 0.2s ease`
- History table: header row `background: #b8860b`, `color: #0f1117`, alternating rows `#1a1d2e` / `#12141f`
- Trend chart: background `#12141f`, contained in a card with gold border
- All status colors: green `#22c55e`, amber `#d4a017`, red `#ef4444`
- Toast notifications: bottom-right, dark background, gold accent, 3-second auto-dismiss

---

## IMPLEMENTATION ORDER

1. Database migration — create `prime_cost_entries` table
2. API endpoints — GET, POST, PUT, DELETE, summary
3. Server-side calculation logic (percentages, variance, status determination)
4. Entry form component with live preview calculator
5. Status header component with plain-language action line
6. 4-week trend chart with recharts
7. Entry history table with edit/delete
8. CSV export
9. Setup target integration + missing targets banner
10. Dashboard Prime Cost widget in the Operator Command Strip
11. Post-first-entry toast notification
12. Apply UpgradeGate wrapper with new copy
13. Navigation — add Prime Cost Tracker as primary tab in Financial Insights
14. Email reminder (only if email already configured — skip if not)
15. Mobile responsiveness pass — entry form must be fully usable on iPhone

---

## SUCCESS CRITERIA

The feature is working correctly when:
- An operator can enter food cost, labor cost, and total sales for a week and see their prime cost percentage calculated instantly in the live preview before saving
- The status header correctly shows ON TRACK / WATCH THIS / ACT NOW based on their targets from Setup
- The plain-language action line correctly identifies whether food cost, labor cost, or both are driving the variance
- The 4-week trend chart renders correctly after 2+ entries and shows the target reference line
- Editing a prior week's entry updates it without creating a duplicate
- The dashboard Prime Cost widget shows the most recent entry's percentage with correct status color
- A free-tier user sees the UpgradeGate overlay with the correct domain-specific copy
- CSV export downloads a properly formatted file with all entries
- All calculations match: (food_cost + labor_cost) / total_sales × 100 = prime cost %

Make all changes to the Financial Insights domain and dashboard only. Do not touch any other modules, training manuals, Setup logic, Stripe integration, or tier configuration.
