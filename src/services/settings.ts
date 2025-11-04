
import { getAuth } from 'firebase/auth';
import { db } from '../../firebase'; 
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import type { OwnerSettings } from '../types/settings';

const coll = 'settings'; 

export async function getMySettings(): Promise<OwnerSettings | null> {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  const ref = doc(db, coll, uid);
  const snap = await getDoc(ref);
  return snap.exists() ? ({ ownerId: uid, ...(snap.data() as any) } as OwnerSettings) : null;
}

export function subscribeMySettings(cb: (s: OwnerSettings | null) => void) {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  const ref = doc(db, coll, uid);
  return onSnapshot(ref, (snap) => {
    cb(snap.exists() ? ({ ownerId: uid, ...(snap.data() as any) } as OwnerSettings) : null);
  });
}

export async function upsertMySettings(patch: Partial<OwnerSettings>): Promise<void> {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  const ref = doc(db, coll, uid);
  await setDoc(ref, { ownerId: uid, ...patch, updatedAt: Date.now(), createdAt: serverTimestamp() }, { merge: true });
}
