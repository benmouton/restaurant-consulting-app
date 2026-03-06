# Replit Prompt — Conversion Rate Optimization (Targeted Rewrite)

Paste this directly into Replit chat:

---

The subscription infrastructure is complete — Stripe on web, RevenueCat on iOS, tierConfig.ts, blur overlay, upgrade gate component, native detection. The problem is not the paywall. The problem is conversion psychology: 55 registered free users, 0 paid subscribers.

This prompt makes 5 targeted changes to the existing system. Nothing gets rebuilt. No architecture changes. No tierConfig changes. This is copy, timing, and trigger work only.

**DO NOT CHANGE:**
- tierConfig.ts or the domain gating split
- The blur overlay component structure or behavior
- Stripe checkout flow, webhook handlers, or RevenueCat integration
- The native app detection logic — iOS users still see no prices and no upgrade buttons per existing behavior
- Any domain content, training manual templates, or Setup logic
- Page routing or auth system

---

## CHANGE 1: UPGRADE GATE COPY — DOMAIN-SPECIFIC VALUE STATEMENTS

The current upgrade card shows: *"Unlock [Domain Name]"* with a generic one-liner.

Replace the headline and description in the `<UpgradeGate>` component with domain-specific copy for all 9 locked domains. Pass the domain key as a prop and render the correct copy from a lookup object.

Add this copy map to the UpgradeGate component:

```typescript
const upgradeGateCopy: Record<string, { headline: string; sub: string }> = {
  'hr-documentation': {
    headline: "Stop Writing HR Documents from Scratch",
    sub: "Generate TWC-compliant warnings, write-ups, and termination letters in seconds. One document saves more than a year of this subscription."
  },
  'staffing-labor': {
    headline: "Your Labor Cost Is Either Under Control or It Isn't",
    sub: "Track scheduled vs. actual labor %, get AI scheduling recommendations, and know your shift cost before service starts."
  },
  'cost-margin-control': {
    headline: "Know Your Food Cost Before the Week Is Over",
    sub: "Plate costing, yield tracking, and variance alerts. If you're running blind on food cost, you're losing money you can't see."
  },
  'training-templates': {
    headline: "Six Training Manuals. One Generate Button.",
    sub: "Server, Kitchen, Bartender, Host, Busser, and Manager manuals — personalized to your restaurant, printable, and shareable in minutes."
  },
  'skills-certification': {
    headline: "Training Without a Record Is Just a Conversation",
    sub: "Track who was trained, what they scored, and when they were certified. Your TWC documentation lives here."
  },
  'financial-insights': {
    headline: "Prime Cost Is the Only Number That Matters",
    sub: "Weekly prime cost tracker with 4-week trend. Food cost + labor cost vs. your targets — updated every time you enter your numbers."
  },
  'reviews-reputation': {
    headline: "Every Negative Review Is a Conversion Opportunity",
    sub: "Generate professional, on-brand responses to Google and Yelp reviews in seconds. Turn complaints into return visits."
  },
  'social-media-tools': {
    headline: "Consistent Social Presence Without the Time",
    sub: "AI-generated posts in your restaurant's voice, scheduled across platforms. Stop starting from scratch every time."
  },
  'operations-consultant': {
    headline: "A Consultant Who Knows Your Restaurant",
    sub: "Not generic advice — advice based on your actual food cost, your labor percentage, and your specific operational challenges."
  },
  'staff-scheduling': {
    headline: "Build a Schedule That Hits Your Labor Target",
    sub: "AI-assisted scheduling with live labor cost calculation. Know what the schedule costs before you publish it."
  },
  'service-standards': {
    headline: "The Standard Only Holds If It's Written Down",
    sub: "Build, store, and share SOPs for every position. Stop retraining because nobody remembered what you said."
  }
};
```

Also update the CTA button copy from **"Upgrade Now →"** to **"Unlock for $10/month →"** (Basic tier price). Showing the price on the button reduces friction — operators want to know the cost before they click.

Keep all existing native app detection logic — iOS users still see no price and no upgrade button, only the "subscribe at restaurantai.consulting" message.

---

## CHANGE 2: POST-GENERATION MODAL — TRAINING MANUALS

This is the highest-intent moment on the platform. An operator who just generated their first training manual has experienced the core value. The platform currently lets this window close without an ask.

**Trigger:** When any user successfully generates a training manual for the first time (first generation ever, not first of each type), show a modal after the success state renders.

Track first generation with a simple flag in the user record: `has_seen_post_generation_modal: boolean` — default false, set to true after the modal is dismissed. Show the modal once, never again.

**Modal content:**

```
✓ Your [Manual Name] is ready.

That took 3 minutes. Your next hire gets trained to a system
instead of a gut feeling.

The Manager Manual turns a good employee into someone who
can run this restaurant without you being there.
It's included in every paid plan.

[ See what's included — $10/month ]     [ Not right now ]
```

- "See what's included" links to the pricing page
- "Not right now" is a small gray text link — not a button, not a close X — make it require an active choice to dismiss
- Modal is centered, dark background with gold accent border, matches platform style
- Does not show on iOS native app — check `isNativeApp()` before rendering

**Implementation note:** If tracking first generation in the DB adds complexity, use localStorage as a fallback: `localStorage.setItem('hasSeenPostGenerationModal', 'true')`. Acceptable tradeoff.

---

## CHANGE 3: CONSULTANT MESSAGE LIMIT — 3 FREE MESSAGES PER MONTH

Free users currently see the Consultant behind a full blur overlay and can't interact at all. Change this. Let free users send exactly 3 Consultant messages per calendar month before hitting the upgrade gate. This is the difference between "I can see what this does" and "I experienced it and now I want more."

**Implementation:**

Add a `consultant_messages_used` counter and `consultant_messages_reset_date` to the user record (or use a separate `consultant_usage` table). Reset on the 1st of each month.

On the Consultant API route:
1. Check if user is free tier
2. If free tier and `consultant_messages_used < 3`: allow the message, increment counter
3. If free tier and `consultant_messages_used >= 3`: do not call the Claude API, return a structured upgrade response instead

**The upgrade response — inject this as an assistant message in the chat thread (not a modal, not an overlay — inline in the conversation):**

```
I can go deeper on this, but I've hit the limit for your free plan this month.

Here's what I can tell you with what I have: [1–2 sentence partial answer based on the question topic — do not leave this blank. Give them something real.]

To continue this conversation — and to get advice based on your actual food cost, labor percentage, and weekly revenue — that's what the paid plan unlocks.

[ Continue the conversation — $10/month ]
```

- Pull the topic from their last message and include the partial answer — this is critical. A hard stop with no value converts at near zero. A partial answer that leaves them wanting more converts.
- The "Continue the conversation" CTA links to the pricing page
- The input field is disabled after message 3 with a muted placeholder: "Upgrade to continue →"
- Message counter resets automatically on the 1st of each month
- Paid users: no counter, no limit, no change to existing behavior
- iOS: follow existing native behavior — no price, no upgrade CTA

**Display the counter to free users.** Add a small indicator above the Consultant input field for free tier users:

```
3 free messages remaining this month   ·   Upgrade for unlimited
```

After 2 messages used: amber color. After 3: input disabled. Paid users see nothing.

---

## CHANGE 4: DYNAMIC DASHBOARD UPGRADE BANNER

The current dashboard nudge banner is static: *"You're using 3 of 12 domains. Unlock everything for $10/month →"*

Replace it with a banner that changes based on what the user has actually done. Evaluate conditions in priority order — show the first one that applies:

**Condition 1 — Consultant messages used up (highest urgency):**
*"You've used your 3 free Consultant messages this month. The next question you ask it — it already knows your restaurant."*
CTA: "Unlock unlimited →"

**Condition 2 — Has generated at least 1 training manual:**
*"You've built a training system for one role. The Manager Manual is the one that runs the restaurant when you're not there."*
CTA: "Unlock the Manager Manual →"

**Condition 3 — Has completed Setup financial profile (new fields from Financial Profile upgrade):**
*"Your financial profile is set. The prime cost tracker turns those numbers into a weekly dashboard."*
CTA: "Unlock the dashboard →"

**Condition 4 — Default (none of the above):**
*"3 of 12 tools. The 9 you haven't unlocked include food cost tracking, HR documents, and a Consultant who knows your numbers."*
CTA: "See what you're missing →"

All CTAs link to the pricing page. Banner is dismissible with an X. Returns after 7 days if dismissed. Never shows to paid users.

---

## CHANGE 5: PRICING PAGE — TWO ADDITIONS ONLY

Do not redesign the pricing page. Add exactly two elements:

**Addition 1 — The Math Card**

Add a small card between the plan cards and the comparison table:

```
┌─────────────────────────────────────────────────┐
│  Does it pay for itself?                         │
│                                                   │
│  One HR write-up instead of a consultant:        │
│  $150 saved                                      │
│                                                   │
│  One food cost variance caught early in a week:  │
│  $200–400 saved                                  │
│                                                   │
│  A manager trained with a real manual instead    │
│  of improvised onboarding:                       │
│  priceless (and $40–60/hour in rework avoided)  │
│                                                   │
│  Basic plan: $10/month.                          │
└─────────────────────────────────────────────────┘
```

Style: dark card, gold left border `3px solid #b8860b`, background `#1a1d2e`. No header label. Body text in white, dollar amounts in gold. Simple, no icons, no decorative elements.

**Addition 2 — Operator Testimonial Block**

Add directly below the math card, before the comparison table:

```
"I generated our Server and Manager manuals in one afternoon.
New hire training went from three days of chaos to a system
that works whether I'm in the building or not."

— Independent Restaurant Owner, Texas
```

Style: dark card, italic quote in white, attribution in muted gray, gold left border. If a real testimonial from a real user exists, replace this placeholder — use their first name and city only, no restaurant name without permission.

---

## IMPLEMENTATION ORDER

1. Update UpgradeGate component with domain-specific copy map and new CTA button text (Change 1) — web only, preserve native logic
2. Add `has_seen_post_generation_modal` flag to user record or localStorage
3. Build post-generation modal component and wire to training manual generation success state (Change 2)
4. Add `consultant_messages_used` counter to user record, add reset logic on month rollover (Change 3)
5. Update Consultant API route with free-tier message limit and partial-answer upgrade response (Change 3)
6. Add message counter display above Consultant input for free users (Change 3)
7. Replace static dashboard banner with dynamic condition-based logic (Change 4)
8. Add math card to pricing page (Change 5)
9. Add testimonial block to pricing page (Change 5)
10. Smoke test: new free account → generate manual → confirm modal fires → use 3 Consultant messages → confirm inline upgrade response with partial answer → check dashboard banner shows correct condition → verify iOS shows no prices anywhere

---

## SUCCESS CRITERIA

- A free user who generates their first training manual sees a modal before navigating away that references the specific manual they just built
- A free user who sends 3 Consultant messages receives an inline response that includes a partial answer to their actual question plus an upgrade CTA — not a blank wall
- The dashboard banner shows a different message depending on what the user has done — never the same generic text for every user
- The pricing page math card is visible without scrolling on desktop
- No iOS user ever sees a price or an upgrade button — existing native behavior fully preserved
- No paid user is affected by any of these changes
