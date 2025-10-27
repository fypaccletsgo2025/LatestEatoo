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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { availableItems } from '../data/mockData';

const BRAND = {
  primary: '#FF4D00',   // bold orange
  accent: '#FDAA48',    // light orange (buttons/pills)
  bg: '#f7f4f2',        // cream
  ink: '#222',          // main text
  inkMuted: '#666',     // muted text
  line: '#e6e0dc',      // borders
  pillBg: '#fff7f2',    // subtle pill bg
  pillActiveBg: '#FFD8BF', // active pill bg
  metaBg: '#FFF3E9',    // meta pill bg
  badgeBg: '#FFD8BF',   // count badge
  disabled: '#F7B890',  // disabled orange
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
  const normalized = String(value)
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return normalized.replace(/\b\w/g, (c) => c.toUpperCase());
};

export default function CreateFoodlistScreen({ route, navigation }) {
  const { setFoodlists } = route.params;
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('top');
  const [selectedItems, setSelectedItems] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!query) return;
    setIsTyping(true);
    const t = setTimeout(() => setIsTyping(false), 250);
    return () => clearTimeout(t);
  }, [query]);

  const toggleSelectItem = (item) => {
    setSelectedItems((prev) =>
      prev.find((i) => i.id === item.id)
        ? prev.filter((i) => i.id !== item.id)
        : [...prev, item]
    );
  };

  const saveFoodlist = () => {
    if (!name.trim() || selectedItems.length === 0) return;

    const newList = {
      id: Date.now().toString(),
      name: name.trim(),
      items: selectedItems,
      members: [],
      createdAt: new Date().toISOString(),
    };

    setFoodlists((prev) => [...prev, newList]);
    navigation.goBack();
  };

  const filteredSortedItems = useMemo(() => {
    let list = Array.isArray(availableItems) ? availableItems.slice() : [];

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
  }, [query, sortKey]);

  const Header = () => (
    <View style={styles.headerWrap}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Create Foodlist</Text>
          <Text style={styles.headerSubtitle}>
            {selectedItems.length > 0
              ? `${selectedItems.length} selected`
              : 'Pick your favourites'}
          </Text>
        </View>

        <View style={{ width: 36, height: 36 }} />
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
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Select items</Text>
    </View>
  );

  const Empty = () => (
    <View style={styles.empty}>
      <Ionicons name="fast-food-outline" size={42} color={BRAND.inkMuted} />
      <Text style={styles.emptyTitle}>
        {isTyping ? 'Searching…' : 'No matches found'}
      </Text>
      <Text style={styles.emptyText}>
        Try a different keyword or change the sort option.
      </Text>
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
                <Text style={styles.metaText}>{item.rating.toFixed(1)}</Text>
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

  const canSave = name.trim().length > 0 && selectedItems.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top}
      >
        <View style={styles.container}>
          <FlatList
            data={filteredSortedItems}
            keyExtractor={(item, idx) => String(item?.id ?? idx)}
            renderItem={renderItem}
            ListHeaderComponent={<Header />}
            ListEmptyComponent={<Empty />}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />

          {/* Safe-bottom action bar (orange) */}
          <View
            style={[
              styles.bottomBar,
              { paddingBottom: 12 + insets.bottom },
            ]}
          >
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
              <Text style={styles.saveBtnText}>Save Foodlist</Text>
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
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
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

  // Cards (no image)
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

  // Bottom bar (orange) with safe frame
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
