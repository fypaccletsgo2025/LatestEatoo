// AppwriteSetup/updatetable.js
require('dotenv').config();
const { Client, Databases } = require('node-appwrite');

const requiredEnv = ['APPWRITE_ENDPOINT', 'APPWRITE_PROJECT', 'APPWRITE_API_KEY', 'APPWRITE_DB_ID'];
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
const COLLECTION_ID = process.env.APPWRITE_SUBMISSIONS_COLLECTION || 'user_submissions';

const stringAttributes = [
  { key: 'city', size: 128 },
  { key: 'state', size: 128 },
  { key: 'postcode', size: 32 },
  { key: 'address', size: 512 },
  { key: 'phone', size: 64 },
  { key: 'email', size: 128 },
  { key: 'website', size: 256 },
  { key: 'registrationNo', size: 64 },
  { key: 'cuisines', size: 64, array: true },
  { key: 'theme', size: 128, array: true },
  { key: 'ambience', size: 128, array: true },
  { key: 'note', size: 512 },
];

async function ensureStringAttribute(attr) {
  try {
    await db.createStringAttribute(
      DB_ID,
      COLLECTION_ID,
      attr.key,
      attr.size,
      false,
      null,
      Boolean(attr.array),
    );
    console.log(`[+] Added ${attr.key} attribute`);
  } catch (error) {
    const code = error?.code || error?.response?.code;
    if (code === 409) {
      if (attr.array) {
        try {
          await db.updateStringAttribute(DB_ID, COLLECTION_ID, attr.key, false, null, true);
          console.log(`[~] Ensured ${attr.key} is marked as array`);
        } catch (updateError) {
          console.warn(`[!] Attribute ${attr.key} exists but could not be updated:`, updateError?.message || updateError);
        }
      } else {
        console.log(`[=] Attribute ${attr.key} already exists`);
      }
    } else {
      console.error(`[x] Failed to add ${attr.key}:`, error?.message || error);
      throw error;
    }
  }
}

(async () => {
  console.log(`Updating "${COLLECTION_ID}" collection in DB ${DB_ID}`);
  for (const attr of stringAttributes) {
    await ensureStringAttribute(attr);
  }
  console.log('Done updating user_submissions schema.');
})().catch((err) => {
  console.error('Schema update failed:', err?.message || err);
  process.exit(1);
});
