import { db, DB_ID, COL, ensureSession } from '../appwrite';
import { Query } from 'appwrite';

const ensureArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

async function listAllDocuments(collectionId, queries = [], pageSize = 100) {
  const docs = [];
  let cursor = null;
  /* eslint-disable no-constant-condition */
  while (true) {
    const q = [Query.limit(pageSize), ...queries];
    if (cursor) q.push(Query.cursorAfter(cursor));
    // eslint-disable-next-line no-await-in-loop
    const res = await db.listDocuments(DB_ID, collectionId, q);
    const batch = res?.documents || [];
    docs.push(...batch);
    if (batch.length < pageSize) break;
    cursor = batch[batch.length - 1].$id;
  }
  /* eslint-enable no-constant-condition */
  return docs;
}

function normalizeItem(item) {
  if (!item) return null;
  const id = item.$id || item.id || null;
  if (!id) return null;
  const priceRM =
    typeof item.priceRM === 'number'
      ? item.priceRM
      : typeof item.price === 'number'
      ? item.price
      : (() => {
          const numeric = parseFloat(String(item.price || '').replace(/[^0-9.]/g, ''));
          return Number.isFinite(numeric) ? numeric : null;
        })();

  return {
    id,
    $id: id,
    name: item.name || 'Untitled',
    type: item.type || null,
    cuisine: item.cuisine || null,
    tags: ensureArray(item.tags),
    description: item.description || '',
    mood: ensureArray(item.mood),
    rating: typeof item.rating === 'number' ? item.rating : null,
    menuId: item.menuId || item.menu_id || null,
    restaurantId:
      item.restaurantId ||
      item.restaurant_id ||
      item.restaurant?.$id ||
      item.restaurant?.id ||
      null,
    priceRM,
    priceText:
      typeof priceRM === 'number'
        ? `RM${priceRM}`
        : item.price || (typeof item.priceRM === 'string' ? item.priceRM : null),
    raw: item,
  };
}

function decorateRestaurant(base, menusByRestaurant, itemsByRestaurant, menuById, flatItemsOut) {
  const rid = base.$id || base.id;
  const restaurantItems = itemsByRestaurant.get(rid) || [];
  const restaurantMenus = menusByRestaurant.get(rid) || [];

  const attachableItems = restaurantItems.map((item) => ({
    ...item,
    priceText: item.priceText || (typeof item.priceRM === 'number' ? `RM${item.priceRM}` : 'RM0'),
  }));

  const menusWithItems = restaurantMenus.map((menu) => {
    const menuItems = attachableItems
      .filter((item) => item.menuId === menu.$id)
      .map((item) => ({ ...item }));
    return {
      id: menu.$id,
      name: menu.name || 'Menu',
      items: menuItems,
    };
  });

  const orphanItems = attachableItems
    .filter((item) => !item.menuId || !menuById.has(item.menuId))
    .map((item) => ({ ...item }));

  const menusMerged =
    orphanItems.length > 0
      ? [
          ...menusWithItems,
          {
            id: 'uncategorized',
            name: 'Uncategorized',
            items: orphanItems,
          },
        ]
      : menusWithItems;

  const flatItemsForRestaurant = [];
  menusMerged.forEach((menu) => {
    ensureArray(menu.items).forEach((item) => {
      const priceValue =
        typeof item.priceRM === 'number'
          ? item.priceRM
          : parseFloat(String(item.priceText || '').replace(/[^0-9.]/g, '')) || 0;
      const flat = {
        id: item.id,
        name: item.name,
        type: item.type,
        cuisine: item.cuisine,
        tags: item.tags,
        rating: item.rating,
        description: item.description,
        price: item.priceText || (priceValue ? `RM${priceValue}` : 'RM0'),
        priceValue,
        restaurant: base.name,
        restaurantId: rid,
        restaurantLocation: base.location || base.address || base.city || '',
        menuId: menu.id,
        raw: item.raw || item,
      };
      flatItemsForRestaurant.push(flat);
      flatItemsOut.push(flat);
    });
  });

  const priceValues = flatItemsForRestaurant
    .map((item) => item.priceValue)
    .filter((value) => Number.isFinite(value) && value > 0);
  const averagePriceValue = priceValues.length
    ? Math.round(priceValues.reduce((sum, value) => sum + value, 0) / priceValues.length)
    : null;

  return {
    id: rid,
    name: base.name || 'Restaurant',
    location: base.location || base.address || '',
    cuisines: ensureArray(base.cuisines),
    cuisine: ensureArray(base.cuisines)[0] || null,
    ambience: ensureArray(base.ambience),
    rating: typeof base.rating === 'number' ? base.rating : null,
    averagePriceValue,
    averagePrice: averagePriceValue ? `RM${averagePriceValue}` : null,
    theme: base.theme || base.summary || '',
    menus: menusMerged,
    reviews: base.reviews || [],
    topItems: flatItemsForRestaurant
      .slice()
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 3)
      .map((item) => item.id),
    _raw: base,
  };
}

let catalogCache = null;
let inflightPromise = null;

async function loadCatalog() {
  await ensureSession();
  const [restaurants, menus, items] = await Promise.all([
    listAllDocuments(COL.restaurants),
    listAllDocuments(COL.menus),
    listAllDocuments(COL.items),
  ]);

  const menuById = new Map(menus.map((menu) => [menu.$id, menu]));
  const menusByRestaurant = new Map();
  menus.forEach((menu) => {
    const rid = menu.restaurantId;
    if (!rid) return;
    if (!menusByRestaurant.has(rid)) menusByRestaurant.set(rid, []);
    menusByRestaurant.get(rid).push(menu);
  });

  const itemsByRestaurant = new Map();
  const itemsById = new Map();
  items.forEach((raw) => {
    const normalized = normalizeItem(raw);
    if (!normalized) return;
    itemsById.set(normalized.id, normalized);
    if (!normalized.restaurantId) return;
    if (!itemsByRestaurant.has(normalized.restaurantId)) {
      itemsByRestaurant.set(normalized.restaurantId, []);
    }
    itemsByRestaurant.get(normalized.restaurantId).push(normalized);
  });

  const flatItems = [];
  const richRestaurants = restaurants.map((restaurant) =>
    decorateRestaurant(restaurant, menusByRestaurant, itemsByRestaurant, menuById, flatItems),
  );

  return {
    restaurants: richRestaurants,
    items: flatItems,
    itemsById,
  };
}

export async function getCatalog(options = {}) {
  const { force = false } = options;
  if (!force && catalogCache) {
    return catalogCache;
  }
  if (!force && inflightPromise) {
    return inflightPromise;
  }
  inflightPromise = loadCatalog()
    .then((data) => {
      catalogCache = data;
      inflightPromise = null;
      return data;
    })
    .catch((err) => {
      inflightPromise = null;
      throw err;
    });
  return inflightPromise;
}

export function clearCatalogCache() {
  catalogCache = null;
}

export async function getAllRestaurants(options = {}) {
  const data = await getCatalog(options);
  return data.restaurants;
}

export async function getAllItems(options = {}) {
  const data = await getCatalog(options);
  return data.items;
}

export async function getItemsForRestaurant(restaurantId, options = {}) {
  if (!restaurantId) return [];
  const data = await getCatalog(options);
  return data.items.filter((item) => item.restaurantId === restaurantId);
}
