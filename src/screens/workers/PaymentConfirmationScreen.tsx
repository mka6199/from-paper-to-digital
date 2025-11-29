import React from 'react';
import { SafeAreaView, Text, View, StyleSheet } from 'react-native';
import { CommonActions } from '@react-navigation/native';

import Button from '../../components/primitives/Button';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { useCurrency } from '../../context/CurrencyProvider';

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

  const { workerId, workerName, amount, method } = route.params || {};
  const amtAED = Number(amount || 0);
  const displayAmount = format(amtAED);
  const circleBg = hexToRgba(colors.brand, 0.18);

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
            Payment of {displayAmount} via{' '}
            {method === 'cash' ? 'Cash' : 'Bank Transfer'}
            {workerName ? ` to ${workerName}` : ''}.
          </Text>
        </View>

        <View style={styles.buttons}>
          <Button
            label="Back to Worker"
            tone="green"
            onPress={() => {
              navigation.dispatch(
                CommonActions.reset({
                  index: 1,
                  routes: [
                    { name: 'WorkersList' },
                    {
                      name: 'WorkerProfile',
                      params: {
                        id: workerId,
                        worker: workerName
                          ? { id: workerId, name: workerName }
                          : undefined,
                      },
                    },
                  ],
                })
              );
            }}
            fullWidth
          />

          <Button
            label="View History"
            variant="soft"
            tone="green"
            onPress={() => {
              navigation.dispatch(
                CommonActions.reset({
                  index: 2,
                  routes: [
                    { name: 'WorkersList' },
                    {
                      name: 'WorkerProfile',
                      params: {
                        id: workerId,
                        worker: workerName
                          ? { id: workerId, name: workerName }
                          : undefined,
                      },
                    },
                    { name: 'PaymentHistory', params: { workerId, workerName } },
                  ],
                })
              );
            }}
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
