import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SettingsScreen from '../../screens/settings/SettingsScreen';
import ProfileScreen from '../../screens/profile/ProfileScreen';
import ExportDataScreen from '../../screens/settings/ExportDataScreen';
import NotificationPreferencesScreen from '../../screens/settings/NotificationPreferencesScreen';

const Stack = createNativeStackNavigator();

export default function SettingsStack() {
  return (
    <Stack.Navigator>
      {/* Settings main screen (no header because you already render AppHeader inside) */}
      <Stack.Screen
        name="SettingsHome"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      {/* Profile page uses AppHeader inside screen */}
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      {/* Export data screen */}
      <Stack.Screen
        name="ExportData"
        component={ExportDataScreen}
        options={{ 
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="NotificationPreferences"
        component={NotificationPreferencesScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
