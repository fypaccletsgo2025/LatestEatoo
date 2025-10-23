// screens/PreferenceItemDetailScreen.js
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { availableRestaurants } from '../data/mockData';
import { isItemLiked, likeItem, unlikeItem } from '../state/libraryStore';

export default function PreferenceItemDetailScreen({ route }) {
  const { item } = route.params;
  const restaurant = useMemo(
    () => availableRestaurants.find(r => r.name === item.restaurant),
    [item.restaurant]
  );
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
          onPress={() => {
            if (liked) {
              unlikeItem(item.id);
              setLiked(false);
            } else {
              likeItem(item.id);
              setLiked(true);
            }
          }}
        >
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={20}
            color="#FFF8F3"
          />
        </TouchableOpacity>

        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.restaurant}>
          {item.restaurant} • {item.location}
        </Text>

        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <Badge text={item.price} color="#FDAA48" />
          <Badge text={`${item.rating}★`} color="#FDAA48" />
          <Badge text={item.type} color="#FFE0C0" />
        </View>
      </View>

      {/* Details */}
      <Section title="Cuisine">
        <Text style={styles.body}>{item.cuisine}</Text>
      </Section>

      {restaurant?.ambience?.length ? (
        <Section title="Ambience">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {restaurant.ambience.map((a, idx) => (
              <Chip key={`amb-${idx}`} label={a} />
            ))}
          </View>
        </Section>
      ) : null}

      <Section title="Tags">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {item.tags.map((t, idx) => (
            <Chip key={`tag-${idx}`} label={t} />
          ))}
        </View>
      </Section>

      <Section title="Description">
        <Text style={styles.body}>{item.description}</Text>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#FFF8F3' },
  headerCard: {
    backgroundColor: '#FF4D00',
    padding: 18,
    borderRadius: 18,
    marginBottom: 12,
  },
  name: { fontSize: 22, fontWeight: '800', color: '#FFF8F3' },
  restaurant: { fontSize: 16, color: '#FFF8F3', marginTop: 4 },
  body: { color: '#333' },
  iconFab: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDAA48',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});

function Badge({ text, color = '#FFE0C0' }) {
  return (
    <View
      style={{
        backgroundColor: color,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 8,
      }}
    >
      <Text style={{ fontSize: 12, color: '#111827' }}>{text}</Text>
    </View>
  );
}

function Chip({ label }) {
  return (
    <View
      style={{
        backgroundColor: '#FF4D00',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text style={{ color: '#FFF8F3' }}>{label}</Text>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text
        style={{
          fontWeight: 'bold',
          marginBottom: 6,
          color: '#FF4D00',
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}
