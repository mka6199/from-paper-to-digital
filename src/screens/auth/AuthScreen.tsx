import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../../utils/alert';
import Screen from '../../components/layout/Screen';
import Card from '../../components/primitives/Card';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { auth, db } from '../../config/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';

export default function AuthScreen() {
  const { colors } = useTheme();
  const [mode, setMode] = useState<'login' | 'create'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const { signIn: signInWithGoogle, loading: googleLoading } = useGoogleAuth();

  async function onSubmit() {
    if (!email || !password) {
      return showAlert('Missing info', 'Please enter email and password.');
    }

    if (mode === 'create') {
      if (!firstName || !lastName) {
        return showAlert('Missing info', 'Please enter your first and last name.');
      }
      if (password.length < 6) {
        return showAlert('Weak Password', 'Password must be at least 6 characters.');
      }
      if (password !== confirmPassword) {
        return showAlert('Password Mismatch', 'Passwords do not match.');
      }
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await setDoc(
          doc(db, 'users', cred.user.uid),
          { 
            uid: cred.user.uid, 
            email: cred.user.email,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim() || null,
            role: 'user',
            isAdmin: false,
            isActive: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (e: any) {
      const message = e?.code === 'auth/user-not-found' 
        ? 'No account found with this email.'
        : e?.code === 'auth/wrong-password'
        ? 'Incorrect password.'
        : e?.code === 'auth/email-already-in-use'
        ? 'This email is already registered.'
        : e?.code === 'auth/invalid-email'
        ? 'Please enter a valid email address.'
        : e?.message ?? String(e);
      showAlert('Authentication Error', message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.container}>
          <View style={styles.content}>
            {/* Logo/Icon */}
            <View style={[styles.iconContainer, { backgroundColor: colors.brand }]}>
              <Ionicons name="briefcase-outline" size={48} color="#fff" />
            </View>

            {/* Title */}
            <Text style={[typography.h1, { color: colors.text, textAlign: 'center', marginTop: spacing.lg }]}>
              {mode === 'login' ? 'Welcome Back' : 'Get Started'}
            </Text>
            <Text style={[typography.body, { color: colors.subtext, textAlign: 'center', marginTop: spacing.xs }]}>
              {mode === 'login' 
                ? 'Sign in to manage your payroll' 
                : 'Create an account to get started'}
            </Text>

            {/* Form */}
            <Card style={{ marginTop: spacing.xl }}>
              <View style={{ gap: spacing.md }}>
                {mode === 'create' && (
                  <>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <View style={{ flex: 1 }}>
                        <TextField
                          label="First Name"
                          value={firstName}
                          onChangeText={setFirstName}
                          placeholder="John"
                          autoComplete="given-name"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <TextField
                          label="Last Name"
                          value={lastName}
                          onChangeText={setLastName}
                          placeholder="Doe"
                          autoComplete="family-name"
                        />
                      </View>
                    </View>
                    <TextField
                      label="Phone (Optional)"
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="+971 50 123 4567"
                      keyboardType="phone-pad"
                      autoComplete="tel"
                    />
                  </>
                )}
                <TextField
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <TextField
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="Enter your password"
                  autoComplete={mode === 'login' ? 'password' : 'password-new'}
                />
                
                {mode === 'create' && (
                  <TextField
                    label="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    placeholder="Re-enter your password"
                    autoComplete="password-new"
                  />
                )}
              </View>
            </Card>

            {/* Action Buttons */}
            <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
              <Button
                label={mode === 'login' ? 'Sign In' : 'Create Account'}
                onPress={onSubmit}
                loading={busy}
                disabled={busy || googleLoading}
                fullWidth
                tone="brand"
              />

              {/* Divider */}
              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[typography.small, { color: colors.subtext, paddingHorizontal: spacing.sm }]}>
                  OR
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>

              {/* Google Sign-In Button */}
              <Pressable
                onPress={signInWithGoogle}
                disabled={busy || googleLoading}
                style={[
                  styles.googleButton,
                  { 
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    opacity: (busy || googleLoading) ? 0.5 : 1,
                  }
                ]}
              >
                <Ionicons name="logo-google" size={20} color="#DB4437" />
                <Text style={[typography.body, { color: colors.text, marginLeft: spacing.sm }]}>
                  Continue with Google
                </Text>
              </Pressable>
              
              {/* Switch Mode */}
              <View style={styles.switchModeContainer}>
                <Text style={[typography.small, { color: colors.subtext }]}>
                  {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                </Text>
                <Pressable onPress={() => setMode((m) => (m === 'login' ? 'create' : 'login'))} disabled={busy || googleLoading}>
                  <Text style={[typography.small, { color: colors.brand, fontWeight: '700', marginLeft: 4 }]}>
                    {mode === 'login' ? 'Sign Up' : 'Sign In'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Footer */}
            <Text style={[typography.small, { color: colors.subtext, textAlign: 'center', marginTop: spacing.xl }]}>
              From Paper to Digital
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  content: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  switchModeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
});
