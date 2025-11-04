// screens/FoodlistDetailScreen.js
import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '../components/BackButton';

// ✅ Appwrite client
import { db, DB_ID, COL } from '../appwrite';
import { Query } from 'appwrite';
import {
  getFoodlists,
  updateFoodlist as updateFoodlistStore,
  removeFoodlist as removeFoodlistFromStore,
} from '../state/foodlistsStore';

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

const toRM = (n) =>
  n == null || Number.isNaN(Number(n)) ? 'RM0' : `RM${Number(n)}`;

const parsePriceToNumber = (price) => {
  if (!price) return null;
  const numeric = parseFloat(String(price).replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
};

const EMPTY_FOODLIST = {
  id: null,
  $id: null,
  name: '',
  description: '',
  items: [],
  itemIds: [],
  members: [],
};

const normalizeFoodlistDoc = (raw) => {
  if (!raw) return { ...EMPTY_FOODLIST };
  const items = Array.isArray(raw.items) ? [...raw.items] : [];
  const itemIds = Array.isArray(raw.itemIds) && raw.itemIds.length
    ? raw.itemIds.filter(Boolean)
    : items.map((item) => item && item.id).filter(Boolean);
  const members = Array.isArray(raw.members) ? [...raw.members] : [];
  const id = raw.id ?? raw.$id ?? null;
  return {
    ...raw,
    id,
    items,
    itemIds,
    members,
  };
};

export default function FoodlistDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { foodlist, foodlistId, setFoodlists } = route.params ?? {};

  const initialDoc = useMemo(() => {
    if (foodlist) return foodlist;
    if (foodlistId) {
      const local = getFoodlists().find(
        (f) => f.id === foodlistId || f.$id === foodlistId
      );
      if (local) return local;
    }
    return null;
  }, [foodlist, foodlistId]);

  const [currentList, setCurrentList] = useState(() => normalizeFoodlistDoc(initialDoc));
  const [loadingDoc, setLoadingDoc] = useState(!initialDoc && Boolean(foodlistId));

  useEffect(() => {
    if (foodlist) {
      setCurrentList(normalizeFoodlistDoc(foodlist));
      setLoadingDoc(false);
      return;
    }

    if (initialDoc) {
      setCurrentList(normalizeFoodlistDoc(initialDoc));
      setLoadingDoc(false);
      return;
    }

    if (!foodlistId) {
      setLoadingDoc(false);
      return;
    }

    let cancelled = false;
    setLoadingDoc(true);
    (async () => {
      try {
        const doc = await db.getDocument(DB_ID, COL.foodlists, foodlistId);
        if (!cancelled) {
          setCurrentList(normalizeFoodlistDoc(doc));
        }
      } catch (e) {
        if (!cancelled) {
          console.warn('Failed to load foodlist', e?.message || e);
        }
      } finally {
        if (!cancelled) setLoadingDoc(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [foodlist, foodlistId, initialDoc]);

  // Remote items (all items so user can add)
  const [allItems, setAllItems] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingAll, setLoadingAll] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const syncLocalFoodlists = useCallback((nextList) => {
    const normalized = normalizeFoodlistDoc(nextList);
    if (normalized.id) {
      updateFoodlistStore(normalized);
    }
    if (setFoodlists) {
      const targetId = normalized.$id || normalized.id;
      setFoodlists((prev) =>
        prev.map((f) => {
          const fid = f.$id || f.id;
          return fid === targetId ? normalized : f;
        })
      );
    }
  }, [setFoodlists]);

  const removeLocalFoodlist = useCallback((listId) => {
    if (listId) {
      removeFoodlistFromStore(listId);
    }
    if (setFoodlists) {
      setFoodlists((prev) =>
        prev.filter((f) => {
          const fid = f.$id || f.id;
          return fid !== listId;
        })
      );
    }
  }, [setFoodlists]);

  // -------- Fetch helpers ----------
  const normalizeItemDoc = useCallback((it) => ({
    id: it.$id,
    name: it.name,
    type: it.type || 'other',
    price: toRM(it.priceRM),
    cuisine: it.cuisine || '',
    rating: it.rating ?? null,
    restaurant: it.restaurantName || '', // optional if you stored it
    location: it.restaurantLocation || '', // optional if you stored it
    tags: Array.isArray(it.tags) ? it.tags : [],
    description: it.description || '',
    restaurantId: it.restaurantId || null,
    menuId: it.menuId || null,
  }), []);

  // Load items inside this list (by itemIds)
  useEffect(() => {
    let cancelled = false;
    async function loadListItems() {
      try {
        setLoadingList(true);
        const itemIds = Array.isArray(currentList?.itemIds)
          ? currentList.itemIds.filter(Boolean)
          : [];
        if (itemIds.length === 0) {
          if (!cancelled) {
            setCurrentList((prev) => ({ ...prev, items: [] }));
            setLoadingList(false);
          }
          return;
        }

        // Appwrite supports Query.equal with array ("IN"-like semantics for IDs)
        // If you have >100 IDs, you might need to chunk; simple path here
        const res = await db.listDocuments(DB_ID, COL.items, [Query.equal('$id', itemIds)]);
        const items = (res.documents || []).map(normalizeItemDoc);
        if (!cancelled) {
          setCurrentList((prev) => ({ ...prev, items }));
        }
      } catch (e) {
        console.warn('Failed to load list items:', e?.message || e);
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    }
    loadListItems();
    return () => { cancelled = true; };
  }, [currentList.itemIds, normalizeItemDoc]);

  // Load all items user can add
  useEffect(() => {
    let cancelled = false;
    async function loadAllItems() {
      try {
        setLoadingAll(true);
        // basic: get first 100; you can paginate if needed
        const res = await db.listDocuments(DB_ID, COL.items, [Query.limit(100)]);
        const items = (res.documents || []).map(normalizeItemDoc);
        if (!cancelled) setAllItems(items);
      } catch (e) {
        console.warn('Failed to load all items:', e?.message || e);
      } finally {
        if (!cancelled) setLoadingAll(false);
      }
    }
    loadAllItems();
    return () => { cancelled = true; };
  }, [normalizeItemDoc]);

  // Items available to add = allItems minus ones already in list
  const itemsAvailableToAdd = useMemo(() => {
    const existingIds = new Set((currentList.items || []).map((i) => i.id));
    return allItems.filter((it) => !existingIds.has(it.id));
  }, [allItems, currentList.items]);

  // Price stats for current list
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

  // Selection toggles
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

  // ---- Persist to Appwrite: helpers ----
  const updateFoodlistItemIds = async (newIds) => {
    const targetId = currentList.$id;
    if (!targetId) return;
    await db.updateDocument(DB_ID, COL.foodlists, targetId, {
      itemIds: newIds,
    });
  };

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
          onPress: async () => {
            try {
              setSaving(true);
              const updatedItems = currentList.items.filter(
                (item) => !selectedToRemove.find((i) => i.id === item.id)
              );
              const updatedIds = updatedItems.map((i) => i.id);

              await updateFoodlistItemIds(updatedIds);

              const updatedList = { ...currentList, items: updatedItems, itemIds: updatedIds };
              setCurrentList(updatedList);
              syncLocalFoodlists(updatedList);
              setSelectedToRemove([]);
              showToast('Removed');
            } catch (e) {
              Alert.alert('Error', e?.message || 'Failed to update list');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const confirmAdd = async () => {
    if (selectedToAdd.length === 0) return;
    try {
      setSaving(true);
      const updatedItems = [...currentList.items, ...selectedToAdd];
      const updatedIds = updatedItems.map((i) => i.id);

      await updateFoodlistItemIds(updatedIds);

      const updatedList = { ...currentList, items: updatedItems, itemIds: updatedIds };
      setCurrentList(updatedList);
      syncLocalFoodlists(updatedList);
      setSelectedToAdd([]);
      setAddingItems(false);
      showToast('Added');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to add items');
    } finally {
      setSaving(false);
    }
  };

  const deleteList = async () => {
    Alert.alert(
      'Delete Foodlist',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              const targetId = currentList.$id || currentList.id;
              if (currentList.$id) {
                await db.deleteDocument(DB_ID, COL.foodlists, currentList.$id);
              }
              removeLocalFoodlist(targetId);
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', e?.message || 'Failed to delete list');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  // ---- Header ----
  const Header = () => {
    const heroStats = [
      { label: 'Items', value: String(priceStats.total) },
      { label: 'Average price', value: priceStats.avg ? `RM${priceStats.avg}` : '--' },
      { label: 'Cheapest', value: priceStats.cheapest ? `RM${priceStats.cheapest}` : '--' },
    ];

    const collaborators = currentList.members?.length || 0;
    const heroMetaParts = [`${priceStats.total} item${priceStats.total === 1 ? '' : 's'}`];
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
              disabled={loadingAll}
            >
              <Ionicons name="add-circle" size={16} color={BRAND.primary} />
              <Text style={styles.heroActionPrimaryText}>
                {loadingAll ? 'Loading…' : 'Add items'}
              </Text>
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
        onPress={() => navigation.navigate('FoodItemDetail', { itemId: item.id })}
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

  // Invite: local-only (schema doesn’t have members)
  const InviteModal = () => (
    <Modal
      visible={inviteOpen}
      transparent
      animationType="slide"
      onRequestClose={() => setInviteOpen(false)}
    >
      <View style={styles.modalOverlay}>
        <View className="sheet" style={styles.bottomSheet}>
          <Text style={styles.sheetTitle}>Invite collaborators</Text>
          <Text style={{ color: BRAND.inkMuted, marginTop: 6 }}>
            Your backend doesn’t have a <Text style={{ fontWeight: '700' }}>members</Text> field yet,
            so invites are local-only. Add a <Text style={{ fontWeight: '700' }}>members (array)</Text> string attribute in the <Text style={{ fontWeight: '700' }}>foodlists</Text> collection to persist.
          </Text>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={BRAND.inkMuted} />
            <TextInput
              placeholder="Type a name and press Invite"
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

          <TouchableOpacity
            onPress={() => {
              const v = inviteQuery.trim();
              if (!v) return;
              const updated = { ...currentList, members: [...(currentList.members || []), v] };
              setCurrentList(updated);
              // Not persisted: reflect in local caches so other screens stay in sync
              syncLocalFoodlists(updated);
              setInviteQuery('');
              showToast('Invitation added (local)');
            }}
            style={[styles.primaryBtn, { backgroundColor: BRAND.slate, marginTop: 12 }]}
          >
            <Ionicons name="send" size={18} color="#fff" />
            <Text style={[styles.primaryBtnText, { marginLeft: 8 }]}>Invite</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setInviteOpen(false)}
            style={[styles.primaryBtn, { backgroundColor: BRAND.slate, marginTop: 12 }]}
          >
            <Text style={styles.primaryBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const ContributorsModal = () => (
    <Modal
      visible={contributorsOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setContributorsOpen(false)}
    >
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
                    {item.name
                      .split(/\s+/)
                      .map((p) => p[0]?.toUpperCase())
                      .slice(0, 2)
                      .join('')}
                  </Text>
                </View>
                <Text style={styles.rowText}>{item.name}</Text>
              </View>
            )}
            ListEmptyComponent={null}
            style={{ marginTop: 6 }}
          />
          <TouchableOpacity
            onPress={() => setContributorsOpen(false)}
            style={[styles.primaryBtn, { backgroundColor: BRAND.slate }]}
          >
            <Text style={styles.primaryBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const Toast = () => (
    <Modal
      visible={!!toastMessage}
      transparent
      animationType="fade"
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View pointerEvents="none" style={styles.toastWrap}>
        <View style={styles.toastBox}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{toastMessage}</Text>
        </View>
      </View>
    </Modal>
  );

  const hasRemoveSelection = selectedToRemove.length > 0;
  const hasAddSelection = selectedToAdd.length > 0;

  const dataToRender = addingItems ? itemsAvailableToAdd : currentList.items;
  const isLoadingListOrAll = loadingDoc || (addingItems ? loadingAll : loadingList);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      {isLoadingListOrAll ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="small" color={BRAND.primary} />
          <Text style={{ marginTop: 8, color: BRAND.inkMuted }}>
            {addingItems ? 'Loading items…' : 'Loading list…'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={dataToRender}
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
      )}

      {/* Sticky bottom actions with safe frame */}
      <View style={[styles.bottomBar, { paddingBottom: 12 + insets.bottom }]}>
        {!addingItems ? (
          <>
            {hasRemoveSelection ? (
              <TouchableOpacity
                onPress={confirmRemove}
                disabled={saving}
                style={[styles.primaryBtn, { backgroundColor: BRAND.warn, flex: 1, opacity: saving ? 0.6 : 1 }]}
              >
                <Ionicons name="trash" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>
                  Remove {selectedToRemove.length > 1 ? 'Selected Items' : 'Selected'}
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => setAddingItems(true)}
                  disabled={loadingAll}
                  style={[styles.primaryBtn, { backgroundColor: BRAND.slate, flex: 1, opacity: loadingAll ? 0.6 : 1 }]}
                >
                  <Ionicons name="add-circle" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>Add Items</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={deleteList}
                  disabled={saving}
                  style={[styles.primaryBtn, { backgroundColor: BRAND.danger, marginLeft: 12, opacity: saving ? 0.6 : 1 }]}
                >
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
              disabled={!hasAddSelection || saving}
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: hasAddSelection ? BRAND.primary : BRAND.accent,
                  flex: 1,
                  marginLeft: 12,
                  opacity: saving ? 0.6 : 1,
                },
              ]}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Confirm Add</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setAddingItems(false);
                setSelectedToAdd([]);
              }}
              disabled={saving}
              style={[styles.primaryBtn, { backgroundColor: BRAND.gray, marginLeft: 12, opacity: saving ? 0.6 : 1 }]}
            >
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
  emptyHint: { textAlign: 'center', color: BRAND.inkMuted, marginTop: 20 },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 100, alignItems: 'center' },
  toastBox: { backgroundColor: 'rgba(17,24,39,0.92)', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
});
