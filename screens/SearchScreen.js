// screens/SearchScreen.js
import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ScrollView, Image, Platform } from 'react-native';
import { availableItems, availableRestaurants } from '../data/mockData';

const presetTags = ['spicy', 'sweet', 'salty', 'aromatic', 'hearty', 'refreshing', 'creamy'];

export default function SearchScreen({ navigation, initialQuery = '', onQueryChange }) {
  const [query, setQuery] = React.useState(initialQuery || '');
  const [tag, setTag] = React.useState(null);
  const [imageError, setImageError] = React.useState({});

  React.useEffect(() => {
    if (typeof initialQuery === 'string') {
      setQuery(prev => (prev === initialQuery ? prev : initialQuery));
    }
  }, [initialQuery]);

  const handleChangeQuery = React.useCallback(
    (text) => {
      setQuery(text);
      onQueryChange?.(text);
    },
    [onQueryChange]
  );

  const discoverTags = React.useMemo(() => {
    // Show presets that exist in data
    const allTags = new Set(availableItems.flatMap(i => i.tags || []).map(t => String(t).toLowerCase()));
    return presetTags.filter(t => allTags.has(t));
  }, []);

  // Autocomplete suggestions (items + restaurants)
  const suggestions = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const itemMatches = availableItems
      .filter(i => i.name.toLowerCase().includes(q) || String(i.restaurant).toLowerCase().includes(q))
      .slice(0, 5)
      .map(i => ({
        id: `item-${i.id}`,
        label: `${i.name} • ${i.restaurant}`,
        kind: 'item',
        payload: i,
      }));
    const restMatches = availableRestaurants
      .filter(r => r.name.toLowerCase().includes(q) || String(r.cuisine).toLowerCase().includes(q) || r.cuisines.join(',').toLowerCase().includes(q))
      .slice(0, 5)
      .map(r => ({
        id: `rest-${r.id}`,
        label: `${r.name} • ${r.cuisine}`,
        kind: 'restaurant',
        payload: r,
      }));
    return [...itemMatches, ...restMatches].slice(0, 8);
  }, [query]);

  return (
    <View style={styles.safeArea}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Search</Text>

      {/* Query */}
      <View style={styles.searchRow}>
        <Text style={styles.searchIcon}>🔎</Text>
        <TextInput
          placeholder="Search restaurants or dishes"
          value={query}
          onChangeText={handleChangeQuery}
          style={styles.searchInput}
          placeholderTextColor="#6B4A3F"
        />
      </View>

      {/* Autocomplete dropdown */}
      {query.trim().length > 0 && (
        suggestions.length > 0 ? (
          <View style={styles.dropdown}>
            {suggestions.map(s => (
              <TouchableOpacity
                key={s.id}
                style={styles.dropdownItem}
                onPress={() => {
                  if (s.kind === 'item') navigation.navigate('PreferenceItemDetail', { item: s.payload });
                  else navigation.navigate('RestaurantDetail', { restaurant: s.payload });
                }}
              >
                <Text style={styles.dropdownText}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyBox}><Text style={styles.emptyText}>No matches</Text></View>
        )
      )}

      {/* Discover tags */}
      <Text style={styles.sectionTitle}>Discover</Text>
      <View style={styles.grid}> 
        {discoverTags.map(t => (
          <TouchableOpacity
            key={t}
            style={styles.tile}
            onPress={() => navigation.navigate('DiscoverResults', { tag: t })}
          >
            <Image
              defaultSource={Platform.OS === 'ios' ? require('../assets/icon.png') : undefined}
              source={imageError[t] ? require('../assets/icon.png') : { uri: sampleImageForTag(t) }}
              onError={() => setImageError(prev => ({ ...prev, [t]: true }))}
              style={styles.tileImage}
              resizeMode="cover"
            />
            <View style={styles.tileOverlay}>
              <Text style={styles.tileText}>{t.toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      </ScrollView>
    </View>
  );
}

function TagChip({ label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.tagChip, active && styles.tagChipActive]}>
      <Text style={[styles.tagChipText, active && styles.tagChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Empty({ text }) {
  return (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF5ED' },
  container: { flex: 1, backgroundColor: '#FFF5ED', padding: 16 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 12, color: '#FF4D00' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE8D2',
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 8,
  },
  searchIcon: { color: '#6B4A3F', marginRight: 8 },
  searchInput: { flex: 1, color: '#3C1E12' },
  sectionTitle: { fontWeight: '800', marginTop: 8, marginBottom: 8, fontSize: 20, color: '#FF4D00' },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FFE8D2',
    shadowColor: '#FF4D00',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#3C1E12' },
  cardMeta: { color: '#6B4A3F', marginTop: 4 },
  emptyBox: {
    backgroundColor: '#FFE8D2',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: { color: '#6B4A3F', fontWeight: '600' },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFE8D2',
    shadowColor: '#FF4D00',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#FFE8D2',
  },
  dropdownText: { color: '#3C1E12' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: {
    width: '48%',
    aspectRatio: 1.2,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#FFE8D2',
  },
  tileImage: { width: '100%', height: '100%' },
  tileOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(60, 30, 18, 0.18)',
  },
  tileText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFE8D2',
    marginRight: 8,
    marginBottom: 8,
  },
  tagChipActive: { backgroundColor: '#FF4D00' },
  tagChipText: { fontWeight: '600', color: '#3C1E12' },
  tagChipTextActive: { color: '#FFFFFF' },
});

function sampleImageForTag(tag) {
  const t = String(tag).toLowerCase();
  const map = {
    spicy: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQYv-uoxN6gm0rG7TtlhTKXREwz7id1Cm909A&s',
    sweet: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    salty: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    aromatic: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    hearty: 'https://images.unsplash.com/photo-1543353071-10c8ba85a904?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    refreshing: 'https://m.media-amazon.com/images/S/assets.wholefoodsmarket.com//content/fb/a0/49e82cfa4075ad23b154016edce8/microsoftteams-image-11._TTW_._CR2,0,4989,2807_._SR1500,844_._QL100_.png',
    creamy: 'https://www.allrecipes.com/thmb/9aWCdbfttLcsW2dFQWwVQBGJM3E=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/AR-236973-CreamyAlfredoSauce-0238-4x3-1-01e7091f47ae452d991abe32cbed5921.jpg',
  };
  return map[t] || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
}
