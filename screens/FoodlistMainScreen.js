// screens/FoodlistMainScreen.js

import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getFoodlists, updateFoodlists } from '../state/foodlistsStore';

export default function FoodlistMainScreen({ navigation }) {
  const [foodlists, setFoodlists] = useState(getFoodlists());

  const handleUpdateList = (updatedList) => {
    updateFoodlists(prev => prev.map(f => (f.id === updatedList.id ? updatedList : f)));
    setFoodlists(getFoodlists());
  };

  const handleDeleteList = (id) => {
    updateFoodlists(prev => prev.filter(f => f.id !== id));
    setFoodlists(getFoodlists());
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.container}>
        <Text style={styles.title}>Your Foodlists</Text>
        <FlatList
          data={foodlists}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                navigation.navigate('FoodlistDetail', {
                  foodlist: item,
                  setFoodlists: (fn) => {
                    updateFoodlists(fn);
                    setFoodlists(getFoodlists());
                  },
                })
              }
            >
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>
                {item.items.length} item{item.items.length !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* Add new Foodlist button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateFoodlist', { setFoodlists })}
        >
          <Text style={styles.addText}>+</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#d1ccc7' },
  container: { flex: 1, padding: 16, backgroundColor: '#d1ccc7' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  card: {
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
  cardTitle: { fontSize: 18, fontWeight: '700' },
  cardMeta: { color: '#6b7280', marginTop: 4 },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#007AFF',
    borderRadius: 30,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { color: '#fff', fontSize: 24 },
});
