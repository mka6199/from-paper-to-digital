import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Platform,
  Modal,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/layout/Screen';
import Card from '../../components/primitives/Card';
import { showAlert } from '../../utils/alert';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import { spacing, typography } from '../../theme/tokens';
import {
  Payment,
  subscribeMyPaymentsInRange,
  rangeLast3Months,
  rangeThisYear,
  monthRange,
} from '../../services/payments';
import { subscribePayRuns, PayRun } from '../../services/payruns';
import { useTheme } from '../../theme/ThemeProvider';
import { useCurrency } from '../../context/CurrencyProvider';
import { logger } from '../../utils/logger';
import { getContentBottomPadding } from '../../utils/layout';

type RangePreset = 'thisMonth' | 'last3' | 'thisYear' | 'custom';

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function HistoryHomeScreen() {
  const { colors } = useTheme();
  const { format } = useCurrency();
  const { width } = useWindowDimensions();

  const [preset, setPreset] = React.useState<RangePreset>('thisMonth');
  const [start, setStart] = React.useState<Date>(monthRange().start);
  const [end, setEnd] = React.useState<Date>(monthRange().end);
  const [showCustomModal, setShowCustomModal] = React.useState(false);
  const [tempStart, setTempStart] = React.useState<Date>(monthRange().start);
  const [tempEnd, setTempEnd] = React.useState<Date>(monthRange().end);

  const [rows, setRows] = React.useState<Payment[]>([]);
  const [ready, setReady] = React.useState(false);
  const [workerQuery, setWorkerQuery] = React.useState('');
  const [pickerTarget, setPickerTarget] = React.useState<'start' | 'end' | null>(null);
  
  const [payRuns, setPayRuns] = React.useState<PayRun[]>([]);

  // Auto-update range when preset changes
  React.useEffect(() => {
    if (preset === 'thisMonth') {
      const r = monthRange();
      setStart(r.start);
      setEnd(r.end);
    } else if (preset === 'last3') {
      const r = rangeLast3Months();
      setStart(r.start);
      setEnd(r.end);
    } else if (preset === 'thisYear') {
      const r = rangeThisYear();
      setStart(r.start);
      setEnd(r.end);
    }
    // custom preset keeps manually selected dates
  }, [preset]);

  const openCustomDatePicker = () => {
    setTempStart(start);
    setTempEnd(end);
    setShowCustomModal(true);
  };

  const applyCustomRange = () => {
    if (tempStart > tempEnd) {
      showAlert('Invalid Range', 'Start date must be before end date.');
      return;
    }
    setStart(tempStart);
    setEnd(tempEnd);
    setPreset('custom');
    setShowCustomModal(false);
  };

  const selectDate = (type: 'start' | 'end') => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'date';
      input.value = ymd(type === 'start' ? tempStart : tempEnd);
      input.style.position = 'absolute';
      input.style.opacity = '0';
      input.style.pointerEvents = 'none';
      document.body.appendChild(input);
      
      input.onchange = (e: any) => {
        const selected = new Date(e.target.value + 'T00:00:00');
        if (type === 'start') {
          setTempStart(selected);
        } else {
          setTempEnd(selected);
        }
        document.body.removeChild(input);
      };
      
      input.onblur = () => {
        document.body.removeChild(input);
      };
      
      input.focus();
      input.click();
      input.showPicker?.();
      return;
    }

    setPickerTarget(type);
  };

  const handleNativeConfirm = (date: Date) => {
    if (!pickerTarget) return;
    if (pickerTarget === 'start') {
      setTempStart(date);
    } else {
      setTempEnd(date);
    }
    setPickerTarget(null);
  };

  const handleNativeCancel = () => {
    setPickerTarget(null);
  };

  // Subscribe to payments in current range
  React.useEffect(() => {
    let unsub: (() => void) | null = null;
    try {
      unsub = subscribeMyPaymentsInRange({ start, end }, (list) => {
        setRows(list);
        setReady(true);
      });
    } catch (e) {
      logger.warn('History subscribe failed:', e);
      setReady(true);
    }
    return () => {
      if (unsub) unsub();
    };
  }, [start.getTime(), end.getTime()]);

  // Subscribe to pay runs
  React.useEffect(() => {
    let unsub: (() => void) | null = null;
    try {
      unsub = subscribePayRuns((runs) => {
        setPayRuns(runs);
      });
    } catch (e) {
      logger.warn('Pay runs subscribe failed:', e);
    }
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Filter payments by worker query
  const filtered = React.useMemo(() => {
    const q = workerQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (p) =>
        String(p.workerName ?? '').toLowerCase().includes(q) ||
        String(p.workerId ?? '').toLowerCase().includes(q)
    );
  }, [rows, workerQuery]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const totalPaid = filtered.reduce(
      (sum, p) => sum + Number(p.amount ?? 0) + Number(p.bonus ?? 0),
      0
    );

    // Top workers
    const workerMap = new Map<string, { total: number; count: number }>();
    filtered.forEach((p) => {
      const name = p.workerName || p.workerId || 'Unknown';
      const amt = Number(p.amount || 0) + Number(p.bonus || 0);
      const existing = workerMap.get(name) || { total: 0, count: 0 };
      workerMap.set(name, { total: existing.total + amt, count: existing.count + 1 });
    });
    const topWorkers = Array.from(workerMap.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 3);

    return { totalPaid, topWorkers };
  }, [filtered]);

  // Group payments by date
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

  const isWide = width > 768;

  const Header = (
    <View style={{ paddingBottom: spacing.md }}>
      <Text style={[typography.h1, { color: colors.text, marginBottom: spacing.md }]}>
        Payment History
      </Text>

      {/* Range Selector */}
      <View
        style={[
          styles.segment,
          { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: spacing.md },
        ]}
      >
        {(['thisMonth', 'last3', 'thisYear', 'custom'] as RangePreset[]).map((k) => {
          const active = preset === k;
          const label =
            k === 'thisMonth' ? 'This Month' : k === 'last3' ? 'Last 3 Mo' : k === 'thisYear' ? 'This Year' : 'Custom';
          return (
            <Pressable
              key={k}
              onPress={() => {
                if (k === 'custom') {
                  openCustomDatePicker();
                } else {
                  setPreset(k);
                }
              }}
              style={[
                styles.segmentItem,
                active && { backgroundColor: colors.brand },
              ]}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  { color: active ? '#fff' : colors.text },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Summary Stats Row */}
      <View
        style={{ flexDirection: isWide ? 'row' : 'column', gap: spacing.md, marginBottom: spacing.md }}
      >
        <View style={{ flex: 1 }}>
          <Card style={styles.statCard}>
            <Ionicons name="wallet-outline" size={24} color={colors.brand} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.small, { color: colors.subtext, marginBottom: 2 }]}>
                Total Paid
              </Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {format(stats.totalPaid)}
              </Text>
            </View>
          </Card>
        </View>
        <View style={{ flex: 1 }}>
          <Card style={styles.statCard}>
            <Ionicons name="receipt-outline" size={24} color={colors.brand} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.small, { color: colors.subtext, marginBottom: 2 }]}>
                Payments
              </Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{filtered.length}</Text>
            </View>
          </Card>
        </View>
      </View>

      {/* Worker Filter */}
      <TextField
        label="Search by worker"
        value={workerQuery}
        onChangeText={setWorkerQuery}
        placeholder="Worker name or ID..."
      />

      {/* Pay Runs Section */}
      {payRuns.length > 0 && (
        <View style={{ marginTop: spacing.lg }}>
          <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.sm }]}>
            Recent Pay Runs
          </Text>
          {payRuns.slice(0, 3).map((run) => {
            const createdDate = run.createdAt?.toDate?.() ?? null;
            const dateStr = createdDate
              ? createdDate.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : '—';
            return (
              <Card
                key={run.id}
                style={{
                  padding: spacing.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  marginBottom: spacing.sm,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.body, { fontWeight: '700', color: colors.text }]}>
                      Pay Run • {dateStr}
                    </Text>
                    <Text style={[typography.small, { color: colors.subtext }]}>
                      {run.workerCount} worker{run.workerCount === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <Text style={[typography.h2, { color: colors.brand }]}>
                    {format(run.totalAmount)}
                  </Text>
                </View>
              </Card>
            );
          })}
        </View>
      )}

      {/* Date Range Display */}
      <Text
        style={[
          typography.small,
          { color: colors.subtext, textAlign: 'center', marginTop: spacing.md },
        ]}
      >
        {start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} —{' '}
        {end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
      </Text>
    </View>
  );

  // Flatten groups into single list with headers
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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            marginTop: spacing.lg,
            marginBottom: spacing.sm,
          }}
        >
          <Ionicons name="calendar-outline" size={16} color={colors.subtext} />
          <Text style={[typography.h2, { color: colors.text }]}>{item.payload}</Text>
        </View>
      );
    }
    const p: Payment = item.payload;
    const d = p.paidAt?.toDate ? p.paidAt.toDate() : null;
    const time = d
      ? `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
      : '—';
    const amount = Number(p.amount ?? 0) + Number(p.bonus ?? 0);

    return (
      <Card
        style={[
          styles.paymentCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.rowTop}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={[typography.body, { color: colors.text, fontWeight: '600' }]}
              numberOfLines={1}
            >
              {p.workerName ?? p.workerId}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Ionicons name="time-outline" size={14} color={colors.subtext} />
              <Text style={[typography.small, { color: colors.subtext }]}>{time}</Text>
              <Text style={[typography.small, { color: colors.subtext }]}>•</Text>
              <Ionicons name="card-outline" size={14} color={colors.subtext} />
              <Text style={[typography.small, { color: colors.subtext }]}>
                {p.method ?? '—'}
              </Text>
            </View>
          </View>
          <Text style={[styles.paymentAmount, { color: colors.brand }]}>{format(amount)}</Text>
        </View>
        {!!p.note && (
          <View
            style={{
              marginTop: spacing.xs,
              paddingTop: spacing.xs,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Text style={[typography.small, { color: colors.text, fontStyle: 'italic' }]}>
              {p.note}
            </Text>
          </View>
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
            <View style={{ alignItems: 'center', paddingVertical: spacing['2xl'] }}>
              <Ionicons
                name="receipt-outline"
                size={64}
                color={colors.subtext}
                style={{ opacity: 0.3 }}
              />
              <Text style={[typography.h2, { color: colors.text, marginTop: spacing.md }]}>
                No Payments
              </Text>
              <Text
                style={[
                  typography.small,
                  { color: colors.subtext, textAlign: 'center', marginTop: spacing.xs },
                ]}
              >
                No payment records found in this date range.
              </Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: spacing['2xl'] }}>
              <Text style={[typography.small, { color: colors.subtext }]}>Loading...</Text>
            </View>
          )
        }
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: getContentBottomPadding(),
          paddingTop: spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      />

      {/* Custom Date Range Modal */}
      <Modal
        visible={showCustomModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustomModal(false)}
        presentationStyle="overFullScreen"
        hardwareAccelerated
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCustomModal(false)}
        >
          {!pickerTarget && (
            <Pressable
              style={[styles.modalContent, { backgroundColor: colors.surface }]}
              onPress={(e) => e.stopPropagation()}
            >
            <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.lg }]}>
              Select Date Range
            </Text>

            {/* Start Date */}
            <View style={{ marginBottom: spacing.md }}>
              <Text style={[typography.small, { color: colors.subtext, marginBottom: spacing.xs }]}>
                Start Date
              </Text>
              <Pressable
                onPress={() => selectDate('start')}
                style={[
                  styles.dateButton,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.brand} />
                <Text style={[typography.body, { color: colors.text, flex: 1 }]}>
                  {tempStart.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.subtext} />
              </Pressable>
            </View>

            {/* End Date */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={[typography.small, { color: colors.subtext, marginBottom: spacing.xs }]}>
                End Date
              </Text>
              <Pressable
                onPress={() => selectDate('end')}
                style={[
                  styles.dateButton,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.brand} />
                <Text style={[typography.body, { color: colors.text, flex: 1 }]}>
                  {tempEnd.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.subtext} />
              </Pressable>
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Cancel"
                  variant="outline"
                  onPress={() => setShowCustomModal(false)}
                  fullWidth
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Apply" onPress={applyCustomRange} fullWidth />
              </View>
            </View>
          </Pressable>
          )}
        </Pressable>
      </Modal>

      {Platform.OS !== 'web' && (
        <DateTimePickerModal
          isVisible={!!pickerTarget}
          mode="date"
          date={pickerTarget === 'end' ? tempEnd : tempStart}
          onConfirm={handleNativeConfirm}
          onCancel={handleNativeCancel}
          display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  paymentCard: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
});
