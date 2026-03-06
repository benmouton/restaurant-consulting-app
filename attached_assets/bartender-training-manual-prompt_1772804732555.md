# Replit Prompt — Bartender Training Manual (New Template from Scratch)

Paste this directly into Replit chat:

---

Create a **brand new Bartender Training Manual template** following the exact same architecture as the Server Manual and Kitchen Manual already in the platform. This is a full 7-day training template that:

1. Shows only a **Setup prompt** until the operator has completed their Setup page
2. Once Setup is complete, shows a **"Generate Bartender Manual"** button
3. On generate, injects all Setup variables into the template and renders the full 7-day manual
4. Includes a **Print** button that exports a clean, formatted document

Match the established dark theme exactly: background `#0f1117`, gold/amber accent `#b8860b` / `#d4a017`, card backgrounds `#1a1d2e`, white primary text, muted gray secondary text. All visual components must match the Server and Kitchen Manual styling already in place — day headers, gold section titles, framework cards, checklist items, reference tables, amber warning cards, and the certification closing block.

**DO NOT CHANGE:**
- Any existing manual templates (Server, Kitchen, or others)
- The Setup page or its variable system
- Any other domain pages or modules
- Page routing patterns already established

---

## SETUP VARIABLES TO PULL (same as Server/Kitchen Manuals)

- `{{restaurantName}}`
- `{{ownerName}}`
- `{{barManager}}` — Bar Manager or GM name (add to Setup if not present)
- `{{headBartender}}` — Head Bartender name (add to Setup if not present)
- `{{posSystem}}` — POS system (e.g., Toast)
- `{{tipStructure}}` — Tip pool vs. individual (add to Setup if not present)
- `{{dressCode}}` — Bartender dress code (pull from existing Dining Room Dress Code field)
- `{{alcoholPermit}}` — License type: TABC Mixed Beverage Permit, Beer & Wine only, etc. (add to Setup)
- `{{signatureCocktail1}}`, `{{signatureCocktail2}}`, `{{signatureCocktail3}}` — Top 3 signature cocktails (add to Setup)
- `{{draftBeerCount}}` — Number of draft beers on tap (add to Setup if not present)
- `{{closingTime}}` — Bar closing time
- `{{breakPolicy}}` — Break duration/frequency

---

## FULL TEMPLATE CONTENT — 7 DAYS

---

### TABLE OF CONTENTS

Render as a gold-accented TOC card matching Server/Kitchen Manual style:

- Day 1 — Orientation, Bar Layout & TABC Compliance
- Day 2 — Spirits, Beer & Wine Knowledge
- Day 3 — Cocktail Fundamentals & Signature Drinks
- Day 4 — POS, Cash Handling & Speed Bar Operations
- Day 5 — Guest Experience, Upselling & Conflict De-escalation
- Day 6 — Bar Close, Inventory & Sanitation Standards
- Day 7 — Assessment, Certification & Standards

---

### DAY 1 — Orientation, Bar Layout & TABC Compliance

**Section: Welcome**
> *"The bar is the highest-margin, highest-risk station in this building. What happens here directly affects revenue, liability, and the reputation of this restaurant on every single shift. You are being trained to run it right."*

Operator voice. No attribution.

**Section: Your Team**
- Restaurant: `{{restaurantName}}`
- Owner: `{{ownerName}}`
- Bar Manager / GM: `{{barManager}}`
- Head Bartender: `{{headBartender}}`

**Section: Bar Layout Orientation Checklist**
Render as a checklist card with gold checkboxes:
- [ ] Well stations identified and stocked
- [ ] Speed rail contents memorized
- [ ] Back bar organization understood
- [ ] Refrigeration units: location and contents
- [ ] Garnish station setup and location
- [ ] Glass locations by type (rocks, highball, martini, wine, pint, shot)
- [ ] Ice bin location and backup ice supply
- [ ] POS terminal location and login
- [ ] Tip jar or tip-out container location
- [ ] Manager on duty introduction complete

**Section: TABC Compliance — Non-Negotiable Standards**
Render as a gold-bordered framework card:

**TABC: What Every Bartender at `{{restaurantName}}` Must Know**

Permit Type: `{{alcoholPermit}}`

| Rule | Standard |
|---|---|
| Legal drinking age | 21+ in Texas — ID every guest who appears under 30 |
| Acceptable IDs | TX Driver's License, US Passport, Military ID, TX ID Card |
| Intoxication standard | You are liable. When in doubt, stop service. |
| Last call timing | Per closing protocol — no exceptions for regulars |
| Minors at the bar | Seated service only with food order and parent/guardian present |
| Refused service log | Document name, time, reason — tell manager immediately |

Add amber card:
> ⚠️ **Your TABC License Is Your Livelihood**
> Serving a minor or an intoxicated guest does not just cost the restaurant — it can cost you your personal license, your job, and result in criminal charges. There is no situation where a sale is worth that risk.

**Section: Dress Code & Conduct**
- Dress standard: `{{dressCode}}`
- Phone policy: phones off the bar surface during service
- Tipping structure: `{{tipStructure}}`

---

### DAY 2 — Spirits, Beer & Wine Knowledge

**Section: The Back Bar — Know What You're Pouring**

Render as 3 category cards in a grid:

**SPIRITS**
Each category with well (speed rail) selection and call/premium options. Template uses generic placeholders — operator fills via Setup or Replit:
- Well Vodka / Call Vodka / Premium Vodka
- Well Gin / Call Gin
- Well Rum / Call Rum
- Well Tequila / Call Tequila / Premium Tequila
- Well Whiskey / Bourbon options / Scotch options
- Brandy / Cognac if applicable
- Liqueurs and modifiers (triple sec, amaretto, etc.)

Add note: *"Know your well vs. call vs. premium distinction cold. A guest who asks for 'a margarita' gets well tequila. A guest who asks for Patron gets charged accordingly. Every time."*

**BEER**
- Draft lines: `{{draftBeerCount}}` taps — list pulls from Setup
- Bottle/can selection — operator-defined
- Proper pour: 16oz pint with 1-inch head, glass at 45° angle, straight pour finish

Add reference card: **Draft Pour Standard**
- [ ] Glass clean and chilled
- [ ] 45° angle on first half
- [ ] Straight up for second half
- [ ] 1-inch head — no more, no less
- [ ] Wipe tap handle after each pour

**WINE**
- House red / house white / house rosé — operator-defined
- By-the-glass pours: 5oz standard, 6oz generous, never above 6oz
- Bottle service: present label, open at table, taste pour for host
- Storage: reds at room temp, whites chilled, opened bottles sealed and dated

**Section: Responsible Alcohol Knowledge**
Render as a reference card:

| Factor | Effect on Intoxication |
|---|---|
| Body weight | Lower weight = faster intoxication |
| Food consumption | Food slows alcohol absorption |
| Drink speed | Faster consumption = faster impairment |
| Drink type | High ABV spirits hit faster than beer/wine |
| Medications | Unpredictable — err on side of caution |

Add: *"You cannot know every guest's situation. You can know what to watch for."*

**Intoxication Warning Signs:**
- Slurred speech
- Loss of balance or coordination
- Repeated questions or confusion
- Becoming louder, aggressive, or overly friendly
- Glassy or unfocused eyes

---

### DAY 3 — Cocktail Fundamentals & Signature Drinks

**Section: Bar Technique Fundamentals**
Render as a technique reference card:

| Technique | When to Use | Method |
|---|---|---|
| **Shake** | Citrus, cream, egg white, juice | 10–12 seconds hard shake with ice |
| **Stir** | Spirit-forward, no citrus | 30 seconds gentle stir, no dilution |
| **Build** | Simple highballs, beer drinks | Pour over ice in serving glass |
| **Muddle** | Fresh herbs, fruit | Press firmly, don't shred |
| **Layer** | Shots, specialty cocktails | Pour over back of spoon |
| **Strain** | After shake/stir | Hawthorne strainer for shaken; julep for stirred |

**Section: Standard Pour Guide**
Render as a gold-bordered reference card — this is a cost control document:

| Spirit Type | Standard Pour | Cost Implication |
|---|---|---|
| Well spirits | 1.5 oz | Every 0.5 oz over = measurable pour cost variance |
| Call / Premium spirits | 1.5 oz | Same standard — no free pours for regulars |
| Wine by the glass | 5 oz | 6 oz max — train to 5 |
| Beer draft | 16 oz pint | 1-inch head standard |
| Shots | 1.5 oz | Jigger every time |

Add amber warning card:
> ⚠️ **Free Pouring Is Not a Skill. It's a Liability.**
> A bartender who free pours may feel fast and experienced. They are also pouring 0.25–0.5 oz over on every drink, every shift. At 80 drinks a night, that's 20–40 oz of lost product — potentially $40–80 in unrecorded pour cost per shift. Jigger every pour, every time.

**Section: Signature Cocktails — `{{restaurantName}}`**
Render as 3 recipe cards in a grid, one per signature cocktail:

**`{{signatureCocktail1}}`**
- Glassware: [operator-defined]
- Ice: [operator-defined]
- Build method: [operator-defined]
- Garnish: [operator-defined]
- Price: [operator-defined]

**`{{signatureCocktail2}}`**
*(same structure)*

**`{{signatureCocktail3}}`**
*(same structure)*

Add note below cards: *"These are the drinks guests will ask about before they open the menu. Know them by name, ingredients, and story."*

**Section: Classic Cocktail Quick Reference**
Render as a reference table — every bartender must know these:

| Cocktail | Base | Key Ingredients | Glass |
|---|---|---|---|
| Old Fashioned | Bourbon/Rye | Sugar, bitters, orange peel | Rocks |
| Manhattan | Rye/Bourbon | Sweet vermouth, bitters | Coupe/martini |
| Negroni | Gin | Campari, sweet vermouth | Rocks |
| Margarita | Tequila | Triple sec, lime juice | Rocks/salted |
| Daiquiri | Rum | Lime juice, simple syrup | Coupe |
| Whiskey Sour | Bourbon | Lemon juice, simple syrup | Rocks |
| Mojito | Rum | Mint, lime, soda | Highball |
| Moscow Mule | Vodka | Ginger beer, lime | Copper mug |
| Aperol Spritz | Aperol | Prosecco, soda | Wine glass |
| Espresso Martini | Vodka | Espresso, coffee liqueur | Martini |

---

### DAY 4 — POS, Cash Handling & Speed Bar Operations

**Section: POS Operations — `{{posSystem}}`**
Render as a step-by-step card:

**Opening a Bar Tab:**
1. Swipe or enter card at `{{posSystem}}` terminal
2. Open tab under guest name or seat number
3. Add drinks as ordered — never from memory
4. Confirm tab total with guest before closing
5. Close tab — prompt for tip on screen

**Splitting Checks:**
- Split by seat: use seat assignment on ticket
- Split evenly: divide total before tip prompt
- Partial split: run one card, adjust remaining balance
- Cash + card: ring cash payment first, run card for remainder

**Voids and Comps:**
- Void: manager approval required before closing ticket
- Comp: manager PIN required — never comp without authorization
- Document reason for every void and comp

Add note: *"Every unaccounted void is a red flag in your end-of-night report. Own your numbers."*

**Section: Cash Handling Standards**
- Count your bank before service — confirm with manager
- Never leave drawer open between transactions
- Large bills: verify with counterfeit pen or UV light
- At close: count drawer, record total, drop excess to safe
- Discrepancies over $5: report to manager before leaving

**Section: Speed Bar Operations**
Render as a technique card:

**Working a Rush — The Priority Stack:**
1. Acknowledge every guest within 30 seconds of sitting down — eye contact and "I'll be right with you" if you're buried
2. Run tickets in order — no skipping, no favoritism
3. Build drinks in batches: all rocks drinks together, all shaken drinks together
4. Keep your well stocked — restock ice, garnish, and well spirits before service, not during
5. Never let a ticket sit over 4 minutes without a status update to the guest

Add callout: *"Speed is not about moving fast. It's about moving in the right order."*

---

### DAY 5 — Guest Experience, Upselling & Conflict De-escalation

**Section: The Bartender Guest Sequence**
Render as a numbered flow card:

1. **Greet** — within 30 seconds, eye contact, genuine (not scripted)
2. **Read** — are they in a hurry? Want to chat? On a date? Alone? Adjust accordingly
3. **Recommend** — lead with a signature cocktail or current feature before asking "what do you want?"
4. **Build** — make the drink with intention, not just speed
5. **Check back** — 2 minutes after first drink delivery: "How is that?" is a reorder opportunity
6. **Anticipate** — watch glass levels; offer the next round before they have to ask
7. **Close** — thank them by name if you got it; invite them back specifically

**Section: Upsell Language — Beverage**
Render as a script-block style card:

Instead of: *"What can I get you?"*
Say: *"Can I start you with one of our `{{signatureCocktail1}}`s tonight?"*

Instead of: *"Do you want well or call?"*
Say: *"We've got [Premium Brand] — want to go with that?"*

Instead of: *"Another beer?"*
Say: *"Ready for another [specific beer they ordered]?"*

Add note: *"Specificity closes. Generic questions get generic answers. Know what they ordered, use it."*

**Section: TABC Cut-Off Protocol — The Right Way**
This is the highest-stakes moment in bartending. Render as a step-by-step card:

1. **Do not argue** — never debate whether someone is intoxicated
2. **Be direct, not apologetic:** *"I'm not able to serve you another drink tonight."* Period.
3. **Offer water and food** — immediately, without being asked
4. **Notify the manager** — do not handle alone
5. **Do not let them drive** — offer to call a rideshare; document the offer
6. **Log it:** time, description, what was said, manager notified

Add amber card:
> ⚠️ **You Are the Last Line of Defense**
> The law does not care if the guest seemed fine two drinks ago. It cares what happened when they left. Document every cut-off. Notify your manager every time. No exceptions for regulars, big tippers, or "they're fine."

**Section: Conflict De-escalation — 4-Step CALM Method**
Render as a gold-letter framework card:

**C — Control your tone.** Lower your voice when theirs rises. Never match aggression.
**A — Acknowledge the frustration.** "I understand you're frustrated" costs nothing and de-escalates immediately.
**L — Limit the options.** Give them two choices, both acceptable to you. No open-ended negotiation.
**M — Move the manager in.** If CALM doesn't work in 60 seconds, step back and get the manager.

Add: *"Your job is to de-escalate, not to win. The guest doesn't need to feel wrong — they need to feel heard."*

---

### DAY 6 — Bar Close, Inventory & Sanitation Standards

**Section: Bar Close Checklist**
Render as a printable checklist card with gold checkboxes. Two columns: Before Last Call / After Close.

**Before Last Call:**
- [ ] Alert guests 30 minutes before close
- [ ] Begin final round push — no new tabs after last call
- [ ] Restock garnish station and replenish ice for next shift

**After Last Call:**
- [ ] All tabs closed and reconciled
- [ ] Drawer counted and drop completed
- [ ] All open bottles returned to speed rail or locked storage
- [ ] Draft lines flushed (if required by policy)
- [ ] Bar top sanitized with approved solution
- [ ] Glass washer run and emptied
- [ ] All glassware polished and racked
- [ ] Garnish containers covered and dated
- [ ] Ice bin emptied, washed, and left to dry
- [ ] Bar mats removed, washed, and hung
- [ ] Floor swept and mopped behind bar
- [ ] Waste log completed (pours, breakage, comp)
- [ ] Manager sign-off before clocking out

**Section: Inventory Awareness**
Render as a card:

*"You don't need to do the full inventory count — that's a manager function. But you are responsible for knowing your par levels and flagging low stock before service, not during it."*

**Pre-service inventory check:**
- [ ] Well spirits at par
- [ ] Signature cocktail ingredients stocked
- [ ] Garnishes prepped and sufficient
- [ ] Ice at full capacity
- [ ] Glassware count sufficient for projected cover count
- [ ] Draft lines functional and tapped

**Section: Sanitation Standards — Bar Specific**
Render as a reference card:

| Surface/Item | Cleaning Frequency | Standard |
|---|---|---|
| Bar top | Every 30 min during service | Sanitizer solution, clean cloth |
| Speed rail | End of night | Remove bottles, wipe down, replace |
| Bar mats | End of night | Remove, wash, hang dry |
| Ice bin | End of night | Empty, wash, air dry — never leave ice overnight |
| Glass washer | Every 2 hours + end of night | Brush, run empty cycle, check sanitizer level |
| Garnish containers | End of night | Cover, date, refrigerate |
| Blender/shaker tins | After each use | Hot water rinse minimum; full wash at close |

Add amber note:
> ⚠️ **The ice bin is the most commonly failed item in bar health inspections.** Old ice = bacterial growth. Empty it every night. No exceptions.

---

### DAY 7 — Assessment, Certification & Standards

**Section: Written Assessment — 10 Questions**
*Pass requirement: 9 out of 10 correct. Score below 9 requires an additional training day before certification.*

1. What is the legal drinking age in Texas, and what IDs are acceptable at `{{restaurantName}}`?
2. A guest orders a margarita and doesn't specify tequila. What do you pour and why?
3. What is the standard pour for well spirits, and why does free pouring create a cost problem?
4. A guest is showing signs of intoxication — slurred speech, repeating questions. Walk through every step you take from that moment forward.
5. What is the difference between a shake and a stir, and when do you use each?
6. Name the 3 signature cocktails at `{{restaurantName}}` and their base spirits.
7. A guest wants to split a check four ways between two cards and cash. Walk through the steps in `{{posSystem}}`.
8. What do you do when you need to void a drink after the ticket has been opened?
9. Name 5 items on the bar close checklist and why the ice bin matters specifically.
10. A guest becomes aggressive after you've cut them off. Walk through the CALM method.

Render as gold-numbered questions, white text, amber pass criteria at top.

**Section: Practical Evaluation**
Render as a manager-led checklist card:

*To be completed by Bar Manager or Head Bartender on Day 7.*

- [ ] Poured a well cocktail to spec using a jigger — correct pour, correct glass
- [ ] Built one signature cocktail from memory — correct ingredients and method
- [ ] Demonstrated proper draft pour — 45° angle, correct head
- [ ] Opened a tab, ran a modification, and closed it in `{{posSystem}}`
- [ ] Verbally walked through the TABC cut-off protocol
- [ ] Completed bar close checklist in correct sequence

**Practical Evaluation Result:** ☐ Pass ☐ Additional Day Required

**Section: Trainer Daily Sign-Off Sheet**
Render as a table — same format as Server and Kitchen manuals:

| Day | Topics Covered | Trainer Initials | Trainee Initials | Date |
|---|---|---|---|---|
| Day 1 | Orientation, Bar Layout, TABC | ___ | ___ | ___ |
| Day 2 | Spirits, Beer & Wine Knowledge | ___ | ___ | ___ |
| Day 3 | Cocktail Fundamentals, Signature Drinks | ___ | ___ | ___ |
| Day 4 | POS, Cash Handling, Speed Bar | ___ | ___ | ___ |
| Day 5 | Guest Experience, Upselling, De-escalation | ___ | ___ | ___ |
| Day 6 | Bar Close, Inventory, Sanitation | ___ | ___ | ___ |
| Day 7 | Assessment, Certification | ___ | ___ | ___ |

**Manager Final Sign-Off: _______________ Date: ________**

**Section: 90-Day Probation Card**
Amber-bordered info card — identical treatment to Server and Kitchen manuals:
> ⚠️ **90-Day Probationary Period**
> All bar staff operate under a 90-day probationary period beginning on the first day of employment. Certification completes your training — it does not end your probation. Performance standards, attendance, conduct, and pour accuracy are evaluated through day 90. Continued employment is confirmed at the close of the probationary period by your direct supervisor.

**Section: Upon Certification — Closing Block**
Dark card, italic text, muted gold color, centered, no header:

> *You passed the test and you know the drinks. That's the minimum.*
>
> *The bar is the first thing a guest sees when they walk in and the last thing they remember when they leave. Every pour, every interaction, every close-out says something about this restaurant.*
>
> *You're not just a bartender here. You're the standard.*
>
> *Hold it.*

---

## RENDERING STANDARDS

Match exactly to Server and Kitchen Manual components:
- Framework cards: `border: 1px solid #b8860b`, `background: #1a1d2e`, `border-radius: 8px`, `padding: 20px 24px`
- Amber warning cards: `border: 1px solid #d4a017`, `background: rgba(212, 160, 23, 0.08)`
- Reference tables: header row `background: #b8860b`, `color: #0f1117`, `font-weight: 700`; alternating rows `#1a1d2e` / `#12141f`
- Checklist items: gold `☐` checkbox, white label text
- Script block cards (upsell language): `background: #12141f`, left gold border `3px solid #b8860b`, italic example text in muted gray
- Closing certification block: italic, `color: #a89060`, centered, no border
- Assessment question numbers: `color: #d4a017`, bold
- Practical evaluation checkboxes: ☐ Pass ☐ Additional Day Required — rendered in gold

---

## PRINT BEHAVIOR

Match Server and Kitchen Manual print standards:
- `@media print`: hide nav, sidebar, action buttons; expand all sections; continuous page layout
- Trainer Sign-Off Sheet: `page-break-before: always`
- Written Assessment: `page-break-before: always`
- Practical Evaluation: continues on same page as Assessment
- Black/white print: replace gold borders with `1px solid #000`, gold text to black, backgrounds to white

---

## NAVIGATION & MODULE PLACEMENT

Add **Bartender Manual** to the Training Templates section in the same position as Server Manual and Kitchen Manual. Use a 🍸 icon or bar-appropriate icon consistent with the icon style used for other manuals. The card should display:
- Title: **Bartender Training Manual**
- Status: "Setup Required" until Setup is complete, then "Ready to Generate"
- Same Generate and Print button behavior as existing manuals

Do not change any existing manual cards, routing, or Setup logic.
