import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import { spacing, typography } from '../../theme/tokens';
import { getWorker, Worker } from '../../services/workers';
import { useCurrency } from '../../context/CurrencyProvider';
import { useTheme } from '../../theme/ThemeProvider';
import { showAlert } from '../../utils/alert';

type RouteParams = { workerId?: string; id?: string };

export default function PaySalaryScreen({ route, navigation }: any) {
  const params = (route.params as RouteParams) || {};
  const targetId = params.workerId ?? params.id;
  const { colors } = useTheme();
  const { format } = useCurrency();

  const [worker, setWorker] = useState<Worker | null>(null);
  const [amount, setAmount] = useState('');
  const [bonus, setBonus] = useState('');
  const [method, setMethod] = useState<'cash' | 'bank'>('bank');
  const [busy, setBusy] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!targetId) {
      setWorker(null);
      return;
    }
    mountedRef.current = true;
    getWorker(targetId)
      .then((w) => {
        if (mountedRef.current) setWorker(w);
      })
      .catch(() => {
        if (mountedRef.current) setWorker(null);
      });
    return () => {
      mountedRef.current = false;
    };
  }, [targetId]);

  const sanitizeDecimal = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const [head, ...rest] = cleaned.split('.');
    return head + (rest.length ? '.' + rest.join('').replace(/\./g, '') : '');
  };

  const amountNum = parseFloat(amount || '0');
  const bonusNum = parseFloat(bonus || '0');
  const canContinue = amountNum > 0 && !!worker;

  const goToOtp = () => {
    if (busy) return;
    setBusy(true);
    if (!worker) {
      showAlert('Error', 'Worker not found.');
      return setBusy(false);
    }
    if (!worker.phone) {
      showAlert(
        'Missing phone number',
        'This worker does not have a phone number. Please edit the worker and add one before sending an OTP.'
      );
      return setBusy(false);
    }
    if (!(amountNum > 0)) {
      showAlert('Invalid amount', 'Please enter a valid amount to pay.');
      return setBusy(false);
    }

    navigation.navigate('OTPConfirm', {
      workerId: worker.id,
      workerName: worker.name,
      phone: worker.phone,
      amount: amountNum,
      bonus: bonusNum || 0,
      method,
      month: new Date().toISOString().slice(0, 7),
    });

    setBusy(false);
  };

  return (
    <Screen>
      <AppHeader
        title="Pay Salary"
        onBack={() => navigation.goBack()}
        transparent
        noBorder
      />

      <View style={{ padding: spacing.lg, gap: spacing.lg }}>
        {worker && (
          <Card>
            <Text style={[typography.h2, { color: colors.text }]}>
              {worker.name}
            </Text>
            <Text style={{ color: colors.subtext, marginTop: spacing.xs }}>
              {worker.role || 'Worker'}
            </Text>
            <Text style={{ marginTop: spacing.sm, color: colors.subtext }}>
              Monthly salary{' '}
              {format(
                Number(worker.monthlySalaryAED ?? worker.baseSalary ?? 0)
              )}
            </Text>
            {worker.phone && (
              <Text style={{ marginTop: spacing.sm, color: colors.subtext }}>
                Phone: {worker.phone}
              </Text>
            )}
          </Card>
        )}

        {!worker && (
          <Text style={{ color: colors.subtext }}>Loading worker…</Text>
        )}

        <TextField
          label="Amount to pay (AED)"
          value={amount}
          onChangeText={(val) => setAmount(sanitizeDecimal(val))}
          keyboardType="decimal-pad"
        />

        <TextField
          label="Bonus (optional)"
          value={bonus}
          onChangeText={(val) => setBonus(sanitizeDecimal(val))}
          keyboardType="decimal-pad"
        />

        {/* Bank / Cash toggle with highlight */}
        <View style={styles.row}>
          <View style={styles.half}>
            <Button
              label="Bank"
              variant={method === 'bank' ? 'solid' : 'outline'}
              onPress={() => setMethod('bank')}
              fullWidth
            />
          </View>
          <View style={styles.half}>
            <Button
              label="Cash"
              variant={method === 'cash' ? 'solid' : 'outline'}
              onPress={() => setMethod('cash')}
              fullWidth
            />
          </View>
        </View>

        <Button
          label={busy ? 'Please wait…' : 'Continue to OTP'}
          onPress={goToOtp}
          disabled={!canContinue || busy}
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
    minWidth: 0,
  },
});
