// screens/ExploreTabsScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import ExploreHomeScreen from './ExploreHomeScreen';
import AddRestaurantScreen from './AddRestaurantScreen';
import UpdatesScreen from './UpdatesScreen';
import LibraryScreen from './PantryScreen';
import PreferenceQuestionnaireSheet from '../components/PreferenceQuestionnaireSheet';
import SearchScreen from './SearchScreen';
import AnimatedPillTabBar from '../components/AnimatedPillTabBar';
import {
  replacePreferenceSelections,
  usePreferenceSelections,
} from '../state/preferenceSelectionsStore';

export default function ExploreTabsScreen({ currentUser, onLogout }) {
  const [tab, setTab] = useState('home'); // home | search | add | review | library
  const navigation = useNavigation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showPQ, setShowPQ] = useState(false);
  const [tabBarHiddenByScroll, setTabBarHiddenByScroll] = useState(false);
  const preferenceSelections = usePreferenceSelections();

  const rawName = (currentUser?.name || currentUser?.fullName || '').trim();
  const displayName = rawName || currentUser?.email || 'Guest';
  const profileInitial = (
    rawName?.[0] ||
    currentUser?.email?.[0] ||
    displayName[0] ||
    '?'
  ).toUpperCase();
  const secondaryLine =
    rawName && currentUser?.email && rawName !== currentUser.email
      ? currentUser.email
      : rawName
      ? null
      : currentUser?.email || null;
  const activeTabLabel =
    tab === 'home'
      ? 'Home'
      : tab === 'search'
      ? 'Search'
      : tab === 'add'
      ? 'Add'
      : tab === 'review'
      ? 'Updates'
      : 'Pantry';
  const tabItems = useMemo(
    () => [
      {
        key: 'home',
        label: 'Home',
        activeIcon: 'home',
        inactiveIcon: 'home-outline',
      },
      {
        key: 'search',
        label: 'Search',
        activeIcon: 'search',
        inactiveIcon: 'search-outline',
      },
      {
        key: 'add',
        label: 'Add',
        isCenter: true,
      },
      {
        key: 'review',
        label: 'Updates',
        activeIcon: 'chatbubble-ellipses',
        inactiveIcon: 'chatbubble-ellipses-outline',
      },
      {
        key: 'library',
        label: 'Pantry',
        activeIcon: 'basket',
        inactiveIcon: 'basket-outline',
      },
    ],
    []
  );

  const handleScrollDirectionChange = useCallback((direction) => {
    if (tab === 'add') {
      // For "Add" screen: show on scroll down, hide on scroll up to top
      setTabBarHiddenByScroll(direction === 'down');
    } else {
      // Standard behavior for other screens
      setTabBarHiddenByScroll(direction === 'up');
    }
  }, [tab]);

  useEffect(() => {
    if (tab === 'add') {
      setTabBarHiddenByScroll(true);
    } else {
      setTabBarHiddenByScroll(false);
    }
  }, [tab]);

  const isTabBarVisible = !drawerOpen && !showPQ && !tabBarHiddenByScroll;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: '#FFF5ED' }}
      edges={['top', 'right', 'bottom', 'left']}
    >
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            backgroundColor: '#FF4D00',
          }}
        >
          <TouchableOpacity
            onPress={() => {
              Keyboard.dismiss();
              setDrawerOpen(true);
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#FFEFE2',
              marginRight: 12,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
          >
            <Ionicons name="menu" size={20} color="#FF4D00" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>
            {activeTabLabel}
          </Text>
        </View>
        {tab === 'home' && (
          <ExploreHomeScreen
            onOpenDrawer={() => setDrawerOpen(true)}
            onStartQuestionnaire={() => {
              setShowPQ(true);
            }}
            externalSelections={preferenceSelections}
            onScrollDirectionChange={handleScrollDirectionChange}
          />
        )}
        {tab === 'search' && (
          <SearchScreen
            navigation={navigation}
            onScrollDirectionChange={handleScrollDirectionChange}
          />
        )}
        {tab === 'add' && (
          <AddRestaurantScreen
            onScrollDirectionChange={handleScrollDirectionChange}
          />
        )}
        {tab === 'review' && (
          <UpdatesScreen onScrollDirectionChange={handleScrollDirectionChange} />
        )}
        {tab === 'library' && (
          <LibraryScreen onScrollDirectionChange={handleScrollDirectionChange} />
        )}
      </View>
      {drawerOpen && (
        <>
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'rgba(0,0,0,0.2)',
            }}
            onPress={() => setDrawerOpen(false)}
          />
          <View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: 280,
              backgroundColor: '#fff',
              paddingTop: 24,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                marginBottom: 12,
                paddingHorizontal: 16,
                color: '#111827',
              }}
            >
              Menu
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: '#FFF7F0',
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: '#FFE3C6',
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: '#FF4D00',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                  {profileInitial}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: '#111827', fontSize: 15 }}>
                  {displayName || 'Guest'}
                </Text>
                {secondaryLine ? (
                  <Text style={{ color: '#6B7280', fontSize: 12 }}>
                    {secondaryLine}
                  </Text>
                ) : null}
              </View>
            </View>
            <DrawerItem
              label="Business Profile"
              onPress={() => {
                setDrawerOpen(false);
                navigation.navigate('BusinessProfile');
              }}
            />
            <DrawerItem
              label="Password & Security"
              onPress={() => {
                setDrawerOpen(false);
                navigation.navigate('PasswordSecurity', { onLogout });
              }}
            />
            <DrawerItem
              label="Privacy"
              onPress={() => {
                setDrawerOpen(false);
                navigation.navigate('Privacy');
              }}
            />
            <DrawerItem
              label="Notifications"
              onPress={() => {
                setDrawerOpen(false);
                navigation.navigate('Notifications');
              }}
            />
            {typeof onLogout === 'function' && (
              <>
                <View
                  style={{
                    height: 1,
                    backgroundColor: '#F3F4F6',
                    marginHorizontal: 16,
                    marginTop: 8,
                  }}
                />
                <DrawerItem
                  label="Sign out"
                  onPress={() => {
                    setDrawerOpen(false);
                    onLogout?.();
                  }}
                  danger
                />
              </>
            )}
          </View>
        </>
      )}
      <AnimatedPillTabBar
        tabs={tabItems}
        activeTab={tab}
        onTabPress={setTab}
        visible={isTabBarVisible}
      />
      <PreferenceQuestionnaireSheet
        open={showPQ}
        onClose={() => setShowPQ(false)}
        initialSelections={preferenceSelections}
        onApply={(selections) => {
          replacePreferenceSelections(selections);
          setShowPQ(false);
        }}
      />
    </SafeAreaView>
  );
}

function DrawerItem({ label, onPress, danger }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ paddingVertical: 12, paddingHorizontal: 16 }}
    >
      <Text
        style={{
          fontSize: 16,
          color: danger ? '#FF4D00' : '#111827',
          fontWeight: danger ? '700' : '500',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
