import React from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import Screen from '../components/layout/Screen';
import Card from '../components/primitives/Card';
import Button from '../components/primitives/Button';
import { colors, spacing, typography } from '../theme/tokens';
import { AuthContext } from '../context/AuthProvider';
import { subscribeMyWorkers, Worker } from '../services/workers';
import {
  Payment,
  monthRange,
  subscribeMyPaymentsInRange,
} from '../services/payments';
import { signOut } from '../../firebase';

type Totals = {
  workers: number;
  dueNow: number;
  dueThisMonth: number;
  paidThisMonth: number;
  outstanding: number;
};

export default function DashboardScreen({ navigation }: any) {
  const { profile } = React.useContext(AuthContext);

  const [workers, setWorkers] = React.useState<Worker[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [totals, setTotals] = React.useState<Totals>({
    workers: 0,
    dueNow: 0,
    dueThisMonth: 0,
    paidThisMonth: 0,
    outstanding: 0,
  });

  const [gotWorkers, setGotWorkers] = React.useState(false);
  const [gotPayments, setGotPayments] = React.useState(false);

  React.useEffect(() => {
    let unsub: (() => void) | null = null;
    try {
      unsub = subscribeMyWorkers((rows) => {
        setWorkers(rows);
        setGotWorkers(true);
      });
    } catch (e) {
      console.warn('Dashboard subscribeMyWorkers failed:', e);
      setGotWorkers(true);
    }
    return () => { if (unsub) unsub(); };
  }, []);

  React.useEffect(() => {
    const { start, end } = monthRange();
    let unsub: (() => void) | null = null;
    try {
      unsub = subscribeMyPaymentsInRange({ start, end }, (rows) => {
        setPayments(rows);
        setGotPayments(true);
      });
    } catch (e) {
      console.warn('Dashboard subscribeMyPaymentsInRange failed:', e);
      setGotPayments(true);
    }
    return () => { if (unsub) unsub(); };
  }, []);

  React.useEffect(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    const { start, end } = monthRange();
    const startSec = Math.floor(start.getTime() / 1000);
    const endSec = Math.floor(end.getTime() / 1000);

    const salaryOf = (w: Worker) =>
      Number(w.monthlySalaryAED ?? w.baseSalary ?? 0) || 0;

    const dueNow = workers.reduce((sum, w) => {
      const t = (w.nextDueAt && w.nextDueAt.seconds) || 0;
      return sum + (t > 0 && t <= nowSec ? salaryOf(w) : 0);
    }, 0);

    const dueThisMonth = workers.reduce((sum, w) => {
      const t = (w.nextDueAt && w.nextDueAt.seconds) || 0;
      return sum + (t >= startSec && t <= endSec ? salaryOf(w) : 0);
    }, 0);

    const paidThisMonth = payments.reduce(
      (sum, p) => sum + Number(p.amount ?? 0) + Number(p.bonus ?? 0),
      0
    );

    setTotals({
      workers: workers.length,
      dueNow,
      dueThisMonth,
      paidThisMonth,
      outstanding: dueThisMonth,
    });
  }, [workers, payments]);

  const money = (n: number) => `${Math.round(n).toLocaleString()} AED`;

  const renderPayment = ({ item }: { item: Payment }) => {
    const when = item.paidAt?.toDate ? item.paidAt.toDate() : undefined;
    const dateStr = when
      ? `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(
          when.getDate()
        ).padStart(2, '0')}`
      : '—';
    const total = Number(item.amount ?? 0) + Number(item.bonus ?? 0);

    return (
      <Card style={styles.rowCard}>
        <View style={styles.row}>
          <Text style={typography.body}>{dateStr}</Text>
          <Text style={[typography.body, { fontWeight: '700' }]}>{total} AED</Text>
        </View>
        <Text style={[typography.small, { color: colors.subtext }]}>
          Worker: {item.workerName ?? item.workerId} • Method: {item.method ?? '—'}
        </Text>
      </Card>
    );
  };

  function onLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (e: any) {
            Alert.alert('Could not log out', e?.message ?? 'Please try again.');
          }
        },
      },
    ]);
  }

  const Header = (
    <View style={{ paddingBottom: spacing.lg }}>
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={[typography.h1, { marginBottom: 4 }]} numberOfLines={1}>
            Welcome{profile?.email ? `, ${profile.email}` : ''} 👋
          </Text>
          <Text style={[typography.small, { color: colors.subtext }]}>
            Here’s your snapshot for this month.
          </Text>
        </View>
        <Button label="Log out" variant="outline" tone="danger" onPress={onLogout} />
      </View>

      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Workers</Text>
          <Text style={styles.statValue}>{totals.workers}</Text>
          <Button
            label="View workers"
            variant="soft"
            onPress={() => navigation.navigate('Workers')}
            fullWidth
          />
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Due now</Text>
          <Text style={[styles.statValue, { color: totals.dueNow > 0 ? colors.danger : colors.text }]}>
            {money(totals.dueNow)}
          </Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Due this month</Text>
          <Text style={styles.statValue}>{money(totals.dueThisMonth)}</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Paid this month</Text>
          <Text style={styles.statValue}>{money(totals.paidThisMonth)}</Text>
          <Button
            label="View history"
            variant="outline"
            onPress={() => {
              const { start, end } = monthRange();
              navigation.navigate('History', {
                screen: 'MonthlyHistory',
                params: {
                  monthStart: start.toISOString(),
                  monthEnd: end.toISOString(),
                },
              });
            }}
            fullWidth
          />
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Outstanding</Text>
          <Text style={[styles.statValue, { color: totals.outstanding > 0 ? colors.danger : colors.text }]}>
            {money(totals.outstanding)}
          </Text>
          <Button
            label="Pay a worker"
            onPress={() => navigation.navigate('Workers', { screen: 'WorkersList' })}
            fullWidth
          />
        </Card>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
        <Text style={[typography.h2, { marginBottom: spacing.sm }]}>Recent payments</Text>
      </View>
    </View>
  );

  const isLoading = !gotWorkers || !gotPayments;

  return (
    <Screen>
      <FlatList
        data={payments.slice(0, 20)}
        keyExtractor={(p) => String(p.id)}
        renderItem={renderPayment}
        ListHeaderComponent={Header}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={[typography.small, { textAlign: 'center', color: colors.subtext }]}>
              No payments yet this month.
            </Text>
          ) : null
        }
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing['2xl'],
          gap: spacing.md,
        }}
        refreshing={isLoading}
        onRefresh={() => {}}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  statCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 16,
    gap: spacing.sm,
    backgroundColor: '#fff',
  },
  statLabel: {
    ...typography.small,
    color: colors.subtext,
  } as any,
  statValue: {
    ...typography.h1,
    marginBottom: spacing.sm,
  } as any,
  rowCard: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 16,
    padding: spacing.lg,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
});
