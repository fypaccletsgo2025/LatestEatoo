// screens/PreferenceMainPage.js
import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { availableItems, availableRestaurants } from '../data/mockData';
import PreferenceQuestionnaireSheet from '../components/PreferenceQuestionnaireSheet';
import {
  arePreferenceSelectionsEqual,
  replacePreferenceSelections,
  resetPreferenceSelections,
  updatePreferenceSelections,
  usePreferenceSelections,
} from '../state/preferenceSelectionsStore';

export default function PreferenceMainPage({ route, navigation, externalSelections }) {
  const selections = usePreferenceSelections();
  const selectedDiet = selections.selectedDiet;
  const selectedCuisine = selections.selectedCuisine;
  const selectedMood = selections.selectedMood;
  const selectedPrice = selections.selectedPrice;

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
    const term = search.trim().toLowerCase();
    const items = availableItems.filter(item => {
      const dietMatch =
        selectedDiet.length === 0 ||
        selectedDiet.some(d => d.toLowerCase() === String(item.type).toLowerCase());

      const cuisineMatch =
        selectedCuisine.length === 0 ||
        selectedCuisine.some(c => c.toLowerCase() === String(item.cuisine).toLowerCase());

      // Match mood/ambience via the restaurant, not item
      const r = availableRestaurants.find(rr => rr.name === item.restaurant);
      const ambience = (r?.ambience || []).map(x => String(x).toLowerCase().replace(/ /g, ''));
      const moodMatch = selectedMood.length === 0 || selectedMood.every(m => ambience.includes(String(m).toLowerCase().replace(/ /g, '')));

      const priceMatch =
        selectedPrice.length === 0 ||
        selectedPrice.some(range => {
          const price = parseInt(String(item.price).replace('RM', ''));
          switch (range) {
            case 'RM0-RM10': return price <= 10;
            case 'RM11-RM20': return price >= 11 && price <= 20;
            case 'RM21-RM30': return price >= 21 && price <= 30;
            case 'RM31+': return price >= 31;
            default: return true;
          }
        });

      const searchMatch =
        term.length === 0 ||
        item.name.toLowerCase().includes(term) ||
        String(item.restaurant).toLowerCase().includes(term);

      return dietMatch && cuisineMatch && moodMatch && priceMatch && searchMatch;
    });

    // Sorting
    const sorted = [...items];
    if (sortBy === 'rating_desc') {
      sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sortBy === 'price_asc') {
      sorted.sort((a, b) => parseInt(String(a.price).replace('RM', '')) - parseInt(String(b.price).replace('RM', '')));
    } else if (sortBy === 'price_desc') {
      sorted.sort((a, b) => parseInt(String(b.price).replace('RM', '')) - parseInt(String(a.price).replace('RM', '')));
    }
    return sorted;
  }, [selectedDiet, selectedCuisine, selectedMood, selectedPrice, search, sortBy]);

  const filteredRestaurants = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = availableRestaurants.filter(r => {
      const cuisineMatch =
        selectedCuisine.length === 0 ||
        selectedCuisine.some(c => {
          const cl = String(c).toLowerCase();
          // Only match if the restaurant itself is of the selected cuisine
          return cl === String(r.cuisine).toLowerCase() || r.cuisines.map(cc => String(cc).toLowerCase()).includes(cl);
        });

      const moodMatch =
        selectedMood.length === 0 ||
        selectedMood.every(m => r.ambience.map(mm => String(mm).toLowerCase().replace(/ /g, '')).includes(String(m).toLowerCase().replace(/ /g, '')));

      // If diet is specified, make sure the restaurant has at least one item of those types
      const dietMatch =
        selectedDiet.length === 0 ||
        availableItems.some(i => i.restaurant === r.name && selectedDiet.map(d => String(d).toLowerCase()).includes(String(i.type).toLowerCase()));

      // Price: prefer existence of at least one item in price ranges; fallback to average
      const itemPriceMatch = selectedPrice.length === 0 || availableItems.some(i => {
        if (i.restaurant !== r.name) return false;
        const p = parseInt(String(i.price).replace('RM', ''));
        return selectedPrice.some(range => (
          (range === 'RM0-RM10' && p <= 10) ||
          (range === 'RM11-RM20' && p >= 11 && p <= 20) ||
          (range === 'RM21-RM30' && p >= 21 && p <= 30) ||
          (range === 'RM31+' && p >= 31)
        ));
      });
      const priceMatch = selectedPrice.length === 0 ? true : itemPriceMatch || (r.matchesPriceRange ? selectedPrice.some(range => r.matchesPriceRange(range)) : true);

      // Ensure at least one item matches all selected diet/cuisine/price constraints
      const hasMatchingItem = availableItems.some(i => {
        if (i.restaurant !== r.name) return false;
        const dietOk = selectedDiet.length === 0 || selectedDiet.map(x => String(x).toLowerCase()).includes(String(i.type).toLowerCase());
        const cuisineOk = selectedCuisine.length === 0 || selectedCuisine.map(x => String(x).toLowerCase()).includes(String(i.cuisine).toLowerCase());
        const p = parseInt(String(i.price).replace('RM', ''));
        const priceOk = selectedPrice.length === 0 || selectedPrice.some(range => (
          (range === 'RM0-RM10' && p <= 10) ||
          (range === 'RM11-RM20' && p >= 11 && p <= 20) ||
          (range === 'RM21-RM30' && p >= 21 && p <= 30) ||
          (range === 'RM31+' && p >= 31)
        ));
        return dietOk && cuisineOk && priceOk;
      });

      const searchMatch =
        term.length === 0 ||
        r.name.toLowerCase().includes(term) ||
        String(r.location).toLowerCase().includes(term) ||
        String(r.theme).toLowerCase().includes(term);

      return cuisineMatch && moodMatch && dietMatch && priceMatch && hasMatchingItem && searchMatch;
    });

    // Sort restaurants similar to items
    if (sortBy === 'rating_desc') list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    else if (sortBy === 'price_asc') list = [...list].sort((a, b) => (a.averagePriceValue ?? 0) - (b.averagePriceValue ?? 0));
    else if (sortBy === 'price_desc') list = [...list].sort((a, b) => (b.averagePriceValue ?? 0) - (a.averagePriceValue ?? 0));
    return list;
  }, [selectedDiet, selectedCuisine, selectedMood, selectedPrice, search, sortBy]);

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
