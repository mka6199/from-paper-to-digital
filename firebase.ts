// firebase.ts
import { Platform } from 'react-native';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  getAuth,
  initializeAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  User,
} from 'firebase/auth';

// ----------------------
// Your Firebase config
// ----------------------
const firebaseConfig = {
  apiKey: "AIzaSyBCE1zLQqPdxvDaXbm-8OBG4tSVfq8aIhA",
  authDomain: "from-paper-to-digital.firebaseapp.com",
  projectId: "from-paper-to-digital",
  storageBucket: "from-paper-to-digital.firebasestorage.app",
  messagingSenderId: "907455677257",
  appId: "1:907455677257:web:2a05d33160a824ba3e9098",
  measurementId: "G-TL0E1ZZMC0"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ------------------------------------------------------------------
// Compatibility shim for getReactNativePersistence across SDK versions
// ------------------------------------------------------------------
let getRNPersist: undefined | ((storage: any) => any);
try {
  // Newer SDKs (v9.6.1+ / v10+ / v11+) expose it here
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  getRNPersist = require('firebase/auth').getReactNativePersistence;
} catch {}
if (!getRNPersist) {
  try {
    // Some older modular builds expose it here
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    getRNPersist = require('firebase/auth/react-native').getReactNativePersistence;
  } catch {}
}

// ------------------------------------------------------------
// Auth: persistent on native if helper exists; otherwise basic
// ------------------------------------------------------------
export const auth =
  Platform.OS === 'web' || !getRNPersist
    ? getAuth(app) // web, or very old SDKs that lack the helper (no persistence)
    : initializeAuth(app, {
        persistence: getRNPersist(ReactNativeAsyncStorage),
      });

// Resolves once we’ve observed the first auth state (used by ensureAuth)
export const authReady = new Promise<void>((resolve) => {
  const unsub = onAuthStateChanged(auth, () => {
    unsub();
    resolve();
  });
});

// ----------------------
// Helper auth functions
// ----------------------
export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signUp(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email.trim(), password);
}

export async function signOut() {
  return fbSignOut(auth);
}

/** Ensure we have a logged-in user before calling read/write services. */
export async function ensureAuth(): Promise<User> {
  if (!auth.currentUser) await authReady;
  if (!auth.currentUser) throw new Error('Not authenticated');
  return auth.currentUser!;
}
