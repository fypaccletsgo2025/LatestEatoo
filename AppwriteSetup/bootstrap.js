// bootstrap.js
require('dotenv').config();
const { Client, Databases } = require('node-appwrite');

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
  try { return await fn(); }
  catch (e) {
    const code = e?.code || e?.response?.code;
    const msg  = e?.message || e?.response?.message || '';
    if (code === 409 || /already exists/i.test(msg)) return; // ignore conflicts
    throw e;
  }
};

// Attribute helpers (Appwrite 1.8)
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
    if (e.code === 404) throw new Error(`Database "${DB}" not found. Check APPWRITE_DB_ID or upgrade plan.`);
    throw e;
  }

  // Collections
  const makeCol = (id, name) =>
    ok(() => db.createCollection(DB, id, name, [], true, true));

  await makeCol('restaurants', 'Restaurants');
  await makeCol('menus',       'Menus');
  await makeCol('items',       'Items');
  await makeCol('reviews',     'Reviews');
  await makeCol('foodlists',   'Foodlists');
  await makeCol('updates',     'Updates');

  console.log('✓ Collections ensured');

  // RESTAURANTS
  await S('restaurants', 'name', 128, true);
  await S('restaurants', 'location', 128, false);
  await S('restaurants', 'theme', 512);
  await F('restaurants', 'rating');
  await S('restaurants', 'ownerId', 64);
  await S('restaurants', 'cuisines', 64, false, null, true);
  await S('restaurants', 'ambience', 64, false, null, true);

  // MENUS
  await S('menus', 'restaurantId', 64, true);
  await S('menus', 'name', 64, true);

  // ITEMS
  await S('items', 'restaurantId', 64, true);
  await S('items', 'menuId', 128, true);
  await S('items', 'name', 128, true);
  await E('items', 'type', false, ['meal', 'snacks', 'drink', 'dessert', 'pastry', 'other'], 'other');
  await I('items', 'priceRM', true, 0, 100000);
  await S('items', 'cuisine', 64);
  await S('items', 'description', 1024);
  await S('items', 'tags', 64, false, null, true);
  await S('items', 'mood', 64, false, null, true);
  await F('items', 'rating');

  // REVIEWS
  await E('reviews', 'subjectType', true, ['restaurant', 'item']);
  await S('reviews', 'subjectId', 128, true);
  await S('reviews', 'userName', 128);
  await F('reviews', 'rating');
  await I('reviews', 'taste', false, 0, 5);
  await I('reviews', 'locationScore', false, 0, 5);
  await I('reviews', 'coziness', false, 0, 5);
  await S('reviews', 'comment', 1024);

  // FOODLISTS
  await S('foodlists', 'name', 128, true);
  await S('foodlists', 'ownerId', 64);
  await S('foodlists', 'itemIds', 64, false, null, true);

  // UPDATES
  await S('updates', 'authorId', 64, true);
  await S('updates', 'authorName', 128, true);
  await S('updates', 'authorRole', 64);
  await S('updates', 'text', 1000, true);
  await S('updates', 'restaurantId', 64);

  console.log('✓ Attributes ensured');

  if (ENFORCE_LOCATION_REQUIRED) {
    console.log('→ Enforcing restaurants.location as required…');
    await updateStringRequired('restaurants', 'location', { required: true });
  }

  // Index helper with logging & soft-fail
  const IDX = async (col, id, type, attrs, orders = []) => {
    try {
      console.log(`→ Creating index ${col}.${id} (${type}) on [${attrs.join(', ')}]`);
      await db.createIndex(DB, col, id, type, attrs, orders);
      console.log(`✓ Index ${col}.${id} created/ensured`);
    } catch (e) {
      const msg = e?.response?.message || e.message;
      if ((e.code === 409) || /already exists/i.test(msg)) {
        console.log(`• Index ${col}.${id} already exists (skipped)`);
        return;
      }
      // Soft-fail on index length errors so the rest of the setup completes
      if (e.code === 400 && /Index length is longer than the maximum/i.test(msg)) {
        console.warn(`! Skipping index ${col}.${id}: ${msg}`);
        return;
      }
      throw e;
    }
  };

  // ---- INDEXES (only KEY indexes to avoid 767-byte limits) ----
  await IDX('restaurants', 'idx_name_key', 'key', ['name']);
  await IDX('restaurants', 'idx_rating',   'key', ['rating']);

  await IDX('menus', 'idx_restaurantId', 'key', ['restaurantId']);

  await IDX('items', 'idx_restaurantId', 'key', ['restaurantId']);
  await IDX('items', 'idx_menuId',       'key', ['menuId']);
  await IDX('items', 'idx_name_key',     'key', ['name']);
  await IDX('items', 'idx_price',        'key', ['priceRM']);

  await IDX('reviews', 'idx_subjectType', 'key', ['subjectType']);
  await IDX('reviews', 'idx_subjectId',   'key', ['subjectId']);

  await IDX('foodlists', 'idx_ownerId', 'key', ['ownerId']);

  await IDX('updates', 'idx_restaurantId', 'key', ['restaurantId']);
  // intentionally no text index on updates.text (to avoid 767 error)

  console.log('✓ Indexes ensured');
  console.log('Tables ready ✅');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
