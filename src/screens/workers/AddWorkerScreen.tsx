import React, { useState } from 'react';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import { spacing } from '../../theme/tokens';
import { addWorker } from '../../services/workers';
import { Alert, View } from 'react-native';

export default function AddWorkerScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [salary, setSalary] = useState('');

  async function onSave() {
    try {
      const id = await addWorker({
        name: name.trim(),
        role: role.trim(),
        monthlySalaryAED: Number(salary || 0),
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
        <TextField label="Monthly Salary (AED)" value={salary} onChangeText={setSalary} keyboardType="number-pad" />
        <Button label="Save" onPress={onSave} fullWidth />
      </View>
    </Screen>
  );
}
