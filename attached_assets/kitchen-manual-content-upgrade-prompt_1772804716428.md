# Replit Prompt — Kitchen Manual Content Upgrade

Paste this directly into Replit chat:

---

I need a **major content upgrade** to the **Kitchen Manual** training template. This is a content and structure upgrade — not a full visual redesign. Keep the established dark theme: background `#0f1117`, gold/amber accent `#b8860b` / `#d4a017`, card backgrounds `#1a1d2e`, white primary text, muted gray secondary text. Match all visual patterns already in place across the platform.

**DO NOT CHANGE:**
- The Setup → Generate → Print workflow logic
- The template variable injection system (restaurant name, owner name, management names, POS system, signature dishes, stations, etc.)
- The 7-day structure (Day 1 through Day 7)
- The Table of Contents and day navigation
- The print/export functionality
- Any existing visual components already styled correctly (day headers, gold section titles, etc.)
- Page routing or file structure
- Any other domain pages or modules

---

## CONTENT GAPS TO FILL — BY SECTION

These are the missing pieces identified by cross-referencing the current Kitchen Manual template against industry BOH training standards. Add each one in the appropriate day or section.

---

### DAY 1 — Orientation & Kitchen Safety

**Add: Temperature Reference Card**
Render as a 2-column mini reference table with gold border:

| Food State | Required Temp |
|---|---|
| Cold Storage | 40°F or below |
| Hot Holding | 135°F or above |
| Poultry (cooked) | 165°F internal |
| Ground Meat (cooked) | 160°F internal |
| Whole Cuts / Steak | 145°F + 3 min rest |
| Reheating | 165°F within 2 hours |

Label it: **"Temperature Standards — Know These Cold"**
Style: gold-bordered 2-column table, header row in dark gold, data rows alternating `#1a1d2e` / `#12141f`.

**Add: Kitchen Hierarchy Org Chart**
After the Roles & Responsibilities section, render the reporting structure as a visual org chart using indented connector lines (└──) in a dark card:

```
Executive Chef
└── Sous Chef
    └── Line Cooks (Grill, Sauté, Fry, Prep)
        └── Prep Cooks
Kitchen Manager (Operations)
└── Dishwashers / Porter
```

Use gold for Executive Chef and Kitchen Manager labels. White for all others. Muted gray for connector lines. Label it: **"Kitchen Chain of Command"**. Add a note below: *"All kitchen questions go up the chain. Skip a level only in a safety emergency."*

---

### DAY 2 — Food Safety & Storage

**Add: FIFO Visual Explainer Card**
FIFO (First In, First Out) is mentioned in the manual but not explained visually. Add a gold-accent card with:

- **Title:** FIFO — First In, First Out
- **Rule:** New product goes behind. Old product comes forward. Every time. No exceptions.
- **3-step checklist format:**
  1. Check date labels before putting anything away
  2. Move existing stock to the front
  3. Place new deliveries behind existing stock
- Add an amber warning callout: *"A line cook who doesn't follow FIFO is costing the restaurant money on every single shift."*

**Add: Cross-Contamination Prevention Protocol**
- Raw proteins never stored above produce or dairy — always below
- Dedicated cutting boards by food type: Red = raw meat, Yellow = poultry, Green = produce, White = dairy/bread
- Color-coded board reference rendered as 4 colored chips with labels
- Handwashing trigger list: after touching raw protein, after phone, after trash, after break, after touching face — render as a quick-reference checklist

---

### DAY 3 — Station Setup & Menu Knowledge

**Add: Station Setup Cards (3-column grid)**
Each station gets a card with gold station name header, setup checklist, and signature dish at Mouton's. Use Setup template variables so these populate with the operator's actual station names and signature dishes.

Default template (Mouton's):

| GRILL STATION | SAUTÉ STATION | FRY STATION |
|---|---|---|
| Signature: Big Easy Steak | Signature: Chicken Piccata | Signature: Chicken Fried Steak |

Each card includes:
- [ ] Mise en place complete
- [ ] Temperature verified
- [ ] Station tools in place
- [ ] Ticket window visible
- [ ] Communication with Expo confirmed

Render as gold-bordered dark cards in a responsive grid. Station names and signature dishes pull from Setup fields.

**Add: Mise en Place Philosophy Card**
Small gold-accent callout card:
> *"Mise en place is not prep. It is the standard you hold yourself to before the first ticket drops. If your station isn't set, you're already behind."*
No attribution. Operator voice.

---

### DAY 4 — Line Execution & Communication

**Add: Kitchen Calls Reference Card — HIGH PRIORITY**
This is the highest daily-use reference in the entire manual. Render as a gold-bordered card with bold call terms:

**Kitchen Calls — Memorize These**

| Call | Meaning | Who Uses It |
|---|---|---|
| **"Order in"** | New ticket on the line | Expo / Expeditor |
| **"Heard"** | Acknowledged, I'm on it | Every station |
| **"Behind"** | I'm passing behind you | Anyone moving |
| **"Corner"** | Coming around a blind corner | Anyone turning |
| **"Hot"** | Hot pan / plate moving | Cook carrying heat |
| **"86'd"** | Item is out, can't fire | Chef / Expo |
| **"Fire [item]"** | Start cooking this now | Chef / Expo |
| **"All day"** | Total count needed right now | Chef calling counts |

Style: gold header row, dark alternating rows, bold call terms in gold, meanings in white, role in muted gray. Add note: *"'Heard' is not optional. If you received it, you say it."*

**Add: Ticket Reading Protocol**
Step-by-step card:
1. Read the full ticket before touching anything
2. Identify your station's items
3. Confirm timing with neighboring stations
4. Call out any 86'd items immediately
5. Fire in sequence — appetizers before entrées, always

---

### DAY 5 — Speed, Quality & Timing Standards

**Add: Ticket Time Standards Card**
Reference card with gold border:

| Service Type | Target Ticket Time |
|---|---|
| Appetizers | 8–10 minutes |
| Entrées (dinner) | 18–22 minutes |
| Burgers / Sandwiches | 12–15 minutes |
| Desserts | 5–7 minutes |

Add amber note: *"These are targets, not ceilings. A slow ticket doesn't just frustrate one table — it backs up the entire line."*

**Add: Quality Check Protocol — Before Every Plate Leaves**
Render as a 5-point checklist card:
- [ ] Temperature correct (hot food hot, cold food cold)
- [ ] Portion size matches spec
- [ ] Plate presentation matches training photo or standard
- [ ] No smears, drips, or fingerprints on plate rim
- [ ] Correct garnish in correct position

Add: *"Every plate that leaves this kitchen is a vote for whether that guest comes back."*

---

### DAY 6 — Station Close & Sanitation Standards

**Add: Station Close-Down Checklist**
Render as a printable checklist card with checkboxes — one per station type (Grill, Sauté, Fry, Prep). Each checklist includes:

**All Stations:**
- [ ] All food labeled, dated, and properly stored
- [ ] FIFO confirmed on all open containers
- [ ] Surface sanitized with approved solution
- [ ] Equipment wiped down and covered
- [ ] Floor swept and mopped in station zone
- [ ] Tools returned to designated location
- [ ] Line walk completed with closing manager
- [ ] Sign-off obtained before clocking out

**Grill Station adds:**
- [ ] Grill grates scraped and brushed
- [ ] Grease trap checked and cleared if needed

**Fry Station adds:**
- [ ] Oil quality checked (color, smell, filtration if required)
- [ ] Fryer basket cleaned and hung dry

Style: dark card with gold checkboxes, station names in gold uppercase.

**Add: Sanitation Log Reminder Card**
Amber info card:
> *"Every time you sanitize a surface during service, it should be logged. This is not optional — it is health code. If an inspector walks in, that log is the first thing they ask for."*

---

### DAY 7 — Certification & Standards

**Add: Written Assessment — 10 Questions**
The current template references a 10-question written test at 90% pass rate but does not include the questions. Add them now:

**Kitchen Staff Written Assessment**
*Pass requirement: 9 out of 10 correct. Score below 9 requires additional training day before certification.*

1. What is the required internal temperature for cooked poultry?
2. What does FIFO stand for, and why does it matter?
3. You receive a delivery with no date labels on three items. What do you do?
4. A guest informs the server they have a shellfish allergy. The server tells you. Walk through every step you take before that plate leaves your station.
5. What does "86'd" mean, and what is your responsibility when you hear it?
6. Name the 5-point quality check before a plate leaves your station.
7. What is the correct response when someone calls "Behind" in the kitchen?
8. What is your station's target ticket time for entrées?
9. What are the two things you must do before clocking out at end of shift?
10. Who is your direct supervisor, and what is the first thing you do if there is a safety issue on the line?

Render as a clean assessment card with numbered questions, gold numbering, white question text. Add pass/fail criteria at top in amber.

**Add: Trainer Daily Sign-Off Sheet**
Render as a structured table with one row per training day:

| Day | Topics Covered | Trainer Initials | Trainee Initials | Date |
|---|---|---|---|---|
| Day 1 | Orientation, Safety, Hierarchy | ___ | ___ | ___ |
| Day 2 | Food Safety, Storage, FIFO | ___ | ___ | ___ |
| Day 3 | Station Setup, Menu Knowledge | ___ | ___ | ___ |
| Day 4 | Line Execution, Kitchen Calls | ___ | ___ | ___ |
| Day 5 | Speed, Quality, Timing | ___ | ___ | ___ |
| Day 6 | Close-Down, Sanitation | ___ | ___ | ___ |
| Day 7 | Assessment, Certification | ___ | ___ | ___ |

Style: gold header row, alternating dark rows, all initials/date fields rendered as underscores for print. Add **"Manager Final Sign-Off: _______________ Date: ________"** below the table in bold gold.

**Add: 90-Day Probation Callout — Amber Info Card**
> ⚠️ **90-Day Probationary Period**
> All kitchen staff operate under a 90-day probationary period beginning on the first day of employment. Certification completes your training — it does not end your probation. Performance standards, attendance, and conduct are evaluated through day 90. Continued employment is confirmed at the close of the probationary period by your direct supervisor.

Render as a prominent amber-bordered info card. This is currently buried in plain "Note:" text and is legally and operationally significant — it must be unmissable.

**Add: Upon Certification Closing Block**
After the sign-off sheet, add a closing statement card in the same operator voice used in the Server Manual:

> *You passed the test. You know the calls, the temps, the close-down checklist, and the chain of command. That's the baseline.*
>
> *From here, the standard is yours to hold. The kitchen doesn't slow down because you're new. The line doesn't forgive a missed temp or a skipped label. What you do on your worst day is what this kitchen is.*
>
> *Welcome to the line.*

Style: dark card, no border, italic text, muted gold text color. Centered. No header label — let it stand alone.

---

## RENDERING STANDARDS (apply to all new components)

- All new framework cards (FIFO, Kitchen Calls, Station Cards, Temperature Table): gold border `1px solid #b8860b`, background `#1a1d2e`, border-radius `8px`, padding `20px 24px`
- All checklist items: gold checkbox `☐` character, white label text
- All amber warning/info cards: border `1px solid #d4a017`, background `rgba(212, 160, 23, 0.08)`, amber `⚠️` icon prefix
- All assessment question numbers: gold color `#d4a017`, bold
- All org chart connector lines: muted gray `#4a4f6a`
- All reference tables: header row `background: #b8860b`, `color: #0f1117`, `font-weight: 700`; data rows alternating `#1a1d2e` / `#12141f`
- All closing/certification text blocks: italic, `color: #a89060`, no border, centered

---

## TEMPLATE VARIABLE INTEGRATION

All new content must pull from Setup where fields exist. Use the same variable injection pattern already in place:

- `{{restaurantName}}` — restaurant name
- `{{ownerName}}` — owner name
- `{{executiveChef}}` — executive chef name
- `{{kitchenManager}}` — kitchen manager name
- `{{sousChef}}` — sous chef name (if collected in Setup)
- `{{posSystem}}` — POS system name
- `{{station1Name}}`, `{{station1Dish}}` — Grill station and signature dish
- `{{station2Name}}`, `{{station2Dish}}` — Sauté station and signature dish
- `{{station3Name}}`, `{{station3Dish}}` — Fry station and signature dish
- `{{entreeTicketTime}}` — target ticket time for entrées (default: "18–22 minutes")

If any variable is not yet in Setup, add it to the Setup page using the same field style already in place.

---

## PRINT BEHAVIOR

All new checklist cards, the Sign-Off Sheet, and the Assessment must print cleanly:
- Black/white print mode: replace gold borders with `1px solid #000`, replace colored backgrounds with white, replace gold text with black
- Print CSS: `@media print` — hide navigation, sidebar, and action buttons; expand all collapsed sections; show all checklist items on single continuous page
- The Trainer Sign-Off Sheet and Assessment questions should each start on a new page in print: `page-break-before: always`

---

## IMPLEMENTATION ORDER

1. Day 1: Temperature Reference Card + Org Chart
2. Day 2: FIFO Card + Cross-Contamination Protocol
3. Day 3: Station Setup Cards + Mise en Place callout
4. Day 4: Kitchen Calls Reference Card + Ticket Reading Protocol
5. Day 5: Ticket Time Standards + Quality Check Protocol
6. Day 6: Station Close-Down Checklists + Sanitation Log Card
7. Day 7: Written Assessment (10 questions) + Trainer Sign-Off Sheet + 90-Day Probation Card + Certification Closing Block
8. Template variable integration pass (all new fields)
9. Print CSS pass
10. Mobile responsiveness check

Make all changes to the Kitchen Manual template files only. Do not touch any other module, page, or template.
