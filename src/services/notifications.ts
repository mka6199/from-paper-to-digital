import { db, auth, ensureAuth } from '../config/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

export type NotificationCategory =
  | 'salary_due'
  | 'payment_activity'
  | 'system_update'
  | 'task_assignment';

export type NotificationPriority = 'normal' | 'high' | 'critical';

export type NotificationMetadata = {
  workerId?: string;
  workerName?: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
  extra?: Record<string, any>;
};

export type NotificationCTA = {
  label: string;
  route: string;
  params?: Record<string, any>;
} | null;

export type NotificationPreferences = {
  muted: boolean;
  pushEnabled: boolean;
  categories: Record<NotificationCategory, boolean>;
  dnd: {
    enabled: boolean;
    start: string; // HH:mm
    end: string;   // HH:mm
  };
  updatedAt?: any;
};

export type AppNotification = {
  id?: string;
  ownerUid: string;
  type: 'due' | 'system';
  category?: NotificationCategory;
  title: string;
  body?: string;
  workerId?: string;
  workerName?: string;
  metadata?: NotificationMetadata;
  priority?: NotificationPriority;
  cta?: NotificationCTA;
  isRead?: boolean;
  createdAt?: any;
  updatedAt?: any;
};

export type QueueNotificationInput = {
  ownerUid?: string;
  id?: string;
  category: NotificationCategory;
  title: string;
  body?: string;
  metadata?: NotificationMetadata;
  priority?: NotificationPriority;
  cta?: NotificationCTA;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  muted: false,
  pushEnabled: true,
  categories: {
    salary_due: true,
    payment_activity: true,
    system_update: true,
    task_assignment: true,
  },
  dnd: {
    enabled: false,
    start: '22:00',
    end: '07:00',
  },
};

const COL = collection(db, 'notifications');
const preferenceCache = new Map<string, NotificationPreferences>();

const notificationSettingsDoc = (uid: string) => doc(db, 'settings', uid);

function mergeWithDefaults(prefs?: Partial<NotificationPreferences> | null): NotificationPreferences {
  const merged: NotificationPreferences = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(prefs ?? {}),
    categories: {
      ...DEFAULT_NOTIFICATION_PREFERENCES.categories,
      ...(prefs?.categories ?? {}),
    },
    dnd: {
      ...DEFAULT_NOTIFICATION_PREFERENCES.dnd,
      ...(prefs?.dnd ?? {}),
    },
  };
  return merged;
}

function minutesFromTime(value: string): number {
  const match = /^([0-9]{1,2}):([0-9]{2})$/.exec(value?.trim() ?? '');
  if (!match) return 0;
  const hours = Math.max(0, Math.min(23, Number(match[1])));
  const minutes = Math.max(0, Math.min(59, Number(match[2])));
  return hours * 60 + minutes;
}

function inDndWindow(prefs: NotificationPreferences): boolean {
  if (!prefs.dnd?.enabled) return false;
  const start = minutesFromTime(prefs.dnd.start);
  const end = minutesFromTime(prefs.dnd.end);
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  if (start === end) return true; // always silent
  if (start < end) {
    return current >= start && current < end;
  }
  // wraps past midnight
  return current >= start || current < end;
}

function shouldSuppressNotification(
  prefs: NotificationPreferences,
  category: NotificationCategory,
  priority: NotificationPriority = 'normal'
): boolean {
  if (priority === 'critical') return false;
  if (prefs.muted) return true;
  if (prefs.categories?.[category] === false) return true;
  if (prefs.dnd?.enabled && priority === 'normal' && inDndWindow(prefs)) return true;
  return false;
}

export async function getNotificationPreferences(
  uid: string,
  options: { force?: boolean } = {}
): Promise<NotificationPreferences> {
  if (!options.force && preferenceCache.has(uid)) {
    return preferenceCache.get(uid)!;
  }
  const snap = await getDoc(notificationSettingsDoc(uid));
  const prefs = mergeWithDefaults(snap.exists() ? (snap.data() as NotificationPreferences) : undefined);
  preferenceCache.set(uid, prefs);
  return prefs;
}

export function subscribeNotificationPreferences(
  uid: string,
  cb: (prefs: NotificationPreferences) => void
): () => void {
  const ref = notificationSettingsDoc(uid);
  return onSnapshot(
    ref,
    (snap) => {
      const prefs = mergeWithDefaults(snap.exists() ? (snap.data() as NotificationPreferences) : undefined);
      preferenceCache.set(uid, prefs);
      cb(prefs);
    },
    () => cb(mergeWithDefaults())
  );
}

export function subscribeMyNotificationPreferences(cb: (prefs: NotificationPreferences) => void) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  return subscribeNotificationPreferences(uid, cb);
}

export async function updateNotificationPreferences(uid: string, patch: Partial<NotificationPreferences>) {
  await setDoc(
    notificationSettingsDoc(uid),
    {
      ...patch,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  preferenceCache.delete(uid);
}

export async function updateMyNotificationPreferences(patch: Partial<NotificationPreferences>) {
  const uid = (await ensureAuth()).uid;
  await updateNotificationPreferences(uid, patch);
}

export function resetNotificationPreferenceCache(uid?: string) {
  if (uid) preferenceCache.delete(uid);
  else preferenceCache.clear();
}

function sanitizeMetadata(meta?: NotificationMetadata): NotificationMetadata | null {
  if (!meta) return null;
  const clean: NotificationMetadata = {};
  if (meta.workerId) clean.workerId = meta.workerId;
  if (meta.workerName) clean.workerName = meta.workerName;
  if (meta.paymentId) clean.paymentId = meta.paymentId;
  if (typeof meta.amount === 'number') clean.amount = meta.amount;
  if (meta.currency) clean.currency = meta.currency;
  if (meta.extra) clean.extra = meta.extra;
  return clean;
}

export async function queueNotification(payload: QueueNotificationInput) {
  const ownerUid = payload.ownerUid ?? (await ensureAuth()).uid;
  const prefs = await getNotificationPreferences(ownerUid);
  if (shouldSuppressNotification(prefs, payload.category, payload.priority ?? 'normal')) {
    return null;
  }

  const legacyType: AppNotification['type'] = payload.category === 'salary_due' ? 'due' : 'system';
  const metadata = sanitizeMetadata(payload.metadata ?? undefined);
  const docPayload: AppNotification = {
    ownerUid,
    type: legacyType,
    category: payload.category,
    title: payload.title,
    body: payload.body ?? '',
    workerId: metadata?.workerId ?? null,
    workerName: metadata?.workerName ?? null,
    priority: payload.priority ?? 'normal',
    cta: payload.cta ?? null,
    isRead: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (metadata) {
    (docPayload as any).metadata = metadata;
  }

  if (payload.id) {
    const ref = doc(db, 'notifications', payload.id);
    await setDoc(ref, docPayload);
    return ref;
  }

  return await addDoc(COL, docPayload);
}

export function subscribeMyNotifications(cb: (rows: AppNotification[]) => void): () => void {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  const qy = query(COL, where('ownerUid', '==', uid), orderBy('createdAt', 'desc'));
  return onSnapshot(qy, (snap) => {
    const out = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as AppNotification[];
    cb(out);
  });
}

export function subscribeMyUnreadCount(cb: (count: number) => void): () => void {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  const qy = query(COL, where('ownerUid', '==', uid), where('isRead', '==', false));
  return onSnapshot(qy, (snap) => {
    cb(snap.size);
  });
}

export async function markNotificationRead(id: string, isRead = true) {
  await ensureAuth();
  await updateDoc(doc(db, 'notifications', id), {
    isRead,
    updatedAt: serverTimestamp(),
  });
}

export async function markAllNotificationsRead() {
  await ensureAuth();
  const uid = auth.currentUser!.uid;
  const qy = query(COL, where('ownerUid', '==', uid), where('isRead', '==', false));
  const snap = await getDocs(qy);
  await Promise.all(
    snap.docs.map((d) =>
      updateDoc(d.ref, { isRead: true, updatedAt: serverTimestamp() })
    )
  );
}

export async function ensureDueNotification(params: {
  workerId: string;
  workerName?: string;
  dueKey: string; 
}) {
  await ensureAuth();
  const uid = auth.currentUser!.uid;
  const prefs = await getNotificationPreferences(uid);
  if (shouldSuppressNotification(prefs, 'salary_due')) return;
  const id = `due_${uid}_${params.workerId}_${params.dueKey}`;
  const ref = doc(db, 'notifications', id);
  const exists = (await getDoc(ref)).exists();
  if (exists) return;

  await setDoc(ref, {
    ownerUid: uid,
    type: 'due',
    category: 'salary_due',
    title: 'Payment due',
    body: params.workerName
      ? `Salary is due for ${params.workerName}.`
      : 'A worker salary is due.',
    workerId: params.workerId,
    workerName: params.workerName ?? null,
    metadata: {
      workerId: params.workerId,
      workerName: params.workerName ?? null,
    },
    isRead: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as AppNotification);
}

export async function createSystemNotification(title: string, body?: string) {
  await queueNotification({
    category: 'system_update',
    title,
    body,
  });
}

export async function deleteNotification(id: string) {
  await ensureAuth();
  await deleteDoc(doc(db, 'notifications', id));
}

export async function generateNotificationSamples() {
  const uid = (await ensureAuth()).uid;
  await queueNotification({
    ownerUid: uid,
    category: 'payment_activity',
    title: 'Salary paid to Amal Hassan',
    body: 'AED 3,200 transferred via bank transfer.',
    metadata: { workerName: 'Amal Hassan', amount: 3200, currency: 'AED' },
  });
  await queueNotification({
    ownerUid: uid,
    category: 'task_assignment',
    title: 'Worker document pending approval',
    body: 'Review Ahmad’s visa file before Friday.',
    metadata: { workerName: 'Ahmad', extra: { checklist: 'visa' } },
  });
  await queueNotification({
    ownerUid: uid,
    category: 'system_update',
    title: 'New analytics now available',
    body: 'Monthly insights report was refreshed.',
  });
}
