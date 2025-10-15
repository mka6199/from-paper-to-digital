import React from 'react';
import { View, Text } from 'react-native';
import Screen from '../components/layout/Screen';
import AppHeader from '../components/layout/AppHeader';
import Card from '../components/primitives/Card';
import { spacing, typography } from '../theme/tokens';

export default function NotificationsScreen() {
  return (
    <Screen scroll padded>
      <AppHeader title="Notifications" />
      <Card style={{ marginBottom: spacing.sm }}>
        <Text style={typography.h2}>Payment reminder</Text>
        <Text style={typography.small}>Salary due soon for Michael • 3,000 AED</Text>
      </Card>
      <Card style={{ marginBottom: spacing.sm }}>
        <Text style={typography.h2}>Update complete</Text>
        <Text style={typography.small}>Worker info saved successfully</Text>
      </Card>
    </Screen>
  );
}
