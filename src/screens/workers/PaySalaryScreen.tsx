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

export default function PaySalaryScreen({ route, navigation }: any) {
  const { id } = route.params as { id: string };
  const { colors } = useTheme();
  const { format } = useCurrency();

  const [w, setW] = useState<Worker | null>(null);
  const [amount, setAmount] = useState('');
  const [bonus, setBonus] = useState('');
  const [method, setMethod] = useState<'cash' | 'bank'>('bank');

  useEffect(() => {
    (async () => {
      const data = await getWorker(id);
      setW(data);
    })();
  }, [id]);

  const monthly = Number(w?.monthlySalaryAED ?? w?.baseSalary ?? 0) || 0;
  const formattedMonthly = format(monthly);

  const numericAmount = Number(amount || 0);
  const numericBonus = Number(bonus || 0);

  function handlePay() {
    if (!numericAmount || numericAmount <= 0) {
      return Alert.alert('Enter a valid amount');
    }

    navigation.navigate('OTPConfirm', {
      workerId: id,
      workerName: w?.name ?? '',
      amount: numericAmount,
      bonus: numericBonus,
      method,
      month: new Date().toISOString().slice(0, 7),
    });
  }

  return (
    <Screen>
      <AppHeader title="Pay Salary" onBack={() => navigation.goBack()} />

      <View style={{ padding: spacing.lg, gap: spacing.lg }}>
        <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[typography.h2, { color: colors.text }]}>{w?.name || '—'}</Text>
          {w?.role ? (
            <Text style={[typography.small, { color: colors.subtext }]}>{w.role}</Text>
          ) : null}
          <Text style={[typography.small, { color: colors.subtext, marginTop: spacing.xs }]}>
            Monthly Salary: {formattedMonthly}
          </Text>
        </Card>

        <TextField
          label="Amount to Pay"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
        <TextField
          label="Bonus (optional)"
          keyboardType="numeric"
          value={bonus}
          onChangeText={setBonus}
        />

        <View style={styles.row}>
          <Button
            label="Cash"
            size="sm"
            variant={method === 'cash' ? 'solid' : 'outline'}
            onPress={() => setMethod('cash')}
            fullWidth
          />
          <Button
            label="Bank Transfer"
            size="sm"
            variant={method === 'bank' ? 'solid' : 'outline'}
            onPress={() => setMethod('bank')}
            fullWidth
          />
        </View>

        <Button
          label={`Pay ${format(numericAmount)}`}
          onPress={handlePay}
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
