import { db, ensureAuth } from '../../firebase';
import { collection, addDoc, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';

export type Worker = {
  id?: string;
  name: string;
  role: string;
  monthlySalaryAED: number;
  avatarUrl?: string;
};

const workersCol = collection(db, 'workers');

export async function addWorker(w: {name:string; role:string; monthlySalaryAED:number}) {
  await ensureAuth();
  const ref = await addDoc(collection(db, 'workers'), { ...w, createdAt: serverTimestamp() });
  return ref.id;
}

export async function listWorkers() {
  await ensureAuth();
  const q = query(collection(db, 'workers'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
}
