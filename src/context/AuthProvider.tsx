import React from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { subscribeMyProfile, UserProfileDoc } from '../services/profile';
import { resetToAuth } from '../navigation/nav';

const FORCE_SIGN_OUT_ON_BOOT = false;

type AuthContextType = {
  authReady: boolean;
  profileReady: boolean;
  user: User | null;
  profile: UserProfileDoc | null;
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
  const [profile, setProfile] = React.useState<UserProfileDoc | null>(null);
  const [isAdmin, setIsAdmin] = React.useState<boolean>(false);

  React.useEffect(() => {
    let bootCleared = false;
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
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
        setProfile(null);
        setIsAdmin(false);
        setProfileReady(false);
        resetToAuth();
        return;
      }
    });
    return () => unsubAuth();
  }, []);

  React.useEffect(() => {
    let unsubProfile: undefined | (() => void);
    if (!user) {
      setProfile(null);
      setIsAdmin(false);
      setProfileReady(false);
      return;
    }
    setProfileReady(false);
    try {
      unsubProfile = subscribeMyProfile((p) => {
        setProfile(p);
        const admin = (p as any)?.role === 'admin' || (p as any)?.isAdmin === true;
        setIsAdmin(!!admin);
        setProfileReady(true);
      });
    } catch (e) {
      setProfile(null);
      setIsAdmin(false);
      setProfileReady(true);
    }
    return () => { unsubProfile && unsubProfile(); };
  }, [user]);

  return (
    <AuthContext.Provider value={{ authReady, profileReady, user, profile, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
