# Replit Prompt — Service Standards Page Upgrade

Paste this directly into Replit:

---

I need you to upgrade the **Service Standards** page (`client/src/pages/service-standards.tsx` or similar) with significant UI and UX improvements. Do NOT change any backend logic, AI API calls, or data schemas — only the frontend presentation and layout.

Keep the existing dark theme: background `#0f1117` or equivalent, gold/amber accent color `#b8860b`, card backgrounds slightly lighter than the page background, white text. Match the style already established across the app.

---

## 1. Page Header — Add an Operator Metric Strip

Below the page title and subtitle, add a horizontal strip of 3 quick-reference metrics styled as small dark cards with a gold left border:

- **Comp Budget Remaining This Week** — show as `$___` (pull from user data if available, otherwise placeholder "Set comp budget →")
- **Active Service Standards** — show count of configured standards/frameworks (e.g., "4 of 6 configured")
- **Recovery Protocols** — show count of issue types covered (currently 8 issue types in the dropdown)

Style: same compact metric card pattern used elsewhere in the app — small label in muted text above, bold white value below, subtle gold-left-border card, `gap-4 grid grid-cols-3`.

---

## 2. Guest Recovery Decision Advisor — Visual Upgrade

The form card already exists and works — do NOT touch the API call or field logic. Make these visual improvements:

**Card header:**
- Add a thin gold top border to the card (like `border-t-2 border-amber-600`)
- Keep the ✦ icon and "Guest Recovery Decision Advisor" title
- Add a subtle tag/badge: `"Real-time guidance"` in a small rounded pill, gold text on dark background, positioned top-right of the card header

**Form layout:**
- The 2-column field grid is good — keep it
- Make the dropdown selects taller (`py-3` instead of `py-2`) with a visible gold focus ring on focus
- Add a subtle icon to each dropdown label: 🚨 for Issue Type, 👤 for Who is Responding?
- The "Time Delay" and "Check Value" inputs: add inline helper text below each — `"How many minutes past the expected time?"` and `"Total check value helps calibrate comp recommendation"` — in `text-xs text-gray-500`
- "Additional Context" textarea: increase min-height to `120px`

**Button:**
- Keep the gold "Get Recovery Advice" button full-width
- Add a small arrow `→` after the text
- On hover, increase brightness slightly (`hover:brightness-110`)

**"See example output" link:**
- Make this more visible — style it as a small card preview that expands on click rather than a plain text link
- Or if that's too complex: style the link with a small `↓` icon and underline on hover

---

## 3. Content Library Accordion — Major Visual Upgrade

The four accordion sections (Principle, Framework, Checklist, Script) currently look minimal. Upgrade each:

**Section header pills:**
- Principle → gold/amber pill `#b8860b` background
- Framework → indigo/blue pill
- Checklist → green pill
- Script → purple pill
- Already appears to be done — if so, keep it exactly as-is

**Expand/collapse interaction:**
- Add a smooth `transition-all duration-200` to the expand/collapse so content slides open rather than snapping
- The chevron (^ or v) should rotate 180° on open — use `transform transition-transform`

**Section content cards:**
- When a section is expanded, show the content in a well-padded card with a left gold border (like a blockquote)
- For **Checklists**: render each checkbox item with an actual styled checkbox (`□` → styled `<input type="checkbox">` with gold accent) so operators can check them off visually during a shift
- For **Scripts**: render numbered steps as a clear `1. → 2. → 3.` visual flow, not plain text
- For **Frameworks**: if there are role-specific sub-sections (SERVER / BARTENDER / HOST), break them into labeled sub-cards with the role name as a small badge

**Add item count to each section header:**
- Show `(1)` counts as before — but also show a small preview snippet in the collapsed state
- The preview text is already there — make sure it truncates with `truncate` and `max-w-prose`

---

## 4. Add a "Quick Reference" Sticky Tab

Add a floating or sticky side element — or a secondary tab above the accordions — called **"Quick Reference"** that shows:

- The top 3 recovery protocols as a condensed cheat-sheet (e.g., "Late Food: Free dessert or comp drink, Server authority up to $20")
- A "Non-Negotiable Timing" summary pulled from the checklist content
- Style as a dark card with gold accent, compact — this is the thing a manager would glance at mid-shift

If a floating element is too complex, implement this as a new tab/toggle above the accordion sections — toggle between "Full Standards" and "Quick Reference" views.

---

## 5. Empty State — If No Content Configured

If any accordion section has no content (Principle, Framework, Checklist, or Script):
- Show a ghost/empty card with dashed border inside the expanded section
- Add a button: `"+ Add [Section Type]"` in gold text
- Small helper text: `"Add your standards here. They'll appear on the Quick Reference view."`

---

## 6. Mobile Responsiveness

- The 2-column form grid should collapse to 1 column on screens < 640px
- The metric strip should scroll horizontally on mobile, not wrap
- The accordion sections should have adequate tap targets (min 44px height) on mobile

---

## DO NOT CHANGE:
- Any API call logic or prompt text for the Guest Recovery Advisor
- The dropdown options (issue types, responder roles) — these are correct
- The page routing or file structure
- Any other domain pages
- The overall dark theme color palette
