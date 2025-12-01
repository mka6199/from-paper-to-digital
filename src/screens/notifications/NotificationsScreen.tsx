// src/screens/NotificationsScreen.tsx
import React from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { showAlert } from '../../utils/alert';
import Screen from '../../components/layout/Screen';
import Card from '../../components/primitives/Card';
import Button from '../../components/primitives/Button';
import { spacing, typography, colors as tokenColors } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { useCurrency } from '../../context/CurrencyProvider';

import { subscribeMyWorkers, Worker } from '../../services/workers';
import { Payment, monthRange, subscribeMyPaymentsInRange } from '../../services/payments';
import { computeDueSummary } from '../../services/alerts';

import {
  AppNotification,
  subscribeMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  ensureDueNotification,
} from '../../services/notifications';

const timeAgo = (d?: Date | null) => {
  if (!d) return '—';
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
};

export default function NotificationsScreen() {
  const { colors, mode } = useTheme();
  const { format } = useCurrency();

  // Live data for “always-on” salary alerts
  const [workers, setWorkers] = React.useState<Worker[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [{ start, end }] = React.useState(() => monthRange());

  // Inbox items saved in Firestore
  const [rows, setRows] = React.useState<AppNotification[]>([]);
  const [ready, setReady] = React.useState(false);

  // ----- subscriptions -----
  React.useEffect(() => {
    let u1: undefined | (() => void);
    let u2: undefined | (() => void);
    try { u1 = subscribeMyWorkers(setWorkers); } catch (e) { console.warn('subscribeMyWorkers failed:', e); }
    try { u2 = subscribeMyPaymentsInRange({ start, end }, setPayments); } catch (e) { console.warn('subscribeMyPaymentsInRange failed:', e); }
    return () => { u1 && u1(); u2 && u2(); };
  }, [start, end]);

  React.useEffect(() => {
    let unsub: undefined | (() => void);
    try {
      unsub = subscribeMyNotifications((list) => {
        setRows(list);
        setReady(true);
      });
    } catch (e) {
      console.warn('subscribeMyNotifications failed:', e);
      setReady(true);
    }
    return () => { unsub && unsub(); };
  }, []);

  // ----- computed "live" summary -----
  const live = React.useMemo(() => computeDueSummary(workers, payments, new Date()), [workers, payments]);
  const money = (n: number) => format(n);

  // ----- refresh notifications -----
  const refreshNotifications = React.useCallback(async () => {
    if (workers.length === 0) return;
    
    const now = new Date();
    const nowSec = Math.floor(now.getTime() / 1000);
    const mStartSec = Math.floor(start.getTime() / 1000);
    const mEndSec = Math.floor(end.getTime() / 1000);

    const promises = workers
      .filter((w) => {
        const dueTs = (w as any).nextDueAt?.seconds as number | undefined;
        if (!dueTs) return false;
        const inThisMonth = dueTs >= mStartSec && dueTs <= mEndSec;
        const isOverdue = dueTs <= nowSec;
        return inThisMonth && isOverdue;
      })
      .map((w) => {
        const dueKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return ensureDueNotification({
          workerId: w.id!,
          workerName: w.name,
          dueKey,
        }).catch(() => {});
      });

    await Promise.all(promises);
    showAlert('Refreshed', 'Notification check complete.');
  }, [workers, start, end]);

  // ----- styles -----
  const s = React.useMemo(() => StyleSheet.create({
    page: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing['2xl'] as any },

    sectionHeader: {
      ...typography.h2,
      color: colors.text,
    },
    sub: {
      ...typography.small,
      color: colors.subtext,
    },

    card: {
      padding: spacing.lg,
      borderWidth: 1,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      gap: spacing.sm,
    },

    tileRow: { flexDirection: 'row', gap: spacing.md },

    tile: {
      flex: 1,
      padding: spacing.lg,
      borderRadius: 14,
      borderWidth: 1,
      gap: 6,
    },

    overdueTile: {
      borderColor: tokenColors.danger,
      backgroundColor: 'rgba(185,28,28,0.12)',
    },
    dueSoonTile: {
      borderColor: '#B45309',
      backgroundColor: 'rgba(180,83,9,0.12)',
    },
    okTile: {
      borderColor: colors.border,
      backgroundColor: mode === 'dark' ? '#0f1417' : '#ffffff',
    },

    tileTitle: {
      fontWeight: '800',
      fontSize: 15,
      color: colors.text,
    },
    tileValue: {
      ...typography.h2,
      color: colors.text,
    },
    tileNote: {
      ...typography.small,
      color: colors.subtext,
    },

    row: {
      padding: spacing.lg,
      borderWidth: 1,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    rowUnreadBorder: { borderColor: colors.focus },
    rowUnreadBG: { backgroundColor: mode === 'dark' ? '#0f1b2d' : '#f2f7ff' },

    rowTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    rowSub: {
      fontSize: 14,
      color: colors.subtext,
    },

    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    empty: {
      ...typography.small,
      textAlign: 'center',
      color: colors.subtext,
    },
  }), [colors, mode]);

  // ----- item renderer -----
  const renderItem = ({ item }: { item: AppNotification }) => {
    const dt = item.createdAt?.toDate ? item.createdAt.toDate() : null;

    // choose subtle accent by type
    const accent =
      item.type === 'due'
        ? { borderColor: tokenColors.danger, backgroundColor: 'rgba(185,28,28,0.08)' }
        : {};

    return (
      <Card style={[
        s.row,
        item.isRead === false && s.rowUnreadBorder,
        item.isRead === false && s.rowUnreadBG,
        accent,
      ]}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text>
          {(item.body || item.workerName || item.workerId) ? (
            <Text style={s.rowSub} numberOfLines={1}>
              {item.body ?? (item.workerName || item.workerId)}
            </Text>
          ) : null}
          <Text style={s.rowSub}>{timeAgo(dt)}</Text>
        </View>

        <View style={{ gap: 8, alignItems: 'flex-end' }}>
          {item.isRead ? (
            <Button label="Mark unread" variant="soft" onPress={() => markNotificationRead(item.id!, false)} />
          ) : (
            <Button label="Mark read" onPress={() => markNotificationRead(item.id!, true)} />
          )}
          <Pressable
            onPress={() =>
              showAlert('Remove notification', 'Delete this notification?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteNotification(item.id!) },
              ])
            }
          >
            <Text style={{ color: tokenColors.danger, fontSize: 14 }}>Remove</Text>
          </Pressable>
        </View>
      </Card>
    );
  };

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={s.page}>
            {/* Headline for the page (uses stack header—no AppHeader component) */}
            <View style={s.headerBar}>
              <View>
                <Text style={s.sectionHeader}>Notifications</Text>
                <Text style={s.sub}>Review alerts and recent activity.</Text>
              </View>
              <View style={{ gap: 8 }}>
                <Button label="Check for dues" variant="soft" onPress={refreshNotifications} />
                <Button label="Mark all read" variant="outline" onPress={() => markAllNotificationsRead()} />
              </View>
            </View>

            {/* Live Salary Alerts (computed) */}
            <View>
              <Text style={s.sectionHeader}>Live Salary Alerts</Text>
              <Text style={s.sub}>Always up-to-date, even if no inbox item was stored yet.</Text>

              <View style={[s.tileRow, { marginTop: spacing.md }]}>
                <Card style={[s.tile, (live.overdueCount > 0 ? s.overdueTile : s.okTile)]}>
                  <Text style={s.tileTitle}>Overdue</Text>
                  <Text style={s.tileValue}>
                    {live.overdueCount} worker{live.overdueCount === 1 ? '' : 's'}
                  </Text>
                  <Text style={s.tileNote}>{money(live.overdueAmountAED)}</Text>
                </Card>

                <Card style={[s.tile, (live.dueSoonCount > 0 ? s.dueSoonTile : s.okTile)]}>
                  <Text style={s.tileTitle}>Due soon (this month)</Text>
                  <Text style={s.tileValue}>
                    {live.dueSoonCount} worker{live.dueSoonCount === 1 ? '' : 's'}
                  </Text>
                  <Text style={s.tileNote}>{money(live.dueSoonAmountAED)}</Text>
                </Card>
              </View>
            </View>

            {/* Inbox header */}
            <View>
              <Text style={[s.sectionHeader, { marginTop: spacing.lg }]}>Inbox</Text>
              <Text style={s.sub}>Saved notifications</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          ready ? <Text style={s.empty}>All caught up! No notifications.</Text> : null
        }
        contentContainerStyle={{ paddingBottom: 120, gap: spacing.md }}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}
