import { db, DB_ID, COL, account } from '../appwrite';
import { Query } from 'appwrite';

const normalizeUser = (doc) => {
  if (!doc) return null;
  const id = doc.$id || doc.id;
  const name = doc.name || '';
  const username = name || doc.username || doc.handle || doc.slug || doc.userName || doc.preferredUsername || '';
  const displayName = name || doc.displayName || doc.fullName || doc.nickname || username || id || '';
  if (!id) return null;
  return {
    id,
    username: username || displayName || id,
    displayName: displayName || username || id,
  };
};

/**
 * Search the Appwrite users collection by username or exact id.
 * Ensures the current session user is excluded from results.
 * @param {string} term
 * @returns {Promise<Array<{id: string, username: string, displayName: string}>>}
 */
export async function searchUsers(term) {
  const sanitized = String(term ?? '')
    .replace(/^@+/, '')
    .trim();
  if (sanitized.length < 2) return [];

  let currentUserId = null;
  try {
    const me = await account.get();
    currentUserId = me?.$id ?? null;
  } catch {
    currentUserId = null;
  }

  const normalizedTerm = sanitized.toLowerCase();
  const resultSet = new Map();
  const uniquePush = (profile) => {
    if (
      profile &&
      profile.id &&
      profile.id !== currentUserId &&
      !resultSet.has(profile.id)
    ) {
      resultSet.set(profile.id, profile);
    }
  };
  const storeDocs = (docs, predicate = null) => {
    docs
      .map(normalizeUser)
      .forEach((profile) => {
        if (!profile) return;
        if (typeof predicate === 'function' && !predicate(profile)) return;
        uniquePush(profile);
      });
  };

  let needsFallback = false;
  try {
    const res = await db.listDocuments(DB_ID, COL.users, [
      Query.search('name', sanitized),
      Query.limit(18),
    ]);
    storeDocs(Array.isArray(res?.documents) ? res.documents : []);
  } catch (error) {
    const message = String(error?.message || '');
    if (message.includes('fulltext index')) {
      needsFallback = true;
    } else {
      console.warn('User directory lookup failed', message);
    }
  }

  if (resultSet.size === 0 || needsFallback) {
    const pageSize = 100;
    let cursor = null;
    for (let page = 0; page < 5 && resultSet.size < 24; page += 1) {
      const queries = [Query.limit(pageSize)];
      if (cursor) {
        queries.push(Query.cursorAfter(cursor));
      }
      try {
        const res = await db.listDocuments(DB_ID, COL.users, queries);
        const docs = Array.isArray(res?.documents) ? res.documents : [];
        storeDocs(docs, (profile) =>
          String(profile.displayName || '')
            .toLowerCase()
            .includes(normalizedTerm),
        );
        if (!docs.length || docs.length < pageSize) {
          break;
        }
        cursor = docs[docs.length - 1].$id;
      } catch (error) {
        console.warn('User directory fallback failed', error?.message || error);
        break;
      }
    }
  }

  return Array.from(resultSet.values())
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .slice(0, 18);
}
