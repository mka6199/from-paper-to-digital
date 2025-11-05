import React from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { getMyProfile, UserProfile } from '../services/users';
import { resetToAuth } from '../navigation/nav';

const FORCE_SIGN_OUT_ON_BOOT = false;

type AuthContextType = {
  /** true once Firebase has told us if a user exists or not at least once */
  authReady: boolean;
  /** true once we’ve fetched profile (only relevant when user exists) */
  profileReady: boolean;
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
};

export const AuthContext = React.createContext<AuthContextType>({
  authReady: false,
  profileReady: false,
  user: null,
  profile: null,
  isAdmin: false,
});

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authReady, setAuthReady] = React.useState(false);
  const [profileReady, setProfileReady] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = React.useState<boolean>(false);

  React.useEffect(() => {
    let bootCleared = false;

    const unsub = onAuthStateChanged(auth, async (u) => {
      setAuthReady(true);

      if (FORCE_SIGN_OUT_ON_BOOT && !bootCleared) {
        bootCleared = true;
        try { await signOut(auth); } catch {}
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        setProfileReady(false);
        resetToAuth();
        return;
      }

      setUser(u);

      if (!u) {
        // Signed out → clear profile flags
        setProfile(null);
        setIsAdmin(false);
        setProfileReady(false);
        resetToAuth(); // safe helper; won’t flicker when already on Auth
        return;
      }

      // Signed in → fetch profile
      try {
        setProfileReady(false);
        const p = await getMyProfile();
        if (!p) {
          // No profile → sign out hard
          try { await signOut(auth); } catch {}
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
          setProfileReady(false);
          resetToAuth();
          return;
        }

        setProfile(p);
        const admin = p?.role === 'admin' || (p as any)?.isAdmin === true;
        setIsAdmin(!!admin);
        setProfileReady(true);
      } catch (e) {
        console.warn('[Auth] getMyProfile() error → signing out:', e);
        try { await signOut(auth); } catch {}
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        setProfileReady(false);
        resetToAuth();
      }
    });

    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ authReady, profileReady, user, profile, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
