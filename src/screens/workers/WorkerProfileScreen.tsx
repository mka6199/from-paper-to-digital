// src/screens/workers/WorkerProfileScreen.tsx
import React from 'react';
import { Alert, Text, View, StyleSheet } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import { spacing, typography } from '../../theme/tokens';
import { getWorker } from '../../services/workers';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';

import { useCurrency } from '../../context/CurrencyProvider';

type WorkerLike = {
  id: string;
  name?: string;
  role?: string;
  monthlySalaryAED?: number;
  baseSalary?: number;
  salary?: number;
  avatarUrl?: string | null;

  isFormer?: boolean;
  status?: 'active' | 'former' | string;
};

const normalize = (raw: any): WorkerLike => ({
  id: raw?.id,
  name: raw?.name ?? raw?.fullName ?? raw?.displayName ?? '',
  role: raw?.role ?? raw?.job ?? '',
  monthlySalaryAED: Number(raw?.monthlySalaryAED ?? raw?.baseSalary ?? raw?.salary ?? 0),
  avatarUrl: raw?.avatarUrl ?? null,
  isFormer: raw?.isFormer ?? false,
  status: raw?.status,
});

const getMonthlySalary = (w?: WorkerLike | null) =>
  Number((w && (w.monthlySalaryAED ?? w.baseSalary ?? w.salary)) ?? 0);

const isFormerWorker = (w?: WorkerLike | null) =>
  !!(w && (w.isFormer || (w.status && String(w.status).toLowerCase() === 'former')));

const initials = (name?: string) =>
  (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

export default function WorkerProfileScreen({ navigation }: any) {
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { format } = useCurrency();

  const { id, worker: initialWorker } = (route?.params ?? {}) as {
    id: string;
    worker?: WorkerLike;
  };

  const [w, setW] = React.useState<WorkerLike | null>(
    initialWorker ? normalize(initialWorker) : null
  );

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

  React.useEffect(() => {
    const p: any = route?.params;
    if (p?.worker) setW(normalize(p.worker));
  }, [route?.params]);

  const monthly = getMonthlySalary(w);
  const salaryLabelFallback = monthly > 0 ? `${monthly.toLocaleString()} AED` : '— AED';
  const salaryLabelConverted = format(monthly) || salaryLabelFallback;

  const former = isFormerWorker(w);

  function onPay() {
    if (former) {
      Alert.alert(
        'Former worker',
        'This worker is marked as Former. Reactivate them to record new payments.'
      );
      return;
    }
    navigation.navigate('PaySalary', { workerId: id, id });
  }

  function onHistory() {
    navigation.navigate('PaymentHistory', {
      workerId: id,
      workerName: w?.name ?? '',
    });
  }

  function onEdit() {
    navigation.navigate('EditWorker', { workerId: id, id });
  }

  return (
    <Screen>
      <AppHeader title="Worker Profile" onBack={() => navigation.goBack()} />

      <Card
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.brand },
            ]}
          >
            <Text style={styles.avatarText}>{initials(w?.name) || '—'}</Text>
          </View>

          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={[typography.h2, { color: colors.text }]} numberOfLines={1}>
              {w?.name || '—'}
            </Text>
            {!!w?.role && (
              <Text style={[typography.small, { color: colors.subtext }]} numberOfLines={1}>
                {w.role}
              </Text>
            )}
          </View>

          <View
            style={[
              styles.badge,
              former
                ? { backgroundColor: '#EAB30822', borderColor: '#EAB308' } 
                : { backgroundColor: '#22C55E22', borderColor: '#22C55E' }, 
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: former ? '#EAB308' : '#22C55E' },
              ]}
            >
              {former ? 'Former' : 'Active'}
            </Text>
          </View>

          <Text style={[typography.small, { color: colors.subtext, marginTop: spacing.sm }]}>
            Monthly Salary: {salaryLabelConverted}
          </Text>
        </View>
      </Card>

      <View style={{ gap: spacing.sm, marginTop: spacing.lg, paddingHorizontal: spacing.lg }}>
        <Button
          label="Pay Salary"
          onPress={onPay}
          fullWidth
          size="sm"                
          density="compact"         
          disabled={former}         
        />
        <Button
          label="View History"
          variant="soft"
          onPress={onHistory}
          fullWidth
          size="sm"
          density="compact"
        />
        <Button
          label="Edit Info"
          variant="outline"
          onPress={onEdit}
          fullWidth
          size="sm"
          density="compact"
        />
      </View>
    </Screen>
  );
}

const AVATAR = 96;

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderRadius: 16,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 28,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
