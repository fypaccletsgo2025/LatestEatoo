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

export default function ManageRestaurantScreen({ route }) {
  const navigation = useNavigation();
  const restaurant = route?.params?.restaurant || demoRestaurant;

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'right', 'bottom', 'left']}
    >
      <View style={styles.topBar}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.topBarTitle}>Manage Menu</Text>
      </View>
      <ManageRestaurantPanel restaurant={restaurant} />
    </SafeAreaView>
  );
}

export function ManageRestaurantPanel({ restaurant, embedded = false }) {
  const resolvedRestaurant = restaurant || demoRestaurant;
  const [version, setVersion] = useState(0);
  const items = useMemo(
    () => getUserItemsForRestaurant(resolvedRestaurant.id),
    [resolvedRestaurant.id, version]
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
        resolvedRestaurant.cuisine ||
        (resolvedRestaurant.cuisines && resolvedRestaurant.cuisines[0]) ||
        '',
      description: desc.trim(),
      tags: tagArr,
      rating: 0,
      reviews: [],
      restaurant: resolvedRestaurant.name,
      location: resolvedRestaurant.location,
    };
    addUserItem(resolvedRestaurant, item);
    setVersion((v) => v + 1);
    setShowAdd(false);
    setName('');
    setType('drink');
    setPrice('');
    setDesc('');
    setTags('');
  };

  const menuContent = (
    <>
      <View style={styles.heroCard}>
        <Text style={styles.name}>{resolvedRestaurant.name}</Text>
        <Text style={styles.meta}>{resolvedRestaurant.location}</Text>
        <View style={styles.heroChipRow}>
          <Badge text={`${resolvedRestaurant.rating}\u2605`} />
          <Badge text={resolvedRestaurant.averagePrice} />
          <Badge text={(resolvedRestaurant.cuisines || []).join(', ')} />
        </View>
      </View>

      {!!resolvedRestaurant.theme && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme</Text>
          <View style={styles.themeBox}>
            <Text style={styles.body}>{resolvedRestaurant.theme}</Text>
          </View>
        </View>
      )}

      {!!resolvedRestaurant.ambience?.length && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ambience</Text>
          <View style={styles.ambienceRow}>
            {resolvedRestaurant.ambience.map((mood) => (
              <View key={mood} style={styles.chip}>
                <Text style={styles.chipText}>{mood}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.menuHeader}>
          <Text style={styles.sectionTitle}>Menu Items</Text>
          <TouchableOpacity
            onPress={() => setShowAdd(true)}
            style={styles.addButton}
          >
            <Ionicons name="add" size={16} color={BRAND.primary} />
            <Text style={styles.addButtonText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No menu items yet</Text>
            <Text style={styles.emptyBody}>
              Add your first signature dish, drink, or dessert to showcase what makes your spot special.
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 12 }}
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={{ color: '#FFEBD8', marginTop: 6 }}>{item.price}</Text>
                {!!item.type && (
                  <Text style={{ color: '#FFEBD8', fontSize: 12, marginTop: 4 }}>
                    {item.type}
                  </Text>
                )}
                {!!item.description && (
                  <Text
                    style={{
                      color: '#FFEBD8',
                      fontSize: 12,
                      marginTop: 10,
                      lineHeight: 16,
                    }}
                    numberOfLines={3}
                  >
                    {item.description}
                  </Text>
                )}
              </View>
            )}
          />
        )}
      </View>
    </>
  );

  const containerStyles = [
    styles.container,
    embedded ? styles.embeddedContainer : null,
  ];

  return (
    <View style={embedded ? styles.embeddedRoot : styles.panelRoot}>
      {embedded ? (
        <View style={containerStyles}>{menuContent}</View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {menuContent}
        </ScrollView>
      )}

      {showAdd ? (
        <View style={styles.overlay} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.overlayBg}
            onPress={() => setShowAdd(false)}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Menu Item</Text>
            <Text style={styles.modalLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Spicy Ramen"
              placeholderTextColor={BRAND.inkMuted}
              value={name}
              onChangeText={setName}
            />
            <Text style={styles.modalLabel}>Type</Text>
            <TextInput
              style={styles.input}
              placeholder="meal, dessert, drink..."
              placeholderTextColor={BRAND.inkMuted}
              value={type}
              onChangeText={setType}
            />
            <Text style={styles.modalLabel}>Price (RM)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 18"
              placeholderTextColor={BRAND.inkMuted}
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Short description"
              placeholderTextColor={BRAND.inkMuted}
              multiline
              value={desc}
              onChangeText={setDesc}
            />
            <Text style={styles.modalLabel}>Tags (comma separated)</Text>
            <TextInput
              style={styles.input}
              placeholder="spicy, vegetarian..."
              placeholderTextColor={BRAND.inkMuted}
              value={tags}
              onChangeText={setTags}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSecondary]}
                onPress={() => setShowAdd(false)}
              >
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalPrimary]}
                onPress={submit}
              >
                <Text style={styles.modalPrimaryText}>Save Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </View>
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
  safeArea: { flex: 1, backgroundColor: BRAND.bg, paddingHorizontal: 20 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  topBarTitle: { fontSize: 18, fontWeight: '800', color: BRAND.ink },
  container: { flex: 1, backgroundColor: BRAND.bg, paddingHorizontal: 20 },
  panelRoot: {
    flex: 1,
    position: 'relative',
    width: '100%',
  },
  embeddedRoot: {
    width: '100%',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  embeddedContainer: {
    flex: undefined,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
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
