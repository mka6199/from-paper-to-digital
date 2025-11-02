import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import Card from '../../components/primitives/Card';
import { colors, spacing, typography } from '../../theme/tokens';
import {
  Payment,
  subscribeMyPaymentsInRange,
  monthRange,
} from '../../services/payments';

export default function MonthlyHistoryScreen({ route, navigation }: any) {
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

  const money = (n: number) => `${Math.round(n).toLocaleString()} AED`;

  const renderItem = ({ item }: { item: Payment }) => {
    const when = item.paidAt?.toDate ? item.paidAt.toDate() : undefined;
    const dateStr = when
      ? `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(
          when.getDate()
        ).padStart(2, '0')}`
      : '—';
    const amt = Number(item.amount ?? 0) + Number(item.bonus ?? 0);

    return (
      <Card style={styles.rowCard}>
        <View style={styles.row}>
          <Text style={typography.body}>{dateStr}</Text>
          <Text style={[typography.body, { fontWeight: '700' }]}>{amt} AED</Text>
        </View>
        <Text style={[typography.small, { color: colors.subtext }]}>
          Worker: {item.workerName ?? item.workerId} • Method: {item.method ?? '—'}
        </Text>
        {!!item.note && (
          <Text style={[typography.small, { marginTop: 4 }]}>{item.note}</Text>
        )}
      </Card>
    );
  };

  const Header = (
    <View style={{ paddingBottom: spacing.lg }}>
      <AppHeader title="Payments this month" onBack={() => navigation.goBack()} />
      <Card style={styles.totalCard}>
        <Text style={typography.small}>Total paid</Text>
        <Text style={styles.totalValue}>{money(total)}</Text>
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
  totalCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 16,
    gap: spacing.xs,
    backgroundColor: '#fff',
  },
  totalValue: {
    ...typography.h1,
    marginVertical: 4,
  } as any,
  rowCard: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 16,
    padding: spacing.lg,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
});
