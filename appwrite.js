// appwrite.js
import { Client, Databases } from 'appwrite';

/** @typedef {{ name: string, location?: string, cuisines?: string[], ambience?: string[], rating?: number }} RestaurantDoc */

export const client = new Client()
  .setEndpoint('https://syd.cloud.appwrite.io/v1')
  .setProject('68cae854003c17da406e');

export const db = new Databases(client);
export const DB_ID = '68caecff003c5d39d1fb';
export const COL = { restaurants: 'restaurants', menus: 'menus', items: 'items', reviews: 'reviews', foodlists: 'foodlists', updates: 'updates' };

/** @returns {Promise<RestaurantDoc[]>} */
export async function listRestaurants() {
  const res = await db.listDocuments(DB_ID, COL.restaurants);
  return res.documents;
}
