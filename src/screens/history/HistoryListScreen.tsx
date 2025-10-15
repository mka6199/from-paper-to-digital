import React, { useCallback, useMemo, useState } from 'react';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import Card from '../../components/primitives/Card';
import Button from '../../components/primitives/Button';
import TextField from '../../components/primitives/TextField';
import { Text, View, FlatList, Alert } from 'react-native';
import { colors, spacing, typography } from '../../theme/tokens';
import { listRecentPayments, Payment } from '../../services/payments';
import { listWorkers, Worker } from '../../services/workers';
import { useFocusEffect, useRoute } from '@react-navigation/native';

// ----- date helpers -----
function startOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfYear(d = new Date()) { return new Date(d.getFullYear(), 0, 1); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function toDateAny(p: Payment): Date | null {
  const val: any = (p as any).createdAt;
  if (!val) return null;
  if (typeof val?.toDate === 'function') return val.toDate();
  if (val instanceof Date) return val;
  return null;
}
function parseDate(input?: string): Date | null {
  if (!input) return null;
  const s = input.trim().replace(/\//g, '-');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

// ----- modes -----
type Mode = 'CHOOSER' | 'LIST_LAST3' | 'LIST_YEAR' | 'CUSTOM_FORM' | 'CUSTOM_LIST';

export default function HistoryListScreen({ navigation }: any) {
  const route = useRoute<any>();
  const workerId: string | undefined = route?.params?.workerId;
  const workerNameParam: string | undefined = route?.params?.workerName;
  const startModeParam: Mode | undefined = route?.params?.startMode;

  // If opened from a worker profile → go straight to last 3 months
  const [mode, setMode] = useState<Mode>(
    startModeParam ?? (workerId ? 'LIST_LAST3' : 'CHOOSER')
  );

  // Is this the History tab root? (no workerId + first item in its stack)
  const isTabRoot = !workerId && navigation?.getState?.()?.index === 0;

  // Data
  const [payments, setPayments] = useState<Payment[]>([]);
  const [workers, setWorkers] = useState<Record<string, Worker>>({});
  const [loading, setLoading] = useState(false);

  // Custom range inputs + applied range
  const [fromInput, setFromInput] = useState<string>('');
  const [toInput, setToInput] = useState<string>('');
  const [appliedFrom, setAppliedFrom] = useState<Date | undefined>(undefined);
  const [appliedTo, setAppliedTo] = useState<Date | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pmt, wks] = await Promise.all([
        listRecentPayments(400),         // wider window; filter locally
        listWorkers().catch(() => []),   // best-effort for fresh names
      ]);
      setPayments(pmt);
      const map: Record<string, Worker> = {};
      for (const w of wks) if ((w as any).id) map[(w as any).id] = w;
      setWorkers(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load, workerId, workerNameParam, route?.key]));

  // Worker scoping (id first, fallback to name if provided)
  const scoped = useMemo(() => {
    if (!workerId && !workerNameParam) return payments;
    return payments.filter(p =>
      (workerId && p.workerId === workerId) ||
      (!workerId && workerNameParam && (p.workerName || '').trim() === workerNameParam.trim())
    );
  }, [payments, workerId, workerNameParam]);

  // Date window by mode
  const { from, to } = useMemo(() => {
    const now = new Date();
    if (mode === 'LIST_LAST3') return { from: startOfMonth(addMonths(now, -2)), to: undefined };
    if (mode === 'LIST_YEAR')  return { from: startOfYear(now), to: undefined };
    if (mode === 'CUSTOM_LIST') return { from: appliedFrom, to: appliedTo };
    return { from: undefined, to: undefined };
  }, [mode, appliedFrom, appliedTo]);

  const inRange = (dt: Date | null) => {
    if (!dt) return true;
    if (from && dt < from) return false;
    if (to && dt > to) return false;
    return true;
  };

  const filtered = useMemo(() => scoped.filter(p => inRange(toDateAny(p))), [scoped, from, to]);

  // Prefer live name; fallback to denormalized
  const displayWorkerName = (p: Payment) => workers[p.workerId]?.name || p.workerName || '';

  const title =
    workerId ? 'Salary History'
    : mode === 'LIST_LAST3' ? 'Last 3 Months'
    : mode === 'LIST_YEAR'  ? 'This Year'
    : mode === 'CUSTOM_FORM' || mode === 'CUSTOM_LIST' ? 'Custom Range'
    : 'History';

  // Apply custom range
  const onApplyCustom = () => {
    const f = parseDate(fromInput);
    const t = parseDate(toInput);
    if (!f || !t) {
      Alert.alert('Enter a valid date range', 'Use YYYY-MM-DD (e.g., 2025-01-31).');
      return;
    }
    if (t < f) {
      Alert.alert('Invalid range', 'The end date must be after the start date.');
      return;
    }
    setAppliedFrom(f);
    setAppliedTo(t);
    setMode('CUSTOM_LIST');
  };

  // Pre-fill custom with last 30 days and open form
  const openCustomForm = () => {
    if (!fromInput && !toInput) {
      const end = new Date();
      const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      setFromInput(start.toISOString().slice(0, 10));
      setToInput(end.toISOString().slice(0, 10));
    }
    setMode('CUSTOM_FORM');
  };

  // --- CHOOSER (History tab only) ---
  if (!workerId && mode === 'CHOOSER') {
    return (
      <Screen padded>
        <AppHeader title="History" onBack={isTabRoot ? undefined : () => navigation.goBack()} />
        <View style={{ gap: spacing.md }}>
          <Card>
            <Button label="Last 3 Months" tone="green" onPress={() => setMode('LIST_LAST3')} fullWidth />
          </Card>
          <Card>
            <Button label="This Year" tone="green" onPress={() => setMode('LIST_YEAR')} fullWidth />
          </Card>
          <Card>
            <Button label="Custom Range" variant="outline" tone="green" onPress={openCustomForm} fullWidth />
          </Card>
        </View>
      </Screen>
    );
  }

  // --- CUSTOM FORM ---
  if (mode === 'CUSTOM_FORM') {
    return (
      <Screen padded>
        <AppHeader title="Custom Range" onBack={isTabRoot ? undefined : () => navigation.goBack()} />
        <Card>
          <View style={{ gap: spacing.md }}>
            <Text style={[typography.small, { color: colors.subtext }]}>
              Enter a custom range (YYYY-MM-DD)
            </Text>
            <TextField
              label="From"
              value={fromInput}
              onChangeText={setFromInput}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
            />
            <TextField
              label="To"
              value={toInput}
              onChangeText={setToInput}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
            />
            <Button label="Apply Range" tone="green" onPress={onApplyCustom} />
          </View>
        </Card>
      </Screen>
    );
  }

  // --- LIST VIEWS (Last 3 / This Year / Custom List) ---
  const showChangeRange = isTabRoot && (mode === 'LIST_LAST3' || mode === 'LIST_YEAR' || mode === 'CUSTOM_LIST');

  return (
    <Screen padded>
      <AppHeader title={title} onBack={isTabRoot ? undefined : () => navigation.goBack()} />

      {/* Small helper to get back to the 3 options on the tab root */}
      {showChangeRange && (
        <View style={{ marginBottom: spacing.md }}>
          <Button
            label={mode === 'CUSTOM_LIST' ? 'Edit Range' : 'Change Range'}
            variant="outline"
            tone="green"
            onPress={() => setMode(mode === 'CUSTOM_LIST' ? 'CUSTOM_FORM' : 'CHOOSER')}
          />
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id!}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        refreshing={loading}
        onRefresh={load}
        renderItem={({ item }) => {
          const created = toDateAny(item)?.toISOString?.().slice(0, 10) ?? '';
          return (
            <Card>
              <Text style={typography.h2}>{item.month || created}</Text>
              <Text style={typography.body}>
                {(item.amount + (item.bonus || 0)).toLocaleString()} AED • {item.method === 'cash' ? 'Cash' : 'Bank Transfer'}
              </Text>
              {!workerId && (
                <Text style={[typography.small, { marginTop: 4 }]}>
                  {displayWorkerName(item)}
                </Text>
              )}
            </Card>
          );
        }}
        ListEmptyComponent={
          <Card>
            <Text style={typography.body}>
              {workerId
                ? 'No payments recorded for this worker yet.'
                : 'No payments recorded yet.'}
            </Text>
          </Card>
        }
        contentContainerStyle={{ paddingBottom: 16 }}
      />
    </Screen>
  );
}
