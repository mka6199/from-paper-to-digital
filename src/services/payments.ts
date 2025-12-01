import { db, auth, ensureAuth } from '../config/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Worker, getWorker, getWorkerCycleWindow, advanceWorkerDue } from './workers';

export const monthKey = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export function monthRange(d: Date = new Date()): { start: Date; end: Date } {
  const s = new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0));
  const e = new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999));
  return { start: s, end: e };
}

export function rangeLast3Months(from: Date = new Date()): { start: Date; end: Date } {
  const end = monthRange(from).end;
  const startBase = new Date(Date.UTC(from.getFullYear(), from.getMonth() - 2, 1, 0, 0, 0, 0));
  const start = monthRange(startBase).start;
  return { start, end };
}

export function rangeThisYear(from: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(from.getFullYear(), 0, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(from.getFullYear(), 11, 31, 23, 59, 59, 999));
  return { start, end };
}

export type Payment = {
  id?: string;
  ownerUid: string;
  workerId: string;
  workerName?: string;
  amount: number;
  bonus?: number;
  method?: 'cash' | 'bank' | 'other';
  month?: string;
  paidAt?: Timestamp;
  note?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

const COL = collection(db, 'payments');

export async function addPaymentRaw(
  p: Omit<Payment, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt' | 'paidAt' | 'month'> & {
    month?: string;
  }
) {
  await ensureAuth();
  const uid = auth.currentUser!.uid;
  const ref = await addDoc(COL, {
    ...p,
    ownerUid: uid,
    month: p.month ?? monthKey(new Date()),
    paidAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export const addPayment = addPaymentRaw;

export async function recordPaymentAndAdvanceDue(params: {
  workerId: string;
  workerName?: string;
  amount: number;
  bonus?: number;
  method?: 'cash' | 'bank' | 'other';
  note?: string;
  month?: string;
}) {
  await ensureAuth();
  const uid = auth.currentUser!.uid;

  const payId = await addPaymentRaw({
    workerId: params.workerId,
    workerName: params.workerName ?? '',
    amount: Number(params.amount || 0),
    bonus: Number(params.bonus || 0),
    method: params.method ?? 'bank',
    note: params.note ?? '',
    month: params.month ?? monthKey(new Date()),
  });

  try {
    const w = (await getWorker(params.workerId)) as Worker | null;
    if (!w) return payId;

    const salary = Number(w.monthlySalaryAED ?? w.baseSalary ?? 0) || 0;
    if (salary <= 0) return payId;

    const { start, end } = getWorkerCycleWindow(w);
    const startTs = Timestamp.fromDate(start);
    const endTs = Timestamp.fromDate(end);

    const qy = query(
      COL,
      where('ownerUid', '==', uid),
      where('workerId', '==', params.workerId),
      where('paidAt', '>=', startTs),
      where('paidAt', '<=', endTs)
    );
    const snap = await getDocs(qy);

    const totalThisCycle = snap.docs.reduce((sum, d) => {
      const p = d.data() as any;
      return sum + Number(p.amount ?? 0) + Number(p.bonus ?? 0);
    }, 0);

    if (totalThisCycle >= salary) {
      await advanceWorkerDue(params.workerId, end);
    }
  } catch {}

  return payId;
}

export async function updatePayment(id: string, patch: Partial<Payment>) {
  await ensureAuth();
  await updateDoc(doc(db, 'payments', id), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePayment(id: string) {
  await ensureAuth();
  await deleteDoc(doc(db, 'payments', id));
}

export async function getPayment(id: string): Promise<Payment | null> {
  await ensureAuth();
  const snap = await getDoc(doc(db, 'payments', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as Payment;
}

export function subscribeMyRecentPayments(cb: (rows: Payment[]) => void): () => void {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  const qy = query(COL, where('ownerUid', '==', uid), orderBy('paidAt', 'desc'));
  return onSnapshot(
    qy,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Payment[];
      cb(list);
    },
    (err) => console.warn('subscribeMyRecentPayments error:', err)
  );
}

export function subscribeMyPaymentsInMonth(month: string, cb: (rows: Payment[]) => void): () => void {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  const qy = query(COL, where('ownerUid', '==', uid), where('month', '==', month));
  return onSnapshot(
    qy,
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }) as Payment)
        .sort((a, b) => {
          const ta = (a.paidAt?.toDate?.() ?? new Date()).getTime();
          const tb = (b.paidAt?.toDate?.() ?? new Date()).getTime();
          return tb - ta;
        });
      cb(list);
    },
    (err) => console.warn('subscribeMyPaymentsInMonth error:', err)
  );
}

function monthsBetween(start: Date, end: Date): string[] {
  const a = new Date(Date.UTC(start.getFullYear(), start.getMonth(), 1));
  const b = new Date(Date.UTC(end.getFullYear(), end.getMonth(), 1));
  const out: string[] = [];
  while (a <= b) {
    out.push(`${a.getUTCFullYear()}-${String(a.getUTCMonth() + 1).padStart(2, '0')}`);
    a.setUTCMonth(a.getUTCMonth() + 1);
  }
  return out;
}

function subscribeRangeViaMonths(
  uid: string,
  start: Date,
  end: Date,
  cb: (rows: Payment[]) => void
): () => void {
  const months = monthsBetween(start, end);
  const store: Record<string, Payment> = {};
  const unsubs: Array<() => void> = [];

  let permissionDeniedOnce = false;

  const flush = () => {
    const list = Object.values(store)
      .filter((p) => {
        const t = p.paidAt?.toDate?.() ?? new Date();
        return t >= start && t <= end;
      })
      .sort((a, b) => {
        const ta = (a.paidAt?.toDate?.() ?? new Date()).getTime();
        const tb = (b.paidAt?.toDate?.() ?? new Date()).getTime();
        return tb - ta;
      });
    cb(list);
  };

  months.forEach((m) => {
    const qy = query(COL, where('ownerUid', '==', uid), where('month', '==', m));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        snap.docChanges().forEach((ch) => {
          if (ch.type === 'removed') delete store[ch.doc.id];
          else store[ch.doc.id] = { id: ch.doc.id, ...(ch.doc.data() as any) } as Payment;
        });
        flush();
      },
      (err) => {
        const code = (err as any)?.code;
        if (code === 'permission-denied') {
          if (!permissionDeniedOnce) {
            permissionDeniedOnce = true;
            console.warn('fallback month subscribe permission-denied (likely legacy docs missing ownerUid).');
          }
          return;
        }
        console.warn('fallback month subscribe error:', err);
      }
    );
    unsubs.push(unsub);
  });

  return () => unsubs.forEach((u) => u());
}

export function subscribeMyPaymentsInRange(
  a: Date | { start: Date; end: Date },
  b: Date | ((rows: Payment[]) => void),
  c?: (rows: Payment[]) => void
): () => void {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  let start: Date, end: Date, cb: (rows: Payment[]) => void;
  if (a instanceof Date) {
    start = a;
    end = b as Date;
    cb = c as (rows: Payment[]) => void;
  } else {
    start = a.start;
    end = a.end;
    cb = (typeof b === 'function' ? (b as any) : c)!;
  }

  const startTs = Timestamp.fromDate(start);
  const endTs = Timestamp.fromDate(end);

  try {
    const qy = query(
      COL,
      where('ownerUid', '==', uid),
      where('paidAt', '>=', startTs),
      where('paidAt', '<=', endTs),
      orderBy('paidAt', 'desc')
    );

    return onSnapshot(
      qy,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Payment[];
        cb(list);
      },
      (err) => {
        if ((err as any)?.code === 'failed-precondition') {
          console.warn('Payments index missing; using month fallback');
          const off = subscribeRangeViaMonths(uid, start, end, cb);
          return off;
        }
        console.warn('subscribeMyPaymentsInRange error:', err);
      }
    );
  } catch (e) {
    return subscribeRangeViaMonths(uid, start, end, cb);
  }
}

export function subscribeWorkerPayments(workerId: string, cb: (rows: Payment[]) => void): () => void {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  const qy = query(
    COL,
    where('ownerUid', '==', uid),
    where('workerId', '==', workerId),
    orderBy('paidAt', 'desc')
  );
  return onSnapshot(
    qy,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Payment[];
      cb(list);
    },
    (err) => console.warn('subscribeWorkerPayments error:', err)
  );
}

export async function listMyPaymentsForMonth(month: string): Promise<Payment[]> {
  await ensureAuth();
  const uid = auth.currentUser!.uid;
  const qy = query(
    COL,
    where('ownerUid', '==', uid),
    where('month', '==', month),
    orderBy('paidAt', 'desc')
  );
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Payment[];
}

export async function listMyPaymentsForWorker(
  workerId: string,
  opts?: { month?: string; start?: Date; end?: Date }
): Promise<Payment[]> {
  await ensureAuth();
  const uid = auth.currentUser!.uid;

  let qy: any = query(COL, where('ownerUid', '==', uid), where('workerId', '==', workerId));

  if (opts?.month) {
    qy = query(qy, where('month', '==', opts.month));
  }
  if (opts?.start && opts?.end) {
    const startTs = Timestamp.fromDate(opts.start);
    const endTs = Timestamp.fromDate(opts.end);
    qy = query(qy, where('paidAt', '>=', startTs), where('paidAt', '<=', endTs));
  }

  qy = query(qy, orderBy('paidAt', 'desc'));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Payment[];
}
