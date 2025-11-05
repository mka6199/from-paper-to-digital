import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HistoryHomeScreen from '../screens/history/HistoryHomeScreen';
import MonthlyHistoryScreen from '../screens/history/MonthlyHistoryScreen';
import CustomRangeScreen from '../screens/history/CustomRangeScreen';

const Stack = createNativeStackNavigator();

export default function HistoryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HistoryHome" component={HistoryHomeScreen} />
      <Stack.Screen name="MonthlyHistory" component={MonthlyHistoryScreen} />
      <Stack.Screen name="CustomRange" component={CustomRangeScreen} />
    </Stack.Navigator>
  );
}
