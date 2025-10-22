import React from 'react';
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import Card from '../../components/primitives/Card';
import Button from '../../components/primitives/Button';
import TextField from '../../components/primitives/TextField';
import { spacing, typography, colors } from '../../theme/tokens';
import { findUserByEmail, subscribeWorkersByOwnerUid, AdminUser } from '../../services/admin';
import { deleteWorker } from '../../services/workers';
import { signOut } from '../../../firebase';
import AdminGate from '../../components/admin/AdminGate';

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());

export default function AdminWorkersScreen({ navigation }: any) {
  const [queryEmail, setQueryEmail] = React.useState('');
  const [pickedUser, setPickedUser] = React.useState<AdminUser | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let unsub: (() => void) | null = null;
    if (pickedUser?.uid) {
      unsub = subscribeWorkersByOwnerUid(pickedUser.uid, setRows);
    } else {
      setRows([]);
    }
    return () => { if (unsub) unsub(); };
  }, [pickedUser?.uid]);

  async function onLoadUser() {
    const email = queryEmail.trim().toLowerCase();
    if (!isEmail(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      const u = await findUserByEmail(email);
      if (!u) {
        Alert.alert('Not found', 'No user with that email.');
        setPickedUser(null);
      } else {
        setPickedUser(u);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not load user.');
    } finally {
      setBusy(false);
    }
  }

  function onEditWorker(item: any) {
    navigation.navigate('AdminEditWorker', { workerId: item.id });
  }

  function onDeleteWorker(item: any) {
    Alert.alert('Delete worker', `Remove "${item.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWorker(item.id);
          } catch (e: any) {
            Alert.alert('Failed', e?.message ?? 'Could not delete worker.');
          }
        },
      },
    ]);
  }

  async function onLogout() { try { await signOut(); } catch {} }

  const header = (
    <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
      <AppHeader title="Admin • Workers by User" onBack={() => navigation.goBack()} />
      <View style={{ alignItems: 'flex-end' }}>
        <Button label="Log out" variant="outline" tone="danger" onPress={onLogout} />
      </View>
      <Card style={{ padding: spacing.md }}>
        <TextField
          label="User email"
          value={queryEmail}
          onChangeText={setQueryEmail}
          autoCapitalize="none"
          placeholder="user@example.com"
        />
        <View style={{ height: spacing.sm }} />
        <Button label={busy ? 'Loading…' : 'Load'} onPress={onLoadUser} disabled={busy} />
        {!!pickedUser && (
          <Text style={[typography.small, { marginTop: spacing.sm, color: colors.subtext }]}>
            Selected: {pickedUser.email} ({pickedUser.uid})
          </Text>
        )}
      </Card>
      <View style={{ paddingHorizontal: 0 }}>
        <Text style={[typography.h2, { marginTop: spacing.md }]}>Workers</Text>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    const salary = Number(item.monthlySalaryAED ?? item.baseSalary ?? 0);
    const due = item.nextDueAt?.toDate ? item.nextDueAt.toDate() : null;
    return (
      <Card style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={typography.body}>{item.name || '—'}</Text>
          <Text style={[typography.small, { color: colors.subtext }]}>
            role: {item.role ?? '—'} • salary: {salary} AED
          </Text>
          <Text style={[typography.small, { color: colors.subtext }]}>
            next due: {due ? due.toDateString() : '—'}
          </Text>
        </View>
        <View style={{ gap: spacing.xs }}>
          <Button label="Edit" variant="soft" onPress={() => onEditWorker(item)} />
          <Button label="Remove" variant="outline" tone="danger" onPress={() => onDeleteWorker(item)} />
        </View>
      </Card>
    );
  };

  return (
    <AdminGate title="Admin Panel">
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['2xl'] }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          pickedUser
            ? <Text style={[typography.small, { textAlign: 'center' }]}>No workers for this user.</Text>
            : <Text style={[typography.small, { textAlign: 'center' }]}>Enter an email to load a user.</Text>
        }
      />
    </Screen>
    </AdminGate>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: spacing.lg,
    borderWidth: 1, borderColor: '#eee', borderRadius: 16, backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
});
