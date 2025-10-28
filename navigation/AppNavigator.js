// navigation/AppNavigator.js
import React, { useMemo, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';

// Auth screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';

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
const DEFAULT_ACCOUNTS = [
  {
    username: 'octopush',
    password: '123abc',
    fullName: 'Octopush Tester',
    email: 'octopush@example.com',
  },
];

export default function AppNavigator() {
  const [accounts, setAccounts] = useState(DEFAULT_ACCOUNTS);
  const [currentUser, setCurrentUser] = useState(null);

  const usernames = useMemo(
    () => accounts.map((account) => account.username.toLowerCase()),
    [accounts]
  );

  const handleLoginAttempt = async ({ username, password }) => {
    const normalized = String(username || '').trim().toLowerCase();
    const account = accounts.find(
      (entry) => entry.username.toLowerCase() === normalized
    );

    if (!account) {
      return { success: false, error: 'We could not find that username.' };
    }

    if (String(account.password) !== String(password)) {
      return { success: false, error: 'Incorrect password. Try again?' };
    }

    setCurrentUser(account);
    return { success: true, account };
  };

  const handleSignupAttempt = async ({ fullName, username, email, password }) => {
    const normalizedUsername = String(username || '').trim();
    const normalizedLower = normalizedUsername.toLowerCase();

    if (!normalizedUsername) {
      return { success: false, error: 'Choose a username to continue.' };
    }

    if (usernames.includes(normalizedLower)) {
      return { success: false, error: 'That username is already taken.' };
    }

    const newAccount = {
      fullName: String(fullName || '').trim(),
      username: normalizedUsername,
      email: String(email || '').trim(),
      password: String(password || ''),
    };

    setAccounts((prev) => [...prev, newAccount]);
    setCurrentUser(newAccount);
    return { success: true, account: newAccount };
  };

  const handleLogout = () => setCurrentUser(null);

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
