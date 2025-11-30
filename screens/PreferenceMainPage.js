// screens/PreferenceMainPage.js
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { useCatalogData } from '../hooks/useCatalogData';
import PreferenceQuestionnaireSheet from '../components/PreferenceQuestionnaireSheet';
import {
  arePreferenceSelectionsEqual,
  replacePreferenceSelections,
  resetPreferenceSelections,
  updatePreferenceSelections,
  usePreferenceSelections,
} from '../state/preferenceSelectionsStore';

const normalizeValue = (v) => String(v ?? '').trim().toLowerCase();
const normalizeNoSpaces = (v) => normalizeValue(v).replace(/ /g, '');

const parsePriceValue = (value) => {
  const numeric = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
};

const matchesPriceRange = (priceValue, range) => {
  if (priceValue == null) return false;
  const text = String(range || '').toUpperCase();
  if (text === 'RM0-RM10') return priceValue <= 10;
  if (text === 'RM11-RM20') return priceValue >= 11 && priceValue <= 20;
  if (text === 'RM21-RM30') return priceValue >= 21 && priceValue <= 30;
  if (text === 'RM31+') return priceValue >= 31;
  const nums = String(range || '').match(/(\d+(\.\d+)?)/g)?.map((n) => Number(n)) || [];
  if (!nums.length) return true;
  const min = nums[0];
  const max = nums[1] ?? Number.POSITIVE_INFINITY;
  return priceValue >= min && priceValue <= max;
};

export default function PreferenceMainPage({ route, navigation, externalSelections }) {
  const {
    restaurants: availableRestaurants,
    items: availableItems,
    loading: catalogLoading,
    error: catalogError,
  } = useCatalogData();
  const selections = usePreferenceSelections();
  const selectedDiet = selections.selectedDiet;
  const selectedCuisine = selections.selectedCuisine;
  const selectedMood = selections.selectedMood;
  const selectedPrice = selections.selectedPrice;
  const safeItems = Array.isArray(availableItems) ? availableItems : [];
  const safeRestaurants = Array.isArray(availableRestaurants) ? availableRestaurants : [];

  const restaurantIndex = useMemo(() => {
    const byId = new Map();
    const byName = new Map();
    safeRestaurants.forEach((r) => {
      const id = normalizeValue(r.id || r.$id);
      const name = normalizeValue(r.name);
      if (id) byId.set(id, r);
      if (name) byName.set(name, r);
    });
    return { byId, byName };
  }, [safeRestaurants]);

  const resolveRestaurantForItem = useCallback(
    (item) => {
      const rid = normalizeValue(
        item.restaurantId || item.restaurant_id || item.restaurant?.id || item.restaurant?.$id,
      );
      if (rid && restaurantIndex.byId.has(rid)) return restaurantIndex.byId.get(rid);
      const name = normalizeValue(item.restaurant || item.restaurantName);
      if (name && restaurantIndex.byName.has(name)) return restaurantIndex.byName.get(name);
      return null;
    },
    [restaurantIndex],
  );

  const incomingParams = route?.params;

  React.useEffect(() => {
    const source = externalSelections || incomingParams;
    if (source && !arePreferenceSelectionsEqual(source, selections)) {
      replacePreferenceSelections(source);
    }
  }, [externalSelections, incomingParams, selections]);

  // UX helpers
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('relevance'); // relevance | rating_desc | price_asc | price_desc
  const [showPQ, setShowPQ] = useState(false);

  // -------- Filtering + sorting --------
  const filteredItems = useMemo(() => {
    const term = normalizeValue(search);

    const items = safeItems.filter((item) => {
      const dietMatch =
        selectedDiet.length === 0 ||
        selectedDiet.some((d) => normalizeValue(d) === normalizeValue(item.type));

      const cuisineMatch =
        selectedCuisine.length === 0 ||
        selectedCuisine.some((c) => normalizeValue(c) === normalizeValue(item.cuisine));

      const resolvedRestaurant = resolveRestaurantForItem(item);
      const ambience = (resolvedRestaurant?.ambience || []).map((x) => normalizeNoSpaces(x));
      const moodMatch =
        selectedMood.length === 0 ||
        selectedMood.every((m) => ambience.includes(normalizeNoSpaces(m)));

      const priceValue = parsePriceValue(item.price);
      const priceMatch =
        selectedPrice.length === 0 ||
        selectedPrice.some((range) => matchesPriceRange(priceValue, range));

      const searchMatch =
        term.length === 0 ||
        normalizeValue(item.name).includes(term) ||
        normalizeValue(item.restaurant).includes(term);

      return dietMatch && cuisineMatch && moodMatch && priceMatch && searchMatch;
    });

    const sorted = [...items];
    if (sortBy === 'rating_desc') {
      sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sortBy === 'price_asc') {
      sorted.sort(
        (a, b) => (parsePriceValue(a.price) ?? Number.POSITIVE_INFINITY) - (parsePriceValue(b.price) ?? Number.POSITIVE_INFINITY),
      );
    } else if (sortBy === 'price_desc') {
      sorted.sort(
        (a, b) => (parsePriceValue(b.price) ?? 0) - (parsePriceValue(a.price) ?? 0),
      );
    }
    return sorted;
  }, [
    selectedDiet,
    selectedCuisine,
    selectedMood,
    selectedPrice,
    search,
    sortBy,
    safeItems,
    resolveRestaurantForItem,
  ]);

  const filteredRestaurants = useMemo(() => {
    const term = normalizeValue(search);
    let list = safeRestaurants.filter((r) => {
      const rId = normalizeValue(r.id || r.$id);
      const cuisineMatch =
        selectedCuisine.length === 0 ||
        selectedCuisine.some((c) => {
          const cl = normalizeValue(c);
          return (
            cl === normalizeValue(r.cuisine) ||
            (Array.isArray(r.cuisines) && r.cuisines.map(normalizeValue).includes(cl))
          );
        });

      const moodMatch =
        selectedMood.length === 0 ||
        selectedMood.every((m) =>
          (r.ambience || []).map(normalizeNoSpaces).includes(normalizeNoSpaces(m)),
        );

      const dietMatch =
        selectedDiet.length === 0 ||
        safeItems.some(
          (i) =>
            normalizeValue(resolveRestaurantForItem(i)?.id || resolveRestaurantForItem(i)?.$id) === rId &&
            selectedDiet.map(normalizeValue).includes(normalizeValue(i.type)),
        );

      const itemPriceMatch =
        selectedPrice.length === 0 ||
        safeItems.some((i) => {
          const itemRest = resolveRestaurantForItem(i);
          if (!itemRest || normalizeValue(itemRest.id || itemRest.$id) !== rId) return false;
          const p = parsePriceValue(i.price);
          return selectedPrice.some((range) => matchesPriceRange(p, range));
        });
      const priceMatch =
        selectedPrice.length === 0
          ? true
          : itemPriceMatch ||
            (typeof r.averagePriceValue === 'number'
              ? selectedPrice.some((range) => matchesPriceRange(r.averagePriceValue, range))
              : true);

      const hasMatchingItem = safeItems.some((i) => {
        const itemRest = resolveRestaurantForItem(i);
        if (!itemRest || normalizeValue(itemRest.id || itemRest.$id) !== rId) return false;
        const dietOk =
          selectedDiet.length === 0 ||
          selectedDiet.map(normalizeValue).includes(normalizeValue(i.type));
        const cuisineOk =
          selectedCuisine.length === 0 ||
          selectedCuisine.map(normalizeValue).includes(normalizeValue(i.cuisine));
        const priceOk =
          selectedPrice.length === 0 ||
          selectedPrice.some((range) => matchesPriceRange(parsePriceValue(i.price), range));
        return dietOk && cuisineOk && priceOk;
      });

      const searchMatch =
        term.length === 0 ||
        normalizeValue(r.name).includes(term) ||
        normalizeValue(r.location).includes(term) ||
        normalizeValue(r.theme).includes(term);

      return cuisineMatch && moodMatch && dietMatch && priceMatch && hasMatchingItem && searchMatch;
    });

    if (sortBy === 'rating_desc') list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    else if (sortBy === 'price_asc')
      list = [...list].sort((a, b) => (a.averagePriceValue ?? 0) - (b.averagePriceValue ?? 0));
    else if (sortBy === 'price_desc')
      list = [...list].sort((a, b) => (b.averagePriceValue ?? 0) - (a.averagePriceValue ?? 0));
    return list;
  }, [
    selectedDiet,
    selectedCuisine,
    selectedMood,
    selectedPrice,
    search,
    sortBy,
    safeItems,
    safeRestaurants,
    resolveRestaurantForItem,
  ]);

  // Remove a single filter token
  const removeFilter = (group, value) => {
    const lower = String(value).toLowerCase();
    if (group === 'diet') {
      updatePreferenceSelections((draft) => {
        draft.selectedDiet = draft.selectedDiet.filter(v => String(v).toLowerCase() !== lower);
      });
    }
    if (group === 'cuisine') {
      updatePreferenceSelections((draft) => {
        draft.selectedCuisine = draft.selectedCuisine.filter(v => String(v).toLowerCase() !== lower);
      });
    }
    if (group === 'mood') {
      updatePreferenceSelections((draft) => {
        draft.selectedMood = draft.selectedMood.filter(v => String(v).toLowerCase() !== lower);
      });
    }
    if (group === 'price') {
      updatePreferenceSelections((draft) => {
        draft.selectedPrice = draft.selectedPrice.filter(v => String(v).toLowerCase() !== lower);
      });
    }
  };

  const clearAll = () => {
    resetPreferenceSelections();
    setSearch('');
    setSortBy('relevance');
  };

  // -------- Render --------
  if (catalogLoading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color="#FF4D00" size="small" />
        <Text style={{ marginTop: 12, fontWeight: '700', color: '#3C1E12' }}>
          Loading recommendations...
        </Text>
      </View>
    );
  }

  if (catalogError) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: '#B91C1C', fontWeight: '700' }}>{catalogError}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Recommendations</Text>

      {/* Controls: search + sort */}
      <View style={styles.controlsRow}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or restaurant"
          style={styles.searchInput}
        />
        <View style={styles.sortTabs}>
          {[
            { key: 'relevance', label: 'Relevance' },
            { key: 'rating_desc', label: 'Top Rated' },
            { key: 'price_asc', label: 'Price Asc' },
            { key: 'price_desc', label: 'Price Desc' },
          ].map(opt => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setSortBy(opt.key)}
              style={[styles.sortTab, sortBy === opt.key && styles.sortTabActive]}
            >
              <Text style={[styles.sortTabText, sortBy === opt.key && styles.sortTabTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Active filter chips */}
      {(selectedDiet.length + selectedCuisine.length + selectedMood.length + selectedPrice.length) > 0 && (
        <View style={styles.filtersBar}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={clearAll}>
            <Text style={styles.resetLink}>Reset</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.chipsWrap}>
        {selectedDiet.map(v => (
          <FilterChip key={`diet-${v}`} label={`Type: ${v}`} onRemove={() => removeFilter('diet', v)} />
        ))}
        {selectedCuisine.map(v => (
          <FilterChip key={`cuisine-${v}`} label={`Cuisine: ${v}`} onRemove={() => removeFilter('cuisine', v)} />
        ))}
        {selectedMood.map(v => (
          <FilterChip key={`mood-${v}`} label={`Mood: ${v}`} onRemove={() => removeFilter('mood', v)} />
        ))}
        {selectedPrice.map(v => (
          <FilterChip key={`price-${v}`} label={`Price: ${v}`} onRemove={() => removeFilter('price', v)} />
        ))}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={clearAll}>
          <Text style={styles.secondaryBtnText}>Clear All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => setShowPQ(true)}
        >
          <Text style={styles.primaryBtnText}>Edit Preferences</Text>
        </TouchableOpacity>
      </View>

      {/* Restaurants section */}
      <Text style={styles.subheading}>Recommended Restaurants</Text>
      {filteredRestaurants.length === 0 ? (
        <Text style={styles.noItemText}>No restaurants match your preferences.</Text>
      ) : (
        <FlatList
          data={filteredRestaurants}
          keyExtractor={r => r.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item: r }) => (
            <TouchableOpacity
              style={styles.restaurantCard}
              onPress={() => navigation.navigate('RestaurantDetail', { restaurant: r })}
            >
              <Text style={styles.restaurantName}>{r.name}</Text>
              <Text style={styles.itemTags}>{r.location} - {r.cuisine} - {r.averagePrice}</Text>
              <Text style={styles.itemTags}>Rating: {r.rating}</Text>
              <Text style={styles.itemTags}>Theme: {r.theme}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Items section */}
      <Text style={[styles.subheading, { marginTop: 12 }]}>Recommended Items</Text>
      {filteredItems.length === 0 ? (
        <Text style={styles.noItemText}>No items match your preferences.</Text>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.itemContainer}
              onPress={() => navigation.navigate('PreferenceItemDetail', { item })}
            >
              <Text style={styles.itemName}>{item.name}</Text>
              <Text>{item.restaurant} - {item.price}</Text>
              <Text style={styles.itemTags}>Cuisine: {item.cuisine}, Type: {item.type}</Text>
            </TouchableOpacity>
          )}
        />
      )}
      {/* Right-side filter sheet */}
      <PreferenceQuestionnaireSheet
        open={showPQ}
        onClose={() => setShowPQ(false)}
        initialSelections={{ selectedDiet, selectedCuisine, selectedMood, selectedPrice }}
        onApply={(sel) => {
          replacePreferenceSelections(sel);
          setShowPQ(false);
        }}
      />
      </View>
  );
}

// Small removable chip component
function FilterChip({ label, onRemove }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
      <TouchableOpacity onPress={onRemove} style={styles.chipRemoveBtn}>
        <Text style={styles.chipRemoveText}>x</Text>
      </TouchableOpacity>
    </View>
  );
}

// -------- Styles --------
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#d1ccc7' },
  heading: { fontSize: 22, fontWeight: '800', marginBottom: 16 },
  subheading: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  noItemText: { fontSize: 16, color: '#888' },
  controlsRow: { marginBottom: 8 },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  sortTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  sortTab: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
  },
  sortTabActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  sortTabText: { color: '#333' },
  sortTabTextActive: { color: '#fff' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  filtersBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 4 },
  resetLink: { color: '#6B7280', fontWeight: '700' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#eee',
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { color: '#333' },
  chipRemoveBtn: { marginLeft: 6 },
  chipRemoveText: { fontWeight: 'bold' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  primaryBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: 'bold' },
  secondaryBtn: {
    backgroundColor: '#eee',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  secondaryBtnText: { color: '#333', fontWeight: 'bold' },
  itemContainer: {
    padding: 12,
    marginBottom: 6,
    borderRadius: 16,
    width: 260,
    marginRight: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  itemName: { fontWeight: 'bold', fontSize: 18, marginBottom: 4 },
  itemTags: { color: '#555', fontSize: 14 },
  restaurantCard: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    width: 280,
    marginRight: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  restaurantName: { fontWeight: 'bold', fontSize: 18, marginBottom: 4 },
});
