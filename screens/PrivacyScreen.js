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
import BackButton from '../components/BackButton';

const BRAND = {
  primary: '#FF4D00',
  accent: '#FDAA48',
  bg: '#FFF5ED',
  card: '#FFFFFF',
  line: '#FFE3C6',
  ink: '#1F2937',
  inkMuted: '#6B7280',
};

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
    Alert.alert('Delete Account', 'Are you sure you want to delete your account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => console.log('Account deleted!') },
    ]);
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: BRAND.bg }}
      edges={['top', 'right', 'bottom', 'left']}
    >
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Privacy Center</Text>
          <Text style={styles.headerSubtitle}>
            Manage your privacy, data, and permissions.
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your Privacy Options</Text>
          <Text style={styles.sectionBody}>
            Control how we use your data across recommendations, updates, and invites.
          </Text>
          <ActionButton label="View Privacy Policy" onPress={handlePolicy} />
          <ActionButton label="View Terms of Service" onPress={handleTerms} />
          <ActionButton label="Manage Data & Permissions" onPress={handleDataSettings} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account Control</Text>
          <Text style={styles.sectionBody}>
            Export your data or delete your account at any time. We keep your details secure.
          </Text>
          <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteAccount}>
            <Text style={styles.dangerText}>Delete My Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            We respect your privacy. Your data stays with us and is never shared without your consent.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionButton({ label, onPress }) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: BRAND.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 22,
    gap: 14,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSubtitle: { color: '#FFEBD8', marginTop: 6, fontSize: 14, lineHeight: 20 },
  container: {
    padding: 20,
    gap: 18,
    backgroundColor: BRAND.bg,
  },
  card: {
    backgroundColor: BRAND.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BRAND.line,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 14,
  },
  sectionTitle: { color: BRAND.ink, fontSize: 16, fontWeight: '800' },
  sectionBody: { color: BRAND.inkMuted, lineHeight: 20, fontSize: 14 },
  actionButton: {
    backgroundColor: BRAND.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  dangerButton: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FF8571',
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFF5F4',
  },
  dangerText: { color: '#D73717', fontWeight: '700', fontSize: 15 },
  infoBox: {
    padding: 16,
    backgroundColor: '#FFEFE2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFC9A3',
  },
  infoText: {
    textAlign: 'center',
    color: BRAND.inkMuted,
    fontSize: 13,
    lineHeight: 20,
  },
});
