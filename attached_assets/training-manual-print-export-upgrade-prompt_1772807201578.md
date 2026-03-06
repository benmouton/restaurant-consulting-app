# Replit Prompt — Print, PDF Export & Share Upgrade (All Training Manuals)

Paste this directly into Replit chat:

---

Upgrade the **print, export, and share functionality** across all six training manual templates: Server, Kitchen, Bartender, Host, Busser, and Manager. This is a document output upgrade — not a visual redesign. Do not change any template content, styling, Setup logic, routing, or other modules.

---

## GOAL

Every generated training manual must support three document actions:

1. **Print** — beautiful, formatted PDF-quality print output directly from the browser
2. **Export as PDF** — download a properly formatted `.pdf` file to the device
3. **Share / Export as Editable Document** — export a `.docx` Word file that can be emailed, saved to Files, or shared via iOS share sheet (AirDrop, Messages, Mail, Google Drive, etc.)

These three actions are triggered from a persistent action bar that appears at the top of every generated manual, below the manual title and above the Table of Contents.

---

## ACTION BAR — DESIGN & PLACEMENT

Render a sticky action bar at the top of every generated manual (not visible in Setup-only state):

```
[ 🖨️ Print ]   [ ⬇️ Download PDF ]   [ 📤 Share / Export ]
```

Style:
- Background: `#1a1d2e`
- Border bottom: `1px solid #b8860b`
- Padding: `12px 24px`
- Buttons: gold-bordered, dark background, gold text — match existing button style across the platform
- Position: sticky top on scroll so it's always accessible while reading the manual
- On mobile: full-width stacked or icon-only with labels below

---

## 1. PRINT FUNCTIONALITY

**How it works:**
- "Print" button triggers `window.print()`
- Browser opens native print dialog
- Output renders as a clean, formatted document — NOT a screenshot of the dark UI

**Print CSS (`@media print`) — apply to ALL manual templates:**

```css
@media print {
  /* Hide all UI chrome */
  nav, sidebar, .action-bar, .generate-button, .setup-section,
  header, footer, .breadcrumb, .tab-bar, .mobile-nav { display: none !important; }

  /* Reset to white page */
  body, html {
    background: #ffffff !important;
    color: #000000 !important;
    font-family: 'Georgia', serif !important;
    font-size: 11pt !important;
    line-height: 1.6 !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* Page setup */
  @page {
    size: letter portrait;
    margin: 1in 1in 1in 1in;
  }

  /* Force all sections to expand */
  .accordion, .collapsible, [data-collapsed="true"] {
    display: block !important;
    height: auto !important;
    overflow: visible !important;
  }

  /* Cards become bordered boxes */
  .card, .framework-card, .checklist-card, .reference-card {
    background: #ffffff !important;
    border: 1pt solid #000000 !important;
    border-radius: 0 !important;
    padding: 12pt !important;
    margin-bottom: 12pt !important;
    page-break-inside: avoid !important;
  }

  /* Gold accent elements become black */
  .gold, [style*="color: #b8860b"], [style*="color: #d4a017"],
  .gold-text, .accent { color: #000000 !important; }

  /* Gold borders become black */
  [style*="border-color: #b8860b"], [style*="border-color: #d4a017"] {
    border-color: #000000 !important;
  }

  /* Amber warning cards */
  .amber-card, .warning-card {
    background: #f5f5f5 !important;
    border: 1.5pt solid #000000 !important;
  }

  /* Tables */
  table {
    width: 100% !important;
    border-collapse: collapse !important;
    page-break-inside: avoid !important;
  }
  th {
    background: #000000 !important;
    color: #ffffff !important;
    font-weight: bold !important;
    padding: 6pt 8pt !important;
  }
  td {
    border: 0.5pt solid #666666 !important;
    padding: 5pt 8pt !important;
  }
  tr:nth-child(even) td { background: #f9f9f9 !important; }

  /* Headings */
  h1 { font-size: 20pt !important; margin-bottom: 6pt !important; }
  h2 { font-size: 14pt !important; border-bottom: 1pt solid #000; padding-bottom: 4pt !important; }
  h3 { font-size: 12pt !important; }

  /* Page breaks */
  .day-section { page-break-before: always !important; }
  .sign-off-sheet { page-break-before: always !important; }
  .written-assessment { page-break-before: always !important; }
  .certification-section { page-break-before: always !important; }
  h1, h2 { page-break-after: avoid !important; }

  /* Checklist items */
  .checklist-item::before { content: "☐ " !important; }

  /* Cover page — first page only */
  .manual-cover {
    page-break-after: always !important;
    text-align: center !important;
    padding-top: 2in !important;
  }

  /* Closing block */
  .certification-closing {
    font-style: italic !important;
    text-align: center !important;
    color: #333333 !important;
  }

  /* Hide links */
  a[href]:after { content: none !important; }
}
```

**Cover Page — add to every generated manual before the TOC:**

When printing or exporting, include a cover page with:
- Restaurant name: `{{restaurantName}}` — large, centered
- Manual title: e.g., "Server Training Manual" — subtitle size
- "Prepared for: `{{ownerName}}`"
- Generation date (auto-populated)
- Footer: "Confidential — `{{restaurantName}}` Internal Use Only"

In the dark UI, this cover block is hidden (`.manual-cover { display: none }`) — it only renders in print/export.

---

## 2. PDF EXPORT — DOWNLOAD AS .PDF

**Implementation: use `jsPDF` + `html2canvas` OR server-side Puppeteer render**

Preferred approach — **client-side with jsPDF + html2canvas:**

```javascript
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

async function exportToPDF(manualTitle, restaurantName) {
  // Show loading state on button
  const btn = document.getElementById('download-pdf-btn');
  btn.textContent = 'Generating PDF...';
  btn.disabled = true;

  // Target the manual content area only
  const element = document.getElementById('manual-content');

  // Temporarily apply print styles
  document.body.classList.add('print-mode');

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    windowWidth: 816, // Letter width at 96dpi
  });

  document.body.classList.remove('print-mode');

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter'
  });

  const pageWidth = 8.5;
  const pageHeight = 11;
  const margin = 1;
  const contentWidth = pageWidth - (margin * 2);
  const contentHeight = (canvas.height * contentWidth) / canvas.width;

  let position = margin;
  let remainingHeight = contentHeight;

  // Add first page
  pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight);

  // Add additional pages if content overflows
  while (remainingHeight > (pageHeight - margin * 2)) {
    pdf.addPage();
    position = -(pageHeight - margin * 2) + margin;
    remainingHeight -= (pageHeight - margin * 2);
    pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight);
  }

  // Add page numbers
  const pageCount = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(9);
    pdf.setTextColor(150);
    pdf.text(
      `${restaurantName} — ${manualTitle} | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 0.5,
      { align: 'center' }
    );
  }

  // Download
  const filename = `${restaurantName.replace(/\s+/g, '-')}-${manualTitle.replace(/\s+/g, '-')}.pdf`;
  pdf.save(filename);

  btn.textContent = '⬇️ Download PDF';
  btn.disabled = false;
}
```

**Alternative: if jsPDF produces poor formatting**, use the browser's built-in print-to-PDF:
- "Download PDF" button triggers `window.print()` with a toast notification: *"In the print dialog, select 'Save as PDF' as your destination."*
- This is the most reliable cross-browser approach and produces the cleanest output

**File naming convention:**
`[RestaurantName]-[ManualTitle]-[YYYY-MM-DD].pdf`
Example: `Moutons-Bistro-Server-Training-Manual-2026-03-06.pdf`

---

## 3. SHARE / EXPORT AS EDITABLE DOCUMENT (.docx)

**Implementation: use `docx` npm package (client-side Word document generation)**

```javascript
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, ShadingType, WidthType
} from 'docx';

async function exportToDocx(manualData, restaurantName, manualTitle) {
  const btn = document.getElementById('share-export-btn');
  btn.textContent = 'Preparing document...';
  btn.disabled = true;

  // Build document sections from rendered manual content
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22 }
        }
      }
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } // 1 inch margins
        }
      },
      children: buildDocxContent(manualData, restaurantName, manualTitle)
    }]
  });

  const blob = await Packer.toBlob(doc);
  const filename = `${restaurantName.replace(/\s+/g, '-')}-${manualTitle.replace(/\s+/g, '-')}.docx`;

  // On desktop: trigger download
  if (!navigator.share) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // On iOS/mobile: use Web Share API for native share sheet
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], filename, {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    try {
      await navigator.share({
        title: `${restaurantName} — ${manualTitle}`,
        text: 'Training manual — tap to open or save',
        files: [file]
      });
    } catch (err) {
      // Fallback to download if share is cancelled or unsupported
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  btn.textContent = '📤 Share / Export';
  btn.disabled = false;
}
```

**What the .docx output must include:**

- Cover page with restaurant name, manual title, date, "Confidential" footer
- All manual content in clean Word formatting:
  - Day headings as Heading 1
  - Section titles as Heading 2
  - Body text as Normal style
  - Checklist items as bullet list with ☐ checkbox character
  - Framework cards as bordered text boxes or shaded paragraphs
  - Reference tables as proper Word tables
  - Amber warning cards as shaded gray paragraph blocks with ⚠️ prefix
  - Trainer Sign-Off Sheet as a proper Word table with fillable-looking underscores
  - Written assessment as numbered list
- Page numbers in footer: "Page X of Y — [Restaurant Name] Confidential"
- All `{{variables}}` already replaced with actual Setup values before export

**On iOS specifically:**
- The Web Share API (`navigator.share`) triggers the native iOS share sheet
- The .docx file appears as a shareable item — user can choose Mail, Messages, AirDrop, Files, Google Drive, Dropbox, etc.
- Works identically to sharing any document from the Files app on iPhone

**On desktop:**
- Falls back to a direct `.docx` download to the browser's Downloads folder

---

## INSTALL REQUIRED PACKAGES

Add to the project via npm:

```bash
npm install jspdf html2canvas docx
```

If jsPDF + html2canvas causes performance issues on large manuals (Manager manual is 10 days), use the print-to-PDF approach for PDF export and keep docx for the editable export only.

---

## BUTTON STATES

Each button should have three states:

| State | Label | Style |
|---|---|---|
| Default | 🖨️ Print / ⬇️ Download PDF / 📤 Share & Export | Gold border, dark bg |
| Loading | Generating... | Muted, spinner icon |
| Success (share/download) | ✓ Done | Brief green flash, returns to default after 2s |
| Error | ⚠️ Try Again | Amber, returns to default after 3s |

---

## DOCUMENT QUALITY STANDARDS

The exported PDF and .docx must meet these standards:

- **Readable at 11pt body text** — no cramped or overflowing content
- **Every checklist checkbox prints as ☐** — not a bullet, not a dash
- **Tables don't break across pages** — `page-break-inside: avoid` on all table elements
- **Day sections start on new pages** in both PDF and .docx
- **Sign-off sheets and assessments always start on their own page**
- **Restaurant name and manual title appear in the header or footer of every page**
- **Cover page is the first page** — no content on the cover page other than the cover block
- **No dark backgrounds, no gold text** — pure black on white for all exported documents
- **The closing certification block is italic and centered** — preserved in both export formats

---

## IMPLEMENTATION ORDER

1. Install `jspdf`, `html2canvas`, `docx` packages
2. Add print CSS (`@media print`) to all six manual templates
3. Add hidden cover page block to all six manual templates
4. Build shared `exportUtils.js` with `printManual()`, `downloadPDF()`, `shareExportDocx()` functions
5. Add action bar component to all six generated manual views
6. Wire up Print button → `printManual()`
7. Wire up Download PDF button → `downloadPDF()` with print-to-PDF fallback
8. Wire up Share / Export button → `shareExportDocx()` with Web Share API + download fallback
9. Test print output on Server Manual first — confirm clean black/white formatting
10. Test PDF download on Server Manual — confirm page breaks and cover page
11. Test .docx export on Server Manual — confirm tables, checklists, and headings
12. Roll out to remaining five manuals
13. Test iOS share sheet on all six manuals — confirm native share sheet triggers correctly
14. Mobile responsiveness pass on action bar

Make all changes to the training manual templates and shared utilities only. Do not change Setup logic, routing, other domain pages, or any non-training-manual content.
