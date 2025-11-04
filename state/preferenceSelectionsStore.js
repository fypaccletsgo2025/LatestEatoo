// Global in-memory store for preference filter selections.
// Keeps diet/cuisine/mood/price filters consistent across screens.

import { useSyncExternalStore } from 'react';

const listeners = new Set();

const DEFAULT_STATE = Object.freeze({
  selectedDiet: Object.freeze([]),
  selectedCuisine: Object.freeze([]),
  selectedMood: Object.freeze([]),
  selectedPrice: Object.freeze([]),
});

let selections = DEFAULT_STATE;

const localeOpts = { sensitivity: 'base' };

function normalizeArray(value) {
  const arr = Array.isArray(value) ? value : [];
  if (arr.length === 0) return Object.freeze([]);

  const seen = new Map();
  for (const raw of arr) {
    if (raw == null) continue;
    const str = String(raw).trim();
    if (!str) continue;
    const key = str.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, str);
    }
  }
  if (seen.size === 0) return Object.freeze([]);

  const cleaned = Array.from(seen.values()).sort((a, b) =>
    a.localeCompare(b, undefined, localeOpts)
  );
  return Object.freeze(cleaned);
}

function normalizeSelections(next) {
  if (!next || typeof next !== 'object') return DEFAULT_STATE;

  const normalized = {
    selectedDiet: normalizeArray(next.selectedDiet),
    selectedCuisine: normalizeArray(next.selectedCuisine),
    selectedMood: normalizeArray(next.selectedMood),
    selectedPrice: normalizeArray(next.selectedPrice),
  };

  return Object.freeze(normalized);
}

function arraysEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function selectionsEqual(a, b) {
  return (
    arraysEqual(a.selectedDiet, b.selectedDiet) &&
    arraysEqual(a.selectedCuisine, b.selectedCuisine) &&
    arraysEqual(a.selectedMood, b.selectedMood) &&
    arraysEqual(a.selectedPrice, b.selectedPrice)
  );
}

function notify() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (_err) {
      // Ignore subscriber errors to avoid breaking store.
    }
  });
}

function setState(next) {
  const normalized = normalizeSelections(next);
  if (!selectionsEqual(selections, normalized)) {
    selections = normalized;
    notify();
  }
}

export function replacePreferenceSelections(next) {
  setState(next);
}

export function updatePreferenceSelections(updater) {
  const current = getPreferenceSelections();
  const draft = {
    selectedDiet: Array.from(current.selectedDiet),
    selectedCuisine: Array.from(current.selectedCuisine),
    selectedMood: Array.from(current.selectedMood),
    selectedPrice: Array.from(current.selectedPrice),
  };

  let result = draft;
  if (typeof updater === 'function') {
    const maybe = updater(draft);
    if (maybe && typeof maybe === 'object') {
      result = { ...draft, ...maybe };
    }
  } else if (updater && typeof updater === 'object') {
    result = { ...draft, ...updater };
  }

  setState(result);
}

export function resetPreferenceSelections() {
  setState(DEFAULT_STATE);
}

export function getPreferenceSelections() {
  return selections;
}

export function subscribePreferenceSelections(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePreferenceSelections() {
  return useSyncExternalStore(
    subscribePreferenceSelections,
    getPreferenceSelections,
    getPreferenceSelections
  );
}

export function arePreferenceSelectionsEqual(a, b) {
  return selectionsEqual(
    normalizeSelections(a),
    normalizeSelections(b)
  );
}
