# Replit Prompt — Menu Engineering Tool

Paste this directly into Replit chat:

---

Build a **Menu Engineering Tool** as a new module within the Cost & Margin Control domain. This is a new feature — not a redesign of anything existing. It allows operators to enter every menu item with its cost and selling price, calculates food cost percentage and contribution margin for each item, categorizes each item using the industry-standard Menu Engineering matrix (Stars, Plowhorses, Puzzles, Dogs), and gives the operator specific, actionable decisions for each category.

Match the established dark theme throughout: background `#0f1117`, gold/amber accent `#b8860b` / `#d4a017`, card backgrounds `#1a1d2e`, white primary text, muted gray secondary text.

**DO NOT CHANGE:**
- Any existing Cost & Margin Control content or calculators
- Setup page or its variable system
- Any other domain pages or modules
- Stripe/RevenueCat subscription logic
- Tier gating — this feature is locked behind paid tier via existing UpgradeGate component

---

## WHAT THIS FEATURE DOES

An operator enters every menu item: name, category, cost to make, and selling price. The tool calculates food cost % and contribution margin for each item, then cross-references cost performance against popularity to place each item in one of four quadrants. The output is a clear visual matrix and a prioritized action list that tells the operator exactly which items to promote, reprice, reengineer, or remove.

This is the bridge between the Prime Cost Dashboard ("your food cost is 4 points over target") and the actual menu decision ("these 3 items are why").

---

## DATABASE SCHEMA

```sql
CREATE TABLE menu_categories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,           -- e.g. "Appetizers", "Entrées", "Cocktails"
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE menu_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES menu_categories(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  menu_price DECIMAL(10,2) NOT NULL,     -- selling price
  item_cost DECIMAL(10,2) NOT NULL,      -- cost to make (food cost)
  food_cost_pct DECIMAL(5,2),            -- calculated: item_cost / menu_price * 100
  contribution_margin DECIMAL(10,2),     -- calculated: menu_price - item_cost
  weekly_units_sold INTEGER DEFAULT 0,   -- operator enters estimated weekly covers for this item
  weekly_revenue DECIMAL(10,2),          -- calculated: menu_price * weekly_units_sold
  weekly_contribution DECIMAL(10,2),     -- calculated: contribution_margin * weekly_units_sold
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

All calculated fields computed server-side on insert/update. Never trust client-side math for financial records.

---

## API ENDPOINTS

```
GET    /api/menu/categories              — all categories for current user
POST   /api/menu/categories              — create category
PUT    /api/menu/categories/:id          — update category
DELETE /api/menu/categories/:id          — delete category (and orphan its items)

GET    /api/menu/items                   — all menu items for current user
GET    /api/menu/items/:id               — single item detail
POST   /api/menu/items                   — create menu item
PUT    /api/menu/items/:id               — update menu item
DELETE /api/menu/items/:id               — delete menu item

GET    /api/menu/analysis                — full matrix analysis for current user
GET    /api/menu/export                  — export full menu engineering report
```

Server-side validation on POST/PUT:
- `menu_price` and `item_cost` must be positive numbers
- `item_cost` must be less than `menu_price` — flag if food cost % exceeds 80% (likely data entry error, still allow but warn)
- `weekly_units_sold` must be zero or positive integer

---

## PAGE STRUCTURE

### LAYOUT: Three tabs

**Tab 1: Matrix** — the visual menu engineering quadrant + item list
**Tab 2: Menu Items** — full item management table with add/edit
**Tab 3: Report** — exportable summary report

Default landing tab: Matrix (if items exist) or Menu Items (if no items yet).

---

## TAB 1: MATRIX VIEW

### TOP: Summary Stats Strip

Four metric cards matching the platform's Operator Command Strip style:

- **Total Menu Items** — count of active items
- **Avg Food Cost %** — weighted average across all items (weighted by units sold)
- **Total Weekly Contribution** — sum of all weekly contribution margins
- **Items Needing Attention** — count of Dogs + Puzzles

Target food cost from Setup: `{{foodCostTarget}}%` — shown as reference below the avg food cost card. If avg food cost is above target: amber. If at or under: green.

---

### MIDDLE: The Matrix — Visual Quadrant

The core of the feature. A 2x2 grid with:
- **X-axis:** Contribution Margin (Low → High) — relative to the menu average
- **Y-axis:** Popularity / Units Sold (Low → High) — relative to the menu average

Each item appears as a labeled dot on the matrix, color-coded by quadrant.

```
HIGH POPULARITY
        │
⭐ STARS│ 🐴 PLOWHORSES
        │
────────┼────────
        │
🧩 PUZZLES│ 🐕 DOGS
        │
LOW POPULARITY
     Low CM    High CM
```

**Quadrant definitions:**

| Quadrant | Popularity | Contribution Margin | Color | Action |
|---|---|---|---|---|
| ⭐ Stars | High | High | Gold `#d4a017` | Protect and promote |
| 🐴 Plowhorses | High | Low | Blue `#3b82f6` | Reprice or reengineer |
| 🧩 Puzzles | Low | High | Purple `#8b5cf6` | Reposition or promote |
| 🐕 Dogs | Low | Low | Red `#ef4444` | Evaluate for removal |

**Thresholds:**
- Popularity threshold: items with weekly units sold at or above the menu average = High; below = Low
- Contribution margin threshold: items with CM at or above the menu average = High; below = Low

Each dot on the matrix:
- Size: proportional to weekly revenue (larger dot = more revenue)
- Color: quadrant color
- Label: item name (truncated to 15 chars if needed, full name on hover)
- Hover tooltip: name, price, cost %, CM, units/week, quadrant

Use a scatter plot via recharts or d3. Reference lines at the average CM (vertical) and average popularity (horizontal) — muted gray dashed lines labeled "Menu Average".

**If fewer than 3 items:** show the matrix area empty with a centered message:
*"Add at least 3 menu items with sales data to generate the matrix."*

---

### BOTTOM: Items by Quadrant — Action Cards

Below the matrix, four collapsible sections — one per quadrant — each listing the items in that quadrant with a specific action recommendation.

**⭐ STARS — Protect and Promote**
Gold border card. Header: "These are your best performers. High margin, high popularity. Don't change them — feature them."

For each Star:
```
Filet Mignon          $38.00  |  Cost: $14.20 (37.4%)  |  CM: $23.80  |  42 sold/wk
→ Feature on your menu. Train servers to recommend it first.
```

**🐴 PLOWHORSES — Reprice or Reengineer**
Blue border card. Header: "Guests love these but the margin is thin. Raise the price, reduce the cost, or both."

For each Plowhorse:
```
Chicken Fried Steak   $18.00  |  Cost: $8.10 (45%)     |  CM: $9.90   |  67 sold/wk
→ A $1–2 price increase is unlikely to reduce volume on a popular item.
   Alternatively: review portion size and prep yield.
```

**🧩 PUZZLES — Reposition or Promote**
Purple border card. Header: "High margin but guests aren't ordering them. A positioning or awareness problem, not a price problem."

For each Puzzle:
```
Vieux Carré           $14.00  |  Cost: $3.50 (25%)     |  CM: $10.50  |  8 sold/wk
→ Add to the server upsell script. Consider a featured cocktail callout on the menu.
   Do not discount — the margin is the point.
```

**🐕 DOGS — Evaluate for Removal**
Red border card. Header: "Low margin and low popularity. Every Dog on the menu costs you in complexity, inventory, and staff attention."

For each Dog:
```
Lobster Bisque        $12.00  |  Cost: $6.80 (56.7%)   |  CM: $5.20   |  4 sold/wk
→ Remove from the menu, or reprice significantly upward.
   If it has sentimental value: move it off-menu and make it a special.
```

Each quadrant section is collapsible. Default: all expanded. Item count shown in section header badge.

---

## TAB 2: MENU ITEMS

### Category Management

Above the item table, a horizontal row of category pills — each one clickable to filter the table. Plus a "+ Add Category" pill at the end.

Default categories pre-populated on first load (operator can rename or delete):
Appetizers / Soups & Salads / Entrées / Sides / Desserts / Cocktails / Beer & Wine / Non-Alcoholic

### Item Table

Columns:

| Item | Category | Price | Cost | Food Cost % | CM | Units/Wk | Weekly Rev | Quadrant | Actions |
|---|---|---|---|---|---|---|---|---|---|

- **Food Cost %:** color-coded — green if under `{{foodCostTarget}}`, amber if 0–5pts over, red if 5+ pts over
- **CM:** white text, sorted descending by default within category
- **Quadrant:** colored badge pill matching quadrant colors
- **Actions:** Edit (pencil) | Delete (trash, with confirmation)

**Above table:**
- Search by item name
- Filter by category
- Filter by quadrant
- "Import from CSV" button (see below)
- "+ Add Item" gold button (top right)

**Empty state:**
```
No menu items yet.
Add your first item to start engineering your menu.
[ + Add Item ]   [ Import CSV ]
```

### Add / Edit Item Modal

```
Item Name *
[________________________________]

Category
[ Select or create ▼ ]

Description (optional — for your reference)
[________________________________]

Menu Price *              Item Cost *
$ [_________]             $ [_________]

Est. Weekly Units Sold
[ _____ ]
How many of this item do you sell in a typical week?
This determines where it falls on the popularity axis.

Notes (optional)
[________________________________]

Active
[ ✓ ] Include in menu engineering analysis
```

**Live preview — updates as they type:**

```
┌──────────────────────────────────┐
│  Food Cost:    37.4%   ▲ target  │
│  Contribution: $23.80            │
│  Weekly Rev:   $1,596            │
│  Weekly CM:    $999.60           │
└──────────────────────────────────┘
```

Color-coded food cost indicator: green / amber / red vs. `{{foodCostTarget}}`.

Quadrant assignment preview — show after units sold is entered:
```
Based on your current menu, this item would be: ⭐ STAR
```

Updates live as price, cost, and units are changed.

Save button: gold, full width. Label: "Save Item".

### CSV Import

Allow operators to import menu items from a CSV file to avoid manual entry for large menus.

Expected CSV format:
```
Item Name, Category, Menu Price, Item Cost, Weekly Units Sold, Description
Filet Mignon, Entrées, 38.00, 14.20, 42, 8oz center cut
```

On import:
1. Parse and validate each row
2. Show a preview table of items to be imported with any validation errors flagged
3. Operator confirms import
4. Items created with correct category assignments (create new categories if needed)
5. Summary: "18 items imported successfully. 2 rows had errors — see below."

Provide a downloadable CSV template with the correct column headers and 3 example rows.

---

## TAB 3: REPORT

A formatted, exportable menu engineering report. This is the document an operator shows their chef, their business partner, or their accountant.

### Report Content

**Cover:**
- `{{restaurantName}}`
- "Menu Engineering Analysis"
- Report date
- "Prepared by `{{ownerName}}`"
- Total items analyzed, date range of sales data

**Section 1: Executive Summary**

```
MENU OVERVIEW
Total Active Items:        47
Average Food Cost %:       33.2%     Target: 30%    ▲ 3.2pts over
Average Contribution Margin: $11.40
Total Weekly Revenue:      $18,240
Total Weekly Contribution: $12,184

QUADRANT BREAKDOWN
⭐ Stars:       12 items  (26%)   Avg CM: $16.20
🐴 Plowhorses:  18 items  (38%)   Avg CM: $7.80
🧩 Puzzles:      8 items  (17%)   Avg CM: $18.40
🐕 Dogs:         9 items  (19%)   Avg CM: $4.20
```

**Section 2: Priority Actions**

Three bullet points auto-generated from the analysis:

- *"Your 9 Dogs represent 19% of your menu items but only 8% of weekly revenue. Removing or repricing 5 of them would reduce menu complexity without meaningful revenue impact."*
- *"Your Plowhorses generate 52% of weekly revenue but run a 44% average food cost — 14pts over your target. A $1 price increase across your top 5 Plowhorses would generate an additional $[calculated] weekly contribution."*
- *"Your Puzzles have the highest average contribution margin on the menu. [Item name] at $[CM] contribution margin is being ordered only [X] times per week. It belongs in your server upsell script."*

These are calculated from actual data — not generic advice. Pull the real numbers.

**Section 3: Full Item Table**

All items sorted by quadrant, then by contribution margin descending within each quadrant.

Columns: Item, Category, Price, Cost, Food Cost %, CM, Units/Wk, Weekly Revenue, Quadrant

**Section 4: Recommendations by Quadrant**

One paragraph per quadrant with specific item callouts. Pull the top 3 items from each quadrant and reference them by name.

### Export

- **Print:** `window.print()` — clean black on white, multi-page, professional layout
- **PDF download:** `{{restaurantName}}-Menu-Engineering-[YYYY-MM-DD].pdf`
- **CSV:** full item table with all calculated fields

---

## DASHBOARD WIDGET

Add a Menu Engineering widget to the dashboard Operator Command Strip:

If items exist and matrix is populated:
```
Menu Health   12 Stars  ·  9 Dogs  →
```

Gold "Stars" count, red "Dogs" count. Click navigates to Menu Engineering matrix tab.

If no items yet:
```
Menu Engineering   Not set up  →
```

---

## CONSULTANT INTEGRATION

Add menu engineering data to the Consultant system prompt injection (built in the Financial Profile upgrade). Append to the operator profile:

```
MENU ENGINEERING:
Total menu items: [count]
Average food cost %: [pct]% (target: {{foodCostTarget}}%)
Stars: [count] items | Plowhorses: [count] | Puzzles: [count] | Dogs: [count]
Top Star by CM: [item name] ($[CM] contribution margin)
Highest food cost item: [item name] ([pct]% food cost)
Lowest CM item still on menu: [item name] ($[CM])
```

This means when an operator asks the Consultant "which items should I look at for my food cost problem?" the Consultant can answer with their actual menu data — naming specific items, referencing real contribution margins, and pointing to the real dogs by name.

---

## UPGRADE GATE

Wrap the entire Menu Engineering Tool in the existing `<UpgradeGate>` component.

Add to the upgrade gate copy map:
```
'menu-engineering': {
  headline: "Know Which Items Are Costing You and Which Are Carrying You",
  sub: "Enter your menu with costs and sales data. Get a visual matrix showing your Stars, Plowhorses, Puzzles, and Dogs — with specific actions for each one."
}
```

---

## RENDERING STANDARDS

All components match existing platform standards:
- Summary strip metric cards: gold left border, `#1a1d2e` background, large white number, muted label
- Matrix scatter plot: background `#12141f`, contained in gold-bordered card
- Quadrant action cards: border color matches quadrant (gold/blue/purple/red), `#1a1d2e` background
- Item table: header `background: #b8860b`, `color: #0f1117`, alternating rows `#1a1d2e` / `#12141f`
- Food cost % color coding: green `#22c55e` (under target), amber `#d4a017` (0–5pts over), red `#ef4444` (5+ pts over)
- Quadrant badge pills: background matches quadrant color at 20% opacity, text in quadrant color
- Modal: dark overlay, `#1a1d2e` card, gold border, max-width 580px
- Live preview card in modal: `background: #12141f`, `border: 1px solid #2a2d3e`, real-time updates with `transition: all 0.15s ease`
- Report document: black on white, Georgia or serif font, professional layout, no dark backgrounds

---

## IMPLEMENTATION ORDER

1. Database migration — create `menu_categories` and `menu_items` tables
2. API endpoints — categories and items CRUD, analysis endpoint, export
3. Server-side calculation logic — food cost %, CM, weekly revenue, weekly contribution
4. Matrix classification engine — popularity threshold, CM threshold, quadrant assignment
5. Menu Items tab — category pills, item table with search/filter, add/edit modal with live preview
6. CSV import with preview and validation
7. Matrix tab — summary stats strip
8. Matrix scatter plot (recharts or d3 scatter) with quadrant reference lines and item dots
9. Items by quadrant — action cards with per-item recommendations
10. Report tab — executive summary with calculated priority actions
11. Report export — print, PDF, CSV
12. Dashboard widget in Operator Command Strip
13. Consultant system prompt injection — append menu data to existing buildConsultantSystemPrompt function
14. Apply UpgradeGate wrapper with new copy
15. Navigation — add Menu Engineering as a primary section in Cost & Margin Control
16. Mobile responsiveness pass — matrix must render usably on tablet minimum; simplified list view on phone
17. Smoke test: enter 10+ items across 4 categories with varied costs and units, verify matrix places items in correct quadrants, verify action cards generate correct recommendations, verify report calculates correctly

---

## SUCCESS CRITERIA

- An operator can enter 20 menu items in under 10 minutes using the add item modal
- The matrix correctly places every item in the right quadrant based on relative popularity and contribution margin thresholds
- The live preview in the modal updates food cost %, contribution margin, and projected quadrant in real time as the operator types
- The priority actions in the Report tab reference specific item names and real dollar figures — not generic advice
- The Consultant correctly references menu engineering data when asked about food cost issues
- CSV import correctly handles at least 20 rows with mixed categories
- A free-tier user sees the UpgradeGate overlay with correct copy
- The scatter plot renders with correct axis labels, reference lines, and hover tooltips

Make all changes to the Cost & Margin Control domain and dashboard only. Do not touch any other modules, training manuals, prime cost tracker, Setup logic, Stripe integration, or tier configuration.
