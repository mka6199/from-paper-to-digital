// src/screens/workers/WorkerProfileScreen.tsx
import React from 'react';
import { Text, View } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import { colors, spacing, typography } from '../../theme/tokens';
import { getWorker } from '../../services/workers';
import { useFocusEffect, useRoute } from '@react-navigation/native';

type WorkerLike = {
  id: string;
  name?: string;
  role?: string;
  monthlySalaryAED?: number;
  baseSalary?: number;
  salary?: number;
  avatarUrl?: string | null;
};

const normalize = (raw: any): WorkerLike => ({
  id: raw?.id,
  name: raw?.name ?? raw?.fullName ?? raw?.displayName ?? '',
  role: raw?.role ?? raw?.job ?? '',
  monthlySalaryAED: Number(raw?.monthlySalaryAED ?? raw?.baseSalary ?? raw?.salary ?? 0),
  avatarUrl: raw?.avatarUrl ?? null,
});

const getMonthlySalary = (w?: WorkerLike | null) =>
  Number((w && (w.monthlySalaryAED ?? w.baseSalary ?? w.salary)) ?? 0);

const initials = (name?: string) =>
  (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

export default function WorkerProfileScreen({ navigation }: any) {
  // ✅ Hooks must be INSIDE the function component and not in conditionals
  const route = useRoute<any>();
  const { id, worker: initialWorker } = (route?.params ?? {}) as {
    id: string;
    worker?: WorkerLike;
  };

  const [w, setW] = React.useState<WorkerLike | null>(
    initialWorker ? normalize(initialWorker) : null
  );

  // 🔁 Refresh data every time this screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const fresh = await getWorker(id);
          if (!cancelled && fresh) setW(normalize({ id, ...(fresh as any) }));
        } catch (e) {
          console.warn('getWorker failed:', e);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [id])
  );

  // ⚡ Instant update when Edit screen sends new params (optimistic update)
  React.useEffect(() => {
    if ((route?.params as any)?.worker) {
      setW(normalize((route.params as any).worker));
    }
  }, [route?.params]);

  const monthly = getMonthlySalary(w);
  const salaryLabel = monthly > 0 ? `${monthly.toLocaleString()} AED` : '— AED';

  return (
    <Screen>
      <AppHeader title="Worker Profile" onBack={() => navigation.goBack()} />

      <Card>
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          {/* initials badge only */}
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.brand,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 28 }}>
              {initials(w?.name) || '—'}
            </Text>
          </View>

          <Text style={typography.h2}>{w?.name || '—'}</Text>
          {!!w?.role && <Text style={typography.small}>{w.role}</Text>}
          <Text style={[typography.small, { color: colors.subtext, marginTop: spacing.sm }]}>
            Monthly Salary: {salaryLabel}
          </Text>
        </View>
      </Card>

      <View style={{ gap: 12, marginTop: 16 }}>
        <Button
          label="Pay Salary"
          tone="green"
          onPress={() => navigation.navigate('PaySalary', { id })}
        />
        <Button
          label="View History"
          variant="soft"
          tone="green"
          onPress={() => navigation.navigate('WorkerHistoryList', { workerId: id, workerName: w?.name ?? '' })}
        />
        <Button
          label="Edit Info"
          variant="outline"
          tone="green"
          onPress={() => navigation.navigate('EditWorker', { id })}
        />
      </View>
    </Screen>
  );
}
