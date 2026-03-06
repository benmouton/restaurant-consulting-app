# Replit Prompt — Dashboard / Landing Page Major Upgrade

Paste this directly into Replit chat:

---

I need a **major upgrade** to the **main Dashboard / Landing Page** (the home screen with "Good evening, Ben" and the domain tiles grid). Keep the established dark theme: background `#0f1117`, gold/amber accent `#b8860b` / `#d4a017`, card backgrounds `#1a1d2e`, white primary text, muted gray secondary text. Match the visual style used across all upgraded sections.

**DO NOT CHANGE:**
- The time-of-day greeting logic ("Good morning / afternoon / evening, Ben")
- The contextual subtitle logic ("Closing out the day" etc.)
- The existing navigation (Resources, Tools, Consultant menus)
- The user account display (Ben / Owner / Pro Plan badge)
- All domain page routing — clicking tiles must still navigate to the correct pages
- The Staff Scheduling and Consultant bottom cards and their CTA buttons
- Page routing or file structure
- Any other domain pages

---

## 1. REORDER — Optimal Domain Tile Sequence

The current order does not reflect operator priority or usage frequency. Reorder the 12 domain tiles to reflect what operators actually need first, in this exact sequence:

**Row 1 (Most urgent / daily use):**
1. **Kitchen Operations** — operators live here; it's the heartbeat of the restaurant
2. **Cost & Margin Control** — money is always top of mind
3. **Staffing & Labor** — second largest controllable cost
4. **Staff Scheduling** — daily operational necessity

**Row 2 (Systems & standards):**
5. **Service Standards** — the guest experience foundation
6. **HR & Documentation** — compliance and accountability
7. **Training Systems** — consistency at scale
8. **SOPs & Scalability** — the systems layer

**Row 3 (Growth & protection):**
9. **Reviews & Reputation** — online presence and recovery
10. **Crisis Management** — when things go wrong
11. **Facilities & Asset Protection** — often overlooked but critical
12. **Social Media** — visibility and brand

**Note:** Staff Scheduling is currently displayed separately at the bottom as a wide card. Move it into the main 4-column grid as tile #4 and remove the separate bottom card section (or repurpose that bottom area — see section 7). Consultant card stays at the bottom.

---

## 2. Page Header — Operator Command Strip

Below the greeting and subtitle, replace or upgrade the "PRIORITY FOR TONIGHT" section with a full **Operator Command Strip** — a horizontal row of 5 live status cards with gold left borders:

- **Tonight's Priority** — rotates through 2 domain suggestions based on time of day (preserves existing priority logic). Gold lightning bolt icon. Clicking navigates to that domain.
- **Active Staff Today** — pulls from Staff Scheduling if data exists, else "— staff". Person icon.
- **Open Issues** — count of open Facilities issues from localStorage (if Facilities module has logged issues). Wrench icon. Clicking navigates to Facilities.
- **Playbooks Built** — count from Living Playbooks localStorage. Book icon. Clicking navigates to Playbooks.
- **Consultant Sessions** — count of Ask the Consultant chat sessions from localStorage. Chat icon.

Style: compact dark cards (`#1a1d2e`), gold left border 3px, muted label, white value, clickable (cursor pointer, gold glow on hover). If data is unavailable for any card, show "—" in muted gray — never show broken states.

---

## 3. Domain Tiles — Full Visual Overhaul

### Tile Design System
Each tile gets a complete redesign:

**Default (unvisited) state:**
- Background: `#1a1d2e`
- Border: 1px solid `rgba(255,255,255,0.06)`
- Border-radius: `12px`
- Icon: gold SVG, 36px, top-left
- Domain name: white bold `17px`, below icon
- Description: muted gray `13px`, line-height 1.5, max 2 lines (clamp)
- Bottom: subtle gold arrow `→` in bottom-right corner, muted gold opacity 0.4

**Hover state:**
- Border: `1px solid rgba(184,134,11,0.5)` — gold border slides in
- Background: shifts to `rgba(184,134,11,0.04)`
- Icon scales to 1.08×
- Arrow opacity goes to 1.0, shifts right 4px (CSS transform)
- Box shadow: `0 4px 24px rgba(184,134,11,0.08)`
- Transition: all 200ms ease

**"Recently visited" state** (track last 3 visited domains in localStorage):
- Small gold dot in top-right corner of tile
- Tooltip on hover: "Recently visited"

**Priority highlight state** (the 2 "Priority for Tonight" tiles):
- Gold top border 2px (`#b8860b`)
- Slightly brighter background `rgba(184,134,11,0.06)`
- Small "⚡ Tonight" badge in top-right (gold chip, 9px text)

### Icon Assignments (upgrade existing icons to match):
1. Kitchen Operations — 🍳 chef's hat / flame
2. Cost & Margin Control — 💰 dollar sign in circle
3. Staffing & Labor — 👥 people group
4. Staff Scheduling — 📅 calendar grid
5. Service Standards — ⭐ star / guest silhouette
6. HR & Documentation — 📋 clipboard
7. Training Systems — 🎓 graduation cap
8. SOPs & Scalability — 📐 ruler / layers
9. Reviews & Reputation — ⭐ star with speech bubble
10. Crisis Management — ⚠️ triangle alert
11. Facilities & Asset Protection — 🔧 wrench
12. Social Media — 📡 share/broadcast

Keep existing gold SVG icon style — just ensure correct icon per domain.

### Grid Layout
- Desktop: 4-column grid, 3 rows (12 tiles) + Consultant card below
- Tablet: 2-column grid
- Mobile: 1-column stack
- Gap: `16px`
- All tiles equal height via CSS grid `align-items: stretch`

---

## 4. Greeting Section — Upgrade

### Greeting Line
Preserve existing time-based greeting ("Good evening, Ben"). Upgrade typography:
- "Good evening," — muted gray `22px`
- "Ben" — white bold `28px` (or pull from user profile)
- Small gold crown icon to the left of "Ben" if user is Owner tier (from Pro Plan badge)

### Contextual Subtitle
Preserve existing subtitle ("Closing out the day"). Style: muted gold `#b8860b`, italic, `15px`. Currently plain gray — gold italic matches the platform's use of gold for active/priority states.

### Quick Stats Row (below greeting, above Command Strip)
A single line of 3 inline stats separated by `·` — no cards, just text:
- "**Pro Plan** · Owner · Mouton's Bistro & Bar · Member since [date if available]"
- All muted gray `13px`, "Pro Plan" in gold

---

## 5. "Priority for Tonight" — Upgrade to Dynamic Priority Engine

The current priority section shows 2 static tiles. Upgrade to a smarter dynamic priority system:

**Logic:**
- 5:00 AM – 10:00 AM → Kitchen Operations + SOPs & Scalability ("Start the day right")
- 10:00 AM – 2:00 PM → Service Standards + Staffing & Labor ("Lunch service")
- 2:00 PM – 5:00 PM → Cost & Margin Control + Training Systems ("Mid-day review")
- 5:00 PM – 9:00 PM → Kitchen Operations + Crisis Management ("Dinner service")
- 9:00 PM – 12:00 AM → SOPs & Scalability + Staff Scheduling ("Closing systems")
- 12:00 AM – 5:00 AM → HR & Documentation + Facilities & Asset Protection ("Night audit")

**Display upgrade:**
- Section label: "⚡ PRIORITY FOR TONIGHT" → upgrade to gold uppercase tracking-widest `10px` with a subtle gold underline (2px, 40px wide) — matches the section divider treatment from all other upgraded pages
- The 2 priority cards: wider cards (each ~48% width), same tile style but with gold top border 2px and "⚡ Tonight" badge
- Sub-label below each card: context-specific one-liner in muted gold italic (e.g., "Dinner service — stay ahead of the rush")

---

## 6. NEW — ALSTIG INC App Suite Banner

Add a new section between the domain grid and the Consultant bottom card, titled:

**"More Tools from ALSTIG INC"**

A horizontal banner / card strip (dark `#1a1d2e`, border `rgba(255,255,255,0.06)`, border-radius `12px`, padding `20px 24px`) containing:

**Header row:**
- Left: "🛠️ More Tools from ALSTIG INC" in white bold `16px`
- Right: "Built by operators, for operators." in muted gold italic `13px`

**4 app cards in a horizontal row (or 2×2 grid on mobile):**

Each app card:
- Background: `#0f1117`
- Border: `1px solid rgba(255,255,255,0.08)`
- Border-radius: `10px`
- Padding: `14px`
- Hover: gold border `rgba(184,134,11,0.4)`, subtle lift (`translateY(-2px)`, box-shadow)
- Transition: 200ms ease

**App 1 — The Restaurant Consultant** (current app — "current" badge)
- Icon: gold chef hat / crown SVG
- Name: "The Restaurant Consultant" in white bold `14px`
- Tagline: "Full-stack operator platform" in muted gray `12px`
- Badge: "You're here" — small gold filled chip, top-right
- CTA: No link (current app) — badge replaces CTA

**App 2 — Review Responder**
- Icon: ⭐ star with reply arrow SVG (gold)
- Name: "Review Responder" in white bold `14px`
- Tagline: "AI-powered responses to customer reviews" in muted gray `12px`
- CTA: "Open App →" gold ghost button — links to the Review Responder app URL (or App Store link — use `https://apps.apple.com` as placeholder if URL not set)

**App 3 — ChefScale**
- Icon: ⚖️ scale / measuring cup SVG (gold)
- Name: "ChefScale" in white bold `14px`
- Tagline: "Recipe scaling and food cost tracking" in muted gray `12px`
- CTA: "Open App →" gold ghost button — App Store link placeholder

**App 4 — MyCookbook**
- Icon: 📖 open book SVG (gold)
- Name: "MyCookbook" in white bold `14px`
- Tagline: "Your recipes, organized and scaled" in muted gray `12px`
- CTA: "Open App →" gold ghost button — App Store link placeholder

**Footer of banner:**
- Muted gray `12px` centered: "All apps by ALSTIG INC · restaurantai.consulting"
- "restaurantai.consulting" is a gold clickable link (opens in new tab)

**iOS behavior:** On iOS (Capacitor native), the "Open App →" buttons use `App.openUrl()` to attempt deep link first, falling back to the App Store URL. On web, they open the App Store URL in a new tab.

---

## 7. Consultant Bottom Card — Upgrade

The existing Consultant card at the bottom stays but gets a visual upgrade:

- Full-width dark card (`#1a1d2e`), gold top border 3px
- Left: gold chat bubble icon + "The Consultant" title + "Ask anything about restaurant operations. No fluff, just practical answers." subtitle
- Right: Gold "Open Consultant →" button (gradient, shimmer on hover)
- Below the button: 3 sample question chips (same style as Ask the Consultant domain chips):
  - "What's the single most important system I'm probably missing?"
  - "We're struggling with food cost. Where do I start?"
  - "Help me build a 90-day plan for a new kitchen manager."
  - Tapping a chip navigates to Ask the Consultant with that question pre-filled in the input

---

## 8. Visual Polish & Animations

- **Page entrance:** Greeting → quick stats → command strip → priority tiles → domain grid → app suite banner → consultant card — staggered fade-in with 60ms offsets per section
- **Domain tile hover:** all transitions 200ms ease (border, background, icon scale, arrow shift)
- **Priority tile entrance:** gold top border slides down from 0 height to 2px (300ms ease) on page load
- **Command strip cards:** gold left border slides in from left on first render (150ms staggered)
- **App suite banner:** slides up from 20px below with opacity 0→1 (300ms ease, 400ms delay after grid)
- **App card hover:** `translateY(-2px)` + gold border + box shadow — 200ms ease
- **"Tonight" badge:** subtle gold pulse animation (opacity 0.7→1.0→0.7, 2s loop) to draw attention
- **Greeting crown icon:** subtle shimmer on page load (matches gold button shimmer treatment)

---

## 9. Mobile Responsiveness

- Greeting: stacks cleanly, crown icon stays left of name
- Quick stats row: wraps to 2 lines on mobile
- Command strip: horizontal scroll row on mobile (5 compact cards, no wrap)
- Priority tiles: full-width stack on mobile
- Domain grid: 1-column on phone, 2-column on tablet
- App suite banner: 2×2 grid on mobile
- Consultant bottom card: stacks vertically, chips scroll horizontally

---

## Implementation Order

1. Reorder domain tiles (new sequence: Kitchen, Cost, Staffing, Scheduling, Service, HR, Training, SOPs, Reviews, Crisis, Facilities, Social)
2. Move Staff Scheduling into main grid (remove separate bottom wide card)
3. Greeting section upgrade (typography, gold subtitle, quick stats row)
4. Priority for Tonight dynamic engine (time-based logic) + visual upgrade
5. Operator Command Strip (5 live status cards)
6. Domain tile visual overhaul (hover states, visited dots, priority badges)
7. ALSTIG INC App Suite Banner (4 app cards + footer)
8. Consultant bottom card upgrade + 3 sample chips
9. All entrance animations + staggered reveals
10. Mobile responsiveness pass

Make all changes to the dashboard / landing page files only. Preserve all existing routing, greeting logic, navigation menus, user account display, and domain page navigation exactly as-is.
