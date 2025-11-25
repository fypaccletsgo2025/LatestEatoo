// services/notificationsService.js
import { client, db, DB_ID } from '../appwrite';
import { ID, Query } from 'appwrite';
import { formatTimeAgo } from '../utils/timeUtils';

const COLLECTION_ID = 'notifications';

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

const coercePayloadToObject = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null ? parsed : { message: value };
    } catch {
      return { message: value };
    }
  }
  return {};
};

const mapNotificationDocument = (doc) => {
  if (!doc) return null;
  const createdAt = doc.$createdAt || doc.createdAt || doc.$updatedAt || doc.updatedAt;
  const safeDoc = {
    type: doc.type,
    payload: coercePayloadToObject(doc.payload),
  };
  return {
    id: doc.$id,
    documentId: doc.$id,
    userId: doc.userId || null,
    type: doc.type,
    payload: coercePayloadToObject(doc.payload),
    read: Boolean(doc.read),
    createdAt,
    updatedAt: doc.$updatedAt || doc.updatedAt || createdAt,
    time: createdAt ? formatTimeAgo(createdAt) : '',
    title: generateTitle(safeDoc),
    body: generateBody(safeDoc),
  };
};

export async function fetchNotificationsFromAppwrite(options = {}) {
  const { userId = null, limit = 50 } = options;
  try {
    const baseQueries = [Query.orderDesc('$createdAt'), Query.limit(limit)];
    const withUserFilter =
      userId != null ? [...baseQueries, Query.equal('userId', userId)] : baseQueries;
    try {
      const res = await db.listDocuments(DB_ID, COLLECTION_ID, withUserFilter);
      return res.documents.map(mapNotificationDocument).filter(Boolean);
    } catch (innerErr) {
      const message = String(innerErr?.message || '').toLowerCase();
      const attributeMissing =
        message.includes('attribute not found') || message.includes('invalid query');
      if (!userId || !attributeMissing) {
        throw innerErr;
      }
      const res = await db.listDocuments(DB_ID, COLLECTION_ID, baseQueries);
      return res.documents
        .filter((doc) => doc.userId === userId)
        .map(mapNotificationDocument)
        .filter(Boolean);
    }
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
    return [];
  }
}

export async function createNotification({
  userId,
  type,
  payload = {},
  read = false,
  createdAt = new Date().toISOString(),
}) {
  if (!userId) {
    throw new Error('userId is required to create a notification');
  }
  if (!type) {
    throw new Error('type is required to create a notification');
  }

  let serializedPayload = '';
  try {
    serializedPayload = JSON.stringify(payload ?? {});
  } catch {
    serializedPayload = '{}';
  }

  const document = await db.createDocument(DB_ID, COLLECTION_ID, ID.unique(), {
    userId,
    type,
    payload: serializedPayload,
    read,
    createdAt,
  });
  return mapNotificationDocument(document);
}

export async function markNotificationRead(documentId) {
  if (!documentId) return null;
  const updated = await db.updateDocument(DB_ID, COLLECTION_ID, documentId, { read: true });
  return mapNotificationDocument(updated);
}

export function subscribeToUserNotifications(userId, handler) {
  if (!handler) return () => {};
  const unsubscribe = client.subscribe(
    `databases.${DB_ID}.collections.${COLLECTION_ID}.documents`,
    (event) => {
      const doc = event.payload;
      if (!doc?.$id) return;
      if (userId && doc.userId !== userId) return;
      handler(event, mapNotificationDocument(doc));
    }
  );
  return unsubscribe;
}
