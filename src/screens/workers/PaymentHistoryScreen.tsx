import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  rangeLast3Months,
  rangeThisYear,
} from '../../services/payments';
import { useCurrency } from '../../context/CurrencyProvider';
import { logger } from '../../utils/logger';
import { showAlert } from '../../utils/alert';

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

const toInputValue = (d: Date) => d.toISOString().slice(0, 10);

const clampToEndOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
};

function useControlledRange(initial: { start: Date; end: Date }) {
  const initStart = React.useMemo(() => new Date(initial.start), [initial.start]);
  const initEnd = React.useMemo(() => clampToEndOfDay(initial.end), [initial.end]);

  const [range, setRange] = React.useState(() => ({ start: initStart, end: initEnd }));
  const [startText, setStartText] = React.useState<string>(toInputValue(initStart));
  const [endText, setEndText] = React.useState<string>(toInputValue(initEnd));

  const apply = React.useCallback(() => {
    const s = new Date(startText);
    const e = new Date(endText);
    if (isNaN(+s) || isNaN(+e)) {
      showAlert('Invalid dates', 'Please use YYYY-MM-DD format.');
      return null;
    }
    if (e < s) {
      showAlert('Invalid range', 'End date must be on or after the start date.');
      return null;
    }
    const alignedEnd = clampToEndOfDay(e);
    setRange({ start: s, end: alignedEnd });
    return { start: s, end: alignedEnd };
  }, [startText, endText]);

  const setRangeDirect = React.useCallback((nextRange: { start: Date; end: Date }) => {
    const start = new Date(nextRange.start);
    const end = clampToEndOfDay(new Date(nextRange.end));
    setStartText(toInputValue(start));
    setEndText(toInputValue(end));
    setRange({ start, end });
  }, []);

  return { range, startText, endText, setStartText, setEndText, apply, setRangeDirect };
}

function PaymentHistoryScreen({ route }: any) {
  const { colors } = useTheme();
  const fmtAED = useFmtAED(); 
  const insets = useSafeAreaInsets();
  const initial = React.useMemo(() => rangeLast3Months(), []);
  const [rangeKey, setRangeKey] = React.useState<RangeKey>('last3');
  const { range, startText, endText, setStartText, setEndText, apply, setRangeDirect } = useControlledRange(initial);
  const [rows, setRows] = React.useState<Payment[]>([]);
  const [ready, setReady] = React.useState(false);
  const workerId = route?.params?.workerId as string | undefined;
  const workerName = route?.params?.workerName as string | undefined;
  const workerFilter = workerId ? String(workerId) : null;

  const startMs = range.start.getTime();
  const endMs = range.end.getTime();

  React.useEffect(() => {
    if (rangeKey === 'custom') return;
    const r = rangeKey === 'last3' ? rangeLast3Months() : rangeThisYear();
    setRangeDirect(r);
  }, [rangeKey, setRangeDirect]);

  React.useEffect(() => {
    let unsub: undefined | (() => void);
    setReady(false);
    const handleRows = (list: Payment[]) => {
      const filtered = workerFilter ? list.filter((p) => p.workerId === workerFilter) : list;
      setRows(filtered);
      setReady(true);
    };
    try {
      unsub = subscribeMyPaymentsInRange({ start: range.start, end: range.end }, handleRows);
    } catch (e) {
      logger.warn('PaymentHistory subscribe error:', e);
      setRows([]);
      setReady(true);
    }
    return () => { unsub && unsub(); };
  }, [startMs, endMs, workerFilter]);

  const total = rows.reduce((sum, p) => sum + (Number(p.amount) || 0) + (Number(p.bonus) || 0), 0);

  const listPadding = React.useMemo(() => Math.max(insets.bottom, spacing.lg) + spacing['2xl'], [insets.bottom]);

  const keyExtractor = React.useCallback(
    (item: Payment, index: number) => item.id ?? `${item.workerId}-${item.paidAt?.seconds ?? index}`,
    []
  );

  const emptyLabel = workerFilter
    ? `No payments recorded for ${workerName || 'this worker'} in this range.`
    : 'No payments in this range.';

  return (
    <Screen padded>
      <AppHeader title="Payment History" transparent noBorder />

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
            <Button
              label="Apply"
              size="sm"
              onPress={() => {
                const next = apply();
                if (next) setRangeKey('custom');
              }}
            />
          </View>
        </Card>
      )}

      <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[typography.small, { color: colors.subtext }]}>Total paid in range</Text>
        <Text style={[typography.h2, { marginTop: 4, color: colors.text }]}>{fmtAED(total)}</Text>
      </Card>

      <FlatList
        data={rows}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => <PaymentRow p={item} />}
        ListHeaderComponent={
          workerFilter ? (
            <Text
              style={{
                marginBottom: spacing.sm,
                color: colors.subtext,
                textAlign: 'center',
              }}
            >
              Filtering for {workerName || 'selected worker'}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          ready ? (
            <Text style={[typography.small, { color: colors.subtext, textAlign: 'center', marginTop: spacing.lg }]}>
              {emptyLabel}
            </Text>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: listPadding }}
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
