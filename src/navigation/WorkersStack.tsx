import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import WorkersListScreen from '../screens/workers/WorkersListScreen';
import WorkerProfileScreen from '../screens/workers/WorkerProfileScreen';
import PaySalaryScreen from '../screens/workers/PaySalaryScreen';
import OTPConfirmScreen from '../screens/workers/OTPConfirmScreen';
import PaymentConfirmationScreen from '../screens/workers/PaymentConfirmationScreen';

import PaymentHistoryScreen from '../screens/workers/PaymentHistoryScreen';

import AddWorkerScreen from '../screens/workers/AddWorkerScreen';
import EditWorkerScreen from '../screens/workers/EditWorkerScreen';

const Stack = createNativeStackNavigator();

export default function WorkersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WorkersList" component={WorkersListScreen} />
      <Stack.Screen name="WorkerProfile" component={WorkerProfileScreen} />
      <Stack.Screen name="PaySalary" component={PaySalaryScreen} />
      <Stack.Screen name="OTPConfirm" component={OTPConfirmScreen} />
      <Stack.Screen name="PaymentConfirmation" component={PaymentConfirmationScreen} />

      <Stack.Screen name="WorkerHistoryList" component={PaymentHistoryScreen} />
      <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />

      <Stack.Screen name="AddWorker" component={AddWorkerScreen} />
      <Stack.Screen name="EditWorker" component={EditWorkerScreen} />
    </Stack.Navigator>
  );
}
