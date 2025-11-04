import { getAuth } from 'firebase/auth';
import { db } from '../../firebase';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';

export interface UserProfileDoc {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  createdAt?: any;
  updatedAt?: any;
}

const COLL = 'users';

export async function getMyProfile(): Promise<UserProfileDoc | null> {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  const ref = doc(db, COLL, uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserProfileDoc) : null;
}

export async function upsertMyProfile(patch: Partial<UserProfileDoc>): Promise<void> {
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  const ref = doc(db, COLL, uid);
  await setDoc(
    ref,
    {
      email: auth.currentUser?.email ?? null,
      ...patch,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeMyProfile(
  cb: (p: { firstName?: string; lastName?: string; email?: string } | null) => void
): () => void {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  const ref = doc(db, COLL, uid);
  return onSnapshot(
    ref,
    (snap) => cb(snap.exists() ? (snap.data() as any) : null),
    () => cb(null)
  );
}
