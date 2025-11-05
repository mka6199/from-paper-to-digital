import React, { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import { addPayment } from '../../services/payments';

type NavParams = {
  workerId: string;
  workerName?: string;
  amount: number;
  bonus?: number;
  method?: 'cash' | 'bank';
  month?: string; 
};

export default function OTPConfirmScreen({ route, navigation }: any) {
  const { workerId, workerName, amount, bonus, method, month } = (route?.params || {}) as NavParams;

  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);

  const ensureYYYYMM = (d?: string) => {
    if (typeof d === 'string' && /^\d{4}-\d{2}$/.test(d)) return d;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const confirmEnabled = useMemo(() => {
    const nAmt = Number(amount || 0);
    return !!workerId && nAmt > 0 && String(otp).trim().length >= 4 && !busy;
  }, [workerId, amount, otp, busy]);

  async function onConfirm() {
    const code = String(otp).trim();
    if (code.length < 4) {
      Alert.alert('Enter the 4-digit OTP');
      return;
    }
    if (!workerId) {
      Alert.alert('Missing worker id');
      return;
    }
    const nAmt = Number(amount || 0);
    if (!Number.isFinite(nAmt) || nAmt <= 0) {
      Alert.alert('Enter a valid amount');
      return;
    }

    try {
      setBusy(true);

      const id = await addPayment({
        workerId: String(workerId),
        workerName: workerName ?? '',
        amount: nAmt,
        bonus: Number(bonus || 0),
        method: method || 'bank',
        month: ensureYYYYMM(month),
      });

      navigation.replace('PaymentConfirmation', {
        paymentId: id,
        workerId,
        workerName,
        amount: nAmt,
        bonus: Number(bonus || 0),
        method: method || 'bank',
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
        placeholder="4–6 digits"
      />

      <Button
        label={busy ? 'Processing…' : 'Confirm Payment'}
        onPress={onConfirm}
        disabled={!confirmEnabled}
        fullWidth
      />
    </Screen>
  );
}
