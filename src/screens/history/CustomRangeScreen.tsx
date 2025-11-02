import React from 'react';
import { View, Text } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import Card from '../../components/primitives/Card';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import { spacing, typography } from '../../theme/tokens';

function parseYMD(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
  const dt = new Date(y, mo, d, 0, 0, 0, 0);
  return isNaN(dt.getTime()) ? null : dt;
}

export default function CustomRangeScreen({ route, navigation }: any) {
  const p = (route?.params ?? {}) as { startISO?: string; endISO?: string };
  const [startTxt, setStartTxt] = React.useState(p.startISO ? p.startISO.slice(0, 10) : '');
  const [endTxt, setEndTxt] = React.useState(p.endISO ? p.endISO.slice(0, 10) : '');

  function onApply() {
    const s = parseYMD(startTxt);
    const e = parseYMD(endTxt);
    if (!s || !e || s > e) {
      alert('Please enter a valid range in YYYY-MM-DD format.');
      return;
    }
    navigation.navigate({
      name: 'HistoryHome',
      params: { monthStart: s.toISOString(), monthEnd: e.toISOString() },
      merge: true,
    });
    navigation.goBack();
  }

  return (
    <Screen scroll padded>
      <AppHeader title="Custom Range" onBack={() => navigation.goBack()} />
      <Card>
        <View style={{ gap: spacing.md }}>
          <Text style={typography.small}>Enter dates as YYYY-MM-DD</Text>
          <TextField
            label="Start date"
            value={startTxt}
            onChangeText={setStartTxt}
            placeholder="e.g., 2025-07-01"
          />
          <TextField
            label="End date"
            value={endTxt}
            onChangeText={setEndTxt}
            placeholder="e.g., 2025-10-22"
          />
        </View>
      </Card>

      <View style={{ height: spacing.lg }} />
      <Button label="Apply range" tone="green" onPress={onApply} fullWidth />
    </Screen>
  );
}
