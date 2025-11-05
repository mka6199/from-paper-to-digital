import React, { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import { spacing } from '../../theme/tokens';
import { addWorker } from '../../services/workers';

export default function AddWorkerScreen({ navigation }: any) {
  const [name, setName]   = useState('');
  const [role, setRole]   = useState('');
  const [salary, setSalary] = useState('');

  const salaryNum = useMemo(() => {
    const n = Number(salary);
    return Number.isFinite(n) && n >= 0 ? n : NaN;
  }, [salary]);

  const canSave = useMemo(() => {
    return name.trim().length > 0 && role.trim().length > 0 && Number.isFinite(salaryNum);
  }, [name, role, salaryNum]);

  async function onSave() {
    if (!name.trim()) {
      Alert.alert('Name is required');
      return;
    }
    if (!role.trim()) {
      Alert.alert('Role is required');
      return;
    }
    if (!Number.isFinite(salaryNum)) {
      Alert.alert('Monthly salary must be a non-negative number');
      return;
    }

    try {
      const id = await addWorker({
        name: name.trim(),
        role: role.trim(),
        monthlySalaryAED: salaryNum,
        avatarUrl: null,
      });

      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save worker.');
    }
  }

  return (
    <Screen>
      <AppHeader title="Add Worker" onBack={() => navigation.goBack()} />
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <TextField label="Name" value={name} onChangeText={setName} />
        <TextField label="Role" value={role} onChangeText={setRole} />
        <TextField
          label="Monthly Salary (AED)"
          value={salary}
          onChangeText={setSalary}
          keyboardType="number-pad"
        />
        <Button label="Save" onPress={onSave} disabled={!canSave} fullWidth />
      </View>
    </Screen>
  );
}
