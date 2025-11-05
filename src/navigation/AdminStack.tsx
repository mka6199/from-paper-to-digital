import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminWorkersScreen from '../screens/admin/AdminWorkersScreen';
import AdminPaymentsScreen from '../screens/admin/AdminPaymentsScreen';
import AdminEditWorkerScreen from '../screens/admin/AdminEditWorkerScreen';
import AdminEditPaymentScreen from '../screens/admin/AdminEditPaymentScreen';

const Stack = createNativeStackNavigator();

export default function AdminStack() {
  return (
    <Stack.Navigator
      initialRouteName="AdminDashboard"   // ✅ ensure first render shows dashboard
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
      <Stack.Screen name="AdminWorkers" component={AdminWorkersScreen} />
      <Stack.Screen name="AdminPayments" component={AdminPaymentsScreen} />
      <Stack.Screen name="AdminEditWorker" component={AdminEditWorkerScreen} />
      <Stack.Screen name="AdminEditPayment" component={AdminEditPaymentScreen} />
    </Stack.Navigator>
  );
}
