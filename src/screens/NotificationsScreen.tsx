import React from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Alert } from 'react-native';
import Screen from '../components/layout/Screen';
import AppHeader from '../components/layout/AppHeader';
import Card from '../components/primitives/Card';
import Button from '../components/primitives/Button';
import { spacing } from '../theme/tokens';
import {
  AppNotification,
  subscribeMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../services/notifications';
import { useTheme } from '../theme/ThemeProvider';

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
  const { colors, mode } = useTheme();
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

  const styles = React.useMemo(() => StyleSheet.create({
    row: {
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    unread: {
      borderColor: colors.brand,
      backgroundColor: mode === 'dark' ? '#0f2417' : '#f5fff7',
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    subtext: {
      fontSize: 14,
      color: colors.subtext,
    },
    empty: {
      fontSize: 14,
      textAlign: 'center',
      color: colors.subtext,
    },
    headerWrap: { paddingHorizontal: spacing.lg },
    headerActions: { alignItems: 'flex-end', marginBottom: spacing.md },
    listContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['2xl'] as any },
    removeText: { fontSize: 14, color: colors.danger },
  }), [colors, mode]);

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
            <Text style={styles.subtext} numberOfLines={1}>{subtitle}</Text>
          )}
          <Text style={styles.subtext}>{timeAgo(dt)}</Text>
        </View>

        <View style={{ gap: 8, alignItems: 'flex-end' }}>
          {item.isRead ? (
            <Button label="Mark unread" variant="soft" onPress={() => markNotificationRead(item.id!, false)} />
          ) : (
            <Button label="Mark read" onPress={() => markNotificationRead(item.id!, true)} />
          )}
          <Pressable onPress={() => {
            Alert.alert('Remove notification', 'Delete this notification?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => deleteNotification(item.id!) },
            ]);
          }}>
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      </Card>
    );
  };

  const header = (
    <View style={styles.headerWrap}>
      <AppHeader title="Notifications" />
      <View style={styles.headerActions}>
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
          ready ? <Text style={styles.empty}>All caught up! No notifications.</Text> : null
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}
