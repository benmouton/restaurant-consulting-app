# Replit Prompt — Ask the Consultant Major Upgrade

Paste this directly into Replit chat:

---

I need a **major upgrade** to the **Ask the Consultant** page (the main AI chat interface). Keep the established dark theme: background `#0f1117`, gold/amber accent `#b8860b` / `#d4a017`, card backgrounds `#1a1d2e`, white primary text, muted gray secondary text. Match the visual style used across all other upgraded sections (Kitchen Operations, HR & Documentation, Staffing & Labor, Training Systems, Cost & Margin Control, Reviews & Reputation, SOPs & Scalability, Crisis Management, Facilities & Asset Protection, Social Media, Staff Scheduling).

**DO NOT CHANGE:**
- Any existing AI API call logic or Claude API integration
- The existing chat send/receive logic, message threading, or streaming behavior
- The existing conversation history or session state management
- The Principles and Frameworks accordion content (if present)
- Page routing or file structure
- Any other domain pages

---

## 1. Page Header — Session Intelligence Strip

Below the "Ask the Consultant" title, add a horizontal strip of 4 dark metric cards with gold left border:

- **Questions Asked** — count of user messages sent in the current session. Default: "0 questions"
- **Domains Covered** — count of unique domain tags applied to messages in this session (from the tag system in section 2). Default: "0 domains"
- **Avg. Response Time** — rolling average time from send to first streamed token. Default: "--"
- **Session Started** — time elapsed since first message was sent (e.g., "12 min ago"). Default: "Not started"

Style: compact dark cards (`#1a1d2e`), gold left border 3px, muted label on top, white value below. Matches the exact card style from all other upgraded sections. Values update live as the session progresses.

---

## 2. Domain Tag Selector — Quick-Context Bar

Above the chat input, add a horizontally scrollable row of domain tag chips. These give the AI context before the user types:

Chips (one per domain):
- 🔪 Kitchen Ops
- 👥 HR & Docs
- 📅 Scheduling
- 🎓 Training
- 💰 Financials
- ⭐ Reviews
- 📋 SOPs
- 🚨 Crisis
- 🏗️ Facilities
- 📱 Social Media
- 🍽️ Menu
- 📦 Inventory

**Default state:** All chips unselected (neutral gray, `#1a1d2e` background, muted border).
**Selected state:** Gold fill (`#b8860b`), white text, subtle glow.
**Behavior:** One or more chips can be selected simultaneously. Selected domains are injected into the system prompt as a context prefix: `"The operator is asking about: [Domain Name]. "` Chips deselect automatically when the user sends a message (ready for the next question). If no chip is selected, no prefix is injected (preserves existing behavior exactly).

---

## 3. Smart Prompt Starters — Context-Aware Suggestions

Below the domain tag bar, show 4 prompt starter cards in a 2×2 grid (or horizontal scroll on mobile). These populate the input field when tapped — they do NOT auto-send.

**Default starters (shown when no domain chip is selected):**
1. "What's the single most important system I'm probably missing?"
2. "We're struggling with food cost. Where do I start?"
3. "Help me write a 90-day onboarding plan for a new kitchen manager."
4. "What does a well-run Saturday night look like?"

**Dynamic starters (change when a domain chip is selected):**
- 🔪 Kitchen Ops: "What's the right prep checklist for a high-volume brunch?", "How do I reduce ticket times without sacrificing quality?", "Help me build a kitchen opening/closing checklist.", "What's causing inconsistency in my plating?"
- 👥 HR & Docs: "Write a write-up template for a no-call no-show.", "What should be in my employee handbook?", "How do I legally handle tip disputes?", "Give me a 30/60/90 review framework."
- 📅 Scheduling: "How do I build a schedule for a 3-station kitchen with 8 staff?", "What's the right labor % target for a full-service restaurant?", "Help me create a schedule template for my busiest week.", "How do I handle a last-minute call-out during service?"
- 🎓 Training: "Build me a new hire training checklist for front-of-house.", "How do I train staff to upsell without being pushy?", "What does a good 30-day onboarding look like?", "How do I train my opener so they don't need me there?"
- 💰 Financials: "What's a healthy prime cost target for a casual dining concept?", "How do I find out where my money is actually going?", "Help me build a simple weekly P&L tracker.", "What should my food cost % be?"
- ⭐ Reviews: "Help me respond to a 1-star review about slow service.", "How do I get more 5-star reviews without begging?", "A competitor is leaving us fake reviews. What do I do?", "Write a response to a glowing review that I can reuse."
- 📋 SOPs: "Build me a closing checklist for a full-service restaurant.", "What SOPs should every restaurant have before they hire their 10th employee?", "How do I write an SOP my staff will actually follow?", "Give me a template for a daily manager log."
- 🚨 Crisis: "A health inspector just walked in. What do I do right now?", "My head cook just quit 30 minutes before service. Walk me through it.", "We just got a bad health inspection score. How do I respond publicly?", "I'm overwhelmed and behind on everything. Where do I start?"
- 🏗️ Facilities: "My walk-in cooler is making a strange noise. What do I check first?", "How do I build a preventive maintenance schedule?", "What should be in my vendor contact list?", "Help me document an equipment issue for my landlord."
- 📱 Social Media: "Write 3 Instagram captions for our new weekend brunch launch.", "How often should I post on social media?", "What kind of content actually works for restaurants?", "Write a response to a negative comment on Instagram."
- 🍽️ Menu: "Help me engineer my menu for higher margins.", "How do I know which items to cut from my menu?", "What's the right number of items for a focused menu?", "How do I price a new dish?"
- 📦 Inventory: "Build me a weekly inventory count sheet template.", "How do I reduce food waste in a high-volume kitchen?", "What's the best way to do a physical inventory count?", "How do I track par levels for my top 20 items?"

**Style:** Dark cards (`#1a1d2e`), subtle gold border, rounded corners `8px`, small muted text. On tap: fills the input field and moves focus to input. Starter cards fade out while input is populated. When input is cleared, starters reappear with a gentle fade-in. Cards change instantly (no animation) when a domain chip is selected.

---

## 4. Chat Interface — Full Visual Overhaul

### Input Row
Redesign the message input as a full-width textarea (auto-expand to 4 lines max) in a dark container (`#1a1d2e`) with:
- Rounded corners `12px`
- Gold focus ring (`#b8860b`, 1.5px)
- Character counter in bottom-right corner (muted gray, only visible when > 80 characters)
- **Send button:** Gold gradient (`#b8860b` → `#d4a017`), chevron-right icon, disabled + dimmed when input is empty, shimmer animation on hover
- **Clear Chat** icon button (trash icon, muted, top-right of input container): resets chat history + session strip + domain chips with a single tap. Requires tap-hold (500ms) to trigger — prevents accidental clears. Shows a brief "Chat cleared" toast.

### User Message Bubbles
- Right-aligned
- Background: deep gold `rgba(184, 134, 11, 0.15)`, border: 1px solid `rgba(212, 160, 23, 0.3)`
- Rounded corners `12px 12px 2px 12px`
- Domain tag badge in top-left if a domain was active when sent (small gold chip, e.g. "💰 Financials")
- Timestamp in bottom-right, muted gray, small

### AI Response Bubbles
- Left-aligned
- Background: `#1a1d2e`, border: 1px solid `rgba(255,255,255,0.06)`
- Rounded corners `12px 12px 12px 2px`
- Gold animated left border (3px) during streaming — turns static white when complete
- Typing indicator: 3 gold pulsing dots shown while waiting for first token
- Timestamp + "The Consultant" label in top-left, muted
- **Action tray** below each completed AI message (appears on hover/tap on mobile):
  - 📋 **Copy** — copies message text to clipboard, brief "Copied!" toast
  - 📌 **Pin** — pins message to a collapsible "Pinned Answers" panel at the top of the chat (see section 5)
  - 🔄 **Regenerate** — re-sends the same user message to get a different response
  - 📤 **Share** — uses Web Share API (or clipboard fallback) to share the Q&A pair as plain text

### Empty State
When no messages exist, show a centered empty state:
- Gold crown or chef's hat icon (SVG, ~48px)
- Headline: "Ask Anything. Get Operator-Grade Answers."
- Sub-text: "Built by operators, for operators. No generic advice."
- The domain chips and prompt starters are visible in this state

---

## 5. Pinned Answers Panel

When the user pins an AI response (via the action tray), it appears in a collapsible panel at the top of the chat area:

- Label: "📌 Pinned Answers" with a count badge, e.g. "📌 Pinned Answers (2)"
- Collapsed by default once items are pinned (chevron to expand)
- Each pinned item shows: first 2 lines of AI response, domain tag if present, an ✕ to unpin
- Background: `#1a1d2e`, gold left border 3px, no scroll within the pin panel (max 4 items — oldest unpins automatically if user adds a 5th)
- On tap of a pinned item: scrolls the main chat to that message and briefly highlights it with a gold glow pulse

---

## 6. Conversation History Sidebar (Collapsible)

Add a collapsible left sidebar (or bottom drawer on mobile) for session history:

- **Trigger:** Clock icon button in the page header
- **Label:** "Past Conversations"
- Shows the last 10 conversation sessions, each with:
  - First user message (truncated to 60 chars)
  - Domain tags present in that session (up to 3 chip icons)
  - Date/time of session
  - Message count
- On tap: loads that session's messages back into the chat (read-only, with a "Resume" button that makes it editable)
- Sessions stored in localStorage with a cap of 10 (oldest purged)
- **Empty state:** "Your past conversations will appear here."

---

## 7. Suggested Follow-Ups

After each completed AI response, generate 3 follow-up question chips below the action tray. These are not AI-generated — they are pre-mapped based on the active domain tag:

**No domain / general:**
- "Can you give me a step-by-step version of that?"
- "What's the most common mistake operators make here?"
- "How would you prioritize this if I'm short-staffed?"

**Per-domain follow-up banks (3 chips each — rotate on regenerate):**
- 💰 Financials: "What benchmarks should I be hitting?", "How do I track this weekly?", "What would this look like in a real restaurant?"
- 🚨 Crisis: "What do I say to my staff after this?", "How do I prevent this from happening again?", "Should I document this and how?"
- 👥 HR & Docs: "Can you make this into a template?", "What are the legal risks I should know about?", "How do I deliver this message to my team?"
- 🔪 Kitchen Ops: "How do I train my team on this?", "What does this look like on a busy Friday?", "How long should this take to implement?"
- *(All other domains get the general 3 as fallback)*

**Style:** Small gold-outlined chips, muted text, tap to populate input. Appear with a 200ms staggered fade-in after the AI response completes. Disappear when the user starts typing.

---

## 8. Response Mode Toggle

Add a small toggle in the input row (icon buttons, not a visible dropdown):

- ⚡ **Quick Answer** — short, tactical, 1-3 sentences max. System prompt suffix: `"Be concise. Give a direct 1-3 sentence answer. No preamble."`
- 📖 **Full Breakdown** — detailed, structured, with headers and steps. System prompt suffix: `"Give a thorough, structured response with clear sections and actionable steps."`
- ✅ **Give Me a Checklist** — response is a checklist only. System prompt suffix: `"Respond ONLY with a numbered or bulleted checklist. No intro, no outro."`

**Default:** Full Breakdown (existing behavior).
**Style:** 3 small icon buttons right of the domain tag row. Active mode gets a gold underline. Tooltip on hover shows the mode name. Mode persists until changed.

---

## 9. Visual Polish & Animations

- **Staggered entrance:** Page header strip → domain chips → starter cards → empty state fade in with 80ms offsets
- **Chip select:** Gold fill animates in with 150ms ease-in, subtle scale-up (1.03×) on tap
- **Starter card tap:** Brief press-down scale (0.97×) before input populates
- **Typing indicator:** 3 dots pulse in sequence (gold, 400ms cycle)
- **Streaming text:** Characters appear with no additional animation — rely on streaming speed for feel
- **Send button shimmer:** Diagonal light sweep on hover (CSS keyframe, matches gold button treatment from other sections)
- **Pin flash:** Pinned message gets a 600ms gold glow pulse in the chat
- **Toast notifications:** Bottom-center, dark background, gold left border, auto-dismiss 2.5s
- **Pinned panel expand/collapse:** 200ms ease slide
- **Sidebar open/close:** 250ms slide-in from left

---

## 10. Mobile Responsiveness

- Domain tag row: horizontal scroll, no line wrap
- Starter cards: 2-column grid on tablet, 1-column stack on phone
- Pinned panel: full-width below header strip
- History sidebar: becomes bottom sheet drawer, 60% viewport height, drag-to-dismiss
- Action tray: always visible below AI bubbles on mobile (no hover dependency)
- Response mode toggle: collapses to a single icon (mode indicator only) on phone, tapping cycles through modes
- Input textarea: max 3 lines on mobile

---

## Implementation Order

1. Page header Session Intelligence strip (4 metric cards)
2. Domain tag chip selector with system prompt injection
3. Dynamic prompt starters 2×2 grid with domain-aware content
4. User bubble redesign (gold tint, domain badge, timestamp)
5. AI bubble redesign (gold streaming border, typing indicator)
6. Action tray (Copy, Pin, Regenerate, Share)
7. Pinned Answers panel
8. Response mode toggle (⚡ / 📖 / ✅)
9. Suggested follow-up chips
10. Conversation history sidebar / bottom drawer
11. Empty state redesign
12. Input row redesign (textarea, send button shimmer, tap-hold clear)
13. All animations + transitions
14. Mobile responsiveness pass

Make all changes to the Ask the Consultant page files only. Preserve all existing Claude API call logic, streaming behavior, conversation state, and accordion content exactly as-is.
