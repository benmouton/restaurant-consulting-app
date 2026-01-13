import * as Papa from "papaparse";
import * as XLSX from "xlsx";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

export interface ParsedDocument {
  rawText: string;
  structuredMetrics: FinancialMetrics | null;
  error?: string;
}

export interface FinancialMetrics {
  documentType: string;
  period?: string;
  revenue?: {
    total?: number;
    foodSales?: number;
    beverageSales?: number;
    otherIncome?: number;
  };
  costs?: {
    foodCost?: number;
    foodCostPercent?: number;
    beverageCost?: number;
    beverageCostPercent?: number;
    totalCOGS?: number;
    cogsPercent?: number;
  };
  labor?: {
    totalLabor?: number;
    laborPercent?: number;
    hourlyWages?: number;
    salaries?: number;
    benefits?: number;
    payrollTaxes?: number;
  };
  primeCost?: {
    total?: number;
    percent?: number;
  };
  operatingExpenses?: {
    rent?: number;
    utilities?: number;
    marketing?: number;
    repairs?: number;
    insurance?: number;
    other?: number;
    total?: number;
  };
  profitability?: {
    grossProfit?: number;
    grossMargin?: number;
    operatingIncome?: number;
    operatingMargin?: number;
    netIncome?: number;
    netMargin?: number;
  };
  salesMetrics?: {
    covers?: number;
    averageCheck?: number;
    salesPerLaborHour?: number;
    revenuePerSeat?: number;
  };
  rawData?: Record<string, unknown>[];
}

export async function parseDocument(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<ParsedDocument> {
  try {
    if (mimeType === "application/pdf") {
      return await parsePDF(buffer);
    } else if (mimeType === "text/csv" || filename.endsWith(".csv")) {
      return parseCSV(buffer);
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimeType === "application/vnd.ms-excel" ||
      filename.endsWith(".xlsx") ||
      filename.endsWith(".xls")
    ) {
      return parseExcel(buffer);
    } else {
      return {
        rawText: buffer.toString("utf-8"),
        structuredMetrics: null,
        error: "Unsupported file type. Please upload PDF, CSV, or Excel files.",
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown parsing error";
    return {
      rawText: "",
      structuredMetrics: null,
      error: `Failed to parse document: ${message}`,
    };
  }
}

async function parsePDF(buffer: Buffer): Promise<ParsedDocument> {
  const data = await pdf(buffer);
  const rawText = data.text;
  const metrics = extractMetricsFromText(rawText);
  
  return {
    rawText,
    structuredMetrics: metrics,
  };
}

function parseCSV(buffer: Buffer): ParsedDocument {
  const csvText = buffer.toString("utf-8");
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  
  const rawText = csvText;
  const metrics = extractMetricsFromRows(result.data as Record<string, unknown>[]);
  
  return {
    rawText,
    structuredMetrics: metrics,
  };
}

function parseExcel(buffer: Buffer): ParsedDocument {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const allData: Record<string, unknown>[] = [];
  const textParts: string[] = [];
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    allData.push(...(data as Record<string, unknown>[]));
    
    const text = XLSX.utils.sheet_to_csv(sheet);
    textParts.push(`=== ${sheetName} ===\n${text}`);
  }
  
  const rawText = textParts.join("\n\n");
  const metrics = extractMetricsFromRows(allData);
  
  return {
    rawText,
    structuredMetrics: metrics,
  };
}

function extractMetricsFromText(text: string): FinancialMetrics {
  const metrics: FinancialMetrics = {
    documentType: detectDocumentType(text),
  };
  
  const patterns = {
    revenue: /(?:total\s+)?(?:sales|revenue)[:\s]*\$?([\d,]+\.?\d*)/gi,
    foodSales: /food\s+sales?[:\s]*\$?([\d,]+\.?\d*)/gi,
    beverageSales: /(?:beverage|bar|alcohol)\s+sales?[:\s]*\$?([\d,]+\.?\d*)/gi,
    foodCost: /food\s+cost[:\s]*\$?([\d,]+\.?\d*)/gi,
    laborCost: /(?:total\s+)?labor[:\s]*\$?([\d,]+\.?\d*)/gi,
    netIncome: /net\s+(?:income|profit)[:\s]*\$?([\d,]+\.?\d*)/gi,
    grossProfit: /gross\s+profit[:\s]*\$?([\d,]+\.?\d*)/gi,
    primeCost: /prime\s+cost[:\s]*\$?([\d,]+\.?\d*)/gi,
    covers: /(?:covers|guests)[:\s]*([\d,]+)/gi,
    averageCheck: /(?:average|avg)\s+check[:\s]*\$?([\d,]+\.?\d*)/gi,
  };
  
  const extractNumber = (pattern: RegExp): number | undefined => {
    const match = pattern.exec(text);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ""));
    }
    return undefined;
  };
  
  const totalRevenue = extractNumber(patterns.revenue);
  const foodSales = extractNumber(patterns.foodSales);
  const beverageSales = extractNumber(patterns.beverageSales);
  
  if (totalRevenue || foodSales || beverageSales) {
    metrics.revenue = {
      total: totalRevenue,
      foodSales,
      beverageSales,
    };
  }
  
  const foodCost = extractNumber(patterns.foodCost);
  if (foodCost) {
    metrics.costs = {
      foodCost,
      foodCostPercent: totalRevenue ? (foodCost / totalRevenue) * 100 : undefined,
    };
  }
  
  const laborCost = extractNumber(patterns.laborCost);
  if (laborCost) {
    metrics.labor = {
      totalLabor: laborCost,
      laborPercent: totalRevenue ? (laborCost / totalRevenue) * 100 : undefined,
    };
  }
  
  const primeCost = extractNumber(patterns.primeCost);
  if (primeCost || (foodCost && laborCost)) {
    metrics.primeCost = {
      total: primeCost || (foodCost || 0) + (laborCost || 0),
      percent: totalRevenue
        ? ((primeCost || (foodCost || 0) + (laborCost || 0)) / totalRevenue) * 100
        : undefined,
    };
  }
  
  const netIncome = extractNumber(patterns.netIncome);
  const grossProfit = extractNumber(patterns.grossProfit);
  if (netIncome || grossProfit) {
    metrics.profitability = {
      netIncome,
      netMargin: totalRevenue && netIncome ? (netIncome / totalRevenue) * 100 : undefined,
      grossProfit,
      grossMargin: totalRevenue && grossProfit ? (grossProfit / totalRevenue) * 100 : undefined,
    };
  }
  
  const covers = extractNumber(patterns.covers);
  const avgCheck = extractNumber(patterns.averageCheck);
  if (covers || avgCheck) {
    metrics.salesMetrics = {
      covers,
      averageCheck: avgCheck || (totalRevenue && covers ? totalRevenue / covers : undefined),
    };
  }
  
  return metrics;
}

function extractMetricsFromRows(data: Record<string, unknown>[]): FinancialMetrics {
  const metrics: FinancialMetrics = {
    documentType: "spreadsheet_data",
    rawData: data.slice(0, 100),
  };
  
  let totalRevenue = 0;
  let foodCost = 0;
  let laborCost = 0;
  let covers = 0;
  
  for (const row of data) {
    for (const [key, value] of Object.entries(row)) {
      const lowerKey = key.toLowerCase();
      const numValue = typeof value === "number" ? value : parseFloat(String(value).replace(/[$,]/g, ""));
      
      if (isNaN(numValue)) continue;
      
      if (lowerKey.includes("total") && (lowerKey.includes("sales") || lowerKey.includes("revenue"))) {
        totalRevenue += numValue;
      } else if (lowerKey.includes("food") && lowerKey.includes("cost")) {
        foodCost += numValue;
      } else if (lowerKey.includes("labor") || lowerKey.includes("payroll")) {
        laborCost += numValue;
      } else if (lowerKey.includes("cover") || lowerKey.includes("guest")) {
        covers += numValue;
      }
    }
  }
  
  if (totalRevenue > 0) {
    metrics.revenue = { total: totalRevenue };
    
    if (foodCost > 0) {
      metrics.costs = {
        foodCost,
        foodCostPercent: (foodCost / totalRevenue) * 100,
      };
    }
    
    if (laborCost > 0) {
      metrics.labor = {
        totalLabor: laborCost,
        laborPercent: (laborCost / totalRevenue) * 100,
      };
    }
    
    if (foodCost > 0 || laborCost > 0) {
      const prime = foodCost + laborCost;
      metrics.primeCost = {
        total: prime,
        percent: (prime / totalRevenue) * 100,
      };
    }
    
    if (covers > 0) {
      metrics.salesMetrics = {
        covers,
        averageCheck: totalRevenue / covers,
      };
    }
  }
  
  return metrics;
}

function detectDocumentType(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("p&l") || lowerText.includes("profit and loss") || lowerText.includes("income statement")) {
    return "pl_statement";
  }
  if (lowerText.includes("daily sales") || lowerText.includes("sales report") || lowerText.includes("daily report")) {
    return "sales_report";
  }
  if (lowerText.includes("labor report") || lowerText.includes("payroll") || lowerText.includes("time sheet")) {
    return "labor_report";
  }
  if (lowerText.includes("inventory") || lowerText.includes("food cost report")) {
    return "inventory";
  }
  
  return "other";
}
