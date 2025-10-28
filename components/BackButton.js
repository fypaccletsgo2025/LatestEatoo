import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function BackButton({
  onPress,
  style,
  iconName = 'chevron-back',
  iconSize = 20,
  iconColor = '#FF4D00',
  accessibilityLabel = 'Go back',
  ...touchableProps
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.button, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      {...touchableProps}
    >
      <Ionicons name={iconName} size={iconSize} color={iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFEFE2',
    borderWidth: 1,
    borderColor: '#FFC9A3',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
