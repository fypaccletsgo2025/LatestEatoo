// navigation/AppNavigator.js
import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';

// Auth screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import { account } from '../services/appwrite';

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
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const profile = await account.get();
        if (mounted) {
          setCurrentUser(profile);
        }
      } catch (err) {
        if (mounted) {
          setCurrentUser(null);
        }
      }
    };

    loadSession();

    return () => {
      mounted = false;
    };
  }, []);

  const handleLoginAttempt = async ({ email, password }) => {
    const trimmedEmail = String(email || '').trim().toLowerCase();

    if (!trimmedEmail || !password) {
      return {
        success: false,
        error: 'Enter both email and password to continue.',
      };
    }

    try {
      await account.createEmailPasswordSession(trimmedEmail, password);
      const profile = await account.get();
      setCurrentUser(profile);
      return { success: true, account: profile };
    } catch (err) {
      return {
        success: false,
        error: err?.message || 'Login failed. Check your email or password.',
      };
    }
  };

  const handleSignupAttempt = async ({ fullName, email, password }) => {
    const trimmedFullName = String(fullName || '').trim();
    const trimmedEmail = String(email || '').trim().toLowerCase();

    if (!trimmedFullName || !trimmedEmail || !password) {
      return {
        success: false,
        error: 'Fill in name, email, and password to continue.',
      };
    }

    try {
      await account.create('unique()', trimmedEmail, password, trimmedFullName);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err?.message || 'Signup failed. Try another email.',
      };
    }
  };

  const handleLogout = async () => {
    try {
      await account.deleteSession('current');
    } catch (err) {
      // Best-effort logout; proceed even if session is already gone.
    } finally {
      setCurrentUser(null);
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {currentUser ? (
          <>
            {/* Main Tab Container (with menu + bottom nav) */}
            <Stack.Screen name="ExploreTabs">
              {(props) => (
                <ExploreTabsScreen
                  {...props}
                  currentUser={currentUser}
                  onLogout={handleLogout}
                />
              )}
            </Stack.Screen>

            {/* Sub Screens that open inside Explore context */}
            <Stack.Screen name="FoodlistMain" component={FoodlistMainScreen} />
            <Stack.Screen name="FoodlistDetail" component={FoodlistDetailScreen} />
            <Stack.Screen name="FoodItemDetail" component={FoodItemDetailScreen} />
            <Stack.Screen name="CreateFoodlist" component={CreateFoodlistScreen} />

            {/* Preference Questionnaire Flow */}
            <Stack.Screen
              name="PreferenceQuestionnaire"
              component={PreferenceQuestionnaire}
            />
            <Stack.Screen
              name="PreferenceQuestionnaireStep2"
              component={PreferenceQuestionnaireStep2}
            />
            <Stack.Screen
              name="PreferenceQuestionnaireStep3"
              component={PreferenceQuestionnaireStep3}
            />
            <Stack.Screen
              name="PreferenceQuestionnaireStep4"
              component={PreferenceQuestionnaireStep4}
            />

            {/* Results & Details */}
            <Stack.Screen name="PreferenceMainPage" component={PreferenceMainPage} />
            <Stack.Screen
              name="PreferenceItemDetail"
              component={PreferenceItemDetailScreen}
            />
            <Stack.Screen
              name="RestaurantDetail"
              component={RestaurantDetailScreen}
            />
            <Stack.Screen name="AllRestaurants" component={AllRestaurantsScreen} />
            <Stack.Screen name="AllDishes" component={AllDishesScreen} />

            {/* Settings & Misc Screens */}
            <Stack.Screen name="BusinessProfile" component={BusinessProfileScreen} />
            <Stack.Screen name="PasswordSecurity" component={PasswordSecurityScreen} />
            <Stack.Screen
              name="FriendPreferenceQuestions"
              component={FriendPreferenceQuestionsScreen}
            />
            <Stack.Screen name="Privacy" component={PrivacyScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="ManageRestaurant" component={ManageRestaurantScreen} />
            <Stack.Screen name="DiscoverResults" component={DiscoverResultsScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login">
              {(props) => (
                <LoginScreen
                  {...props}
                  onLoginAttempt={handleLoginAttempt}
                  onNavigateToSignup={() => props.navigation.navigate('Signup')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Signup">
              {(props) => (
                <SignupScreen
                  {...props}
                  onSignupAttempt={handleSignupAttempt}
                  onNavigateToLogin={() => props.navigation.navigate('Login')}
                />
              )}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
