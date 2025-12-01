import React from 'react';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, Platform, useWindowDimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors as staticTokens } from '../theme/tokens';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import WorkersStack from './stacks/WorkersStack';
import HistoryStack from './stacks/HistoryStack';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import AuthStack from './stacks/AuthStack';
import AdminStack from './stacks/AdminStack';
import SettingsStack from './stacks/SettingsStack';
import SplashScreen from '../screens/splash/SplashScreen';

import { navRef, onNavContainerReady, resetOnce } from './nav';
import { useTheme } from '../theme/ThemeProvider';
import { AuthContext } from '../context/AuthProvider';
import { subscribeMyUnreadCount } from '../services/notifications';
import CustomTabBar from '../components/navigation/CustomTabBar';

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

function UserTabs() {
  const { colors } = useTheme();
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      unsub = subscribeMyUnreadCount(setUnreadCount);
    } catch {}
    return () => unsub?.();
  }, []);

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
      />
      <Tab.Screen
        name="Workers"
        component={WorkersStack}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryStack}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
      />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      initialRouteName="Admin Panel"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Admin Panel"
        component={AdminStack}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { navTheme } = useTheme();
  const { authReady, profileReady, user, isAdmin } = React.useContext(AuthContext);

  const last = React.useRef<string | null>(null);

  React.useEffect(() => {
    // Not ready yet - show splash
    if (!authReady) {
      if (last.current !== 'Splash') {
        resetOnce('Splash');
        last.current = 'Splash';
      }
      return;
    }

    // Auth is ready but no user - show auth screen (profileReady is irrelevant when no user)
    if (!user) {
      if (last.current !== 'Auth') {
        resetOnce('Auth');
        last.current = 'Auth';
      }
      return;
    }

    // User exists but profile not ready yet - show splash while loading profile
    if (!profileReady) {
      if (last.current !== 'Splash') {
        resetOnce('Splash');
        last.current = 'Splash';
      }
      return;
    }

    // Everything ready - show appropriate main screen
    const target = isAdmin ? 'Admin' : 'Main';
    if (last.current !== target) {
      resetOnce(target as any);
      last.current = target;
    }
  }, [authReady, user, profileReady, isAdmin]);

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
          options={{ headerShown: false }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
