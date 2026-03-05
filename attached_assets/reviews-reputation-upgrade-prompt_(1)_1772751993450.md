# Replit Prompt — Reviews & Reputation Major Upgrade

Paste this directly into Replit chat:

---

I need a **major upgrade** to the **Reviews & Reputation** page. Keep the established dark theme: background `#0f1117`, gold/amber accent `#b8860b` / `#d4a017`, card backgrounds `#1a1d2e`, white primary text, muted gray secondary text. Match the visual style used across all other upgraded sections (Kitchen Operations, HR & Documentation, Staffing & Labor, Training Systems, Cost & Margin Control).

**DO NOT CHANGE:**
- Any existing AI API call logic or the Claude API integration
- The Response Templates section and its data
- The Principles and Frameworks accordion content
- Page routing or file structure
- Any other domain pages

---

## 1. CRITICAL FIX — Auto-Extract Customer Name from Review

When a response is generated, the current output shows `Hi [Customer's Name],` as a literal placeholder. Fix this immediately:

In the AI system prompt for response generation, add this instruction:

```
Read the review text carefully. If the reviewer's name is visible (commonly shown as "- John" at the end, or the review is signed, or the platform shows it like "Bobby D." or "Sarah M."), extract the first name only and use it in the greeting. If no name can be identified, use "Hi there," instead of "Hi [Customer's Name],". Never output a literal bracket placeholder.
```

Also update the user-facing prompt sent to the API to include: `Reviewer name if visible: [parse from review text or "unknown"]`

---

## 2. CRITICAL FIX — Image OCR via Apple Vision API (iOS Native)

The current screenshot upload calls an external OCR service. Replace this with **Apple Vision framework** via Capacitor to perform on-device OCR — zero API cost, faster, works offline.

### Implementation:

Add a Capacitor plugin call for Vision OCR when an image is uploaded on iOS:

```typescript
// In the image upload handler, after file is selected:
import { Plugins } from '@capacitor/core';

async function extractTextFromImage(imageBase64: string): Promise<string> {
  try {
    // Use Capacitor ML Kit Text Recognition (free, on-device)
    // Plugin: @capacitor-mlkit/text-recognition
    // Install: npm install @capacitor-mlkit/text-recognition
    // npx cap sync
    
    const { TextRecognition } = await import('@capacitor-mlkit/text-recognition');
    const result = await TextRecognition.recognize({
      base64: imageBase64,
      language: 'latin', // covers English
    });
    return result.text;
  } catch (e) {
    // Fallback: if plugin not available (web), show message
    console.log('Vision OCR not available in browser — text extraction skipped');
    return '';
  }
}
```

**After adding the plugin:**
- Run: `npm install @capacitor-mlkit/text-recognition`
- Run: `npx cap sync`
- In Xcode, ensure Privacy - Camera Usage Description is in Info.plist (already added)
- When OCR completes, auto-populate the "Paste the Customer Review" textarea with extracted text
- Show a brief gold success toast: "Review text extracted — review and edit if needed"
- If OCR returns empty, show: "Couldn't extract text — please paste the review manually"

**On web (non-iOS):** Hide the screenshot upload section or show a note: "Screenshot OCR available in the iOS app"

---

## 3. Page Header — Reputation Status Strip

Below the "Reviews & Reputation" title and subtitle, add a horizontal strip of 4 dark metric cards with gold left border:

- **Responses Generated** — count of responses generated this session/total. Default: "0 responses"
- **Last Response Type** — show the last review type and tone used. E.g., "Negative · Professional". Default: "--"
- **Templates Available** — static count of loaded templates. E.g., "4 templates ready"
- **Response Streak** — "Respond to every review within 24 hrs" motivational tracker. Placeholder: "Start your streak →" in amber

Style: compact dark cards (`#1a1d2e`), 3px gold left border, muted label, bold white value. Horizontal scroll on mobile.

---

## 4. Review Response Generator Card — Major Visual Upgrade

### Card Header
- Add a subtle animated gold shimmer border (CSS keyframe, same treatment as other upgraded sections)
- Chat bubble icon in gold, title "Review Response Generator" in white bold
- Subtitle in muted gray

### Form Field Polish

**Review Type dropdown:**
- ⭐ Negative Review → red star icon, shows red tint on selection
- ⭐ Positive Review → gold star icon, shows gold tint on selection
- Add: 🔁 Mixed Review (new option) — handles reviews that are partially positive, partially critical
- Add: ❗ Fake/Defamatory Review (new option) — triggers a factual correction tone automatically

**Response Tone dropdown — expanded options:**
- Professional & Empathetic (existing)
- Brief & Direct (existing)
- Recovery-Focused (existing)
- Factual Correction (existing)
- Add: **Warm & Personal** — for loyal returning customers
- Add: **Firm but Fair** — for aggressive or unfair reviews where the business needs to professionally push back without being defensive

**Restaurant Name field:**
- Persist to localStorage — if the operator types "The Dive," it should remember it across sessions
- Show a small gold "saved" checkmark icon briefly after they type it

**Your Name / Your Title fields:**
- Also persist to localStorage — operators shouldn't retype their name every time
- Show "Saved for next time" in muted text below the fields after first entry

**Review Text Textarea:**
- On focus: gold border glow (box-shadow)
- Character count in bottom-right corner in muted text
- Placeholder text update: "Paste the customer's review here... or upload a screenshot below to extract the text automatically"

### Screenshot Upload Zone
- Dashed gold border (instead of gray)
- On hover: subtle gold background tint
- On image upload: show thumbnail preview centered in the zone (already partially working — keep this)
- After OCR completes: auto-fill textarea and show a dismissible green success bar: "✓ Text extracted from screenshot — review before generating"
- Add an X button to remove the uploaded image (already exists — style it as a red circle with white X, 24px)
- If on web (non-iOS): replace the upload zone with a note card: "📱 Upload & OCR available in the iOS app. On web, paste the review text directly above."

### Generate Response Button
- Increase button height slightly (52px)
- On loading state: replace text with animated dots + "Crafting your response..." in italics
- Pulse animation on the ✨ icon while loading

---

## 5. Generated Response Output — Structured & Copyable

After generation, instead of a plain text box, render the response in a structured output card:

### Output Card Layout:
```
┌─────────────────────────────────────────────────────┐
│  Generated Response                    [Copy] [Edit] │
│─────────────────────────────────────────────────────│
│                                                     │
│  Hi Bobby,                                          │  ← Customer name auto-filled, not [placeholder]
│                                                     │
│  [response body in readable paragraph format]       │
│                                                     │
│  Warm regards,                                      │
│  Bob                                                │
│  Manager                                            │
│─────────────────────────────────────────────────────│
│  Tone used: Professional & Empathetic               │
│  Review type: Negative Review                       │
│  [Regenerate with different tone ↺]                 │
└─────────────────────────────────────────────────────┘
```

- Background: `#111827`, rounded corners 12px, subtle gold left border 3px
- "Copy to Clipboard" button: top-right, gold outlined button → fills gold on hover
- "Edit" button: opens the response text in an editable textarea inline (toggle)
- "Regenerate with different tone" link: in muted gold text, re-triggers generation with a different tone option shown in a small dropdown
- On copy: button text changes to "✓ Copied!" for 2 seconds then resets
- Character count shown below the response in muted text (relevant for Google's 4096 char limit)

---

## 6. Response Templates Section — Card Grid Upgrade

Replace the current vertical list with a **2-column card grid** on desktop, 1-column on mobile:

Each template card:
- Background `#1a1d2e`, border `#374151`, border-radius 12px
- Template name in white bold, preview text truncated to 2 lines in muted gray
- "Use Template" button: gold outlined → fills on hover, moves template text into the response textarea
- Template type badge: small pill in top-right (Positive / Negative / Neutral / Correction) with appropriate color

Add **2 new templates:**
- **Thank Customer for Return Visit** — "We love seeing familiar faces..."
- **Respond to Fake/Defamatory Review** — "We take all feedback seriously. However, we have no record of a visit matching this description..."

---

## 7. Review Response Tips — Collapsible Best Practices

Below the templates, add a new collapsible card: **"Review Response Best Practices"**

Content (as expandable accordion items, gold left border on expand):

1. **Respond within 24 hours** — Platforms surface recent responses. Speed signals you care.
2. **Never argue publicly** — Take heated disputes offline. "Please reach out to us directly at [contact info]."
3. **Thank every reviewer** — Even negative ones. It shows professionalism to all future readers.
4. **Don't offer compensation publicly** — It invites gaming the system. Offer privately if warranted.
5. **Use the reviewer's name if known** — Personalizes the response. Avoid "Dear Customer."
6. **Keep it under 150 words** — Long responses look defensive. Short ones look confident.

Style: Same accordion treatment as Principles — gold chevron, smooth max-height animation, principle body with gold left border quote-style.

---

## 8. Principles & Frameworks Accordions — Visual Upgrade (Match Other Sections)

- Smooth CSS transition on expand/collapse (max-height animation)
- Gold chevron rotates 180° on expand
- Blockquote principle text: 3px gold left border, subtle background tint `#1a1d2e`
- Multiple items: individually expandable

---

## 9. Design Token Reference (Match Exactly)

```css
Background:        #0f1117
Card background:   #1a1d2e
Input background:  #111827
Input border:      #374151
Input focus ring:  #d4a017
Gold accent:       #b8860b / #d4a017
Text primary:      #ffffff
Text muted:        #9ca3af
On target green:   #22c55e
Warning amber:     #f59e0b
Danger red:        #ef4444
Border radius:     12px (cards), 8px (inputs/buttons)
```

---

## 10. Mobile Responsiveness

- Header metric strip: horizontal scroll on mobile, no text wrapping
- Form grid: single column below 640px
- Template cards: single column on mobile
- Generated response card: full width, readable at 375px
- Screenshot upload zone: full width on mobile
- All buttons: minimum 44px touch target height

---

## Implementation Order

1. CRITICAL FIX — customer name extraction in AI prompt
2. CRITICAL FIX — Apple Vision OCR via @capacitor-mlkit/text-recognition
3. Page header reputation strip
4. Form field persistence (localStorage for name, title, restaurant)
5. Dropdown additions (Mixed Review, Fake/Defamatory, Warm & Personal, Firm but Fair)
6. Generated response structured output card with Edit/Copy/Regenerate
7. Template section → 2-column grid + 2 new templates
8. Best Practices collapsible section
9. Shimmer card border animation on generator card
10. Principles/Frameworks accordion polish
11. Mobile responsiveness pass

Make all changes to the Reviews & Reputation page files only. Preserve all existing API logic, template data, and accordion content exactly as-is.
