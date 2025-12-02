// src/services/payruns.ts
// Pay Run service: batch payment workflows for multiple workers at once

import { db, auth, ensureAuth } from '../config/firebase';
import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';
import { Worker } from './workers';
import { Payment, monthRange, addPaymentRaw } from './payments';

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

export type WorkerDueItem = {
  worker: Worker;
  salary: number;
  paidSoFar: number;
  outstanding: number;
  dueAt: Date | null;
  isOverdue: boolean;
};

export type PayRun = {
  id?: string;
  ownerUid: string;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  totalAmount: number;
  workerCount: number;
  workerIds: string[];
  paymentIds: string[];
  createdAt?: Timestamp;
  note?: string;
};

const PAYRUNS_COL = collection(db, 'pay_runs');

/**
 * Fetch all workers that have outstanding salaries in the given period.
 * Returns array of WorkerDueItem with salary, paid so far, and outstanding amount.
 */
export function computeDueWorkersForPeriod(
  workers: Worker[],
  payments: Payment[],
  start: Date,
  end: Date,
  now: Date = new Date()
): WorkerDueItem[] {
  const nowSec = Math.floor(now.getTime() / 1000);
  const startSec = Math.floor(start.getTime() / 1000);
  const endSec = Math.floor(end.getTime() / 1000);

  const items: WorkerDueItem[] = [];

  for (const w of workers) {
    // Skip former workers
    if (w.status === 'former') continue;

    const salary = Number(w.monthlySalaryAED ?? (w as any).baseSalary ?? 0) || 0;
    if (salary <= 0) continue;

    const dueTs = (w as any).nextDueAt?.seconds as number | undefined;
    if (!dueTs) continue;

    // Only include if due date falls within the period
    const inPeriod = dueTs >= startSec && dueTs <= endSec;
    if (!inPeriod) continue;

    const paidSoFar = paidInWindowForWorker(payments, w, start, end);
    const outstanding = Math.max(0, salary - paidSoFar);

    // Only include if there's outstanding amount
    if (outstanding <= 0) continue;

    const dueAt = new Date(dueTs * 1000);
    const isOverdue = dueTs <= nowSec;

    items.push({
      worker: w,
      salary,
      paidSoFar,
      outstanding,
      dueAt,
      isOverdue,
    });
  }

  // Sort: overdue first, then by due date ascending
  items.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    const tA = a.dueAt?.getTime() ?? 0;
    const tB = b.dueAt?.getTime() ?? 0;
    return tA - tB;
  });

  return items;
}

/**
 * Create a pay run: for each selected worker, create a Payment record,
 * then aggregate into a single PayRun entry in Firestore.
 */
export async function createPayRun(params: {
  periodStart: Date;
  periodEnd: Date;
  selectedWorkers: WorkerDueItem[];
  method?: 'cash' | 'bank' | 'other';
  note?: string;
}): Promise<string> {
  await ensureAuth();
  const uid = auth.currentUser!.uid;

  const { periodStart, periodEnd, selectedWorkers, method = 'cash', note } = params;

  if (selectedWorkers.length === 0) {
    throw new Error('No workers selected for pay run');
  }

  // Create individual payment records
  const paymentIds: string[] = [];
  let totalAmount = 0;

  for (const item of selectedWorkers) {
    const paymentId = await addPaymentRaw({
      workerId: item.worker.id!,
      workerName: item.worker.name,
      amount: item.outstanding,
      bonus: 0,
      method,
      note: note ? `Pay run: ${note}` : 'Pay run payment',
    });
    paymentIds.push(paymentId);
    totalAmount += item.outstanding;
  }

  // Create the pay run aggregate record
  const payRunData: Omit<PayRun, 'id'> = {
    ownerUid: uid,
    periodStart: Timestamp.fromDate(periodStart),
    periodEnd: Timestamp.fromDate(periodEnd),
    totalAmount,
    workerCount: selectedWorkers.length,
    workerIds: selectedWorkers.map((item) => item.worker.id!),
    paymentIds,
    createdAt: serverTimestamp() as Timestamp,
    note: note ?? '',
  };

  const ref = await addDoc(PAYRUNS_COL, payRunData);
  return ref.id;
}

/**
 * List all pay runs for the current user, ordered by creation date descending.
 */
export async function listPayRuns(): Promise<PayRun[]> {
  await ensureAuth();
  const uid = auth.currentUser!.uid;

  const q = query(
    PAYRUNS_COL,
    where('ownerUid', '==', uid),
    orderBy('createdAt', 'desc')
  );

  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as PayRun[];
}

/**
 * Subscribe to pay runs for the current user.
 */
export function subscribePayRuns(cb: (runs: PayRun[]) => void): () => void {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  const q = query(
    PAYRUNS_COL,
    where('ownerUid', '==', uid),
    orderBy('createdAt', 'desc')
  );

  const unsub = onSnapshot(q, (snap) => {
    const runs = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PayRun[];
    cb(runs);
  });

  return unsub;
}
