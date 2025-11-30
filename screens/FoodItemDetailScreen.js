// screens/FoodItemDetailScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import BackButton from '../components/BackButton';
import { isItemLiked, likeItem, unlikeItem } from '../state/libraryStore';

// 👉 Appwrite (frontend client)
import { db, DB_ID, COL } from '../appwrite';

const BRAND = {
  primary: '#FF4D00',
  bg: '#FFF5ED',
  surface: '#FFFFFF',
  line: '#FFE8D2',
  ink: '#3C1E12',
  inkMuted: '#6B4A3F',
  metaBg: '#FFE8D2',
  accent: '#FFD4AF',
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

const toRM = (n) =>
  n == null || Number.isNaN(Number(n)) ? 'RM0' : `RM${Number(n)}`;

/** Remove functions/instances so we never pass non-serializable params around */
function stripFunctions(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const k in obj) {
    const v = obj[k];
    if (typeof v === 'function') continue;
    out[k] = typeof v === 'object' ? stripFunctions(v) : v;
  }
  return out;
}

/** Build the exact shape this screen expects from raw DB docs */
function normalizeItem({ itemDoc, restaurantDoc }) {
  const price = toRM(itemDoc?.priceRM);
  return {
    id: itemDoc?.$id,
    name: itemDoc?.name || '',
    type: itemDoc?.type || 'other',
    price,
    cuisine: itemDoc?.cuisine || '',
    description: itemDoc?.description || '',
    tags: Array.isArray(itemDoc?.tags) ? itemDoc.tags : [],
    mood: Array.isArray(itemDoc?.mood) ? itemDoc.mood : [],
    rating: itemDoc?.rating ?? null,
    restaurantId: itemDoc?.restaurantId || null,
    menuId: itemDoc?.menuId || null,

    // For UI labels:
    restaurant: restaurantDoc?.name || '',
    location: restaurantDoc?.location || '',
  };
}

export default function FoodItemDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params || {};

  // You can pass either { item } (already fetched) or { itemId }
  const passedItem = params.item ? stripFunctions(params.item) : null;
  const passedItemId = params.itemId || passedItem?.id;

  const [item, setItem] = React.useState(passedItem || null);
  const [liked, setLiked] = React.useState(
    passedItem ? isItemLiked(passedItem.id) : false
  );
  const [loading, setLoading] = React.useState(!passedItem); // load only if no item provided
  const [error, setError] = React.useState(null);

  React.useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadItem = React.useCallback(async () => {
    if (!passedItemId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    try {
      const it = await db.getDocument(DB_ID, COL.items, passedItemId);
      let restaurantDoc = null;
      if (it.restaurantId) {
        try {
          restaurantDoc = await db.getDocument(DB_ID, COL.restaurants, it.restaurantId);
        } catch (e) {
          // restaurant might be missing; keep going
        }
      }
      const normalized = normalizeItem({ itemDoc: it, restaurantDoc });
      if (!cancelled) {
        setItem(normalized);
        setLiked(isItemLiked(normalized.id));
      }
    } catch (e) {
      if (!cancelled) {
        setError(e?.message || 'Failed to load item');
        setItem(null);
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [passedItemId]);

  React.useEffect(() => {
    if (passedItem) {
      setItem(passedItem);
      setLiked(isItemLiked(passedItem.id));
    }
  }, [passedItem]);

  React.useEffect(() => {
    loadItem();
  }, [loadItem]);

  useFocusEffect(
    React.useCallback(() => {
      loadItem();
      return () => {};
    }, [loadItem])
  );

  const toggleLike = () => {
    if (!item?.id) return;
    if (liked) { unlikeItem(item.id); setLiked(false); }
    else { likeItem(item.id); setLiked(true); }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (error || !item) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <Text style={{ color: 'red', textAlign: 'center' }}>
            {error || 'Item not found'}
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
            <Text style={{ color: BRAND.primary, fontWeight: '700' }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const restaurantLabel = [item.restaurant, item.location].filter(Boolean).join(' • ');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Orange header with soft lower border */}
        <View style={styles.headerWrap}>
          <View style={styles.headerBar}>
            <BackButton onPress={() => navigation.goBack()} />

            <View style={{ flex: 1, alignItems: 'center' }} />

            {/* Right spacer to balance layout */}
            <View style={{ width: 40, height: 40 }} />
          </View>

          {/* White hero card under orange header */}
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Signature Dish</Text>

            {/* Title row with heart INSIDE the header hero card */}
            <View style={styles.titleRow}>
              <Text style={styles.heroTitle} numberOfLines={2}>{item.name}</Text>
              <TouchableOpacity
                onPress={toggleLike}
                style={styles.likeBtn}
                accessibilityRole="button"
                accessibilityLabel={liked ? 'Unlike dish' : 'Like dish'}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={22}
                  color={liked ? BRAND.primary : BRAND.inkMuted}
                />
              </TouchableOpacity>
            </View>

            {!!restaurantLabel && <Text style={styles.heroMeta}>{restaurantLabel}</Text>}

            <View style={styles.heroStatsRow}>
              {!!item.price && (
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Price</Text>
                  <Text style={styles.heroStatValue}>{item.price}</Text>
                </View>
              )}
              {!!item.rating && (
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Rating</Text>
                  <Text style={styles.heroStatValue}>
                    {Number(item.rating).toFixed(1)}⭐
                  </Text>
                </View>
              )}
              {!!item.cuisine && (
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Cuisine</Text>
                  <Text style={styles.heroStatValue}>{toTitleCase(item.cuisine)}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Description */}
        {!!item.description && (
          <Section title="Description">
            <Text style={styles.description}>{item.description}</Text>
          </Section>
        )}

        {/* Highlights */}
        {Array.isArray(item.tags) && item.tags.length > 0 && (
          <Section title="Highlights">
            <FlatList
              data={item.tags}
              horizontal
              keyExtractor={(tag, idx) => `${item.id}-tag-${idx}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 6 }}
              renderItem={({ item: tag }) => (
                <View style={styles.tagChip}>
                  <Text style={styles.tagText}>{toTitleCase(tag)}</Text>
                </View>
              )}
            />
          </Section>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BRAND.bg },
  container: { flex: 1, backgroundColor: BRAND.bg },

  /* Header */
  headerWrap: {
    paddingBottom: 24,
    backgroundColor: BRAND.primary,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: BRAND.primary,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  /* White hero card under header */
  heroCard: {
    marginHorizontal: 16,
    marginTop: 18,
    backgroundColor: BRAND.surface,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: BRAND.line,
    shadowColor: BRAND.primary,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  heroEyebrow: {
    color: BRAND.primary,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  /* Title + heart inside hero card */
  titleRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroTitle: { flex: 1, fontSize: 24, fontWeight: '800', color: BRAND.ink },
  likeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.metaBg,
    borderWidth: 1,
    borderColor: BRAND.line,
  },

  heroMeta: { color: BRAND.inkMuted, fontSize: 14, marginTop: 8, fontWeight: '600' },

  heroStatsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, marginRight: -12 },
  heroStat: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: BRAND.metaBg,
    borderWidth: 1,
    borderColor: BRAND.line,
    marginRight: 12,
    marginBottom: 12,
  },
  heroStatLabel: { color: BRAND.inkMuted, fontSize: 12, fontWeight: '600' },
  heroStatValue: { color: BRAND.ink, fontSize: 16, fontWeight: '700', marginTop: 4 },

  /* Sections / Cards */
  section: {
    marginTop: 16,
    backgroundColor: BRAND.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BRAND.line,
    padding: 16,
    shadowColor: BRAND.primary,
    shadowOpacity: Platform.OS === 'ios' ? 0.08 : 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginHorizontal: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: BRAND.primary, marginBottom: 10 },
  description: { fontSize: 15, color: BRAND.ink, lineHeight: 22 },

  /* Tag chips */
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.metaBg,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRAND.line,
    marginRight: 10,
    marginBottom: 8,
  },
  tagText: { color: BRAND.ink, fontWeight: '700' },
});

export {};
