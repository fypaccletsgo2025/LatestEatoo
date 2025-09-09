// screens/UpdatesScreen.js
import React from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUpdates, addUpdate } from '../state/updatesStore';

function Post({ post }) {
  const date = new Date(post.dateISO);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.author}>{post.author}</Text>
          {post.role === 'owner' && (
            <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginLeft: 6 }} />
          )}
        </View>
        <Text style={styles.timestamp}>{time}</Text>
      </View>
      <Text style={styles.text}>{post.text}</Text>
    </View>
  );
}

export default function UpdatesScreen() {
  const [feed, setFeed] = React.useState(getUpdates());
  const [text, setText] = React.useState('');
  const [author, setAuthor] = React.useState('You');

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const authorName = author || 'You';
    addUpdate({ author: authorName, role: 'user', text: trimmed });
    setFeed(getUpdates());
    setText('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Updates</Text>

      {/* Composer */}
      <View style={styles.composer}>
        <TextInput
          placeholder="Your name (optional)"
          value={author}
          onChangeText={setAuthor}
          style={styles.inputSmall}
        />
        <TextInput
          placeholder="Share an update..."
          value={text}
          onChangeText={setText}
          style={styles.input}
          multiline
        />
        <TouchableOpacity onPress={submit} style={styles.postBtn}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Post</Text>
        </TouchableOpacity>
      </View>

      {/* Feed */}
      <FlatList
        data={feed}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <Post post={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#d1ccc7', padding: 16 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  composer: { backgroundColor: '#fff', padding: 12, borderRadius: 16, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#f9fafb', minHeight: 60, textAlignVertical: 'top', marginTop: 8 },
  inputSmall: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#f9fafb', marginBottom: 8 },
  postBtn: { marginTop: 8, backgroundColor: '#007AFF', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  author: { fontWeight: '800' },
  timestamp: { color: '#9ca3af' },
  text: { marginTop: 6, color: '#111827' },
});
