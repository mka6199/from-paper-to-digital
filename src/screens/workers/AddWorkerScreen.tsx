import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import { spacing } from '../../theme/tokens';
import { addWorker } from '../../services/workers';

export default function AddWorkerScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [salary, setSalary] = useState('');

  async function onSave() {
    const monthlySalaryAED = Number(salary || 0);
    if (!name.trim()) { Alert.alert('Please enter a name'); return; }
    if (Number.isNaN(monthlySalaryAED) || monthlySalaryAED <= 0) { Alert.alert('Enter a valid monthly salary'); return; }

    try {
      await addWorker({ name: name.trim(), role: role.trim(), monthlySalaryAED });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Could not add worker', e?.message ?? 'Please try again.');
    }
  }

  return (
    <Screen scroll padded>
      <AppHeader title="Add Worker" onBack={() => navigation.goBack()} />

      <Card>
        <View style={{ gap: spacing.md }}>
          <TextField label="Full name" value={name} onChangeText={setName} autoCapitalize="words" />
          <TextField label="Role / Job Title" value={role} onChangeText={setRole} />
          <TextField label="Monthly Salary (AED)" value={salary} onChangeText={setSalary} keyboardType="numeric" />
        </View>
      </Card>

      <View style={{ height: spacing.lg }} />
      <Button label="Save" tone="green" onPress={onSave} fullWidth />
    </Screen>
  );
}
