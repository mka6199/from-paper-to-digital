import { getAuth } from 'firebase/auth';
import { db, ensureAuth } from '../config/firebase';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, Timestamp, onSnapshot } from 'firebase/firestore';

export type UserProfile = {
  uid: string;
  email: string;
  role: 'user' | 'admin';
  firstName?: string;
  lastName?: string;
  phone?: string;
  dob?: any;
  dobYMD?: string;
  isActive?: boolean;
  salaryMonthlyAED?: number | null;
  createdAt?: any;
  updatedAt?: any;
  lastActiveAt?: any;
};

export type UserProfileDoc = UserProfile;

function userDoc(uid: string) {
  return doc(db, 'users', uid);
}

export async function createUserProfile(
  uid: string,
  payload: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    dobYMD: string;
    role?: 'user' | 'admin';
    salaryMonthlyAED?: number;
  }
) {
  await setDoc(userDoc(uid), {
    uid,
    email: payload.email,
    role: payload.role ?? 'user',
    firstName: payload.firstName,
    lastName: payload.lastName,
    phone: payload.phone,
    dobYMD: payload.dobYMD,
    dob: toTimestampFromYMD(payload.dobYMD),
    isActive: true,
    salaryMonthlyAED: typeof payload.salaryMonthlyAED === 'number' ? payload.salaryMonthlyAED : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as UserProfile);
}

export async function ensureUserProfile(uid: string, email: string) {
  const ref = userDoc(uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid,
      email,
      role: 'user',
      isActive: true,
      salaryMonthlyAED: null,
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

export async function upsertMyProfile(patch: Partial<UserProfile>) {
  const u = await ensureAuth();
  const ref = userDoc(u.uid);
  const norm = normalizePatch(patch);
  await setDoc(
    ref,
    {
      ...norm,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeMyProfile(cb: (p: UserProfile | null) => void): () => void {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  const ref = userDoc(uid);
  return onSnapshot(
    ref,
    (snap) => cb(snap.exists() ? (snap.data() as UserProfile) : null),
    () => cb(null)
  );
}

export async function setUserRole(uid: string, role: 'user' | 'admin') {
  await updateDoc(userDoc(uid), { role, updatedAt: serverTimestamp() });
}

export async function updateMyProfile(patch: Partial<UserProfile>) {
  const u = await ensureAuth();
  const norm = normalizePatch(patch);
  await updateDoc(userDoc(u.uid), { ...norm, updatedAt: serverTimestamp() } as any);
}

function toTimestampFromYMD(ymd: string): Timestamp | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd?.trim() ?? '');
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
  const dt = new Date(y, mo, d, 0, 0, 0, 0);
  if (isNaN(dt.getTime())) return null;
  return Timestamp.fromDate(dt);
}

function normalizePatch(p: Partial<UserProfile>) {
  const out: any = { ...p };
  if (typeof p.dobYMD === 'string') {
    out.dob = toTimestampFromYMD(p.dobYMD);
  }
  if (out.salaryMonthlyAED !== undefined) {
    const n = Number(out.salaryMonthlyAED);
    out.salaryMonthlyAED = Number.isFinite(n) && n >= 0 ? n : null;
  }
  return out;
}
