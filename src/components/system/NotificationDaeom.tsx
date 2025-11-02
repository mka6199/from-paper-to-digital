// src/components/system/NotificationDaemon.tsx
import React from 'react';
import { Timestamp } from 'firebase/firestore';
import { subscribeDueWorkers } from '../../services/workers';
import { ensureDueNotification } from '../../services/notifications';

/**
 * Listens for workers whose nextDueAt <= now and creates a single "Payment due"
 * notification per worker per due cycle.
 */
export default function NotificationDaemon() {
  React.useEffect(() => {
    const unsub = subscribeDueWorkers(new Date(), async (dueWorkers) => {
      for (const w of dueWorkers) {
        const dueTS: any = w.nextDueAt as Timestamp | undefined;
        const key = dueTS?.seconds ? String(dueTS.seconds) : '0';
        await ensureDueNotification({
          workerId: w.id!,
          workerName: w.name,
          dueKey: key,
        }).catch(() => {});
      }
    });
    return () => { try { unsub(); } catch {} };
  }, []);

  return null; // renders nothing
}
