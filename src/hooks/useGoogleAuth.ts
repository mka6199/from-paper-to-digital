import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { signInWithGoogle, signInWithGooglePopup, db } from '../config/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// Required for web
WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    // Web Client ID from Firebase Console
    clientId: '907455677257-obpt3mf3rg94smftffdc8jeaq8ph80ng.apps.googleusercontent.com',
    // iOS Client ID (if you add iOS support)
    iosClientId: '907455677257-99km9k1tdo0kkbujm6mfci14qqau9sgi.apps.googleusercontent.com',
    // Android Client ID (if you add Android support)
    androidClientId: '907455677257-YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleSignIn(id_token);
    } else if (response?.type === 'error') {
      setError(response.error?.message || 'Google Sign-In failed');
      setLoading(false);
    }
  }, [response]);

  async function handleGoogleSignIn(idToken: string) {
    try {
      setLoading(true);
      setError(null);

      const result = await signInWithGoogle(idToken);
      
      // Create or update user profile in Firestore
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        // New user - create profile
        const names = result.user.displayName?.split(' ') || [];
        await setDoc(userRef, {
          uid: result.user.uid,
          email: result.user.email,
          firstName: names[0] || '',
          lastName: names.slice(1).join(' ') || '',
          phone: result.user.phoneNumber || null,
          role: 'user',
          isAdmin: false,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        // Existing user - update last login
        await setDoc(userRef, {
          updatedAt: serverTimestamp(),
          lastActiveAt: serverTimestamp(),
        }, { merge: true });
      }

      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  }

  async function signInWithGoogleWeb() {
    try {
      setLoading(true);
      setError(null);

      const result = await signInWithGooglePopup();
      
      // Create or update user profile
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        const names = result.user.displayName?.split(' ') || [];
        await setDoc(userRef, {
          uid: result.user.uid,
          email: result.user.email,
          firstName: names[0] || '',
          lastName: names.slice(1).join(' ') || '',
          phone: result.user.phoneNumber || null,
          role: 'user',
          isAdmin: false,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  }

  const signIn = Platform.OS === 'web' 
    ? signInWithGoogleWeb 
    : () => promptAsync();

  return {
    signIn,
    loading,
    error,
    request,
  };
}
