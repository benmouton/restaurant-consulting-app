# Replit Prompt — Staffing & Labor Page Major Upgrade

Paste this directly into Replit chat:

---

I need a **major upgrade** to the **Staffing & Labor** page. Keep the existing dark theme: background `#0f1117`, gold/amber accent `#b8860b` / `#d4a017`, card backgrounds `#1a1d2e`, white primary text, muted gray secondary text. Match the visual style established across the app's other upgraded sections (Ownership & Leadership, Service Standards, Training Systems).

**DO NOT CHANGE:**
- Any AI API call logic or prompt text in the Labor Demand & Cut-Decision Engine
- The Quick Presets data/options
- The Pre-Shift Planning / Mid-Shift Decision tab logic
- The "Last Week" and "Save" button functionality
- Page routing or file structure
- Any other domain pages

---

## 1. Page Header — Operator Metric Strip

Below the "Staffing & Labor" title, add a horizontal strip of 4 dark metric cards with gold left border:

- **Labor % This Week** — placeholder: `-- %` with subtext "Connect your POS"
- **Scheduled Hours** — total scheduled hours this week (placeholder: `0 hrs`)
- **Staff on Floor Now** — with a green dot pulse indicator, placeholder: `-- on floor`
- **Next Scheduled Cut** — placeholder: `No cut scheduled` in amber text

Style: compact dark cards (`#1a1d2e`), gold left border 3px, muted label text, larger white value below. Horizontal scroll on mobile.

---

## 2. Labor Demand & Cut-Decision Engine — Elevated Card Styling

- Add a subtle animated gold shimmer/glow on the card border (CSS keyframe animation, low intensity — same as other upgraded pages)
- Add a sparkle animation to the icon when hovering the "Generate Staffing Plan" button
- The gold "Generate Staffing Plan" button should have a **loading state**: spinner + "Analyzing labor demand..." text while the AI call runs
- After generation, show a brief success pulse flash on the card border before showing results

---

## 3. Quick Presets Dropdown — Enhanced UI

Upgrade the "Quick Presets..." dropdown:

- Add icons to each preset option:
  - Quiet Monday Lunch
  - Normal Weekday Dinner
  - Busy Friday Dinner
  - Busy Saturday Night
  - Sunday Brunch Rush
  - Slow Tuesday Evening

- When a preset is selected, auto-fill all form fields with preset-appropriate values:
  - **Quiet Monday Lunch**: Mon, Lunch (11am-3pm), 35 covers, $22 avg check, 30% labor target, 5 positions, $17/hr, 5hr shift
  - **Normal Weekday Dinner**: Wednesday, Dinner (5pm-10pm), 75 covers, $38 avg check, 28% labor, 8 positions, $18/hr, 6hr
  - **Busy Friday Dinner**: Friday, Dinner (5pm-10pm), 140 covers, $45 avg check, 26% labor, 13 positions, $19/hr, 6hr
  - **Busy Saturday Night**: Saturday, Dinner (5pm-10pm), 165 covers, $48 avg check, 25% labor, 15 positions, $19/hr, 7hr
  - **Sunday Brunch Rush**: Sunday, Lunch (11am-3pm), 120 covers, $32 avg check, 30% labor, 11 positions, $17/hr, 5hr
  - **Slow Tuesday Evening**: Tuesday, Dinner (5pm-10pm), 45 covers, $35 avg check, 32% labor, 6 positions, $17/hr, 6hr

- Show a toast confirmation after preset selection: "Preset loaded: [Name]" in gold, bottom-right corner, fades after 2 seconds

---

## 4. Live Labor Math Preview Panel

Add a **live calculation preview** below the form fields (above the Generate button). Updates in real-time as users type.

Display as a dark card with gold top border, labeled "Labor Math Preview":

```
Projected Revenue:    $[covers x avg_check]
Labor Budget:         $[revenue x labor_%]
Scheduled Labor Cost: $[positions x hourly_wage x hours]
Variance:             $[budget - scheduled_cost]
Cost Per Cover:       $[scheduled_cost / covers]
```

Add a status badge next to "Variance":
- Green badge "On Target" if variance >= $0
- Amber badge "Watch" if variance between -$50 and $0
- Red badge "Over Budget" if variance < -$50

This gives operators instant feedback before clicking Generate.

---

## 5. Pre-Shift / Mid-Shift Tabs — Elevated Styling

- Active tab: gold bottom border + brighter background
- Inactive tab: muted
- Add tab icons: clipboard icon for Pre-Shift, lightning bolt for Mid-Shift
- Mid-Shift tab: show an amber animated pulse badge on the tab label when any mid-shift field has been filled

---

## 6. Staff Breakdown Field — Smart Parsing

When a user types in Staff Breakdown (e.g., "4 servers, 2 bartenders, 1 host, 4 cooks, 1 expo"):

- Auto-parse and display a visual chip row below the textarea
- Each role as a dark chip with count: [4] Servers [2] Bartenders [1] Host [4] Cooks [1] Expo
- Total auto-summed and compared to Scheduled Positions — show a warning if they don't match: "Staff breakdown (12) doesn't match scheduled positions (8)"

---

## 7. AI Output — Structured Results Rendering

When the AI generates a staffing plan, render the output as structured cards instead of raw markdown:

Parse the response for these sections:
- **Staffing Recommendation** — dark card with gold header, positions as a table or badge row
- **Cut Timeline** — timeline display with timestamps and cover thresholds (e.g., "If covers < 60 by 7pm -> cut 2 positions")
- **Labor Cost Breakdown** — mini table: projected vs actual vs budget
- **Manager Actions** — checkable checklist items
- **Risk Flags** — amber warning cards if AI identifies issues

If the response doesn't parse into sections cleanly, fall back to clean markdown rendering (no raw **bold** or - bullets visible).

---

## 8. "See Example Output" — Inline Preview

The "See example output" link should expand an **inline panel** (not a new page) showing a pre-written example of a rich staffing plan output in the structured card format above. Style with dashed gold border and a "This is an example" label in muted text.

---

## 9. Principles Accordion — Visual Upgrade

- Smooth CSS transition on expand/collapse (max-height animation)
- Gold chevron rotates 180 degrees on expand
- Blockquote principle text: 3px gold left border, subtle background tint
- Multiple principles: individually expandable cards

---

## 10. Mobile Responsiveness

- Metric strip: horizontal scroll on mobile, no wrapping
- Form grid: single column on screens < 640px
- Labor Math Preview: stacked rows, no overflow
- Staff chip row: wraps naturally
- Tab labels: icon-only fallback on very small screens if needed

---

Make all changes to the Staffing & Labor page files only. Preserve all existing API logic, preset data, and tab functionality exactly as-is.
