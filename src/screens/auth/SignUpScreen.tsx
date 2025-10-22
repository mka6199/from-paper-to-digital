import React, { useState } from 'react';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import Card from '../../components/primitives/Card';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import { Alert, View, ScrollView } from 'react-native';
import { spacing } from '../../theme/tokens';
import { signUp } from '../../../firebase';
import { ensureUserProfile } from '../../services/users';

export default function SignUpScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!email.trim() || !password) return Alert.alert('Missing info', 'Please enter email and password.');
    if (password.length < 6) return Alert.alert('Weak password', 'Password must be at least 6 characters.');
    if (password !== confirm) return Alert.alert('Passwords do not match');

    try {
      setBusy(true);
      const cred = await signUp(email, password);
      await ensureUserProfile(cred.user.uid, cred.user.email ?? email);
    } catch (e: any) {
      Alert.alert('Sign up failed', e?.message ?? 'Please try a different email.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.lg }}>
        <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center' }}>
          <AppHeader title="Create Account" onBack={()=>navigation.goBack()} />
          <Card style={{ padding: spacing.lg }}>
            <View style={{ gap: spacing.md }}>
              <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
              <TextField label="Confirm Password" value={confirm} onChangeText={setConfirm} secureTextEntry />
              <Button label={busy ? 'Creating…' : 'Sign Up'} onPress={onSubmit} disabled={busy} fullWidth />
            </View>
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}
