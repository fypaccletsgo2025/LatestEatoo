// AppwriteSetup/notifications.js
require('dotenv').config();
const { Client, Databases } = require('node-appwrite');

// Required ENV
const requiredEnv = [
  'APPWRITE_ENDPOINT',
  'APPWRITE_PROJECT',
  'APPWRITE_API_KEY',
  'APPWRITE_DB_ID'
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing ${key} in environment`);
  }
}

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT)
  .setKey(process.env.APPWRITE_API_KEY);

const db = new Databases(client);
const DB_ID = process.env.APPWRITE_DB_ID;
const COLLECTION_ID = process.env.APPWRITE_NOTIFICATIONS_COLLECTION || 'notifications';

// Attributes to create
const attributes = [
  { type: 'string', key: 'type', size: 50 },      // invite | user_submission | restaurant_request
  { type: 'json', key: 'payload' },               // JSON stored as string
  { type: 'boolean', key: 'read', default: false },
  { type: 'datetime', key: 'createdAt' }          // timestamp of creation
];

// Create collection if missing
async function createCollectionIfMissing() {
  try {
    await db.createCollection(DB_ID, COLLECTION_ID, COLLECTION_ID, [
      'read("any")',
      'create("users")',
      'update("users")',
      'delete("users")'
    ]);
    console.log(`[+] Created collection "${COLLECTION_ID}"`);
  } catch (err) {
    const code = err?.code || err?.response?.code;
    if (code === 409) {
      console.log(`[=] Collection "${COLLECTION_ID}" already exists`);
    } else {
      console.error(`[x] Failed creating collection:`, err?.message || err);
      throw err;
    }
  }
}

// Ensure string attribute
async function ensureStringAttribute(key, size) {
  try {
    await db.createStringAttribute(DB_ID, COLLECTION_ID, key, size, true);
    console.log(`[+] Added string attribute ${key}`);
  } catch (err) {
    if (err?.code === 409) {
      console.log(`[=] Attribute ${key} already exists`);
    } else {
      console.error(`[x] Failed to add string attribute ${key}:`, err?.message || err);
      throw err;
    }
  }
}

// Ensure boolean attribute
async function ensureBooleanAttribute(key, defaultValue = false) {
  try {
    await db.createBooleanAttribute(DB_ID, COLLECTION_ID, key, false, defaultValue);
    console.log(`[+] Added boolean attribute ${key}`);
  } catch (err) {
    if (err?.code === 409) {
      console.log(`[=] Boolean attribute ${key} already exists`);
    } else {
      console.error(`[x] Failed to add boolean attribute ${key}:`, err?.message || err);
      throw err;
    }
  }
}

// Ensure JSON attribute (stored as string)
async function ensureJsonAttribute(key) {
  try {
    await db.createStringAttribute(DB_ID, COLLECTION_ID, key, 2000, false);
    console.log(`[+] Added JSON attribute ${key} (stored as string)`);
  } catch (err) {
    if (err?.code === 409) {
      console.log(`[=] JSON attribute ${key} already exists`);
    } else {
      console.error(`[x] Failed to add JSON attribute ${key}:`, err?.message || err);
      throw err;
    }
  }
}

// Ensure datetime attribute
async function ensureDateTimeAttribute(key) {
  try {
    await db.createDatetimeAttribute(DB_ID, COLLECTION_ID, key, true);
    console.log(`[+] Added datetime attribute ${key}`);
  } catch (err) {
    if (err?.code === 409) {
      console.log(`[=] Datetime attribute ${key} already exists`);
    } else {
      console.error(`[x] Failed to add datetime attribute ${key}:`, err?.message || err);
      throw err;
    }
  }
}

// Bootstrap
(async () => {
  console.log(`\nUpdating "${COLLECTION_ID}" collection in DB ${DB_ID}`);

  await createCollectionIfMissing();

  for (const attr of attributes) {
    switch (attr.type) {
      case 'string':
        await ensureStringAttribute(attr.key, attr.size);
        break;
      case 'json':
        await ensureJsonAttribute(attr.key);
        break;
      case 'boolean':
        await ensureBooleanAttribute(attr.key, attr.default);
        break;
      case 'datetime':
        await ensureDateTimeAttribute(attr.key);
        break;
      default:
        console.warn(`[!] Unknown attribute type: ${attr.type}`);
    }
  }

  console.log('\nDone updating notifications schema.\n');
})();
