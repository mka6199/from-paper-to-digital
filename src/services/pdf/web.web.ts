import type { CreateWebPDFArgs } from './web.types';
import { logger } from '../../utils/logger';

export async function createWebPDF({ data, options, helpers }: CreateWebPDFArgs): Promise<void> {
  try {
    const jsPdfMod: any = await import('jspdf');
    const jsPDF = jsPdfMod?.jsPDF ?? jsPdfMod?.default?.jsPDF ?? jsPdfMod?.default ?? jsPdfMod;
    const autoTableMod: any = await import('jspdf-autotable');
    const autoTable = autoTableMod?.default ?? autoTableMod;

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Payment History Report', 14, 22);

    doc.setFontSize(11);
    const startStr = helpers.formatDate(options.startDate);
    const endStr = helpers.formatDate(options.endDate);
    doc.text(`Period: ${startStr} to ${endStr}`, 14, 32);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 38);

    const allColumns = ['date', 'workerName', 'amount', 'bonus', 'method', 'note'];
    const columns = options.columns && options.columns.length > 0 ? options.columns : allColumns;

    const headerMap: Record<string, string> = {
      date: 'Date',
      workerName: 'Worker',
      amount: 'Amount',
      bonus: 'Bonus',
      method: 'Method',
      note: 'Note',
    };

    const headers = [columns.map((col) => headerMap[col] || col)];

    const body = data.map((p) =>
      columns.map((col) => {
        const value = (p as any)[col];
        if (col === 'amount' || col === 'bonus') {
          return helpers.formatMoney(Number(value), options);
        }
        return String(value ?? '');
      })
    );

    autoTable(doc, {
      head: headers,
      body,
      startY: 45,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 139, 202] },
    });

    if (options.includeTotal) {
      const totals = helpers.calculateTotals(data);
      const finalY = (doc as any).lastAutoTable.finalY + 10;

      doc.setFontSize(11);
      doc.text('Summary', 14, finalY);
      doc.setFontSize(9);
      doc.text(`Total Payments: ${data.length}`, 14, finalY + 6);
      doc.text(`Total Amount: ${helpers.formatMoney(totals.amount, options)}`, 14, finalY + 12);
      doc.text(`Total Bonus: ${helpers.formatMoney(totals.bonus, options)}`, 14, finalY + 18);
      doc.text(`Grand Total: ${helpers.formatMoney(totals.total, options)}`, 14, finalY + 24);
    }

    doc.save(`payment-history-${startStr}-to-${endStr}.pdf`);
  } catch (error) {
    logger.error('PDF export failed:', error);
    const msg = (error as any)?.message || String(error);
    if (/Cannot find module|jspdf/i.test(msg)) {
      throw new Error('PDF export requires a dev-server restart after installing jspdf. Please stop and start Expo.');
    }
    throw new Error(msg);
  }
}
