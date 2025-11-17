// syncUsers.js
require('dotenv').config();
const { Client, Databases, Users, Permission, Role, Query } = require('node-appwrite');

/** ---- ENV CHECK ---- */
const requiredEnv = ['APPWRITE_ENDPOINT', 'APPWRITE_PROJECT', 'APPWRITE_API_KEY', 'APPWRITE_DB_ID'];
for (const key of requiredEnv) {
  if (!process.env[key] || String(process.env[key]).trim() === '') {
    throw new Error(`Missing ${key} in .env`);
  }
}

/** ---- CLIENT ---- */
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT)
  .setKey(process.env.APPWRITE_API_KEY);

const db = new Databases(client);
const appUsers = new Users(client);
const DB = process.env.APPWRITE_DB_ID;

/** ---- HELPERS ---- */
const ok = async (fn) => {
  try {
    return await fn();
  } catch (e) {
    const code = e?.code || e?.response?.code;
    const msg = e?.message || e?.response?.message || '';
    if (code === 409 || /already exists/i.test(msg)) return;
    throw e;
  }
};

const S = (col, key, size = 191, required = false, def = null, array = false) =>
  ok(() => db.createStringAttribute(DB, col, key, size, required, def, array));
const IDX = (col, key, type, attributes, orders = []) =>
  ok(() => db.createIndex(DB, col, key, type, attributes, orders));

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

async function getDocById(collection, id) {
  try {
    return await db.getDocument(DB, collection, id);
  } catch (e) {
    if (e.code === 404 || e?.response?.code === 404) return null;
    throw e;
  }
}

async function usernameExists(username, excludeId) {
  if (!username) return false;
  const res = await db.listDocuments(DB, 'users', [Query.equal('username', username), Query.limit(1)]);
  const doc = res.documents?.[0];
  if (!doc) return false;
  if (excludeId && doc.$id === excludeId) return false;
  return true;
}

async function ensureUniqueUsername(base, fallback, excludeId) {
  const safeBase = slugify(base) || slugify(fallback) || 'user';
  let candidate = safeBase;
  let attempt = 1;
  while (await usernameExists(candidate, excludeId)) {
    candidate = `${safeBase}-${attempt++}`;
  }
  return candidate;
}

async function listAllAuthUsers() {
  const PAGE_SIZE = 100;
  const users = [];
  let cursor = null;
  while (true) {
    const queries = [Query.limit(PAGE_SIZE)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const res = await appUsers.list({ queries });
    users.push(...res.users);
    if (res.users.length < PAGE_SIZE) break;
    cursor = res.users[res.users.length - 1].$id;
  }
  return users;
}

/** ---- MAIN ---- */
(async () => {
  console.log('[+] Using endpoint:', process.env.APPWRITE_ENDPOINT);
  console.log('[+] Using project :', process.env.APPWRITE_PROJECT);
  console.log('[+] Using DB ID   :', DB);

  await ok(() => db.get(DB));

  await ok(() =>
    db.createCollection(
      DB,
      'users',
      'Users',
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
      ],
      true,
      true
    )
  );
  console.log('[✓] Users collection ensured');

  await S('users', 'email', 100, true);
  await S('users', 'name', 128, false);
  await S('users', 'username', 64, false);
  await IDX('users', 'idx_email', 'key', ['email'], ['ASC']);
  await IDX('users', 'idx_username', 'fulltext', ['username']);
  console.log('[✓] Users attributes ensured');

  const authUsers = await listAllAuthUsers();
  console.log(`[+] Found ${authUsers.length} auth users`);

  for (const user of authUsers) {
    const userId = user.$id;
    const email = String(user.email || '').trim().toLowerCase();
    if (!email) {
      console.log(`[-] Skipping user ${userId}: missing email`);
      continue;
    }
    const existing = await getDocById('users', userId);
    const displayName =
      String(user.name || '').trim().slice(0, 128) ||
      email.split('@')[0] ||
      `User ${userId.slice(-5)}`;
    const preferredHandle =
      user.prefs?.username ||
      user.prefs?.handle ||
      displayName ||
      email.split('@')[0];

    if (!existing) {
      const username = await ensureUniqueUsername(preferredHandle, email.split('@')[0], null);
      await db.createDocument(
        DB,
        'users',
        userId,
        { email, name: displayName, username },
        [Permission.read(Role.any()), Permission.update(Role.user(userId))]
      );
      console.log(`[+] User added: ${email} (@${username})`);
      continue;
    }

    const updates = {};
    if ((existing.email || '').toLowerCase() !== email) {
      updates.email = email;
    }
    if ((existing.name || '').trim() !== displayName) {
      updates.name = displayName;
    }
    if (!existing.username) {
      updates.username = await ensureUniqueUsername(preferredHandle, email.split('@')[0], existing.$id);
    }

    if (Object.keys(updates).length) {
      await db.updateDocument(
        DB,
        'users',
        existing.$id,
        updates,
        [Permission.read(Role.any()), Permission.update(Role.user(userId))]
      );
      console.log(`[~] User synced: ${email}`);
    } else {
      console.log(`[=] User already up to date: ${email}`);
    }
  }

  console.log('[✓] All users synced successfully');
})().catch((err) => {
  console.error('Sync failed:', err?.message || err);
  process.exit(1);
});
