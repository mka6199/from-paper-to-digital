// src/screens/SettingsScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  ActionSheetIOS,
  Linking,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import Screen from '../components/layout/Screen';
import { spacing, typography } from '../theme/tokens';
import AppHeader from '../components/layout/AppHeader';
import { signOut } from '../../firebase';
import { AuthContext } from '../context/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useTheme } from '../theme/ThemeProvider';
import { useCurrency } from '../context/CurrencyProvider'; // ✅ FIXED PATH

export default function SettingsScreen({ navigation }: any) {
  const { profile } = React.useContext(AuthContext);
  const { colors, mode, setMode } = useTheme();

  // ✅ currency context
  const { currency, setCurrency, supported, format, symbols } = useCurrency();

  const [darkMode, setDarkMode] = React.useState(mode === 'dark');
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [language, setLanguage] = React.useState<'English' | 'Arabic'>('English');

  // local UI state for the inline dropdown
  const [showCurrencyDropdown, setShowCurrencyDropdown] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const [dm, ntf, lang, curr] = await Promise.all([
          AsyncStorage.getItem('settings.darkMode'),
          AsyncStorage.getItem('settings.notifications'),
          AsyncStorage.getItem('settings.language'),
          AsyncStorage.getItem('settings.currency'),
        ]);
        if (dm !== null) {
          const on = dm === '1';
          setDarkMode(on);
          setMode(on ? 'dark' : 'light');
        }
        if (ntf !== null) setNotificationsEnabled(ntf === '1');
        if (lang === 'English' || lang === 'Arabic') setLanguage(lang as any);

        // If you stored a previous currency, sync it to the context (and vice-versa).
        if (curr && supported.includes(curr as any)) {
          setCurrency(curr as any);
        }
      } catch {}
    })();
  }, [setMode, setCurrency, supported]);

  const persist = React.useCallback(async (key: string, val: string) => {
    try { await AsyncStorage.setItem(key, val); } catch {}
  }, []);

  // keep AsyncStorage in sync when currency changes via inline picker
  React.useEffect(() => {
    persist('settings.currency', currency);
  }, [currency, persist]);

  const displayName =
    (profile?.firstName
      ? `${profile.firstName}${profile?.lastName ? ' ' + profile.lastName : ''}`
      : '') || profile?.email || 'User';

  const resetToAuth = React.useCallback(() => {
    let parent = navigation as any;
    while (parent?.getParent && parent.getParent()) {
      parent = parent.getParent();
    }
    parent?.dispatch?.(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      })
    );
  }, [navigation]);

  function onLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            resetToAuth();
            setTimeout(resetToAuth, 0);
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Could not log out. Please try again.');
          }
        },
      },
    ]);
  }

  const onToggleDark = (v: boolean) => {
    setDarkMode(v);
    setMode(v ? 'dark' : 'light');
    persist('settings.darkMode', v ? '1' : '0');
  };
  const onToggleNotifications = (v: boolean) => {
    setNotificationsEnabled(v);
    persist('settings.notifications', v ? '1' : '0');
  };

  const pickLanguage = () => {
    const options = ['English', 'Arabic', 'Cancel'] as const;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: options as unknown as string[], cancelButtonIndex: 2 },
        (idx) => {
          if (idx === 0 || idx === 1) {
            const choice = options[idx];
            setLanguage(choice);
            persist('settings.language', choice);
          }
        }
      );
    } else {
      Alert.alert('Language', 'Choose your language', [
        { text: 'English', onPress: () => { setLanguage('English'); persist('settings.language', 'English'); } },
        { text: 'Arabic',  onPress: () => { setLanguage('Arabic');  persist('settings.language', 'Arabic'); } },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  // ⬇️ keep your original ActionSheet flow (nothing removed)
  const pickCurrency = () => {
    const options = [...supported, 'Cancel'] as const;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: options as unknown as string[], cancelButtonIndex: options.length - 1 },
        (idx) => {
          if (idx != null && idx >= 0 && idx < options.length - 1) {
            const choice = options[idx] as typeof supported[number];
            setCurrency(choice);
            persist('settings.currency', choice);
          }
        }
      );
    } else {
      Alert.alert('Currency Format', 'Choose your currency', [
        ...supported.map((c) => ({
          text: c,
          onPress: () => { setCurrency(c); persist('settings.currency', c); },
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
    Alert.alert(
      'About This App',
      `From Paper to Digital\nVersion: ${version}\n\nTrack workforce, payments, and income with clear KPIs.`,
      [{ text: 'OK' }]
    );
  };
  const openTerms = async () => {
    const url = 'https://example.com/terms';
    if (await Linking.canOpenURL(url)) Linking.openURL(url);
    else Alert.alert('Terms & Conditions', 'Terms page is not configured yet.');
  };
  const openPrivacy = async () => {
    const url = 'https://example.com/privacy';
    if (await Linking.canOpenURL(url)) Linking.openURL(url);
    else Alert.alert('Privacy Policy', 'Privacy page is not configured yet.');
  };

  // ---------- UI ----------
  return (
    <Screen>
      <AppHeader title="Settings" />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: spacing['2xl'] }}
      >
        {/* Account */}
        <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Account</Text>

          <Pressable style={styles.item} onPress={() => navigation.navigate('Profile')}>
            <View style={styles.itemLeft}>
              <Ionicons name="person-circle-outline" size={22} color={colors.brand} />
              <Text style={[styles.itemText, { color: colors.text }]}>Profile Information</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
          </Pressable>

          <View style={[styles.item, { justifyContent: 'space-between' }]}>
            <View style={styles.itemLeft}>
              <Ionicons name="mail-outline" size={22} color={colors.brand} />
              <Text style={[styles.itemText, { color: colors.text }]}>Email</Text>
            </View>
            <Text style={[styles.small, { color: colors.subtext }]} numberOfLines={1}>
              {profile?.email}
            </Text>
          </View>

          <View style={[styles.item, { justifyContent: 'space-between' }]}>
            <View style={styles.itemLeft}>
              <Ionicons name="id-card-outline" size={22} color={colors.brand} />
              <Text style={[styles.itemText, { color: colors.text }]}>Full Name</Text>
            </View>
            <Text style={[styles.small, { color: colors.subtext }]} numberOfLines={1}>
              {displayName}
            </Text>
          </View>
        </View>

        {/* Preferences */}
        <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Preferences</Text>

          <View style={[styles.item, styles.switchItem]}>
            <View style={styles.itemLeft}>
              <Ionicons name="moon-outline" size={22} color={colors.brand} />
              <Text style={[styles.itemText, { color: colors.text }]}>Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={onToggleDark}
              trackColor={{ false: colors.border, true: colors.brand }}
              thumbColor={darkMode ? colors.brand : '#fff'}
            />
          </View>

          <View style={[styles.item, styles.switchItem]}>
            <View style={styles.itemLeft}>
              <Ionicons name="notifications-outline" size={22} color={colors.brand} />
              <Text style={[styles.itemText, { color: colors.text }]}>Push Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={onToggleNotifications}
              trackColor={{ false: colors.border, true: colors.brand }}
              thumbColor={notificationsEnabled ? colors.brand : '#fff'}
            />
          </View>

          <Pressable style={styles.item} onPress={pickLanguage}>
            <View style={styles.itemLeft}>
              <Ionicons name="globe-outline" size={22} color={colors.brand} />
              <Text style={[styles.itemText, { color: colors.text }]}>Language</Text>
            </View>
            <View style={styles.itemLeft}>
              <Text style={[styles.small, { color: colors.subtext }]}>{language}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
            </View>
          </Pressable>

          {/* Currency selector row (tap toggles inline dropdown) */}
          <Pressable
            style={styles.item}
            onPress={() => setShowCurrencyDropdown((s) => !s)}
            accessibilityRole="button"
            accessibilityLabel="Change Currency Format"
          >
            <View style={styles.itemLeft}>
              <Ionicons name="cash-outline" size={22} color={colors.brand} />
              <Text style={[styles.itemText, { color: colors.text }]}>Currency Format</Text>
            </View>
            <View style={styles.itemLeft}>
              <Text style={[styles.small, { color: colors.subtext }]}>{currency}</Text>
              <Ionicons
                name={showCurrencyDropdown ? 'chevron-up' : 'chevron-forward'}
                size={18}
                color={colors.subtext}
              />
            </View>
          </Pressable>

          {/* Inline dropdown panel (additive; keeps your ActionSheet pickCurrency too) */}
          {showCurrencyDropdown && (
            <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
              <View
                style={{
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                {supported.map((c, idx) => {
                  const isActive = c === currency;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => {
                        setCurrency(c);
                        AsyncStorage.setItem('settings.currency', c).catch(() => {});
                      }}
                      style={({ pressed }) => [
                        {
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: isActive ? `${colors.focus}10` : colors.surface,
                          borderTopWidth: idx === 0 ? 0 : StyleSheet.hairlineWidth,
                          borderColor: colors.border,
                        },
                        pressed && { opacity: 0.9 },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ color: colors.text, fontWeight: '600' }}>{c}</Text>
                        <Text style={{ color: colors.subtext }}>
                          {/* live preview: 100 AED -> converted */}
                          {format(100, c as any)} {/* 100 AED sample */}
                        </Text>
                      </View>
                      {isActive ? (
                        <Ionicons name="checkmark-circle" size={18} color={colors.brand} />
                      ) : (
                        <Ionicons name="ellipse-outline" size={16} color={colors.border} />
                      )}
                    </Pressable>
                  );
                })}

                {/* Fallback to your original ActionSheet flow if they prefer that UI */}
                <Pressable
                  onPress={pickCurrency}
                  style={({ pressed }) => [
                    {
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      alignItems: 'center',
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderColor: colors.border,
                    },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={{ color: colors.subtext }}>More options…</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* About */}
        <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.subtext }]}>About</Text>

          <Pressable style={styles.item} onPress={showAbout}>
            <View style={styles.itemLeft}>
              <Ionicons name="information-circle-outline" size={22} color={colors.brand} />
              <Text style={[styles.itemText, { color: colors.text }]}>About This App</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
          </Pressable>

          <Pressable style={styles.item} onPress={openTerms}>
            <View style={styles.itemLeft}>
              <Ionicons name="document-text-outline" size={22} color={colors.brand} />
              <Text style={[styles.itemText, { color: colors.text }]}>Terms & Conditions</Text>
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

        {/* Logout */}
        <View style={[styles.section, { marginTop: spacing.xl, backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            onPress={onLogout}
            style={({ pressed }) => [
              styles.logoutButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={[styles.logoutText, { color: colors.danger }]}>Log Out</Text>
          </Pressable>
        </View>

        <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
          <Text style={[styles.small, { color: colors.subtext }]}>
            v{(Constants?.expoConfig as any)?.version || (Constants?.manifest as any)?.version || '1.0.0'}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {},
  section: {
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
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
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  itemText: {
    fontSize: 16,
  },
  small: { fontSize: 14 },
  switchItem: {
    justifyContent: 'space-between',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logoutText: {
    fontWeight: '700',
    fontSize: 16,
  },
});
