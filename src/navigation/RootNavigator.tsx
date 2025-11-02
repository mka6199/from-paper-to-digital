import React from 'react';
import { Text } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
} from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AuthProvider, { AuthContext } from '../context/AuthProvider';

import AuthStack from './AuthStack';
import WorkersStack from './WorkersStack';
import HistoryStack from './HistoryStack';
import AdminStack from './AdminStack';

import DashboardScreen from '../screens/DashboardScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SettingsScreen from '../screens/SettingsScreen';


import NotificationDaemon from '../components/system/NotificationDaeom';

import { colors } from '../theme/tokens';


function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: focused ? '800' : '600',
        color: focused ? colors.brand : '#6b7280',
      }}
    >
      {label}
    </Text>
  );
}

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();


function UserTabs() {
  const screenOptions: BottomTabNavigationOptions = {
    headerShown: false,
    tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: colors.brand,
    tabBarInactiveTintColor: '#6b7280',
    tabBarStyle: {
      backgroundColor: '#fff',
      borderTopColor: '#e5e7eb',
      borderTopWidth: 1,
      elevation: 10,
    },
  };

  return (
    <>

      <NotificationDaemon />
      <Tab.Navigator screenOptions={screenOptions} backBehavior="history" detachInactiveScreens>
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon label="" focused={focused} /> }}
        />
        <Tab.Screen
          name="Workers"
          component={WorkersStack}
          options={{ tabBarIcon: ({ focused }) => <TabIcon label="" focused={focused} /> }}
        />
        <Tab.Screen
          name="History"
          component={HistoryStack}
          options={{ tabBarIcon: ({ focused }) => <TabIcon label="" focused={focused} /> }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon label="" focused={focused} /> }}
        />
      </Tab.Navigator>
    </>
  );
}


function AdminTabs() {
  const screenOptions: BottomTabNavigationOptions = {
    headerShown: false,
    tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: colors.brand,
    tabBarInactiveTintColor: '#6b7280',
    tabBarStyle: {
      backgroundColor: '#fff',
      borderTopColor: '#e5e7eb',
      borderTopWidth: 1,
      elevation: 10,
    },
  };

  return (
    <>
      <NotificationDaemon />
      <Tab.Navigator screenOptions={screenOptions} backBehavior="history" detachInactiveScreens>
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon label="" focused={focused} /> }}
        />
        <Tab.Screen
          name="Workers"
          component={WorkersStack}
          options={{ tabBarIcon: ({ focused }) => <TabIcon label="" focused={focused} /> }}
        />
        <Tab.Screen
          name="History"
          component={HistoryStack}
          options={{ tabBarIcon: ({ focused }) => <TabIcon label="" focused={focused} /> }}
        />
        <Tab.Screen
          name="Admin"
          component={AdminStack}
          options={{ tabBarIcon: ({ focused }) => <TabIcon label="" focused={focused} /> }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon label="" focused={focused} /> }}
        />
      </Tab.Navigator>
    </>
  );
}


function TabsRouter() {
  const { ready, user, profile } = React.useContext(AuthContext);
  if (!ready) return null;
  if (!user) return null; 

  const isAdmin = profile?.role === 'admin';
  return isAdmin ? <AdminTabs /> : <UserTabs />;
}


function RootSwitch() {
  const { ready, user } = React.useContext(AuthContext);
  if (!ready) return null;


  if (!user) {
    return <AuthStack />;
  }

 
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Tabs" component={TabsRouter} />
      
      <RootStack.Screen name="Notifications" component={NotificationsScreen} />
    </RootStack.Navigator>
  );
}


export default function RootNavigator() {
  const theme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: '#ffffff' },
  };

  return (
    <AuthProvider>
      <NavigationContainer theme={theme}>
        <RootSwitch />
      </NavigationContainer>
    </AuthProvider>
  );
}
