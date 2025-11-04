import React from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView } from 'react-native';
import Screen from '../components/layout/Screen';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/primitives/Button';
import Card from '../components/primitives/Card';
import { colors, spacing, typography } from '../theme/tokens';
import { AuthContext } from '../context/AuthProvider';
import { getAuth, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { getMyProfile, upsertMyProfile } from '../services/profile';

export default function ProfileScreen({ navigation }: any) {
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

  return (
    <Screen>
      <AppHeader title="Profile" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <Card style={{ padding: spacing.lg, gap: spacing.md }}>
          <Text style={typography.h1}>Profile Information</Text>

          <View>
            <Text style={typography.small}>Email</Text>
            <Text style={[typography.body, { color: colors.subtext, marginTop: 4 }]}>
              {email || '—'}
            </Text>
          </View>

          <View>
            <Text style={typography.small}>First Name</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              autoCapitalize="words"
              style={styles.input}
            />
          </View>

          <View>
            <Text style={typography.small}>Last Name</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              autoCapitalize="words"
              style={styles.input}
            />
          </View>

          <View>
            <Text style={typography.small}>Phone</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+971 50 000 0000"
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

        <View style={{ height: spacing['2xl'] }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
    backgroundColor: '#fff',
  },
});
