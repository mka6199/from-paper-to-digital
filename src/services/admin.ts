import { db, ensureAuth } from '../../firebase';
import {
  collection,
  onSnapshot,
  query,
  updateDoc,
  doc,
  where,
  getDocs,
  getDoc,
  Timestamp,
  deleteDoc,
  orderBy,
} from 'firebase/firestore';

/**
 * Expand AdminUser to include profile fields we edit in AdminUsersScreen.
 * All optional except uid, role. Keep email optional to tolerate partial docs.
 */
export type AdminUser = {
  uid: string;
  email?: string;
  role: 'user' | 'admin';
  isActive?: boolean;

  // profile fields editable from admin UI
  firstName?: string;
  lastName?: string;
  phone?: string;
  dobYMD?: string; // YYYY-MM-DD

  // audit fields (Firestore Timestamps or similar)
  createdAt?: any;
  updatedAt?: any;
  lastActiveAt?: any;
};

/** Allow flexible patching of user docs (subset of AdminUser + extra metadata if needed). */
export type UserDocPatch = Partial<AdminUser> & Record<string, any>;

export function subscribeAllUsers(cb: (rows: AdminUser[]) => void): () => void {
  const colRef = collection(db, 'users');
  const qy = query(colRef);
  return onSnapshot(qy, (snap) => {
    const rows = snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) })) as AdminUser[];
    rows.sort((a, b) => (b?.createdAt?.seconds ?? 0) - (a?.createdAt?.seconds ?? 0));
    cb(rows);
  });
}

export async function findUserByEmail(email: string): Promise<AdminUser | null> {
  const colRef = collection(db, 'users');
  const qy = query(colRef, where('email', '==', email.trim().toLowerCase()));
  const snap = await getDocs(qy);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { uid: d.id, ...(d.data() as any) } as AdminUser;
}

export async function getUser(uid: string): Promise<AdminUser | null> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? ({ uid: snap.id, ...(snap.data() as any) } as AdminUser) : null;
}

export async function setUserRole(uid: string, role: 'user' | 'admin') {
  await ensureAuth();
  await updateDoc(doc(db, 'users', uid), { role, updatedAt: Timestamp.now() });
}

export async function setUserActive(uid: string, isActive: boolean) {
  await ensureAuth();
  await updateDoc(doc(db, 'users', uid), { isActive, updatedAt: Timestamp.now() });
}

/** Loosen patch type so firstName/lastName/phone/dobYMD (etc.) are accepted. */
export async function updateUserDoc(uid: string, patch: UserDocPatch) {
  await ensureAuth();
  await updateDoc(doc(db, 'users', uid), { ...patch, updatedAt: Timestamp.now() } as any);
}

export async function adminDeleteUserDoc(uid: string) {
  await ensureAuth();
  await deleteDoc(doc(db, 'users', uid));
}

/* ---------- Workers ---------- */

export function subscribeAllWorkers(cb: (rows: any[]) => void): () => void {
  const colRef = collection(db, 'workers');
  const qy = query(colRef);
  return onSnapshot(qy, (snap) => {
    const out = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    out.sort((a, b) => (b?.createdAt?.seconds ?? 0) - (a?.createdAt?.seconds ?? 0));
    cb(out);
  });
}

export function subscribeWorkersByOwnerUid(ownerUid: string, cb: (rows: any[]) => void): () => void {
  const colRef = collection(db, 'workers');
  const qy = query(colRef, where('ownerUid', '==', ownerUid));
  return onSnapshot(qy, (snap) => {
    const out = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    out.sort((a, b) => (b?.createdAt?.seconds ?? 0) - (a?.createdAt?.seconds ?? 0));
    cb(out);
  });
}
export const subscribeWorkersByOwner = subscribeWorkersByOwnerUid;

export async function adminUpdateWorker(workerId: string, patch: Partial<any>) {
  await ensureAuth();
  await updateDoc(doc(db, 'workers', workerId), { ...patch, updatedAt: Timestamp.now() });
}

export async function adminDeleteWorker(workerId: string) {
  await ensureAuth();
  await deleteDoc(doc(db, 'workers', workerId));
}

/* ---------- Payments ---------- */

export function subscribeAllPayments(cb: (rows: any[]) => void): () => void {
  const colRef = collection(db, 'payments');
  const qy = query(colRef, orderBy('paidAt', 'desc'));
  return onSnapshot(qy, (snap) => {
    const out = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    cb(out);
  });
}

export function subscribePaymentsByOwnerUid(ownerUid: string, cb: (rows: any[]) => void): () => void {
  const colRef = collection(db, 'payments');
  const qy = query(colRef, where('ownerUid', '==', ownerUid), orderBy('paidAt', 'desc'));
  return onSnapshot(qy, (snap) => {
    const out = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    cb(out);
  });
}
export const subscribePaymentsByOwner = subscribePaymentsByOwnerUid;

export async function adminUpdatePayment(paymentId: string, patch: Partial<any>) {
  await ensureAuth();
  await updateDoc(doc(db, 'payments', paymentId), { ...patch, updatedAt: Timestamp.now() });
}

export async function adminDeletePayment(paymentId: string) {
  await ensureAuth();
  await deleteDoc(doc(db, 'payments', paymentId));
}

/* ---------- Delete user & data helpers ---------- */

async function deleteByOwner(collectionName: 'workers' | 'payments', ownerUid: string) {
  const qy = query(collection(db, collectionName), where('ownerUid', '==', ownerUid));
  const snap = await getDocs(qy);
  const jobs: Promise<any>[] = [];
  for (const d of snap.docs) jobs.push(deleteDoc(doc(db, collectionName, d.id)));
  await Promise.all(jobs);
}

export async function adminDeleteUserAndData(
  uid: string,
  opts?: { deleteProfile?: boolean; deleteWorkers?: boolean; deletePayments?: boolean }
) {
  await ensureAuth();
  const { deleteProfile = true, deleteWorkers = true, deletePayments = true } = opts ?? {};
  if (deleteWorkers) await deleteByOwner('workers', uid);
  if (deletePayments) await deleteByOwner('payments', uid);
  if (deleteProfile) await adminDeleteUserDoc(uid);
}
