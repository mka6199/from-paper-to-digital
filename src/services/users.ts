import { db, ensureAuth } from '../../firebase';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

export type UserProfile = {
  uid: string;
  email: string;
  role: 'user' | 'admin';
  createdAt?: any;
  updatedAt?: any;
};

function userDoc(uid: string) {
  return doc(db, 'users', uid);
}

export async function ensureUserProfile(uid: string, email: string) {
  const ref = userDoc(uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid,
      email,
      role: 'user',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as UserProfile);
  }
}

export async function getMyProfile(): Promise<UserProfile | null> {
  const u = await ensureAuth();
  const ref = userDoc(u.uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function setUserRole(uid: string, role: 'user' | 'admin') {
  await updateDoc(userDoc(uid), { role, updatedAt: serverTimestamp() });
}
