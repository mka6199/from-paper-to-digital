import { db, auth, ensureAuth } from '../config/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

export type AppNotification = {
  id?: string;
  ownerUid: string;
  type: 'due' | 'system';
  title: string;
  body?: string;
  workerId?: string;
  workerName?: string;
  isRead?: boolean;
  createdAt?: any;
  updatedAt?: any;
};

const COL = collection(db, 'notifications');

export function subscribeMyNotifications(cb: (rows: AppNotification[]) => void): () => void {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  const qy = query(COL, where('ownerUid', '==', uid), orderBy('createdAt', 'desc'));
  return onSnapshot(qy, (snap) => {
    const out = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as AppNotification[];
    cb(out);
  });
}

export function subscribeMyUnreadCount(cb: (count: number) => void): () => void {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  const qy = query(COL, where('ownerUid', '==', uid), where('isRead', '==', false));
  return onSnapshot(qy, (snap) => {
    cb(snap.size);
  });
}

export async function markNotificationRead(id: string, isRead = true) {
  await ensureAuth();
  await updateDoc(doc(db, 'notifications', id), {
    isRead,
    updatedAt: serverTimestamp(),
  });
}

export async function markAllNotificationsRead() {
  await ensureAuth();
  const uid = auth.currentUser!.uid;
  const qy = query(COL, where('ownerUid', '==', uid), where('isRead', '==', false));
  const snap = await getDocs(qy);
  await Promise.all(
    snap.docs.map((d) =>
      updateDoc(d.ref, { isRead: true, updatedAt: serverTimestamp() })
    )
  );
}

export async function ensureDueNotification(params: {
  workerId: string;
  workerName?: string;
  dueKey: string; 
}) {
  await ensureAuth();
  const uid = auth.currentUser!.uid;
  const id = `due_${uid}_${params.workerId}_${params.dueKey}`;
  const ref = doc(db, 'notifications', id);
  const exists = (await getDoc(ref)).exists();
  if (exists) return;

  await setDoc(ref, {
    ownerUid: uid,
    type: 'due',
    title: 'Payment due',
    body: params.workerName
      ? `Salary is due for ${params.workerName}.`
      : 'A worker salary is due.',
    workerId: params.workerId,
    workerName: params.workerName ?? null,
    isRead: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as AppNotification);
}

export async function createSystemNotification(title: string, body?: string) {
  await ensureAuth();
  const uid = auth.currentUser!.uid;
  await addDoc(COL, {
    ownerUid: uid,
    type: 'system',
    title,
    body: body ?? '',
    isRead: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as AppNotification);
}

export async function deleteNotification(id: string) {
  await ensureAuth();
  await deleteDoc(doc(db, 'notifications', id));
}
