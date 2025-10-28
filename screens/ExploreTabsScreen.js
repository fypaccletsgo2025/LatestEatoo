// screens/ExploreTabsScreen.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import ExploreHomeScreen from './ExploreHomeScreen';
import AddRestaurantScreen from './AddRestaurantScreen';
import UpdatesScreen from './UpdatesScreen';
import LibraryScreen from './LibraryScreen';
import PreferenceQuestionnaireSheet from '../components/PreferenceQuestionnaireSheet';
import SearchScreen from './SearchScreen';

const TabButton = ({ label, icon, active, onPress }) => {
  const isActive = active;

  const iconColor = isActive ? '#fff' : '#000';
  const textColor = isActive ? '#fff' : '#000';
  const backgroundColor = isActive ? '#000' : 'transparent';
  const borderStyle = isActive
    ? { borderColor: '#333', borderWidth: 1 }
    : { borderWidth: 0 };

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
      }}
    >
      <View
        style={{
          width: 70,
          height: 60,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 20,
          backgroundColor,
          ...borderStyle,
        }}
      >
        <Ionicons name={icon} size={22} color={iconColor} style={{ marginBottom: 2 }} />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.9}
          style={{
            color: textColor,
            fontWeight: isActive ? '700' : '600',
            fontSize: 12,
            includeFontPadding: false,
          }}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default function ExploreTabsScreen({ currentUser, onLogout }) {
  const [tab, setTab] = useState('home'); // home | search | add | review | library
  const navigation = useNavigation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showPQ, setShowPQ] = useState(false);
  const [appliedSelections, setAppliedSelections] = useState(null);

  const displayName = (currentUser?.fullName || currentUser?.username || '').trim();
  const profileInitial = (
    displayName[0] ||
    currentUser?.username?.[0] ||
    '?'
  ).toUpperCase();
  const usernameTag = currentUser?.username ? `@${currentUser.username}` : null;
  const activeTabLabel =
    tab === 'home'
      ? 'Home'
      : tab === 'search'
      ? 'Search'
      : tab === 'add'
      ? 'Add'
      : tab === 'review'
      ? 'Updates'
      : 'Library';

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
            externalSelections={appliedSelections}
          />
        )}
        {tab === 'search' && <SearchScreen navigation={navigation} />}
        {tab === 'add' && <AddRestaurantScreen />}
        {tab === 'review' && <UpdatesScreen />}
        {tab === 'library' && <LibraryScreen />}
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
                {usernameTag ? (
                  <Text style={{ color: '#6B7280', fontSize: 12 }}>{usernameTag}</Text>
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
                navigation.navigate('PasswordSecurity');
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
      <View
        style={{
          paddingTop: 6,
          paddingHorizontal: 8,
          paddingBottom: 10,
          flexDirection: 'row',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          backgroundColor: '#FF4D00',
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: -2 },
          elevation: 4,
        }}
      >
        <TabButton
          label="Home"
          icon={tab === 'home' ? 'home' : 'home-outline'}
          active={tab === 'home'}
          onPress={() => setTab('home')}
        />
        <TabButton
          label="Search"
          icon={tab === 'search' ? 'search' : 'search-outline'}
          active={tab === 'search'}
          onPress={() => setTab('search')}
        />
        <TabButton
          label="Add"
          icon={tab === 'add' ? 'add-circle' : 'add-circle-outline'}
          active={tab === 'add'}
          onPress={() => setTab('add')}
        />
        <TabButton
          label="Updates"
          icon={
            tab === 'review' ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'
          }
          active={tab === 'review'}
          onPress={() => setTab('review')}
        />
        <TabButton
          label="Library"
          icon={tab === 'library' ? 'book' : 'book-outline'}
          active={tab === 'library'}
          onPress={() => setTab('library')}
        />
      </View>
      <PreferenceQuestionnaireSheet
        open={showPQ}
        onClose={() => setShowPQ(false)}
        initialSelections={
          appliedSelections || {
            selectedDiet: [],
            selectedCuisine: [],
            selectedMood: [],
            selectedPrice: [],
          }
        }
        onApply={(selections) => {
          setAppliedSelections(selections);
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
