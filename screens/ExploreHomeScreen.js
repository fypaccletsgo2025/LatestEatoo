import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { availableItems, availableRestaurants } from '../data/mockData';

export default function ExploreHomeScreen({
  onOpenDrawer,
  onStartQuestionnaire,
  externalSelections,
}) {
  const navigation = useNavigation();
  const [selectedDiet, setSelectedDiet] = useState([]);
  const [selectedCuisine, setSelectedCuisine] = useState([]);
  const [selectedMood, setSelectedMood] = useState([]);
  const [selectedPrice, setSelectedPrice] = useState([]);
  const [sortBy, setSortBy] = useState('relevance');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (externalSelections) {
      const {
        selectedDiet = [],
        selectedCuisine = [],
        selectedMood = [],
        selectedPrice = [],
      } = externalSelections;
      setSelectedDiet(selectedDiet);
      setSelectedCuisine(selectedCuisine);
      setSelectedMood(selectedMood);
      setSelectedPrice(selectedPrice);
    }
  }, [externalSelections]);

  const handleSearchChange = (text) => {
    setSearch(text);
  };

  const handleSubmitSearch = () => {
    setSearch((prev) => prev.trim());
  };

  const handleClearSearch = () => {
    setSearch('');
  };

  const suggestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];

    const itemMatches = availableItems
      .filter((item) => {
        const nameMatch = String(item.name).toLowerCase().includes(term);
        const restaurantMatch = String(item.restaurant).toLowerCase().includes(term);
        const cuisineMatch = String(item.cuisine).toLowerCase().includes(term);
        return nameMatch || restaurantMatch || cuisineMatch;
      })
      .slice(0, 5)
      .map((item) => ({
        id: `item-${item.id}`,
        label: item.name,
        subtitle: `${item.restaurant} - ${item.price}`,
        kind: 'item',
        payload: item,
      }));

    const restaurantMatches = availableRestaurants
      .filter((restaurant) => {
        const nameMatch = String(restaurant.name).toLowerCase().includes(term);
        const cuisineMatch = String(restaurant.cuisine).toLowerCase().includes(term);
        const locationMatch = String(restaurant.location).toLowerCase().includes(term);
        const extraCuisineMatch = (restaurant.cuisines || [])
          .map((c) => String(c).toLowerCase())
          .some((c) => c.includes(term));
        return nameMatch || cuisineMatch || locationMatch || extraCuisineMatch;
      })
      .slice(0, 5)
      .map((restaurant) => ({
        id: `restaurant-${restaurant.id}`,
        label: restaurant.name,
        subtitle: `${restaurant.location} - ${restaurant.cuisine}`,
        kind: 'restaurant',
        payload: restaurant,
      }));

    return [...itemMatches, ...restaurantMatches].slice(0, 8);
  }, [search]);

  const handleSelectSuggestion = (suggestion) => {
    if (suggestion.kind === 'item') {
      navigation.navigate('PreferenceItemDetail', { item: suggestion.payload });
    } else if (suggestion.kind === 'restaurant') {
      navigation.navigate('RestaurantDetail', { restaurant: suggestion.payload });
    }
    setSearch('');
  };

  // filters unchanged
  const filteredItems = useMemo(() => {
    const items = availableItems.filter((item) => {
      const dietMatch =
        selectedDiet.length === 0 ||
        selectedDiet.some(
          (d) => d.toLowerCase() === String(item.type).toLowerCase()
        );
      const cuisineMatch =
        selectedCuisine.length === 0 ||
        selectedCuisine.some(
          (c) => c.toLowerCase() === String(item.cuisine).toLowerCase()
        );
      const r = availableRestaurants.find((rr) => rr.name === item.restaurant);
      const ambience = (r?.ambience || []).map((x) =>
        String(x).toLowerCase().replace(/ /g, '')
      );
      const moodMatch =
        selectedMood.length === 0 ||
        selectedMood.every((m) =>
          ambience.includes(String(m).toLowerCase().replace(/ /g, ''))
        );
      const priceMatch =
        selectedPrice.length === 0 ||
        selectedPrice.some((range) => {
          const price = parseInt(String(item.price).replace('RM', ''));
          switch (range) {
            case 'RM0-RM10':
              return price <= 10;
            case 'RM11-RM20':
              return price >= 11 && price <= 20;
            case 'RM21-RM30':
              return price >= 21 && price <= 30;
            case 'RM31+':
              return price >= 31;
            default:
              return true;
          }
        });
      return dietMatch && cuisineMatch && moodMatch && priceMatch;
    });

    const sorted = [...items];
    if (sortBy === 'rating_desc')
      sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    else if (sortBy === 'price_asc')
      sorted.sort(
        (a, b) =>
          parseInt(String(a.price).replace('RM', '')) -
          parseInt(String(b.price).replace('RM', ''))
      );
    else if (sortBy === 'price_desc')
      sorted.sort(
        (a, b) =>
          parseInt(String(b.price).replace('RM', '')) -
          parseInt(String(a.price).replace('RM', ''))
      );
    return sorted;
  }, [selectedDiet, selectedCuisine, selectedMood, selectedPrice, sortBy]);

  const filteredRestaurants = useMemo(() => {
    let list = availableRestaurants.filter((r) => {
      const cuisineMatch =
        selectedCuisine.length === 0 ||
        selectedCuisine.some((c) => {
          const cl = String(c).toLowerCase();
          return (
            cl === String(r.cuisine).toLowerCase() ||
            r.cuisines.map((cc) => String(cc).toLowerCase()).includes(cl
            )
          );
        });
      const moodMatch =
        selectedMood.length === 0 ||
        selectedMood.every((m) =>
          r.ambience
            .map((mm) => String(mm).toLowerCase().replace(/ /g, ''))
            .includes(String(m).toLowerCase().replace(/ /g, ''))
        );
      const dietMatch =
        selectedDiet.length === 0 ||
        availableItems.some(
          (i) =>
            i.restaurant === r.name &&
            selectedDiet
              .map((d) => String(d).toLowerCase())
              .includes(String(i.type).toLowerCase())
        );
      const priceMatch =
        selectedPrice.length === 0
          ? true
          : availableItems.some((i) => {
              if (i.restaurant !== r.name) return false;
              const p = parseInt(String(i.price).replace('RM', ''));
              return selectedPrice.some((range) => {
                switch (range) {
                  case 'RM0-RM10':
                    return p <= 10;
                  case 'RM11-RM20':
                    return p >= 11 && p <= 20;
                  case 'RM21-RM30':
                    return p >= 21 && p <= 30;
                  case 'RM31+':
                    return p >= 31;
                  default:
                    return true;
                }
              });
            });
      return cuisineMatch && moodMatch && dietMatch && priceMatch;
    });

    if (sortBy === 'rating_desc')
      list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    else if (sortBy === 'price_asc')
      list = [...list].sort(
        (a, b) => (a.averagePriceValue ?? 0) - (b.averagePriceValue ?? 0)
      );
    else if (sortBy === 'price_desc')
      list = [...list].sort(
        (a, b) => (b.averagePriceValue ?? 0) - (a.averagePriceValue ?? 0)
      );
    return list;
  }, [selectedDiet, selectedCuisine, selectedMood, selectedPrice, sortBy]);

  // Top 4 + "Show all" CTA card as the last item (only if there are more than 4)
  const topRestaurants = useMemo(() => filteredRestaurants.slice(0, 4), [filteredRestaurants]);
  const restaurantsWithCTA = useMemo(() => {
    if (filteredRestaurants.length > 4) {
      return [...topRestaurants, { id: '__show_all_restaurants__', _cta: true }];
    }
    return topRestaurants;
  }, [topRestaurants, filteredRestaurants.length]);

  const topItems = useMemo(() => filteredItems.slice(0, 4), [filteredItems]);
  const itemsWithCTA = useMemo(() => {
    if (filteredItems.length > 4) {
      return [...topItems, { id: '__show_all_items__', _cta: true }];
    }
    return topItems;
  }, [topItems, filteredItems.length]);

  const handleShowAllRestaurants = () => {
    if (filteredRestaurants.length) {
      navigation.navigate('AllRestaurants', { restaurants: filteredRestaurants });
    }
  };

  const handleShowAllDishes = () => {
    if (filteredItems.length) {
      navigation.navigate('AllDishes', { items: filteredItems });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF5ED', paddingTop: 0 }}>
      <StatusBar backgroundColor="#FF4D00" barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Discover Food For You</Text>

          {/* Tagline + Edit icon beside it */}
          <View style={styles.subtitleRow}>
            <Text style={styles.headerSubtitle}>Your taste, your vibe, your pick</Text>
            <TouchableOpacity onPress={onStartQuestionnaire} style={styles.editIconHeader}>
              <Icon name="sliders" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Search bar styled like the screenshot */}
          <View style={styles.searchField}>
            <TextInput
              placeholder="Search..."
              value={search}
              onChangeText={handleSearchChange}
              style={styles.searchInput}
              placeholderTextColor="#9a9a9a"
              returnKeyType="search"
              onSubmitEditing={handleSubmitSearch}
            />
            <View style={styles.searchDivider} />
            <TouchableOpacity
              onPress={handleSubmitSearch}
              style={styles.searchIconButton}
              accessibilityRole="button"
              accessibilityLabel="Search"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Icon name="search" size={18} color="#8f8f8f" />
            </TouchableOpacity>
            {search.trim().length > 0 ? (
              <TouchableOpacity
                onPress={handleClearSearch}
                style={styles.clearIconButton}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Icon name="x" size={16} color="#8f8f8f" />
              </TouchableOpacity>
            ) : null}
          </View>

          {search.trim().length > 0 ? (
            <View style={styles.suggestionsDropdown}>
              {suggestions.length > 0 ? (
                suggestions.map((sugg, index) => (
                  <TouchableOpacity
                    key={sugg.id}
                    style={[
                      styles.suggestionItem,
                      index === suggestions.length - 1 && styles.suggestionItemLast,
                    ]}
                    onPress={() => handleSelectSuggestion(sugg)}
                  >
                    <Text style={styles.suggestionLabel}>{sugg.label}</Text>
                    <Text style={styles.suggestionMeta}>{sugg.subtitle}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.suggestionsEmpty}>
                  <Text style={styles.suggestionsEmptyText}>No matches found</Text>
                </View>
              )}
            </View>
          ) : null}
        </View>

        {/* Sort Section */}
        <View style={styles.sortRow}>
          {[
            { key: 'relevance', label: 'For You' },
            { key: 'rating_desc', label: 'Best Rated' },
            { key: 'price_asc', label: 'Affordable' },
            { key: 'price_desc', label: 'Fancy' },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setSortBy(opt.key)}
              style={[styles.sortTab, sortBy === opt.key && styles.sortTabActive]}
            >
              <Text
                style={[styles.sortTabText, sortBy === opt.key && styles.sortTabTextActive]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.divider} />

        {/* Restaurants */}
        <SectionTitle title="Recommended Restaurants" />
        <FlatList
          data={restaurantsWithCTA}
          keyExtractor={(r) => r.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: 16 }}
          renderItem={({ item: r }) =>
            r._cta ? (
              <TouchableOpacity
                style={[styles.showAllCard, styles.showAllCardRestaurant]}
                onPress={handleShowAllRestaurants}
              >
                <Text style={styles.showAllCardText}>
                  Show all ({filteredRestaurants.length})
                </Text>
                <Icon name="chevron-right" size={18} color="#FF4D00" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.restaurantCard}
                onPress={() => navigation.navigate('RestaurantDetail', { restaurant: r })}
              >
                <Text style={styles.restaurantName}>{r.name}</Text>
                <Text style={styles.itemTags}>{r.location} - {r.cuisine}</Text>
                <View style={styles.badgeRow}>
                  <Badge text={`Rating ${r.rating ?? '-'}`} color="#FFD89E" />
                  <Badge text={r.averagePrice} />
                </View>
              </TouchableOpacity>
            )
          }
        />
        <View style={styles.divider} />

        {/* Dishes */}
        <SectionTitle title="Recommended Dishes" style={{ marginTop: 24 }} />
        <FlatList
          data={itemsWithCTA}
          keyExtractor={(i) => i.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: 16, paddingBottom: 24 }}
          renderItem={({ item }) =>
            item._cta ? (
              <TouchableOpacity
                style={[styles.showAllCard, styles.showAllCardItem]}
                onPress={handleShowAllDishes}
              >
                <Text style={styles.showAllCardText}>
                  Show all ({filteredItems.length})
                </Text>
                <Icon name="chevron-right" size={18} color="#FF4D00" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.itemCard}
                onPress={() => navigation.navigate('PreferenceItemDetail', { item })}
              >
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemTags}>{item.restaurant}</Text>
                <View style={styles.badgeRow}>
                  <Badge text={item.price} color="#FFA94D" />
                  <Badge text={item.type} color="#FFF0E0" />
                </View>
                <Text style={[styles.itemTags, { marginTop: 6 }]}>
                  Cuisine: {item.cuisine}
                </Text>
              </TouchableOpacity>
            )
          }
        />
        <View style={[styles.divider, { marginBottom: 24 }]} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    padding: 22,
    backgroundColor: '#FF4D00',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },

  /* tagline + edit icon */
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerSubtitle: {
    color: '#fff',
    opacity: 0.95,
    fontSize: 15,
    flexShrink: 1,
    paddingRight: 10,
  },
  editIconHeader: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  /* search like screenshot: white box, right divider, search icon */
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d8d4d4',
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 6,
  },
  searchDivider: {
    height: '70%',
    width: 1,
    backgroundColor: '#d8d4d4',
    marginHorizontal: 8,
  },
  searchIconButton: {
    padding: 6,
    borderRadius: 12,
  },
  clearIconButton: {
    padding: 6,
    borderRadius: 12,
    marginLeft: 4,
  },
  suggestionsDropdown: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE8D2',
    shadowColor: '#FF4D00',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#FFE8D2',
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3C1E12',
  },
  suggestionMeta: {
    marginTop: 2,
    color: '#6B4A3F',
    fontSize: 12,
  },
  suggestionsEmpty: {
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  suggestionsEmptyText: {
    color: '#6B4A3F',
    fontSize: 13,
  },

  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
  },
  sortTab: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#ffe3c6ff',
    marginRight: 8,
  },
  sortTabActive: { backgroundColor: '#FF4D00' },
  sortTabText: { color: '#333', fontWeight: '600', fontSize: 13 },
  sortTabTextActive: { color: '#fff' },

  restaurantCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 14,
    width: 260,
    marginRight: 14,
    elevation: 3,
    borderColor: '#FFE8D2',
    borderWidth: 1,
  },
  restaurantName: { fontWeight: 'bold', fontSize: 18, color: '#000' },

  itemCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 14,
    width: 240,
    marginRight: 14,
    elevation: 3,
    borderColor: '#FFE8D2',
    borderWidth: 1,
  },
  itemName: { fontWeight: 'bold', fontSize: 18, color: '#000' },
  itemTags: { color: '#666', fontSize: 14 },
  badgeRow: { flexDirection: 'row', marginTop: 6 },

  /* "Show all" CTA cards */
  showAllCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 10,
    marginRight: 14,
    elevation: 3,
    borderColor: '#FF4D00',
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    flexDirection: 'row',
  },
  showAllCardRestaurant: { width: 130 },
  showAllCardItem: { width: 120 },
  showAllCardText: {
    color: '#FF4D00',
    fontWeight: '700',
  },

  divider: {
    height: 1,
    backgroundColor: '#FFC299',
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 2,
  },
});

function SectionTitle({ title, right, style }) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginHorizontal: 16,
          marginVertical: 12,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 20, fontWeight: '800', color: '#FF4D00' }}>
        {title}
      </Text>
      {/* right is no longer used for "Show all" here, but kept for flexibility */}
      {typeof right === 'string' || typeof right === 'number' ? (
        <Text style={{ color: '#6b7280' }}>{right}</Text>
      ) : (
        right || null
      )}
    </View>
  );
}

function Badge({ text, color = '#e5e7eb' }) {
  return (
    <View
      style={{
        backgroundColor: color,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 8,
      }}
    >
      <Text style={{ fontSize: 12, color: '#111827' }}>{text}</Text>
    </View>
  );
}
