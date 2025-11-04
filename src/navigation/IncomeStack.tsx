import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import IncomeListScreen from '../screens/Income/IncomeListScreen';
import AddIncomeScreen from '../screens/Income/AddIncomeScreen';

const Stack = createNativeStackNavigator();

export default function IncomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="IncomeList" component={IncomeListScreen} options={{ title: 'Income' }} />
      <Stack.Screen name="AddIncome" component={AddIncomeScreen} options={{ title: 'Add Income' }} />
    </Stack.Navigator>
  );
}
