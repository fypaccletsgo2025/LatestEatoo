// screens/ManageRestaurantScreen.js
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import BackButton from '../components/BackButton';
import { getUserItemsForRestaurant, addUserItem } from '../state/userMenusStore';

const BRAND = {
  primary: '#FF4D00',
  accent: '#FDAA48',
  bg: '#FFF5ED',
  card: '#FFFFFF',
  line: '#FFE3C6',
  ink: '#1F2937',
  inkMuted: '#6B7280',
};

export default function ManageRestaurantScreen({ route }) {
  const demoRestaurant = {
    id: 'rest-espurrsso-bar',
    name: 'Espurrsso Bar',
    location: 'Mont Kiara, KL',
    cuisines: ['cafe'],
    cuisine: 'cafe',
    ambience: ['cat cafe', 'cozy', 'family friendly'],
    rating: 4.7,
    averagePrice: 'RM18',
    averagePriceValue: 18,
    theme: 'Cat cafe with specialty espresso and cuddly resident cats.',
  };

  const restaurant = route?.params?.restaurant || demoRestaurant;
  const [version, setVersion] = useState(0);
  const items = useMemo(
    () => getUserItemsForRestaurant(restaurant.id),
    [restaurant.id, version]
  );

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [tags, setTags] = useState('');

  const submit = () => {
    const nm = name.trim();
    const pr = price.trim();
    if (!nm || !pr) {
      Alert.alert('Missing fields', 'Please provide Name and Price (RM).');
      return;
    }
    const tagArr = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const item = {
      id: `user-it-${Date.now()}`,
      name: nm,
      type: type.trim() || 'meal',
      price: `RM${pr}`,
      cuisine:
        restaurant.cuisine ||
        (restaurant.cuisines && restaurant.cuisines[0]) ||
        '',
      description: desc.trim(),
      tags: tagArr,
      rating: 0,
      reviews: [],
      restaurant: restaurant.name,
      location: restaurant.location,
    };
    addUserItem(restaurant, item);
    setVersion((v) => v + 1);
    setShowAdd(false);
    setName('');
    setType('drink');
    setPrice('');
    setDesc('');
    setTags('');
  };

  const navigation = useNavigation();

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'right', 'bottom', 'left']}
    >
      <View style={styles.topBar}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.topBarTitle}>Manage Menu</Text>
      </View>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.name}>{restaurant.name}</Text>
          <Text style={styles.meta}>{restaurant.location}</Text>
          <View style={styles.heroChipRow}>
            <Badge text={`${restaurant.rating}\u2605`} />
            <Badge text={restaurant.averagePrice} />
            <Badge text={(restaurant.cuisines || []).join(', ')} />
          </View>
        </View>

        {!!restaurant.theme && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Theme</Text>
            <View style={styles.themeBox}>
              <Text style={styles.body}>{restaurant.theme}</Text>
            </View>
          </View>
        )}

        {(restaurant.ambience || []).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ambience</Text>
            <View style={styles.ambienceRow}>
              {restaurant.ambience.map((a, idx) => (
                <View key={`amb-${idx}`} style={styles.chip}>
                  <Text style={styles.chipText}>{a}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.menuHeader}>
            <Text style={styles.sectionTitle}>Menu</Text>
            <TouchableOpacity
              onPress={() => setShowAdd(true)}
              style={styles.addButton}
            >
              <Ionicons name="add" size={18} color={BRAND.primary} />
              <Text style={styles.addButtonText}>Add item</Text>
            </TouchableOpacity>
          </View>
          {items.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No items yet</Text>
              <Text style={styles.emptyBody}>
                Add your dishes or drinks to start showcasing the menu.
              </Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(i) => i.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 6, gap: 12 }}
              renderItem={({ item }) => (
                <View style={styles.itemCard}>
                  <Text style={styles.itemTitle}>{item.name}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 6 }}>
                    <Badge text={item.price} />
                    <Badge text={item.type} />
                    <Badge text={`${item.rating}\u2605`} />
                  </View>
                </View>
              )}
            />
          )}
        </View>

        {showAdd && (
          <View style={styles.overlay}>
            <TouchableOpacity
              style={styles.overlayBg}
              onPress={() => setShowAdd(false)}
            />
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Add Menu Item</Text>

              <Text style={styles.modalLabel}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholder="e.g. Mocha Latte"
              />

              <Text style={styles.modalLabel}>Type</Text>
              <TextInput
                value={type}
                onChangeText={setType}
                style={styles.input}
                placeholder="drink / meal / dessert"
              />

              <Text style={styles.modalLabel}>Price (RM)</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                style={styles.input}
                keyboardType="number-pad"
                placeholder="e.g. 15"
              />

              <Text style={styles.modalLabel}>Description</Text>
              <TextInput
                value={desc}
                onChangeText={setDesc}
                style={[styles.input, { minHeight: 70 }]}
                multiline
                placeholder="Optional"
              />

              <Text style={styles.modalLabel}>Tags (comma separated)</Text>
              <TextInput
                value={tags}
                onChangeText={setTags}
                style={styles.input}
                placeholder="e.g. signature, vegan"
              />

              <View style={{ flexDirection: 'row', marginTop: 16, gap: 10 }}>
                <TouchableOpacity
                  onPress={submit}
                  style={[styles.modalBtn, styles.modalPrimary]}
                >
                  <Text style={styles.modalPrimaryText}>Add item</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowAdd(false)}
                  style={[styles.modalBtn, styles.modalSecondary]}
                >
                  <Text style={styles.modalSecondaryText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Badge({ text }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BRAND.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: BRAND.bg,
  },
  topBarTitle: { fontSize: 20, fontWeight: '800', color: BRAND.ink },
  container: { flex: 1, backgroundColor: BRAND.bg, paddingHorizontal: 20 },
  heroCard: {
    backgroundColor: BRAND.primary,
    padding: 18,
    borderRadius: 18,
    marginBottom: 18,
    shadowColor: '#FFB27F',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  name: { fontSize: 22, fontWeight: '800', color: '#FFF8F3' },
  meta: { color: '#FFEBD8', marginTop: 6 },
  heroChipRow: { flexDirection: 'row', marginTop: 12, flexWrap: 'wrap', gap: 8 },
  section: { marginBottom: 18 },
  sectionTitle: { fontWeight: '800', color: BRAND.primary, fontSize: 16 },
  body: { color: BRAND.ink, marginTop: 4, lineHeight: 20 },
  themeBox: {
    backgroundColor: BRAND.accent,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  ambienceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    backgroundColor: BRAND.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: { color: '#FFF8F3', fontWeight: '600', fontSize: 12 },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BRAND.line,
    backgroundColor: '#fff',
  },
  addButtonText: { color: BRAND.primary, fontWeight: '700', fontSize: 12 },
  emptyBox: {
    backgroundColor: '#FFEFE2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFC9A3',
    padding: 18,
    alignItems: 'flex-start',
    gap: 6,
  },
  emptyTitle: { color: BRAND.ink, fontWeight: '800' },
  emptyBody: { color: BRAND.inkMuted, lineHeight: 20 },
  itemCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: BRAND.primary,
    shadowColor: '#FDAA48',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
    width: 200,
  },
  itemTitle: { fontWeight: '700', color: '#FFF8F3', fontSize: 15 },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    padding: 20,
    zIndex: 20,
  },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  modalCard: {
    backgroundColor: BRAND.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: BRAND.line,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    gap: 8,
  },
  modalTitle: { fontWeight: '800', fontSize: 16, color: BRAND.primary },
  modalLabel: { marginTop: 12, marginBottom: 6, fontWeight: '600', color: BRAND.ink },
  input: {
    borderWidth: 1,
    borderColor: BRAND.line,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
    color: BRAND.ink,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalPrimary: { backgroundColor: BRAND.primary },
  modalPrimaryText: { color: '#fff', fontWeight: '700' },
  modalSecondary: {
    borderWidth: 1,
    borderColor: BRAND.line,
    backgroundColor: '#fff',
  },
  modalSecondaryText: { color: BRAND.ink, fontWeight: '700' },
  badge: {
    backgroundColor: '#FFEFE2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { fontSize: 12, color: BRAND.ink, fontWeight: '600' },
});
