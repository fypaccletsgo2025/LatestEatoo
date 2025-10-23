// screens/LibraryScreen.js
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { availableItems, availableRestaurants } from '../data/mockData';
import { getFoodlists, updateFoodlists } from '../state/foodlistsStore';
import { getSavedRestaurantIds, getLikedItemIds, saveRestaurant, likeItem, onLibraryChange } from '../state/libraryStore';

export default function LibraryScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [savedRestaurants, setSavedRestaurants] = React.useState([]);
  const [likedItems, setLikedItems] = React.useState([]);
  const [foodlists, setFoodlists] = React.useState(getFoodlists());

  const refresh = React.useCallback(() => {
    const restIds = new Set(getSavedRestaurantIds());
    const itemIds = new Set(getLikedItemIds());
    setSavedRestaurants(availableRestaurants.filter(r => restIds.has(r.id)));
    setLikedItems(availableItems.filter(i => itemIds.has(i.id)));
  }, []);

  const seededRef = React.useRef(false);
  React.useEffect(() => {
    const unsubscribe = onLibraryChange(() => {
      refresh();
      setFoodlists(getFoodlists());
    });
    if (!seededRef.current) {
      if (getSavedRestaurantIds().length === 0 && availableRestaurants.length > 0) {
        saveRestaurant(availableRestaurants[0].id);
      }
      if (getLikedItemIds().length === 0 && availableItems.length > 0) {
        likeItem(availableItems[0].id);
        if (availableItems[1]) likeItem(availableItems[1].id);
      }
      seededRef.current = true;
    }
    refresh();
    setFoodlists(getFoodlists());
    return () => unsubscribe();
  }, [isFocused, refresh]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Your Library</Text>

      {/* Foodlists Section */}
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Foodlists ({foodlists.length})</Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('CreateFoodlist', {
                setFoodlists: (fn) => {
                  updateFoodlists(fn);
                  setFoodlists(getFoodlists());
                },
              })
            }
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        {foodlists.length === 0 ? (
          <Empty text="No foodlists yet." />
        ) : (
          <FlatList
            data={foodlists}
            keyExtractor={(f) => f.id}
            scrollEnabled={false}
            renderItem={({ item: f }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() =>
                  navigation.navigate('FoodlistDetail', {
                    foodlist: f,
                    setFoodlists: (fn) => {
                      updateFoodlists(fn);
                      setFoodlists(getFoodlists());
                    },
                  })
                }
              >
                <Text style={styles.cardTitle}>{f.name}</Text>
                <Text style={styles.cardMeta}>
                  {f.items.length} item{f.items.length !== 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Liked Dishes Section */}
      <Section title={`Liked Dishes (${likedItems.length})`}>
        {likedItems.length === 0 ? (
          <Empty text="No liked dishes yet." />
        ) : (
          <FlatList
            data={likedItems}
            keyExtractor={(i) => i.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.cardAlt}
                onPress={() =>
                  navigation.navigate('PreferenceItemDetail', { item })
                }
              >
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardMeta}>
                  {item.restaurant} • {item.type} • {item.price}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
      </Section>

      {/* Saved Restaurants Section */}
      <Section title={`Saved Restaurants (${savedRestaurants.length})`}>
        {savedRestaurants.length === 0 ? (
          <Empty text="No saved restaurants yet." />
        ) : (
          <FlatList
            data={savedRestaurants}
            keyExtractor={(r) => r.id}
            scrollEnabled={false}
            renderItem={({ item: r }) => (
              <TouchableOpacity
                style={styles.cardAlt}
                onPress={() =>
                  navigation.navigate('RestaurantDetail', { restaurant: r })
                }
              >
                <Text style={styles.cardTitle}>{r.name}</Text>
                <Text style={styles.cardMeta}>
                  {r.location} • {r.cuisine} • {r.averagePrice}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Empty({ text }) {
  return (
    <View style={styles.emptyBox}>
      <Text style={{ color: '#7e868c' }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5EE',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FF4D00',
    marginBottom: 14,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#FDAA48',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#FFF0E6',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  cardAlt: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: '#FF4D00',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  cardMeta: {
    fontSize: 13,
    color: '#777',
    marginTop: 4,
  },
  emptyBox: {
    backgroundColor: '#f4f4f4',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
});
