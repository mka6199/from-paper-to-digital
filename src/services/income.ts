import { db } from '../../firebase'; 
import { addDoc, collection, getDocs, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import type { Income } from '../types/models';

export async function addIncome(input: { source: string; amount: number; date: number; notes?: string }): Promise<void> {
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  await addDoc(collection(db, 'incomes'), {
    ownerId: uid,
    source: input.source,
    amount: input.amount,
    date: input.date,
    notes: input.notes || '',
    createdAt: Timestamp.now().toMillis(),
  });
}


export async function listIncomes(monthStartMs?: number, monthEndMs?: number): Promise<Income[]> {
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  const q = query(collection(db, 'incomes'), where('ownerId', '==', uid), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  const items: Income[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  if (typeof monthStartMs === 'number' && typeof monthEndMs === 'number') {
    return items.filter(i => i.date >= monthStartMs && i.date < monthEndMs);
  }
  return items;
}
