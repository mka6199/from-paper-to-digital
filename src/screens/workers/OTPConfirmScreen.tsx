import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import { addPayment } from '../../services/payments';
import { resolveWorkerSalaryNotifications } from '../../services/notifications';
import { createPayRun, WorkerDueItem } from '../../services/payruns';
import { Worker as AppWorker } from '../../services/workers';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { useCurrency } from '../../context/CurrencyProvider';
import { showAlert } from '../../utils/alert';

type NavParams = {
  // Individual payment
  workerId?: string;
  workerName?: string;
  phone?: string;
  amount?: number;
  bonus?: number;
  method?: 'cash' | 'bank';
  month?: string;
  
  // Pay run batch payment
  isPayRun?: boolean;
  adminPhone?: string;
  selectedWorkerIds?: string[];
  selectedWorkerData?: Array<{
    workerId: string;
    workerName: string;
    salary: number;
    outstanding: number;
  }>;
  periodStart?: string;
  periodEnd?: string;
  totalAmount?: number;
  workerCount?: number;
  note?: string;
};

const SEND_OTP_URL =
  process.env.EXPO_PUBLIC_SEND_OTP_URL ||
  'https://us-central1-from-paper-to-digital.cloudfunctions.net/sendOtp';
const VERIFY_OTP_URL =
  process.env.EXPO_PUBLIC_VERIFY_OTP_URL ||
  'https://us-central1-from-paper-to-digital.cloudfunctions.net/verifyOtp';

export default function OTPConfirmScreen({ route, navigation }: any) {
  const params = (route?.params || {}) as NavParams;
  const {
    workerId,
    workerName,
    amount,
    bonus,
    method,
    month,
    phone,
    isPayRun,
    adminPhone,
    selectedWorkerIds,
    selectedWorkerData,
    periodStart,
    periodEnd,
    totalAmount,
    workerCount,
    note,
  } = params;

  const { colors } = useTheme();
  const { format } = useCurrency();

  // Determine which phone to use and display
  const targetPhone = isPayRun ? adminPhone : phone;
  const paymentAmount = isPayRun ? (totalAmount || 0) : (amount || 0);

  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [hasSentOtp, setHasSentOtp] = useState(false);
  const activeRequest = React.useRef<AbortController | null>(null);

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
    if (isPayRun) {
      return (
        !!adminPhone &&
        !!selectedWorkerData &&
        selectedWorkerData.length > 0 &&
        String(otp).trim().length >= 4 &&
        hasSentOtp &&
        !busy
      );
    } else {
      const nAmt = Number(amount || 0);
      return (
        !!workerId &&
        nAmt > 0 &&
        String(otp).trim().length >= 4 &&
        hasSentOtp &&
        !busy
      );
    }
  }, [isPayRun, workerId, amount, adminPhone, selectedWorkerData, otp, busy, hasSentOtp]);

  useEffect(() => {
    return () => {
      activeRequest.current?.abort();
    };
  }, []);

  async function onSendOtp() {
    if (!targetPhone) {
      showAlert(
        'Missing phone number',
        isPayRun 
          ? 'Please add your phone number in Settings to authorize pay runs.'
          : 'This worker does not have a phone number saved.'
      );
      return;
    }
    if (sending || cooldown > 0) return;

    setSending(true);
    setOtpError(null); 
    try {
      activeRequest.current?.abort();
      const controller = new AbortController();
      activeRequest.current = controller;
      const res = await fetch(SEND_OTP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: targetPhone }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to send OTP');
      }
      showAlert('OTP sent', 'A verification code was sent to the worker.');
      setCooldown(60); 
      setHasSentOtp(true);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      showAlert(
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
    if (!hasSentOtp) {
      showAlert('Send OTP first', 'Please send a code before confirming.');
      return;
    }
    if (!targetPhone) {
      showAlert('Missing phone number');
      return;
    }

    setBusy(true);
    setOtpError(null);
    try {
      activeRequest.current?.abort();
      const controller = new AbortController();
      activeRequest.current = controller;
      
      // Verify OTP
      const res = await fetch(VERIFY_OTP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: targetPhone, code }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to verify code.');
      }

      if (!data?.valid) {
        setOtpError('The code is incorrect or has expired. Please try again.');
        return;
      }

      // Handle pay run or individual payment
      if (isPayRun) {
        // Reconstruct WorkerDueItem objects from serialized data
        const reconstructedWorkers: WorkerDueItem[] = selectedWorkerData!.map((data) => ({
          worker: {
            id: data.workerId,
            name: data.workerName,
          } as AppWorker,
          salary: data.salary,
          paidSoFar: data.salary - data.outstanding,
          outstanding: data.outstanding,
          dueAt: null,
          isOverdue: false,
        }));

        // Create pay run with batch payment
        await createPayRun({
          periodStart: new Date(periodStart!),
          periodEnd: new Date(periodEnd!),
          selectedWorkers: reconstructedWorkers,
          method: method || 'cash',
          note: note || `Pay run for ${new Date(periodStart!).toLocaleDateString()}`,
        });

        // Auto-resolve notifications for all paid workers
        await Promise.all(
          selectedWorkerData!.map((data) =>
            resolveWorkerSalaryNotifications(data.workerId).catch((e) =>
              console.warn('Failed to resolve notifications for', data.workerId, e)
            )
          )
        );

        showAlert(
          'Pay run completed',
          `Successfully paid ${workerCount} worker(s) for ${format(totalAmount || 0)}.`
        );
        
        navigation.navigate('WorkersList');
      } else {
        // Individual payment
        if (!workerId) {
          showAlert('Missing worker id');
          return;
        }
        const nAmt = Number(amount || 0);
        if (!Number.isFinite(nAmt) || nAmt <= 0) {
          showAlert('Enter a valid amount');
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

        // Auto-resolve salary notifications for this worker
        try {
          await resolveWorkerSalaryNotifications(workerId);
        } catch (e) {
          console.warn('Failed to resolve notifications:', e);
        }

        navigation.replace('PaymentConfirmation', {
          workerId,
          workerName,
          amount: nAmt,
          method: method || 'bank',
        });
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      showAlert('Payment failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const displayAmountFormatted = format(Number(paymentAmount));

  const sendOtpLabel =
    sending
      ? 'Sending…'
      : cooldown > 0
      ? `Resend OTP in ${cooldown}s`
      : 'Send OTP';

  return (
    <Screen>
      <AppHeader 
        title={isPayRun ? "Confirm Pay Run" : "Confirm Payment"} 
        onBack={() => navigation.goBack()} 
        transparent 
        noBorder 
      />

      <View style={{ padding: spacing.lg, gap: spacing.lg }}>
        <Card style={[styles.card, { borderColor: colors.border }]}>
          {isPayRun ? (
            <>
              <Text style={[typography.h2, { color: colors.text }]}>
                Pay Run Batch Payment
              </Text>
              <Text style={[styles.sub, { color: colors.subtext }]}>
                Workers: {workerCount}
              </Text>
              <Text style={[styles.sub, { color: colors.subtext }]}>
                Total Amount: {displayAmountFormatted}
              </Text>
              {adminPhone && (
                <Text style={[styles.sub, { color: colors.subtext }]}>
                  Authorization Phone: {adminPhone}
                </Text>
              )}
              <Text style={[styles.sub, { color: colors.subtext }]}>
                Method: {method === 'cash' ? 'Cash' : 'Bank transfer'}
              </Text>
            </>
          ) : (
            <>
              <Text style={[typography.h2, { color: colors.text }]}>
                {workerName || 'Worker'}
              </Text>
              <Text style={[styles.sub, { color: colors.subtext }]}>
                Amount: {displayAmountFormatted}
              </Text>
              {phone && (
                <Text style={[styles.sub, { color: colors.subtext }]}>
                  Phone: {phone}
                </Text>
              )}
              <Text style={[styles.sub, { color: colors.subtext }]}>
                Method: {method === 'cash' ? 'Cash' : 'Bank transfer'}
              </Text>
            </>
          )}
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
          label={busy ? 'Processing…' : (isPayRun ? 'Confirm Pay Run' : 'Confirm Payment')}
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
