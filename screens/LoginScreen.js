// screens/LoginScreen.js
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

export default function LoginScreen({
  onLoginAttempt,
  onNavigateToSignup,
  navigation,
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const moveToSignup = () => {
    if (typeof onNavigateToSignup === 'function') {
      onNavigateToSignup();
    } else {
      navigation?.navigate('Signup');
    }
  };

  const handleSubmit = async () => {
    const trimmedUser = username.trim();

    if (!trimmedUser || !password) {
      setError('Enter both username and password to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await Promise.resolve(
        onLoginAttempt?.({ username: trimmedUser, password })
      );

      if (!result?.success) {
        setError(result?.error || 'Unable to sign in. Please try again.');
        return;
      }

      setError('');
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
            <Text style={styles.headerTitle}>Your Next Favorite Meal Awaits</Text>
            <Text style={styles.headerSubtitle}>
            Sign in to explore personalized food ideas and hidden gems.            
            </Text>
            <View style={styles.headerMeta}>
              <Ionicons name="sparkles-outline" size={18} color="#fff" />
              <Text style={styles.headerMetaText}>Recommendations that hit the spot</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign in to your account</Text>

            <Field
              label="Username"
              value={username}
              onChangeText={setUsername}
              icon="person-outline"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Enter your username"
              returnKeyType="next"
            />

            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              icon="lock-closed-outline"
              secureTextEntry
              placeholder="Enter your password"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.button, submitting && styles.buttonDisabled]}
              activeOpacity={0.9}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Sign in</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>New to Eatoo?</Text>
            <TouchableOpacity onPress={moveToSignup}>
              <Text style={styles.footerLink}>Create an account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, icon, style, ...inputProps }) {
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
          {...inputProps}
        />
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
  testerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFEFE2',
    borderWidth: 1,
    borderColor: '#FFC9A3',
    marginTop: 4,
    marginBottom: 16,
  },
  testerText: {
    flex: 1,
    fontSize: 13,
    color: BRAND.ink,
  },
  testerBold: {
    fontWeight: '700',
    color: BRAND.primary,
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
});
