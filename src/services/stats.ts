import { db } from '../../firebase'; 
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

/**
 * Dashboard monthly statistics (AED as base currency).
 * Optional fields default to 0 when not available.
 */
export interface MonthlyStats {
  payrollOut: number;
  cashIn: number;
  net: number;
  /** Added for richer dashboard */
  activeWorkers?: number;
  salaryLiabilityAED?: number;
  dueSoonCount?: number;
  dueSoonAmountAED?: number;
}

export async function getMonthlyStats(monthStartMs: number, monthEndMs: number): Promise<MonthlyStats> {
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');

  const paySnap = await getDocs(query(
    collection(db, 'payments'),
    where('ownerId', '==', uid),
    where('date', '>=', monthStartMs),
    where('date', '<', monthEndMs),
  ));
  const incSnap = await getDocs(query(
    collection(db, 'incomes'),
    where('ownerId', '==', uid),
    where('date', '>=', monthStartMs),
    where('date', '<', monthEndMs),
  ));

  const payrollOut = paySnap.docs.reduce((s, d) => s + ((d.data() as any).amount || 0), 0);
  const cashIn = incSnap.docs.reduce((s, d) => s + ((d.data() as any).amount || 0), 0);

  // --- extras: worker-based stats ---
  const workersSnap = await getDocs(query(
    collection(db, 'workers'),
    where('ownerUid', '==', uid),
  ));
  const now = Date.now();
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  let activeWorkers = 0;
  let salaryLiabilityAED = 0;
  let dueSoonCount = 0;
  let dueSoonAmountAED = 0;
  workersSnap.forEach(docSnap => {
    const w = docSnap.data() as any;
    const status = String(w.status ?? 'active').toLowerCase();
    const isActive = status === 'active';
    if (isActive) {
      activeWorkers += 1;
      const rate = Number(w.monthlySalaryAED ?? w.rate ?? 0) || 0;
      salaryLiabilityAED += rate;

      const dueAt = (() => {
        const x = w.nextDueAt;
        if (!x) return undefined;
        if (typeof x === 'number') return x;
        if (x?.toMillis) return x.toMillis();
        if (x?.seconds) return x.seconds * 1000;
        return undefined;
      })();

      if (dueAt && dueAt - now <= SEVEN_DAYS) {
        dueSoonCount += 1;
        dueSoonAmountAED += rate;
      }
    }
  });

  const result: MonthlyStats = {
    payrollOut,
    cashIn,
    net: cashIn - payrollOut,
    activeWorkers,
    salaryLiabilityAED,
    dueSoonCount,
    dueSoonAmountAED,
  };
  return result;
}
