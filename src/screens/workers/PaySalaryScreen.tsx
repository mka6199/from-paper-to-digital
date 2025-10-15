import React, { useEffect, useState } from 'react';
import { View, Alert } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import { spacing } from '../../theme/tokens';
import { getWorker, Worker } from '../../services/workers';

export default function PaySalaryScreen({ route, navigation }: any) {
  const { id } = route.params as { id: string };
  const [w, setW] = useState<Worker | null>(null);
  const [amount, setAmount] = useState('');
  const [bonus, setBonus] = useState('');
  const [method, setMethod] = useState<'cash' | 'bank'>('bank');

  useEffect(() => { (async () => setW(await getWorker(id)))(); }, [id]);

  const numericAmount = Number(amount || 0);
  const numericBonus = Number(bonus || 0);

  return (
    <Screen>
      <AppHeader title="Pay Salary" onBack={() => navigation.goBack()} />
      <View style={{ height: spacing.lg }} />
      <TextField label="Amount (AED)" keyboardType="numeric" value={amount} onChangeText={setAmount} />
      <View style={{ height: spacing.sm }} />
      <TextField label="Bonus (optional)" keyboardType="numeric" value={bonus} onChangeText={setBonus} />
      <View style={{ height: spacing.md }} />

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Button label="Cash" variant={method==='cash' ? 'solid' : 'outline'} tone="green" onPress={() => setMethod('cash')} />
        <Button label="Bank Transfer" variant={method==='bank' ? 'solid' : 'outline'} tone="green" onPress={() => setMethod('bank')} />
      </View>

      <View style={{ height: spacing.lg }} />
      <Button
        label={`Pay ${numericAmount.toLocaleString()} AED`}
        tone="green"
        onPress={() => {
          if (!numericAmount || numericAmount <= 0) { Alert.alert('Enter a valid amount'); return; }
          navigation.navigate('OTPConfirm', {
            workerId: id,
            workerName: w?.name ?? '',
            amount: numericAmount,
            bonus: numericBonus,
            method,
            month: new Date().toISOString().slice(0,7),
          });
        }}
        fullWidth
      />
    </Screen>
  );
}
