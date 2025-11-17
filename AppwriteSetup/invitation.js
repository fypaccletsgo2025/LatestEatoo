// AppwriteSetup/invitation.js
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

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT)
  .setKey(process.env.APPWRITE_API_KEY);

const db = new Databases(client);

const DB_ID = process.env.APPWRITE_DB_ID;
const COLLECTION_ID = process.env.APPWRITE_INVITATIONS_COLLECTION || 'invitations';

// Fields for invitations collection
const attributes = [
  { type: 'string', key: 'foodlistId', size: 100 }, 
  { type: 'string', key: 'fromUser', size: 100 },
  { type: 'string', key: 'toUser', size: 100 },
  { type: 'enum', key: 'status', elements: ['pending', 'accepted', 'declined'] },
];

async function createCollectionIfMissing() {
  try {
    await db.createCollection(DB_ID, COLLECTION_ID, COLLECTION_ID, [
      // Allow users to write invitations to each other
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

async function ensureStringAttribute(key, size) {
  try {
    await db.createStringAttribute(DB_ID, COLLECTION_ID, key, size, true);
    console.log(`[+] Added string attribute ${key}`);
  } catch (error) {
    const code = error?.code || error?.response?.code;
    if (code === 409) {
      console.log(`[=] Attribute ${key} already exists`);
    } else {
      console.error(`[x] Failed to add attribute ${key}:`, error?.message || error);
      throw error;
    }
  }
}

async function ensureEnumAttribute(key, elements) {
  try {
    await db.createEnumAttribute(DB_ID, COLLECTION_ID, key, elements, false);
    console.log(`[+] Added enum attribute ${key}`);
  } catch (error) {
    const code = error?.code || error?.response?.code;
    if (code === 409) {
      console.log(`[=] Enum ${key} already exists`);
    } else {
      console.error(`[x] Failed to add enum ${key}:`, error?.message || error);
      throw error;
    }
  }
}

(async () => {
  console.log(`\nUpdating "${COLLECTION_ID}" collection in DB ${DB_ID}`);

  await createCollectionIfMissing();

  for (const attr of attributes) {
    if (attr.type === 'string') {
      await ensureStringAttribute(attr.key, attr.size);
    } else if (attr.type === 'enum') {
      await ensureEnumAttribute(attr.key, attr.elements);
    }
  }

  console.log('Done updating invitations schema.\n');
})();
