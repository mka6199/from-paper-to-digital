import React from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView } from 'react-native';
import Screen from '../components/layout/Screen';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/primitives/Button';
import Card from '../components/primitives/Card';
import { spacing } from '../theme/tokens';
import { AuthContext } from '../context/AuthProvider';
import { getAuth, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { getMyProfile, upsertMyProfile } from '../services/profile';
import { useTheme } from '../theme/ThemeProvider';

export default function ProfileScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { profile } = React.useContext(AuthContext);
  const auth = getAuth();
  const email = auth.currentUser?.email ?? profile?.email ?? '';

  const [firstName, setFirstName] = React.useState(profile?.firstName ?? '');
  const [lastName, setLastName] = React.useState(profile?.lastName ?? '');
  const [phone, setPhone] = React.useState(profile?.phone ?? '');
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getMyProfile()
      .then((doc) => {
        if (doc) {
          setFirstName(doc.firstName ?? firstName);
          setLastName(doc.lastName ?? lastName);
          setPhone(doc.phone ?? phone);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function onSave() {
    try {
      setSaving(true);
      await upsertMyProfile({
        firstName: firstName?.trim() || '',
        lastName: lastName?.trim() || '',
        phone: phone?.trim() || '',
      });
      const user = getAuth().currentUser;
      if (user) {
        const displayName = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ');
        if (displayName) await updateProfile(user, { displayName });
      }
      Alert.alert('Saved', 'Profile updated successfully.');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  async function onResetPassword() {
    try {
      if (!email) {
        Alert.alert('No Email', 'Your account has no email associated.');
        return;
      }
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Check your email', 'Password reset link has been sent.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not send reset email.');
    }
  }

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        sectionCard: {
          padding: spacing.lg,
          gap: spacing.md,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 16,
        },
        title: { fontSize: 22, fontWeight: '700', color: colors.text },
        label: { fontSize: 14, color: colors.subtext },
        valueText: { fontSize: 16, color: colors.subtext, marginTop: 4 },
        input: {
          borderWidth: 1,
          borderColor: (colors as any).inputBorder || colors.border,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          marginTop: 6,
          color: colors.text,
          backgroundColor: (colors as any).inputBg || colors.surface,
        },
        spacer: { height: spacing['2xl'] as any },
      }),
    [colors]
  );

  return (
    <Screen>
      <AppHeader
        title="Profile"
        onBack={() => navigation.navigate('Settings')}
        backLabel="Settings"
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <Card style={styles.sectionCard}>
          <Text style={styles.title}>Profile Information</Text>

          <View>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.valueText}>{email || '—'}</Text>
          </View>

          <View>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor={colors.subtext}
              autoCapitalize="words"
              style={styles.input}
            />
          </View>

          <View>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor={colors.subtext}
              autoCapitalize="words"
              style={styles.input}
            />
          </View>

          <View>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+971 50 000 0000"
              placeholderTextColor={colors.subtext}
              keyboardType="phone-pad"
              style={styles.input}
            />
          </View>

          <Button
            label={saving ? 'Saving...' : 'Save Changes'}
            disabled={saving}
            onPress={onSave}
            fullWidth
          />
          <Button
            label="Send Password Reset Email"
            variant="outline"
            onPress={onResetPassword}
            fullWidth
          />
        </Card>

        <View style={styles.spacer} />
      </ScrollView>
    </Screen>
  );
}
