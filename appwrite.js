// appwrite.js
import { Client, Account, Databases } from 'appwrite';

// The web Appwrite SDK expects window.localStorage. React Native doesn't
// provide it, so polyfill the minimal surface area it needs.
if (typeof globalThis.localStorage === 'undefined') {
  const memoryStore = {};
  globalThis.localStorage = {
    getItem(key) {
      if (Object.prototype.hasOwnProperty.call(memoryStore, key)) {
        return memoryStore[key];
      }
      return null;
    },
    setItem(key, value) {
      memoryStore[key] = String(value);
    },
    removeItem(key) {
      delete memoryStore[key];
    },
    clear() {
      Object.keys(memoryStore).forEach((key) => delete memoryStore[key]);
    },
  };
}

/** @typedef {{ name: string, location?: string, cuisines?: string[], ambience?: string[], rating?: number }} RestaurantDoc */

export const client = new Client()
  .setEndpoint('https://syd.cloud.appwrite.io/v1')
  .setProject('68cae854003c17da406e');

export const db = new Databases(client);
export const DB_ID = '68caecff003c5d39d1fb';
export const COL = {
  restaurants: 'restaurants',
  menus: 'menus',
  items: 'items',
  reviews: 'reviews',
  foodlists: 'foodlists',
  updates: 'updates',
  likes: 'likes',
  saves: 'saves',
  users: 'users',
  userSubmissions: 'user_submissions',
  restaurantRequests: 'restaurant_requests',
};

/** @returns {Promise<RestaurantDoc[]>} */
export async function listRestaurants() {
  const res = await db.listDocuments(DB_ID, COL.restaurants);
  return res.documents;
}

export const account = new Account(client);

// Call this once on app boot:
export async function ensureSession() {
  try {
    await account.get(); // already signed in
  } catch {
    await account.createAnonymousSession(); // fallback
  }
}
