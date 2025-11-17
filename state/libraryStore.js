import { db, DB_ID, COL, ensureSession, account } from '../appwrite';
import { ID, Query, Permission, Role } from 'appwrite';

const savedRestaurantIds = new Set();
const likedItemIds = new Set();
const savedDocIdsByRestaurant = new Map();
const likedDocIdsByItem = new Map();
const listeners = new Set();

let currentUserId = null;
let loadPromise = null;
let hydratedOnce = false;

const FETCH_LIMIT = 400;

const toKey = (value) => {
  if (value == null) return null;
  return String(value);
};

function notify() {
  const payload = {
    saved: Array.from(savedRestaurantIds),
    liked: Array.from(likedItemIds),
  };
  listeners.forEach((fn) => {
    try {
      fn(payload);
    } catch (_) {
      /* noop */
    }
  });
}

async function getCurrentUserId() {
  if (currentUserId) return currentUserId;
  try {
    await ensureSession();
    const user = await account.get();
    currentUserId = user?.$id ?? null;
  } catch (err) {
    console.warn('libraryStore: unable to resolve user', err?.message || err);
    currentUserId = null;
  }
  return currentUserId;
}

function applySnapshot({ saves = [], likes = [] }) {
  savedRestaurantIds.clear();
  likedItemIds.clear();
  savedDocIdsByRestaurant.clear();
  likedDocIdsByItem.clear();

  saves.forEach((doc) => {
    const docId = doc?.$id || doc?.id;
    const restaurantId =
      toKey(doc?.restaurant_id ?? doc?.restaurantId ?? doc?.targetId ?? null) || null;
    if (!docId || !restaurantId) return;
    savedRestaurantIds.add(restaurantId);
    savedDocIdsByRestaurant.set(restaurantId, docId);
  });

  likes.forEach((doc) => {
    const docId = doc?.$id || doc?.id;
    const itemId = toKey(doc?.item_id ?? doc?.itemId ?? doc?.targetId ?? null) || null;
    if (!docId || !itemId) return;
    likedItemIds.add(itemId);
    likedDocIdsByItem.set(itemId, docId);
  });

  hydratedOnce = true;
  notify();
}

export async function loadLibraryState({ force = false } = {}) {
  if (loadPromise && !force) {
    return loadPromise;
  }
  if (!force && hydratedOnce && !loadPromise) {
    return Promise.resolve();
  }

  const runner = (async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        applySnapshot({ saves: [], likes: [] });
        return;
      }

      const baseQueries = [Query.equal('user_id', userId), Query.limit(FETCH_LIMIT)];
      const [savesRes, likesRes] = await Promise.all([
        db.listDocuments(DB_ID, COL.saves, baseQueries),
        db.listDocuments(DB_ID, COL.likes, baseQueries),
      ]);

      applySnapshot({
        saves: Array.isArray(savesRes?.documents) ? savesRes.documents : [],
        likes: Array.isArray(likesRes?.documents) ? likesRes.documents : [],
      });
    } catch (err) {
      console.warn('libraryStore: failed to load remote state', err?.message || err);
      throw err;
    } finally {
      loadPromise = null;
    }
  })();

  loadPromise = runner;
  return runner;
}

function ensureHydration() {
  if (hydratedOnce || loadPromise) return;
  loadLibraryState().catch((err) => {
    console.warn('libraryStore: hydration failed', err?.message || err);
  });
}

async function ensureDocIdFromServer({ type, targetId }) {
  const userId = await getCurrentUserId();
  if (!userId || !targetId) return null;
  const collection = type === 'save' ? COL.saves : COL.likes;
  const field = type === 'save' ? 'restaurant_id' : 'item_id';

  try {
    const res = await db.listDocuments(DB_ID, collection, [
      Query.equal('user_id', userId),
      Query.equal(field, targetId),
      Query.limit(1),
    ]);
    const doc = Array.isArray(res?.documents) ? res.documents[0] : null;
    if (doc?.$id) {
      if (type === 'save') {
        savedDocIdsByRestaurant.set(targetId, doc.$id);
      } else {
        likedDocIdsByItem.set(targetId, doc.$id);
      }
      return doc.$id;
    }
  } catch (err) {
    console.warn('libraryStore: failed to locate doc', err?.message || err);
  }
  return null;
}

async function persistSaveRestaurant(id) {
  const userId = await getCurrentUserId();
  if (!userId || !id) return;
  if (savedDocIdsByRestaurant.has(id)) return;
  try {
    const doc = await db.createDocument(
      DB_ID,
      COL.saves,
      ID.unique(),
      {
        user_id: userId,
        restaurant_id: id,
        createdAt: new Date().toISOString(),
      },
      [
        Permission.read(Role.user(userId)),
        Permission.update(Role.user(userId)),
        Permission.delete(Role.user(userId)),
      ],
    );
    if (doc?.$id) {
      savedDocIdsByRestaurant.set(id, doc.$id);
    }
  } catch (err) {
    console.warn('libraryStore: failed to persist save', err?.message || err);
    await loadLibraryState({ force: true }).catch(() => {});
  }
}

async function persistUnsaveRestaurant(id) {
  const docId =
    savedDocIdsByRestaurant.get(id) ||
    (await ensureDocIdFromServer({ type: 'save', targetId: id }));
  if (!docId) return;
  try {
    await db.deleteDocument(DB_ID, COL.saves, docId);
    savedDocIdsByRestaurant.delete(id);
  } catch (err) {
    console.warn('libraryStore: failed to delete save', err?.message || err);
    await loadLibraryState({ force: true }).catch(() => {});
  }
}

async function persistLikeItem(id) {
  const userId = await getCurrentUserId();
  if (!userId || !id) return;
  if (likedDocIdsByItem.has(id)) return;
  try {
    const doc = await db.createDocument(
      DB_ID,
      COL.likes,
      ID.unique(),
      {
        user_id: userId,
        item_id: id,
        createdAt: new Date().toISOString(),
      },
      [
        Permission.read(Role.user(userId)),
        Permission.update(Role.user(userId)),
        Permission.delete(Role.user(userId)),
      ],
    );
    if (doc?.$id) {
      likedDocIdsByItem.set(id, doc.$id);
    }
  } catch (err) {
    console.warn('libraryStore: failed to persist like', err?.message || err);
    await loadLibraryState({ force: true }).catch(() => {});
  }
}

async function persistUnlikeItem(id) {
  const docId =
    likedDocIdsByItem.get(id) ||
    (await ensureDocIdFromServer({ type: 'like', targetId: id }));
  if (!docId) return;
  try {
    await db.deleteDocument(DB_ID, COL.likes, docId);
    likedDocIdsByItem.delete(id);
  } catch (err) {
    console.warn('libraryStore: failed to delete like', err?.message || err);
    await loadLibraryState({ force: true }).catch(() => {});
  }
}

export function isRestaurantSaved(id) {
  ensureHydration();
  const key = toKey(id);
  if (!key) return false;
  return savedRestaurantIds.has(key);
}

export function saveRestaurant(id) {
  ensureHydration();
  const key = toKey(id);
  if (!key) return;
  if (savedRestaurantIds.has(key)) return;
  savedRestaurantIds.add(key);
  notify();
  persistSaveRestaurant(key);
}

export function unsaveRestaurant(id) {
  ensureHydration();
  const key = toKey(id);
  if (!key) return;
  if (!savedRestaurantIds.has(key)) return;
  savedRestaurantIds.delete(key);
  notify();
  persistUnsaveRestaurant(key);
}

export function getSavedRestaurantIds() {
  ensureHydration();
  return Array.from(savedRestaurantIds);
}

export function isItemLiked(id) {
  ensureHydration();
  const key = toKey(id);
  if (!key) return false;
  return likedItemIds.has(key);
}

export function likeItem(id) {
  ensureHydration();
  const key = toKey(id);
  if (!key) return;
  if (likedItemIds.has(key)) return;
  likedItemIds.add(key);
  notify();
  persistLikeItem(key);
}

export function unlikeItem(id) {
  ensureHydration();
  const key = toKey(id);
  if (!key) return;
  if (!likedItemIds.has(key)) return;
  likedItemIds.delete(key);
  notify();
  persistUnlikeItem(key);
}

export function getLikedItemIds() {
  ensureHydration();
  return Array.from(likedItemIds);
}

export function onLibraryChange(listener) {
  ensureHydration();
  if (typeof listener !== 'function') {
    return () => {};
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

ensureHydration();
