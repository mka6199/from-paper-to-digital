// src/components/composites/ResetPasswordButton.tsx
import React from 'react';
import { Alert } from 'react-native';
import Button from '../primitives/Button';
import { requestPasswordReset } from '../../services/auth';
import { AuthContext } from '../../context/AuthProvider';

type Props = {
  /** Optional explicit email; if omitted, we'll use the signed-in user's email */
  email?: string | null;
  fullWidth?: boolean;
  label?: string;
};

export default function ResetPasswordButton({ email, fullWidth = true, label = 'Send reset email' }: Props) {
  const { profile, user } = React.useContext(AuthContext);
  const fallbackEmail = profile?.email || user?.email || '';
  const target = (email ?? fallbackEmail)?.trim() ?? '';

  const [busy, setBusy] = React.useState(false);

  async function onPress() {
    if (!target) {
      Alert.alert('Missing email', 'We could not find an email for your account.');
      return;
    }
    try {
      setBusy(true);
      await requestPasswordReset(target);
      Alert.alert('Check your inbox', `We sent a password reset link to\n${target}`);
    } catch (e: any) {
      // Friendly Firebase error display
      const msg = e?.message?.toString?.() || 'Something went wrong.';
      Alert.alert('Could not send reset email', msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      label={busy ? 'Sending…' : label}
      onPress={onPress}
      disabled={busy || !target}
      fullWidth={fullWidth}
      variant="outline"
    />
  );
}
