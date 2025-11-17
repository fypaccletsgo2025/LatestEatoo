// screens/DiscoverResultsScreen.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';

// Appwrite
import { db, DB_ID, COL, ensureSession } from '../appwrite';
import { Query } from 'appwrite';

const BRAND = {
  primary: '#FF4D00',
  bg: '#FFF5ED',
  ink: '#3C1E12',
  inkMuted: '#6B4A3F',
  line: '#FFE8D2',
  accent: '#FFD4AF',
};

const parsePriceToNumber = (price) => {
  if (!price) return null;
  const numeric = parseFloat(String(price).replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
};

const toTitleCase = (value) => {
  if (!value) return '';
  const normalized = String(value).replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  return normalized.replace(/\b\w/g, (c) => c.toUpperCase());
};

const normalizeItemDoc = (it) => ({
  id: it.$id,
  name: it.name,
  restaurant: it.restaurantName || '',
  type: it.type || 'other',
  rating: typeof it.rating === 'number' ? it.rating : null,
  price: typeof it.priceRM === 'number' ? `RM ${Number(it.priceRM).toFixed(2)}` : null,
  cuisine: it.cuisine || '',
  tags: Array.isArray(it.tags) ? it.tags : [],
  createdAt: it.$updatedAt || it.$createdAt,
});

export default function DiscoverResultsScreen({ route, navigation }) {
  const { tag } = route.params || {};

  const [itemsRaw, setItemsRaw] = useState([]);
  const [loading, setLoading] = useState(true);

  // fetch items from Appwrite
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        // Ensure a session (works with anonymous too, if your rules allow reads)
        await ensureSession();
        const res = await db.listDocuments(DB_ID, COL.items, [Query.limit(200)]);
        const docs = (res.documents || []).map(normalizeItemDoc);
        if (!cancelled) setItemsRaw(docs);
      } catch (e) {
        console.warn('DiscoverResultsScreen: failed to load items', e?.message || e);
        if (!cancelled) setItemsRaw([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Filter by tag (client-side)
  const items = useMemo(() => {
    if (!tag) return itemsRaw;
    const t = String(tag).trim().toLowerCase();
    return itemsRaw.filter((item) =>
      (item.tags || []).some((x) => String(x).toLowerCase() === t)
    );
  }, [itemsRaw, tag]);

  // Simple analytics
  const analytics = useMemo(() => {
    const priceValues = [];
    const ratingValues = [];
    const cuisineCounts = {};

    items.forEach((item) => {
      const price = parsePriceToNumber(item.price);
      if (price !== null) priceValues.push(price);

      const rating = Number(item.rating);
      if (!Number.isNaN(rating)) ratingValues.push(rating);

      const cuisine = String(item.cuisine || '').toLowerCase();
      if (cuisine) cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 1;
    });

    const avgPrice =
      priceValues.length > 0
        ? Math.round(priceValues.reduce((s, v) => s + v, 0) / priceValues.length)
        : null;

    const avgRating =
      ratingValues.length > 0
        ? ratingValues.reduce((s, v) => s + v, 0) / ratingValues.length
        : null;

    return { avgPrice, avgRating };
  }, [items]);

  const heroTagLabel = tag ? toTitleCase(tag) : 'Discoveries';

  // Tag-specific fun phrases
  const phraseMap = {
    spicy: "For when you're feeling bold",
    sweet: 'Sweetness that hits the heart',
    salty: 'Perfectly seasoned and savory',
    hearty: 'For big appetites and warm hearts',
    refreshing: 'Fresh flavors to invigorate your day',
    creamy: 'Indulgence in every smooth bite',
    aromatic: 'A feast for the senses',
  };
  const normalizedTag = tag ? String(tag).trim().toLowerCase() : null;
  const heroMeta = phraseMap[normalizedTag] || 'Explore delicious options';

  const stats = useMemo(() => {
    const out = [{ label: 'Matches', value: String(items.length || 0) }];
    if (analytics.avgRating != null) out.push({ label: 'Average rating', value: `${analytics.avgRating.toFixed(1)}⭐` });
    if (analytics.avgPrice != null) out.push({ label: 'Average price', value: `RM${analytics.avgPrice}` });
    return out;
  }, [items.length, analytics]);

  const handleOpenPreferences = useCallback(() => {
    navigation.navigate('PreferenceMainPage');
  }, [navigation]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('PreferenceItemDetail', { itemId: item.id })}
      accessibilityRole="button"
    >
      <Text style={styles.cardTitle}>{toTitleCase(item.name)}</Text>
      <Text style={styles.cardMeta}>
        {toTitleCase(item.restaurant)} | {toTitleCase(item.type)} | {item.price ?? '-'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.container}>
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.headerBar}>
                <BackButton onPress={() => navigation.goBack()} />
              </View>

              <View style={styles.heroCard}>
                <Text style={styles.heroEyebrow}>Discovering</Text>
                <Text style={styles.heroTitle}>{heroTagLabel}</Text>
                <Text style={styles.heroMeta}>{heroMeta}</Text>
              </View>

              {loading ? (
                <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                  <ActivityIndicator color={BRAND.primary} />
                </View>
              ) : null}

              {!loading && stats.length > 0 && (
                <View style={styles.statsRow}>
                  {stats.map((stat) => (
                    <View key={stat.label} style={styles.statPill}>
                      <Text style={styles.statLabel}>{stat.label}</Text>
                      <Text style={styles.statValue}>{stat.value}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          }
          renderItem={renderItem}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>We haven&apos;t found a match yet</Text>
                <Text style={styles.emptyText}>
                  Try switching filters or updating your preferences for fresh discoveries.
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={handleOpenPreferences}
                  accessibilityRole="button"
                >
                  <Text style={styles.emptyButtonText}>Open questionnaire</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          ListFooterComponent={<View style={styles.footerSpacer} />}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BRAND.bg },
  container: { flex: 1, backgroundColor: BRAND.bg },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  listHeader: { paddingTop: 12, paddingBottom: 12 },

  headerBar: { marginBottom: 8, alignItems: 'flex-start' },

  heroCard: {
    backgroundColor: BRAND.primary,
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: BRAND.primary,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  heroEyebrow: { color: BRAND.line, fontWeight: '600', marginBottom: 6, fontSize: 13 },
  heroTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginBottom: 6 },
  heroMeta: { color: BRAND.line, fontSize: 14, fontWeight: '500' },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  statPill: {
    backgroundColor: BRAND.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: BRAND.accent,
    minWidth: 110,
    marginRight: 10,
    marginBottom: 10,
  },
  statLabel: { color: BRAND.inkMuted, fontSize: 12, fontWeight: '600' },
  statValue: { color: BRAND.ink, fontSize: 16, fontWeight: '700', marginTop: 4 },

  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BRAND.line,
    borderLeftWidth: 4,
    borderLeftColor: BRAND.primary,
    shadowColor: BRAND.primary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: BRAND.ink },
  cardMeta: { color: BRAND.inkMuted, marginTop: 6, fontWeight: '500' },

  emptyBox: {
    backgroundColor: BRAND.line,
    padding: 24,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND.accent,
    marginTop: 24,
  },
  emptyTitle: { color: BRAND.ink, fontWeight: '800', fontSize: 18, marginBottom: 8 },
  emptyText: { color: BRAND.inkMuted, textAlign: 'center', marginBottom: 16, fontWeight: '500', lineHeight: 18 },
  emptyButton: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 16, backgroundColor: BRAND.primary },
  emptyButtonText: { color: '#FFFFFF', fontWeight: '700' },

  footerSpacer: { height: 32 },
});
