// Tiny utilities to compute “due soon / overdue” salary information
// for the current month, based on your existing Workers & Payments services.

import { Worker } from './workers';
import { Payment, monthRange } from './payments';

/** What the dashboard/notifications need for salary alerts */
export type DueSummary = {
  overdueCount: number;
  overdueAmountAED: number;
  dueSoonCount: number;
  dueSoonAmountAED: number;
};

/** Normalize to compare ids/names safely */
function norm(v: any) {
  return String(v ?? '').trim().toLowerCase();
}

/** Match a payment to a worker using id OR name (your app stores both ways) */
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

/** How much (amount+bonus) was paid to a worker in a window */
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

/**
 * Compute current-month summary of overdue & due-soon amounts.
 * A worker is counted if they have remaining salary this month and a nextDueAt inside this month.
 * - overdue: nextDueAt <= now
 * - due soon: nextDueAt > now (still inside this month)
 */
export function computeDueSummary(
  workers: Worker[],
  payments: Payment[],
  now: Date = new Date()
): DueSummary {
  const { start: mStart, end: mEnd } = monthRange(now);
  const nowSec = Math.floor(now.getTime() / 1000);
  const mStartSec = Math.floor(mStart.getTime() / 1000);
  const mEndSec = Math.floor(mEnd.getTime() / 1000);

  let overdueCount = 0;
  let overdueAmountAED = 0;
  let dueSoonCount = 0;
  let dueSoonAmountAED = 0;

  const salaryOf = (w: Worker) =>
    Number(w.monthlySalaryAED ?? (w as any).baseSalary ?? 0) || 0;

  for (const w of workers) {
    const dueTs = (w as any).nextDueAt?.seconds as number | undefined;
    if (!dueTs) continue;

    // Only count dues that fall inside this month
    const inThisMonth = dueTs >= mStartSec && dueTs <= mEndSec;
    if (!inThisMonth) continue;

    const remaining = Math.max(
      0,
      salaryOf(w) - paidInWindowForWorker(payments, w, mStart, mEnd)
    );
    if (remaining <= 0) continue;

    if (dueTs <= nowSec) {
      overdueCount += 1;
      overdueAmountAED += remaining;
    } else {
      dueSoonCount += 1;
      dueSoonAmountAED += remaining;
    }
  }

  return { overdueCount, overdueAmountAED, dueSoonCount, dueSoonAmountAED };
}
