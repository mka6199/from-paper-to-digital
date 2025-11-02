// src/services/settings.ts
import { db, auth, ensureAuth } from '../../firebase';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

export type Settings = {
  uid: string;
  dueReminders?: boolean;     // create “due” notifications
  monthlySummary?: boolean;   // future: monthly digest
  currency?: 'AED';           // keep AED for now
  displayName?: string;       // prefer showing name instead of email
  createdAt?: any;
  updatedAt?: any;
};

function ref() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  return doc(db, 'settings', uid);
}

export async function getMySettings(): Promise<Settings | null> {
  await ensureAuth();
  const snap = await getDoc(ref());
  return snap.exists() ? (snap.data() as Settings) : null;
}

export function subscribeMySettings(cb: (s: Settings | null) => void): () => void {
  const r = ref();
  return onSnapshot(r, (snap) => cb(snap.exists() ? (snap.data() as Settings) : null));
}

export async function upsertMySettings(patch: Partial<Settings>) {
  await ensureAuth();
  const r = ref();
  const snap = await getDoc(r);
  if (!snap.exists()) {
    await setDoc(r, {
      uid: auth.currentUser!.uid,
      dueReminders: true,
      monthlySummary: false,
      currency: 'AED',
      displayName: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...patch,
    } as Settings);
  } else {
    await updateDoc(r, { ...patch, updatedAt: serverTimestamp() } as any);
  }
}
