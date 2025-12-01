import React from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  RefreshControl,
  Platform,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Screen from '../../components/layout/Screen';
import Card from '../../components/primitives/Card';
import WorkerListItem from './components/WorkerListItem';
import TextField from '../../components/primitives/TextField';
import { EmptyState } from '../../components/feedback/EmptyState';
import { SkeletonCard } from '../../components/feedback/SkeletonCard';
import { spacing, typography } from '../../theme/tokens';
import { subscribeMyWorkers, listWorkers, Worker } from '../../services/workers';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';
import { logger } from '../../utils/logger';
import type { WorkersScreenProps } from '../../types/navigation';

type Filter = 'active' | 'former';

export default function WorkersListScreen({ navigation }: WorkersScreenProps<'WorkersList'>) {
  const { colors } = useTheme();

  const [rows, setRows] = React.useState<Worker[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [filter, setFilter] = React.useState<Filter>('active');
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const tabBarHeight = useBottomTabBarHeight?.() ?? 0;
  const insets = useSafeAreaInsets();
  const contentBottom = Math.max(tabBarHeight + insets.bottom + spacing.xl, 120);

  useFocusEffect(
    React.useCallback(() => {
      let unsub: undefined | (() => void);
      try {
        unsub = subscribeMyWorkers(
          (list) => {
            setRows(list);
            setError(null);
          },
          { status: filter }
        );
      } catch (e) {
        logger.warn('subscribeMyWorkers failed:', e);
        setError('Unable to sync workers. Pull to refresh to retry.');
      }
      return () => unsub && unsub();
    }, [filter])
  );

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await listWorkers({ status: filter });
      setRows(data);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const filteredRows = React.useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const query = searchQuery.toLowerCase();
    return rows.filter(
      (w) =>
        w.name?.toLowerCase().includes(query) ||
        w.role?.toLowerCase().includes(query) ||
        w.employeeId?.toLowerCase().includes(query)
    );
  }, [rows, searchQuery]);

  const renderItem = ({ item }: { item: Worker }) => (
    <Card
      style={[
        styles.card,
        { borderColor: colors.border, backgroundColor: colors.card },
      ]}
    >
      <WorkerListItem
        name={item.name}
        role={item.role ?? ''}
        employeeId={item.employeeId}
        monthlySalaryAED={Number(item.monthlySalaryAED ?? item.baseSalary ?? 0)}
        dueAtMs={item.nextDueAtMs}
        onPress={() =>
          navigation.navigate('WorkerProfile', {
            id: item.id,
            worker: {
              id: item.id!,
              name: item.name ?? '',
              role: item.role ?? '',
              monthlySalaryAED: Number(item.monthlySalaryAED ?? item.baseSalary ?? 0),
              avatarUrl: item.avatarUrl ?? null,
            },
          })
        }
      />
    </Card>
  );

  const Toggle = (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
      <Text style={[typography.h1, { color: colors.text }]}>Workers</Text>

      {error ? (
        <Text
          style={{
            color: colors.danger ?? '#B91C1C',
            marginTop: spacing.xs,
          }}
        >
          {error}
        </Text>
      ) : null}

      <View style={{ marginTop: spacing.md }}>
        <TextField
          placeholder="Search by name, role, or ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          iconLeft="search-outline"
        />
      </View>

      <View
        style={[
          styles.segment,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {(['active', 'former'] as Filter[]).map((key) => {
          const active = filter === key;
          return (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              style={[
                styles.segmentItem,
                active && { backgroundColor: colors.brand },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Show ${key} workers`}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  { color: active ? '#fff' : colors.text },
                ]}
              >
                {key === 'active' ? 'Active' : 'Former'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={filteredRows}
        keyExtractor={(w) => String(w.id)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
        ListHeaderComponent={Toggle}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: contentBottom,
          gap: spacing.md,
        }}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={colors.text}
            titleColor={colors.subtext}
            colors={Platform.OS === 'android' ? [colors.brand] : undefined}
            progressBackgroundColor={Platform.OS === 'android' ? colors.card : undefined}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingTop: spacing.lg }}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : (
            <EmptyState
              icon="people-outline"
              title={filter === 'active' ? 'No active workers' : 'No former workers'}
              message={filter === 'active' ? 'Add your first worker to get started' : undefined}
              actionLabel={filter === 'active' ? 'Add Worker' : undefined}
              onAction={filter === 'active' ? () => navigation.navigate('AddWorker') : undefined}
            />
          )
        }
        showsVerticalScrollIndicator={false}
      />

      {filter === 'active' && (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add worker"
            onPress={() => navigation.navigate('AddWorker')}
            style={({ pressed }) => [
              styles.fab,
              {
                bottom: tabBarHeight + insets.bottom + spacing.md,
                backgroundColor: colors.brand,
                shadowColor: colors.text,
              },
              pressed && { opacity: 0.92 },
            ]}
          >
            <Text style={styles.fabPlus}>+</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
  },
  segment: {
    marginTop: spacing.md,
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  fabPlus: {
    color: '#fff',
    fontSize: 30,
    lineHeight: 30,
    fontWeight: '800',
    marginTop: -2,
  },
});
