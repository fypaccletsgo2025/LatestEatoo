// screens/FoodItemDetailScreen.js

import React from 'react';
import { View, Text, FlatList, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isItemLiked, likeItem, unlikeItem } from '../state/libraryStore';

export default function FoodItemDetailScreen({ route }) {
  const { item } = route.params;
  const [liked, setLiked] = React.useState(isItemLiked(item.id));

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerCard}>
        {/* Like icon */}
        <TouchableOpacity
          style={styles.iconFab}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Unlike dish' : 'Like dish'}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => { if (liked) { unlikeItem(item.id); setLiked(false); } else { likeItem(item.id); setLiked(true); } }}
        >
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.detail}>{item.restaurant} • {item.location}</Text>
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <Badge text={item.price} />
          <Badge text={`${item.rating}★`} color="#fde68a" />
          <Badge text={item.type} color="#e0e7ff" />
        </View>
      </View>

      <Section title="Description">
        <Text style={styles.description}>{item.description}</Text>
      </Section>

      <Section title="Tags">
        <FlatList
          data={item.tags}
          horizontal
          keyExtractor={(tag, index) => `${item.id}-tag-${index}`}
          renderItem={({ item: tag }) => (
            <View style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
          )}
          showsHorizontalScrollIndicator={false}
        />
      </Section>

      {/* Reviews removed: reviews live on restaurant page */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#d1ccc7' },
  headerCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  name: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  detail: { fontSize: 16, color: '#6b7280' },
  description: { fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
  tag: { backgroundColor: '#e5e7eb', paddingVertical: 6, paddingHorizontal: 10, marginRight: 6, borderRadius: 16 },
  tagText: { fontSize: 14 },
  review: { fontSize: 14, marginBottom: 2 },
  iconFab: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: '#6B7280', alignItems: 'center', justifyContent: 'center', zIndex: 10, elevation: 3 },
});

function Badge({ text, color = '#e5e7eb' }) {
  return (
    <View style={{ backgroundColor: color, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8 }}>
      <Text style={{ fontSize: 12, color: '#111827' }}>{text}</Text>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={{ marginTop: 12, marginBottom: 6 }}>
      <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>{title}</Text>
      {children}
    </View>
  );
}
