import React, { useMemo, useState, useEffect } from 'react';
import { Alert, View } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import { spacing } from '../../theme/tokens';
import { addWorker } from '../../services/workers';
import { getNextWorkerNumber, formatEmployeeId } from '../../services/ids';

export default function AddWorkerScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [salary, setSalary] = useState('');
  const [dueDay, setDueDay] = useState('28');
  const [employeeId, setEmployeeId] = useState('');
  const [phone, setPhone] = useState(''); // ✅ NEW

  useEffect(() => {
    getNextWorkerNumber()
      .then((n) => setEmployeeId(formatEmployeeId(n)))
      .catch(() => {});
  }, []);

  const salaryNum = useMemo(() => {
    const n = Number(salary);
    if (!Number.isFinite(n) || n < 0) return NaN;
    return n;
  }, [salary]);

  const dueDayNum = useMemo(() => {
    const n = Number(dueDay);
    if (!Number.isFinite(n)) return 28;
    return Math.min(Math.max(n, 1), 28);
  }, [dueDay]);

  const canSave = useMemo(() => {
    return (
      name.trim().length > 0 &&
      role.trim().length > 0 &&
      phone.trim().length > 5 &&
      Number.isFinite(salaryNum)
    );
  }, [name, role, phone, salaryNum]);

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name is required');
      return;
    }
    if (!role.trim()) {
      Alert.alert('Role is required');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Phone number is required');
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
        baseSalary: salaryNum,
        salaryDueDay: dueDayNum,
        employeeId: employeeId || undefined,
        phone: phone.trim(), // ✅ save phone
        avatarUrl: null,
      });
      navigation.replace('WorkerProfile', { id });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to add worker');
    }
  };

  return (
    <Screen>
      <AppHeader
        title="Add Worker"
        onBack={navigation.goBack}
      />

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <TextField label="Name" value={name} onChangeText={setName} />
        <TextField label="Role" value={role} onChangeText={setRole} />

        <TextField
          label="Employee ID"
          value={employeeId}
          editable={false}
          hint="Auto-generated"
        />

        {/* ✅ Phone field for OTP */}
        <TextField
          label="Phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+9715xxxxxxxx"
        />

        <TextField
          label="Salary Due Day (1–28)"
          value={dueDay}
          onChangeText={(t) =>
            setDueDay(t.replace(/[^0-9]/g, '').slice(0, 2))
          }
          keyboardType="number-pad"
        />

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
