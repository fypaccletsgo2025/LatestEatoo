// updateauthourID.js
import dotenv from "dotenv";
import { Client, Databases, Users } from "node-appwrite";

dotenv.config();

console.log("[dotenv] Loaded env file");
console.log("🚀 Starting data repairs...\n");

// ------------------------------
// Appwrite Setup
// ------------------------------
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const users = new Users(client);

// ------------------------------
// COLLECTION / DB IDs
// ------------------------------
const DB_ID = process.env.APPWRITE_DB_ID;
const UPDATES_COLLECTION = process.env.APPWRITE_UPDATES_COLLECTION;
const RESTAURANT_COLLECTION = process.env.APPWRITE_RESTAURANT_COLLECTION;

// ------------------------------
// STEP 1 — FIX authorId in updates
// ------------------------------
async function fixUpdateAuthorIds() {
  console.log("=== STEP 1: Fixing authorId in updates collection ===");

  const updatesList = await databases.listDocuments(DB_ID, UPDATES_COLLECTION);

  console.log(`→ Found ${updatesList.total} update documents`);

  const userList = await users.list();
  console.log(`→ Found ${userList.total} auth users`);

  let repaired = 0;

  for (const doc of updatesList.documents) {
    if (!doc.email) {
      console.log(`⚠ Doc ${doc.$id} has no email field → skipping`);
      continue;
    }

    const user = userList.users.find((u) => u.email === doc.email);

    if (!user) {
      console.log(`⚠ No Appwrite user found for email ${doc.email} → skipping`);
      continue;
    }

    await databases.updateDocument(DB_ID, UPDATES_COLLECTION, doc.$id, {
      authorId: user.$id,
    });

    repaired++;
  }

  console.log(`→ Done. ${repaired} update documents repaired.\n`);
}

// ------------------------------
// STEP 2 — FIX restaurants where map is NULL/EMPTY
// ------------------------------
async function fixRestaurantMaps() {
  console.log("=== STEP 2: Fixing restaurants with null/empty map ===");

  const restaurants = await databases.listDocuments(
    DB_ID,
    RESTAURANT_COLLECTION
  );

  console.log(`→ Found ${restaurants.total} restaurant documents`);

  let repaired = 0;

  for (const doc of restaurants.documents) {
    const map = doc.map;

    // Robust null/empty checker
    const isEmpty =
      map === null ||
      map === undefined ||
      map === "" ||
      map === "null" ||
      (typeof map !== "string" && !map.url); // if it's an object or something weird

    if (!isEmpty) {
      continue; // valid map, skip
    }

    console.log(`⚠ Fixing map for restaurant ${doc.$id}`);

    await databases.updateDocument(DB_ID, RESTAURANT_COLLECTION, doc.$id, {
      map: "https://maps.google.com", // put your default value here
    });

    repaired++;
  }

  console.log(`→ Done. ${repaired} restaurant documents repaired.\n`);
}

// ------------------------------
// RUN FIXES
// ------------------------------
(async () => {
  try {
    await fixUpdateAuthorIds();
    await fixRestaurantMaps();
    console.log("🎉 All repairs completed successfully!");
  } catch (err) {
    console.error("❌ ERROR:", err);
  }
})();
