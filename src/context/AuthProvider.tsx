import React from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { getMyProfile, UserProfile } from '../services/users';

const FORCE_SIGN_OUT_ON_BOOT = false;

type AuthContextType = {
  ready: boolean;
  user: User | null;
  profile: UserProfile | null;
};

export const AuthContext = React.createContext<AuthContextType>({
  ready: false,
  user: null,
  profile: null,
});

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);

  React.useEffect(() => {
    let bootCleared = false;

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (FORCE_SIGN_OUT_ON_BOOT && !bootCleared) {
        bootCleared = true;
        try {
          await signOut(auth);
        } catch {}
        setUser(null);
        setProfile(null);
        setReady(true);
        if (__DEV__) console.log('[Auth] FORCE_SIGN_OUT_ON_BOOT → signed out');
        return;
      }

      setUser(u);

      if (!u) {
        setProfile(null);
        setReady(true);
        if (__DEV__) console.log('[Auth] user=null → ready=true');
        return;
      }

      try {
        const p = await getMyProfile(); 
        const hasProfile = !!p;

        if (__DEV__) {
          console.log('[Auth] fetched profile. user=', true, ' hasProfile=', hasProfile);
        }

        if (!hasProfile) {
          try {
            await signOut(auth);
          } catch {}
          setProfile(null);
          if (__DEV__) console.log('[Auth] missing profile → signOut() triggered');
          return; 
        }

        setProfile(p!);
        setReady(true);
        if (__DEV__) console.log('[Auth] ready=true with profile');
      } catch (e) {
        console.warn('[Auth] getMyProfile() error → signing out:', e);
        try {
          await signOut(auth);
        } catch {}
        setProfile(null);
      }
    });

    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ ready, user, profile }}>
      {children}
    </AuthContext.Provider>
  );
}
