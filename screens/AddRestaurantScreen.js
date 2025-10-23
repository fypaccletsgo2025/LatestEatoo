// screens/AddRestaurantScreen.js
import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Pressable, Keyboard } from 'react-native';

export default function AddRestaurantScreen() {
  const [name, setName] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [cuisine, setCuisine] = React.useState('');
  const [contact, setContact] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const submit = () => {
    if (!name.trim() || !location.trim()) {
      Alert.alert('Missing info', 'Please provide at least a restaurant name and location.');
      return;
    }
    // Frontend-only: pretend to send to admin moderation queue
    Alert.alert('Thank you!', `Thank you for recommending ${name.trim()}! Our team will review it.`);
    setName('');
    setLocation('');
    setCuisine('');
    setContact('');
    setNotes('');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Text style={styles.title}>Recommend a Restaurant</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Restaurant Name *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Sushi Mentai"
          style={styles.input}
        />

        <Text style={styles.label}>Location *</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. Kuala Lumpur"
          style={styles.input}
        />

        <Text style={styles.label}>Cuisine</Text>
        <TextInput
          value={cuisine}
          onChangeText={setCuisine}
          placeholder="e.g. Japanese, Thai, Western..."
          style={styles.input}
        />

        <Text style={styles.label}>Contact (optional)</Text>
        <TextInput
          value={contact}
          onChangeText={setContact}
          placeholder="e.g. Instagram handle or phone number"
          style={styles.input}
        />

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything we should know?"
          style={[styles.input, styles.notesInput]}
          multiline
        />

        <TouchableOpacity onPress={submit} style={styles.submitBtn}>
          <Text style={styles.submitText}>Submit Recommendation</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5EE',
    padding: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FF4D00',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  label: {
    fontWeight: '700',
    color: '#333',
    marginTop: 10,
    marginBottom: 6,
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#f1f1f1',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#f9fafb',
    fontSize: 14,
    color: '#222',
  },
  notesInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#FDAA48',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
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
});
