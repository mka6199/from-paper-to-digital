import React, { useEffect, useMemo, useState } from 'react';
import { Alert, View, Text, StyleSheet } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import { addPayment } from '../../services/payments';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { useCurrency } from '../../context/CurrencyProvider';

type NavParams = {
  workerId: string;
  workerName?: string;
  phone?: string;
  amount: number;
  bonus?: number;
  method?: 'cash' | 'bank';
  month?: string;
};

const SEND_OTP_URL =
  'https://us-central1-from-paper-to-digital.cloudfunctions.net/sendOtp';
const VERIFY_OTP_URL =
  'https://us-central1-from-paper-to-digital.cloudfunctions.net/verifyOtp';

export default function OTPConfirmScreen({ route, navigation }: any) {
  const {
    workerId,
    workerName,
    amount,
    bonus,
    method,
    month,
    phone,
  } = (route?.params || {}) as NavParams;

  const { colors } = useTheme();
  const { format } = useCurrency();

  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const ensureYYYYMM = (d?: string) => {
    if (typeof d === 'string' && /^\d{4}-\d{2}$/.test(d)) return d;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };


  useEffect(() => {
    if (!cooldown) return;
    const id = setInterval(() => {
      setCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const confirmEnabled = useMemo(() => {
    const nAmt = Number(amount || 0);
    return !!workerId && nAmt > 0 && String(otp).trim().length >= 4 && !busy;
  }, [workerId, amount, otp, busy]);

  async function onSendOtp() {
    if (!phone) {
      Alert.alert(
        'Missing phone number',
        'This worker does not have a phone number saved.'
      );
      return;
    }
    if (sending || cooldown > 0) return;

    setSending(true);
    setOtpError(null); 
    try {
      const res = await fetch(SEND_OTP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to send OTP');
      }
      Alert.alert('OTP sent', 'A verification code was sent to the worker.');
      setCooldown(60); 
    } catch (e: any) {
      Alert.alert(
        'Failed to send OTP',
        e?.message || 'Please try again in a moment.'
      );
    } finally {
      setSending(false);
    }
  }

  async function onConfirm() {
    const code = String(otp).trim();
    if (code.length < 4) {
      setOtpError('Please enter the 4–6 digit code.');
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
    if (!phone) {
      Alert.alert('Missing phone number');
      return;
    }

    setBusy(true);
    setOtpError(null);
    try {
      const res = await fetch(VERIFY_OTP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to verify code.');
      }

      if (!data?.valid) {
        setOtpError('The code is incorrect or has expired. Please try again.');
        return;
      }

      await addPayment({
        workerId,
        workerName,
        amount: nAmt,
        bonus: Number(bonus || 0),
        method: method || 'bank',
        month: ensureYYYYMM(month),
      });

      navigation.replace('PaymentConfirmation', {
        workerId,
        workerName,
        amount: nAmt,
        method: method || 'bank',
      });
    } catch (e: any) {
      Alert.alert('Payment failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const displayAmount = format(Number(amount || 0));

  const sendOtpLabel =
    sending
      ? 'Sending…'
      : cooldown > 0
      ? `Resend OTP in ${cooldown}s`
      : 'Send OTP';

  return (
    <Screen>
      <AppHeader title="Confirm Payment" onBack={() => navigation.goBack()} />

      <View style={{ padding: spacing.lg, gap: spacing.lg }}>
        <Card style={[styles.card, { borderColor: colors.border }]}>
          <Text style={[typography.h2, { color: colors.text }]}>
            {workerName || 'Worker'}
          </Text>
          <Text style={[styles.sub, { color: colors.subtext }]}>
            Amount: {displayAmount}
          </Text>
          {phone ? (
            <Text style={[styles.sub, { color: colors.subtext }]}>
              Phone: {phone}
            </Text>
          ) : null}
          <Text style={[styles.sub, { color: colors.subtext }]}>
            Method: {method === 'cash' ? 'Cash' : 'Bank transfer'}
          </Text>
        </Card>

        <Button
          label={sendOtpLabel}
          onPress={onSendOtp}
          disabled={sending || cooldown > 0}
          fullWidth
        />

        <View>
          <TextField
            label="Verification Code"
            value={otp}
            onChangeText={(val) => {
              setOtp(val);
              if (otpError) setOtpError(null);
            }}
            keyboardType="number-pad"
            placeholder="6 digits"
          />
          {otpError ? (
            <Text
              style={{
                ...typography.small,
                color: colors.danger,   
                marginTop: spacing.xs,
              }}
            >
              {otpError}
            </Text>
          ) : null}
        </View>

        <Button
          label={busy ? 'Processing…' : 'Confirm Payment'}
          onPress={onConfirm}
          disabled={!confirmEnabled}
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  sub: {
    ...typography.small,
    marginTop: 4,
  },
});
