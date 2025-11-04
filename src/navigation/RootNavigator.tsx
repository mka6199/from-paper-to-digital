import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Pressable, StyleSheet } from 'react-native';

import DashboardScreen from '../screens/DashboardScreen';
import WorkersStack from './WorkersStack';
import HistoryStack from './HistoryStack';
import NotificationsScreen from '../screens/NotificationsScreen';
import AuthStack from './AuthStack';
import AdminStack from './AdminStack';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';

import { Ionicons } from '@expo/vector-icons';
import { colors as staticTokens } from '../theme/tokens';

import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { navRef, onNavContainerReady, resetToAdmin, resetToAuth, resetToMain } from './nav';
import { useTheme } from '../theme/ThemeProvider';

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

function UserTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: {
          height: 75,
          paddingTop: 6,
          paddingBottom: 8,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          justifyContent: 'space-between',
          flexDirection: 'row',
        },
        tabBarLabelStyle: { marginBottom: 2, fontSize: 12, fontWeight: '600' as const },
        tabBarIconStyle: { marginTop: 0 },
        tabBarItemStyle: { flex: 1, flexBasis: 0 },
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: '#9ca3af',
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          tabBarLabel: 'Dashboard',
          tabBarItemStyle: { width: 90, alignItems: 'flex-start', marginLeft: 10 },
        }}
      />
      <Tab.Screen
        name="Workers"
        component={WorkersStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
          tabBarLabel: 'Workers',
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
          tabBarLabel: 'History',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
          tabBarLabel: 'Settings',
          tabBarItemStyle: { alignItems: 'flex-end', marginRight: 10 },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={({ navigation }) => ({
          tabBarButton: () => null,
          headerShown: true,
          title: 'Profile',
          headerLeft: () => (
            <Pressable
              onPress={() => navigation.navigate('Settings')}
              style={{ paddingHorizontal: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Back to Settings"
            >
              <Ionicons name="chevron-back" size={24} color={staticTokens.text} />
            </Pressable>
          ),
          tabBarItemStyle: { flex: 1, flexBasis: 0 },
        })}
      />
      <Tab.Screen
        name="Auth"
        component={AuthStack}
        options={{
          tabBarButton: () => null,
          headerShown: false,
          tabBarItemStyle: { display: 'none' as any },
        }}
      />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: {
          height: 76,
          paddingTop: 6,
          paddingBottom: 8,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          justifyContent: 'space-between',
          flexDirection: 'row',
        },
        tabBarLabelStyle: { marginBottom: 2, fontSize: 12, fontWeight: '600' as const },
        tabBarIconStyle: { marginTop: 0 },
        tabBarItemStyle: { paddingVertical: 2, flex: 1, flexBasis: 0 },
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: '#9ca3af',
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          tabBarLabel: 'Dashboard',
          tabBarItemStyle: { width: 90, alignItems: 'flex-start', marginLeft: 10 },
        }}
      />
      <Tab.Screen
        name="Workers"
        component={AdminStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
          tabBarLabel: 'Workers',
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
          tabBarLabel: 'History',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
          tabBarLabel: 'Settings',
          tabBarItemStyle: { alignItems: 'flex-end', marginRight: 10 },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={({ navigation }) => ({
          tabBarButton: () => null,
          headerShown: true,
          title: 'Profile',
          headerLeft: () => (
            <Pressable
              onPress={() => navigation.navigate('Settings')}
              style={{ paddingHorizontal: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Back to Settings"
            >
              <Ionicons name="chevron-back" size={24} color={staticTokens.text} />
            </Pressable>
          ),
        })}
      />
      <Tab.Screen
        name="Auth"
        component={AuthStack}
        options={{
          tabBarButton: () => null,
          headerShown: false,
          tabBarItemStyle: { display: 'none' as any },
        }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { navTheme } = useTheme();
  const [authed, setAuthed] = React.useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), async (user) => {
      if (!user) {
        setAuthed(false);
        resetToAuth();
        return;
      }
      setAuthed(true);
      if (isAdmin) resetToAdmin();
      else resetToMain();
    });
    return unsub;
  }, [isAdmin]);

  return (
    <NavigationContainer ref={navRef} onReady={onNavContainerReady} theme={navTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Auth">
        <RootStack.Screen name="Auth" component={AuthStack} />
        <RootStack.Screen name="Main" component={UserTabs} />
        <RootStack.Screen name="Admin" component={AdminTabs} />
        <RootStack.Screen
          name="Notifications"
          component={NotificationsScreen as any}
          options={{ headerShown: true, title: 'Notifications' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
