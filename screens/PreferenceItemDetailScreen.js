// screens/PreferenceItemDetailScreen.js
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { availableRestaurants } from '../data/mockData';
import { isItemLiked, likeItem, unlikeItem } from '../state/libraryStore';

export default function PreferenceItemDetailScreen({ route }) {
  const { item } = route.params;
  const restaurant = useMemo(() => availableRestaurants.find(r => r.name === item.restaurant), [item.restaurant]);
  const [liked, setLiked] = useState(isItemLiked(item.id));

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
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
        <Text style={styles.restaurant}>{item.restaurant} • {item.location}</Text>
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <Badge text={item.price} />
          <Badge text={`${item.rating}★`} color="#fde68a" />
          <Badge text={item.type} color="#e0e7ff" />
        </View>
      </View>

      {/* Details */}
      <Section title="Cuisine">
        <Text>{item.cuisine}</Text>
      </Section>
      {restaurant?.ambience?.length ? (
        <Section title="Ambience">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {restaurant.ambience.map((a, idx) => (<Chip key={`amb-${idx}`} label={a} />))}
          </View>
        </Section>
      ) : null}
      <Section title="Tags">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {item.tags.map((t, idx) => (<Chip key={`tag-${idx}`} label={t} />))}
        </View>
      </Section>
      <Section title="Description">
        <Text>{item.description}</Text>
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
    marginBottom: 12,
  },
  name: { fontSize: 22, fontWeight: '800' },
  restaurant: { fontSize: 16, color: '#6b7280', marginTop: 4 },
  sectionTitle: { fontWeight: 'bold', marginTop: 12, marginBottom: 4 },
  reviewText: { marginLeft: 8, marginBottom: 2 },
  submitBtn: { marginTop: 12, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  iconFab: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: '#6B7280', alignItems: 'center', justifyContent: 'center', zIndex: 10, elevation: 3 },
});

function Badge({ text, color = '#e5e7eb' }) {
  return (
    <View style={{ backgroundColor: color, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8 }}>
      <Text style={{ fontSize: 12, color: '#111827' }}>{text}</Text>
    </View>
  );
}

function Chip({ label }) {
  return (
    <View style={{ backgroundColor: '#e5e7eb', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, marginRight: 8, marginBottom: 8 }}>
      <Text style={{ color: '#111827' }}>{label}</Text>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>{title}</Text>
      {children}
    </View>
  );
}
