import React from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import Card from '../../components/primitives/Card';
import Button from '../../components/primitives/Button';
import TextField from '../../components/primitives/TextField';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import {
  Payment,
  subscribeMyPaymentsInRange,
  monthRange,
  rangeLast3Months,
  rangeThisYear,
} from '../../services/payments';

import { useCurrency } from '../../context/CurrencyProvider';

type RangeKey = 'last3' | 'thisYear' | 'custom';

function useFmtAED() {
  const { format } = useCurrency();
  return React.useCallback((n: number) => format(n), [format]);
}

function PaymentRow({ p }: { p: Payment }) {
  const { colors } = useTheme();
  const fmtAED = useFmtAED();
  const dt = p.paidAt?.toDate?.() ?? new Date();
  const d = dt.toISOString().slice(0, 10);
  const total = (Number(p.amount) || 0) + (Number(p.bonus) || 0);

  return (
    <Card style={[styles.rowCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[typography.h2, { marginBottom: 2, color: colors.text }]}>{d}</Text>
      <Text style={[typography.small, { color: colors.subtext }]}>
        Worker: {p.workerName ?? '—'} • Method: {p.method ?? '—'}
      </Text>
      <Text style={[typography.h2, { marginTop: spacing.sm, color: colors.text }]}>
        {fmtAED(total)}
      </Text>
    </Card>
  );
}

function useControlledRange(initial: { start: Date; end: Date }) {
  const [start, setStart] = React.useState<Date>(initial.start);
  const [end, setEnd] = React.useState<Date>(initial.end);
  const [startText, setStartText] = React.useState<string>(initial.start.toISOString().slice(0, 10));
  const [endText, setEndText] = React.useState<string>(initial.end.toISOString().slice(0, 10));

  const apply = React.useCallback(() => {
    const s = new Date(startText);
    const e = new Date(endText);
    if (isNaN(+s) || isNaN(+e)) {
      Alert.alert('Invalid dates', 'Please use YYYY-MM-DD format.');
      return null;
    }
    e.setHours(23, 59, 59, 999);
    setStart(s);
    setEnd(e);
    return { start: s, end: e };
  }, [startText, endText]);

  return { start, end, startText, endText, setStartText, setEndText, apply };
}

function PaymentHistoryScreen({ route }: any) {
  const { colors } = useTheme();
  const fmtAED = useFmtAED(); 
  const initial = monthRange(new Date());
  const [rangeKey, setRangeKey] = React.useState<RangeKey>('last3');
  const { start, end, startText, endText, setStartText, setEndText, apply } = useControlledRange(initial);
  const [rows, setRows] = React.useState<Payment[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (rangeKey === 'last3') {
      const r = rangeLast3Months();
      setStartText(r.start.toISOString().slice(0, 10));
      setEndText(r.end.toISOString().slice(0, 10));
      (function () {
        r.end.setHours(23, 59, 59, 999);
      })();
    } else if (rangeKey === 'thisYear') {
      const r = rangeThisYear();
      setStartText(r.start.toISOString().slice(0, 10));
      setEndText(r.end.toISOString().slice(0, 10));
      (function () {
        r.end.setHours(23, 59, 59, 999);
      })();
    }
  }, [rangeKey, setStartText, setEndText]);

  React.useEffect(() => {
    let unsub: undefined | (() => void);
    setReady(false);
    try {
      const s = new Date(startText);
      const e = new Date(endText);
      if (isNaN(+s) || isNaN(+e)) {
        setRows([]);
        setReady(true);
        return;
      }
      e.setHours(23, 59, 59, 999);
      unsub = subscribeMyPaymentsInRange({ start: s, end: e }, (list) => {
        setRows(list);
        setReady(true);
      });
    } catch (e) {
      console.warn('PaymentHistory subscribe error:', e);
      setRows([]);
      setReady(true);
    }
    return () => { unsub && unsub(); };
  }, [startText, endText]);

  const total = rows.reduce((sum, p) => sum + (Number(p.amount) || 0) + (Number(p.bonus) || 0), 0);

  return (
    <Screen padded>
      <AppHeader title="Payment History" />

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <Button
          label="Last 3 months"
          size="sm"
          variant={rangeKey === 'last3' ? 'solid' : 'soft'}
          onPress={() => setRangeKey('last3')}
        />
        <Button
          label="This year"
          size="sm"
          variant={rangeKey === 'thisYear' ? 'solid' : 'soft'}
          onPress={() => setRangeKey('thisYear')}
        />
        <Button
          label="Custom"
          size="sm"
          variant={rangeKey === 'custom' ? 'solid' : 'soft'}
          onPress={() => setRangeKey('custom')}
        />
      </View>

      {rangeKey === 'custom' && (
        <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ gap: spacing.sm }}>
            <TextField label="Start (YYYY-MM-DD)" value={startText} onChangeText={setStartText} />
            <TextField label="End (YYYY-MM-DD)" value={endText} onChangeText={setEndText} />
            <Button label="Apply" size="sm" onPress={() => apply()} />
          </View>
        </Card>
      )}

      <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[typography.small, { color: colors.subtext }]}>Total paid in range</Text>
        <Text style={[typography.h2, { marginTop: 4, color: colors.text }]}>{fmtAED(total)}</Text>
      </Card>

      <FlatList
        data={rows}
        keyExtractor={(i) => i.id!}
        renderItem={({ item }) => <PaymentRow p={item} />}
        ListEmptyComponent={
          ready ? (
            <Text style={[typography.small, { color: colors.subtext, textAlign: 'center', marginTop: spacing.lg }]}>
              No payments in this range.
            </Text>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 48 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
  },
  rowCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
  },
});

export default PaymentHistoryScreen;
