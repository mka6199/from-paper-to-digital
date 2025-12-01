import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../../components/primitives/Button';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { useCurrency } from '../../context/CurrencyProvider';

type RouteTargets = {
  list: string;
  profile?: string;
  history?: string;
};

const DEFAULT_TARGETS: RouteTargets = {
  list: 'WorkersList',
  profile: 'WorkerProfile',
  history: 'PaymentHistory',
};

const resolveTargets = (navigation: any, overrides?: Partial<RouteTargets>): RouteTargets => {
  if (overrides) return { ...DEFAULT_TARGETS, ...overrides };
  const routeNames: string[] = navigation?.getState?.()?.routeNames ?? [];
  if (!routeNames.includes('WorkersList') && routeNames.includes('AdminWorkers')) {
    return {
      list: 'AdminWorkers',
      history: 'AdminPayments',
    };
  }
  return DEFAULT_TARGETS;
};

function hexToRgba(hex: string, alpha: number) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function PaymentConfirmationScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const { format } = useCurrency();

  const { workerId, workerName, amount, method, routeOverrides } = route.params || {};
  const amtAED = Number(amount || 0);
  const displayAmount = format(amtAED);
  const circleBg = hexToRgba(colors.brand, 0.18);
  const methodLabel = method === 'cash' ? 'Cash' : method === 'bank' ? 'Bank Transfer' : 'the selected method';

  const targets = React.useMemo(() => resolveTargets(navigation, routeOverrides), [navigation, routeOverrides]);
  
  const workerProfileParams =
    workerId
      ? {
          id: workerId,
          worker: workerName ? { id: workerId, name: workerName } : undefined,
        }
      : undefined;
  
  const resetTo = React.useCallback(
    (extraRoutes: Array<{ name?: string; params?: Record<string, any> | undefined }>) => {
      const routes = [{ name: targets.list }];
      extraRoutes.forEach((r) => {
        if (!r.name) return;
        routes.push({ name: r.name, params: r.params });
      });
      navigation.dispatch(
        CommonActions.reset({
          index: routes.length - 1,
          routes,
        })
      );
    },
    [navigation, targets]
  );
  
  const handleBackToWorker = React.useCallback(() => {
    const extras = targets.profile && workerProfileParams ? [{ name: targets.profile, params: workerProfileParams }] : [];
    resetTo(extras);
  }, [resetTo, targets.profile, workerProfileParams]);
  
  const handleViewHistory = React.useCallback(() => {
    const extras: Array<{ name?: string; params?: Record<string, any> | undefined }> = [];
    if (targets.profile && workerProfileParams) {
      extras.push({ name: targets.profile, params: workerProfileParams });
    }
    if (targets.history) {
      extras.push({ name: targets.history, params: workerId ? { workerId, workerName } : undefined });
    }
    resetTo(extras);
  }, [resetTo, targets.profile, targets.history, workerProfileParams, workerId, workerName]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={[styles.circle, { backgroundColor: circleBg }]}>
            <Text style={[styles.check, { color: colors.brand }]}>✓</Text>
          </View>

          <Text style={[typography.h1, { color: colors.text }]}>
            Success!
          </Text>

          <Text
            style={[
              typography.body,
              styles.message,
              { color: colors.subtext },
            ]}
          >
            Payment of {displayAmount} via {methodLabel}
            {workerName ? ` to ${workerName}` : ''}.
          </Text>
        </View>

        <View style={styles.buttons}>
          <Button
            label="Back to Worker"
            tone="green"
            onPress={handleBackToWorker}
            fullWidth
          />

          <Button
            label="View History"
            variant="soft"
            tone="green"
            onPress={handleViewHistory}
            fullWidth
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  check: {
    fontSize: 48,
  },
  message: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  buttons: {
    width: '100%',
    gap: spacing.md,
  },
});
