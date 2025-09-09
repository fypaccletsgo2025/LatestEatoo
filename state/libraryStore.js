// Simple in-memory store for saved restaurants and liked items (session-only)

const savedRestaurantIds = new Set();
const likedItemIds = new Set();
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => {
    try { fn(); } catch (_) {}
  });
}

export function isRestaurantSaved(id) {
  return savedRestaurantIds.has(id);
}
export function saveRestaurant(id) {
  savedRestaurantIds.add(id);
  notify();
}
export function unsaveRestaurant(id) {
  savedRestaurantIds.delete(id);
  notify();
}
export function getSavedRestaurantIds() {
  return Array.from(savedRestaurantIds);
}

export function isItemLiked(id) {
  return likedItemIds.has(id);
}
export function likeItem(id) {
  likedItemIds.add(id);
  notify();
}
export function unlikeItem(id) {
  likedItemIds.delete(id);
  notify();
}
export function getLikedItemIds() {
  return Array.from(likedItemIds);
}

export function onLibraryChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
