import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HistoryHomeScreen from '../../screens/history/HistoryHomeScreen';

const Stack = createNativeStackNavigator();

export default function HistoryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HistoryHome" component={HistoryHomeScreen} />
    </Stack.Navigator>
  );
}
