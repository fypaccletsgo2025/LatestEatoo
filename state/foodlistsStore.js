import { mockFoodlists } from '../data/mockData';

let lists = [...mockFoodlists];

export function getFoodlists() {
  return lists.map(l => ({
    ...l,
    items: [...(l.items || [])],
    members: [...(l.members || [])],
  }));
}

export function updateFoodlists(updater) {
  const next = typeof updater === 'function' ? updater(getFoodlists()) : updater;
  lists = next.map(l => ({
    ...l,
    items: [...(l.items || [])],
    members: [...(l.members || [])],
  }));
}

export function addFoodlist(newList) {
  lists = [newList, ...lists];
}

export function updateFoodlist(updated) {
  lists = lists.map(l => (
    l.id === updated.id
      ? { ...updated, items: [...(updated.items || [])], members: [...(updated.members || [])] }
      : l
  ));
}

export function removeFoodlist(id) {
  lists = lists.filter(l => l.id !== id);
}
