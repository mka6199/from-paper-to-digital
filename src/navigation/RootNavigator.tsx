import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '../screens/DashboardScreen';
import WorkersStack from './WorkersStack';
import HistoryStack from './HistoryStack';

const Tab = createBottomTabNavigator();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Home" component={DashboardScreen} />
        <Tab.Screen name="Workers" component={WorkersStack} />
        <Tab.Screen
          name="History"
          component={HistoryStack}
          options={{ headerShown: false }}
        />

      </Tab.Navigator>
    </NavigationContainer>
  );
}
