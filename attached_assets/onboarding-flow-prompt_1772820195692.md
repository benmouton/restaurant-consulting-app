# Replit Prompt — New User Onboarding Flow

Paste this directly into Replit chat:

---

Build a **3-step onboarding flow** for new users. Every new operator who signs up currently lands on the dashboard cold with no guidance, no context, and no clear first action. This flow gives them a guided activation sequence that gets them to their first real value experience before they bounce.

The three steps:
1. **Complete Setup** — personalize the platform to their restaurant
2. **Generate your first manual** — experience the core product value
3. **Ask the Consultant your first question** — experience the AI value

Match the established dark theme throughout: background `#0f1117`, gold/amber accent `#b8860b` / `#d4a017`, card backgrounds `#1a1d2e`, white primary text, muted gray secondary text.

**DO NOT CHANGE:**
- Any existing Setup page logic or fields
- Any training manual generation logic
- The Consultant chat interface or API
- Any existing dashboard content or domain tiles
- Stripe/RevenueCat subscription logic or tier gating
- Any other modules, pages, or routing

---

## WHO SEES THIS

Onboarding shows only to new users who have not yet completed all three activation steps. Track completion in the user record:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
-- 0 = not started, 1 = setup complete, 2 = first manual generated, 3 = fully activated

ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_dismissed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP;
-- set when onboarding_step reaches 3
```

**Show onboarding:** `onboarding_step < 3` AND `onboarding_dismissed = false`
**Never show onboarding to:** existing users who were active before this feature shipped — set `onboarding_dismissed = true` for all users with `created_at` before today's deployment date.

---

## ENTRY POINT — FIRST LOGIN EXPERIENCE

When a brand new user logs in for the first time (account age < 5 minutes OR `onboarding_step = 0`), instead of dropping them on the standard dashboard, show the **Welcome Screen** as a full-page overlay above the dashboard.

The dashboard is still rendered underneath — the operator can see it through a subtle dark overlay. This is intentional: they can see what they're working toward.

---

## WELCOME SCREEN — FULL PAGE OVERLAY

**Layout:** centered card, max-width 560px, dark background `#1a1d2e`, gold border `1px solid #b8860b`, padding 48px.

**Content:**

```
🔑  [small icon]

Welcome to The Restaurant Consultant.

Built by operators, for operators.

This platform runs on your restaurant's information.
The more you put in, the more specific the advice —
and the more useful every tool becomes.

It takes about 5 minutes to get set up.
Let's do it now.

[ Let's go → ]

────────────────────
Skip for now  (small gray text link below the button)
```

**"Let's go →":** gold button, full width, navigates to Setup page and begins the onboarding sequence.

**"Skip for now":** sets `onboarding_dismissed = true`, lands on standard dashboard, never shows the welcome screen again. No guilt, no dark pattern — just a clean exit.

**Animation:** card fades in over 400ms with a subtle upward translate on load. Gold border has a very subtle pulse animation for the first 2 seconds — draws the eye without being aggressive.

---

## THE PROGRESS BAR — PERSISTENT DURING ONBOARDING

While `onboarding_step < 3` and `onboarding_dismissed = false`, show a persistent progress bar at the very top of every page — above the nav, full width, always visible.

```
┌─────────────────────────────────────────────────────────────────────┐
│  ① Complete Setup   ──────   ② Generate a Manual   ──────   ③ Ask the Consultant   [✕]  │
│  [████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] Step 1 of 3              │
└─────────────────────────────────────────────────────────────────────┘
```

**Step indicators:**
- Completed step: gold filled circle with ✓, label in gold
- Current step: gold outlined circle with step number, label in white, subtle gold glow
- Future step: muted gray circle, label in muted gray

**Progress bar:** thin gold fill bar below the step indicators. Fills to 33% after step 1, 66% after step 2, 100% after step 3.

**[✕] dismiss button:** top right of the bar. Sets `onboarding_dismissed = true`. Clicking it shows a single-line confirmation inline:
```
Are you sure? You can always find Setup in the menu.  [ Yes, skip ]  [ Keep going ]
```
If confirmed: bar disappears permanently. If cancelled: bar stays.

**Style:** bar background `#1a1d2e`, bottom border `1px solid #b8860b`, height 56px, padding `0 24px`. On mobile: step labels hidden, only circles and progress bar shown.

---

## STEP 1: COMPLETE SETUP

### Trigger
Progress bar step 1 is the current step. User is on the Setup page.

### Setup Page Enhancement — Onboarding Mode

When the user arrives at Setup via the onboarding flow, add a contextual banner at the top of the Setup page:

```
┌─────────────────────────────────────────────────────────┐
│  Step 1 of 3 — Tell us about your restaurant             │
│                                                           │
│  The more you fill in here, the more your training       │
│  manuals, financial tools, and Consultant advice will     │
│  be personalized to your specific operation.              │
│                                                           │
│  Required to continue: Restaurant Name, Owner Name,       │
│  and at least one management contact.                     │
└─────────────────────────────────────────────────────────┘
```

**Minimum required fields to complete Step 1:**
- Restaurant Name
- Owner Name
- At least one of: GM, Floor Manager, Bar Manager, Kitchen Manager

These four fields are the minimum the Consultant needs to give personalized advice. Everything else in Setup improves the output but isn't required to activate.

**Mark required fields** with a gold asterisk in the Setup UI during onboarding mode only — don't change the standard Setup field display for returning users.

### Step 1 Completion

When the minimum required fields are saved:
1. Set `onboarding_step = 1` server-side
2. Progress bar advances to Step 2
3. Show a brief inline success toast at the bottom of the Setup page:

```
✓ Setup saved. Your restaurant is personalized.
  Next: Generate your first training manual →
```

Gold text, dark background, 4-second display, then auto-navigates to the Training Templates page. If the operator doesn't want to navigate automatically: small "Stay here" link in the toast that cancels the redirect.

---

## STEP 2: GENERATE YOUR FIRST MANUAL

### Trigger
`onboarding_step = 1`. User arrives at Training Templates.

### Training Templates Page Enhancement — Onboarding Mode

When `onboarding_step = 1`, show a spotlight card at the top of the Training Templates page — above the manual cards:

```
┌─────────────────────────────────────────────────────────────┐
│  Step 2 of 3 — Generate your first training manual           │
│                                                               │
│  Pick any manual below and click Generate.                    │
│  It will be personalized to [restaurantName] automatically.  │
│                                                               │
│  Most operators start with the Server Manual.                 │
│  It's the most used and takes about 30 seconds.              │
│                                                               │
│  [ → Go to Server Manual ]    or choose any manual below     │
└─────────────────────────────────────────────────────────────┘
```

**"Go to Server Manual"** is a gold button that scrolls to or highlights the Server Manual card with a gold ring animation — draws the eye to the recommended starting point without forcing it.

**Highlight animation on Server Manual card:** a gold ring pulses around the card for 3 seconds when the button is clicked, then fades. The operator can still choose any other manual — this is a suggestion, not a mandate.

### Step 2 Completion

When any training manual is successfully generated for the first time:
1. Set `onboarding_step = 2` server-side
2. Progress bar advances to Step 3
3. Show the post-generation success modal (already built in the conversion optimization prompt) — but in onboarding mode, replace the upgrade CTA with the Step 3 prompt instead:

```
✓ Your [Manual Name] is ready.

It's personalized to [restaurantName] and ready to print.

One more step — meet your Consultant.
The Consultant knows your restaurant now.
Ask it anything.

[ Ask the Consultant → ]    [ Stay here ]
```

Gold primary button navigates to the Consultant. "Stay here" is a gray text link — keeps them on the manual but advances the onboarding state so they can complete Step 3 whenever.

---

## STEP 3: ASK THE CONSULTANT YOUR FIRST QUESTION

### Trigger
`onboarding_step = 2`. User arrives at the Consultant (Ask the Consultant page).

### Consultant Page Enhancement — Onboarding Mode

When `onboarding_step = 2` and the Consultant chat is empty (no messages yet), show an onboarding welcome state inside the chat area instead of the standard empty state:

```
┌─────────────────────────────────────────────────────────────┐
│  Step 3 of 3 — Ask your first question                       │
│                                                               │
│  The Consultant knows you're running [restaurantName].        │
│  It knows your concept, your team, and your targets.         │
│  Ask it something real.                                       │
│                                                               │
│  Not sure where to start? Try one of these:                  │
└─────────────────────────────────────────────────────────────┘
```

Below the card, render **4 suggested starter questions** as tappable chips — clicking one pre-fills the input field:

```
[ We're struggling with food cost. Where do I start? ]

[ What should I look for when interviewing a new server? ]

[ How do I set up a pre-shift lineup that actually works? ]

[ My prime cost is over target. What are the first three things to check? ]
```

**Chip style:** dark background `#1a1d2e`, gold border `1px solid #b8860b`, white text, hover state brightens border to `#d4a017`. Full width on mobile, 2-column grid on desktop. Clicking a chip fills the input and focuses it — operator still has to hit send, they're not auto-sending.

The standard Consultant input field is visible and active below the chips — operator can type their own question instead.

### Step 3 Completion

When the operator sends their first Consultant message:
1. Set `onboarding_step = 3` and `activated_at = NOW()` server-side
2. Progress bar completes — all three steps show gold ✓
3. After the Consultant responds, show a brief completion state in the progress bar:

```
┌─────────────────────────────────────────────────────────────┐
│  ✓ ① Setup   ✓ ② Manual Generated   ✓ ③ Consultant Active   │
│  [████████████████████████████████] You're set up.          │
│                                                               │
│  The Restaurant Consultant is ready.  [ Go to Dashboard ]    │
└─────────────────────────────────────────────────────────────┘
```

After 6 seconds (or on "Go to Dashboard" click): progress bar fades out permanently and never shows again. The operator is now fully activated.

**On the dashboard:** the Operator Command Strip updates to show live data from their Setup and any entries they've made. The platform now looks like theirs.

---

## RETURNING USER — INCOMPLETE ONBOARDING

If an operator started onboarding but didn't finish (closed the browser, got busy, came back the next day), the progress bar reappears on their next login at their current step.

The tone is helpful, not guilt-inducing:

**Step 1 incomplete (setup not done):**
Progress bar shows Step 1 as current. No additional nudge — the bar is enough.

**Step 2 incomplete (setup done, no manual generated):**
Dashboard shows a subtle inline card below the domain tiles:

```
You're one step from having a personalized training system.

[ Generate your first manual → ]   (links to Training Templates)
```

Gold left border, dark card. Dismissible with X. Does not reappear after dismissed.

**Step 3 incomplete (manual done, consultant not used):**
Same treatment — inline card on dashboard:

```
Your Consultant knows your restaurant. It's waiting for your first question.

[ Ask the Consultant → ]   (links to Consultant)
```

---

## EDGE CASES

**Operator skips to a gated domain during onboarding:**
The UpgradeGate still shows as normal. Onboarding does not override tier gating. If they upgrade during onboarding, the flow continues normally after payment.

**Operator completes steps out of order:**
- If they generate a manual before completing Setup minimum fields: Step 1 is not marked complete. The manual generates (don't block generation), but `onboarding_step` stays at 0 until the minimum Setup fields are saved.
- If they use the Consultant before generating a manual: Step 3 is not marked complete until Step 2 is done. The Consultant works normally — don't block it. Just don't advance the step counter.
- Steps must complete in order: 1 → 2 → 3. But no feature is blocked during onboarding.

**Operator on iOS native app:**
The progress bar and onboarding flow show on iOS. The welcome screen shows on iOS. The only difference: any upgrade CTAs follow the existing native pattern (no prices shown, redirect to web). All three steps work identically on native.

**Operator completes Setup but leaves minimum fields blank:**
The toast does not trigger. The progress bar stays on Step 1. No error message — the minimum required fields are marked with a gold asterisk as a visual guide. Don't lecture them.

---

## ANALYTICS EVENTS

Log these events for tracking activation rates:

```javascript
// Welcome screen shown
track('onboarding_welcome_shown', { user_id })

// Welcome screen CTA clicked
track('onboarding_started', { user_id })

// Welcome screen dismissed
track('onboarding_dismissed', { user_id, step: 0 })

// Progress bar dismissed mid-flow
track('onboarding_dismissed', { user_id, step: currentStep })

// Step completions
track('onboarding_step_completed', { user_id, step: 1 }) // Setup
track('onboarding_step_completed', { user_id, step: 2 }) // Manual
track('onboarding_step_completed', { user_id, step: 3 }) // Consultant

// Full activation
track('onboarding_completed', { user_id, time_to_complete_minutes })
```

Use whatever analytics system is already in the project (console.log as fallback if none). These events tell you where operators are dropping off — which step is failing is more useful than knowing the overall completion rate.

---

## RENDERING STANDARDS

All onboarding components match existing platform standards:
- Progress bar: `background: #1a1d2e`, `border-bottom: 1px solid #b8860b`, height 56px
- Step circles: completed = gold fill `#b8860b` with white ✓; current = gold outline with number; future = `#2a2d3e` fill with muted number
- Progress fill bar: `background: linear-gradient(90deg, #b8860b, #d4a017)`, height 3px, `transition: width 0.6s ease`
- Welcome screen card: `background: #1a1d2e`, `border: 1px solid #b8860b`, `border-radius: 12px`, fade-in animation
- Spotlight cards (steps 2 and 3): `background: #12141f`, `border-left: 3px solid #b8860b`, `border-radius: 8px`
- Suggestion chips: `background: #1a1d2e`, `border: 1px solid #b8860b`, `border-radius: 6px`, hover `border-color: #d4a017`
- Completion bar: all steps gold, message in white, "Go to Dashboard" in gold
- All transitions: 300–400ms ease, never jarring

---

## IMPLEMENTATION ORDER

1. Database migration — add `onboarding_step`, `onboarding_dismissed`, `activated_at` to users table
2. Set `onboarding_dismissed = true` for all existing users (backfill)
3. API endpoints: `POST /api/onboarding/step` (advance step), `POST /api/onboarding/dismiss`
4. Welcome screen overlay component
5. Persistent progress bar component — all three step states
6. Progress bar dismiss with inline confirmation
7. Setup page: minimum required fields logic + gold asterisk markers + onboarding banner
8. Step 1 completion: toast + auto-redirect to Training Templates
9. Training Templates: spotlight card + Server Manual highlight animation
10. Step 2 completion: modified post-generation modal (onboarding variant)
11. Consultant page: onboarding welcome state + 4 suggestion chips
12. Step 3 completion: progress bar completion state + fade-out
13. Returning user: incomplete onboarding inline dashboard cards (Steps 2 and 3)
14. Edge cases: out-of-order completion, iOS native handling
15. Analytics event logging
16. Mobile responsiveness pass — progress bar, welcome screen, chips all must work on iPhone
17. End-to-end test: create new test account, complete all 3 steps, verify `activated_at` is set and bar never reappears

---

## SUCCESS CRITERIA

- A brand new user who signs up and clicks "Let's go" completes all 3 steps in under 8 minutes
- The progress bar correctly reflects the current step on every page load
- Dismissing the flow at any point permanently removes the bar without affecting any platform functionality
- Step 1 does not complete until Restaurant Name, Owner Name, and at least one manager name are saved
- Step 2 completes on first successful manual generation regardless of which manual is chosen
- Step 3 completes on first Consultant message sent regardless of what was asked
- All existing users are unaffected — `onboarding_dismissed = true` backfill is clean
- The welcome screen never shows to an operator who has `onboarding_step >= 1`
- No feature is blocked during onboarding — tier gating still applies normally

Make all changes to the onboarding flow, user record, and the three affected pages (Setup, Training Templates, Consultant) only. Do not change any domain content, manual templates, Consultant API logic, Stripe integration, or tier configuration.
