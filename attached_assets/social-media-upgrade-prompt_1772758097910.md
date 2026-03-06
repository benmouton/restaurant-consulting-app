# Replit Prompt — Social Media Major Upgrade

Paste this directly into Replit chat:

---

I need a **major upgrade** to the **Social Media** page. Keep the established dark theme: background `#0f1117`, gold/amber accent `#b8860b` / `#d4a017`, card backgrounds `#1a1d2e`, white primary text, muted gray secondary text. Match the visual style used across all other upgraded sections (Kitchen Operations, HR & Documentation, Staffing & Labor, Training Systems, Cost & Margin Control, Reviews & Reputation, SOPs & Scalability, Crisis Management, Facilities & Asset Protection).

**DO NOT CHANGE — CRITICAL:**
- ANY existing API keys, OAuth tokens, secret keys, or social channel credentials
- ALL existing social media posting logic (Publish Now, Schedule, channel connections)
- The Facebook/Instagram OAuth connection flow
- The Google Business Profile API integration
- The Twitter/X API integration
- The Buff.ly link generation or any URL shortening logic
- The channel connection status detection (active badges)
- ANY backend posting endpoints or server-side posting code
- The 6-tab structure: Create / Schedule / Channels / Holidays / Sent / Voice
- The Post Generator panel and its Generate Post button logic
- The Post Preview rendering logic
- The Principles and Frameworks accordion content
- Page routing or file structure
- Any other domain pages

---

## 1. Page Header — Social Performance Strip

Below the "Social Media" title and subtitle, add a horizontal strip of 5 dark metric cards with gold left border:

- **Posts This Month** — count of sent posts in current calendar month from Sent tab data. Default: "0 posts"
- **Channels Active** — count of channels with "active" status. If < 4, show amber "X of 4 connected". Default: "--"
- **Scheduled** — count of future-dated scheduled posts. Default: "0 scheduled"
- **Last Post** — snippet of last post content (first 30 chars) + time ago. Default: "No posts yet"
- **Best Time Today** — static or calculated suggested post time for today (e.g., "4:30 PM"). Pull from brand voice settings logic if available, otherwise show "4:30 PM" as default.

Style: compact dark cards (`#1a1d2e`), gold left border 3px, muted label above, bold white value below. 5-column grid on desktop, horizontal scroll on mobile.

---

## 2. Create Tab — Visual Upgrades (UI ONLY — no logic changes)

### Composer Card
- Add a slow-pulse gold shimmer/glow animation on the composer card border (same treatment from other upgraded pages): `box-shadow: 0 0 0 1px rgba(184,134,11,0.15)` animating to `0 0 0 2px rgba(212,160,23,0.45)` with a 3s ease-in-out loop
- Character count below textarea: show live count with platform-specific limits. Warn with amber at 80% of limit, red at 100%:
  - Instagram: 2,200 chars
  - Facebook: 63,206 chars
  - X/Twitter: 280 chars
  - Google Business: 1,500 chars
  - Show the most restrictive limit active based on which channels are selected
- Channel selector avatars: add a subtle gold ring on selected channels (1px gold border), remove ring on deselected
- Drag-and-drop image zone: restyle with a dashed gold border on hover, show file name and size after upload
- "Select All" link: restyle as a small gold pill button

### Action Buttons
- **Post Assistant** button: keep gold fill, add sparkle icon pulse on hover
- **Publish Now** button: keep dark fill with gold border, add a subtle shimmer sweep on hover
- **Schedule** button: keep outline style, add clock icon tick animation on hover (CSS rotate 1 step)

---

## 3. Post Generator Panel — Elevated Styling + New Fields

**Keep all existing generator logic exactly as-is. UI upgrades only:**

### Panel Header
- Add thin gold top border to Post Generator card (2px solid `#b8860b`)
- "Post Generator" label: style with gold sparkle icon (already present) + slightly larger label text (16px, font-weight 600)
- Close X button: restyle as a small ghost circle button with hover state

### Field Upgrades
- All dropdowns: restyle with `#0f1117` background, gold bottom border on focus, subtle chevron in gold
- All text inputs: same — `#0f1117` bg, gold bottom border on focus
- Date field: add a subtle calendar icon in gold

### Add 2 New Optional Fields (append to existing form before Generate button):
1. **Promotion / Discount** (text input, optional) — placeholder: "e.g., 15% off, buy one get one, free dessert" — label: "Promotion / Discount". Inject into AI prompt: `Promotion details (if any): [value]`
2. **Call to Action** dropdown (optional) — options: "Reserve a table", "Order online", "Visit us today", "Call now", "Limited time only", "Tag a friend", "Share this post". Label: "Call to Action". Inject into AI prompt: `Preferred CTA: [selected value]`

These two fields should be placed in a 2-column grid row above Additional Details.

### Holiday Chips
- Upcoming holiday chips at bottom of panel: restyle with gold border, `#1a1d2e` bg, amber text. On click, auto-populate Event/Item Name field AND set Post Type to "Holiday / National Day" — then scroll to the field

### Generate Post Button
- Restyle: full-width, `#b8860b` background, white text, 14px font-weight 700 uppercase tracking, subtle shimmer sweep animation on hover (same as other pages)
- Add loading state: spinner + "Generating..." text while API call is in progress

---

## 4. Post Preview Panel — Elevated Styling

**Keep all existing preview rendering logic exactly as-is.**

- Preview card: add gold top border (2px solid `#b8860b`), slightly elevated shadow
- "Post Preview" header: gold eye icon + slightly bolder label
- When post is generated, show:
  - Platform badge in top-right of preview (e.g., "Instagram" or first selected channel)
  - Generated hashtags section: restyle hashtag pills with `#1a1d2e` bg, gold text `#d4a017`, rounded-full, small font
  - **Copy Caption** and **Hashtags** buttons: restyle as ghost pill buttons with gold border and gold text, hover fills gold
  - **Short Caption** box: restyle with `#0f1117` bg, gold left border 2px, italic gray text
  - **Best time** badge: add clock icon, amber text, small pill style
  - Add a **"Copy Short Caption"** icon button next to the Short Caption label (already exists in some views — make sure it's consistently present)

---

## 5. Schedule Tab — Upgrades

**Keep all existing schedule/calendar logic exactly as-is. Visual upgrades only.**

### Calendar Header
- Week/List toggle buttons: restyle as pill toggle — active state gets gold bg and dark text, inactive gets dark bg and muted text
- Today button: restyle as small gold outline pill button
- Week label (e.g., "Mar 1–Mar 7, 2026"): slightly larger, white, font-weight 600
- "X posts this week" count: restyle as small amber pill badge

### Calendar Grid
- Today column highlight: keep gold/amber header, add subtle `rgba(184,134,11,0.08)` column background to distinguish today
- Scheduled post chips: restyle with rounded corners, channel icon(s) visible, truncate text gracefully
- Empty day cells: show a faint dashed border with a "+" add icon on hover — clicking opens the Create tab with today's date pre-filled
- "+X more" overflow badge: restyle as a small amber pill

### List View
- Restyle list items as `#1a1d2e` cards with channel icon, post snippet, scheduled time, and status badge
- Status badges: "scheduled" = gold outline, "posted" = green fill, "failed" = red fill — consistent with Sent tab

---

## 6. Channels Tab — Upgrades

**Keep all OAuth and API connection logic completely untouched.**

### Connect Buttons Row
- Restyle 4 connect buttons (Facebook/Instagram, Google Business, LinkedIn, X) as dark cards with platform icon, "Connected" green badge or "Connect" gold button
- "Coming Soon" badge for Nextdoor: restyle as muted pill

### Connected Channels List
- Each channel row: restyle as `#1a1d2e` card with channel avatar, name, type label, active/inactive badge, and reconnect icon
- Active badge: green pill with dot
- Reconnect icon: restyle as gold circular arrow button
- "4/4 Channels connected" label: restyle as amber success pill

---

## 7. Holidays Tab — Upgrades

**Keep all existing holiday data and Draft Post logic exactly as-is.**

- Tab title "Upcoming Holidays": restyle header with gold sparkle icon + larger text
- Holiday card: restyle as `#1a1d2e` card with subtle gold left border
  - Date badge: amber pill showing "Tomorrow", "In X days"
  - Category tag ("food", "community"): small colored pill — food = amber, community = green
  - Suggestion text: muted italic
  - Hashtag chips: gold-bordered pill tags
  - **Draft Post** button: restyle as gold outline pill button, hover fills gold
  - On "Draft Post" click: pre-populate the Create tab Post Generator with Post Type = "Holiday / National Day", Event/Item Name = holiday name, and Date = holiday date. Then scroll to and open the Post Generator panel.

---

## 8. Sent Tab — Upgrades

**Keep all existing sent post data and Reuse logic exactly as-is.**

### Header Stats Row
- "This Month: 14 posts" and channel breakdown (google_business: 2, x: 9, etc.): restyle as a row of small colored pill badges below a bolder month header
- Add a subtle trend arrow (↑ or →) next to post count if > 0

### Post List Items
- Restyle each item as a `#1a1d2e` card with:
  - Post snippet (truncated, 2 lines max)
  - Date badge (amber pill)
  - Status badge: **posted** = green fill, **failed** = red fill with `!` icon, **scheduled** = gold outline
  - **Reuse** button: restyle as small ghost pill button with gold border — on click, copy content to Create tab composer
- For "failed" posts: add a small inline "Why did this fail?" expandable note if error info is available, otherwise show "Post failed — check channel connection"
- For "scheduled" posts: add scheduled datetime badge

---

## 9. Voice Tab — Upgrades

**Keep all existing Brand Voice save logic and localStorage exactly as-is.**

### Card Styling
- Add slow-pulse gold shimmer border animation (same as composer card)
- "Brand Voice Settings" header: slightly larger, bolder

### Field Upgrades
- Restaurant Name and Location inputs: `#0f1117` bg, gold bottom border on focus, white text
- Voice Adjectives chips: selected = gold bg + dark text, unselected = `#1a1d2e` bg + muted text + gold border on hover
- Default CTA dropdown: styled to match other dropdowns
- Emoji Level dropdown: same
- Hashtag Style dropdown: same
- Never Say input: same input style, add a small info tooltip: "These words will be excluded from all AI-generated posts"

### Save Button
- Restyle: full-width, `#b8860b` bg, white text, font-weight 700, shimmer sweep hover animation
- Add save confirmation: on success, flash the button green for 1s with a checkmark icon, then revert

### Add: Voice Preview Section
Below the save button, add a new collapsible section: **"Preview Your Voice"**
- A single text input: "Describe today's special or event in one sentence"
- A small "Generate Sample Post" button (gold outline)
- On click: call the Claude API with the brand voice settings as the system prompt to generate a 2-3 sentence sample post in the configured voice
- Display result in a `#0f1117` card with gold left border
- This preview does NOT post anything — it's a voice testing tool only

---

## 10. Loading States

On the Create tab when "Generate Post" is clicked:
- Show a shimmer skeleton in the Post Preview panel while loading (3 gray animated bars representing title, body, hashtags)
- Disable the Generate Post button during loading to prevent double-submission
- Show spinner + "Generating your post..." text in the button

---

## 11. Cross-Tab Integration

1. **Holiday chip → Create tab**: clicking a holiday chip in the Post Generator or Holidays tab pre-fills Post Type = "Holiday / National Day" and Event/Item Name = holiday name
2. **Schedule empty cell click → Create tab**: clicking an empty calendar day opens Create tab with that date pre-set in the Post Generator date field
3. **Sent "Reuse" button → Create tab**: clicking Reuse on a sent post copies the content into the composer textarea and switches to Create tab
4. **Holidays "Draft Post" → Create tab**: clicking Draft Post opens Create tab with Post Generator pre-filled and panel open
5. **Voice save → Post Generator**: after saving brand voice, the Post Generator style/tone defaults update to reflect the saved voice adjectives

---

## 12. Mobile Responsiveness

- Header metric strip: horizontal scroll on mobile (5 cards, don't wrap)
- Create tab: composer full width, Post Preview collapses below composer on mobile (stacked layout)
- Post Generator panel: full width, all fields single column on mobile
- Schedule calendar: on mobile, show List View by default instead of Week View
- Channel cards: single column on mobile
- Holiday cards: single column on mobile
- Sent items: single column on mobile
- Voice tab: single column on mobile
- All buttons: minimum 44px touch target height

---

## Implementation Order

1. Page header performance strip (5 metric cards)
2. Composer card gold shimmer border animation
3. Character count with platform-specific limits + channel selector gold rings
4. Post Generator: 2 new fields (Promotion + CTA), holiday chip restyle + click behavior
5. Post Preview panel: hashtag pills, button restyle, Short Caption polish, Best Time badge
6. Voice Tab: full restyle + Voice Preview section (Claude API call — UI only, no posting)
7. Schedule Tab: calendar visual upgrades + empty cell click → Create tab
8. Channels Tab: connected channel card restyle (no OAuth changes)
9. Holidays Tab: card restyle + Draft Post → Create tab pre-fill
10. Sent Tab: card restyle + failed post note + Reuse → Create tab
11. Cross-tab integration (all 5 connections)
12. Loading shimmer skeleton in Post Preview during generation
13. Generate Post button loading state + disabled state during API call
14. Principles/Frameworks accordion — gold chevron polish
15. Mobile responsiveness pass

Make all changes to the Social Media page files only. Preserve ALL existing API keys, OAuth flows, posting logic, channel connection code, and accordion content exactly as-is.
