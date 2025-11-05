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
import Screen from '../../components/layout/Screen';
import Card from '../../components/primitives/Card';
import WorkerListItem from '../../components/composites/WorkerListItem';
import { spacing, typography } from '../../theme/tokens';
import { subscribeMyWorkers, listWorkers, Worker } from '../../services/workers';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';

type Filter = 'active' | 'former';

export default function WorkersListScreen({ navigation }: any) {
  const { colors } = useTheme();

  const [rows, setRows] = React.useState<Worker[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [filter, setFilter] = React.useState<Filter>('active');

  const tabBarHeight = useBottomTabBarHeight?.() ?? 0;

  useFocusEffect(
    React.useCallback(() => {
      let unsub: undefined | (() => void);
      try {
        unsub = subscribeMyWorkers((list) => setRows(list), { status: filter });
      } catch (e) {
        console.warn('subscribeMyWorkers failed:', e);
      }
      return () => unsub && unsub();
    }, [filter])
  );

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await listWorkers({ status: filter });
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, [filter]);

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
        data={rows}
        keyExtractor={(w) => String(w.id)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
        ListHeaderComponent={Toggle}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing['2xl'] + 80, 
          gap: spacing.md,
        }}
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
          !loading ? (
            <Text
              style={[
                typography.small,
                { textAlign: 'center', marginTop: spacing.xl, color: colors.subtext },
              ]}
            >
              {filter === 'active'
                ? 'No active workers yet. Tap the + button to add one.'
                : 'No former workers.'}
            </Text>
          ) : null
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
                bottom: tabBarHeight + spacing.lg,
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
