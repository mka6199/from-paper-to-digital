import { db, auth } from '../../firebase';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';

export async function getNextWorkerNumber(): Promise<number> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  const ref = doc(db, 'users', uid, 'counters', 'workers');

  const next = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? (snap.data() as any).seq ?? 0 : 0;
    const newSeq = (Number.isFinite(current) ? current : 0) + 1;
    tx.set(ref, { seq: newSeq, updatedAt: serverTimestamp() }, { merge: true });
    return newSeq;
  });

  return next;
}

export function formatEmployeeId(n: number): string {
  return `WK-${String(n).padStart(6, '0')}`;
}
