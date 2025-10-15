import { db, ensureAuth } from '../../firebase';
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, where } from 'firebase/firestore';

export type Payment = {
  id?: string;
  workerId: string;
  workerName?: string;       // <-- denormalized for history lists
  amount: number;
  bonus?: number;
  month: string;             // 'YYYY-MM'
  method: 'cash' | 'bank';
  createdAt?: any;
};

const col = collection(db, 'payments');

function sanitize<T extends Record<string, any>>(obj: T) {
  const out: Record<string, any> = {};
  for (const k of Object.keys(obj)) if (obj[k] !== undefined) out[k] = obj[k];
  return out as T;
}

export async function addPayment(p: Omit<Payment, 'id'|'createdAt'>) {
  await ensureAuth();
  const ref = await addDoc(col, { ...sanitize(p), createdAt: serverTimestamp() });
  return ref.id;
}

export async function listPaymentsForWorker(workerId: string) {
  await ensureAuth();
  const q = query(col, where('workerId','==',workerId), orderBy('createdAt','desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }) as Payment);
}

export async function listRecentPayments(limitTo = 200) {
  await ensureAuth();
  const q = query(col, orderBy('createdAt','desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }) as Payment).slice(0, limitTo);
}
