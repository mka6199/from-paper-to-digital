import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import { spacing } from '../../theme/tokens';
import { subscribeWorker, updateWorker, Worker } from '../../services/workers';
import { CommonActions } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';
import { showAlert } from '../../utils/alert';

export default function EditWorkerScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const { workerId, id } = route.params || {};
  const effectiveId = id ?? workerId;

  const [worker, setWorker] = useState<Worker | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [salary, setSalary] = useState('');
  const [status, setStatus] = useState<'active' | 'former'>('active');
  const [employeeId, setEmployeeId] = useState('');
  const [dueDay, setDueDay] = useState('28');
  const [phone, setPhone] = useState(''); // ✅ NEW
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!effectiveId) return;

    const unsub = subscribeWorker(effectiveId, (w) => {
      setWorker(w);
      if (!w) return;
      setName(w.name ?? '');
      setRole(w.role ?? '');
      const s = Number(w.monthlySalaryAED ?? w.baseSalary ?? 0);
      setSalary(Number.isFinite(s) ? String(s) : '');
      setStatus((w.status as any) ?? 'active');
      setEmployeeId((w as any).employeeId ?? '');
      const sd = Number((w as any).salaryDueDay ?? 28);
      setDueDay(String(Math.min(Math.max(sd || 28, 1), 28)));
      setPhone((w as any).phone ?? ''); // ✅ load phone
    });

    return () => unsub();
  }, [effectiveId]);

  const salaryNum = (() => {
    const n = Number(salary);
    if (!Number.isFinite(n) || n < 0) return NaN;
    return n;
  })();

  const dueDayNum = (() => {
    const n = Number(dueDay);
    if (!Number.isFinite(n)) return 28;
    return Math.min(Math.max(n, 1), 28);
  })();

  const onSave = async () => {
    if (!effectiveId) return;
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
      setBusy(true);
      await updateWorker(effectiveId, {
        name: name.trim(),
        role: role.trim(),
        monthlySalaryAED: salaryNum,
        baseSalary: salaryNum,
        salaryDueDay: dueDayNum,
        phone: phone.trim(), // ✅ save phone
      });
      navigation.dispatch(CommonActions.goBack());
    } catch (e: any) {
      showAlert('Error', e?.message ?? 'Failed to update worker');
    } finally {
      setBusy(false);
    }
  };

  const markFormer = async () => {
    if (!effectiveId) return;
    try {
      setBusy(true);
      await updateWorker(effectiveId, {
        status: 'former',
        terminatedAt: new Date(),
      });
      setStatus('former');
    } catch (e: any) {
      showAlert('Error', e?.message ?? 'Failed to update status');
    } finally {
      setBusy(false);
    }
  };

  const markActive = async () => {
    if (!effectiveId) return;
    try {
      setBusy(true);
      await updateWorker(effectiveId, {
        status: 'active',
        terminatedAt: null,
      });
      setStatus('active');
    } catch (e: any) {
      showAlert('Error', e?.message ?? 'Failed to update status');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AppHeader
        title="Edit Worker"
        onBack={() => navigation.goBack()}
        transparent
        noBorder
      />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!worker && (
          <Text style={{ color: colors.subtext }}>
            Loading worker details…
          </Text>
        )}

        {worker && (
          <>
              <TextField label="Name" value={name} onChangeText={setName} />
              <TextField label="Role" value={role} onChangeText={setRole} />

              <TextField
                label="Employee ID"
                value={employeeId}
                editable={false}
              />

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

              <Button
                label={busy ? 'Saving…' : 'Save'}
                onPress={onSave}
                disabled={busy}
                fullWidth
              />

              <View style={{ height: spacing.lg }} />

              <Text style={{ color: colors.subtext, marginBottom: spacing.sm }}>
                Status: {status === 'active' ? 'Active' : 'Former'}
              </Text>

              {status === 'active' ? (
                <Button
                  label={busy ? 'Updating…' : 'Mark as Former'}
                  onPress={markFormer}
                  disabled={busy}
                  fullWidth
                />
              ) : (
                <Button
                  label={busy ? 'Updating…' : 'Mark as Active'}
                  onPress={markActive}
                  disabled={busy}
                  fullWidth
                />
              )}
            </>
          )}
        </ScrollView>
    </Screen>
  );
}
