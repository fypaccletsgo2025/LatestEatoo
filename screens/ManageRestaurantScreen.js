// screens/ManageRestaurantScreen.js

import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserItemsForRestaurant, addUserItem } from '../state/userMenusStore';

export default function ManageRestaurantScreen({ route }) {
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
  const restaurant = route?.params?.restaurant || demoRestaurant;

  const [version, setVersion] = useState(0);
  const items = useMemo(() => getUserItemsForRestaurant(restaurant.id), [restaurant.id, version]);

  // Add-item modal state
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('drink');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [tags, setTags] = useState('');

  const submit = () => {
    const nm = name.trim();
    const pr = price.trim();
    if (!nm || !pr) { Alert.alert('Missing fields', 'Please provide Name and Price (RM).'); return; }
    const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean);
    const item = {
      id: `user-it-${Date.now()}`,
      name: nm,
      type: type.trim() || 'meal',
      price: `RM${pr}`,
      cuisine: restaurant.cuisine || (restaurant.cuisines && restaurant.cuisines[0]) || '',
      description: desc.trim(),
      tags: tagArr,
      rating: 0,
      reviews: [],
      restaurant: restaurant.name,
      location: restaurant.location,
    };
    addUserItem(restaurant, item);
    setVersion(v => v + 1);
    setShowAdd(false);
    setName(''); setType('drink'); setPrice(''); setDesc(''); setTags('');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header Card (similar to RestaurantDetail) */}
      <View style={styles.headerCard}>
        <Text style={styles.name}>{restaurant.name}</Text>
        <Text style={styles.meta}>{restaurant.location}</Text>
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <Badge text={`${restaurant.rating} ★`} color="#fde68a" />
          <Badge text={restaurant.averagePrice} />
          <Badge text={(restaurant.cuisines || []).join(', ')} color="#e0e7ff" />
        </View>
      </View>

      {/* Theme */}
      {!!restaurant.theme && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme</Text>
          <Text style={styles.body}>{restaurant.theme}</Text>
        </View>
      )}

      {/* Ambience */}
      {(restaurant.ambience || []).length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ambience</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {restaurant.ambience.map((a, idx) => (
              <View key={`amb-${idx}`} style={styles.chip}><Text>{a}</Text></View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Menu section with + icon */}
      <View style={styles.section}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={styles.sectionTitle}>Menu</Text>
          <TouchableOpacity onPress={() => setShowAdd(true)} style={styles.smallFab} accessibilityLabel="Add menu item">
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
        {items.length === 0 ? (
          <Text style={{ color: '#6b7280' }}>No items yet...</Text>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <Text style={{ fontWeight: '700' }}>{item.name}</Text>
                <View style={{ flexDirection: 'row', marginTop: 6 }}>
                  <Badge text={item.price} />
                  <Badge text={item.type} color="#e0e7ff" />
                  <Badge text={`${item.rating} ★`} color="#fde68a" />
                </View>
              </View>
            )}
          />
        )}
      </View>

      {/* Add Item Modal */}
      {showAdd && (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayBg} onPress={() => setShowAdd(false)} />
          <View style={styles.modalCard}>
            <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: 8 }}>Add Menu Item</Text>
            <Text style={styles.modalLabel}>Name</Text>
            <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="" />
            <Text style={styles.modalLabel}>Type</Text>
            <TextInput value={type} onChangeText={setType} style={styles.input} placeholder="drink / meal / dessert / snacks" />
            <Text style={styles.modalLabel}>Price (RM)</Text>
            <TextInput value={price} onChangeText={setPrice} style={styles.input} keyboardType="number-pad" placeholder="e.g. 15" />
            <Text style={styles.modalLabel}>Description</Text>
            <TextInput value={desc} onChangeText={setDesc} style={styles.input} multiline placeholder="Optional" />
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <TouchableOpacity onPress={submit} style={[styles.submitBtn, { backgroundColor: '#10b981', flex: 1, marginRight: 8 }]}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowAdd(false)} style={[styles.submitBtn, { backgroundColor: '#6b7280', flex: 1 }]}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function LabeledInput({ label, style, minHeight, ...props }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontWeight: '700', marginBottom: 6 }}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, style, minHeight ? { minHeight, textAlignVertical: 'top' } : null]}
      />
    </View>
  );
}

function Badge({ text, color = '#e5e7eb' }) {
  return (
    <View style={{ backgroundColor: color, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8 }}>
      <Text style={{ fontSize: 12, color: '#111827' }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#d1ccc7', padding: 16 },
  headerCard: {
    backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  name: { fontSize: 22, fontWeight: '800' },
  meta: { color: '#6b7280', marginTop: 4 },
  section: { marginBottom: 12 },
  sectionTitle: { fontWeight: 'bold' },
  body: { color: '#333', marginTop: 6 },
  chip: { backgroundColor: '#e5e7eb', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, marginRight: 8, marginTop: 8 },
  itemCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginRight: 12,
  },
  smallFab: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center'
  },
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  overlayBg: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.25)' },
  modalCard: {
    position: 'absolute', left: 16, right: 16, top: 80, backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  modalLabel: { marginTop: 10, marginBottom: 6, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#f9fafb', minHeight: 48 },
  submitBtn: { marginTop: 12, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
});

