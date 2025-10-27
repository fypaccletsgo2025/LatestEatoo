// screens/UpdatesScreen.js
import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, Pressable, Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getUpdates, addUpdate } from '../state/updatesStore';
import { availableRestaurants } from '../data/mockData';

const THEME_COLOR = '#FF4D00';
const BG_COLOR = '#FFF5ED';

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

function Post({ post }) {
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
      const norm = (s) => String(s).toLowerCase().replace(/\s+/g, '');
      const r = (availableRestaurants || []).find(rr => norm(rr.name) === norm(name));
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

export default function UpdatesScreen() {
  const [feed, setFeed] = React.useState(getUpdates());
  const [modalVisible, setModalVisible] = React.useState(false);

  // Modal composer state
  const [author, setAuthor] = React.useState('You');
  const [text, setText] = React.useState('');
  const [selection, setSelection] = React.useState({ start: 0, end: 0 });
  const [mentionQuery, setMentionQuery] = React.useState(null); // { start, query, hadAt }

  // Tag sources
  const ownerTags = React.useMemo(
    () => (availableRestaurants || []).map(r => ({ id: r.id, name: r.name, type: 'owner' })),
    []
  );
  const userTags = React.useMemo(() => {
    const users = new Set();
    (availableRestaurants || []).forEach(r => {
      (r.reviews || []).forEach(rv => users.add(rv.user));
    });
    (feed || []).forEach(p => { if (p.role === 'user') users.add(p.author); });
    return Array.from(users).map(u => ({ id: `user-${u}`, name: u, type: 'user' }));
  }, [feed]);
  const allTags = React.useMemo(() => [...ownerTags, ...userTags], [ownerTags, userTags]);

  const visibleSuggestions = React.useMemo(() => {
    if (!mentionQuery || !mentionQuery.hadAt) return [];
    const norm = (s) => String(s).toLowerCase().replace(/\s+/g, '');
    const q = norm(mentionQuery.query || '');
    if (q.length < 1) return allTags.slice(0, 8);
    return allTags.filter(t => norm(t.name).includes(q)).slice(0, 8);
  }, [mentionQuery, allTags]);

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
    const username = String(tag.name).replace(/\s+/g, '');
    const insert = `@${username} `;
    const next = `${before}${insert}${after}`;
    const nextCursor = (before + insert).length;
    setText(next);
    setSelection({ start: nextCursor, end: nextCursor });
    setMentionQuery(null);
  };

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addUpdate({ author: author || 'You', role: 'user', text: trimmed });
    setFeed(getUpdates());
    setText('');
    setSelection({ start: 0, end: 0 });
    setMentionQuery(null);
    setModalVisible(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG_COLOR }}>
      <FlatList
        data={feed}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <Post post={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        ListHeaderComponent={
          <>
            <Header onAddPress={() => setModalVisible(true)} />
            <View style={styles.feedDivider} />
          </>
        }
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
              <TouchableOpacity onPress={submit}>
                <Text style={{ color: THEME_COLOR, fontWeight: '700' }}>Post</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="Your name (optional)"
              value={author}
              onChangeText={setAuthor}
              style={styles.modalInputSmall}
              placeholderTextColor="#999"
            />

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
                    keyExtractor={(s) => `${s.type}-${s.id}`}
                    renderItem={({ item: s }) => (
                      <Pressable onPress={() => insertMention(s)} style={styles.suggestItem}>
                        <Ionicons
                          name={s.type === 'owner' ? 'storefront' : 'person'}
                          size={16}
                          color={THEME_COLOR}
                          style={{ marginRight: 8 }}
                        />
                        <Text style={{ flex: 1 }}>{s.name}</Text>
                        {s.type === 'owner' && <Text style={styles.ownerPill}>Owner</Text>}
                      </Pressable>
                    )}
                    ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: '#f3f4f6' }} />}
                    keyboardShouldPersistTaps="handled"
                    style={{ maxHeight: 220 }}
                  />
                </View>
              )}
            </View>
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
  ownerPill: { fontWeight: '700', fontSize: 12, color: THEME_COLOR },
});
