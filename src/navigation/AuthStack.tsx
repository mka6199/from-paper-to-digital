import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SignInScreen from '../screens/auth/SignInScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';

const Stack = createNativeStackNavigator();

import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { resetToMain } from '../navigation/nav';

export default function AuthStack() {
  React.useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (user) => {
      if (user) {
        resetToMain();
      }
    });
    return unsub;
  }, []);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="SignIn">
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}
