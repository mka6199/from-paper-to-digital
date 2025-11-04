// PLACE AT: src/screens/Settings/EditProfileScreen.tsx
import React from 'react';
import { View, Text, TextInput, Alert, ScrollView } from 'react-native';
import Screen from '../components/layout/Screen';
import Button from '../components/primitives/Button';
import Card from '../components/primitives/Card';
import { spacing, typography } from '../theme/tokens';
import { upsertMySettings, getMySettings } from '../services/settings';

export default function EditProfileScreen({ navigation }: any) {
  const [businessName, setBusinessName] = React.useState('');
  const [ownerDisplayName, setOwnerDisplayName] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    getMySettings().then((s) => {
      if (s) {
        setBusinessName(s.businessName ?? '');
        setOwnerDisplayName(s.ownerDisplayName ?? '');
      }
    }).catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    try {
      await upsertMySettings({ businessName, ownerDisplayName });
      Alert.alert('Saved', 'Profile updated');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <Text style={typography.h1}>Edit Profile</Text>
        <Card style={{ padding: spacing.lg, gap: spacing.md }}>
          <Text style={typography.small}>Business Name</Text>
          <TextInput value={businessName} onChangeText={setBusinessName} style={{ borderWidth:1, borderColor:'#eee', borderRadius:12, padding:12 }} />
          <Text style={typography.small}>Owner Display Name</Text>
          <TextInput value={ownerDisplayName} onChangeText={setOwnerDisplayName} style={{ borderWidth:1, borderColor:'#eee', borderRadius:12, padding:12 }} />
        </Card>
        <Button label={saving ? 'Saving...' : 'Save'} onPress={save} disabled={saving} fullWidth />
        <View style={{ height: spacing['2xl'] }} />
      </ScrollView>
    </Screen>
  );
}
