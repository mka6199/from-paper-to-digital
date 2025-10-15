// src/services/workers.ts
import { db, ensureAuth } from '../../firebase';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

export type Worker = {
  id?: string;
  name: string;
  role?: string;
  monthlySalaryAED?: number;
  baseSalary?: number;       // legacy alias supported by UI
  avatarUrl?: string | null;
  createdAt?: any;
  updatedAt?: any;
};

const col = collection(db, 'workers');

// READ ONE
export async function getWorker(id: string): Promise<Worker | null> {
  await ensureAuth();
  const snap = await getDoc(doc(db, 'workers', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as Worker;
}

// READ MANY
export async function listWorkers(): Promise<Worker[]> {
  await ensureAuth();
  const q = query(col, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Worker));
}

// CREATE
export async function addWorker(
  w: Omit<Worker, 'id' | 'createdAt' | 'updatedAt'>
) {
  await ensureAuth();
  const ref = await addDoc(col, {
    ...w,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

// UPDATE
export async function updateWorker(id: string, patch: Partial<Worker>) {
  await ensureAuth();
  await updateDoc(doc(db, 'workers', id), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}
