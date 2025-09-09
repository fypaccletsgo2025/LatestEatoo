// screens/RestaurantDetailScreen.js
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { availableItems } from '../data/mockData';
import { isRestaurantSaved, saveRestaurant, unsaveRestaurant } from '../state/libraryStore';
import { getUserReviews, addUserReview } from '../state/reviewsStore';

export default function RestaurantDetailScreen({ route, navigation }) {
  const { restaurant } = route.params;

  const items = useMemo(
    () => availableItems.filter(i => i.restaurant === restaurant.name),
    [restaurant.name]
  );

  const [userReviews, setUserReviews] = useState(getUserReviews(restaurant.id));
  const [showReview, setShowReview] = useState(false);
  const [taste, setTaste] = useState(0);
  const [location, setLocation] = useState(0);
  const [coziness, setCoziness] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(isRestaurantSaved(restaurant.id));

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        {/* Save icon */}
        <TouchableOpacity
          style={styles.iconFab}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Unsave restaurant' : 'Save restaurant'}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => { if (saved) { unsaveRestaurant(restaurant.id); setSaved(false); } else { saveRestaurant(restaurant.id); setSaved(true); } }}
        >
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.name}>{restaurant.name}</Text>
        <Text style={styles.meta}>{restaurant.location}</Text>
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <Badge text={`${restaurant.rating}★`} color="#fde68a" />
          <Badge text={restaurant.averagePrice} />
          <Badge text={restaurant.cuisines.join(', ')} color="#e0e7ff" />
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#111827' }]}
            onPress={() => Alert.alert('Location', 'Redirect to Waze')}
          >
            <Text style={styles.actionText}>Location</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#007AFF' }]}
            onPress={() => { setShowReview(true); setSubmitted(false); }}
          >
            <Text style={styles.actionText}>Review</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Theme */}
      <Section title="Theme">
        <Text style={styles.body}>{restaurant.theme}</Text>
      </Section>

      {/* Ambience Chips */}
      {restaurant.ambience?.length ? (
        <Section title="Ambience">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {restaurant.ambience.map((a, idx) => (
              <Chip key={`amb-${idx}`} label={a} />
            ))}
          </View>
        </Section>
      ) : null}

      {/* Popular Items */}
      <Section title="Popular Items">
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.itemCard}
              onPress={() => navigation.navigate('PreferenceItemDetail', { item })}
            >
              <Text style={styles.itemName}>{item.name}</Text>
              <View style={{ flexDirection: 'row', marginTop: 6 }}>
                <Badge text={item.price} />
                <Badge text={item.type} color="#e0e7ff" />
                <Badge text={`${item.rating}★`} color="#fde68a" />
              </View>
            </TouchableOpacity>
          )}
        />
      </Section>

      {/* Reviews */}
      {((userReviews && userReviews.length) || (restaurant.reviews && restaurant.reviews.length)) ? (
        <Section title="Reviews">
          {[...userReviews, ...(restaurant.reviews || [])].map((rev, idx) => (
            <View key={`rev-${idx}`} style={styles.reviewCard}>
              <Text style={{ fontWeight: '700' }}>{rev.user}</Text>
              <Text style={{ color: '#6b7280', marginTop: 2 }}>{rev.rating} ★</Text>
              {!!rev.comment && <Text style={{ marginTop: 6 }}>{rev.comment}</Text>}
              {rev.taste || rev.location || rev.coziness ? (
                <View style={{ flexDirection: 'row', marginTop: 6 }}>
                  {typeof rev.taste === 'number' && <Badge text={`Taste ${rev.taste}★`} color="#fde68a" />}
                  {typeof rev.location === 'number' && <Badge text={`Location ${rev.location}★`} color="#fde68a" />}
                  {typeof rev.coziness === 'number' && <Badge text={`Coziness ${rev.coziness}★`} color="#fde68a" />}
                </View>
              ) : null}
            </View>
          ))}
        </Section>
      ) : null}

      {/* Review Overlay */}
      {showReview && (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayBg} onPress={() => setShowReview(false)} />
          <View style={styles.modalCard}>
            {!submitted ? (
              <>
                <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: 8 }}>Leave a Review</Text>
                <Text style={styles.modalLabel}>Rate Taste</Text>
                <StarInput value={taste} onChange={setTaste} />
                <Text style={styles.modalLabel}>Rate Location</Text>
                <StarInput value={location} onChange={setLocation} />
                <Text style={styles.modalLabel}>Rate Coziness</Text>
                <StarInput value={coziness} onChange={setCoziness} />
                <Text style={styles.modalLabel}>Comments (optional)</Text>
                <TextInput
                  placeholder="Share more about your experience"
                  value={comment}
                  onChangeText={setComment}
                  style={styles.input}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: '#111827' }]}
                  onPress={() => {
                    const overall = Math.round(((taste || 0) + (location || 0) + (coziness || 0)) / 3) || 0;
                    const newReview = { user: 'You', rating: overall, comment: comment.trim() || undefined, taste, location, coziness };
                    addUserReview(restaurant.id, newReview);
                    setUserReviews(getUserReviews(restaurant.id));
                    setSubmitted(true);
                    setComment(''); setTaste(0); setLocation(0); setCoziness(0);
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Submit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#6b7280' }]} onPress={() => setShowReview(false)}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: 6 }}>Thank you!</Text>
                <Text style={{ color: '#6b7280', textAlign: 'center' }}>Your review has been submitted.</Text>
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#007AFF', marginTop: 12 }]} onPress={() => setShowReview(false)}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}
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
  iconFab: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 3,
  },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: '#fff', fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '800' },
  meta: { color: '#6b7280', marginTop: 4 },
  sectionTitle: { marginTop: 12, marginBottom: 6, fontWeight: 'bold' },
  body: { color: '#333' },
  itemCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginRight: 12,
  },
  itemName: { fontWeight: '700', marginBottom: 4 },
  reviewCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    marginBottom: 8,
  },
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  overlayBg: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.25)' },
  modalCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 80,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  modalLabel: { marginTop: 10, marginBottom: 6, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    minHeight: 60,
    textAlignVertical: 'top',
    backgroundColor: '#f9fafb',
  },
  submitBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
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

function Star({ filled, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingHorizontal: 4 }}>
      <Text style={{ fontSize: 20, color: filled ? '#f59e0b' : '#d1d5db' }}>{filled ? '★' : '☆'}</Text>
    </TouchableOpacity>
  );
}

function StarInput({ value, onChange }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {[1,2,3,4,5].map(n => (
        <Star key={n} filled={n <= value} onPress={() => onChange(n)} />
      ))}
      <Text style={{ marginLeft: 8, color: '#6b7280' }}>{value || 0}/5</Text>
    </View>
  );
}
