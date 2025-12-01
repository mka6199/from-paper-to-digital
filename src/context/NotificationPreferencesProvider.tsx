import React from 'react';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationPreferences,
  subscribeNotificationPreferences,
  updateNotificationPreferences,
} from '../services/notifications';
import { AuthContext } from './AuthProvider';

export type NotificationPreferencesContextValue = {
  prefs: NotificationPreferences;
  ready: boolean;
  updatePrefs: (patch: Partial<NotificationPreferences>) => Promise<void>;
};

export const NotificationPreferencesContext = React.createContext<NotificationPreferencesContextValue>({
  prefs: DEFAULT_NOTIFICATION_PREFERENCES,
  ready: false,
  updatePrefs: async () => {},
});

export default function NotificationPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = React.useContext(AuthContext);
  const [prefs, setPrefs] = React.useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (!user) {
      setPrefs(DEFAULT_NOTIFICATION_PREFERENCES);
      setReady(true);
      return;
    }

    setReady(false);
    let unsub: undefined | (() => void);
    try {
      unsub = subscribeNotificationPreferences(user.uid, (next) => {
        setPrefs(next);
        setReady(true);
      });
    } catch (e) {
      console.warn('subscribeNotificationPreferences failed', e);
      setReady(true);
    }

    return () => {
      unsub && unsub();
    };
  }, [user?.uid]);

  const updatePrefs = React.useCallback(
    async (patch: Partial<NotificationPreferences>) => {
      if (!user?.uid) return;
      await updateNotificationPreferences(user.uid, patch);
    },
    [user?.uid]
  );

  return (
    <NotificationPreferencesContext.Provider value={{ prefs, ready, updatePrefs }}>
      {children}
    </NotificationPreferencesContext.Provider>
  );
}
