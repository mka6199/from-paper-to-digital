import React from 'react';
import { AppState } from 'react-native';
import type { DueSummary } from '../../services/alerts';
import { computeDueSummary } from '../../services/alerts';
import { subscribeMyWorkers, Worker } from '../../services/workers';
import { subscribeMyPaymentsInRange, Payment, monthRange } from '../../services/payments';

type Props = {
  /** Optional: push live summary up to the dashboard */
  onSummary?: React.Dispatch<React.SetStateAction<DueSummary>>;
};

/**
 * Lightweight background refresher:
 * - subscribes to workers and current-month payments
 * - recomputes the due summary
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

  // Re-compute on changes
  React.useEffect(() => {
    const s = computeDueSummary(workers, payments, new Date());
    onSummary?.(s);
  }, [workers, payments, onSummary]);

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
