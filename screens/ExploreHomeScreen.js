import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('relevance');

  const hasActiveFilters =
    (selectedDiet?.length || 0) +
      (selectedCuisine?.length || 0) +
      (selectedMood?.length || 0) +
      (selectedPrice?.length || 0) >
    0;

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

  // Filtered Items
  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
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
      const searchMatch =
        term.length === 0 ||
        item.name.toLowerCase().includes(term) ||
        String(item.restaurant).toLowerCase().includes(term);
      return dietMatch && cuisineMatch && moodMatch && priceMatch && searchMatch;
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
  }, [selectedDiet, selectedCuisine, selectedMood, selectedPrice, search, sortBy]);

  const filteredRestaurants = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = availableRestaurants.filter((r) => {
      const cuisineMatch =
        selectedCuisine.length === 0 ||
        selectedCuisine.some((c) => {
          const cl = String(c).toLowerCase();
          return (
            cl === String(r.cuisine).toLowerCase() ||
            r.cuisines.map((cc) => String(cc).toLowerCase()).includes(cl)
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
      const searchMatch =
        term.length === 0 ||
        r.name.toLowerCase().includes(term) ||
        String(r.location).toLowerCase().includes(term);
      return cuisineMatch && moodMatch && dietMatch && priceMatch && searchMatch;
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
  }, [selectedDiet, selectedCuisine, selectedMood, selectedPrice, search, sortBy]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: '#FF4D00' }}
      edges={['left', 'right']} // avoid top/bottom safe area padding
    >
      <View style={{ flex: 1, backgroundColor: '#FFF' }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Top Header */}
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>🍽️ Discover Food For You</Text>
            <Text style={styles.headerSubtitle}>
              Curated just for your cravings and mood
            </Text>
            <TextInput
              placeholder="Search restaurants or dishes..."
              value={search}
              onChangeText={setSearch}
              style={styles.searchBar}
              placeholderTextColor="#888"
            />
          </View>

          {/* Sort Buttons */}
          <View style={styles.sortRow}>
            {[
              { key: 'relevance', label: 'Relevance' },
              { key: 'rating_desc', label: 'Top Rated' },
              { key: 'price_asc', label: 'Cheapest' },
              { key: 'price_desc', label: 'Premium' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setSortBy(opt.key)}
                style={[
                  styles.sortTab,
                  sortBy === opt.key && styles.sortTabActive,
                ]}
              >
                <Text
                  style={[
                    styles.sortTabText,
                    sortBy === opt.key && styles.sortTabTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Edit Preferences Button */}
          <View style={styles.editContainer}>
            <TouchableOpacity
              onPress={onStartQuestionnaire}
              style={styles.editButton}
            >
              <Text style={styles.editButtonText}>🎯 Edit Preferences</Text>
            </TouchableOpacity>
          </View>

          {/* Recommended Restaurants */}
          <SectionTitle
            title="🍴 Recommended Restaurants"
            right={
              filteredRestaurants.length
                ? `${filteredRestaurants.length}`
                : undefined
            }
          />
          <FlatList
            data={filteredRestaurants}
            keyExtractor={(r) => r.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 16 }}
            renderItem={({ item: r }) => (
              <TouchableOpacity
                style={styles.restaurantCard}
                onPress={() =>
                  navigation.navigate('RestaurantDetail', { restaurant: r })
                }
              >
                <Text style={styles.restaurantName}>{r.name}</Text>
                <Text style={styles.itemTags}>
                  {r.location} • {r.cuisine}
                </Text>
                <View style={styles.badgeRow}>
                  <Badge text={`${r.rating}★`} color="#FFD580" />
                  <Badge text={r.averagePrice} />
                </View>
              </TouchableOpacity>
            )}
          />

          {/* Recommended Items */}
          <SectionTitle
            title="🥗 Recommended Dishes"
            right={
              filteredItems.length ? `${filteredItems.length}` : undefined
            }
            style={{ marginTop: 24 }}
          />
          <FlatList
            data={filteredItems}
            keyExtractor={(i) => i.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 16, paddingBottom: 24 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.itemCard}
                onPress={() =>
                  navigation.navigate('PreferenceItemDetail', { item })
                }
              >
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemTags}>{item.restaurant}</Text>
                <View style={styles.badgeRow}>
                  <Badge text={item.price} color="#FDAA48" />
                  <Badge text={item.type} color="#FFE6CC" />
                </View>
                <Text style={[styles.itemTags, { marginTop: 6 }]}>
                  Cuisine: {item.cuisine}
                </Text>
              </TouchableOpacity>
            )}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    padding: 20,
    backgroundColor: '#FF4D00', // removes top/bottom white gap
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#fff9',
    fontSize: 15,
    marginBottom: 12,
  },
  searchBar: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    fontSize: 15,
    elevation: 2,
  },
  sortRow: {
    flexDirection: 'row',
    padding: 16,
    flexWrap: 'wrap',
  },
  sortTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#FFE6CC',
    marginRight: 8,
    marginBottom: 8,
  },
  sortTabActive: {
    backgroundColor: '#FF4D00',
  },
  sortTabText: {
    color: '#333',
    fontWeight: '600',
  },
  sortTabTextActive: {
    color: '#fff',
  },
  editContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  editButton: {
    backgroundColor: '#FDAA48',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  restaurantCard: {
    backgroundColor: '#FFF8F3',
    borderRadius: 18,
    padding: 14,
    width: 260,
    marginRight: 14,
    elevation: 3,
  },
  restaurantName: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#FF4D00',
  },
  itemCard: {
    backgroundColor: '#FFF8F3',
    borderRadius: 18,
    padding: 14,
    width: 240,
    marginRight: 14,
    elevation: 3,
  },
  itemName: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#FF4D00',
  },
  itemTags: {
    color: '#666',
    fontSize: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 6,
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
      {right ? <Text style={{ color: '#6b7280' }}>{right}</Text> : null}
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
