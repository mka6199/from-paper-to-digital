import React, { useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import { spacing } from '../../theme/tokens';
import { getWorker, updateWorker, Worker } from '../../services/workers';
import { CommonActions } from '@react-navigation/native';

export default function EditWorkerScreen({ route, navigation }: any) {
  const { id } = route.params as { id: string };

  const [loading, setLoading] = useState(true);
  const [orig, setOrig] = useState<Worker | null>(null);

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [salary, setSalary] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const w = await getWorker(id);
        if (w) {
          setOrig(w);
          setName(w.name ?? '');
          setRole(w.role ?? '');
          const num = Number(w.monthlySalaryAED ?? w.baseSalary ?? 0);
          setSalary(num > 0 ? String(num) : '');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Basic required fields & numeric salary
  const nameValid = name.trim().length > 0;
  const roleValid = role.trim().length > 0;
  const salaryNum = Number(salary);
  const salaryValid = !Number.isNaN(salaryNum) && salaryNum > 0;

  const canSave = useMemo(() => nameValid && roleValid && salaryValid, [nameValid, roleValid, salaryValid]);

  

  async function onSave() {
    if (!nameValid) { Alert.alert('Name is required'); return; }
    if (!roleValid) { Alert.alert('Role is required'); return; }
    if (!salaryValid) { Alert.alert('Monthly salary must be a positive number'); return; }
  
    try {
      await updateWorker(id, {
        name: name.trim(),
        role: role.trim(),
        monthlySalaryAED: salaryNum,
      });
  
      const updated = { id, name: name.trim(), role: role.trim(), monthlySalaryAED: salaryNum };
  
      // 1) Find the previous route on THIS stack (should be WorkerProfile)
      const state = navigation.getState();
      const prev = state.routes[state.index - 1]; // the screen we came from
  
      if (prev) {
        // 2) Update THAT route's params directly by route key (no new screen)
        navigation.dispatch({
          ...CommonActions.setParams({
            params: { id, worker: updated, _ts: Date.now() }, // _ts forces a change
          }),
          source: prev.key, // target the previous route specifically
        });
      }
  
      // 3) Pop back to it
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Could not save changes', e?.message ?? 'Please try again.');
    }
  }
  
  

  return (
    <Screen scroll padded>
      <AppHeader title="Edit Worker" onBack={() => navigation.goBack()} />
      <Card>
        <View style={{ gap: spacing.md }}>
          <TextField
            label="Full name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <TextField
            label="Role / Job Title"
            value={role}
            onChangeText={setRole}
          />
          <TextField
            label="Monthly Salary (AED)"
            value={salary}
            onChangeText={setSalary}
            keyboardType="numeric"
          />
        </View>
      </Card>

      <View style={{ height: spacing.lg }} />
      <Button
        label={loading ? 'Loading…' : 'Save Changes'}
        tone="green"
        onPress={onSave}
        disabled={!canSave || loading}
        fullWidth
      />
    </Screen>
  );
}
