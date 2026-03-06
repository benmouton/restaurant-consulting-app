export interface SopTemplateMeta {
  key: string;
  title: string;
  category: "bar" | "kitchen" | "foh" | "management";
  description: string;
  requiredVariables: string[];
}

export const SOP_TEMPLATES: SopTemplateMeta[] = [
  { key: "tabc-compliance", title: "TABC Compliance Protocol", category: "bar", description: "Alcohol service standards, ID verification, and cut-off procedure", requiredVariables: ["restaurantName", "ownerNames", "alcoholPermit", "barManager", "closingTime"] },
  { key: "bar-opening", title: "Bar Opening Procedure", category: "bar", description: "Consistent bar setup for every service period", requiredVariables: ["restaurantName", "barManager", "posSystem", "draftBeerCount", "signatureCocktail1", "signatureCocktail2", "signatureCocktail3"] },
  { key: "bar-closing", title: "Bar Closing Procedure", category: "bar", description: "Close-down sequence and cash reconciliation", requiredVariables: ["restaurantName", "closingTime", "posSystem", "safeDropProcedure"] },
  { key: "intoxicated-guest", title: "Intoxicated Guest Protocol", category: "bar", description: "Response protocol for intoxicated guests", requiredVariables: ["restaurantName", "barManager", "generalManager", "ownerNames", "emergencyContacts"] },
  { key: "health-inspection-prep", title: "Health Inspection Preparation", category: "kitchen", description: "Daily and weekly standards for inspection readiness", requiredVariables: ["restaurantName", "generalManager", "ownerNames"] },
  { key: "vendor-receiving", title: "Vendor Receiving Procedure", category: "kitchen", description: "Delivery inspection, temperature checks, and quality verification", requiredVariables: ["restaurantName", "ownerNames", "vendorList"] },
  { key: "temperature-log", title: "Temperature Log Procedure", category: "kitchen", description: "Shift-level temperature logging and out-of-range protocol", requiredVariables: ["restaurantName", "generalManager", "emergencyContacts"] },
  { key: "station-closedown", title: "Station Close-Down Procedure", category: "kitchen", description: "Station-by-station close-down checklist with manager sign-off", requiredVariables: ["restaurantName"] },
  { key: "new-hire-onboarding", title: "New Hire Onboarding Procedure", category: "foh", description: "First-day orientation, paperwork, and training program introduction", requiredVariables: ["restaurantName", "ownerNames", "conceptCuisine", "posSystem", "schedulingApp", "employeeMealPolicy", "parkingPolicy", "dressCode", "orientationDays"] },
  { key: "reservation-handling", title: "Reservation Handling Procedure", category: "foh", description: "Reservation taking, confirmation, and no-show protocol", requiredVariables: ["restaurantName", "reservationSystem", "generalManager", "privateRooms"] },
  { key: "large-party", title: "Large Party Service Procedure", category: "foh", description: "Coordinated service for parties of 8+", requiredVariables: ["restaurantName", "posSystem", "generalManager"] },
  { key: "guest-complaint-escalation", title: "Guest Complaint Escalation Procedure", category: "foh", description: "HEAR framework for complaint resolution and documentation", requiredVariables: ["restaurantName", "ownerNames"] },
  { key: "cash-handling", title: "Cash Handling Procedure", category: "management", description: "Opening bank, drawer management, and end-of-night reconciliation", requiredVariables: ["restaurantName", "posSystem", "ownerNames", "generalManager", "safeDropProcedure"] },
  { key: "safe-drop", title: "Safe Drop Procedure", category: "management", description: "Cash drop documentation and safe access protocol", requiredVariables: ["restaurantName", "ownerNames", "generalManager", "safeDropProcedure"] },
  { key: "end-of-night-manager", title: "End-of-Night Manager Checklist", category: "management", description: "Closing manager checklist covering financial, staff, and building", requiredVariables: ["restaurantName", "posSystem", "schedulingApp"] },
  { key: "employee-discipline", title: "Employee Discipline Procedure", category: "management", description: "Progressive discipline sequence and TWC documentation", requiredVariables: ["restaurantName", "ownerNames", "schedulingApp"] },
];

export const CATEGORY_LABELS: Record<string, string> = {
  bar: "Bar",
  kitchen: "Kitchen",
  foh: "Front of House",
  management: "Management",
};

export const CATEGORY_ICONS: Record<string, string> = {
  bar: "Wine",
  kitchen: "ChefHat",
  foh: "Users",
  management: "ClipboardList",
};

interface VariableMap {
  [key: string]: string | null | undefined;
}

function buildVariableMap(settings: any, user: any): VariableMap {
  return {
    restaurantName: settings?.restaurantName || user?.restaurantName || "[NOT SET — complete in Setup]",
    ownerName: settings?.ownerNames || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "[NOT SET — complete in Setup]",
    ownerNames: settings?.ownerNames || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "[NOT SET — complete in Setup]",
    gm: settings?.generalManager || "[NOT SET — complete in Setup]",
    generalManager: settings?.generalManager || "[NOT SET — complete in Setup]",
    kitchenManager: settings?.kitchenManager || "[NOT SET — complete in Setup]",
    executiveChef: settings?.executiveChef || "[NOT SET — complete in Setup]",
    barManager: settings?.barManager || "[NOT SET — complete in Setup]",
    floorManager: settings?.floorManager || "[NOT SET — complete in Setup]",
    posSystem: settings?.posSystem || "[NOT SET — complete in Setup]",
    schedulingApp: settings?.schedulingApp || "[NOT SET — complete in Setup]",
    alcoholPermit: settings?.alcoholPermit || "[NOT SET — complete in Setup]",
    closingTime: settings?.closingTime || "[NOT SET — complete in Setup]",
    draftBeerCount: settings?.draftBeerCount?.toString() || "[NOT SET — complete in Setup]",
    signatureCocktail1: settings?.signatureCocktail1 || "[NOT SET — complete in Setup]",
    signatureCocktail2: settings?.signatureCocktail2 || "[NOT SET — complete in Setup]",
    signatureCocktail3: settings?.signatureCocktail3 || "[NOT SET — complete in Setup]",
    safeDropProcedure: settings?.safeDropProcedure || "[NOT SET — complete in Setup]",
    vendorList: settings?.vendorList || "[NOT SET — complete in Setup]",
    emergencyContacts: settings?.emergencyContacts || "[NOT SET — complete in Setup]",
    reservationSystem: settings?.reservationSystem || "[NOT SET — complete in Setup]",
    privateRooms: settings?.privateRooms || "[NOT SET — complete in Setup]",
    totalCovers: settings?.totalCovers?.toString() || "[NOT SET — complete in Setup]",
    avgTurnTime: settings?.avgTurnTime?.toString() || "[NOT SET — complete in Setup]",
    openingTime: settings?.openingTime || "[NOT SET — complete in Setup]",
    laborTargetPct: settings?.laborTargetPct || "[NOT SET — complete in Setup]",
    foodCostTarget: settings?.foodCostTarget || "[NOT SET — complete in Setup]",
    primeCostTarget: settings?.primeCostTarget || "[NOT SET — complete in Setup]",
    conceptCuisine: settings?.conceptCuisine || "[NOT SET — complete in Setup]",
    cuisineConcept: settings?.conceptCuisine || "[NOT SET — complete in Setup]",
    employeeMealPolicy: settings?.employeeMealPolicy || "[NOT SET — complete in Setup]",
    parkingInfo: settings?.parkingPolicy || "[NOT SET — complete in Setup]",
    parkingPolicy: settings?.parkingPolicy || "[NOT SET — complete in Setup]",
    dressCode: settings?.uniformDiningRoom || "[NOT SET — complete in Setup]",
    uniformDiningRoom: settings?.uniformDiningRoom || "[NOT SET — complete in Setup]",
    orientationPeriod: settings?.orientationDays ? `${settings.orientationDays} days` : "[NOT SET — complete in Setup]",
    operatingHours: settings?.operatingHours || "[NOT SET — complete in Setup]",
    hrContactEmail: settings?.hrContactEmail || "[NOT SET — complete in Setup]",
  };
}

export function injectVariables(template: string, settings: any, user: any): string {
  const vars = buildVariableMap(settings, user);
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return vars[key] !== undefined && vars[key] !== null ? vars[key]! : match;
  });
}

export function checkVariableStatus(requiredVars: string[], settings: any, user: any): { set: string[]; missing: string[] } {
  const vars = buildVariableMap(settings, user);
  const set: string[] = [];
  const missing: string[] = [];
  for (const v of requiredVars) {
    if (vars[v] && !vars[v]!.includes("[NOT SET")) {
      set.push(v);
    } else {
      missing.push(v);
    }
  }
  return { set, missing };
}

function buildHeader(title: string, category: string, version: number, ownerName: string, restaurantName: string): string {
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return `${restaurantName}
STANDARD OPERATING PROCEDURE

${title.toUpperCase()}
Category: ${CATEGORY_LABELS[category] || category}
Effective Date: ${date}
Approved By: ${ownerName}
Version: ${version}

═══════════════════════════════════════════════════`;
}

function buildFooter(restaurantName: string, ownerName: string, gm: string): string {
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return `═══════════════════════════════════════════════════

This document is confidential and intended for internal use only.
${restaurantName} · Last updated: ${date}
Questions: contact ${ownerName} or ${gm}`;
}

const SOP_CONTENT: Record<string, string> = {
  "tabc-compliance": `PURPOSE
To ensure all bar staff at {{restaurantName}} serve alcohol in full compliance with Texas Alcoholic Beverage Commission regulations under permit {{alcoholPermit}}.

SCOPE
Applies to all staff authorized to serve or sell alcohol at {{restaurantName}}.

LEGAL STANDARD
Texas law requires that alcohol not be served to:
- Any person under 21 years of age
- Any person who is visibly intoxicated
- Any person for whom service would violate TABC permit conditions

ID VERIFICATION PROCEDURE
1. Card every guest who appears under 30 years of age — no exceptions
2. Acceptable IDs: Texas Driver's License, US Passport, Military ID, Texas ID Card
3. Expired IDs are not acceptable under any circumstances
4. If ID cannot be verified: do not serve. Alert {{barManager}} immediately.

INTOXICATION RECOGNITION
Signs that require service evaluation:
- Slurred or incoherent speech
- Loss of balance or coordination
- Repeated questions or visible confusion
- Escalating aggression or volume
- Glassy, unfocused, or bloodshot eyes

Any two of the above signs present = do not serve additional alcohol.

CUT-OFF PROTOCOL
1. Stop service immediately — do not announce or argue
2. Notify {{barManager}} or manager on duty before approaching the guest
3. Approach calmly: "I'm not able to serve you another drink tonight."
4. Offer water and food immediately
5. Do not allow the guest to drive — offer to call a rideshare
6. Document: guest description, time, behavior observed, action taken
7. Manager signs the refused service log before end of shift

DOCUMENTATION
All refused service incidents must be logged before the bar closes.
Log must include: date, time, guest description, reason for refusal, staff name, manager sign-off

VIOLATIONS
Any violation of this SOP — including serving a minor or visibly intoxicated guest — is grounds for immediate termination and may result in personal TABC license suspension.

Last call time: {{closingTime}} — no exceptions for regulars or high-spend guests.`,

  "bar-opening": `PURPOSE
To ensure the bar at {{restaurantName}} opens in a consistent, fully prepared state for every service period.

RESPONSIBLE PARTY
Opening bartender, supervised by {{barManager}}.

OPENING CHECKLIST — complete in order

STEP 1: PHYSICAL SETUP (60 min before open)
☐ Confirm bar area is clean from previous close
☐ Verify ice bin is empty and clean — fill with fresh ice
☐ Restock speed rail — confirm all well spirits at par
☐ Check back bar organization — all bottles faced and labeled
☐ Restock garnish station: citrus cut, cherries, olives
☐ Polish and rack all glassware — no spots, no lipstick
☐ Confirm POS terminal login: {{posSystem}}
☐ Count and confirm opening bank with manager on duty

STEP 2: PRODUCT CHECK (45 min before open)
☐ Pull draft lines — confirm all {{draftBeerCount}} taps functional, no off flavors
☐ Check wine inventory — house red, white, rosé at par
☐ Verify signature cocktail ingredients: {{signatureCocktail1}}, {{signatureCocktail2}}, {{signatureCocktail3}}
☐ Check all juices and mixers — dated and within spec
☐ Confirm cooler temps: 35–38°F

STEP 3: FINAL READINESS (15 min before open)
☐ Bar top clean and sanitized — sanitizer solution fresh
☐ Bar mats in place
☐ Menus or drink lists in position
☐ Music / ambiance confirmed with manager
☐ Communicate any 86'd items to floor manager before doors open

SIGN-OFF
Opening Bartender: _______________ Time: ________
Manager on Duty: _______________`,

  "bar-closing": `PURPOSE
To ensure the bar at {{restaurantName}} closes consistently, safely, and fully prepared for the next service.

RESPONSIBLE PARTY
Closing bartender, supervised by manager on duty.

CLOSING CHECKLIST — complete in order

BEFORE LAST CALL (30 min before {{closingTime}})
☐ Alert guests — last call announced
☐ Begin final round push — no new tabs after last call
☐ Restock ice and garnish for next shift

AFTER LAST CALL
☐ All tabs closed and reconciled in {{posSystem}}
☐ Drawer counted and drop completed per {{safeDropProcedure}}
☐ All open bottles returned to speed rail or locked storage
☐ Draft lines flushed if required by policy
☐ Bar top sanitized — full surface including edges and rail
☐ Glass washer run, emptied, left clean
☐ All glassware polished and racked
☐ Garnish containers covered, labeled, dated, refrigerated
☐ Ice bin emptied, washed, air dried — never leave ice overnight
☐ Bar mats removed, washed, hung to dry
☐ Waste log completed: pours, breakage, comps
☐ Floor swept and mopped behind bar
☐ Any incidents logged and reported to manager

SIGN-OFF
Closing Bartender: _______________ Time: ________
Manager on Duty: _______________`,

  "intoxicated-guest": `PURPOSE
To protect {{restaurantName}}, its staff, and its guests by providing a clear, consistent response to intoxicated guests that minimizes liability and ensures safety.

IDENTIFICATION
Any staff member — not just bar staff — may identify and report a guest who appears intoxicated. Report immediately to {{barManager}} or manager on duty.

RESPONSE PROTOCOL

STEP 1: STOP SERVICE
Cease alcohol service immediately. Do not wait for manager confirmation before stopping — you can always resume service if the assessment is wrong. You cannot un-serve a drink.

STEP 2: NOTIFY MANAGER
Alert {{gm}} or manager on duty before any conversation with the guest. Do not handle this alone.

STEP 3: APPROACH
Manager approaches — not bar staff. One clear, calm statement:
"I'm not able to serve you another drink tonight."
Do not explain, debate, or negotiate. State it once.

STEP 4: OFFER ALTERNATIVES
Immediately offer: water, food, non-alcoholic beverage. Do not wait to be asked. Proactive offers de-escalate.

STEP 5: TRANSPORTATION
Do not allow an intoxicated guest to drive. Offer to call a rideshare. If guest refuses and attempts to drive: call 911. Document that the offer was made and refused.

STEP 6: DOCUMENT
Before the bar closes, complete the refused service log:
- Date and time
- Guest description
- Observed behavior
- Actions taken
- Staff involved
- Manager signature

ESCALATION
If the guest becomes physically aggressive: call 911 immediately. Do not physically restrain. Clear other guests from the area. Notify {{ownerName}} same night.

Emergency contacts: {{emergencyContacts}}`,

  "health-inspection-prep": `PURPOSE
To ensure {{restaurantName}} is prepared to pass a health inspection at any time — not just when one is scheduled.

PHILOSOPHY
A health inspection should find nothing. The standard in this kitchen is not "clean enough to pass." It is "clean enough that an inspector walking in unannounced finds nothing to write."

DAILY NON-NEGOTIABLES
☐ All food labeled with prep date and use-by date
☐ FIFO enforced on every shelf — newest product behind oldest
☐ Raw proteins stored below produce and dairy — always
☐ All surfaces sanitized with approved solution at correct concentration
☐ Temperature logs completed for every shift: coolers, freezers, hot holding
☐ Handwashing log completed (if required by local health code)

TEMPERATURE STANDARDS
Cold storage: 40°F or below
Hot holding: 135°F or above
Cooked poultry: 165°F internal
Ground meat: 160°F internal
Whole cuts: 145°F + 3 min rest
Reheating: 165°F within 2 hours

INSPECTOR ARRIVAL PROTOCOL
1. Greet the inspector professionally — do not delay or stall
2. Notify {{gm}} or manager on duty immediately
3. Accompany the inspector through all areas
4. Do not argue any finding — acknowledge and correct
5. Request a copy of the inspection report before they leave
6. Correct any critical violations before reopening that area

POST-INSPECTION
All findings reviewed with {{ownerName}} within 24 hours.
Corrective actions documented and assigned with due dates.
Re-inspection scheduled if required.

WEEKLY SELF-AUDIT
Every week before service: Manager conducts a self-inspection using the health department's published checklist for {{restaurantName}}'s jurisdiction. Findings documented and corrected before service begins.`,

  "vendor-receiving": `PURPOSE
To ensure all deliveries received at {{restaurantName}} meet quality, quantity, and food safety standards before acceptance.

RESPONSIBLE PARTY
Manager on duty or designated trained receiver. Never a new hire.

BEFORE THE DELIVERY
☐ Pull the purchase order for this delivery
☐ Confirm expected delivery time with vendor if time-sensitive
☐ Clear receiving area — space to inspect product before it enters storage

RECEIVING CHECKLIST

STEP 1: COUNT
Count every item against the invoice before signing. Shortages must be noted on the delivery receipt before the driver leaves. Never sign for product you haven't counted.

STEP 2: TEMPERATURE CHECK
- All refrigerated product: 40°F or below on arrival
- Frozen product: solid, no evidence of thaw and refreeze
- Hot-held product (if applicable): 135°F or above
Reject any product outside these ranges — document the rejection.

STEP 3: QUALITY CHECK
- Produce: no visible rot, mold, or pest damage
- Proteins: correct color, no off odors, vacuum seal intact
- Dairy: within use-by date, no bloating or damage
- Dry goods: packaging intact, no evidence of moisture or pests
Reject any product that fails quality inspection.

STEP 4: PRICE CHECK
Verify invoice prices against the most recent agreed pricing. Any significant price increase requires manager approval before acceptance — do not silently absorb increases. Flag all discrepancies to {{ownerName}} within 24 hours.

STEP 5: SIGN AND STORE
Sign the delivery receipt only after steps 1–4 are complete. Note any rejections or discrepancies on the receipt. Store product immediately using FIFO: new product behind existing stock. All items labeled with received date before going into storage.

REJECTIONS
Document: vendor name, delivery date, items rejected, reason, driver name.
Contact vendor same day for credit or replacement.
Notify {{ownerName}} of any significant rejection.

Vendor list: {{vendorList}}`,

  "temperature-log": `PURPOSE
To maintain a consistent, accurate temperature log at {{restaurantName}} that satisfies health code requirements and protects against food safety incidents.

FREQUENCY
Every shift, every day. No exceptions.

EQUIPMENT TO LOG
☐ Walk-in cooler: target 35–38°F
☐ Walk-in freezer: target 0°F or below
☐ Reach-in coolers (line): target 40°F or below
☐ Hot holding units: target 135°F or above

LOG PROCEDURE
1. Use a calibrated probe thermometer — verify calibration weekly
2. Record the actual temperature reading — never estimate
3. If a unit is out of range: do not log and walk away. Follow the out-of-range protocol below immediately.
4. Sign the log with your name and time

OUT-OF-RANGE PROTOCOL
Cold unit above 40°F:
- Do not add food to the unit
- Alert {{gm}} or manager on duty immediately
- Move product to a compliant unit if above 45°F
- Contact maintenance: {{emergencyContacts}}
- Document: unit, reading, time, action taken

Hot holding below 135°F:
- Reheat to 165°F within 2 hours or discard
- Do not serve product that has been in the danger zone (40–135°F) for more than 4 hours total
- Document and notify manager

LOG STORAGE
Temperature logs are retained for a minimum of 90 days. Available for health inspector review at all times.`,

  "station-closedown": `PURPOSE
To ensure every kitchen station at {{restaurantName}} closes consistently, safely, and fully prepared for the next service.

RESPONSIBLE PARTY
Each cook owns their station close. Manager on duty signs off before any BOH staff clocks out.

ALL STATIONS — REQUIRED EVERY CLOSE
☐ All food properly labeled with prep date and use-by date
☐ FIFO confirmed — new product behind existing
☐ All open containers covered, labeled, dated, and refrigerated
☐ Surface sanitized with approved solution — full surface, edges, corners
☐ Equipment wiped down and covered or stored per spec
☐ Tools and smallwares returned to designated storage
☐ Floor swept and mopped in station zone
☐ Waste log entry completed for this station

GRILL STATION — ADDITIONAL
☐ Grill grates scraped and brushed while still hot
☐ Drip trays emptied and cleaned
☐ Grease trap checked — cleared if at 75% capacity

FRY STATION — ADDITIONAL
☐ Oil quality checked: color, odor, foam level
☐ Filter oil if required per schedule
☐ Fryer baskets cleaned and hung to dry
☐ Grease disposal log updated if oil was changed

SAUTÉ / RANGE STATION — ADDITIONAL
☐ Burners cleaned — no grease buildup on grates
☐ Oven interior wiped if used during service

PREP STATION — ADDITIONAL
☐ All cutting boards sanitized and stored upright
☐ Prep lists completed and handed to opening prep for next day
☐ Mixer, slicer, and processor cleaned and stored per manufacturer spec

LINE WALK — MANAGER SIGN-OFF
Manager on duty conducts a line walk after all stations complete close.
No BOH staff clocks out until line walk is signed off.

Manager: _______________ Time: ________ Date: ________`,

  "new-hire-onboarding": `PURPOSE
To ensure every new employee at {{restaurantName}} has a consistent, professional first day that sets clear expectations from the start.

BEFORE THE FIRST DAY — MANAGER CHECKLIST
☐ Employee paperwork prepared: I-9, W-4, direct deposit, handbook acknowledgment
☐ Uniform or dress code requirements communicated
☐ Schedule for first week confirmed and shared with employee
☐ Training manual for their role generated and printed
☐ Trainer assigned — not the newest employee on the floor

DAY 1 — ORIENTATION SEQUENCE

STEP 1: WELCOME (first 15 minutes)
- Manager or {{ownerName}} greets the new hire personally
- Restaurant history and concept overview: {{cuisineConcept}}
- Introduction to the team

STEP 2: PAPERWORK (30–45 minutes)
- Complete all required employment documents
- Review and sign employee handbook
- Confirm schedule for training period
- Explain orientation period: {{orientationPeriod}}
- Explain 90-day probationary period

STEP 3: FACILITY TOUR
- Full building walk: dining room, kitchen, bar, storage, restrooms, exits
- POS terminal location: {{posSystem}}
- Time clock / scheduling app: {{schedulingApp}}
- Break area and employee meal policy: {{employeeMealPolicy}}
- Parking: {{parkingInfo}}

STEP 4: TRAINING PROGRAM OVERVIEW
- Present their training manual
- Explain the day-by-day structure
- Introduce their trainer
- Set expectation: assessment on final training day, 90% pass required for certification

DRESS CODE
{{dressCode}}

ORIENTATION PERIOD
{{orientationPeriod}} — performance is evaluated continuously. Any conduct, attendance, or performance issue during orientation may result in immediate termination without progressive discipline.

New Hire Signature: _______________ Date: ________
Manager Signature: _______________ Date: ________`,

  "reservation-handling": `PURPOSE
To ensure all reservations at {{restaurantName}} are taken, confirmed, and managed consistently using {{reservationSystem}}.

TAKING A RESERVATION
Required information — collect in this order:
1. Guest name (first and last)
2. Party size
3. Date and time
4. Phone number
5. Any special requests: occasion, dietary restriction, accessibility need, seating preference

Confirm back to the guest before ending the call or conversation:
"We have you down for [size] at [time] on [date] under [name]."

Enter all notes in {{reservationSystem}} immediately — never hold details in memory.

CONFIRMING RESERVATIONS
Reservations of 6+ guests: confirm by phone or text 24 hours in advance. If confirmation is not reached: hold the reservation, attempt contact once more 2 hours before the reservation time.

SAME-DAY RESERVATIONS
Accept same-day reservations only if availability exists in {{reservationSystem}}. Do not verbally promise a table without confirming in the system first.

NO-SHOW PROTOCOL
Hold the table for 15 minutes past reservation time. At 15 minutes: one phone contact attempt. At 20 minutes with no contact: release the table, mark as no-show in {{reservationSystem}}. Late arrivals after release: seat as walk-in if available; waitlist with priority if not.

LARGE PARTIES (8+)
All parties of 8 or more require:
- Advance booking minimum 48 hours
- Manager confirmation before commitment
- Kitchen notification before service day

Private room bookings ({{privateRooms}}):
Always confirm with {{gm}} before committing availability.

CANCELLATIONS
Mark as canceled — do not delete. Manager reviews no-show and cancellation patterns weekly for operational planning.`,

  "large-party": `PURPOSE
To ensure large parties at {{restaurantName}} receive consistent, coordinated service that doesn't compromise the experience of surrounding guests.

DEFINITION
A large party is any group of 8 or more guests seated at the same time in the same area.

PRE-SERVICE PREPARATION — DAY OF
☐ Table configuration confirmed with floor manager
☐ Server assignment confirmed — experienced server only, with busser support
☐ Kitchen notified of party size and arrival time
☐ Any pre-arranged menu, dietary restrictions, or special requests confirmed
☐ Pre-set items (bread, water, appetizers) staged if applicable
☐ POS: party entered in {{posSystem}} with note for split check preference

SEATING
- Host confirms kitchen is ready before leading party to table
- Seat the full party before menus are distributed
- Introduce server and manager on duty at seating
- If a pre-fixe or limited menu applies: server explains before orders are taken

SERVICE FLOW
- Drink orders taken and delivered before food orders — do not rush
- Food orders taken by seat number — never by description alone
- Kitchen fired in one coordinated wave — communicate with Expo
- Food delivered by seat number — no "who had the steak?" at a large table
- Check-back at 3 minutes after full food delivery — not per plate

CHECK AND DEPARTURE
- Confirm split check preference before printing
- Present checks simultaneously when possible
- Manager table touch before the party departs

POST-PARTY
- Bussing team resets area completely before next seating
- Any service issues reported to {{gm}} within 30 minutes`,

  "guest-complaint-escalation": `PURPOSE
To ensure every guest complaint at {{restaurantName}} is handled consistently, documented, and resolved in a way that retains the guest.

PHILOSOPHY
A guest who complains is giving the restaurant a chance to fix something. A guest who says nothing and leaves unhappy is not. Chase the complaint.

FRONTLINE RESPONSE — ANY STAFF MEMBER
Any staff member who receives a complaint follows HEAR immediately:

H — Hear them out completely. Do not interrupt.
E — Empathize: "I completely understand, and I'm sorry for that."
A — Act: get the manager. Do not attempt to resolve above your authority.
R — Report: tell the manager everything before they reach the table.

MANAGER RESPONSE — AT THE TABLE
1. Arrive within 90 seconds of being notified
2. Introduce yourself: "I'm [name], the manager tonight."
3. Let the guest re-state the issue — do not pre-empt with the server's version
4. Own it: "That's not the experience we want for you."
5. Resolve: comp, replace, or credit — decide and execute on the spot
6. Close: "I hope we'll see you back. I'll make sure it's right next time."

RESOLUTION AUTHORITY
Server: offer to replace a dish or beverage
Manager: comp up to a reasonable threshold without owner approval
Above threshold: call {{ownerName}}

DOCUMENTATION
Every complaint resolved by management must be logged before end of shift:
- Date and time
- Table number and party size
- Nature of complaint
- Resolution taken
- Guest's response
- Manager name

ONLINE REVIEWS
Negative reviews responded to within 24 hours. Response tone: factual, non-defensive, solution-oriented. Never argue publicly. Acknowledge, apologize for the experience, invite back. Flag patterns to {{ownerName}}: same complaint 3+ times = operational signal.`,

  "cash-handling": `PURPOSE
To ensure all cash transactions at {{restaurantName}} are handled consistently and securely, and that all variances are documented.

OPENING BANK
- Opening bank counted by opening manager and one witness before service
- Both parties sign the opening count slip
- Bank placed in POS drawer: {{posSystem}}

DURING SERVICE
- Drawer closed after every cash transaction — never left open
- Large bills ($50, $100): verify with counterfeit pen or UV light before accepting
- Mid-service drawer pull if drawer exceeds threshold — manager only
- No staff member other than the manager accesses the safe during service

END OF NIGHT
1. Pull all cash drawers after close
2. Count each drawer separately — count twice
3. Record total on end-of-night reconciliation sheet
4. Compare to POS cash sales report from {{posSystem}}
5. Variance over $10: document before leaving, investigate before next service
6. Variance over $25: notify {{ownerName}} same night
7. Complete deposit slip
8. Drop excess cash to safe per {{safeDropProcedure}}
9. Reconciliation sheet signed by closing manager

VARIANCE POLICY
Cash variances are documented, not ignored. Consistent variance on one employee's shifts is an investigation trigger — not a training issue.

THEFT PREVENTION
- No staff member counts their own drawer unsupervised
- Void and comp reports reviewed nightly — patterns flagged immediately
- Safe combination known only to {{ownerName}} and {{gm}}
- Safe combination changed immediately upon any management departure`,

  "safe-drop": `PURPOSE
To ensure all cash drops at {{restaurantName}} follow a consistent, documented procedure that protects staff and the business.

{{safeDropProcedure}}

STANDARD SAFE DROP PROCEDURE

REQUIRED MATERIALS
- Drop envelope (pre-numbered if possible)
- Drop slip (duplicate copy — one in envelope, one retained by manager)
- Pen

PROCEDURE
1. Count the cash to be dropped — count twice
2. Record on drop slip: date, time, amount, manager name
3. Place cash and one copy of drop slip in envelope
4. Seal envelope
5. Retain duplicate drop slip — file in manager log
6. Drop envelope through safe slot — do not open the safe for drops
7. Never drop alone — a witness must be present for all significant drops

SAFE OPENING
Safe may only be opened by {{ownerName}} or {{gm}}.
Safe is opened for: bank replenishment, deposit preparation, emergency only.
Two-person rule for all safe openings above a defined threshold.

DISCREPANCIES
If a drop envelope is missing or the amount doesn't reconcile:
- Notify {{ownerName}} immediately — same night
- Do not wait until morning
- Document everything before leaving the building

DEPOSIT PREPARATION
Deposits prepared by {{ownerName}} or {{gm}} only.`,

  "end-of-night-manager": `PURPOSE
To ensure the closing manager at {{restaurantName}} completes all required steps before leaving the building.

FINANCIAL
☐ All POS tickets closed — no open tabs in {{posSystem}}
☐ Void report pulled and reviewed
☐ Comp report pulled and reviewed — all comps documented
☐ All drawers counted, variances documented
☐ Safe drop completed per safe drop SOP
☐ End-of-night sales summary saved

STAFF
☐ All staff clocked out in {{schedulingApp}}
☐ Any disciplinary issues, incidents, or complaints documented
☐ Tomorrow's opening manager notified of any carryover issues
☐ Any no-call/no-shows documented for HR record

BUILDING — FOH
☐ All tables cleared and reset for tomorrow
☐ Host stand secured, menus stored
☐ Dining room chairs aligned
☐ All lights off except security lighting

BUILDING — BAR
☐ Bar close verified per bar closing SOP
☐ Ice bin empty and drying
☐ All tabs closed, waste log complete

BUILDING — KITCHEN
☐ Line walk completed — all stations signed off
☐ Walk-in and reach-in temps logged and within range
☐ All food labeled, dated, stored per FIFO
☐ Cooking equipment secured and off

BUILDING — FINAL
☐ Restrooms checked — clean, stocked, no issues
☐ Back door secured
☐ Alarm set
☐ Front door locked

Closing Manager: _______________ Time: ________ Date: ________`,

  "employee-discipline": `PURPOSE
To ensure all disciplinary actions at {{restaurantName}} follow a consistent, documented process that complies with Texas Workforce Commission standards and protects the business.

CORE PRINCIPLE
If it wasn't written down, it didn't happen. Every disciplinary action — including verbal warnings — must be documented.

PROGRESSIVE DISCIPLINE SEQUENCE

STEP 1: VERBAL WARNING
- Issued for first offense of a non-termination-level violation
- Conversation held privately — never on the floor
- Document immediately after the conversation: date, time, violation, what was said, employee's response
- Employee signs acknowledgment of verbal warning
- Copy to employee file

STEP 2: WRITTEN WARNING
- Issued for second offense or first offense of a more serious violation
- Written warning form completed before the conversation
- Includes: specific violation, reference to prior verbal warning, expected behavior going forward, consequence if repeated
- Employee signs — if employee refuses to sign, note refusal on the form with a witness signature
- Copy to employee file, copy to employee

STEP 3: FINAL WARNING / SUSPENSION
- Issued for third offense or serious single violation
- {{ownerName}} notified before this step
- Same documentation requirements as written warning
- Suspension without pay if applicable: confirm legality with HR or employment attorney for the specific situation

STEP 4: TERMINATION
- Requires {{ownerName}} approval before proceeding
- Conversation held privately — never on the floor, never via text
- Script: "We're letting you go as of today. Here is your final check."
- Final pay issued per Texas law — same day for involuntary termination
- Collect: keys, access cards, uniforms
- Revoke POS and {{schedulingApp}} access same day
- Document the conversation before leaving the building

TERMINATION-LEVEL OFFENSES (immediate, no progressive discipline)
- Theft of any amount
- Harassment or assault of a guest or coworker
- TABC violation (serving a minor or visibly intoxicated guest)
- Falsification of time records
- Reporting to work under the influence

TWC DOCUMENTATION
All disciplinary records retained for minimum 3 years. In any TWC unemployment or wrongful termination dispute, these records are your primary defense. Incomplete documentation = presumption against the employer.

Contact for HR questions: {{ownerName}} · {{restaurantName}}`,
};

export function renderSop(sopKey: string, settings: any, user: any, version: number = 1): { title: string; category: string; content: string } | null {
  const meta = SOP_TEMPLATES.find(t => t.key === sopKey);
  if (!meta) return null;

  const rawContent = SOP_CONTENT[sopKey];
  if (!rawContent) return null;

  const vars = buildVariableMap(settings, user);
  const restaurantName = vars.restaurantName || "[Restaurant Name]";
  const ownerName = vars.ownerName || vars.ownerNames || "[Owner]";
  const gm = vars.gm || vars.generalManager || "[General Manager]";

  const header = buildHeader(meta.title, meta.category, version, ownerName, restaurantName);
  const footer = buildFooter(restaurantName, ownerName, gm);
  const body = injectVariables(rawContent, settings, user);

  return {
    title: meta.title,
    category: meta.category,
    content: `${header}\n\n${body}\n\n${footer}`,
  };
}
