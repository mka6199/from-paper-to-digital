import React, { useState } from 'react';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import Card from '../../components/primitives/Card';
import TextField from '../../components/primitives/TextField';
import Button from '../../components/primitives/Button';
import { Alert, View, ScrollView } from 'react-native';
import { spacing } from '../../theme/tokens';
import { signUp } from '../../../firebase';
import { createUserProfile } from '../../services/users';

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
const isPhone = (s: string) => /^[0-9()+\-.\s]{7,20}$/.test(String(s).trim());
const isYMD  = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(String(s).trim());

export default function SignUpScreen({ navigation }: any) {
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [phone,     setPhone]     = useState('');
  const [dob,       setDob]       = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [busy,      setBusy]      = useState(false);

  async function onSubmit() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Missing name', 'Please enter your first and last name.');
      return;
    }
    if (!isPhone(phone)) {
      Alert.alert('Invalid phone', 'Please enter a valid phone number.');
      return;
    }
    if (!isYMD(dob)) {
      Alert.alert('Invalid date of birth', 'Use YYYY-MM-DD format.');
      return;
    }
    if (!isEmail(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Passwords do not match', 'Please re-enter your password.');
      return;
    }

    try {
      setBusy(true);
      const cred = await signUp(email.trim(), password);
      await createUserProfile(cred.user.uid, {
        email: email.trim().toLowerCase(),
        firstName: firstName.trim(),
        lastName : lastName.trim(),
        phone    : phone.trim(),
        dobYMD   : dob.trim(),
        role     : 'user',
      });
    
    } catch (e: any) {
      Alert.alert('Sign up failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.lg }}>
        <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center' }}>
          <AppHeader title="Create Account" onBack={() => navigation.goBack()} />
          <Card style={{ padding: spacing.lg }}>
            <View style={{ gap: spacing.md }}>
              <TextField label="First name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
              <TextField label="Last name"  value={lastName}  onChangeText={setLastName}  autoCapitalize="words" />
              <TextField label="Phone"      value={phone}     onChangeText={setPhone}     keyboardType="phone-pad" />
              <TextField label="Date of birth (YYYY-MM-DD)" value={dob} onChangeText={setDob} placeholder="e.g., 2001-05-12" />
              <TextField label="Email"      value={email}     onChangeText={setEmail}     autoCapitalize="none" keyboardType="email-address" />
              <TextField label="Password"   value={password}  onChangeText={setPassword}  secureTextEntry />
              <TextField label="Confirm Password" value={confirm} onChangeText={setConfirm} secureTextEntry />
              <Button label={busy ? 'Creating…' : 'Sign Up'} onPress={onSubmit} disabled={busy} fullWidth />
            </View>
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}
