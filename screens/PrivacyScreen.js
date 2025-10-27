// screens/PrivacyScreen.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

export default function PrivacyScreen() {
  const navigation = useNavigation();

  const handlePolicy = () => {
    Alert.alert('Privacy Policy', 'This would open your detailed Privacy Policy.');
  };

  const handleTerms = () => {
    Alert.alert('Terms of Service', 'This would open your Terms of Service.');
  };

  const handleDataSettings = () => {
    Alert.alert('Data Settings', 'Manage your data and app permissions here.');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', onPress: () => console.log('Account deleted!') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'right', 'bottom', 'left']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Privacy Center</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Manage your privacy, data, and permissions
          </Text>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Privacy Options</Text>

          <TouchableOpacity style={styles.button} onPress={handlePolicy}>
            <Text style={styles.buttonText}>View Privacy Policy</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleTerms}>
            <Text style={styles.buttonText}>View Terms of Service</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleDataSettings}>
            <Text style={styles.buttonText}>Manage Data & Permissions</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Control</Text>

          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={handleDeleteAccount}
          >
            <Text style={styles.deleteText}>Delete My Account</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>
          We respect your privacy. Your data is secure and never shared without
          your consent.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ------------------ Styles ------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    backgroundColor: '#FF4D00',
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backButton: {
    marginRight: 10,
    backgroundColor: '#FDAA48',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#FFF9',
    fontSize: 15,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF4D00',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#FDAA48',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 3,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#FF4D00',
  },
  deleteText: {
    color: '#FF4D00',
    fontWeight: '700',
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#FFE6CC',
    marginVertical: 24,
    marginHorizontal: 20,
  },
  footerText: {
    textAlign: 'center',
    color: '#777',
    fontSize: 13,
    paddingHorizontal: 20,
    marginVertical: 30,
  },
});
