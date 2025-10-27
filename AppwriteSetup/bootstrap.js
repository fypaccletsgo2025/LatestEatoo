// bootstrap.js
require('dotenv').config();
const { Client, Databases } = require('node-appwrite');

/**
 * ---- ENV CHECK ----
 */
const requiredEnv = ['APPWRITE_ENDPOINT', 'APPWRITE_PROJECT', 'APPWRITE_API_KEY', 'APPWRITE_DB_ID'];
for (const k of requiredEnv) {
  if (!process.env[k] || String(process.env[k]).trim() === '') {
    throw new Error(`Missing ${k} in .env`);
  }
}

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT) // must match your project region exactly
  .setProject(process.env.APPWRITE_PROJECT)
  .setKey(process.env.APPWRITE_API_KEY);

const db = new Databases(client);
const DB = process.env.APPWRITE_DB_ID;

// helper: ignore "already exists" / duplicates
const ok = async (fn) => {
  try {
    return await fn();
  } catch (e) {
    const code = e?.code || e?.response?.code;
    const msg  = e?.message || e?.response?.message || '';
    if (code === 409 || /already exists/i.test(msg)) return; // ignore conflicts
    throw e;
  }
};

(async () => {
  console.log('→ Using endpoint:', process.env.APPWRITE_ENDPOINT);
  console.log('→ Using project :', String(process.env.APPWRITE_PROJECT).slice(0, 6) + '…');
  console.log('→ Using DB ID   :', DB);

  // ---- Ensure DB exists (don’t create new due to plan limits) ----
  try {
    await db.get(DB);
    console.log(`✓ Database "${DB}" exists`);
  } catch (e) {
    if (e.code === 404) {
      throw new Error(
        `Database "${DB}" does not exist and your plan blocks creating new ones.\n` +
        `Fix: set APPWRITE_DB_ID to an existing database ID from Console, or delete an old DB, or upgrade.`
      );
    }
    throw e;
  }

  // ---- Collections ----
  const makeCol = (id, name) => ok(() => db.createCollection(DB, id, name, /*permissions*/[], /*documentSecurity*/ true, /*enabled*/ true));

  await makeCol('users',       'Users');
  await makeCol('restaurants', 'Restaurants');
  await makeCol('menus',       'Menus');
  await makeCol('items',       'Items');
  await makeCol('reviews',     'Reviews');
  await makeCol('foodlists',   'Foodlists');

  console.log('✓ Collections ensured');

  // ---- Attribute helpers ----
const S = (col, key, size = 191, required = false, def = null, array = false) =>
  ok(() => db.createStringAttribute(DB, col, key, size, required, def, array));

const I = (col, key, required = false, min = null, max = null, def = null, array = false) =>
  ok(() => db.createIntegerAttribute(DB, col, key, required, min, max, def, array));

const F = (col, key, required = false, min = null, max = null, def = null, array = false) =>
  ok(() => db.createFloatAttribute(DB, col, key, required, min, max, def, array));

const E = (col, key, required, elements, def = null, array = false) =>
  ok(() => db.createEnumAttribute(DB, col, key, elements, required, def, array));

  // ---- USERS ----
  await S('users', 'name', 128, true);
  // default allowed only if NOT required
  await E('users', 'role', false, ['admin', 'owner', 'user'], 'user');

  // ---- RESTAURANTS ----
  await S('restaurants', 'name', 128, true);
  await S('restaurants', 'location', 128);
  await S('restaurants', 'theme', 512);
  await F('restaurants', 'rating'); // no default
  await S('restaurants', 'ownerId', 64);
  await S('restaurants', 'cuisines', 64, false, null, true);   // array
  await S('restaurants', 'ambience', 64, false, null, true);   // array

  // ---- MENUS ----
  await S('menus', 'restaurantId', 64, true);
  await S('menus', 'name', 64, true);

  // ---- ITEMS ----
  await S('items', 'restaurantId', 64, true);
  await S('items', 'menuId', 128, true);
  await S('items', 'name', 128, true);
  await E('items', 'type', false, ['meal', 'snacks', 'drink', 'dessert', 'pastry', 'other'], 'other'); // not required + default ok
  await I('items', 'priceRM', true, 0, 100000);
  await S('items', 'cuisine', 64);
  await S('items', 'description', 1024);
  await S('items', 'tags', 64, false, null, true);  // array
  await S('items', 'mood', 64, false, null, true);  // array
  await F('items', 'rating'); // no default

  // ---- REVIEWS (unified) ----
  await E('reviews', 'subjectType', true, ['restaurant', 'item']); // required, no default
  await S('reviews', 'subjectId', 128, true);
  await S('reviews', 'userName', 128);
  await F('reviews', 'rating'); // no default
  await I('reviews', 'taste', false, 0, 5);
  await I('reviews', 'locationScore', false, 0, 5);
  await I('reviews', 'coziness', false, 0, 5);
  await S('reviews', 'comment', 1024);

  // ---- FOODLISTS ----
  await S('foodlists', 'name', 128, true);
  await S('foodlists', 'ownerId', 64);
  await S('foodlists', 'itemIds', 64, false, null, true); // array of item IDs

  console.log('✓ Attributes ensured');

  // ---- Indexes (optional but useful) ----
  const IDX = (col, id, type, attrs, orders = []) =>
    ok(() => db.createIndex(DB, col, id, type, attrs, orders));

  await IDX('restaurants', 'idx_name_ft', 'fulltext', ['name']);
  await IDX('restaurants', 'idx_rating',  'key',      ['rating']);

  await IDX('menus',       'idx_restaurantId', 'key', ['restaurantId']);

  await IDX('items',       'idx_restaurantId', 'key',     ['restaurantId']);
  await IDX('items',       'idx_menuId',       'key',     ['menuId']);
  await IDX('items',       'idx_name_ft',      'fulltext',['name']);
  await IDX('items',       'idx_price',        'key',     ['priceRM']);

  await IDX('reviews',     'idx_subjectType',  'key',     ['subjectType']);
  await IDX('reviews',     'idx_subjectId',    'key',     ['subjectId']);

  await IDX('foodlists',   'idx_ownerId',      'key',     ['ownerId']);

  console.log('✓ Indexes ensured');

  console.log('Tables ready ✅');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
