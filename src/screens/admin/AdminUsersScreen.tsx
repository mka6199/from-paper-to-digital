import React from 'react';
import { View, Text, FlatList, Alert, StyleSheet, Switch } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import Card from '../../components/primitives/Card';
import Button from '../../components/primitives/Button';
import TextField from '../../components/primitives/TextField';
import { spacing, typography, colors } from '../../theme/tokens';
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

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());

export default function AdminUsersScreen({ navigation }: any) {
  const { profile, user } = React.useContext(AuthContext);

  const [rows, setRows] = React.useState<AdminUser[]>([]);
  const [editUid, setEditUid] = React.useState<string | null>(null);
  const [editEmail, setEditEmail] = React.useState('');

  React.useEffect(() => {
    const unsub = subscribeAllUsers(setRows);
    return () => unsub();
  }, []);

  const onToggleRole = (u: AdminUser) => {
    if (u.uid === user?.uid) {
      Alert.alert('Not allowed', 'You cannot change your own role.');
      return;
    }
    const next = u.role === 'admin' ? 'user' : 'admin';
    Alert.alert('Change role', `Set ${u.email || u.uid} to ${next}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Change', style: 'destructive', onPress: () => setUserRole(u.uid, next) },
    ]);
  };

  const onToggleActive = (u: AdminUser, value: boolean) => {
    if (u.uid === user?.uid) {
      Alert.alert('Not allowed', 'You cannot deactivate yourself.');
      return;
    }
    setUserActive(u.uid, value).catch((e) => Alert.alert('Error', e?.message ?? 'Failed'));
  };

  const startEdit = (u: AdminUser) => {
    setEditUid(u.uid);
    setEditEmail(u.email ?? '');
  };

  const saveEdit = async () => {
    if (!editUid) return;
    const email = editEmail.trim().toLowerCase();
    if (!isEmail(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    try {
      await updateUserDoc(editUid, { email });
      setEditUid(null);
      setEditEmail('');
    } catch (e: any) {
      Alert.alert('Failed to update', e?.message ?? 'Please try again.');
    }
  };

  async function onLogout() {
    try { await signOut(); } catch {}
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
      <Card style={styles.row}>
        <View style={{ flex: 1, paddingRight: spacing.md }}>
          {editing ? (
            <TextField label="Email" value={editEmail} onChangeText={setEditEmail} autoCapitalize="none" />
          ) : (
            <>
              <Text style={typography.body}>{item.email || item.uid}</Text>
              <Text style={[typography.small, { color: colors.subtext }]}>
                role: {item.role} • active: {item.isActive === false ? 'no' : 'yes'}
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
                <Text style={typography.small}>Active</Text>
                <Switch
                  value={item.isActive !== false}
                  onValueChange={(v) => onToggleActive(item, v)}
                />
              </View>
              <Button label="Edit" variant="soft" onPress={() => startEdit(item)} />
              <Button
                label="Remove"
                variant="outline"
                tone="danger"
                onPress={() => onRemoveUser(item)}
              />
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
          ListEmptyComponent={<Text style={[typography.small, { textAlign: 'center' }]}>No users found.</Text>}
        />
      </Screen>
    </AdminGate>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: spacing.lg,
    borderWidth: 1, borderColor: '#eee', borderRadius: 16, backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
});
