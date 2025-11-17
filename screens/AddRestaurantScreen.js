// screens/AddRestaurantScreen.js
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { ID } from 'appwrite';
import { db, DB_ID, COL, ensureSession } from '../appwrite';

export default function AddRestaurantScreen({ onScrollDirectionChange }) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [stateRegion, setStateRegion] = useState('');
  const [postcode, setPostcode] = useState('');
  const [address, setAddress] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const scrollOffsetRef = useRef(0);
  const lastDirectionRef = useRef('down');

  const reportScrollDirection = useCallback(
    (direction) => {
      if (typeof onScrollDirectionChange !== 'function') return;
      if (lastDirectionRef.current === direction) return;
      lastDirectionRef.current = direction;
      onScrollDirectionChange(direction);
    },
    [onScrollDirectionChange],
  );

  useEffect(() => reportScrollDirection('down'), [reportScrollDirection]);

  const handleScroll = useCallback(
    (event) => {
      const y = event?.nativeEvent?.contentOffset?.y ?? 0;
      const delta = y - scrollOffsetRef.current;
      if (y <= 0) {
        reportScrollDirection('down');
      } else if (delta > 0) {
        reportScrollDirection('up');
      }
      scrollOffsetRef.current = y;
    },
    [reportScrollDirection],
  );

  const submit = async () => {
    if (submitting) return;
    const trimmedName = name.trim();
    const trimmedCity = city.trim();
    const trimmedState = stateRegion.trim();
    const trimmedPostcode = postcode.trim();
    const trimmedAddress = address.trim();
    if (!trimmedName || !trimmedCity || !trimmedState || !trimmedPostcode || !trimmedAddress) {
      Alert.alert('Missing info', 'Provide name, city, state, postcode, and address.');
      return;
    }

    const cuisinesList = cuisine
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    const restaurantData = {
      name: trimmedName,
      city: trimmedCity,
      state: trimmedState,
      postcode: trimmedPostcode,
      address: trimmedAddress,
      cuisines: cuisinesList,
      phone: phone.trim() || null,
      email: email.trim() || null,
      website: website.trim() || null,
      note: notes.trim() || null,
      status: 'pending',
      type: 'user',
      theme: null,
      ambience: [],
    };

    try {
      setSubmitting(true);
      await ensureSession();
      await db.createDocument(DB_ID, COL.userSubmissions, ID.unique(), restaurantData);
      Alert.alert('Thank you!', `Thank you for recommending ${trimmedName}! Our team will review it.`);
      setName('');
      setCity('');
      setStateRegion('');
      setPostcode('');
      setAddress('');
      setCuisine('');
      setPhone('');
      setEmail('');
      setWebsite('');
      setNotes('');
    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert('Error', error?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF5ED' }}>
      <StatusBar backgroundColor="#FF4D00" barStyle="light-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: 60 }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>Add a Restaurant</Text>
            <View style={styles.subtitleRow}>
              <Text style={styles.headerSubtitle}>
                Know a great place that we should feature? Let us know!
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Field label="Restaurant Name *" placeholder="e.g. Sushi Mentai" value={name} onChangeText={setName} />
            <Field label="City *" placeholder="e.g. Kuala Lumpur" value={city} onChangeText={setCity} />
            <Field label="State *" placeholder="e.g. Selangor" value={stateRegion} onChangeText={setStateRegion} />
            <Field label="Postcode *" placeholder="e.g. 55100" value={postcode} onChangeText={setPostcode} keyboardType="number-pad" />
            <Field label="Address *" placeholder="Street, building, etc." value={address} onChangeText={setAddress} multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: 'top' }} />
            <Field label="Cuisine" placeholder="e.g. Japanese, Thai, Western..." value={cuisine} onChangeText={setCuisine} />
            <Field label="Phone (optional)" placeholder="e.g. +60 12-345 6789" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Field label="Email (optional)" placeholder="e.g. hello@restaurant.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <Field label="Website (optional)" placeholder="e.g. https://restaurant.com" value={website} onChangeText={setWebsite} autoCapitalize="none" />
            <Field label="Notes (optional)" placeholder="Anything we should know?" value={notes} onChangeText={setNotes} multiline numberOfLines={4} style={{ minHeight: 100, textAlignVertical: 'top' }} />

            <TouchableOpacity
              onPress={submit}
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                  <Text style={styles.submitText}>Submitting...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.submitText}>Submit Recommendation</Text>
                  <Icon name="send" size={16} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.helperText}>
              By submitting, you agree that your suggestion may be edited for clarity before publishing.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, style, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput placeholderTextColor="#9a9a9a" style={[styles.input, style]} {...props} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    padding: 22,
    backgroundColor: '#FF4D00',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
    marginBottom: 16,
  },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSubtitle: { color: '#fff', opacity: 0.95, fontSize: 15, flexShrink: 1, paddingRight: 10 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginHorizontal: 16, elevation: 3, borderColor: '#FFE8D2', borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  label: { fontWeight: '700', color: '#3C1E12', marginBottom: 6, fontSize: 14 },
  inputWrapper: { borderWidth: 1, borderColor: '#FFE8D2', borderRadius: 14, backgroundColor: '#fff' },
  input: { paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: '#333' },
  submitBtn: { backgroundColor: '#FF4D00', paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10, flexDirection: 'row', gap: 8, shadowColor: '#FF4D00', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  helperText: { marginTop: 12, fontSize: 12, color: '#6B4A3F', textAlign: 'center', marginBottom: 8 },
});
