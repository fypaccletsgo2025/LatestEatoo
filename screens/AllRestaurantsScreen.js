import React from 'react';
import {
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import BackButton from '../components/BackButton';
import { availableRestaurants } from '../data/mockData';

export default function AllRestaurantsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const restaurants = route.params?.restaurants ?? availableRestaurants;

  const openRestaurant = (restaurant) => {
    navigation.navigate('RestaurantDetail', { restaurant });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      <StatusBar backgroundColor="#FF4D00" barStyle="light-content" />

      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle}>All Restaurants</Text>
          <View style={styles.headerSpacer} />
        </View>
        <Text style={styles.headerSubtitle}>Explore every place that matches your taste.</Text>
      </View>

      <View style={styles.listShell}>
        <FlatList
          data={restaurants}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => openRestaurant(item)}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Icon name="chevron-right" size={18} color="#FF4D00" />
              </View>
              <Text style={styles.cardSubtitle}>
                {item.location} - {item.cuisine}
              </Text>
              <View style={styles.badgeRow}>
                <Badge text={`Rating ${item.rating ?? '-'}`} color="#FFD89E" />
                {item.averagePrice ? <Badge text={item.averagePrice} /> : null}
              </View>
              {item.ambience && item.ambience.length ? (
                <Text style={styles.metaSecondary}>Ambience: {item.ambience.join(', ')}</Text>
              ) : null}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="refresh-cw" size={28} color="#FF4D00" />
              <Text style={styles.emptyTitle}>No restaurants found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your filters to discover more options.
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

function Badge({ text, color = '#FFE8D2' }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FF4D00' },
  headerContainer: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 26,
    backgroundColor: '#FF4D00',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSubtitle: {
    color: '#fff',
    opacity: 0.9,
    fontSize: 15,
    marginTop: 12,
  },
  headerSpacer: { width: 40 },
  listShell: {
    flex: 1,
    backgroundColor: '#FFF5EE',
    paddingTop: 18,
    paddingBottom: 10,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  separator: { height: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FFE0CC',
    elevation: 3,
    shadowColor: '#FF4D00',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  cardSubtitle: { marginTop: 6, fontSize: 14, color: '#4B5563' },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 10,
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#111827' },
  metaSecondary: { marginTop: 10, fontSize: 13, color: '#6B7280' },
  emptyState: {
    marginTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: { marginTop: 12, fontSize: 18, fontWeight: '700', color: '#111827' },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
