import { db, ensureAuth, auth } from '../config/firebase';
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
import { getNextWorkerNumber, formatEmployeeId } from './ids';
import { 
  isOnline, 
  cacheWorkers, 
  getCachedWorkers,
  addPendingOperation 
} from './offline';

export type Worker = {
  nextDueAtMs?: number;
  employeeId?: string;
  salaryDueDay?: number;
  id?: string;
  name: string;
  role?: string;
  monthlySalaryAED?: number;
  baseSalary?: number;
  avatarUrl?: string | null;
  ownerUid?: string | null;

  status?: 'active' | 'former';
  terminatedAt?: any;

  nextDueAt?: any;
  createdAt?: any;
  updatedAt?: any;

  // ✅ NEW: phone number used for OTP
  phone?: string;
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
    employeeId: data?.employeeId ?? undefined,
    role: data?.role ?? '',
    monthlySalaryAED: Number(data?.monthlySalaryAED ?? data?.baseSalary ?? 0),
    baseSalary: Number(data?.baseSalary ?? 0),
    avatarUrl: data?.avatarUrl ?? null,
    ownerUid: data?.ownerUid ?? null,

    status: (data?.status as 'active' | 'former') ?? 'active',
    terminatedAt: data?.terminatedAt ?? null,

    nextDueAt: data?.nextDueAt,
    nextDueAtMs: (() => {
      const x = data?.nextDueAt;
      if (!x) return undefined;
      if (typeof x === 'number') return x;
      if (x?.toMillis) return x.toMillis();
      if (x?.seconds) return x.seconds * 1000;
      return undefined;
    })(),
    createdAt: data?.createdAt,
    updatedAt: data?.updatedAt,

    // ✅ map phone from Firestore
    phone: data?.phone ?? undefined,
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

export async function listWorkers(opts?: { status?: 'active' | 'former' | 'all' }): Promise<Worker[]> {
  await ensureAuth();
  const uid = auth.currentUser!.uid;
  const status = opts?.status ?? 'active';

  const qy = query(COL, where('ownerUid', '==', uid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(qy);
  let rows = snap.docs.map((d) => toWorker(d.id, d.data()));

  if (status !== 'all') rows = rows.filter((w) => (w.status ?? 'active') === status);
  return rows;
}

export function subscribeMyWorkers(
  cb: (workers: Worker[]) => void,
  opts?: { status?: 'active' | 'former' | 'all' }
): () => void {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  const status = opts?.status ?? 'active';
  
  // If offline, serve cached data immediately
  const checkOffline = async () => {
    const online = await isOnline();
    if (!online) {
      const cached = await getCachedWorkers();
      let list = cached;
      if (status !== 'all') list = list.filter((w) => (w.status ?? 'active') === status);
      list.sort((a, b) => tsSeconds(b.createdAt) - tsSeconds(a.createdAt));
      cb(list);
    }
  };
  checkOffline();

  const qy = query(COL, where('ownerUid', '==', uid));
  const unsub = onSnapshot(qy, async (snap) => {
    let list = snap.docs.map((d) => toWorker(d.id, d.data()));

    // Cache the fetched workers
    await cacheWorkers(list);

    const now = Timestamp.now();
    list.forEach(async (w) => {
      if (!w.nextDueAt && w.id) {
        try {
          await updateDoc(doc(db, 'workers', w.id), {
            nextDueAt: w.createdAt || now,
            updatedAt: serverTimestamp(),
          });
        } catch {}
      }
    });

    if (status !== 'all') list = list.filter((w) => (w.status ?? 'active') === status);

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
  }, { status: 'active' });
}

export async function addWorker(
  w: Omit<Worker, 'id' | 'createdAt' | 'updatedAt' | 'ownerUid' | 'nextDueAt' | 'status' | 'terminatedAt'>
) {
  await ensureAuth();
  const uid = auth.currentUser!.uid;

  const seq = await getNextWorkerNumber();
  const eid = formatEmployeeId(seq);

  const dueDay = Math.min(Math.max((w as any).salaryDueDay ?? 28, 1), 28);
  const now = new Date();
  const firstDue = new Date(now.getFullYear(), now.getMonth(), dueDay);
  if (firstDue < now) firstDue.setMonth(firstDue.getMonth() + 1);

  const workerData = {
    ...w,
    employeeId: (w as any).employeeId ?? eid,
    ownerUid: uid,
    status: 'active',
    terminatedAt: null,
    nextDueAt: Timestamp.fromDate(firstDue),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Check if offline
  const online = await isOnline();
  if (!online) {
    const tempId = `temp_${Date.now()}`;
    await addPendingOperation({ type: 'add_worker', data: { ...workerData, id: tempId } });
    return tempId;
  }

  const ref = await addDoc(COL, workerData);
  return ref.id;
}

export async function updateWorker(id: string, patch: Partial<Worker>) {
  await ensureAuth();
  
  const updateData = {
    ...patch,
    updatedAt: serverTimestamp(),
  };

  // Check if offline
  const online = await isOnline();
  if (!online) {
    await addPendingOperation({ type: 'update_worker', data: { id, ...updateData } });
    return;
  }

  await updateDoc(doc(db, 'workers', id), updateData);
}

export async function deleteWorker(id: string) {
  await ensureAuth();

  // Check if offline
  const online = await isOnline();
  if (!online) {
    await addPendingOperation({ type: 'delete_worker', data: { id } });
    return;
  }

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
