// src/services/auth.ts
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { app } from '../../firebase'; // your existing firebase.ts should export app

const auth = getAuth(app);

/**
 * Sends a password-reset email using Firebase Auth.
 * @param email target account email
 * @returns void (throws on error)
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const safe = (email || '').trim();
  if (!safe) throw new Error('Missing email');
  await sendPasswordResetEmail(auth, safe);
}
