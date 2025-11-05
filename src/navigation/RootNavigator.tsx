import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticTokens } from '../theme/tokens';

import DashboardScreen from '../screens/DashboardScreen';
import WorkersStack from './WorkersStack';
import HistoryStack from './HistoryStack';
import NotificationsScreen from '../screens/NotificationsScreen';
import AuthStack from './AuthStack';
import AdminStack from './AdminStack';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SplashScreen from '../screens/SplashScreen';

import { navRef, onNavContainerReady, resetOnce } from './nav';
import { useTheme } from '../theme/ThemeProvider';
import { AuthContext } from '../context/AuthProvider';

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
          tabBarIcon: ({ color, size }) => (<Ionicons name="home-outline" size={size} color={color} />),
          tabBarLabel: 'Dashboard',
          tabBarItemStyle: { width: 90, alignItems: 'flex-start', marginLeft: 10 },
        }}
      />
      <Tab.Screen
        name="Workers"
        component={WorkersStack}
        options={{
          tabBarIcon: ({ color, size }) => (<Ionicons name="people-outline" size={size} color={color} />),
          tabBarLabel: 'Workers',
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryStack}
        options={{
          tabBarIcon: ({ color, size }) => (<Ionicons name="time-outline" size={size} color={color} />),
          tabBarLabel: 'History',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (<Ionicons name="settings-outline" size={size} color={color} />),
          tabBarLabel: 'Settings',
          tabBarItemStyle: { alignItems: 'flex-end', marginRight: 10 },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarButton: () => null,
          headerShown: false,
          tabBarItemStyle: { flex: 1, flexBasis: 0 },
        }}
      />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      initialRouteName="Admin Panel"
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
        name="Admin Panel"
        component={AdminStack}
        options={{
          tabBarIcon: ({ color, size }) => (<Ionicons name="people-outline" size={size} color={color} />),
          tabBarLabel: 'Admin Panel',
        }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { navTheme } = useTheme();
  const { authReady, profileReady, user, isAdmin } = React.useContext(AuthContext);

  // Only decide once per change
  const last = React.useRef<string | null>(null);

  // Decide the root screen whenever the *combined* readiness changes
  React.useEffect(() => {
    // Not yet sure if signed-in or not → stay on Splash
    if (!authReady) {
      if (last.current !== 'Splash') {
        resetOnce('Splash');
        last.current = 'Splash';
      }
      return;
    }

    // Signed out → Auth
    if (!user) {
      if (last.current !== 'Auth') {
        resetOnce('Auth');
        last.current = 'Auth';
      }
      return;
    }

    // Signed in but profile not ready yet → Splash (prevents any Main flicker)
    if (!profileReady) {
      if (last.current !== 'Splash') {
        resetOnce('Splash');
        last.current = 'Splash';
      }
      return;
    }

    // Signed in with profile → go to Admin or Main directly
    const target = isAdmin ? 'Admin' : 'Main';
    if (last.current !== target) {
      resetOnce(target as any);
      last.current = target;
    }
  }, [authReady, profileReady, user, isAdmin]);

  return (
    <NavigationContainer ref={navRef} onReady={onNavContainerReady} theme={navTheme}>
      <RootStack.Navigator
        screenOptions={{ headerShown: false, animation: 'none' }}
        initialRouteName="Splash"
      >
        <RootStack.Screen name="Splash" component={SplashScreen} />
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
