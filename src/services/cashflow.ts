// src/services/cashflow.ts
// Cash flow projection utilities for upcoming salary obligations

import { Worker } from './workers';
import { Payment } from './payments';

/** Normalize to compare ids/names safely */
function norm(v: any) {
  return String(v ?? '').trim().toLowerCase();
}

/** Match a payment to a worker using id OR name */
function matchesPaymentToWorker(p: Payment, w: Worker): boolean {
  if (p.workerId && w.id && String(p.workerId) === String(w.id)) return true;
  const pid = norm(p.workerId);
  const pname = norm(p.workerName);
  const wid = norm(w.id);
  const wname = norm(w.name);
  if (pid && pid === wid) return true;
  if (pname && pname === wname) return true;
  if (pid && pid === wname) return true;
  if (pname && pname === wid) return true;
  return false;
}

/** How much was paid to a worker in a window */
function paidInWindowForWorker(
  payments: Payment[],
  w: Worker,
  start: Date,
  end: Date
): number {
  return payments.reduce((sum, p) => {
    if (!matchesPaymentToWorker(p, w)) return sum;
    const t = p.paidAt?.toDate?.();
    if (!t) return sum;
    return t >= start && t <= end
      ? sum + Number(p.amount ?? 0) + Number(p.bonus ?? 0)
      : sum;
  }, 0);
}

export type UpcomingObligation = {
  workerId: string;
  workerName: string;
  dueDate: Date;
  amount: number;
  isOverdue: boolean;
};

export type WeeklyBreakdown = {
  weekStart: Date;
  weekEnd: Date;
  totalAmount: number;
  workerCount: number;
  obligations: UpcomingObligation[];
};

export type CashFlowProjection = {
  totalNext30Days: number;
  totalNext60Days: number;
  overdueTotal: number;
  weeklyBreakdown: WeeklyBreakdown[];
  upcomingObligations: UpcomingObligation[];
};

/**
 * Compute upcoming salary obligations for the next 30/60 days.
 * Returns breakdown by week and total projections.
 */
export function computeCashFlowProjection(
  workers: Worker[],
  payments: Payment[],
  now: Date = new Date()
): CashFlowProjection {
  const nowSec = Math.floor(now.getTime() / 1000);
  const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const next60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const next30Sec = Math.floor(next30.getTime() / 1000);
  const next60Sec = Math.floor(next60.getTime() / 1000);

  const obligations: UpcomingObligation[] = [];
  let overdueTotal = 0;

  for (const w of workers) {
    // Skip former workers
    if (w.status === 'former') continue;

    const salary = Number(w.monthlySalaryAED ?? (w as any).baseSalary ?? 0) || 0;
    if (salary <= 0) continue;

    const dueTs = (w as any).nextDueAt?.seconds as number | undefined;
    if (!dueTs) continue;

    // Only include obligations within next 60 days
    if (dueTs > next60Sec) continue;

    const dueDate = new Date(dueTs * 1000);
    const isOverdue = dueTs <= nowSec;

    // Calculate outstanding amount for this due date
    // For simplicity, we'll use the full salary if it's upcoming
    // You could refine this to check payments in the relevant period
    const monthStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
    const monthEnd = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0);
    const paidSoFar = paidInWindowForWorker(payments, w, monthStart, monthEnd);
    const outstanding = Math.max(0, salary - paidSoFar);

    if (outstanding <= 0) continue;

    obligations.push({
      workerId: w.id!,
      workerName: w.name,
      dueDate,
      amount: outstanding,
      isOverdue,
    });

    if (isOverdue) {
      overdueTotal += outstanding;
    }
  }

  // Sort by due date
  obligations.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  // Calculate totals
  const totalNext30Days = obligations
    .filter((o) => o.dueDate <= next30)
    .reduce((sum, o) => sum + o.amount, 0);

  const totalNext60Days = obligations.reduce((sum, o) => sum + o.amount, 0);

  // Group by week for breakdown
  const weeklyMap = new Map<string, WeeklyBreakdown>();

  obligations.forEach((o) => {
    const weekStart = getWeekStart(o.dueDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const key = weekStart.toISOString();

    if (!weeklyMap.has(key)) {
      weeklyMap.set(key, {
        weekStart,
        weekEnd,
        totalAmount: 0,
        workerCount: 0,
        obligations: [],
      });
    }

    const week = weeklyMap.get(key)!;
    week.totalAmount += o.amount;
    week.workerCount += 1;
    week.obligations.push(o);
  });

  const weeklyBreakdown = Array.from(weeklyMap.values()).sort(
    (a, b) => a.weekStart.getTime() - b.weekStart.getTime()
  );

  return {
    totalNext30Days,
    totalNext60Days,
    overdueTotal,
    weeklyBreakdown,
    upcomingObligations: obligations,
  };
}

/**
 * Get the start of the week (Monday) for a given date.
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}
