// screens/FoodlistDetailScreen.js
import React, { useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { availableItems, mockUsers } from '../data/mockData';
import BackButton from '../components/BackButton';

const BRAND = {
  primary: '#FF4D00',
  bg: '#FFF5ED',
  surface: '#FFFFFF',
  line: '#FFE8D2',
  ink: '#3C1E12',
  inkMuted: '#6B4A3F',
  metaBg: '#FFE8D2',
  accent: '#FFD4AF',
  success: '#16a34a',
  danger: '#ef4444',
  warn: '#fb923c',
  slate: '#111827',
  gray: '#6b7280',
  overlay: 'rgba(255,255,255,0.2)',
};

const parsePriceToNumber = (price) => {
  if (!price) return null;
  const numeric = parseFloat(String(price).replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
};

export default function FoodlistDetailScreen({ route, navigation }) {
  const { foodlist, setFoodlists } = route.params;
  const insets = useSafeAreaInsets();

  const [currentList, setCurrentList] = useState({
    ...foodlist,
    items: (foodlist?.items ?? []).filter(Boolean),
    members: Array.isArray(foodlist?.members) ? [...foodlist.members] : [],
  });
  const [addingItems, setAddingItems] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState([]);
  const [selectedToRemove, setSelectedToRemove] = useState([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [contributorsOpen, setContributorsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(''), 1800);
  };

  // Items available to add
  const itemsAvailableToAdd = useMemo(
    () => availableItems.filter((it) => !currentList.items.find((i) => i.id === it.id)),
    [currentList.items]
  );

  const priceStats = useMemo(() => {
    const items = Array.isArray(currentList.items) ? currentList.items : [];
    let total = 0;
    let count = 0;
    let cheapest = Infinity;
    items.forEach((item) => {
      const price = parsePriceToNumber(item?.price);
      if (price !== null) {
        total += price;
        count += 1;
        if (price < cheapest) cheapest = price;
      }
    });
    return {
      total: items.length,
      avg: count > 0 ? (total / count).toFixed(2) : null,
      cheapest: Number.isFinite(cheapest) ? cheapest.toFixed(2) : null,
    };
  }, [currentList.items]);

  // Toggle selections
  const toggleAdd = (item) => {
    setSelectedToAdd((prev) =>
      prev.find((i) => i.id === item.id) ? prev.filter((i) => i.id !== item.id) : [...prev, item]
    );
  };

  const toggleRemove = (item) => {
    setSelectedToRemove((prev) =>
      prev.find((i) => i.id === item.id) ? prev.filter((i) => i.id !== item.id) : [...prev, item]
    );
  };

  // Confirm actions
  const confirmRemove = () => {
    if (selectedToRemove.length === 0) return;
    Alert.alert(
      'Remove Items',
      `Remove ${selectedToRemove.length} item(s) from this list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedItems = currentList.items.filter(
              (item) => !selectedToRemove.find((i) => i.id === item.id)
            );
            const updatedList = { ...currentList, items: updatedItems };
            setCurrentList(updatedList);
            setFoodlists((prev) => prev.map((f) => (f.id === currentList.id ? updatedList : f)));
            setSelectedToRemove([]);
            showToast('Removed');
          },
        },
      ]
    );
  };

  const confirmAdd = () => {
    if (selectedToAdd.length === 0) return;
    const updatedItems = [...currentList.items, ...selectedToAdd];
    const updatedList = { ...currentList, items: updatedItems };
    setCurrentList(updatedList);
    setFoodlists((prev) => prev.map((f) => (f.id === currentList.id ? updatedList : f)));
    setSelectedToAdd([]);
    setAddingItems(false);
    showToast('Added');
  };

  const deleteList = () => {
    Alert.alert(
      'Delete Foodlist',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setFoodlists((prev) => prev.filter((f) => f.id !== currentList.id));
            navigation.goBack();
          },
        },
      ]
    );
  };

  // Header
  const Header = () => {
    const heroStats = [
      { label: 'Items', value: String(priceStats.total) },
      {
        label: 'Average price',
        value: priceStats.avg ? `RM${priceStats.avg}` : '--',
      },
      {
        label: 'Cheapest',
        value: priceStats.cheapest ? `RM${priceStats.cheapest}` : '--',
      },
    ];

    const collaborators = currentList.members?.length || 0;
    const heroMetaParts = [
      `${priceStats.total} item${priceStats.total === 1 ? '' : 's'}`,
    ];
    if (collaborators > 0) {
      heroMetaParts.push(`${collaborators} collaborator${collaborators === 1 ? '' : 's'}`);
    }

    return (
      <View style={styles.headerWrap}>
        <View style={styles.headerBar}>
          <BackButton onPress={() => navigation.goBack()} />

          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Foodlist</Text>
            <Text style={styles.headerSubtitle}>{heroMetaParts.join(' | ')}</Text>
          </View>

          <View style={styles.headerRight}>
            {!!collaborators && (
              <TouchableOpacity
                onPress={() => setContributorsOpen(true)}
                style={[styles.headerChip, { backgroundColor: BRAND.overlay }]}
                accessibilityLabel="View contributors"
              >
                <Ionicons name="people" size={16} color="#fff" />
                <Text style={styles.headerChipText}>{collaborators}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Curating</Text>
          <Text style={styles.heroTitle}>{currentList.name}</Text>
          <Text style={styles.heroMeta}>{heroMetaParts.join(' | ')}</Text>

          <View style={styles.heroStatsRow}>
            {heroStats.map((stat) => (
              <View key={stat.label} style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>{stat.label}</Text>
                <Text style={styles.heroStatValue}>{stat.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.heroActionRow}>
            <TouchableOpacity
              style={styles.heroActionPrimary}
              onPress={() => setAddingItems(true)}
              accessibilityRole="button"
              accessibilityLabel="Add items"
            >
              <Ionicons name="add-circle" size={16} color={BRAND.primary} />
              <Text style={styles.heroActionPrimaryText}>Add items</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroActionSecondary}
              onPress={() => setInviteOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Invite collaborators"
            >
              <Ionicons name="mail-outline" size={16} color={BRAND.primary} />
              <Text style={styles.heroActionSecondaryText}>Share invite</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Item card
  const renderItem = ({ item }) => {
    const selected = !!selectedToRemove.find((i) => i.id === item.id);
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('FoodItemDetail', { item })}
        onLongPress={() => toggleRemove(item)}
        style={[styles.card, selected && styles.cardSelected]}
      >
        <View style={styles.cardRow}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Ionicons
            name={selected ? 'checkmark-circle' : 'chevron-forward'}
            size={selected ? 20 : 18}
            color={selected ? BRAND.primary : BRAND.inkMuted}
          />
        </View>
        <View style={styles.metaRow}>
          {!!item.restaurant && (
            <View style={styles.metaPill}>
              <Ionicons name="restaurant" size={14} color={BRAND.primary} />
              <Text style={styles.metaText}>{item.restaurant}</Text>
            </View>
          )}
          {!!item.location && (
            <View style={styles.metaPill}>
              <Ionicons name="location" size={14} color={BRAND.primary} />
              <Text style={styles.metaText}>{item.location}</Text>
            </View>
          )}
          {!!item.price && (
            <View style={styles.metaPill}>
              <Ionicons name="pricetag" size={14} color={BRAND.primary} />
              <Text style={styles.metaText}>{item.price}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Add-mode item card
  const renderAddItem = ({ item }) => {
    const selected = !!selectedToAdd.find((i) => i.id === item.id);
    return (
      <TouchableOpacity
        onPress={() => toggleAdd(item)}
        style={[styles.card, selected && styles.cardSelectedAdd]}
      >
        <View style={styles.cardRow}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Ionicons
            name={selected ? 'checkmark-circle' : 'ellipse-outline'}
            size={20}
            color={selected ? BRAND.primary : BRAND.inkMuted}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const InviteModal = () => (
    <Modal visible={inviteOpen} transparent animationType="slide" onRequestClose={() => setInviteOpen(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.bottomSheet}>
          <Text style={styles.sheetTitle}>Invite collaborators</Text>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={BRAND.inkMuted} />
            <TextInput
              placeholder="Search username"
              placeholderTextColor={BRAND.inkMuted}
              style={styles.searchInput}
              value={inviteQuery}
              onChangeText={setInviteQuery}
              autoFocus
            />
            {!!inviteQuery && (
              <TouchableOpacity onPress={() => setInviteQuery('')}>
                <Ionicons name="close-circle" size={18} color={BRAND.inkMuted} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={mockUsers.filter(
              (u) =>
                !currentList.members?.some((m) => String(m).toLowerCase() === u.name.toLowerCase()) &&
                u.name.toLowerCase().includes(inviteQuery.toLowerCase())
            )}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  const updated = { ...currentList, members: [...(currentList.members || []), item.name] };
                  setCurrentList(updated);
                  setFoodlists((prev) => prev.map((f) => (f.id === currentList.id ? updated : f)));
                  showToast('Invitation sent');
                }}
                style={styles.listRow}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.name.split(/\s+/).map((p) => p[0]?.toUpperCase()).slice(0, 2).join('')}
                  </Text>
                </View>
                <Text style={styles.rowText}>{item.name}</Text>
                <Text style={[styles.rowAction, { color: BRAND.success }]}>Invite</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyHint}>No users found</Text>}
            style={{ marginTop: 6 }}
          />

          <TouchableOpacity onPress={() => setInviteOpen(false)} style={[styles.primaryBtn, { backgroundColor: BRAND.slate }]}>
            <Text style={styles.primaryBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const ContributorsModal = () => (
    <Modal visible={contributorsOpen} transparent animationType="fade" onRequestClose={() => setContributorsOpen(false)}>
      <View style={[styles.modalOverlay, { justifyContent: 'center', padding: 24 }]}>
        <View style={styles.centerSheet}>
          <Text style={styles.sheetTitle}>Contributors</Text>
          <FlatList
            data={(currentList.members || []).map((m, idx) => ({ id: `${idx}-${m}`, name: m }))}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.listRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.name.split(/\s+/).map((p) => p[0]?.toUpperCase()).slice(0, 2).join('')}
                  </Text>
                </View>
                <Text style={styles.rowText}>{item.name}</Text>
              </View>
            )}
            ListEmptyComponent={null}
            style={{ marginTop: 6 }}
          />
          <TouchableOpacity onPress={() => setContributorsOpen(false)} style={[styles.primaryBtn, { backgroundColor: BRAND.slate }]}>
            <Text style={styles.primaryBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const Toast = () => (
    <Modal visible={!!toastMessage} transparent animationType="fade" statusBarTranslucent presentationStyle="overFullScreen">
      <View pointerEvents="none" style={styles.toastWrap}>
        <View style={styles.toastBox}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{toastMessage}</Text>
        </View>
      </View>
    </Modal>
  );

  const hasRemoveSelection = selectedToRemove.length > 0;
  const hasAddSelection = selectedToAdd.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <FlatList
        data={addingItems ? itemsAvailableToAdd : currentList.items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<Header />}
        ListHeaderComponentStyle={{ paddingBottom: 16 }}
        renderItem={addingItems ? renderAddItem : renderItem}
        contentContainerStyle={{ paddingBottom: 160 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <Text style={styles.emptyHint}>
            {addingItems ? 'No items available to add' : 'No items in this list yet'}
          </Text>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Sticky bottom actions with safe frame */}
      <View style={[styles.bottomBar, { paddingBottom: 12 + insets.bottom }]}>
        {!addingItems ? (
          <>
            {hasRemoveSelection ? (
              <TouchableOpacity onPress={confirmRemove} style={[styles.primaryBtn, { backgroundColor: BRAND.warn, flex: 1 }]}>
                <Ionicons name="trash" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>
                  Remove {selectedToRemove.length > 1 ? 'Selected Items' : 'Selected'}
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => setAddingItems(true)}
                  style={[styles.primaryBtn, { backgroundColor: BRAND.slate, flex: 1 }]}
                >
                  <Ionicons name="add-circle" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>Add Items</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={deleteList} style={[styles.primaryBtn, { backgroundColor: BRAND.danger, marginLeft: 12 }]}>
                  <Ionicons name="trash" size={18} color="#fff" />
                </TouchableOpacity>
              </>
            )}
          </>
        ) : (
          <>
            <View style={styles.countBadge}>
              <Text style={[styles.countText, { color: BRAND.primary }]}>{selectedToAdd.length}</Text>
            </View>
            <TouchableOpacity
              onPress={confirmAdd}
              disabled={!hasAddSelection}
              style={[
                styles.primaryBtn,
                { backgroundColor: hasAddSelection ? BRAND.primary : BRAND.accent, flex: 1, marginLeft: 12 },
              ]}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Confirm Add</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setAddingItems(false); setSelectedToAdd([]); }} style={[styles.primaryBtn, { backgroundColor: BRAND.gray, marginLeft: 12 }]}>
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </View>

      <InviteModal />
      <ContributorsModal />
      <Toast />
  </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BRAND.bg },
  container: { flex: 1, backgroundColor: BRAND.bg },
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
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    fontWeight: '600',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  headerChipText: { color: '#FFFFFF', marginLeft: 6, fontWeight: '700' },
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
  heroTitle: { fontSize: 24, fontWeight: '800', color: BRAND.ink, marginTop: 6 },
  heroMeta: { color: BRAND.inkMuted, fontSize: 14, marginTop: 6, fontWeight: '600' },
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
  heroActionRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  heroActionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.accent,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginRight: 12,
    marginBottom: 10,
  },
  heroActionPrimaryText: { marginLeft: 8, color: BRAND.primary, fontWeight: '700' },
  heroActionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BRAND.line,
    marginBottom: 10,
  },
  heroActionSecondaryText: { marginLeft: 8, color: BRAND.primary, fontWeight: '700' },
  card: {
    backgroundColor: BRAND.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BRAND.line,
    padding: 16,
    marginHorizontal: 16,
    shadowColor: BRAND.primary,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardSelected: { borderColor: BRAND.primary, borderWidth: 2 },
  cardSelectedAdd: { borderColor: BRAND.primary, borderWidth: 2, borderStyle: 'dashed' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: BRAND.ink },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, marginRight: -10 },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.metaBg,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.line,
    marginRight: 10,
    marginBottom: 8,
  },
  metaText: { fontSize: 12, color: BRAND.inkMuted, marginLeft: 4, fontWeight: '600' },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: BRAND.surface,
    borderTopWidth: 1,
    borderTopColor: BRAND.line,
    shadowColor: BRAND.primary,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  summary: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  countBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BRAND.metaBg,
    borderWidth: 1,
    borderColor: BRAND.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  countText: { fontWeight: '800', color: BRAND.primary },
  summaryText: { fontWeight: '700', color: BRAND.ink, fontSize: 14 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: BRAND.primary,
    shadowColor: BRAND.primary,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  bottomSheet: {
    backgroundColor: BRAND.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: BRAND.line,
  },
  centerSheet: {
    backgroundColor: BRAND.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: BRAND.line,
    maxHeight: '70%',
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: BRAND.ink },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.line,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: BRAND.ink, marginLeft: 8 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND.metaBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontWeight: '700', color: BRAND.primary },
  rowText: { flex: 1, color: BRAND.ink, fontSize: 15 },
  rowAction: { fontWeight: '700' },
  emptyHint: { textAlign: 'center', color: BRAND.inkMuted, marginTop: 20 },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 100, alignItems: 'center' },
  toastBox: { backgroundColor: 'rgba(17,24,39,0.92)', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
});

