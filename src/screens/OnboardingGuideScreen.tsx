import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import Screen from '../components/layout/Screen';
import Card from '../components/primitives/Card';
import { spacing, typography } from '../theme/tokens';

export default function OnboardingGuideScreen() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <Text style={typography.h1}>Onboarding Guide</Text>
        <Card style={{ padding: spacing.lg, gap: spacing.md }}>
          <Text style={typography.h2}>1) Create account & log in</Text>
          <Text>New users see an empty dashboard and a 3-step checklist.</Text>
          <Text style={typography.h2}>2) Add workers</Text>
          <Text>Add 3+ workers, set rate type (monthly/hourly), and base salary.</Text>
          <Text style={typography.h2}>3) Record payments</Text>
          <Text>Record salary payments/bonuses; dashboard updates immediately.</Text>
          <Text style={typography.h2}>4) Track income</Text>
          <Text>Add cash-in from clients; the Net KPI shows sustainability.</Text>
          <Text style={typography.h2}>5) Fire vs Delete</Text>
          <Text>Use “Fire Worker” to keep history; deleting removes only the worker doc.</Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}
