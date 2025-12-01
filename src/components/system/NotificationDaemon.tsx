import React from 'react';
import { AppState } from 'react-native';
import type { DueSummary } from '../../services/alerts';
import { computeDueSummary } from '../../services/alerts';
import { subscribeMyWorkers, Worker } from '../../services/workers';
import { subscribeMyPaymentsInRange, Payment, monthRange } from '../../services/payments';
import { ensureDueNotification } from '../../services/notifications';

type Props = {
  /** Optional: push live summary up to the dashboard */
  onSummary?: React.Dispatch<React.SetStateAction<DueSummary>>;
};

/**
 * Lightweight background refresher:
 * - subscribes to workers and current-month payments
 * - recomputes the due summary
 * - creates notifications for overdue salaries
 * - calls onSummary whenever it changes
 */
export default function NotificationDaemon({ onSummary }: Props) {
  const [{ start, end }] = React.useState(() => monthRange());
  const [workers, setWorkers] = React.useState<Worker[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);

  // Subscriptions
  React.useEffect(() => {
    let u1: undefined | (() => void);
    let u2: undefined | (() => void);
    try { u1 = subscribeMyWorkers(setWorkers); } catch {}
    try { u2 = subscribeMyPaymentsInRange({ start, end }, setPayments); } catch {}
    return () => { u1 && u1(); u2 && u2(); };
  }, [start, end]);

  // Re-compute on changes and create notifications for overdue workers
  React.useEffect(() => {
    const s = computeDueSummary(workers, payments, new Date());
    onSummary?.(s);

    // Create notifications for overdue workers
    if (workers.length > 0) {
      const now = new Date();
      const nowSec = Math.floor(now.getTime() / 1000);
      const mStartSec = Math.floor(start.getTime() / 1000);
      const mEndSec = Math.floor(end.getTime() / 1000);

      workers.forEach((w) => {
        const dueTs = (w as any).nextDueAt?.seconds as number | undefined;
        if (!dueTs) return;

        // Check if due date is in this month and overdue
        const inThisMonth = dueTs >= mStartSec && dueTs <= mEndSec;
        if (!inThisMonth) return;

        const isOverdue = dueTs <= nowSec;
        if (!isOverdue) return;

        // Calculate remaining salary
        const salaryAED = Number((w as any).monthlySalaryAED ?? (w as any).baseSalary ?? 0) || 0;
        const paidAED = payments.reduce((sum, p) => {
          const matches = String(p.workerId) === String(w.id) || 
                         String(p.workerName).toLowerCase() === String(w.name).toLowerCase();
          if (!matches) return sum;
          const pDate = p.paidAt?.toDate?.();
          if (!pDate || pDate < start || pDate > end) return sum;
          return sum + Number(p.amount ?? 0) + Number(p.bonus ?? 0);
        }, 0);
        
        const remaining = Math.max(0, salaryAED - paidAED);
        if (remaining <= 0) return;

        // Create notification
        const dueKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        ensureDueNotification({
          workerId: w.id!,
          workerName: w.name,
          dueKey,
        }).catch(() => {});
      });
    }
  }, [workers, payments, onSummary, start, end]);

  // Recompute when app foregrounds
  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const s = computeDueSummary(workers, payments, new Date());
        onSummary?.(s);
      }
    });
    return () => sub.remove();
  }, [workers, payments, onSummary]);

  return null;
}
