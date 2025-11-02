import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import Screen from '../components/layout/Screen';
import Card from '../components/primitives/Card';
import Button from '../components/primitives/Button';
import { colors, spacing, typography } from '../theme/tokens';
import { AuthContext } from '../context/AuthProvider';
import { subscribeMyWorkers, Worker } from '../services/workers';
import { Payment, monthRange, subscribeMyPaymentsInRange } from '../services/payments';
import { subscribeMyUnreadCount } from '../services/notifications';

const money = (n: number) => `${Math.round(n).toLocaleString()} AED`;
const addDays = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

type Totals = {
  workers: number;
  dueNow: number;
  dueThisMonth: number;
  paidThisMonth: number;
};

export default function DashboardScreen({ navigation }: any) {
  const { profile } = React.useContext(AuthContext);

  const displayName =
    (profile?.firstName
      ? `${profile.firstName}${profile?.lastName ? ' ' + profile.lastName : ''}`
      : '') || profile?.email || 'User';

  const [workers, setWorkers] = React.useState<Worker[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [totals, setTotals] = React.useState<Totals>({
    workers: 0,
    dueNow: 0,
    dueThisMonth: 0,
    paidThisMonth: 0,
  });
  const [gotWorkers, setGotWorkers] = React.useState(false);
  const [gotPayments, setGotPayments] = React.useState(false);
  const [unread, setUnread] = React.useState(0);

  React.useEffect(() => {
    let u: (() => void) | null = null;
    try {
      u = subscribeMyUnreadCount(setUnread);
    } catch {}
    return () => {
      if (u) u();
    };
  }, []);

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
    return () => {
      if (unsub) unsub();
    };
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
    return () => {
      if (unsub) unsub();
    };
  }, []);

  React.useEffect(() => {
    const now = new Date();
    const nowSec = Math.floor(now.getTime() / 1000);
    const { start: mStart, end: mEnd } = monthRange();
    const mStartSec = Math.floor(mStart.getTime() / 1000);
    const mEndSec = Math.floor(mEnd.getTime() / 1000);

    const salaryOf = (w: Worker) =>
      Number(w.monthlySalaryAED ?? w.baseSalary ?? 0) || 0;

    const paidInCurrentCycle = (w: Worker) => {
      const cycleEnd = (w.nextDueAt?.toDate?.() as Date | undefined) ?? now;
      const cycleStart = addDays(new Date(cycleEnd), -31);
      const created = w.createdAt?.toDate?.() as Date | undefined;
      const start = created && created > cycleStart ? created : cycleStart;

      return payments.reduce((sum, p) => {
        if (p.workerId !== w.id) return sum;
        const t = p.paidAt?.toDate?.();
        if (!t) return sum;
        return t >= start && t <= cycleEnd
          ? sum + Number(p.amount ?? 0) + Number(p.bonus ?? 0)
          : sum;
      }, 0);
    };

    const dueNow = workers.reduce((sum, w) => {
      const dueTs = (w.nextDueAt?.seconds as number | undefined) ?? 0;
      if (dueTs === 0 || dueTs > nowSec) return sum;
      const remaining = Math.max(0, salaryOf(w) - paidInCurrentCycle(w));
      return sum + remaining;
    }, 0);

    const dueThisMonth = workers.reduce((sum, w) => {
      const t = (w.nextDueAt?.seconds as number | undefined) ?? 0;
      if (t >= mStartSec && t <= mEndSec) return sum + salaryOf(w);
      return sum;
    }, 0);

    const paidThisMonth = payments.reduce(
      (s, p) => s + Number(p.amount ?? 0) + Number(p.bonus ?? 0),
      0
    );

    setTotals({ workers: workers.length, dueNow, dueThisMonth, paidThisMonth });
  }, [workers, payments]);

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
            Welcome, {displayName} 👋
          </Text>
          <Text style={[typography.small, { color: colors.subtext }]}>
            Here’s your snapshot for this month.
          </Text>
        </View>

        {/* Bell / Notifications */}
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.getParent()?.navigate('Notifications')}
          style={{ paddingHorizontal: 12, paddingVertical: 8 }}
        >
          <Text style={{ fontSize: 22 }}>🔔</Text>
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unread > 99 ? '99+' : String(unread)}
              </Text>
            </View>
          )}
        </Pressable>
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
          <Text
            style={[
              styles.statValue,
              { color: totals.dueNow > 0 ? colors.danger : colors.text },
            ]}
          >
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
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
        <Text style={[typography.h2, { marginBottom: spacing.sm }]}>
          Recent payments
        </Text>
      </View>
    </View>
  );

  const isLoading = !gotWorkers || !gotPayments;

  return (
    <Screen>
      <FlatList
        data={payments.slice(0, 20)}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => {
          const when = item.paidAt?.toDate ? item.paidAt.toDate() : undefined;
          const dateStr = when
            ? `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(
                2,
                '0'
              )}-${String(when.getDate()).padStart(2, '0')}`
            : '—';
          const total = Number(item.amount ?? 0) + Number(item.bonus ?? 0);
          return (
            <Card style={styles.rowCard}>
              <View style={styles.row}>
                <Text style={typography.body}>{dateStr}</Text>
                <Text style={[typography.body, { fontWeight: '700' }]}>
                  {money(total)}
                </Text>
              </View>
              <Text style={[typography.small, { color: colors.subtext }]}>
                Worker: {item.workerName ?? item.workerId} • Method:{' '}
                {item.method ?? '—'}
              </Text>
            </Card>
          );
        }}
        ListHeaderComponent={Header}
        ListEmptyComponent={
          !isLoading ? (
            <Text
              style={[
                typography.small,
                { textAlign: 'center', color: colors.subtext },
              ]}
            >
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
  badge: {
    position: 'absolute',
    right: 6,
    top: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
