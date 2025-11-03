
// services/appwrite.js
import { Client, Account, Databases } from 'appwrite';
const client = new Client()
  .setEndpoint('https://syd.cloud.appwrite.io/v1')
  .setProject('68cae854003c17da406e');
export const account = new Account(client);
export const databases = new Databases(client);
export const DB_ID = '68caecff003c5d39d1fb';
export const COLLECTIONS = {
  USERS: 'users',
  RESTAURANTS: 'restaurants',
  MENUS: 'menus',
  ITEMS: 'items',
  REVIEWS: 'reviews',
  FOODLISTS: 'foodlists',
};
export default client;
