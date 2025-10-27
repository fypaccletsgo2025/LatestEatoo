// navigation/AppNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';

// --- Core Screens ---
import ExploreTabsScreen from '../screens/ExploreTabsScreen';

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
import PreferenceItemDetailScreen from '../screens/PreferenceItemDetailScreen';
import RestaurantDetailScreen from '../screens/RestaurantDetailScreen';
import AllRestaurantsScreen from '../screens/AllRestaurantsScreen';
import AllDishesScreen from '../screens/AllDishesScreen';

// Other screens
import BusinessProfileScreen from '../screens/BusinessProfileScreen';
import PasswordSecurityScreen from '../screens/PasswordSecurityScreen';
import FriendPreferenceQuestionsScreen from '../screens/FriendPreferenceQuestionsScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ManageRestaurantScreen from '../screens/ManageRestaurantScreen';
import DiscoverResultsScreen from '../screens/DiscoverResultsScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="ExploreTabs"
        screenOptions={{ headerShown: false }} // Hide default headers for consistent design
      >
        {/* 🔸 Main Tab Container (with menu + bottom nav) */}
        <Stack.Screen name="ExploreTabs" component={ExploreTabsScreen} />

        {/* 🔸 Sub Screens that open inside Explore context */}
        <Stack.Screen name="FoodlistMain" component={FoodlistMainScreen} />
        <Stack.Screen name="FoodlistDetail" component={FoodlistDetailScreen} />
        <Stack.Screen name="FoodItemDetail" component={FoodItemDetailScreen} />
        <Stack.Screen name="CreateFoodlist" component={CreateFoodlistScreen} />

        {/* 🔸 Preference Questionnaire Flow */}
        <Stack.Screen name="PreferenceQuestionnaire" component={PreferenceQuestionnaire} />
        <Stack.Screen name="PreferenceQuestionnaireStep2" component={PreferenceQuestionnaireStep2} />
        <Stack.Screen name="PreferenceQuestionnaireStep3" component={PreferenceQuestionnaireStep3} />
        <Stack.Screen name="PreferenceQuestionnaireStep4" component={PreferenceQuestionnaireStep4} />

        {/* 🔸 Results & Details */}
        <Stack.Screen name="PreferenceMainPage" component={PreferenceMainPage} />
        <Stack.Screen name="PreferenceItemDetail" component={PreferenceItemDetailScreen} />
        <Stack.Screen name="RestaurantDetail" component={RestaurantDetailScreen} />
        <Stack.Screen name="AllRestaurants" component={AllRestaurantsScreen} />
        <Stack.Screen name="AllDishes" component={AllDishesScreen} />

        {/* 🔸 Settings & Misc Screens */}
        <Stack.Screen name="BusinessProfile" component={BusinessProfileScreen} />
        <Stack.Screen name="PasswordSecurity" component={PasswordSecurityScreen} />
        <Stack.Screen name="FriendPreferenceQuestions" component={FriendPreferenceQuestionsScreen} />
        <Stack.Screen name="Privacy" component={PrivacyScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="ManageRestaurant" component={ManageRestaurantScreen} />
        <Stack.Screen name="DiscoverResults" component={DiscoverResultsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
