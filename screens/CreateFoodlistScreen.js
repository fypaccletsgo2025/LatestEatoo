// screens/CreateFoodlistScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
      members: [],
    };

    setFoodlists((prev) => [...prev, newList]);
    navigation.goBack();
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedItems.find((i) => i.id === item.id);
    return (
      <TouchableOpacity
        style={[styles.itemCard, isSelected && styles.selectedCard]}
        onPress={() => toggleSelectItem(item)}
        activeOpacity={0.8}
      >
        <View style={styles.itemHeader}>
          <Text style={styles.itemTitle}>{item.name}</Text>
          {isSelected && <Ionicons name="checkmark-circle" size={22} color="#FF4D00" />}
        </View>
        <Text style={styles.itemDetail}>🍽️ {item.restaurant}</Text>
        <Text style={styles.itemDetail}>📍 {item.location}</Text>
        <Text style={styles.itemDetail}>💲 {item.price}</Text>
        <Text style={styles.itemDetail}>🏷️ {item.tags.join(', ')}</Text>
        <Text style={styles.itemDetail}>⭐ {item.rating}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Foodlist</Text>
        <View style={{ width: 36 }} /> {/* spacer for symmetry */}
      </View>

      {/* Input + List */}
      <ScrollView contentContainerStyle={{ paddingBottom: 90 }}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Foodlist Name</Text>
          <TextInput
            placeholder="Enter Foodlist Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholderTextColor="#999"
          />
        </View>

        <Text style={styles.sectionTitle}>Select Items</Text>

        <FlatList
          data={availableItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          scrollEnabled={false}
        />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={saveFoodlist} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>Save Foodlist</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f4f2',
  },

  // --- Header ---
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4D00',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    elevation: 6,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },

  // --- Input Section ---
  inputContainer: {
    marginTop: 20,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  inputLabel: {
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 10,
    fontSize: 15,
    backgroundColor: '#fdfdfd',
  },

  // --- Items List ---
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 10,
    marginHorizontal: 16,
    color: '#111827',
  },
  itemCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#FF4D00',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  itemDetail: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },

  // --- Bottom Bar ---
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FF4D00',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 10,
  },
  saveBtn: {
    backgroundColor: '#FDAA48',
    paddingVertical: 12,
    paddingHorizontal: 50,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
