import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ID, Query, Permission, Role } from 'appwrite';

// Shared design from RestaurantDetail page
import { BRAND, styles as detailStyles } from '../LocationNav/RestaurantDetailScreen.styles';
import { Badge, Chip, Section } from '../LocationNav/RestaurantDetailScreen.ui';
import { STAR } from '../LocationNav/RestaurantDetailScreen.constants';
import BackButton from '../components/BackButton';
import { db, DB_ID, COL, ensureSession, account } from '../appwrite';
import { addUserItem } from '../state/userMenusStore';

const parsePriceValue = (value) => {
  if (value == null) return null;
  const numeric = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
};

const formatPriceText = (value) => {
  if (!Number.isFinite(value)) return 'RM-';
  const fixed = Number(value).toFixed(2);
  return fixed.endsWith('.00') ? `RM${Number(value)}` : `RM${fixed}`;
};

const toTitleCase = (value) => {
  if (!value) return '';
  return String(value)
    .split(' ')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : ''))
    .join(' ')
    .trim();
};

// Normalize restaurant IDs (strip request prefixes like "req-")
const normalizeRestaurantId = (value) => {
  if (!value) return '';
  const str = String(value).trim();
  return str.replace(/^req-/i, '');
};

const normalizeItemForUi = (doc = {}, restaurant) => {
  const priceValue =
    typeof doc.priceRM === 'number' ? doc.priceRM : parsePriceValue(doc.price || doc.priceText);
  const priceText = formatPriceText(priceValue);
  const rid = normalizeRestaurantId(
    restaurant?.id || restaurant?.$id || doc.restaurantId || doc.restaurant_id || doc.restaurant?.$id || '',
  );

  return {
    id: doc.$id || doc.id || `local-${Date.now()}`,
    name: doc.name || 'Untitled item',
    type: doc.type || 'meal',
    price: priceText === 'RM-' && doc.price ? doc.price : priceText,
    description: doc.description || '',
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    rating: typeof doc.rating === 'number' ? doc.rating : null,
    restaurant: restaurant?.name || doc.restaurantName || '',
    restaurantId: rid,
    location: restaurant?.location || doc.restaurantLocation || '',
  };
};

// Remove non-serializable values (functions, class instances) from navigation params
const stripFunctions = (value) => {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stripFunctions);
  const out = {};
  Object.keys(value).forEach((key) => {
    const v = value[key];
    if (typeof v === 'function') return;
    out[key] = typeof v === 'object' && v !== null ? stripFunctions(v) : v;
  });
  return out;
};

// Ensure restaurant object carries a normalized id
const normalizeRestaurantEntity = (value) => {
  const base = stripFunctions(value);
  if (!base) return base;
  const rid = normalizeRestaurantId(
    base.$id ||
      base.id ||
      base.restaurantId ||
      base.restaurant_id ||
      base.restaurant?.$id ||
      base.restaurant?.id,
  );
  return rid ? { ...base, id: rid, $id: rid } : base;
};

export default function ManageRestaurantScreen({ route }) {
  const navigation = useNavigation();
  const restaurant = useMemo(
    () => normalizeRestaurantEntity(route?.params?.restaurant) || null,
    [route?.params?.restaurant],
  );
  const items = useMemo(
    () => stripFunctions(route?.params?.items) || [],
    [route?.params?.items],
  );
  const restaurantIdOverride = useMemo(
    () => normalizeRestaurantId(route?.params?.restaurantId || null),
    [route?.params?.restaurantId],
  );
  const statusDetails = route?.params?.statusDetails || null;
  const isOwner = route?.params?.isOwner ?? true;

  const [showStatusModal, setShowStatusModal] = useState(false);

  const statusTone =
    (statusDetails?.status || '').toLowerCase() === 'approved'
      ? BRAND.primary
      : (statusDetails?.status || '').toLowerCase() === 'rejected'
      ? '#EF4444'
      : BRAND.ink;

  return (
    <SafeAreaView style={detailStyles.screen} edges={['top', 'right', 'bottom', 'left']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={manageStyles.topBar}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={manageStyles.topBarTitle}>
            {isOwner ? 'Manage Restaurant' : 'Restaurant Overview'}
          </Text>
          {statusDetails ? (
            <TouchableOpacity
              style={manageStyles.infoPill}
              onPress={() => setShowStatusModal(true)}
            >
              <Ionicons name="document-text-outline" size={16} color={statusTone} />
              <Text style={[manageStyles.infoPillText, { color: statusTone }]}>Submission</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <ManageRestaurantPanel
          restaurant={restaurant}
          canEdit={isOwner}
          items={items}
          restaurantIdOverride={restaurantIdOverride}
        />
      </ScrollView>

      {statusDetails && (
        <Modal
          transparent
          visible={showStatusModal}
          animationType="fade"
          onRequestClose={() => setShowStatusModal(false)}
        >
          <View style={manageStyles.modalOverlay}>
            <TouchableOpacity
              style={manageStyles.modalBackdrop}
              onPress={() => setShowStatusModal(false)}
            />
            <View style={manageStyles.statusCard}>
              <View style={manageStyles.modalHandle} />
              <View style={manageStyles.modalHeaderRow}>
                <View
                  style={[
                    manageStyles.modalIcon,
                    { backgroundColor: `${statusTone}1A`, borderColor: statusTone },
                  ]}
                >
                  <Ionicons name="document-text-outline" size={18} color={statusTone} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={manageStyles.statusTitle}>Submission Snapshot</Text>
                  <Text style={manageStyles.statusSubtitle}>
                    Review the details sent for verification.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowStatusModal(false)}
                  style={manageStyles.closeBtn}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <Ionicons name="close" size={18} color={BRAND.ink} />
                </TouchableOpacity>
              </View>

              <View style={manageStyles.statusBadgeRow}>
                <View
                  style={[
                    manageStyles.statusBadge,
                    { backgroundColor: `${statusTone}1A`, borderColor: statusTone },
                  ]}
                >
                  <Text style={[manageStyles.statusBadgeText, { color: statusTone }]}>
                    {statusDetails.status?.toUpperCase() || 'PENDING'}
                  </Text>
                </View>
                <Text style={manageStyles.statusMeta}>
                  {statusDetails.updatedAt
                    ? `Updated ${new Date(statusDetails.updatedAt).toLocaleString()}`
                    : 'Awaiting review'}
                </Text>
              </View>

              <ScrollView
                style={manageStyles.statusList}
                contentContainerStyle={{ paddingBottom: 6, gap: 4 }}
                showsVerticalScrollIndicator={false}
              >
                <StatusRow label="Business" value={statusDetails.businessName} />
                <StatusRow label="Reg No." value={statusDetails.registrationNo} />
                <StatusRow label="Email" value={statusDetails.email} />
                <StatusRow label="Phone" value={statusDetails.phone} />
                <StatusRow label="Address" value={statusDetails.address} />
                {statusDetails.cuisines?.length ? (
                  <StatusRow label="Cuisines" value={statusDetails.cuisines.join(', ')} />
                ) : null}
                {statusDetails.theme?.length ? (
                  <StatusRow label="Theme" value={statusDetails.theme.join(', ')} />
                ) : null}
                {statusDetails.ambience?.length ? (
                  <StatusRow label="Ambience" value={statusDetails.ambience.join(', ')} />
                ) : null}
                {statusDetails.note ? <StatusRow label="Note" value={statusDetails.note} /> : null}
              </ScrollView>

              <View style={manageStyles.modalButtonsRow}>
                <TouchableOpacity
                  style={[manageStyles.modalBtn, manageStyles.modalPrimary]}
                  onPress={() => setShowStatusModal(false)}
                >
                  <Text style={manageStyles.modalPrimaryText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// Panel component
export function ManageRestaurantPanel({
  restaurant,
  items: passedItems = [],
  embedded = false,
  canEdit = true,
  restaurantIdOverride = null,
}) {
  const [localRestaurant, setLocalRestaurant] = useState(restaurant);
  const [items, setItems] = useState(passedItems);

  useEffect(() => setLocalRestaurant(normalizeRestaurantEntity(restaurant)), [restaurant]);
  useEffect(() => {
    if (!passedItems || passedItems.length === 0) return;
    setItems(passedItems);
  }, [passedItems]);

  if (!localRestaurant) {
    return (
      <View style={[manageStyles.panelRoot, manageStyles.emptyBox, { margin: 20 }]}>
        <Text style={manageStyles.emptyTitle}>No restaurant data</Text>
        <Text style={manageStyles.emptyBody}>
          Provide a restaurant document via navigation params to manage details.
        </Text>
      </View>
    );
  }

  const resolvedRestaurant = restaurantIdOverride
    ? { ...localRestaurant, id: restaurantIdOverride, $id: restaurantIdOverride }
    : localRestaurant;

  // Menu Item Modal State
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('meal');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [tags, setTags] = useState('');
  const [loadingItems, setLoadingItems] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [loadingMenu, setLoadingMenu] = useState(false);

  // Edit Restaurant Modal State
  const [showEditRestaurant, setShowEditRestaurant] = useState(false);
  const [editName, setEditName] = useState(resolvedRestaurant.name || '');
  const [editLocation, setEditLocation] = useState(resolvedRestaurant.location || '');
  const [editTheme, setEditTheme] = useState(resolvedRestaurant.theme || '');
  const [editAveragePrice, setEditAveragePrice] = useState(
    String(resolvedRestaurant.averagePriceValue || '').replace('RM', ''),
  );
  const [editCuisines, setEditCuisines] = useState(
    (resolvedRestaurant.cuisines || []).join(', '),
  );
  const [editAmbience, setEditAmbience] = useState(
    (resolvedRestaurant.ambience || []).join(', '),
  );

  // Normalized restaurant ID used for all reads/writes to avoid saving "req-..." prefixes
  const restaurantId = normalizeRestaurantId(
    restaurantIdOverride || resolvedRestaurant?.id || resolvedRestaurant?.$id || '',
  );

  useEffect(() => {
    if (!restaurantId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        setLoadingItems(true);
        await ensureSession();
        const res = await db.listDocuments(DB_ID, COL.items, [
          Query.equal('restaurantId', restaurantId),
          Query.limit(100),
        ]);
        if (cancelled) return;
        const docs = res?.documents || [];
        setItems(docs.map((doc) => normalizeItemForUi(doc, resolvedRestaurant)));
      } catch (err) {
        console.warn('ManageRestaurant: unable to load menu items', err?.message || err);
      } finally {
        if (!cancelled) setLoadingItems(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, resolvedRestaurant]);

  // Ensure there is a menu to attach new items to
  useEffect(() => {
    if (!restaurantId || menuId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        setLoadingMenu(true);
        await ensureSession();
        const existing = await db.listDocuments(DB_ID, COL.menus, [
          Query.equal('restaurantId', restaurantId),
          Query.limit(1),
        ]);
        const found = existing?.documents?.[0];
        if (!cancelled && found?.$id) setMenuId(found.$id || found.id);
      } catch (err) {
        if (!cancelled) {
          console.warn('ManageRestaurant: unable to ensure menu', err?.message || err);
        }
      } finally {
        if (!cancelled) setLoadingMenu(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [menuId, restaurantId]);

  const ensureMenuForType = async (menuNameHint) => {
    if (menuId) return menuId;
    await ensureSession();
    let userId = null;
    try {
      const me = await account.get();
      userId = me?.$id || null;
    } catch (err) {
      console.warn('ManageRestaurant: could not resolve user for menu perms', err?.message || err);
    }
    const permissions = [Permission.read(Role.any())];
    if (userId) {
      permissions.push(Permission.update(Role.user(userId)), Permission.delete(Role.user(userId)));
    }
    const friendlyName = toTitleCase(menuNameHint || 'All Day');
    const created = await db.createDocument(
      DB_ID,
      COL.menus,
      ID.unique(),
      { name: friendlyName, restaurantId },
      permissions,
    );
    setMenuId(created.$id || created.id);
    return created.$id || created.id;
  };

  const startAddItem = () => {
    setEditingItem(null);
    setName('');
    setType('meal');
    setPrice('');
    setDesc('');
    setTags('');
    setShowAdd(true);
  };

  const startEditItem = (item) => {
    if (!item) return;
    const numericPrice =
      typeof item.priceRM === 'number'
        ? item.priceRM
        : parsePriceValue(item.price || '') || null;
    setEditingItem(item);
    setName(item.name || '');
    setType(item.type || 'meal');
    setPrice(numericPrice != null ? String(numericPrice) : '');
    setDesc(item.description || '');
    setTags(Array.isArray(item.tags) ? item.tags.join(', ') : '');
    setShowAdd(true);
  };

  const handleDeleteItem = (item) => {
    if (!item?.id) return;
    Alert.alert('Remove item', 'Are you sure you want to delete this menu item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (deletingId) return;
          try {
            setDeletingId(item.id);
            await ensureSession();
            await db.deleteDocument(DB_ID, COL.items, item.id);
            setItems((prev) => prev.filter((it) => it.id !== item.id));
          } catch (err) {
            console.warn('ManageRestaurant: failed to delete item', err?.message || err);
            Alert.alert('Unable to delete', err?.message || 'Please try again later.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const submitNewItem = async () => {
    if (!name.trim() || !price.trim()) {
      Alert.alert('Missing fields', 'Please provide Name and Price (RM).');
      return;
    }
    if (savingItem) return;

    const priceValue = parsePriceValue(price);
    if (priceValue == null) {
      Alert.alert('Invalid price', 'Enter a numeric price without currency symbols.');
      return;
    }
    if (!restaurantId) {
      Alert.alert('Missing restaurant', 'No restaurant ID found for this menu item.');
      return;
    }
    const allowedTypes = ['meal', 'snacks', 'drink', 'dessert', 'pastry', 'other'];
    const normalizedType = (() => {
      const val = (type || '').trim().toLowerCase();
      if (allowedTypes.includes(val)) return val;
      return 'other';
    })();
    const normalizedCuisine =
      (resolvedRestaurant.cuisine ||
        (Array.isArray(resolvedRestaurant.cuisines) ? resolvedRestaurant.cuisines[0] : '') ||
        '').toString().trim().toLowerCase() || null;
    const cappedPrice = Math.min(100000, Math.max(0, Math.round(priceValue)));
    const targetMenuId = await ensureMenuForType(normalizedType === 'other' ? 'All Day' : normalizedType);
    if (!targetMenuId) {
      Alert.alert('Menu required', 'We could not prepare a menu for this restaurant.');
      return;
    }
    const payload = {
      name: name.trim(),
      type: normalizedType,
      priceRM: cappedPrice,
      description: desc.trim(),
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => t.toLowerCase()),
      mood: [],
      restaurantId, // already normalized above
      cuisine: normalizedCuisine,
      menuId: targetMenuId,
    };

    try {
      setSavingItem(true);
      await ensureSession();
      let userId = null;
      try {
        const me = await account.get();
        userId = me?.$id || null;
      } catch (err) {
        console.warn('ManageRestaurant: could not resolve current user', err?.message || err);
      }
      const permissions = [Permission.read(Role.any())];
      if (userId) {
        permissions.push(Permission.update(Role.user(userId)), Permission.delete(Role.user(userId)));
      }

      const normalizedRestaurant = restaurantId
        ? { ...resolvedRestaurant, id: restaurantId, $id: restaurantId }
        : resolvedRestaurant;
      if (editingItem?.id) {
        const updated = await db.updateDocument(DB_ID, COL.items, editingItem.id, payload, permissions);
        const normalized = normalizeItemForUi(updated, normalizedRestaurant);
        setItems((prev) => prev.map((it) => (it.id === normalized.id ? normalized : it)));
        addUserItem(normalizedRestaurant || resolvedRestaurant, normalized);
        Alert.alert('Item updated', 'Your menu item has been updated.');
      } else {
        const created = await db.createDocument(DB_ID, COL.items, ID.unique(), payload, permissions);
        const normalized = normalizeItemForUi(created, normalizedRestaurant);
        setItems((prev) => [...prev, normalized]);
        addUserItem(normalizedRestaurant || resolvedRestaurant, normalized);
        Alert.alert('Item saved', 'Your menu item is now stored in Appwrite.');
      }
      setShowAdd(false);
      setName('');
      setType('meal');
      setPrice('');
      setDesc('');
      setTags('');
      setEditingItem(null);
    } catch (err) {
      console.warn('ManageRestaurant: failed to save item', err?.message || err);
      Alert.alert('Unable to save', err?.message || 'Please try again later.');
    } finally {
      setSavingItem(false);
    }
  };

  const applyRestaurantEdits = () => {
    const avg = editAveragePrice.trim();
    const next = {
      ...resolvedRestaurant,
      name: editName.trim() || resolvedRestaurant.name,
      location: editLocation.trim() || resolvedRestaurant.location,
      theme: editTheme.trim() || resolvedRestaurant.theme,
      cuisines: editCuisines
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      ambience: editAmbience
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    if (avg) {
      const asNumber = Number(avg);
      if (!Number.isNaN(asNumber)) {
        next.averagePriceValue = asNumber;
        next.averagePrice = `RM${asNumber}`;
      }
    }
    setLocalRestaurant(next);
    setShowEditRestaurant(false);
  };

  const averagePriceText =
    typeof resolvedRestaurant.averagePriceValue === 'number'
      ? `RM${resolvedRestaurant.averagePriceValue}`
      : resolvedRestaurant.averagePrice || 'RM-';
  const cuisinesLabel = (resolvedRestaurant.cuisines || []).join(', ');

  const containerStyles = [manageStyles.panelRoot, embedded ? manageStyles.embeddedRoot : null];
  const paddingStyle = embedded ? null : { marginHorizontal: 20 };
  const helperPadding = embedded ? null : { paddingHorizontal: 20 };

  const dedupedItems = useMemo(() => {
    const seen = new Set();
    return items.filter((item) => {
      const id = item.id || item.$id;
      if (!id) return false;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [items]);

  const content = (
    <>
      <View style={[detailStyles.headerCard, paddingStyle]}>
        <Text style={detailStyles.name}>{resolvedRestaurant.name}</Text>
        <Text style={detailStyles.meta}>{resolvedRestaurant.location}</Text>

        <View style={detailStyles.badgeRow}>
          <Badge text={`${resolvedRestaurant.rating ?? '-'} ${STAR}`} color={BRAND.accentSoft} />
          <Badge text={averagePriceText} />
          {cuisinesLabel ? <Badge text={cuisinesLabel} color={BRAND.metaBg} /> : null}
        </View>

        <View style={detailStyles.actionsRow}>
          {canEdit ? (
            <>
              <TouchableOpacity
                style={[detailStyles.actionBtn, { backgroundColor: BRAND.ink }]}
                onPress={() => setShowEditRestaurant(true)}
              >
                <Text style={detailStyles.actionText}>Edit Details</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[detailStyles.actionBtn, { backgroundColor: BRAND.primary }]}
                onPress={startAddItem}
              >
                <Text style={detailStyles.actionText}>Add Menu Item</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={manageStyles.readOnlyHint}>
              Read-only view - owners can edit from their account.
            </Text>
          )}
        </View>
      </View>

      <Text style={[manageStyles.helperText, helperPadding]}>
        Keep your listing fresh so diners get the right vibe, location, and menu at a glance.
      </Text>

      <View style={paddingStyle}>
        <Section title="Listing Snapshot">
          <View style={manageStyles.snapshotCard}>
            <View style={manageStyles.snapshotRow}>
              <Ionicons name="location-outline" size={16} color={BRAND.ink} />
              <Text style={manageStyles.snapshotText}>
                {resolvedRestaurant.location || 'Add your location'}
              </Text>
            </View>
            <View style={manageStyles.snapshotBadges}>
              <Badge text={averagePriceText} />
              {cuisinesLabel ? <Badge text={cuisinesLabel} color={BRAND.metaBg} /> : null}
              <Badge
                text={`${items.length || 0} menu item${items.length === 1 ? '' : 's'}`}
                color={BRAND.accentSoft}
              />
            </View>
          </View>
        </Section>

        {resolvedRestaurant.theme ? (
          <Section title="Theme">
            <Text style={{ fontSize: 15, color: BRAND.ink, lineHeight: 22 }}>
              {resolvedRestaurant.theme}
            </Text>
          </Section>
        ) : null}

        {(resolvedRestaurant.ambience || []).length ? (
          <Section title="Ambience">
            <View style={detailStyles.chipWrap}>
              {resolvedRestaurant.ambience.map((amb, idx) => (
                <Chip key={`amb-${idx}`} label={amb} />
              ))}
            </View>
          </Section>
        ) : null}

        <Section title="Menu Items">
          {canEdit ? (
            <Text style={manageStyles.sectionHelper}>
              Add or refine your menu so diners see your best dishes first.
              {loadingMenu && !menuId ? ' Preparing a menu...' : ''}
            </Text>
          ) : null}
          {loadingItems && items.length === 0 ? (
            <Text style={[manageStyles.sectionHelper, { color: BRAND.inkMuted }]}>
              Loading menu items...
            </Text>
          ) : items.length === 0 ? (
            <View style={manageStyles.emptyBox}>
              <Text style={manageStyles.emptyTitle}>No menu items yet</Text>
              <Text style={manageStyles.emptyBody}>
                {canEdit
                  ? 'Add your first signature dish, drink, or dessert to showcase what makes your spot special.'
                  : 'The owner has not added any menu items yet.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={dedupedItems}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingRight: 8 }}
              renderItem={({ item }) => (
                <View style={[detailStyles.itemCard, manageStyles.itemCard]}>
                  <Text style={detailStyles.itemName}>{item.name}</Text>
                  <View style={detailStyles.badgeRow}>
                    <Badge text={item.price || averagePriceText} />
                    {!!item.type && <Badge text={item.type} color={BRAND.metaBg} />}
                    {!!item.rating && (
                      <Badge text={`${item.rating} ${STAR}`} color={BRAND.accentSoft} />
                    )}
                  </View>
                  {!!item.description && (
                    <Text style={manageStyles.itemDesc} numberOfLines={3}>
                      {item.description}
                    </Text>
                  )}
                  {canEdit ? (
                    <View style={manageStyles.itemActionsRow}>
                      <TouchableOpacity
                        style={manageStyles.itemActionBtn}
                        onPress={() => startEditItem(item)}
                      >
                        <Ionicons name="pencil-outline" size={14} color={BRAND.ink} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={manageStyles.itemActionBtn}
                        onPress={() => handleDeleteItem(item)}
                        >
                        <Ionicons name="trash-outline" size={14} color={BRAND.ink} />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              )}
            />
          )}
        </Section>
      </View>
    </>
  );

  return (
    <View style={containerStyles}>
      {embedded ? (
        <View style={manageStyles.embeddedContainer}>{content}</View>
      ) : (
        <View>{content}</View>
      )}

      {canEdit && showAdd ? (
        <Modal
          transparent
          animationType="fade"
          visible={showAdd}
          onRequestClose={() => {
            setShowAdd(false);
            setEditingItem(null);
          }}
        >
          <View style={detailStyles.overlay}>
            <TouchableOpacity
              style={detailStyles.overlayBg}
              onPress={() => {
                setShowAdd(false);
                setEditingItem(null);
              }}
            />
            <View style={[detailStyles.modalCard, manageStyles.formCard]}>
              <View style={manageStyles.formHeader}>
                <View style={manageStyles.formIcon}>
                  <Ionicons name="fast-food-outline" size={18} color={BRAND.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={detailStyles.modalTitle}>
                    {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
                  </Text>
                  <Text style={detailStyles.modalHelper}>
                    {editingItem
                      ? 'Update details and pricing for this menu item.'
                      : 'Quick add your signature dishes with clear pricing.'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setShowAdd(false);
                    setEditingItem(null);
                  }}
                  style={manageStyles.closeBtn}
                >
                  <Ionicons name="close" size={18} color={BRAND.ink} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={manageStyles.formBody}
                contentContainerStyle={{ paddingBottom: 12 }}
                showsVerticalScrollIndicator={false}
              >
                {[
                  { label: 'Name', value: name, setter: setName, placeholder: 'eg. Truffle Burger' },
                  {
                    label: 'Price (RM)',
                    value: price,
                    setter: setPrice,
                    placeholder: '18',
                    keyboardType: 'numeric',
                  },
                  {
                    label: 'Description',
                    value: desc,
                    setter: setDesc,
                    placeholder: 'Short teaser that sells the dish',
                    multiline: true,
                    height: 90,
                  },
                  {
                    label: 'Tags (comma separated)',
                    value: tags,
                    setter: setTags,
                    placeholder: 'spicy, vegetarian, kids-fave',
                  },
                ].map((field) => (
                  <View key={field.label} style={manageStyles.fieldBlock}>
                    <Text style={manageStyles.fieldLabel}>{field.label}</Text>
                    <TextInput
                      style={[
                        detailStyles.input,
                        manageStyles.fieldInput,
                        field.height ? { height: field.height } : {},
                      ]}
                      placeholderTextColor={BRAND.inkMuted}
                      placeholder={field.placeholder}
                      value={field.value}
                      onChangeText={field.setter}
                      keyboardType={field.keyboardType ?? 'default'}
                      multiline={field.multiline ?? false}
                    />
                  </View>
                ))}

                <View style={manageStyles.fieldBlock}>
                  <Text style={manageStyles.fieldLabel}>Type</Text>
                  <View style={manageStyles.typeOptionsRow}>
                    {['Meal', 'Snacks', 'Drink', 'Dessert', 'Pastry', 'Other'].map((opt) => {
                      const key = opt.toLowerCase();
                      const active = type === key;
                      return (
                        <TouchableOpacity
                          key={key}
                          style={[manageStyles.typePill, active ? manageStyles.typePillActive : null]}
                          onPress={() => setType(key)}
                        >
                          <Text
                            style={[
                              manageStyles.typePillText,
                              active ? manageStyles.typePillTextActive : null,
                            ]}
                          >
                            {opt}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>
              <View style={manageStyles.modalButtonsRow}>
                <TouchableOpacity
                  style={[detailStyles.submitBtn, { backgroundColor: BRAND.inkMuted }]}
                  onPress={() => {
                    setShowAdd(false);
                    setEditingItem(null);
                  }}
                >
                  <Text style={detailStyles.submitText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    detailStyles.submitBtn,
                    { backgroundColor: BRAND.ink, opacity: savingItem ? 0.7 : 1 },
                  ]}
                  onPress={submitNewItem}
                  disabled={savingItem}
                >
                  <Text style={detailStyles.submitText}>
                    {savingItem ? 'Saving...' : editingItem ? 'Update Item' : 'Save Item'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {canEdit && showEditRestaurant ? (
        <Modal
          transparent
          animationType="fade"
          visible={showEditRestaurant}
          onRequestClose={() => setShowEditRestaurant(false)}
        >
          <View style={detailStyles.overlay}>
            <TouchableOpacity
              style={detailStyles.overlayBg}
              onPress={() => setShowEditRestaurant(false)}
            />
            <View style={[detailStyles.modalCard, manageStyles.formCard]}>
              <View style={manageStyles.formHeader}>
                <View style={manageStyles.formIcon}>
                  <Ionicons name="create-outline" size={18} color={BRAND.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={detailStyles.modalTitle}>Edit Restaurant</Text>
                  <Text style={detailStyles.modalHelper}>
                    Keep your listing sharp with clear info and vibe cues.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowEditRestaurant(false)}
                  style={manageStyles.closeBtn}
                >
                  <Ionicons name="close" size={18} color={BRAND.ink} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={manageStyles.formBody}
                contentContainerStyle={{ paddingBottom: 12 }}
                showsVerticalScrollIndicator={false}
              >
                {[
                  { label: 'Name', value: editName, setter: setEditName, placeholder: 'Restaurant name' },
                  { label: 'Location', value: editLocation, setter: setEditLocation, placeholder: 'Location' },
                  {
                    label: 'Theme',
                    value: editTheme,
                    setter: setEditTheme,
                    placeholder: 'Short description / vibe',
                    multiline: true,
                    height: 90,
                  },
                  {
                    label: 'Average Price (RM)',
                    value: editAveragePrice,
                    setter: setEditAveragePrice,
                    placeholder: 'e.g. 18',
                    keyboardType: 'numeric',
                  },
                  {
                    label: 'Cuisines (comma separated)',
                    value: editCuisines,
                    setter: setEditCuisines,
                    placeholder: 'e.g. cafe, bakery',
                  },
                  {
                    label: 'Ambience (comma separated)',
                    value: editAmbience,
                    setter: setEditAmbience,
                    placeholder: 'e.g. cozy, casual',
                  },
                ].map((fld) => (
                  <View key={fld.label} style={manageStyles.fieldBlock}>
                    <Text style={manageStyles.fieldLabel}>{fld.label}</Text>
                    <TextInput
                      style={[
                        detailStyles.input,
                        manageStyles.fieldInput,
                        fld.height ? { height: fld.height } : {},
                      ]}
                      placeholderTextColor={BRAND.inkMuted}
                      placeholder={fld.placeholder}
                      value={fld.value}
                      onChangeText={fld.setter}
                      keyboardType={fld.keyboardType ?? 'default'}
                      multiline={fld.multiline ?? false}
                    />
                  </View>
                ))}
              </ScrollView>
              <View style={manageStyles.modalButtonsRow}>
                <TouchableOpacity
                  style={[detailStyles.submitBtn, { backgroundColor: BRAND.inkMuted }]}
                  onPress={() => setShowEditRestaurant(false)}
                >
                  <Text style={detailStyles.submitText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[detailStyles.submitBtn, { backgroundColor: BRAND.ink }]}
                  onPress={applyRestaurantEdits}
                >
                  <Text style={detailStyles.submitText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

// Utility component for modal status rows
function StatusRow({ label, value }) {
  if (!value) return null;
  return (
    <Text style={manageStyles.statusRow}>
      <Text style={manageStyles.statusRowLabel}>{label}:</Text> {value}
    </Text>
  );
}

const manageStyles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 14,
    backgroundColor: BRAND.bg,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.line,
  },
  topBarTitle: { fontSize: 18, fontWeight: '800', color: BRAND.ink, flex: 1 },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: BRAND.surface ?? '#FFF5ED',
    borderWidth: 1,
    borderColor: BRAND.line,
  },
  infoPillText: { color: BRAND.primary, fontWeight: '600', fontSize: 12 },

  panelRoot: { flex: 1, width: '100%' },
  embeddedRoot: { width: '100%', backgroundColor: 'transparent' },
  embeddedContainer: { paddingHorizontal: 0 },
  helperText: { color: BRAND.inkMuted, marginBottom: 8 },

  snapshotCard: {
    backgroundColor: BRAND.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: BRAND.line,
    shadowColor: BRAND.ink,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    marginBottom: 12,
  },
  snapshotRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  snapshotText: { color: BRAND.ink, fontWeight: '700', fontSize: 14 },
  snapshotBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  sectionHelper: { marginBottom: 10, fontSize: 13, color: BRAND.inkMuted },

  emptyBox: {
    backgroundColor: BRAND.surface ?? '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BRAND.line,
    padding: 20,
    alignItems: 'flex-start',
    gap: 6,
  },
  emptyTitle: { color: BRAND.ink, fontWeight: '700', fontSize: 14 },
  emptyBody: { color: BRAND.inkMuted, lineHeight: 22, fontSize: 13 },

  itemCard: {
    width: 210,
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    backgroundColor: BRAND.surface,
    shadowColor: BRAND.ink,
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  itemDesc: { color: BRAND.inkMuted, fontSize: 13, marginTop: 6, lineHeight: 18 },
  itemActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 8 },
  itemActionBtn: { padding: 6, borderRadius: 999, backgroundColor: BRAND.metaBg ?? '#F3F4F6' },

  readOnlyHint: { color: BRAND.inkMuted, fontSize: 12, flex: 1, flexWrap: 'wrap' },
  modalButtonsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },

  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  statusCard: {
    backgroundColor: BRAND.surface ?? '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: BRAND.line,
    width: '92%',
    maxWidth: 420,
    maxHeight: '75%',
    shadowColor: BRAND.ink,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    gap: 12,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: BRAND.line,
    marginBottom: 6,
  },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  modalIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  statusTitle: { fontSize: 17, fontWeight: '800', color: BRAND.ink },
  statusSubtitle: { color: BRAND.inkMuted, fontSize: 13, marginTop: 2 },
  statusBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  statusBadgeText: { fontWeight: '700', fontSize: 12 },
  statusMeta: { color: BRAND.inkMuted, fontSize: 12 },
  statusList: { marginTop: 6 },
  statusRow: { color: BRAND.ink, fontSize: 13, marginBottom: 6, lineHeight: 18 },
  statusRowLabel: { fontWeight: '700' },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  modalPrimary: { backgroundColor: BRAND.primary },
  modalPrimaryText: { color: '#fff', fontWeight: '700' },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BRAND.metaBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BRAND.line,
  },
  formCard: { paddingTop: 14, paddingBottom: 16 },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  formIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.metaBg,
    borderWidth: 1,
    borderColor: BRAND.line,
  },
  formBody: { maxHeight: 320, marginTop: 6 },
  fieldBlock: { marginBottom: 12 },
  fieldLabel: { fontWeight: '700', color: BRAND.ink, marginBottom: 6 },
  fieldInput: { backgroundColor: '#FFFDFC' },
  typeOptionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRAND.line,
    backgroundColor: BRAND.surface ?? '#FFFFFF',
  },
  typePillActive: { backgroundColor: BRAND.primary + '1A', borderColor: BRAND.primary },
  typePillText: { color: BRAND.ink, fontWeight: '600', fontSize: 12 },
  typePillTextActive: { color: BRAND.primary },
  cardSection: {
    backgroundColor: '#FFF8F3',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: BRAND.line,
    shadowColor: BRAND.ink,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    marginBottom: 14,
  },
  cardSectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardAccent: {
    width: 6,
    height: 32,
    borderRadius: 4,
    backgroundColor: BRAND.primary,
    marginRight: 10,
  },
  cardSectionTitle: { fontWeight: '800', fontSize: 16, color: BRAND.ink },
  cardSectionSubtitle: { color: BRAND.inkMuted, marginTop: 4 },
});
