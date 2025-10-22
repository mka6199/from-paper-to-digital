import React, { useState } from 'react';
import { Alert, View, KeyboardAvoidingView, Platform } from 'react-native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import { spacing } from '../../theme/tokens';
import { auth, db } from '../../../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'create'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!email || !password) return Alert.alert('Missing info', 'Please enter email and password.');
    setBusy(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await setDoc(
          doc(db, 'users', cred.user.uid),
          { uid: cred.user.uid, email: cred.user.email, isAdmin: false, createdAt: serverTimestamp() },
          { merge: true }
        );
      }
    } catch (e: any) {
      Alert.alert('Auth error', e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'height' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: spacing.lg }}>
            <AppHeader
              title={mode === 'login' ? 'Login' : 'Create Account'}
              subtitle="From Paper to Digital"
            />
            <View style={{ gap: spacing.lg, marginTop: spacing.lg }}>
              <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <View style={{ gap: spacing.md, marginTop: spacing.md }}>
                <Button
                  label={mode === 'login' ? 'Login' : 'Create Account'}
                  onPress={onSubmit}
                  loading={busy}
                  disabled={busy}
                  fullWidth
                />
                <Button
                  label={mode === 'login' ? 'New here? Create Account' : 'Have an account? Login'}
                  variant="soft"
                  onPress={() => setMode((m) => (m === 'login' ? 'create' : 'login'))}
                  disabled={busy}
                  fullWidth
                />
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
