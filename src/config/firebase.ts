// firebase.ts
import { Platform } from 'react-native';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import {
  getAuth,
  initializeAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBCE1zLQqPdxvDaXbm-8OBG4tSVfq8aIhA",
  authDomain: "from-paper-to-digital.firebaseapp.com",
  projectId: "from-paper-to-digital",
  storageBucket: "from-paper-to-digital.firebasestorage.app",
  messagingSenderId: "907455677257",
  appId: "1:907455677257:web:2a05d33160a824ba3e9098",
  measurementId: "G-TL0E1ZZMC0"
};

export const app: FirebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Enable offline persistence for Firestore
if (Platform.OS === 'web') {
  // For web, enable IndexedDB persistence
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser does not support offline persistence');
    }
  });
} else {
  // For mobile, Firestore persistence is enabled by default in React Native
  console.log('Firestore offline persistence enabled (native)');
}

let getRNPersist: undefined | ((storage: any) => any);
try { getRNPersist = require('firebase/auth').getReactNativePersistence; } catch {}
if (!getRNPersist) {
  try { getRNPersist = require('firebase/auth/react-native').getReactNativePersistence; } catch {}
}

export const auth =
  Platform.OS === 'web' || !getRNPersist
    ? getAuth(app)
    : initializeAuth(app, { persistence: getRNPersist(ReactNativeAsyncStorage) });

export const authReady = new Promise<void>((resolve) => {
  const unsub = onAuthStateChanged(auth, () => { unsub(); resolve(); });
});

export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}
export async function signUp(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email.trim(), password);
}
export async function signOut() { return fbSignOut(auth); }

export async function ensureAuth(): Promise<User> {
  if (!auth.currentUser) await authReady;
  if (!auth.currentUser) throw new Error('Not authenticated');
  return auth.currentUser!;
}

export async function sendResetPasswordEmail(toEmail?: string) {
  const email = (toEmail ?? auth.currentUser?.email ?? "").trim();
  if (!email) throw new Error("No email available for password reset.");
  await sendPasswordResetEmail(auth, email);
}
