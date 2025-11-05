import React from 'react';
import { Text, View } from 'react-native';
import Screen from '../../components/layout/Screen';
import Button from '../../components/primitives/Button';
import { spacing, typography } from '../../theme/tokens';
import { CommonActions } from '@react-navigation/native';
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
    <Screen>
      <View
        style={{
          alignItems: 'center',
          marginTop: spacing.xl,
          gap: spacing.md,
          paddingHorizontal: spacing.lg,
        }}
      >
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: circleBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 48, color: colors.brand }}>✓</Text>
        </View>

        <Text style={[typography.h1, { color: colors.text }]}>Success!</Text>

        <Text style={[typography.body, { color: colors.subtext, textAlign: 'center' }]}>
          Payment of {displayAmount} via {method === 'cash' ? 'Cash' : 'Bank Transfer'}
          {workerName ? ` to ${workerName}` : ''}.
        </Text>
      </View>

      <View style={{ marginTop: spacing.xl, gap: spacing.md, paddingHorizontal: spacing.lg }}>
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
                      worker: workerName ? { id: workerId, name: workerName } : undefined,
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
                      worker: workerName ? { id: workerId, name: workerName } : undefined,
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
    </Screen>
  );
}
