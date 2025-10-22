import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import AuthProvider, { AuthContext } from '../context/AuthProvider';

import WorkersStack from './WorkersStack';
import HistoryStack from './HistoryStack';
import DashboardScreen from '../screens/DashboardScreen';
import AuthStack from './AuthStack';

import AdminStack from './AdminStack';

const Tab = createBottomTabNavigator();

function UserTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Workers" component={WorkersStack} />
      <Tab.Screen name="History" component={HistoryStack} />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="Admin"
        component={AdminStack}
        options={{ tabBarLabel: 'Admin' }}
      />
    </Tab.Navigator>
  );
}

function Router() {
  const { ready, user, profile } = React.useContext(AuthContext);
  if (!ready) return null;
  if (!user) return <AuthStack />;
  return profile?.role === 'admin' ? <AdminTabs /> : <UserTabs />;
}

export default function RootNavigator() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Router />
      </NavigationContainer>
    </AuthProvider>
  );
}
