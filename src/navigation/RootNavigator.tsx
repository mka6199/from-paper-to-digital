import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
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

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

function UserTabs() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      unsub = subscribeMyUnreadCount(setUnreadCount);
    } catch {}
    return () => unsub?.();
  }, []);

  // Responsive sizing: larger screens get more height and spacing
  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 768;
  const isSmallPhone = width < 375; // iPhone SE and similar
  const tabBarHeight = isWeb && isLargeScreen ? 60 : 56;
  const iconSize = isWeb && isLargeScreen ? 24 : 22;
  const fontSize = isWeb && isLargeScreen ? 10 : 9;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 20 : 16,
          left: 16,
          right: 16,
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 8 : 6,
          paddingHorizontal: 8,
          borderTopWidth: 0,
          borderRadius: 16,
          backgroundColor: Platform.OS === 'ios' 
            ? `${colors.surface}F2`  // 95% opacity
            : `${colors.surface}E6`,  // 90% opacity
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          backdropFilter: 'blur(10px)',
        },
        tabBarLabelStyle: {
          fontSize,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: 0,
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 1,
        },
        tabBarItemStyle: {
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 4,
          gap: 1,
        },
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.brand || '#10b981',
        tabBarInactiveTintColor: '#9ca3af',
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "home" : "home-outline"} 
              size={iconSize} 
              color={color} 
            />
          ),
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Workers"
        component={WorkersStack}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "people" : "people-outline"} 
              size={iconSize} 
              color={color} 
            />
          ),
          tabBarLabel: 'Workers',
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "notifications" : "notifications-outline"} 
              size={iconSize} 
              color={color} 
            />
          ),
          tabBarLabel: 'Alerts',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#ef4444',
            color: '#fff',
            fontSize: 10,
            fontWeight: '700',
            minWidth: 18,
            height: 18,
            borderRadius: 9,
          },
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryStack}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "time" : "time-outline"} 
              size={iconSize} 
              color={color} 
            />
          ),
          tabBarLabel: 'History',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "settings" : "settings-outline"} 
              size={iconSize} 
              color={color} 
            />
          ),
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 768;
  const isSmallPhone = width < 375;
  const tabBarHeight = isWeb && isLargeScreen ? 60 : 56;
  const iconSize = isWeb && isLargeScreen ? 24 : 22;
  const fontSize = isWeb && isLargeScreen ? 10 : 9;

  return (
    <Tab.Navigator
      initialRouteName="Admin Panel"
      screenOptions={{
        headerShown: false,
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 20 : 16,
          left: 16,
          right: 16,
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 8 : 6,
          paddingHorizontal: 8,
          borderTopWidth: 0,
          borderRadius: 16,
          backgroundColor: Platform.OS === 'ios' 
            ? `${colors.surface}F2`  // 95% opacity
            : `${colors.surface}E6`,  // 90% opacity
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          ...(isWeb && { backdropFilter: 'blur(10px)' }),
        },
        tabBarLabelStyle: {
          fontSize,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: 0,
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 1,
        },
        tabBarItemStyle: {
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 4,
          gap: 1,
        },
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.brand || '#10b981',
        tabBarInactiveTintColor: '#9ca3af',
      }}
    >
      <Tab.Screen
        name="Admin Panel"
        component={AdminStack}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "shield-checkmark" : "shield-checkmark-outline"} 
              size={iconSize} 
              color={color} 
            />
          ),
          tabBarLabel: 'Admin',
        }}
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
          options={{ headerShown: true, title: 'Notifications' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
