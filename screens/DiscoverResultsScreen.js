// screens/DiscoverResultsScreen.js
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { availableItems } from '../data/mockData';

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

export default function DiscoverResultsScreen({ route, navigation }) {
  const { tag } = route.params || {};

  const items = React.useMemo(() => {
    if (!tag) return availableItems;
    const t = String(tag).toLowerCase();
    return availableItems.filter((item) =>
      (item.tags || []).map((x) => String(x).toLowerCase()).includes(t)
    );
  }, [tag]);

  const analytics = React.useMemo(() => {
    const priceValues = [];
    const ratingValues = [];
    const cuisineCounts = {};

    items.forEach((item) => {
      const price = parsePriceToNumber(item.price);
      if (price !== null) priceValues.push(price);

      const rating = Number(item.rating);
      if (!Number.isNaN(rating)) ratingValues.push(rating);

      const cuisine = String(item.cuisine || '').toLowerCase();
      if (cuisine) {
        cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 1;
      }
    });

    const avgPrice =
      priceValues.length > 0
        ? Math.round(priceValues.reduce((sum, value) => sum + value, 0) / priceValues.length)
        : null;

    const avgRating =
      ratingValues.length > 0
        ? ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length
        : null;

    let topCuisine = null;
    let topCount = 0;
    Object.entries(cuisineCounts).forEach(([cuisine, count]) => {
      if (count > topCount) {
        topCuisine = cuisine;
        topCount = count;
      }
    });

    return { avgPrice, avgRating, topCuisine };
  }, [items]);

  const heroTagLabel = tag ? toTitleCase(tag) : 'Discoveries';

  // Tag-specific fun phrases
  const phraseMap = {
    spicy: 'For when you\'re feeling bold',
    sweet: 'Sweetness that hits the heart',
    aromatic: 'Fragrances that entice the soul',
    hearty: 'For big appetites and warm hearts',
    refreshing: 'Fresh flavors to invigorate your day',
    creamy: 'Indulgence in every smooth bite',
  };
  const normalizedTag = tag ? String(tag).trim().toLowerCase() : null;
  const heroMetaParts = [
    phraseMap[normalizedTag] || 'Explore delicious options',
  ];
  // Removed “Popular: …”
  const heroMeta = heroMetaParts.join(' | ');

  const stats = React.useMemo(() => {
    const values = [{ label: 'Matches', value: String(items.length) || '0' }];

    if (analytics.avgRating) {
      values.push({ label: 'Average rating', value: `${analytics.avgRating.toFixed(1)}⭐` });
    }
    if (analytics.avgPrice) {
      values.push({ label: 'Average price', value: `RM${analytics.avgPrice}` });
    }
    return values;
  }, [items.length, analytics]);

  const handleOpenPreferences = React.useCallback(() => {
    navigation.navigate('PreferenceMainPage');
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.container}>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {/* Back icon row */}
              <View style={styles.headerBar}>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={styles.backBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <Icon name="chevron-left" size={22} color="#3C1E12" />
                </TouchableOpacity>
              </View>

              <View style={styles.heroCard}>
                <Text style={styles.heroEyebrow}>Discovering</Text>
                <Text style={styles.heroTitle}>{heroTagLabel}</Text>
                <Text style={styles.heroMeta}>{heroMeta}</Text>
              </View>

              {stats.length > 0 && (
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
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('PreferenceItemDetail', { item })}
              accessibilityRole="button"
            >
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>
                {toTitleCase(item.restaurant)} | {toTitleCase(item.type)} | {item.price}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
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
          }
          ListFooterComponent={<View style={styles.footerSpacer} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF5ED' },
  container: { flex: 1, backgroundColor: '#FFF5ED' },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  listHeader: { paddingTop: 12, paddingBottom: 12 },

  // Back icon area
  headerBar: {
    height: 36,
    justifyContent: 'center',
    marginBottom: 8,
  },
  backBtn: {
    alignSelf: 'flex-start',
    padding: 6,
    borderRadius: 10,
  },

  heroCard: {
    backgroundColor: '#FF4D00',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#FF4D00',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  heroEyebrow: { color: '#FFE8D2', fontWeight: '600', marginBottom: 6, fontSize: 13 },
  heroTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginBottom: 6 },
  heroMeta: { color: '#FFE8D2', fontSize: 14, fontWeight: '500' },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  statPill: {
    backgroundColor: '#FFE8D2',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FFD4AF',
    flexDirection: 'column',
    minWidth: 110,
    marginRight: 10,
    marginBottom: 10,
  },
  statLabel: { color: '#6B4A3F', fontSize: 12, fontWeight: '600' },
  statValue: { color: '#3C1E12', fontSize: 16, fontWeight: '700', marginTop: 4 },

  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFE8D2',
    borderLeftWidth: 4,
    borderLeftColor: '#FF4D00',
    shadowColor: '#FF4D00',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#3C1E12' },
  cardMeta: { color: '#6B4A3F', marginTop: 6, fontWeight: '500' },

  emptyBox: {
    backgroundColor: '#FFE8D2',
    padding: 24,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD4AF',
    marginTop: 24,
  },
  emptyTitle: { color: '#3C1E12', fontWeight: '800', fontSize: 18, marginBottom: 8 },
  emptyText: {
    color: '#6B4A3F',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
    lineHeight: 18,
  },
  emptyButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#FF4D00',
  },
  emptyButtonText: { color: '#FFFFFF', fontWeight: '700' },
  footerSpacer: { height: 32 },
});
