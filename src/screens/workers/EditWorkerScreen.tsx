import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import { spacing } from '../../theme/tokens';
import { subscribeWorker, updateWorker } from '../../services/workers';
import { CommonActions } from '@react-navigation/native';

export default function EditWorkerScreen({ route, navigation }: any) {
  const { workerId, id } = route.params || {};
  const effectiveId = id ?? workerId;

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [salary, setSalary] = useState<string>('');

  useEffect(() => {
    if (!effectiveId) return;
    const unsub = subscribeWorker(effectiveId, (w) => {
      if (!w) return;
      setName(w.name ?? '');
      setRole(w.role ?? '');
      const s = Number(w.monthlySalaryAED ?? w.baseSalary ?? 0);
      setSalary(s ? String(s) : '');
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

  return (
    <Screen>
      <AppHeader title="Edit Worker" onBack={() => navigation.goBack()} />
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <TextField label="Name" value={name} onChangeText={setName} />
        <TextField label="Role" value={role} onChangeText={setRole} />
        <TextField
          label="Monthly Salary (AED)"
          value={salary}
          onChangeText={setSalary}
          keyboardType="number-pad"
        />
        <Button label="Save" onPress={onSave} fullWidth />
      </View>
    </Screen>
  );
}
