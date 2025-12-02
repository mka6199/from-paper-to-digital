import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../../components/layout/Screen';
import Card from '../../components/primitives/Card';
import Button from '../../components/primitives/Button';
import { colors as tokenColors, spacing, typography } from '../../theme/tokens';
import { AuthContext } from '../../context/AuthProvider';
import { subscribeMyWorkers, Worker } from '../../services/workers';
import { Payment, monthRange, subscribeMyPaymentsInRange } from '../../services/payments';
import { subscribeMyUnreadCount } from '../../services/notifications';
import { useTheme } from '../../theme/ThemeProvider';
import { useCurrency } from '../../context/CurrencyProvider';
import NotificationDaemon from '../../components/system/NotificationDaemon';
import type { DueSummary } from '../../services/alerts';
import { logger } from '../../utils/logger';
import type { DashboardScreenProps } from '../../types/navigation';
import { getContentBottomPadding } from '../../utils/layout';
import { computeCashFlowProjection, type CashFlowProjection } from '../../services/cashflow';

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

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
  const { colors, mode } = useTheme();
  const { profile } = React.useContext(AuthContext);
  const { format } = useCurrency();
  const money = React.useMemo(() => moneyFactory((n) => format(n)), [format]);

  const displayName =
    (profile?.firstName
      ? `${profile.firstName}${profile?.lastName ? ' ' + profile.lastName : ''}`
      : '') || profile?.email || 'User';

  const [workers, setWorkers] = React.useState<Worker[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [gotWorkers, setGotWorkers] = React.useState(false);
  const [gotPayments, setGotPayments] = React.useState(false);
  const [unread, setUnread] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);

  // Live salary-alert summary fed by NotificationDaemon
  const [dueSummary, setDueSummary] = React.useState<DueSummary>({
    dueSoonCount: 0,
    dueSoonAmountAED: 0,
    overdueCount: 0,
    overdueAmountAED: 0,
  });

  // Cash flow projection
  const cashFlow = React.useMemo<CashFlowProjection>(() => {
    return computeCashFlowProjection(workers, payments);
  }, [workers, payments]);

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
      logger.warn('Dashboard subscribeMyWorkers failed:', e);
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
      logger.warn('Dashboard subscribeMyPaymentsInRange failed:', e);
      setGotPayments(true);
    }
    return () => { if (unsub) unsub(); };
  }, []);

  const totals = React.useMemo<Totals>(() => {
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

    return {
      workers: workers.length,
      dueNow,
      monthlyLiability,
      paidThisMonth,
      hasDueSoon,
      hasOverdue,
    };
  }, [workers, payments]);

  const salaryAED = Number(profile?.salaryMonthlyAED ?? 0);
  const liabilitiesAED = totals.monthlyLiability;
  const remainingAED = salaryAED - liabilitiesAED;

  // Animated values for smooth entrance
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const { width } = Dimensions.get('window');
  const isCompact = width < 380;

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
          <Button
            label="Start Pay Run"
            onPress={() => (navigation as any).navigate('Workers', { screen: 'PayRun' })}
            fullWidth
          />
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
              (navigation as any).navigate('History', {
                screen: 'HistoryHome',
                params: { monthStart: start.toISOString(), monthEnd: end.toISOString() },
              });
            }}
            fullWidth
          />
        </Card>

        <Card style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text style={[styles.statLabel, { color: colors.subtext }]}>Salary Planner</Text>
            <Text style={{ fontSize: 18 }}>📊</Text>
          </View>
          
          <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={[typography.body, { color: colors.text }]}>Next 30 days</Text>
              <Text style={[typography.h2, { color: cashFlow.totalNext30Days > 0 ? '#b45309' : colors.text }]}>
                {money(cashFlow.totalNext30Days)}
              </Text>
            </View>
            
            {cashFlow.overdueTotal > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={[typography.small, { color: tokenColors.danger }]}>Overdue</Text>
                <Text style={[typography.body, { color: tokenColors.danger, fontWeight: '700' }]}>
                  {money(cashFlow.overdueTotal)}
                </Text>
              </View>
            )}
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={[typography.small, { color: colors.subtext }]}>Next 60 days</Text>
              <Text style={[typography.small, { color: colors.subtext }]}>
                {money(cashFlow.totalNext60Days)}
              </Text>
            </View>
          </View>

          {cashFlow.weeklyBreakdown.length > 0 && (
            <>
              <View style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: spacing.sm, gap: 6 }}>
                <Text style={[typography.small, { color: colors.subtext, fontWeight: '700' }]}>
                  Upcoming by week:
                </Text>
                {cashFlow.weeklyBreakdown.slice(0, 4).map((week, idx) => {
                  const weekLabel = `${week.weekStart.getMonth() + 1}/${week.weekStart.getDate()}`;
                  return (
                    <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[typography.small, { color: colors.subtext }]}>
                        Week of {weekLabel} ({week.workerCount} {week.workerCount === 1 ? 'worker' : 'workers'})
                      </Text>
                      <Text style={[typography.small, { color: colors.text, fontWeight: '600' }]}>
                        {money(week.totalAmount)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
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

  const recentPayments = payments.slice(0, 5);

  return (
    <Screen>
      {/* feeds dueSummary */}
      <NotificationDaemon onSummary={setDueSummary} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: getContentBottomPadding() + 20,
        }}
      >
        {/* Animated Hero Section */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Header with Gradient */}
          <LinearGradient
            colors={mode === 'dark' ? ['#15803d', '#14532d'] : ['#166534', '#14532d']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing['2xl'],
              paddingBottom: spacing.xl,
              borderBottomLeftRadius: 32,
              borderBottomRightRadius: 32,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
                <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4 }}>
                  Hello, {displayName.split(' ')[0]} 👋
                </Text>
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>
                  Let's manage your payroll today
                </Text>
              </View>

              <Pressable
                onPress={() => navigation.getParent()?.navigate('Notifications')}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 20 }}>🔔</Text>
                {unread > 0 && (
                  <View style={[styles.badge, { top: -2, right: -2 }]}>
                    <Text style={styles.badgeText}>{unread > 99 ? '99' : String(unread)}</Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* Quick Stats Cards in Hero */}
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>Workers</Text>
                <Text style={{ fontSize: 32, fontWeight: '800', color: '#fff' }}>{totals.workers}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: totals.dueNow > 0 ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.15)', borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: totals.dueNow > 0 ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.2)' }}>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>Due Now</Text>
                <Text style={{ fontSize: isCompact ? 20 : 24, fontWeight: '800', color: '#fff' }} numberOfLines={1}>{money(totals.dueNow)}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Salary Alerts Banner */}
          {(dueSummary.overdueCount + dueSummary.dueSoonCount) > 0 && (
            <Pressable
              onPress={() => navigation.getParent()?.navigate('Notifications')}
              style={{
                marginHorizontal: spacing.lg,
                marginTop: -20,
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: spacing.md,
                borderWidth: 2,
                borderColor: tokenColors.warn,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 5,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: mode === 'dark' ? 'rgba(251,191,36,0.15)' : 'rgba(146,64,14,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 20 }}>⚠️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: tokenColors.warn }}>Salary Alerts</Text>
                  <Text style={{ fontSize: 13, color: colors.subtext, marginTop: 2 }}>
                    {dueSummary.overdueCount > 0 && `${dueSummary.overdueCount} overdue`}
                    {dueSummary.overdueCount > 0 && dueSummary.dueSoonCount > 0 && ' · '}
                    {dueSummary.dueSoonCount > 0 && `${dueSummary.dueSoonCount} due soon`}
                  </Text>
                </View>
                <Text style={{ fontSize: 16, color: colors.subtext }}>›</Text>
              </View>
            </Pressable>
          )}

          {/* Main Content */}
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.lg }}>
            
            {/* Cash Flow Insight Card */}
            <Pressable
              style={{
                borderRadius: 20,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <LinearGradient
                colors={mode === 'dark' ? ['#14532d', '#052e16'] : ['#f0fdf4', '#dcfce7']}
                style={{ padding: spacing.lg }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>💰 Cash Flow</Text>
                  <View style={{ backgroundColor: mode === 'dark' ? 'rgba(34,197,94,0.15)' : 'rgba(22,101,52,0.1)', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: mode === 'dark' ? '#22c55e' : '#166534' }}>NEXT 30 DAYS</Text>
                  </View>
                </View>

                <Text style={{ fontSize: 36, fontWeight: '800', color: cashFlow.totalNext30Days > 0 ? (mode === 'dark' ? '#fbbf24' : '#92400e') : tokenColors.success, marginBottom: spacing.xs }}>
                  {money(cashFlow.totalNext30Days)}
                </Text>

                {cashFlow.overdueTotal > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tokenColors.danger }} />
                    <Text style={{ fontSize: 13, color: tokenColors.danger, fontWeight: '600' }}>
                      {money(cashFlow.overdueTotal)} overdue
                    </Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.subtext }} />
                  <Text style={{ fontSize: 13, color: colors.subtext }}>
                    {money(cashFlow.totalNext60Days)} in 60 days
                  </Text>
                </View>

                {cashFlow.weeklyBreakdown.length > 0 && (
                  <View style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderColor: colors.border, gap: 8 }}>
                    {cashFlow.weeklyBreakdown.slice(0, 3).map((week, idx) => {
                      const progress = (week.totalAmount / (cashFlow.totalNext30Days || 1)) * 100;
                      return (
                        <View key={idx} style={{ gap: 4 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 12, color: colors.subtext }}>
                              {week.weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ({week.workerCount})
                            </Text>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{money(week.totalAmount)}</Text>
                          </View>
                          <View style={{ height: 6, backgroundColor: mode === 'dark' ? 'rgba(22,101,52,0.3)' : 'rgba(220,252,231,0.8)', borderRadius: 3, overflow: 'hidden' }}>
                            <View style={{ height: '100%', width: `${Math.min(progress, 100)}%`, backgroundColor: colors.brand, borderRadius: 3 }} />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </LinearGradient>
            </Pressable>

            {/* Action Cards Grid */}
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Pressable
                onPress={() => (navigation as any).navigate('Workers', { screen: 'PayRun' })}
                style={{
                  flex: 1,
                  backgroundColor: colors.brand,
                  borderRadius: 16,
                  padding: spacing.lg,
                  minHeight: 120,
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ fontSize: 28 }}>💸</Text>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 }}>Pay Run</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>Batch payment</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => (navigation as any).navigate('Workers', { screen: 'WorkersList' })}
                style={{
                  flex: 1,
                  backgroundColor: colors.surface,
                  borderRadius: 16,
                  padding: spacing.lg,
                  minHeight: 120,
                  justifyContent: 'space-between',
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 28 }}>👥</Text>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 }}>Workers</Text>
                  <Text style={{ fontSize: 12, color: colors.subtext }}>Manage team</Text>
                </View>
              </Pressable>
            </View>

            {/* Financial Overview */}
            <View style={{ gap: spacing.md }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Financial Overview</Text>
              
              <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: colors.subtext }}>Monthly Liabilities</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: totals.hasOverdue ? tokenColors.danger : colors.text }}>
                    {money(liabilitiesAED)}
                  </Text>
                </View>

                <View style={{ height: 1, backgroundColor: colors.border }} />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: colors.subtext }}>Paid This Month</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: tokenColors.success }}>
                    {money(totals.paidThisMonth)}
                  </Text>
                </View>

                <View style={{ height: 1, backgroundColor: colors.border }} />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: colors.subtext }}>Remaining Budget</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: remainingAED < 0 ? tokenColors.danger : tokenColors.success }}>
                    {salaryAED > 0 ? money(remainingAED) : '—'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Recent Payments */}
            {recentPayments.length > 0 && (
              <View style={{ gap: spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Recent Payments</Text>
                  <Pressable
                    onPress={() => {
                      const { start, end } = monthRange();
                      (navigation as any).navigate('History', {
                        screen: 'HistoryHome',
                        params: { monthStart: start.toISOString(), monthEnd: end.toISOString() },
                      });
                    }}
                  >
                    <Text style={{ fontSize: 13, color: tokenColors.primary, fontWeight: '600' }}>View All →</Text>
                  </Pressable>
                </View>

                <View style={{ gap: spacing.sm }}>
                  {recentPayments.map((item) => {
                    const when = item.paidAt?.toDate?.();
                    const dateStr = when ? when.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
                    const total = Number(item.amount ?? 0) + Number(item.bonus ?? 0);

                    return (
                      <View
                        key={item.id}
                        style={{
                          backgroundColor: colors.surface,
                          borderRadius: 12,
                          padding: spacing.md,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 }}>
                            {item.workerName || item.workerId}
                          </Text>
                          <Text style={{ fontSize: 12, color: colors.subtext }}>
                            {dateStr} · {item.method || 'Cash'}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: tokenColors.success }}>
                          {money(total)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Quick Actions */}
            <View style={{ gap: spacing.sm }}>
              <Button
                label="Edit Monthly Salary"
                variant="outline"
                onPress={() => navigation.navigate('Settings')}
                fullWidth
              />
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Temporarily keeping old styles for unused Header component code
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
