import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, Alert } from 'react-native';
import { getMonthlyStats } from '../../services/stats';
import { monthStartEnd, formatMoney } from '../../utils/date';

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

type Row = { label: string; value: string; };

export default function MonthlyReportScreen() {
  const [{ payrollOut, cashIn, net }, setStats] = useState({ payrollOut: 0, cashIn: 0, net: 0 });

  useEffect(() => {
    const { startMs, endMs } = monthStartEnd(new Date());
    getMonthlyStats(startMs, endMs).then(setStats).catch((e) => Alert.alert('Error', String(e)));
  }, []);

  const rows: Row[] = [
    { label: 'Cash In (month)', value: formatMoney(cashIn) },
    { label: 'Payroll Out (month)', value: formatMoney(payrollOut) },
    { label: 'Net (month)', value: formatMoney(net) },
  ];

  async function exportCSV() {
    try {
      const csv = `Metric,Value\nCash In,${cashIn}\nPayroll Out,${payrollOut}\nNet,${net}\n`;
      const FS: any = FileSystem;
      const baseDir: string = (FS.documentDirectory ?? FS.cacheDirectory ?? FS.temporaryDirectory ?? '');
      if (!baseDir) {
        Alert.alert('Export Error', 'No writable directory available on this platform.');
        return;
      }
      const path = baseDir + `monthly-report-${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(path, csv, { encoding: (FS.EncodingType?.UTF8 ?? 'utf8') as any });
      if (await (Sharing as any).isAvailableAsync()) {
        await (Sharing as any).shareAsync(path);
      } else {
        Alert.alert('Exported', 'CSV saved: ' + path);
      }
    } catch (e: any) {
      Alert.alert('Export Error', e.message ?? String(e));
    }
  }

  return (
    <View style={{ flex:1 }}>
      <View style={{ padding: 12 }}>
        <Button title="Export CSV" onPress={exportCSV} />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.label}
        renderItem={({ item }) => (
          <View style={{ padding: 16, borderBottomWidth:1, borderColor:'#eee', flexDirection:'row', justifyContent:'space-between' }}>
            <Text style={{ fontWeight:'600' }}>{item.label}</Text>
            <Text>{item.value}</Text>
          </View>
        )}
      />
    </View>
  );
}
