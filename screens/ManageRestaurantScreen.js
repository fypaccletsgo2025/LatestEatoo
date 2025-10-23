// screens/ManageRestaurantScreen.js

import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
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

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [tags, setTags] = useState('');

  const submit = () => {
    const nm = name.trim();
    const pr = price.trim();
    if (!nm || !pr) {
      Alert.alert('Missing fields', 'Please provide Name and Price (RM).');
      return;
    }
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
    setName('');
    setType('drink');
    setPrice('');
    setDesc('');
    setTags('');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.name}>{restaurant.name}</Text>
        <Text style={styles.meta}>{restaurant.location}</Text>
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <Badge text={`${restaurant.rating} ★`} color="#FDAA48" />
          <Badge text={restaurant.averagePrice} color="#FFE3CA" />
          <Badge text={(restaurant.cuisines || []).join(', ')} color="#FFF8F3" />
        </View>
      </View>

      {!!restaurant.theme && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme</Text>
          <View style={styles.themeBox}>
            <Text style={styles.body}>{restaurant.theme}</Text>
          </View>
        </View>
      )}

      {(restaurant.ambience || []).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ambience</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {restaurant.ambience.map((a, idx) => (
              <View key={`amb-${idx}`} style={styles.chip}>
                <Text style={{ color: '#FFF8F3' }}>{a}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.menuHeader}>
          <Text style={styles.sectionTitle}>Menu</Text>
          <TouchableOpacity onPress={() => setShowAdd(true)} style={styles.smallFab}>
            <Ionicons name="add" size={18} color="#FFF8F3" />
          </TouchableOpacity>
        </View>
        {items.length === 0 ? (
          <Text style={{ color: '#777' }}>No items yet...</Text>
        ) : (
          <FlatList
            data={items}
            keyExtractor={i => i.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <Text style={{ fontWeight: '700', color: '#FFF8F3' }}>{item.name}</Text>
                <View style={{ flexDirection: 'row', marginTop: 6 }}>
                  <Badge text={item.price} color="#FDAA48" />
                  <Badge text={item.type} color="#FFE3CA" />
                  <Badge text={`${item.rating} ★`} color="#FFF8F3" />
                </View>
              </View>
            )}
          />
        )}
      </View>

      {showAdd && (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayBg} onPress={() => setShowAdd(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Menu Item</Text>

            <Text style={styles.modalLabel}>Name</Text>
            <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="e.g. Mocha Latte" />

            <Text style={styles.modalLabel}>Type</Text>
            <TextInput value={type} onChangeText={setType} style={styles.input} placeholder="drink / meal / dessert" />

            <Text style={styles.modalLabel}>Price (RM)</Text>
            <TextInput value={price} onChangeText={setPrice} style={styles.input} keyboardType="number-pad" placeholder="e.g. 15" />

            <Text style={styles.modalLabel}>Description</Text>
            <TextInput value={desc} onChangeText={setDesc} style={styles.input} multiline placeholder="Optional" />

            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <TouchableOpacity onPress={submit} style={[styles.submitBtn, { backgroundColor: '#FF4D00', flex: 1, marginRight: 8 }]}>
                <Text style={{ color: '#FFF8F3', fontWeight: '700' }}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowAdd(false)} style={[styles.submitBtn, { backgroundColor: '#FDAA48', flex: 1 }]}>
                <Text style={{ color: '#FFF8F3', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function Badge({ text, color = '#FFE3CA' }) {
  return (
    <View style={{ backgroundColor: color, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8 }}>
      <Text style={{ fontSize: 12, color: '#111827' }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F3', padding: 16 },
  headerCard: {
    backgroundColor: '#FF4D00',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#FF4D00',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  name: { fontSize: 22, fontWeight: '800', color: '#FFF8F3' },
  meta: { color: '#FFF8F3', marginTop: 4 },
  section: { marginBottom: 12 },
  sectionTitle: { fontWeight: 'bold', color: '#FF4D00' },
  body: { color: '#FFF8F3', marginTop: 4 },
  themeBox: {
    backgroundColor: '#FDAA48',
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },
  chip: {
    backgroundColor: '#FF4D00',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginTop: 8,
  },
  itemCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FF4D00',
    shadowColor: '#FDAA48',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
    marginRight: 12,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  smallFab: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF4D00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  modalCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 80,
    backgroundColor: '#FFF8F3',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  modalTitle: { fontWeight: '800', fontSize: 16, marginBottom: 8, color: '#FF4D00' },
  modalLabel: { marginTop: 10, marginBottom: 6, fontWeight: '600', color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#FFE3CA',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#FFF',
    minHeight: 48,
  },
  submitBtn: { marginTop: 12, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
});
