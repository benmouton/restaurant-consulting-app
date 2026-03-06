# Replit Prompt — Financial Insights Major Upgrade

Paste this directly into Replit chat:

---

I need a **major upgrade** to the **Financial Insights** page. Keep the established dark theme: background `#0f1117`, gold/amber accent `#b8860b` / `#d4a017`, card backgrounds `#1a1d2e`, white primary text, muted gray secondary text. Match the visual style used across all other upgraded sections (Kitchen Operations, HR & Documentation, Staffing & Labor, Training Systems, Cost & Margin Control, Reviews & Reputation, SOPs & Scalability, Crisis Management, Facilities & Asset Protection, Social Media, Staff Scheduling, Ask the Consultant, Training Templates, Living Playbooks).

**DO NOT CHANGE:**
- Any existing Claude AI API call logic or chat integration in the Analysis tab
- The existing file upload handler (drag/drop + browse)
- The existing Document Type dropdown and Upload button logic
- The "Run Full Analysis" button and its AI behavior
- The existing 3 quick-question chips in the Analysis tab
- The existing 4 document type cards (P&L Statement, Sales Report, Labor Report, Inventory Report) and their descriptions
- The Principles and Frameworks accordion content (if present)
- Page routing or file structure
- Any other domain pages

---

## 1. CRITICAL UPGRADE — Apple Vision API for PDF/Image Text Extraction

**Replace or supplement the current PDF parsing with Apple's Vision framework via Capacitor on iOS, and use a server-side Vision API fallback for web.**

### iOS (Capacitor Native Path)
When the app is running on iOS (detect via `Capacitor.isNativePlatform()`), use the `@capacitor-community/vision` plugin OR a custom Capacitor plugin that wraps `VNRecognizeTextRequest` to extract text from uploaded images and scanned PDFs before sending to Claude.

Implementation pattern:
```typescript
import { Capacitor } from '@capacitor/core';

async function extractTextFromFile(file: File): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    // Convert file to base64
    const base64 = await fileToBase64(file);
    
    // Call native Vision text recognition
    const result = await (window as any).Capacitor.Plugins.VisionPlugin.recognizeText({
      imageData: base64,
      recognitionLevel: 'accurate', // VNRequestTextRecognitionLevelAccurate
      usesLanguageCorrection: true,
      minimumTextHeight: 0.02
    });
    
    return result.text || '';
  } else {
    // Web fallback: send file to server-side extraction endpoint
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/financial/extract-text', {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    return data.text || '';
  }
}
```

### Server-Side Fallback (`/api/financial/extract-text`)
For web uploads and non-iOS platforms, create a server endpoint that:
1. For **PDF files**: uses `pdf-parse` npm package to extract text from text-based PDFs
2. For **image files** (PNG, JPG — scanned statements): uses the Claude API vision capability — send the image as base64 to Claude with prompt: `"Extract all text from this financial document. Return only the raw extracted text, preserving numbers, column headers, and line items exactly as they appear."`
3. For **CSV/Excel files**: parse directly (no OCR needed) using `papaparse` for CSV or `xlsx` for Excel

### Extraction Status UI
During extraction, show a status indicator inside the upload zone:
- Replace the upload icon with a gold animated spinner
- Status text cycles through: "Reading document..." → "Extracting financial data..." → "Ready for analysis"
- On completion: brief green checkmark flash, then transitions to the document appearing in "Your Documents"

### Why This Matters
Scanned P&L statements and POS export PDFs are often image-based and return empty text with standard PDF parsers. Apple Vision's `VNRecognizeTextRequest` achieves near-perfect accuracy on printed financial documents and is already available on-device — no external OCR API cost. This is the single most important functional upgrade for making financial analysis actually work on iOS.

---

## 2. Page Header — Financial Intelligence Strip

Below the "Financial Insights" title (add a proper title/subtitle if not present), add a horizontal strip of 4 dark metric cards with gold left border:

- **Documents Uploaded** — count of documents in "Your Documents." Default: "0 uploaded"
- **Document Types** — count of distinct types uploaded (P&L, Sales, Labor, Inventory). Default: "0 of 4"
- **Analyses Run** — count of times "Run Full Analysis" or a question has been submitted in this session. Default: "0 analyses"
- **Last Upload** — document name + how long ago (e.g., "Q3 P&L.pdf · 4 min ago"). Default: "No uploads yet"

Style: compact dark cards (`#1a1d2e`), gold left border 3px, muted label on top, white value below.

---

## 3. Tab Bar — Visual Upgrade

Redesign the Documents / Analysis tab switcher:
- Active tab: white text, `#1a1d2e` background, gold bottom border 2px
- Inactive tab: muted gray text, `#0f1117` background
- Tab switch: 150ms ease crossfade
- Add a document count badge to the Documents tab label once uploads exist (e.g., "Documents (2)")

---

## 4. Documents Tab — Full Redesign

### Upload Zone
Redesign the drag-and-drop area:
- Background: `#1a1d2e`, dashed border `1.5px dashed rgba(184,134,11,0.4)`, border-radius `12px`
- **Drag active state:** border becomes solid gold `#b8860b`, background shifts to `rgba(184,134,11,0.06)`, upload icon scales up 1.1× — clear visual feedback on drag-over
- Upload icon: gold stroke SVG (not the default gray)
- Primary text: "Drag & drop your financial report here, or **click to browse**" — "click to browse" in gold
- Secondary text: "Supports PDF, CSV, and Excel files" in muted gray
- Format chips (PDF · CSV · Excel): gold outlined chips, not plain text

### Document Type Dropdown
- Upgrade to the platform's styled dark dropdown: `#0f1117` background, gold chevron, gold focus ring
- Options: P&L Statement / Sales Report / Labor Report / Inventory Report / Other
- When a type is selected, the corresponding document card in "Your Documents" below briefly pulses with a gold glow to show which type this upload will create

### Upload Button
- Full gold gradient (`#b8860b` → `#d4a017`), shimmer on hover, upload icon + "Upload" label
- Disabled + dimmed state when no file is selected
- Loading state during upload/extraction: spinner replaces upload icon, "Processing..." label

### Your Documents Section
**Section header:** "Your Documents" in white bold, with a muted count badge (e.g., "2 uploaded")

**Document type cards — redesign:**

Current: 4 plain icon + label rows. Replace with:

4 dark cards (`#1a1d2e`, border `rgba(255,255,255,0.06)`, border-radius `10px`, padding `16px`) in a 2×2 grid:

Each card has:
- Category icon in gold (matching icons: 📊 P&L, 📈 Sales, 👥 Labor, 📦 Inventory)
- Document type name: white bold `15px`
- Description: muted gray `12px` (preserve existing descriptions exactly)
- **Status indicator** (right side):
  - No upload: muted gray "Not uploaded" label
  - Upload in progress: gold spinner
  - Uploaded: green dot + filename (truncated to 24 chars) + upload timestamp in muted gray `11px`
  - Upload error: red dot + "Upload failed" + "Retry" ghost link
- When uploaded: card gets a subtle gold left border 3px and a light `rgba(184,134,11,0.06)` background tint
- **Action buttons** when a document is uploaded (appear on hover):
  - 👁️ **View** — shows extracted text in a read-only modal (so operator can verify extraction quality)
  - 🔄 **Replace** — triggers new file picker for this type
  - 🗑️ **Remove** — tap-hold (500ms) to prevent accidental deletion

**"Most POS systems..." note:** restyle as a gold-left-bordered info callout block (muted background, gold `#b8860b` left border 3px, italic muted text):
> 💡 Most POS systems (Toast, Square, Clover) can export these as CSV or Excel from their Reports section.

---

## 5. Analysis Tab — Full Redesign

### Tab Header
- Title: "Ask About Your Financials" with chat bubble icon (preserve)
- Subtitle: "Ask questions about your uploaded documents" (preserve)
- **Run Full Analysis** button: redesign to full gold gradient (`#b8860b` → `#d4a017`), shimmer on hover, sparkle icon + "Run Full Analysis" label. Matches gold button treatment from all other upgraded sections.

### Empty State (no messages)
Replace the plain chat bubble icon + gray text with:
- Gold chart-bar SVG icon (48px)
- "No analysis yet" in white `16px`
- Sub-text: "Upload a financial document, then ask a question or run a full analysis." in muted gray `13px`
- 3 quick-question chips visible below (see section 6)

### Chat Interface — Visual Overhaul
Match the Ask the Consultant chat style exactly:

**User message bubbles:**
- Right-aligned
- Background: `rgba(184, 134, 11, 0.15)`, border: 1px solid `rgba(212, 160, 23, 0.3)`
- Rounded corners `12px 12px 2px 12px`
- Timestamp bottom-right, muted gray, small

**AI response bubbles:**
- Left-aligned
- Background: `#1a1d2e`, border: 1px solid `rgba(255,255,255,0.06)`
- Rounded corners `12px 12px 12px 2px`
- Gold animated left border (3px) during streaming — turns static white when complete
- Typing indicator: 3 gold pulsing dots while waiting for first token
- "Financial Insights" label + timestamp in top-left, muted gray `11px`
- **Action tray** below each completed AI response (on hover/always on mobile):
  - 📋 **Copy** — copies response to clipboard, "Copied!" toast
  - 📌 **Save Insight** — saves to a "Saved Insights" panel (see section 7)
  - 🔄 **Follow Up** — pre-fills input with "Can you go deeper on that?" and focuses input
  - 📤 **Share** — Web Share API / clipboard: shares Q&A pair as plain text

**Input row:**
- Full-width text input, `#1a1d2e` background, gold focus ring (`#b8860b`, 1.5px), rounded `10px`
- Placeholder: "Ask about your financial data..."
- **Send button:** gold gradient, chevron-right icon, shimmer on hover, disabled + dimmed when input empty
- Send on Enter key (preserve existing if present)

---

## 6. Smart Question Chips — Expanded & Context-Aware

Replace the 3 existing static chips with an expanded dynamic set:

**Default chips (no documents uploaded) — show 4 chips:**
1. "What are industry benchmarks for restaurant food cost %?"
2. "What's a healthy prime cost target for a casual dining concept?"
3. "How can I reduce my prime cost?"
4. "What should my labor % be for a full-service restaurant?"

**With P&L uploaded — swap to:**
1. "What should I focus on to improve profitability?"
2. "Where are my biggest cost savings opportunities?"
3. "How does my food cost % compare to industry benchmarks?"
4. "What's my net profit margin and is it healthy?"

**With Sales Report uploaded — swap to:**
1. "Which day of the week is my highest revenue?"
2. "What's my revenue per available seat hour (RevPASH)?"
3. "Are there revenue trends I should be aware of?"
4. "What does my day-of-week pattern tell me about staffing?"

**With Labor Report uploaded — swap to:**
1. "What is my labor % and is it on target?"
2. "Where am I over-scheduled relative to revenue?"
3. "Are there overtime patterns I should address?"
4. "How can I improve scheduling efficiency?"

**With Inventory Report uploaded — swap to:**
1. "What are my highest-waste line items?"
2. "Where should I adjust my par levels?"
3. "What items are hurting my food cost the most?"
4. "How do I reduce shrinkage in my top 10 items?"

**Chip style:** `#1a1d2e` background, gold border `1px solid rgba(184,134,11,0.5)`, white text `13px`, rounded `20px`. Gold fill on hover. Tapping populates input — does NOT auto-send.

---

## 7. Saved Insights Panel

When the user saves an AI response via the action tray, it appears in a collapsible "📌 Saved Insights" panel at the top of the Analysis tab:

- Label: "📌 Saved Insights" with count badge (e.g., "(3)")
- Collapsed by default once items exist (gold chevron to expand)
- Each saved insight: first 3 lines of AI response, truncated with "..." + timestamp + document type tag
- Gold left border 3px, `#1a1d2e` background
- ✕ to remove individual insights
- Max 8 saved insights (oldest removed automatically when 9th is added)
- "📤 Export All Insights" ghost button at bottom: copies all saved insights as formatted plain text

---

## 8. Full Analysis Output — Structured Results Card

When "Run Full Analysis" is clicked, instead of raw streaming text into the chat, render the output as a **structured results card** directly in the Analysis tab (above the chat, below the header):

The card has 5 collapsible sections (gold chevron, all expanded by default):

1. **📊 Financial Health Score** — a visual score out of 100 with a gold progress arc (SVG donut), color-coded: green (80–100), amber (60–79), red (0–59). Score is AI-extracted from the analysis. Sub-label: "Based on [document type] analysis"

2. **🚨 Top 3 Alerts** — the 3 highest-priority issues the AI identified, each as a red-left-bordered callout card with a brief explanation (2 sentences max)

3. **✅ Top 3 Wins** — the 3 strongest positives identified, each as a green-left-bordered callout card

4. **📋 Action Items** — numbered list of recommended next steps (AI-generated), rendered as tappable checkboxes. Gold check when ticked. "Save as Playbook" button at the bottom (pre-fills Living Playbooks Create modal with title "Financial Action Plan · [date]", category = Other, mode = Quick Checklist, content = action items list)

5. **📈 Key Metrics Extracted** — table of financial metrics the AI parsed from the document:
   - Metric name | Your Number | Industry Benchmark | Status (✅ / ⚠️ / 🔴)
   - Table style: dark rows alternating `#0f1117` / `#1a1d2e`, gold header row text, border `rgba(255,255,255,0.06)`
   - Benchmarks are AI-provided industry standards (not user-entered)

The full analysis card has a "🔄 Re-run Analysis" ghost button + "📋 Copy Full Report" gold outlined button in its header.

---

## 9. Upload Gate — No Documents Warning

If the user tries to use the Analysis tab with no documents uploaded:
- Show a gold-bordered callout at the top of the Analysis tab (above the chat):
  > ⬆️ **Upload a financial document first.** Go to the Documents tab to upload your P&L, Sales Report, Labor Report, or Inventory data — then come back here to analyze it.
- "Go to Documents" gold ghost button inside the callout that switches to the Documents tab
- The 4 default question chips remain visible and functional (they answer general industry questions without needing uploads)

---

## 10. Cross-Module Integration

1. **Full Analysis → Living Playbooks:** "Save as Playbook" button on Action Items section (section 8) opens Living Playbooks Create modal pre-filled with the action item checklist.
2. **Full Analysis → Ask the Consultant:** "Ask the Consultant about this" ghost button at the bottom of the full analysis card — navigates to Ask the Consultant page with a pre-filled message: "I just ran a financial analysis. My top issues were: [top 3 alerts]. Can you give me an operator-level plan to address these?"
3. **Document upload count → Header strip:** "Documents Uploaded" and "Document Types" metrics read from live state.

---

## 11. Visual Polish & Animations

- **Staggered entrance:** Header strip → tab bar → upload zone → document cards fade in with 80ms offsets
- **Drag active:** dashed border pulses gold (CSS keyframe glow) while file is held over drop zone
- **Upload progress:** shimmer skeleton replaces document card content during processing, resolves to uploaded state
- **Extraction status:** "Reading document..." text fades between states (300ms crossfade)
- **Document card uploaded state:** gold left border slides in from left (150ms ease) + subtle background tint fades in
- **Chip swap:** chips fade out (150ms) and new chips fade in (200ms) when document type changes
- **Full analysis card:** sections stagger in with 100ms offsets after streaming completes
- **Health score arc:** SVG arc animates from 0 to score value (600ms ease-out) on first render
- **Gold button shimmer:** diagonal light sweep on hover — matches all other upgraded sections
- **Toast notifications:** bottom-center, dark background, gold left border, auto-dismiss 2.5s

---

## 12. Mobile Responsiveness

- Header strip: 2×2 grid on mobile
- Document type cards: single column stack on mobile
- Upload zone: full-width, reduced height (160px on mobile)
- Analysis tab chat: full-height, input pinned to bottom
- Full analysis card sections: single column, full-width on mobile
- Saved Insights panel: full-width below tab header
- Metrics table: horizontal scroll on mobile (min-width: 500px)
- Quick-question chips: horizontal scroll row on mobile, no wrap

---

## Implementation Order

1. **Apple Vision text extraction** (iOS native path + server-side fallback endpoint) — FIRST PRIORITY
2. Page header Intelligence strip (4 metric cards)
3. Tab bar redesign + document count badge
4. Upload zone redesign (drag states, gold styling, format chips)
5. Document type dropdown + Upload button upgrade
6. Your Documents section: 2×2 card grid with status indicators + action buttons
7. POS systems info callout restyle
8. Analysis tab empty state redesign
9. Chat interface: user bubbles + AI bubbles + action tray
10. Input row redesign + send button
11. Context-aware question chips (all 5 states)
12. Saved Insights panel
13. Full Analysis structured results card (health score, alerts, wins, action items, metrics table)
14. Upload gate warning callout
15. Cross-module integration hooks
16. All animations + transitions
17. Mobile responsiveness pass

Make all changes to the Financial Insights page files only. Preserve all existing Claude API logic, upload handling, Run Full Analysis behavior, and existing quick-question chip behavior exactly as-is — the Apple Vision upgrade enhances extraction BEFORE the existing analysis flow, it does not replace it.
