# Replit Prompt — Landing Page Visual Alignment

Paste this directly into Replit chat:

---

The public-facing landing page (the page shown before login at the root URL) does not visually match the rest of the platform. The interior app uses a precise, established design system. The landing page uses different background shades, different card treatments, and different visual weight. This prompt aligns the landing page to the exact same design tokens used throughout the app.

**DO NOT CHANGE:**
- Any landing page copy, headlines, or text content
- The page structure or section order
- The "Get Started Free" and "Sign In" button functionality
- Any routing or auth logic
- Any other pages, modules, or app interior

This is a CSS/visual alignment pass only. Content and structure stay exactly as they are.

---

## DESIGN TOKEN ALIGNMENT

Replace all landing page color values with the established platform tokens:

| Current (approximate) | Replace with | Usage |
|---|---|---|
| `#0d0d0d` or near-black backgrounds | `#0f1117` | Page background |
| Any dark card/section backgrounds | `#1a1d2e` | Card and section backgrounds |
| Any secondary dark backgrounds | `#12141f` | Nested card backgrounds |
| Any border/divider colors | `#2a2d3e` | Subtle borders |
| Any gold/amber accent | `#b8860b` | Primary gold |
| Any brighter gold/hover | `#d4a017` | Hover states, highlights |
| Any muted text | `#6b7280` | Secondary/muted text |

Apply these tokens globally to the landing page stylesheet — do not hardcode them per element. Use CSS variables matching whatever variable names are already defined in the project's design system.

---

## SECTION-BY-SECTION FIXES

### Hero Section

**Background:** `#0f1117` — solid, no gradient
**Headline:** white, existing font weight preserved
**Gold "Systems" word:** `#d4a017` — already correct, verify it matches exactly
**Subheadline:** muted gray `#6b7280`
**"Get Started Free" button:**
- Background: `#b8860b`
- Text: `#0f1117` (dark, not white)
- Border: none
- Hover: `#d4a017`
- Border-radius: `6px`
- Font-weight: `600`
- Padding: `14px 28px`
**"Sign In" button (top right nav):**
- Same gold treatment — `background: #b8860b`, `color: #0f1117`
- Currently looks lighter/different from interior nav buttons — match exactly
**Tagline "Systems that work on your worst night.":**
- Color: `#d4a017` italic — verify this matches the gold used in the interior
**"Built by Ben Mouton" line:**
- Color: white, `font-weight: 600`
- The rest: muted gray `#6b7280`

---

### Ask Anything Section (chat demo)

**Section background:** `#0f1117`
**Left side (text + question chips):**
- Section title and body: white / muted gray as established
- Question chips: `background: #1a1d2e`, `border: 1px solid #b8860b`, white text, `border-radius: 6px`
- Active/selected chip: `background: #1a1d2e`, `border: 1px solid #d4a017`, gold text
- Hover on chips: border brightens to `#d4a017`

**Right side (chat demo card):**
- Card background: `#1a1d2e`
- Card border: `1px solid #b8860b`
- Card border-radius: `8px`
- "You:" label: muted gray `#6b7280`, small, uppercase
- User message bubble: `background: #12141f`, white text, `border-radius: 6px`, padding `12px 16px`
- "Consultant:" label: muted gray `#6b7280`, small, uppercase
- Consultant response: white text, no bubble background — plain text on card background
- Font: match interior app font exactly

---

### Three Pillars Section (Structure Over Motivation / Systems Over Heroics / Clarity Over Chaos)

**Section background:** `#1a1d2e` — this section should feel like a card/panel, slightly elevated from the page background
**Section border-top and border-bottom:** `1px solid #2a2d3e`
**Icons (shield, chart, flame):** `#b8860b` — match exactly to icon treatment in interior domain tiles
**Pillar title:** white, `font-size: 20px`, `font-weight: 600`
**Pillar body:** muted gray `#6b7280`
**Layout:** 3-column grid on desktop, stacked on mobile — preserve existing layout

---

### "See It In Action" Section

**Section background:** `#0f1117`
**Section headline "See It In Action":** white, existing size preserved
**Subheadline "Real tools, real dashboards...":** muted gray `#6b7280`

**Feature preview cards (Kitchen Command Center, Operations Consultant, HR Documentation, etc.):**

Current treatment looks like generic screenshot cards. Replace with the established card style:
- Card background: `#1a1d2e`
- Card border: `1px solid #2a2d3e`
- Card border-radius: `8px`
- Card hover state: border transitions to `1px solid #b8860b` with `transition: border-color 0.2s ease`
- Screenshot/preview image: contained within card, `border-radius: 6px`, no drop shadow
- Card title below image: white, `font-weight: 600`, `font-size: 16px`
- Card subtitle: muted gray `#6b7280`, `font-size: 14px`
- Card padding: `16px`
- Grid gap: `24px`

The "window chrome" on the screenshots (the fake browser top bar with colored dots) currently looks mismatched. If these are static images: leave them. If they're rendered UI: ensure the background behind the dots is `#1a1d2e` not a lighter gray.

---

### Nav / Header

**Background:** `#0f1117`, no border or `border-bottom: 1px solid #2a2d3e`
**Logo:** existing — verify gold matches `#b8860b`
**"Sign In" button:** `background: #b8860b`, `color: #0f1117`, `font-weight: 600` — match the interior's primary button exactly

---

### Overall Typography Pass

Verify the landing page uses the same font family as the interior app. If the interior uses a specific font (check the app's CSS variables or Tailwind config), apply it explicitly to the landing page. If they're already the same: no change needed.

Font size scale should match the interior:
- Body text: `14–15px`
- Section subheadlines: `16px` muted
- Section headlines: `28–36px`
- Hero headline: `48–56px` (preserve existing size)

---

### Spacing and Rhythm

The interior app uses consistent section padding. Apply the same vertical rhythm to the landing page:
- Section padding: `80px 0` on desktop, `48px 0` on mobile
- Max content width: `1200px`, centered with `auto` margins
- Horizontal padding: `24px` on mobile, `48px` on tablet, `0` on desktop (contained by max-width)

If any section currently has tighter or looser padding than this: normalize it. The landing page should feel like it was built by the same person who built the dashboard.

---

## WHAT NOT TO TOUCH

- The "Try it yourself →" button — keep existing functionality
- The chat demo interaction logic (clicking chips, showing response) — visual only
- Any copy, headlines, or descriptive text
- Page routing or auth redirect behavior
- Mobile nav if one exists
- Footer if one exists
- Any A/B test or analytics scripts

---

## SUCCESS CRITERIA

The landing page is visually aligned when:
- A user who logs out from the dashboard and lands on the landing page sees the same background color (`#0f1117`), the same card color (`#1a1d2e`), and the same gold (`#b8860b`) they just left
- The question chips on the landing page look identical to the suggestion chips in the onboarding Consultant step
- The feature preview cards use the same border and hover treatment as the domain tiles on the dashboard
- The "Get Started Free" button is visually indistinguishable in style from the primary action buttons inside the app
- No section has a background color that doesn't appear in the established design token set
