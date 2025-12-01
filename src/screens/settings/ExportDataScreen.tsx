import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Switch,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import { spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { subscribeMyPaymentsInRange, monthRange } from '../../services/payments';
import { subscribeMyWorkers } from '../../services/workers';
import { exportPayments, ExportOptions } from '../../services/export';
import { showAlert } from '../../utils/alert';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCurrency } from '../../context/CurrencyProvider';
import AppHeader from '../../components/layout/AppHeader';
import { getContentBottomPadding } from '../../utils/layout';

type ExportFormat = 'csv' | 'xlsx' | 'json' | 'pdf' | 'txt';
type GroupBy = 'none' | 'worker' | 'date';

type FormatInfo = {
  icon: keyof typeof Ionicons.glyphMap;
  name: string;
  description: string;
};

const FORMAT_INFO: Record<ExportFormat, FormatInfo> = {
  csv: {
    icon: 'document-text-outline',
    name: 'CSV',
    description: 'Spreadsheet format, opens in Excel',
  },
  xlsx: {
    icon: 'grid-outline',
    name: 'Excel',
    description: 'Microsoft Excel format (.xlsx)',
  },
  json: {
    icon: 'code-outline',
    name: 'JSON',
    description: 'Data format for developers',
  },
  pdf: {
    icon: 'document-outline',
    name: 'PDF',
    description: 'Printable document format',
  },
  txt: {
    icon: 'reader-outline',
    name: 'Text',
    description: 'Plain text, human-readable',
  },
};

const FORMAT_ORDER: ExportFormat[] = ['csv', 'xlsx', 'json', 'pdf', 'txt'];

export default function ExportDataScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { currency, format: fmtCurrency, convertFromAED, symbols } = useCurrency();
  const { width } = useWindowDimensions();

  const [format, setFormat] = useState<ExportFormat>('csv');
  const [startDate, setStartDate] = useState(() => monthRange().start);
  const [endDate, setEndDate] = useState(() => monthRange().end);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [showWorkerFilter, setShowWorkerFilter] = useState(false);

  const [includeTotal, setIncludeTotal] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupBy>('none');

  const [exporting, setExporting] = useState(false);

  // Responsive card widths
  const columns = width >= 700 ? 3 : 2;
  const cardWidth = columns === 3 ? '32%' : '48.5%';

  useEffect(() => {
    const unsub = subscribeMyWorkers((list) => setWorkers(list));
    return unsub;
  }, []);

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const handleStartDatePress = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'date';
      input.value = startDate.toISOString().split('T')[0];
      input.style.position = 'absolute';
      input.style.opacity = '0';
      input.style.pointerEvents = 'none';
      document.body.appendChild(input);
      
      input.onchange = (e: any) => {
        const selected = new Date(e.target.value + 'T00:00:00');
        setStartDate(selected);
        document.body.removeChild(input);
      };
      
      input.onblur = () => {
        setTimeout(() => {
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
        }, 100);
      };
      
      input.focus();
      input.click();
      input.showPicker?.();
    } else {
      setShowStartPicker(true);
    }
  };

  const handleEndDatePress = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'date';
      input.value = endDate.toISOString().split('T')[0];
      input.style.position = 'absolute';
      input.style.opacity = '0';
      input.style.pointerEvents = 'none';
      document.body.appendChild(input);
      
      input.onchange = (e: any) => {
        const selected = new Date(e.target.value + 'T00:00:00');
        setEndDate(selected);
        document.body.removeChild(input);
      };
      
      input.onblur = () => {
        setTimeout(() => {
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
        }, 100);
      };
      
      input.focus();
      input.click();
      input.showPicker?.();
    } else {
      setShowEndPicker(true);
    }
  };

  const toggleWorker = (workerId: string) => {
    setSelectedWorkers((prev) =>
      prev.includes(workerId) ? prev.filter((id) => id !== workerId) : [...prev, workerId]
    );
  };

  const selectAllWorkers = () => setSelectedWorkers(workers.map((w) => w.id));
  const clearWorkerSelection = () => setSelectedWorkers([]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const payments = await new Promise<any[]>((resolve, reject) => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            reject(new Error('Timeout loading payments'));
          }
        }, 15000);

        const unsub = subscribeMyPaymentsInRange(
          { start: startDate, end: endDate },
          (list) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              unsub();
              resolve(list);
            }
          }
        );
      });

      if (!payments || payments.length === 0) {
        showAlert('No Data', 'No payments found for the selected date range.');
        setExporting(false);
        return;
      }

      const options: ExportOptions = {
        startDate,
        endDate,
        format,
        workerIds:
          showWorkerFilter && selectedWorkers.length > 0 ? selectedWorkers : undefined,
        includeTotal,
        groupBy,
        currencyCode: currency,
        currencySymbol: symbols[currency],
        formatCurrency: (amountAED: number) => fmtCurrency(amountAED),
        convertFromAED: (amountAED: number) => convertFromAED(amountAED),
      };

      await exportPayments(payments, options);
      showAlert('Export Successful', `Your ${FORMAT_INFO[format].name} file has been created!`);
    } catch (error: any) {
      showAlert('Export Failed', error?.message || String(error));
    } finally {
      setExporting(false);
    }
  };

  const styles = StyleSheet.create({
    scrollView: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing['2xl'],
      paddingTop: spacing.md,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.sm,
    },
    sectionDescription: {
      fontSize: 14,
      color: colors.subtext,
      marginBottom: spacing.md,
    },
    segment: {
      flexDirection: 'row',
      borderRadius: 12,
      borderWidth: 1,
      padding: 4,
      gap: 4,
      marginBottom: spacing.sm,
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
    dateRow: {
      flexDirection: 'row',
      marginHorizontal: -spacing.xs / 2,
    },
    dateCard: {
      flex: 1,
      marginHorizontal: spacing.xs / 2,
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      backgroundColor: colors.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dateLabel: {
      fontSize: 12,
      color: colors.subtext,
      marginBottom: 4,
    },
    dateValue: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '600',
    },
    filterToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      backgroundColor: colors.card,
      borderRadius: 8,
      marginBottom: spacing.sm,
    },
    filterToggleText: {
      fontSize: 16,
      color: colors.text,
    },
    workerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.sm,
      marginBottom: spacing.xs,
      backgroundColor: colors.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    workerItemSelected: {
      borderColor: colors.brand,
      backgroundColor: colors.brand + '10',
    },
    workerName: {
      fontSize: 14,
      color: colors.text,
    },
    workerActions: {
      flexDirection: 'row',
      marginBottom: spacing.md,
    },
    smallButton: {
      flex: 1,
      marginHorizontal: spacing.xs / 2,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    smallButtonText: {
      fontSize: 12,
      color: colors.text,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      backgroundColor: colors.card,
      borderRadius: 8,
      marginBottom: spacing.sm,
    },
    optionLabel: {
      fontSize: 16,
      color: colors.text,
    },
    optionDescription: {
      fontSize: 12,
      color: colors.subtext,
      marginTop: 2,
    },
    groupByButtons: {
      flexDirection: 'row',
    },
    groupByButton: {
      flex: 1,
      marginHorizontal: spacing.xs / 2,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: 'transparent',
      alignItems: 'center',
    },
    groupByButtonSelected: {
      borderColor: colors.brand,
      backgroundColor: colors.brand + '10',
    },
    groupByButtonText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '600',
    },
    exportButton: {
      marginTop: spacing.lg,
      marginBottom: spacing.xl,
    },
    summary: {
      padding: spacing.md,
      backgroundColor: colors.brand + '10',
      borderRadius: 8,
      marginBottom: spacing.lg,
    },
    summaryText: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 4,
    },
  });

  const workerCountText =
    showWorkerFilter && selectedWorkers.length > 0
      ? `${selectedWorkers.length} selected`
      : 'All workers';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader
        title="Export Payment History"
        transparent
        noBorder
      />
      <ScrollView 
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: getContentBottomPadding(),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Format Selection */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
            Export Format
          </Text>
          <Text style={{ fontSize: 14, color: colors.subtext, marginBottom: 12 }}>
            Choose the file format for your export
          </Text>
          <View
            style={[
              styles.segment,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {FORMAT_ORDER.map((key) => {
              const selected = format === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setFormat(key)}
                  style={[
                    styles.segmentItem,
                    selected && { backgroundColor: colors.brand },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentLabel,
                      { color: selected ? '#fff' : colors.text },
                    ]}
                  >
                    {FORMAT_INFO[key].name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Date Range */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
            Date Range
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.subtext, marginBottom: 4 }}>From</Text>
              <Pressable
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
                onPress={handleStartDatePress}
              >
                <Text style={{ fontSize: 16, color: colors.text, fontWeight: '600' }}>
                  {formatDate(startDate)}
                </Text>
              </Pressable>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.subtext, marginBottom: 4 }}>To</Text>
              <Pressable
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
                onPress={handleEndDatePress}
              >
                <Text style={{ fontSize: 16, color: colors.text, fontWeight: '600' }}>
                  {formatDate(endDate)}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Worker Filter */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
            Worker Filter
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: colors.card, borderRadius: 8, marginBottom: 8 }}>
            <Text style={{ fontSize: 16, color: colors.text }}>
              Filter by workers ({workerCountText})
            </Text>
            <Switch
              value={showWorkerFilter}
              onValueChange={setShowWorkerFilter}
              trackColor={{ false: colors.border, true: colors.brand }}
            />
          </View>
          {showWorkerFilter && workers.length > 0 && (
            <View style={{ marginTop: 8 }}>
              {workers.map((worker) => (
                <Pressable
                  key={worker.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 8,
                    marginBottom: 4,
                    backgroundColor: selectedWorkers.includes(worker.id) ? colors.brand + '10' : colors.card,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: selectedWorkers.includes(worker.id) ? colors.brand : colors.border,
                  }}
                  onPress={() => toggleWorker(worker.id)}
                >
                  <Text style={{ fontSize: 14, color: colors.text }}>{worker.name}</Text>
                  {selectedWorkers.includes(worker.id) && (
                    <Text style={{ color: colors.brand }}>✓</Text>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Options */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
            Options
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: colors.card, borderRadius: 8, marginBottom: 8 }}>
            <Text style={{ fontSize: 16, color: colors.text }}>Include Totals</Text>
            <Switch
              value={includeTotal}
              onValueChange={setIncludeTotal}
              trackColor={{ false: colors.border, true: colors.brand }}
            />
          </View>
          <Text style={{ fontSize: 16, color: colors.text, marginBottom: 8 }}>Group By</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['none', 'worker', 'date'] as GroupBy[]).map((group) => (
              <Pressable
                key={group}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  backgroundColor: groupBy === group ? colors.brand + '10' : colors.card,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: groupBy === group ? colors.brand : 'transparent',
                  alignItems: 'center',
                }}
                onPress={() => setGroupBy(group)}
              >
                <Text style={{ fontSize: 16, color: colors.text, fontWeight: '600' }}>
                  {group === 'none' ? 'None' : group === 'worker' ? 'Worker' : 'Date'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Export Button */}
        <Pressable
          onPress={handleExport}
          disabled={exporting}
          style={{
            backgroundColor: exporting ? colors.border : colors.brand,
            padding: 16,
            borderRadius: 8,
            alignItems: 'center',
            marginBottom: 40,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
            {exporting ? 'Exporting...' : 'Export Data'}
          </Text>
        </Pressable>

        {exporting && <ActivityIndicator size="large" color={colors.brand} />}
      </ScrollView>

      {/* Date Pickers */}
      {Platform.OS === 'ios' && showStartPicker && (
        <Modal transparent animationType="slide" visible={showStartPicker}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={{ backgroundColor: colors.background, paddingBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Pressable onPress={() => setShowStartPicker(false)}>
                  <Text style={{ color: colors.brand, fontSize: 16 }}>Cancel</Text>
                </Pressable>
                <Pressable onPress={() => setShowStartPicker(false)}>
                  <Text style={{ color: colors.brand, fontSize: 16, fontWeight: '600' }}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={startDate}
                mode="date"
                display="spinner"
                onChange={(event, date) => {
                  if (date) setStartDate(date);
                }}
                textColor={colors.text}
              />
            </View>
          </View>
        </Modal>
      )}
      {Platform.OS === 'android' && showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowStartPicker(false);
            if (date) setStartDate(date);
          }}
        />
      )}
      {Platform.OS === 'ios' && showEndPicker && (
        <Modal transparent animationType="slide" visible={showEndPicker}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={{ backgroundColor: colors.background, paddingBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Pressable onPress={() => setShowEndPicker(false)}>
                  <Text style={{ color: colors.brand, fontSize: 16 }}>Cancel</Text>
                </Pressable>
                <Pressable onPress={() => setShowEndPicker(false)}>
                  <Text style={{ color: colors.brand, fontSize: 16, fontWeight: '600' }}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={endDate}
                mode="date"
                display="spinner"
                onChange={(event, date) => {
                  if (date) setEndDate(date);
                }}
                textColor={colors.text}
              />
            </View>
          </View>
        </Modal>
      )}
      {Platform.OS === 'android' && showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowEndPicker(false);
            if (date) setEndDate(date);
          }}
        />
      )}
    </SafeAreaView>
  );
}
