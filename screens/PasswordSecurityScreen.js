// screens/PasswordSecurityScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
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

export default function PasswordSecurityScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const onLogout = route.params?.onLogout;

  const handleChangePassword = () => {
    setShowChangePasswordForm(true);
  };

  const submitChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert('Missing Fields', 'Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Passwords Mismatch', 'Your new passwords do not match.');
      return;
    }
    Alert.alert(
      'Password Updated',
      'Your password has been successfully updated. (This is a demo)'
    );
    setShowChangePasswordForm(false);
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          onLogout?.();
        },
      },
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
          <Text style={styles.headerTitle}>Password & Security</Text>
          <Text style={styles.headerSubtitle}>
            Manage your account access and security settings.
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {showChangePasswordForm ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Change Your Password</Text>
            <LabeledInput
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />
            <LabeledInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <LabeledInput
              label="Confirm New Password"
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              secureTextEntry
            />
            <ActionButton label="Update Password" onPress={submitChangePassword} />
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setShowChangePasswordForm(false)}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Account Security</Text>
            <ActionButton label="Change Password" onPress={handleChangePassword} />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Session Management</Text>
          <TouchableOpacity style={styles.dangerButton} onPress={handleLogout}>
            <Text style={styles.dangerText}>Log Out</Text>
          </TouchableOpacity>
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

function LabeledInput({ label, style, ...props }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, style]}
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: BRAND.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,    paddingVertical: 20,
    gap: 14,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSubtitle: { color: '#FFEBD8', marginTop: 6, fontSize: 14, lineHeight: 20 },
  container: { padding: 20, gap: 18, backgroundColor: BRAND.bg },
  card: {
    backgroundColor: BRAND.card,
    borderRadius: 18,
    padding: 18,
    gap: 14,
  },
  sectionTitle: { color: BRAND.ink, fontSize: 16, fontWeight: '800' },
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
  label: {
    fontWeight: '700',
    marginBottom: 6,
    color: BRAND.ink,
  },
  input: {
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
    color: BRAND.ink,
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: BRAND.line,
  },
  secondaryButtonText: { color: BRAND.ink, fontWeight: '700', fontSize: 15 },
});
