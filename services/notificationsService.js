// services/notificationsService.js
import { client, db, DB_ID } from '../appwrite';
import { formatTimeAgo } from '../utils/timeUtils';

const COLLECTION_ID = 'notifications';

export async function fetchNotificationsFromAppwrite() {
  try {
    const res = await db.listDocuments(DB_ID, COLLECTION_ID, [
      'orderByDesc("$createdAt")',
    ]);
    return res.documents.map((doc) => ({
      id: doc.$id,
      type: doc.type,
      payload: doc.payload,
      read: doc.read,
      createdAt: doc.createdAt,
      time: formatTimeAgo(doc.createdAt),
      title: generateTitle(doc),
      body: generateBody(doc),
    }));
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
    return [];
  }
}

function generateTitle(doc) {
  switch (doc.type) {
    case 'invite':
      return 'Foodlist Invite';
    case 'user_submission':
      return 'Your Recommendation Status';
    case 'restaurant_request':
      return 'Restaurant Request Status';
    default:
      return 'Notification';
  }
}

function generateBody(doc) {
  const { status, restaurantName, inviter, list } = doc.payload || {};
  switch (doc.type) {
    case 'invite':
      return `${inviter} wants to share a foodlist with you: '${list?.name}'`;
    case 'user_submission':
      return `Your recommendation for '${restaurantName}' was ${status}.`;
    case 'restaurant_request':
      return `Your restaurant request '${restaurantName}' was ${status}.`;
    default:
      return doc.payload?.message || '';
  }
}
