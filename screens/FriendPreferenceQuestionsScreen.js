// screens/FriendPreferenceQuestionsScreen.js
import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FriendPreferenceQuestionsScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'right', 'bottom', 'left']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Friend Preference Questions</Text>
      </View>
    </SafeAreaView>
  );
}
