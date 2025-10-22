import React from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  RefreshControl,
} from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import Card from '../../components/primitives/Card';
import WorkerListItem from '../../components/composites/WorkerListItem';
import { colors, spacing, typography } from '../../theme/tokens';
import { subscribeMyWorkers, listWorkers, Worker } from '../../services/workers';
import { useFocusEffect } from '@react-navigation/native';

export default function WorkersListScreen({ navigation }: any) {
  const [rows, setRows] = React.useState<Worker[]>([]);
  const [loading, setLoading] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let unsub: undefined | (() => void);
      try {
        unsub = subscribeMyWorkers((list) => setRows(list));
      } catch (e) {
        console.warn('subscribeMyWorkers failed:', e);
      }
      return () => unsub && unsub();
    }, [])
  );

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await listWorkers();
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const renderItem = ({ item }: { item: Worker }) => (
    <Card style={styles.card}>
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

  return (
    <Screen>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <Text style={typography.h1}>Workers</Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(w) => String(w.id)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing['2xl'], 
        }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={[typography.small, { textAlign: 'center', marginTop: spacing.xl }]}>
              No workers yet. Tap the + button to add one.
            </Text>
          ) : null
        }
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add worker"
        onPress={() => navigation.navigate('AddWorker')}
        style={({ pressed }) => [
          styles.fab,
          pressed && { opacity: 0.92 },
        ]}
      >
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 16,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg + 8, 
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brand, 
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 8,
    shadowColor: '#000',
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
