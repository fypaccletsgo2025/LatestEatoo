// screens/BusinessProfileScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { getBusinessProfile, submitBusinessProfile } from '../state/businessStore';

export default function BusinessProfileScreen() {
  const [bp, setBp] = React.useState(getBusinessProfile());
  const [showForm, setShowForm] = React.useState(false);
  const navigation = useNavigation();

  // Form fields
  const [name, setName] = React.useState('');
  const [regNo, setRegNo] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [city, setCity] = React.useState('');
  const [stateVal, setStateVal] = React.useState('');
  const [postcode, setPostcode] = React.useState('');
  const [cuisine, setCuisine] = React.useState('');
  const [website, setWebsite] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const submit = () => {
    if (!name.trim() || !regNo.trim() || !email.trim()) {
      Alert.alert('Missing info', 'Please fill Business Name, Registration No., and Email.');
      return;
    }
    const data = { name, regNo, email, phone, address, city, state: stateVal, postcode, cuisine, website, notes };
    submitBusinessProfile(data);
    setBp(getBusinessProfile());
    setShowForm(false);
    Alert.alert('Thank you!', 'Your business registration has been submitted for moderation.');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ backgroundColor: '#FF4D00', padding: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>Business Profile</Text>
      </View>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

      {/* Pending/Approved state */}
      {bp && !showForm ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Submission Status</Text>
          <Badge text={bp.status === 'pending' ? 'Pending Review' : bp.status} color="#fde68a" />
          <View style={{ marginTop: 10 }}>
            <Text style={styles.meta}><Text style={styles.metaLabel}>Business:</Text> {bp.data.name}</Text>
            <Text style={styles.meta}><Text style={styles.metaLabel}>Reg No.:</Text> {bp.data.regNo}</Text>
            <Text style={styles.meta}><Text style={styles.metaLabel}>Email:</Text> {bp.data.email}</Text>
            {!!bp.data.phone && <Text style={styles.meta}><Text style={styles.metaLabel}>Phone:</Text> {bp.data.phone}</Text>}
            {!!bp.data.address && <Text style={styles.meta}><Text style={styles.metaLabel}>Address:</Text> {bp.data.address}</Text>}
          </View>
          <Text style={{ color: '#6b7280', marginTop: 10 }}>Our team will contact you for verification and next steps.</Text>
        </View>
      ) : null}

      {/* Landing when not registered */}
      {!bp && !showForm ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Start a Business Account?</Text>
          <Text style={{ color: '#6b7280', marginBottom: 10 }}>
            Register to manage your restaurant details, share updates, and appear in recommendations.
          </Text>
          <TouchableOpacity onPress={() => setShowForm(true)} style={[styles.btn, { backgroundColor: '#111827' }]}> 
            <Text style={styles.btnText}>Start Registration</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Registration form */}
      {showForm && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Business Registration</Text>
          <LabeledInput label="Business Name *" value={name} onChangeText={setName} />
          <LabeledInput label="Registration No. (SSM) *" value={regNo} onChangeText={setRegNo} />
          <LabeledInput label="Email *" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <LabeledInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <LabeledInput label="Address" value={address} onChangeText={setAddress} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><LabeledInput label="City" value={city} onChangeText={setCity} /></View>
            <View style={{ flex: 1 }}><LabeledInput label="State" value={stateVal} onChangeText={setStateVal} /></View>
          </View>
          <LabeledInput label="Postcode" value={postcode} onChangeText={setPostcode} keyboardType="number-pad" />
          <LabeledInput label="Cuisine" value={cuisine} onChangeText={setCuisine} />
          <LabeledInput label="Website / Instagram (optional)" value={website} onChangeText={setWebsite} />
          <LabeledInput label="Notes (optional)" value={notes} onChangeText={setNotes} multiline minHeight={80} />

          <TouchableOpacity onPress={submit} style={[styles.btn, { backgroundColor: '#007AFF' }]}>
            <Text style={styles.btnText}>Submit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowForm(false)} style={[styles.btn, { backgroundColor: '#6b7280', marginTop: 8 }]}>
            <Text style={styles.btnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Demo: Already Registered Restaurant */}
      {!showForm && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Espurrsso Bar</Text>
            <Text style={{ color: '#6b7280', marginBottom: 10 }}>Cat cafe • Mont Kiara, KL</Text>
          <TouchableOpacity
            onPress={() => {
              const demoRestaurant = {
                id: 'rest-espurrsso-bar',
                name: 'Espurrsso Bar',
                location: 'Mont Kiara, KL',
                cuisines: ['cafe'],
                cuisine: 'cafe',
                ambience: ['cat cafe', 'cozy', 'family friendly'],
                rating: 4.7,
                averagePrice: 'RM18',
                averagePriceValue: 18,
                theme: 'Cat cafe with specialty espresso and cuddly resident cats.',
              };
              navigation.navigate('ManageRestaurant', { restaurant: demoRestaurant });
            }}
            style={[styles.btn, { backgroundColor: '#111827' }]}
          >
            <Text style={styles.btnText}>Open Restaurant & Manage Menu</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
      <View style={{ height: 56, backgroundColor: '#FF4D00' }} />
    </SafeAreaView>
  );
}

function LabeledInput({ label, style, minHeight, ...props }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, style, minHeight ? { minHeight, textAlignVertical: 'top' } : null]}
      />
    </View>
  );
}

function Badge({ text, color = '#e5e7eb' }) {
  return (
    <View style={{ backgroundColor: color, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginTop: 8 }}>
      <Text style={{ fontSize: 12, color: '#111827' }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#d1ccc7', padding: 16 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  card: {
    backgroundColor: '#fff', padding: 12, borderRadius: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  cardTitle: { fontWeight: '800', marginBottom: 8 },
  label: { fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#f9fafb' },
  btn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  meta: { color: '#111827', marginTop: 2 },
  metaLabel: { fontWeight: '700' },
});
