import React from 'react';
import { View, Text, Switch, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Screen from '../../components/layout/Screen';
import AppHeader from '../../components/layout/AppHeader';
import Card from '../../components/primitives/Card';
import Button from '../../components/primitives/Button';
import TextField from '../../components/primitives/TextField';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { showAlert } from '../../utils/alert';
import { getContentBottomPadding } from '../../utils/layout';
import {
  NotificationPreferencesContext,
} from '../../context/NotificationPreferencesProvider';
import { NotificationCategory } from '../../services/notifications';

const CATEGORY_COPY: Record<NotificationCategory, { title: string; description: string }> = {
  salary_due: {
    title: 'Salary due alerts',
    description: 'Remind me when a worker salary is overdue or due this month.',
  },
  payment_activity: {
    title: 'Payment activity',
    description: 'Confirmations or failures whenever I record a payment.',
  },
  system_update: {
    title: 'System updates',
    description: 'Product news, account tips, and important announcements.',
  },
  task_assignment: {
    title: 'Tasks & assignments',
    description: 'Reminders for pending approvals, documents, or admin tasks.',
  },
};

const timeRegex = /^([0-1]?\d|2[0-3]):([0-5]\d)$/;

function isValidTime(value: string) {
  return timeRegex.test(value.trim());
}

export default function NotificationPreferencesScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { prefs, ready, updatePrefs } = React.useContext(NotificationPreferencesContext);

  const [muted, setMuted] = React.useState(prefs.muted);
  const [pushEnabled, setPushEnabled] = React.useState(prefs.pushEnabled);
  const [categories, setCategories] = React.useState<Record<NotificationCategory, boolean>>(
    { ...prefs.categories }
  );
  const [dndEnabled, setDndEnabled] = React.useState(prefs.dnd?.enabled ?? false);
  const [dndStart, setDndStart] = React.useState(prefs.dnd?.start ?? '22:00');
  const [dndEnd, setDndEnd] = React.useState(prefs.dnd?.end ?? '07:00');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setMuted(prefs.muted);
    setPushEnabled(prefs.pushEnabled);
    setCategories({ ...prefs.categories });
    setDndEnabled(prefs.dnd?.enabled ?? false);
    setDndStart(prefs.dnd?.start ?? '22:00');
    setDndEnd(prefs.dnd?.end ?? '07:00');
  }, [prefs]);

  const toggleCategory = (key: NotificationCategory, value: boolean) => {
    setCategories((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = async () => {
    if (!ready) return;
    if (dndEnabled && (!isValidTime(dndStart) || !isValidTime(dndEnd))) {
      showAlert('Invalid quiet hours', 'Please use 24h format, e.g. 22:00.');
      return;
    }
    setSaving(true);
    try {
      await updatePrefs({
        muted,
        pushEnabled,
        categories,
        dnd: {
          enabled: dndEnabled,
          start: dndStart,
          end: dndEnd,
        },
      });
      showAlert('Saved', 'Notification preferences updated.');
    } catch (e: any) {
      showAlert('Error', e?.message ?? 'Could not update preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <AppHeader
        title="Notification Preferences"
        onBack={() => navigation.goBack()}
        transparent
        noBorder
      />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: getContentBottomPadding(),
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.sm }]}>Delivery</Text>
          <Card>
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: spacing.md }}>
                  <Text style={[typography.body, { color: colors.text }]}>Mute all notifications</Text>
                  <Text style={[typography.small, { color: colors.subtext }]}>
                    Temporarily disable all in-app alerts. Critical system messages may still appear.
                  </Text>
                </View>
                <Switch
                  value={muted}
                  onValueChange={setMuted}
                  trackColor={{ false: colors.border, true: colors.brand }}
                  thumbColor="#fff"
                />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: spacing.md }}>
                  <Text style={[typography.body, { color: colors.text }]}>Push notifications</Text>
                  <Text style={[typography.small, { color: colors.subtext }]}>
                    When enabled, you can opt-in to device pushes (requires system permission).
                  </Text>
                </View>
                <Switch
                  value={pushEnabled}
                  onValueChange={setPushEnabled}
                  trackColor={{ false: colors.border, true: colors.brand }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </Card>
        </View>

        <View>
          <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.sm }]}>Quiet Hours</Text>
          <Card>
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: spacing.md }}>
                  <Text style={[typography.body, { color: colors.text }]}>Do Not Disturb</Text>
                  <Text style={[typography.small, { color: colors.subtext }]}>
                    Silence non-critical alerts between the hours you choose.
                  </Text>
                </View>
                <Switch
                  value={dndEnabled}
                  onValueChange={setDndEnabled}
                  trackColor={{ false: colors.border, true: colors.brand }}
                  thumbColor="#fff"
                />
              </View>

              {dndEnabled && (
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.small, { color: colors.subtext, marginBottom: spacing.xs }]}>Start</Text>
                    <TextField value={dndStart} onChangeText={setDndStart} placeholder="22:00" autoCapitalize="none" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.small, { color: colors.subtext, marginBottom: spacing.xs }]}>End</Text>
                    <TextField value={dndEnd} onChangeText={setDndEnd} placeholder="07:00" autoCapitalize="none" />
                  </View>
                </View>
              )}
            </View>
          </Card>
        </View>

        <View>
          <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.sm }]}>Notification Types</Text>
          <Card>
            <View style={{ gap: spacing.md }}>
              {(Object.keys(CATEGORY_COPY) as NotificationCategory[]).map((key) => (
                <View key={key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, marginRight: spacing.md }}>
                    <Text style={[typography.body, { color: colors.text }]}>{CATEGORY_COPY[key].title}</Text>
                    <Text style={[typography.small, { color: colors.subtext }]}>{CATEGORY_COPY[key].description}</Text>
                  </View>
                  <Switch
                    value={categories[key] !== false}
                    onValueChange={(val) => toggleCategory(key, val)}
                    trackColor={{ false: colors.border, true: colors.brand }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
            </View>
          </Card>
        </View>

        <Button
          label={saving ? 'Saving...' : 'Save changes'}
          onPress={onSave}
          disabled={saving || !ready}
          fullWidth
        />
      </ScrollView>
    </Screen>
  );
}
