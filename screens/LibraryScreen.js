// screens/LibraryScreen.js
import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Local stores
import { getFoodlists, loadFoodlists, onFoodlistsChange } from '../state/foodlistsStore';
import {
  getSavedRestaurantIds,
  getLikedItemIds,
  onLibraryChange,
  loadLibraryState,
} from '../state/libraryStore';

// Appwrite
import { db, DB_ID, COL } from '../appwrite';
import { Query } from 'appwrite';

const THEME_COLOR = '#FF4D00';
const BG_COLOR = '#FFF5ED';

/** Fetch a set of Appwrite docs by $id[] with safeguards */
async function fetchByIds(collectionId, ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const res = await db.listDocuments(DB_ID, collectionId, [Query.equal('$id', ids)]);
  return res.documents || [];
}

export default function LibraryScreen({ onScrollDirectionChange }) {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  // State
  const [foodlists, setFoodlists] = React.useState(getFoodlists());
  const [savedRestaurants, setSavedRestaurants] = React.useState([]);
  const [likedItems, setLikedItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async ({ forceFoodlists = false, forceLibrary = false } = {}) => {
    try {
      setLoading(true);
      await loadLibraryState({ force: forceLibrary });
      const restIds = getSavedRestaurantIds();
      const itemIds = getLikedItemIds();

      const foodlistsPromise = loadFoodlists({ force: forceFoodlists });

      const [restaurantDocs, itemDocs, lists] = await Promise.all([
        fetchByIds(COL.restaurants, restIds),
        fetchByIds(COL.items, itemIds),
        foodlistsPromise,
      ]);

      const normalizedRestaurants = restaurantDocs.map((r) => ({
        id: r.$id,
        name: r.name,
        location: r.location || '',
        cuisine: Array.isArray(r.cuisines) ? r.cuisines.join(', ') : r.cuisine || '',
        averagePrice:
          typeof r.averagePriceValue === 'number'
            ? `RM${r.averagePriceValue}`
            : r.averagePrice || '',
      }));

      const normalizedItems = itemDocs.map((i) => ({
        id: i.$id,
        name: i.name,
        restaurant: i.restaurantName || '',
        type: i.type || 'other',
        price:
          typeof i.priceRM === 'number'
            ? `RM ${Number(i.priceRM).toFixed(2)}`
            : i.price || '',
      }));

      setSavedRestaurants(normalizedRestaurants);
      setLikedItems(normalizedItems);
      setFoodlists(lists);
    } catch (e) {
      console.warn('Library refresh failed:', e?.message || e);
      setSavedRestaurants([]);
      setLikedItems([]);
      setFoodlists(getFoodlists());
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const unsubscribeLibrary = onLibraryChange(() => {
      refresh();
    });
    const unsubscribeFoodlists = onFoodlistsChange((next) => setFoodlists(next));
    return () => {
      unsubscribeLibrary();
      unsubscribeFoodlists();
    };
  }, [refresh]);

  React.useEffect(() => {
    if (!isFocused) return;
    refresh({ forceFoodlists: true, forceLibrary: true });
  }, [isFocused, refresh]);

  const scrollOffsetRef = React.useRef(0);
  const lastDirectionRef = React.useRef('down');
  const reportScrollDirection = React.useCallback(
    (direction) => {
      if (typeof onScrollDirectionChange !== 'function') {
        return;
      }
      if (lastDirectionRef.current === direction) {
        return;
      }
      lastDirectionRef.current = direction;
      onScrollDirectionChange(direction);
    },
    [onScrollDirectionChange]
  );

  React.useEffect(() => {
    reportScrollDirection('down');
  }, [reportScrollDirection]);

  const handleScroll = React.useCallback(
    (event) => {
      const y = event?.nativeEvent?.contentOffset?.y ?? 0;
      const delta = y - scrollOffsetRef.current;
      scrollOffsetRef.current = y;
      if (y <= 0) {
        reportScrollDirection('down');
        return;
      }
      if (Math.abs(delta) < 8) {
        return;
      }
      reportScrollDirection(delta > 0 ? 'up' : 'down');
    },
    [reportScrollDirection]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['right', 'bottom', 'left']}>
      <StatusBar backgroundColor={THEME_COLOR} barStyle="light-content" translucent />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Your Library</Text>
          <View style={styles.subtitleRow}>
            <Text style={styles.headerSubtitle}>Round up your saved bites &amp; hangouts.</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          <View style={styles.section}>
            <View style={styles.headerRow}>
              <Text style={styles.sectionTitle}>Foodlists ({foodlists.length})</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('CreateFoodlist')}
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
                      })
                    }
                  >
                    <Text style={styles.cardTitle}>{f.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>

          <Section title={`Liked Dishes (${likedItems.length})`}>
            {loading ? (
              <Loading />
            ) : likedItems.length === 0 ? (
              <Empty text="No liked dishes yet." />
            ) : (
              <FlatList
                data={likedItems}
                keyExtractor={(i) => i.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.cardAlt}
                    onPress={() => navigation.navigate('PreferenceItemDetail', { itemId: item.id })}
                  >
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardMeta}>
                      {item.restaurant} · {item.type} · {item.price}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </Section>

          <Section title={`Saved Restaurants (${savedRestaurants.length})`}>
            {loading ? (
              <Loading />
            ) : savedRestaurants.length === 0 ? (
              <Empty text="No saved restaurants yet." />
            ) : (
              <FlatList
                data={savedRestaurants}
                keyExtractor={(r) => r.id}
                scrollEnabled={false}
                renderItem={({ item: r }) => (
                  <TouchableOpacity
                    style={styles.cardAlt}
                    onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: r.id })}
                  >
                    <Text style={styles.cardTitle}>{r.name}</Text>
                    <Text style={styles.cardMeta}>
                      {r.location} · {r.cuisine} · {r.averagePrice}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </Section>
        </View>
      </ScrollView>
    </SafeAreaView>
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

function Loading() {
  return (
    <View style={{ paddingVertical: 14, alignItems: 'center' }}>
      <ActivityIndicator color={THEME_COLOR} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG_COLOR },
  container: { flex: 1, backgroundColor: BG_COLOR },

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
  subtitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSubtitle: { color: '#fff', opacity: 0.95, fontSize: 15, flexShrink: 1, paddingRight: 10 },

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
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#3C1E12' },
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
    borderLeftWidth: 5,
    borderLeftColor: THEME_COLOR,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardMeta: { fontSize: 13, color: '#6B4A3F', marginTop: 4 },

  emptyBox: {
    backgroundColor: '#FFF9F3',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderColor: '#FFE8D2',
    borderWidth: 1,
  },
});
