# Replit Prompt — Setup Page Financial Onboarding Upgrade + AI Consultant Context Injection

Paste this directly into Replit chat:

---

This is a **two-part upgrade** that is the highest-priority improvement to the platform:

**Part 1:** Expand the Setup page with a new "Financial Profile" section that collects the operational numbers that define this restaurant's financial health.

**Part 2:** Inject every Setup variable — including all new financial fields — into the AI Consultant's system prompt so that every Consultant conversation is personalized to this specific operator's restaurant, numbers, and targets.

These two changes transform the AI Consultant from a general-purpose restaurant chatbot into a tool that knows this restaurant specifically and can give advice that is directly relevant to this operator's actual situation.

**DO NOT CHANGE:**
- Any existing Setup fields already in place
- Any training manual templates or their generation logic
- Any other domain pages or modules
- Page routing or file structure
- The AI Consultant's UI, chat interface, or conversation logic — only the system prompt changes

---

## PART 1: SETUP PAGE — NEW FINANCIAL PROFILE SECTION

### Placement
Add a new section to the Setup page titled **"Financial Profile"** with a subtitle: *"These numbers power your AI Consultant. The more accurate they are, the more specific the advice."*

Position it immediately after the existing restaurant info fields and before the operational fields (dress code, scheduling app, etc.).

Match the exact visual style of all existing Setup sections: dark card background `#1a1d2e`, gold section title, clean field labels in white, input fields with dark background and gold focus border.

---

### NEW FIELDS — FINANCIAL PROFILE SECTION

Render each field with:
- Label in white
- Sublabel in muted gray explaining why it matters
- Input with dark background `#12141f`, border `1px solid #2a2d3e`, gold focus state `border-color: #b8860b`
- Placeholder text as a realistic example value

---

**Weekly Revenue (Average)**
- Label: "Average Weekly Revenue"
- Sublabel: "Your typical total sales in a 7-day period. Use a 4-week rolling average if revenue varies seasonally."
- Input type: currency ($)
- Placeholder: e.g. $18,500
- Variable: `{{weeklyRevenue}}`

**Average Guest Check**
- Label: "Average Guest Check (per person)"
- Sublabel: "Total revenue divided by total covers for a typical week. Includes food and beverage."
- Input type: currency ($)
- Placeholder: e.g. $28
- Variable: `{{avgCheck}}`

**Weekly Cover Count**
- Label: "Average Weekly Covers"
- Sublabel: "Total number of guests served in a typical week across all dayparts and days."
- Input type: number
- Placeholder: e.g. 650
- Variable: `{{weeklyCovers}}`

**Food Cost Target (%)**
- Label: "Target Food Cost %"
- Sublabel: "Your goal for food cost as a percentage of food sales. Industry standard for full-service: 28–32%."
- Input type: number (%)
- Placeholder: e.g. 30
- Default value: 30
- Variable: `{{foodCostTarget}}`

**Actual Food Cost (Current)**
- Label: "Current Actual Food Cost %"
- Sublabel: "Your food cost percentage from your most recent full week or accounting period."
- Input type: number (%)
- Placeholder: e.g. 33
- Variable: `{{foodCostActual}}`
- Inline indicator: if `{{foodCostActual}}` > `{{foodCostTarget}}`, show amber badge "⚠️ Over target"; if equal or under, show green badge "✓ On target"

**Labor Cost Target (%)**
- Label: "Target Labor Cost %"
- Sublabel: "Your goal for total labor (FOH + BOH + management) as a percentage of total sales. Full-service target: 28–35%."
- Input type: number (%)
- Placeholder: e.g. 30
- Default value: 30
- Variable: `{{laborCostTarget}}`

**Actual Labor Cost (Current)**
- Label: "Current Actual Labor Cost %"
- Sublabel: "Your labor cost percentage from your most recent full week or accounting period."
- Input type: number (%)
- Placeholder: e.g. 32
- Variable: `{{laborCostActual}}`
- Inline indicator: same amber/green logic as food cost

**Prime Cost Target (%)**
- Label: "Target Prime Cost %"
- Sublabel: "Food cost + labor cost combined as a percentage of total sales. The single most important number in your restaurant. Target: 55–62% for full-service."
- Input type: auto-calculated display (not editable)
- Display: `{{foodCostTarget}} + {{laborCostTarget}} = {{primeCostTarget}}%` — updates live as the two fields above are filled
- If operator wants to override: small "Edit" link that unlocks the field
- Variable: `{{primeCostTarget}}`

**Actual Prime Cost (Current)**
- Label: "Current Actual Prime Cost %"
- Display: auto-calculated from `{{foodCostActual}} + {{laborCostActual}}` — not editable
- Inline indicator: amber if over target, green if at or under
- Variable: `{{primeCostActual}}`

**Seat Count / Dining Room Capacity**
- Already exists as `{{totalCovers}}` — pull existing value, no duplicate field needed

**Operating Days Per Week**
- Label: "Days Open Per Week"
- Sublabel: "How many days per week the restaurant operates."
- Input type: number (1–7)
- Placeholder: e.g. 6
- Variable: `{{operatingDays}}`

**Service Type**
- Label: "Service Model"
- Sublabel: "Your primary service format — affects labor benchmarks and ticket time standards."
- Input type: select dropdown
- Options: Full Service (sit-down, server-attended) / Fast Casual (counter order, table delivery) / Bar-Forward (bar revenue > 40% of sales) / Fine Dining / Café / Other
- Variable: `{{serviceModel}}`

**Cuisine / Concept Type**
- Label: "Cuisine & Concept"
- Sublabel: "A brief description of your restaurant's food identity. Used by the Consultant to give relevant menu and food cost advice."
- Input type: text (short)
- Placeholder: e.g. "Southern Cajun bistro and bar, full liquor, dinner service"
- Variable: `{{cuisineConcept}}`

**Top Operational Challenge**
- Label: "Biggest Operational Challenge Right Now"
- Sublabel: "Be specific. The Consultant uses this as a starting point for every conversation."
- Input type: textarea (3 rows)
- Placeholder: e.g. "Food cost is running 4 points over target. I think it's portion control on the line but I'm not sure."
- Variable: `{{topChallenge}}`

**Current Staff Count**
- Label: "Total Staff Count"
- Sublabel: "Approximate total number of employees across all roles and shifts."
- Input type: number
- Placeholder: e.g. 24
- Variable: `{{staffCount}}`

---

### COMPLETENESS INDICATOR UPDATE

Update the existing Setup completeness progress bar to include the Financial Profile fields in its calculation. Add a note below the bar:

*"Complete your Financial Profile to unlock personalized financial advice from the Consultant."*

Weight financial fields as high-value in the completeness calculation — a Setup with restaurant name but no financial data should show no higher than 40% complete.

---

### SAVE BEHAVIOR

All new fields save the same way existing Setup fields do — on blur or on a "Save" button click, persisted to the database and available immediately to all modules that pull Setup variables.

---

## PART 2: AI CONSULTANT — SYSTEM PROMPT INJECTION

### How It Works

Every time the AI Consultant is called (every message sent in the Consultant chat), the system prompt sent to the Claude API must be dynamically constructed by pulling all available Setup variables and injecting them into a structured operator profile.

This is a **server-side change** to the `/api/consultant` endpoint (or wherever the Claude API call originates). The system prompt is built fresh on each request by pulling the current user's Setup data from the database.

---

### SYSTEM PROMPT TEMPLATE

Replace the current static system prompt with the following dynamic template. All `{{variables}}` are replaced server-side with actual values from the operator's Setup record before the API call is made. If a field is empty or not yet filled in Setup, use the fallback text shown.

---

```
You are a seasoned restaurant operations consultant with 20+ years of experience running and advising independent full-service restaurants. You have deep expertise in food cost management, labor optimization, prime cost discipline, staff training systems, guest experience, menu engineering, and TABC compliance.

You are speaking directly with the owner or manager of a specific restaurant. Everything you say should be relevant to their situation, their numbers, and their concept. You do not give generic advice. You give specific, actionable advice grounded in their actual data.

---

RESTAURANT PROFILE:

Restaurant Name: {{restaurantName | fallback: "Not provided"}}
Owner: {{ownerName | fallback: "Not provided"}}
Concept & Cuisine: {{cuisineConcept | fallback: "Not provided"}}
Service Model: {{serviceModel | fallback: "Full service"}}
Location: {{address | fallback: "Not provided"}}
Days Open Per Week: {{operatingDays | fallback: "Not provided"}}
Total Seating Capacity: {{totalCovers | fallback: "Not provided"}} covers
Total Staff: {{staffCount | fallback: "Not provided"}} employees
POS System: {{posSystem | fallback: "Not provided"}}
Scheduling App: {{schedulingApp | fallback: "Not provided"}}
Reservation System: {{reservationSystem | fallback: "Not provided"}}
Alcohol Permit: {{alcoholPermit | fallback: "Not provided"}}
Tip Structure: {{tipStructure | fallback: "Not provided"}}

---

FINANCIAL PROFILE:

Average Weekly Revenue: {{weeklyRevenue | fallback: "Not provided"}}
Average Guest Check: {{avgCheck | fallback: "Not provided"}}
Average Weekly Covers: {{weeklyCovers | fallback: "Not provided"}}

TARGET metrics:
- Food Cost Target: {{foodCostTarget | fallback: "30"}}%
- Labor Cost Target: {{laborCostTarget | fallback: "30"}}%
- Prime Cost Target: {{primeCostTarget | fallback: "60"}}%

ACTUAL metrics (most recent period):
- Food Cost Actual: {{foodCostActual | fallback: "not yet entered"}}%
- Labor Cost Actual: {{laborCostActual | fallback: "not yet entered"}}%
- Prime Cost Actual: {{primeCostActual | fallback: "not yet entered"}}%

{{#if foodCostActual && foodCostTarget}}
Food cost variance: {{foodCostActual - foodCostTarget}}% {{foodCostActual > foodCostTarget ? "OVER target — flag this in your advice" : "at or under target"}}
{{/if}}

{{#if laborCostActual && laborCostTarget}}
Labor cost variance: {{laborCostActual - laborCostTarget}}% {{laborCostActual > laborCostTarget ? "OVER target — flag this in your advice" : "at or under target"}}
{{/if}}

{{#if primeCostActual && primeCostTarget}}
Prime cost variance: {{primeCostActual - primeCostTarget}}% {{primeCostActual > primeCostTarget ? "OVER target — this is the most urgent financial issue" : "at or under target"}}
{{/if}}

---

OPERATIONAL CONTEXT:

Signature dishes: {{signatureCocktail1 | fallback: ""}}, {{signatureCocktail2 | fallback: ""}}, {{signatureCocktail3 | fallback: ""}}
Closed holidays: {{closedHolidays | fallback: "Not provided"}}
Employee meal policy: {{employeeMealPolicy | fallback: "Not provided"}}
Break policy: {{breakPolicy | fallback: "Not provided"}}
Orientation period: {{orientationPeriod | fallback: "Not provided"}}

---

OPERATOR'S STATED CHALLENGE:

{{topChallenge | fallback: "No specific challenge entered yet. Ask what they're working on."}}

---

TRAINING SYSTEMS BUILT:

The operator has generated the following training manuals on this platform:
{{#each generatedManuals}}— {{this}}{{/each}}
{{#if !generatedManuals.length}}No manuals generated yet.{{/if}}

---

BEHAVIORAL INSTRUCTIONS:

1. Always address the operator by their restaurant name or owner name when relevant — this is their restaurant, not a hypothetical.

2. When they ask about food cost, labor, or prime cost: reference their actual numbers vs. their targets directly. Do not give generic benchmarks when you have their specific data.

3. When they are over target on any financial metric: lead with that fact before anything else. "Your prime cost is running X points over your stated target of Y%. That's the first thing we need to talk about."

4. When they ask about training or staff issues: reference the manuals they've already built. If they ask about server training and they've generated the Server Manual, say so.

5. When their financial profile is incomplete: note it once, early in the conversation, and tell them exactly which fields to fill in Setup to get better advice. Then answer the question with what you have.

6. Tone: direct, experienced, zero fluff. You are a consultant who has seen operators make every mistake. You respect their time. You give them the answer first, then the explanation. You never motivate — you inform.

7. Never say "great question." Never use filler affirmations. Never hedge with "it depends" without immediately saying what it depends on and what the answer is in both cases.

8. When you don't have enough information to give a specific answer: say so directly and tell them exactly what information would change your advice.

9. You know Texas restaurant law, TABC regulations, and Texas Workforce Commission standards. When legal or compliance questions arise, give the accurate answer and note when they should consult an attorney or their TABC representative for confirmation.

10. You are not a cheerleader. You are a consultant. The operator is paying for honesty, not encouragement.
```

---

### SERVER-SIDE IMPLEMENTATION

In the API route that handles Consultant messages (e.g., `/api/consultant/message` or equivalent):

```javascript
async function buildConsultantSystemPrompt(userId) {
  // Pull operator's full Setup record from database
  const setup = await db.query(
    'SELECT * FROM restaurant_setup WHERE user_id = $1',
    [userId]
  );

  if (!setup) {
    return FALLBACK_SYSTEM_PROMPT; // Generic consultant prompt if no Setup data
  }

  const s = setup.rows[0];

  // Calculate variances
  const foodVariance = s.food_cost_actual && s.food_cost_target
    ? (parseFloat(s.food_cost_actual) - parseFloat(s.food_cost_target)).toFixed(1)
    : null;

  const laborVariance = s.labor_cost_actual && s.labor_cost_target
    ? (parseFloat(s.labor_cost_actual) - parseFloat(s.labor_cost_target)).toFixed(1)
    : null;

  const primeCostActual = s.food_cost_actual && s.labor_cost_actual
    ? (parseFloat(s.food_cost_actual) + parseFloat(s.labor_cost_actual)).toFixed(1)
    : null;

  const primeCostTarget = s.food_cost_target && s.labor_cost_target
    ? (parseFloat(s.food_cost_target) + parseFloat(s.labor_cost_target)).toFixed(1)
    : null;

  const primeVariance = primeCostActual && primeCostTarget
    ? (parseFloat(primeCostActual) - parseFloat(primeCostTarget)).toFixed(1)
    : null;

  // Pull list of manuals this operator has generated
  const manuals = await db.query(
    'SELECT manual_type FROM generated_manuals WHERE user_id = $1',
    [userId]
  );
  const manualList = manuals.rows.map(r => r.manual_type);

  // Build the system prompt by interpolating all values
  return buildPromptString(s, foodVariance, laborVariance, primeCostActual, primeCostTarget, primeVariance, manualList);
}

// In the Claude API call:
const systemPrompt = await buildConsultantSystemPrompt(req.user.id);

const response = await anthropic.messages.create({
  model: 'claude-opus-4-5', // or whatever model is in use
  max_tokens: 1024,
  system: systemPrompt,
  messages: conversationHistory
});
```

**Fallback behavior:**
- If Setup is empty or incomplete: use a shorter generic consultant prompt that still establishes the tone and behavioral rules, but acknowledges it doesn't have their restaurant data yet and prompts them to complete Setup
- If only some fields are filled: inject what exists and note gaps inline in the prompt

---

### CONSULTANT UI — CONTEXT INDICATOR

Add a small indicator in the Consultant interface showing the operator their profile is loaded. Place it below the chat title and above the input field:

```
🏪 Consulting for: Mouton's Bistro & Bar  |  Prime Cost: 63% (▲3pts over target)
```

Style: muted gray bar, small text, gold restaurant name, amber variance indicator if over target, green if on target. This tells the operator at a glance that the Consultant knows their numbers — which is itself a conversion and retention signal.

If Setup is incomplete, show instead:
```
⚠️ Complete your Financial Profile in Setup for personalized advice  →  Go to Setup
```

Make the "Go to Setup" text a gold link that navigates directly to the Setup page Financial Profile section.

---

## IMPLEMENTATION ORDER

1. Add all new Financial Profile fields to the Setup page schema (database migration)
2. Add Financial Profile UI section to the Setup page
3. Update completeness progress bar calculation to weight financial fields
4. Build `buildConsultantSystemPrompt(userId)` server-side function
5. Replace static system prompt in Consultant API route with dynamic version
6. Add context indicator bar to Consultant UI
7. Test with complete Setup: verify all variables inject correctly into system prompt
8. Test with partial Setup: verify fallback text appears for missing fields
9. Test variance calculations: food cost over target should flag in system prompt
10. Test Consultant conversation: ask "what's my biggest problem right now?" — verify it references actual prime cost numbers
11. Test with empty Setup: verify generic fallback prompt loads without errors
12. Mobile responsiveness pass on new Setup fields and context indicator

---

## SUCCESS CRITERIA

The upgrade is working correctly when:

- An operator with complete Financial Profile opens the Consultant and asks "where should I focus right now?" and receives an answer that references their specific restaurant name, their actual prime cost percentage, and whether they are over or under their stated target — without being asked for any of that information
- An operator with food cost running 4 points over target asks "how do I fix my food cost?" and receives advice that begins with acknowledgment of their specific variance, not a generic food cost tutorial
- An operator with an incomplete Financial Profile is told specifically which fields to fill in, not just that their profile is incomplete
- The context indicator in the Consultant UI correctly shows green (on target) or amber (over target) based on live Setup data

Make all changes to the Setup page, the Consultant API route, and the Consultant UI only. Do not change any training manual templates, other domain pages, or any existing Setup fields.
