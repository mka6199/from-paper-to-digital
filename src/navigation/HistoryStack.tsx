// src/navigation/HistoryStack.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HistoryListScreen from '../screens/history/HistoryListScreen';

const Stack = createNativeStackNavigator();

export default function HistoryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Open the chooser inline on the list screen */}
      <Stack.Screen
        name="HistoryList"
        component={HistoryListScreen}
        initialParams={{ startMode: 'CHOOSER' }}
      />
    </Stack.Navigator>
  );
}
