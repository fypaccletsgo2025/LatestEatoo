// screens/PasswordSecurityScreen.js
import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PasswordSecurityScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'right', 'bottom', 'left']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Password & Security</Text>
      </View>
    </SafeAreaView>
  );
}
