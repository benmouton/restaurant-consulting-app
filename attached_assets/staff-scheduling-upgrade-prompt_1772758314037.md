# Replit Prompt — Staff Scheduling Major Upgrade

Paste this directly into Replit chat:

---

I need a **major upgrade** to the **Staff Scheduling** page. Keep the established dark theme: background `#0f1117`, gold/amber accent `#b8860b` / `#d4a017`, card backgrounds `#1a1d2e`, white primary text, muted gray secondary text. Match the visual style used across all other upgraded sections (Kitchen Operations, HR & Documentation, Staffing & Labor, Training Systems, Cost & Margin Control, Reviews & Reputation, SOPs & Scalability, Crisis Management, Facilities & Asset Protection, Social Media).

**DO NOT CHANGE:**
- Any existing AI API call logic or Claude API integration
- The 4-tab structure: Schedule / Staff / Positions / Announcements
- The week navigation (prev/next arrows, date range display)
- The "Add Shift" and "Check Labor Impact" button functionality and logic
- The Principles and Frameworks accordion content (if present)
- Page routing or file structure
- Any other domain pages

---

## 1. Page Header — Week-at-a-Glance Labor Strip

Below the "Staff Scheduling" title, add a horizontal strip of 5 dark metric cards with gold left border:

- **Total Shifts This Week** — count of all shifts across the current week. Default: "0 shifts"
- **Scheduled Hours** — sum of all shift hours for the week. Default: "0 hrs"
- **Est. Labor Cost** — sum of (hours × hourly rate) for the week where rates are known. Default: "$0.00"
- **% of Coverage** — percentage of days with at least one shift scheduled (0/7 = 0%). Default: "0%"
- **Staff Scheduled** — count of unique staff members appearing in shifts this week. Default: "0 staff"

Style: compact dark cards (`#1a1d2e`), gold left border 3px, muted label above, bold white value below. Horizontal scroll on mobile.

---

## 2. Schedule Tab — Visual Calendar Upgrade

### Day Column Cards
- Upgrade each day column card (Sun–Sat) to use background `#1a1d2e`, 1px border `#2a2d3e`
- Today's column: gold border `#d4a017` + subtle amber background wash `rgba(212, 160, 23, 0.05)`
- Past days: slightly desaturated, opacity 0.65 on day number

### Shift Chips (when shifts exist)
When a shift is added to a day, render it as a styled chip inside that day's column:
- Background: `#2a2d3e`
- Left accent bar: position color (use a color per position — map up to 8 positions to distinct accent colors: gold, teal, rose, violet, sky, lime, orange, pink)
- Shows: staff name (bold, white, small), time range (muted gray, xs), position badge (colored dot + position name, xs)
- On hover: lift shadow + border brightens to gold
- Tap/click: opens shift detail modal (see section 5)

### Empty State Upgrade
Replace the current "No shifts scheduled this week" empty state with:
- Centered icon (calendar with a plus)
- Headline: "No shifts scheduled this week"
- Subtext: "Set up your positions and staff first, then add shifts to build your schedule."
- Two buttons: "Set Up Positions" (outlined, white border) and "+ Add First Shift" (gold fill)
- Add a subtle dashed border around the empty state zone

### Add Shift Modal Upgrade
When "Add Shift" is clicked, open a styled modal:
- Background: `#1a1d2e`, border `#2a2d3e`, border-radius 16px
- Header: "Add Shift" with gold left accent bar
- Fields:
  - **Date** — date picker (pre-filled if user clicked a specific day column)
  - **Staff Member** — dropdown populated from the Staff tab list
  - **Position** — dropdown populated from the Positions tab list
  - **Shift Start** — time picker
  - **Shift End** — time picker
  - **Hourly Rate (optional)** — number input, placeholder "$0.00", used for labor cost calculation
  - **Notes (optional)** — single-line text input
- Below time pickers: auto-calculate and display "X hrs" in muted gold text
- Footer: Cancel (outlined) + Save Shift (gold fill)
- Saving a shift: adds it to that day's column as a shift chip, updates the Labor Strip metrics

---

## 3. Check Labor Impact — AI-Powered Panel

Upgrade the "Check Labor Impact" button to open a slide-in panel (right side, 380px wide on desktop, full-width bottom sheet on mobile):

Panel header: "Labor Impact Analysis" with a gold ✦ icon

**Input fields at top of panel:**
- Weekly Revenue Target — number input, placeholder "$0"
- Ideal Labor % — number input with % suffix, placeholder "28"

**Analysis output card (rendered after clicking "Analyze"):**
- Calls Claude API with: current week's shifts data (staff names, hours, positions, rates), revenue target, and ideal labor %
- System prompt: "You are a restaurant labor cost advisor. Given this week's schedule data and targets, provide a structured labor analysis. Return JSON only with these fields: laborCostTotal (number), laborPercentProjected (number), overUnderTarget (string, e.g. '+2.3% over target'), topRiskDay (string, e.g. 'Saturday — 6 shifts, $420 est. cost'), coverageGaps (array of strings), recommendations (array of strings, max 3)"
- Render the response as a styled output card:
  - Row 1: Est. Labor Cost | Projected Labor % | vs. Target (green if under, red if over)
  - Row 2: Highest Cost Day — show the topRiskDay value
  - Coverage Gaps section — bulleted list with amber warning icon
  - Recommendations section — 3 items with gold numbered badges

**Loading state:** shimmer skeleton (3 rows) while API call in progress
**Error state:** "Analysis unavailable. Please check your connection." in muted text with retry button

---

## 4. Staff Tab Upgrade

### Staff Card Redesign
When staff members are added, render each as a horizontal card (`#1a1d2e`, 1px border `#2a2d3e`, border-radius 12px, padding 16px):
- Left: circular avatar with initials (background derived from name hash → one of 8 accent colors)
- Center: Name (bold white), Position (muted gray, small), Hourly Rate (gold, small) if set
- Right: "Shifts This Week" count badge (dark pill, gold text), Edit button (ghost icon button)
- On hover: card lifts, border brightens slightly

### Add Staff Modal Upgrade
Style the Add Staff modal to match the Add Shift modal visual treatment:
- Fields: Full Name, Primary Position (dropdown from Positions), Hourly Rate (optional), Phone (optional), Notes (optional)
- Footer: Cancel + Save Staff Member (gold fill)

### Staff Empty State
Replace plain text with:
- Centered icon (person with plus)
- Headline: "No staff members yet"
- Subtext: "Add your team to start building your schedule."
- "+ Add Staff Member" gold button

---

## 5. Positions Tab Upgrade

### Position Card Redesign
When positions are added, render each as a horizontal card:
- Left: colored position dot (gold, teal, rose, violet, etc. — same color map as shift chips) + Position Name (bold white)
- Center: Staff count with this position (e.g., "3 staff assigned") in muted gray
- Right: Edit (ghost icon) + Delete (ghost red icon) buttons
- On hover: card lift + border brightens

### Add Position Modal Upgrade
- Fields: Position Name, Color (pick one of 8 color swatches — rendered as clickable dot swatches), Description (optional), Min. Hourly Rate (optional), Max. Hourly Rate (optional)
- Footer: Cancel + Save Position (gold fill)

### Positions Empty State
Replace plain text with:
- Icon + Headline: "No positions yet"
- Subtext: "Add roles like Server, Bartender, Line Cook before building your schedule."
- "+ Add Position" gold button

---

## 6. Announcements Tab Upgrade

### Announcement Card Redesign
When announcements exist, render each as a card:
- Gold left accent bar (3px)
- Top row: Bell icon + Title (bold white) + Date posted (muted, right-aligned)
- Body: message text (muted gray, clamp to 3 lines with "Read more" expand)
- Bottom row: Audience badge (e.g., "All Staff" or specific position name) + "Sent" or "Scheduled" status pill
- On hover: card lift

### New Announcement Modal Upgrade
- Fields: Title, Message (textarea, min 100px), Audience (All Staff / Specific Position dropdown), Delivery (Send Now / Schedule — show date/time picker if Schedule selected)
- Character count on Message field
- Footer: Cancel + Send Announcement (gold fill) or Schedule (outlined)

### Announcements Empty State
Replace plain text with:
- Icon + Headline: "No announcements yet"
- Subtext: "Use announcements to communicate schedule changes, policy updates, or team messages."
- "+ New Announcement" gold button

---

## 7. Shift Detail Modal

When a shift chip on the calendar is tapped/clicked, open a detail modal:
- Header: Staff name + position badge + date
- Body rows: Time range | Hours | Est. Cost (if rate set) | Notes
- Footer: Close + Edit Shift (gold) + Delete Shift (red outlined)

---

## 8. AI Schedule Assistant Button

Add a secondary button next to "Check Labor Impact" labeled "✦ Build Schedule" (outlined gold):
- Opens a modal with a single AI-powered prompt field
- Pre-filled placeholder: "e.g. I need 2 servers and 1 bartender Fri–Sun, 4pm–10pm, under $800 labor"
- On submit, calls Claude API:
  - System prompt: "You are a restaurant scheduling assistant. Given the operator's natural language scheduling request and their available staff and positions, generate a structured weekly schedule. Return JSON only: { shifts: [ { day: string, staffName: string, position: string, startTime: string, endTime: string, estimatedHours: number } ], totalEstimatedHours: number, notes: string } "
  - Include available staff names and positions in the message
- Renders the AI-suggested schedule as a preview list of shift chips grouped by day
- Each suggested shift has an "Add to Schedule" button (gold, small)
- "Add All Shifts" button at the bottom (gold fill, full width)

---

## 9. Cross-Tab Integration

1. **Schedule → Staff**: "Add Shift" Staff dropdown is populated from the Staff tab list; if list is empty, shows "Add staff first →" link that switches to Staff tab
2. **Schedule → Positions**: "Add Shift" Position dropdown is populated from the Positions tab; if empty, shows "Add positions first →" link
3. **Staff → Positions**: "Add Staff" Primary Position dropdown is populated from the Positions tab
4. **Labor Strip**: updates in real time as shifts are added/removed
5. **"Build Schedule" modal**: reads from both Staff and Positions tab data to personalize the AI prompt

---

## 10. Animations & Polish

- Day column cards: stagger-in on page load (20ms delay per column, slide-up 12px + fade)
- Metric strip cards: stagger-in on mount (30ms delay each)
- Shift chips: pop-in animation on add (scale 0.8 → 1.0 + fade, 150ms ease-out)
- Modals: slide-up from bottom on mobile, fade+scale on desktop
- Gold buttons: subtle shimmer sweep on hover (same as other upgraded sections)
- Labor Impact panel: slide in from right on desktop, slide up from bottom on mobile
- All empty state buttons: gold pulse ring on first render (once only, 2s animation)

---

## 11. Implementation Order

1. Page header Labor Strip (5 metric cards)
2. Schedule tab: day column card restyle + today highlight
3. Add Shift modal: full field set + auto-hours calculation
4. Shift chips: colored position chips inside day columns + tap to open detail modal
5. Check Labor Impact: upgrade to AI slide-in panel with Claude API integration
6. Build Schedule AI button + modal
7. Staff tab: card redesign + Add Staff modal upgrade + empty state
8. Positions tab: card redesign + color swatches + Add Position modal upgrade + empty state
9. Announcements tab: card redesign + New Announcement modal upgrade + empty state
10. Cross-tab integration (dropdowns populated from other tabs)
11. Shift Detail modal
12. Stagger animations + shimmer on gold buttons + modal transitions
13. Mobile responsiveness pass

Make all changes to the Staff Scheduling page files only. Preserve all existing week navigation logic, shift storage, and button functionality exactly as-is.
