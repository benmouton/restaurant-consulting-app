# Replit Prompt — Manager Training Manual (2-Week Template from Scratch)

Paste this directly into Replit chat:

---

Create a **brand new Manager Training Manual template** following the exact same architecture as all existing manuals in the platform (Server, Kitchen, Bartender, Host, Busser). This is a **2-week / 10-day training template** — the manager role requires working knowledge of every other position in the building, plus the financial, HR, legal, and operational responsibilities that no other role carries.

The template:
1. Shows only a **Setup prompt** until the operator has completed their Setup page
2. Once Setup is complete, shows a **"Generate Manager Manual"** button
3. On generate, injects all Setup variables and renders the full 10-day manual
4. Includes a **Print** button that exports a clean formatted document

Match the established dark theme: background `#0f1117`, gold/amber `#b8860b` / `#d4a017`, card backgrounds `#1a1d2e`, white primary text, muted gray secondary text. All components match existing manual styling exactly.

**DO NOT CHANGE** any existing manuals, Setup logic, routing, or other modules.

---

## SETUP VARIABLES TO PULL

- `{{restaurantName}}`
- `{{ownerName}}`
- `{{gm}}` — General Manager
- `{{posSystem}}`
- `{{reservationSystem}}`
- `{{schedulingApp}}` — e.g., Homebase
- `{{alcoholPermit}}`
- `{{tipStructure}}`
- `{{totalCovers}}`
- `{{avgTurnTime}}`
- `{{orientationPeriod}}` — e.g., 30 days
- `{{evaluationSchedule}}` — e.g., January and June
- `{{closedHolidays}}`
- `{{employeeMealPolicy}}`
- `{{breakPolicy}}`
- `{{laborTargetPct}}` — target labor % (add to Setup if not present; default: "30%")
- `{{foodCostTarget}}` — target food cost % (add to Setup if not present; default: "28–32%")
- `{{primeCostTarget}}` — target prime cost % (add to Setup if not present; default: "55–60%")
- `{{safeDropProcedure}}` — cash safe drop process (add to Setup if not present)
- `{{openingTime}}` / `{{closingTime}}`
- `{{vendorList}}` — primary vendors (food, beverage, linen, etc.) — add to Setup if not present
- `{{emergencyContacts}}` — fire, police, plumber, electrician, HVAC — add to Setup if not present

---

## FULL TEMPLATE CONTENT — 10 DAYS (2 WEEKS)

---

### TABLE OF CONTENTS

- Day 1 — Orientation, Leadership Philosophy & Role Scope
- Day 2 — FOH Operations: Server, Host & Busser Standards
- Day 3 — BOH Operations: Kitchen Standards & Food Safety
- Day 4 — Bar Operations: TABC, Pour Standards & Bar Management
- Day 5 — POS Mastery, Cash Handling & End-of-Night Reconciliation
- Day 6 — Labor Management, Scheduling & Prime Cost
- Day 7 — Food Cost, Inventory & Vendor Management
- Day 8 — HR, Documentation & TWC Compliance
- Day 9 — Guest Experience, Complaint Resolution & Crisis Management
- Day 10 — Opening/Closing Procedures, Assessment & Certification

---

### DAY 1 — Orientation, Leadership Philosophy & Role Scope

**Section: Welcome**
> *"Every other training manual in this building teaches someone how to do one job. This one teaches you how to be responsible for all of them.*
>
> *A manager at `{{restaurantName}}` does not just supervise. They set the standard, hold the line, and make the call when no one else can. That is not a title. It is an obligation."*

Operator voice. No attribution.

**Section: Your Team**
- Restaurant: `{{restaurantName}}`
- Owner: `{{ownerName}}`
- General Manager: `{{gm}}`

**Section: What the Manager Owns**
Gold-bordered framework card — render as a 3-column responsibility grid:

| FOH | BOH | Business |
|---|---|---|
| Server performance | Kitchen execution | Labor cost % |
| Host floor management | Food safety compliance | Food cost % |
| Busser section coverage | Station setup & close | Prime cost tracking |
| Guest complaint resolution | Temp & FIFO standards | Cash reconciliation |
| Bar service & TABC compliance | Waste & portion control | Scheduling accuracy |
| Table turn management | Ticket times | Vendor relationships |
| Team communication | Staff accountability | HR documentation |

Add: *"If it happens in this building, it is your responsibility. The owner is not here to manage the problems. You are."*

**Section: The Manager's Mindset — 5 Principles**
Render as a numbered gold-accent card:

1. **The standard is the standard.** Not the standard on a good night. The standard every night. When you accept less, you have lowered the bar permanently.
2. **Math runs the restaurant.** Your opinion about food cost doesn't matter. The percentage does. Learn it, watch it, act on it.
3. **Document everything.** The TWC does not care what you remember. Neither does a plaintiff's attorney. Write it down.
4. **Lead through presence.** A manager who disappears into the office during a dinner rush has failed before the first ticket drops.
5. **You are always being watched.** How you handle a bad night teaches your staff how to handle every bad night after you're gone.

**Section: Manager Authority & Limits**
Amber-bordered info card:

What a manager at `{{restaurantName}}` is authorized to do without owner approval:
- Comp a meal or round of drinks to resolve a legitimate guest complaint
- Send a staff member home for conduct or performance violations
- Void a POS transaction with documented reason
- Call emergency services in a safety situation
- Refuse service to an intoxicated guest

What always requires owner notification:
- Any termination
- Any injury on property
- Any police involvement
- Any comp over $[operator to define]
- Any vendor contract or pricing change

---

### DAY 2 — FOH Operations: Server, Host & Busser Standards

**Section: Overview**
> *"You cannot hold a standard you don't know. Before you manage the FOH, you must know what excellent FOH performance looks like at every position."*

**Section: Server Standards — What You're Evaluating**
Render as a reference card pulling from the Server Manual:

| Standard | What Good Looks Like | Red Flag |
|---|---|---|
| Table greeting | Within 2 minutes of seating | Guest flags you before server arrives |
| ROAR complaint recovery | Used without prompting | Server argues with or dismisses a guest |
| Allergen protocol | 5-step chain followed every time | Server says "I think it's fine" |
| Check-back timing | 2 min after food delivery | Guest has an empty glass and no contact |
| Ticket time awareness | Server communicates delays proactively | Guest asks "where's our food?" |
| Upsell behavior | Specific recommendations, not generic questions | "What do you want to drink?" |

**Section: ROAR — Manager Reinforcement**
Gold-letter framework card — the server recovery framework, now in manager context:

**R — Recover the moment.** When a server brings you a complaint, your job is to appear at the table within 90 seconds.
**O — Own it.** No explanations, no deflection. "I'm sorry, that's not the experience we want you to have here."
**A — Act.** Comp, replace, or resolve — decide on the spot and execute.
**R — Retain the guest.** Before they leave: "I hope we'll see you again. I'll make sure it's right next time."

Add: *"A manager who handles a complaint well turns a negative review into a return visit. A manager who deflects turns it into a Google post."*

**Section: Host Floor Management — What You're Watching**
Checklist card:
- [ ] Sections rotating evenly — no server is double-sat while others are empty
- [ ] Wait times quoted accurately — no complaints about longer-than-quoted waits
- [ ] No-show protocol being followed in `{{reservationSystem}}`
- [ ] Tables turning at or near `{{avgTurnTime}}` minutes
- [ ] Host communicating with servers before seating — not after
- [ ] Floor never exceeds `{{totalCovers}}` seated at one time

**Section: Busser Accountability**
- Reset time target: table cleared and reset within 3 minutes of guest departure
- If resets are backing up: pull a server to assist, or reset yourself — the floor doesn't wait
- FLOW framework: Fill, Look, Out with dirty, Wipe before set — visible and active in every section

---

### DAY 3 — BOH Operations: Kitchen Standards & Food Safety

**Section: Overview**
> *"The kitchen does not run itself. It runs because someone is holding the standard. That someone is you when the chef isn't there — and sometimes when they are."*

**Section: Food Safety Standards You Must Know**
Gold-bordered reference table:

| Standard | Requirement |
|---|---|
| Cold storage | 40°F or below |
| Hot holding | 135°F or above |
| Cooked poultry | 165°F internal |
| Ground meat | 160°F internal |
| Whole cuts / steak | 145°F + 3 min rest |
| Reheating | 165°F within 2 hours |
| FIFO | First in, first out — every shelf, every shift |
| Date labeling | All opened/prepped items labeled with prep date |
| Cross-contamination | Raw proteins below produce and dairy — always |

Add amber card:
> ⚠️ **A health code violation is a management failure, not a kitchen failure.** The manager on duty is responsible for food safety compliance during their shift. Ignorance is not a defense with a health inspector.

**Section: Kitchen Ticket Time Standards**
Reference card:

| Item Type | Target Time |
|---|---|
| Appetizers | 8–10 minutes |
| Entrées | 18–22 minutes |
| Burgers / Sandwiches | 12–15 minutes |
| Desserts | 5–7 minutes |

When tickets are running long: communicate to the floor manager and host immediately — do not let servers find out from guests.

**Section: BOH Manager Responsibilities During Service**
Checklist card:
- [ ] Pre-service: station setup complete, temps verified, mise en place confirmed
- [ ] Service: periodic line walk every 30 minutes minimum
- [ ] Ticket time monitoring: flag anything over target to the Expo or Sous Chef
- [ ] 86 communication: confirm 86'd items reach all servers immediately via POS or verbal
- [ ] Post-service: close-down checklist completed and signed off before BOH staff clock out
- [ ] Waste log reviewed

**Section: Kitchen Hierarchy — Manager's Role**
- Executive Chef: culinary decisions, recipe standards, menu
- Sous Chef: line execution, staff performance during service
- Kitchen Manager: operational oversight, ordering, equipment
- Manager on Duty: safety compliance, labor accountability, bridge between FOH and BOH

Add: *"Do not cross into the chef's culinary lane. Do hold the line on safety, labor, and conduct."*

---

### DAY 4 — Bar Operations: TABC, Pour Standards & Bar Management

**Section: TABC — Manager-Level Responsibility**
Render as a gold-bordered compliance card:

Permit Type: `{{alcoholPermit}}`

As the manager on duty, you are the final line of TABC accountability. Every staff member's violation is a management failure.

| Your Responsibility | Standard |
|---|---|
| Verify staff are carding correctly | ID every guest who appears under 30 — spot check |
| Monitor intoxication on the floor | You can cut off a guest before the bartender does |
| Document all refused service | Name, time, reason, your initials |
| Last call enforcement | No exceptions — regulars, big tippers, owner's friends |
| Incident log | Any TABC-adjacent incident logged before end of shift |

Add amber card:
> ⚠️ **A TABC violation on your shift is your violation.** License suspension, fines, and criminal exposure attach to the permit holder and the manager on duty. There is no situation where a sale justifies the risk.

**Section: Bar Cost Controls — What to Watch**
Reference card:

| Metric | What It Means | Red Flag |
|---|---|---|
| Variance report | Actual pours vs. expected pours by bottle | Consistent over-variance on one spirit = free pouring or theft |
| Comp/void rate | Comps and voids as % of bar sales | Above 3% without documented reasons = investigation |
| Waste log gaps | Missing entries for breakage or spilled product | Unlogged waste = unaccounted cost |
| Drawer variance | Cash over/short at close | Over $10 variance requires documentation |

**Section: CALM — Manager Deployment**
Gold-letter card — the bartender de-escalation framework now in manager context:

When a bartender invokes CALM and it hasn't resolved within 60 seconds, you are already walking toward the bar. Your arrival should be calm, not reactive.

Your script: *"Hi, I'm the manager. Can I help sort this out?"*

If the guest needs to be removed: *"I need to ask you to finish up for the evening. I'd be happy to call you a rideshare."* — one time, clearly, calmly. Then document.

---

### DAY 5 — POS Mastery, Cash Handling & End-of-Night Reconciliation

**Section: `{{posSystem}}` — Manager Functions**
Step-by-step card:

**Voids:**
1. Pull the ticket in `{{posSystem}}`
2. Select void with reason code
3. Enter manager PIN
4. Document: item voided, reason, time, your name
5. Retain the void record — reviewed in end-of-night report

**Comps:**
1. Determine comp amount and reason
2. Apply comp in `{{posSystem}}` with reason code
3. Manager PIN required
4. Document: table, amount, reason, resolution outcome
5. Comp report reviewed weekly — pattern of high comp rates flagged to owner

**Drawer Pulls and Safe Drops:**
`{{safeDropProcedure}}`

Standard:
1. Count drawer before service — confirm starting bank with opening manager
2. Mid-service pull if drawer exceeds threshold (operator-defined)
3. End of night: count drawer, record total, complete drop slip, deposit in safe
4. Variance over $10: document before leaving, notify owner if over $25

**Section: End-of-Night Reconciliation Checklist**
Gold-checkbox card:

- [ ] All POS tickets closed — no open tabs
- [ ] Void report pulled and reviewed
- [ ] Comp report pulled and reviewed
- [ ] All drawers counted and drops completed
- [ ] Cash drop slip completed and signed
- [ ] Sales summary pulled from `{{posSystem}}`
- [ ] Labor hours pulled from `{{schedulingApp}}`
- [ ] Labor cost % calculated for the shift (see Day 6)
- [ ] Any incidents, complaints, or notable events logged
- [ ] All staff clocked out
- [ ] Building secured per closing checklist

**Section: Theft Prevention — What to Watch**
Amber card:
> ⚠️ **The most common restaurant theft is invisible.** It doesn't look like cash from a drawer. It looks like consistent voids on one server's tickets, under-rings on high-volume items, or a bartender whose variance report is always slightly off. Watch the patterns, not just the moments.

Red flags:
- A specific employee with disproportionate void or comp rates
- Drawer variance that's always slightly short on the same person's shifts
- Bar variance on one spirit that doesn't match breakage logs
- Tickets modified after payment on a regular basis

---

### DAY 6 — Labor Management, Scheduling & Prime Cost

**Section: The Numbers You Own**
Gold-bordered framework card:

Target labor %: `{{laborTargetPct}}`
Target food cost %: `{{foodCostTarget}}`
Target prime cost %: `{{primeCostTarget}}`

> *"Prime cost is labor plus food cost as a percentage of total sales. It is the single most important number in your restaurant. If prime cost is under control, everything else is manageable. If it isn't, nothing else matters."*

**Prime Cost Formula:**
> (Total Labor Cost + Total Food Cost) ÷ Total Sales = Prime Cost %

If prime cost exceeds `{{primeCostTarget}}`: identify which component is over — labor or food — and act on that one specifically.

**Section: Labor % — Real-Time Management**
Reference card:

**Calculating shift labor %:**
> (Total hours worked × average hourly rate) ÷ projected sales for shift = labor %

**During service levers:**
- Projected sales dropping: cut a shift early — communicate with empathy, document the decision
- Sales running over: do not add staff mid-shift without calculating the cost impact first
- Overtime approaching: flag before it happens, never after

**Section: `{{schedulingApp}}` — Manager Responsibilities**
Checklist card:
- [ ] Schedule published minimum 7 days in advance
- [ ] All positions covered for each shift: server, host, busser, bar, kitchen
- [ ] No employee scheduled into overtime without owner approval
- [ ] Availability conflicts resolved before publishing — not the day of
- [ ] Shift swaps documented in `{{schedulingApp}}` — verbal swaps are not swaps
- [ ] Break policy enforced: `{{breakPolicy}}`
- [ ] Employee meal policy enforced: `{{employeeMealPolicy}}`

**Section: Cutting Staff During a Slow Service**
Script-block card — this is the conversation most new managers avoid:

*"Hey [name] — it's slowed down more than we expected tonight. I'm going to go ahead and cut you. Thank you for tonight — I'll see you [next scheduled shift]."*

Add: *"A clean, direct cut is a sign of respect. A manager who keeps extra staff on because they're uncomfortable with the conversation is spending $40–80 in unnecessary labor per hour. That's a decision, not a kindness."*

---

### DAY 7 — Food Cost, Inventory & Vendor Management

**Section: Food Cost — How It Works**
Gold-bordered framework card:

Target food cost %: `{{foodCostTarget}}`

**Food Cost Formula:**
> (Beginning Inventory + Purchases − Ending Inventory) ÷ Total Food Sales = Food Cost %

**What moves food cost:**
- Portion variance (cooks plating over spec)
- Waste (prep errors, spoilage, expired product)
- Theft (unlogged consumption, staff meals off the record)
- Menu pricing (items priced below cost threshold)
- Vendor price changes (same product, higher invoice)

**Section: Inventory — Manager's Role**
Checklist card:

Weekly inventory responsibilities:
- [ ] Count completed on the same day each week — consistency matters
- [ ] Count conducted by two people — manager + one other, never alone
- [ ] Variance from prior week identified and explained before reporting to owner
- [ ] FIFO verified during count — expired or unlabeled product pulled immediately
- [ ] Waste log reviewed and reconciled against inventory variance

Add: *"An unexplained inventory variance is not a math problem. It is a management problem. Find the source before it repeats."*

**Section: Vendor Management**
Reference card — vendor list: `{{vendorList}}`

Manager responsibilities:
- Receive every delivery personally or designate a trained staff member — never a new hire
- Check invoice against PO before signing — price changes happen without notice
- Reject product that doesn't meet spec: wrong temp, wrong count, wrong quality
- Document all rejections with vendor rep name and date
- Flag any invoice price increase to owner immediately — do not absorb it silently

Add amber card:
> ⚠️ **A signed delivery receipt is a legal agreement that the product was received as invoiced.** Never sign for a delivery you haven't checked.

**Section: Menu Engineering Basics**
Render as a 2x2 grid card — the four menu item categories:

| | High Popularity | Low Popularity |
|---|---|---|
| **High Margin** | ⭐ Stars — promote these | 🧩 Puzzles — market harder or reposition |
| **Low Margin** | 🐕 Dogs — evaluate pricing or removal | ❌ Losers — remove or reprice |

Add: *"Menu engineering is not a chef conversation. It's a math conversation. Know which items are Stars and which are Dogs before any menu discussion."*

---

### DAY 8 — HR, Documentation & TWC Compliance

**Section: Overview**
> *"A restaurant's biggest legal exposure is almost never a health code issue. It's an HR issue. A termination without documentation. A harassment complaint with no paper trail. A wage dispute with no written policy. The manager who documents correctly protects the business."*

**Section: The Documentation Rule**
Gold-bordered framework card:

> *If it wasn't written down, it didn't happen.*

Every HR action requires:
1. **Date and time** of the incident or conversation
2. **Names** of all parties involved
3. **Description** of what occurred — factual, not editorial
4. **Action taken** — verbal warning, written warning, suspension, termination
5. **Employee acknowledgment** — signature or documented refusal to sign
6. **Manager signature** and name

**Section: Progressive Discipline Sequence**
Render as a step-by-step card:

1. **Verbal Warning** — documented in writing even though it's verbal. Employee signs acknowledgment.
2. **Written Warning** — specific violation, prior warning referenced, expected behavior going forward, consequence if repeated.
3. **Final Written Warning / Suspension** — last step before termination. Owner notified at this stage.
4. **Termination** — owner approval required. Final pay per Texas law. Documentation complete before the conversation.

Add amber card:
> ⚠️ **Texas is an at-will employment state — but "at-will" does not mean undocumented.** The TWC will request your documentation in any unemployment or wrongful termination dispute. If you don't have it, the presumption goes against the employer.

**Section: Termination Protocol**
Step-by-step card:

1. Owner approval confirmed before proceeding
2. Conduct the conversation privately — never on the floor
3. Be direct and brief: *"We're letting you go as of today. Here is your final paycheck."*
4. Collect keys, access cards, uniforms immediately
5. Revoke POS and system access same day
6. Document the conversation: what was said, employee's response
7. Do not discuss the reason with other staff

**Section: Mandatory Documentation Triggers**
Gold-checkbox card — these events always require written documentation:
- [ ] Any verbal or written warning
- [ ] Any termination
- [ ] Any workplace injury — even minor
- [ ] Any guest complaint involving a specific employee
- [ ] Any TABC incident
- [ ] Any cash variance over $25
- [ ] Any harassment or hostile workplace report
- [ ] Any accommodation request

**Section: Orientation Period & Evaluation Schedule**
- Orientation period: `{{orientationPeriod}}`
- Evaluation schedule: `{{evaluationSchedule}}`
- 90-day probation applies to all new hires — see individual role manuals
- Performance reviews documented and signed by both manager and employee

---

### DAY 9 — Guest Experience, Complaint Resolution & Crisis Management

**Section: The Manager's Guest Standard**
> *"A server manages a table. A manager manages the room. Your job is to see the whole floor at once — know which tables are happy, which are waiting too long, and which are about to become a problem — before the problem happens."*

**Section: Proactive Table Touch Protocol**
Step-by-step card — the manager table touch is not optional:

1. Visit every table within 10 minutes of entrée delivery — not to check on the server, to check on the guest
2. Script: *"Good evening — I'm [name], the manager tonight. How is everything tasting?"*
3. If the answer is anything less than enthusiastic: stay, dig in, resolve it before they leave
4. If the answer is great: *"Wonderful — enjoy the rest of your evening."* Keep moving.
5. Log any complaint or concern before end of shift

**Section: HEAR — Manager Deployment**
Gold-letter card — the host complaint framework now at manager authority level:

**H — Hear them out completely.** Do not interrupt. Do not explain. Do not defend.
**E — Empathize without excusing.** *"That's not what we want for you, and I'm sorry."*
**A — Act with authority.** A manager has comp power, replacement power, and follow-up power. Use them.
**R — Resolve and retain.** End every interaction with a reason to come back.

Add: *"The guest who leaves unhappy and says nothing is more dangerous than the one who complains. The complainer gives you a chance. Chase that chance."*

**Section: Crisis Response — Quick Reference**
Render as a reference card — emergency contacts: `{{emergencyContacts}}`

| Situation | First Action | Second Action |
|---|---|---|
| Medical emergency | Call 911 immediately | Clear space, do not move the person, notify owner |
| Fire | Evacuate all guests and staff | Call 911, do not re-enter, notify owner |
| Violent guest / fight | Call 911 if physical | Remove other guests from area, document |
| Food safety complaint (illness) | Isolate the dish/batch | Pull from service, notify owner, document everything |
| Slip/fall injury | Render assistance, call 911 if needed | Document immediately, photograph the area |
| Power/equipment failure | Assess food temp safety immediately | Notify owner, contact `{{emergencyContacts}}` |

Add amber card:
> ⚠️ **In any crisis, your sequence is: people first, then product, then property, then paperwork.** In that order. Every time.

**Section: Online Reviews — Manager Response Standard**
- Negative reviews responded to within 24 hours — factual, non-defensive, solution-oriented
- Never argue publicly — acknowledge, apologize for the experience, invite them back
- Flag patterns (multiple complaints about the same server, same dish, same wait time) to owner — these are operational signals, not isolated incidents
- Positive reviews acknowledged — a brief thank-you response builds the brand

---

### DAY 10 — Opening/Closing Procedures, Assessment & Certification

**Section: Opening Manager Checklist**
Gold-checkbox card — complete before any staff arrives:

**Building & Safety:**
- [ ] Building secured and alarm deactivated
- [ ] Walk all areas: dining room, bar, kitchen, restrooms — note any issues
- [ ] Temperature logs checked: walk-in cooler, freezer, line coolers all at spec
- [ ] Any equipment issues flagged to owner or maintenance immediately

**FOH Setup:**
- [ ] Reservation sheet or `{{reservationSystem}}` pulled for the day — VIPs and special occasions noted
- [ ] Server sections assigned
- [ ] Host stand stocked
- [ ] Dining room walked — all tables set to standard

**BOH Setup:**
- [ ] Prep list confirmed with kitchen
- [ ] Delivery schedule for the day confirmed
- [ ] Line walk before service: temps, mise en place, station readiness

**Staff:**
- [ ] Lineup / pre-shift meeting conducted before doors open
- [ ] Any 86'd items communicated to all staff
- [ ] Daily specials communicated and confirmed with kitchen
- [ ] Any staff issues (no-shows, call-outs) covered or escalated

**Section: Pre-Shift Lineup — The 5-Minute Standard**
Script-block card:

Every shift starts with a lineup. Non-negotiable.

Cover in 5 minutes:
1. **86'd items** — what's off the menu tonight and why
2. **Specials** — what to recommend and what the food costs
3. **Reservations** — large parties, VIPs, special occasions, dietary flags
4. **Focus for tonight** — one specific standard to reinforce (ticket times, upselling, table touches)
5. **Questions** — 60 seconds, then everyone gets to work

Add: *"A lineup is not a meeting. It is a calibration. Five minutes before service is worth an hour of correction during it."*

**Section: Closing Manager Checklist**
Gold-checkbox card:

**Financial:**
- [ ] All POS tickets closed
- [ ] Void and comp reports pulled and reviewed
- [ ] All drawers counted, drops completed, variances documented
- [ ] Safe drop completed per `{{safeDropProcedure}}`
- [ ] Sales summary saved

**Staff:**
- [ ] All staff clocked out in `{{schedulingApp}}`
- [ ] Any incidents, complaints, or discipline documented
- [ ] Tomorrow's opening manager notified of any carryover issues

**Building:**
- [ ] All food properly stored, labeled, and dated
- [ ] Kitchen close-down verified — line walk completed
- [ ] Bar close verified — ice bin empty, tabs closed, waste log complete
- [ ] All lights off, equipment secured
- [ ] Doors locked, alarm set

---

### CERTIFICATION

**Section: Written Assessment — 15 Questions**
*Pass requirement: 13 out of 15. Score below 13 requires additional training days before certification.*

1. What are the three numbers that define financial health at `{{restaurantName}}`? State the targets for each.
2. Walk through the prime cost formula. If food cost is running at 34% and labor at 29%, what is prime cost and what do you do?
3. A server's void rate is 3x the floor average over the past two weeks. Walk through your response.
4. A guest at Table 7 tells you their steak was overcooked and their server was dismissive. Walk through the full HEAR protocol.
5. It's 7:45pm on a Saturday. Ticket times are running 32 minutes on entrées. What are your next three actions in order?
6. A line cook calls out 45 minutes before service. Walk through your decision process.
7. You discover during a mid-shift count that a drawer is $47 short. What do you do?
8. A server tells you a guest mentioned a shellfish allergy after being seated. Walk through every step you take.
9. What is the TABC documentation requirement when you refuse service to a guest?
10. An employee tells you they witnessed a coworker harassing another staff member. Walk through your response and documentation.
11. You need to terminate an employee for repeated no-call/no-shows. Walk through the full protocol from owner approval to final paycheck.
12. What four things do you cover in a pre-shift lineup and why does it happen before service, not during?
13. A health inspector arrives during dinner service. What are your first three actions?
14. Your food cost variance this week is 4 points over target. Name three places you look first.
15. Walk through the full end-of-night reconciliation checklist.

Render with gold question numbers, amber pass criteria at top.

**Section: Practical Evaluation**
Manager-led checklist — completed by owner or GM:

- [ ] Conducted a pre-shift lineup with staff — covered all 5 required elements
- [ ] Performed a full table touch sequence during a live service
- [ ] Calculated shift labor % using actual hours and sales
- [ ] Completed an end-of-night POS reconciliation — voids, comps, drawer count
- [ ] Walked through a simulated termination conversation
- [ ] Demonstrated opening and closing checklist execution

**Practical Evaluation Result:** ☐ Pass ☐ Additional Days Required

**Section: Trainer/Owner Daily Sign-Off Sheet**

| Day | Topics Covered | Trainer Initials | Manager Trainee Initials | Date |
|---|---|---|---|---|
| Day 1 | Orientation, Leadership Philosophy, Role Scope | ___ | ___ | ___ |
| Day 2 | FOH Operations: Server, Host, Busser | ___ | ___ | ___ |
| Day 3 | BOH Operations: Kitchen, Food Safety | ___ | ___ | ___ |
| Day 4 | Bar Operations: TABC, Pour Standards | ___ | ___ | ___ |
| Day 5 | POS Mastery, Cash Handling, Reconciliation | ___ | ___ | ___ |
| Day 6 | Labor Management, Scheduling, Prime Cost | ___ | ___ | ___ |
| Day 7 | Food Cost, Inventory, Vendor Management | ___ | ___ | ___ |
| Day 8 | HR, Documentation, TWC Compliance | ___ | ___ | ___ |
| Day 9 | Guest Experience, Complaint Resolution, Crisis | ___ | ___ | ___ |
| Day 10 | Opening/Closing Procedures, Assessment | ___ | ___ | ___ |

**Owner Final Sign-Off: _______________ Date: ________**

**Section: 90-Day Probation Card**
Amber-bordered info card:
> ⚠️ **90-Day Probationary Period**
> All management staff operate under a 90-day probationary period beginning on the first day of employment. Certification completes your training — it does not end your probation. Financial performance, staff accountability, documentation compliance, and operational standards are evaluated through day 90. Continued employment in a management role is confirmed at the close of the probationary period by the owner.

**Section: Upon Certification — Closing Block**
Dark card, italic, muted gold, centered, no header:

> *You have spent two weeks learning every station in this building. You know how the server handles a complaint, how the kitchen calls a ticket, how the bartender cuts someone off, and how the host holds a room together.*
>
> *Now you are responsible for all of it.*
>
> *The standard at `{{restaurantName}}` does not change because the night is hard, the kitchen is short, or the floor is in the weeds. It holds because you hold it.*
>
> *That is the job. Own it completely.*

---

## RENDERING STANDARDS

Match all existing manuals exactly:
- Framework cards: `border: 1px solid #b8860b`, `background: #1a1d2e`, `border-radius: 8px`, `padding: 20px 24px`
- Amber warning cards: `border: 1px solid #d4a017`, `background: rgba(212, 160, 23, 0.08)`
- Reference tables: header `background: #b8860b`, `color: #0f1117`, `font-weight: 700`; alternating rows `#1a1d2e` / `#12141f`
- Checklist items: gold `☐`, white label
- Script block cards: `background: #12141f`, left gold border `3px solid #b8860b`, italic script in muted gray
- Closing block: italic, `color: #a89060`, centered, no border
- Assessment numbers: `color: #d4a017`, bold
- Named frameworks (ROAR, CALM, HEAR, FLOW): gold letter badges — pull exact card treatment from respective manuals

---

## PRINT BEHAVIOR

- `@media print`: hide nav, sidebar, buttons; expand all sections
- Trainer Sign-Off Sheet: `page-break-before: always`
- Written Assessment: `page-break-before: always`
- Practical Evaluation: continues on same page as Assessment
- Each day section: `page-break-before: always` for clean day-by-day printing
- Black/white print: gold borders → `1px solid #000`, backgrounds → white

---

## NAVIGATION & MODULE PLACEMENT

Add **Manager Training Manual** to the Training Templates section as the final, most prominent card — visually distinct from the role-based manuals. Use a 📋 or key icon. Card displays:
- Title: **Manager Training Manual**
- Subtitle: *"2-Week Certification Program"*
- Status: "Setup Required" until Setup complete → "Ready to Generate"
- Same Generate and Print button behavior as existing manuals

New Setup fields to add if not present: Labor Target %, Food Cost Target %, Prime Cost Target %, Safe Drop Procedure, Vendor List, Emergency Contacts.

Do not change any existing manual cards, routing, or Setup logic.
