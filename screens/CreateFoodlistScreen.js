// screens/CreateFoodlistScreen.js

import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { availableItems } from '../data/mockData';

export default function CreateFoodlistScreen({ route, navigation }) {
  const { setFoodlists } = route.params;

  const [name, setName] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);

  const toggleSelectItem = (item) => {
    setSelectedItems((prev) =>
      prev.find((i) => i.id === item.id)
        ? prev.filter((i) => i.id !== item.id)
        : [...prev, item]
    );
  };

  const saveFoodlist = () => {
    if (!name.trim()) {
      alert('Please enter a foodlist name');
      return;
    }

    const newList = {
      id: Date.now().toString(),
      name,
      items: selectedItems,
    };

    setFoodlists((prev) => [...prev, newList]);
    navigation.goBack();
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedItems.find((i) => i.id === item.id);
    return (
      <TouchableOpacity
        style={[styles.item, isSelected && styles.selectedItem]}
        onPress={() => toggleSelectItem(item)}
      >
        <Text style={styles.itemTitle}>
          {item.name} ({item.type}) {isSelected ? '✓' : ''}
        </Text>
        <Text style={styles.itemDetail}>Restaurant: {item.restaurant}</Text>
        <Text style={styles.itemDetail}>Location: {item.location}</Text>
        <Text style={styles.itemDetail}>Price: {item.price}</Text>
        <Text style={styles.itemDetail}>Tags: {item.tags.join(', ')}</Text>
        <Text style={styles.itemDetail}>Rating: {item.rating} ⭐</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Foodlist</Text>
      <TextInput
        placeholder="Enter Foodlist Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />
      <FlatList
        data={availableItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
      />
      <TouchableOpacity onPress={saveFoodlist} style={styles.saveBtn}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Save Foodlist</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#d1ccc7' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  item: {
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  selectedItem: {
    borderWidth: 2,
    borderColor: '#86efac',
  },
  itemTitle: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  itemDetail: {
    fontSize: 13,
    color: '#555',
  },
  saveBtn: {
    backgroundColor: '#111827',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
});
