import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import { spacing } from '../../theme/tokens';
import { addWorker } from '../../services/workers';
import { formatEmployeeId, getNextWorkerNumber } from '../../services/ids';
import { showAlert } from '../../utils/alert';
import type { WorkersScreenProps } from '../../types/navigation';
import { validateName, validateSalary, validateSalaryDueDay, validatePhone } from '../../utils/validators';

const clampDueDay = (raw: string) => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 28;
  return Math.min(Math.max(Math.trunc(n), 1), 28);
};

const sanitizePhone = (value: string) => value.replace(/[^+0-9]/g, '').slice(0, 16);

export default function AddWorkerScreen({ navigation }: WorkersScreenProps<'AddWorker'>) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [salary, setSalary] = useState('');
  const [dueDay, setDueDay] = useState('28');
  const [employeeId, setEmployeeId] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const next = await getNextWorkerNumber();
        if (mounted) setEmployeeId(formatEmployeeId(next));
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const salaryNum = useMemo(() => {
    const n = Number(salary);
    if (!Number.isFinite(n) || n < 0) return NaN;
    return n;
  }, [salary]);

  const dueDayNum = useMemo(() => clampDueDay(dueDay), [dueDay]);

  const canSave = useMemo(() => {
    if (saving) return false;
    return (
      name.trim().length > 0 &&
      role.trim().length > 0 &&
      phone.trim().length >= 6 &&
      Number.isFinite(salaryNum)
    );
  }, [name, role, phone, salaryNum, saving]);

  const onSave = async () => {
    if (saving) return;
    if (!name.trim()) {
      showAlert('Name is required');
      return;
    }
    if (!role.trim()) {
      showAlert('Role is required');
      return;
    }
    if (!phone.trim()) {
      showAlert('Phone number is required');
      return;
    }
    if (!Number.isFinite(salaryNum)) {
      showAlert('Monthly salary must be a non-negative number');
      return;
    }

    try {
      setSaving(true);
      const id = await addWorker({
        name: name.trim(),
        role: role.trim(),
        monthlySalaryAED: salaryNum,
        baseSalary: salaryNum,
        salaryDueDay: dueDayNum,
        employeeId: employeeId || undefined,
        phone: phone.trim(),
        avatarUrl: null,
      });
      navigation.replace('WorkerProfile', { id });
    } catch (e: any) {
      showAlert('Error', e?.message ?? 'Failed to add worker');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <AppHeader title="Add Worker" onBack={navigation.goBack} transparent noBorder />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['2xl'] }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TextField label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
        <TextField label="Role" value={role} onChangeText={setRole} autoCapitalize="words" />

        <TextField label="Employee ID" value={employeeId} editable={false} hint="Auto-generated" />

        <TextField
          label="Phone number"
          value={phone}
          onChangeText={(v) => setPhone(sanitizePhone(v))}
          keyboardType="phone-pad"
          placeholder="+9715xxxxxxxx"
        />

        <TextField
          label="Salary Due Day (1–28)"
          value={dueDay}
          onChangeText={(t) => setDueDay(t.replace(/[^0-9]/g, '').slice(0, 2))}
          keyboardType="number-pad"
          hint="Controls reminder & due cycle"
        />

        <TextField
          label="Monthly Salary (AED)"
          value={salary}
          onChangeText={(t) => setSalary(t.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
        />

        <Button label={saving ? 'Saving…' : 'Save'} onPress={onSave} disabled={!canSave} fullWidth />
      </ScrollView>
    </Screen>
  );
}
