import React, { useCallback, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import Screen from '../components/layout/Screen';
import AppHeader from '../components/layout/AppHeader';
import Card from '../components/primitives/Card';
import Button from '../components/primitives/Button';
import WorkerListItem from '../components/composites/WorkerListItem';
import StatusPill from '../components/feedback/StatusPill';

import { spacing, typography } from '../theme/tokens';
import { listWorkers, Worker } from '../services/workers';

function formatAED(n: number) {
  try {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${n.toLocaleString()} AED`;
  }
}

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await listWorkers();
      setWorkers(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh whenever this tab gains focus
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const count = workers.length;
  const totalMonthly = useMemo(
    () => workers.reduce((sum, w) => sum + (w.monthlySalaryAED || 0), 0),
    [workers]
  );

  // Placeholder logic: once payments are implemented, compute real paid/due
  const paidThisMonth = 0;
  const dueThisMonth = totalMonthly;

  const recent = useMemo(() => workers.slice(0, 5), [workers]);

  return (
    <Screen scroll padded>
      <AppHeader
        title="Welcome back, Mohamed"
        subtitle={loading ? 'Refreshing…' : 'Your snapshot for this month'}
      />

      {/* KPI row 1 */}
      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
        <Card style={{ flex: 1 }}>
          <Text style={typography.small}>Active workers</Text>
          <Text style={typography.h2}>{count}</Text>
        </Card>

        <Card style={{ flex: 1 }}>
          <Text style={typography.small}>Total monthly payroll</Text>
          <Text style={typography.h2}>{formatAED(totalMonthly)}</Text>
        </Card>
      </View>

      {/* KPI row 2 */}
      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
        <Card style={{ flex: 1 }}>
          <Text style={typography.small}>Paid this month</Text>
          <Text style={typography.h2}>{paidThisMonth ? formatAED(paidThisMonth) : '—'}</Text>
          <Text style={typography.small}>(payments coming soon)</Text>
        </Card>

        <Card style={{ flex: 1 }}>
          <Text style={typography.small}>Due this month</Text>
          <Text style={typography.h2}>{formatAED(dueThisMonth)}</Text>
        </Card>
      </View>

      <Button
        label="Manage Workers"
        onPress={() => navigation.navigate('Workers')}
        fullWidth
      />

      <View style={{ height: spacing.lg }} />

      {/* Recent workers */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.sm,
        }}
      >
        <Text style={typography.h2}>Recent workers</Text>
        <StatusPill status="due" /> {/* purely visual for now */}
      </View>

      {recent.map((w) => (
        <View key={w.id} style={{ marginBottom: spacing.sm }}>
          <WorkerListItem
            name={w.name}
            role={`${w.role} • ${w.monthlySalaryAED} AED`}
            onPress={() => navigation.navigate('Workers')}
            right={<StatusPill status="due" />}
          />
        </View>
      ))}
    </Screen>
  );
}
