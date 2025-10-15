import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View, StyleSheet } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import Card from '../../components/primitives/Card';
import WorkerListItem from '../../components/composites/WorkerListItem';
import { colors, spacing, typography } from '../../theme/tokens';
import { listWorkers } from '../../services/workers';
import { useFocusEffect } from '@react-navigation/native';

export default function WorkersListScreen({ navigation }: any) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listWorkers();
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = ({ item }: any) => (
    <Card>
      <WorkerListItem
        name={item.name}
        role={item.role}
        onPress={() =>
          navigation.navigate('WorkerProfile', {
            id: item.id,
            worker: {
              id: item.id,
              name: item.name ?? '',
              role: item.role ?? '',
              monthlySalaryAED: Number(item.monthlySalaryAED ?? item.baseSalary ?? item.salary ?? 0),
              avatarUrl: null,
            },
          })
        }
      />
    </Card>
  );

  return (
    <Screen>
      <AppHeader title="Workers" />

      <FlatList
        data={rows}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListEmptyComponent={
          <Card>
            <Text style={typography.body}>No workers yet. Tap the + to add your first worker.</Text>
          </Card>
        }
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={{ paddingBottom: 96 }} // room for FAB
      />

      {/* Floating Action Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add worker"
        onPress={() => navigation.navigate('AddWorker')}
        style={({ pressed }) => [
          styles.fab,
          { opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg + 8, // lift above bottom safe area
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand, // UAE green
    alignItems: 'center',
    justifyContent: 'center',
    // subtle shadow
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabPlus: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '700',
    marginTop: -2,
  },
});
