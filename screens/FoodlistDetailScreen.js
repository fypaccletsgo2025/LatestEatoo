// screens/FoodlistDetailScreen.js

import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { mockFoodlists, availableItems } from '../data/mockData';

export default function FoodlistDetailScreen({ route, navigation }) {
  const { foodlist, setFoodlists } = route.params; // passed from main screen

  // Defensive: ensure items array has no undefined entries
  const [currentList, setCurrentList] = useState({
    ...foodlist,
    items: (foodlist?.items ?? []).filter(Boolean),
  });
  const [addingItems, setAddingItems] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState([]);
  const [selectedToRemove, setSelectedToRemove] = useState([]);

  // Toggle item selection for adding
  const toggleAdd = (item) => {
    setSelectedToAdd((prev) =>
      prev.find((i) => i.id === item.id)
        ? prev.filter((i) => i.id !== item.id)
        : [...prev, item]
    );
  };

  // Toggle item selection for removing (long press)
  const toggleRemove = (item) => {
    setSelectedToRemove((prev) =>
      prev.find((i) => i.id === item.id)
        ? prev.filter((i) => i.id !== item.id)
        : [...prev, item]
    );
  };

  // Confirm removing selected items
  const confirmRemove = () => {
    if (selectedToRemove.length === 0) return;

    Alert.alert(
      'Remove Items',
      `Are you sure you want to remove ${selectedToRemove.length} item(s) from this list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedItems = currentList.items.filter(
              (item) => !selectedToRemove.find((i) => i.id === item.id)
            );
            const updatedList = { ...currentList, items: updatedItems };
            setCurrentList(updatedList);
            setFoodlists((prev) =>
              prev.map((f) => (f.id === currentList.id ? updatedList : f))
            );
            setSelectedToRemove([]);
          },
        },
      ]
    );
  };

  // Confirm adding selected items
  const confirmAdd = () => {
    const updatedItems = [...currentList.items, ...selectedToAdd];
    const updatedList = { ...currentList, items: updatedItems };
    setCurrentList(updatedList);
    setFoodlists((prev) =>
      prev.map((f) => (f.id === currentList.id ? updatedList : f))
    );
    setSelectedToAdd([]);
    setAddingItems(false);
  };

  // Delete entire list with confirmation popup
  const deleteList = () => {
    Alert.alert(
      'Delete Foodlist',
      'Are you sure you want to permanently delete this foodlist? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setFoodlists((prev) => prev.filter((f) => f.id !== currentList.id));
            navigation.goBack();
          },
        },
      ]
    );
  };

  // Items available to add
  const itemsAvailableToAdd = availableItems.filter(
    (item) => !currentList.items.find((i) => i.id === item.id)
  );

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: '#d1ccc7' }}>
      <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 16 }}>{currentList.name}</Text>

      {!addingItems ? (
        <>
          <FlatList
            data={currentList.items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('FoodItemDetail', { item })
                }
                onLongPress={() => toggleRemove(item)}
                style={{
                  padding: 14,
                  backgroundColor: '#fff',
                  borderRadius: 16,
                  marginBottom: 10,
                  shadowColor: '#000',
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2,
                  borderWidth: selectedToRemove.find((i) => i.id === item.id) ? 2 : 0,
                  borderColor: selectedToRemove.find((i) => i.id === item.id) ? '#fca5a5' : 'transparent',
                }}
              >
                <Text style={{ fontWeight: '700' }}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />

          {selectedToRemove.length > 0 && (
            <TouchableOpacity onPress={confirmRemove} style={{ backgroundColor: '#fb923c', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{`Remove Selected Item${selectedToRemove.length > 1 ? 's' : ''}`}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => setAddingItems(true)} style={{ backgroundColor: '#111827', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Add Item</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={deleteList} style={{ backgroundColor: '#ef4444', paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Delete Foodlist</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={{ marginBottom: 8 }}>Select items to add:</Text>
          <FlatList
            data={itemsAvailableToAdd}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => toggleAdd(item)}
                style={{
                  padding: 14,
                  backgroundColor: '#fff',
                  borderRadius: 16,
                  marginBottom: 10,
                  shadowColor: '#000',
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2,
                  borderWidth: selectedToAdd.find((i) => i.id === item.id) ? 2 : 0,
                  borderColor: selectedToAdd.find((i) => i.id === item.id) ? '#86efac' : 'transparent',
                }}
              >
                <Text style={{ fontWeight: '700' }}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity onPress={confirmAdd} style={{ backgroundColor: '#111827', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Confirm Add</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAddingItems(false)} style={{ backgroundColor: '#6b7280', paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Cancel</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
