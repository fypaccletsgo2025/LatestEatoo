// components/RightSheet.js
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function RightSheet({ open, onClose, widthPct = 0.88, children, testID }) {
  const sheetWidth = Math.min(SCREEN_WIDTH * widthPct, SCREEN_WIDTH);
  const translateX = useSharedValue(sheetWidth);

  useEffect(() => {
    translateX.value = withTiming(open ? 0 : sheetWidth, { duration: 220 });
  }, [open, sheetWidth, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const onGestureEvent = (event) => {
    const { translationX, state, velocityX } = event.nativeEvent;
    if (state === State.ACTIVE) {
      // Only allow dragging to close (positive X)
      const next = Math.min(Math.max(0, translationX), sheetWidth);
      translateX.value = next;
    } else if (state === State.END || state === State.CANCELLED) {
      const shouldClose = translationX > sheetWidth * 0.3 || velocityX > 500;
      translateX.value = withTiming(shouldClose ? sheetWidth : 0, { duration: 180 }, (finished) => {
        if (finished && shouldClose && onClose) runOnJS(onClose)();
      });
    }
  };

  if (!open) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Close filters"
        activeOpacity={1}
        onPress={onClose}
        style={styles.backdrop}
      />
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onGestureEvent}
        activeOffsetX={[-10, 10]}
        failOffsetY={[-10, 10]}
      >
        <Animated.View testID={testID} style={[styles.sheet, { width: sheetWidth }, animatedStyle]}>
          {children}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: -2, height: 0 },
    elevation: 10,
  },
});
