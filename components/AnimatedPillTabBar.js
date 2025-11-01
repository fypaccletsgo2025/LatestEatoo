import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const ACTIVE_ICON_COLOR = '#FFFFFF';
const INACTIVE_ICON_COLOR = 'rgba(255, 255, 255, 0.7)';
const INACTIVE_CENTER_LABEL_COLOR = 'rgba(255, 255, 255, 0.85)';

const TabButton = ({ label, icon, active, onPress }) => {
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.tabButton}
    >
      <View style={styles.iconWrapper}>
        <Ionicons
          name={icon}
          size={20}
          color={active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR}
        />
      </View>
      <Text
        numberOfLines={1}
        ellipsizeMode="clip"
        adjustsFontSizeToFit
        style={[
          styles.tabLabel,
          active ? styles.tabLabelActive : styles.tabLabelInactive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const AddCenterButton = ({ label, active, onPress }) => {
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.tabButton}
    >
      <View style={[styles.addButtonCircle, active && styles.addButtonCircleActive]}>
        <Ionicons name="add" size={20} color={ACTIVE_ICON_COLOR} />
      </View>
      <Text
        numberOfLines={1}
        ellipsizeMode="clip"
        adjustsFontSizeToFit
        style={[
          styles.addButtonLabel,
          active ? styles.addButtonLabelActive : styles.addButtonLabelInactive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default function AnimatedPillTabBar({
  tabs,
  activeTab,
  onTabPress,
  visible = true,
}) {
  const insets = useSafeAreaInsets();
  const animation = useRef(new Animated.Value(visible ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: visible ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [animation, visible]);

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 96],
  });

  const opacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.2],
  });

  const bottomOffset = useMemo(() => Math.max(12, insets.bottom + 8), [insets.bottom]);

  return (
    <SafeAreaView
      pointerEvents="box-none"
      edges={['bottom']}
      style={styles.safeAreaContainer}
    >
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[
          styles.animatedWrapper,
          {
            bottom: bottomOffset,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={styles.tabBarContainer}>
          {tabs.map((tabItem) => {
            const isActive = tabItem.key === activeTab;

            if (tabItem.isCenter) {
              return (
                <AddCenterButton
                  key={tabItem.key}
                  label={tabItem.label}
                  active={isActive}
                  onPress={() => onTabPress(tabItem.key)}
                />
              );
            }

            const iconName = isActive
              ? tabItem.activeIcon || tabItem.icon
              : tabItem.inactiveIcon || tabItem.icon;

            return (
              <TabButton
                key={tabItem.key}
                label={tabItem.label}
                icon={iconName}
                active={isActive}
                onPress={() => onTabPress(tabItem.key)}
              />
            );
          })}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  animatedWrapper: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: 'transparent',
  },
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4D00',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 6,
    shadowColor: '#FF4D00',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: INACTIVE_ICON_COLOR,
    textAlign: 'center',
    includeFontPadding: false,
  },
  tabLabelActive: {
    fontWeight: '700',
    color: ACTIVE_ICON_COLOR,
  },
  tabLabelInactive: {
    color: INACTIVE_ICON_COLOR,
  },
  addButtonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  addButtonCircleActive: {
    borderColor: '#FFFFFF',
  },
  addButtonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: INACTIVE_CENTER_LABEL_COLOR,
    textAlign: 'center',
    includeFontPadding: false,
  },
  addButtonLabelActive: {
    fontWeight: '800',
    color: ACTIVE_ICON_COLOR,
  },
  addButtonLabelInactive: {
    color: INACTIVE_CENTER_LABEL_COLOR,
  },
});
