import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';


const firebaseConfig = {
    apiKey: "AIzaSyBCE1zLQqPdxvDaXbm-8OBG4tSVfq8aIhA",
    authDomain: "from-paper-to-digital.firebaseapp.com",
    projectId: "from-paper-to-digital",
    storageBucket: "from-paper-to-digital.firebasestorage.app",
    messagingSenderId: "907455677257",
    appId: "1:907455677257:web:2a05d33160a824ba3e9098",
    measurementId: "G-TL0E1ZZMC0"
  };

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);


export async function ensureAuth() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
}
