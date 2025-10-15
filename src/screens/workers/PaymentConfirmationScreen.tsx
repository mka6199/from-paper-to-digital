import React from 'react';
import { Text, View } from 'react-native';
import Screen from '../../components/layout/Screen';
import Button from '../../components/primitives/Button';
import { spacing, typography } from '../../theme/tokens';
import { CommonActions } from '@react-navigation/native';

export default function PaymentConfirmationScreen({ route, navigation }: any) {
  const { workerId, workerName, amount, method } = route.params || {};

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginTop: spacing.xl, gap: spacing.md }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#b5e3c7', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 48 }}>✓</Text>
        </View>
        <Text style={typography.h1}>Success!</Text>
        <Text style={typography.body}>
          Payment of {Number(amount || 0).toLocaleString()} AED via {method === 'cash' ? 'Cash' : 'Bank Transfer'}{workerName ? ` to ${workerName}` : ''}.
        </Text>
      </View>

      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
      <Button
        label="Back to Worker"
        tone="green"
        onPress={() => {
          // Reset stack to JUST WorkersList -> WorkerProfile
          navigation.dispatch(
            CommonActions.reset({
              index: 1,
              routes: [
                { name: 'WorkersList' },
                { name: 'WorkerProfile', params: { id: workerId, worker: workerName ? { id: workerId, name: workerName } : undefined } },
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
          // Reset stack to WorkersList -> WorkerProfile -> WorkerHistoryList (scoped)
          navigation.dispatch(
            CommonActions.reset({
              index: 2,
              routes: [
                { name: 'WorkersList' },
                { name: 'WorkerProfile', params: { id: workerId, worker: workerName ? { id: workerId, name: workerName } : undefined } },
                { name: 'WorkerHistoryList', params: { workerId, workerName } },
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
