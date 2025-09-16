// navigation/AppNavigator.js

import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';

// Foodlist Screens
import FoodlistMainScreen from '../screens/FoodlistMainScreen';
import FoodlistDetailScreen from '../screens/FoodlistDetailScreen';
import FoodItemDetailScreen from '../screens/FoodItemDetailScreen';
import CreateFoodlistScreen from '../screens/CreateFoodlistScreen';

// Preference Questionnaire Screens
import {
  PreferenceQuestionnaire,
  PreferenceQuestionnaireStep2,
  PreferenceQuestionnaireStep3,
  PreferenceQuestionnaireStep4,
} from '../screens/PreferenceQuestionnaire';

// Preference Results/Main Page
import PreferenceMainPage from '../screens/PreferenceMainPage';
import PreferenceItemDetailScreen from '../screens/PreferenceItemDetailScreen'; // <-- NEW
import RestaurantDetailScreen from '../screens/RestaurantDetailScreen';
// Friend screens
import ExploreTabsScreen from '../screens/ExploreTabsScreen';
import ExploreHomeScreen from '../screens/ExploreHomeScreen';
import AddRestaurantScreen from '../screens/AddRestaurantScreen';
import ReviewScreen from '../screens/ReviewScreen';
import LibraryScreen from '../screens/LibraryScreen';
import BusinessProfileScreen from '../screens/BusinessProfileScreen';
import PasswordSecurityScreen from '../screens/PasswordSecurityScreen';
import FriendPreferenceQuestionsScreen from '../screens/FriendPreferenceQuestionsScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import DiscoverResultsScreen from '../screens/DiscoverResultsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ManageRestaurantScreen from '../screens/ManageRestaurantScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="ExploreTabs">
        {/* Foodlist Screens */}
        <Stack.Screen name="FoodlistMain" component={FoodlistMainScreen} options={{ title: 'Foodlists' }} />
        <Stack.Screen name="FoodlistDetail" component={FoodlistDetailScreen} options={{ title: 'Foodlist Details' }} />
        <Stack.Screen name="FoodItemDetail" component={FoodItemDetailScreen} options={{ title: 'Food Item Details' }} />
        <Stack.Screen name="CreateFoodlist" component={CreateFoodlistScreen} options={{ title: 'Create Foodlist' }} />

        {/* Preference Questionnaire Screens */}
        <Stack.Screen name="PreferenceQuestionnaire" component={PreferenceQuestionnaire} options={{ title: 'Preferences - Step 1' }} />
        <Stack.Screen name="PreferenceQuestionnaireStep2" component={PreferenceQuestionnaireStep2} options={{ title: 'Preferences - Step 2' }} />
        <Stack.Screen name="PreferenceQuestionnaireStep3" component={PreferenceQuestionnaireStep3} options={{ title: 'Preferences - Step 3' }} />
        <Stack.Screen name="PreferenceQuestionnaireStep4" component={PreferenceQuestionnaireStep4} options={{ title: 'Preferences - Step 4' }} />

        {/* Preference Results/Main Page */}
        <Stack.Screen name="PreferenceMainPage" component={PreferenceMainPage} options={{ title: 'Your Recommendations' }} />

        {/* NEW: Preference Item Detail Screen */}
        <Stack.Screen name="PreferenceItemDetail" component={PreferenceItemDetailScreen} options={{ title: 'Item Details' }} />
        <Stack.Screen name="RestaurantDetail" component={RestaurantDetailScreen} options={{ title: 'Restaurant' }} />

        {/* Friend Tab container (custom bottom tabs) */}
        <Stack.Screen name="ExploreTabs" component={ExploreTabsScreen} options={{ title: 'Explore', headerShown: false }} />
        {/* Friend routes (ported from expo-router) */}
        <Stack.Screen name="ExploreHome" component={ExploreHomeScreen} options={{ title: 'Explore' }} />
        <Stack.Screen name="AddRestaurant" component={AddRestaurantScreen} options={{ title: 'Add Restaurant' }} />
        <Stack.Screen name="Review" component={ReviewScreen} options={{ title: 'Review' }} />
        <Stack.Screen name="Library" component={LibraryScreen} options={{ title: 'Library' }} />
        <Stack.Screen name="BusinessProfile" component={BusinessProfileScreen} options={{ title: 'Business Profile' }} />
        <Stack.Screen name="PasswordSecurity" component={PasswordSecurityScreen} options={{ title: 'Password & Security' }} />
        <Stack.Screen name="FriendPreferenceQuestions" component={FriendPreferenceQuestionsScreen} options={{ title: 'Preference Questions' }} />
        <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: 'Privacy' }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
        <Stack.Screen name="ManageRestaurant" component={ManageRestaurantScreen} options={{ title: 'Manage Restaurant' }} />
        <Stack.Screen name="DiscoverResults" component={DiscoverResultsScreen} options={{ title: 'Discover' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
