import React, { useState } from 'react';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import Card from '../../components/primitives/Card';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import { Alert, View, ScrollView } from 'react-native';
import { spacing } from '../../theme/tokens';
import { signIn } from '../../../firebase';

export default function SignInScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    try {
      setBusy(true);
      await signIn(email, password);
    } catch (e: any) {
      Alert.alert('Sign in failed', e?.message ?? 'Check your email/password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.lg }}>
        <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center' }}>
          <AppHeader title="Sign In" />
          <Card style={{ padding: spacing.lg }}>
            <View style={{ gap: spacing.md }}>
              <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
              <Button label={busy ? 'Signing in…' : 'Sign In'} onPress={onSubmit} disabled={busy} fullWidth />
              <Button label="Create an account" variant="soft" onPress={()=>navigation.navigate('SignUp')} fullWidth />
            </View>
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}
