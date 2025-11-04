import React from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { getMyProfile, UserProfile } from '../services/users';
import { resetToAuth, resetToMain, resetToAdmin } from '../navigation/nav';

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
        resetToAuth();
        return;
      }

      setUser(u);

      if (!u) {
        setProfile(null);
        setReady(true);
        resetToAuth();
        return;
      }

      try {
        const p = await getMyProfile();
        const hasProfile = !!p;

        if (!hasProfile) {
          try {
            await signOut(auth);
          } catch {}
          setProfile(null);
          setReady(true);
          resetToAuth();
          return;
        }

        setProfile(p!);
        setReady(true);

        const admin =
          p?.role === 'admin' ||
          (p as any)?.isAdmin === true;

        if (admin) resetToAdmin();
        else resetToMain();
      } catch (e) {
        console.warn('[Auth] getMyProfile() error → signing out:', e);
        try {
          await signOut(auth);
        } catch {}
        setProfile(null);
        setReady(true);
        resetToAuth();
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
