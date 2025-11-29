import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import Screen from '../components/layout/Screen';
import Card from '../components/primitives/Card';
import Button from '../components/primitives/Button';
import { colors as tokenColors, spacing, typography } from '../theme/tokens';
import { AuthContext } from '../context/AuthProvider';
import { subscribeMyWorkers, Worker } from '../services/workers';
import { Payment, monthRange, subscribeMyPaymentsInRange } from '../services/payments';
import { subscribeMyUnreadCount } from '../services/notifications';
import { useTheme } from '../theme/ThemeProvider';
import { useCurrency } from '../context/CurrencyProvider';
import NotificationDaemon from '../components/system/NotificationDaeom';
import type { DueSummary } from '../services/alerts';

const moneyFactory = (format: (n: number) => string) => (n: number) => format(n);

function norm(v: any) {
  return String(v ?? '').trim().toLowerCase();
}
function matchesPaymentToWorker(p: Payment, w: Worker): boolean {
  if (p.workerId && w.id && String(p.workerId) === String(w.id)) return true;
  const pid = norm(p.workerId);
  const pname = norm(p.workerName);
  const wid = norm(w.id);
  const wname = norm(w.name);
  if (pid && pid === wid) return true;
  if (pname && pname === wname) return true;
  if (pid && pid === wname) return true;
  if (pname && pname === wid) return true;
  return false;
}

type Totals = {
  workers: number;
  dueNow: number;
  monthlyLiability: number;
  paidThisMonth: number;
  hasDueSoon: boolean;
  hasOverdue: boolean;
};

export default function DashboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { profile } = React.useContext(AuthContext);
  const { format } = useCurrency();
  const money = React.useMemo(() => moneyFactory((n) => format(n)), [format]);

  const displayName =
    (profile?.firstName
      ? `${profile.firstName}${profile?.lastName ? ' ' + profile.lastName : ''}`
      : '') || profile?.email || 'User';

  const [workers, setWorkers] = React.useState<Worker[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [totals, setTotals] = React.useState<Totals>({
    workers: 0,
    dueNow: 0,
    monthlyLiability: 0,
    paidThisMonth: 0,
    hasDueSoon: false,
    hasOverdue: false,
  });
  const [gotWorkers, setGotWorkers] = React.useState(false);
  const [gotPayments, setGotPayments] = React.useState(false);
  const [unread, setUnread] = React.useState(0);

  // Live salary-alert summary fed by NotificationDaemon
  const [dueSummary, setDueSummary] = React.useState<DueSummary>({
    dueSoonCount: 0,
    dueSoonAmountAED: 0,
    overdueCount: 0,
    overdueAmountAED: 0,
  });

  React.useEffect(() => {
    let u: (() => void) | null = null;
    try { u = subscribeMyUnreadCount(setUnread); } catch {}
    return () => { if (u) u(); };
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
    const now = new Date();
    const nowSec = Math.floor(now.getTime() / 1000);
    const { start: mStart, end: mEnd } = monthRange();
    const mStartSec = Math.floor(mStart.getTime() / 1000);
    const mEndSec = Math.floor(mEnd.getTime() / 1000);

    const salaryOf = (w: Worker) => Number(w.monthlySalaryAED ?? w.baseSalary ?? 0) || 0;

    const paidInWindow = (w: Worker, start: Date, end: Date) =>
      payments.reduce((sum, p) => {
        if (!matchesPaymentToWorker(p, w)) return sum;
        const t = p.paidAt?.toDate?.();
        if (!t) return sum;
        return t >= start && t <= end
          ? sum + Number(p.amount ?? 0) + Number(p.bonus ?? 0)
          : sum;
      }, 0);

    let monthlyLiability = 0;
    let dueNow = 0;
    let hasDueSoon = false;
    let hasOverdue = false;

    workers.forEach((w) => {
      monthlyLiability += salaryOf(w);
      const t = (w.nextDueAt?.seconds as number | undefined) ?? 0;
      const inThisMonth = t >= mStartSec && t <= mEndSec;
      if (!inThisMonth) return;
      const remaining = Math.max(0, salaryOf(w) - paidInWindow(w, mStart, mEnd));
      if (remaining <= 0) return;
      if (t <= nowSec) {
        dueNow += remaining;
        hasOverdue = true;
      } else {
        hasDueSoon = true;
      }
    });

    const paidThisMonth = payments.reduce(
      (s, p) => s + Number(p.amount ?? 0) + Number(p.bonus ?? 0),
      0
    );

    setTotals({
      workers: workers.length,
      dueNow,
      monthlyLiability,
      paidThisMonth,
      hasDueSoon,
      hasOverdue,
    });
  }, [workers, payments]);

  const salaryAED = Number(profile?.salaryMonthlyAED ?? 0);
  const liabilitiesAED = totals.monthlyLiability;
  const remainingAED = salaryAED - liabilitiesAED;

  function renderAlertsBanner() {
    const any = (dueSummary.overdueCount + dueSummary.dueSoonCount) > 0;
    if (!any) return null;
    const msg = [
      dueSummary.overdueCount ? `${dueSummary.overdueCount} overdue` : null,
      dueSummary.dueSoonCount ? `${dueSummary.dueSoonCount} due soon` : null,
    ].filter(Boolean).join(' · ');

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open salary due alerts"
        onPress={() => navigation.getParent()?.navigate('Notifications')}
        style={{
          padding: spacing.md,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: tokenColors.warn,
          backgroundColor: `${tokenColors.warn}12`,
          marginHorizontal: spacing.lg,
          marginBottom: spacing.md,
        }}
      >
        <Text style={[typography.small, { color: tokenColors.warn, fontWeight: '700' }]}>
          Salary Alerts
        </Text>
        <Text style={{ color: colors.text, marginTop: 2 }}>{msg}</Text>
      </Pressable>
    );
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
          <Text style={[typography.h1, { marginBottom: 4, color: colors.text }]} numberOfLines={1}>
            Welcome, {displayName} 👋
          </Text>
          <Text style={[typography.small, { color: colors.subtext }]}>
            Here’s your snapshot for this month.
          </Text>
        </View>

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

      {renderAlertsBanner()}

      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
        <Card style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statLabel, { color: colors.subtext }]}>Workers</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{totals.workers}</Text>
          <Button label="View workers" variant="soft" onPress={() => navigation.navigate('Workers')} fullWidth />
        </Card>

        <Card style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statLabel, { color: colors.subtext }]}>Due now (overdue)</Text>
          <Text style={[styles.statValue, { color: totals.dueNow > 0 ? tokenColors.danger : colors.text }]}>
            {money(totals.dueNow)}
          </Text>
          {totals.dueNow > 0 && (
            <Text style={[typography.small, { color: tokenColors.danger }]}>
              You have overdue salaries to pay.
            </Text>
          )}
        </Card>

        <Card style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statLabel, { color: colors.subtext }]}>Monthly Liabilities</Text>
          <Text
            style={[
              styles.statValue,
              totals.hasOverdue
                ? { color: tokenColors.danger }
                : totals.hasDueSoon
                ? { color: '#b45309' }
                : { color: colors.text },
            ]}
          >
            {money(liabilitiesAED)}
          </Text>
        </Card>

        <Card style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statLabel, { color: colors.subtext }]}>Salary Left (after liabilities)</Text>
          <Text style={[styles.statValue, { color: remainingAED < 0 ? tokenColors.danger : colors.text }]}>
            {salaryAED > 0 ? money(remainingAED) : 'Set your salary in Settings'}
          </Text>
          <Button label="Edit salary in Settings" variant="outline" onPress={() => navigation.navigate('Settings')} fullWidth />
        </Card>

        <Card style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statLabel, { color: colors.subtext }]}>Paid this month</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {money(totals.paidThisMonth)}
          </Text>
          <Button
            label="View history"
            variant="outline"
            onPress={() => {
              const { start, end } = monthRange();
              navigation.navigate('History', {
                screen: 'MonthlyHistory',
                params: { monthStart: start.toISOString(), monthEnd: end.toISOString() },
              });
            }}
            fullWidth
          />
        </Card>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
        <Text style={[typography.h2, { marginBottom: spacing.sm, color: colors.text }]}>
          Recent payments
        </Text>
      </View>
    </View>
  );

  const isLoading = !gotWorkers || !gotPayments;

  return (
    <Screen>
      {/* feeds dueSummary */}
      <NotificationDaemon onSummary={setDueSummary} />

      <FlatList
        data={payments.slice(0, 20)}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => {
          const when = item.paidAt?.toDate ? item.paidAt.toDate() : undefined;
          const dateStr = when
            ? `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')}`
            : '—';
          const total = Number(item.amount ?? 0) + Number(item.bonus ?? 0);
          return (
            <Card style={[styles.rowCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.row}>
                <Text style={[typography.body, { color: colors.text }]}>{dateStr}</Text>
                <Text style={[typography.body, { fontWeight: '700', color: colors.text }]}>{money(total)}</Text>
              </View>
              <Text style={[typography.small, { color: colors.subtext }]}>
                Worker: {item.workerName ?? item.workerId} • Method: {item.method ?? '—'}
              </Text>
            </Card>
          );
        }}
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
  statLabel: { ...typography.small } as any,
  statValue: { ...typography.h1, marginBottom: spacing.sm } as any,
  rowCard: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 16,
    padding: spacing.lg,
    backgroundColor: '#fff',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  badge: {
    position: 'absolute',
    right: 6,
    top: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: tokenColors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
