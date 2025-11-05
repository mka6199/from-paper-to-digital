// WorkerProfileScreen.tsx (theme-aware)
import React from 'react';
import { Text, View } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import { spacing, typography } from '../../theme/tokens';
import { getWorker } from '../../services/workers';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';

// ✅ ADDED currency (without removing your original salary logic)
import { useCurrency } from '../../context/CurrencyProvider';

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
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { format } = useCurrency(); // ✅ ADDED

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
  const salaryLabel = monthly > 0 ? `${monthly.toLocaleString()} AED` : '— AED'; // (kept)
  const salaryLabelConverted = format(monthly); // ✅ ADDED

  return (
    <Screen>
      <AppHeader title="Worker Profile" onBack={() => navigation.goBack()} />

      <Card>
        <View style={{ alignItems: 'center', gap: spacing.md, padding: spacing.lg }}>
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

          <Text style={[typography.h2, { color: colors.text }]}>
            {w?.name || '—'}
          </Text>
          {!!w?.role && (
            <Text style={[typography.small, { color: colors.subtext }]}>
              {w.role}
            </Text>
          )}
          <Text
            style={[
              typography.small,
              { color: colors.subtext, marginTop: spacing.sm },
            ]}
          >
            {/* show converted first, but keep your original label as fallback */}
            Monthly Salary: {salaryLabelConverted || salaryLabel} {/* ✅ ADDED */}
          </Text>
        </View>
      </Card>

      <View style={{ gap: spacing.md, marginTop: spacing.lg, paddingHorizontal: spacing.lg }}>
        <Button
          label="Pay Salary"
          onPress={() => navigation.navigate('PaySalary', { workerId: id, id })}
          fullWidth
        />
        <Button
          label="View History"
          variant="soft"
          onPress={() =>
            navigation.navigate('PaymentHistory', {
              workerId: id,
              workerName: w?.name ?? '',
            })
          }
          fullWidth
        />
        <Button
          label="Edit Info"
          variant="outline"
          onPress={() => navigation.navigate('EditWorker', { workerId: id, id })}
          fullWidth
        />
      </View>
    </Screen>
  );
}
