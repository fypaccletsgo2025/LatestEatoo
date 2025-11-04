import { MALAYSIA_CENTER } from '././RestaurantDetailScreen.constants';

export const stripHtml = (value = '') => value.replace(/<[^>]*>/g, '');

const arrowHint = (maneuver = '') => (maneuver || '').toLowerCase();

export const getArrowIcon = (maneuver = '') => {
  switch (arrowHint(maneuver)) {
    case 'turn-right':
    case 'bear-right':
    case 'slight-right':
      return 'arrow-forward';
    case 'turn-left':
    case 'bear-left':
    case 'slight-left':
      return 'arrow-back';
    case 'uturn-left':
    case 'uturn-right':
      return 'return-down-back';
    case 'straight':
    case 'continue':
      return 'arrow-up';
    default:
      return 'navigate';
  }
};

export const formatManeuverLabel = (maneuver = '') => {
  const cleaned = maneuver.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return '';
  }
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
};

export const haversineDistance = (a, b) => {
  if (!a || !b) {
    return Number.POSITIVE_INFINITY;
  }
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad((b.latitude ?? 0) - (a.latitude ?? 0));
  const dLon = toRad((b.longitude ?? 0) - (a.longitude ?? 0));
  const lat1 = toRad(a.latitude ?? 0);
  const lat2 = toRad(b.latitude ?? 0);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return earthRadius * c;
};

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const fallbackLocations = [
  {
    keywords: ['bukit bintang', 'kuala lumpur', 'kl'],
    coordinate: { latitude: 3.1478, longitude: 101.704 },
  },
  {
    keywords: ['damansara'],
    coordinate: { latitude: 3.144, longitude: 101.6205 },
  },
  {
    keywords: ['penang', 'georgetown'],
    coordinate: { latitude: 5.4141, longitude: 100.3288 },
  },
  {
    keywords: ['malacca', 'melaka'],
    coordinate: { latitude: 2.1896, longitude: 102.2501 },
  },
  {
    keywords: ['johor bahru', 'johor'],
    coordinate: { latitude: 1.4927, longitude: 103.7414 },
  },
];

export function deriveCoordinate(restaurant) {
  if (!restaurant) {
    return MALAYSIA_CENTER;
  }

  if (
    restaurant.coordinates &&
    typeof restaurant.coordinates.latitude === 'number' &&
    typeof restaurant.coordinates.longitude === 'number'
  ) {
    return {
      latitude: restaurant.coordinates.latitude,
      longitude: restaurant.coordinates.longitude,
    };
  }

  if (
    typeof restaurant.latitude === 'number' &&
    typeof restaurant.longitude === 'number'
  ) {
    return { latitude: restaurant.latitude, longitude: restaurant.longitude };
  }

  const locationText = (restaurant.location || '').toLowerCase();
  const match = fallbackLocations.find((entry) =>
    entry.keywords.some((keyword) => locationText.includes(keyword)),
  );

  return match ? match.coordinate : MALAYSIA_CENTER;
}
