// screens/AddRestaurantScreen.js
import React from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

export default function AddRestaurantScreen({ onScrollDirectionChange }) {
  const [name, setName] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [cuisine, setCuisine] = React.useState('');
  const [contact, setContact] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const scrollOffsetRef = React.useRef(0);
  const lastDirectionRef = React.useRef('down');
  const reportScrollDirection = React.useCallback(
    (direction) => {
      if (typeof onScrollDirectionChange !== 'function') {
        return;
      }
      if (lastDirectionRef.current === direction) {
        return;
      }
      lastDirectionRef.current = direction;
      onScrollDirectionChange(direction);
    },
    [onScrollDirectionChange]
  );

  React.useEffect(() => {
    reportScrollDirection('down');
  }, [reportScrollDirection]);

  const handleScroll = React.useCallback(
    (event) => {
      const y = event?.nativeEvent?.contentOffset?.y ?? 0;
      const delta = y - scrollOffsetRef.current;
      scrollOffsetRef.current = y;
      if (y <= 0) {
        reportScrollDirection('down');
        return;
      }
      if (Math.abs(delta) < 8) {
        return;
      }
      reportScrollDirection(delta > 0 ? 'up' : 'down');
    },
    [reportScrollDirection]
  );

  const submit = () => {
    if (!name.trim() || !location.trim()) {
      Alert.alert('Missing info', 'Please provide at least a restaurant name and location.');
      return;
    }
    Alert.alert('Thank you!', `Thank you for recommending ${name.trim()}! Our team will review it.`);
    setName('');
    setLocation('');
    setCuisine('');
    setContact('');
    setNotes('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF5ED' }}>
      <StatusBar backgroundColor="#FF4D00" barStyle="light-content" />

      {/* Everything scrolls together */}
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
          {/* Header (scrollable like homepage) */}
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>Add a Restaurant</Text>
            <View style={styles.subtitleRow}>
              <Text style={styles.headerSubtitle}>
                Know a great place that we should feature? Let us know!
              </Text>
            </View>
          </View>

          {/* Card Section */}
          <View style={styles.card}>
            <Field
              label="Restaurant Name *"
              placeholder="e.g. Sushi Mentai"
              value={name}
              onChangeText={setName}
            />

            <Field
              label="Location *"
              placeholder="e.g. Kuala Lumpur"
              value={location}
              onChangeText={setLocation}
            />

            <Field
              label="Cuisine"
              placeholder="e.g. Japanese, Thai, Western..."
              value={cuisine}
              onChangeText={setCuisine}
            />

            <Field
              label="Contact (optional)"
              placeholder="e.g. Instagram handle or phone number"
              value={contact}
              onChangeText={setContact}
            />

            <Field
              label="Notes (optional)"
              placeholder="Anything we should know?"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              style={{ minHeight: 100, textAlignVertical: 'top' }}
            />

            <TouchableOpacity onPress={submit} style={styles.submitBtn}>
              <Text style={styles.submitText}>Submit Recommendation</Text>
              <Icon name="send" size={16} color="#fff" />
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

/* Field Component */
function Field({ label, style, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          placeholderTextColor="#9a9a9a"
          style={[styles.input, style]}
          {...props}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* Header */
  headerContainer: {
    padding: 22,
    backgroundColor: '#FF4D00',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
    marginBottom: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSubtitle: {
    color: '#fff',
    opacity: 0.95,
    fontSize: 15,
    flexShrink: 1,
    paddingRight: 10,
  },
  editIconHeader: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  /* Card */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    elevation: 3,
    borderColor: '#FFE8D2',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  /* Fields */
  label: {
    fontWeight: '700',
    color: '#3C1E12',
    marginBottom: 6,
    fontSize: 14,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: '#FFE8D2',
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },

  /* Submit */
  submitBtn: {
    backgroundColor: '#FF4D00',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#FF4D00',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  submitText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },

  /* Helper footer */
  helperText: {
    marginTop: 12,
    fontSize: 12,
    color: '#6B4A3F',
    textAlign: 'center',
    marginBottom: 8,
  },
});
