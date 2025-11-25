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

function normalizeId(value) {
  if (value == null) return null;
  const str = String(value).trim();
  return str.length ? str : null;
}

function addRestaurantId(target, value) {
  const normalized = normalizeId(value);
  if (normalized) {
    target.add(normalized);
  }
}

function resolveRestaurantIdFromItemId(itemId, itemsById) {
  const normalizedId = normalizeId(itemId);
  if (!normalizedId || !itemsById) return null;
  const item = itemsById.get(normalizedId);
  if (!item) return null;
  const restaurantId =
    item.restaurantId ??
    item.restaurant_id ??
    item.restaurant?.$id ??
    item.restaurant?.id ??
    null;
  return normalizeId(restaurantId);
}

function resolveRestaurantIdFromItem(item, itemsById) {
  if (!item) return null;
  if (typeof item === 'string' || typeof item === 'number') {
    return resolveRestaurantIdFromItemId(item, itemsById);
  }
  if (typeof item === 'object') {
    const direct =
      item.restaurantId ??
      item.restaurant_id ??
      item.restaurant?.$id ??
      item.restaurant?.id ??
      null;
    const normalized = normalizeId(direct);
    if (normalized) return normalized;
    const fallbackId = item.$id ?? item.id ?? null;
    return resolveRestaurantIdFromItemId(fallbackId, itemsById);
  }
  return null;
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

async function loadRestaurantsWithMenusAndItems() {
  await ensureSession();
  const [restaurants, menus, items] = await Promise.all([
    listAllDocuments(COL.restaurants),
    listAllDocuments(COL.menus),
    listAllDocuments(COL.items),
  ]);

  const menuById = new Map();
  const menusByRestaurant = new Map();
  menus.forEach((menu) => {
    const menuId = normalizeId(menu.$id ?? menu.id);
    if (menuId) {
      menuById.set(menuId, menu);
    }
    const rid = normalizeId(
      menu.restaurantId ??
        menu.restaurant_id ??
        menu.restaurant?.$id ??
        menu.restaurant?.id ??
        null
    );
    if (!rid) return;
    if (!menusByRestaurant.has(rid)) menusByRestaurant.set(rid, []);
    menusByRestaurant.get(rid).push(menu);
  });

  const itemsByRestaurant = new Map();
  const itemsById = new Map();
  items.forEach((raw) => {
    const id = normalizeId(raw.$id ?? raw.id);
    if (!id) return;
    const restaurantId = normalizeId(
      raw.restaurantId ??
        raw.restaurant_id ??
        raw.restaurant?.$id ??
        raw.restaurant?.id ??
        null
    );
    const menuId = normalizeId(raw.menuId ?? raw.menu_id ?? null);
    const normalized = {
      id,
      name: raw.name || 'Item',
      type: raw.type || null,
      cuisine: raw.cuisine || null,
      tags: ensureArray(raw.tags),
      priceRM:
        typeof raw.priceRM === 'number'
          ? raw.priceRM
          : typeof raw.price === 'number'
          ? raw.price
          : null,
      restaurantId,
      menuId,
    };
    itemsById.set(id, normalized);
    if (!restaurantId) return;
    if (!itemsByRestaurant.has(restaurantId)) {
      itemsByRestaurant.set(restaurantId, []);
    }
    itemsByRestaurant.get(restaurantId).push(normalized);
  });

  const richRestaurants = restaurants.map((restaurant) => {
    const rid = normalizeId(restaurant.$id ?? restaurant.id);
    const rMenus = menusByRestaurant.get(rid) || [];
    const rItems = itemsByRestaurant.get(rid) || [];
    const menusWithItems = rMenus.map((menu) => {
      const menuId = normalizeId(menu.$id ?? menu.id);
      return {
        id: menuId,
        name: menu.name || 'Menu',
        items: rItems.filter((item) => item.menuId === menuId),
      };
    });

    const orphanItems = rItems.filter(
      (item) => !item.menuId || !menuById.has(item.menuId)
    );
    const menusMerged =
      orphanItems.length > 0
        ? [
            ...menusWithItems,
            { id: 'uncategorized', name: 'Uncategorized', items: orphanItems },
          ]
        : menusWithItems;

    return {
      id: rid,
      name: restaurant.name || 'Restaurant',
      cuisines: ensureArray(restaurant.cuisines),
      ambience: ensureArray(restaurant.ambience),
      menus: menusMerged,
      _raw: restaurant,
    };
  });

  return { restaurants: richRestaurants, itemsById };
}

async function loadUserPositiveRestaurantIds(userId, itemsById) {
  if (!userId) return new Set();

  const [lists, likes, saves] = await Promise.all([
    listAllDocuments(COL.foodlists, [Query.equal('ownerId', userId)]),
    listAllDocuments(COL.likes, [Query.equal('user_id', userId)]),
    listAllDocuments(COL.saves, [Query.equal('user_id', userId)]),
  ]);

  const positiveRestaurantIds = new Set();

  lists.forEach((fl) => {
    ensureArray(fl.itemIds).forEach((itemId) => {
      const rid = resolveRestaurantIdFromItemId(itemId, itemsById);
      if (rid) positiveRestaurantIds.add(rid);
    });

    ensureArray(fl.items).forEach((item) => {
      const rid = resolveRestaurantIdFromItem(item, itemsById);
      if (rid) positiveRestaurantIds.add(rid);
    });
  });

  likes.forEach((doc) => {
    const itemId =
      doc?.item_id ??
      doc?.itemId ??
      doc?.targetId ??
      doc?.item?.$id ??
      doc?.item?.id ??
      null;
    const rid = resolveRestaurantIdFromItemId(itemId, itemsById);
    if (rid) positiveRestaurantIds.add(rid);
  });

  saves.forEach((doc) => {
    const rid =
      doc?.restaurant_id ??
      doc?.restaurantId ??
      doc?.targetId ??
      doc?.restaurant?.$id ??
      doc?.restaurant?.id ??
      null;
    addRestaurantId(positiveRestaurantIds, rid);
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
  const positiveIds = await loadUserPositiveRestaurantIds(userId, itemsById);

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
  const positiveIds = await loadUserPositiveRestaurantIds(userId, itemsById);
  return buildModel({ restaurants, positiveIds });
}
