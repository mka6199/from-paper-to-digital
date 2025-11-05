import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import Card from '../../components/primitives/Card';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import {
  Payment,
  subscribeMyPaymentsInRange,
  monthRange,
} from '../../services/payments';

// ✅ currency
import { useCurrency } from '../../context/CurrencyProvider';

export default function MonthlyHistoryScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const { format } = useCurrency(); // ✅

  const p = (route?.params ?? {}) as { monthStart?: string; monthEnd?: string };
  const { start, end } = React.useMemo(() => {
    if (p.monthStart && p.monthEnd) {
      return { start: new Date(p.monthStart), end: new Date(p.monthEnd) };
    }
    return monthRange();
  }, [p.monthStart, p.monthEnd]);

  const [rows, setRows] = React.useState<Payment[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let unsub: (() => void) | null = null;
    try {
      unsub = subscribeMyPaymentsInRange({ start, end }, (list) => {
        setRows(list);
        setReady(true);
      });
    } catch (e) {
      console.warn('MonthlyHistory subscribe failed:', e);
      setReady(true);
    }
    return () => {
      if (unsub) unsub();
    };
  }, [start.getTime(), end.getTime()]);

  const total = rows.reduce(
    (sum, r) => sum + Number(r.amount ?? 0) + Number(r.bonus ?? 0),
    0
  );

  const renderItem = ({ item }: { item: Payment }) => {
    const when = item.paidAt?.toDate ? item.paidAt.toDate() : undefined;
    const dateStr = when
      ? `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(
          when.getDate()
        ).padStart(2, '0')}`
      : '—';
    const amt = Number(item.amount ?? 0) + Number(item.bonus ?? 0);

    return (
      <Card style={{ padding: spacing.lg }}>
        <View style={styles.row}>
          <Text style={[typography.body, { color: colors.text }]}>{dateStr}</Text>
          <Text style={[typography.body, { fontWeight: '700', color: colors.text }]}>
            {format(amt)}
          </Text>
        </View>
        <Text style={[typography.small, { color: colors.subtext }]}>
          Worker: {item.workerName ?? item.workerId} • Method: {item.method ?? '—'}
        </Text>
        {!!item.note && (
          <Text style={[typography.small, { marginTop: 4, color: colors.text }]}>{item.note}</Text>
        )}
      </Card>
    );
  };

  const Header = (
    <View style={{ paddingBottom: spacing.lg }}>
      <AppHeader title="Payments this month" />
      <Card style={{ padding: spacing.lg }}>
        <Text style={[typography.small, { color: colors.subtext }]}>Total paid</Text>
        <Text style={[styles.totalValue, { color: colors.text }]}>{format(total)}</Text>
        <Text style={[typography.small, { color: colors.subtext }]}>
          {start.toDateString()} — {end.toDateString()}
        </Text>
      </Card>
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderItem}
        ListHeaderComponent={Header}
        ListEmptyComponent={
          ready ? (
            <Text style={[typography.small, { textAlign: 'center', color: colors.subtext }]}>
              No payments were recorded in this period.
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
  totalValue: {
    ...typography.h1,
    marginVertical: 4,
  } as any,
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
});
