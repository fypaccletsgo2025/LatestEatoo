// screens/ExploreHomeScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { availableItems, availableRestaurants } from '../data/mockData';

export default function ExploreHomeScreen({ onOpenDrawer, onStartQuestionnaire, externalSelections }) {
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
      const { selectedDiet = [], selectedCuisine = [], selectedMood = [], selectedPrice = [] } = externalSelections;
      setSelectedDiet(selectedDiet);
      setSelectedCuisine(selectedCuisine);
      setSelectedMood(selectedMood);
      setSelectedPrice(selectedPrice);
    }
  }, [externalSelections]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    const items = availableItems.filter(item => {
      const dietMatch =
        selectedDiet.length === 0 ||
        selectedDiet.some(d => d.toLowerCase() === String(item.type).toLowerCase());
      const cuisineMatch =
        selectedCuisine.length === 0 ||
        selectedCuisine.some(c => c.toLowerCase() === String(item.cuisine).toLowerCase());
      const r = availableRestaurants.find(rr => rr.name === item.restaurant);
      const ambience = (r?.ambience || []).map(x => String(x).toLowerCase().replace(/ /g, ''));
      const moodMatch = selectedMood.length === 0 || selectedMood.every(m => ambience.includes(String(m).toLowerCase().replace(/ /g, '')));
      const priceMatch = selectedPrice.length === 0 || selectedPrice.some(range => {
        const price = parseInt(String(item.price).replace('RM', ''));
        switch (range) {
          case 'RM0-RM10': return price <= 10;
          case 'RM11-RM20': return price >= 11 && price <= 20;
          case 'RM21-RM30': return price >= 21 && price <= 30;
          case 'RM31+': return price >= 31;
          default: return true;
        }
      });
      const searchMatch = term.length === 0 || item.name.toLowerCase().includes(term) || String(item.restaurant).toLowerCase().includes(term);
      return dietMatch && cuisineMatch && moodMatch && priceMatch && searchMatch;
    });
    const sorted = [...items];
    if (sortBy === 'rating_desc') sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    else if (sortBy === 'price_asc') sorted.sort((a, b) => parseInt(String(a.price).replace('RM', '')) - parseInt(String(b.price).replace('RM', '')));
    else if (sortBy === 'price_desc') sorted.sort((a, b) => parseInt(String(b.price).replace('RM', '')) - parseInt(String(a.price).replace('RM', '')));
    return sorted;
  }, [selectedDiet, selectedCuisine, selectedMood, selectedPrice, search, sortBy]);

  const filteredRestaurants = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = availableRestaurants.filter(r => {
      const cuisineMatch = selectedCuisine.length === 0 || selectedCuisine.some(c => {
        const cl = String(c).toLowerCase();
        return cl === String(r.cuisine).toLowerCase() || r.cuisines.map(cc => String(cc).toLowerCase()).includes(cl);
      });
      const moodMatch = selectedMood.length === 0 || selectedMood.every(m => r.ambience.map(mm => String(mm).toLowerCase().replace(/ /g, '')).includes(String(m).toLowerCase().replace(/ /g, '')));
      const dietMatch = selectedDiet.length === 0 || availableItems.some(i => i.restaurant === r.name && selectedDiet.map(d => String(d).toLowerCase()).includes(String(i.type).toLowerCase()));
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
      const searchMatch = term.length === 0 || r.name.toLowerCase().includes(term) || String(r.location).toLowerCase().includes(term) || String(r.theme).toLowerCase().includes(term);
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
      return cuisineMatch && moodMatch && dietMatch && priceMatch && hasMatchingItem && searchMatch;
    });
    if (sortBy === 'rating_desc') list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    else if (sortBy === 'price_asc') list = [...list].sort((a, b) => (a.averagePriceValue ?? 0) - (b.averagePriceValue ?? 0));
    else if (sortBy === 'price_desc') list = [...list].sort((a, b) => (b.averagePriceValue ?? 0) - (a.averagePriceValue ?? 0));
    return list;
  }, [selectedDiet, selectedCuisine, selectedMood, selectedPrice, search, sortBy]);

  const removeFilter = (group, value) => {
    const lower = String(value).toLowerCase();
    if (group === 'diet') setSelectedDiet(prev => prev.filter(v => String(v).toLowerCase() !== lower));
    if (group === 'cuisine') setSelectedCuisine(prev => prev.filter(v => String(v).toLowerCase() !== lower));
    if (group === 'mood') setSelectedMood(prev => prev.filter(v => String(v).toLowerCase() !== lower));
    if (group === 'price') setSelectedPrice(prev => prev.filter(v => String(v).toLowerCase() !== lower));
  };
  

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#d1ccc7' }}>
      <ScrollView>
        <View style={{ padding: 16, paddingBottom: 112 }}>
          {/* Header */}
          <Text style={{ fontSize: 24, fontWeight: '800', marginBottom: 8 }}>Discover Food For You</Text>
          <Text style={{ color: '#6b7280', marginBottom: 12 }}>Tailored picks based on your vibe</Text>


          {/* Sort tabs */}
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            {[
              { key: 'relevance', label: 'Relevance' },
              { key: 'rating_desc', label: 'Top Rated' },
              { key: 'price_asc', label: 'Price Asc' },
              { key: 'price_desc', label: 'Price Desc' },
            ].map(opt => (
              <TouchableOpacity key={opt.key} onPress={() => setSortBy(opt.key)} style={[styles.sortTab, sortBy === opt.key && styles.sortTabActive]}>
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
            {selectedDiet.map(v => (<FilterChip key={`diet-${v}`} label={`Type: ${v}`} />))}
            {selectedCuisine.map(v => (<FilterChip key={`cuisine-${v}`} label={`Cuisine: ${v}`} />))}
            {selectedMood.map(v => (<FilterChip key={`mood-${v}`} label={`Mood: ${v}`} />))}
            {selectedPrice.map(v => (<FilterChip key={`price-${v}`} label={`Price: ${v}`} />))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 8 }}>
            <TouchableOpacity onPress={onStartQuestionnaire} style={{ backgroundColor: '#111827', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Edit Preferences</Text>
            </TouchableOpacity>
          </View>

          {/* Restaurants */}
          <SectionTitle title={`Recommended Restaurants`} right={filteredRestaurants.length ? `${filteredRestaurants.length}` : undefined} />
          {filteredRestaurants.length === 0 ? (
            <EmptyState text="No restaurants match your preferences." ctaText="Edit Preferences" onPress={onStartQuestionnaire} />
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
                  <Text style={styles.itemTags}>{r.location} • {r.cuisine}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 6 }}>
                    <Badge text={`${r.rating}★`} color="#fde68a" />
                    <Badge text={r.averagePrice} />
                  </View>
                  <Text style={[styles.itemTags, { marginTop: 6 }]} numberOfLines={2}>Theme: {r.theme}</Text>
                </TouchableOpacity>
              )}
            />
          )}

          {/* Items */}
          <SectionTitle title={`Recommended Items`} right={filteredItems.length ? `${filteredItems.length}` : undefined} style={{ marginTop: 12 }} />
          {filteredItems.length === 0 ? (
            <EmptyState text="No items match your preferences." ctaText="Edit Preferences" onPress={onStartQuestionnaire} />
          ) : (
            <FlatList
              data={filteredItems}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.itemCard}
                  onPress={() => navigation.navigate('PreferenceItemDetail', { item })}
                >
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemTags}>{item.restaurant}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 6 }}>
                    <Badge text={item.price} />
                    <Badge text={item.type} color="#e0e7ff" />
                  </View>
                  <Text style={[styles.itemTags, { marginTop: 6 }]}>Cuisine: {item.cuisine}</Text>
                </TouchableOpacity>
              )}
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
