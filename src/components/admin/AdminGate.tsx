import React from 'react';
import Screen from '../../components/layout/Screen';
import AppHeader from '../layout/AppHeader';
import { Text } from 'react-native';
import { AuthContext } from '../../context/AuthProvider';
import { typography } from '../../theme/tokens';

type Props = { title: string; children: React.ReactNode; onBack?: () => void };

export default function AdminGate({ title, children, onBack }: Props) {
  const { ready, profile } = React.useContext(AuthContext);

  if (!ready) return null;          
  if (profile?.role !== 'admin') {
    return (
      <Screen padded>
        <AppHeader title={title} onBack={onBack} />
        <Text style={typography.body}>
          You don’t have admin access.
        </Text>
      </Screen>
    );
  }
  return <>{children}</>;
}
