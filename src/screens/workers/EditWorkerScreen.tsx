import React, { useEffect, useState } from 'react';
import { Alert, View, Text, Platform } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import { spacing } from '../../theme/tokens';
import { subscribeWorker, updateWorker } from '../../services/workers';
import { CommonActions } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';

export default function EditWorkerScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const { workerId, id } = route.params || {};
  const effectiveId = id ?? workerId;

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [salary, setSalary] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'former'>('active');

  useEffect(() => {
    if (!effectiveId) return;
    const unsub = subscribeWorker(effectiveId, (w) => {
      if (!w) return;
      setName(w.name ?? '');
      setRole(w.role ?? '');
      const s = Number(w.monthlySalaryAED ?? w.baseSalary ?? 0);
      setSalary(s ? String(s) : '');
      setStatus((w.status as any) ?? 'active');
    });
    return () => unsub && unsub();
  }, [effectiveId]);

  function parseSalary(v: string) {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : NaN;
  }

  async function onSave() {
    const salaryNum = parseSalary(salary);
    if (!name.trim()) return Alert.alert('Name is required');
    if (!role.trim()) return Alert.alert('Role is required');
    if (!Number.isFinite(salaryNum)) return Alert.alert('Monthly salary must be a non-negative number');

    try {
      await updateWorker(effectiveId, {
        name: name.trim(),
        role: role.trim(),
        monthlySalaryAED: salaryNum,
      });

      const updated = { id: effectiveId, name: name.trim(), role: role.trim(), monthlySalaryAED: salaryNum };

      const state = navigation.getState();
      const prev = state.routes[state.index - 1];
      if (prev) {
        navigation.dispatch({
          ...CommonActions.setParams({
            params: { id: effectiveId, worker: updated, _ts: Date.now() },
          }),
          source: prev.key,
        });
      }

      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Update failed', e?.message ?? 'Please try again.');
    }
  }

  /**
   * Confirmation helper:
   * - On web: run the action immediately (no popup).
   * - On native: show a confirmation Alert.
   */
  function confirmOrRun(onYes: () => void, title: string, msg: string) {
    if (Platform.OS === 'web') {
      onYes();
      return;
    }
    Alert.alert(title, msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', style: 'destructive', onPress: onYes },
    ]);
  }

  async function markFormer() {
    confirmOrRun(
      async () => {
        try {
          await updateWorker(effectiveId, { status: 'former', terminatedAt: new Date() as any });
          setStatus('former');
        } catch (e: any) {
          Alert.alert('Action failed', e?.message ?? 'Could not update status.');
        }
      },
      'Mark as Former',
      'This will move the worker into Former status. They will stop appearing in Active lists.'
    );
  }

  async function restoreActive() {
    confirmOrRun(
      async () => {
        try {
          await updateWorker(effectiveId, { status: 'active', terminatedAt: null as any });
          setStatus('active');
        } catch (e: any) {
          Alert.alert('Action failed', e?.message ?? 'Could not update status.');
        }
      },
      'Restore to Active',
      'This will move the worker back to Active status.'
    );
  }

  const isFormer = status === 'former';

  return (
    <Screen>
      <AppHeader title="Edit Worker" onBack={() => navigation.goBack()} />
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <View
          style={{
            alignSelf: 'flex-start',
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 999,
            backgroundColor: isFormer ? `${colors.danger}22` : `${colors.brand}22`,
            borderWidth: 1,
            borderColor: isFormer ? colors.danger : colors.brand,
          }}
        >
          <Text
            style={{
              fontWeight: '700',
              color: isFormer ? colors.danger : colors.brand,
            }}
          >
            {isFormer ? 'Former' : 'Active'}
          </Text>
        </View>

        <TextField label="Name" value={name} onChangeText={setName} />
        <TextField label="Role" value={role} onChangeText={setRole} />
        <TextField
          label="Monthly Salary (AED)"
          value={salary}
          onChangeText={setSalary}
          keyboardType="numeric"
        />

        <Button
          label="Save"
          onPress={onSave}
          fullWidth
          style={{ paddingVertical: spacing.sm, minHeight: 40 }}
        />

        {isFormer ? (
          <Button
            label="Restore to Active"
            variant="outline"
            onPress={restoreActive}
            fullWidth
            style={{ paddingVertical: spacing.sm, minHeight: 40 }}
          />
        ) : (
          <Button
            label="Mark as Former"
            variant="outline"
            tone="warn"
            onPress={markFormer}
            fullWidth
            style={{ paddingVertical: spacing.sm, minHeight: 40 }}
          />
        )}
      </View>
    </Screen>
  );
}
