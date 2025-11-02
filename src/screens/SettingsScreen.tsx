import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import Screen from '../components/layout/Screen';
import { colors, spacing, typography } from '../theme/tokens';
import AppHeader from '../components/layout/AppHeader';
import { signOut } from '../../firebase';
import { AuthContext } from '../context/AuthProvider';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen({ navigation }: any) {
  const { profile } = React.useContext(AuthContext);
  const [darkMode, setDarkMode] = React.useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);

  const displayName =
    (profile?.firstName
      ? `${profile.firstName}${profile?.lastName ? ' ' + profile.lastName : ''}`
      : '') || profile?.email || 'User';

  function onLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Could not log out. Please try again.');
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <AppHeader title="Settings" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: spacing['2xl'] }}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <Pressable style={styles.item} onPress={() => navigation.navigate('Profile')}>
            <View style={styles.itemLeft}>
              <Ionicons name="person-circle-outline" size={22} color={colors.brand} />
              <Text style={styles.itemText}>Profile Information</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </Pressable>

          <View style={[styles.item, { justifyContent: 'space-between' }]}>
            <View style={styles.itemLeft}>
              <Ionicons name="mail-outline" size={22} color={colors.brand} />
              <Text style={styles.itemText}>Email</Text>
            </View>
            <Text style={[typography.small, { color: colors.subtext }]} numberOfLines={1}>
              {profile?.email}
            </Text>
          </View>

          <View style={[styles.item, { justifyContent: 'space-between' }]}>
            <View style={styles.itemLeft}>
              <Ionicons name="id-card-outline" size={22} color={colors.brand} />
              <Text style={styles.itemText}>Full Name</Text>
            </View>
            <Text style={[typography.small, { color: colors.subtext }]} numberOfLines={1}>
              {displayName}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <View style={[styles.item, styles.switchItem]}>
            <View style={styles.itemLeft}>
              <Ionicons name="moon-outline" size={22} color={colors.brand} />
              <Text style={styles.itemText}>Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#ccc', true: colors.brand }}
            />
          </View>

          <View style={[styles.item, styles.switchItem]}>
            <View style={styles.itemLeft}>
              <Ionicons name="notifications-outline" size={22} color={colors.brand} />
              <Text style={styles.itemText}>Push Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#ccc', true: colors.brand }}
            />
          </View>

          <Pressable style={styles.item}>
            <View style={styles.itemLeft}>
              <Ionicons name="globe-outline" size={22} color={colors.brand} />
              <Text style={styles.itemText}>Language</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </Pressable>

          <Pressable style={styles.item}>
            <View style={styles.itemLeft}>
              <Ionicons name="cash-outline" size={22} color={colors.brand} />
              <Text style={styles.itemText}>Currency Format</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <Pressable style={styles.item}>
            <View style={styles.itemLeft}>
              <Ionicons name="information-circle-outline" size={22} color={colors.brand} />
              <Text style={styles.itemText}>About This App</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </Pressable>

          <Pressable style={styles.item}>
            <View style={styles.itemLeft}>
              <Ionicons name="document-text-outline" size={22} color={colors.brand} />
              <Text style={styles.itemText}>Terms & Conditions</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </Pressable>

          <Pressable style={styles.item}>
            <View style={styles.itemLeft}>
              <Ionicons name="shield-checkmark-outline" size={22} color={colors.brand} />
              <Text style={styles.itemText}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </Pressable>
        </View>

        <View style={[styles.section, { marginTop: spacing.xl }]}>
          <Pressable
            onPress={onLogout}
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && { backgroundColor: '#ffdddd' },
            ]}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f8f9fb' },
  section: {
    backgroundColor: '#fff',
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  sectionTitle: {
    ...typography.small,
    color: colors.subtext,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    fontWeight: '600',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  itemText: {
    ...typography.body,
  },
  switchItem: {
    justifyContent: 'space-between',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  logoutText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 16,
  },
});
