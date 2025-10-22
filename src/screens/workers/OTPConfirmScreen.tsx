import React, { useState } from 'react';
import { Alert } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import { addPayment } from '../../services/payments';

export default function OTPConfirmScreen({ route, navigation }: any) {
  const {
    workerId,
    workerName,
    amount,
    bonus,
    method,
    month,
  } = route.params || {};
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);

  function ensureYYYYMM(d: any) {
    if (typeof d === 'string' && /^\d{4}-\d{2}$/.test(d)) return d;
    const now = new Date();
    const y = now.getFullYear();
    const m = `${now.getMonth() + 1}`.padStart(2, '0');
    return `${y}-${m}`;
    }

  async function onConfirm() {
    try {
      if (!otp || String(otp).length < 4) {
        Alert.alert('Enter the 4-digit OTP');
        return;
      }
      if (!workerId) {
        Alert.alert('Missing worker id');
        return;
      }

      setBusy(true);
      const id = await addPayment({
        workerId: String(workerId),
        workerName: workerName ?? '',
        amount: Number(amount || 0),
        bonus: Number(bonus || 0),
        method: method || 'bank',
        month: ensureYYYYMM(month),
      });


      navigation.replace('PaymentConfirmation', {
        paymentId: id,
        workerId,
        workerName,
        amount,
        bonus,
        method,
        month: ensureYYYYMM(month),
      });
    } catch (e: any) {
      Alert.alert('Payment failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll padded>
      <AppHeader title="Enter OTP" onBack={() => navigation.goBack()} />
      <TextField
        label="One-time code"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
      />
      <Button
        label={busy ? 'Processing…' : 'Confirm Payment'}
        onPress={onConfirm}
        disabled={busy}
        fullWidth
      />
    </Screen>
  );
}
