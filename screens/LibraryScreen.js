// screens/LibraryScreen.js
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { availableItems, availableRestaurants } from '../data/mockData';
import { getFoodlists, updateFoodlists } from '../state/foodlistsStore';
import {
  getSavedRestaurantIds,
  getLikedItemIds,
  saveRestaurant,
  likeItem,
  onLibraryChange,
} from '../state/libraryStore';

const THEME_COLOR = '#FF4D00';
const BG_COLOR = '#FFF5ED';

export default function LibraryScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [savedRestaurants, setSavedRestaurants] = React.useState([]);
  const [likedItems, setLikedItems] = React.useState([]);
  const [foodlists, setFoodlists] = React.useState(getFoodlists());

  const refresh = React.useCallback(() => {
    const restIds = new Set(getSavedRestaurantIds());
    const itemIds = new Set(getLikedItemIds());
    setSavedRestaurants(availableRestaurants.filter((r) => restIds.has(r.id)));
    setLikedItems(availableItems.filter((i) => itemIds.has(i.id)));
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
    <View style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Scrollable brand header (consistent with Explore/Home) */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Your Library</Text>
          <View style={styles.subtitleRow}>
            <Text style={styles.headerSubtitle}>Round up your saved bites & hangouts.</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
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
                accessibilityRole="button"
                accessibilityLabel="Create a new foodlist"
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="add" size={18} color="#fff" />
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
                    onPress={() => navigation.navigate('PreferenceItemDetail', { item })}
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
                    onPress={() => navigation.navigate('RestaurantDetail', { restaurant: r })}
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
        </View>
      </ScrollView>
    </View>
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
      <Text style={{ color: '#6B4A3F' }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },

  /* Scrollable header */
  headerContainer: {
    padding: 22,
    backgroundColor: THEME_COLOR,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
    marginBottom: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSubtitle: {
    color: '#fff',
    opacity: 0.95,
    fontSize: 15,
    flexShrink: 1,
    paddingRight: 10,
  },
  pillIcon: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  /* Sections */
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    elevation: 3,
    borderColor: '#FFE8D2',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
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
    color: '#3C1E12',
  },
  addButton: {
    backgroundColor: THEME_COLOR,
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME_COLOR,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  /* Cards */
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderColor: '#FFE8D2',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardAlt: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderColor: '#FFE8D2',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    // optional accent strip—kept subtle to stay “minimalist”
    borderLeftWidth: 5,
    borderLeftColor: THEME_COLOR,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  cardMeta: {
    fontSize: 13,
    color: '#6B4A3F',
    marginTop: 4,
  },

  /* Empty state */
  emptyBox: {
    backgroundColor: '#FFF9F3',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderColor: '#FFE8D2',
    borderWidth: 1,
  },
});
