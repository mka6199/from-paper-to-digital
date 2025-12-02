// src/screens/workers/WorkerProfileScreen.tsx
import React from 'react';
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';

import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import { showAlert } from '../../utils/alert';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import { spacing, typography } from '../../theme/tokens';
import { getWorker, Worker } from '../../services/workers';
import { Payment, subscribeMyPaymentsInRange, rangeThisYear } from '../../services/payments';
import { useTheme } from '../../theme/ThemeProvider';
import { useCurrency } from '../../context/CurrencyProvider';

type WorkerLike = {
  id: string;
  name?: string;
  role?: string;
  monthlySalaryAED?: number;
  baseSalary?: number;
  salary?: number;
  avatarUrl?: string | null;
  isFormer?: boolean;
  status?: 'active' | 'former' | string;
};

const normalize = (raw: any): WorkerLike => ({
  id: raw?.id,
  name: raw?.name ?? raw?.fullName ?? raw?.displayName ?? '',
  role: raw?.role ?? raw?.job ?? '',
  monthlySalaryAED: Number(
    raw?.monthlySalaryAED ?? raw?.baseSalary ?? raw?.salary ?? 0
  ),
  avatarUrl: raw?.avatarUrl ?? null,
  isFormer: raw?.isFormer ?? false,
  status: raw?.status,
});

const getMonthlySalary = (w?: WorkerLike | null) =>
  Number((w && (w.monthlySalaryAED ?? w.baseSalary ?? w.salary)) ?? 0);

const isFormerWorker = (w?: WorkerLike | null) =>
  !!(
    w &&
    (w.isFormer ||
      (w.status && String(w.status).toLowerCase() === 'former'))
  );

const initials = (name?: string) =>
  (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

const AVATAR = 96;

export default function WorkerProfileScreen({ navigation }: any) {
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { format } = useCurrency();

  const { id, worker: initialWorker } = (route?.params ?? {}) as {
    id: string;
    worker?: WorkerLike;
  };

  const [w, setW] = React.useState<WorkerLike | null>(
    initialWorker ? normalize(initialWorker) : null
  );
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [fullWorker, setFullWorker] = React.useState<Worker | null>(null);

  const fetchWorker = React.useCallback(() => {
    let cancelled = false;
    setLoadError(null);
    (async () => {
      try {
        const fresh = await getWorker(id);
        if (!cancelled && fresh) {
          setW(normalize({ id, ...(fresh as any) }));
          setFullWorker(fresh);
        }
      } catch (e) {
        if (!cancelled) setLoadError('Unable to load worker details.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useFocusEffect(
    React.useCallback(() => {
      const cleanup = fetchWorker();
      return cleanup;
    }, [fetchWorker])
  );

  // Subscribe to this year's payments for stats
  React.useEffect(() => {
    if (!id) return;
    const { start, end } = rangeThisYear();
    let unsub: (() => void) | null = null;
    try {
      unsub = subscribeMyPaymentsInRange({ start, end }, (allPayments) => {
        // Filter to only this worker's payments
        const workerPayments = allPayments.filter(
          (p) =>
            String(p.workerId) === String(id) ||
            (p.workerName && w?.name && String(p.workerName).toLowerCase() === String(w.name).toLowerCase())
        );
        setPayments(workerPayments);
      });
    } catch (e) {
      console.warn('Failed to subscribe to payments:', e);
    }
    return () => {
      unsub?.();
    };
  }, [id, w?.name]);

  React.useEffect(() => {
    const p: any = route?.params;
    if (p?.worker) setW(normalize(p.worker));
  }, [route?.params]);

  const monthly = getMonthlySalary(w);
  const salaryLabelFallback =
    monthly > 0 ? `${monthly.toLocaleString()} AED` : '— AED';
  const salaryLabelConverted = format(monthly) || salaryLabelFallback;

  const former = isFormerWorker(w);

  // Compute payment summary
  const paymentSummary = React.useMemo(() => {
    if (payments.length === 0) {
      return {
        lastPaymentDate: null,
        lastPaymentAmount: 0,
        lastPaymentId: null,
        totalPaidYTD: 0,
        paymentCount: 0,
        nextDueDate: fullWorker?.nextDueAt?.toDate?.() ?? null,
      };
    }

    // Sort by date descending
    const sorted = [...payments].sort((a, b) => {
      const dateA = a.paidAt?.toDate?.()?.getTime() ?? 0;
      const dateB = b.paidAt?.toDate?.()?.getTime() ?? 0;
      return dateB - dateA;
    });

    const lastPayment = sorted[0];
    const lastPaymentDate = lastPayment?.paidAt?.toDate?.() ?? null;
    const lastPaymentAmount = Number(lastPayment?.amount ?? 0) + Number(lastPayment?.bonus ?? 0);
    const lastPaymentId = lastPayment?.id ?? null;
    
    const totalPaidYTD = payments.reduce(
      (sum, p) => sum + Number(p.amount ?? 0) + Number(p.bonus ?? 0),
      0
    );

    return {
      lastPaymentDate,
      lastPaymentAmount,
      lastPaymentId,
      totalPaidYTD,
      paymentCount: payments.length,
      nextDueDate: fullWorker?.nextDueAt?.toDate?.() ?? null,
    };
  }, [payments, fullWorker]);

  function onPay() {
    if (former) {
      showAlert(
        'Former worker',
        'This worker is marked as Former. Reactivate them to record new payments.'
      );
      return;
    }
    navigation.navigate('PaySalary', { workerId: id });
  }

  function onHistory() {
    navigation.navigate('PaymentHistory', {
      workerId: id,
      workerName: w?.name ?? '',
    });
  }

  function onEdit() {
    navigation.navigate('EditWorker', { workerId: id });
  }

  return (
    <Screen>
      <AppHeader title="Worker Profile" onBack={() => navigation.goBack()} transparent noBorder />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing['2xl'],
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {loadError && !w ? (
          <Card
            style={{
              padding: spacing.lg,
              borderWidth: 1,
              borderColor: colors.border,
              marginBottom: spacing.lg,
            }}
          >
            <Text style={{ color: colors.text, marginBottom: spacing.sm }}>
              {loadError}
            </Text>
            <Button label="Retry" onPress={() => fetchWorker()} fullWidth />
          </Card>
        ) : null}

        <View style={styles.content}>
          <Card
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={{ alignItems: 'center', gap: spacing.lg }}>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: colors.brand },
                ]}
              >
                <Text style={styles.avatarText}>
                  {initials(w?.name) || '—'}
                </Text>
              </View>

              <View style={{ alignItems: 'center', gap: spacing.sm }}>
                <Text
                  style={[
                    typography.h2,
                    { color: colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {w?.name || '—'}
                </Text>

                {!!w?.role && (
                  <Text
                    style={[
                      typography.small,
                      { color: colors.subtext },
                    ]}
                    numberOfLines={1}
                  >
                    {w.role}
                  </Text>
                )}
              </View>

              <View
                style={[
                  styles.badge,
                  former
                    ? {
                        backgroundColor: '#EAB30822',
                        borderColor: '#EAB308',
                      }
                    : {
                        backgroundColor: '#22C55E22',
                        borderColor: '#22C55E',
                      },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: former ? '#EAB308' : '#22C55E' },
                  ]}
                >
                  {former ? 'Former' : 'Active'}
                </Text>
              </View>

              <Text
                style={[
                  typography.small,
                  {
                    color: colors.subtext,
                    marginTop: spacing.sm,
                  },
                ]}
              >
                Monthly Salary: {salaryLabelConverted}
              </Text>
            </View>
          </Card>

          {/* Payment Summary Card */}
          <Card
            style={[
              styles.summaryCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.md }]}>
              Payment Summary
            </Text>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.subtext }]}>
                  Last Payment
                </Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {paymentSummary.lastPaymentDate
                    ? paymentSummary.lastPaymentDate.toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : 'Never'}
                </Text>
                {paymentSummary.lastPaymentAmount > 0 && (
                  <Text style={[typography.small, { color: colors.subtext }]}>
                    {format(paymentSummary.lastPaymentAmount)}
                  </Text>
                )}
              </View>

              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.subtext }]}>
                  Next Due
                </Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {paymentSummary.nextDueDate
                    ? paymentSummary.nextDueDate.toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : '—'}
                </Text>
              </View>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.subtext }]}>
                  Total Paid (YTD)
                </Text>
                <Text style={[styles.summaryValue, { color: colors.brand }]}>
                  {format(paymentSummary.totalPaidYTD)}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.subtext }]}>
                  Payments
                </Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {paymentSummary.paymentCount}
                </Text>
              </View>
            </View>

            {paymentSummary.lastPaymentId && (
              <View style={{ marginTop: spacing.md }}>
                <Button
                  label="View Latest Payslip"
                  variant="outline"
                  size="sm"
                  onPress={() => {
                    navigation.navigate('Payslip', { paymentId: paymentSummary.lastPaymentId });
                  }}
                  fullWidth
                />
              </View>
            )}
          </Card>

          <View style={styles.buttons}>
            <Button
              label="Pay Salary"
              onPress={onPay}
              fullWidth
              disabled={former}
            />
            <Button
              label="View History"
              variant="soft"
              onPress={onHistory}
              fullWidth
            />
            <Button
              label="Edit Info"
              variant="outline"
              onPress={onEdit}
              fullWidth
            />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  card: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: spacing.xl,
  },
  buttons: {
    gap: spacing.lg,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 28,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  summaryCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: spacing.xl,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  summaryItem: {
    flex: 1,
    gap: 4,
  },
  summaryLabel: {
    ...typography.small,
    fontSize: 12,
  },
  summaryValue: {
    ...typography.h2,
    fontSize: 18,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: spacing.md,
  },
});
