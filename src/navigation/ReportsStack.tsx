import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MonthlyReportScreen from '../screens/Reports/MonthlyReportScreen';

const Stack = createNativeStackNavigator();

export default function ReportsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="MonthlyReport" component={MonthlyReportScreen} options={{ title: 'Reports' }} />
    </Stack.Navigator>
  );
}
