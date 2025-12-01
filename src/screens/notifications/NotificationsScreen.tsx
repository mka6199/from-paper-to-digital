// src/screens/NotificationsScreen.tsx
import React from 'react';
import { View, Text, SectionList, StyleSheet, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { showAlert } from '../../utils/alert';
import Screen from '../../components/layout/Screen';
import Card from '../../components/primitives/Card';
import Button from '../../components/primitives/Button';
import { spacing, typography, colors as tokenColors } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { useCurrency } from '../../context/CurrencyProvider';
import { getContentBottomPadding } from '../../utils/layout';

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
  NotificationCategory,
  generateNotificationSamples,
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

const CATEGORY_META: Record<NotificationCategory, { label: string; tone: 'default' | 'warning' | 'info' | 'success' }> = {
  salary_due: { label: 'Salary due', tone: 'warning' },
  payment_activity: { label: 'Payment activity', tone: 'success' },
  system_update: { label: 'System update', tone: 'info' },
  task_assignment: { label: 'Task', tone: 'default' },
};

const resolveCategory = (item: AppNotification): NotificationCategory => {
  if (item.category && CATEGORY_META[item.category]) return item.category;
  return item.type === 'due' ? 'salary_due' : 'system_update';
};

const DAY_MS = 24 * 60 * 60 * 1000;

function formatSectionTitle(date?: Date | null) {
  if (!date) return 'Earlier';
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startToday.getTime() - startDate.getTime()) / DAY_MS);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'long' });
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function NotificationsScreen() {
  const { colors, mode } = useTheme();
  const { format } = useCurrency();
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const isCompact = width < 420;

  // Live data for “always-on” salary alerts
  const [workers, setWorkers] = React.useState<Worker[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [{ start, end }] = React.useState(() => monthRange());

  // Inbox items saved in Firestore
  const [rows, setRows] = React.useState<AppNotification[]>([]);
  const [ready, setReady] = React.useState(false);
  const [testBusy, setTestBusy] = React.useState(false);
  const [activeFilter, setActiveFilter] = React.useState<'all' | 'unread' | NotificationCategory>('all');

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

  const derivedCounts = React.useMemo(() => {
    const base: Record<'all' | 'unread', number> = { all: rows.length, unread: 0 };
    const categoryCount: Record<NotificationCategory, number> = {
      salary_due: 0,
      payment_activity: 0,
      system_update: 0,
      task_assignment: 0,
    };

    rows.forEach((row) => {
      if (!row.isRead) base.unread += 1;
      const category = resolveCategory(row);
      categoryCount[category] = (categoryCount[category] ?? 0) + 1;
    });

    return { ...base, categories: categoryCount };
  }, [rows]);

  const filterOptions = React.useMemo(() => {
    return [
      { key: 'all' as const, label: 'All', count: derivedCounts.all },
      { key: 'unread' as const, label: 'Unread', count: derivedCounts.unread },
      { key: 'salary_due' as const, label: 'Salary', count: derivedCounts.categories.salary_due },
      { key: 'payment_activity' as const, label: 'Payments', count: derivedCounts.categories.payment_activity },
      { key: 'task_assignment' as const, label: 'Tasks', count: derivedCounts.categories.task_assignment },
      { key: 'system_update' as const, label: 'System', count: derivedCounts.categories.system_update },
    ];
  }, [derivedCounts]);

  const filteredRows = React.useMemo(() => {
    return rows.filter((row) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'unread') return !row.isRead;
      return resolveCategory(row) === activeFilter;
    });
  }, [rows, activeFilter]);

  const sections = React.useMemo(() => {
    if (filteredRows.length === 0) return [];
    const bucketOrder: string[] = [];
    const buckets: Record<string, { title: string; data: AppNotification[] }> = {};

    filteredRows.forEach((row) => {
      const date = row.createdAt?.toDate ? row.createdAt.toDate() : undefined;
      const key = date ? date.toISOString().split('T')[0] : 'unknown';
      if (!buckets[key]) {
        buckets[key] = { title: formatSectionTitle(date), data: [] };
        bucketOrder.push(key);
      }
      buckets[key].data.push(row);
    });

    return bucketOrder.map((key) => buckets[key]);
  }, [filteredRows]);

  const lastUpdatedText = React.useMemo(() => {
    const first = rows[0]?.createdAt?.toDate ? rows[0].createdAt.toDate() : undefined;
    return first ? timeAgo(first) : 'No activity yet';
  }, [rows]);

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

  const triggerSamples = React.useCallback(async () => {
    setTestBusy(true);
    try {
      await generateNotificationSamples();
      showAlert('Samples queued', 'A few example alerts were added to your inbox.');
    } catch (e: any) {
      showAlert('Error', e?.message ?? 'Could not generate sample notifications.');
    } finally {
      setTestBusy(false);
    }
  }, []);

  const goToPreferences = React.useCallback(() => {
    navigation.navigate('Settings', { screen: 'NotificationPreferences' });
  }, [navigation]);

  // ----- styles -----
  const s = React.useMemo(() => StyleSheet.create({
    page: { gap: spacing.lg },

    sectionHeader: {
      ...typography.h2,
      color: colors.text,
    },
    sub: {
      ...typography.small,
      color: colors.subtext,
    },
    heroCard: {
      flexDirection: isCompact ? 'column' : 'row',
      gap: spacing.lg,
      borderRadius: 20,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: mode === 'dark' ? '#0f172a' : colors.surface,
    },
    heroEyebrow: {
      textTransform: 'uppercase',
      fontSize: 11,
      letterSpacing: 1,
      color: colors.subtext,
    },
    heroUnread: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.text,
    },
    heroMeta: {
      fontSize: 13,
      color: colors.subtext,
    },
    heroChips: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    heroChip: {
      flex: 1,
      borderRadius: 12,
      padding: spacing.md,
      backgroundColor: mode === 'dark' ? '#111c2d' : '#f5f7fb',
    },
    heroChipLabel: {
      fontSize: 11,
      color: colors.subtext,
    },
    heroChipValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginTop: 2,
    },
    heroActionColumn: {
      minWidth: isCompact ? '100%' : 160,
      gap: spacing.sm,
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    heroPrimary: {
      backgroundColor: colors.brand,
      paddingVertical: spacing.md,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'stretch',
    },
    heroPrimaryText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 12,
    },
    heroSecondary: {
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.md,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'stretch',
      backgroundColor: mode === 'dark' ? '#141b2e' : '#ffffff',
    },
    heroSecondaryText: {
      color: colors.text,
      fontWeight: '500',
      fontSize: 12,
    },
    heroLinks: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    heroLinkBtn: {
      paddingVertical: 8,
      paddingHorizontal: spacing.md,
      borderRadius: 999,
      backgroundColor: colors.brand + '1A',
    },
    heroLinkText: {
      color: colors.brand,
      fontWeight: '600',
    },
    filterHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    filterScroll: {
      flexDirection: 'row',
      paddingVertical: 2,
    },
    filterPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: mode === 'dark' ? '#0f141d' : '#fff',
    },
    filterPillActive: {
      backgroundColor: colors.brand,
      borderColor: colors.brand,
    },
    filterLabel: {
      fontWeight: '600',
      color: colors.text,
      fontSize: 13,
    },
    filterLabelActive: {
      color: '#fff',
    },
    filterCount: {
      fontSize: 12,
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

    timelineLabel: {
      fontSize: 13,
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: colors.subtext,
      marginBottom: spacing.sm,
      marginTop: spacing.lg,
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
    badge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: 999,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
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
  }), [colors, mode, isCompact]);

  // ----- item renderer -----
  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <Text style={s.timelineLabel}>{section.title}</Text>
  );

  const renderItem = ({ item }: { item: AppNotification }) => {
    const dt = item.createdAt?.toDate ? item.createdAt.toDate() : null;
    const category = resolveCategory(item);
    const tone = CATEGORY_META[category]?.tone ?? 'default';
    const palette = {
      default: { bg: mode === 'dark' ? '#111827' : '#f1f5f9', fg: colors.text },
      warning: { bg: 'rgba(180,83,9,0.12)', fg: '#B45309' },
      success: { bg: 'rgba(16,185,129,0.18)', fg: '#047857' },
      info: { bg: 'rgba(37,99,235,0.15)', fg: '#2563EB' },
    } as const;
    const badgePalette = palette[tone] ?? palette.default;
    const bodyText = item.body?.trim();
    const metadataParts: string[] = [];
    const meta = item.metadata ?? {};
    if (meta.workerName || item.workerName) {
      metadataParts.push(meta.workerName ?? item.workerName ?? '');
    } else if (item.workerId) {
      metadataParts.push(`Worker ${item.workerId}`);
    }
    if (typeof meta.amount === 'number' && Number.isFinite(meta.amount)) {
      metadataParts.push(format(meta.amount, meta.currency as any));
    }
    if (meta.extra?.status) {
      metadataParts.push(String(meta.extra.status));
    }
    if (meta.extra?.dueDate) {
      metadataParts.push(`Due ${meta.extra.dueDate}`);
    }
    const metadataLine = metadataParts.filter(Boolean).join(' • ');

    // choose subtle accent by type
    const accent =
      item.type === 'due'
        ? { borderColor: tokenColors.danger, backgroundColor: 'rgba(185,28,28,0.08)' }
        : {};

    return (
      <View style={{ marginBottom: spacing.md }}>
        <Card style={[
          s.row,
          item.isRead === false && s.rowUnreadBorder,
          item.isRead === false && s.rowUnreadBG,
          accent,
        ]}>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={[s.badge, { backgroundColor: badgePalette.bg }]}>
              <Text style={[s.badgeText, { color: badgePalette.fg }]}>
                {CATEGORY_META[category]?.label ?? 'Alert'}
              </Text>
            </View>
            <Text style={s.rowSub}>{timeAgo(dt)}</Text>
          </View>
          <Text style={s.rowTitle} numberOfLines={2}>{item.title}</Text>
          {bodyText ? (
            <Text style={s.rowSub} numberOfLines={2}>{bodyText}</Text>
          ) : null}
          {metadataLine ? (
            <Text style={s.rowSub} numberOfLines={1}>{metadataLine}</Text>
          ) : null}
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
      </View>
    );
  };

  const activeFilterLabel = filterOptions.find((f) => f.key === activeFilter)?.label ?? 'All';

  return (
    <Screen>
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={
          <View style={s.page}>
            <View style={s.heroCard}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={s.heroEyebrow}>Today at a glance</Text>
                <Text style={s.heroUnread}>{derivedCounts.unread} things waiting</Text>
                <Text style={s.heroMeta}>
                  {derivedCounts.all} total this month • Fresh as of {lastUpdatedText}
                </Text>
                <View style={s.heroChips}>
                  <View style={s.heroChip}>
                    <Text style={s.heroChipLabel}>Workers who need paying</Text>
                    <Text style={s.heroChipValue}>{live.overdueCount}</Text>
                  </View>
                  <View style={s.heroChip}>
                    <Text style={s.heroChipLabel}>Payment alerts logged</Text>
                    <Text style={s.heroChipValue}>{derivedCounts.categories.payment_activity}</Text>
                  </View>
                </View>
              </View>
              <View style={s.heroActionColumn}>
                <Pressable style={s.heroPrimary} onPress={() => markAllNotificationsRead()}>
                  <Text style={s.heroPrimaryText}>Clear inbox</Text>
                </Pressable>
                <Pressable style={s.heroSecondary} onPress={goToPreferences}>
                  <Text style={s.heroSecondaryText}>Tune alerts</Text>
                </Pressable>
              </View>
            </View>

            <View style={s.heroLinks}>
              <Pressable onPress={refreshNotifications} style={s.heroLinkBtn}>
                <Text style={s.heroLinkText}>Check overdue salaries</Text>
              </Pressable>
              <Pressable
                onPress={triggerSamples}
                style={[s.heroLinkBtn, testBusy && { opacity: 0.6 }]}
                disabled={testBusy}
              >
                <Text style={s.heroLinkText}>{testBusy ? 'Adding a few examples...' : 'Add sample alerts'}</Text>
              </Pressable>
            </View>

            <Card style={{ gap: spacing.md }}>
              <View style={s.filterHeader}>
                <Text style={s.sectionHeader}>Filter inbox</Text>
                {activeFilter !== 'all' ? (
                  <Pressable onPress={() => setActiveFilter('all')}>
                    <Text style={s.sub}>Reset</Text>
                  </Pressable>
                ) : null}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
                {filterOptions.map((filter) => {
                  const isActive = filter.key === activeFilter;
                  return (
                    <Pressable
                      key={filter.key}
                      onPress={() => setActiveFilter(filter.key)}
                      style={[s.filterPill, { marginRight: spacing.sm }, isActive && s.filterPillActive]}
                    >
                      <Text style={[s.filterLabel, isActive && s.filterLabelActive]}>{filter.label}</Text>
                      <Text style={[s.filterCount, isActive && s.filterLabelActive]}>{filter.count}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Card>

            <View>
              <Text style={s.sectionHeader}>Live Salary Alerts</Text>
              <Text style={s.sub}>Always up-to-date, even without inbox items.</Text>
              <View style={[s.tileRow, { marginTop: spacing.md }]}>
                <Card style={[s.tile, live.overdueCount > 0 ? s.overdueTile : s.okTile]}>
                  <Text style={s.tileTitle}>Overdue</Text>
                  <Text style={s.tileValue}>{live.overdueCount} worker{live.overdueCount === 1 ? '' : 's'}</Text>
                  <Text style={s.tileNote}>{money(live.overdueAmountAED)}</Text>
                </Card>
                <Card style={[s.tile, live.dueSoonCount > 0 ? s.dueSoonTile : s.okTile]}>
                  <Text style={s.tileTitle}>Due soon</Text>
                  <Text style={s.tileValue}>{live.dueSoonCount} worker{live.dueSoonCount === 1 ? '' : 's'}</Text>
                  <Text style={s.tileNote}>{money(live.dueSoonAmountAED)}</Text>
                </Card>
              </View>
            </View>

            <View>
              <Text style={s.sectionHeader}>Timeline</Text>
              <Text style={s.sub}>Showing {activeFilterLabel.toLowerCase()} notifications</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          ready ? (
            <Text style={[s.empty, { marginTop: spacing.xl }]}>No {activeFilterLabel.toLowerCase()} notifications yet.</Text>
          ) : null
        }
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: getContentBottomPadding(),
          paddingTop: spacing.lg,
        }}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}
