import React from 'react';
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import Card from '../../components/primitives/Card';
import Button from '../../components/primitives/Button';
import TextField from '../../components/primitives/TextField';
import { spacing, typography } from '../../theme/tokens';
import { findUserByEmail, subscribePaymentsByOwnerUid, AdminUser } from '../../services/admin';
import { signOut } from '../../../firebase';
import AdminGate from '../../components/admin/AdminGate';
import { useTheme } from '../../theme/ThemeProvider';

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());

export default function AdminPaymentsScreen({ navigation }: any) {
  const { colors } = useTheme();

  const [queryEmail, setQueryEmail] = React.useState('');
  const [pickedUser, setPickedUser] = React.useState<AdminUser | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let unsub: (() => void) | null = null;
    if (pickedUser?.uid) {
      unsub = subscribePaymentsByOwnerUid(pickedUser.uid, setRows);
    } else {
      setRows([]);
    }
    return () => { if (unsub) unsub(); };
  }, [pickedUser?.uid]);

  async function onLoadUser() {
    const email = queryEmail.trim().toLowerCase();
    if (!isEmail(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email.');
      return;
    }
    setBusy(true);
    try {
      const u = await findUserByEmail(email);
      if (!u) {
        Alert.alert('Not found', 'No user found for that email.');
        setPickedUser(null);
      } else {
        setPickedUser(u);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onLogout() { try { await signOut(); } catch {} }

  const header = (
    <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
      <AppHeader title="Admin • Payments by User" onBack={() => navigation.goBack()} />
      <View style={{ alignItems: 'flex-end' }}>
        <Button label="Log out" variant="outline" tone="danger" onPress={onLogout} />
      </View>
      <Card style={{ padding: spacing.md, borderColor: colors.border, backgroundColor: colors.surface }}>
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
      <View>
        <Text style={[typography.h2, { marginTop: spacing.md, color: colors.text }]}>Payments</Text>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    const when = item.paidAt?.toDate ? item.paidAt.toDate() : null;
    const total = Number(item.amount ?? 0) + Number(item.bonus ?? 0);
    return (
      <Card style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.body, { color: colors.text }]}>
            {when ? when.toISOString().slice(0, 10) : '—'} • {total} AED
          </Text>
          <Text style={[typography.small, { color: colors.subtext }]}>
            worker: {item.workerName ?? item.workerId} • method: {item.method ?? '—'} • month: {item.month ?? '—'}
          </Text>
          {!!item.note && <Text style={[typography.small, { marginTop: 4, color: colors.text }]}>{item.note}</Text>}
        </View>
        <View style={{ gap: spacing.xs }}>
          <Button
            label="Edit"
            variant="soft"
            onPress={() => navigation.navigate('AdminEditPayment', { paymentId: item.id })}
          />
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
            <Text style={[typography.small, { textAlign: 'center', color: colors.subtext }]}>
              {pickedUser ? 'No payments for this user.' : 'Enter an email to load a user.'}
            </Text>
          }
        />
      </Screen>
    </AdminGate>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
