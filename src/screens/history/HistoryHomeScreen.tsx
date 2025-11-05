import React from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import Card from '../../components/primitives/Card';
import Button from '../../components/primitives/Button';
import TextField from '../../components/primitives/TextField';
import { spacing, typography } from '../../theme/tokens';
import {
  Payment,
  subscribeMyPaymentsInRange,
  rangeLast3Months,
  rangeThisYear,
} from '../../services/payments';
import { useTheme } from '../../theme/ThemeProvider';

// ✅ currency
import { useCurrency } from '../../context/CurrencyProvider';

type RangeKey = 'last3' | 'thisYear' | 'custom';

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function HistoryHomeScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { format } = useCurrency(); // ✅

  const deep = (route?.params ?? {}) as {
    monthStart?: string;
    monthEnd?: string;
    workerId?: string;
  };

  const initialRange: { start: Date; end: Date; key: RangeKey } =
    deep.monthStart && deep.monthEnd
      ? { start: new Date(deep.monthStart), end: new Date(deep.monthEnd), key: 'custom' }
      : { ...rangeLast3Months(), key: 'last3' };

  const [rangeKey, setRangeKey] = React.useState<RangeKey>(initialRange.key);
  const [start, setStart] = React.useState<Date>(initialRange.start);
  const [end, setEnd] = React.useState<Date>(initialRange.end);

  const [rows, setRows] = React.useState<Payment[]>([]);
  const [ready, setReady] = React.useState(false);

  const [workerQuery, setWorkerQuery] = React.useState('');

  // Clear any lingering worker-scoped params when focusing this screen
  const routeObj = useRoute<any>();
  useFocusEffect(
    React.useCallback(() => {
      const p = (routeObj?.params ?? {}) as any;
      if (p?.workerId || p?.scoped) {
        navigation.setParams({});
      }
    }, [navigation, routeObj?.params])
  );

  React.useEffect(() => {
    if (rangeKey === 'last3') {
      const r = rangeLast3Months();
      setStart(r.start);
      setEnd(r.end);
    } else if (rangeKey === 'thisYear') {
      const r = rangeThisYear();
      setStart(r.start);
      setEnd(r.end);
    }
    // custom range is updated via CustomRange screen
  }, [rangeKey]);

  React.useEffect(() => {
    let unsub: (() => void) | null = null;
    try {
      unsub = subscribeMyPaymentsInRange({ start, end }, (list) => {
        setRows(list);
        setReady(true);
      });
    } catch (e) {
      console.warn('History subscribe failed:', e);
      setReady(true);
    }
    return () => {
      if (unsub) unsub();
    };
  }, [start.getTime(), end.getTime()]);

  const filtered = React.useMemo(() => {
    const q = workerQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (p) =>
        String(p.workerName ?? '').toLowerCase().includes(q) ||
        String(p.workerId ?? '').toLowerCase().includes(q)
    );
  }, [rows, workerQuery]);

  const totalPaid = filtered.reduce(
    (sum, p) => sum + Number(p.amount ?? 0) + Number(p.bonus ?? 0),
    0
  );

  const groups = React.useMemo(() => {
    const map = new Map<string, Payment[]>();
    for (const p of filtered) {
      const d = p.paidAt?.toDate ? p.paidAt.toDate() : null;
      const key = d ? ymd(d) : '—';
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }
    const orderedKeys = Array.from(map.keys()).sort().reverse();
    return orderedKeys.map((k) => ({ dateKey: k, items: map.get(k)! }));
  }, [filtered]);

  const Header = (
    <View style={{ paddingBottom: spacing.lg }}>
      <AppHeader title="Payment History" />

      <Card style={{ padding: spacing.md }}>
        <View
          style={[
            styles.segment,
            { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
          ]}
        >
          {(['last3', 'thisYear', 'custom'] as RangeKey[]).map((k) => {
            const active = rangeKey === k;
            return (
              <Pressable
                key={k}
                onPress={() => setRangeKey(k)}
                style={[
                  styles.segmentBtn,
                  active && { backgroundColor: colors.brand },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: active ? '#fff' : colors.text },
                    active && { fontWeight: '700' },
                  ]}
                >
                  {k === 'last3' ? 'Last 3 months' : k === 'thisYear' ? 'This year' : 'Custom'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
          <Text style={[typography.small, { color: colors.subtext }]}>
            Range: {start.toDateString()} — {end.toDateString()}
          </Text>
          {rangeKey === 'custom' && (
            <Button
              label="Edit custom range"
              variant="soft"
              onPress={() =>
                navigation.navigate('CustomRange', {
                  startISO: start.toISOString(),
                  endISO: end.toISOString(),
                })
              }
            />
          )}
        </View>
      </Card>

      <View style={{ height: spacing.md }} />
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
        <Card style={{ padding: spacing.lg }}>
          <Text style={[typography.small, { color: colors.subtext }]}>
            Total paid in range
          </Text>
          <Text style={[styles.totalValue, { color: colors.text }]}>
            {format(totalPaid)}
          </Text>
          <Text style={[typography.small, { color: colors.subtext }]}>
            {filtered.length} payment{filtered.length === 1 ? '' : 's'}
          </Text>
        </Card>

        <Card style={{ padding: spacing.md }}>
          <TextField
            label="Filter by worker"
            value={workerQuery}
            onChangeText={setWorkerQuery}
            placeholder="Type a worker name or ID…"
          />
        </Card>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
        <Text style={[typography.h2, { marginBottom: spacing.sm, color: colors.text }]}>
          Payments
        </Text>
      </View>
    </View>
  );

  const flatData = React.useMemo(() => {
    const out: Array<{ _type: 'header' | 'row'; key: string; payload?: any }> = [];
    for (const g of groups) {
      out.push({ _type: 'header', key: `h:${g.dateKey}`, payload: g.dateKey });
      for (const p of g.items) {
        out.push({ _type: 'row', key: p.id ?? Math.random().toString(), payload: p });
      }
    }
    return out;
  }, [groups]);

  const renderItem = ({ item }: any) => {
    if (item._type === 'header') {
      return (
        <Text
          style={[
            typography.h2,
            { marginTop: spacing.md, marginBottom: spacing.xs, color: colors.text },
          ]}
        >
          {item.payload}
        </Text>
      );
    }
    const p: Payment = item.payload;
    const d = p.paidAt?.toDate ? p.paidAt.toDate() : null;
    const line = d
      ? `${d.getHours().toString().padStart(2, '0')}:${d
          .getMinutes()
          .toString()
          .padStart(2, '0')}`
      : '—';
    const amount = Number(p.amount ?? 0) + Number(p.bonus ?? 0);

    return (
      <Card style={{ padding: spacing.lg }}>
        <View style={styles.rowTop}>
          <Text style={[typography.body, { color: colors.text }]} numberOfLines={1}>
            {p.workerName ?? p.workerId}
          </Text>
          <Text style={[typography.body, { fontWeight: '700', color: colors.text }]}>
            {format(amount)}
          </Text>
        </View>
        <Text style={[typography.small, { color: colors.subtext }]}>
          {line} • Method: {p.method ?? '—'}
        </Text>
        {!!p.note && (
          <Text style={[typography.small, { marginTop: 4, color: colors.text }]}>{p.note}</Text>
        )}
      </Card>
    );
  };

  return (
    <Screen>
      <FlatList
        data={flatData}
        keyExtractor={(i) => i.key}
        renderItem={renderItem}
        ListHeaderComponent={Header}
        ListEmptyComponent={
          ready ? (
            <Text style={[typography.small, { textAlign: 'center', color: colors.subtext }]}>
              No payments in this range.
            </Text>
          ) : null
        }
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing['2xl'],
          gap: spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentText: {
    ...typography.small,
  } as any,
  totalValue: {
    ...typography.h1,
    marginVertical: 4,
  } as any,
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
});
