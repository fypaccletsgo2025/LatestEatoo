// screens/UpdatesScreen.js
import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, Pressable, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { getUpdates, addUpdate } from '../state/updatesStore';
import { availableRestaurants } from '../data/mockData';

const THEME_COLOR = '#FF4D00';

function Post({ post }) {
  const navigation = useNavigation();
  const date = new Date(post.dateISO);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const renderWithMentions = (t) => {
    const parts = [];
    const regex = /@([A-Za-z0-9._\-]{1,40})/g; // username: no spaces
    let lastIndex = 0;
    let m;
    while ((m = regex.exec(t)) !== null) {
      if (m.index > lastIndex)
        parts.push(<Text key={`p-${lastIndex}`}>{t.slice(lastIndex, m.index)}</Text>);
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
    if (lastIndex < t.length)
      parts.push(<Text key={`p-${lastIndex}`}>{t.slice(lastIndex)}</Text>);
    return parts;
  };
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
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
    </Pressable>
  );
}

export default function UpdatesScreen() {
  const [feed, setFeed] = React.useState(getUpdates());
  const [text, setText] = React.useState('');
  const [author, setAuthor] = React.useState('You');
  const [selection, setSelection] = React.useState({ start: 0, end: 0 });
  const [mentionQuery, setMentionQuery] = React.useState(null); // { start, query, hadAt }

  // Build tag sources: restaurant owners + known users (from reviews + existing feed)
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
    if (!mentionQuery || !mentionQuery.hadAt || !mentionQuery.query) return [];
    const norm = (s) => String(s).toLowerCase().replace(/\s+/g, '');
    const q = norm(mentionQuery.query);
    if (q.length < 1) return [];
    return allTags
      .filter(t => norm(t.name).includes(q))
      .slice(0, 8);
  }, [mentionQuery, allTags]);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const authorName = author || 'You';
    addUpdate({ author: authorName, role: 'user', text: trimmed });
    setFeed(getUpdates());
    setText('');
    setMentionQuery(null);
  };

  const updateMentionState = (nextText, sel) => {
    try {
      const cursor = sel?.start ?? 0;
      const upto = nextText.slice(0, cursor);
      const at = upto.lastIndexOf('@');
      if (at === -1) { setMentionQuery(null); return; }
      const beforeChar = at > 0 ? upto[at - 1] : '';
      if (beforeChar && !/\s/.test(beforeChar)) { setMentionQuery(null); return; }
      let token = upto.slice(at + 1);
      // stop at first whitespace so username token has no spaces
      token = token.split(/\s/)[0];
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
    const start = mentionQuery.start; // at-sign index
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

  return (
    <LinearGradient colors={['#fff5f0', '#ffffff']} style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        {/* Scrollable Feed */}
        <FlatList
          data={feed}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <Post post={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 10, paddingBottom: 120 }}
          style={{ flex: 1 }}
        />

        {/* Fixed Composer */}
        <View style={styles.composerContainer}>
          <View style={styles.composer}>
            <TextInput
              placeholder="Your name (optional)"
              value={author}
              onChangeText={setAuthor}
              style={styles.inputSmall}
            />
            <View style={{ position: 'relative', zIndex: 20 }}>
              <TextInput
                placeholder="Share an update..."
                value={text}
                onChangeText={handleChangeText}
                style={styles.input}
                multiline
                onSelectionChange={handleSelectionChange}
                selection={selection}
              />
              {visibleSuggestions.length > 0 && (
                <View style={styles.suggestBox}>
                  {visibleSuggestions.map((s) => (
                    <Pressable
                      key={s.type + s.id}
                      onPress={() => insertMention(s)}
                      style={styles.suggestItem}
                    >
                      <Ionicons
                        name={s.type === 'owner' ? 'storefront' : 'person'}
                        size={16}
                        color={THEME_COLOR}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={{ flex: 1 }}>{s.name}</Text>
                      {s.type === 'owner' && (
                        <Text style={[styles.ownerPill, { color: THEME_COLOR }]}>Owner</Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
            <TouchableOpacity onPress={submit} style={[styles.postBtn, { backgroundColor: THEME_COLOR }]}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Post</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  composerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  composer: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    margin: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#f9fafb',
    minHeight: 60,
    textAlignVertical: 'top',
    marginTop: 8,
  },
  inputSmall: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#f9fafb',
    marginBottom: 8,
  },
  postBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: THEME_COLOR,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  card: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  author: { fontWeight: '800' },
  timestamp: { color: '#9ca3af' },
  text: { marginTop: 6, color: '#111827' },
  mention: { fontWeight: '700', textDecorationLine: 'underline' },
  suggestBox: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 56,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  suggestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  ownerPill: { fontWeight: '700', fontSize: 12 },
});
