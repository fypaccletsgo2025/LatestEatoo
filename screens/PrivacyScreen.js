// screens/PrivacyScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Platform,
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
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', body: '' });

  const handlePolicy = () => {
    setModalContent({
      title: 'Privacy Policy',
      body: "We may collect limited usage data (e.g., clicks, saves) to improve recommendations. We do not sell your personal information. See our full policy for details on what we store and how we protect it.",
    });
    setModalVisible(true);
  };

  const handleTerms = () => {
    setModalContent({
      title: 'Terms of Service',
      body: "Welcome to our food recommendation app. By using the app, you agree to the following:\n\n1) We recommend dishes and places based on signals like popularity, freshness, and your activity. Results are suggestions, not guarantees of availability, quality, or dietary suitability.\n\n2) Always check ingredients and allergens with the venue or source. We are not liable for adverse reactions.\n\n3) You retain rights to any content you create (e.g., lists, notes), but grant us a license to display it within the app features you use.\n\n4) No spam, scraping, or mischief. Don’t do anything that breaks the law or ruins dinner for everyone else.",
    });
    setModalVisible(true);
  };

  const handleDataSettings = () => {
    setModalContent({
      title: 'Data & Permissions',
      body: 'You can manage your app permissions in your device settings. This includes permissions for location (for navigation) and notifications (for invites and updates).\n\nTo export your data, please contact support. You can delete your account from the "Password & Security" screen.',
    });
    setModalVisible(true);
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

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            We respect your privacy. Your data stays with us and is never shared without your consent.
          </Text>
        </View>
      </ScrollView>
      <InfoModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={modalContent.title}
        body={modalContent.body}
      />
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

function InfoModal({ visible, onClose, title, body }) {
  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: BRAND.primary, fontWeight: '700' }}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ maxHeight: Platform.OS === 'ios' ? 400 : 350 }}
            contentContainerStyle={{ paddingBottom: 8 }}
            showsVerticalScrollIndicator
          >
            <Text style={styles.modalText}>
              {body}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
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
    flexGrow: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: BRAND.line,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BRAND.ink,
  },
  modalText: {
    fontSize: 14,
    color: BRAND.ink,
    lineHeight: 22,
  },
});
