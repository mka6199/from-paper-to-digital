import React, { useState } from 'react';
import { Alert } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import { addPayment } from '../../services/payments';

export default function OTPConfirmScreen({ route, navigation }: any) {
  const { workerId, workerName, amount, bonus, method, month } = route.params || {};
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);

  async function onConfirm() {
    try {
      if (!otp || String(otp).length < 4) { Alert.alert('Enter the 4-digit OTP'); return; }
      setBusy(true);

      const payload: any = {
        workerId,
        workerName,                         // <-- denormalized
        amount: Number(amount || 0),
        month: month || new Date().toISOString().slice(0, 7),
        method: method === 'cash' ? 'cash' : 'bank',
      };
      const b = Number(bonus);
      if (!Number.isNaN(b) && b > 0) payload.bonus = b;

      await addPayment(payload);

      navigation.replace('PaymentConfirmation', {
        workerId,
        workerName,
        amount: payload.amount,
        method: payload.method,
      });
    } catch (e: any) {
      console.error(e);
      Alert.alert('Payment failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll padded>
      <AppHeader title="Enter OTP" onBack={() => navigation.goBack()} />
      <TextField label="One-time code" value={otp} onChangeText={setOtp} keyboardType="number-pad" />
      <Button label={busy ? 'Processing…' : 'Confirm Payment'} onPress={onConfirm} disabled={busy} fullWidth />
    </Screen>
  );
}
