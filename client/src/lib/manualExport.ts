import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Footer,
} from "docx";

interface ManualExportData {
  restaurantName: string;
  ownerName: string;
  manualTitle: string;
  content: string;
  keyPoints?: string[];
  section?: string;
}

interface FullManualExportData {
  restaurantName: string;
  ownerName: string;
  manualTitle: string;
  templates: Array<{
    title: string;
    section: string;
    content: string;
    keyPoints?: string[];
    contentType: string;
    sequenceOrder: number;
  }>;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatContentForPrint(content: string): string {
  let html = escapeHtml(content);

  html = html.replace(/^(═{3,}.*?)$/gm, '<hr class="thick-rule" />');
  html = html.replace(/^(───────.*?)$/gm, '<hr class="thin-rule" />');

  html = html.replace(
    /^(DAY \d+.*?)$/gm,
    '<h2 class="day-heading">$1</h2>'
  );
  html = html.replace(
    /^([A-Z][A-Z\s&,/:—\-']{5,})$/gm,
    '<h3 class="section-heading">$1</h3>'
  );

  html = html.replace(/^□\s(.*)$/gm, '<div class="checklist-item">$1</div>');
  html = html.replace(/^•\s(.*)$/gm, '<div class="bullet-item">$1</div>');

  html = html.replace(
    /^(┌.*$[\s\S]*?└.*$)/gm,
    '<div class="table-block">$1</div>'
  );

  html = html.replace(
    /^(\d+)\.\s(.*?)$/gm,
    '<div class="numbered-item"><span class="num">$1.</span> $2</div>'
  );

  html = html.replace(
    /^&quot;([\s\S]*?)&quot;$/gm,
    '<blockquote class="quote">$1</blockquote>'
  );

  return html;
}

export function printManual(data: FullManualExportData): void {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const templateSections = data.templates
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    .map(
      (t, i) => `
      <div class="template-section ${i > 0 ? "day-section" : ""}">
        <h2 class="template-title">${escapeHtml(t.title)}</h2>
        <div class="template-meta">${escapeHtml(t.section)} | ${escapeHtml(t.contentType)}</div>
        ${
          t.keyPoints?.length
            ? `<div class="key-points">${t.keyPoints.map((p) => `<span class="badge">${escapeHtml(p)}</span>`).join("")}</div>`
            : ""
        }
        <div class="template-content">${formatContentForPrint(t.content)}</div>
      </div>
    `
    )
    .join("");

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Unable to open print window. Please check your popup blocker settings.");
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${escapeHtml(data.manualTitle)} - ${escapeHtml(data.restaurantName)}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 11pt;
          line-height: 1.6;
          color: #000;
          background: #fff;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
        }

        .cover-page {
          text-align: center;
          padding-top: 3in;
          page-break-after: always;
          min-height: 90vh;
        }
        .cover-page h1 {
          font-size: 28pt;
          margin-bottom: 12pt;
          letter-spacing: 1px;
        }
        .cover-page .subtitle {
          font-size: 16pt;
          color: #333;
          margin-bottom: 24pt;
        }
        .cover-page .prepared-for {
          font-size: 12pt;
          color: #555;
          margin-bottom: 8pt;
        }
        .cover-page .date {
          font-size: 11pt;
          color: #777;
          margin-bottom: 48pt;
        }
        .cover-page .confidential {
          font-size: 9pt;
          color: #999;
          border-top: 1px solid #ccc;
          padding-top: 12pt;
          position: absolute;
          bottom: 40px;
          left: 40px;
          right: 40px;
        }

        .template-section {
          margin-bottom: 24pt;
        }
        .day-section {
          page-break-before: always;
        }
        .template-title {
          font-size: 16pt;
          border-bottom: 1.5pt solid #000;
          padding-bottom: 4pt;
          margin-bottom: 8pt;
          page-break-after: avoid;
        }
        .template-meta {
          font-size: 9pt;
          color: #666;
          margin-bottom: 12pt;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .key-points {
          margin-bottom: 16pt;
        }
        .badge {
          display: inline-block;
          background: #f3f4f6;
          padding: 3pt 8pt;
          border-radius: 3pt;
          font-size: 9pt;
          margin-right: 6pt;
          margin-bottom: 4pt;
          border: 0.5pt solid #ddd;
        }
        .template-content {
          white-space: pre-wrap;
          font-family: 'Calibri', 'Helvetica Neue', sans-serif;
          font-size: 10.5pt;
          line-height: 1.5;
        }

        hr.thick-rule {
          border: none;
          border-top: 2pt solid #000;
          margin: 16pt 0;
        }
        hr.thin-rule {
          border: none;
          border-top: 0.5pt solid #999;
          margin: 12pt 0;
        }

        h2.day-heading {
          font-size: 14pt;
          margin: 16pt 0 8pt;
          page-break-after: avoid;
        }
        h3.section-heading {
          font-size: 11pt;
          font-weight: bold;
          margin: 12pt 0 6pt;
          letter-spacing: 0.5px;
          page-break-after: avoid;
        }

        .checklist-item {
          padding-left: 20pt;
          position: relative;
          margin: 3pt 0;
        }
        .checklist-item::before {
          content: "\\2610 ";
          position: absolute;
          left: 0;
        }

        .bullet-item {
          padding-left: 16pt;
          position: relative;
          margin: 2pt 0;
        }
        .bullet-item::before {
          content: "\\2022 ";
          position: absolute;
          left: 0;
        }

        .numbered-item {
          margin: 3pt 0;
        }
        .numbered-item .num {
          font-weight: bold;
          display: inline-block;
          min-width: 20pt;
        }

        .table-block {
          font-family: 'Courier New', monospace;
          font-size: 9pt;
          line-height: 1.3;
          background: #f9f9f9;
          border: 0.5pt solid #ccc;
          padding: 8pt;
          margin: 8pt 0;
          page-break-inside: avoid;
          overflow-x: auto;
        }

        blockquote.quote {
          font-style: italic;
          color: #333;
          border-left: 3pt solid #000;
          padding-left: 12pt;
          margin: 10pt 0;
        }

        @media print {
          body { padding: 0; max-width: none; }
          @page {
            size: letter portrait;
            margin: 0.75in 0.75in 1in 0.75in;
            @bottom-center {
              content: "${escapeHtml(data.restaurantName)} - ${escapeHtml(data.manualTitle)}";
              font-size: 8pt;
              color: #999;
            }
          }
          .cover-page .confidential {
            position: relative;
            bottom: auto;
            left: auto;
            right: auto;
            margin-top: 2in;
          }
        }
      </style>
    </head>
    <body>
      <div class="cover-page">
        <h1>${escapeHtml(data.restaurantName)}</h1>
        <div class="subtitle">${escapeHtml(data.manualTitle)}</div>
        <div class="prepared-for">Prepared for: ${escapeHtml(data.ownerName)}</div>
        <div class="date">${today}</div>
        <div class="confidential">Confidential - ${escapeHtml(data.restaurantName)} Internal Use Only</div>
      </div>
      ${templateSections}
    </body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
}

export function printSingleTemplate(data: ManualExportData): void {
  const fullData: FullManualExportData = {
    restaurantName: data.restaurantName,
    ownerName: data.ownerName,
    manualTitle: data.manualTitle,
    templates: [
      {
        title: data.content ? data.manualTitle : "Template",
        section: data.section || "",
        content: data.content,
        keyPoints: data.keyPoints,
        contentType: "",
        sequenceOrder: 1,
      },
    ],
  };
  printManual(fullData);
}

export async function downloadPDF(data: FullManualExportData): Promise<void> {
  printManual(data);
}

function parseContentToDocxParagraphs(
  content: string
): Array<Paragraph | Table> {
  const lines = content.split("\n");
  const paragraphs: Array<Paragraph | Table> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^═{3,}/.test(line)) continue;
    if (/^───/.test(line)) {
      paragraphs.push(
        new Paragraph({
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: "999999",
            },
          },
          spacing: { before: 200, after: 200 },
        })
      );
      continue;
    }

    if (/^(DAY \d+|WEEK \d+)/.test(line.trim())) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.trim(),
              bold: true,
              size: 28,
              font: "Calibri",
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
          pageBreakBefore: paragraphs.length > 3,
        })
      );
      continue;
    }

    if (/^[A-Z][A-Z\s&,/:—\-']{5,}$/.test(line.trim()) && line.trim().length > 5) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.trim(),
              bold: true,
              size: 24,
              font: "Calibri",
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        })
      );
      continue;
    }

    if (line.startsWith("□ ") || line.startsWith("□\t")) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: "\u2610 ", font: "Calibri", size: 22 }),
            new TextRun({
              text: line.replace(/^□\s*/, ""),
              font: "Calibri",
              size: 22,
            }),
          ],
          spacing: { before: 60, after: 60 },
          indent: { left: 360 },
        })
      );
      continue;
    }

    if (line.startsWith("• ")) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.replace(/^•\s*/, ""),
              font: "Calibri",
              size: 22,
            }),
          ],
          bullet: { level: 0 },
          spacing: { before: 40, after: 40 },
        })
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)$/);
      if (match) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${match[1]}. `,
                bold: true,
                font: "Calibri",
                size: 22,
              }),
              new TextRun({
                text: match[2],
                font: "Calibri",
                size: 22,
              }),
            ],
            spacing: { before: 60, after: 60 },
            indent: { left: 360 },
          })
        );
        continue;
      }
    }

    if (line.startsWith("┌") || line.startsWith("│") || line.startsWith("├") || line.startsWith("└")) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              font: "Courier New",
              size: 18,
            }),
          ],
          spacing: { before: 20, after: 20 },
          shading: { type: "clear" as any, fill: "F5F5F5" },
        })
      );
      continue;
    }

    if (line.startsWith('"') && line.endsWith('"')) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              italics: true,
              font: "Calibri",
              size: 22,
              color: "333333",
            }),
          ],
          spacing: { before: 120, after: 120 },
          indent: { left: 480 },
          border: {
            left: {
              style: BorderStyle.SINGLE,
              size: 6,
              color: "000000",
            },
          },
        })
      );
      continue;
    }

    if (line.trim() === "") {
      paragraphs.push(new Paragraph({ spacing: { before: 80, after: 80 } }));
      continue;
    }

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: line, font: "Calibri", size: 22 }),
        ],
        spacing: { before: 40, after: 40 },
      })
    );
  }

  return paragraphs;
}

export async function exportToDocx(
  data: FullManualExportData
): Promise<void> {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const dateStr = new Date().toISOString().slice(0, 10);

  const coverPage: Paragraph[] = [
    new Paragraph({ spacing: { before: 3000 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: data.restaurantName,
          bold: true,
          size: 56,
          font: "Calibri",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: data.manualTitle,
          size: 32,
          font: "Calibri",
          color: "333333",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Prepared for: ${data.ownerName}`,
          size: 24,
          font: "Calibri",
          color: "555555",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: today,
          size: 22,
          font: "Calibri",
          color: "777777",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 3000 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Confidential - ${data.restaurantName} Internal Use Only`,
          size: 18,
          font: "Calibri",
          color: "999999",
        }),
      ],
      alignment: AlignmentType.CENTER,
      border: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      },
      spacing: { before: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "", break: 1 })],
      pageBreakBefore: false,
    }),
  ];

  const contentParagraphs: Array<Paragraph | Table> = [];

  const sortedTemplates = data.templates.sort(
    (a, b) => a.sequenceOrder - b.sequenceOrder
  );

  for (let idx = 0; idx < sortedTemplates.length; idx++) {
    const t = sortedTemplates[idx];

    contentParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: t.title,
            bold: true,
            size: 32,
            font: "Calibri",
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 100 },
        pageBreakBefore: idx > 0,
      })
    );

    contentParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${t.section} | ${t.contentType}`.toUpperCase(),
            size: 18,
            font: "Calibri",
            color: "666666",
          }),
        ],
        spacing: { after: 200 },
      })
    );

    if (t.keyPoints?.length) {
      contentParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Key Points: ",
              bold: true,
              size: 20,
              font: "Calibri",
            }),
            new TextRun({
              text: t.keyPoints.join(" | "),
              size: 20,
              font: "Calibri",
              color: "555555",
            }),
          ],
          spacing: { after: 200 },
          shading: { type: "clear" as any, fill: "F3F4F6" },
        })
      );
    }

    const parsed = parseContentToDocxParagraphs(t.content);
    contentParagraphs.push(...parsed);
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${data.restaurantName} - ${data.manualTitle} | Confidential`,
                    size: 16,
                    font: "Calibri",
                    color: "999999",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: [...coverPage, ...contentParagraphs],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `${data.restaurantName.replace(/\s+/g, "-")}-${data.manualTitle.replace(/\s+/g, "-")}-${dateStr}.docx`;

  if (
    typeof navigator !== "undefined" &&
    navigator.share &&
    navigator.canShare
  ) {
    const file = new File([blob], filename, {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${data.restaurantName} - ${data.manualTitle}`,
          files: [file],
        });
        return;
      }
    } catch {
      // fall through to download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
