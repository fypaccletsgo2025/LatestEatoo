// bootstrap.js
require('dotenv').config();
const { Client, Databases, Permission, Role } = require('node-appwrite');

/** ---- ENV CHECK ---- */
const requiredEnv = ['APPWRITE_ENDPOINT', 'APPWRITE_PROJECT', 'APPWRITE_API_KEY', 'APPWRITE_DB_ID'];
for (const k of requiredEnv) {
  if (!process.env[k] || String(process.env[k]).trim() === '') {
    throw new Error(`Missing ${k} in .env`);
  }
}
const ENFORCE_LOCATION_REQUIRED = String(process.env.ENFORCE_LOCATION_REQUIRED || '').toLowerCase() === 'true';

/** ---- CLIENT ---- */
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT)
  .setKey(process.env.APPWRITE_API_KEY);

const db = new Databases(client);
const DB = process.env.APPWRITE_DB_ID;

/** ---- HELPERS ---- */
const ok = async (fn) => {
  try {
    return await fn();
  } catch (e) {
    const code = e?.code || e?.response?.code;
    const msg = e?.message || e?.response?.message || '';
    if (code === 409 || /already exists/i.test(msg)) return; // ignore conflicts
    throw e;
  }
};

// Attribute helpers
const S = (col, key, size = 191, required = false, def = null, array = false) =>
  ok(() => db.createStringAttribute(DB, col, key, size, required, def, array));
const I = (col, key, required = false, min = null, max = null, def = null, array = false) =>
  ok(() => db.createIntegerAttribute(DB, col, key, required, min, max, def, array));
const F = (col, key, required = false, min = null, max = null, def = null, array = false) =>
  ok(() => db.createFloatAttribute(DB, col, key, required, min, max, def, array));
const E = (col, key, required, elements, def = null, array = false) =>
  ok(() => db.createEnumAttribute(DB, col, key, elements, required, def, array));

async function updateStringRequired(col, key, { required, def = null, array = false }) {
  try {
    await db.updateStringAttribute(DB, col, key, required, def, array);
    console.log(`✓ Updated ${col}.${key} → required=${required}`);
  } catch (e) {
    console.warn(`! Could not update ${col}.${key}. Reason: ${e?.response?.message || e.message}`);
  }
}

/** ---- MAIN ---- */
(async () => {
  console.log('→ Using endpoint:', process.env.APPWRITE_ENDPOINT);
  console.log('→ Using project :', String(process.env.APPWRITE_PROJECT).slice(0, 6) + '…');
  console.log('→ Using DB ID   :', DB);

  // Ensure DB exists
  try {
    await db.get(DB);
    console.log(`✓ Database "${DB}" exists`);
  } catch (e) {
    if (e.code === 404) throw new Error(`Database "${DB}" not found.`);
    throw e;
  }

  // Collections
  const makeCol = (id, name, perms = []) =>
    ok(() => db.createCollection(DB, id, name, perms, true, true));

  // ✅ Users must be able to create foodlists, read their own + public lists
  const FOODLIST_PERMS = [
    Permission.read(Role.any()),          // anyone can read lists
    Permission.create(Role.users()),      // logged-in or anonymous session can create
    Permission.update(Role.users()),      // users can update (enforced later by document perms)
    Permission.delete(Role.users()),      // optional
  ];

  await makeCol('restaurants', 'Restaurants');
  await makeCol('menus', 'Menus');
  await makeCol('items', 'Items');
  await makeCol('reviews', 'Reviews');
  await makeCol('foodlists', 'Foodlists', FOODLIST_PERMS); // 👈 includes user create
  await makeCol('updates', 'Updates');

  console.log('✓ Collections ensured');

  // FOODLISTS
  await S('foodlists', 'name', 128, true);
  await S('foodlists', 'ownerId', 64);
  await S('foodlists', 'itemIds', 64, false, null, true);

  // Optional: track createdAt
  await S('foodlists', 'createdAt', 64);

  // Example: Index
  await ok(() => db.createIndex(DB, 'foodlists', 'idx_ownerId', 'key', ['ownerId']));

  console.log('✓ Foodlist attributes and indexes ensured');

  console.log('✓ All tables ready ✅');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
