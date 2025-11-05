import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { BRAND, styles } from '././RestaurantDetailScreen.styles';
import { STAR, STAR_OUTLINE } from '././RestaurantDetailScreen.constants';

export function Badge({ text, color = BRAND.metaBg }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

export function Chip({ label }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

export function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Star({ filled, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingHorizontal: 4 }}>
      <Text style={filled ? styles.star : styles.starMuted}>
        {filled ? STAR : STAR_OUTLINE}
      </Text>
    </TouchableOpacity>
  );
}

export function StarInput({ value, onChange }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= value} onPress={() => onChange(n)} />
      ))}
      <Text style={styles.starCount}>{value || 0}/5</Text>
    </View>
  );
}
