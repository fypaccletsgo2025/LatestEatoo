import { db, DB_ID, COL, ensureSession, account } from '../appwrite';
import { Query } from 'appwrite';

let lists = [];
let loadPromise = null;
const listeners = new Set();

const cloneValue = (value) => (value && typeof value === 'object' ? { ...value } : value);

const getCollaboratorId = (member) => {
  if (!member) return null;
  if (typeof member === 'string') {
    return member.trim();
  }
  if (typeof member === 'number') {
    return String(member);
  }
  if (typeof member === 'object') {
    return (
      member.$id ||
      member.id ||
      member.userId ||
      member.ownerId ||
      member.username ||
      member.handle ||
      member.slug ||
      null
    );
  }
  return null;
};

const normalizeCollaborators = (source) => {
  if (!Array.isArray(source)) return [];
  return source
    .map((member) => getCollaboratorId(member))
    .filter((value) => typeof value === 'string' && value.length > 0);
};

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
  const collaboratorsSource = raw.collaborators ?? raw.members ?? [];
  const collaborators = normalizeCollaborators(collaboratorsSource);

  return {
    ...raw,
    id,
    $id: id,
    name: raw.name || '',
    description: raw.description || '',
    items,
    itemIds,
    collaborators,
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
    collaborators: Array.isArray(list.collaborators) ? [...list.collaborators] : [],
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

    let docs = [];
    if (targetOwnerId) {
      const baseQueries = [Query.orderDesc('$updatedAt'), Query.limit(150)];
      const ownerQueries = [...baseQueries, Query.equal('ownerId', targetOwnerId)];
      const collaboratorQueries = [...baseQueries, Query.equal('collaborators', targetOwnerId)];
      const [ownedRes, collaboratorRes] = await Promise.all([
        db.listDocuments(DB_ID, COL.foodlists, ownerQueries),
        db.listDocuments(DB_ID, COL.foodlists, collaboratorQueries),
      ]);
      const deduped = new Map();
      const mergeDocs = (res) => {
        const entries = Array.isArray(res?.documents) ? res.documents : [];
        entries.forEach((doc) => {
          if (doc?.$id && !deduped.has(doc.$id)) {
            deduped.set(doc.$id, doc);
          }
        });
      };
      mergeDocs(ownedRes);
      mergeDocs(collaboratorRes);
      docs = Array.from(deduped.values());
    } else {
      const res = await db.listDocuments(DB_ID, COL.foodlists, [
        Query.orderDesc('$updatedAt'),
        Query.limit(200),
      ]);
      docs = Array.isArray(res?.documents) ? res.documents : [];
    }

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
