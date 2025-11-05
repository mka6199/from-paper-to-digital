import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import Card from '../../components/primitives/Card';
import Button from '../../components/primitives/Button';
import { spacing, typography } from '../../theme/tokens';
import { subscribeAllUsers, subscribeAllWorkers, subscribeAllPayments } from '../../services/admin';
import { signOut } from '../../../firebase';
import AdminGate from '../../components/admin/AdminGate';
import { useTheme } from '../../theme/ThemeProvider';

export default function AdminDashboardScreen({ navigation }: any) {
  const { colors } = useTheme();

  const [users, setUsers] = React.useState<any[]>([]);
  const [workers, setWorkers] = React.useState<any[]>([]);
  const [payments, setPayments] = React.useState<any[]>([]);

  React.useEffect(() => {
    const u = subscribeAllUsers(setUsers);
    const w = subscribeAllWorkers(setWorkers);
    const p = subscribeAllPayments(setPayments);
    return () => { u(); w(); p(); };
  }, []);

  const totalPaid = payments.reduce(
    (sum, p) => sum + Number(p.amount ?? 0) + Number(p.bonus ?? 0),
    0
  );

  async function onLogout() {
    try { await signOut(); } catch {}
  }

  return (
    <AdminGate title="Admin Panel">
      <Screen>
        <AppHeader title="Admin Panel" />
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing['2xl'] }}>
          <View style={{ alignItems: 'flex-end', marginBottom: spacing.sm }}>
            <Button label="Log out" variant="outline" tone="danger" onPress={onLogout} />
          </View>

          <Card style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.label, { color: colors.subtext }]}>Users</Text>
            <Text style={[styles.value, { color: colors.text }]}>{users.length}</Text>
            <Button label="Manage users" variant="soft" onPress={() => navigation.navigate('AdminUsers')} fullWidth />
          </Card>

          <Card style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.label, { color: colors.subtext }]}>Workers (all tenants)</Text>
            <Text style={[styles.value, { color: colors.text }]}>{workers.length}</Text>
            <Button label="Browse workers" variant="soft" onPress={() => navigation.navigate('AdminWorkers')} fullWidth />
          </Card>

          <Card style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.label, { color: colors.subtext }]}>Payments (total recorded)</Text>
            <Text style={[styles.value, { color: colors.text }]}>{totalPaid.toLocaleString()} AED</Text>
            <Button label="Review payments" variant="soft" onPress={() => navigation.navigate('AdminPayments')} fullWidth />
          </Card>
        </View>
      </Screen>
    </AdminGate>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    gap: spacing.sm,
  },
  label: { ...typography.small } as any,
  value: { ...typography.h1, marginBottom: spacing.sm } as any,
});
