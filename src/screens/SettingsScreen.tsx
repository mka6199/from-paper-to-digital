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
import { colors as staticTokens, spacing, typography } from '../theme/tokens';
import AppHeader from '../components/layout/AppHeader';
import { signOut } from '../../firebase';
import { AuthContext } from '../context/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useTheme } from '../theme/ThemeProvider';

export default function SettingsScreen({ navigation }: any) {
  const { profile } = React.useContext(AuthContext);
  const { mode, setMode, colors } = useTheme();
  const [darkMode, setDarkMode] = React.useState(mode === 'dark');
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [language, setLanguage] = React.useState<'English' | 'Arabic'>('English');
  const [currency, setCurrency] = React.useState<'AED' | 'USD' | 'EUR' | 'GBP'>('AED');

  React.useEffect(() => {
    (async () => {
      try {
        const [ntf, lang, curr] = await Promise.all([
          AsyncStorage.getItem('settings.notifications'),
          AsyncStorage.getItem('settings.language'),
          AsyncStorage.getItem('settings.currency'),
        ]);
        if (ntf !== null) setNotificationsEnabled(ntf === '1');
        if (lang === 'English' || lang === 'Arabic') setLanguage(lang);
        if (curr === 'AED' || curr === 'USD' || curr === 'EUR' || curr === 'GBP') setCurrency(curr);
      } catch {}
    })();
  }, []);

  React.useEffect(() => {
    setDarkMode(mode === 'dark');
  }, [mode]);

  const persist = React.useCallback(async (key: string, val: string) => {
    try { await AsyncStorage.setItem(key, val); } catch {}
  }, []);

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

  const pickCurrency = () => {
    const options = ['AED', 'USD', 'EUR', 'GBP', 'Cancel'] as const;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: options as unknown as string[], cancelButtonIndex: 4 },
        (idx) => {
          if (idx === 0 || idx === 1 || idx === 2 || idx === 3) {
            const choice = options[idx] as 'AED' | 'USD' | 'EUR' | 'GBP';
            setCurrency(choice);
            persist('settings.currency', choice);
          }
        }
      );
    } else {
      Alert.alert('Currency Format', 'Choose your currency', [
        { text: 'AED', onPress: () => { setCurrency('AED'); persist('settings.currency', 'AED'); } },
        { text: 'USD', onPress: () => { setCurrency('USD'); persist('settings.currency', 'USD'); } },
        { text: 'EUR', onPress: () => { setCurrency('EUR'); persist('settings.currency', 'EUR'); } },
        { text: 'GBP', onPress: () => { setCurrency('GBP'); persist('settings.currency', 'GBP'); } },
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

  return (
    <Screen>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: spacing['2xl'] }}
      >
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Account</Text>

          <Pressable style={[styles.item, { borderColor: colors.border }]} onPress={() => navigation.navigate('Profile')}>
            <View style={styles.itemLeft}>
              <Ionicons name="person-circle-outline" size={22} color={colors.brand} />
              <Text style={[styles.itemText, { color: colors.text }]}>Profile Information</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </Pressable>

          <View style={[styles.item, { justifyContent: 'space-between', borderColor: colors.border }]}>
            <View style={styles.itemLeft}>
              <Ionicons name="mail-outline" size={22} color={colors.brand} />
              <Text style={[styles.itemText, { color: colors.text }]}>Email</Text>
            </View>
            <Text style={[typography.small, { color: colors.subtext }]} numberOfLines={1}>
              {profile?.email}
            </Text>
          </View>

          <View style={[styles.item, { justifyContent: 'space-between', borderColor: colors.border }]}>
            <View style={styles.itemLeft}>
              <Ionicons name="id-card-outline" size={22} color={colors.brand} />
              <Text style={[styles.itemText, { color: colors.text }]}>Full Name</Text>
            </View>
            <Text style={[typography.small, { color: colors.subtext }]} numberOfLines={1}>
              {(profile?.firstName && profile?.lastName) ? `${profile.firstName} ${profile.lastName}` : (profile?.firstName || profile?.email || 'User')}
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Preferences</Text>

          <View style={[styles.item, styles.switchItem, { borderColor: colors.border }]}>
            <View style={styles.itemLeft}>
              <Ionicons name="moon-outline" size={22} color={colors.brand} />
              <Text style={[styles.itemText, { color: colors.text }]}>Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={onToggleDark}
              trackColor={{ false: '#ccc', true: staticTokens.brand }}
            />
          </View>

          <View style={[styles.item, styles.switchItem, { borderColor: colors.border }]}>
            <View style={styles.itemLeft}>
              <Ionicons name="notifications-outline" size={22} color={colors.brand} />
              <Text style={[styles.itemText, { color: colors.text }]}>Push Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={onToggleNotifications}
              trackColor={{ false: '#ccc', true: staticTokens.brand }}
            />
          </View>

          <Pressable style={[styles.item, { borderColor: colors.border }]} onPress={pickLanguage}>
            <View style={styles.itemLeft}>
              <Ionicons name="globe-outline" size={22} color={colors.brand} />
              <Text style={[styles.itemText, { color: colors.text }]}>Language</Text>
            </View>
            <View style={styles.itemLeft}>
              <Text style={[typography.small, { color: colors.subtext }]}>{language}</Text>
              <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
            </View>
          </Pressable>

          <Pressable style={[styles.item, { borderColor: colors.border }]} onPress={pickCurrency}>
            <View style={styles.itemLeft}>
              <Ionicons name="cash-outline" size={22} color={colors.brand} />
              <Text style={[styles.itemText, { color: colors.text }]}>Currency Format</Text>
            </View>
            <View style={styles.itemLeft}>
              <Text style={[typography.small, { color: colors.subtext }]}>{currency}</Text>
              <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
            </View>
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.subtext }]}>About</Text>

          <Pressable style={[styles.item, { borderColor: colors.border }]} onPress={showAbout}>
            <View style={styles.itemLeft}>
              <Ionicons name="information-circle-outline" size={22} color={colors.brand} />
              <Text style={[styles.itemText, { color: colors.text }]}>About This App</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </Pressable>

          <Pressable style={[styles.item, { borderColor: colors.border }]} onPress={openTerms}>
            <View style={styles.itemLeft}>
              <Ionicons name="document-text-outline" size={22} color={colors.brand} />
              <Text style={[styles.itemText, { color: colors.text }]}>Terms & Conditions</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </Pressable>

          <Pressable style={[styles.item, { borderColor: colors.border }]} onPress={openPrivacy}>
            <View style={styles.itemLeft}>
              <Ionicons name="shield-checkmark-outline" size={22} color={colors.brand} />
              <Text style={[styles.itemText, { color: colors.text }]}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </Pressable>
        </View>

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
          <Text style={[typography.small, { color: colors.subtext }]}>
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
    ...typography.small,
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logoutText: {
    fontWeight: '700',
    fontSize: 16,
  },
});
