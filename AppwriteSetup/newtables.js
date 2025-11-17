// newtables.js
require('dotenv').config();
const { Client, Databases, Permission, Role, ID } = require('node-appwrite');

/** ---- ENV CHECK ---- */
const requiredEnv = ['APPWRITE_ENDPOINT', 'APPWRITE_PROJECT', 'APPWRITE_API_KEY', 'APPWRITE_DB_ID'];
for (const k of requiredEnv) {
  if (!process.env[k] || String(process.env[k]).trim() === '') {
    throw new Error(`Missing ${k} in .env`);
  }
}

/** ---- CLIENT ---- */
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT)
  .setKey(process.env.APPWRITE_API_KEY);

const db = new Databases(client);
const DB = process.env.APPWRITE_DB_ID;

/** ---- HELPER ---- */
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

/** ---- MAIN ---- */
(async () => {
  console.log('→ Using endpoint:', process.env.APPWRITE_ENDPOINT);
  console.log('→ Using project :', String(process.env.APPWRITE_PROJECT).slice(0, 6) + '…');
  console.log('→ Using DB ID   :', DB);

  // Ensure DB exists
  await ok(() => db.get(DB));

  // --- CREATE LIKES COLLECTION ---
  await ok(() =>
    db.createCollection(
      DB,
      'likes',
      'Likes',
      [
        Permission.create(Role.users()), // anyone logged in can create
      ],
      true, // enabled
      true  // document security enabled
    )
  );
  console.log('✓ Likes collection created');

  // Attributes for likes
  await S('likes', 'user_id', 64, true);    // owner ID
  await S('likes', 'item_id', 64, true);    // food item ID
  await S('likes', 'createdAt', 64, true);  // timestamp

  console.log('✓ Likes attributes added');

  // --- CREATE SAVES COLLECTION ---
  await ok(() =>
    db.createCollection(
      DB,
      'saves',
      'Saves',
      [
        Permission.create(Role.users()), // anyone logged in can create
      ],
      true, // enabled
      true  // document security enabled
    )
  );
  console.log('✓ Saves collection created');

  // Attributes for saves
  await S('saves', 'user_id', 64, true);      // owner ID
  await S('saves', 'restaurant_id', 64, true); // saved restaurant ID
  await S('saves', 'createdAt', 64, true);    // timestamp

  console.log('✓ Saves attributes added');

  console.log('✓ All tables ready ✅');
})();
