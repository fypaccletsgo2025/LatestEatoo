// Session-scoped updates/announcements feed (mock real-time)
// Each post: { id, author, role: 'user'|'owner', text, dateISO }

let updates = [
  {
    id: 'u1',
    author: 'Sakura Ramen',
    role: 'owner',
    text: 'New limited-time Miso Special launching this weekend! 🍜',
    dateISO: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'u2',
    author: 'Nadia',
    role: 'user',
    text: 'Date night at Le Patisserie was perfect. Eclairs 10/10 ✨',
    dateISO: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'u3',
    author: 'Bangkok Spice',
    role: 'owner',
    text: 'Songkran promo: 10% off Thai Green Curry all week! 🌶️',
    dateISO: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
];

export function getUpdates() {
  return updates.slice();
}

export function addUpdate(post) {
  const id = `u${Date.now()}`;
  updates = [{ ...post, id, dateISO: new Date().toISOString() }, ...updates];
}
