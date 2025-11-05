import React from 'react';
import { View, Text, FlatList, Alert, StyleSheet, Switch } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import Card from '../../components/primitives/Card';
import Button from '../../components/primitives/Button';
import TextField from '../../components/primitives/TextField';
import { spacing, typography } from '../../theme/tokens';
import {
  subscribeAllUsers,
  setUserRole,
  setUserActive,
  updateUserDoc,
  AdminUser,
  adminDeleteUserAndData,
} from '../../services/admin';
import { signOut } from '../../../firebase';
import AdminGate from '../../components/admin/AdminGate';
import { AuthContext } from '../../context/AuthProvider';
import { useTheme } from '../../theme/ThemeProvider';

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
const isPhone = (s: string) => /^[0-9()+\-.\s]{7,20}$/.test(String(s).trim());
const isYMD  = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(String(s).trim());

export default function AdminUsersScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = React.useContext(AuthContext);

  const [rows, setRows] = React.useState<AdminUser[]>([]);
  const [editUid, setEditUid] = React.useState<string | null>(null);

  const [firstName, setFirstName] = React.useState('');
  const [lastName,  setLastName]  = React.useState('');
  const [phone,     setPhone]     = React.useState('');
  const [dobYMD,    setDobYMD]    = React.useState('');
  const [email,     setEmail]     = React.useState('');

  React.useEffect(() => {
    const unsub = subscribeAllUsers(setRows);
    return () => unsub();
  }, []);

  function beginEdit(u: AdminUser) {
    setEditUid(u.uid);
    setFirstName(String(u.firstName ?? ''));
    setLastName (String(u.lastName  ?? ''));
    setPhone    (String(u.phone     ?? ''));
    setDobYMD   (String(u.dobYMD    ?? ''));
    setEmail    (String(u.email     ?? ''));
  }

  async function saveEdit() {
    if (!editUid) return;
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Invalid name', 'First and last name are required.');
      return;
    }
    if (!isPhone(phone)) {
      Alert.alert('Invalid phone', 'Enter a valid phone number.');
      return;
    }
    if (dobYMD && !isYMD(dobYMD)) {
      Alert.alert('Invalid DOB', 'Enter DOB as YYYY-MM-DD or leave blank.');
      return;
    }
    if (!isEmail(email)) {
      Alert.alert('Invalid email', 'Enter a valid email address.');
      return;
    }
    try {
      await updateUserDoc(editUid, {
        firstName: firstName.trim(),
        lastName : lastName.trim(),
        phone    : phone.trim(),
        dobYMD   : dobYMD.trim() || undefined,
        email    : email.trim().toLowerCase(),
      });
      setEditUid(null);
    } catch (e: any) {
      Alert.alert('Failed to update', e?.message ?? 'Please try again.');
    }
  }

  function onToggleRole(u: AdminUser) {
    if (u.uid === user?.uid) {
      Alert.alert('Not allowed', 'You cannot change your own role.');
      return;
    }
    const next = u.role === 'admin' ? 'user' : 'admin';
    Alert.alert('Change role', `Set ${u.email || u.uid} to ${next}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Change', style: 'destructive', onPress: () => setUserRole(u.uid, next) },
    ]);
  }

  function onToggleActive(u: AdminUser, value: boolean) {
    if (u.uid === user?.uid) {
      Alert.alert('Not allowed', 'You cannot deactivate yourself.');
      return;
    }
    setUserActive(u.uid, value).catch((e) =>
      Alert.alert('Error', e?.message ?? 'Failed to update active flag')
    );
  }

  function onRemoveUser(u: AdminUser) {
    if (u.uid === user?.uid) {
      Alert.alert('Not allowed', 'You cannot remove your own admin account.');
      return;
    }
    Alert.alert(
      'Remove user & data',
      `This will permanently delete:\n\n• the profile for ${u.email || u.uid}\n• ALL of their workers\n• ALL of their payments\n\nThis cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminDeleteUserAndData(u.uid, {
                deleteProfile: true,
                deleteWorkers: true,
                deletePayments: true,
              });
            } catch (e: any) {
              Alert.alert('Delete failed', e?.message ?? 'Could not remove user.');
            }
          },
        },
      ]
    );
  }

  async function onLogout() { try { await signOut(); } catch {} }

  const header = (
    <View style={{ paddingHorizontal: spacing.lg }}>
      <AppHeader title="Manage Users" onBack={() => navigation.goBack()} />
      <View style={{ alignItems: 'flex-end', marginBottom: spacing.md }}>
        <Button label="Log out" variant="outline" tone="danger" onPress={onLogout} />
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: AdminUser }) => {
    const editing = editUid === item.uid;
    return (
      <Card style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={{ flex: 1, paddingRight: spacing.md, gap: spacing.xs }}>
          {editing ? (
            <>
              <TextField label="First name" value={firstName} onChangeText={setFirstName} />
              <TextField label="Last name"  value={lastName}  onChangeText={setLastName} />
              <TextField label="Phone"      value={phone}     onChangeText={setPhone} keyboardType="phone-pad" />
              <TextField label="DOB (YYYY-MM-DD)" value={dobYMD} onChangeText={setDobYMD} placeholder="e.g., 2001-05-12" />
              <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
            </>
          ) : (
            <>
              <Text style={[typography.body, { color: colors.text }]}>
                {(item.firstName || '') + ' ' + (item.lastName || '')}
              </Text>
              <Text style={[typography.small, { color: colors.subtext }]} numberOfLines={1}>
                {item.email || '—'}
              </Text>
              <Text style={[typography.small, { color: colors.subtext }]}>
                Phone: {item.phone || '—'}
              </Text>
              <Text style={[typography.small, { color: colors.subtext }]}>
                DOB: {item.dobYMD || '—'}
              </Text>
              <Text style={[typography.small, { color: colors.subtext }]}>
                Role: {item.role} • Active: {item.isActive === false ? 'no' : 'yes'}
              </Text>
            </>
          )}
        </View>

        <View style={{ gap: spacing.xs, alignItems: 'flex-end' }}>
          {editing ? (
            <>
              <Button label="Save" tone="green" onPress={saveEdit} />
              <Button label="Cancel" variant="outline" onPress={() => setEditUid(null)} />
            </>
          ) : (
            <>
              <Button
                label={item.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                variant="outline"
                onPress={() => onToggleRole(item)}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[typography.small, { color: colors.text }]}>Active</Text>
                <Switch
                  value={item.isActive !== false}
                  onValueChange={(v) => onToggleActive(item, v)}
                />
              </View>
              <Button label="Edit" variant="soft" onPress={() => beginEdit(item)} />
              <Button label="Remove" variant="outline" tone="danger" onPress={() => onRemoveUser(item)} />
            </>
          )}
        </View>
      </Card>
    );
  };

  return (
    <AdminGate title="Admin Panel">
      <Screen>
        {header}
        <FlatList
          data={rows}
          keyExtractor={(i) => i.uid}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['2xl'] }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={[typography.small, { textAlign: 'center', color: colors.subtext }]}>
              No users found.
            </Text>
          }
        />
      </Screen>
    </AdminGate>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
});
