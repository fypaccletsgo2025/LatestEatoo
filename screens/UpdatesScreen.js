// screens/UpdatesScreen.js
import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, Pressable, Modal, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Query } from 'appwrite';
import { db, DB_ID, COL, ensureSession, account } from '../appwrite';
import { getAllRestaurants } from '../services/catalogService';

const THEME_COLOR = '#FF4D00';
const BG_COLOR = '#FFF5ED';

const normalizeRole = (value) => {
  const norm = String(value || '').toLowerCase();
  if (
    norm.includes('owner') ||
    norm.includes('business') ||
    norm.includes('restaurant')
  ) {
    return 'owner';
  }
  return 'user';
};

const normalizeUpdateDoc = (doc) => {
  if (!doc) return null;
  const id = doc.$id || doc.id || `local-${Math.random().toString(36).slice(2)}`;
  const author =
    doc.authorName ||
    doc.author ||
    doc.displayName ||
    doc.username ||
    'Community member';
  const text = String(doc.text ?? doc.body ?? doc.message ?? '').trim();
  const dateISO =
    doc.dateISO ||
    doc.createdAt ||
    doc.$createdAt ||
    doc.updatedAt ||
    doc.$updatedAt ||
    new Date().toISOString();
  const authorType = doc.authorType || doc.author_type || null;
  const restaurantId = normalizeRestaurantId(doc.restaurantId || doc.restaurant_id || null);
  const roleSource = doc.role || doc.authorRole || doc.roleType || (authorType === 'restaurant' ? 'owner' : null);
  return {
    id,
    author,
    role: normalizeRole(roleSource),
    text,
    dateISO,
    authorType: authorType || null,
    restaurantId: restaurantId || null,
  };
};

const sanitizeMentionToken = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const deriveRoleFromProfile = (profile) => {
  if (!profile) return 'user';
  const pool = [];
  if (Array.isArray(profile.labels)) pool.push(...profile.labels);
  if (Array.isArray(profile.roles)) pool.push(...profile.roles);
  pool.push(profile?.prefs?.role, profile?.prefs?.accountType, profile?.prefs?.businessRole);
  const match = pool
    .map((value) => String(value || '').toLowerCase())
    .find((value) =>
      value && (value.includes('owner') || value.includes('business') || value.includes('restaurant'))
    );
  return match ? 'owner' : 'user';
};

const normalizeRestaurantId = (value) => {
  if (!value) return null;
  const str = String(value).trim();
  return str.replace(/^req-/i, '');
};

function Header({ onAddPress }) {
  return (
    <View style={styles.headerContainer}>
      <Text style={styles.headerTitle}>Community Updates</Text>
      <View style={styles.subtitleRow}>
        <Text style={styles.headerSubtitle}>Share what’s new & tag places you love</Text>
        <TouchableOpacity onPress={onAddPress} style={styles.plusButton} accessibilityLabel="New post">
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Post({ post, restaurants }) {
  const navigation = useNavigation();
  const date = new Date(post.dateISO);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const renderWithMentions = (t) => {
    const parts = [];
    const regex = /@([A-Za-z0-9._\-]{1,40})/g;
    let lastIndex = 0;
    let m;
    while ((m = regex.exec(t)) !== null) {
      if (m.index > lastIndex) parts.push(<Text key={`p-${lastIndex}`}>{t.slice(lastIndex, m.index)}</Text>);
      const name = m[1];
    const norm = (s) => sanitizeMentionToken(s);
    const r = (restaurants || []).find((rr) => norm(rr.name) === norm(name));
      parts.push(
        <Text
          key={`m-${m.index}`}
          style={[styles.mention, { color: THEME_COLOR }]}
          onPress={() => r && navigation.navigate('RestaurantDetail', { restaurant: r })}
        >
          @{name}
        </Text>
      );
      lastIndex = m.index + m[0].length;
    }
    if (lastIndex < t.length) parts.push(<Text key={`p-${lastIndex}`}>{t.slice(lastIndex)}</Text>);
    return parts;
  };

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.author}>{post.author}</Text>
          {post.role === 'owner' && (
            <Ionicons name="checkmark-circle" size={16} color={THEME_COLOR} style={{ marginLeft: 6 }} />
          )}
        </View>
        <Text style={styles.timestamp}>{time}</Text>
      </View>
      <Text style={styles.text}>{renderWithMentions(post.text)}</Text>
    </View>
  );
}

export default function UpdatesScreen({ onScrollDirectionChange }) {
  const [feed, setFeed] = React.useState([]);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [loadingFeed, setLoadingFeed] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [fetchError, setFetchError] = React.useState('');
  const [posting, setPosting] = React.useState(false);
  const [postError, setPostError] = React.useState('');
  const [restaurantDirectory, setRestaurantDirectory] = React.useState([]);
  const [currentUser, setCurrentUser] = React.useState(null);
  const [identityOptions, setIdentityOptions] = React.useState([]);
  const [selectedIdentityId, setSelectedIdentityId] = React.useState('personal');
  const [showIdentityDropdown, setShowIdentityDropdown] = React.useState(false);
  const [loadingIdentities, setLoadingIdentities] = React.useState(false);
  const selectedIdentity = React.useMemo(
    () => identityOptions.find((opt) => opt.id === selectedIdentityId) || identityOptions[0] || null,
    [identityOptions, selectedIdentityId]
  );
  const canSwitchIdentity = identityOptions.length > 1;
  React.useEffect(() => {
    let cancelled = false;
    getAllRestaurants()
      .then((list) => {
        if (!cancelled) setRestaurantDirectory(list || []);
      })
      .catch(() => {
        if (!cancelled) setRestaurantDirectory([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Modal composer state
  const [authorInput, setAuthorInput] = React.useState('');
  const [text, setText] = React.useState('');
  const [selection, setSelection] = React.useState({ start: 0, end: 0 });
  const [mentionQuery, setMentionQuery] = React.useState(null); // { start, query, hadAt }

  // Tag sources
  const restaurantTags = React.useMemo(
    () =>
      (restaurantDirectory || []).map((r) => ({
        id: r.id || r.$id,
        name: r.name,
        mention: sanitizeMentionToken(r.name),
        location: r.location || r.address || '',
        restaurant: r,
      })),
    [restaurantDirectory]
  );

  const visibleSuggestions = React.useMemo(() => {
    if (!mentionQuery || !mentionQuery.hadAt) return [];
    const q = sanitizeMentionToken(mentionQuery.query || '');
    if (q.length < 1) return restaurantTags.slice(0, 8);
    return restaurantTags.filter((t) => t.mention.includes(q)).slice(0, 8);
  }, [mentionQuery, restaurantTags]);

  const updateMentionState = (nextText, sel) => {
    try {
      const cursor = sel?.start ?? 0;
      const upto = nextText.slice(0, cursor);
      const at = upto.lastIndexOf('@');
      if (at === -1) { setMentionQuery(null); return; }
      const beforeChar = at > 0 ? upto[at - 1] : '';
      if (beforeChar && !/\s/.test(beforeChar)) { setMentionQuery(null); return; } // requires whitespace before '@'
      let token = upto.slice(at + 1);
      token = token.split(/\s/)[0]; // usernames: no spaces
      if (token.includes('\n') || token.includes('\r') || token.includes('@')) { setMentionQuery(null); return; }
      setMentionQuery({ start: at, query: token, hadAt: true });
    } catch {
      setMentionQuery(null);
    }
  };

  const handleChangeText = (val) => {
    setText(val);
    if (postError) setPostError('');
    updateMentionState(val, selection);
  };

  const handleSelectionChange = ({ nativeEvent: { selection: sel } }) => {
    setSelection(sel);
    updateMentionState(text, sel);
  };

  const insertMention = (tag) => {
    if (!mentionQuery) return;
    const cursor = selection?.start ?? text.length;
    const start = mentionQuery.start; // index of '@'
    const before = text.slice(0, start);
    const after = text.slice(cursor);
    const sanitized = sanitizeMentionToken(tag.name);
    const fallback = String(tag.name || '').replace(/\s+/g, '');
    const username = sanitized || fallback || 'place';
    const insert = `@${username} `;
    const next = `${before}${insert}${after}`;
    const nextCursor = (before + insert).length;
    setText(next);
    setSelection({ start: nextCursor, end: nextCursor });
    setMentionQuery(null);
  };

  const loadUpdates = React.useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoadingFeed(true);
      }
      try {
        await ensureSession();
        const res = await db.listDocuments(DB_ID, COL.updates, [
          Query.orderDesc('$createdAt'),
          Query.limit(100),
        ]);
        const docs = Array.isArray(res?.documents) ? res.documents : [];
        const normalized = docs.map(normalizeUpdateDoc).filter(Boolean);
        setFeed(normalized);
        setFetchError('');
      } catch (error) {
        console.warn('Failed to load updates', error?.message || error);
        setFetchError(error?.message || 'Unable to load updates right now.');
      } finally {
        setLoadingFeed(false);
        setRefreshing(false);
      }
    },
    []
  );

  React.useEffect(() => {
    loadUpdates();
  }, [loadUpdates]);

  const handleRefresh = React.useCallback(() => {
    loadUpdates({ silent: true });
  }, [loadUpdates]);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoadingIdentities(true);
        await ensureSession();
        const profile = await account.get();
        if (!active) return;
        setCurrentUser(profile);
        const fallback = profile?.email || 'You';
        const inferred = profile?.name?.trim() || profile?.prefs?.displayName || fallback;
        setAuthorInput((prev) => (prev && prev.trim() ? prev : inferred));
        const personalIdentity = {
          id: 'personal',
          label: inferred,
          type: 'personal',
          role: deriveRoleFromProfile(profile),
        };
        let restaurantIdentities = [];
        try {
          const res = await db.listDocuments(DB_ID, COL.restaurantRequests, [
            Query.equal('ownerId', profile.$id),
            Query.equal('status', 'approved'),
            Query.limit(10),
          ]);
          restaurantIdentities = (res?.documents || []).map((doc) => {
            const rid = normalizeRestaurantId(
              doc.restaurantId ||
                doc.restaurant_id ||
                doc.linkedRestaurantId ||
                doc.publishedRestaurantId ||
                null
            );
            const label =
              doc.businessName ||
              doc.name ||
              doc.restaurantName ||
              doc.restaurant?.name ||
              'Your Restaurant';
            return {
              id: `restaurant-${doc.$id}`,
              label,
              type: 'restaurant',
              role: 'owner',
              restaurantId: rid || null,
            };
          });
        } catch (err) {
          console.warn('UpdatesScreen: unable to load business profile', err?.message || err);
        }
        const options = [personalIdentity, ...restaurantIdentities];
        setIdentityOptions(options);
        setSelectedIdentityId((prev) =>
          options.some((opt) => opt.id === prev) ? prev : options[0]?.id || 'personal'
        );
      } catch {
        if (!active) return;
        setCurrentUser(null);
        setIdentityOptions([]);
        setSelectedIdentityId('personal');
        setAuthorInput((prev) => (prev && prev.trim() ? prev : 'You'));
      } finally {
        if (active) setLoadingIdentities(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!modalVisible) {
      setShowIdentityDropdown(false);
    }
  }, [modalVisible]);

  const submit = React.useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setPostError('Share something before posting.');
      return;
    }
    setPosting(true);
    setPostError('');
    try {
      await ensureSession();
      const profile = currentUser || (await account.get());
      if (!currentUser && profile) {
        setCurrentUser(profile);
      }
      if (!profile?.$id) {
        throw new Error('Unable to identify your session. Please try again.');
      }
      const identity = selectedIdentity || identityOptions[0] || null;
      const isRestaurant = identity?.type === 'restaurant';
      const resolvedAuthor =
        (isRestaurant ? identity?.label : authorInput)?.trim() ||
        identity?.label ||
        profile?.name ||
        profile?.email ||
        'Community member';
      const resolvedRole = isRestaurant
        ? 'owner'
        : identity?.role || deriveRoleFromProfile(profile);
      const payload = {
        text: trimmed,
        authorName: resolvedAuthor,
        authorRole: resolvedRole,
        authorType: identity?.type || 'user',
        authorid: profile.$id,
        restaurantId: isRestaurant ? identity?.restaurantId || null : null,
      };
      const doc = await db.createDocument(DB_ID, COL.updates, 'unique()', payload);
      const normalized = normalizeUpdateDoc(doc);
      if (normalized) {
        setFeed((prev) => [normalized, ...prev]);
      }
      setText('');
      setSelection({ start: 0, end: 0 });
      setMentionQuery(null);
      setModalVisible(false);
    } catch (error) {
      setPostError(error?.message || 'Unable to share update right now.');
    } finally {
      setPosting(false);
    }
  }, [text, authorInput, selectedIdentity, identityOptions, currentUser]);

  React.useEffect(() => {
    if (!modalVisible) {
      setPostError('');
      setPosting(false);
    }
  }, [modalVisible]);

  const scrollOffsetRef = React.useRef(0);
  const lastDirectionRef = React.useRef('down');
  const reportScrollDirection = React.useCallback(
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

  React.useEffect(() => {
    reportScrollDirection('down');
  }, [reportScrollDirection]);

  const handleScroll = React.useCallback(
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

  return (
    <View style={{ flex: 1, backgroundColor: BG_COLOR }}>
      <FlatList
        data={feed}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <Post post={item} restaurants={restaurantDirectory} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        ListHeaderComponent={
          <>
            <Header onAddPress={() => setModalVisible(true)} />
            {fetchError ? (
              <Text style={[styles.errorText, { marginHorizontal: 16, marginTop: 8 }]}>
                {fetchError}
              </Text>
            ) : null}
            <View style={styles.feedDivider} />
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {loadingFeed ? (
              <>
                <ActivityIndicator color={THEME_COLOR} />
                <Text style={[styles.emptyText, { marginTop: 12 }]}>Loading updates...</Text>
              </>
            ) : (
              <Text style={styles.emptyText}>
                {fetchError
                  ? 'Unable to load updates right now.'
                  : 'No updates yet. Be the first to share one!'}
              </Text>
            )}
          </View>
        }
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      {/* Modal composer with working @mentions */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{ color: '#555', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Post</Text>
              <TouchableOpacity onPress={submit} disabled={posting || !text.trim()}>
                <Text
                  style={{
                    color: posting || !text.trim() ? '#A1A1AA' : THEME_COLOR,
                    fontWeight: '700',
                  }}
                >
                  {posting ? 'Posting...' : 'Post'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Post as</Text>
            <View style={{ marginBottom: 10 }}>
              <TouchableOpacity
                style={[styles.identitySelector, !canSwitchIdentity ? styles.identitySelectorDisabled : null]}
                onPress={() => canSwitchIdentity && setShowIdentityDropdown((prev) => !prev)}
                activeOpacity={0.9}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.identitySelectorTitle}>
                    {selectedIdentity?.label || 'Personal profile'}
                  </Text>
                  <Text style={styles.identitySelectorSubtitle}>
                    {loadingIdentities
                      ? 'Detecting profiles...'
                      : selectedIdentity?.type === 'restaurant'
                      ? 'Business profile - verified'
                      : 'Personal profile'}
                  </Text>
                </View>
                <Ionicons
                  name={showIdentityDropdown ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#111827"
                />
              </TouchableOpacity>
              {showIdentityDropdown ? (
                <View style={styles.identityDropdown}>
                  {identityOptions.map((opt) => {
                    const isActive = opt.id === selectedIdentity?.id;
                    return (
                      <Pressable
                        key={opt.id}
                        onPress={() => {
                          setSelectedIdentityId(opt.id);
                          setShowIdentityDropdown(false);
                          if (opt.type === 'personal' && !authorInput) {
                            setAuthorInput(opt.label);
                          }
                        }}
                        style={[styles.identityOption, isActive ? styles.identityOptionActive : null]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.identityOptionTitle}>{opt.label}</Text>
                          <Text style={styles.identityOptionSubtitle}>
                            {opt.type === 'restaurant' ? 'Business profile' : 'Personal profile'}
                          </Text>
                        </View>
                        {opt.type === 'restaurant' ? (
                          <Ionicons name="checkmark-circle" size={18} color={THEME_COLOR} />
                        ) : isActive ? (
                          <Ionicons name="person-circle-outline" size={18} color="#6B7280" />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>

            {selectedIdentity?.type === 'restaurant' ? (
              <View style={styles.identityLock}>
                <Ionicons name="information-circle-outline" size={16} color={THEME_COLOR} />
                <Text style={styles.identityLockText}>
                  Posting as your restaurant. This will show the orange verification tick.
                </Text>
              </View>
            ) : (
              <TextInput
                placeholder="Your name (optional)"
                value={authorInput}
                onChangeText={setAuthorInput}
                style={styles.modalInputSmall}
                placeholderTextColor="#999"
              />
            )}

            <View style={{ position: 'relative' }}>
              <TextInput
                placeholder="What’s new? Use @ to mention"
                value={text}
                onChangeText={handleChangeText}
                style={styles.modalInput}
                placeholderTextColor="#999"
                multiline
                onSelectionChange={handleSelectionChange}
                selection={selection}
              />
              {visibleSuggestions.length > 0 && (
                <View style={styles.suggestBox}>
                  <FlatList
                    data={visibleSuggestions}
                    keyExtractor={(s) => `restaurant-${s.id}`}
                    renderItem={({ item: s }) => (
                      <Pressable onPress={() => insertMention(s)} style={styles.suggestItem}>
                        <Ionicons
                          name="restaurant"
                          size={16}
                          color={THEME_COLOR}
                          style={{ marginRight: 8 }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: '700', color: '#111827' }}>{s.name}</Text>
                          {!!s.location && (
                            <Text style={styles.suggestLocation}>{s.location}</Text>
                          )}
                        </View>
                      </Pressable>
                    )}
                    ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: '#f3f4f6' }} />}
                    keyboardShouldPersistTaps="handled"
                    style={{ maxHeight: 220 }}
                  />
                </View>
              )}
            </View>
            {postError ? <Text style={styles.postError}>{postError}</Text> : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/* STYLES */
const styles = StyleSheet.create({
  /* Header */
  headerContainer: {
    padding: 22,
    backgroundColor: THEME_COLOR,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
    marginHorizontal: -16,
    marginBottom: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSubtitle: {
    color: '#fff',
    opacity: 0.95,
    fontSize: 15,
    flexShrink: 1,
    paddingRight: 10,
  },
  plusButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  feedDivider: {
    height: 1,
    backgroundColor: '#FFC299',
    marginVertical: 10,
    borderRadius: 2,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#6B7280',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },

  /* Posts */
  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 14,
    borderColor: '#FFE8D2',
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  author: { fontWeight: '800', color: '#111827' },
  timestamp: { color: '#9ca3af', fontSize: 12 },
  text: { marginTop: 6, color: '#3C1E12' },
  mention: { fontWeight: '700', textDecorationLine: 'underline' },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 24,
    minHeight: 320,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontWeight: '800',
    fontSize: 18,
    color: '#111',
  },
  modalInputSmall: {
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#fafafa',
    marginBottom: 10,
    fontSize: 14,
    color: '#333',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fafafa',
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 15,
    color: '#333',
  },
  inputLabel: { fontWeight: '700', color: '#111827', marginBottom: 8 },
  identitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fafafa',
    marginBottom: 8,
  },
  identitySelectorDisabled: { opacity: 0.8 },
  identitySelectorTitle: { fontWeight: '800', color: '#111827', fontSize: 14 },
  identitySelectorSubtitle: { color: '#6B7280', marginTop: 2, fontSize: 12 },
  identityDropdown: {
    borderWidth: 1,
    borderColor: '#FFE8D2',
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: THEME_COLOR,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    marginBottom: 8,
  },
  identityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  identityOptionActive: { backgroundColor: '#FFF7EF' },
  identityOptionTitle: { fontWeight: '700', color: '#111827', fontSize: 14 },
  identityOptionSubtitle: { color: '#6B7280', marginTop: 2, fontSize: 12 },
  identityLock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF7EF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE8D2',
    padding: 10,
    marginBottom: 10,
  },
  identityLockText: { color: '#6B4A3F', flex: 1, fontSize: 13 },

  /* Suggestions */
  suggestBox: {
    position: 'absolute',
    left: 0, right: 0, top: 56,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE8D2',
    shadowColor: THEME_COLOR,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 20,
  },
  suggestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  suggestLocation: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  postError: {
    color: '#B91C1C',
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
  },
});
