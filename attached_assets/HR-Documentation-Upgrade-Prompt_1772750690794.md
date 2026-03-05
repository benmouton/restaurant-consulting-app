# Replit Prompt — HR & Documentation Page Major Upgrade

Paste this directly into Replit chat:

---

I need a **major upgrade** to the **HR & Documentation** page. Keep the existing dark theme: background `#0f1117`, gold/amber accent `#b8860b` / `#d4a017`, card backgrounds `#1a1d2e`, white primary text, muted gray secondary text. Match the visual style established across the app's other upgraded sections (Ownership & Leadership, Service Standards, Training Systems, Staffing & Labor).

**DO NOT CHANGE:**
- Any AI API call logic or existing prompt text in the HR Documentation Engine
- The issue type options, prior discipline history options, or policy awareness options
- The HR Document Records database logic, save/delete/view functionality
- Page routing or file structure
- Any other domain pages

---

## 1. Page Header — Add an HR Status Strip

Below the "HR & Documentation" title and subtitle, add a horizontal strip of 3 dark metric cards with a gold left border:

- **Total HR Records** — count of all stored discipline documents (pull from existing records data)
- **Pending Signatures** — count of records with status "Pending" / not yet signed (amber text if > 0, white if 0)
- **This Month** — count of documents generated this calendar month

Style: compact dark cards (`#1a1d2e`), 3px gold left border, muted label text, larger white value below. Horizontal scroll on mobile.

---

## 2. HR Documentation & Compliance Engine — Elevated Card Styling

- Add a subtle animated gold shimmer/glow on the card border (CSS keyframe animation, low intensity — just enough to feel premium and alive, matching the same shimmer used on the Skills Certification Engine card)
- The card header (✦ HR Documentation & Compliance Engine) should use the same gold icon treatment as other AI engine sections across the app
- Subtitle copy stays: *"Generate Workforce Commission-compliant documentation. If it goes to a hearing, will this document stand?"*
- Add a 3px gold left border accent on the subtitle line

---

## 3. Form Field Upgrades — Visual Polish

**Issue Type dropdown:**
- Add a small colored severity dot to each option label:
  - 🟡 Yellow dot: Attendance / Tardiness, No-Call / No-Show
  - 🟠 Orange dot: Performance Failure, Conduct / Policy Violation, Guest-Related Incident
  - 🔴 Red dot: Safety / Compliance Issue, Insubordination, Cash Handling Violation
- Dark background matching card, amber border on focus

**Prior Discipline History — rename label to "Discipline Step":**
- Keep existing options unchanged (1st Instance – Verbal/Written Warning, 2nd Instance – 3 Shift Suspension, 3rd Instance – 5 Shift Suspension/Termination)
- Below the dropdown, add a **3-step progressive discipline indicator**: three horizontal dots connected by a line, each labeled (1st / 2nd / 3rd). The currently selected step highlights in gold. Visual only, not interactive.
- Style as a compact strip directly below the dropdown, 12px text, muted colors with the active step glowing gold

**Employee Name / Position / Incident Date — 3-column row:**
- Inputs with dark background
- Amber bottom-border only on focus (`border-b-2 border-amber-500`) — not a full border ring
- Subtle placeholder text in muted gray

**Policy Awareness dropdown:**
- Add a third option: `"Unclear — policy exists but communication not documented"`
- Keep the two existing options

**What Happened textarea:**
- Increase min height to 120px
- Amber border glow on focus (`ring-1 ring-amber-500/40`)
- Add character count in bottom-right corner (muted gray text, e.g., "142 characters")
- Keep existing helper text: *"No legal wording needed — just describe the facts"*
- Add a second helper line in smaller muted text: *"Emotional language will be removed. Objective documentation will be generated."*

**Generate HR Documentation button:**
- Keep the existing gold/amber gradient style and the ✦ spark icon
- Add a subtle shimmer animation on hover (matching the same hover treatment on AI action buttons across the app)
- Show pulsing/spinner state while generating (replace button text with "Generating..." + spinner)

---

## 4. Generated Document Output — Structured Display

After generation, display the document in an elevated output card:

**Document card styling:**
- Slightly lighter background than the form card (`#1e2035` or similar)
- 1px amber divider lines between each document section
- Bold ALL-CAPS section headers (preserve the existing formatting from current output)
- Centered "EMPLOYEE DISCIPLINE NOTICE" document header with a faint horizontal rule

**Acknowledgment section checkboxes:**
- Style as custom dark square boxes with amber checkmark on check — not plain browser default checkboxes
- Three items: "I have read and understand this document." / "I understand the corrective action required of me." / "I understand that further violations will result in additional discipline up to and including termination."

**Action bar below the document — 4 buttons in a row:**
1. **Copy** (clipboard icon) — copies plain text to clipboard, shows brief "Copied ✓" confirmation
2. **Download PDF** (document icon) — generates a print-ready PDF with white background, professional font, proper 1-inch margins, signature lines with adequate physical writing space, restaurant name header placeholder, footer with document ID + generated date
3. **Share** (share icon) — Capacitor Share plugin for iOS native share sheet
4. **Save to HR Records** (amber/gold, primary) — saves to database with status "Pending Signature"

---

## 5. HR Document Records — Full Section Upgrade

**Search & Filter bar upgrade:**
- Keep the existing full-width dark search input
- Add 4 filter chips in a horizontal row below the search bar (scrollable on mobile):
  - **All** | **Pending Signature** | **Signed** | **This Month**
  - Active chip: amber background, white text. Inactive: dark border, muted text.
- Keep the Sort dropdown (Date / Employee Name / Severity)

**Record card severity badge — color coded:**
- **Verbal Warning** → yellow badge (`bg-yellow-900/40 text-yellow-400 border border-yellow-600/30`)
- **3 Shift Suspension** → amber badge (keep existing style)
- **5 Shift Suspension** → orange badge (`bg-orange-900/40 text-orange-400 border border-orange-600/30`)
- **Termination** → red badge (`bg-red-900/40 text-red-400 border border-red-600/30`)

**Record card signature status:**
- Signed → keep existing green badge
- Pending Signature → amber badge with a small pulsing amber dot

**Signed copy upload:**
- Keep the existing "Signed copy uploaded" green indicator
- Add a new button: **"Upload Signed Copy"** with camera icon — triggers Capacitor Camera plugin (camera or photo library) on iOS, file picker on web
- When a signed copy is uploaded, auto-update record status from "Pending Signature" to "Signed"

**Record card action buttons (4 icon buttons, right side):**
1. **History** (clock icon) — opens Employee Discipline Trail modal
2. **View** (eye icon) — view full document
3. **Copy** (document icon) — copy document text or regenerate
4. **Delete** (trash icon) — confirmation dialog: *"Delete this HR record? This cannot be undone."* with Cancel and Delete (red) buttons

**Employee Discipline Trail modal:**
- Triggered by the history clock icon on any record card
- Slide-up modal
- Vertical timeline of all discipline records for that employee, sorted by date
- Each timeline entry: date / issue type / discipline level badge / document status
- Vertical amber line connecting entries, gold dot at each entry point
- At the bottom, an amber callout card showing the "Next Step":
  - *"If [Employee Name] receives another notice, the next step is: [next discipline level]"*
  - Derive from the employee's current highest level (Verbal → 3 Shift Suspension → 5 Shift Suspension → Termination)

---

## 6. Principles Section (if present on this page)

- Smooth CSS max-height transition on expand/collapse
- Gold chevron rotates 180° on expand
- Principle blockquote: 3px gold left border, subtle dark tint background
- Each principle individually expandable

---

## 7. Mobile / Capacitor Considerations

- HR Status Strip: horizontal scroll on mobile, no wrapping
- Form grid: single column on screens < 640px
- Filter chips: horizontal scroll on mobile
- "Upload Signed Copy": Capacitor Camera plugin (already in project) for iOS
- "Download PDF" + "Share": Capacitor Share plugin for iOS native share sheet
- Incident Date field: trigger native date picker
- After document generation: auto-scroll to the document output section

---

## Design Tokens — Match Exactly (no new colors)

```
Page background:   #0f1117
Card background:   #1a1d2e
Gold accent:       #b8860b / #d4a017
Gold border:       rgba(184, 134, 11, 0.3)
Gold glow:         rgba(212, 160, 23, 0.15)
Text primary:      #ffffff
Text secondary:    #9ca3af
Text muted:        #6b7280
Border subtle:     rgba(255, 255, 255, 0.08)
Success green:     #22c55e
Warning amber:     #f59e0b
Danger red:        #ef4444
```

---

## Implementation Order

1. Page header HR Status Strip
2. Form field polish — severity dots, progressive discipline indicator, textarea character count
3. Card border shimmer animation (match Skills Certification Engine treatment)
4. Document output rendering — section dividers, styled checkboxes, action bar
5. PDF generation with print-white styling and proper signature spacing
6. HR Records filter chips, color-coded severity badges, pending pulse indicator
7. Signed copy upload — Capacitor Camera integration
8. Employee Discipline Trail slide-up modal with timeline
9. Mobile responsiveness pass

Make all changes to the HR & Documentation page files only. Preserve all existing API logic, database calls, and document generation functionality exactly as-is.
