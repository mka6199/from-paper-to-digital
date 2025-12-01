import React from 'react';
import { View } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import Card from '../../components/primitives/Card';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import { spacing } from '../../theme/tokens';
import { db } from '../../config/firebase';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { showAlert } from '../../utils/alert';
import { adminUpdatePayment } from '../../services/admin';
import { deletePayment } from '../../services/payments';
import AdminGate from '../../components/admin/AdminGate';
import { useTheme } from '../../theme/ThemeProvider';

const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function parseYMD(s?: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

export default function AdminEditPaymentScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const { paymentId } = route.params as { paymentId: string };

  const [loading, setLoading] = React.useState(true);
  const [deleting, setDeleting] = React.useState(false);

  const [amount, setAmount] = React.useState('');
  const [bonus, setBonus] = React.useState('');
  const [method, setMethod] = React.useState('');
  const [month, setMonth] = React.useState('');
  const [note, setNote] = React.useState('');
  const [paidAtTxt, setPaidAtTxt] = React.useState('');

  React.useEffect(() => {
    (async () => {
      try {
        const ref = doc(db, 'payments', paymentId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const p = snap.data() as any;
          setAmount(String(Number(p.amount ?? 0)));
          setBonus(String(Number(p.bonus ?? 0)));
          setMethod(String(p.method ?? ''));
          setMonth(String(p.month ?? ''));
          setNote(String(p.note ?? ''));
          const dt = p.paidAt?.toDate ? p.paidAt.toDate() : null;
          setPaidAtTxt(dt ? toYMD(dt) : '');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [paymentId]);

  const amt = Number(amount);
  const bon = Number(bonus);
  const valid =
    !Number.isNaN(amt) &&
    amt >= 0 &&
    !Number.isNaN(bon) &&
    bon >= 0 &&
    (paidAtTxt === '' || parseYMD(paidAtTxt) !== null);

  async function onSave() {
    if (!valid) {
      showAlert('Invalid fields', 'Please fix invalid values before saving.');
      return;
    }
    try {
      let patch: any = {
        amount: amt,
        bonus: bon,
        method: method.trim() || null,
        month: month.trim() || null,
        note: note.trim() || null,
      };
      if (paidAtTxt) {
        const d = parseYMD(paidAtTxt)!;
        patch.paidAt = Timestamp.fromDate(d);
      }
      await adminUpdatePayment(paymentId, patch);
      navigation.goBack();
    } catch (e: any) {
      showAlert('Failed to save', e?.message ?? 'Please try again.');
    }
  }

  function onDeleteConfirm() {
    showAlert(
      'Delete payment',
      'This action cannot be undone. Are you sure you want to permanently remove this payment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deletePayment(paymentId);
              navigation.goBack();
            } catch (e: any) {
              showAlert('Delete failed', e?.message ?? 'Could not delete payment.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  return (
    <AdminGate title="Admin Panel">
      <Screen scroll padded>
        <AppHeader title="Admin • Edit Payment" onBack={() => navigation.goBack()} transparent noBorder />
        <Card style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
          <View style={{ gap: spacing.md }}>
            <TextField label="Amount (AED)" value={amount} onChangeText={setAmount} keyboardType="numeric" />
            <TextField label="Bonus (AED)" value={bonus} onChangeText={setBonus} keyboardType="numeric" />
            <TextField label="Method" value={method} onChangeText={setMethod} placeholder="cash / bank / wallet" />
            <TextField label="Month tag" value={month} onChangeText={setMonth} placeholder="e.g., 2025-10" />
            <TextField label="Note" value={note} onChangeText={setNote} />
            <TextField
              label="Paid date (YYYY-MM-DD)"
              value={paidAtTxt}
              onChangeText={setPaidAtTxt}
              placeholder="optional"
            />
          </View>
        </Card>

        <View style={{ height: spacing.lg }} />
        <Button
          label={loading ? 'Loading…' : 'Save changes'}
          onPress={onSave}
          disabled={loading || !valid || deleting}
          fullWidth
        />

        <View style={{ height: spacing.md }} />
        <Button
          label={deleting ? 'Deleting…' : 'Delete payment'}
          variant="outline"
          tone="danger"
          onPress={onDeleteConfirm}
          disabled={loading || deleting}
          fullWidth
          accessibilityLabel="Delete this payment permanently"
        />
      </Screen>
    </AdminGate>
  );
}

