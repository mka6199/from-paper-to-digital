import React from 'react';
import { View } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import Card from '../../components/primitives/Card';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import { spacing } from '../../theme/tokens';
import { getWorker } from '../../services/workers';
import { adminUpdateWorker } from '../../services/admin';
import { showAlert } from '../../utils/alert';
import AdminGate from '../../components/admin/AdminGate';
import { useTheme } from '../../theme/ThemeProvider';

export default function AdminEditWorkerScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const { workerId } = route.params as { workerId: string };
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState('');
  const [role, setRole] = React.useState('');
  const [salary, setSalary] = React.useState('');

  React.useEffect(() => {
    (async () => {
      try {
        const w = await getWorker(workerId);
        if (w) {
          setName(w.name ?? '');
          setRole(w.role ?? '');
          const s = Number(w.monthlySalaryAED ?? w.baseSalary ?? 0);
          setSalary(s ? String(s) : '');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [workerId]);

  const canSave =
    name.trim().length > 0 &&
    role.trim().length > 0 &&
    !Number.isNaN(Number(salary)) &&
    Number(salary) > 0;

  async function onSave() {
    if (!canSave) {
      showAlert('Invalid fields', 'Please fill all fields with valid values.');
      return;
    }
    try {
      await adminUpdateWorker(workerId, {
        name: name.trim(),
        role: role.trim(),
        monthlySalaryAED: Number(salary),
      });
      navigation.goBack();
    } catch (e: any) {
      showAlert('Failed to save', e?.message ?? 'Please try again.');
    }
  }

  return (
    <AdminGate title="Admin Panel">
      <Screen scroll padded>
        <AppHeader title="Admin • Edit Worker" onBack={() => navigation.goBack()} transparent noBorder />
        <Card style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
          <View style={{ gap: spacing.md }}>
            <TextField label="Full name" value={name} onChangeText={setName} />
            <TextField label="Role" value={role} onChangeText={setRole} />
            <TextField label="Monthly Salary (AED)" value={salary} onChangeText={setSalary} keyboardType="numeric" />
          </View>
        </Card>

        <View style={{ height: spacing.lg }} />
        <Button label={loading ? 'Loading…' : 'Save changes'} onPress={onSave} disabled={loading || !canSave} fullWidth />
      </Screen>
    </AdminGate>
  );
}

