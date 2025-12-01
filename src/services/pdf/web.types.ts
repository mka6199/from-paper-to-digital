import type { ExportOptions, PaymentExportData } from '../export';

export type PdfHelpers = {
  formatDate: (date: Date | any) => string;
  formatMoney: (amountAED: number, options: ExportOptions) => string;
  calculateTotals: (data: PaymentExportData[]) => {
    amount: number;
    bonus: number;
    total: number;
  };
};

export interface CreateWebPDFArgs {
  data: PaymentExportData[];
  options: ExportOptions;
  helpers: PdfHelpers;
}
