// screens/FoodlistDetailScreen.js
import React, {
  useRef,
  useState,
  useMemo,
  useEffect,
  useCallback,
} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '../components/BackButton';

// Appwrite client
import { db, DB_ID, COL } from '../appwrite';
import { Query } from 'appwrite';
import { searchUsers } from '../services/userDirectory';
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
  collaborators: [],
};

const normalizeFoodlistDoc = (raw) => {
  if (!raw) return { ...EMPTY_FOODLIST };
  const items = Array.isArray(raw.items) ? [...raw.items] : [];
  const itemIds =
    Array.isArray(raw.itemIds) && raw.itemIds.length
      ? raw.itemIds.filter(Boolean)
      : items.map((item) => item && item.id).filter(Boolean);
  const collaborators = Array.isArray(raw.collaborators) ? [...raw.collaborators] : [];
  const id = raw.id ?? raw.$id ?? null;
  return {
    ...raw,
    id,
    items,
    itemIds,
    collaborators,
  };
};

const normalizeProfile = (source) => {
  if (!source) return null;
  const id = source.$id || source.id;
  if (!id) return null;
  const username =
    source.username ||
    source.handle ||
    source.slug ||
    source.name ||
    source.userName ||
    source.preferredUsername ||
    '';
  const displayName =
    source.displayName ||
    source.fullName ||
    source.name ||
    source.nickname ||
    username ||
    id;
  return {
    id,
    username,
    displayName,
  };
};

const getInitials = (value = '') => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '?';
  return (
    trimmed
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
};

const formatProfileLabel = (profile) => {
  if (!profile) return '';
  const username = profile.username ? `@${profile.username}` : '';
  if (profile.displayName && username) {
    return `${profile.displayName} (${username})`;
  }
  return profile.displayName || username || profile.id || '';
};

// Invite collaborators backed by Appwrite users
const InviteModal = ({
  visible,
  onClose,
  collaboratorIds,
  collaboratorProfiles,
  onInvite,
  loadingCollaborators = false,
  busyIds = [],
}) => {
  const [inviteQuery, setInviteQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [noMatchesMessage, setNoMatchesMessage] = useState('');
  const [results, setResults] = useState([]);
  const searchTimerRef = useRef(null);

  const collaboratorIdSet = useMemo(
    () => new Set(collaboratorIds),
    [collaboratorIds]
  );

  const collaboratorDisplayList = useMemo(
    () =>
      collaboratorIds.map((id) => {
        const profile = collaboratorProfiles[id];
        const displayName = profile?.displayName || profile?.username || id;
        return {
          id,
          displayName,
          username: profile?.username || '',
          initials: getInitials(displayName),
        };
      }),
    [collaboratorIds, collaboratorProfiles]
  );

  const inviteQueryTrimmed = inviteQuery.trim();
  const searchReady = inviteQueryTrimmed.length >= 2;

  useEffect(() => {
    if (!visible) {
      setInviteQuery('');
      setInviteError('');
      setNoMatchesMessage('');
      setResults([]);
      setSearching(false);
    }
  }, [visible]);

  useEffect(
    () => () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (!visible) return undefined;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!searchReady) {
      setResults([]);
      setNoMatchesMessage('');
      setSearching(false);
      return undefined;
    }

    let cancelled = false;
    setSearching(true);
    setInviteError('');
    setNoMatchesMessage('');

    searchTimerRef.current = setTimeout(() => {
      (async () => {
        try {
          const list = await searchUsers(inviteQueryTrimmed);
          if (cancelled) return;
          const normalized = list.map(normalizeProfile).filter(Boolean);
          const filtered = normalized.filter(
            (profile) => !collaboratorIdSet.has(profile.id)
          );
          setResults(filtered);
          if (!filtered.length) {
            setNoMatchesMessage('No matching users available to invite.');
          } else {
            setNoMatchesMessage('');
          }
        } catch (error) {
          if (cancelled) return;
          setInviteError(
            error?.message || 'Unable to search users right now.'
          );
          setResults([]);
        } finally {
          if (!cancelled) setSearching(false);
        }
      })();
    }, 350);

    return () => {
      cancelled = true;
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [collaboratorIdSet, inviteQueryTrimmed, searchReady, visible]);

  const handleInviteFromSearch = (profile) => {
    const normalized = normalizeProfile(profile);
    if (!normalized) return;
    onInvite(normalized);
  };

  const handleClose = () => {
    setInviteQuery('');
    setInviteError('');
    setNoMatchesMessage('');
    setResults([]);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 70 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalOverlay}>
            <View style={styles.bottomSheet}>
              <ScrollView
                bounces={false}
                contentContainerStyle={styles.sheetScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.sheetTitle}>Invite collaborators</Text>
                <Text style={{ color: BRAND.inkMuted, marginTop: 6 }}>
                  Search by name or @username to invite someone to edit this
                  foodlist.
                </Text>

                <View style={styles.infoBox}>
                  <Ionicons
                    name="information-circle"
                    size={20}
                    color={BRAND.primary}
                    style={{ marginRight: 10 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoTitle}>Stored in Appwrite</Text>
                    <Text style={styles.infoText}>
                      Collaborators are saved to the{' '}
                      <Text style={{ fontWeight: '700' }}>members</Text>{' '}
                      column. They sync to every device with access to this
                      list.
                    </Text>
                  </View>
                </View>

                <View style={styles.searchBox}>
                  <Ionicons name="search" size={16} color={BRAND.inkMuted} />
                  <TextInput
                    placeholder="Search the user directory"
                    placeholderTextColor={BRAND.inkMuted}
                    style={styles.searchInput}
                    value={inviteQuery}
                    onChangeText={setInviteQuery}
                    autoFocus
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="search"
                  />
                  {!!inviteQuery && (
                    <TouchableOpacity onPress={() => setInviteQuery('')}>
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={BRAND.inkMuted}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {inviteError ? (
                  <Text style={styles.errorText}>{inviteError}</Text>
                ) : null}

                <View style={{ marginTop: 12 }}>
  {searching ? (
    <View style={styles.searchingBox}>
      <ActivityIndicator size="small" color={BRAND.primary} />
    </View>
  ) : searchReady ? (
    results.length ? (
      <>
        {results.map((item) => {
          const busy = busyIds.includes(item.id);
          return (
            <View key={item.id} style={styles.listRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(item.displayName || item.username)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>
                  {item.displayName || item.username}
                </Text>
                {!!item.username && (
                  <Text style={styles.usernameText}>@{item.username}</Text>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.inviteBtn,
                  busy && styles.inviteBtnDisabled,
                ]}
                disabled={busy}
                onPress={() => handleInviteFromSearch(item)}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.inviteBtnText}>Invite</Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </>
    ) : (
      <Text style={styles.emptyHint}>
        {noMatchesMessage ||
          `No users named "${inviteQueryTrimmed}" were found.`}
      </Text>
    )
  ) : (
    <Text style={styles.helperText}>
      Type at least 2 characters to search the directory.
    </Text>
  )}
</View>


                {!!collaboratorDisplayList.length && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={[styles.sheetTitle, { fontSize: 16 }]}>
                      Current collaborators
                    </Text>
                    {loadingCollaborators ? (
                      <View style={styles.searchingBox}>
                        <ActivityIndicator
                          size="small"
                          color={BRAND.primary}
                        />
                      </View>
                    ) : (
                      collaboratorDisplayList.slice(0, 3).map((member) => (
                        <View
                          key={member.id}
                          style={[styles.listRow, { borderBottomWidth: 0 }]}
                        >
                          <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                              {member.initials}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.rowText}>
                              {member.displayName}
                            </Text>
                            {!!member.username && (
                              <Text style={styles.usernameText}>
                                @{member.username}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))
                    )}
                    {collaboratorDisplayList.length > 3 &&
                      !loadingCollaborators && (
                        <Text style={styles.helperText}>
                          +
                          {collaboratorDisplayList.length - 3} more collaborator
                          {collaboratorDisplayList.length - 3 === 1 ? '' : 's'}{' '}
                          already on this foodlist.
                        </Text>
                      )}
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleClose}
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: BRAND.slate, marginTop: 16 },
                  ]}
                >
                  <Text style={styles.primaryBtnText}>Done</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
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

  const [currentList, setCurrentList] = useState(() =>
    normalizeFoodlistDoc(initialDoc)
  );
  const [loadingDoc, setLoadingDoc] = useState(
    !initialDoc && Boolean(foodlistId)
  );

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
  const [contributorsOpen, setContributorsOpen] = useState(false);
  const [collaboratorProfiles, setCollaboratorProfiles] = useState({});
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);
  const [inviteBusyIds, setInviteBusyIds] = useState([]);
  const collaboratorProfilesRef = useRef(collaboratorProfiles);

  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(''), 1800);
  };

  const syncLocalFoodlists = useCallback(
    (nextList) => {
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
    },
    [setFoodlists]
  );

  useEffect(() => {
    collaboratorProfilesRef.current = collaboratorProfiles;
  }, [collaboratorProfiles]);

  const collaboratorIds = useMemo(
    () =>
      Array.isArray(currentList?.collaborators)
        ? currentList.collaborators.filter(Boolean)
        : [],
    [currentList?.collaborators]
  );

  const collaboratorList = useMemo(
    () =>
      collaboratorIds.map((id) => {
        const profile = collaboratorProfiles[id];
        const displayName = profile?.displayName || profile?.username || id;
        return {
          id,
          displayName,
          username: profile?.username || '',
          initials: getInitials(displayName),
        };
      }),
    [collaboratorIds, collaboratorProfiles]
  );

  useEffect(() => {
    if (!collaboratorIds.length) {
      setCollaboratorProfiles({});
      setLoadingCollaborators(false);
      return;
    }
    const existing = collaboratorProfilesRef.current || {};
    const missing = collaboratorIds.filter((id) => !existing[id]);
    if (!missing.length) return;
    let cancelled = false;
    const chunkSize = 25;
    async function fetchProfiles() {
      try {
        setLoadingCollaborators(true);
        const fetched = {};
        for (let i = 0; i < missing.length; i += chunkSize) {
          const subset = missing.slice(i, i + chunkSize);
          try {
            const res = await db.listDocuments(DB_ID, COL.users, [
              Query.equal('$id', subset),
            ]);
            const docs = Array.isArray(res?.documents) ? res.documents : [];
            docs
              .map(normalizeProfile)
              .filter(Boolean)
              .forEach((profile) => {
                fetched[profile.id] = profile;
              });
          } catch (error) {
            console.warn(
              'Failed to fetch collaborator profile batch',
              error?.message || error
            );
          }
        }
        if (!cancelled && Object.keys(fetched).length) {
          setCollaboratorProfiles((prev) => ({ ...prev, ...fetched }));
        }
      } catch (error) {
        if (!cancelled) {
          console.warn(
            'Failed to load collaborator profiles',
            error?.message || error
          );
        }
      } finally {
        if (!cancelled) setLoadingCollaborators(false);
      }
    }
    fetchProfiles();
    return () => {
      cancelled = true;
    };
  }, [collaboratorIds]);

  const handleInvite = useCallback(
    async (profile) => {
      const normalized = normalizeProfile(profile);
      if (!normalized) return;
      const listId = currentList.$id;
      if (!listId) {
        Alert.alert(
          'Save required',
          'Please save this foodlist before inviting collaborators.'
        );
        return;
      }
      if (collaboratorIds.includes(normalized.id)) {
        showToast('Already invited');
        return;
      }
      setInviteBusyIds((prev) => [...prev, normalized.id]);
      try {
        const nextCollaborators = [...collaboratorIds, normalized.id];
        await db.updateDocument(DB_ID, COL.foodlists, listId, {
          collaborators: nextCollaborators,
        });
        const updated = { ...currentList, collaborators: nextCollaborators };
        setCurrentList(updated);
        setCollaboratorProfiles((prev) => ({
          ...prev,
          [normalized.id]: normalized,
        }));
        syncLocalFoodlists(updated);
        showToast(`Invited ${formatProfileLabel(normalized)}`);
      } catch (error) {
        Alert.alert(
          'Invite failed',
          error?.message || 'Unable to add collaborator right now.'
        );
      } finally {
        setInviteBusyIds((prev) =>
          prev.filter((id) => id !== normalized.id)
        );
      }
    },
    [collaboratorIds, currentList, showToast, syncLocalFoodlists]
  );

  const removeLocalFoodlist = useCallback(
    (listId) => {
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
    },
    [setFoodlists]
  );

  // -------- Fetch helpers ----------
  const normalizeItemDoc = useCallback(
    (it) => ({
      id: it.$id,
      name: it.name,
      type: it.type || 'other',
      price: toRM(it.priceRM),
      cuisine: it.cuisine || '',
      rating: it.rating ?? null,
      restaurant: it.restaurantName || '',
      location: it.restaurantLocation || '',
      tags: Array.isArray(it.tags) ? it.tags : [],
      description: it.description || '',
      restaurantId: it.restaurantId || null,
      menuId: it.menuId || null,
    }),
    []
  );

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

        const res = await db.listDocuments(DB_ID, COL.items, [
          Query.equal('$id', itemIds),
        ]);
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
    return () => {
      cancelled = true;
    };
  }, [currentList.itemIds, normalizeItemDoc]);

  // Load all items user can add
  useEffect(() => {
    let cancelled = false;
    async function loadAllItems() {
      try {
        setLoadingAll(true);
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
    return () => {
      cancelled = true;
    };
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
      prev.find((i) => i.id === item.id)
        ? prev.filter((i) => i.id !== item.id)
        : [...prev, item]
    );
  };

  const toggleRemove = (item) => {
    setSelectedToRemove((prev) =>
      prev.find((i) => i.id === item.id)
        ? prev.filter((i) => i.id !== item.id)
        : [...prev, item]
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
      'Remove items',
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
                (item) =>
                  !selectedToRemove.find((i) => i.id === item.id)
              );
              const updatedIds = updatedItems.map((i) => i.id);

              await updateFoodlistItemIds(updatedIds);

              const updatedList = {
                ...currentList,
                items: updatedItems,
                itemIds: updatedIds,
              };
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

      const updatedList = {
        ...currentList,
        items: updatedItems,
        itemIds: updatedIds,
      };
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
    Alert.alert('Delete foodlist', 'This action cannot be undone.', [
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
    ]);
  };

  // ---- Header ----
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

    const collaborators = collaboratorIds.length;
    const heroMetaParts = [
      `${priceStats.total} item${priceStats.total === 1 ? '' : 's'}`,
    ];
    if (collaborators > 0) {
      heroMetaParts.push(
        `${collaborators} collaborator${collaborators === 1 ? '' : 's'}`
      );
    }

    return (
      <View style={styles.headerWrap}>
        <View style={styles.headerBar}>
          <BackButton onPress={() => navigation.goBack()} />

          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Foodlist</Text>
            <Text style={styles.headerSubtitle}>
              {heroMetaParts.join(' | ')}
            </Text>
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
              <Ionicons
                name="mail-outline"
                size={16}
                color={BRAND.primary}
              />
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
        onPress={() =>
          navigation.navigate('FoodItemDetail', { itemId: item.id })
        }
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

  const ContributorsModal = () => (
    <Modal
      visible={contributorsOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setContributorsOpen(false)}
    >
      <View
        style={[
          styles.modalOverlay,
          { justifyContent: 'center', padding: 24 },
        ]}
      >
        <View style={styles.centerSheet}>
          <Text style={styles.sheetTitle}>Contributors</Text>
          <FlatList
            data={collaboratorList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.listRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowText}>{item.displayName}</Text>
                  {!!item.username && (
                    <Text style={styles.usernameText}>@{item.username}</Text>
                  )}
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyHint}>No collaborators yet.</Text>
            }
            style={{ marginTop: 6 }}
          />
          <TouchableOpacity
            onPress={() => setContributorsOpen(false)}
            style={[
              styles.primaryBtn,
              { backgroundColor: BRAND.slate, marginTop: 12 },
            ]}
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
    >
      <View pointerEvents="none" style={styles.toastWrap}>
        <View style={styles.toastBox}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>
            {toastMessage}
          </Text>
        </View>
      </View>
    </Modal>
  );

  const hasRemoveSelection = selectedToRemove.length > 0;
  const hasAddSelection = selectedToAdd.length > 0;

  const dataToRender = addingItems ? itemsAvailableToAdd : currentList.items;
  const isLoadingListOrAll =
    loadingDoc || (addingItems ? loadingAll : loadingList);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top + 8}
    >
      <SafeAreaView
        style={styles.safeArea}
        edges={['top', 'left', 'right', 'bottom']}
      >
        {isLoadingListOrAll ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
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
                {addingItems
                  ? 'No items available to add'
                  : 'No items in this list yet'}
              </Text>
            }
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Sticky bottom actions with safe frame */}
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: 12 + insets.bottom },
          ]}
        >
          {!addingItems ? (
            <>
              {hasRemoveSelection ? (
                <TouchableOpacity
                  onPress={confirmRemove}
                  disabled={saving}
                  style={[
                    styles.primaryBtn,
                    {
                      backgroundColor: BRAND.warn,
                      flex: 1,
                      opacity: saving ? 0.6 : 1,
                    },
                  ]}
                >
                  <Ionicons name="trash" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>
                    Remove{' '}
                    {selectedToRemove.length > 1
                      ? 'selected items'
                      : 'selected'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => setAddingItems(true)}
                    disabled={loadingAll}
                    style={[
                      styles.primaryBtn,
                      {
                        backgroundColor: BRAND.slate,
                        flex: 1,
                        opacity: loadingAll ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Ionicons name="add-circle" size={18} color="#fff" />
                    <Text style={styles.primaryBtnText}>Add items</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={deleteList}
                    disabled={saving}
                    style={[
                      styles.primaryBtn,
                      {
                        backgroundColor: BRAND.danger,
                        marginLeft: 12,
                        opacity: saving ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Ionicons name="trash" size={18} color="#fff" />
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            <>
              <View style={styles.countBadge}>
                <Text
                  style={[styles.countText, { color: BRAND.primary }]}
                >
                  {selectedToAdd.length}
                </Text>
              </View>
              <TouchableOpacity
                onPress={confirmAdd}
                disabled={!hasAddSelection || saving}
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: hasAddSelection
                      ? BRAND.primary
                      : BRAND.accent,
                    flex: 1,
                    marginLeft: 12,
                    opacity: saving ? 0.6 : 1,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color="#fff"
                />
                <Text style={styles.primaryBtnText}>Confirm add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setAddingItems(false);
                  setSelectedToAdd([]);
                }}
                disabled={saving}
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: BRAND.gray,
                    marginLeft: 12,
                    opacity: saving ? 0.6 : 1,
                  },
                ]}
              >
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </>
          )}
        </View>

        <InviteModal
          visible={inviteOpen}
          onClose={() => setInviteOpen(false)}
          collaboratorIds={collaboratorIds}
          collaboratorProfiles={collaboratorProfiles}
          loadingCollaborators={loadingCollaborators}
          onInvite={handleInvite}
          busyIds={inviteBusyIds}
        />
        <ContributorsModal />
        <Toast />
      </SafeAreaView>
    </KeyboardAvoidingView>
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
  heroMeta: {
    color: BRAND.inkMuted,
    fontSize: 14,
    marginTop: 6,
    fontWeight: '600',
  },
  heroStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    marginRight: -12,
  },
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
  heroStatValue: {
    color: BRAND.ink,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
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
  heroActionPrimaryText: {
    marginLeft: 8,
    color: BRAND.primary,
    fontWeight: '700',
  },
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
  heroActionSecondaryText: {
    marginLeft: 8,
    color: BRAND.primary,
    fontWeight: '700',
  },
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
  cardSelectedAdd: {
    borderColor: BRAND.primary,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: BRAND.ink },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    marginRight: -10,
  },
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
  metaText: {
    fontSize: 12,
    color: BRAND.inkMuted,
    marginLeft: 4,
    fontWeight: '600',
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: BRAND.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: BRAND.line,
  },
  sheetScrollContent: {
    paddingBottom: 12,
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
  helperText: { color: BRAND.inkMuted, fontSize: 12, marginTop: 12 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: BRAND.metaBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.line,
    padding: 12,
    marginTop: 12,
  },
  infoTitle: { color: BRAND.ink, fontWeight: '700', fontSize: 12 },
  infoText: { color: BRAND.inkMuted, fontSize: 12, marginTop: 2, lineHeight: 16 },
  searchingBox: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteBtn: {
    backgroundColor: BRAND.primary,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteBtnDisabled: {
    opacity: 0.6,
  },
  inviteBtnText: { color: '#fff', fontWeight: '700' },
  errorText: { color: BRAND.danger, marginTop: 8, fontWeight: '600' },
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
  usernameText: { color: BRAND.inkMuted, fontSize: 12, marginTop: 2 },
  emptyHint: {
    textAlign: 'center',
    color: BRAND.inkMuted,
    marginTop: 20,
    paddingHorizontal: 24,
  },
  toastWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 100,
    alignItems: 'center',
  },
  toastBox: {
    backgroundColor: 'rgba(17,24,39,0.92)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
});
