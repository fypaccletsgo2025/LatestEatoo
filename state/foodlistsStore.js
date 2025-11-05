import { db, DB_ID, COL, ensureSession, account } from '../appwrite';
import { Query } from 'appwrite';

let lists = [];
let loadPromise = null;
const listeners = new Set();

const cloneValue = (value) => (value && typeof value === 'object' ? { ...value } : value);

function normalizeFoodlist(raw) {
  if (!raw) return null;
  const id = raw.$id ?? raw.id ?? null;
  const items = Array.isArray(raw.items)
    ? raw.items.filter(Boolean).map((item) => cloneValue(item))
    : [];
  const itemIds = Array.isArray(raw.itemIds) && raw.itemIds.length
    ? raw.itemIds.filter(Boolean)
    : items
        .map((item) => (item && typeof item === 'object' ? item.id ?? item.$id ?? null : null))
        .filter(Boolean);
  const members = Array.isArray(raw.members)
    ? raw.members.filter(Boolean).map((member) => cloneValue(member))
    : [];

  return {
    ...raw,
    id,
    $id: id,
    name: raw.name || '',
    description: raw.description || '',
    items,
    itemIds,
    members,
    ownerId: raw.ownerId ?? (raw.owner ? raw.owner.id || raw.owner.$id || null : null),
  };
}

function cloneFoodlist(list) {
  if (!list) return null;
  return {
    ...list,
    items: Array.isArray(list.items)
      ? list.items.map((item) => (item && typeof item === 'object' ? { ...item } : item))
      : [],
    itemIds: Array.isArray(list.itemIds) ? [...list.itemIds] : [],
    members: Array.isArray(list.members)
      ? list.members.map((member) =>
          member && typeof member === 'object' ? { ...member } : member
        )
      : [],
  };
}

function setLists(next) {
  lists = next
    .map(normalizeFoodlist)
    .filter(Boolean)
    .map(cloneFoodlist);
}

function notifyListeners() {
  const snapshot = getFoodlists();
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (_) {
      /* noop */
    }
  });
}

export function getFoodlists() {
  return lists.map(cloneFoodlist);
}

export async function loadFoodlists({ force = false, ownerId } = {}) {
  if (loadPromise) {
    return loadPromise;
  }

  if (!force && lists.length) {
    return getFoodlists();
  }

  loadPromise = (async () => {
    await ensureSession();

    let targetOwnerId = ownerId;
    if (!targetOwnerId) {
      try {
        const user = await account.get();
        targetOwnerId = user?.$id;
      } catch (_) {
        targetOwnerId = null;
      }
    }

    const queries = [Query.limit(200), Query.orderDesc('$updatedAt')];
    if (targetOwnerId) {
      queries.push(Query.equal('ownerId', targetOwnerId));
    }

    const res = await db.listDocuments(DB_ID, COL.foodlists, queries);
    const docs = Array.isArray(res?.documents) ? res.documents : [];
    setLists(docs);
    notifyListeners();
    return getFoodlists();
  })();

  try {
    return await loadPromise;
  } finally {
    loadPromise = null;
  }
}

export function updateFoodlists(updater) {
  const next = typeof updater === 'function' ? updater(getFoodlists()) : updater;
  if (!Array.isArray(next)) return;
  setLists(next);
  notifyListeners();
}

export function addFoodlist(newList) {
  if (!newList) return;
  updateFoodlists((prev) => [newList, ...prev]);
}

export function updateFoodlist(updated) {
  if (!updated) return;
  const normalized = normalizeFoodlist(updated);
  if (!normalized?.id && !normalized?.$id) return;
  const targetId = normalized.$id || normalized.id;
  updateFoodlists((prev) =>
    prev.map((list) => {
      const listId = list.$id || list.id;
      return listId === targetId ? cloneFoodlist(normalized) : cloneFoodlist(list);
    })
  );
}

export function removeFoodlist(id) {
  if (!id) return;
  updateFoodlists((prev) =>
    prev.filter((list) => {
      const listId = list.$id || list.id;
      return listId !== id;
    })
  );
}

export function onFoodlistsChange(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
