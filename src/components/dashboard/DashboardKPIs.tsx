import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../primitives/Card';
import Button from '../primitives/Button';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { useCurrency } from '../../context/CurrencyProvider';
import { subscribeMyWorkers, Worker } from '../../services/workers';
import { Payment, monthRange, subscribeMyPaymentsInRange } from '../../services/payments';
import type { DueSummary } from '../../services/alerts';
import { computeDueSummary } from '../../services/alerts';

type Props = {
  onSummary?: React.Dispatch<React.SetStateAction<DueSummary>>;
  onViewWorkers?: () => void;
  onViewHistory?: (startISO: string, endISO: string) => void;
  onEditSalary?: () => void;
};

export default function DashboardKPIs({ onSummary, onViewWorkers, onViewHistory }: Props) {
  const { colors } = useTheme();
  const { format } = useCurrency();

  const [workers, setWorkers] = React.useState<Worker[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [{ start, end }] = React.useState(() => monthRange());

  React.useEffect(() => {
    let u1: undefined | (() => void);
    let u2: undefined | (() => void);
    try { u1 = subscribeMyWorkers(setWorkers); } catch (e) { console.warn('subscribeMyWorkers:', e); }
    try { u2 = subscribeMyPaymentsInRange({ start, end }, setPayments); } catch (e) { console.warn('subscribeMyPaymentsInRange:', e); }
    return () => { u1 && u1(); u2 && u2(); };
  }, [start, end]);

  const summary = React.useMemo(
    () => computeDueSummary(workers, payments, new Date()),
    [workers, payments]
  );

  React.useEffect(() => { onSummary?.(summary); }, [summary, onSummary]);

  const money = (n: number) => format(n);

  return (
    <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
      <Card style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.subtext }]}>Salary Alerts</Text>
        <Text style={[styles.value, { color: summary.overdueCount > 0 ? '#b91c1c' : colors.text }]}>
          {summary.overdueCount > 0
            ? `${summary.overdueCount} overdue`
            : summary.dueSoonCount > 0
            ? `${summary.dueSoonCount} due soon`
            : 'All clear'}
        </Text>
        {summary.overdueAmountAED > 0 && (
          <Text style={{ color: '#b91c1c' }}>{money(summary.overdueAmountAED)} overdue</Text>
        )}
      </Card>

      <Card style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.subtext }]}>Workers</Text>
        <Text style={[styles.value, { color: colors.text }]}>{workers.length}</Text>
        <Button label="View workers" variant="soft" onPress={onViewWorkers} fullWidth />
      </Card>

      <Card style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.subtext }]}>Due now (overdue)</Text>
        <Text style={[styles.value, { color: summary.overdueAmountAED > 0 ? '#b91c1c' : colors.text }]}>
          {money(summary.overdueAmountAED)}
        </Text>
      </Card>

      <Card style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.subtext }]}>Due soon (this month)</Text>
        <Text style={[styles.value, { color: summary.dueSoonAmountAED > 0 ? '#b45309' : colors.text }]}>
          {money(summary.dueSoonAmountAED)}
        </Text>
      </Card>

      <Card style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.subtext }]}>Paid this month</Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {money(payments.reduce((s, p) => s + Number(p.amount ?? 0) + Number(p.bonus ?? 0), 0))}
        </Text>
        <Button
          label="View history"
          variant="outline"
          onPress={() => onViewHistory?.(start.toISOString(), end.toISOString())}
          fullWidth
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  statCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: 16,
    gap: spacing.sm,
  },
  label: {
    ...typography.small,
  } as any,
  value: {
    ...typography.h1,
    marginBottom: spacing.sm,
  } as any,
});
