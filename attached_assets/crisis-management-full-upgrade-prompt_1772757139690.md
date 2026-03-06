# Replit Prompt — Crisis Management Full Upgrade (Complete Edition)

Paste this directly into Replit chat:

---

I need a **complete upgrade** to the **Crisis Management** page. Keep the established dark theme: background `#0f1117`, gold/amber accent `#b8860b` / `#d4a017`, card backgrounds `#1a1d2e`, white primary text, muted gray secondary text. Match the visual style used across all other upgraded sections.

**DO NOT CHANGE:**
- Any existing AI API call logic or the Claude API integration in the Crisis Command Center
- The 8 crisis scenario types, 3-level severity triage, First 60 Seconds steps
- The Principles and Frameworks accordion content
- Page routing or file structure
- Any other domain pages

---

## 1. Page Header — Crisis Readiness Strip

Below the "Crisis Management" title and subtitle, add a horizontal strip of 4 dark metric cards with gold left border:

- **Crisis Sessions Run** — count of completed crisis sessions stored in localStorage. Default: "0 sessions"
- **Most Common Crisis** — most frequently used scenario type from past sessions. Default: "No data yet"
- **Average Session Length** — average active time across completed sessions. Default: "--"
- **Last Crisis** — scenario type + severity + how long ago (e.g., "Kitchen backup · Critical · 3 days ago"). Default: "No sessions yet"

Style: compact dark cards (`#1a1d2e`), gold left border 3px, muted label text above, larger bold value below. Horizontal scroll on mobile.

---

## 2. Pre-Session Context Step (NEW — Insert Before Severity Selection)

After selecting a scenario but BEFORE the severity triage, add a fast context capture step. This feeds the AI so its advice is specific to their actual situation, not generic.

Show a compact card titled **"Quick Context"** with subtitle: *"30 seconds now saves 10 minutes of bad advice."*

Three fields displayed as an inline row (stacks to column on mobile):

- **Cover count right now** — number input, placeholder "How many covers mid-service?" (e.g., 60)
- **Staff on floor** — number input, placeholder "Total staff currently working" (e.g., 8)
- **Time of service** — dropdown: Breakfast / Lunch / Dinner / Late Night / Off-Hours / Pre-Open

Below those: a single **"Continue →"** button (gold fill).

These 3 values are stored in the session object and injected into every AI prompt during the session:

```
Context: {coverCount} covers mid-service, {staffCount} staff on floor, {timeOfService} service.
```

If the operator skips (taps "Skip for now" in small muted text below Continue), context fields are omitted from the prompt — no friction.

**Special case for "Owner or manager overwhelmed":** Skip this step entirely for that scenario. Go straight to severity. The operator is already overwhelmed — don't ask them 3 more questions.

---

## 3. Crisis Command Center Card — Elevated Styling

- Replace the flat dark red/maroon header background with a gradient: `linear-gradient(135deg, #1a0a0a 0%, #2d0f0f 100%)` with a subtle animated red pulse border `rgba(239, 68, 68, 0.3)` (slow 3s glow animation — calm, not alarming).
- The Crisis Command Center title icon (shield): `filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.5))`
- When session is ACTIVE, card border pulse intensifies to `rgba(239, 68, 68, 0.6)`.

---

## 4. Scenario Selection Grid — Color-Coded by Type

Assign each scenario a category accent color:

| Scenario | Accent Color |
|---|---|
| Kitchen backed up / ticket times blown | Amber `#f59e0b` |
| Guests angry / multiple complaints | Orange `#f97316` |
| Staff conflict or panic | Yellow `#eab308` |
| Walkout or call-off mid-shift | Red-orange `#ef4444` |
| POS / system failure | Blue `#3b82f6` |
| Owner or manager overwhelmed | Purple `#8b5cf6` |
| Health inspector / surprise visit | Teal `#14b8a6` |
| Food safety / contamination issue | Red `#dc2626` |

Button states:
- Default: `#1a1d2e` bg, 1px border at 30% accent opacity
- Hover: 10% accent bg, 70% border opacity
- Selected: 15% accent bg, full-opacity border

"Something else not listed above" → dashed border, full width, muted text.

---

## 5. Severity Triage — Styled Cards

- **Manageable**: left border `#eab308`, subtle yellow glow on hover
- **Serious**: left border `#f97316`, subtle orange glow on hover
- **Critical**: left border `#dc2626`, pulsing red glow animation, small animated red dot in label

Each card: `#1a1d2e` bg, white title, muted description, colored circle badge replacing dot.

---

## 6. Crisis Phase Tracker (NEW — Replaces Simple Timer)

Once the session starts, show a **4-stage phase progress bar** directly below the session header, above the First 60 Seconds panel.

Stages:
1. **Onset** — "Crisis identified"
2. **Active** — "Managing now"
3. **Stabilizing** — "Getting under control"
4. **Recovery** — "Back on track"

Visual design:
- 4 connected nodes joined by a horizontal line
- Active stage: filled circle in scenario accent color with label in white
- Completed stages: filled circle with a checkmark, muted label
- Future stages: unfilled circle, muted gray label
- The connecting line fills with accent color as stages advance

Controls:
- "Advance Phase →" button (small, outlined, accent color) to the right of the tracker — operator taps when situation changes
- On phase advance, the AI chat automatically receives a context message: *"Update: situation has moved to [phase]. Adjust your guidance accordingly."* This is sent silently (not shown as a user message bubble — show it as a small muted system note like "Phase advanced to Stabilizing")
- Tapping "Advance Phase" when already at Recovery triggers the End Session flow

**Effect on AI behavior:** Each phase should modify the AI system prompt tone:
- Onset: "Be direct. Give immediate tactical steps only."
- Active: "They're managing it. Reinforce actions, catch anything missed."
- Stabilizing: "Crisis is calming. Shift to damage control and communication."
- Recovery: "Crisis is over. Help them debrief and communicate to guests/staff."

---

## 7. Active Session Header

- Scenario badge: colored chip in scenario accent color
- Severity badge: yellow/orange/red chip — Critical gets pulse animation
- Live monospace timer in scenario accent color: `00:00:00`
- Current phase label: small muted text e.g., "Active Phase"
- "End Session" button: red outline, hover fills red

---

## 8. First 60 Seconds — Tap-to-Complete

- Each step: circle number badge in red, white text
- Tap to complete: filled checkmark + strikethrough text
- All 3 complete: brief green flash → muted "First 60 seconds complete ✓"

---

## 9. Dynamic Quick-Reply Buttons (NEW — Scenario-Specific)

Replace the static 4 buttons with **scenario-specific quick replies** that change based on the active scenario AND current phase.

Define a `quickReplies` map. Examples:

**Kitchen backed up:**
- Onset/Active: "Things are getting worse" | "It's calming down" | "Need a guest script" | "86 something now"
- Stabilizing: "How do I recover ticket times?" | "What do I tell guests?" | "Staff is stressed — help"
- Recovery: "How do I debrief the team?" | "What changes tomorrow?"

**Health inspector / surprise visit:**
- All phases: "They're asking about temps" | "They found a violation" | "What do I say to them?" | "It went fine — now what?"

**Food safety / contamination:**
- All phases: "Need to identify affected guests" | "Should I close tonight?" | "Writing an incident report" | "Notifying the health dept"

**POS / system failure:**
- All phases: "Going manual now" | "Guests are frustrated" | "System came back — now what?" | "Need a refund script"

**Owner or manager overwhelmed:**
- All phases: "I don't know where to start" | "Everything feels urgent" | "I need to delegate" | "Help me breathe and prioritize"

**Staff conflict or panic:**
- All phases: "It's getting physical" | "One person is escalating" | "Team is watching — what do I say?" | "After service conversation"

**Walkout / call-off:**
- All phases: "I'm short 2 people mid-service" | "Kitchen can't cover" | "Do I call someone in?" | "Talking to the team after"

**Guests angry / multiple complaints:**
- All phases: "Guest wants to speak to owner" | "Table walking out" | "Need a comp script" | "Review is being written now"

**Something else / default fallback:**
- "Things are getting worse" | "It's starting to calm down" | "Did it. Now what?" | "Need a guest script"

Style: pill-shaped `border-radius: 20px`, outlined in scenario accent color at 50%, hover fills to 20% accent bg, press animates `scale(0.97)`.

---

## 10. Chat Interface Upgrades

- User messages: right-aligned, `#dc2626` bg, `border-radius: 18px 18px 4px 18px`
- AI messages: left-aligned, `#1a1d2e` bg, left border in scenario accent color
- Phase system notes: centered, small muted gray text, no bubble — just inline text like "— Phase advanced to Stabilizing —"
- Typing indicator: 3 animated dots in scenario accent color
- Timestamps: muted gray below each message

**Markdown parsing in the render function (not the prompt):**
- `**text**` → `<strong>`
- `1. 2. 3.` numbered lists → styled step cards with colored number badges
- ` - ` bullets → indented muted sub-items
- Lines like `**Immediate Actions:**` → section label in scenario accent color

---

## 11. "Share Briefing" Button (NEW)

In the active session header, add a **"Share Briefing"** button (small, outlined, gold) next to "End Session".

Tapping it generates and copies to clipboard a plain-text handoff summary:

```
CRISIS BRIEFING — [Time]
Scenario: Kitchen backed up / ticket times blown
Severity: Critical
Phase: Active (8 min in)
Staff: 6 on floor | Covers: 65 | Service: Dinner

Actions taken:
• Called all-hands to the line
• 86'd items over 15 min ticket time
• Communicated wait times to FOH

Status: Stabilizing. Monitor expo line.
```

The actions taken section is populated from:
1. First 60 Seconds steps that were tapped-complete
2. Any quick reply buttons that were tapped (logged silently)

Show a brief "Copied to clipboard ✓" toast in gold after copy. This is a native share sheet on iOS (use Capacitor Share plugin if available, fallback to clipboard).

---

## 12. "Owner Overwhelmed" Special Mode (NEW)

When "Owner or manager overwhelmed" is selected, skip the context step and modify the entire flow:

**Severity step:** Replace the 3 options with a single prompt card:
> *"I've got you. Before we do anything else — what's the one thing that absolutely cannot wait right now?"*
> 
> Free-text input. Large textarea. Placeholder: "Type it out. Just one thing."
> 
> Submit button: "Start Here →" (purple fill, `#8b5cf6`)

**Session AI system prompt for this scenario:**
```
This operator is overwhelmed. Do NOT give them a long list. Give them ONE action at a time. 
Ask what's most urgent. When they answer, give them the single next step only. 
After each step, ask: "Done. What's next on your mind?" 
Keep responses under 4 sentences. Be calm, steady, and direct. 
Do not use bullet points or numbered lists. Write like a trusted partner talking them through it.
```

**UI changes for this scenario only:**
- Card accent color: purple `#8b5cf6` throughout
- Phase tracker: hidden (doesn't apply)
- Quick replies: replace with "One thing at a time" | "I need to delegate this" | "I need a minute" | "I'm okay now"
- Timer: still runs, but show as "Time in session" not a crisis clock
- Chat bubbles: AI response left border in purple

---

## 13. Session Summary Modal

On "End Session" tap, show a modal:

```
┌────────────────────────────────────────┐
│  Crisis Session Complete               │
│  ───────────────────────────────────── │
│  Scenario:  Kitchen backed up          │
│  Severity:  Critical                   │
│  Duration:  14 minutes                 │
│  Final Phase: Stabilizing              │
│  Messages:  7 exchanges                │
│  ───────────────────────────────────── │
│  [ Save & Run Debrief ] [ Save Only ]  │
│                [ Close ]               │
└────────────────────────────────────────┘
```

- "Save & Run Debrief" → gold fill, saves session + opens Debrief Mode (section 14 below)
- "Save Only" → saves session metadata to localStorage, closes
- "Close" → dismisses without saving

Modal: `#1a1d2e` card, gold border, `backdrop-blur` overlay, `border-radius: 12px`

---

## 14. Post-Crisis Debrief Mode (NEW)

Accessible two ways: via "Save & Run Debrief" in the Summary Modal, or via a "Run Debrief" button on any saved session in the History Log.

Debrief opens as a new step within the Command Center card (replaces the chat view):

**Header:** "Post-Crisis Debrief" | scenario chip | severity chip | muted session date

**4 questions, one per card, answered in sequence:**

1. **What caused it?**  
   Subtitle: *"Be honest. What was the real root cause — not just what went wrong on the surface?"*  
   Free-text textarea.

2. **What worked?**  
   Subtitle: *"What did you or your team do that actually helped?"*  
   Free-text textarea.

3. **What didn't work?**  
   Subtitle: *"What made it worse, or what would you do differently?"*  
   Free-text textarea.

4. **What changes because of this?**  
   Subtitle: *"One SOP, one training change, or one operational shift. What's the fix?"*  
   Free-text textarea.

Navigation: "Next →" button advances through questions. "Back" link on questions 2–4. Progress indicator: "2 of 4" in muted text.

**On question 4 submit:** Call the Claude API with this prompt:

```
You are helping a restaurant operator debrief after a crisis. 
Synthesize their answers into a concise After Action Report.

Scenario: {scenario}
Severity: {severity}

What caused it: {answer1}
What worked: {answer2}
What didn't work: {answer3}
What changes: {answer4}

Write a 3-paragraph After Action Report:
Paragraph 1: What happened and why (root cause)
Paragraph 2: What worked and what didn't
Paragraph 3: The single most important operational change to prevent this or handle it better next time

Be direct. Use plain language. Write for a restaurant operator, not a consultant.
Format as plain paragraphs. No headers, no bullets.
```

**After Action Report display:**
- Show in a styled card with a gold left border
- Title: "After Action Report" in white, date in muted gray
- 3 paragraphs with clear spacing
- Two action buttons below:
  - "Copy Report" — copies plain text to clipboard
  - "Save to Session" — attaches report to the session log entry in localStorage
- Small muted text: "Consider sharing this with your management team."

Debrief navigation: "← Back to Session Log" link at top.

---

## 15. Session History Log

Collapsible section below the Command Center card (above Principles accordion):

- Collapsed by default, gold chevron toggle, same style as Principles/Frameworks
- Shows up to 10 most recent sessions from localStorage
- Each session row: scenario chip (accent-colored) | severity badge | date | duration | phase reached | "Debrief ✓" tag if debrief was completed
- "Run Debrief" link on sessions without a completed debrief
- "View Report" link on sessions with a saved After Action Report
- Empty state: *"No sessions saved yet. Complete a session and tap Save to begin building your crisis history."*

---

## 16. "Something Else" Free-Text Flow

When "Something else not listed above" is selected:

1. Show input step: "Describe what's happening" — large textarea, placeholder: *"Be specific. What's happening right now, and what's your biggest concern?"*
2. "Assess This Crisis →" button (gold fill)
3. Submitting runs a quick AI call to classify the crisis type and suggest severity, then goes to severity selection with the AI's recommendation pre-selected (operator can override)

---

## 17. Color & Design Reference

```
Background:          #0f1117
Card background:     #1a1d2e
Input background:    #111827
Input border:        #374151
Input focus ring:    #d4a017
Gold accent:         #b8860b / #d4a017
Text primary:        #ffffff
Text muted:          #9ca3af
Crisis red:          #dc2626 / #ef4444
On target green:     #22c55e
Warning amber:       #f59e0b
Serious orange:      #f97316
Overwhelmed purple:  #8b5cf6
Border radius:       12px (cards), 8px (inputs), 20px (pills)
```

---

## 18. Mobile Responsiveness

- Header metric strip: horizontal scroll on mobile
- Scenario grid: 1 column < 480px, 2 columns above
- Context step: fields stack to single column on mobile
- Phase tracker: condensed, smaller node circles, labels below on mobile
- Quick-reply buttons: 2×2 grid on mobile, 4-in-a-row on desktop
- Session summary modal: full-screen on mobile, centered card on desktop
- Debrief questions: full width, generous padding
- All touch targets: minimum 44px height

---

## Implementation Order

1. Page header Crisis Readiness Strip
2. Command Center card border glow animation
3. Scenario grid: color-coded accent system
4. Pre-session context capture step (skip for Owner overwhelmed)
5. Severity triage: styled cards with color/glow
6. Crisis Phase Tracker with 4 stages + advance button
7. Session header: scenario/severity/phase chips + live timer
8. First 60 Seconds: tap-to-complete
9. Dynamic quick-reply buttons (scenario + phase aware)
10. Chat: markdown parsing + typing indicator + phase system notes
11. "Share Briefing" button + clipboard/share functionality
12. "Owner Overwhelmed" special mode (modified AI prompt + single-question flow + purple theming)
13. Session Summary Modal with "Save & Run Debrief" option
14. Post-Crisis Debrief Mode (4 questions → Claude API → After Action Report)
15. Session History Log collapsible section with Debrief status
16. "Something else" → AI pre-classification flow
17. Principles/Frameworks accordion gold chevron polish
18. Mobile responsiveness pass

Make all changes to the Crisis Management page files only. Preserve all existing AI API logic, crisis scenario data, and accordion content exactly as-is.
