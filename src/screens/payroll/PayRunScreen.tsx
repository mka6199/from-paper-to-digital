// src/screens/payroll/PayRunScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import Card from '../../components/primitives/Card';
import Button from '../../components/primitives/Button';
import { spacing, typography, colors as tokenColors } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { useCurrency } from '../../context/CurrencyProvider';
import { AuthContext } from '../../context/AuthProvider';
import { showAlert } from '../../utils/alert';
import { subscribeMyWorkers, Worker } from '../../services/workers';
import { Payment, monthRange, subscribeMyPaymentsInRange } from '../../services/payments';
import {
  computeDueWorkersForPeriod,
  createPayRun,
  WorkerDueItem,
} from '../../services/payruns';
import { resolveWorkerSalaryNotifications } from '../../services/notifications';

export default function PayRunScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const { profile } = React.useContext(AuthContext);

  const [workers, setWorkers] = React.useState<Worker[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  // Period - default to current month
  const [period] = React.useState(() => monthRange());

  // Due workers with outstanding amounts
  const [dueWorkers, setDueWorkers] = React.useState<WorkerDueItem[]>([]);

  // Selected worker IDs
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  // Subscribe to workers and payments
  React.useEffect(() => {
    let unsub1: (() => void) | null = null;
    let unsub2: (() => void) | null = null;

    try {
      unsub1 = subscribeMyWorkers((rows) => {
        setWorkers(rows);
        setLoading(false);
      });
    } catch (e) {
      console.warn('subscribeMyWorkers failed:', e);
      setLoading(false);
    }

    try {
      unsub2 = subscribeMyPaymentsInRange(period, (rows) => {
        setPayments(rows);
      });
    } catch (e) {
      console.warn('subscribeMyPaymentsInRange failed:', e);
    }

    return () => {
      unsub1?.();
      unsub2?.();
    };
  }, [period]);

  // Compute due workers whenever workers or payments change
  React.useEffect(() => {
    if (workers.length === 0) {
      setDueWorkers([]);
      return;
    }
    const items = computeDueWorkersForPeriod(
      workers,
      payments,
      period.start,
      period.end
    );
    setDueWorkers(items);

    // Auto-select all overdue workers by default
    const autoSelect = new Set<string>();
    items.forEach((item) => {
      if (item.isOverdue) {
        autoSelect.add(item.worker.id!);
      }
    });
    setSelected(autoSelect);
  }, [workers, payments, period]);

  const toggleWorker = (workerId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(workerId)) {
        next.delete(workerId);
      } else {
        next.add(workerId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === dueWorkers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(dueWorkers.map((item) => item.worker.id!)));
    }
  };

  const selectedItems = dueWorkers.filter((item) =>
    selected.has(item.worker.id!)
  );
  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + item.outstanding,
    0
  );

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      showAlert('No workers selected', 'Please select at least one worker to pay.');
      return;
    }

    // Check if profile has a phone number
    const adminPhone = profile?.phone;
    if (!adminPhone) {
      showAlert(
        'Missing phone number',
        'Please add your phone number in Settings to authorize pay runs with OTP.'
      );
      return;
    }

    // Navigate to OTP confirmation with pay run data
    navigation.navigate('OTPConfirm', {
      isPayRun: true,
      adminPhone,
      selectedWorkerIds: selectedItems.map((item) => item.worker.id!),
      selectedWorkerData: selectedItems.map((item) => ({
        workerId: item.worker.id!,
        workerName: item.worker.name,
        salary: item.salary,
        outstanding: item.outstanding,
      })),
      periodStart: period.start.toISOString(),
      periodEnd: period.end.toISOString(),
      totalAmount,
      workerCount: selectedItems.length,
      method: 'cash',
      note: `Pay run for ${period.start.toLocaleDateString()}`,
    });
  };

  const s = React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: 100,
        },
        header: {
          marginBottom: spacing.lg,
        },
        title: {
          ...typography.h1,
          color: colors.text,
          marginBottom: spacing.sm,
        },
        subtitle: {
          ...typography.small,
          color: colors.subtext,
        },
        summaryCard: {
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 16,
          backgroundColor: colors.surface,
          marginBottom: spacing.lg,
          gap: spacing.md,
        },
        summaryRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        summaryLabel: {
          ...typography.body,
          color: colors.subtext,
        },
        summaryValue: {
          ...typography.h2,
          color: colors.text,
        },
        workerCard: {
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 16,
          backgroundColor: colors.surface,
          marginBottom: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        },
        checkbox: {
          width: 24,
          height: 24,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        },
        checkboxChecked: {
          backgroundColor: colors.brand,
          borderColor: colors.brand,
        },
        checkmark: {
          color: '#fff',
          fontWeight: '700',
          fontSize: 16,
        },
        workerInfo: {
          flex: 1,
          gap: 4,
        },
        workerName: {
          ...typography.body,
          fontWeight: '700',
          color: colors.text,
        },
        workerMeta: {
          ...typography.small,
          color: colors.subtext,
        },
        workerAmount: {
          ...typography.h2,
          fontSize: 16,
          color: colors.text,
        },
        overdueBadge: {
          backgroundColor: 'rgba(185,28,28,0.12)',
          paddingHorizontal: spacing.sm,
          paddingVertical: 4,
          borderRadius: 999,
        },
        overdueBadgeText: {
          fontSize: 11,
          fontWeight: '700',
          color: tokenColors.danger,
        },
        emptyText: {
          ...typography.body,
          color: colors.subtext,
          textAlign: 'center',
          marginTop: spacing.xl,
        },
      }),
    [colors]
  );

  if (loading) {
    return (
      <Screen>
        <AppHeader
          title="Pay Run"
          onBack={() => navigation.goBack()}
          transparent
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader
        title="Pay Run"
        onBack={() => navigation.goBack()}
        transparent
      />

      <ScrollView
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <Text style={s.title}>Monthly Pay Run</Text>
          <Text style={s.subtitle}>
            Period: {period.start.toLocaleDateString()} –{' '}
            {period.end.toLocaleDateString()}
          </Text>
        </View>

        <Card style={s.summaryCard}>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Workers due</Text>
            <Text style={s.summaryValue}>{dueWorkers.length}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Selected</Text>
            <Text style={s.summaryValue}>{selected.size}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Total amount</Text>
            <Text style={[s.summaryValue, { color: colors.brand }]}>
              {format(totalAmount)}
            </Text>
          </View>

          <Button
            label={
              selected.size === dueWorkers.length
                ? 'Deselect all'
                : 'Select all'
            }
            variant="outline"
            onPress={toggleAll}
            fullWidth
          />
        </Card>

        {dueWorkers.length === 0 ? (
          <Text style={s.emptyText}>
            No workers with outstanding salaries for this period.
          </Text>
        ) : (
          dueWorkers.map((item) => {
            const isChecked = selected.has(item.worker.id!);
            return (
              <Pressable
                key={item.worker.id}
                onPress={() => toggleWorker(item.worker.id!)}
                style={s.workerCard}
              >
                <View
                  style={[s.checkbox, isChecked && s.checkboxChecked]}
                >
                  {isChecked && <Text style={s.checkmark}>✓</Text>}
                </View>

                <View style={s.workerInfo}>
                  <Text style={s.workerName}>{item.worker.name}</Text>
                  <Text style={s.workerMeta}>
                    Salary: {format(item.salary)} • Paid: {format(item.paidSoFar)}
                  </Text>
                  {item.isOverdue && (
                    <View style={s.overdueBadge}>
                      <Text style={s.overdueBadgeText}>OVERDUE</Text>
                    </View>
                  )}
                </View>

                <Text style={s.workerAmount}>{format(item.outstanding)}</Text>
              </Pressable>
            );
          })
        )}

        {dueWorkers.length > 0 && (
          <View style={{ marginTop: spacing.lg }}>
            <Button
              label={submitting ? 'Processing...' : 'Complete Pay Run'}
              onPress={handleSubmit}
              disabled={submitting || selected.size === 0}
              fullWidth
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
