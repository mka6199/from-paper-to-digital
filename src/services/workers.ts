import { db, ensureAuth, auth } from '../../firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  Timestamp,
  orderBy,
} from 'firebase/firestore';

export type Worker = {
  id?: string;
  name: string;
  role?: string;
  monthlySalaryAED?: number;
  baseSalary?: number;        
  avatarUrl?: string | null;
  ownerUid?: string | null;

  nextDueAt?: any;           
  createdAt?: any;
  updatedAt?: any;
};

const COL = collection(db, 'workers');

export function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function tsSeconds(t?: any) {
  return t?.seconds ?? 0;
}

function toWorker(id: string, data: any): Worker {
  return {
    id,
    name: data?.name ?? '',
    role: data?.role ?? '',
    monthlySalaryAED: Number(data?.monthlySalaryAED ?? data?.baseSalary ?? 0),
    baseSalary: Number(data?.baseSalary ?? 0),
    avatarUrl: data?.avatarUrl ?? null,
    ownerUid: data?.ownerUid ?? null,
    nextDueAt: data?.nextDueAt,
    createdAt: data?.createdAt,
    updatedAt: data?.updatedAt,
  };
}


export function getWorkerCycleWindow(w: Worker): { start: Date; end: Date } {
  const end =
    (w.nextDueAt?.toDate?.() as Date | undefined) ??
    new Date();
  const start = addDays(new Date(end), -31);
  const created = w.createdAt?.toDate?.() as Date | undefined;
  if (created && created > start) return { start: created, end };
  return { start, end };
}

export async function getWorker(id: string): Promise<Worker | null> {
  await ensureAuth();
  const snap = await getDoc(doc(db, 'workers', id));
  if (!snap.exists()) return null;
  return toWorker(snap.id, snap.data());
}

export async function listWorkers(): Promise<Worker[]> {
  await ensureAuth();
  const uid = auth.currentUser!.uid;
  const qy = query(COL, where('ownerUid', '==', uid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => toWorker(d.id, d.data()));
}

export function subscribeMyWorkers(cb: (workers: Worker[]) => void): () => void {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  const qy = query(COL, where('ownerUid', '==', uid));
  const unsub = onSnapshot(qy, (snap) => {
    const list = snap.docs.map((d) => toWorker(d.id, d.data()));

    const now = Timestamp.now();
    list.forEach(async (w) => {
      if (!w.nextDueAt && w.id) {
        try {
          await updateDoc(doc(db, 'workers', w.id), {
            nextDueAt: w.createdAt || now,
            updatedAt: serverTimestamp(),
          });
        } catch {
        }
      }
    });

    list.sort((a, b) => tsSeconds(b.createdAt) - tsSeconds(a.createdAt));
    cb(list);
  });

  return () => unsub();
}

export function subscribeWorker(id: string, cb: (worker: Worker | null) => void): () => void {
  const ref = doc(db, 'workers', id);
  const unsub = onSnapshot(ref, (snap) => {
    if (!snap.exists()) return cb(null);
    cb(toWorker(snap.id, snap.data()));
  });
  return () => unsub();
}

export function subscribeDueWorkers(before: Date, cb: (workers: Worker[]) => void): () => void {
  const until = Timestamp.fromDate(before);
  return subscribeMyWorkers((rows) => {
    cb(
      rows.filter((w) => {
        const t = w.nextDueAt as Timestamp | undefined;
        return !!t && tsSeconds(t) <= tsSeconds(until);
      })
    );
  });
}

export async function addWorker(
  w: Omit<Worker, 'id' | 'createdAt' | 'updatedAt' | 'ownerUid' | 'nextDueAt'>
) {
  await ensureAuth();
  const uid = auth.currentUser!.uid;
  const ref = await addDoc(COL, {
    ...w,
    ownerUid: uid,
    nextDueAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateWorker(id: string, patch: Partial<Worker>) {
  await ensureAuth();
  await updateDoc(doc(db, 'workers', id), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteWorker(id: string) {
  await ensureAuth();
  await deleteDoc(doc(db, 'workers', id));
}

export async function advanceWorkerDue(id: string, baseDate?: Date) {
  await ensureAuth();
  const base = baseDate ? new Date(baseDate) : new Date();
  await updateDoc(doc(db, 'workers', id), {
    nextDueAt: Timestamp.fromDate(addDays(base, 31)),
    updatedAt: serverTimestamp(),
  });
}
