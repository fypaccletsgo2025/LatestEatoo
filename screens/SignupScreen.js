// screens/SignupScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const BRAND = {
  primary: '#FF4D00',
  accent: '#FDAA48',
  bg: '#FFF5ED',
  ink: '#222',
  inkMuted: '#6B7280',
  cardBg: '#fff',
  line: '#e6e0dc',
};

export default function SignupScreen({
  onSignupAttempt,
  onNavigateToLogin,
  navigation,
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // NEW: Terms & Privacy
  const [agreed, setAgreed] = useState(false);
  const [showTos, setShowTos] = useState(false);

  const moveToLogin = (params) => {
    if (params) {
      navigation?.replace('Login', params);
      return;
    }

    if (typeof onNavigateToLogin === 'function') {
      onNavigateToLogin();
    } else {
      navigation?.navigate('Login');
    }
  };

  const handleSubmit = async () => {
    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedFullName || !trimmedEmail || !password || !confirmPassword) {
      setError('Fill in all required fields to continue.');
      return;
    }

    if (password.length < 6) {
      setError('Passwords need at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match yet.');
      return;
    }

    if (!agreed) {
      setError('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await Promise.resolve(
        onSignupAttempt?.({
          fullName: trimmedFullName,
          email: trimmedEmail,
          password,
        })
      );

      if (!result?.success) {
        setError(result?.error || 'Unable to create your account just yet.');
        return;
      }

      setError('');
      moveToLogin({
        justSignedUp: true,
        prefillEmail: trimmedEmail,
      });
      return;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={BRAND.primary} barStyle="light-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Discover Food For You</Text>
            <Text style={styles.headerSubtitle}>
              Create your account to personalise feeds, save lists, and follow tastemakers.
            </Text>
            <View style={styles.headerMeta}>
              <Ionicons name="leaf-outline" size={18} color="#fff" />
              <Text style={styles.headerMetaText}>Fresh picks tailored to you</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tell us a little about you</Text>

            <Field
              label="Full name"
              value={fullName}
              onChangeText={setFullName}
              placeholder=" "
              icon="person-circle-outline"
              returnKeyType="next"
            />

            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />

            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Create a password"
              icon="lock-closed-outline"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              returnKeyType="next"
            />

            <Field
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter password"
              icon="shield-checkmark-outline"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            {/* NEW: Terms row (keeps same card/layout vibe) */}
            <TouchableOpacity
              onPress={() => setAgreed((v) => !v)}
              activeOpacity={0.8}
              style={styles.termsRow}
            >
              <Ionicons
                name={agreed ? 'checkbox-outline' : 'square-outline'}
                size={22}
                color={BRAND.primary}
                style={{ marginRight: 10 }}
              />
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={styles.link} onPress={() => setShowTos(true)}>
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text style={styles.link} onPress={() => setShowTos(true)}>
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[
                styles.button,
                (submitting || !agreed) && styles.buttonDisabled,
              ]}
              activeOpacity={0.9}
              onPress={handleSubmit}
              disabled={submitting || !agreed}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="star-outline" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Create account</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Optional tiny fine print below button, same palette */}
            <Text style={styles.finePrint}>
              By continuing, you accept our Terms & Privacy. Snacks not included.
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={moveToLogin}>
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* NEW: Minimal “no one reads this” ToS modal */}
      <Modal
        animationType="slide"
        transparent
        visible={showTos}
        onRequestClose={() => setShowTos(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms & Privacy</Text>
              <TouchableOpacity onPress={() => setShowTos(false)}>
                <Ionicons name="close" size={22} color={BRAND.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 380 }}
              contentContainerStyle={{ paddingBottom: 8 }}
              showsVerticalScrollIndicator
            >
              <Text style={styles.modalText}>
                Welcome to our food recommendation app. By using the app, you agree to the following:
                {'\n\n'}
                1) We recommend dishes and places based on signals like popularity, freshness, and your activity. Results are suggestions, not guarantees of availability, quality, or dietary suitability.{'\n\n'}
                2) Always check ingredients and allergens with the venue or source. We are not liable for adverse reactions or disappointment caused by cilantro.{'\n\n'}
                3) We may collect limited usage data (e.g., clicks, saves) to improve recommendations. See Privacy for what we store and how we protect it.{'\n\n'}
                4) You retain rights to any content you create (e.g., lists, notes), but grant us a license to display it within the app features you use.{'\n\n'}
                5) No spam, scraping, or mischief. Don’t do anything that breaks the law or ruins dinner for everyone else.{'\n\n'}
                6) We may update these terms occasionally. Continued use means you accept the latest version. You can delete your account at any time from settings.{'\n\n'}
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={[styles.button, { marginTop: 12 }]}
              onPress={() => setShowTos(false)}
              activeOpacity={0.9}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.buttonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, icon, style, secureTextEntry, ...inputProps }) {
  const isSecure = Boolean(secureTextEntry);
  const [hidden, setHidden] = useState(isSecure);

  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInputWrap}>
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={BRAND.primary}
            style={{ marginRight: 8 }}
          />
        ) : null}
        <TextInput
          style={styles.fieldInput}
          placeholderTextColor={BRAND.inkMuted}
          secureTextEntry={isSecure ? hidden : false}
          {...inputProps}
        />
        {isSecure ? (
          <TouchableOpacity
            onPress={() => setHidden((prev) => !prev)}
            style={{ padding: 6 }}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Ionicons
              name={hidden ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={BRAND.inkMuted}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BRAND.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 0,
    paddingBottom: 40,
  },
  header: {
    backgroundColor: BRAND.primary,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 26,
    marginHorizontal: -24,
    marginBottom: 26,
    elevation: 6,
    shadowColor: '#FFB27F',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  headerSubtitle: {
    color: '#fff',
    opacity: 0.92,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 14,
    maxWidth: 320,
  },
  headerMeta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  headerMetaText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  card: {
    backgroundColor: BRAND.cardBg,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#FFE3C6',
    shadowColor: '#FFB27F',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BRAND.ink,
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND.ink,
    marginBottom: 8,
  },
  fieldInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  fieldInput: {
    flex: 1,
    paddingVertical: 10,
    color: BRAND.ink,
    fontSize: 15,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 2,
    marginBottom: 12,
  },
  termsText: {
    flex: 1,
    color: BRAND.ink,
    fontSize: 13,
    lineHeight: 18,
  },
  link: {
    color: BRAND.primary,
    fontWeight: '700',
  },
  error: {
    color: '#C2410C',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
    fontSize: 13,
  },
  button: {
    backgroundColor: BRAND.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  finePrint: {
    marginTop: 10,
    color: BRAND.inkMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  footer: {
    marginTop: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    color: BRAND.inkMuted,
    fontSize: 14,
  },
  footerLink: {
    color: BRAND.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  // Modal styles (keeps palette + soft corners)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
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
    borderColor: '#FFE3C6',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BRAND.ink,
  },
  modalText: {
    fontSize: 13,
    color: BRAND.ink,
    lineHeight: 20,
  },
});
