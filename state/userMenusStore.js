// User-managed menu items per restaurant (session-scoped)
// Shape compatible with items in data/mockData

let userMenus = {}; // { [restaurantId: string]: Array<Item> }

export function getUserItemsForRestaurant(restaurantId) {
  const arr = userMenus[restaurantId] || [];
  return arr.map(i => ({ ...i }));
}

export function addUserItem(restaurant, item) {
  const id = restaurant.id;
  const copy = { ...item };
  const arr = userMenus[id] || [];
  userMenus[id] = [...arr, copy];
}

