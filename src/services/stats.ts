import { db } from '../../firebase'; 
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export interface MonthlyStats {
  payrollOut: number;
  cashIn: number;
  net: number;
  activeWorkers?: number;
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
  return { payrollOut, cashIn, net: cashIn - payrollOut };
}
