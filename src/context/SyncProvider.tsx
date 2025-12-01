import React from 'react';
import {
  isOnline,
  subscribeToNetworkStatus,
  getPendingOperations,
  markOperationSynced,
  removeSyncedOperations,
  updateLastSyncTime,
  PendingOperation,
} from '../services/offline';
import { logger } from '../utils/logger';
import { addWorker, updateWorker, deleteWorker } from '../services/workers';
import { addPaymentRaw } from '../services/payments';

type SyncContextType = {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: number | null;
  syncNow: () => Promise<void>;
};

export const SyncContext = React.createContext<SyncContextType>({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncTime: null,
  syncNow: async () => {},
});

export function useSyncStatus() {
  return React.useContext(SyncContext);
}

export default function SyncProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [lastSync, setLastSync] = React.useState<number | null>(null);

  // Check network status on mount
  React.useEffect(() => {
    isOnline().then(setOnline);
  }, []);

  // Subscribe to network changes
  React.useEffect(() => {
    const unsubscribe = subscribeToNetworkStatus((connected) => {
      setOnline(connected);
      if (connected) {
        // Auto-sync when coming back online
        syncPendingOperations();
      }
    });
    return unsubscribe;
  }, []);

  // Update pending count periodically
  React.useEffect(() => {
    const updatePendingCount = async () => {
      const operations = await getPendingOperations();
      setPendingCount(operations.filter(op => !op.synced).length);
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const syncPendingOperations = async () => {
    if (syncing || !online) return;

    try {
      setSyncing(true);
      const operations = await getPendingOperations();
      const unsynced = operations.filter(op => !op.synced);

      logger.log(`[SYNC] Syncing ${unsynced.length} pending operations...`);

      for (const op of unsynced) {
        try {
          await executeOperation(op);
          await markOperationSynced(op.id);
          logger.log(`[SYNC] Synced operation ${op.type} (${op.id})`);
        } catch (error) {
          logger.error(`[SYNC] Failed to sync operation ${op.id}:`, error);
          // Continue with other operations
        }
      }

      await removeSyncedOperations();
      await updateLastSyncTime();
      setLastSync(Date.now());

      logger.log('[SYNC] Sync completed');
    } catch (error) {
      logger.error('[SYNC] Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const executeOperation = async (op: PendingOperation) => {
    switch (op.type) {
      case 'add_worker':
        await addWorker(op.data);
        break;
      case 'update_worker':
        await updateWorker(op.data.id, op.data.updates);
        break;
      case 'delete_worker':
        await deleteWorker(op.data.id);
        break;
      case 'add_payment':
        await addPaymentRaw(op.data);
        break;
      default:
        logger.warn(`[SYNC] Unknown operation type: ${op.type}`);
    }
  };

  const value: SyncContextType = {
    isOnline: online,
    isSyncing: syncing,
    pendingCount,
    lastSyncTime: lastSync,
    syncNow: syncPendingOperations,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
