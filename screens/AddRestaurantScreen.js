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
      <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
        <Text style={styles.title}>Recommend a Restaurant</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Restaurant Name *</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Restaurant name" style={styles.input} />

          <Text style={styles.label}>Location *</Text>
          <TextInput value={location} onChangeText={setLocation} placeholder="Location" style={styles.input} />

          <Text style={styles.label}>Cuisine</Text>
          <TextInput value={cuisine} onChangeText={setCuisine} placeholder="Cuisine" style={styles.input} />

          <Text style={styles.label}>Contact (optional)</Text>
          <TextInput value={contact} onChangeText={setContact} placeholder="email/phone/IG handle" style={styles.input} />

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything we should know?"
            style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
            multiline
          />

          <TouchableOpacity onPress={submit} style={styles.submitBtn}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Submit Recommendation</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#d1ccc7', padding: 16 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  card: {
    backgroundColor: '#fff', padding: 12, borderRadius: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  label: { fontWeight: '700', marginTop: 8, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#f9fafb' },
  submitBtn: { marginTop: 12, backgroundColor: '#007AFF', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
});
