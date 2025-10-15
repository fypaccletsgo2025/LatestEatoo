// screens/ExploreHomeScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { availableItems, availableRestaurants, mockUserInteractions } from '../data/mockData';
import { getNaiveBayesRecommendationsForUser } from '../data/naiveBayes';
import { getLikedItemIds, getSavedRestaurantIds } from '../state/libraryStore';

const PRICE_BUCKETS = {
  'RM0-RM10': (price) => price <= 10,
  'RM11-RM20': (price) => price >= 11 && price <= 20,
  'RM21-RM30': (price) => price >= 21 && price <= 30,
  'RM31+': (price) => price >= 31,
};

function normaliseString(value) {
  return String(value || '').toLowerCase().replace(/ /g, '');
}

function parsePrice(value) {
  const parsed = parseInt(String(value).replace('RM', ''), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export default function ExploreHomeScreen({ onOpenDrawer, onStartQuestionnaire, externalSelections }) {
  const navigation = useNavigation();
  const [selectedDiet, setSelectedDiet] = useState([]);
  const [selectedCuisine, setSelectedCuisine] = useState([]);
  const [selectedMood, setSelectedMood] = useState([]);
  const [selectedPrice, setSelectedPrice] = useState([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('relevance');

  const defaultUserId = useMemo(() => {
    const ids = Object.keys(mockUserInteractions || {});
    return ids.length ? ids[0] : null;
  }, []);

  const baseInteractions = useMemo(() => (
    defaultUserId ? (mockUserInteractions?.[defaultUserId] || {}) : {}
  ), [defaultUserId]);

  const restaurantByName = useMemo(() => {
    const map = new Map();
    availableRestaurants.forEach((restaurant) => {
      map.set(restaurant.name, restaurant);
    });
    return map;
  }, []);

  const itemRestaurantMap = useMemo(() => {
    const map = new Map();
    availableItems.forEach((item) => {
      const restaurant = restaurantByName.get(item.restaurant);
      if (restaurant) {
        map.set(item.id, restaurant.id);
      }
    });
    return map;
  }, [restaurantByName]);

  const buildUserInteractions = useCallback(() => {
    const base = baseInteractions || {};
    const savedIds = new Set([...(base.savedRestaurantIds || []), ...getSavedRestaurantIds()]);
    const likedItemIds = new Set([...(base.likedItemIds || []), ...getLikedItemIds()]);
    const likedRestaurantIds = new Set(base.likedRestaurantIds || []);
    const visitedRestaurantIds = new Set(base.visitedRestaurantIds || []);

    savedIds.forEach((id) => likedRestaurantIds.add(id));
    likedItemIds.forEach((itemId) => {
      const restaurantId = itemRestaurantMap.get(itemId);
      if (restaurantId) likedRestaurantIds.add(restaurantId);
    });

    return {
      likedRestaurantIds: Array.from(likedRestaurantIds),
      savedRestaurantIds: Array.from(savedIds),
      visitedRestaurantIds: Array.from(visitedRestaurantIds),
      likedItemIds: Array.from(likedItemIds),
    };
  }, [baseInteractions, itemRestaurantMap]);

  const [refreshToken, setRefreshToken] = useState(0);

  const userInteractions = useMemo(() => buildUserInteractions(), [buildUserInteractions, refreshToken]);

  const handleRefresh = useCallback(() => {
    if (!defaultUserId) return;
    setRefreshToken((token) => token + 1);
  }, [defaultUserId]);

  const naiveBayesContext = useMemo(() => {
    if (!defaultUserId) {
      return { recommendations: [], probabilityById: new Map() };
    }
    const interactionsForModel = userInteractions || baseInteractions || {};
    const results = getNaiveBayesRecommendationsForUser(defaultUserId, {
      includeScores: true,
      interactionsMap: { [defaultUserId]: interactionsForModel },
    });
    return {
      recommendations: results.map((entry) => entry.restaurant),
      probabilityById: new Map(results.map((entry) => [entry.restaurant.id, entry.probability])),
    };
  }, [defaultUserId, userInteractions, baseInteractions]);

  const probabilityById = naiveBayesContext.probabilityById;
  const canRefresh = Boolean(defaultUserId);

  const hasActiveFilters =
    (selectedDiet?.length || 0) +
    (selectedCuisine?.length || 0) +
    (selectedMood?.length || 0) +
    (selectedPrice?.length || 0) > 0;

  const clearAll = () => {
    setSelectedDiet([]);
    setSelectedCuisine([]);
    setSelectedMood([]);
    setSelectedPrice([]);
    setSearch('');
    setSortBy('relevance');
  };

  useEffect(() => {
    if (externalSelections) {
      const {
        selectedDiet: extDiet = [],
        selectedCuisine: extCuisine = [],
        selectedMood: extMood = [],
        selectedPrice: extPrice = [],
      } = externalSelections;
      setSelectedDiet(extDiet);
      setSelectedCuisine(extCuisine);
      setSelectedMood(extMood);
      setSelectedPrice(extPrice);
    }
  }, [externalSelections]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    const passesPriceBucket = (priceValue) => (
      selectedPrice.length === 0 ||
      selectedPrice.some((bucket) => {
        const fn = PRICE_BUCKETS[bucket];
        return typeof fn === 'function' ? fn(priceValue) : true;
      })
    );

    const items = availableItems.filter((item) => {
      const dietMatch = selectedDiet.length === 0 || selectedDiet.some((d) => normaliseString(d) === normaliseString(item.type));
      const cuisineMatch = selectedCuisine.length === 0 || selectedCuisine.some((c) => normaliseString(c) === normaliseString(item.cuisine));

      const restaurant = restaurantByName.get(item.restaurant);
      const ambience = restaurant?.ambience || [];
      const moodMatch = selectedMood.length === 0 || selectedMood.every((m) => ambience.map(normaliseString).includes(normaliseString(m)));

      const priceValue = parsePrice(item.price);
      const priceMatch = passesPriceBucket(priceValue);

      const searchMatch = term.length === 0 ||
        item.name.toLowerCase().includes(term) ||
        String(item.restaurant).toLowerCase().includes(term);

      return dietMatch && cuisineMatch && moodMatch && priceMatch && searchMatch;
    });

    const sorted = [...items];

    if (sortBy === 'rating_desc') {
      sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sortBy === 'price_asc') {
      sorted.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    } else if (sortBy === 'price_desc') {
      sorted.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    } else if (!hasActiveFilters && term.length === 0 && probabilityById.size) {
      sorted.sort((a, b) => {
        const restaurantA = restaurantByName.get(a.restaurant);
        const restaurantB = restaurantByName.get(b.restaurant);
        const probA = restaurantA ? probabilityById.get(restaurantA.id) : undefined;
        const probB = restaurantB ? probabilityById.get(restaurantB.id) : undefined;
        if (probA === undefined && probB === undefined) return (b.rating ?? 0) - (a.rating ?? 0);
        if (probA === undefined) return 1;
        if (probB === undefined) return -1;
        if (probB !== probA) return probB - probA;
        return (b.rating ?? 0) - (a.rating ?? 0);
      });
    }

    return sorted;
  }, [selectedDiet, selectedCuisine, selectedMood, selectedPrice, search, sortBy, hasActiveFilters, probabilityById, restaurantByName]);

  const filteredRestaurants = useMemo(() => {
    const term = search.trim().toLowerCase();

    const restaurantMatches = availableRestaurants.filter((restaurant) => {
      const cuisines = restaurant.cuisines.map(normaliseString);
      const cuisineMatch = selectedCuisine.length === 0 || selectedCuisine.some((c) => {
        const lowered = normaliseString(c);
        return lowered === normaliseString(restaurant.cuisine) || cuisines.includes(lowered);
      });

      const ambience = restaurant.ambience?.map(normaliseString) || [];
      const moodMatch = selectedMood.length === 0 || selectedMood.every((m) => ambience.includes(normaliseString(m)));

      const dietMatch = selectedDiet.length === 0 || availableItems.some((item) => (
        item.restaurant === restaurant.name &&
        selectedDiet.map(normaliseString).includes(normaliseString(item.type))
      ));

      const priceMatch = selectedPrice.length === 0 || availableItems.some((item) => {
        if (item.restaurant !== restaurant.name) return false;
        const priceValue = parsePrice(item.price);
        return selectedPrice.some((bucket) => {
          const fn = PRICE_BUCKETS[bucket];
          return typeof fn === 'function' ? fn(priceValue) : true;
        });
      }) || (restaurant.matchesPriceRange ? selectedPrice.some((bucket) => restaurant.matchesPriceRange(bucket)) : true);

      const searchMatch = term.length === 0 ||
        restaurant.name.toLowerCase().includes(term) ||
        String(restaurant.location).toLowerCase().includes(term) ||
        String(restaurant.theme).toLowerCase().includes(term);

      const hasMatchingItem = availableItems.some((item) => {
        if (item.restaurant !== restaurant.name) return false;
        const dietOk = selectedDiet.length === 0 || selectedDiet.map(normaliseString).includes(normaliseString(item.type));
        const cuisineOk = selectedCuisine.length === 0 || selectedCuisine.map(normaliseString).includes(normaliseString(item.cuisine));
        const priceValue = parsePrice(item.price);
        const priceOk = selectedPrice.length === 0 || selectedPrice.some((bucket) => {
          const fn = PRICE_BUCKETS[bucket];
          return typeof fn === 'function' ? fn(priceValue) : true;
        });
        return dietOk && cuisineOk && priceOk;
      });

      return cuisineMatch && moodMatch && dietMatch && priceMatch && hasMatchingItem && searchMatch;
    });

    if (sortBy === 'rating_desc') {
      return [...restaurantMatches].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    if (sortBy === 'price_asc') {
      return [...restaurantMatches].sort((a, b) => (a.averagePriceValue ?? 0) - (b.averagePriceValue ?? 0));
    }
    if (sortBy === 'price_desc') {
      return [...restaurantMatches].sort((a, b) => (b.averagePriceValue ?? 0) - (a.averagePriceValue ?? 0));
    }
    if (!hasActiveFilters && term.length === 0 && probabilityById.size) {
      return [...restaurantMatches].sort((a, b) => {
        const probA = probabilityById.get(a.id);
        const probB = probabilityById.get(b.id);
        if (probA === undefined && probB === undefined) return (b.rating ?? 0) - (a.rating ?? 0);
        if (probA === undefined) return 1;
        if (probB === undefined) return -1;
        if (probB !== probA) return probB - probA;
        return (b.rating ?? 0) - (a.rating ?? 0);
      });
    }

    return restaurantMatches;
  }, [selectedCuisine, selectedMood, selectedDiet, selectedPrice, search, sortBy, hasActiveFilters, probabilityById]);

  const isPersonalized = !hasActiveFilters && search.trim().length === 0 && probabilityById.size > 0;

  const removeFilter = (group, value) => {
    const lowered = normaliseString(value);
    if (group === 'diet') setSelectedDiet((prev) => prev.filter((entry) => normaliseString(entry) !== lowered));
    if (group === 'cuisine') setSelectedCuisine((prev) => prev.filter((entry) => normaliseString(entry) !== lowered));
    if (group === 'mood') setSelectedMood((prev) => prev.filter((entry) => normaliseString(entry) !== lowered));
    if (group === 'price') setSelectedPrice((prev) => prev.filter((entry) => normaliseString(entry) !== lowered));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#d1ccc7' }}>
      <ScrollView>
        <View style={{ padding: 16, paddingBottom: 112 }}>
          {/* Header */}
          <Text style={{ fontSize: 24, fontWeight: '800', marginBottom: 8 }}>Discover Food For You</Text>
          <Text style={{ color: '#6b7280', marginBottom: 12 }}>Tailored picks based on your vibe</Text>

          {/* Search bar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <TouchableOpacity onPress={onOpenDrawer} style={{ marginRight: 12 }}>
              <Text style={{ fontSize: 24 }}>☰</Text>
            </TouchableOpacity>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search restaurants or dishes"
              placeholderTextColor="#9ca3af"
              style={{
                flex: 1,
                backgroundColor: '#fff',
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#e5e7eb',
              }}
            />
          </View>

          {/* Sort tabs */}
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            {[
              { key: 'relevance', label: 'Relevance' },
              { key: 'rating_desc', label: 'Top Rated' },
              { key: 'price_asc', label: 'Price Asc' },
              { key: 'price_desc', label: 'Price Desc' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setSortBy(opt.key)}
                style={[styles.sortTab, sortBy === opt.key && styles.sortTabActive]}
              >
                <Text style={[styles.sortTabText, sortBy === opt.key && styles.sortTabTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {hasActiveFilters && (
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 4 }}>
              <TouchableOpacity onPress={clearAll}>
                <Text style={{ color: '#6B7280', fontWeight: '700' }}>Reset</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
            {selectedDiet.map((value) => (
              <FilterChip key={`diet-${value}`} label={`Type: ${value}`} onRemove={() => removeFilter('diet', value)} />
            ))}
            {selectedCuisine.map((value) => (
              <FilterChip key={`cuisine-${value}`} label={`Cuisine: ${value}`} onRemove={() => removeFilter('cuisine', value)} />
            ))}
            {selectedMood.map((value) => (
              <FilterChip key={`mood-${value}`} label={`Mood: ${value}`} onRemove={() => removeFilter('mood', value)} />
            ))}
            {selectedPrice.map((value) => (
              <FilterChip key={`price-${value}`} label={`Price: ${value}`} onRemove={() => removeFilter('price', value)} />
            ))}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <TouchableOpacity
              onPress={handleRefresh}
              disabled={!canRefresh}
              style={{
                backgroundColor: '#2563eb',
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 8,
                marginRight: 12,
                opacity: canRefresh ? 1 : 0.5,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onStartQuestionnaire} style={{ backgroundColor: '#111827', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Edit Preferences</Text>
            </TouchableOpacity>
          </View>

          {/* Restaurants */}
          <SectionTitle title="Recommended Restaurants" right={filteredRestaurants.length ? `${filteredRestaurants.length}` : undefined} />
          
          {filteredRestaurants.length === 0 ? (
            <EmptyState text="No restaurants match your preferences." ctaText="Edit Preferences" onPress={onStartQuestionnaire} />
          ) : (
            <FlatList
              data={filteredRestaurants}
              keyExtractor={(restaurant) => restaurant.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item: restaurant }) => {
                const matchPercent = isPersonalized && probabilityById.has(restaurant.id)
                  ? Math.round((probabilityById.get(restaurant.id) || 0) * 100)
                  : null;
                return (
                  <TouchableOpacity
                    style={styles.restaurantCard}
                    onPress={() => navigation.navigate('RestaurantDetail', { restaurant })}
                  >
                    <Text style={styles.restaurantName}>{restaurant.name}</Text>
                    <Text style={styles.itemTags}>{`${restaurant.location} - ${restaurant.cuisine}`}</Text>
                    <View style={{ flexDirection: 'row', marginTop: 6 }}>
                      <Badge text={`${restaurant.rating} rating`} color="#fde68a" />
                      <Badge text={restaurant.averagePrice} />
                      {matchPercent !== null ? (
                        <Badge text={`${matchPercent}% match`} color="#bbf7d0" />
                      ) : null}
                    </View>
                    <Text style={[styles.itemTags, { marginTop: 6 }]} numberOfLines={2}>Theme: {restaurant.theme}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {/* Items */}
          <SectionTitle title="Recommended Items" right={filteredItems.length ? `${filteredItems.length}` : undefined} style={{ marginTop: 12 }} />
          {filteredItems.length === 0 ? (
            <EmptyState text="No items match your preferences." ctaText="Edit Preferences" onPress={onStartQuestionnaire} />
          ) : (
            <FlatList
              data={filteredItems}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => {
                const parentRestaurant = restaurantByName.get(item.restaurant);
                const matchPercent = isPersonalized && parentRestaurant && probabilityById.has(parentRestaurant.id)
                  ? Math.round((probabilityById.get(parentRestaurant.id) || 0) * 100)
                  : null;
                return (
                  <TouchableOpacity
                    style={styles.itemCard}
                    onPress={() => navigation.navigate('PreferenceItemDetail', { item })}
                  >
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemTags}>{item.restaurant}</Text>
                    <View style={{ flexDirection: 'row', marginTop: 6 }}>
                      <Badge text={item.price} />
                      <Badge text={item.type} color="#e0e7ff" />
                      {matchPercent !== null ? (
                        <Badge text={`${matchPercent}% match`} color="#bbf7d0" />
                      ) : null}
                    </View>
                    <Text style={[styles.itemTags, { marginTop: 6 }]}>Cuisine: {item.cuisine}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlayCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  sortTab: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: '#ccc', marginRight: 8 },
  sortTabActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  sortTabText: { color: '#333' },
  sortTabTextActive: { color: '#fff' },
  restaurantCard: { padding: 12, borderRadius: 16, marginBottom: 8, backgroundColor: '#fff', width: 280, marginRight: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  restaurantName: { fontWeight: 'bold', fontSize: 18, marginBottom: 4 },
  itemCard: { padding: 12, borderRadius: 16, width: 260, marginRight: 12, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  itemName: { fontWeight: 'bold', fontSize: 18, marginBottom: 4 },
  itemTags: { color: '#555', fontSize: 14 },
});

function FilterChip({ label, onRemove }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#eee', marginRight: 8, marginBottom: 8 }}>
      <Text style={{ color: '#333' }}>{label}</Text>
      {onRemove ? (
        <TouchableOpacity onPress={onRemove} style={{ marginLeft: 6 }}>
          <Text style={{ fontWeight: 'bold' }}>x</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function SectionTitle({ title, right, style }) {
  return (
    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }, style]}>
      <Text style={{ fontSize: 20, fontWeight: '800' }}>{title}</Text>
      {right ? <Text style={{ color: '#6b7280' }}>{right}</Text> : null}
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

function EmptyState({ text, ctaText, onPress }) {
  return (
    <View style={{ backgroundColor: '#f3f4f6', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 8 }}>
      <Text style={{ color: '#6b7280', marginBottom: 8 }}>{text}</Text>
      {ctaText ? (
        <TouchableOpacity onPress={onPress} style={{ backgroundColor: '#111827', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{ctaText}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
