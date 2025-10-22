// src/screens/AdminScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, View, Text } from 'react-native';
import Screen from '../components/layout/Screen';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/primitives/Button';
import { spacing, typography } from '../theme/tokens';
import { listWorkers, deleteWorker, Worker } from '../services/workers';

export default function AdminScreen() {
  const [rows, setRows] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listWorkers();
      setRows(data as any);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRemove = (id: string) => {
    Alert.alert('Remove worker', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWorker(id);
            setRows((prev) => prev.filter((w: any) => w.id !== id));
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? String(e));
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <AppHeader title="Admin" subtitle="Manage workers" />
      <FlatList
        data={rows as any}
        refreshing={loading}
        onRefresh={load}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        renderItem={({ item }: any) => (
          <View
            style={{
              padding: spacing.md,
              borderWidth: 1,
              borderColor: '#eee',
              borderRadius: 12,
              marginBottom: spacing.md,
            }}
          >
            <Text style={typography.h2}>{item.name}</Text>
            <Text style={typography.small}>Owner: {item.ownerUid ?? '—'}</Text>
            <View style={{ marginTop: spacing.md }}>
              <Button
                label="Remove"
                tone="danger"
                onPress={() => onRemove(item.id)}
              />
            </View>
          </View>
        )}
      />
    </Screen>
  );
}
