# Replit Prompt — Landing Page Content & UX Upgrades

Paste this directly into Replit chat:

---

Upgrade the public landing page with the following content, structure, and UX improvements. These are additive changes — new sections, revised copy, and structural additions. Run this prompt after the visual alignment prompt has been applied so the design tokens are already correct.

**DO NOT CHANGE:**
- The hero headline "Replace Chaos with Systems"
- The "Get Started Free" button functionality or auth routing
- The "Sign In" button
- Any interior app pages, modules, or logic
- Stripe/RevenueCat integration
- The established dark theme design tokens

---

## CHANGE 1: TIGHTEN THE HERO SUBHEADLINE

**Current:**
```
A hands-on restaurant consultant built by real service, real payroll, real guests,
and real consequences. Not theory. Not motivation. Structure.
```

**Replace with:**
```
Built on real service, real payroll, and real consequences — not theory.
Structure.
```

"Structure." stays on its own line, bold, white. The rest is muted gray. Shorter setup, same punch.

The tagline line below stays exactly as-is:
```
Systems that work on your worst night.
```

The "Used by independent restaurant owners..." line below that becomes:
```
Used by independent operators to cut labor costs, protect margins, and stop firefighting every shift.
```
(Remove "and" before "stop" — tighten the rhythm.)

---

## CHANGE 2: REPLACE THE THREE PILLARS SECTION

**Current:** Philosophy pillars with icons — Structure Over Motivation / Systems Over Heroics / Clarity Over Chaos

**Replace with:** Three concrete product capability cards. Keep the same 3-column grid layout and icon treatment. Replace the content:

**Card 1 — icon: document/file stack**
```
Training Manuals in 30 Seconds

Six role-specific manuals — Server, Kitchen, Bartender, Host, Busser, Manager —
personalized to your restaurant the moment you click Generate.
No starting from scratch. No generic templates.
```

**Card 2 — icon: chart/trend line**
```
Your Prime Cost, Every Week

Enter three numbers. Get your prime cost percentage versus your target,
a 4-week trend, and a plain-language status: on track, watch this, or act now.
Operators who track weekly make better decisions than operators who find out at month end.
```

**Card 3 — icon: shield/checkmark**
```
An Ops Consultant Who Knows Your Restaurant

Not a generic chatbot. An operations consultant pre-loaded with your restaurant name,
your concept, your financial targets, and your team.
Ask it about your food cost. It answers with your numbers, not a tutorial.
```

Keep the existing pillar title style (white, bold) for the card titles. Body text in muted gray. Icon color `#b8860b`.

Below the three cards, add one centered line in muted gray italic:
```
"Every recommendation is tested against a slammed dinner rush. If it doesn't hold up, it doesn't belong."
```

This preserves the voice of the original pillar copy without letting it replace the product substance.

---

## CHANGE 3: UPGRADE THE CHAT DEMO QUESTION CHIPS

**Current chips:**
- "My food cost jumped 4% this month. Where do I start?" ← keep this one, it's the right question
- "How do I handle a server who keeps over-portioning?"
- "Give me a script for cutting staff on a slow night."
- "What should I do when the kitchen gets slammed?"

**Replace the bottom three with:**
- "My labor cost is over target. What do I check first?"
- "How do I write up an employee without a TWC problem later?"
- "We're losing money on a popular dish. What do I do?"

These questions produce answers that demonstrate real operational specificity — cost management, HR compliance, menu engineering. They sound like questions an independent Texas operator actually asks, and they show the range of the Consultant better than the current set.

The active chip (the one with the visible response) stays as "My food cost jumped 4% this month. Where do I start?" — it's the strongest demo question.

---

## CHANGE 4: UPGRADE THE "SEE IT IN ACTION" SCREENSHOTS

The current screenshot cards show Kitchen Command Center and Operations Consultant. Add a third screenshot card and reorder:

**New order:**
1. **Training Manual Generator** — NEW, add first
2. **Operations Consultant** — existing, keep
3. **Kitchen Command Center** — existing, keep
4. **HR Documentation** — existing, keep (if currently shown)

**Training Manual Generator card:**
If a real screenshot of a generated Server Manual is available in the project assets: use it. Show the rendered manual output — the cover, the day-by-day structure, the operator's restaurant name injected. The "output" screenshot is more compelling than the "interface" screenshot.

If no screenshot is available: generate a mock preview card that shows:
```
┌─────────────────────────────────────────┐
│  SERVER TRAINING MANUAL                  │
│  Mouton's Bistro & Bar                   │
│  7-Day Certification Program             │
│                                           │
│  Day 1  ●●●●●●●●●●                      │
│  Day 2  ●●●●●●●●                        │
│  Day 3  ●●●●●●●●●●●                    │
│                                           │
│  [ Download PDF ]  [ Share ]              │
└─────────────────────────────────────────┘
```
Dark card, gold accents, restaurant name in gold. Style to match the platform's existing card treatment.

**Card label and subtitle:**
```
Training Manual Generator
Six personalized manuals. One Generate button. Ready to print in 30 seconds.
```

---

## CHANGE 5: ADD INLINE PRICING MENTION

After the "See It In Action" section and before the FAQ (new section below), add a single centered pricing callout — not a full pricing page, just enough to answer the cost question before they bounce:

```
┌─────────────────────────────────────────────────────────┐
│                                                           │
│   3 core domains free forever. No credit card required.  │
│   Full platform access from $10/month.                   │
│                                                           │
│              [ Get Started Free → ]                       │
│                                                           │
│   Want to see everything that's included?                │
│   → View full pricing                                    │
└─────────────────────────────────────────────────────────┘
```

Style: centered, dark section background `#1a1d2e`, no hard border — just a slightly elevated background. "3 core domains free forever" in white. "No credit card required." in muted gray. "$10/month" in gold `#d4a017`. "Get Started Free →" button: standard gold button. "View full pricing" is a small gold text link to the pricing page if one exists, or to the signup page if not.

This section answers the price objection without committing to a full pricing breakdown on the landing page.

---

## CHANGE 6: ADD FAQ SECTION

Add a new FAQ section below the pricing callout. Three questions, two sentences each. No accordion — just open questions and answers. Clean, scannable.

**Section header:**
```
Common Questions
```
White, left-aligned or centered, `font-size: 28px`, `font-weight: 600`.

**Q1:**
```
Is this built for independent restaurants or large chains?

Independent operators only. The systems, the language, and the tools are built
for owners who are in their restaurant — not regional managers running reports
from a corporate office.
```

**Q2:**
```
Do I need to be tech-savvy to use this?

No. If you can send an email, you can use this platform.
Setup takes 5 minutes. Your first training manual takes 30 seconds.
```

**Q3:**
```
What's the difference between the free plan and paid?

Free gives you 3 core domains — Kitchen Operations, Crisis Management,
and Leadership & Culture. Paid unlocks everything: all 6 training manuals,
prime cost tracking, menu engineering, HR documentation, scheduling tools,
and the full Consultant.
```

**Style:**
- Section background: `#0f1117`
- Question: white, `font-weight: 600`, `font-size: 17px`
- Answer: muted gray `#6b7280`, `font-size: 15px`, `line-height: 1.7`
- Each Q&A block: `padding-bottom: 32px`, `border-bottom: 1px solid #2a2d3e`
- Last block: no bottom border
- Max width: `680px`, centered

---

## CHANGE 7: ADD CLOSING CTA SECTION

At the very bottom of the page, before the footer, add a closing CTA section. An operator who scrolled the entire page and saw everything needs a second chance to convert — right now there's nothing at the bottom.

```
┌─────────────────────────────────────────────────────────┐
│                                                           │
│         Stop Running on Gut Feel.                        │
│                                                           │
│   The operators who survive aren't working harder.       │
│   They're running better systems.                        │
│                                                           │
│              [ Get Started Free → ]                      │
│         3 domains free. No credit card required.         │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

**Style:**
- Section background: `#1a1d2e`
- Top and bottom border: `1px solid #b8860b`
- Headline "Stop Running on Gut Feel.": white, `font-size: 36px`, `font-weight: 700`, centered
- Body line: muted gray, centered, `font-size: 16px`
- Button: standard gold primary button
- Fine print "3 domains free...": muted gray, `font-size: 13px`, centered, below the button
- Section padding: `80px 24px`

---

## CHANGE 8: ADD SOCIAL PROOF PLACEHOLDER

Between the chat demo section and the three pillars section, add a testimonial block. If a real testimonial exists from a real operator: use it (first name + city only, never full name without permission). If not: use this placeholder that signals where it goes and what it should say — style it as a real testimonial, marked clearly in the code as `<!-- PLACEHOLDER: replace with real testimonial -->`:

```
┌─────────────────────────────────────────────────────────┐
│                                                           │
│  "I generated our Server and Manager manuals in one      │
│   afternoon. New hire training went from three days of   │
│   chaos to a system that works whether I'm in the        │
│   building or not."                                      │
│                                                           │
│   — Independent Restaurant Owner, Texas                  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

**Style:**
- Section background: `#0f1117`
- Card background: `#1a1d2e`
- Left border: `3px solid #b8860b`
- Quote text: white, italic, `font-size: 18px`, `line-height: 1.8`
- Attribution: muted gray `#6b7280`, `font-size: 14px`, not italic
- Card max-width: `680px`, centered
- Card padding: `32px 40px`
- Opening quote mark: large, gold `#b8860b`, `font-size: 64px`, `line-height: 0`, positioned decoratively

---

## SECTION ORDER — FINAL PAGE STRUCTURE

After all changes, the landing page should read top to bottom in this order:

1. Nav (logo + Sign In)
2. Hero (headline, subheadline, CTA button, tagline, "Built by Ben Mouton")
3. Chat Demo ("Ask Anything. Get Real Answers." — with upgraded chips)
4. Testimonial placeholder (social proof block)
5. Three Product Capability Cards (replacing philosophy pillars)
6. "See It In Action" (with Training Manual card added first)
7. Inline Pricing Callout
8. FAQ Section
9. Closing CTA Section
10. Footer (if exists)

---

## MOBILE BEHAVIOR

All new sections must be responsive:
- Three capability cards: 3-column desktop → 1-column mobile, stacked
- FAQ: full width on mobile, same open layout (no accordion needed)
- Testimonial: full width on mobile, reduce padding to `24px`
- Closing CTA: headline drops to `28px` on mobile
- Pricing callout: centered, full width, single column on mobile
- Chat demo chips: full width stacked on mobile (already likely the case — verify)

---

## IMPLEMENTATION ORDER

1. Hero subheadline copy update
2. Social proof placeholder block (section 4)
3. Replace three pillars with three product capability cards
4. Upgrade chat demo question chips (content only — preserve chip interaction logic)
5. Add Training Manual card to "See It In Action" section (first position)
6. Inline pricing callout section
7. FAQ section
8. Closing CTA section
9. Verify section order matches the final structure above
10. Mobile responsiveness pass on all new sections
11. Smoke test: scroll full page on desktop and mobile — verify all sections render, all buttons route correctly, no layout breaks

---

## SUCCESS CRITERIA

- The page reads top to bottom with a clear narrative: who this is for → what it does concretely → proof → how much it costs → common objections answered → second chance to convert
- An operator who scrolls the full page hits a CTA button at least twice: once at the top, once at the bottom
- The three product capability cards name specific tools (training manuals, prime cost tracker, Consultant) — not abstract philosophy
- The pricing callout answers the cost question before the operator bounces
- The FAQ correctly states which 3 domains are free (Kitchen Operations, Crisis Management, Leadership & Culture)
- The testimonial placeholder is styled as a real testimonial and marked clearly in code for replacement
- All new sections use the established design tokens from the visual alignment prompt
- No existing functionality is broken — auth routing, button behavior, and chat demo interaction all work exactly as before
