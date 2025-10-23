// screens/ExploreTabsScreen.js 
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import ExploreHomeScreen from './ExploreHomeScreen';
import AddRestaurantScreen from './AddRestaurantScreen';
import UpdatesScreen from './UpdatesScreen';
import LibraryScreen from './LibraryScreen';
import PreferenceMainPage from './PreferenceMainPage';
import FoodlistMainScreen from './FoodlistMainScreen';
import { PreferenceQuestionnaire, PreferenceQuestionnaireStep2, PreferenceQuestionnaireStep3, PreferenceQuestionnaireStep4 } from './PreferenceQuestionnaire';
import PreferenceQuestionnaireSheet from '../components/PreferenceQuestionnaireSheet';
import SearchScreen from './SearchScreen';

const TabButton = ({ label, icon, active, onPress }) => {
  // Only the Home tab should use the orange color when active; others keep white for contrast
  const useHomeOrange = active && String(label).toLowerCase() === 'home';
  const iconColor = useHomeOrange ? '#FF4D00' : active ? '#fff' : '#6b7280';
  const textColor = useHomeOrange ? '#FF4D00' : active ? '#fff' : '#6b7280';

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}
    >
      <View style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 20,
        backgroundColor: active ? '#111827' : 'transparent',
      }}>
        <Ionicons
          name={icon}
          size={20}
          color={iconColor}
          style={{ marginBottom: 2 }}
        />
        <Text
          numberOfLines={1}
          ellipsizeMode="clip"
          adjustsFontSizeToFit
          minimumFontScale={0.9}
          style={{ color: textColor, fontWeight: active ? '700' : '600', fontSize: 12, includeFontPadding: false }}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ExploreTabsScreen() {
  const [tab, setTab] = useState('home'); // home | search | add | review | library
  const navigation = useNavigation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showPQ, setShowPQ] = useState(false);
  // Right-side questionnaire state
  const [appliedSelections, setAppliedSelections] = useState(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#d1ccc7' }}>
      <View style={{ flex: 1 }}>
  <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FF4D00' }}>
          <TouchableOpacity
            onPress={() => { Keyboard.dismiss(); setDrawerOpen(true); }}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#e5e7eb', marginRight: 12, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#6B7280' }}>☰</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>
            {tab === 'home' ? 'Home' : tab === 'search' ? 'Search' : tab === 'add' ? 'Add' : tab === 'review' ? 'Updates' : 'Library'}
          </Text>
        </View>
        {tab === 'home' && (
          <ExploreHomeScreen
            onOpenDrawer={() => setDrawerOpen(true)}
            onStartQuestionnaire={() => { setShowPQ(true); }}
            externalSelections={appliedSelections}
          />
        )}
        {tab === 'search' && <SearchScreen navigation={navigation} />}
        {tab === 'add' && <AddRestaurantScreen />}
        {tab === 'review' && <UpdatesScreen />}
        {tab === 'library' && <LibraryScreen />}
      </View>
      {/* Simple Drawer */}
      {drawerOpen && (
        <>
          <TouchableOpacity
            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.2)' }}
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
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 16, paddingHorizontal: 16 }}>Menu</Text>
            {/* Only non-tab destinations in the drawer */}
            <DrawerItem label="Business Profile" onPress={() => { setDrawerOpen(false); navigation.navigate('BusinessProfile'); }} />
            <DrawerItem label="Password & Security" onPress={() => { setDrawerOpen(false); navigation.navigate('PasswordSecurity'); }} />
            <DrawerItem label="Privacy" onPress={() => { setDrawerOpen(false); navigation.navigate('Privacy'); }} />
            <DrawerItem label="Notifications" onPress={() => { setDrawerOpen(false); navigation.navigate('Notifications'); }} />
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
        <TabButton label="Home" icon={tab === 'home' ? 'home' : 'home-outline'} active={tab === 'home'} onPress={() => setTab('home')} />
        <TabButton label="Search" icon={tab === 'search' ? 'search' : 'search-outline'} active={tab === 'search'} onPress={() => setTab('search')} />
        <TabButton label="Add" icon={tab === 'add' ? 'add-circle' : 'add-circle-outline'} active={tab === 'add'} onPress={() => setTab('add')} />
        <TabButton label="Updates" icon={tab === 'review' ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} active={tab === 'review'} onPress={() => setTab('review')} />
        <TabButton label="Library" icon={tab === 'library' ? 'book' : 'book-outline'} active={tab === 'library'} onPress={() => setTab('library')} />
      </View>
      {/* Right-side filter sheet (Shopee-like) - render last so it's on top */}
      <PreferenceQuestionnaireSheet
        open={showPQ}
        onClose={() => setShowPQ(false)}
        initialSelections={appliedSelections || { selectedDiet: [], selectedCuisine: [], selectedMood: [], selectedPrice: [] }}
        onApply={(sel) => { setAppliedSelections(sel); setShowPQ(false); }}
      />
    </SafeAreaView>
  );
}

function DrawerItem({ label, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
      <Text style={{ fontSize: 16 }}>{label}</Text>
    </TouchableOpacity>
  );
}
