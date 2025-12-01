import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { logger } from '../utils/logger';
import { showAlert } from '../utils/alert';

export interface ExportOptions {
  startDate: Date;
  endDate: Date;
  format: 'csv' | 'xlsx' | 'json' | 'pdf' | 'txt';
  workerIds?: string[]; // Filter by specific workers (empty = all)
  columns?: string[]; // Which columns to include (empty = all)
  includeTotal?: boolean; // Add totals row/section
  groupBy?: 'worker' | 'date' | 'none'; // Group payments
  currencyCode?: string; // Selected currency code (e.g., 'AED')
  currencySymbol?: string; // Optional symbol override
  formatCurrency?: (amountAED: number) => string; // Formats AED input to selected currency string
  convertFromAED?: (amountAED: number) => number; // Converts AED input to selected currency numeric value
}

export interface PaymentExportData {
  date: string;
  workerId: string;
  workerName: string;
  amount: number;
  bonus: number;
  method: string;
  note: string;
}

/**
 * Format date consistently across all export formats
 */
function formatDate(date: Date | any): string {
  if (!date) return '—';
  const d = date?.toDate ? date.toDate() : (date instanceof Date ? date : null);
  if (!d) return '—';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Filter and transform payment data based on options
 */
function preparePaymentData(
  payments: any[],
  options: ExportOptions
): PaymentExportData[] {
  let filtered = payments;

  // Filter by worker IDs if specified
  if (options.workerIds && options.workerIds.length > 0) {
    filtered = filtered.filter(p => options.workerIds!.includes(p.workerId));
  }

  // Transform to consistent format
  const data = filtered.map(p => ({
    date: formatDate(p.paidAt),
    workerId: p.workerId || 'Unknown',
    workerName: p.workerName || p.workerId || 'Unknown',
    amount: Number(p.amount || 0),
    bonus: Number(p.bonus || 0),
    method: p.method || '—',
    note: p.note || '',
  }));

  // Sort by date and worker name
  data.sort((a, b) => {
    if (options.groupBy === 'worker') {
      if (a.workerName !== b.workerName) {
        return a.workerName.localeCompare(b.workerName);
      }
      return a.date.localeCompare(b.date);
    } else if (options.groupBy === 'date') {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.workerName.localeCompare(b.workerName);
    }
    return a.date.localeCompare(b.date);
  });

  return data;
}

/**
 * Calculate totals for export data
 */
function calculateTotals(data: PaymentExportData[]) {
  return data.reduce(
    (acc, p) => ({
      amount: acc.amount + p.amount,
      bonus: acc.bonus + p.bonus,
      total: acc.total + p.amount + p.bonus,
    }),
    { amount: 0, bonus: 0, total: 0 }
  );
}

function getCurrencySymbol(code?: string, symbolOverride?: string) {
  if (symbolOverride) return symbolOverride;
  const map: Record<string, string> = {
    AED: 'AED',
    USD: '$',
    EUR: '€',
    GBP: '£',
    SAR: 'SAR',
    INR: '₹',
    PKR: '₨',
    CAD: 'CA$',
    AUD: 'A$',
    JPY: '¥',
  };
  return map[code || 'AED'] || code || '';
}

function formatMoney(amountAED: number, options: ExportOptions): string {
  if (options.formatCurrency) return options.formatCurrency(amountAED);
  const code = options.currencyCode || 'AED';
  const sym = getCurrencySymbol(code, options.currencySymbol);
  const rounded = Math.round(amountAED).toLocaleString();
  if (code === 'AED' || code === 'SAR') return `${rounded} ${code}`;
  return `${sym}${rounded}`;
}

function convertNumber(amountAED: number, options: ExportOptions): number {
  return options.convertFromAED ? options.convertFromAED(amountAED) : amountAED;
}

/**
 * Build an HTML report for PDF generation on mobile.
 */
function buildPaymentsHTML(
  data: PaymentExportData[],
  options: ExportOptions
): string {
  const startStr = formatDate(options.startDate);
  const endStr = formatDate(options.endDate);
  const columns = (options.columns && options.columns.length > 0)
    ? options.columns
    : ['date', 'workerName', 'amount', 'bonus', 'method', 'note'];

  const headerMap: Record<string, string> = {
    date: 'Date',
    workerName: 'Worker',
    amount: `Amount (${options.currencyCode || 'AED'})`,
    bonus: `Bonus (${options.currencyCode || 'AED'})`,
    method: 'Method',
    note: 'Note',
  };

  const esc = (s: any) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const headRow = columns.map((c) => `<th>${esc(headerMap[c] || c)}</th>`).join('');
  const rows = data.map((p) => {
    const cells = columns.map((c) => {
      const v = (p as any)[c];
      if (c === 'amount' || c === 'bonus') {
        return `<td style="text-align:right">${esc(formatMoney(Number(v || 0), options))}</td>`;
      }
      return `<td>${esc(v ?? '')}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  let totalsHtml = '';
  if (options.includeTotal) {
    const totals = calculateTotals(data);
    totalsHtml = `
      <div class="summary">
        <div><strong>Total Payments:</strong> ${data.length}</div>
        <div><strong>Total Amount:</strong> ${esc(formatMoney(totals.amount, options))}</div>
        <div><strong>Total Bonus:</strong> ${esc(formatMoney(totals.bonus, options))}</div>
        <div><strong>Grand Total:</strong> ${esc(formatMoney(totals.total, options))}</div>
      </div>`;
  }

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; padding: 20px; color: #111827; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .sub { color: #6B7280; font-size: 12px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 12px; vertical-align: top; }
    th { background: #f3f4f6; text-align: left; }
    .summary { margin-top: 16px; font-size: 12px; }
  </style>
  <title>Payment History</title>
  </head>
  <body>
    <h1>Payment History</h1>
    <div class="sub">Period: ${startStr} to ${endStr} • Generated: ${esc(new Date().toLocaleString())}</div>
    <table>
      <thead><tr>${headRow}</tr></thead>
      <tbody>
        ${rows || '<tr><td colspan="6">No data</td></tr>'}
      </tbody>
    </table>
    ${totalsHtml}
  </body>
</html>`;
}

async function exportPDFMobile(
  data: PaymentExportData[],
  options: ExportOptions
): Promise<void> {
  const Print: any = await import('expo-print');
  const html = buildPaymentsHTML(data, options);
  const { uri } = await Print.printToFileAsync({ html });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Export Payment History',
    });
  } else {
    showAlert('Export Successful', `PDF saved to:\n${uri}`);
  }
}

/**
 * Export to CSV format
 */
export function exportToCSV(
  data: PaymentExportData[],
  options: ExportOptions
): string {
  // Determine which columns to include
  const allColumns = ['date', 'workerName', 'amount', 'bonus', 'method', 'note'];
  const columns = options.columns && options.columns.length > 0
    ? options.columns
    : allColumns;

  // Build header
  const headerMap: Record<string, string> = {
    date: 'Date',
    workerName: 'Worker',
    amount: 'Amount',
    bonus: 'Bonus',
    method: 'Method',
    note: 'Note',
  };
  const header = columns.map(col => headerMap[col] || col).join(',') + '\n';

  // Build rows
  const rows = data.map(p => {
    const values = columns.map(col => {
      const value = p[col as keyof PaymentExportData];
      if (col === 'amount') {
        const num = convertNumber(Number(value || 0), options);
        return String(num);
      }
      if (col === 'bonus') {
        const num = convertNumber(Number(value || 0), options);
        return String(num);
      }
      if (col === 'note') {
        // Escape CSV special characters in notes
        return `"${String(value).replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      }
      if (col === 'workerName') {
        return `"${value}"`;
      }
      return String(value);
    });
    return values.join(',');
  }).join('\n');

  let csv = header + rows;

  // Add totals if requested
  if (options.includeTotal) {
    const totalsAED = calculateTotals(data);
    const amountConv = convertNumber(totalsAED.amount, options);
    const bonusConv = convertNumber(totalsAED.bonus, options);
    const totalConv = convertNumber(totalsAED.total, options);
    csv += '\n\n';
    csv += 'Total Payments,' + data.length + '\n';
    csv += 'Total Amount,' + amountConv.toFixed(2) + '\n';
    csv += 'Total Bonus,' + bonusConv.toFixed(2) + '\n';
    csv += 'Grand Total,' + totalConv.toFixed(2) + '\n';
  }

  return csv;
}

/**
 * Export to JSON format
 */
export function exportToJSON(
  data: PaymentExportData[],
  options: ExportOptions
): string {
  const exportData: any = {
    exportDate: new Date().toISOString(),
    dateRange: {
      start: formatDate(options.startDate),
      end: formatDate(options.endDate),
    },
    currency: options.currencyCode || 'AED',
    payments: data.map(p => ({
      ...p,
      amount: convertNumber(p.amount, options),
      bonus: convertNumber(p.bonus, options),
    })),
  };

  if (options.includeTotal) {
    const totals = calculateTotals(data);
    exportData.totals = {
      amount: convertNumber(totals.amount, options),
      bonus: convertNumber(totals.bonus, options),
      total: convertNumber(totals.total, options),
    };
  }

  if (options.groupBy && options.groupBy !== 'none') {
    exportData.groupedBy = options.groupBy;
  }

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export to plain text format
 */
export function exportToText(
  data: PaymentExportData[],
  options: ExportOptions
): string {
  const startStr = formatDate(options.startDate);
  const endStr = formatDate(options.endDate);
  
  let text = '═══════════════════════════════════════════\n';
  text += '       PAYMENT HISTORY REPORT\n';
  text += '═══════════════════════════════════════════\n';
  text += `Period: ${startStr} to ${endStr}\n`;
  text += `Generated: ${new Date().toLocaleString()}\n`;
  text += '═══════════════════════════════════════════\n\n';

  if (options.groupBy === 'worker') {
    // Group by worker
    const byWorker = new Map<string, PaymentExportData[]>();
    data.forEach(p => {
      const list = byWorker.get(p.workerName) || [];
      list.push(p);
      byWorker.set(p.workerName, list);
    });

    byWorker.forEach((payments, workerName) => {
      text += `▶ ${workerName}\n`;
      text += '─'.repeat(43) + '\n';
      
      payments.forEach(p => {
        const amount = formatMoney(p.amount, options);
        const bonus = p.bonus > 0 ? formatMoney(p.bonus, options) : '';
        text += `  ${p.date}  ${amount}`;
        if (p.bonus > 0) {
          text += ` + ${bonus} bonus`;
        }
        text += `  [${p.method}]\n`;
        if (p.note) {
          text += `  Note: ${p.note}\n`;
        }
      });

      const workerTotal = payments.reduce((sum, p) => sum + p.amount + p.bonus, 0);
      text += `  Subtotal: ${formatMoney(workerTotal, options)}\n\n`;
    });
  } else if (options.groupBy === 'date') {
    // Group by date
    const byDate = new Map<string, PaymentExportData[]>();
    data.forEach(p => {
      const list = byDate.get(p.date) || [];
      list.push(p);
      byDate.set(p.date, list);
    });

    byDate.forEach((payments, date) => {
      text += `▶ ${date}\n`;
      text += '─'.repeat(43) + '\n';
      
      payments.forEach(p => {
        const amount = formatMoney(p.amount, options);
        const bonus = p.bonus > 0 ? formatMoney(p.bonus, options) : '';
        text += `  ${p.workerName}  ${amount}`;
        if (p.bonus > 0) {
          text += ` + ${bonus} bonus`;
        }
        text += `  [${p.method}]\n`;
        if (p.note) {
          text += `  Note: ${p.note}\n`;
        }
      });

      const dayTotal = payments.reduce((sum, p) => sum + p.amount + p.bonus, 0);
      text += `  Daily Total: ${formatMoney(dayTotal, options)}\n\n`;
    });
  } else {
    // No grouping
    data.forEach(p => {
      text += `${p.date} | ${p.workerName}\n`;
      text += `  Amount: ${formatMoney(p.amount, options)}`;
      if (p.bonus > 0) {
        text += ` + Bonus: ${formatMoney(p.bonus, options)}`;
      }
      text += `\n  Method: ${p.method}\n`;
      if (p.note) {
        text += `  Note: ${p.note}\n`;
      }
      text += '\n';
    });
  }

  if (options.includeTotal) {
    const totals = calculateTotals(data);
    text += '═══════════════════════════════════════════\n';
    text += 'SUMMARY\n';
    text += '═══════════════════════════════════════════\n';
    text += `Total Payments: ${data.length}\n`;
    text += `Total Amount: ${formatMoney(totals.amount, options)}\n`;
    text += `Total Bonus: ${formatMoney(totals.bonus, options)}\n`;
    text += `Grand Total: ${formatMoney(totals.total, options)}\n`;
  }

  return text;
}

/**
 * Export to Excel format (XLSX)
 * Requires: npm install xlsx
 */
export async function exportToExcel(
  data: PaymentExportData[],
  options: ExportOptions
): Promise<string> {
  try {
    const mod: any = await import('xlsx');
    const XLSX = mod?.default ?? mod; // handle ESM/CJS interop

    // Create worksheet data
    const allColumns = ['date', 'workerName', 'amount', 'bonus', 'method', 'note'];
    const columns = options.columns && options.columns.length > 0
      ? options.columns
      : allColumns;

    const headerMap: Record<string, string> = {
      date: 'Date',
      workerName: 'Worker',
      amount: `Amount (${options.currencyCode || 'AED'})`,
      bonus: `Bonus (${options.currencyCode || 'AED'})`,
      method: 'Method',
      note: 'Note',
    };

    // Build rows
    const wsData: any[][] = [];
    wsData.push(columns.map(col => headerMap[col] || col));
    
    data.forEach(p => {
      const row = columns.map(col => {
        const value = p[col as keyof PaymentExportData];
        if (col === 'amount' || col === 'bonus') {
          return convertNumber(Number(value), options);
        }
        return value;
      });
      wsData.push(row);
    });

    // Add totals if requested
    if (options.includeTotal) {
      const totals = calculateTotals(data);
      wsData.push([]);
      wsData.push(['Total Payments', data.length]);
      wsData.push(['Total Amount', convertNumber(totals.amount, options)]);
      wsData.push(['Total Bonus', convertNumber(totals.bonus, options)]);
      wsData.push(['Grand Total', convertNumber(totals.total, options)]);
    }

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    const colWidths = [
      { wch: 12 }, // Date
      { wch: 20 }, // Worker
      { wch: 10 }, // Amount
      { wch: 10 }, // Bonus
      { wch: 12 }, // Method
      { wch: 30 }, // Note
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Payments');

    // Convert to base64 for mobile or download for web
    if (Platform.OS === 'web') {
      XLSX.writeFile(wb, `payment-history-${formatDate(options.startDate)}-to-${formatDate(options.endDate)}.xlsx`);
      return 'downloaded';
    } else {
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      return wbout;
    }
  } catch (error) {
    logger.error('Excel export failed:', error);
    throw new Error('Excel export failed. If this persists, restart the dev server.');
  }
}

/**
 * Main export function - handles all formats and platform differences
 */
export async function exportPayments(
  payments: any[],
  options: ExportOptions
): Promise<void> {
  try {
    // Prepare data
    const data = preparePaymentData(payments, options);

    if (data.length === 0) {
      throw new Error('No payments found for the selected criteria.');
    }

    let content: string;
    let mimeType: string;
    let extension: string;

    // Generate content based on format
    switch (options.format) {
      case 'csv':
        content = exportToCSV(data, options);
        mimeType = 'text/csv';
        extension = 'csv';
        break;

      case 'json':
        content = exportToJSON(data, options);
        mimeType = 'application/json';
        extension = 'json';
        break;

      case 'txt':
        content = exportToText(data, options);
        mimeType = 'text/plain';
        extension = 'txt';
        break;

      case 'xlsx':
        const excelData = await exportToExcel(data, options);
        if (excelData === 'downloaded') {
          return; // Already downloaded on web
        }
        // On mobile, save base64 data
        content = excelData;
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        extension = 'xlsx';
        break;

      case 'pdf':
        if (Platform.OS === 'web') {
          const { createWebPDF } = await import('./pdf/web');
          await createWebPDF({
            data,
            options,
            helpers: {
              formatDate,
              formatMoney,
              calculateTotals,
            },
          });
          return;
        } else {
          await exportPDFMobile(data, options);
          return; // fully handled (saved/shared) on mobile
        }

      default:
        throw new Error('Unsupported export format');
    }

    // Handle file sharing/download on mobile
    if (Platform.OS !== 'web') {
      const startStr = formatDate(options.startDate);
      const endStr = formatDate(options.endDate);
      const fileName = `payment-history-${startStr}-to-${endStr}.${extension}`;

      if (extension === 'xlsx' || extension === 'pdf') {
        // Binary formats - write from base64
        const baseDir = (FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory;
        if (!baseDir) {
          throw new Error('No writable directory available');
        }

        const filePath = baseDir + fileName;
        await (FileSystem as any).writeAsStringAsync(filePath, content, {
          encoding: (FileSystem as any).EncodingType.Base64,
        });

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(filePath, {
            mimeType,
            dialogTitle: 'Export Payment History',
          });
        }
      } else {
        // Text formats - try Share API first
        try {
          const { Share } = require('react-native');
          await Share.share({
            message: content,
            title: 'Payment History Export',
          });
        } catch (shareError) {
          // Fallback to file system
          const baseDir = (FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory;
          if (!baseDir) {
            throw new Error('No writable directory available');
          }

          const filePath = baseDir + fileName;
          await (FileSystem as any).writeAsStringAsync(filePath, content, {
            encoding: (FileSystem as any).EncodingType.UTF8,
          });

          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(filePath, {
              mimeType,
              dialogTitle: 'Export Payment History',
            });
          } else {
            showAlert('Export Successful', `Saved to:\n${filePath}`);
          }
        }
      }
    } else {
      // Web: trigger a download for text formats (csv/json/txt)
      const startStr = formatDate(options.startDate);
      const endStr = formatDate(options.endDate);
      const fileName = `payment-history-${startStr}-to-${endStr}.${extension}`;

      try {
        let webContent: string | BlobPart = content;
        const typeWithCharset = `${mimeType};charset=utf-8`;
        // Add BOM for CSV to improve Excel compatibility
        if (extension === 'csv') {
          webContent = '\uFEFF' + content;
        }
        const blob = new Blob([webContent], { type: typeWithCharset });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      } catch (e) {
        // Fallback to data URL if Blob API fails
        const dataUrl = `data:${mimeType};charset=utf-8,` + encodeURIComponent(content);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = fileName;
        a.click();
        return;
      }
    }
  } catch (error) {
    logger.error('Export failed:', error);
    throw error;
  }
}
