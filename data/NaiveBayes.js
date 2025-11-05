// Appwrite-backed Naive Bayes recommender (no mock data).
// Learns from your DB: restaurants, menus, items, and user foodlists.

import { db, DB_ID, COL, account, ensureSession } from '../appwrite';
import { Query } from 'appwrite';

const SMOOTHING = 1;

// ---------- small utils ----------
function ensureArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

// ---------- pagination helpers ----------
async function listAllDocuments(collectionId, queries = [], pageSize = 100) {
  const out = [];
  let cursor = null;

  // Appwrite supports cursor pagination via $id
  // We’ll iterate until no more docs.
  // Note: if your dataset is large, consider adding selective queries instead.
  /* eslint-disable no-constant-condition */
  while (true) {
    const q = [Query.limit(pageSize), ...queries];
    if (cursor) q.push(Query.cursorAfter(cursor));
    // eslint-disable-next-line no-await-in-loop
    const res = await db.listDocuments(DB_ID, collectionId, q);
    const docs = res.documents || [];
    out.push(...docs);
    if (docs.length < pageSize) break;
    cursor = docs[docs.length - 1].$id;
  }
  return out;
}

// ---------- data loading ----------
async function loadRestaurantsWithMenusAndItems() {
  // Load base entities
  const [restaurants, menus, items] = await Promise.all([
    listAllDocuments(COL.restaurants),
    listAllDocuments(COL.menus),
    listAllDocuments(COL.items),
  ]);

  // index menus by id and by restaurantId
  const menuById = new Map(menus.map((m) => [m.$id, m]));
  const menusByRestaurant = new Map();
  menus.forEach((m) => {
    const rid = m.restaurantId;
    if (!rid) return;
    if (!menusByRestaurant.has(rid)) menusByRestaurant.set(rid, []);
    menusByRestaurant.get(rid).push(m);
  });

  // group items by restaurantId and by menuId
  const itemsByRestaurant = new Map();
  const itemsById = new Map();
  items.forEach((it) => {
    itemsById.set(it.$id, it);
    const rid = it.restaurantId;
    if (!rid) return;
    if (!itemsByRestaurant.has(rid)) itemsByRestaurant.set(rid, []);
    itemsByRestaurant.get(rid).push(it);
  });

  // assemble restaurant objects with menus & items (light shape)
  const richRestaurants = restaurants.map((r) => {
    const rid = r.$id;
    const rMenus = menusByRestaurant.get(rid) || [];
    const rItems = itemsByRestaurant.get(rid) || [];

    // attach items into menus (if present). Items without menu match go into a synthetic "Uncategorized"
    const menusWithItems = rMenus.map((m) => ({
      id: m.$id,
      name: m.name || 'Menu',
      items: rItems.filter((it) => it.menuId === m.$id).map((it) => ({
        id: it.$id,
        name: it.name,
        tags: ensureArray(it.tags),
        type: it.type || null,
        cuisine: it.cuisine || null,
        priceRM: it.priceRM,
      })),
    }));

    // orphan items (no menu or unknown menu)
    const orphanItems = rItems
      .filter((it) => !it.menuId || !menuById.has(it.menuId))
      .map((it) => ({
        id: it.$id,
        name: it.name,
        tags: ensureArray(it.tags),
        type: it.type || null,
        cuisine: it.cuisine || null,
        priceRM: it.priceRM,
      }));

    const menusMerged =
      orphanItems.length > 0
        ? [...menusWithItems, { id: 'uncategorized', name: 'Uncategorized', items: orphanItems }]
        : menusWithItems;

    return {
      id: rid,
      name: r.name,
      cuisines: ensureArray(r.cuisines),
      ambience: ensureArray(r.ambience),
      menus: menusMerged,
      // keep raw for future extensions if needed
      _raw: r,
    };
  });

  return { restaurants: richRestaurants, items, itemsById };
}

async function loadUserPositiveRestaurantIdsFromFoodlists(userId, itemsById) {
  // Pull user’s foodlists and map itemIds -> restaurantId
  const lists = await listAllDocuments(COL.foodlists, [Query.equal('ownerId', userId)]);
  const itemIds = uniq(
    lists.flatMap((fl) => ensureArray(fl.itemIds)).filter(Boolean)
  );

  const positiveRestaurantIds = new Set();
  itemIds.forEach((iid) => {
    const it = itemsById.get(iid);
    const rid = it?.restaurantId;
    if (rid) positiveRestaurantIds.add(rid);
  });

  return positiveRestaurantIds;
}

// ---------- feature engineering (same as your original) ----------
function collectRestaurantFeatures(restaurant) {
  if (!restaurant) return [];
  const features = new Set();

  ensureArray(restaurant.cuisines).forEach((cuisine) => {
    if (cuisine) features.add(`cuisine:${String(cuisine).toLowerCase()}`);
  });

  ensureArray(restaurant.ambience).forEach((ambience) => {
    if (ambience) features.add(`ambience:${String(ambience).toLowerCase()}`);
  });

  ensureArray(restaurant.menus).forEach((menu) => {
    ensureArray(menu.items).forEach((item) => {
      ensureArray(item.tags).forEach((tag) => {
        if (tag) features.add(`tag:${String(tag).toLowerCase()}`);
      });
      if (item.type) {
        features.add(`type:${String(item.type).toLowerCase()}`);
      }
      if (item.cuisine) {
        features.add(`itemCuisine:${String(item.cuisine).toLowerCase()}`);
      }
    });
  });

  return Array.from(features);
}

function buildFeatureCache(restaurants) {
  const featureCache = new Map();
  const vocabulary = new Set();

  restaurants.forEach((restaurant) => {
    const features = collectRestaurantFeatures(restaurant);
    featureCache.set(restaurant.id, features);
    features.forEach((f) => vocabulary.add(f));
  });

  return { featureCache, vocabulary };
}

function computeCounts(restaurants, featureCache, positiveIds) {
  const positiveCounts = new Map();
  const negativeCounts = new Map();

  restaurants.forEach((restaurant) => {
    const isPositive = positiveIds.has(restaurant.id);
    const target = isPositive ? positiveCounts : negativeCounts;
    const features = featureCache.get(restaurant.id) || [];
    features.forEach((feature) => {
      target.set(feature, (target.get(feature) || 0) + 1);
    });
  });

  return { positiveCounts, negativeCounts };
}

function toLogProbabilityMap(counts, denominator, vocabulary) {
  const logMap = new Map();
  vocabulary.forEach((feature) => {
    const count = counts.get(feature) || 0;
    const probability = (count + SMOOTHING) / denominator;
    logMap.set(feature, Math.log(probability));
  });
  return logMap;
}

function buildModel({ restaurants, positiveIds }) {
  const { featureCache, vocabulary } = buildFeatureCache(restaurants);

  const totalRestaurants = restaurants.length;
  const positiveCount = positiveIds.size;
  const negativeCount = Math.max(totalRestaurants - positiveCount, 0);
  const vocabularySize = Math.max(vocabulary.size, 1);

  const priorLiked = (positiveCount + SMOOTHING) / (totalRestaurants + SMOOTHING * 2);
  const priorNotLiked = Math.max(1 - priorLiked, 1e-9);

  const { positiveCounts, negativeCounts } = computeCounts(
    restaurants,
    featureCache,
    positiveIds
  );

  const positiveDenominator = positiveCount + SMOOTHING * vocabularySize;
  const negativeDenominator = negativeCount + SMOOTHING * vocabularySize;

  const logConditionalLiked = toLogProbabilityMap(
    positiveCounts,
    positiveDenominator,
    vocabulary
  );
  const logConditionalNotLiked = toLogProbabilityMap(
    negativeCounts,
    negativeDenominator,
    vocabulary
  );

  const defaultLogLiked = Math.log(SMOOTHING / positiveDenominator);
  const defaultLogNotLiked = Math.log(SMOOTHING / negativeDenominator);

  const logPriorLiked = Math.log(priorLiked);
  const logPriorNotLiked = Math.log(priorNotLiked);

  return {
    restaurants,
    positiveIds,
    featureCache,
    vocabulary,
    logPriorLiked,
    logPriorNotLiked,
    logConditionalLiked,
    logConditionalNotLiked,
    defaultLogLiked,
    defaultLogNotLiked,
  };
}

function scoreRestaurant(model, restaurant) {
  const features =
    model.featureCache.get(restaurant.id) || collectRestaurantFeatures(restaurant);

  let logLiked = model.logPriorLiked;
  let logNotLiked = model.logPriorNotLiked;

  features.forEach((feature) => {
    const likedContribution =
      model.logConditionalLiked.get(feature) ?? model.defaultLogLiked;
    const notLikedContribution =
      model.logConditionalNotLiked.get(feature) ?? model.defaultLogNotLiked;
    logLiked += likedContribution;
    logNotLiked += notLikedContribution;
  });

  const maxLog = Math.max(logLiked, logNotLiked);
  const likedWeight = Math.exp(logLiked - maxLog);
  const notLikedWeight = Math.exp(logNotLiked - maxLog);
  const probability = likedWeight / (likedWeight + notLikedWeight);

  return {
    probability,
    logLiked,
    logNotLiked,
    features,
  };
}

// ---------- Public API ----------

/**
 * Get recommendations for the **current signed-in user** (uses Appwrite session).
 * Positive signals come from the user's Foodlists (ownerId === userId).
 */
export async function getNaiveBayesRecommendationsForCurrentUser(options = {}) {
  const { includeScores = false } = options;

  await ensureSession();
  const me = await account.get();
  const userId = me.$id;

  const { restaurants, itemsById } = await loadRestaurantsWithMenusAndItems();
  const positiveIds = await loadUserPositiveRestaurantIdsFromFoodlists(userId, itemsById);

  const model = buildModel({ restaurants, positiveIds });

  const candidates = restaurants.filter((r) => !model.positiveIds.has(r.id));
  const scored = candidates.map((restaurant) => {
    const score = scoreRestaurant(model, restaurant);
    return {
      restaurant,
      probability: score.probability,
      ...(includeScores ? { details: score } : {}),
    };
  });

  return scored.sort((a, b) => b.probability - a.probability);
}

/**
 * Build a model for any arbitrary user id (e.g., admin/cron usage).
 * Positive signals still come from Foodlists owned by that user.
 */
export async function createNaiveBayesModelForUserId(userId) {
  const { restaurants, itemsById } = await loadRestaurantsWithMenusAndItems();
  const positiveIds = await loadUserPositiveRestaurantIdsFromFoodlists(userId, itemsById);
  return buildModel({ restaurants, positiveIds });
}
