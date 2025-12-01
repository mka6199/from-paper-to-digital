import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Worker } from './workers';
import { Payment } from './payments';

const CACHE_PREFIX = 'offline_cache_';
const PENDING_PREFIX = 'offline_pending_';
const LAST_SYNC_KEY = 'offline_last_sync';

export type PendingOperation = {
  id: string;
  type: 'add_worker' | 'update_worker' | 'delete_worker' | 'add_payment' | 'update_payment' | 'delete_payment';
  data: any;
  timestamp: number;
  synced: boolean;
};

// Check if device is online
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected ?? false;
}

// Subscribe to network status changes
export function subscribeToNetworkStatus(callback: (isConnected: boolean) => void) {
  return NetInfo.addEventListener((state: any) => {
    callback(state.isConnected ?? false);
  });
}

// Cache workers locally
export async function cacheWorkers(workers: Worker[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${CACHE_PREFIX}workers`,
      JSON.stringify(workers)
    );
  } catch (error) {
    console.error('Error caching workers:', error);
  }
}

// Get cached workers
export async function getCachedWorkers(): Promise<Worker[]> {
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}workers`);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error('Error getting cached workers:', error);
    return [];
  }
}

// Cache payments locally
export async function cachePayments(payments: Payment[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${CACHE_PREFIX}payments`,
      JSON.stringify(payments)
    );
  } catch (error) {
    console.error('Error caching payments:', error);
  }
}

// Get cached payments
export async function getCachedPayments(): Promise<Payment[]> {
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}payments`);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error('Error getting cached payments:', error);
    return [];
  }
}

// Add pending operation (to sync later when online)
export async function addPendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'synced'>): Promise<void> {
  try {
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const op: PendingOperation = {
      id,
      ...operation,
      timestamp: Date.now(),
      synced: false,
    };

    const existing = await getPendingOperations();
    existing.push(op);
    
    await AsyncStorage.setItem(
      `${PENDING_PREFIX}operations`,
      JSON.stringify(existing)
    );
  } catch (error) {
    console.error('Error adding pending operation:', error);
  }
}

// Get all pending operations
export async function getPendingOperations(): Promise<PendingOperation[]> {
  try {
    const pending = await AsyncStorage.getItem(`${PENDING_PREFIX}operations`);
    return pending ? JSON.parse(pending) : [];
  } catch (error) {
    console.error('Error getting pending operations:', error);
    return [];
  }
}

// Remove synced operations
export async function removeSyncedOperations(): Promise<void> {
  try {
    const operations = await getPendingOperations();
    const unsynced = operations.filter(op => !op.synced);
    
    await AsyncStorage.setItem(
      `${PENDING_PREFIX}operations`,
      JSON.stringify(unsynced)
    );
  } catch (error) {
    console.error('Error removing synced operations:', error);
  }
}

// Mark operation as synced
export async function markOperationSynced(operationId: string): Promise<void> {
  try {
    const operations = await getPendingOperations();
    const updated = operations.map(op => 
      op.id === operationId ? { ...op, synced: true } : op
    );
    
    await AsyncStorage.setItem(
      `${PENDING_PREFIX}operations`,
      JSON.stringify(updated)
    );
  } catch (error) {
    console.error('Error marking operation as synced:', error);
  }
}

// Update last sync timestamp
export async function updateLastSyncTime(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error updating last sync time:', error);
  }
}

// Get last sync timestamp
export async function getLastSyncTime(): Promise<number | null> {
  try {
    const time = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return time ? parseInt(time, 10) : null;
  } catch (error) {
    console.error('Error getting last sync time:', error);
    return null;
  }
}

// Clear all offline data
export async function clearOfflineData(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const offlineKeys = keys.filter(
      key => key.startsWith(CACHE_PREFIX) || key.startsWith(PENDING_PREFIX) || key === LAST_SYNC_KEY
    );
    await AsyncStorage.multiRemove(offlineKeys);
  } catch (error) {
    console.error('Error clearing offline data:', error);
  }
}
