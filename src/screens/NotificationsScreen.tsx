import React from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Alert } from 'react-native';
import Screen from '../components/layout/Screen';
import AppHeader from '../components/layout/AppHeader';
import Card from '../components/primitives/Card';
import Button from '../components/primitives/Button';
import { colors, spacing, typography } from '../theme/tokens';
import {
  AppNotification,
  subscribeMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../services/notifications';

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

export default function NotificationsScreen({ navigation }: any) {
  const [rows, setRows] = React.useState<AppNotification[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let unsub: (() => void) | null = null;
    try {
      unsub = subscribeMyNotifications((list) => {
        setRows(list);
        setReady(true);
      });
    } catch (e) {
      console.warn('subscribeMyNotifications failed:', e);
      setReady(true);
    }
    return () => { if (unsub) unsub(); };
  }, []);

  const renderItem = ({ item }: { item: AppNotification }) => {
    const dt = item.createdAt?.toDate ? item.createdAt.toDate() : null;
    const subtitle =
      item.type === 'due'
        ? (item.workerName ? `Worker: ${item.workerName}` : item.workerId || '')
        : item.body || '';

    return (
      <Card style={[styles.row, item.isRead === false && styles.unread]}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          {!!subtitle && (
            <Text style={[typography.small, { color: colors.subtext }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
          <Text style={[typography.small, { color: colors.subtext }]}>{timeAgo(dt)}</Text>
        </View>

        <View style={{ gap: 8, alignItems: 'flex-end' }}>
          {item.isRead ? (
            <Button label="Mark unread" variant="soft" onPress={() => markNotificationRead(item.id!, false)} />
          ) : (
            <Button label="Mark read" tone="green" onPress={() => markNotificationRead(item.id!, true)} />
          )}
          <Pressable onPress={() => {
            Alert.alert('Remove notification', 'Delete this notification?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => deleteNotification(item.id!) },
            ]);
          }}>
            <Text style={[typography.small, { color: colors.danger }]}>Remove</Text>
          </Pressable>
        </View>
      </Card>
    );
  };

  const header = (
    <View style={{ paddingHorizontal: spacing.lg }}>
      <AppHeader title="Notifications" />
      <View style={{ alignItems: 'flex-end', marginBottom: spacing.md }}>
        <Button label="Mark all read" variant="outline" onPress={() => markAllNotificationsRead()} />
      </View>
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={
          ready ? (
            <Text style={[typography.small, { textAlign: 'center', color: colors.subtext }]}>
              All caught up! No notifications.
            </Text>
          ) : null
        }
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['2xl'] }}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  unread: {
    borderColor: colors.brand,
    backgroundColor: '#f5fff7',
  },
  title: {
    ...typography.body,
    fontWeight: '700',
  } as any,
});
