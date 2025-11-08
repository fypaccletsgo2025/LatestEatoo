// screens/CreateFoodlistScreen.js
import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';

// Local store
import { updateFoodlists } from '../state/foodlistsStore';

// Appwrite wrapper + SDK symbols
import { db, DB_ID, COL, ensureSession, account } from '../appwrite';
import { Query, ID, Permission, Role } from 'appwrite';

const BRAND = {
  primary: '#FF4D00',
  accent: '#FDAA48',
  bg: '#f7f4f2',
  ink: '#222',
  inkMuted: '#666',
  line: '#e6e0dc',
  pillBg: '#fff7f2',
  pillActiveBg: '#FFD8BF',
  metaBg: '#FFF3E9',
  badgeBg: '#FFD8BF',
  disabled: '#F7B890',
};

const SORTS = [
  { key: 'top', label: 'Top Rated' },
  { key: 'budget', label: 'Budget' },
  { key: 'recent', label: 'Recently Added' },
];

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
  restaurantId: it.restaurantId || null,
  restaurant: it.restaurantName || '', // will enrich from restaurants collection
  rating: typeof it.rating === 'number' ? it.rating : null,
  price: typeof it.priceRM === 'number' ? `RM ${Number(it.priceRM).toFixed(2)}` : null,
  tags: Array.isArray(it.tags) ? it.tags : [],
  createdAt: it.$updatedAt || it.$createdAt,
});

export default function CreateFoodlistScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // Form state
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('top');
  const [selectedItems, setSelectedItems] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  // Remote items
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load items and enrich restaurant names (ensure session first to avoid auth errors)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await ensureSession();

        // list items
        const res = await db.listDocuments(DB_ID, COL.items, [Query.limit(200)]);
        let docs = (res.documents || []).map(normalizeItemDoc);

        // enrich restaurant names by batching IDs (Appwrite limit: 100)
        const ids = Array.from(new Set(docs.map((d) => d.restaurantId).filter(Boolean)));
        if (ids.length) {
          const chunk = (arr, n) => (arr.length ? [arr.slice(0, n), ...chunk(arr.slice(n), n)] : []);
          const chunks = chunk(ids, 100);
          const nameMap = new Map();

          for (const batch of chunks) {
            const r = await db.listDocuments(DB_ID, COL.restaurants, [Query.equal('$id', batch)]);
            (r.documents || []).forEach((doc) => nameMap.set(doc.$id, doc.name || ''));
          }

          docs = docs.map((d) => ({
            ...d,
            restaurant: nameMap.get(d.restaurantId) || d.restaurant || '',
          }));
        }

        if (!cancelled) setItems(docs);
      } catch (e) {
        console.warn('Failed to load items:', e?.message || e);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // tiny typing debounce for empty state message
  useEffect(() => {
    if (!query) return;
    setIsTyping(true);
    const t = setTimeout(() => setIsTyping(false), 250);
    return () => clearTimeout(t);
  }, [query]);

  const toggleSelectItem = (item) => {
    setSelectedItems((prev) =>
      prev.find((i) => i.id === item.id) ? prev.filter((i) => i.id !== item.id) : [...prev, item]
    );
  };

  const saveFoodlist = async () => {
    if (!name.trim() || selectedItems.length === 0 || saving) return;

    try {
      setSaving(true);
      await ensureSession();

      const user = await account.get();
      const userId = user.$id;

      const payload = {
        name: name.trim(),
        itemIds: selectedItems.map((i) => i.id),
        ownerId: userId,
      };

      const permissions = [
        Permission.read(Role.user(userId)),
        Permission.update(Role.user(userId)),
        Permission.delete(Role.user(userId)),
      ];

      const created = await db.createDocument(
        DB_ID,
        COL.foodlists,
        ID.unique(),
        payload,
        permissions
      );

      // Optimistic local state
      updateFoodlists((prev) => [
        ...prev,
        {
          id: created.$id,
          name: created.name,
          items: selectedItems,
          itemIds: created.itemIds,
          ownerId: userId,
        },
      ]);

      navigation.goBack();
    } catch (err) {
      console.error('❌ Failed to save foodlist:', err);
      Alert.alert('Error', err?.message || 'Failed to save to database.');
    } finally {
      setSaving(false);
    }
  };

  const filteredSortedItems = useMemo(() => {
    let list = items.slice();

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((i) => {
        const name = String(i?.name || '').toLowerCase();
        const rest = String(i?.restaurant || '').toLowerCase();
        const tags = Array.isArray(i?.tags) ? i.tags.join(' ').toLowerCase() : '';
        return name.includes(q) || rest.includes(q) || tags.includes(q);
      });
    }

    switch (sortKey) {
      case 'top':
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'budget':
        list.sort(
          (a, b) =>
            (parsePriceToNumber(a.price) ?? Infinity) -
            (parsePriceToNumber(b.price) ?? Infinity)
        );
        break;
      case 'recent':
        list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      default:
        break;
    }

    return list;
  }, [items, query, sortKey]);

  // ---------- MEMOIZED HEADER ELEMENT ----------
  const HeaderEl = useMemo(() => {
    return (
      <View style={styles.headerWrap}>
        <View style={styles.headerBar}>
          <BackButton onPress={() => navigation.goBack()} />

          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Create Foodlist</Text>
            <Text style={styles.headerSubtitle}>
              {selectedItems.length > 0 ? `${selectedItems.length} selected` : 'Pick your favourites'}
            </Text>
          </View>

          <View style={{ width: 40, height: 40 }} />
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Foodlist name</Text>
          <TextInput
            placeholder="e.g., Lunch under RM20"
            value={name}
            onChangeText={setName}
            style={styles.textInput}
            placeholderTextColor={BRAND.inkMuted}
            accessibilityLabel="Foodlist name"
            returnKeyType="done"
            blurOnSubmit={false}
            onFocus={() => setIsTyping(true)}
            onBlur={() => setIsTyping(false)}
          />
        </View>

        <View style={styles.controls}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={BRAND.inkMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search items, restaurants, or tags"
              placeholderTextColor={BRAND.inkMuted}
              value={query}
              onChangeText={setQuery}
              accessibilityLabel="Search items"
              blurOnSubmit={false}
              onFocus={() => setIsTyping(true)}
              onBlur={() => setIsTyping(false)}
            />
            {query ? (
              <TouchableOpacity
                onPress={() => setQuery('')}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Ionicons name="close-circle" size={18} color={BRAND.inkMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.sortRow}>
            {SORTS.map((s) => {
              const active = s.key === sortKey;
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => setSortKey(s.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`Sort by ${s.label}`}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Select items</Text>
      </View>
    );
    // dependencies that should re-create header element when necessary
  }, [name, selectedItems.length, query, sortKey, navigation]);

  const Empty = () => (
    <View style={styles.empty}>
      <Ionicons name="fast-food-outline" size={42} color={BRAND.inkMuted} />
      <Text style={styles.emptyTitle}>
        {isTyping ? 'Searching…' : loading ? 'Loading…' : 'No matches found'}
      </Text>
      {!loading && (
        <Text style={styles.emptyText}>Try a different keyword or change the sort option.</Text>
      )}
    </View>
  );

  const renderItem = ({ item }) => {
    const isSelected = !!selectedItems.find((i) => i.id === item.id);
    const price = parsePriceToNumber(item?.price);

    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => toggleSelectItem(item)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${isSelected ? 'Deselect' : 'Select'} ${item?.name}`}
      >
        <View style={styles.cardBodyOnly}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{toTitleCase(item?.name)}</Text>
            <Ionicons
              name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={isSelected ? BRAND.primary : BRAND.inkMuted}
            />
          </View>

          <View style={styles.metaRow}>
            {!!item?.restaurant && (
              <View style={styles.metaPill}>
                <Ionicons name="restaurant" size={14} />
                <Text style={styles.metaText}>{toTitleCase(item.restaurant)}</Text>
              </View>
            )}
            {!!item?.rating && (
              <View style={styles.metaPill}>
                <Ionicons name="star" size={14} />
                <Text style={styles.metaText}>{Number(item.rating).toFixed(1)}</Text>
              </View>
            )}
            {price != null && (
              <View style={styles.metaPill}>
                <Ionicons name="pricetag" size={14} />
                <Text style={styles.metaText}>RM {price.toFixed(2)}</Text>
              </View>
            )}
          </View>

          {Array.isArray(item?.tags) && item.tags.length > 0 && (
            <View style={styles.tagRow}>
              {item.tags.slice(0, 3).map((t, idx) => (
                <View key={idx} style={styles.tagChip}>
                  <Text style={styles.tagText}>{toTitleCase(t)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const canSave = name.trim().length > 0 && selectedItems.length > 0 && !saving;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <View style={styles.container}>
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator color={BRAND.primary} />
            </View>
          ) : null}

          <FlatList
            data={filteredSortedItems}
            keyExtractor={(item, idx) => String(item?.id ?? idx)}
            renderItem={renderItem}
            ListHeaderComponent={HeaderEl}               // <-- memoized element
            ListEmptyComponent={<Empty />}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            removeClippedSubviews={false}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
          />

          {/* Safe-bottom action bar (orange) */}
          <View style={[styles.bottomBar, { paddingBottom: 12 + insets.bottom }]}>
            <View style={styles.summary}>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{selectedItems.length}</Text>
              </View>
              <Text style={styles.summaryText}>
                {selectedItems.length === 0
                  ? 'No items selected'
                  : selectedItems.length === 1
                  ? '1 item selected'
                  : `${selectedItems.length} items selected`}
              </Text>
            </View>

            <TouchableOpacity
              onPress={saveFoodlist}
              disabled={!canSave}
              style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Save foodlist"
            >
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Foodlist'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BRAND.bg },
  container: { flex: 1, backgroundColor: BRAND.bg },

  // Header
  headerWrap: { paddingBottom: 6 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.primary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },

  // Name input card
  inputCard: {
    marginTop: 14,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BRAND.line,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  inputLabel: { fontWeight: '700', marginBottom: 8, color: BRAND.ink },
  textInput: {
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    backgroundColor: '#fdfefe',
    color: BRAND.ink,
  },

  // Controls
  controls: { marginTop: 12, paddingHorizontal: 16 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.line,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: BRAND.ink },

  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: BRAND.pillBg,
    borderWidth: 1,
    borderColor: BRAND.line,
  },
  pillActive: { backgroundColor: BRAND.pillActiveBg, borderColor: BRAND.primary },
  pillText: { fontSize: 13, color: BRAND.ink },
  pillTextActive: { color: BRAND.ink, fontWeight: '700' },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 10,
    marginHorizontal: 16,
    color: BRAND.ink,
  },

  // Cards
  card: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BRAND.line,
    overflow: 'hidden',
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardSelected: { borderColor: BRAND.primary, borderWidth: 2 },
  cardBodyOnly: { gap: 8 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: BRAND.ink },

  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BRAND.metaBg,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  metaText: { fontSize: 12, color: BRAND.inkMuted },

  tagRow: { flexDirection: 'row', gap: 6 },
  tagChip: {
    backgroundColor: '#fff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND.line,
  },
  tagText: { fontSize: 12, color: BRAND.ink },

  // Empty
  empty: { paddingHorizontal: 24, paddingVertical: 48, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: BRAND.ink, marginTop: 6 },
  emptyText: { fontSize: 13, color: BRAND.inkMuted, textAlign: 'center' },

  // Bottom bar (orange)
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: BRAND.primary,
    borderTopWidth: 1,
    borderTopColor: BRAND.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  countBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: BRAND.badgeBg,
    borderWidth: 1,
    borderColor: BRAND.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { color: BRAND.primary, fontWeight: '800' },
  summaryText: { color: '#fff', fontWeight: '700' },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BRAND.accent,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  saveBtnDisabled: { backgroundColor: BRAND.disabled },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
