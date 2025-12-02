import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import Screen from '../../components/layout/Screen';
import Card from '../../components/primitives/Card';
import Button from '../../components/primitives/Button';
import { colors as tokenColors, spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { useCurrency } from '../../context/CurrencyProvider';
import { getPayment, type Payment } from '../../services/payments';
import { getWorker, type Worker } from '../../services/workers';
import { logger } from '../../utils/logger';

export default function PayslipScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const { paymentId } = route.params;

  const [payment, setPayment] = React.useState<Payment | null>(null);
  const [worker, setWorker] = React.useState<Worker | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const p = await getPayment(paymentId);
        setPayment(p);

        if (p?.workerId) {
          try {
            const w = await getWorker(p.workerId);
            setWorker(w);
          } catch (e) {
            logger.warn('PayslipScreen: failed to load worker', e);
          }
        }
      } catch (e) {
        logger.error('PayslipScreen: failed to load payment', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [paymentId]);

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={tokenColors.primary} />
        </View>
      </Screen>
    );
  }

  if (!payment) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.md }]}>
            Payslip not found
          </Text>
          <Button label="Go back" onPress={() => navigation.goBack()} />
        </View>
      </Screen>
    );
  }

  const paidDate = payment.paidAt?.toDate?.();
  const dateStr = paidDate
    ? `${paidDate.toLocaleDateString('en-US', { weekday: 'short' })}, ${paidDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })}`
    : '—';

  const amount = Number(payment.amount ?? 0);
  const bonus = Number(payment.bonus ?? 0);
  const total = amount + bonus;

  const workerName = payment.workerName || worker?.name || payment.workerId || 'Unknown Worker';
  const workerRole = worker?.role || '—';
  const workerPhone = worker?.phone || '—';

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <Text style={{ fontSize: 48, marginBottom: spacing.sm }}>📄</Text>
          <Text style={[typography.h1, { color: colors.text, marginBottom: 4 }]}>
            Payment Statement
          </Text>
          <Text style={[typography.small, { color: colors.subtext }]}>
            Payment ID: {paymentId.substring(0, 8)}...
          </Text>
        </View>

        {/* Worker Info */}
        <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.md }]}>
            Worker Information
          </Text>
          <View style={styles.infoRow}>
            <Text style={[typography.small, { color: colors.subtext }]}>Name</Text>
            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
              {workerName}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[typography.small, { color: colors.subtext }]}>Role</Text>
            <Text style={[typography.body, { color: colors.text }]}>{workerRole}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[typography.small, { color: colors.subtext }]}>Phone</Text>
            <Text style={[typography.body, { color: colors.text }]}>{workerPhone}</Text>
          </View>
        </Card>

        {/* Payment Details */}
        <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.md }]}>
            Payment Details
          </Text>
          <View style={styles.infoRow}>
            <Text style={[typography.small, { color: colors.subtext }]}>Date</Text>
            <Text style={[typography.body, { color: colors.text }]}>{dateStr}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[typography.small, { color: colors.subtext }]}>Payment Method</Text>
            <Text style={[typography.body, { color: colors.text, textTransform: 'capitalize' }]}>
              {payment.method || 'Cash'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[typography.small, { color: colors.subtext }]}>Period</Text>
            <Text style={[typography.body, { color: colors.text }]}>
              {payment.month || '—'}
            </Text>
          </View>
          {payment.note && (
            <View style={[styles.infoRow, { flexDirection: 'column', alignItems: 'flex-start', gap: 4 }]}>
              <Text style={[typography.small, { color: colors.subtext }]}>Note</Text>
              <Text style={[typography.body, { color: colors.text }]}>{payment.note}</Text>
            </View>
          )}
        </Card>

        {/* Payment Breakdown */}
        <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.md }]}>
            Payment Breakdown
          </Text>
          <View style={styles.breakdownRow}>
            <Text style={[typography.body, { color: colors.text }]}>Base Salary</Text>
            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
              {format(amount)}
            </Text>
          </View>
          {bonus > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={[typography.body, { color: colors.text }]}>Bonus</Text>
              <Text style={[typography.body, { color: tokenColors.success, fontWeight: '600' }]}>
                +{format(bonus)}
              </Text>
            </View>
          )}
          <View
            style={{
              borderTopWidth: 2,
              borderColor: colors.border,
              marginTop: spacing.sm,
              paddingTop: spacing.sm,
            }}
          >
            <View style={styles.breakdownRow}>
              <Text style={[typography.h2, { color: colors.text }]}>Total Paid</Text>
              <Text style={[typography.h1, { color: tokenColors.success }]}>
                {format(total)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Actions */}
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          {worker && (
            <Button
              label="View Worker Profile"
              variant="soft"
              onPress={() => {
                navigation.navigate('WorkerProfile', { workerId: worker.id! });
              }}
            />
          )}
          <Button label="Close" variant="outline" onPress={() => navigation.goBack()} />
        </View>

        {/* Footer */}
        <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <Text style={[typography.small, { color: colors.subtext, textAlign: 'center' }]}>
            This is an official payment record.
          </Text>
          <Text style={[typography.small, { color: colors.subtext, textAlign: 'center' }]}>
            Generated on {new Date().toLocaleDateString()}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
});
