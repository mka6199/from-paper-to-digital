import React, { useEffect, useState } from 'react';
import { View, Alert, Text, StyleSheet } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import { spacing, typography } from '../../theme/tokens';
import { getWorker, Worker } from '../../services/workers';
import { useCurrency } from '../../context/CurrencyProvider';
import { useTheme } from '../../theme/ThemeProvider';

type RouteParams = { id: string };

export default function PaySalaryScreen({ route, navigation }: any) {
  const { id } = route.params as RouteParams;
  const { colors } = useTheme();
  const { format } = useCurrency();

  const [worker, setWorker] = useState<Worker | null>(null);
  const [amount, setAmount] = useState('');
  const [bonus, setBonus] = useState('');
  const [method, setMethod] = useState<'cash' | 'bank'>('bank');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getWorker(id)
      .then((w) => setWorker(w))
      .catch(() => setWorker(null));
  }, [id]);

  const amountNum = Number(amount || 0);
  const bonusNum = Number(bonus || 0);
  const canContinue = amountNum > 0 && !!worker;

  const goToOtp = () => {
    if (!worker) {
      Alert.alert('Error', 'Worker not found.');
      return;
    }
    if (!worker.phone) {
      Alert.alert(
        'Missing phone number',
        'This worker does not have a phone number. Please edit the worker and add one before sending an OTP.'
      );
      return;
    }
    if (!(amountNum > 0)) {
      Alert.alert('Invalid amount', 'Please enter a valid amount to pay.');
      return;
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
  };

  return (
    <Screen>
      <AppHeader
        title="Pay Salary"
        onBack={() => navigation.goBack()}
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
          onChangeText={setAmount}
          keyboardType="number-pad"
        />

        <TextField
          label="Bonus (optional)"
          value={bonus}
          onChangeText={setBonus}
          keyboardType="number-pad"
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
