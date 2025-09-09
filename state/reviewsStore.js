// Simple in-memory reviews store to persist user reviews during app session
// Map: restaurantId -> array of reviews
const store = {};

export function getUserReviews(restaurantId) {
  return store[restaurantId] || [];
}

export function addUserReview(restaurantId, review) {
  if (!store[restaurantId]) store[restaurantId] = [];
  // newest first
  store[restaurantId].unshift(review);
}

