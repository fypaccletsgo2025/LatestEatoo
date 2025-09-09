// screens/DiscoverResultsScreen.js
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { availableItems } from '../data/mockData';

export default function DiscoverResultsScreen({ route, navigation }) {
  const { tag } = route.params || {};
  const items = React.useMemo(() => {
    if (!tag) return availableItems;
    const t = String(tag).toLowerCase();
    return availableItems.filter(i => (i.tags || []).map(x => String(x).toLowerCase()).includes(t));
  }, [tag]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{tag ? `Discover: ${tag}` : 'Discover'}</Text>
      {items.length === 0 ? (
        <View style={styles.emptyBox}><Text style={{ color: '#6b7280' }}>No matching items.</Text></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('PreferenceItemDetail', { item })}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>{item.restaurant} • {item.type} • {item.price}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#d1ccc7', padding: 16 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardMeta: { color: '#6b7280', marginTop: 4 },
  emptyBox: { backgroundColor: '#f3f4f6', padding: 14, borderRadius: 12, alignItems: 'center' },
});

