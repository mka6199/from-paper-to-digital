import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Pressable,
  Platform,
  Linking,
} from 'react-native';
import Screen from '../../components/layout/Screen';
import Card from '../../components/primitives/Card';
import Button from '../../components/primitives/Button';
import TextField from '../../components/primitives/TextField';
import { spacing, typography } from '../../theme/tokens';
import AppHeader from '../../components/layout/AppHeader';
import { auth, signOut, sendResetPasswordEmail } from '../../config/firebase';
import { AuthContext } from '../../context/AuthProvider';
import { showAlert } from '../../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useTheme } from '../../theme/ThemeProvider';
import { useCurrency } from '../../context/CurrencyProvider';
import { upsertMyProfile } from '../../services/profile';
import { logger } from '../../utils/logger';
import { getForceOfflineMode, setForceOfflineMode } from '../../services/offline';
import { getContentBottomPadding } from '../../utils/layout';
import { NotificationPreferencesContext } from '../../context/NotificationPreferencesProvider';

export default function SettingsScreen({ navigation }: any) {
  const { profile } = React.useContext(AuthContext);
  const { colors, mode, setMode } = useTheme();
  const { currency, setCurrency, supported, format } = useCurrency();
  const { prefs: notificationPrefs, ready: notificationReady, updatePrefs: updateNotificationPrefs } = React.useContext(NotificationPreferencesContext);

  const [darkMode, setDarkMode] = React.useState(mode === 'dark');
  const [forceOffline, setForceOffline] = React.useState(false);
  const [updatingNotifications, setUpdatingNotifications] = React.useState(false);

  const [salaryText, setSalaryText] = React.useState(
    profile?.salaryMonthlyAED != null ? String(profile.salaryMonthlyAED) : ''
  );
  const [savingSalary, setSavingSalary] = React.useState(false);
  const [resetBusy, setResetBusy] = React.useState(false);

  const notificationsEnabled = !notificationPrefs.muted;

  React.useEffect(() => {
    (async () => {
      try {
        const [dm, offline] = await Promise.all([
          AsyncStorage.getItem('settings.darkMode'),
          getForceOfflineMode(),
        ]);
        if (dm !== null) {
          const on = dm === '1';
          setDarkMode(on);
          setMode(on ? 'dark' : 'light');
        }
        setForceOffline(offline);
      } catch {}
    })();
  }, [setMode]);

  React.useEffect(() => {
    if (profile?.salaryMonthlyAED != null) setSalaryText(String(profile.salaryMonthlyAED));
  }, [profile?.salaryMonthlyAED]);

  const persist = React.useCallback(async (key: string, val: string) => {
    try {
      await AsyncStorage.setItem(key, val);
    } catch {}
  }, []);

  async function onLogout() {
    const confirmed = await new Promise<boolean>((resolve) => {
      showAlert('Log Out', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Log Out', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });

    if (!confirmed) return;

    try {
      await signOut();
    } catch (e: any) {
      showAlert('Error', e?.message ?? 'Could not log out.');
    }
  }

  const onToggleDark = (v: boolean) => {
    setDarkMode(v);
    setMode(v ? 'dark' : 'light');
    persist('settings.darkMode', v ? '1' : '0');
  };

  const onToggleNotifications = async (v: boolean) => {
    if (!notificationReady) return;
    setUpdatingNotifications(true);
    try {
      await updateNotificationPrefs({ muted: !v });
    } catch (e: any) {
      showAlert('Error', e?.message ?? 'Could not update notification preference.');
    } finally {
      setUpdatingNotifications(false);
    }
  };

  const onToggleForceOffline = async (v: boolean) => {
    setForceOffline(v);
    await setForceOfflineMode(v);
    showAlert(
      'Offline Mode ' + (v ? 'Enabled' : 'Disabled'),
      v 
        ? 'App will now behave as if offline. All operations will be queued.' 
        : 'App will use normal network detection.'
    );
  };

  const pickCurrency = () => {
    if (Platform.OS === 'web') {
      // On web, create a custom selection UI
      const currencyOptions = supported.map((c) => `${c} (${format(100, c as any)})`).join('\n');
      const selected = prompt(`Choose your currency:\n\n${currencyOptions}\n\nEnter currency code (e.g., AED, USD, EUR):`);
      if (selected) {
        const code = selected.toUpperCase().trim();
        if (supported.includes(code as any)) {
          setCurrency(code as any);
          persist('settings.currency', code);
        } else {
          showAlert('Invalid Currency', `"${selected}" is not a valid currency code.`);
        }
      }
    } else {
      showAlert('Currency', 'Choose your currency', [
        ...supported.map((c) => ({
          text: `${c} (${format(100, c as any)})`,
          onPress: () => {
            setCurrency(c);
            persist('settings.currency', c);
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const showAbout = () => {
    const version =
      (Constants?.expoConfig as any)?.version ||
      (Constants?.manifest as any)?.version ||
      '1.0.0';
    showAlert(
      'About',
      `From Paper to Digital\nVersion: ${version}\n\nManage your workforce and payroll efficiently.`,
      [{ text: 'OK' }]
    );
  };

  const openTerms = async () => {
    showAlert('Terms & Conditions', 'Terms page is not configured yet.');
  };

  const openPrivacy = async () => {
    showAlert('Privacy Policy', 'Privacy page is not configured yet.');
  };

  async function saveSalary() {
    const n = Number(salaryText);
    if (!Number.isFinite(n) || n < 0) {
      showAlert('Invalid salary', 'Please enter a valid amount.');
      return;
    }
    setSavingSalary(true);
    try {
      await upsertMyProfile({ salaryMonthlyAED: n });
      showAlert('Saved', 'Monthly salary updated.');
    } catch (e: any) {
      showAlert('Error', e?.message ?? 'Could not save salary.');
    } finally {
      setSavingSalary(false);
    }
  }

  async function onResetPassword() {
    const email = auth.currentUser?.email || profile?.email || '';
    if (!email) {
      showAlert('No email', 'Could not determine your email.');
      return;
    }
    setResetBusy(true);
    try {
      await sendResetPasswordEmail(email);
      showAlert(
        'Reset email sent',
        `Password reset email sent to ${email}. Check your inbox.`
      );
    } catch (e: any) {
      showAlert('Error', e?.message ?? 'Could not send reset email.');
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="Settings" transparent noBorder />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: getContentBottomPadding(),
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Account */}
        <View>
          <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.sm }]}>
            Account
          </Text>
          <Card>
            <View style={{ gap: spacing.xs }}>
              <Pressable
                style={styles.item}
                onPress={() => navigation.navigate('Profile')}
              >
                <View style={styles.itemLeft}>
                  <Ionicons name="person-circle-outline" size={22} color={colors.brand} />
                  <Text style={[styles.itemText, { color: colors.text }]}>
                    Profile
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
              </Pressable>

              <View style={[styles.item, { paddingVertical: spacing.sm }]}>
                <View style={styles.itemLeft}>
                  <Ionicons name="mail-outline" size={22} color={colors.brand} />
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.small, { color: colors.subtext }]}>Email</Text>
                    <Text style={[styles.itemText, { color: colors.text }]} numberOfLines={1}>
                      {profile?.email}
                    </Text>
                  </View>
                </View>
              </View>

              <Pressable
                onPress={onResetPassword}
                disabled={resetBusy}
                style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
              >
                <View style={styles.itemLeft}>
                  <Ionicons name="key-outline" size={22} color={colors.brand} />
                  <Text style={[styles.itemText, { color: colors.text }]}>
                    {resetBusy ? 'Sending...' : 'Reset Password'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
              </Pressable>
            </View>
          </Card>
        </View>

        {/* Preferences */}
        <View>
          <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.sm }]}>
            Preferences
          </Text>
          <Card>
            <View style={{ gap: spacing.xs }}>
              <View style={styles.item}>
                <View style={styles.itemLeft}>
                  <Ionicons name="moon-outline" size={22} color={colors.brand} />
                  <Text style={[styles.itemText, { color: colors.text }]}>Dark Mode</Text>
                </View>
                <Switch
                  value={darkMode}
                  onValueChange={onToggleDark}
                  trackColor={{ false: colors.border, true: colors.brand }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.item}>
                <View style={styles.itemLeft}>
                  <Ionicons name="notifications-outline" size={22} color={colors.brand} />
                  <Text style={[styles.itemText, { color: colors.text }]}>
                    Notifications
                  </Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={onToggleNotifications}
                  disabled={!notificationReady || updatingNotifications}
                  trackColor={{ false: colors.border, true: colors.brand }}
                  thumbColor="#fff"
                />
              </View>

              <Pressable style={styles.item} onPress={() => navigation.navigate('NotificationPreferences')}>
                <View style={styles.itemLeft}>
                  <Ionicons name="options-outline" size={22} color={colors.brand} />
                  <Text style={[styles.itemText, { color: colors.text }]}>Notification Preferences</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
              </Pressable>

              <View style={styles.item}>
                <View style={styles.itemLeft}>
                  <Ionicons name="airplane-outline" size={22} color={colors.brand} />
                  <Text style={[styles.itemText, { color: colors.text }]}>
                    Force Offline Mode (Demo)
                  </Text>
                </View>
                <Switch
                  value={forceOffline}
                  onValueChange={onToggleForceOffline}
                  trackColor={{ false: colors.border, true: colors.brand }}
                  thumbColor="#fff"
                />
              </View>

              <Pressable style={styles.item} onPress={pickCurrency}>
                <View style={styles.itemLeft}>
                  <Ionicons name="cash-outline" size={22} color={colors.brand} />
                  <Text style={[styles.itemText, { color: colors.text }]}>Currency</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Text style={[typography.small, { color: colors.subtext }]}>{currency}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
                </View>
              </Pressable>
            </View>
          </Card>
        </View>

        {/* Income */}
        <View>
          <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.sm }]}>
            Income
          </Text>
          <Card>
            <View style={{ gap: spacing.md }}>
              <View>
                <Text style={[typography.small, { color: colors.subtext, marginBottom: spacing.xs }]}>
                  Monthly Salary (AED)
                </Text>
                <TextField
                  value={salaryText}
                  onChangeText={setSalaryText}
                  keyboardType="number-pad"
                  placeholder="e.g. 5000"
                />
              </View>
              <Button
                label={savingSalary ? 'Saving...' : 'Save'}
                onPress={saveSalary}
                disabled={savingSalary}
                tone="green"
                fullWidth
              />
            </View>
          </Card>
        </View>

        {/* About */}
        <View>
          <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.sm }]}>
            Data & Export
          </Text>
          <Card>
            <View style={{ gap: spacing.xs }}>
              <Pressable style={styles.item} onPress={() => navigation.navigate('ExportData')}>
                <View style={styles.itemLeft}>
                  <Ionicons name="download-outline" size={22} color={colors.brand} />
                  <Text style={[styles.itemText, { color: colors.text }]}>
                    Export Payment History
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
              </Pressable>
            </View>
          </Card>
        </View>

        {/* About */}
        <View>
          <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.sm }]}>
            About
          </Text>
          <Card>
            <View style={{ gap: spacing.xs }}>
              <Pressable style={styles.item} onPress={showAbout}>
                <View style={styles.itemLeft}>
                  <Ionicons name="information-circle-outline" size={22} color={colors.brand} />
                  <Text style={[styles.itemText, { color: colors.text }]}>About</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
              </Pressable>

              <Pressable style={styles.item} onPress={openTerms}>
                <View style={styles.itemLeft}>
                  <Ionicons name="document-text-outline" size={22} color={colors.brand} />
                  <Text style={[styles.itemText, { color: colors.text }]}>
                    Terms & Conditions
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
              </Pressable>

              <Pressable style={styles.item} onPress={openPrivacy}>
                <View style={styles.itemLeft}>
                  <Ionicons name="shield-checkmark-outline" size={22} color={colors.brand} />
                  <Text style={[styles.itemText, { color: colors.text }]}>Privacy Policy</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
              </Pressable>
            </View>
          </Card>
        </View>

        {/* Logout */}
        <Button
          label="Log Out"
          variant="outline"
          onPress={onLogout}
          fullWidth
        />

        <View style={{ alignItems: 'center', paddingTop: spacing.md }}>
          <Text style={[typography.small, { color: colors.subtext }]}>
            v
            {(Constants?.expoConfig as any)?.version ||
              (Constants?.manifest as any)?.version ||
              '1.0.0'}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  itemText: {
    fontSize: 16,
  },
});
