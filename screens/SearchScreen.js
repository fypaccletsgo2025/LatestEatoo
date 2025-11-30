// screens/SearchScreen.js
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Appwrite
import { db, DB_ID, COL, ensureSession } from '../appwrite';
import { Query } from 'appwrite';

const presetTags = ['spicy', 'sweet', 'salty', 'savory', 'hearty', 'refreshing', 'creamy'];

const BRAND = {
  primary: '#FF4D00',
  bg: '#FFF5ED',
  ink: '#3C1E12',
  inkMuted: '#6B4A3F',
  line: '#FFE8D2',
};

const parsePriceToNumber = (price) => {
  if (!price) return null;
  const numeric = parseFloat(String(price).replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
};

const toTitleCase = (value) => {
  if (!value) return '';
  const normalized = String(value)
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return normalized.replace(/\b\w/g, (c) => c.toUpperCase());
};

const normalizeItemDoc = (it) => ({
  id: it.$id,
  name: it.name,
  restaurantName: it.restaurantName || '',
  type: it.type || 'other',
  price: typeof it.priceRM === 'number' ? `RM ${Number(it.priceRM).toFixed(2)}` : null,
  rating: typeof it.rating === 'number' ? it.rating : null,
  cuisine: it.cuisine || '',
  tags: Array.isArray(it.tags) ? it.tags : [],
});

const normalizeRestaurantDoc = (r) => ({
  id: r.$id,
  name: r.name,
  cuisine: r.cuisine || (Array.isArray(r.cuisines) ? r.cuisines.join(', ') : ''),
  location: r.location || '',
  cuisines: Array.isArray(r.cuisines) ? r.cuisines : [],
});

export default function SearchScreen({
  navigation,
  initialQuery = '',
  onQueryChange,
  onScrollDirectionChange,
}) {
  const [query, setQuery] = useState(initialQuery || '');
  const [imageError, setImageError] = useState({});
  const [items, setItems] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollOffsetRef = useRef(0);
  const lastDirectionRef = useRef('down');
  const reportScrollDirection = useCallback(
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

  useEffect(() => {
    reportScrollDirection('down');
  }, [reportScrollDirection]);

  const handleScroll = useCallback(
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

  // Keep query in sync if parent passes a new initialQuery
  useEffect(() => {
    if (typeof initialQuery === 'string') {
      setQuery((prev) => (prev === initialQuery ? prev : initialQuery));
    }
  }, [initialQuery]);

  // Load data from Appwrite
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await ensureSession();
        const [itemsRes, restRes] = await Promise.all([
          db.listDocuments(DB_ID, COL.items, [Query.limit(200)]),
          db.listDocuments(DB_ID, COL.restaurants, [Query.limit(200)]),
        ]);
        if (cancelled) return;
        setItems((itemsRes.documents || []).map(normalizeItemDoc));
        setRestaurants((restRes.documents || []).map(normalizeRestaurantDoc));
      } catch (e) {
        console.warn('SearchScreen: failed to load', e?.message || e);
        if (!cancelled) {
          setItems([]);
          setRestaurants([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChangeQuery = useCallback(
    (text) => {
      setQuery(text);
      onQueryChange?.(text);
    },
    [onQueryChange]
  );

  // Build Discover tags from items' tags, but show only those in presetTags
  const discoverTags = useMemo(() => {
    const allTags = new Set(items.flatMap((i) => i.tags || []).map((t) => String(t).toLowerCase()));
    return presetTags.filter((t) => allTags.has(t));
  }, [items]);

  // Autocomplete suggestions (items + restaurants)
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const itemMatches = items
      .filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          String(i.restaurantName).toLowerCase().includes(q) ||
          String(i.cuisine).toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((i) => ({
        id: `item-${i.id}`,
        label: `${i.name} • ${i.restaurantName || '—'}`,
        kind: 'item',
        payload: i,
      }));

    const restMatches = restaurants
      .filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          String(r.cuisine).toLowerCase().includes(q) ||
          r.cuisines.join(',').toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((r) => ({
        id: `rest-${r.id}`,
        label: `${r.name} • ${r.cuisine || '—'}`,
        kind: 'restaurant',
        payload: r,
      }));

    return [...itemMatches, ...restMatches].slice(0, 8);
  }, [query, items, restaurants]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      {/* Non-scrolling search bar and suggestions */}
      <View style={styles.queryContainer}>
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔎</Text>
          <TextInput
            placeholder="Search restaurants or dishes"
            value={query}
            onChangeText={handleChangeQuery}
            style={styles.searchInput}
            placeholderTextColor={BRAND.inkMuted}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        {query.trim().length > 0 && (
          <SuggestionsDropdown loading={loading} suggestions={suggestions} navigation={navigation} />
        )}
      </View>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Discover tags */}
        <Text style={styles.sectionTitle}>Discover</Text>
        {loading && discoverTags.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={BRAND.primary} />
          </View>
        ) : (
          <View style={styles.grid}>
            {discoverTags.map((t) => (
              <TouchableOpacity
                key={t}
                style={styles.tile}
                onPress={() => navigation.navigate('DiscoverResults', { tag: t })}
              >
                <Image
                  defaultSource={Platform.OS === 'ios' ? require('../assets/icon.png') : undefined}
                  source={imageError[t] ? require('../assets/icon.png') : { uri: sampleImageForTag(t) }}
                  onError={() => setImageError((prev) => ({ ...prev, [t]: true }))}
                  style={styles.tileImage}
                  resizeMode="cover"
                />
                <View style={styles.tileOverlay}>
                  <Text style={styles.tileText}>{t.toUpperCase()}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {discoverTags.length === 0 && !loading ? (
              <View style={[styles.emptyBox, { marginTop: 8 }]}>
                <Text style={styles.emptyText}>No tags yet — add more items!</Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SuggestionsDropdown({ loading, suggestions, navigation }) {
  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={BRAND.primary} />
      </View>
    );
  }

  if (suggestions.length > 0) {
    return (
      <View style={styles.dropdown}>
        {suggestions.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={styles.dropdownItem}
            onPress={() => {
              if (s.kind === 'item') {
                navigation.navigate('PreferenceItemDetail', { itemId: s.payload.id });
              } else {
                navigation.navigate('RestaurantDetail', { restaurantId: s.payload.id });
              }
            }}
          >
            <Text style={styles.dropdownText}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyText}>No matches</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BRAND.bg },
  queryContainer: { paddingHorizontal: 16, paddingTop: 4 },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND.line,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 8,
  },
  searchIcon: { color: BRAND.inkMuted, marginRight: 8 },
  searchInput: { flex: 1, color: BRAND.ink },

  sectionTitle: { fontWeight: '800', marginTop: 8, marginBottom: 8, fontSize: 20, color: BRAND.primary },

  loadingBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },

  emptyBox: {
    backgroundColor: '#FFE8D2',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND.line,
  },
  emptyText: { color: BRAND.inkMuted, fontWeight: '600' },

  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BRAND.line,
    shadowColor: BRAND.primary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BRAND.line,
  },
  dropdownText: { color: BRAND.ink },

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
});

function sampleImageForTag(tag) {
  const t = String(tag).toLowerCase();
  const map = {
    spicy: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQYv-uoxN6gm0rG7TtlhTKXREwz7id1Cm909A&s',
    sweet: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    salty: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    savory: 'https://www.theworktop.com/wp-content/uploads/2021/10/Savory-French-Toast-16x9-1.jpg',
    hearty: 'https://images.unsplash.com/photo-1543353071-10c8ba85a904?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    refreshing: 'https://m.media-amazon.com/images/S/assets.wholefoodsmarket.com//content/fb/a0/49e82cfa4075ad23b154016edce8/microsoftteams-image-11._TTW_._CR2,0,4989,2807_._SR1500,844_._QL100_.png',
    creamy: 'https://www.allrecipes.com/thmb/9aWCdbfttLcsW2dFQWwVQBGJM3E=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/AR-236973-CreamyAlfredoSauce-0238-4x3-1-01e7091f47ae452d991abe32cbed5921.jpg',
  };
  return map[t] || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
}
